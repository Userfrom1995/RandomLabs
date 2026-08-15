{-# LANGUAGE LambdaCase #-}
module Halcyon.Type
  ( Type(..)
  , Scheme(..)
  , freeVars
  , showType
  , showScheme
  ) where

import qualified Data.Set as Set

-- | Halcyon types. Inference uses @TVar@ for both rigid scheme variables
-- and fresh unification metavariables; the surrounding substitution decides
-- which is which.
data Type
  = TVar Int
  | TInt
  | TFloat
  | TBool
  | TStr
  | TList Type
  | TFun Type Type
  deriving (Eq, Show)

-- | A type scheme: an explicit list of universally quantified variables
-- plus a body. This is the shape stored in the environment, so `let` gives
-- polymorphism and lambda parameters stay monomorphic.
data Scheme = Scheme { schemeQvars :: Set.Set Int, schemeBody :: Type }
  deriving (Eq, Show)

-- | The set of type variables occurring free in a type.
freeVars :: Type -> Set.Set Int
freeVars = \case
  TVar v   -> Set.singleton v
  TList t  -> freeVars t
  TFun a b -> freeVars a `Set.union` freeVars b
  _        -> Set.empty

-- | Pretty-print a type. Free variables render as lowercase letters.
-- Function types are right-associative; the argument of a function type is
-- parenthesized only when it is itself a function type.
showType :: Type -> String
showType = go
  where
    go = \case
      TVar v   -> [chr' v]
      TInt     -> "Int"
      TFloat   -> "Float"
      TBool    -> "Bool"
      TStr     -> "String"
      TList t  -> "[" <> go t <> "]"
      TFun a b -> showArg a <> " -> " <> go b
    showArg t = case t of
      TFun _ _ -> "(" <> go t <> ")"
      _        -> go t
    chr' n = toEnum (fromEnum 'a' + n)

-- | Pretty-print a scheme with its quantified variables.
showScheme :: Scheme -> String
showScheme (Scheme qvars t) =
  if Set.null qvars
    then showType t
    else "forall " <> unwords (map chr' (Set.toList qvars)) <> ". " <> showType t
  where
    chr' n = [toEnum (fromEnum 'a' + n)]