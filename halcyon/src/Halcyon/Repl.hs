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

import Halcyon.Eval (EvalError(..), evalProgram, showValue)
import Halcyon.Infer (InferError(..), inferProgram)
import Halcyon.Parser (ParseError(..), parseProgram)

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
              Left (ParseError _ m)
                -- A parse error reporting end of input means the program is
                -- truncated, not wrong; keep accumulating.
                | "end of input" `isInfixOf` m -> loop interactive buf'
                | otherwise -> putStrLn ("parse error: " <> m) >> loop interactive ""

    -- Input ended while the buffer was still incomplete; report the error.
    reportIncomplete buf =
      case parseProgram buf of
        Left (ParseError _ m) -> putStrLn ("parse error: " <> m)
        Right _ -> evalAndPrint buf

    -- Typecheck then tree-walk evaluate, printing the value.
    evalAndPrint src = case inferProgram src of
      Left (TypeError _ m) -> putStrLn ("type error: " <> m)
      Right _ -> case evalProgram src of
        Left (EvalError _ m) -> putStrLn ("runtime error: " <> m)
        Right v -> putStrLn (showValue v)

    trim = f . f
      where f = reverse . dropWhile (`elem` (" \t\n\r" :: String))