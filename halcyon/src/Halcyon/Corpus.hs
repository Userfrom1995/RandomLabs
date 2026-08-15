module Halcyon.Corpus
  ( CorpusEntry(..)
  , corpus
  ) where

-- | The canonical differential corpus. Every program here must produce
-- byte-identical output on the tree-walking interpreter and on the bytecode
-- VM, and that output must equal 'cExpected'. The JavaScript mirror that
-- powers the web playground is cross-checked against this same corpus, so
-- the browser behavior is the verified behavior.
--
-- The @examples/*.hly@ files mirror a subset of these entries; the @halcyon
-- corpus@ command checks both the embedded corpus and (when given a
-- directory) that every example file on disk agrees with both evaluators.
data CorpusEntry = CorpusEntry
  { cName     :: String
  , cSource   :: String
  , cExpected :: String
  }

corpus :: [CorpusEntry]
corpus =
  [ CorpusEntry "fib"
      (unlines
        [ "-- Fibonacci, the canonical recursive program."
        , "let rec fib = fn n => if n < 2 then n else fib (n - 1) + fib (n - 2)"
        , "in fib 25"
        ])
      "75025"
  , CorpusEntry "fact"
      (unlines
        [ "-- Factorial via a single let rec."
        , "let rec fact = fn n => if n < 1 then 1 else n * fact (n - 1)"
        , "in fact 10"
        ])
      "3628800"
  , CorpusEntry "map"
      (unlines
        [ "-- A hand-rolled map over a list literal."
        , "let rec map = fn f xs => if isNil xs then [] else cons (f (head xs)) (map f (tail xs))"
        , "in map (fn x => x * 2) [1, 2, 3, 4, 5]"
        ])
      "[2, 4, 6, 8, 10]"
  , CorpusEntry "filter"
      (unlines
        [ "-- A hand-rolled filter: keep elements greater than 2."
        , "let rec keep = fn xs => if isNil xs then []"
        , "  else if head xs > 2 then cons (head xs) (keep (tail xs))"
        , "  else keep (tail xs)"
        , "in keep [1, 2, 3, 4, 5]"
        ])
      "[3, 4, 5]"
  , CorpusEntry "closure-counter"
      (unlines
        [ "-- Closures: makeCounter captures its argument in the returned fn."
        , "let makeCounter = fn n => fn step => n + step"
        , "in let inc = makeCounter 10 in inc 5"
        ])
      "15"
  , CorpusEntry "compose"
      (unlines
        [ "-- Function composition built from nested closures."
        , "let compose = fn f g => fn x => f (g x)"
        , "in compose (fn x => x + 1) (fn x => x * 2) 21"
        ])
      "43"
  , CorpusEntry "partial-application"
      (unlines
        [ "-- Curried lambdas apply one argument at a time."
        , "let add = fn a b => a + b"
        , "in let inc = add 1 in inc 41"
        ])
      "42"
  , CorpusEntry "numeric-promotion"
      (unlines
        [ "-- Int + Float promotes to Float; the multiplication promotes too."
        , "1 + 2.5 * 2"
        ])
      "6.0"
  , CorpusEntry "function-promotion"
      (unlines
        [ "-- A function parameter is shared: scale 4 becomes 4 * 1.5 = Float."
        , "let scale = fn x => x * 1.5 in scale 4"
        ])
      "6.0"
  , CorpusEntry "list-surgery"
      (unlines
        [ "-- cons/head/tail over a list literal."
        , "let xs = [1, 2, 3, 4] in cons (head (tail xs)) (tail (tail xs))"
        ])
      "[2, 3, 4]"
  , CorpusEntry "lists-of-lists"
      (unlines
        [ "-- Nested lists, built via partially applied cons."
        , "cons (cons 1 []) (cons (cons 2 []) [])"
        ])
      "[[1], [2]]"
  , CorpusEntry "string-conditional"
      (unlines
        [ "-- String equality in a conditional."
        , "if \"halcyon\" == \"halcyon\" then \"calm\" else \"storm\""
        ])
      "calm"
  , CorpusEntry "tail-recursive-sum"
      (unlines
        [ "-- Tail recursion with an accumulator; 100000 frames deep on both evaluators."
        , "let rec sumTo = fn acc n => if n < 1 then acc else sumTo (acc + n) (n - 1)"
        , "in sumTo 0 100000"
        ])
      "5000050000"
  , CorpusEntry "mixed-arithmetic"
      (unlines
        [ "-- Operator precedence and grouping."
        , "1 + 2 * 3 - 4 / 2 + (10 - 4) * 2"
        ])
      "17"
  , CorpusEntry "deep-recursion"
      (unlines
        [ "-- Deep non-tail recursion; 5000 frames deep exercises the frame stack."
        , "let rec count = fn n => if n < 1 then 0 else 1 + count (n - 1)"
        , "in count 5000"
        ])
      "5000"
  , CorpusEntry "list-length"
      (unlines
        [ "-- The length builtin over a list literal."
        , "let xs = [10, 20, 30] in length xs"
        ])
      "3"
  , CorpusEntry "list-reverse"
      (unlines
        [ "-- reverse flips a list."
        , "reverse [1, 2, 3]"
        ])
      "[3, 2, 1]"
  , CorpusEntry "list-append-take-drop"
      (unlines
        [ "-- append, take, and drop combine into list surgery."
        , "take 2 (append [1] (drop 1 [2, 3, 4]))"
        ])
      "[1, 3]"
  , CorpusEntry "data-maybe"
      (unlines
        [ "-- Algebraic data types: Maybe with two constructors."
        , "data Maybe a = Nothing | Just a"
        , "Just 42"
        ])
      "Just 42"
  , CorpusEntry "data-pair-partial"
      (unlines
        [ "-- Constructors are curried first-class functions."
        , "data Pair a b = Pair a b"
        , "let p = Pair 1 in p 2"
        ])
      "Pair 1 2"
  , CorpusEntry "data-tree"
      (unlines
        [ "-- A recursive data type with nested constructor application."
        , "data Tree a = Leaf | Node (Tree a) a (Tree a)"
        , "Node (Node Leaf 1 Leaf) 2 Leaf"
        ])
      "Node Node Leaf 1 Leaf 2 Leaf"
  , CorpusEntry "data-equality"
      (unlines
        [ "-- Data values compare by constructor and fields."
        , "data Maybe a = Nothing | Just a"
        , "Just 5 == Just 5"
        ])
      "true"
  , CorpusEntry "data-color"
      (unlines
        [ "-- Nullary constructors are complete values."
        , "data Color = Red | Green"
        , "let c = Red in c"
        ])
      "Red"
  , CorpusEntry "match-list"
      (unlines
        [ "-- Pattern matching destructures a list with a cons pattern."
        , "match [1, 2, 3] with | [] => 0 | x :: rest => x + length rest"
        ])
      "3"
  , CorpusEntry "match-data"
      (unlines
        [ "-- Pattern matching on an algebraic data type, binding fields."
        , "data Maybe a = Nothing | Just a"
        , "let f = fn m => match m with | Nothing => 0 | Just x => x in f (Just 7)"
        ])
      "7"
  , CorpusEntry "match-nested"
      (unlines
        [ "-- A nested cons pattern destructures two elements."
        , "match [10, 20, 30] with | a :: b :: rest => b | _ => 0"
        ])
      "20"
  , CorpusEntry "match-map"
      (unlines
        [ "-- Pattern matching drives a recursive map, replacing the guards."
        , "let rec mapM = fn xs => match xs with"
        , "  | [] => []"
        , "  | x :: rest => cons (x * 2) (mapM rest)"
        , "in mapM [1, 2, 3]"
        ])
      "[2, 4, 6]"
  , CorpusEntry "match-tree"
      (unlines
        [ "-- Matching a recursive data type picks a branch by constructor."
        , "data Tree = Leaf Int | Node (Tree) (Tree)"
        , "let rec height = fn t => match t with"
        , "  | Leaf n => 1"
        , "  | Node l r =>"
        , "      let h1 = height l in"
        , "      let h2 = height r in"
        , "      if h1 > h2 then h1 + 1 else h2 + 1"
        , "in height (Node (Node (Leaf 1) (Leaf 2)) (Leaf 3))"
        ])
      "3"
  , CorpusEntry "topdefs"
      (unlines
        [ "-- Multiple top-level definitions with polymorphism."
        , "let id = fn x => x"
        , "let x = id 5"
        , "let rec count = fn n => if n < 1 then 0 else 1 + count (n - 1)"
        , "x * 1000 + count 21"
        ])
      "5021"
  , CorpusEntry "topdefs-order"
      (unlines
        [ "-- Later defs can use earlier ones; final expr sees all defs."
        , "let base = 10"
        , "let double = fn x => x * 2"
        , "let triple = fn x => x * 3"
        , "double base + triple base"
        ])
      "50"
  , CorpusEntry "stdlib"
      (unlines
        [ "-- Self-hosted standard library: higher-order list combinators"
        , "-- written in Halcyon itself with let rec and match."
        , "data Pair a b = Pair a b"
        , "let rec foldl = fn f acc xs => match xs with"
        , "  | [] => acc"
        , "  | x :: rest => foldl f (f acc x) rest"
        , "in let rec foldr = fn f acc xs => match xs with"
        , "  | [] => acc"
        , "  | x :: rest => f x (foldr f acc rest)"
        , "in let rec map = fn f xs => match xs with"
        , "  | [] => []"
        , "  | x :: rest => cons (f x) (map f rest)"
        , "in let rec filter = fn p xs => match xs with"
        , "  | [] => []"
        , "  | x :: rest => if p x then cons x (filter p rest) else filter p rest"
        , "in let rec zip = fn xs ys => match xs with"
        , "  | [] => []"
        , "  | x :: rest => match ys with"
        , "    | [] => []"
        , "    | y :: rest2 => cons (Pair x y) (zip rest rest2)"
        , "in let rec range = fn lo hi => if lo > hi then [] else cons lo (range (lo + 1) hi)"
        , "in let sum = fn xs => foldl (fn acc x => acc + x) 0 xs"
        , "in let product = fn xs => foldl (fn acc x => acc * x) 1 xs"
        , "in let myLength = fn xs => foldl (fn acc _ => acc + 1) 0 xs"
        , "in let myReverse = fn xs => foldl (fn acc x => cons x acc) [] xs"
        , "in let all = fn p xs => foldl (fn acc x => acc && p x) true xs"
        , "in let any = fn p xs => foldl (fn acc x => acc || p x) false xs"
        , "in let elem = fn x xs => any (fn y => y == x) xs"
        , "in sum (filter (fn x => x > 10) (map (fn x => x * x) (range 1 8)))"
        , "   + myLength [1, 2, 3, 4] * 100"
        , "   + (match head (zip [1, 2, 3] [10, 20, 30]) with | Pair a b => a + b)"
        , "   + (if any (fn x => x == 5) [1, 2, 5] then 1000 else 0)"
        ])
      "1601"
  , CorpusEntry "record-point"
      (unlines
        [ "-- Record construction, order-independent projection, and update."
        , "record Point = { x : Int, y : Int }"
        , "let origin = { x = 0, y = 0 } in"
        , "let mk = fn x y => { y = y, x = x } in"
        , "let p = mk 3 4 in"
        , "(p.x * p.x + p.y * p.y) + (match { y = 9, x = 1 } with | { x = a, y = b } => a + b)"
        , "  + ({ origin with x = 5 }.x * 10)"
        ])
      "85"
  , CorpusEntry "record-pair"
      (unlines
        [ "-- Polymorphic records: the same shape reused at different types."
        , "record Pair a b = { fst : a, snd : b }"
        , "let swp = fn p => { snd = p.fst, fst = p.snd } in"
        , "let ints = swp { fst = 1, snd = 2 } in"
        , "let strs = swp { fst = [3, 4], snd = \"hi\" } in"
        , "let bools = { fst = true, snd = false } in"
        , "ints.fst + (head strs.snd) + length strs.snd + (if bools.fst then 100 else 0)"
        ])
      "107"
  , CorpusEntry "record-nested"
      (unlines
        [ "-- Nested records: a record stored as a field of another record."
        , "record Vec = { dx : Int, dy : Int }"
        , "record Ball = { pos : Vec, vel : Vec, id : Int }"
        , "let move = fn b => { pos = { dx = b.pos.dx + b.vel.dx, dy = b.pos.dy + b.vel.dy }, vel = b.vel, id = b.id } in"
        , "let b = { id = 7, pos = { dx = 1, dy = 2 }, vel = { dx = 3, dy = 4 } } in"
        , "let b2 = move b in"
        , "b2.pos.dx * 100 + b2.pos.dy * 10 + b2.id"
        ])
      "467"
  , CorpusEntry "record-shape-list"
      (unlines
        [ "-- Records inside lists: project a field out of a computed record."
        , "record Item = { name : String, qty : Int }"
        , "let rec sumQty = fn xs => match xs with"
        , "  | [] => 0"
        , "  | i :: rest => i.qty + sumQty rest"
        , "in let stock = [ { qty = 3, name = \"apple\" }, { name = \"pear\", qty = 5 }, { qty = 2, name = \"plum\" } ] in"
        , "sumQty stock + (head (reverse stock)).qty * 10"
        ])
      "30"
  , CorpusEntry "record-equality"
      (unlines
        [ "-- Record equality ignores literal field order."
        , "record Point = { x : Int, y : Int }"
        , "let a = { y = 1, x = 2 } in"
        , "let b = { x = 2, y = 1 } in"
        , "let c = { x = 2, y = 3 } in"
        , "if a == b then (if a /= c then 42 else 0) else 0"
        ])
      "42"
  ]