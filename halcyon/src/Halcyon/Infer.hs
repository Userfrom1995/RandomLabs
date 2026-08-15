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
import Halcyon.Classes (ClassEnv(..), ClassInfo(..), InstanceInfo(..), emptyClassEnv, buildClassEnv, methodClass, unifyHeadB, findInstance)
import Halcyon.Data (DataEnv, CtorInfo(..), emptyDataEnv, progEnvs, checkProgram, ctorFor)
import Halcyon.Parser (parseProgram, ParseError(..))
import Halcyon.Record (RecordEnv, emptyRecordEnv, recordFor, recordForFields, RecordInfo(..))
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
-- @let@ rule, then the final expression (if any). Class constraints are
-- accumulated while inferring, generalized into schemes at @let@/top-level
-- definitions, and discharged against the class environment afterwards.
inferProgramIn :: Program -> Either InferError (Maybe Type)
inferProgramIn prog = do
  case checkProgram prog of
    Left m  -> Left (TypeError (Pos 0 0) m)
    Right _ -> Right ()
  (denv, renv) <- case progEnvs prog of
    Left m  -> Left (TypeError (Pos 0 0) m)
    Right e -> Right e
  cenv <- case buildClassEnv prog of
    Left m  -> Left (TypeError (Pos 0 0) m)
    Right c -> Right c
  case runInfer (inferDefs denv renv (progDefs prog) (progExpr prog))
               (InferState Map.empty 0 cenv []) of
    Left e         -> Left e
    Right (mt, s)  ->
      case runInfer (solveConstraints (isConstraints s)) s of
        Left e -> Left e
        Right (_, s') -> Right (fmap (\t -> resolveIn (isSubst s') t) mt)

-- | Infer all top-level definitions (generalized in order), then the final
-- expression if present. One 'Infer' run so the constraint accumulator and
-- substitution are shared across defs.
inferDefs :: DataEnv -> RecordEnv -> [TopDef] -> Maybe Expr -> Infer (Maybe Type)
inferDefs denv renv defs mexpr = do
  env <- foldM (inferDef denv renv) Map.empty defs
  case mexpr of
    Nothing   -> return Nothing
    Just expr -> Just <$> infer env denv renv expr

-- | Infer one top-level definition and extend the environment with its
-- generalized scheme. @data@/@record@/@class@ declarations add nothing;
-- @instance@ declarations are validated and add nothing; @let@ bindings are
-- inferred exactly like an @inferLet@ without a body, and the resulting type
-- is generalized (with its pending class constraints) so later defs and the
-- final expression see the polymorphism.
inferDef :: DataEnv -> RecordEnv -> Env -> TopDef -> Infer Env
inferDef denv renv env = \case
  DefData _       -> return env
  DefRecord _     -> return env
  DefClass _      -> return env
  DefInstance inst -> checkInstance denv renv env inst >> return env
  DefLet p rec name bound -> do
    t <- fresh
    let envRec    = Map.insert name (Scheme [] Set.empty t) env
        envBound  = if rec then envRec else env
    tb <- infer envBound denv renv bound
    unify p t tb
    tbR <- resolve tb
    pending <- getConstraints
    let ftv = schemeFtv env
        qvars = freeVars tbR `Set.difference` ftv
    (ctx, keep) <- partitionCtx qvars pending
    setConstraints keep
    return (Map.insert name (Scheme ctx qvars tbR) env)

-- | Validate an @instance@ declaration: every class method must be
-- implemented with a body whose type matches the class's declared method
-- type with the class variable replaced by the instance head. Class
-- constraints the method bodies raise on the instance head's type variables
-- are discharged against the instance's declared context.
checkInstance :: DataEnv -> RecordEnv -> Env -> InstanceDecl -> Infer ()
checkInstance denv renv env inst = do
  cenv <- getCenv
  ci <- case Map.lookup (idClass inst) (ceClasses cenv) of
    Nothing -> throwError (TypeError (idPos inst) ("unknown class: " <> idClass inst))
    Just c  -> return c
  before <- getConstraints
  mapM_ (checkMethod ci) (idMethods inst)
  pending <- getConstraints
  let added = drop (length before) pending
  (_, keep) <- dischargeCtx (idCtx inst) added
  setConstraints (take (length before) pending <> keep)
  where
    checkMethod ci (mname, mbody) =
      case lookup mname (clMethods ci) of
        Nothing -> throwError (TypeError (idPos inst) ("class " <> clName ci <> " has no method " <> mname))
        Just mty -> do
          let expected = applyMeta (Map.singleton classTypeVar (idHead inst)) mty
          mt <- infer env denv renv mbody
          unify (idPos inst) mt expected

-- | Discharge constraints whose resolved type mentions only the instance
-- head's type variables against the instance's declared context. The
-- instance context justifies constraints on its own type variable for its
-- class; constraints on other classes or on concrete types stay pending.
-- Constraint types are resolved against the current substitution first, so
-- a constraint raised on the head's element (e.g. @Size a@ for the head
-- @Pair a@) is seen to mention only the head variable.
dischargeCtx :: Maybe (String, Type) -> Constraints -> Infer ([(String, Type)], Constraints)
dischargeCtx Nothing  cs          = return ([], cs)
dischargeCtx (Just (cn, _)) cs    = foldM step ([], []) cs
  where
    step (dis, keep) (pos, c, ty) = do
      rty <- resolve ty
      if c == cn && not (Set.null (freeVars rty)) && freeVars rty `Set.isSubsetOf` headVars
        then return (dis, keep)
        else return (dis, (pos, c, rty) : keep)
    headVars = Set.singleton classTypeVar

-- | Type inference over a parsed expression with an empty data and record
-- environment.
inferExpr :: Expr -> Either InferError Type
inferExpr = inferExprIn emptyDataEnv emptyRecordEnv

-- | Type inference over a parsed expression in given data and record
-- environments. Class constraints are discharged after inference.
inferExprIn :: DataEnv -> RecordEnv -> Expr -> Either InferError Type
inferExprIn denv renv expr = do
  (t, s0) <- runInfer (infer Map.empty denv renv expr)
                     (InferState Map.empty 0 emptyClassEnv [])
  (_, s) <- runInfer (solveConstraints (isConstraints s0)) s0
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
      TRec n ts  -> TRec n (map go ts)
      TFun a b -> TFun (go a) (go b)
      t        -> t

-- ---------------------------------------------------------------------
-- Inference state and monad
-- ---------------------------------------------------------------------

type Subst = Map.Map Int Type

-- | A pending class constraint: its source position, the class name, and
-- the type the class is demanded at.
type Constraints = [(Pos, String, Type)]

data InferState = InferState
  { isSubst       :: Subst
  , isCounter     :: Int
  , isCenv        :: ClassEnv
  , isConstraints :: Constraints
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

getCenv :: Infer ClassEnv
getCenv = Infer $ \s -> Right (isCenv s, s)

getConstraints :: Infer Constraints
getConstraints = Infer $ \s -> Right (isConstraints s, s)

setConstraints :: Constraints -> Infer ()
setConstraints cs = Infer $ \s -> Right ((), s { isConstraints = cs })

addConstraint :: Pos -> String -> Type -> Infer ()
addConstraint pos cn ty = Infer $ \s ->
  Right ((), s { isConstraints = isConstraints s ++ [(pos, cn, ty)] })

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
  TRec n ts  -> TRec n <$> mapM resolve ts
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
    (TRec n1 as, TRec n2 bs)
      | n1 == n2 && length as == length bs ->
          mapM_ (\case { (a, b) -> unify pos a b }) (zip as bs)
    (TFun a1 b1, TFun a2 b2) -> unify pos a1 a2 >> unify pos b1 b2
    _ -> throwError (TypeError pos (mismatch r1 r2))

-- | Instantiate a scheme: replace every quantified variable with a fresh
-- one and re-emit the scheme's class context as pending constraints on the
-- fresh variables. Non-quantified variables remain live metavariables of the
-- enclosing inference.
instantiate :: Pos -> Scheme -> Infer Type
instantiate pos (Scheme ctx qvars t) = do
  freshVars <- mapM (const fresh) (Set.toList qvars)
  let m = Map.fromList (zip (Set.toList qvars) freshVars)
  mapM_ (\(cn, cty) -> addConstraint pos cn (applyMeta m cty)) ctx
  return (applyMeta m t)

applyMeta :: Map.Map Int Type -> Type -> Type
applyMeta m = \case
  TVar v   -> Map.findWithDefault (TVar v) v m
  TList t  -> TList (applyMeta m t)
  TData n ts -> TData n (map (applyMeta m) ts)
  TRec n ts  -> TRec n (map (applyMeta m) ts)
  TFun a b -> TFun (applyMeta m a) (applyMeta m b)
  t        -> t

-- ---------------------------------------------------------------------
-- Inference
-- ---------------------------------------------------------------------

infer :: Env -> DataEnv -> RecordEnv -> Expr -> Infer Type
infer env denv renv e = case e of
  EInt _ _     -> return TInt
  EFloat _ _   -> return TFloat
  EBool _ _    -> return TBool
  EStr _ _     -> return TStr
  EList p es   -> inferList p denv renv env es
  EVar p name  -> inferVar p env name
  EConstr p name -> inferConstr p denv name
  EBuiltin p b -> inferBuiltin p b
  ELambda p params body -> inferLambda p denv renv env params body
  EApply p fn arg -> inferApply p denv renv env fn arg
  ELet p rec name bound body -> inferLet p rec name denv renv env bound body
  EIf p c t e   -> inferIf p denv renv env c t e
  EMatch p s bs -> inferMatch p denv renv env s bs
  ERecord p fields -> inferRecord p denv renv env fields
  EProj p e name -> inferProj p denv renv env e name
  EUpdate p e name ne -> inferUpdate p denv renv env e name ne
  EBin p op a b -> inferBin p op denv renv env a b
  ENeg p x      -> inferNeg p denv renv env x
  ENot p x      -> inferNot p denv renv env x

-- | A bare constructor reference has its declared polymorphic scheme, so
-- @Just@ alone is a function and @Nothing@ is a value.
inferConstr :: Pos -> DataEnv -> String -> Infer Type
inferConstr p denv name =
  case ctorFor name denv of
    Nothing   -> throwError (TypeError p ("unbound constructor: " <> name))
    Just info -> instantiate p (ciScheme info)

inferList :: Pos -> DataEnv -> RecordEnv -> Env -> [Expr] -> Infer Type
inferList p denv renv env es = do
  et <- fresh
  mapM_ (\e -> do { t <- infer env denv renv e; unify p t et }) es
  return (TList et)

-- | A variable reference. Environment names win; a name that is not bound
-- but is a class method (e.g. @show@) becomes a method reference with a
-- class constraint on a fresh type variable, so applying it demands an
-- instance.
inferVar :: Pos -> Env -> String -> Infer Type
inferVar p env name =
  case Map.lookup name env of
    Just sch  -> instantiate p sch
    Nothing   -> do
      cenv <- getCenv
      case methodClass name cenv of
        Nothing -> throwError (TypeError p ("unbound name: " <> name))
        Just (cn, mty) -> do
          a <- fresh
          addConstraint p cn a
          return (applyMeta (Map.singleton classTypeVar a) mty)

inferBuiltin :: Pos -> Builtin -> Infer Type
inferBuiltin _ b =
  instantiate (Pos 0 0) $ case b of
    BCons    -> Scheme [] (Set.singleton 0) (TFun (TVar 0) (TFun (TList (TVar 0)) (TList (TVar 0))))
    BHead    -> Scheme [] (Set.singleton 0) (TFun (TList (TVar 0)) (TVar 0))
    BTail    -> Scheme [] (Set.singleton 0) (TFun (TList (TVar 0)) (TList (TVar 0)))
    BIsNil   -> Scheme [] (Set.singleton 0) (TFun (TList (TVar 0)) TBool)
    BLength  -> Scheme [] (Set.singleton 0) (TFun (TList (TVar 0)) TInt)
    BReverse -> Scheme [] (Set.singleton 0) (TFun (TList (TVar 0)) (TList (TVar 0)))
    BAppend  -> Scheme [] (Set.singleton 0) (TFun (TList (TVar 0)) (TFun (TList (TVar 0)) (TList (TVar 0))))
    BTake    -> Scheme [] (Set.singleton 0) (TFun TInt (TFun (TList (TVar 0)) (TList (TVar 0))))
    BDrop    -> Scheme [] (Set.singleton 0) (TFun TInt (TFun (TList (TVar 0)) (TList (TVar 0))))
    BIntToStr   -> Scheme [] Set.empty (TFun TInt TStr)
    BFloatToStr -> Scheme [] Set.empty (TFun TFloat TStr)
    BBoolToStr  -> Scheme [] Set.empty (TFun TBool TStr)
    BStrToStr   -> Scheme [] Set.empty (TFun TStr TStr)
    BListToStr  -> Scheme [] (Set.singleton 0) (TFun (TList (TVar 0)) TStr)

inferLambda :: Pos -> DataEnv -> RecordEnv -> Env -> [String] -> Expr -> Infer Type
inferLambda _ denv renv env params body = do
  paramTypes <- replicateM (length params) fresh
  let env' = foldr (\(n, t) acc -> Map.insert n (Scheme [] Set.empty t) acc) env (zip params paramTypes)
  bodyT <- infer env' denv renv body
  return (foldr TFun bodyT paramTypes)

inferApply :: Pos -> DataEnv -> RecordEnv -> Env -> Expr -> Expr -> Infer Type
inferApply p denv renv env fn arg = do
  tf <- infer env denv renv fn
  ta <- infer env denv renv arg
  tr <- fresh
  unify p tf (TFun ta tr)
  return tr

inferLet :: Pos -> Bool -> String -> DataEnv -> RecordEnv -> Env -> Expr -> Expr -> Infer Type
inferLet p rec name denv renv env bound body = do
  t <- fresh
  let envRec = Map.insert name (Scheme [] Set.empty t) env
      envBound = if rec then envRec else env
  tb <- infer envBound denv renv bound
  unify p t tb
  tbR <- resolve tb
  pending <- getConstraints
  let ftv = schemeFtv env
      qvars = freeVars tbR `Set.difference` ftv
  (ctx, keep) <- partitionCtx qvars pending
  setConstraints keep
  let sch = Scheme ctx qvars tbR
  bodyT <- infer (Map.insert name sch env) denv renv body
  return bodyT

inferIf :: Pos -> DataEnv -> RecordEnv -> Env -> Expr -> Expr -> Expr -> Infer Type
inferIf p denv renv env c t e = do
  tc <- infer env denv renv c
  unify p tc TBool
  tt <- infer env denv renv t
  te <- infer env denv renv e
  unify p tt te
  return tt

-- | @match scrut with | pat => e@. The scrutinee type is matched against
-- each pattern; pattern variables bind monomorphically inside their branch
-- body, and every branch body must share one result type.
inferMatch :: Pos -> DataEnv -> RecordEnv -> Env -> Expr -> [(Pattern, Expr)] -> Infer Type
inferMatch p denv renv env scrut branches = case branches of
  [] -> throwError (TypeError p "empty match")
  _  -> do
    ts <- infer env denv renv scrut
    rt <- fresh
    mapM_ (checkBranch ts rt) branches
    return rt
  where
    checkBranch ts rt (pat, body) = do
      env' <- checkPattern p denv renv env pat ts
      bt <- infer env' denv renv body
      unify p bt rt

-- | Check a pattern against a scrutinee type, returning the environment
-- extended with the pattern's variable bindings (bound monomorphically).
checkPattern :: Pos -> DataEnv -> RecordEnv -> Env -> Pattern -> Type -> Infer Env
checkPattern p denv renv env pat ty = case pat of
  PWild _       -> return env
  PVar _ name   -> return (Map.insert name (Scheme [] Set.empty ty) env)
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
    env1 <- checkPattern p denv renv env h et
    checkPattern p denv renv env1 t (TList et)
  PList _ ps    -> do
    et <- fresh
    unify p ty (TList et)
    foldM (\e pat -> checkPattern p denv renv e pat et) env ps
  PConstr _ name ps -> case ctorFor name denv of
    Nothing -> throwError (TypeError p ("unbound constructor: " <> name))
    Just ci -> do
      inst <- instantiate p (ciScheme ci)
      let (fields, resultT) = splitFun inst
      unify p resultT ty
      if length fields /= length ps
        then throwError (TypeError p
               ("constructor " <> name <> " takes " <> show (length fields)
                <> " arguments, but the pattern has " <> show (length ps)))
        else foldM (\e (ft, fpat) -> checkPattern p denv renv e fpat ft) env (zip fields ps)
  PRecord _ fields -> checkRecordPattern p denv renv env ty fields

-- | Split a function type into its argument types and the result type.
splitFun :: Type -> ([Type], Type)
splitFun (TFun a b) =
  let (as, r) = splitFun b
  in (a : as, r)
splitFun t = ([], t)

-- | Instantiate a record's field types: fresh type variables for the
-- record's type parameters, applied to every field's declared type. The
-- record type of a literal @{ ... }@ is @TRec name tyvarInsts@.
instantiateFields :: RecordInfo -> Infer ([Type], [(String, Type)])
instantiateFields ri = do
  tvs <- replicateM (riArity ri) fresh
  let m = Map.fromList (zip [0 .. riArity ri - 1] tvs)
  return (tvs, [(f, applyMeta m ft) | (f, ft) <- riFields ri])

-- | @{ f1 = e1, ..., fn = en }@. Every declared field must appear exactly
-- once (any order); the literal resolves to the unique record owning its
-- field set, and each field's inferred type unifies with the declared field
-- type.
inferRecord :: Pos -> DataEnv -> RecordEnv -> Env -> [(String, Expr)] -> Infer Type
inferRecord p denv renv env fields = do
  checkFields p renv fields
  let fs = Set.fromList (map fst fields)
  (name, ri) <- case recordForFields fs renv of
    Nothing -> throwError (TypeError p ("no record with fields " <> show (Set.toList fs)))
    Just x  -> return x
  (tvs, fieldTys) <- instantiateFields ri
  let ftys = Map.fromList fieldTys
  mapM_ (\case
    (f, e) -> do
      t <- infer env denv renv e
      unify p t (ftys Map.! f)) fields
  return (TRec name tvs)

-- | Field-set validity shared by literals and record patterns: no duplicate
-- field, and the set must be exactly a declared record's field set.
checkFields :: Pos -> RecordEnv -> [(String, a)] -> Infer ()
checkFields p renv fields = do
  let fs = Set.fromList (map fst fields)
  if length fields /= Set.size fs
    then throwError (TypeError p "duplicate field in record literal")
    else case recordForFields fs renv of
      Nothing -> throwError (TypeError p ("no record with fields " <> show (Set.toList fs)))
      Just _  -> return ()

-- | @e.f@: @e@ must have a known record type; the result is the declared
-- field type instantiated over the record's type arguments.
inferProj :: Pos -> DataEnv -> RecordEnv -> Env -> Expr -> String -> Infer Type
inferProj p denv renv env e name = do
  te <- infer env denv renv e
  rte <- resolve te
  case rte of
    TRec rn ts -> do
      case recordFor rn renv of
        Nothing -> throwError (TypeError p ("unknown record type: " <> rn))
        Just ri -> do
          if riArity ri /= length ts
            then throwError (TypeError p ("record " <> rn <> " expects " <> show (riArity ri) <> " type arguments"))
            else do
              let m = Map.fromList (zip [0 ..] ts)
              case lookup name (riFields ri) of
                Nothing -> throwError (TypeError p ("no field " <> name <> " in record " <> rn))
                Just ft -> return (applyMeta m ft)
    _ -> throwError (TypeError p ("field projection requires a record, found " <> showType rte))

-- | @{ e with f = e' }@: @e@ must be a record; the result keeps @e@'s type
-- and binds field @f@ to @e'@ (whose type unifies with the declared field
-- type).
inferUpdate :: Pos -> DataEnv -> RecordEnv -> Env -> Expr -> String -> Expr -> Infer Type
inferUpdate p denv renv env e name ne = do
  te <- infer env denv renv e
  rte <- resolve te
  case rte of
    TRec rn ts -> do
      case recordFor rn renv of
        Nothing -> throwError (TypeError p ("unknown record type: " <> rn))
        Just ri -> do
          if riArity ri /= length ts
            then throwError (TypeError p ("record " <> rn <> " expects " <> show (riArity ri) <> " type arguments"))
            else do
              let m = Map.fromList (zip [0 ..] ts)
              case lookup name (riFields ri) of
                Nothing -> throwError (TypeError p ("no field " <> name <> " in record " <> rn))
                Just ft -> do
                  tn <- infer env denv renv ne
                  unify p tn (applyMeta m ft)
                  return (TRec rn ts)
    _ -> throwError (TypeError p ("record update requires a record, found " <> showType rte))

-- | @{ x = a, y = b }@ pattern: the pattern's field set must equal a
-- declared record's field set, the scrutinee type unifies with that record
-- type, and each sub-pattern is checked against the declared field type.
checkRecordPattern :: Pos -> DataEnv -> RecordEnv -> Env -> Type -> [(String, Pattern)] -> Infer Env
checkRecordPattern p denv renv env ty fields = do
  let fs = Set.fromList (map fst fields)
  if length fields /= Set.size fs
    then throwError (TypeError p "duplicate field in record pattern")
    else return ()
  (name, ri) <- case recordForFields fs renv of
    Nothing -> throwError (TypeError p ("no record with fields " <> show (Set.toList fs)))
    Just x  -> return x
  (tvs, fieldTys) <- instantiateFields ri
  unify p ty (TRec name tvs)
  let ftys = Map.fromList fieldTys
  foldM (\e (f, fpat) -> checkPattern p denv renv e fpat (ftys Map.! f)) env fields

inferBin :: Pos -> Op -> DataEnv -> RecordEnv -> Env -> Expr -> Expr -> Infer Type
inferBin p op denv renv env a b
  | op == OpAdd = do
      ta <- infer env denv renv a
      tb <- infer env denv renv b
      ra <- resolve ta
      rb <- resolve tb
      case (ra, rb) of
        (TStr, TStr)       -> return TStr
        (TStr, TVar _)     -> unify p tb TStr >> return TStr
        (TVar _, TStr)     -> unify p ta TStr >> return TStr
        (TStr, _)          -> throwError (TypeError p ("operator + requires string operands, found "
                                   <> showType ra <> " and " <> showType rb))
        (_, TStr)          -> throwError (TypeError p ("operator + requires string operands, found "
                                   <> showType ra <> " and " <> showType rb))
        _                  -> numericPromote p ta tb
  | op `elem` [OpSub, OpMul, OpDiv] = do
      ta <- infer env denv renv a
      tb <- infer env denv renv b
      numericPromote p ta tb
  | op `elem` [OpLt, OpLe, OpGt, OpGe] = do
      ta <- infer env denv renv a
      tb <- infer env denv renv b
      _ <- numericPromote p ta tb
      return TBool
  | op `elem` [OpEq, OpNe] = do
      ta <- infer env denv renv a
      tb <- infer env denv renv b
      unify p ta tb
      return TBool
  | otherwise = do -- OpAnd, OpOr
      ta <- infer env denv renv a
      unify p ta TBool
      tb <- infer env denv renv b
      unify p tb TBool
      return TBool

inferNeg :: Pos -> DataEnv -> RecordEnv -> Env -> Expr -> Infer Type
inferNeg p denv renv env x = do
  tx <- infer env denv renv x
  rx <- resolve tx
  case rx of
    TInt    -> return TInt
    TFloat  -> return TFloat
    TVar _  -> return rx
    _       -> throwError (TypeError p "unary minus requires a numeric operand")

inferNot :: Pos -> DataEnv -> RecordEnv -> Env -> Expr -> Infer Type
inferNot p denv renv env x = do
  tx <- infer env denv renv x
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

-- | Partition the pending constraints at a generalization point into the
-- scheme's context (constraints whose resolved type mentions only the
-- quantified variables, i.e. the constraints @let@-generalization keeps on
-- the scheme) and the constraints that stay pending for later solving.
partitionCtx :: Set.Set Int -> Constraints -> Infer ([(String, Type)], Constraints)
partitionCtx qvars = foldM step ([], [])
  where
    step (ctx, keep) (pos, cn, ty) = do
      rty <- resolve ty
      let fv = freeVars rty
      if not (Set.null fv) && fv `Set.isSubsetOf` qvars
        then return ((cn, rty) : ctx, keep)
        else return (ctx, (pos, cn, rty) : keep)

-- ---------------------------------------------------------------------
-- Constraint solving
-- ---------------------------------------------------------------------

-- | Discharge every remaining class constraint against the class
-- environment. Constraints whose type still contains free variables cannot
-- be discharged (ambiguous); concrete constraints resolve through the
-- instances, following context constraints recursively.
solveConstraints :: Constraints -> Infer ()
solveConstraints = mapM_ solveOne

solveOne :: (Pos, String, Type) -> Infer ()
solveOne (pos, cn, ty) = do
  rty <- resolve ty
  case freeVars rty of
    vs | not (Set.null vs) ->
          throwError (TypeError pos
            ("ambiguous type: cannot resolve constraint " <> cn <> " " <> showType rty))
    _ -> resolveInstance pos cn rty 0

-- | Resolve one concrete class constraint. The instance's head variables
-- are bound from the concrete type, and its context constraint (if any) is
-- resolved recursively (depth-bounded).
resolveInstance :: Pos -> String -> Type -> Int -> Infer ()
resolveInstance pos cn ty depth
  | depth > maxDepth =
      throwError (TypeError pos ("too much recursion resolving " <> cn <> " " <> showType ty))
  | otherwise = do
      cenv <- getCenv
      case findInstance cn ty cenv of
        Nothing -> throwError (TypeError pos ("no instance for " <> cn <> " " <> showType ty))
        Just inst -> case iiCtx inst of
          Nothing -> return ()
          Just (cc, cty) -> do
            let arg = applyMeta (headBindings (iiHead inst) ty) cty
            resolveInstance pos cc arg (depth + 1)

-- | The bindings of an instance head's type variables against a concrete
-- type (used to substitute the context constraint). The head's variables are
-- all @'Halcyon.Type'.TVar 0@ in the head encoding.
headBindings :: Type -> Type -> Map.Map Int Type
headBindings h t = case (h, t) of
  (TList hh, TList tt)  -> headBindings hh tt
  (TData n1 as, TData n2 bs) | n1 == n2 -> Map.unions (zipWith headBindings as bs)
  (TRec n1 as, TRec n2 bs) | n1 == n2 -> Map.unions (zipWith headBindings as bs)
  (TVar v, tt)          -> Map.singleton v tt
  _                     -> Map.empty

maxDepth :: Int
maxDepth = 20

mismatch :: Type -> Type -> String
mismatch t1 t2 =
  "type mismatch: cannot unify " <> showType t1 <> " with " <> showType t2

numericMismatch :: Type -> Type -> String
numericMismatch t1 t2 =
  "numeric operands required for arithmetic/comparison, found "
    <> showType t1 <> " and " <> showType t2