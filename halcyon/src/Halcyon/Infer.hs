{-# LANGUAGE LambdaCase #-}
module Halcyon.Infer
  ( inferProgram
  , inferExpr
  , InferError(..)
  , Scheme(..)
  , Type(..)
  , showType
  , showScheme
  ) where

import Control.Monad (replicateM)
import qualified Data.Map.Strict as Map
import qualified Data.Set as Set

import Halcyon.Ast
import Halcyon.Parser (parseProgram, ParseError(..))
import Halcyon.Token (Pos)
import Halcyon.Type

-- | A positioned type error.
data InferError = TypeError Pos String
  deriving (Eq, Show)

-- | Type inference over a source string: parse, then infer in the empty
-- environment. Returns the inferred top-level type.
inferProgram :: String -> Either InferError Type
inferProgram src = case parseProgram src of
  Left (ParseError p m) -> Left (TypeError p m)
  Right expr            -> inferExpr expr

-- | Type inference over a parsed expression in the empty environment.
inferExpr :: Expr -> Either InferError Type
inferExpr expr = do
  (t, s) <- runInfer (infer Map.empty expr) (InferState Map.empty 0)
  return (resolveIn (isSubst s) t)

-- | Apply the final substitution to a type (used at the top level so the
-- reported principal type has no dangling metavariables).
resolveIn :: Subst -> Type -> Type
resolveIn sub = go
  where
    go = \case
      TVar v   -> case Map.lookup v sub of
        Just t  -> go t
        Nothing -> TVar v
      TList t  -> TList (go t)
      TFun a b -> TFun (go a) (go b)
      t        -> t

-- ---------------------------------------------------------------------
-- Inference state and monad
-- ---------------------------------------------------------------------

type Subst = Map.Map Int Type

data InferState = InferState
  { isSubst   :: Subst
  , isCounter :: Int
  }

newtype Infer a = Infer { runInfer :: InferState -> Either InferError (a, InferState) }

instance Functor Infer where
  fmap f (Infer g) = Infer $ \s -> case g s of
    Left e         -> Left e
    Right (a, s')  -> Right (f a, s')

instance Applicative Infer where
  pure a = Infer $ \s -> Right (a, s)
  Infer f <*> Infer g = Infer $ \s -> case f s of
    Left e        -> Left e
    Right (fn, s1) -> case g s1 of
      Left e        -> Left e
      Right (a, s2) -> Right (fn a, s2)

instance Monad Infer where
  Infer g >>= f = Infer $ \s -> case g s of
    Left e        -> Left e
    Right (a, s1) -> runInfer (f a) s1

type Env = Map.Map String Scheme

getSubst :: Infer Subst
getSubst = Infer $ \s -> Right (isSubst s, s)

modifySubst :: (Subst -> Subst) -> Infer ()
modifySubst f = Infer $ \s -> Right ((), s { isSubst = f (isSubst s) })

getCounter :: Infer Int
getCounter = Infer $ \s -> Right (isCounter s, s)

setCounter :: Int -> Infer ()
setCounter n = Infer $ \s -> Right ((), s { isCounter = n })

-- | Allocate a fresh, unconstrained type variable.
fresh :: Infer Type
fresh = do
  n <- getCounter
  setCounter (n + 1)
  return (TVar n)

-- | Bind a metavariable to a type, with an occurs check.
bindVar :: Pos -> Int -> Type -> Infer ()
bindVar pos v ty = do
  if v `Set.member` freeVars ty
    then throwError (TypeError pos ("infinite type: " <> showType (TVar v) <> " occurs in " <> showType ty))
    else modifySubst (Map.insert v ty)

-- | Resolve a type through the substitution to head normal form.
resolve :: Type -> Infer Type
resolve = \case
  TVar v -> do
    m <- Map.lookup v <$> getSubst
    case m of
      Just t  -> resolve t
      Nothing -> return (TVar v)
  TList t  -> TList <$> resolve t
  TFun a b -> TFun <$> resolve a <*> resolve b
  t        -> return t

throwError :: InferError -> Infer a
throwError e = Infer $ \_ -> Left e

-- | Standard unification (no numeric promotion).
unify :: Pos -> Type -> Type -> Infer ()
unify pos t1 t2 = do
  r1 <- resolve t1
  r2 <- resolve t2
  case (r1, r2) of
    (TVar a, TVar b) | a == b -> return ()
    (TVar a, t)  -> bindVar pos a t
    (t, TVar b)  -> bindVar pos b t
    (TInt, TInt)     -> return ()
    (TFloat, TFloat) -> return ()
    (TBool, TBool)   -> return ()
    (TStr, TStr)     -> return ()
    (TList x, TList y) -> unify pos x y
    (TFun a1 b1, TFun a2 b2) -> unify pos a1 a2 >> unify pos b1 b2
    _ -> throwError (TypeError pos (mismatch r1 r2))

-- | Instantiate a scheme: replace every quantified variable with a fresh
-- one. Non-quantified variables remain live metavariables of the enclosing
-- inference.
instantiate :: Scheme -> Infer Type
instantiate (Scheme qvars t) = do
  freshVars <- mapM (const fresh) (Set.toList qvars)
  let m = Map.fromList (zip (Set.toList qvars) freshVars)
  return (applyMeta m t)

applyMeta :: Map.Map Int Type -> Type -> Type
applyMeta m = \case
  TVar v   -> Map.findWithDefault (TVar v) v m
  TList t  -> TList (applyMeta m t)
  TFun a b -> TFun (applyMeta m a) (applyMeta m b)
  t        -> t

-- ---------------------------------------------------------------------
-- Inference
-- ---------------------------------------------------------------------

infer :: Env -> Expr -> Infer Type
infer env e = case e of
  EInt _ _     -> return TInt
  EFloat _ _   -> return TFloat
  EBool _ _    -> return TBool
  EStr _ _     -> return TStr
  EList p es   -> inferList p env es
  EVar p name  -> inferVar p env name
  EBuiltin p b -> inferBuiltin p b
  ELambda p params body -> inferLambda p env params body
  EApply p fn arg -> inferApply p env fn arg
  ELet p rec name bound body -> inferLet p rec name env bound body
  EIf p c t e   -> inferIf p env c t e
  EBin p op a b -> inferBin p op env a b
  ENeg p x      -> inferNeg p env x
  ENot p x      -> inferNot p env x

inferList :: Pos -> Env -> [Expr] -> Infer Type
inferList p env es = do
  et <- fresh
  mapM_ (\e -> do { t <- infer env e; unify p t et }) es
  return (TList et)

inferVar :: Pos -> Env -> String -> Infer Type
inferVar p env name =
  case Map.lookup name env of
    Nothing   -> throwError (TypeError p ("unbound name: " <> name))
    Just sch  -> instantiate sch

inferBuiltin :: Pos -> Builtin -> Infer Type
inferBuiltin _ b =
  instantiate $ case b of
    BCons    -> Scheme (Set.singleton 0) (TFun (TVar 0) (TFun (TList (TVar 0)) (TList (TVar 0))))
    BHead    -> Scheme (Set.singleton 0) (TFun (TList (TVar 0)) (TVar 0))
    BTail    -> Scheme (Set.singleton 0) (TFun (TList (TVar 0)) (TList (TVar 0)))
    BIsNil   -> Scheme (Set.singleton 0) (TFun (TList (TVar 0)) TBool)
    BLength  -> Scheme (Set.singleton 0) (TFun (TList (TVar 0)) TInt)
    BReverse -> Scheme (Set.singleton 0) (TFun (TList (TVar 0)) (TList (TVar 0)))
    BAppend  -> Scheme (Set.singleton 0) (TFun (TList (TVar 0)) (TFun (TList (TVar 0)) (TList (TVar 0))))
    BTake    -> Scheme (Set.singleton 0) (TFun TInt (TFun (TList (TVar 0)) (TList (TVar 0))))
    BDrop    -> Scheme (Set.singleton 0) (TFun TInt (TFun (TList (TVar 0)) (TList (TVar 0))))

inferLambda :: Pos -> Env -> [String] -> Expr -> Infer Type
inferLambda _ env params body = do
  paramTypes <- replicateM (length params) fresh
  let env' = foldr (\(n, t) acc -> Map.insert n (Scheme Set.empty t) acc) env (zip params paramTypes)
  bodyT <- infer env' body
  return (foldr TFun bodyT paramTypes)

inferApply :: Pos -> Env -> Expr -> Expr -> Infer Type
inferApply p env fn arg = do
  tf <- infer env fn
  ta <- infer env arg
  tr <- fresh
  unify p tf (TFun ta tr)
  return tr

inferLet :: Pos -> Bool -> String -> Env -> Expr -> Expr -> Infer Type
inferLet p rec name env bound body = do
  t <- fresh
  let envRec = Map.insert name (Scheme Set.empty t) env
      envBound = if rec then envRec else env
  tb <- infer envBound bound
  unify p t tb
  tbR <- resolve tb
  let ftv = schemeFtv env
      sch = generalize ftv tbR
  bodyT <- infer (Map.insert name sch env) body
  return bodyT

inferIf :: Pos -> Env -> Expr -> Expr -> Expr -> Infer Type
inferIf p env c t e = do
  tc <- infer env c
  unify p tc TBool
  tt <- infer env t
  te <- infer env e
  unify p tt te
  return tt

inferBin :: Pos -> Op -> Env -> Expr -> Expr -> Infer Type
inferBin p op env a b
  | op `elem` [OpAdd, OpSub, OpMul, OpDiv] = do
      ta <- infer env a
      tb <- infer env b
      numericPromote p ta tb
  | op `elem` [OpLt, OpLe, OpGt, OpGe] = do
      ta <- infer env a
      tb <- infer env b
      _ <- numericPromote p ta tb
      return TBool
  | op `elem` [OpEq, OpNe] = do
      ta <- infer env a
      tb <- infer env b
      unify p ta tb
      return TBool
  | otherwise = do -- OpAnd, OpOr
      ta <- infer env a
      unify p ta TBool
      tb <- infer env b
      unify p tb TBool
      return TBool

inferNeg :: Pos -> Env -> Expr -> Infer Type
inferNeg p env x = do
  tx <- infer env x
  rx <- resolve tx
  case rx of
    TInt    -> return TInt
    TFloat  -> return TFloat
    TVar _  -> return rx
    _       -> throwError (TypeError p "unary minus requires a numeric operand")

inferNot :: Pos -> Env -> Expr -> Infer Type
inferNot p env x = do
  tx <- infer env x
  unify p tx TBool
  return TBool

-- | Numeric promotion for an arithmetic/comparison operator. Operands must
-- be numeric; when one is @Int@ and the other @Float@ the result is
-- @Float@. Unresolved metavariables are bound to the concrete numeric type
-- of the other operand, or shared when both are unresolved.
numericPromote :: Pos -> Type -> Type -> Infer Type
numericPromote p ta tb = do
  ra <- resolve ta
  rb <- resolve tb
  case (ra, rb) of
    (TInt, TInt)     -> return TInt
    (TFloat, TFloat) -> return TFloat
    (TInt, TFloat)   -> return TFloat
    (TFloat, TInt)   -> return TFloat
    (TVar a, TFloat) -> bindVar p a TFloat >> return TFloat
    (TFloat, TVar a) -> bindVar p a TFloat >> return TFloat
    (TVar a, TInt)   -> bindVar p a TInt >> return TInt
    (TInt, TVar a)   -> bindVar p a TInt >> return TInt
    (TVar a, TVar b) | a == b   -> return (TVar a)
    (TVar a, TVar b) -> bindVar p b (TVar a) >> return (TVar a)
    _ -> throwError (TypeError p (numericMismatch ra rb))

-- | Free type variables in every scheme of the environment.
schemeFtv :: Env -> Set.Set Int
schemeFtv env = Set.unions (map (freeVars . schemeBody) (Map.elems env))

-- | Generalize a resolved type over all free variables not present in the
-- environment, yielding a closed scheme.
generalize :: Set.Set Int -> Type -> Scheme
generalize ftv t = Scheme (freeVars t `Set.difference` ftv) t

mismatch :: Type -> Type -> String
mismatch t1 t2 =
  "type mismatch: cannot unify " <> showType t1 <> " with " <> showType t2

numericMismatch :: Type -> Type -> String
numericMismatch t1 t2 =
  "numeric operands required for arithmetic/comparison, found "
    <> showType t1 <> " and " <> showType t2