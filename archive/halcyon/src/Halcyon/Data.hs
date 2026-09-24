{-# LANGUAGE LambdaCase #-}
-- | The resolved data environment for user-defined algebraic data types.
-- Built from a program's top-level @data@ declarations and consumed by the
-- type checker, the interpreter, and the bytecode compiler so all three
-- agree on constructor arities and types.
module Halcyon.Data
  ( DataEnv(..)
  , CtorInfo(..)
  , emptyDataEnv
  , buildDataEnv
  , ctorFor
  , progDataDecls
  , progDataEnv
  , progEnvs
  , checkProgram
  ) where

import Data.List (sort)
import qualified Data.Map.Strict as Map
import qualified Data.Set as Set

import Halcyon.Ast (DataDecl(..), ClassDecl(..), Program(..), TopDef(..), progLetNames, progRecordDecls, progClassDecls, progSynonymDecls)
import Halcyon.Record (RecordEnv, buildRecordEnv, emptyRecordEnv, recordNameSet)
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

-- | Build both the data and record environments for a program, resolving
-- record references (@TData n@ -> @TRec n@) in constructor schemes and
-- record fields. All of type checking, evaluation, and compilation go
-- through this so the three agree on record types.
progEnvs :: Program -> Either String (DataEnv, RecordEnv)
progEnvs p = do
  d <- progDataEnv p
  r <- buildRecordEnv (progRecordDecls p)
  return (normDataEnvRecs (recordNameSet r) d, r)

-- | Normalize @TData n@ references to declared record names into @TRec n@
-- inside constructor schemes, so constructors whose fields mention records
-- unify with record literal types.
normDataEnvRecs :: Set.Set String -> DataEnv -> DataEnv
normDataEnvRecs recs (DataEnv m) = DataEnv (Map.map normCtor m)
  where
    normCtor (CtorInfo t ar sch) =
      let Scheme _ qv b = sch
      in CtorInfo t ar (Scheme [] qv (normType b))
    normType = go
      where
        go (TData n ts) | n `Set.member` recs = TRec n (map go ts)
        go (TData n ts)                       = TData n (map go ts)
        go (TList t)                          = TList (go t)
        go (TFun a b)                         = TFun (go a) (go b)
        go (TRec n ts)                        = TRec n (map go ts)
        go t                                  = t

-- | Validate a fully-resolved program's top-level namespace: no duplicate
-- data type names, no duplicate constructor names (both caught by
-- 'buildDataEnv'), no duplicate record names or shared field sets (caught by
-- 'Halcyon.Record.buildRecordEnv'), no duplicate top-level @let@ binding
-- names, no duplicate type synonyms, and no type synonym name that collides
-- with a @data@/@record@/class name (recursive synonyms and redeclarations
-- of primitives are rejected at parse time).
checkProgram :: Program -> Either String ()
checkProgram p = do
  _ <- buildDataEnv (progDataDecls p)
  _ <- buildRecordEnv (progRecordDecls p)
  case dupes (progLetNames p) of
    (x : _) -> Left ("duplicate top-level definition: " <> x)
    []      -> Right ()
  case dupes (map (\(n, _, _) -> n) (progSynonymDecls p)) of
    (x : _) -> Left ("duplicate type synonym: " <> x)
    []      -> checkSynCollisions p
  where
    checkSynCollisions q =
      let synNames   = Set.fromList [n | (n, _, _) <- progSynonymDecls q]
          typeNames  = Set.fromList (map ddName (progDataDecls q))
          recordNames = recordNameSet (buildRecordEnv (progRecordDecls q) `orElse` emptyRecordEnv)
          classNames = Set.fromList [cdName c | c <- progClassDecls q]
          collision = Set.toList (synNames `Set.intersection`
                                   (typeNames `Set.union` recordNames `Set.union` classNames))
      in case collision of
           (x : _) -> Left ("type synonym name collides with a data/record/class name: " <> x)
           []      -> Right ()

    orElse :: Either String a -> a -> a
    orElse (Right x) _ = x
    orElse _ d         = d

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
          in CtorInfo tname (length fields) (Scheme [] qvars body)

    dupes :: Ord a => [a] -> [a]
    dupes = go . sort
      where
        go (x : y : rest) | x == y    = x : go (y : rest)
                          | otherwise = go (y : rest)
        go _                          = []