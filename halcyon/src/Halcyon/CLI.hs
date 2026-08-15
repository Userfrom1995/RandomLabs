module Halcyon.CLI
  ( runCli
  ) where

import System.Environment (getArgs)
import System.Exit (exitFailure, exitSuccess)
import System.IO (hPutStrLn, stderr)

import Halcyon.Selftest (runSelftest)

-- | Halcyon CLI entry point.
--
-- Commands (all args/flags/stdin driven, zero interactive prompts):
--
--   halcyon repl          read/eval/print loop over stdin
--   halcyon run <file>    typecheck then tree-walk evaluate a .hly file
--   halcyon run-vm <file> typecheck then execute on the bytecode VM
--   halcyon check <file>  typecheck only; print inferred top-level types
--   halcyon compile <file> compile to bytecode; print the disassembly
--   halcyon selftest      run the embedded test suite
--   halcyon --help        this help
--   halcyon --version     version string
--
-- The scaffolded CLI only wires the help/version paths; the command
-- implementations are landed in later milestones.
runCli :: IO ()
runCli = do
  args <- getArgs
  case args of
    ["--help"]       -> putStr helpText
    ["-h"]           -> putStr helpText
    ["--version"]    -> putStrLn "halcyon 0.1.0"
    ["selftest"]     -> runSelftest >>= \ok -> if ok then exitSuccess else exitFailure
    [cmd]            -> unknownCommand cmd
    (cmd : _ : rest) -> unknownCommand (cmd <> " " <> unwords rest)
    []               -> hPutStrLn stderr "halcyon: missing command (try --help)" >> exitFailure

unknownCommand :: String -> IO a
unknownCommand cmd = do
  hPutStrLn stderr ("halcyon: unknown command: " <> cmd)
  hPutStrLn stderr "Try 'halcyon --help'."
  exitFailure

helpText :: String
helpText = unlines
  [ "halcyon - a small functional programming language and VM in Haskell"
  , ""
  , "Usage: halcyon COMMAND [ARGS]"
  , ""
  , "  repl              read/eval/print loop (stdin-driven, scriptable)"
  , "  run <file>        typecheck then tree-walk evaluate a .hly file"
  , "  run-vm <file>     typecheck then execute on the bytecode VM"
  , "  check <file>      typecheck only; print inferred top-level types"
  , "  compile <file>    compile to bytecode; print the disassembly"
  , "  selftest          run the embedded test suite"
  , "  --help, -h        show this help"
  , "  --version         show the version"
  ]