{-# LANGUAGE LambdaCase #-}
-- | Embedded self-test suite, wired into @halcyon selftest@. Returns True
-- when every test passes, False otherwise.
module Halcyon.Selftest
  ( runSelftest
  ) where

import Control.Monad (forM_, when)

import qualified Data.Map.Strict as Map

import Halcyon.Corpus (CorpusEntry(..), corpus)
import Halcyon.Infer (InferError(..), inferProgram, showType)
import Halcyon.Lexer (lexSource, LexError(..))
import Halcyon.Module (ModuleError(..), resolveProgram, memProvider)
import Halcyon.Optimize (optimizeProgram)
import Halcyon.Parser (parseProgram, ParseError(..))
import Halcyon.Eval (EvalError(..), evalProgram, evalProgramIn, showValue)
import Halcyon.Compile (compileProgram, CompileError(..), disassemble, Program(..))
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
  Right (Just t)       ->
    let shown = showType t
    in if shown == expected
         then Right ()
         else Left ("expected type " <> expected <> ", got " <> shown)
  Right Nothing        -> Left ("expected type " <> expected <> ", but the program has no expression")

inferFails :: String -> Either String ()
inferFails src = case inferProgram src of
  Left _          -> Right ()
  Right (Just t)  -> Left ("expected a type error, but inferred " <> showType t)
  Right Nothing   -> Left "expected a type error, but the module typechecked with no result"

evalsTo :: String -> String -> Either String ()
evalsTo src expected = case evalProgram src of
  Left (EvalError _ m) -> Left ("eval error: " <> m)
  Right (Just v)       ->
    let shown = showValue v
    in if shown == expected
         then Right ()
         else Left ("expected " <> expected <> ", got " <> shown)
  Right Nothing        -> Left ("expected " <> expected <> ", but the program has no result")

evalFails :: String -> Either String ()
evalFails src = case evalProgram src of
  Left _           -> Right ()
  Right (Just v)   -> Left ("expected a runtime error, but got " <> showValue v)
  Right Nothing    -> Left "expected a runtime error, but the program has no result"

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
    Right (Just v)       -> return (Right (showValue v))
    Right Nothing        -> return (Left "interpreter: program has no result")
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

-- | Run one corpus entry through both evaluators; both must produce the
-- expected output and agree with each other.
corpusCheck :: CorpusEntry -> IO (Either String ())
corpusCheck e = differential (cSource e) (cExpected e)

-- | Compile, optimize, and run on the VM; the optimized program must produce
-- the expected output (the interpreter output is checked separately by the
-- differential tests).
optVmEvalsTo :: String -> String -> IO (Either String ())
optVmEvalsTo src expected = case compileProgram src of
  Left (CompileError _ m) -> return (Left ("compile error: " <> m))
  Right prog -> do
    res <- runVm False (optimizeProgram prog)
    return $ case res of
      Left (VmError m) -> Left ("vm error: " <> m)
      Right v ->
        let shown = vmShowValue v
        in if shown == expected
             then Right ()
             else Left ("expected " <> expected <> ", got " <> shown)

-- | Optimized VM must still fail the way the plain VM does.
optVmFails :: String -> IO (Either String ())
optVmFails src = case compileProgram src of
  Left (CompileError _ m) -> return (Left ("compile error: " <> m))
  Right prog -> do
    res <- runVm False (optimizeProgram prog)
    return $ case res of
      Left _  -> Right ()
      Right v -> Left ("expected an optimized vm error, but got " <> vmShowValue v)

-- | Interpreter, plain VM, and optimized VM must all agree with the expected
-- output: the optimizer provably changes nothing observable.
optDifferential :: String -> String -> IO (Either String ())
optDifferential src expected = do
  rEval <- case evalProgram src of
    Left (EvalError _ m) -> return (Left ("eval error: " <> m))
    Right (Just v)       -> return (Right (showValue v))
    Right Nothing        -> return (Left "interpreter: program has no result")
  rVm <- case compileProgram src of
    Left (CompileError _ m) -> return (Left ("compile error: " <> m))
    Right prog -> do
      plain <- runVm False prog
      opt   <- runVm False (optimizeProgram prog)
      return $ case (plain, opt) of
        (Left (VmError m), _) -> Left ("vm error: " <> m)
        (_, Left (VmError m)) -> Left ("optimized vm error: " <> m)
        (Right a, Right b)    -> Right (vmShowValue a, vmShowValue b)
  case rEval of
    Left e -> return (Left e)
    Right ev -> case rVm of
      Left e -> return (Left e)
      Right (rv, ov) ->
        if ev == expected && rv == expected && ov == expected
          then return (Right ())
          else return (Left ("interpreter: " <> ev <> ", vm: " <> rv
                             <> ", optimized vm: " <> ov <> ", expected: " <> expected))

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
  , check "parse: data decl"            (parsesOk "data Maybe a = Nothing | Just a\nJust 1")
  , check "parse: data multi ctor"      (parsesOk "data Tree a = Leaf | Node (Tree a) a (Tree a)\nLeaf")
  , check "parse: data leading pipe"    (parsesOk "data Color = | Red | Green\nRed")
  , check "parse: data no fields"       (parsesOk "data Empty = Empty\nEmpty")
  , check "parse: ctor app"             (parsesOk "data Pair a b = Pair a b\nPair 1 2")
  , check "parse: data followed by ctor expr" (parsesOk "data Color = Red | Green\nRed")
  , check "parse: reject lower type"    (parseFails "data maybe = Nothing\n1")
  , check "parse: reject lower ctor"    (parseFails "data T = make\n1")
  , check "parse: reject undeclared tyvar" (parseFails "data Foo x = Bar y\n1")
  , check "parse: reject missing equals" (parseFails "data T A\n1")
  , check "parse: match"               (parsesOk "match x with | Just a => a | Nothing => 0")
  , check "parse: match no pipes"      (parseFails "match x with Just a => a")
  , check "parse: match wildcard"      (parsesOk "match x with | _ => 0")
  , check "parse: match cons"          (parsesOk "match xs with | h :: t => h | [] => 0")
  , check "parse: match list literal"  (parsesOk "match xs with | [a, b] => a | _ => 0")
  , check "parse: match ctor app"      (parsesOk "match m with | Just x => x")
  , check "parse: import line"         (parsesOk "import \"list.hly\"\n1")
  , check "parse: top-level let"       (parsesOk "let x = 5\nx + 1")
  , check "parse: top-level rec"       (parsesOk "let rec f = fn n => f n\nf 1")
  , check "parse: def then in-expr"    (parsesOk "let x = 5\nlet y = x + 1\nin y * 2")
  , check "parse: defs-only module"    (parsesOk "let x = 5\nlet y = 6")
  , check "parse: import then defs"    (parsesOk "import \"a.hly\"\nlet x = 1\nx")
  , check "parse: defs then import"    (parseFails "let x = 1\nimport \"a.hly\"\nx")
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
  , check "type: length"             (inferredAs "length [1, 2, 3]" "Int")
  , check "type: length poly"        (inferredAs "let l = fn xs => length xs in l [true]" "Int")
  , check "type: reverse"            (inferredAs "reverse [1, 2, 3]" "[Int]")
  , check "type: append"             (inferredAs "append [1] [2]" "[Int]")
  , check "type: take"               (inferredAs "take 2 [1, 2, 3]" "[Int]")
  , check "type: drop"               (inferredAs "drop 1 [1, 2]" "[Int]")
  , check "type: reject length int"  (inferFails "length 5")
  , check "type: reject append mixed"(inferFails "append [1] [true]")
  , check "type: reject take float"  (inferFails "take 1.5 [1, 2]")
  , check "type: data just"         (inferredAs "data Maybe a = Nothing | Just a\nJust 5" "Maybe Int")
  , check "type: data nothing"      (inferredAs "data Maybe a = Nothing | Just a\nNothing" "Maybe a")
  , check "type: data pair"         (inferredAs "data Pair a b = Pair a b\nPair 1 \"s\"" "Pair Int String")
  , check "type: data tree"         (inferredAs "data Tree a = Leaf | Node (Tree a) a (Tree a)\nNode (Node Leaf 1 Leaf) 2 Leaf" "Tree Int")
  , check "type: data polymorphic"  (inferredAs "data Maybe a = Nothing | Just a\nlet id = fn x => x in id (Just true)" "Maybe Bool")
  , check "type: data nullary value"(inferredAs "data Color = Red | Green\nRed" "Color")
  , check "type: ctor in lambda"    (inferredAs "data Maybe a = Nothing | Just a\nlet f = fn x => Just x in f 1" "Maybe Int")
  , check "type: reject unbound ctor"  (inferFails "Just 5")
  , check "type: reject ctor extra arg" (inferFails "data Maybe a = Nothing | Just a\nJust 1 2")
  , check "type: reject dup type"   (inferFails "data T = A\ndata T = B\nA")
  , check "type: reject dup ctor"   (inferFails "data T = A\ndata U = A\nA")
  , check "type: match int"         (inferredAs "match 5 with | 0 => 0 | n => n" "Int")
  , check "type: match wildcard"    (inferredAs "match 5 with | _ => 5" "Int")
  , check "type: match string"      (inferredAs "match \"a\" with | \"a\" => 1 | _ => 0" "Int")
  , check "type: match data"        (inferredAs "data Maybe a = Nothing | Just a\nmatch Just 5 with | Nothing => 0 | Just x => x" "Int")
  , check "type: match list"        (inferredAs "match [1, 2] with | [] => 0 | h :: t => h" "Int")
  , check "type: match list literal" (inferredAs "match [1, 2] with | [a, b] => a | _ => 0" "Int")
  , check "type: match cons"        (inferredAs "match [1, 2, 3] with | x :: y :: rest => y | _ => 0" "Int")
  , check "type: reject match arity" (inferFails "data Maybe a = Nothing | Just a\nmatch Just 5 with | Just a b => a")
  , check "type: reject match unbound ctor" (inferFails "match 5 with | Nope => 1")
  , check "type: reject branch mismatch" (inferFails "match 5 with | _ => 1 | _ => true")
  , check "type: top-level let"      (inferredAs "let x = 5\nx + 1" "Int")
  , check "type: top-level rec"      (inferredAs "let rec f = fn n => if n < 2 then n else f (n - 1)\nf 10" "Int")
  , check "type: top-level poly"     (inferredAs "let id = fn x => x\nid 1" "Int")
  , check "type: top-level poly str" (inferredAs "let id = fn x => x\nid \"s\"" "String")
  , check "type: defs generalize after earlier def" (inferredAs "data Pair a b = Pair a b\nlet fst = fn p => match p with | Pair a b => a\nlet snd = fn p => match p with | Pair a b => b\nfst (Pair 1 \"s\")" "Int")
  , check "type: reject duplicate def" (inferFails "let x = 5\nlet x = 6\nx")
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
  , check "eval: length"             (evalsTo "length [1, 2, 3]" "3")
  , check "eval: length empty"       (evalsTo "length []" "0")
  , check "eval: reverse"            (evalsTo "reverse [1, 2, 3]" "[3, 2, 1]")
  , check "eval: append"             (evalsTo "append [1, 2] [3]" "[1, 2, 3]")
  , check "eval: append partial"     (evalsTo "let a = append [1] in a [2]" "[1, 2]")
  , check "eval: take"               (evalsTo "take 2 [1, 2, 3]" "[1, 2]")
  , check "eval: take zero"          (evalsTo "take 0 [1, 2]" "[]")
  , check "eval: take negative"      (evalsTo "take (-1) [1, 2]" "[]")
  , check "eval: take beyond"        (evalsTo "take 9 [1]" "[1]")
  , check "eval: drop"               (evalsTo "drop 1 [1, 2, 3]" "[2, 3]")
  , check "eval: drop beyond"        (evalsTo "drop 9 [1]" "[]")
  , check "eval: length non-list"    (evalFails "length 5")
  , check "eval: data value"        (evalsTo "data Maybe a = Nothing | Just a\nJust 42" "Just 42")
  , check "eval: data nullary"      (evalsTo "data Color = Red | Green\nRed" "Red")
  , check "eval: ctor partial"      (evalsTo "data Pair a b = Pair a b\nlet p = Pair 1 in p 2" "Pair 1 2")
  , check "eval: ctor as value"     (evalsTo "data Maybe a = Nothing | Just a\nlet f = Just in f 7" "Just 7")
  , check "eval: data equality"     (evalsTo "data Maybe a = Nothing | Just a\nJust 5 == Just 5" "true")
  , check "eval: data inequality"   (evalsTo "data Maybe a = Nothing | Just a\nJust 5 /= Nothing" "true")
  , check "eval: nested data"       (evalsTo "data Tree a = Leaf | Node (Tree a) a (Tree a)\nNode (Node Leaf 1 Leaf) 2 Leaf" "Node Node Leaf 1 Leaf 2 Leaf")
  , check "eval: unbound ctor"      (evalFails "Nothing")
  , check "eval: match int"         (evalsTo "match 5 with | 0 => 0 | n => n" "5")
  , check "eval: match wildcard"    (evalsTo "match 5 with | 1 => 0 | _ => 42" "42")
  , check "eval: match first branch" (evalsTo "match 5 with | 5 => 1 | _ => 2" "1")
  , check "eval: match string"      (evalsTo "match \"hi\" with | \"hi\" => 1 | _ => 0" "1")
  , check "eval: match cons"        (evalsTo "match [1, 2, 3] with | [] => 0 | x :: xs => x" "1")
  , check "eval: match cons nested" (evalsTo "match [1, 2, 3] with | x :: y :: rest => y | _ => 0" "2")
  , check "eval: match list literal" (evalsTo "match [1, 2] with | [a, b] => a + b | _ => 0" "3")
  , check "eval: match data"        (evalsTo "data Maybe a = Nothing | Just a\nmatch Just 42 with | Nothing => 0 | Just x => x" "42")
  , check "eval: match data fallback" (evalsTo "data Maybe a = Nothing | Just a\nmatch Nothing with | Just x => x | Nothing => 0" "0")
  , check "eval: match no fallthrough" (evalFails "match 5 with | 1 => 0")
  , check "eval: match bound in body" (evalsTo "match [1, 2] with | [a, b] => b | _ => 0" "2")
  , check "eval: top-level def"     (evalsTo "let x = 5\nlet y = x + 1\nin y * 2" "12")
  , check "eval: top-level rec"     (evalsTo "let rec fib = fn n => if n < 2 then n else fib (n - 1) + fib (n - 2)\nfib 20" "6765")
  , check "eval: top-level poly"    (evalsTo "let id = fn x => x\nlet a = id 1\nlet b = id \"s\"\nin b" "s")
  , check "eval: top-level forward ref" (evalsTo "let x = 5\nlet y = x + 1\nin y" "6")
  , check "eval: defs generalized after earlier def" (evalsTo "data Pair a b = Pair a b\nlet fst = fn p => match p with | Pair a b => a\nlet rec foldl = fn f acc xs => match xs with | [] => acc | x :: rest => foldl f (f acc x) rest\nlet rev = fn xs => foldl (fn acc x => cons x acc) [] xs\nrev [1, 2, 3]" "[3, 2, 1]")
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
  , checkIO "vm: length"              (vmEvalsTo "length [1, 2, 3]" "3")
  , checkIO "vm: reverse"             (vmEvalsTo "reverse [1, 2, 3]" "[3, 2, 1]")
  , checkIO "vm: append"              (vmEvalsTo "append [1, 2] [3]" "[1, 2, 3]")
  , checkIO "vm: append partial"      (vmEvalsTo "let a = append [1] in a [2]" "[1, 2]")
  , checkIO "vm: take"                (vmEvalsTo "take 2 [1, 2, 3]" "[1, 2]")
  , checkIO "vm: take zero"           (vmEvalsTo "take 0 [1, 2]" "[]")
  , checkIO "vm: drop"                (vmEvalsTo "drop 1 [1, 2, 3]" "[2, 3]")
  , checkIO "vm: length non-list"     (vmFails "length 5")
  , checkIO "vm: data value"         (vmEvalsTo "data Maybe a = Nothing | Just a\nJust 42" "Just 42")
  , checkIO "vm: data nullary"       (vmEvalsTo "data Color = Red | Green\nRed" "Red")
  , checkIO "vm: ctor partial"       (vmEvalsTo "data Pair a b = Pair a b\nlet p = Pair 1 in p 2" "Pair 1 2")
  , checkIO "vm: ctor as value"      (vmEvalsTo "data Maybe a = Nothing | Just a\nlet f = Just in f 7" "Just 7")
  , checkIO "vm: data equality"      (vmEvalsTo "data Maybe a = Nothing | Just a\nJust 5 == Just 5" "true")
  , checkIO "vm: data inequality"    (vmEvalsTo "data Maybe a = Nothing | Just a\nJust 5 /= Nothing" "true")
  , checkIO "vm: nested data"        (vmEvalsTo "data Tree a = Leaf | Node (Tree a) a (Tree a)\nNode (Node Leaf 1 Leaf) 2 Leaf" "Node Node Leaf 1 Leaf 2 Leaf")
  , checkIO "vm: match int"          (vmEvalsTo "match 5 with | 0 => 0 | n => n" "5")
  , checkIO "vm: match wildcard"     (vmEvalsTo "match 5 with | 1 => 0 | _ => 42" "42")
  , checkIO "vm: match first branch" (vmEvalsTo "match 5 with | 5 => 1 | _ => 2" "1")
  , checkIO "vm: match string"       (vmEvalsTo "match \"hi\" with | \"hi\" => 1 | _ => 0" "1")
  , checkIO "vm: match cons"         (vmEvalsTo "match [1, 2, 3] with | [] => 0 | x :: xs => x" "1")
  , checkIO "vm: match cons nested"  (vmEvalsTo "match [1, 2, 3] with | x :: y :: rest => y | _ => 0" "2")
  , checkIO "vm: match list literal" (vmEvalsTo "match [1, 2] with | [a, b] => a + b | _ => 0" "3")
  , checkIO "vm: match data"         (vmEvalsTo "data Maybe a = Nothing | Just a\nmatch Just 42 with | Nothing => 0 | Just x => x" "42")
  , checkIO "vm: match data fallback" (vmEvalsTo "data Maybe a = Nothing | Just a\nmatch Nothing with | Just x => x | Nothing => 0" "0")
  , checkIO "vm: match no fallthrough" (vmFails "match 5 with | 1 => 0")
  , checkIO "vm: match bound in body" (vmEvalsTo "match [1, 2] with | [a, b] => b | _ => 0" "2")
  , checkIO "vm: match rec sum"      (vmEvalsTo "let rec sum = fn xs => match xs with | [] => 0 | x :: rest => x + sum rest in sum [1, 2, 3, 4]" "10")
  , checkIO "vm: tail call sum"      (vmEvalsTo "let rec sumTo = fn acc n => if n < 1 then acc else sumTo (acc + n) (n - 1) in sumTo 0 1000" "500500")
  , checkIO "vm: tail call million (constant stack)" (vmEvalsTo "let rec sumTo = fn acc n => if n < 1 then acc else sumTo (acc + n) (n - 1) in sumTo 0 1000000" "500000500000")
  , checkIO "vm: tail call through nested if" (vmEvalsTo "let rec loop = fn n => if n < 0 then 42 else if n == 0 then 0 else loop (n - 1) in loop 1000000" "0")
  , checkIO "vm: tail call through match" (vmEvalsTo "let rec sum = fn acc xs => match xs with | [] => acc | x :: rest => sum (acc + x) rest in sum 0 [1, 2, 3, 4, 5]" "15")
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
  , checkIO "diff: length"       (differential "length [1, 2, 3, 4]" "4")
  , checkIO "diff: reverse"      (differential "reverse [1, 2, 3]" "[3, 2, 1]")
  , checkIO "diff: append"       (differential "append [1, 2] [3, 4]" "[1, 2, 3, 4]")
  , checkIO "diff: take drop"    (differential "take 2 (drop 1 [1, 2, 3, 4])" "[2, 3]")
  , checkIO "diff: stdlib mix"   (differential "let xs = append [1, 2] (reverse [3, 4]) in length (take 3 xs)" "3")
  , checkIO "diff: data value"  (differential "data Maybe a = Nothing | Just a\nJust 42" "Just 42")
  , checkIO "diff: data nested" (differential "data Tree a = Leaf | Node (Tree a) a (Tree a)\nNode (Node Leaf 1 Leaf) 2 Leaf" "Node Node Leaf 1 Leaf 2 Leaf")
  , checkIO "diff: data partial" (differential "data Pair a b = Pair a b\nlet p = Pair 1 in p 2" "Pair 1 2")
  , checkIO "diff: data equality" (differential "data Maybe a = Nothing | Just a\nJust 5 == Just 5" "true")
  , checkIO "diff: data nullary" (differential "data Color = Red | Green\nRed" "Red")
  , checkIO "diff: match int"    (differential "match 10 with | 0 => 0 | n => n * 2" "20")
  , checkIO "diff: match cons"   (differential "match [1, 2, 3] with | [] => 0 | x :: xs => x + length xs" "3")
  , checkIO "diff: match data"   (differential "data Maybe a = Nothing | Just a\nlet f = fn m => match m with | Nothing => 0 | Just x => x in f (Just 7)" "7")
  , checkIO "diff: match map-like" (differential "let rec mapM = fn xs => match xs with | [] => [] | x :: rest => cons (x * 2) (mapM rest) in mapM [1, 2, 3]" "[2, 4, 6]")
  , checkIO "diff: tail call"      (differential "let rec sumTo = fn acc n => if n < 1 then acc else sumTo (acc + n) (n - 1) in sumTo 0 10000" "50005000")
  , checkIO "diff: tail call match" (differential "let rec sum = fn acc xs => match xs with | [] => acc | x :: rest => sum (acc + x) rest in sum 0 [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]" "55")
  ]

-- | A disassembly check: the tail position of a recursive function must
-- compile to a @tail_call@ instruction (not @call@), and the accumulator
-- loop's tail-recursive self-call must reuse the frame.
tcoTests :: IO Harness
tcoTests = sequence
  [ checkIO "tco: disassembly uses tail_call" $ do
      case compileProgram "let rec loop = fn n => if n < 1 then n else loop (n - 1) in loop 5" of
        Left (CompileError _ m) -> return (Left ("compile error: " <> m))
        Right prog -> do
          let d = disassemble (pEntry prog)
          if "tail_call" `elem` words d
            then return (Right ())
            else return (Left ("no tail_call in disassembly:\n" <> d))
  , checkIO "tco: non-tail recursion stays call" $ do
      case compileProgram "let rec fib = fn n => if n < 2 then n else fib (n - 1) + fib (n - 2) in fib 10" of
        Left (CompileError _ m) -> return (Left ("compile error: " <> m))
        Right prog -> do
          let d = disassemble (pEntry prog)
              ws = words d
          if "call" `elem` ws && "tail_call" `elem` ws
            then return (Right ())
            else return (Left ("expected both call and tail_call in disassembly:\n" <> d))
  ]

-- | The deterministic optimizer must preserve semantics and produce clean
-- disassembly: folded arithmetic, no dead stores, no redundant jumps, and
-- never a folded division by zero.
optTests :: IO Harness
optTests = sequence
  [ checkIO "opt: folded arithmetic output" (optVmEvalsTo "1 + 2 * 3" "7")
  , checkIO "opt: folded float promotion"   (optVmEvalsTo "1 + 2.5 * 2" "6.0")
  , checkIO "opt: folded comparisons"       (optVmEvalsTo "1 < 2 && 3 >= 3" "true")
  , checkIO "opt: folded neg"               (optVmEvalsTo "-5 + 2" "-3")
  , checkIO "opt: folded not"               (optVmEvalsTo "!true" "false")
  , checkIO "opt: folded equality"          (optVmEvalsTo "1 == 1 && \"a\" /= \"b\"" "true")
  , checkIO "opt: div by zero not folded"   (optVmFails "1 / 0")
  , checkIO "opt: dead let value"           (optVmEvalsTo "let x = 5 in 42" "42")
  , checkIO "opt: used let value kept"      (optVmEvalsTo "let x = 5 in x + 1" "6")
  , checkIO "opt: live closure capture kept" (optVmEvalsTo "let x = 5 in let f = fn y => x + y in f 1" "6")
  , checkIO "opt: rec capture kept"         (optVmEvalsTo "let rec f = fn n => if n < 1 then 0 else f (n - 1) in f 1000" "0")
  , checkIO "opt: if survives"              (optVmEvalsTo "if 2 > 1 then \"yes\" else \"no\"" "yes")
  , checkIO "opt: match survives"           (optVmEvalsTo "match [1, 2, 3] with | [] => 0 | x :: rest => x + length rest" "3")
  , checkIO "opt: data survives"            (optVmEvalsTo "data Maybe a = Nothing | Just a\nmatch Just 42 with | Nothing => 0 | Just x => x" "42")
  , checkIO "opt: tail call survives"       (optVmEvalsTo "let rec sumTo = fn acc n => if n < 1 then acc else sumTo (acc + n) (n - 1) in sumTo 0 1000" "500500")
  , checkIO "opt: no arithmetic instructions remain" $ do
      case compileProgram "1 + 2 * 3" of
        Left (CompileError _ m) -> return (Left ("compile error: " <> m))
        Right prog -> do
          let d = disassemble (pEntry (optimizeProgram prog))
          if any (`elem` words d) ["add", "mul"]
            then return (Left ("arithmetic not folded:\n" <> d))
            else return (Right ())
  , checkIO "opt: dead store eliminated" $ do
      case compileProgram "let x = 5 in 42" of
        Left (CompileError _ m) -> return (Left ("compile error: " <> m))
        Right prog -> do
          let d = disassemble (pEntry (optimizeProgram prog))
          if "store_local" `elem` words d
            then return (Left ("dead store not eliminated:\n" <> d))
            else return (Right ())
  , checkIO "opt: deterministic disassembly" $ do
      case compileProgram "let rec sum = fn xs => match xs with | [] => 0 | x :: rest => x + sum rest in sum [1, 2, 3]" of
        Left (CompileError _ m) -> return (Left ("compile error: " <> m))
        Right prog -> do
          let d1 = disassemble (pEntry (optimizeProgram prog))
              d2 = disassemble (pEntry (optimizeProgram prog))
          if d1 == d2
            then return (Right ())
            else return (Left "optimized disassembly is not deterministic")
  , checkIO "opt: differential arithmetic"   (optDifferential "1 + 2 * 3 - 4 / 2" "5")
  , checkIO "opt: differential fib"          (optDifferential "let rec fib = fn n => if n < 2 then n else fib (n - 1) + fib (n - 2) in fib 15" "610")
  , checkIO "opt: differential closures"     (optDifferential "let x = 3 in let y = 4 in let f = fn z => x * z + y in f 5" "19")
  , checkIO "opt: differential match"        (optDifferential "data Maybe a = Nothing | Just a\nlet f = fn m => match m with | Nothing => 0 | Just x => x in f (Just 7)" "7")
  , checkIO "opt: differential tail call"    (optDifferential "let rec sumTo = fn acc n => if n < 1 then acc else sumTo (acc + n) (n - 1) in sumTo 0 10000" "50005000")
  , checkIO "opt: differential stdlib"       (optDifferential "take 2 (append [1] (drop 1 [2, 3, 4]))" "[1, 3]")
  ]

-- | The whole corpus, re-run through the optimizer: every program must still
-- produce its expected output on interpreter, VM, and optimized VM.
optCorpusTests :: IO Harness
optCorpusTests = sequence
  [ checkIO ("opt-corpus: " <> cName e) (optDifferential (cSource e) (cExpected e))
  | e <- corpus
  ]

corpusTests :: IO Harness
corpusTests = sequence
  [ checkIO ("corpus: " <> cName e) (corpusCheck e)
  | e <- corpus
  ]

-- ---------------------------------------------------------------------
-- Module resolution (v3 imports), driven by an in-memory provider.
-- ---------------------------------------------------------------------

resolvedAs :: Map.Map FilePath String -> String -> String -> IO (Either String ())
resolvedAs mods src expected = do
  r <- resolveProgram (memProvider mods) "" src
  return $ case r of
    Left (ModuleError _ m) -> Left ("module error: " <> m)
    Right prog -> case evalProgramIn prog of
      Left (EvalError _ m)  -> Left ("eval error: " <> m)
      Right (Just v) ->
        let shown = showValue v
        in if shown == expected
             then Right ()
             else Left ("expected " <> expected <> ", got " <> shown)
      Right Nothing -> Left ("expected " <> expected <> ", but the module has no result")

resolvedFails :: Map.Map FilePath String -> String -> IO (Either String ())
resolvedFails mods src = do
  r <- resolveProgram (memProvider mods) "" src
  return $ case r of
    Left _       -> Right ()
    Right prog   -> case evalProgramIn prog of
      Left _         -> Right ()
      Right (Just v) -> Left ("expected a module/eval error, but got " <> showValue v)
      Right Nothing  -> Left "expected a module error, but the module typechecked and ran"

moduleTests :: IO Harness
moduleTests = sequence
  [ checkIO "module: simple import"
      (resolvedAs (Map.fromList [("m.hly", "let y = 41\nlet z = y + 1\nz")]) "import \"m.hly\"\nz" "42")
  , checkIO "module: import defs reused"
      (resolvedAs (Map.fromList [("m.hly", "let add = fn a b => a + b")]) "import \"m.hly\"\nadd 1 2 + add 3 4" "10")
  , checkIO "module: transitive import"
      (resolvedAs (Map.fromList [("a.hly", "let x = 5"), ("b.hly", "import \"a.hly\"\nlet y = x + 1\ny")]) "import \"b.hly\"\ny" "6")
  , checkIO "module: import order before defs"
      (resolvedAs (Map.fromList [("m.hly", "let two = 2")]) "import \"m.hly\"\nlet x = two * 21\nx" "42")
  , checkIO "module: duplicate import deduped"
      (resolvedAs (Map.fromList [("a.hly", "let x = 5"), ("b.hly", "import \"a.hly\"\nlet y = x\ny"), ("c.hly", "import \"a.hly\"\nimport \"b.hly\"\nlet z = y\nz")]) "import \"a.hly\"\nimport \"b.hly\"\nimport \"c.hly\"\nz" "5")
  , checkIO "module: defs-only import contributes no expr"
      (resolvedAs (Map.fromList [("m.hly", "let x = 5")]) "import \"m.hly\"\nlet y = x + 1\nin y" "6")
  , checkIO "module: missing module"
      (resolvedFails (Map.fromList []) "import \"nope.hly\"\n1")
  , checkIO "module: circular import"
      (resolvedFails (Map.fromList [("a.hly", "import \"b.hly\"\nlet x = 1"), ("b.hly", "import \"a.hly\"\nlet y = 2")]) "import \"a.hly\"\nx")
  , checkIO "module: duplicate def across imports"
      (resolvedFails (Map.fromList [("a.hly", "let x = 1"), ("b.hly", "let x = 2")]) "import \"a.hly\"\nimport \"b.hly\"\n1")
  , checkIO "module: imported module's expr ignored"
      (resolvedAs (Map.fromList [("m.hly", "let x = 5\nx + 1")]) "import \"m.hly\"\nx" "5")
  ]

-- ---------------------------------------------------------------------
-- Main
-- ---------------------------------------------------------------------

runSelftest :: IO Bool
runSelftest = do
  vm <- vmTests
  diff <- diffTests
  tco <- tcoTests
  opt <- optTests
  corp <- corpusTests
  optCorp <- optCorpusTests
  mods <- moduleTests
  let groups =
        [ ("lexer", lexerTests)
        , ("parser", parserTests)
        , ("types", typeTests)
        , ("eval", evalTests)
        , ("vm", vm)
        , ("differential", diff)
        , ("tco", tco)
        , ("opt", opt)
        , ("corpus", corp)
        , ("opt-corpus", optCorp)
        , ("modules", mods)
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

