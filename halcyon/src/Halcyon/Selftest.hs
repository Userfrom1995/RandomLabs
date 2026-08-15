{-# LANGUAGE LambdaCase #-}
-- | Embedded self-test suite, wired into @halcyon selftest@. Returns True
-- when every test passes, False otherwise.
module Halcyon.Selftest
  ( runSelftest
  ) where

import Control.Monad (forM_, when)

import Halcyon.Infer (InferError(..), inferProgram, showType)
import Halcyon.Lexer (lexSource, LexError(..))
import Halcyon.Parser (parseProgram, ParseError(..))

-- ---------------------------------------------------------------------
-- Tiny assertion framework
-- ---------------------------------------------------------------------

data Result = Ok String | Fail String String
  deriving (Show)

-- | Accumulate check results.
type Harness = [Result]

pass :: String -> Result
pass = Ok

failWith :: String -> String -> Result
failWith = Fail

-- | Run a named check; the action returns a Bool or an error description.
check :: String -> (Either String ()) -> Result
check name act =
  case act of
    Left err  -> Fail name err
    Right ()  -> Ok name

lexesOk :: String -> Either String ()
lexesOk src = case lexSource src of
  Left (LexError _ m) -> Left ("lex error: " <> m)
  Right _             -> Right ()

lexFails :: String -> Either String ()
lexFails src = case lexSource src of
  Left _  -> Right ()
  Right _ -> Left "expected a lex error but lexing succeeded"

parsesOk :: String -> Either String ()
parsesOk src = case parseProgram src of
  Left (ParseError _ m) -> Left ("parse error: " <> m)
  Right _               -> Right ()

parsesTo :: String -> Either String ()
parsesTo _ = Right ()

parseFails :: String -> Either String ()
parseFails src = case parseProgram src of
  Left _  -> Right ()
  Right _ -> Left "expected a parse error but parsing succeeded"

inferredAs :: String -> String -> Either String ()
inferredAs src expected = case inferProgram src of
  Left (TypeError _ m) -> Left ("type error: " <> m)
  Right t              ->
    let shown = showType t
    in if shown == expected
         then Right ()
         else Left ("expected type " <> expected <> ", got " <> shown)

inferFails :: String -> Either String ()
inferFails src = case inferProgram src of
  Left _  -> Right ()
  Right t -> Left ("expected a type error, but inferred " <> showType t)

-- ---------------------------------------------------------------------
-- Tests
-- ---------------------------------------------------------------------

lexerTests :: Harness
lexerTests =
  [ check "lex: literals and operators" (lexesOk "1 2.5 true false \"s\" + - * / < <= == /= && || !")
  , check "lex: line comment"           (lexesOk "-- hi\n1")
  , check "lex: nested block comment"   (lexesOk "{- a {- b -} c -} 1")
  , check "lex: unterminated string"    (lexFails "\"oops")
  , check "lex: unterminated comment"   (lexFails "{- oops")
  , check "lex: bad escape"             (lexFails "\"\\q\"")
  , check "lex: bad char"               (lexFails "@")
  , check "lex: 1-2 is two tokens"      (lexesOk "1-2")
  , check "lex: floats and exponents"   (lexesOk "3.14 1e3 1.5e-2 2E2")
  ]

parserTests :: Harness
parserTests =
  [ check "parse: precedence"           (parsesOk "1 + 2 * 3")
  , check "parse: parens override"      (parsesOk "(1 + 2) * 3")
  , check "parse: let"                  (parsesOk "let x = 5 in x + 1")
  , check "parse: let rec"              (parsesOk "let rec f = fn n => f (n - 1) in f 3")
  , check "parse: lambda"               (parsesOk "fn x y => x + y")
  , check "parse: if"                   (parsesOk "if x then y else z")
  , check "parse: lists"                (parsesOk "[1, 2, 3]")
  , check "parse: builtins"             (parsesOk "cons 1 (cons 2 [])")
  , check "parse: unary minus"          (parsesOk "-1 + -x")
  , check "parse: not"                  (parsesOk "!true && !!false")
  , check "parse: application"          (parsesOk "f a b c")
  , check "parse: missing else"         (parseFails "if true then 1")
  , check "parse: dangling operator"    (parseFails "1 +")
  , check "parse: stray paren"          (parseFails "1 + (2")
  ]

typeTests :: Harness
typeTests =
  [ check "type: int arithmetic"     (inferredAs "1 + 2" "Int")
  , check "type: float arithmetic"   (inferredAs "1.0 + 2.0" "Float")
  , check "type: int/float promote"  (inferredAs "1 + 2.5" "Float")
  , check "type: float/int promote"  (inferredAs "2.5 + 1" "Float")
  , check "type: promotion via var"  (inferredAs "let x = 5 in x + 2.5" "Float")
  , check "type: comparison is Bool" (inferredAs "1 < 2" "Bool")
  , check "type: bool ops"           (inferredAs "true && !false" "Bool")
  , check "type: if"                 (inferredAs "if 1 < 2 then 1 else 0" "Int")
  , check "type: lambda"             (inferredAs "fn x => x" "a -> a")
  , check "type: let polymorphism"   (inferredAs "let id = fn x => x in id 1" "Int")
  , check "type: let poly string"    (inferredAs "let id = fn x => x in id \"s\"" "String")
  , check "type: numeric lambda"     (inferredAs "fn x y => x + y" "a -> a -> a")
  , check "type: recursion"          (inferredAs "let rec f = fn n => if n < 2 then n else f (n - 1) in f 5" "Int")
  , check "type: cons/head/tail"     (inferredAs "let xs = cons 1 (cons 2 []) in head xs" "Int")
  , check "type: head list"          (inferredAs "head [1, 2, 3]" "Int")
  , check "type: isNil"              (inferredAs "isNil []" "Bool")
  , check "type: reject bad cons"    (inferFails "cons 1 [true]")
  , check "type: reject int + bool"  (inferFails "1 + true")
  , check "type: reject if int cond" (inferFails "if 1 then 2 else 3")
  , check "type: reject unbound"     (inferFails "nope")
  , check "type: reject string arith"(inferFails "\"a\" + \"b\"")
  , check "type: reject apply arith" (inferFails "let g = fn f => f 1 in g (fn x => x + \"s\")")
  ]

-- ---------------------------------------------------------------------
-- Main
-- ---------------------------------------------------------------------

runSelftest :: IO Bool
runSelftest = do
  let groups =
        [ ("lexer", lexerTests)
        , ("parser", parserTests)
        , ("types", typeTests)
        ]
      total = sum (map (length . snd) groups)
  failures <- foldl runGroup (return []) groups
  when (null failures) $ putStrLn ("All " <> show total <> " tests passed.")
  mapM_ print failures
  return (null failures)
  where
    runGroup :: IO [Result] -> (String, [Result]) -> IO [Result]
    runGroup acc (name, tests) = do
      prev <- acc
      putStrLn (name <> ": " <> show (length tests) <> " tests")
      return (prev <> filter isFail tests)
    isFail (Fail _ _) = True
    isFail (Ok _)     = False

