module Halcyon.Repl
  ( repl
  ) where

import Control.Monad (unless, when)
import Data.List (isInfixOf)
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

import Halcyon.Diag (renderError)
import Halcyon.Eval (EvalError(..), evalProgramIn, evalProgramEffect, showValue)
import Halcyon.Infer (InferError(..), inferProgramIn)
import Halcyon.Parser (ParseError(..), parseProgram)
import Halcyon.Value (Value(..))

-- | Read/eval/print loop over stdin.
--
-- Reads input one line at a time and accumulates a buffer. While the buffer
-- does not yet parse to a complete program (a parse error at the EOF
-- position, e.g. an unclosed parenthesized expression or a missing @in@)
-- the loop keeps reading, so multi-line programs work. Once the buffer
-- parses, the program is typechecked and evaluated and its value printed.
-- Blank lines reset the buffer. A @'> '>@ prompt is shown only when stdin is
-- a terminal. Piped input runs the same loop to EOF, so
--
-- @
--   printf '1 + 2 * 3' | halcyon repl
-- @
--
-- prints @7@. There are no interactive prompts: everything is driven by
-- stdin.
repl :: IO ()
repl = do
  interactive <- hIsTerminalDevice stdin
  hSetBuffering stdout LineBuffering
  loop interactive ""
  where
    loop interactive buf = do
      done <- isEOF
      if done
        then unless (null (trim buf)) (reportIncomplete buf)
        else do
          when interactive $ putStr "> " >> hFlush stdout
          line <- getLine
          let buf' = buf <> line <> "\n"
          if null (trim buf') && not (null buf)
            then loop interactive ""              -- blank line: reset
            else case parseProgram buf' of
              Right _ -> evalAndPrint buf' >> loop interactive ""
              Left (ParseError p m)
                -- A parse error reporting end of input means the program is
                -- truncated, not wrong; keep accumulating.
                | "end of input" `isInfixOf` m -> loop interactive buf'
                | otherwise -> putStrLn (renderError buf' p ("parse error: " <> m)) >> loop interactive ""

    -- Input ended while the buffer was still incomplete; report the error.
    reportIncomplete buf =
      case parseProgram buf of
        Left (ParseError p m) -> putStrLn (renderError buf p ("parse error: " <> m))
        Right _ -> evalAndPrint buf

    -- Typecheck then tree-walk evaluate, printing the value. An effect
    -- result (a @do { }@ block) runs through the pure effect runner with no
    -- scripted input (@readLine@ returns the empty string), printing the
    -- accumulated output and then the final result (nothing when it is @()@).
    -- A definitions-only module prints nothing.
    evalAndPrint src = case parseProgram src of
      Left (ParseError p m) -> putStrLn (renderError src p ("parse error: " <> m))
      Right prog -> case inferProgramIn prog of
        Left (TypeError p m) -> putStrLn (renderError src p ("type error: " <> m))
        Right _ -> case evalProgramIn prog of
          Left (EvalError p m) -> putStrLn (renderError src p ("runtime error: " <> m))
          Right (Just v) -> case v of
            VEffect{} -> case evalProgramEffect [] prog of
              Left (EvalError p m) -> putStrLn (renderError src p ("runtime error: " <> m))
              Right (Just (out, res)) -> putStr out >> printResult res
              Right Nothing -> return ()
            _ -> putStrLn (showValue v)
          Right Nothing  -> return ()
      where
        printResult VUnit = return ()
        printResult r     = putStrLn (showValue r)

    trim = f . f
      where f = reverse . dropWhile (`elem` (" \t\n\r" :: String))