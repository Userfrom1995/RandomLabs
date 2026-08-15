{-# LANGUAGE ScopedTypeVariables #-}
module Halcyon.CLI
  ( runCli
  ) where

import Control.Exception (IOException, try)
import Control.Monad (forM_)
import Data.List (find, sort)
import System.Directory (getDirectoryContents)
import System.Environment (getArgs)
import System.Exit (ExitCode(..), exitFailure, exitSuccess, exitWith)
import System.FilePath (dropExtension, takeExtension, (</>))
import System.IO (hPutStrLn, stderr)

import Halcyon.Compile (CompileError(..), Program(..), compileProgram, disassemble)
import Halcyon.Corpus (CorpusEntry(..), corpus)
import Halcyon.Diag (renderError)
import Halcyon.Eval (EvalError(..), evalProgram, showValue)
import Halcyon.Infer (InferError(..), inferProgram, showType)
import Halcyon.Optimize (optimizeProgram)
import Halcyon.Repl (repl)
import Halcyon.Selftest (runSelftest)
import Halcyon.Vm (VmError(..), runVm, vmShowValue)
import Halcyon.Token (Pos(..))

-- | Halcyon CLI entry point.
--
-- Commands (all args/flags/stdin driven, zero interactive prompts):
--
--   halcyon repl               read/eval/print loop over stdin
--   halcyon run <file>         typecheck then tree-walk evaluate a .hly file
--   halcyon run-vm <file>      typecheck then execute on the bytecode VM
--   halcyon run-vm --trace <file>  as above, tracing every executed instruction
--   halcyon run-vm --opt <file> as run-vm, but run the optimized bytecode
--   halcyon eval <expr>        typecheck then evaluate an inline expression
--   halcyon check <file>       typecheck only; print the inferred top-level type
--   halcyon compile <file>     compile to bytecode; print the disassembly
--   halcyon compile --opt <file>  as above, printing the optimized disassembly
--   halcyon corpus             run the differential corpus through both evaluators
--   halcyon corpus --opt       as corpus, re-verifying the optimized bytecode
--   halcyon corpus --examples <dir>  check the .hly files in <dir> against the corpus
--   halcyon selftest           run the embedded test suite
--   halcyon --help             this help
--   halcyon --version          version string
--
-- Exit codes: 0 success, 1 any lex/parse/type/runtime/IO error, 2 usage
-- error (unknown command, wrong argument count, missing file argument).
runCli :: IO ()
runCli = do
  args <- getArgs
  case args of
    ["--help"]                     -> putStr helpText >> exitSuccess
    ["-h"]                         -> putStr helpText >> exitSuccess
    ["--version"]                  -> putStrLn "halcyon 0.1.0" >> exitSuccess
    ["repl"]                       -> repl
    ["selftest"]                   -> runSelftest >>= \ok -> if ok then exitSuccess else exitFailure
    ["corpus"]                     -> runCorpus False
    ["corpus", "--opt"]            -> runCorpus True
    ["corpus", "--examples", dir]  -> runCorpusExamples dir
    ["run", file]                  -> runFile file
    ["run-vm", file]               -> runVmFile False False file
    ["run-vm", "--trace", file]    -> runVmFile True False file
    ["run-vm", "--opt", file]      -> runVmFile False True file
    ["eval", expr]                 -> evalInline expr
    ["check", file]                -> checkFile file
    ["compile", file]              -> compileFile False file
    ["compile", "--opt", file]     -> compileFile True file
    [cmd]                          -> usageError cmd
    (cmd : _rest)                  -> usageError (cmd <> " ...")
    []                             -> usageError ""

-- ---------------------------------------------------------------------
-- Subcommands
-- ---------------------------------------------------------------------

-- | @halcyon run@: typecheck then tree-walk evaluate, printing the value.
runFile :: FilePath -> IO ()
runFile file = do
  src <- readSource file
  case src of
    Left e -> die e
    Right s ->
      case inferProgram s of
        Left (TypeError p m) -> die (renderError s p (posStr p <> ": type error: " <> m))
        Right _ ->
          case evalProgram s of
            Left (EvalError p m) -> die (renderError s p (posStr p <> ": runtime error: " <> m))
            Right v -> putStrLn (showValue v) >> exitSuccess

-- | @halcyon eval@: typecheck then evaluate an inline expression and print
-- the value. No file needed, so pipelines and scripting can use it
-- directly; exit codes match the file-based commands.
evalInline :: String -> IO ()
evalInline src =
  case inferProgram src of
    Left (TypeError p m) -> die (renderError src p (posStr p <> ": type error: " <> m))
    Right _ ->
      case evalProgram src of
        Left (EvalError p m) -> die (renderError src p (posStr p <> ": runtime error: " <> m))
        Right v -> putStrLn (showValue v) >> exitSuccess

-- | @halcyon run-vm@: typecheck then compile and execute on the bytecode VM.
-- With @--trace@ every executed instruction is printed to stderr; with
-- @--opt@ the deterministic optimizer pass runs before execution.
runVmFile :: Bool -> Bool -> FilePath -> IO ()
runVmFile trace opt file = do
  src <- readSource file
  case src of
    Left e -> die e
    Right s ->
      case inferProgram s of
        Left (TypeError p m) -> die (renderError s p (posStr p <> ": type error: " <> m))
        Right _ ->
          case compileProgram s of
            Left (CompileError p m) -> die (renderError s p (posStr p <> ": compile error: " <> m))
            Right prog -> do
              let prog' = if opt then optimizeProgram prog else prog
              res <- runVm trace prog'
              case res of
                Left (VmError m) -> die ("vm error: " <> m)
                Right v -> putStrLn (vmShowValue v) >> exitSuccess

-- | @halcyon check@: typecheck only and print the inferred top-level type.
checkFile :: FilePath -> IO ()
checkFile file = do
  src <- readSource file
  case src of
    Left e -> die e
    Right s ->
      case inferProgram s of
        Left (TypeError p m) -> die (renderError s p (posStr p <> ": type error: " <> m))
        Right t -> putStrLn (showType t) >> exitSuccess

-- | @halcyon compile@: typecheck then compile and print the disassembly.
-- With @--opt@ the optimized bytecode is printed instead.
compileFile :: Bool -> FilePath -> IO ()
compileFile opt file = do
  src <- readSource file
  case src of
    Left e -> die e
    Right s ->
      case inferProgram s of
        Left (TypeError p m) -> die (renderError s p (posStr p <> ": type error: " <> m))
        Right _ ->
          case compileProgram s of
            Left (CompileError p m) -> die (renderError s p (posStr p <> ": compile error: " <> m))
            Right prog ->
              putStr (disassemble (pEntry (if opt then optimizeProgram prog else prog))) >> exitSuccess

-- | @halcyon corpus@: run the embedded corpus through both evaluators; each
-- program must produce byte-identical output on the interpreter and the VM,
-- equal to its recorded expected output. With @opt@ the same check runs on
-- the optimized bytecode, proving the optimizer changes nothing observable.
runCorpus :: Bool -> IO ()
runCorpus opt = do
  rs <- mapM runOne corpus
  let failed = [(n, err) | (n, err) <- rs, not (null err)]
  forM_ failed $ \(n, err) -> hPutStrLn stderr ("corpus: " <> n <> ": " <> err)
  putStrLn
    ("corpus: " <> show (length corpus - length failed) <> "/" <> show (length corpus)
     <> " programs: interpreter and VM agree"
     <> if opt then " (optimized)" else "")
  if null failed then exitSuccess else exitFailure
  where
    runOne e = do
      r <- runBothOpt opt (cSource e)
      return $ case r of
        Left err                        -> (cName e, err)
        Right out | out == cExpected e  -> (cName e, "")
                  | otherwise           -> (cName e, "expected " <> cExpected e <> ", got " <> out)

-- | @halcyon corpus --examples <dir>@: check every @.hly@ file in @dir@.
-- Each file must produce identical interpreter and VM output; when the file
-- name matches a corpus entry, the output must also equal that entry's
-- expected output.
runCorpusExamples :: FilePath -> IO ()
runCorpusExamples dir = do
  names <- listHly dir
  rs <- mapM (runExample dir) names
  let failed = [(n, err) | (n, err) <- rs, not (null err)]
  forM_ failed $ \(n, err) -> hPutStrLn stderr ("example: " <> n <> ": " <> err)
  putStrLn
    ("examples: " <> show (length rs - length failed) <> "/" <> show (length rs)
     <> " files: interpreter and VM agree")
  if null failed then exitSuccess else exitFailure
  where
    listHly d = do
      names <- getDirectoryContents d
      return (sort [n | n <- names, takeExtension n == ".hly"])

    runExample dir name = do
      r <- try (readFile (dir </> name)) :: IO (Either IOException String)
      case r of
        Left e -> return (name, "cannot read: " <> show e)
        Right src -> do
          both <- runBoth src
          let expected = cExpected <$> find ((== dropExtension name) . cName) corpus
          return $ case (both, expected) of
            (Left err, _)             -> (name, err)
            (Right out, Just expOut) | out /= expOut -> (name, "expected " <> expOut <> ", got " <> out)
            (Right _, _)              -> (name, "")

-- | Run a source string on both evaluators; require byte-identical output.
runBoth :: String -> IO (Either String String)
runBoth = runBothOpt False

-- | Like 'runBoth', but when @opt@ is set the VM runs the optimized bytecode
-- (the interpreter output must still match it, so the optimizer provably
-- changes nothing observable).
runBothOpt :: Bool -> String -> IO (Either String String)
runBothOpt opt src = do
  rE <- case evalProgram src of
    Left (EvalError _ m) -> return (Left ("interpreter: " <> m))
    Right v              -> return (Right (showValue v))
  rV <- case compileProgram src of
    Left (CompileError _ m) -> return (Left ("compile: " <> m))
    Right prog -> do
      let prog' = if opt then optimizeProgram prog else prog
      res <- runVm False prog'
      return $ case res of
        Left (VmError m) -> Left ("vm: " <> m)
        Right v          -> Right (vmShowValue v)
  return $ case (rE, rV) of
    (Left e, _)            -> Left e
    (Right ev, Right vv) | ev == vv -> Right ev
    (Right ev, Right vv)   -> Left ("interpreter " <> ev <> " /= vm " <> vv)

-- ---------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------

readSource :: FilePath -> IO (Either String String)
readSource file = do
  r <- try (readFile file) :: IO (Either IOException String)
  return $ case r of
    Left e  -> Left ("cannot read " <> file <> ": " <> show e)
    Right s -> Right s

posStr :: Pos -> String
posStr p = "line " <> show (posLine p) <> ", col " <> show (posCol p)

die :: String -> IO a
die msg = hPutStrLn stderr ("halcyon: " <> msg) >> exitFailure

usageError :: String -> IO a
usageError detail = do
  hPutStrLn stderr ("halcyon: invalid command: " <> detail)
  hPutStrLn stderr "Try 'halcyon --help'."
  exitWith (ExitFailure 2)

helpText :: String
helpText = unlines
  [ "halcyon - a small functional programming language and VM in Haskell"
  , ""
  , "Usage: halcyon COMMAND [ARGS]"
  , ""
  , "  repl                     read/eval/print loop over stdin (scriptable)"
  , "  run <file>               typecheck then tree-walk evaluate a .hly file"
  , "  run-vm <file>            typecheck then execute on the bytecode VM"
  , "  run-vm --trace <file>    as above, tracing every executed instruction"
  , "  run-vm --opt <file>      as run-vm, but run the optimized bytecode"
  , "  eval <expr>              typecheck and evaluate an inline expression"
  , "  check <file>             typecheck only; print the inferred top-level type"
  , "  compile <file>           compile to bytecode; print the disassembly"
  , "  compile --opt <file>     as above, printing the optimized disassembly"
  , "  corpus                   run the differential corpus through both evaluators"
  , "  corpus --opt             as corpus, re-verifying the optimized bytecode"
  , "  corpus --examples <dir>  check the .hly files in <dir> against the corpus"
  , "  selftest                 run the embedded test suite"
  , "  --help, -h               show this help"
  , "  --version                show the version"
  , ""
  , "Exit codes: 0 success, 1 any error, 2 usage error."
  ]