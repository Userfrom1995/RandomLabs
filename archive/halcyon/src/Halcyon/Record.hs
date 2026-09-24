{-# LANGUAGE LambdaCase #-}
-- | The resolved record environment for user-defined record types. Built
-- from a program's top-level @record@ declarations and consumed by the type
-- checker, the interpreter, and the bytecode compiler so all three agree on
-- record field names, orders, and types.
--
-- Records resolve by their globally unique field name set: a record literal
-- @{ f1 = e1, ... }@ is typed by the unique declared record whose field set
-- matches. Two records sharing a field set are rejected, mirroring the
-- existing global-uniqueness rule for constructors.
module Halcyon.Record
  ( RecordEnv
  , RecordInfo(..)
  , emptyRecordEnv
  , buildRecordEnv
  , recordFor
  , recordForFields
  , recordNameSet
  , progRecordDecls
  , progRecordEnv
  ) where

import Data.Bifunctor (second)
import Data.List (sort)
import qualified Data.Map.Strict as Map
import qualified Data.Set as Set

import Halcyon.Ast (RecordDecl(..), Program(..), progRecordDecls)
import Halcyon.Type (Type(..))

-- | Record metadata: the record's field list in declaration order, with
-- field types expressed over the record's declared type parameters
-- (@TVar i@ names the @i@-th parameter).
data RecordInfo = RecordInfo
  { riName   :: String
  , riFields :: [(String, Type)]
  , riArity  :: Int
  }
  deriving (Show)

-- | The record environment: record name -> metadata, plus the unique
-- mapping from a field name set to the record that owns it.
data RecordEnv = RecordEnv
  { reByName   :: Map.Map String RecordInfo
  , reByFields :: Map.Map (Set.Set String) String
  }
  deriving (Show)

-- | An empty record environment (no @record@ declarations).
emptyRecordEnv :: RecordEnv
emptyRecordEnv = RecordEnv Map.empty Map.empty

-- | Look up a record by its name.
recordFor :: String -> RecordEnv -> Maybe RecordInfo
recordFor name (RecordEnv m _) = Map.lookup name m

-- | The set of record type names declared in this environment.
recordNameSet :: RecordEnv -> Set.Set String
recordNameSet (RecordEnv m _) = Map.keysSet m

-- | Look up the unique record owning exactly the given field name set.
recordForFields :: Set.Set String -> RecordEnv -> Maybe (String, RecordInfo)
recordForFields fs (RecordEnv byName byF) = do
  name <- Map.lookup fs byF
  ri <- Map.lookup name byName
  return (name, ri)

-- | Build the record environment from a program's @record@ declarations.
progRecordEnv :: Program -> Either String RecordEnv
progRecordEnv = buildRecordEnv . progRecordDecls

-- | Build the record environment from a program's declarations. Fails when
-- a record name is declared twice or two different records share a field
-- name set (the global uniqueness rule that makes literals unambiguous).
buildRecordEnv :: [RecordDecl] -> Either String RecordEnv
buildRecordEnv decls = do
  case dupes [rdName d | d <- decls] of
    (x : _) -> Left ("duplicate record type name: " <> x)
    []      -> Right ()
  let fieldSets = [(Set.fromList (map fst (rdFields d)), rdName d) | d <- decls]
  case dupes (map fst fieldSets) of
    (x : _) -> Left ("duplicate record field set: " <> show (Set.toList x))
    []      -> Right ()
  let recNames = Set.fromList (map rdName decls)
      normT    = normRecordRefs recNames
      byName   = Map.fromList [(rdName d, mkInfo normT d) | d <- decls]
      byF      = Map.fromList [(fs, n) | (fs, n) <- fieldSets]
  Right (RecordEnv byName byF)
  where
    mkInfo norm (RecordDecl _ name tyvars fields) =
      RecordInfo name (map (second norm) fields) (length tyvars)

    -- | Resolve @TData n@ references to declared record names as @TRec n@,
    -- so record-typed record fields unify with record literal types.
    normRecordRefs :: Set.Set String -> Type -> Type
    normRecordRefs ns = go
      where
        go (TData n ts) | n `Set.member` ns = TRec n (map go ts)
        go (TData n ts)                     = TData n (map go ts)
        go (TList t)                        = TList (go t)
        go (TFun a b)                       = TFun (go a) (go b)
        go (TRec n ts)                      = TRec n (map go ts)
        go t                                = t

    dupes :: Ord a => [a] -> [a]
    dupes = go . sort
      where
        go (x : y : rest) | x == y    = x : go (y : rest)
                          | otherwise = go (y : rest)
        go _                          = []