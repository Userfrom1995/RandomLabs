{-# LANGUAGE LambdaCase #-}
module Halcyon.Eval
  ( evalProgram
  , evalExpr
  , EvalError(..)
  , showValue
  ) where

import qualified Data.Map.Strict as Map

import Halcyon.Ast
import Halcyon.Parser (parseProgram, ParseError(..))
import Halcyon.Token (Pos)
import Halcyon.Value

-- | A positioned runtime error from the tree-walking interpreter.
data EvalError = EvalError Pos String
  deriving (Eq, Show)

type Env = Map.Map String Value

-- | Parse and evaluate a source string in the empty environment.
evalProgram :: String -> Either EvalError Value
evalProgram src = case parseProgram src of
  Left (ParseError p m) -> Left (EvalError p m)
  Right expr            -> evalExpr Map.empty expr

-- | Evaluate a parsed expression in the given environment.
evalExpr :: Env -> Expr -> Either EvalError Value
evalExpr = eval

eval :: Env -> Expr -> Either EvalError Value
eval env = \case
  EInt _ i      -> Right (VInt i)
  EFloat _ d    -> Right (VFloat d)
  EBool _ b     -> Right (VBool b)
  EStr _ s      -> Right (VStr s)
  EList _ es    -> VList <$> mapM (eval env) es
  EVar p name   -> case Map.lookup name env of
                     Just v  -> Right v
                     Nothing -> Left (EvalError p ("unbound name: " <> name))
  EBuiltin _ b  -> Right (VBuiltin b)
  ELambda _ params body -> Right (VClosure params body env)
  EApply p fn arg -> do
    vf <- eval env fn
    va <- eval env arg
    apply p vf va
  ELet p rec name bound body ->
    case bound of
      ELambda _ params body' ->
        -- The recursive form captures the environment being built (a lazy
        -- knot), so the closure can see its own name; the plain form
        -- captures the outer environment.
        let captured = if rec then env' else env
            env'     = Map.insert name (VClosure params body' captured) env
        in eval env' body
      _ | rec -> Left (EvalError p ("let rec requires a function value for " <> name))
        | otherwise -> do
            vb <- eval env bound
            eval (Map.insert name vb env) body
  EIf p c t e -> do
    vc <- eval env c
    case vc of
      VBool True  -> eval env t
      VBool False -> eval env e
      _ -> Left (EvalError p ("if condition must be a boolean, got " <> showValue vc))
  EBin p op a b -> do
    va <- eval env a
    vb <- eval env b
    binop p op va vb
  ENeg p x -> do
    v <- eval env x
    case v of
      VInt i   -> Right (VInt (negate i))
      VFloat d -> Right (VFloat (negate d))
      _        -> Left (EvalError p ("cannot negate " <> showValue v))
  ENot p x -> do
    v <- eval env x
    case v of
      VBool b -> Right (VBool (not b))
      _       -> Left (EvalError p ("cannot apply ! to " <> showValue v))

-- | Apply one argument. Lambdas bind the first remaining parameter
-- (currying: @fn x y => e@ applied to one argument yields a closure over
-- the rest); a partially applied @cons@ completes into a list.
apply :: Pos -> Value -> Value -> Either EvalError Value
apply p vf va = case vf of
  VClosure (param : rest) body cenv ->
    let cenv' = Map.insert param va cenv
    in if null rest
         then eval cenv' body
         else Right (VClosure rest body cenv')
  VClosure [] _ _ -> Left (EvalError p "function with no parameters")
  VPartial BCons x -> case va of
    VList xs -> Right (VList (x : xs))
    v        -> Left (EvalError p ("cons expects a list, got " <> showValue v))
  VPartial _ _ -> Left (EvalError p "internal error: unexpected partial builtin")
  VBuiltin b -> applyBuiltin p b va
  _ -> Left (EvalError p ("cannot apply " <> showValue vf))

applyBuiltin :: Pos -> Builtin -> Value -> Either EvalError Value
applyBuiltin p b va = case b of
  BCons  -> Right (VPartial BCons va)
  BHead  -> case va of
    VList (x : _) -> Right x
    VList []      -> Left (EvalError p "head of empty list")
    v             -> Left (EvalError p ("head expects a list, got " <> showValue v))
  BTail  -> case va of
    VList (_ : xs) -> Right (VList xs)
    VList []       -> Left (EvalError p "tail of empty list")
    v              -> Left (EvalError p ("tail expects a list, got " <> showValue v))
  BIsNil -> case va of
    VList xs -> Right (VBool (null xs))
    v        -> Left (EvalError p ("isNil expects a list, got " <> showValue v))

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