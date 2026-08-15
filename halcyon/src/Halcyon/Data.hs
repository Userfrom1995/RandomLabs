{-# LANGUAGE LambdaCase #-}
-- | The resolved data environment for user-defined algebraic data types.
-- Built from a program's top-level @data@ declarations and consumed by the
-- type checker, the interpreter, and the bytecode compiler so all three
-- agree on constructor arities and types.
module Halcyon.Data
  ( DataEnv
  , CtorInfo(..)
  , emptyDataEnv
  , buildDataEnv
  , ctorFor
  , progDataDecls
  , progDataEnv
  , checkProgram
  ) where

import Data.List (sort)
import qualified Data.Map.Strict as Map
import qualified Data.Set as Set

import Halcyon.Ast (DataDecl(..), Program(..), TopDef(..), progLetNames)
import Halcyon.Type (Type(..), Scheme(..))

-- | Constructor metadata: the scheme a bare constructor reference has (e.g.
-- @Just : forall a. a -> Maybe a@) and its total arity (number of fields).
data CtorInfo = CtorInfo
  { ciType   :: String
  , ciArity  :: Int
  , ciScheme :: Scheme
  }
  deriving (Show)

-- | The data environment: constructor name -> metadata.
newtype DataEnv = DataEnv { deCtors :: Map.Map String CtorInfo }
  deriving (Show)

-- | An empty data environment (no @data@ declarations).
emptyDataEnv :: DataEnv
emptyDataEnv = DataEnv Map.empty

-- | Look up a constructor's metadata.
ctorFor :: String -> DataEnv -> Maybe CtorInfo
ctorFor name (DataEnv m) = Map.lookup name m

-- | The @data@ declarations of a program, in order.
progDataDecls :: Program -> [DataDecl]
progDataDecls p = [d | DefData d <- progDefs p]

-- | Build the data environment from a program's @data@ declarations.
progDataEnv :: Program -> Either String DataEnv
progDataEnv = buildDataEnv . progDataDecls

-- | Validate a fully-resolved program's top-level namespace: no duplicate
-- data type names, no duplicate constructor names (both caught by
-- 'buildDataEnv'), and no duplicate top-level @let@ binding names.
checkProgram :: Program -> Either String ()
checkProgram p = do
  _ <- buildDataEnv (progDataDecls p)
  case dupes (progLetNames p) of
    (x : _) -> Left ("duplicate top-level definition: " <> x)
    []      -> Right ()
  where
    dupes :: Ord a => [a] -> [a]
    dupes = go . sort
      where
        go (x : y : rest) | x == y    = x : go (y : rest)
                          | otherwise = go (y : rest)
        go _                          = []

-- | Build the data environment from a program's declarations. Fails when a
-- type name is declared twice or a constructor name is used by two
-- different declarations (constructor names are globally unique).
buildDataEnv :: [DataDecl] -> Either String DataEnv
buildDataEnv decls = do
  let typeNames = [ddName d | d <- decls]
  case dupes typeNames of
    (x : _) -> Left ("duplicate data type name: " <> x)
    []      -> Right ()
  let ctorEntries = [(n, mkCtorInfo d n)
                    | d <- decls, (n, _) <- ddCtors d]
  case dupes (map fst ctorEntries) of
    (x : _) -> Left ("duplicate constructor name: " <> x)
    []      -> Right (DataEnv (Map.fromList ctorEntries))
  where
    mkCtorInfo (DataDecl _ tname tyvars ctors) cname =
      case lookup cname ctors of
        Nothing -> error "internal: constructor not in its declaration"
        Just fields ->
          let args  = [TVar i | i <- [0 .. length tyvars - 1]]
              body  = foldr TFun (TData tname args) fields
              qvars = Set.fromList [0 .. length tyvars - 1]
          in CtorInfo tname (length fields) (Scheme qvars body)

    dupes :: Ord a => [a] -> [a]
    dupes = go . sort
      where
        go (x : y : rest) | x == y    = x : go (y : rest)
                          | otherwise = go (y : rest)
        go _                          = []