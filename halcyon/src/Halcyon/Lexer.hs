{-# LANGUAGE LambdaCase #-}
module Halcyon.Lexer
  ( lexSource
  , LexError(..)
  ) where

import Halcyon.Token

-- | A lexical error, positioned at the offending character.
data LexError = LexError Pos String
  deriving (Eq, Show)

-- | Lex the entire source. Fails fast with the first lexical error.
--
-- The scanner threads (line, column, rest) through pure recursion. Line
-- comments (@--@) run to end of line; block comments (@{-@ ... @-}@) nest.
lexSource :: String -> Either LexError [Token]
lexSource src = go 1 1 src
  where
    go :: Int -> Int -> String -> Either LexError [Token]
    go l c s = case s of
      []                  -> Right [Token (Pos l c) TEOF]
      (x : xs)
        | isSpace x       -> go (newline l x) (newlineCol c x) xs
        | x == '-' && isPrefixOf' "--" s -> skipLine l c (drop 2 s)
        | x == '{' && isPrefixOf' "{-" s -> skipBlock l c (drop 2 s)
      _                   -> token l c s

    -- Line comment: skip to (and including) the newline, if any.
    skipLine :: Int -> Int -> String -> Either LexError [Token]
    skipLine l c s =
      let (before, after) = break (== '\n') s
      in case after of
           []        -> go (l + countNewlines s) (c + length before) []
           ('\n' : r) -> go (l + 1) 1 r
           _         -> go (l + countNewlines s) (c + length before) []

    -- Nested block comment. Returns Left on an unterminated comment.
    skipBlock :: Int -> Int -> String -> Either LexError [Token]
    skipBlock l c s = descend 1 l c s
      where
        descend :: Int -> Int -> Int -> String -> Either LexError [Token]
        descend depth cl cc cs
          | isPrefixOf' "{-" cs =
              descend (depth + 1) (stepLine cl cc (take 2 cs)) (stepCol cl cc (take 2 cs)) (drop 2 cs)
          | isPrefixOf' "-}" cs =
              if depth == 1
                then go (stepLine cl cc (take 2 cs)) (stepCol cl cc (take 2 cs)) (drop 2 cs)
                else descend (depth - 1) (stepLine cl cc (take 2 cs)) (stepCol cl cc (take 2 cs)) (drop 2 cs)
          | otherwise =
              case cs of
                [] -> Left (LexError (Pos cl cc) "unterminated block comment")
                (ch : rest) -> descend depth (newline cl ch) (newlineCol cc ch) rest

    token :: Int -> Int -> String -> Either LexError [Token]
    token l c s = case s of
      [] -> Right [Token (Pos l c) TEOF]
      (x : _)
        | isIdentStart x -> identTok l c s
        | isDigit x      -> numberTok l c s
        | x == '"'       -> stringTok l c s
      (x : _) | x == '+' -> simpleTok l c TPlus 1 s
      (x : _) | x == '-' -> simpleTok l c TMinus 1 s
      (x : _) | x == '*' -> simpleTok l c TStar 1 s
      (x : _) | x == '/' && not (isPrefixOf' "/=" s) -> simpleTok l c TSlash 1 s
      (x : _) | x == '/' && isPrefixOf' "/=" s       -> simpleTok l c TNe 2 s
      (x : _) | x == '<' && not (isPrefixOf' "<=" s) -> simpleTok l c TLt 1 s
      (x : _) | x == '<' && isPrefixOf' "<=" s       -> simpleTok l c TLe 2 s
      (x : _) | x == '>' && not (isPrefixOf' ">=" s) -> simpleTok l c TGt 1 s
      (x : _) | x == '>' && isPrefixOf' ">=" s       -> simpleTok l c TGe 2 s
      (x : _) | x == '=' && isPrefixOf' "==" s       -> simpleTok l c TEq 2 s
      (x : _) | x == '=' && isPrefixOf' "=>" s       -> simpleTok l c TArrow 2 s
      (x : _) | x == '='                             -> simpleTok l c TAssign 1 s
      (x : _) | x == ':' && isPrefixOf' "::" s       -> simpleTok l c TCons 2 s
      (x : _) | x == '&' && isPrefixOf' "&&" s       -> simpleTok l c TAnd 2 s
      (x : _) | x == '|' && isPrefixOf' "||" s       -> simpleTok l c TOr 2 s
      (x : _) | x == '|'                             -> simpleTok l c TPipe 1 s
      (x : _) | x == '!'                             -> simpleTok l c TNot 1 s
      (x : _) | x == '(' -> simpleTok l c TLParen 1 s
      (x : _) | x == ')' -> simpleTok l c TRParen 1 s
      (x : _) | x == '[' -> simpleTok l c TLBracket 1 s
      (x : _) | x == ']' -> simpleTok l c TRBracket 1 s
      (x : _) | x == ',' -> simpleTok l c TComma 1 s
      (x : _)            -> Left (LexError (Pos l c) ("unexpected character: " <> show x))

    -- Emit a single token after consuming n characters, continuing the scan.
    simpleTok :: Int -> Int -> Tok -> Int -> String -> Either LexError [Token]
    simpleTok l c tok n s =
      let chunk = take n s
      in consResult (Token (Pos l c) tok) (go (stepLine l c chunk) (stepCol l c chunk) (drop n s))

    -- Identifier or keyword.
    identTok :: Int -> Int -> String -> Either LexError [Token]
    identTok l c s =
      let (name, rest) = span isIdentChar s
      in consResult (Token (Pos l c) (keywordOrIdent name)) (go l (c + length name) rest)

    -- Number literal: digits, an optional single decimal point, and an
    -- optional exponent (e/E [+/-] digits). The scanner is precise so that
    -- e.g. `1-2` lexes as two tokens, not one bad number.
    numberTok :: Int -> Int -> String -> Either LexError [Token]
    numberTok l c s =
      let (whole, rest1) = span isDigit s
          (fracPart, rest2) =
            case rest1 of
              ('.' : xs) -> let (ds, r) = span isDigit xs in ('.' : ds, r)
              _          -> ("", rest1)
          (expPart, rest3) =
            case rest2 of
              (e : xs) | e == 'e' || e == 'E' ->
                let (sign, rest4) = case xs of
                                      (sgn : ys) | sgn == '+' || sgn == '-' -> ([sgn], ys)
                                      _                                     -> ([], xs)
                    (ds, r) = span isDigit rest4
                in (e : sign <> ds, r)
              _ -> ("", rest2)
          num = whole <> fracPart <> expPart
      in case readNumber num of
           Left msg  -> Left (LexError (Pos l c) msg)
           Right tok -> consResult (Token (Pos l c) tok) (go (stepLine l c num) (stepCol l c num) rest3)

    -- String literal (s starts at the opening quote). The accumulator is
    -- threaded explicitly so escapes are handled uniformly.
    stringTok :: Int -> Int -> String -> Either LexError [Token]
    stringTok l c s = collect l (c + 1) c [] (drop 1 s)
      where
        collect :: Int -> Int -> Int -> String -> String -> Either LexError [Token]
        collect _ _ startCol _acc [] =
          Left (LexError (Pos l startCol) "unterminated string literal")
        collect cl cc startCol acc (x : xs)
          | x == '"' =
              consResult (Token (Pos l startCol) (TStr (reverse acc))) (go cl (cc + 1) xs)
          | x == '\\' =
              case xs of
                ('n' : rest)  -> collect cl (cc + 2) startCol ('\n' : acc) rest
                ('t' : rest)  -> collect cl (cc + 2) startCol ('\t' : acc) rest
                ('r' : rest)  -> collect cl (cc + 2) startCol ('\r' : acc) rest
                ('\\' : rest) -> collect cl (cc + 2) startCol ('\\' : acc) rest
                ('"' : rest)  -> collect cl (cc + 2) startCol ('"' : acc) rest
                ('\'' : rest) -> collect cl (cc + 2) startCol ('\'' : acc) rest
                (e : _)       -> Left (LexError (Pos cl cc) ("bad escape sequence: \\" <> [e]))
                []            -> Left (LexError (Pos cl cc) "unterminated string literal")
          | otherwise =
              collect (newline cl x) (newlineCol cc x) startCol (x : acc) xs

    -- Recompute line/column after consuming a chunk.
    stepLine :: Int -> Int -> String -> Int
    stepLine l _ chunk = l + countNewlines chunk

    stepCol :: Int -> Int -> String -> Int
    stepCol _ c chunk =
      case break (== '\n') chunk of
        (pre, [])          -> c + length pre
        (_, ('\n' : post)) -> length post + 1
        (_, _)             -> c + length chunk

    newline :: Int -> Char -> Int
    newline l ch = if ch == '\n' then l + 1 else l

    newlineCol :: Int -> Char -> Int
    newlineCol c ch = if ch == '\n' then 1 else c + 1

    countNewlines :: String -> Int
    countNewlines = length . filter (== '\n')

-- | Prepend a token onto a lex result.
consResult :: Token -> Either LexError [Token] -> Either LexError [Token]
consResult tok rest = fmap (tok :) rest

isSpace :: Char -> Bool
isSpace ch = ch == ' ' || ch == '\t' || ch == '\n' || ch == '\r'

isPrefixOf' :: String -> String -> Bool
isPrefixOf' pfx s = take (length pfx) s == pfx

isIdentStart :: Char -> Bool
isIdentStart ch = (ch >= 'a' && ch <= 'z') || (ch >= 'A' && ch <= 'Z') || ch == '_'

isIdentChar :: Char -> Bool
isIdentChar ch = isIdentStart ch || isDigit ch || ch == '\''

isDigit :: Char -> Bool
isDigit ch = ch >= '0' && ch <= '9'

keywordOrIdent :: String -> Tok
keywordOrIdent = \case
  "let"   -> TLet
  "rec"   -> TRec
  "in"    -> TIn
  "fn"    -> TFn
  "if"    -> TIf
  "then"  -> TThen
  "else"  -> TElse
  "data"  -> TData
  "import" -> TImport
  "match" -> TMatch
  "with"  -> TWith
  "true"  -> TTrue
  "false" -> TFalse
  name    -> TIdent name

-- | Read a numeric literal, deciding integer vs float. Supports a decimal
-- point and an optional exponent (e/E [+/-] digits).
readNumber :: String -> Either String Tok
readNumber str =
  let isFloat = any (\ch -> ch == '.' || ch == 'e' || ch == 'E') str
  in if isFloat
       then case reads (map (\ch -> if ch == 'E' then 'e' else ch) str) :: [(Double, String)] of
         [(d, "")] -> Right (TFloat d)
         _         -> Left ("invalid number literal: " <> show str)
       else case reads str :: [(Integer, String)] of
         [(i, "")] -> Right (TInt i)
         _         -> Left ("invalid number literal: " <> show str)