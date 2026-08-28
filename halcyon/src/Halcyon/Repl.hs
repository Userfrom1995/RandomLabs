{-# LANGUAGE LambdaCase #-}
module Halcyon.Repl
  ( repl
  ) where

import Control.Monad (unless, when)
import qualified Data.Map.Strict as Map
import Data.List (isInfixOf, isPrefixOf)
import qualified Data.Set as Set
import System.IO
  ( BufferMode(..)
  , getLine
  , hFlush
  , hIsTerminalDevice
  , hSetBuffering
  , isEOF
  , putStr
  , putStrLn
  , stdin
  , stdout
  )

import qualified Halcyon.Compile as C (CompileError(..), Program(..), compileProgramIn, disassemble)
import Halcyon.Ast (Program(..), TopDef)
import Halcyon.Data (checkProgram)
import Halcyon.Diag (renderError)
import Halcyon.Eval (EvalError(..), evalProgramIn, evalProgramEffect, showValue)
import Halcyon.Infer (InferError(..), inferProgramIn)
import Halcyon.Module (ModuleError(..), applyShadowing, diskProvider, resolveProgram, resolveProgramNoPrelude)
import Halcyon.Optimize (optimizeProgram)
import Halcyon.Parser (ParseError(..), parseProgram)
import Halcyon.Type (Scheme(..), Type(..), freeVars, showScheme)
import Halcyon.Value (Value(..))

-- | The REPL session: the user's accumulated top-level definitions, kept
-- separate from the auto-imported prelude (so the prelude is never
-- duplicated across inputs). Each input's definitions shadow the session
-- and the whole user part shadows the prelude when a program is built.
data Session = Session
  { sessPrelude :: [TopDef]  -- ^ the prelude definitions, resolved once
  , sessUser    :: [TopDef]  -- ^ accumulated user definitions
  }

-- | Read/eval/print loop over stdin.
--
-- Reads input one line at a time and accumulates a buffer. While the buffer
-- does not yet parse to a complete program (a parse error at the EOF
-- position, e.g. an unclosed parenthesized expression or a missing @in@)
-- the loop keeps reading, so multi-line programs work. Once the buffer
-- parses, the program is typechecked and evaluated and its value printed.
-- Blank lines reset the buffer. A @> @ prompt is shown only when stdin is
-- a terminal. Piped input runs the same loop to EOF, so
--
-- @
--   printf '1 + 2 * 3' | halcyon repl
-- @
--
-- prints @7@.
--
-- A line beginning with @:@ runs a REPL command instead of being evaluated:
--
-- @
--   :help                    list the commands
--   :type <expr>             print the generalized type of an expression
--   :disasm <expr>           compile an expression and disassemble its entry
--   :opt <expr>              same, through the deterministic optimizer
--   :import <file>           import a module's definitions into the session
--   :quit                    exit the REPL
-- @
--
-- Definitions accumulate across inputs: @let x = 5@ then @x + 1@ evaluates
-- @6@, and a later definition with the same name shadows the earlier one
-- exactly as a user top-level definition shadows the prelude.
repl :: FilePath -> IO ()
repl libDir = do
  interactive <- hIsTerminalDevice stdin
  hSetBuffering stdout LineBuffering
  preludeDefs <- initialPrelude libDir
  loop interactive libDir (Session preludeDefs []) ""
  where
    -- Resolve the auto-imported prelude's definitions (from an empty
    -- program). When the provider cannot find it the session just starts
    -- with an empty prelude.
    initialPrelude libDir = do
      r <- resolveProgram (diskProvider libDir) "" ""
      return $ case r of
        Right (Program _ defs _) -> defs
        Left _                   -> []

    -- The definitions a program is evaluated against: the prelude first,
    -- then the user's session and current input, later definitions
    -- shadowing earlier ones.
    programDefs :: Session -> [TopDef] -> [TopDef]
    programDefs (Session pre user) cur = applyShadowing pre (applyShadowing user cur)

    loop interactive libDir sess buf = do
      done <- isEOF
      if done
        then unless (null (trim buf)) (reportIncomplete libDir sess buf)
        else do
          when interactive $ putStr "> " >> hFlush stdout
          line <- getLine
          let buf' = buf <> line <> "\n"
          if null (trim buf') && not (null buf)
            then loop interactive libDir sess ""              -- blank line: reset
            else if null buf && isPrefixOf ":" (trim line)
              then handleCommand libDir sess (trim line) >>= \case
                Nothing    -> return ()                        -- :quit
                Just sess' -> loop interactive libDir sess' ""
              else case parseProgram buf' of
                Right _ -> evalAndPrint libDir sess buf' >>= \case
                  Just sess' -> loop interactive libDir sess' ""
                  Nothing    -> loop interactive libDir sess ""  -- input rejected; no session change
                Left (ParseError p m)
                  -- A parse error reporting end of input means the program is
                  -- truncated, not wrong; keep accumulating.
                  | "end of input" `isInfixOf` m -> loop interactive libDir sess buf'
                  | otherwise -> putStrLn (renderError buf' p ("parse error: " <> m)) >> loop interactive libDir sess ""

    -- Input ended while the buffer was still incomplete; report the error.
    reportIncomplete libDir sess buf =
      case parseProgram buf of
        Left (ParseError p m) -> putStrLn (renderError buf p ("parse error: " <> m))
        Right _ -> evalAndPrint libDir sess buf >> return ()

    -- Typecheck then tree-walk evaluate, printing the value. The input's
    -- own imports are resolved without the prelude (which the session
    -- already holds), shadow-merged into the user part of the session, and
    -- the session is only extended when the whole program checks and runs.
    -- An effect result (a @do { }@ block) runs through the pure effect
    -- runner with no scripted input (@readLine@ returns the empty string),
    -- printing the accumulated output and then the final result (nothing
    -- when it is @()@). A definitions-only module prints nothing but still
    -- extends the session.
    evalAndPrint :: FilePath -> Session -> String -> IO (Maybe Session)
    evalAndPrint libDir sess@(Session pre user) src = do
      r <- resolveProgramNoPrelude (diskProvider libDir) "" src
      case r of
        Left (ModuleError p m) -> putStrLn (renderError src p ("module error: " <> m)) >> return Nothing
        Right (Program _ userDefs expr) -> do
          let user' = applyShadowing user userDefs
              prog  = Program [] (programDefs sess user') expr
          case checkProgram prog of
            Left m -> putStrLn m >> return Nothing
            Right _ -> case inferProgramIn prog of
              Left (TypeError p m) -> putStrLn (renderError src p ("type error: " <> m)) >> return Nothing
              Right _ -> case evalProgramIn prog of
                Left (EvalError p m) -> putStrLn (renderError src p ("runtime error: " <> m)) >> return Nothing
                Right (Just v) -> case v of
                  VEffect{} -> case evalProgramEffect [] prog of
                    Left (EvalError p m) -> putStrLn (renderError src p ("runtime error: " <> m)) >> return Nothing
                    Right (Just (out, res)) -> putStr out >> printResult res >> return (Just (Session pre user'))
                    Right Nothing -> return (Just (Session pre user'))
                  _ -> putStrLn (showValue v) >> return (Just (Session pre user'))
                Right Nothing -> return (Just (Session pre user'))

    -- Evaluate an expression against the session's definitions, returning
    -- its inferred type for @:type@, or its compiled entry function for
    -- @:disasm@/@:opt@.
    withExpr :: Session -> String -> (Program -> IO ()) -> IO ()
    withExpr sess exprSrc run = case parseProgram (exprSrc <> "\n") of
      Left (ParseError p m) -> putStrLn (renderError (exprSrc <> "\n") p ("parse error: " <> m))
      Right (Program _ _ mexpr) -> case mexpr of
        Nothing -> putStrLn "no expression given"
        Just e  -> do
          let prog = Program [] (programDefs sess []) (Just e)
          case checkProgram prog of
            Left m -> putStrLn m
            Right _ -> run prog

    -- :type <expr>  print the generalized scheme of the expression.
    typeOf :: Session -> String -> IO ()
    typeOf sess exprSrc = withExpr sess exprSrc $ \prog ->
      case inferProgramIn prog of
        Left (TypeError p m) -> putStrLn (renderError (exprSrc <> "\n") p ("type error: " <> m))
        Right (Just t)       ->
          let t' = normalizeVars t
          in putStrLn (showScheme (Scheme [] (freeVars t') t'))
        Right Nothing        -> return ()

    -- Renumber the free type variables of a type to 0,1,2,... so a scheme
    -- renders as @forall a b. ...@ instead of the raw internal metavariable
    -- indices (which are large and non-contiguous).
    normalizeVars :: Type -> Type
    normalizeVars t = go (Map.fromList (zip (Set.toList (freeVars t)) [0 ..])) t
      where
        go m = \case
          TVar v    -> TVar (Map.findWithDefault v v m)
          TList t'  -> TList (go m t')
          TData n ts -> TData n (map (go m) ts)
          TRec n ts  -> TRec n (map (go m) ts)
          TFun a b  -> TFun (go m a) (go m b)
          TEffect t' -> TEffect (go m t')
          t'        -> t'

    -- :disasm <expr> / :opt <expr>  compile and disassemble the entry.
    disasm :: Bool -> Session -> String -> IO ()
    disasm useOpt sess exprSrc = withExpr sess exprSrc $ \prog ->
      case inferProgramIn prog of
        Left (TypeError p m) -> putStrLn (renderError (exprSrc <> "\n") p ("type error: " <> m))
        Right _ -> case C.compileProgramIn prog of
          Left (C.CompileError p m) -> putStrLn (renderError (exprSrc <> "\n") p ("compile error: " <> m))
          Right compiled ->
            let compiled' = if useOpt then optimizeProgram compiled else compiled
            in putStr (C.disassemble (C.pEntry compiled'))

    -- :import <file>  resolve a module and merge its definitions in.
    importModule :: FilePath -> Session -> String -> IO (Maybe Session)
    importModule libDir sess@(Session pre user) path0 = do
      let path = stripQuotes (trim path0)
      r <- resolveProgramNoPrelude (diskProvider libDir) "" ("import \"" <> path <> "\"\n")
      case r of
        Left (ModuleError p m) -> putStrLn (renderError path0 p ("module error: " <> m)) >> return (Just sess)
        Right (Program _ userDefs _) -> do
          putStrLn ("imported " <> path)
          return (Just (Session pre (applyShadowing user userDefs)))

    -- Dispatch a colon command. Returns Nothing to quit the loop.
    handleCommand :: FilePath -> Session -> String -> IO (Maybe Session)
    handleCommand libDir sess line = case dropWhile (== ':') line of
      body@(_ : _) ->
        let (cmd, rest) = break (== ' ') body
            arg         = trim rest
        in case cmd of
             "help"    -> usage >> return (Just sess)
             "h"       -> usage >> return (Just sess)
             "?"       -> usage >> return (Just sess)
             "quit"    -> return Nothing
             "q"       -> return Nothing
             "type"    -> typeOf sess arg >> return (Just sess)
             "disasm"  -> disasm False sess arg >> return (Just sess)
             "opt"     -> disasm True sess arg >> return (Just sess)
             "import"  -> importModule libDir sess arg
             _         -> putStrLn ("unknown command: :" <> cmd <> " (try :help)") >> return (Just sess)
      _ -> usage >> return (Just sess)

    printResult VUnit = return ()
    printResult r     = putStrLn (showValue r)

    usage = putStr (unlines
      [ ":help                      list the REPL commands"
      , ":type <expr>               print the generalized type of an expression"
      , ":disasm <expr>             compile an expression and disassemble its entry function"
      , ":opt <expr>                compile through the optimizer and disassemble"
      , ":import <file>             import a module's definitions into the session"
      , ":quit                      exit the REPL"
      , ""
      , "Input is evaluated as a Halcyon program with the auto-imported prelude;"
      , "definitions accumulate across inputs, later ones shadowing earlier ones."
      ])

    stripQuotes p = case p of
      ('"' : rest) | not (null rest) && last rest == '"' -> init rest
      _ -> p

    trim = f . f
      where f = reverse . dropWhile (`elem` (" \t\n\r" :: String))