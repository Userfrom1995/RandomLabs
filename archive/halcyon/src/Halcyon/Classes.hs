{-# LANGUAGE LambdaCase #-}
-- | Type classes and instances (v3, milestone 19). This module builds the
-- shared class environment consumed by the type checker, the interpreter,
-- and the bytecode compiler so all three agree on class and instance
-- structure. The runtime dispatch strategy is dictionary passing: a method
-- reference (e.g. @show@) is resolved against the class of its argument
-- value by its value type tag, and instance dictionaries carry the method
-- implementations.
module Halcyon.Classes
  ( ClassInfo(..)
  , InstanceInfo(..)
  , ClassEnv(..)
  , emptyClassEnv
  , buildClassEnv
  , methodClass
  , methodTypeIn
  , findInstance
  , unifyHeadB
  , unifyHead
  , instanceHeadShape
  ) where

import Data.List (sort)
import qualified Data.Map.Strict as Map

import Halcyon.Ast (Expr(..), Program(..), TopDef(..), ClassDecl(..), InstanceDecl(..), Builtin(..), Pattern(..), Op(..))
import Halcyon.Token (Pos(..))
import Halcyon.Type (Type(..), classTypeVar)

-- | A type class: its name, its single type parameter, and its methods
-- (name -> declared type over @'Halcyon.Type'.TVar 0@, the class variable).
data ClassInfo = ClassInfo
  { clName    :: String
  , clVar     :: String
  , clMethods :: [(String, Type)]
  }
  deriving (Show)

-- | A class instance: the class, the instance head type, an optional
-- context constraint, and the method implementations.
data InstanceInfo = InstanceInfo
  { iiClass   :: String
  , iiPos     :: Pos
  , iiCtx     :: Maybe (String, Type)
  , iiHead    :: Type
  , iiMethods :: [(String, Expr)]
  }
  deriving (Show)

-- | The class environment: class name -> class info, and class name ->
-- instances (built-in instances are merged in first, user instances second).
data ClassEnv = ClassEnv
  { ceClasses   :: Map.Map String ClassInfo
  , ceInstances :: Map.Map String [InstanceInfo]
  }
  deriving (Show)

-- | An empty class environment (no classes or instances).
emptyClassEnv :: ClassEnv
emptyClassEnv = ClassEnv Map.empty Map.empty

-- | The names that appear more than once in a list, in first-occurrence
-- order (used for duplicate class/method/instance-head detection).
dupes :: [String] -> [String]
dupes = go []
  where
    go _ [] = []
    go seen (x : xs)
      | x `elem` seen = x : go (x : seen) xs
      | otherwise     = go (x : seen) xs

-- | The built-in @Show@ class: @class Show a where show : a -> String@.
builtinClass :: ClassDecl
builtinClass = ClassDecl p "Show" "a" [("show", TFun (TVar classTypeVar) TStr)]

-- | Build the class environment for a program: the declared classes, the
-- declared instances, plus the built-in @Show@ class and its instances for
-- the primitive types and lists. Fails on duplicate class names, duplicate
-- methods within a class, unknown classes in instances, instances that do
-- not cover every class method, and duplicate (overlapping) instance heads.
buildClassEnv :: Program -> Either String ClassEnv
buildClassEnv prog = do
  let classes   = [d | DefClass d <- progDefs prog]
      instances = [d | DefInstance d <- progDefs prog]
  cmap <- buildClasses (builtinClass : classes)
  imap <- buildInstances cmap (builtinInstances ++ instances)
  return (ClassEnv cmap imap)

buildClasses :: [ClassDecl] -> Either String (Map.Map String ClassInfo)
buildClasses decls = do
  case dupes (map cdName decls) of
    (x : _) -> Left ("duplicate class name: " <> x)
    []      -> Right ()
  go Map.empty decls
  where
    go m []         = Right m
    go m (d : rest) = do
      let mnames = map fst (cdMethods d)
      case dupes mnames of
        (x : _) -> Left ("duplicate method " <> x <> " in class " <> cdName d)
        []      -> go (Map.insert (cdName d) (ClassInfo (cdName d) (cdVar d) (cdMethods d)) m) rest

buildInstances :: Map.Map String ClassInfo -> [InstanceDecl]
               -> Either String (Map.Map String [InstanceInfo])
buildInstances cmap decls = do
  infos <- mapM (toInfo cmap) decls
  let grouped = Map.fromListWith (++) [(iiClass i, [i]) | i <- infos]
  case [ s | (_, insts) <- Map.toList grouped,
             s <- overlaps (map iiHead insts) ] of
    (x : _) -> Left ("overlapping instance heads: " <> x)
    []      -> Right grouped
  where
    toInfo cmap d = do
      case Map.lookup (idClass d) cmap of
        Nothing -> Left ("instance for unknown class: " <> idClass d)
        Just ci -> do
          let mnames   = map fst (idMethods d)
              declared = map fst (clMethods ci)
          case dupes mnames of
            (x : _) -> Left ("duplicate method " <> x <> " in instance for " <> idClass d)
            []      -> Right ()
          case [x | x <- declared, x `notElem` mnames] of
            (x : _) -> Left ("instance for " <> idClass d <> " is missing method " <> x)
            []      -> Right ()
          case [x | x <- mnames, x `notElem` declared] of
            (x : _) -> Left ("instance for " <> idClass d <> " has undeclared method " <> x)
            []      -> Right (InstanceInfo (idClass d) (idPos d) (idCtx d) (idHead d) (idMethods d))

    overlaps :: [Type] -> [String]
    overlaps ts = go (sort (map instanceHeadShape ts))
      where
        go (x : y : rest) | x == y    = x : go (y : rest)
                          | otherwise = go (y : rest)
        go _                          = []

-- | Look up the class owning a method name, if any.
methodClass :: String -> ClassEnv -> Maybe (String, Type)
methodClass name cenv = do
  (cn, ci) <- Map.lookup name classByMethod
  mty      <- lookup name (clMethods ci)
  return (cn, mty)
  where
    classByMethod = Map.fromList
      [ (m, (clName ci, ci)) | ci <- Map.elems (ceClasses cenv), (m, _) <- clMethods ci ]

-- | The declared type of a method in a class.
methodTypeIn :: String -> String -> ClassEnv -> Maybe Type
methodTypeIn cn m cenv = do
  ci <- Map.lookup cn (ceClasses cenv)
  lookup m (clMethods ci)

-- | Find an instance of a class whose head unifies with a concrete type.
-- Instance heads are checked structurally; overlap is rejected at build
-- time, so the first match is deterministic.
findInstance :: String -> Type -> ClassEnv -> Maybe InstanceInfo
findInstance cn ty cenv = do
  insts <- Map.lookup cn (ceInstances cenv)
  case [i | i <- insts, unifyHead (iiHead i) ty] of
    (i : _) -> Just i
    []      -> Nothing

-- | Unify an instance head against a concrete type, returning the bindings
-- for the head's type variables. The head's variables are all
-- @'Halcyon.Type'.TVar 0@ (instance-head parsing maps every head type
-- variable to the leading variable), so structural matching is enough.
unifyHeadB :: Type -> Type -> Maybe (Map.Map Int Type)
unifyHeadB h t = case (h, t) of
  (TInt, TInt)     -> Just Map.empty
  (TFloat, TFloat) -> Just Map.empty
  (TBool, TBool)   -> Just Map.empty
  (TStr, TStr)     -> Just Map.empty
  (TChar, TChar)   -> Just Map.empty
  (TList hh, TList tt) -> unifyHeadB hh tt
  (TData n1 as, TData n2 bs)
    | n1 == n2 && length as == length bs -> unifyMany (zip as bs)
  (TRec n1 as, TRec n2 bs)
    | n1 == n2 && length as == length bs -> unifyMany (zip as bs)
  (TVar v, t')     -> Just (Map.singleton v t')
  _                -> Nothing
  where
    unifyMany []              = Just Map.empty
    unifyMany ((h, t) : rest) = do
      b1 <- unifyHeadB h t
      b2 <- unifyMany rest
      if Map.null b1
        then Just b2
        else Just (Map.insert (fst (Map.findMin b1)) (snd (Map.findMin b1)) b2)

-- | Structural match between an instance head and a concrete value type,
-- ignoring head type variables entirely.
unifyHead :: Type -> Type -> Bool
unifyHead h t = case (h, t) of
  (TInt, TInt)     -> True
  (TFloat, TFloat) -> True
  (TBool, TBool)   -> True
  (TStr, TStr)     -> True
  (TChar, TChar)   -> True
  (TList _h, TList _t) -> True
  (TData n1 _, TData n2 _) -> n1 == n2
  (TRec n1 _, TRec n2 _)   -> n1 == n2
  (TVar _, _)      -> True
  _                -> False

-- | A normalized rendering of an instance head (type variables collapsed to
-- a fixed marker) used for overlap detection.
instanceHeadShape :: Type -> String
instanceHeadShape = go
  where
    go = \case
      TVar _      -> "v"
      TInt        -> "Int"
      TFloat      -> "Float"
      TBool       -> "Bool"
      TStr        -> "String"
      TChar       -> "Char"
      TList t     -> "[" <> go t <> "]"
      TData n ts  -> n <> (if null ts then "" else " " <> unwords (map go ts))
      TRec n ts   -> n <> (if null ts then "" else " " <> unwords (map go ts))
      TFun a b    -> "(" <> go a <> " -> " <> go b <> ")"

-- ---------------------------------------------------------------------
-- Built-in Show instances
--
--   Show Int, Show Float, Show Bool, Show String, Show Char, and
--   Show a => Show [a]  (recursive rendering that dispatches @show@ on
--   elements so user instances are honored)
-- ---------------------------------------------------------------------

p :: Pos
p = Pos 0 0

builtinInstances :: [InstanceDecl]
builtinInstances =
  [ InstanceDecl p "Show" Nothing TInt [("show", showInt)]
  , InstanceDecl p "Show" Nothing TFloat [("show", showFloat)]
  , InstanceDecl p "Show" Nothing TBool [("show", showBool)]
  , InstanceDecl p "Show" Nothing TStr [("show", showStr)]
  , InstanceDecl p "Show" Nothing TChar [("show", showCharExpr)]
  , InstanceDecl p "Show" (Just ("Show", TVar classTypeVar)) (TList (TVar classTypeVar)) [("show", builtinShowList)]
  ]

-- | @fn x => intToStr x@
showInt :: Expr
showInt = ELambda p ["x"] (EApply p (EBuiltin p BIntToStr) (EVar p "x"))

-- | @fn x => floatToStr x@
showFloat :: Expr
showFloat = ELambda p ["x"] (EApply p (EBuiltin p BFloatToStr) (EVar p "x"))

-- | @fn x => boolToStr x@
showBool :: Expr
showBool = ELambda p ["x"] (EApply p (EBuiltin p BBoolToStr) (EVar p "x"))

-- | @fn x => strToStr x@
showStr :: Expr
showStr = ELambda p ["x"] (EApply p (EBuiltin p BStrToStr) (EVar p "x"))

-- | @fn x => str x@ (renders the character in quoted form, @'a'@)
showCharExpr :: Expr
showCharExpr = ELambda p ["x"] (EApply p (EBuiltin p BStr) (EVar p "x"))

-- | The built-in list Show instance body:
-- @fn xs => let rec go = fn ys => match ys with
--             | [] => "[]"
--             | x :: [] => show x
--             | x :: rest => show x + ", " + go rest
--           in "[" + go xs + "]@
-- It dispatches @show@ on elements so user-defined element instances are
-- honored, and uses @+@ for string concatenation.
builtinShowList :: Expr
builtinShowList =
  ELambda p ["xs"] $
    ELet p True "go" goBody $
      EBin p OpAdd (EStr p "[")
        (EBin p OpAdd (EApply p (EVar p "go") (EVar p "xs")) (EStr p "]"))
  where
    goBody = ELambda p ["ys"] $
      EMatch p (EVar p "ys")
        [ (PNil p, EStr p "[]")
        , (PCons p (PVar p "x") (PNil p), showElem (EVar p "x"))
        , (PCons p (PVar p "x") (PVar p "rest"),
           EBin p OpAdd (showElem (EVar p "x"))
             (EBin p OpAdd (EStr p ", ") (EApply p (EVar p "go") (EVar p "rest"))))
        ]
    showElem e = EApply p (EVar p "show") e