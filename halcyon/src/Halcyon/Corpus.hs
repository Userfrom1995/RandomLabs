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
  ]