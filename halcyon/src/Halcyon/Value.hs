{-# LANGUAGE LambdaCase #-}
module Halcyon.Value
  ( Value(..)
  , showValue
  , showFloat
  ) where

import Data.List (intercalate)

import Halcyon.Ast (Expr, Builtin, builtinName)
import qualified Data.Map.Strict as Map

-- | Runtime values. Closures capture their defining environment; recursive
-- bindings use a lazy self-referential environment so @let rec@ works.
-- @VPartial@ records a partially applied curried builtin (e.g. @cons@,
-- @append@, @take@) with the arguments accumulated so far. @VConstr@ is a
-- partially applied data constructor (name, total arity, accumulated
-- arguments); once it has all its arguments it becomes @VData@.
data Value
  = VInt Integer
  | VFloat Double
  | VBool Bool
  | VStr String
  | VList [Value]
  | VClosure [String] Expr (Map.Map String Value)
  | VBuiltin Builtin
  | VPartial Builtin [Value]
  | VData String [Value]
  | VConstr String Int [Value]
  | VRec String [(String, Value)]
  deriving (Eq, Show)

-- | Render a value as program output. This is the canonical, deterministic
-- rendering shared by the interpreter, the VM, and the web playground, so
-- the two evaluators produce byte-identical output.
showValue :: Value -> String
showValue = \case
  VInt i        -> show i
  VFloat d      -> showFloat d
  VBool True    -> "true"
  VBool False   -> "false"
  VStr s        -> s
  VList vs      -> "[" <> intercalate ", " (map showValue vs) <> "]"
  VClosure{}    -> "<function>"
  VBuiltin b    -> "<builtin: " <> builtinName b <> ">"
  VPartial b as -> "<builtin: " <> builtinName b <> " " <> unwords (map showValue as) <> ">"
  VData n fs    -> unwords (n : map showValue fs)
  VConstr n _ _ -> "<constructor: " <> n <> ">"
  VRec _ fs     -> "{ " <> intercalate ", " (map (\(f, v) -> f <> " = " <> showValue v) fs) <> " }"

-- | Deterministic float rendering: plain decimals, never scientific for
-- ordinary magnitudes.
showFloat :: Double -> String
showFloat d
  | d == fromIntegral (round d :: Integer) && abs d < 1e15 =
      let whole = show (round d :: Integer)
      in whole <> ".0"
  | otherwise = show d