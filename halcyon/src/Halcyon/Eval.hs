{-# LANGUAGE LambdaCase #-}
module Halcyon.Eval
  ( evalProgram
  , evalProgramIn
  , evalExpr
  , EvalError(..)
  , showValue
  ) where

import Control.Monad (foldM)
import qualified Data.Map.Strict as Map
import qualified Data.Set as Set

import Halcyon.Ast
import Halcyon.Data (DataEnv, emptyDataEnv, progEnvs, checkProgram, ctorFor, CtorInfo(..))
import Halcyon.Parser (parseProgram, ParseError(..))
import Halcyon.Record (RecordEnv, emptyRecordEnv, recordFor, recordForFields, RecordInfo(..))
import Halcyon.Token (Pos(..), Tok(..))
import Halcyon.Value

-- | A positioned runtime error from the tree-walking interpreter.
data EvalError = EvalError Pos String
  deriving (Eq, Show)

type Env = Map.Map String Value

-- | Parse and evaluate a source string in the empty environment. Returns
-- @Nothing@ when the program is a definitions-only module with no final
-- expression to evaluate.
evalProgram :: String -> Either EvalError (Maybe Value)
evalProgram src = case parseProgram src of
  Left (ParseError p m) -> Left (EvalError p m)
  Right prog            -> evalProgramIn prog

-- | Evaluate an already-parsed, fully-resolved program: evaluate the merged
-- top-level definitions in order (extending the environment), then the final
-- expression if present.
evalProgramIn :: Program -> Either EvalError (Maybe Value)
evalProgramIn prog = do
  case checkProgram prog of
    Left m  -> Left (EvalError (Pos 0 0) m)
    Right _ -> Right ()
  (denv, renv) <- case progEnvs prog of
    Left m  -> Left (EvalError (Pos 0 0) m)
    Right e -> Right e
  env <- foldM (evalDef denv renv) Map.empty (progDefs prog)
  case progExpr prog of
    Nothing -> return Nothing
    Just e  -> Just <$> eval denv renv env e

-- | Evaluate one top-level definition, extending the environment. The
-- semantics match the interpreter's @let@: the recursive form captures the
-- environment being built (a lazy knot); the plain form captures the outer
-- environment.
evalDef :: DataEnv -> RecordEnv -> Env -> TopDef -> Either EvalError Env
evalDef denv renv env = \case
  DefData _ -> Right env
  DefRecord _ -> Right env
  DefLet p rec name bound -> case bound of
    ELambda _ params body' ->
      let captured = if rec then env' else env
          env'     = Map.insert name (VClosure params body' captured) env
      in Right env'
    _ | rec -> Left (EvalError p ("let rec requires a function value for " <> name))
      | otherwise -> do
          vb <- eval denv renv env bound
          Right (Map.insert name vb env)

-- | Evaluate a parsed expression in the given environments.
evalExpr :: DataEnv -> Env -> Expr -> Either EvalError Value
evalExpr denv env expr = eval denv emptyRecordEnv env expr

eval :: DataEnv -> RecordEnv -> Env -> Expr -> Either EvalError Value
eval denv renv env = \case
  EInt _ i      -> Right (VInt i)
  EFloat _ d    -> Right (VFloat d)
  EBool _ b     -> Right (VBool b)
  EStr _ s      -> Right (VStr s)
  EList _ es    -> VList <$> mapM (eval denv renv env) es
  EVar p name   -> case Map.lookup name env of
                     Just v  -> Right v
                     Nothing -> Left (EvalError p ("unbound name: " <> name))
  EConstr p name -> case ctorFor name denv of
                     Nothing -> Left (EvalError p ("unbound constructor: " <> name))
                     Just ci -> let ar = ciArity ci
                                in Right (if ar == 0 then VData name [] else VConstr name ar [])
  EBuiltin _ b  -> Right (VBuiltin b)
  ELambda _ params body -> Right (VClosure params body env)
  EApply p fn arg -> do
    vf <- eval denv renv env fn
    va <- eval denv renv env arg
    apply p denv renv vf va
  ELet p rec name bound body ->
    case bound of
      ELambda _ params body' ->
        -- The recursive form captures the environment being built (a lazy
        -- knot), so the closure can see its own name; the plain form
        -- captures the outer environment.
        let captured = if rec then env' else env
            env'     = Map.insert name (VClosure params body' captured) env
        in eval denv renv env' body
      _ | rec -> Left (EvalError p ("let rec requires a function value for " <> name))
        | otherwise -> do
            vb <- eval denv renv env bound
            eval denv renv (Map.insert name vb env) body
  EIf p c t e -> do
    vc <- eval denv renv env c
    case vc of
      VBool True  -> eval denv renv env t
      VBool False -> eval denv renv env e
      _ -> Left (EvalError p ("if condition must be a boolean, got " <> showValue vc))
  EBin p op a b -> do
    va <- eval denv renv env a
    vb <- eval denv renv env b
    binop p op va vb
  ENeg p x -> do
    v <- eval denv renv env x
    case v of
      VInt i   -> Right (VInt (negate i))
      VFloat d -> Right (VFloat (negate d))
      _        -> Left (EvalError p ("cannot negate " <> showValue v))
  ENot p x -> do
    v <- eval denv renv env x
    case v of
      VBool b -> Right (VBool (not b))
      _       -> Left (EvalError p ("cannot apply ! to " <> showValue v))
  EMatch p scrut branches -> evalMatch p denv renv env scrut branches
  ERecord p fields -> evalRecord p denv renv env fields
  EProj p e name -> evalProj p denv renv env e name
  EUpdate p e name ne -> evalUpdate p denv renv env e name ne

-- | @{ f1 = e1, ..., fn = en }@: evaluate each field in any order, then
-- store the record's fields in declared order under its resolved type name.
evalRecord :: Pos -> DataEnv -> RecordEnv -> Env -> [(String, Expr)] -> Either EvalError Value
evalRecord p denv renv env fields = do
  let fs = Map.fromList fields
      fset = Map.keysSet fs
  (name, ri) <- case recordForFields fset renv of
    Nothing -> Left (EvalError p ("no record with fields " <> show (Set.toList fset)))
    Just x  -> Right x
  vals <- mapM (\(f, e) -> do { v <- eval denv renv env e; return (f, v) }) (Map.toList fs)
  let m = Map.fromList vals
  let ordered = [(f, m Map.! f) | (f, _) <- riFields ri]
  Right (VRec name ordered)

-- | @e.f@: look up the field in the record value. The field is guaranteed to
-- exist by the type checker; a runtime miss is an internal error.
evalProj :: Pos -> DataEnv -> RecordEnv -> Env -> Expr -> String -> Either EvalError Value
evalProj p denv renv env e name = do
  v <- eval denv renv env e
  case v of
    VRec _ fs -> case lookup name fs of
      Just x  -> Right x
      Nothing -> Left (EvalError p ("no field " <> name <> " in record value"))
    _ -> Left (EvalError p ("field projection requires a record, got " <> showValue v))

-- | @{ e with f = e' }@: rebuild the record replacing one field. The
-- original record is untouched (records are immutable); the result keeps the
-- declared field order.
evalUpdate :: Pos -> DataEnv -> RecordEnv -> Env -> Expr -> String -> Expr -> Either EvalError Value
evalUpdate p denv renv env e name ne = do
  v <- eval denv renv env e
  nv <- eval denv renv env ne
  case v of
    VRec rn fs ->
      let fs' = map (\case
                        (f, _) | f == name -> (name, nv)
                        other               -> other) fs
      in Right (VRec rn fs')
    _ -> Left (EvalError p ("record update requires a record, got " <> showValue v))

-- | @match scrut with | pat => e@: evaluate the scrutinee, then run the
-- first branch whose pattern matches, binding the pattern's variables in
-- the branch body. A @_@ wildcard always matches; if nothing matches the
-- whole match fails.
evalMatch :: Pos -> DataEnv -> RecordEnv -> Env -> Expr -> [(Pattern, Expr)] -> Either EvalError Value
evalMatch p denv renv env scrut branches = case branches of
  [] -> Left (EvalError p "empty match")
  _  -> do
    v <- eval denv renv env scrut
    go v branches
  where
    go _ [] = Left (EvalError p "no matching pattern")
    go v ((pat, body) : rest) =
      case matchValue v pat of
        Nothing -> go v rest
        Just binds -> do
          let env' = foldr (\(n, x) acc -> Map.insert n x acc) env binds
          eval denv renv env' body

-- | Attempt to match a value against a pattern, returning the variable
-- bindings on success. Variable patterns bind the whole scrutinee;
-- structural patterns (lists, constructor data) recurse field by field and
-- succeed only when the shape and every sub-pattern agree.
matchValue :: Value -> Pattern -> Maybe [(String, Value)]
matchValue v pat = case (v, pat) of
  (_, PWild _)       -> Just []
  (_, PVar _ name)   -> Just [(name, v)]
  (VInt i, PInt _ j) | i == j -> Just []
  (VFloat d, PFloat _ x) | d == x -> Just []
  (VBool b, PBool _ c) | b == c -> Just []
  (VStr s, PStr _ t) | s == t -> Just []
  (VList [], PNil _) -> Just []
  (VList (x : xs), PCons _ h t) -> do
    b1 <- matchValue x h
    b2 <- matchValue (VList xs) t
    return (b1 <> b2)
  (VList vs, PList _ ps)
    | length vs == length ps -> do
        bindLists <- sequence (zipWith matchValue vs ps)
        return (concat bindLists)
  (VData n fs, PConstr _ name ps)
    | n == name && length fs == length ps -> do
        bindLists <- sequence (zipWith matchValue fs ps)
        return (concat bindLists)
  (VRec _ fs, PRecord _ fields)
    | length fs == length fields -> do
        -- Both lists are in declared field order; the pattern may write the
        -- fields in any order, so pair them up by field name.
        let m = Map.fromList fs
        bindLists <- sequence [matchValue (m Map.! f) sub | (f, sub) <- fields]
        return (concat bindLists)
  _ -> Nothing

-- | Apply one argument. Lambdas bind the first remaining parameter
-- (currying: @fn x y => e@ applied to one argument yields a closure over
-- the rest); a partially applied curried builtin (@cons@, @append@, @take@,
-- @drop@) or data constructor accumulates arguments until it has enough to
-- run. The data and record environments are threaded so closures can keep
-- referencing constructors and record types.
apply :: Pos -> DataEnv -> RecordEnv -> Value -> Value -> Either EvalError Value
apply p denv renv vf va = case vf of
  VClosure (param : rest) body cenv ->
    let cenv' = Map.insert param va cenv
    in if null rest
         then eval denv renv cenv' body
         else Right (VClosure rest body cenv')
  VClosure [] _ _ -> Left (EvalError p "function with no parameters")
  VPartial b as -> applyPartial p b (as ++ [va])
  VConstr name ar as ->
    let as' = as ++ [va]
    in if length as' == ar
         then Right (VData name as')
         else Right (VConstr name ar as')
  VBuiltin b -> applyBuiltin p b va
  _ -> Left (EvalError p ("cannot apply " <> showValue vf))

-- | The number of arguments a builtin needs before it can run. Arity-1
-- builtins complete immediately; the curried ones wait for a partial.
builtinArity :: Builtin -> Int
builtinArity = \case
  BCons   -> 2
  BAppend -> 2
  BTake   -> 2
  BDrop   -> 2
  _       -> 1

-- | Apply a further argument to a partial builtin application, running the
-- builtin once enough arguments have accumulated.
applyPartial :: Pos -> Builtin -> [Value] -> Either EvalError Value
applyPartial p b as
  | length as < builtinArity b = Right (VPartial b as)
  | otherwise                  = completeBuiltin p b as

-- | Apply a builtin to a single argument. Unary builtins run immediately;
-- curried builtins form a partial application.
applyBuiltin :: Pos -> Builtin -> Value -> Either EvalError Value
applyBuiltin p b va
  | builtinArity b > 1 = Right (VPartial b [va])
  | otherwise          = completeBuiltin p b [va]

-- | Run a fully-applied builtin. @head@/@tail@/@length@/@reverse@/@isNil@
-- take one argument; @cons@/@append@/@take@/@drop@ take two.
completeBuiltin :: Pos -> Builtin -> [Value] -> Either EvalError Value
completeBuiltin p b as = case (b, as) of
  (BCons, [x, VList xs])     -> Right (VList (x : xs))
  (BCons, [_, v])            -> Left (EvalError p ("cons expects a list, got " <> showValue v))
  (BHead, [VList (x : _)])   -> Right x
  (BHead, [VList []])        -> Left (EvalError p "head of empty list")
  (BHead, [v])               -> Left (EvalError p ("head expects a list, got " <> showValue v))
  (BTail, [VList (_ : xs)])  -> Right (VList xs)
  (BTail, [VList []])        -> Left (EvalError p "tail of empty list")
  (BTail, [v])               -> Left (EvalError p ("tail expects a list, got " <> showValue v))
  (BIsNil, [VList xs])       -> Right (VBool (null xs))
  (BIsNil, [v])              -> Left (EvalError p ("isNil expects a list, got " <> showValue v))
  (BLength, [VList xs])      -> Right (VInt (fromIntegral (length xs)))
  (BLength, [v])             -> Left (EvalError p ("length expects a list, got " <> showValue v))
  (BReverse, [VList xs])     -> Right (VList (reverse xs))
  (BReverse, [v])            -> Left (EvalError p ("reverse expects a list, got " <> showValue v))
  (BAppend, [VList xs, VList ys]) -> Right (VList (xs <> ys))
  (BAppend, [_, v])          -> Left (EvalError p ("append expects a list, got " <> showValue v))
  (BTake, [VInt n, VList xs]) -> Right (VList (take (max 0 (fromIntegral n)) xs))
  (BTake, [_, v])            -> Left (EvalError p ("take expects a list, got " <> showValue v))
  (BTake, [v])               -> Left (EvalError p ("take expects an Int count, got " <> showValue v))
  (BDrop, [VInt n, VList xs]) -> Right (VList (drop (max 0 (fromIntegral n)) xs))
  (BDrop, [_, v])            -> Left (EvalError p ("drop expects a list, got " <> showValue v))
  (BDrop, [v])               -> Left (EvalError p ("drop expects an Int count, got " <> showValue v))
  _                          -> Left (EvalError p "internal error: unexpected builtin application")

binop :: Pos -> Op -> Value -> Value -> Either EvalError Value
binop p op va vb = case op of
  OpAdd -> numeric2 p (+) (+) va vb
  OpSub -> numeric2 p (-) (-) va vb
  OpMul -> numeric2 p (*) (*) va vb
  OpDiv -> numericDiv p va vb
  OpLt  -> numCmp p va vb (<)  (<)
  OpLe  -> numCmp p va vb (<=) (<=)
  OpGt  -> numCmp p va vb (>)  (>)
  OpGe  -> numCmp p va vb (>=) (>=)
  OpEq  -> Right (VBool (va == vb))
  OpNe  -> Right (VBool (va /= vb))
  OpAnd -> bool2 p op va vb (&&)
  OpOr  -> bool2 p op va vb (||)

-- | Numeric binary operation with Int/Float promotion: any Float operand
-- promotes the result to Float.
numeric2 :: Pos -> (Integer -> Integer -> Integer) -> (Double -> Double -> Double) -> Value -> Value -> Either EvalError Value
numeric2 p fi ff va vb = case (va, vb) of
  (VInt a, VInt b)     -> Right (VInt (fi a b))
  (VFloat a, VFloat b) -> Right (VFloat (ff a b))
  (VInt a, VFloat b)   -> Right (VFloat (ff (fromIntegral a) b))
  (VFloat a, VInt b)   -> Right (VFloat (ff a (fromIntegral b)))
  _ -> Left (EvalError p "arithmetic requires numeric operands")

numericDiv :: Pos -> Value -> Value -> Either EvalError Value
numericDiv p va vb = case (va, vb) of
  (VInt a, VInt b)     | b == 0 -> Left (EvalError p "division by zero")
  (VInt a, VInt b)     -> Right (VInt (a `div` b))
  (VFloat a, VFloat b) | b == 0 -> Left (EvalError p "division by zero")
  (VFloat a, VFloat b) -> Right (VFloat (a / b))
  (VInt a, VFloat b)   -> Right (VFloat (fromIntegral a / b))
  (VFloat a, VInt b)   | b == 0 -> Left (EvalError p "division by zero")
  (VFloat a, VInt b)   -> Right (VFloat (a / fromIntegral b))
  _ -> Left (EvalError p "operator / requires numeric operands")

numCmp :: Pos -> Value -> Value -> (Integer -> Integer -> Bool) -> (Double -> Double -> Bool) -> Either EvalError Value
numCmp p va vb fi ff = case (va, vb) of
  (VInt a, VInt b)     -> Right (VBool (fi a b))
  (VFloat a, VFloat b) -> Right (VBool (ff a b))
  (VInt a, VFloat b)   -> Right (VBool (ff (fromIntegral a) b))
  (VFloat a, VInt b)   -> Right (VBool (ff a (fromIntegral b)))
  _ -> Left (EvalError p "comparison requires numeric operands")

bool2 :: Pos -> Op -> Value -> Value -> (Bool -> Bool -> Bool) -> Either EvalError Value
bool2 p op va vb f = case (va, vb) of
  (VBool a, VBool b) -> Right (VBool (f a b))
  _ -> Left (EvalError p ("operator " <> opName op <> " requires boolean operands"))