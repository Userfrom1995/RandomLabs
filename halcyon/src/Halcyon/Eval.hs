{-# LANGUAGE LambdaCase #-}
module Halcyon.Eval
  ( evalProgram
  , evalExpr
  , EvalError(..)
  , showValue
  ) where

import qualified Data.Map.Strict as Map

import Halcyon.Ast
import Halcyon.Data (DataEnv, emptyDataEnv, buildDataEnv, ctorFor, CtorInfo(..))
import Halcyon.Parser (parseProgram, ParseError(..))
import Halcyon.Token (Pos(..), Tok(..))
import Halcyon.Value

-- | A positioned runtime error from the tree-walking interpreter.
data EvalError = EvalError Pos String
  deriving (Eq, Show)

type Env = Map.Map String Value

-- | Parse and evaluate a source string in the empty environment.
evalProgram :: String -> Either EvalError Value
evalProgram src = case parseProgram src of
  Left (ParseError p m) -> Left (EvalError p m)
  Right (Program decls expr) ->
    case buildDataEnv decls of
      Left m    -> Left (EvalError (Pos 0 0) m)
      Right denv -> evalExpr denv Map.empty expr

-- | Evaluate a parsed expression in the given environments.
evalExpr :: DataEnv -> Env -> Expr -> Either EvalError Value
evalExpr denv env expr = eval denv env expr

eval :: DataEnv -> Env -> Expr -> Either EvalError Value
eval denv env = \case
  EInt _ i      -> Right (VInt i)
  EFloat _ d    -> Right (VFloat d)
  EBool _ b     -> Right (VBool b)
  EStr _ s      -> Right (VStr s)
  EList _ es    -> VList <$> mapM (eval denv env) es
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
    vf <- eval denv env fn
    va <- eval denv env arg
    apply p denv vf va
  ELet p rec name bound body ->
    case bound of
      ELambda _ params body' ->
        -- The recursive form captures the environment being built (a lazy
        -- knot), so the closure can see its own name; the plain form
        -- captures the outer environment.
        let captured = if rec then env' else env
            env'     = Map.insert name (VClosure params body' captured) env
        in eval denv env' body
      _ | rec -> Left (EvalError p ("let rec requires a function value for " <> name))
        | otherwise -> do
            vb <- eval denv env bound
            eval denv (Map.insert name vb env) body
  EIf p c t e -> do
    vc <- eval denv env c
    case vc of
      VBool True  -> eval denv env t
      VBool False -> eval denv env e
      _ -> Left (EvalError p ("if condition must be a boolean, got " <> showValue vc))
  EBin p op a b -> do
    va <- eval denv env a
    vb <- eval denv env b
    binop p op va vb
  ENeg p x -> do
    v <- eval denv env x
    case v of
      VInt i   -> Right (VInt (negate i))
      VFloat d -> Right (VFloat (negate d))
      _        -> Left (EvalError p ("cannot negate " <> showValue v))
  ENot p x -> do
    v <- eval denv env x
    case v of
      VBool b -> Right (VBool (not b))
      _       -> Left (EvalError p ("cannot apply ! to " <> showValue v))

-- | Apply one argument. Lambdas bind the first remaining parameter
-- (currying: @fn x y => e@ applied to one argument yields a closure over
-- the rest); a partially applied curried builtin (@cons@, @append@, @take@,
-- @drop@) or data constructor accumulates arguments until it has enough to
-- run. The data environment is threaded so closures can keep referencing
-- constructors.
apply :: Pos -> DataEnv -> Value -> Value -> Either EvalError Value
apply p denv vf va = case vf of
  VClosure (param : rest) body cenv ->
    let cenv' = Map.insert param va cenv
    in if null rest
         then eval denv cenv' body
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