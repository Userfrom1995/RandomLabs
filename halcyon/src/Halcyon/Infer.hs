{-# LANGUAGE LambdaCase #-}
module Halcyon.Infer
  ( inferProgram
  , inferProgramIn
  , inferExpr
  , InferError(..)
  , Scheme(..)
  , Type(..)
  , showType
  , showScheme
  ) where

import Control.Monad (replicateM, foldM)
import qualified Data.Map.Strict as Map
import qualified Data.Set as Set

import Halcyon.Ast
import Halcyon.Data (DataEnv, CtorInfo(..), emptyDataEnv, buildDataEnv, progDataEnv, checkProgram, ctorFor)
import Halcyon.Parser (parseProgram, ParseError(..))
import Halcyon.Token (Pos(..))
import Halcyon.Type

-- | A positioned type error.
data InferError = TypeError Pos String
  deriving (Eq, Show)

-- | Type inference over a source string: parse, resolve the data
-- declarations, then infer the top-level definitions (each generalized in
-- order) followed by the final expression. Returns @Nothing@ when the
-- program is a definitions-only module with no expression to infer.
inferProgram :: String -> Either InferError (Maybe Type)
inferProgram src = case parseProgram src of
  Left (ParseError p m) -> Left (TypeError p m)
  Right prog            -> inferProgramIn prog

-- | Type inference over an already-parsed, fully-resolved program. Imports
-- must be resolved before this (see 'Halcyon.Module'); the merged defs are
-- inferred left to right with top-level generalization, exactly like the
-- @let@ rule, then the final expression (if any).
inferProgramIn :: Program -> Either InferError (Maybe Type)
inferProgramIn prog = do
  case checkProgram prog of
    Left m  -> Left (TypeError (Pos 0 0) m)
    Right _ -> Right ()
  denv <- case progDataEnv prog of
    Left m  -> Left (TypeError (Pos 0 0) m)
    Right d -> Right d
  env <- foldM (inferDef denv) Map.empty (progDefs prog)
  case progExpr prog of
    Nothing   -> return Nothing
    Just expr -> do
      (t, s) <- runInfer (infer env denv expr) (InferState Map.empty 0)
      return (Just (resolveIn (isSubst s) t))

-- | Infer one top-level definition and extend the environment with its
-- generalized scheme. @data@ declarations add nothing; @let@ bindings are
-- inferred exactly like an @inferLet@ without a body (so @let rec@ binds
-- its name monomorphically while inferring the bound expression), and the
-- resulting type is generalized so later defs and the final expression see
-- the polymorphism.
inferDef :: DataEnv -> Env -> TopDef -> Either InferError Env
inferDef denv env = \case
  DefData _ -> Right env
  DefLet p rec name bound ->
    case runInfer (inferTopDef denv env p rec name bound) (InferState Map.empty 0) of
      Left e        -> Left e
      Right (sch, _) -> Right (Map.insert name sch env)
  where
    inferTopDef :: DataEnv -> Env -> Pos -> Bool -> String -> Expr -> Infer Scheme
    inferTopDef denv env p rec name bound = do
      t <- fresh
      let envRec    = Map.insert name (Scheme Set.empty t) env
          envBound  = if rec then envRec else env
      tb <- infer envBound denv bound
      unify p t tb
      tbR <- resolve tb
      return (generalize (schemeFtv env) tbR)

-- | Type inference over a parsed expression with an empty data environment.
inferExpr :: Expr -> Either InferError Type
inferExpr = inferExprIn emptyDataEnv

-- | Type inference over a parsed expression in a given data environment.
inferExprIn :: DataEnv -> Expr -> Either InferError Type
inferExprIn denv expr = do
  (t, s) <- runInfer (infer Map.empty denv expr) (InferState Map.empty 0)
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
      TData n ts -> TData n (map go ts)
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
  TData n ts -> TData n <$> mapM resolve ts
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
    (TData n1 as, TData n2 bs)
      | n1 == n2 && length as == length bs ->
          mapM_ (\case { (a, b) -> unify pos a b }) (zip as bs)
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
  TData n ts -> TData n (map (applyMeta m) ts)
  TFun a b -> TFun (applyMeta m a) (applyMeta m b)
  t        -> t

-- ---------------------------------------------------------------------
-- Inference
-- ---------------------------------------------------------------------

infer :: Env -> DataEnv -> Expr -> Infer Type
infer env denv e = case e of
  EInt _ _     -> return TInt
  EFloat _ _   -> return TFloat
  EBool _ _    -> return TBool
  EStr _ _     -> return TStr
  EList p es   -> inferList p denv env es
  EVar p name  -> inferVar p env name
  EConstr p name -> inferConstr p denv name
  EBuiltin p b -> inferBuiltin p b
  ELambda p params body -> inferLambda p denv env params body
  EApply p fn arg -> inferApply p denv env fn arg
  ELet p rec name bound body -> inferLet p rec name denv env bound body
  EIf p c t e   -> inferIf p denv env c t e
  EMatch p s bs -> inferMatch p denv env s bs
  EBin p op a b -> inferBin p op denv env a b
  ENeg p x      -> inferNeg p denv env x
  ENot p x      -> inferNot p denv env x

-- | A bare constructor reference has its declared polymorphic scheme, so
-- @Just@ alone is a function and @Nothing@ is a value.
inferConstr :: Pos -> DataEnv -> String -> Infer Type
inferConstr p denv name =
  case ctorFor name denv of
    Nothing   -> throwError (TypeError p ("unbound constructor: " <> name))
    Just info -> instantiate (ciScheme info)

inferList :: Pos -> DataEnv -> Env -> [Expr] -> Infer Type
inferList p denv env es = do
  et <- fresh
  mapM_ (\e -> do { t <- infer env denv e; unify p t et }) es
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

inferLambda :: Pos -> DataEnv -> Env -> [String] -> Expr -> Infer Type
inferLambda _ denv env params body = do
  paramTypes <- replicateM (length params) fresh
  let env' = foldr (\(n, t) acc -> Map.insert n (Scheme Set.empty t) acc) env (zip params paramTypes)
  bodyT <- infer env' denv body
  return (foldr TFun bodyT paramTypes)

inferApply :: Pos -> DataEnv -> Env -> Expr -> Expr -> Infer Type
inferApply p denv env fn arg = do
  tf <- infer env denv fn
  ta <- infer env denv arg
  tr <- fresh
  unify p tf (TFun ta tr)
  return tr

inferLet :: Pos -> Bool -> String -> DataEnv -> Env -> Expr -> Expr -> Infer Type
inferLet p rec name denv env bound body = do
  t <- fresh
  let envRec = Map.insert name (Scheme Set.empty t) env
      envBound = if rec then envRec else env
  tb <- infer envBound denv bound
  unify p t tb
  tbR <- resolve tb
  let ftv = schemeFtv env
      sch = generalize ftv tbR
  bodyT <- infer (Map.insert name sch env) denv body
  return bodyT

inferIf :: Pos -> DataEnv -> Env -> Expr -> Expr -> Expr -> Infer Type
inferIf p denv env c t e = do
  tc <- infer env denv c
  unify p tc TBool
  tt <- infer env denv t
  te <- infer env denv e
  unify p tt te
  return tt

-- | @match scrut with | pat => e@. The scrutinee type is matched against
-- each pattern; pattern variables bind monomorphically inside their branch
-- body, and every branch body must share one result type.
inferMatch :: Pos -> DataEnv -> Env -> Expr -> [(Pattern, Expr)] -> Infer Type
inferMatch p denv env scrut branches = case branches of
  [] -> throwError (TypeError p "empty match")
  _  -> do
    ts <- infer env denv scrut
    rt <- fresh
    mapM_ (checkBranch ts rt) branches
    return rt
  where
    checkBranch ts rt (pat, body) = do
      env' <- checkPattern p denv env pat ts
      bt <- infer env' denv body
      unify p bt rt

-- | Check a pattern against a scrutinee type, returning the environment
-- extended with the pattern's variable bindings (bound monomorphically).
checkPattern :: Pos -> DataEnv -> Env -> Pattern -> Type -> Infer Env
checkPattern p denv env pat ty = case pat of
  PWild _       -> return env
  PVar _ name   -> return (Map.insert name (Scheme Set.empty ty) env)
  PInt _ _      -> unify p ty TInt >> return env
  PFloat _ _    -> unify p ty TFloat >> return env
  PBool _ _     -> unify p ty TBool >> return env
  PStr _ _      -> unify p ty TStr >> return env
  PNil _        -> do
    et <- fresh
    unify p ty (TList et)
    return env
  PCons _ h t   -> do
    et <- fresh
    unify p ty (TList et)
    env1 <- checkPattern p denv env h et
    checkPattern p denv env1 t (TList et)
  PList _ ps    -> do
    et <- fresh
    unify p ty (TList et)
    foldM (\e pat -> checkPattern p denv e pat et) env ps
  PConstr _ name ps -> case ctorFor name denv of
    Nothing -> throwError (TypeError p ("unbound constructor: " <> name))
    Just ci -> do
      inst <- instantiate (ciScheme ci)
      let (fields, resultT) = splitFun inst
      unify p resultT ty
      if length fields /= length ps
        then throwError (TypeError p
               ("constructor " <> name <> " takes " <> show (length fields)
                <> " arguments, but the pattern has " <> show (length ps)))
        else foldM (\e (ft, fpat) -> checkPattern p denv e fpat ft) env (zip fields ps)

-- | Split a function type into its argument types and the result type.
splitFun :: Type -> ([Type], Type)
splitFun (TFun a b) =
  let (as, r) = splitFun b
  in (a : as, r)
splitFun t = ([], t)

inferBin :: Pos -> Op -> DataEnv -> Env -> Expr -> Expr -> Infer Type
inferBin p op denv env a b
  | op `elem` [OpAdd, OpSub, OpMul, OpDiv] = do
      ta <- infer env denv a
      tb <- infer env denv b
      numericPromote p ta tb
  | op `elem` [OpLt, OpLe, OpGt, OpGe] = do
      ta <- infer env denv a
      tb <- infer env denv b
      _ <- numericPromote p ta tb
      return TBool
  | op `elem` [OpEq, OpNe] = do
      ta <- infer env denv a
      tb <- infer env denv b
      unify p ta tb
      return TBool
  | otherwise = do -- OpAnd, OpOr
      ta <- infer env denv a
      unify p ta TBool
      tb <- infer env denv b
      unify p tb TBool
      return TBool

inferNeg :: Pos -> DataEnv -> Env -> Expr -> Infer Type
inferNeg p denv env x = do
  tx <- infer env denv x
  rx <- resolve tx
  case rx of
    TInt    -> return TInt
    TFloat  -> return TFloat
    TVar _  -> return rx
    _       -> throwError (TypeError p "unary minus requires a numeric operand")

inferNot :: Pos -> DataEnv -> Env -> Expr -> Infer Type
inferNot p denv env x = do
  tx <- infer env denv x
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

-- | Free type variables in every scheme of the environment. Quantified
-- variables are bound and do not count, so a fully generalized scheme
-- contributes nothing (only monomorphic, open schemes constrain later defs).
schemeFtv :: Env -> Set.Set Int
schemeFtv env = Set.unions (map freeVarsScheme (Map.elems env))

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