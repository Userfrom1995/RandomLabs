{-# LANGUAGE LambdaCase #-}
module Halcyon.Type
  ( Type(..)
  , Scheme(..)
  , freeVars
  , freeVarsScheme
  , showType
  , showScheme
  , classTypeVar
  ) where

import qualified Data.Set as Set

-- | The variable index reserved for the single type parameter of classes
-- and instances (the class variable). Class and instance encodings (method
-- signatures, instance heads, contexts) are written in terms of this
-- variable; inference metavariables are allocated from 0 upward and never
-- reach this value, so the two namespaces never collide.
classTypeVar :: Int
classTypeVar = 2000000000

-- | Halcyon types. Inference uses @TVar@ for both rigid scheme variables
-- and fresh unification metavariables; the surrounding substitution decides
-- which is which. @TData@ names a user-defined algebraic data type applied
-- to its type arguments (e.g. @Maybe a@).
data Type
  = TVar Int
  | TInt
  | TFloat
  | TBool
  | TStr
  | TChar
  | TList Type
  | TData String [Type]
  | TRec String [Type]
  | TFun Type Type
  deriving (Eq, Show)

-- | A type scheme: an explicit list of universally quantified variables
-- plus a body, plus an optional class constraint context
-- (@class@-name -> type argument). This is the shape stored in the
-- environment, so @let@ gives polymorphism (and, since milestone 19,
-- constraint contexts) and lambda parameters stay monomorphic.
data Scheme = Scheme { schemeCtx :: [(String, Type)], schemeQvars :: Set.Set Int, schemeBody :: Type }
  deriving (Eq, Show)

-- | The set of type variables occurring free in a type.
freeVars :: Type -> Set.Set Int
freeVars = \case
  TVar v   -> Set.singleton v
  TList t  -> freeVars t
  TData _ ts -> Set.unions (map freeVars ts)
  TRec _ ts  -> Set.unions (map freeVars ts)
  TFun a b -> freeVars a `Set.union` freeVars b
  _        -> Set.empty

-- | The set of type variables occurring free in a scheme (its quantified
-- variables are bound, everything else is free).
freeVarsScheme :: Scheme -> Set.Set Int
freeVarsScheme (Scheme _ qvars t) = freeVars t `Set.difference` qvars

-- | Pretty-print a type. Free variables render as lowercase letters.
-- Function types are right-associative; the argument of a function type is
-- parenthesized only when it is itself a function type.
showType :: Type -> String
showType = go
  where
    go = \case
      TVar v   -> chr' v
      TInt     -> "Int"
      TFloat   -> "Float"
      TBool    -> "Bool"
      TStr     -> "String"
      TChar    -> "Char"
      TList t  -> "[" <> go t <> "]"
      TData n ts -> if null ts then n else n <> " " <> unwords (map goArg ts)
      TRec n ts  -> if null ts then n else n <> " " <> unwords (map goArg ts)
      TFun a b -> showArg a <> " -> " <> go b
    showArg t = case t of
      TFun _ _ -> "(" <> go t <> ")"
      _        -> go t
    goArg t = case t of
      TFun _ _   -> "(" <> go t <> ")"
      TList _    -> go t
      TData _ _  -> go t
      TRec _ _   -> go t
      _          -> go t
    chr' n
      | n >= 0 && n < 26 = [toEnum (fromEnum 'a' + n)]
      | otherwise        = "t" <> show n

-- | Pretty-print a scheme with its quantified variables and context.
showScheme :: Scheme -> String
showScheme (Scheme ctx qvars t) =
  (if null ctx then "" else ctxStr <> " => ") <> bodyStr
  where
    ctxStr = foldr (\s acc -> s <> if null acc then "" else ", " <> acc) "" [cn <> " " <> showType ct | (cn, ct) <- ctx]
    bodyStr =
      if Set.null qvars
        then showType t
        else "forall " <> unwords (map chr' (Set.toList qvars)) <> ". " <> showType t
    chr' n = [toEnum (fromEnum 'a' + n)]