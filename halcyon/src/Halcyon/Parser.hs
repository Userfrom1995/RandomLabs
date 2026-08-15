{-# LANGUAGE LambdaCase #-}
module Halcyon.Parser
  ( parseProgram
  , ParseError(..)
  ) where

import Halcyon.Ast (Expr(..), Op(..), Builtin(..), builtinForName)
import Halcyon.Lexer (lexSource, LexError(..))
import Halcyon.Token

-- | A parse error, positioned at the token where parsing failed.
data ParseError = ParseError Pos String
  deriving (Eq, Show)

-- | Parse a full program: an expression followed by end of input.
-- Lexes first, so a source string is lexed and parsed in one call.
parseProgram :: String -> Either ParseError Expr
parseProgram src = do
  toks <- case lexSource src of
    Left (LexError p m) -> Left (ParseError p m)
    Right t             -> Right t
  (expr, rest) <- runParser parseExpr toks
  case rest of
    [Token _ TEOF] -> Right expr
    (Token p t : _) -> Left (ParseError p ("unexpected token after expression: " <> describe t))
    []              -> Left (ParseError (Pos 0 0) "unexpected end of input")

-- | Minimal parser monad: threads the token stream and fails fast.
newtype Parser a = Parser { runParser :: [Token] -> Either ParseError (a, [Token]) }

instance Functor Parser where
  fmap f (Parser g) = Parser $ \ts -> case g ts of
    Left e         -> Left e
    Right (a, ts') -> Right (f a, ts')

instance Applicative Parser where
  pure a = Parser $ \ts -> Right (a, ts)
  Parser f <*> Parser g = Parser $ \ts -> case f ts of
    Left e         -> Left e
    Right (fn, ts1) -> case g ts1 of
      Left e         -> Left e
      Right (a, ts2) -> Right (fn a, ts2)

instance Monad Parser where
  Parser g >>= f = Parser $ \ts -> case g ts of
    Left e         -> Left e
    Right (a, ts1) -> runParser (f a) ts1

instance MonadFail Parser where
  fail msg = Parser $ \ts -> case ts of
    (Token p _ : _) -> Left (ParseError p msg)
    []              -> Left (ParseError (Pos 0 0) msg)

-- | Expression grammar, precedence climbing for the binary layers.
--
--   expr     := let | if | lambda | binary(1)
--   let      := 'let' 'rec'? name '=' expr 'in' expr
--   if       := 'if' expr 'then' expr 'else' expr
--   lambda   := 'fn' name+ '=>' expr
--   binary levels: 1 || , 2 && , 3 == /= , 4 < <= > >= ,
--                  5 + - , 6 * / (all left-associative)
--   unary    := ('-' | '!') unary | application
--   application := atom atom*  (left-associative)
--   atom     := literal | name | '(' expr ')' | '[' list ']'
parseExpr :: Parser Expr
parseExpr = do
  t <- peek
  case t of
    TLet -> parseLet
    TIf  -> parseIf
    TFn  -> parseLambda
    _    -> parseBinary 1

parseLet :: Parser Expr
parseLet = do
  p <- consumeT TLet
  rec <- isRec
  Token _ (TIdent name) <- expectIdent
  consumeT TAssign
  bound <- parseExpr
  consumeT TIn
  body <- parseExpr
  return (ELet p rec name bound body)

parseIf :: Parser Expr
parseIf = do
  p <- consumeT TIf
  cond <- parseExpr
  consumeT TThen
  thenE <- parseExpr
  consumeT TElse
  elseE <- parseExpr
  return (EIf p cond thenE elseE)

parseLambda :: Parser Expr
parseLambda = do
  p <- consumeT TFn
  params <- someIdent
  consumeT TArrow
  body <- parseExpr
  return (ELambda p params body)

-- | Precedence climbing. Binary operators are all left-associative.
parseBinary :: Int -> Parser Expr
parseBinary level
  | level > 6 = parseUnary
  | otherwise = do
      left <- parseBinary (level + 1)
      parseBinRest level left

parseBinRest :: Int -> Expr -> Parser Expr
parseBinRest level left = do
  t <- peek
  case opForTok t of
    Just op | opLevel op == level -> do
      opPos <- consumeTokPos
      right <- parseBinary (level + 1)
      parseBinRest level (EBin opPos op left right)
    _ -> return left

parseUnary :: Parser Expr
parseUnary = do
  p <- peekPos
  t <- peek
  case t of
    TNot   -> consumeTok >> (ENot p <$> parseUnary)
    TMinus -> consumeTok >> (ENeg p <$> parseUnary)
    _      -> parseApplication

parseApplication :: Parser Expr
parseApplication = do
  fn <- parseAtom
  go fn
  where
    go fn = do
      t <- peek
      if atomStart t
        then do
          arg <- parseAtom
          go (EApply (exprPos fn) fn arg)
        else return fn

parseAtom :: Parser Expr
parseAtom = do
  p <- peekPos
  t <- peek
  case t of
    TInt i    -> consumeTok >> return (EInt p i)
    TFloat d  -> consumeTok >> return (EFloat p d)
    TStr s    -> consumeTok >> return (EStr p s)
    TTrue     -> consumeTok >> return (EBool p True)
    TFalse    -> consumeTok >> return (EBool p False)
    TIdent n  -> consumeTok >> return (maybe (EVar p n) (EBuiltin p) (builtinForName n))
    TLParen   -> consumeTok >> parseExpr >>= \e -> consumeT TRParen >> return e
    TLBracket -> parseList
    _         -> failAt p ("expected an expression, found " <> describe t)

parseList :: Parser Expr
parseList = do
  p <- consumeT TLBracket
  items <- parseItems
  consumeT TRBracket
  return (EList p items)
  where
    parseItems = do
      t <- peek
      case t of
        TRBracket -> return []
        _ -> do
          first <- parseExpr
          rest <- commaItems
          return (first : rest)
    commaItems = do
      t <- peek
      case t of
        TComma -> consumeTok >> parseExpr >>= \x -> (x :) <$> commaItems
        _      -> return []

-- | One or more parameter names, stopping at the first non-name token.
someIdent :: Parser [String]
someIdent = do
  t <- peek
  case t of
    TIdent _ -> do
      Token _ (TIdent n) <- expectIdent
      (n :) <$> someIdent
    _ -> return []

-- | True when the token can begin an application argument.
atomStart :: Tok -> Bool
atomStart = \case
  TInt _    -> True
  TFloat _  -> True
  TStr _    -> True
  TTrue     -> True
  TFalse    -> True
  TIdent _  -> True
  TLParen   -> True
  TLBracket -> True
  _         -> False

opForTok :: Tok -> Maybe Op
opForTok = \case
  TOr    -> Just OpOr
  TAnd   -> Just OpAnd
  TEq    -> Just OpEq
  TNe    -> Just OpNe
  TLt    -> Just OpLt
  TLe    -> Just OpLe
  TGt    -> Just OpGt
  TGe    -> Just OpGe
  TPlus  -> Just OpAdd
  TMinus -> Just OpSub
  TStar  -> Just OpMul
  TSlash -> Just OpDiv
  _      -> Nothing

opLevel :: Op -> Int
opLevel = \case
  OpOr  -> 1
  OpAnd -> 2
  OpEq  -> 3
  OpNe  -> 3
  OpLt  -> 4
  OpLe  -> 4
  OpGt  -> 4
  OpGe  -> 4
  OpAdd -> 5
  OpSub -> 5
  OpMul -> 6
  OpDiv -> 6

exprPos :: Expr -> Pos
exprPos = \case
  EInt p _        -> p
  EFloat p _      -> p
  EBool p _       -> p
  EStr p _        -> p
  EList p _       -> p
  EVar p _        -> p
  ELambda p _ _   -> p
  EApply p _ _    -> p
  ELet p _ _ _ _  -> p
  EIf p _ _ _     -> p
  EBin p _ _ _    -> p
  ENeg p _        -> p
  ENot p _        -> p
  EBuiltin p _    -> p

-- ---------------------------------------------------------------------
-- Token stream helpers
-- ---------------------------------------------------------------------

peek :: Parser Tok
peek = Parser $ \ts -> case ts of
  (Token _ t : _) -> Right (t, ts)
  []              -> Left (ParseError (Pos 0 0) "unexpected end of input")

peekPos :: Parser Pos
peekPos = Parser $ \ts -> case ts of
  (Token p _ : _) -> Right (p, ts)
  []              -> Left (ParseError (Pos 0 0) "unexpected end of input")

consumeTok :: Parser ()
consumeTok = Parser $ \ts -> case ts of
  (_ : rest) -> Right ((), rest)
  []         -> Left (ParseError (Pos 0 0) "unexpected end of input")

consumeTokPos :: Parser Pos
consumeTokPos = Parser $ \ts -> case ts of
  (Token p _ : rest) -> Right (p, rest)
  []                 -> Left (ParseError (Pos 0 0) "unexpected end of input")

consumeT :: Tok -> Parser Pos
consumeT t = Parser $ \ts -> case ts of
  (Token p t' : rest) | t' == t -> Right (p, rest)
  (Token p t' : _)   -> Left (ParseError p ("expected " <> describe t <> ", found " <> describe t'))
  []                 -> Left (ParseError (Pos 0 0) ("expected " <> describe t <> ", found end of input"))

expectIdent :: Parser Token
expectIdent = Parser $ \ts -> case ts of
  (tk@(Token _ (TIdent _)) : rest) -> Right (tk, rest)
  (Token p t : _) -> Left (ParseError p ("expected a name, found " <> describe t))
  []              -> Left (ParseError (Pos 0 0) "expected a name, found end of input")

isRec :: Parser Bool
isRec = Parser $ \ts -> case ts of
  (Token _ TRec : rest) -> Right (True, rest)
  _                     -> Right (False, ts)

failAt :: Pos -> String -> Parser a
failAt p msg = Parser $ \_ -> Left (ParseError p msg)

describe :: Tok -> String
describe = \case
  TInt i     -> "integer " <> show i
  TFloat d   -> "float " <> show d
  TStr _     -> "string"
  TIdent n   -> "name '" <> n <> "'"
  TLet       -> "'let'"
  TRec       -> "'rec'"
  TIn        -> "'in'"
  TFn        -> "'fn'"
  TIf        -> "'if'"
  TThen      -> "'then'"
  TElse      -> "'else'"
  TTrue      -> "'true'"
  TFalse     -> "'false'"
  TPlus      -> "'+'"
  TMinus     -> "'-'"
  TStar      -> "'*'"
  TSlash     -> "'/'"
  TLt        -> "'<'"
  TLe        -> "'<='"
  TGt        -> "'>'"
  TGe        -> "'>='"
  TEq        -> "'=='"
  TNe        -> "'/='"
  TAnd       -> "'&&'"
  TOr        -> "'||'"
  TNot       -> "'!'"
  TAssign    -> "'='"
  TArrow     -> "'=>'"
  TLParen    -> "'('"
  TRParen    -> "')'"
  TLBracket  -> "'['"
  TRBracket  -> "']'"
  TComma     -> "','"
  TEOF       -> "end of input"