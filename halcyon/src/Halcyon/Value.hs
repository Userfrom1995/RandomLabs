{-# LANGUAGE LambdaCase #-}
module Halcyon.Value
  ( Value(..)
  , showValue
  ) where

import Data.List (intercalate)

import Halcyon.Ast (Expr, Builtin, builtinName)
import qualified Data.Map.Strict as Map

-- | Runtime values. Closures capture their defining environment; recursive
-- bindings use a lazy self-referential environment so `let rec` works.
-- @VPartial@ records a partially applied curried builtin (cons).
data Value
  = VInt Integer
  | VFloat Double
  | VBool Bool
  | VStr String
  | VList [Value]
  | VClosure [String] Expr (Map.Map String Value)
  | VBuiltin Builtin
  | VPartial Builtin Value
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
  VPartial b x  -> "<builtin: " <> builtinName b <> " " <> showValue x <> ">"

-- | Deterministic float rendering: plain decimals, never scientific for
-- ordinary magnitudes.
showFloat :: Double -> String
showFloat d
  | d == fromIntegral (round d :: Integer) && abs d < 1e15 =
      let whole = show (round d :: Integer)
      in whole <> ".0"
  | otherwise = show d