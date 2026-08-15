{-# LANGUAGE LambdaCase, TupleSections #-}
-- | Import resolution for the v3 module system. A source string is parsed;
-- each @import "path"@ is resolved to source text via a provider (which
-- knows the importing file's directory for relative paths, falling back to a
-- lib directory), recursively merged into a single program whose definitions
-- are then validated for duplicates. Imported modules contribute only their
-- definitions: importing one runs no code and its own final expression (if
-- any) is ignored.
module Halcyon.Module
  ( loadProgram
  , resolveProgram
  , resolveProgramNoPrelude
  , ModuleError(..)
  , ImportProvider
  , diskProvider
  , memProvider
  , preludePath
  , applyShadowing
  ) where

import Control.Exception (IOException, try)
import Control.Monad (foldM)
import qualified Data.Map.Strict as Map
import qualified Data.Set as Set
import System.Directory (doesFileExist)
import System.FilePath (joinPath, normalise, splitDirectories, takeDirectory, (</>))

import Halcyon.Ast (Program(..), TopDef(..), Expr, DataDecl(..), RecordDecl(..), ClassDecl(..))
import Halcyon.Data (checkProgram)
import Halcyon.Parser (parseProgram, ParseError(..))
import Halcyon.Token (Pos(..))

-- | The auto-imported standard prelude module name. Resolved against the
-- lib directory (or the bundled copy) ahead of every user program.
preludePath :: FilePath
preludePath = "prelude.hly"

-- | Resolve an import: given the importing file's directory and the import
-- path, produce the module's canonical key and its source text (or @Nothing@
-- when the module cannot be found). The canonical key is used for cycle
-- detection, so a provider must return a stable key per module.
type ImportProvider = FilePath -> FilePath -> IO (Maybe (String, String))

-- | A module-resolution error, positioned at the offending import.
data ModuleError = ModuleError Pos String
  deriving (Eq, Show)

-- | Load and fully resolve a program from a file on disk. The root imports
-- resolve relative to the file's own directory; unresolved paths then fall
-- back to @libDir@.
loadProgram :: FilePath -> FilePath -> IO (Either ModuleError Program)
loadProgram libDir file = do
  r <- try (readFile file) :: IO (Either IOException String)
  case r of
    Left e  -> return (Left (ModuleError (Pos 0 0) ("cannot read " <> file <> ": " <> show e)))
    Right s -> resolveProgram (diskProvider libDir) (takeDirectory file) s

-- | Fully resolve a program from its source text. @rootDir@ is the root
-- source's directory ("" when the source is not a file, e.g. @eval@/REPL).
--
-- The standard prelude is auto-imported ahead of the user program (a
-- synthetic first import resolved from the lib directory, so a user
-- program's own directory never shadows it). When the provider cannot
-- resolve the prelude (e.g. an in-memory map without the file), the prelude
-- is skipped silently rather than erroring: the disk provider always finds
-- it in production and test providers opt in explicitly. Every module the
-- prelude loaded is marked completed before the user program resolves, so
-- the user's own imports deduplicate against the prelude and an explicit
-- @import "prelude.hly"@ is harmless. User definitions shadow prelude
-- definitions (see 'applyShadowing').
resolveProgram :: ImportProvider -> FilePath -> String -> IO (Either ModuleError Program)
resolveProgram provider rootDir src = do
  pre <- loadPrelude provider
  case pre of
    Left e -> return (Left e)
    Right (preDefs, preComp) -> do
      r <- go provider Set.empty preComp rootDir src
      return $ case r of
        Left e               -> Left e
        Right (defs, expr, _) ->
          let merged = applyShadowing preDefs defs
          in case checkProgram (Program [] merged expr) of
               Left m  -> Left (ModuleError (Pos 0 0) m)
               Right _ -> Right (Program [] merged expr)

-- | Fully resolve a program's imports and definitions without the
-- auto-imported prelude: only the source's own @import@ statements and its
-- own top-level definitions are merged. Used by the REPL, which keeps the
-- prelude separate so it is never duplicated across a session.
resolveProgramNoPrelude :: ImportProvider -> FilePath -> String -> IO (Either ModuleError Program)
resolveProgramNoPrelude provider rootDir src = do
  r <- go provider Set.empty Set.empty rootDir src
  return $ case r of
    Left e               -> Left e
    Right (defs, expr, _) ->
      case checkProgram (Program [] defs expr) of
        Left m  -> Left (ModuleError (Pos 0 0) m)
        Right _ -> Right (Program [] defs expr)

-- | Load one module: parse it, merge its own imports (in order, before its
-- own definitions), and return the merged definitions, the module's own
-- final expression (if any), and the set of completed module keys.
-- @inProgress@ holds the keys of modules being loaded right now, so a
-- genuine cycle errors while a repeated import of an already-completed
-- module is silently deduplicated.
go :: ImportProvider -> Set.Set String -> Set.Set String -> FilePath -> String -> IO (Either ModuleError ([TopDef], Maybe Expr, Set.Set String))
go provider inProgress completed dir src = case parseProgram src of
  Left (ParseError p m) -> return (Left (ModuleError p m))
  Right (Program imports defs expr) -> do
    acc <- foldM (importOne provider inProgress completed dir) (Right ([], completed)) imports
    case acc of
      Left e              -> return (Left e)
      Right (defs', comp') -> return (Right (defs' <> defs, expr, comp'))

importOne :: ImportProvider -> Set.Set String -> Set.Set String -> FilePath -> (Either ModuleError ([TopDef], Set.Set String)) -> String -> IO (Either ModuleError ([TopDef], Set.Set String))
importOne _ _ _ _ (Left e) _ = return (Left e)
importOne provider inProgress completed dir (Right (acc, comp)) path = do
  found <- provider dir path
  case found of
    Nothing -> return (Left (ModuleError (Pos 0 0) ("module not found: " <> path)))
    Just (key, src')
      | key `Set.member` inProgress ->
          return (Left (ModuleError (Pos 0 0) ("circular import: " <> path)))
      | key `Set.member` comp ->
          -- Already imported and merged; nothing to add.
          return (Right (acc, comp))
      | otherwise -> do
          -- The imported module resolves its own imports relative to its
          -- own directory (the directory of its canonical key).
          r <- go provider (Set.insert key inProgress) comp (takeDirectory key) src'
          return $ case r of
            Left e                -> Left e
            Right (defs', _expr, comp') -> Right (acc <> defs', Set.insert key comp')

-- | Resolve the auto-imported standard prelude: a synthetic first import
-- resolved from the lib directory (an empty root directory, so a user
-- program's own directory never shadows the prelude). Returns the
-- prelude's merged definitions and the set of module keys it completed,
-- so the user program's imports deduplicate against it. When the
-- provider cannot resolve the prelude at all (e.g. an in-memory map
-- without the file) the prelude is skipped silently: production runs
-- always resolve it through the disk provider, and test providers opt
-- in explicitly.
loadPrelude :: ImportProvider -> IO (Either ModuleError ([TopDef], Set.Set String))
loadPrelude prov = do
  found <- prov "" preludePath
  case found of
    Nothing -> return (Right ([], Set.empty))
    Just _  -> do
      r <- go prov Set.empty Set.empty "" ("import \"" <> preludePath <> "\"\n")
      return $ case r of
        Left e                -> Left e
        Right (defs, _, comp) -> Right (defs, comp)

-- | A disk-backed provider: try the importing directory, then the lib
-- directory. The canonical key is the lexically canonicalized file path, so
-- two spellings of the same module ("../lib/list.hly" from examples/ vs
-- "list.hly" from the lib dir) deduplicate to one key.
diskProvider :: FilePath -> ImportProvider
diskProvider libDir dir path = firstExisting candidates
  where
    candidates = [dir </> path | not (null dir)] <> [libDir </> path]
    firstExisting [] = return Nothing
    firstExisting (c : cs) = do
      ok <- doesFileExist c
      if ok
        then do
          r <- try (readFile c) :: IO (Either IOException String)
          return $ case r of
            Left _  -> Nothing
            Right s -> Just (canonicalKey c, s)
        else firstExisting cs

-- | Collapse a module key lexically (no filesystem access): normalize
-- separators, drop "." segments, and resolve ".." against the preceding
-- segment. A ".." at the very start is preserved (it is relative to the
-- caller, not to the key itself). Two spellings of the same file therefore
-- produce the same key.
canonicalKey :: FilePath -> FilePath
canonicalKey p = joinPath (reverse (foldl step [] (splitDirectories (normalise p))))
  where
    step stack "."  = stack
    step stack ".." = case stack of
      (".." : _) -> ".." : stack
      (_ : rest) -> rest
      []         -> [".."]
    step stack seg = seg : stack

-- | An in-memory provider backed by a static module map (used by the
-- embedded test suite; mirrors the JS mirror's bundled module map). The
-- canonical key is the import path itself.
memProvider :: Map.Map FilePath String -> ImportProvider
memProvider m _dir path = return ((path,) <$> Map.lookup path m)

-- | Drop prelude definitions shadowed by the user program (or by modules it
-- imports): a top-level @let@ binding, @data@ type or constructor, record,
-- class, or type synonym defined by the user part with the same name wins,
-- and the prelude's definition is dropped so the merged program has no
-- duplicates. Prelude @instance@ and @infix@ declarations never collide and
-- are kept as-is. The user definitions are appended last, so later input
-- shadows earlier input when this is used to extend a session.
applyShadowing :: [TopDef] -> [TopDef] -> [TopDef]
applyShadowing pre user = filter keep pre <> user
  where
    letNames   = Set.fromList [n | DefLet _ _ n _ <- user]
    dataNames  = Set.fromList [ddName d | DefData d <- user]
    ctorNames  = Set.fromList [n | DefData d <- user, (n, _) <- ddCtors d]
    recNames   = Set.fromList [rdName r | DefRecord r <- user]
    classNames = Set.fromList [cdName c | DefClass c <- user]
    synNames   = Set.fromList [n | DefSynonym _ n _ _ <- user]
    keep (DefLet _ _ n _)     = n `Set.notMember` letNames
    keep (DefData d)          = ddName d `Set.notMember` dataNames
                                && all (\(n, _) -> n `Set.notMember` ctorNames) (ddCtors d)
    keep (DefRecord r)        = rdName r `Set.notMember` recNames
    keep (DefClass c)         = cdName c `Set.notMember` classNames
    keep (DefSynonym _ n _ _) = n `Set.notMember` synNames
    keep _                    = True