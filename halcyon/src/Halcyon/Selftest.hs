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
import Halcyon.Eval (EvalError(..), evalProgram, showValue)
import Halcyon.Compile (compileProgram, CompileError(..))
import Halcyon.Vm (runVm, VmError(..), vmShowValue)

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

-- | Run a named check in IO (for the VM-backed tests).
checkIO :: String -> IO (Either String ()) -> IO Result
checkIO name act = do
  r <- act
  return $ case r of
    Left err -> Fail name err
    Right () -> Ok name

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

evalsTo :: String -> String -> Either String ()
evalsTo src expected = case evalProgram src of
  Left (EvalError _ m) -> Left ("eval error: " <> m)
  Right v              ->
    let shown = showValue v
    in if shown == expected
         then Right ()
         else Left ("expected " <> expected <> ", got " <> shown)

evalFails :: String -> Either String ()
evalFails src = case evalProgram src of
  Left _  -> Right ()
  Right v -> Left ("expected a runtime error, but got " <> showValue v)

vmEvalsTo :: String -> String -> IO (Either String ())
vmEvalsTo src expected = case compileProgram src of
  Left (CompileError _ m) -> return (Left ("compile error: " <> m))
  Right prog -> do
    res <- runVm False prog
    return $ case res of
      Left (VmError m) -> Left ("vm error: " <> m)
      Right v ->
        let shown = vmShowValue v
        in if shown == expected
             then Right ()
             else Left ("expected " <> expected <> ", got " <> shown)

vmFails :: String -> IO (Either String ())
vmFails src = case compileProgram src of
  Left (CompileError _ m) -> return (Left ("compile error: " <> m))
  Right prog -> do
    res <- runVm False prog
    return $ case res of
      Left _  -> Right ()
      Right v -> Left ("expected a vm error, but got " <> vmShowValue v)

-- | Interpreter and VM must agree on a program's output (differential).
differential :: String -> String -> IO (Either String ())
differential src expected = do
  rEval <- case evalProgram src of
    Left (EvalError _ m) -> return (Left ("eval error: " <> m))
    Right v              -> return (Right (showValue v))
  rVm <- case compileProgram src of
    Left (CompileError _ m) -> return (Left ("compile error: " <> m))
    Right prog -> do
      res <- runVm False prog
      return $ case res of
        Left (VmError m) -> Left ("vm error: " <> m)
        Right v          -> Right (vmShowValue v)
  case rEval of
    Left e -> return (Left e)
    Right ev -> case rVm of
      Left e -> return (Left e)
      Right rv ->
        if ev == expected && rv == expected
          then return (Right ())
          else return (Left ("interpreter: " <> ev <> ", vm: " <> rv <> ", expected: " <> expected))

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

evalTests :: Harness
evalTests =
  [ check "eval: arithmetic"         (evalsTo "1 + 2 * 3" "7")
  , check "eval: promote int+float"  (evalsTo "1 + 2.5" "3.5")
  , check "eval: promote float+int"  (evalsTo "2.5 * 2" "5.0")
  , check "eval: int division"       (evalsTo "7 / 2" "3")
  , check "eval: float division"     (evalsTo "7.0 / 2" "3.5")
  , check "eval: div by zero"        (evalFails "1 / 0")
  , check "eval: comparison"         (evalsTo "3 < 4 && 4 <= 4" "true")
  , check "eval: equality"           (evalsTo "1 == 1 && \"a\" /= \"b\"" "true")
  , check "eval: not"                (evalsTo "!false" "true")
  , check "eval: unary minus"        (evalsTo "-5 + 2" "-3")
  , check "eval: if"                 (evalsTo "if 2 > 1 then \"yes\" else \"no\"" "yes")
  , check "eval: let"                (evalsTo "let x = 10 in x * 2" "20")
  , check "eval: let rec fib"        (evalsTo "let rec fib = fn n => if n < 2 then n else fib (n - 1) + fib (n - 2) in fib 10" "55")
  , check "eval: curried lambda"     (evalsTo "let f = fn x y => x + y in f 3 4" "7")
  , check "eval: partial application" (evalsTo "let f = fn x y => x + y in let g = f 10 in g 5" "15")
  , check "eval: closures capture"   (evalsTo "let x = 5 in let f = fn y => x + y in f 1" "6")
  , check "eval: higher-order"       (evalsTo "let twice = fn f x => f (f x) in twice (fn x => x * 2) 3" "12")
  , check "eval: cons/head/tail"     (evalsTo "let xs = cons 1 (cons 2 []) in head xs" "1")
  , check "eval: tail"               (evalsTo "tail (cons 1 (cons 2 []))" "[2]")
  , check "eval: isNil"              (evalsTo "isNil []" "true")
  , check "eval: list literal"       (evalsTo "[1, 2, 3]" "[1, 2, 3]")
  , check "eval: list ops"           (evalsTo "let xs = [1, 2, 3] in cons 0 (tail xs)" "[0, 2, 3]")
  , check "eval: string value"        (evalsTo "let s = \"hello\" in s" "hello")
  , check "eval: string eq"           (evalsTo "\"a\" == \"a\"" "true")
  , check "eval: head empty"         (evalFails "head []")
  , check "eval: if needs bool"      (evalFails "if 1 then 2 else 3")
  , check "eval: apply non-fn"       (evalFails "5 3")
  , check "eval: unbound"            (evalFails "nope")
  , check "eval: negate bool"        (evalFails "-true")
  , check "eval: arithmetic fib"     (evalsTo "let rec fib = fn n => if n < 2 then n else fib (n - 1) + fib (n - 2) in fib 25" "75025")
  ]

vmTests :: IO Harness
vmTests = sequence
  [ checkIO "vm: arithmetic"            (vmEvalsTo "1 + 2 * 3" "7")
  , checkIO "vm: promote int+float"     (vmEvalsTo "1 + 2.5" "3.5")
  , checkIO "vm: promote float+int"     (vmEvalsTo "2.5 * 2" "5.0")
  , checkIO "vm: int division"          (vmEvalsTo "7 / 2" "3")
  , checkIO "vm: float division"        (vmEvalsTo "7.0 / 2" "3.5")
  , checkIO "vm: div by zero"           (vmFails "1 / 0")
  , checkIO "vm: comparison"            (vmEvalsTo "3 < 4 && 4 <= 4" "true")
  , checkIO "vm: equality"              (vmEvalsTo "1 == 1 && \"a\" /= \"b\"" "true")
  , checkIO "vm: not"                   (vmEvalsTo "!false" "true")
  , checkIO "vm: unary minus"           (vmEvalsTo "-5 + 2" "-3")
  , checkIO "vm: if"                    (vmEvalsTo "if 2 > 1 then \"yes\" else \"no\"" "yes")
  , checkIO "vm: let"                   (vmEvalsTo "let x = 10 in x * 2" "20")
  , checkIO "vm: let rec fib"           (vmEvalsTo "let rec fib = fn n => if n < 2 then n else fib (n - 1) + fib (n - 2) in fib 10" "55")
  , checkIO "vm: curried lambda"        (vmEvalsTo "let f = fn x y => x + y in f 3 4" "7")
  , checkIO "vm: partial application"   (vmEvalsTo "let f = fn x y => x + y in let g = f 10 in g 5" "15")
  , checkIO "vm: closures capture"      (vmEvalsTo "let x = 5 in let f = fn y => x + y in f 1" "6")
  , checkIO "vm: let rec capture"       (vmEvalsTo "let x = 2 in let rec f = fn n => if n < 2 then n else f (n - 1) + x in f 5" "9")
  , checkIO "vm: higher-order"          (vmEvalsTo "let twice = fn f x => f (f x) in twice (fn x => x * 2) 3" "12")
  , checkIO "vm: cons/head/tail"        (vmEvalsTo "let xs = cons 1 (cons 2 []) in head xs" "1")
  , checkIO "vm: tail"                  (vmEvalsTo "tail (cons 1 (cons 2 []))" "[2]")
  , checkIO "vm: isNil"                 (vmEvalsTo "isNil []" "true")
  , checkIO "vm: list literal"          (vmEvalsTo "[1, 2, 3]" "[1, 2, 3]")
  , checkIO "vm: list ops"              (vmEvalsTo "let xs = [1, 2, 3] in cons 0 (tail xs)" "[0, 2, 3]")
  , checkIO "vm: string value"          (vmEvalsTo "let s = \"hello\" in s" "hello")
  , checkIO "vm: head empty"            (vmFails "head []")
  , checkIO "vm: negate bool"           (vmFails "-true")
  , checkIO "vm: arith fib"             (vmEvalsTo "let rec fib = fn n => if n < 2 then n else fib (n - 1) + fib (n - 2) in fib 25" "75025")
  , checkIO "vm: nested upvalues"       (vmEvalsTo "let rec makeCounter = fn n => fn step => n + step in let inc = makeCounter 10 in inc 5" "15")
  , checkIO "vm: mutual no (separate)"  (vmEvalsTo "let g = fn y => y * 2 in let f = fn x => g x in f 21" "42")
  ]

diffTests :: IO Harness
diffTests = sequence
  [ checkIO "diff: fib 20"       (differential "let rec fib = fn n => if n < 2 then n else fib (n - 1) + fib (n - 2) in fib 20" "6765")
  , checkIO "diff: map-like"     (differential "let rec loop = fn f xs => if isNil xs then [] else cons (f (head xs)) (loop f (tail xs)) in loop (fn x => x * 2) [1, 2, 3, 4]" "[2, 4, 6, 8]")
  , checkIO "diff: filter-like"  (differential "let rec loop = fn xs => if isNil xs then [] else if head xs > 2 then cons (head xs) (loop (tail xs)) else loop (tail xs) in loop [1, 2, 3, 4, 5]" "[3, 4, 5]")
  , checkIO "diff: arithmetic"   (differential "1 + 2 * 3 - 4 / 2" "5")
  , checkIO "diff: floats"       (differential "1.5 + 2.25 * 2" "6.0")
  , checkIO "diff: nested calls" (differential "let rec sum = fn n => if n < 1 then 0 else n + sum (n - 1) in sum 100" "5050")
  , checkIO "diff: closures"     (differential "let x = 3 in let y = 4 in let f = fn z => x * z + y in f 5" "19")
  , checkIO "diff: strings"      (differential "if \"a\" == \"a\" then \"yes\" else \"no\"" "yes")
  , checkIO "diff: deep rec"     (differential "let rec count = fn n => if n < 1 then 0 else 1 + count (n - 1) in count 5000" "5000")
  , checkIO "diff: partial app"  (differential "let f = fn a b c => a * b + c in f 2 3 4" "10")
  ]

-- ---------------------------------------------------------------------
-- Main
-- ---------------------------------------------------------------------

runSelftest :: IO Bool
runSelftest = do
  vm <- vmTests
  diff <- diffTests
  let groups =
        [ ("lexer", lexerTests)
        , ("parser", parserTests)
        , ("types", typeTests)
        , ("eval", evalTests)
        , ("vm", vm)
        , ("differential", diff)
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

