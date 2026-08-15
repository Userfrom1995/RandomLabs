{-# LANGUAGE LambdaCase #-}
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
  , ModuleError(..)
  , ImportProvider
  , diskProvider
  , memProvider
  ) where

import Control.Exception (IOException, try)
import Control.Monad (foldM)
import qualified Data.Map.Strict as Map
import qualified Data.Set as Set
import System.Directory (doesFileExist)
import System.FilePath (takeDirectory, (</>))

import Halcyon.Ast (Program(..), TopDef, Expr)
import Halcyon.Data (checkProgram)
import Halcyon.Parser (parseProgram, ParseError(..))
import Halcyon.Token (Pos(..))

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
resolveProgram :: ImportProvider -> FilePath -> String -> IO (Either ModuleError Program)
resolveProgram provider rootDir src = do
  r <- go Set.empty Set.empty rootDir src
  return $ case r of
    Left e               -> Left e
    Right (defs, expr, _) -> case checkProgram (Program [] defs expr) of
      Left m  -> Left (ModuleError (Pos 0 0) m)
      Right _ -> Right (Program [] defs expr)
  where
    -- Load one module: parse it, merge its own imports (in order, before its
    -- own definitions), and return the merged definitions, the module's own
    -- final expression (if any), and the set of completed module keys.
    -- @inProgress@ holds the keys of modules being loaded right now, so a
    -- genuine cycle errors while a repeated import of an already-completed
    -- module is silently deduplicated.
    go :: Set.Set String -> Set.Set String -> FilePath -> String -> IO (Either ModuleError ([TopDef], Maybe Expr, Set.Set String))
    go inProgress completed dir src = case parseProgram src of
      Left (ParseError p m) -> return (Left (ModuleError p m))
      Right (Program imports defs expr) -> do
        acc <- foldM (importOne inProgress completed dir) (Right ([], completed)) imports
        case acc of
          Left e              -> return (Left e)
          Right (defs', comp') -> return (Right (defs' <> defs, expr, comp'))

    importOne :: Set.Set String -> Set.Set String -> FilePath -> (Either ModuleError ([TopDef], Set.Set String)) -> String -> IO (Either ModuleError ([TopDef], Set.Set String))
    importOne _ _ _ (Left e) _ = return (Left e)
    importOne inProgress completed dir (Right (acc, comp)) path = do
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
              r <- go (Set.insert key inProgress) comp (takeDirectory key) src'
              return $ case r of
                Left e                -> Left e
                Right (defs', _expr, comp') -> Right (acc <> defs', Set.insert key comp')

-- | A disk-backed provider: try the importing directory, then the lib
-- directory. The canonical key is the absolute file path used.
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
            Right s -> Just (c, s)
        else firstExisting cs

-- | An in-memory provider backed by a static module map (used by the
-- embedded test suite; mirrors the JS mirror's bundled module map). The
-- canonical key is the import path itself.
memProvider :: Map.Map FilePath String -> ImportProvider
memProvider m _dir path = return ((path,) <$> Map.lookup path m)