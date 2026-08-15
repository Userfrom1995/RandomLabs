{-# LANGUAGE LambdaCase #-}
module Halcyon.Parser
  ( parseProgram
  , ParseError(..)
  ) where

import Halcyon.Ast (Expr(..), Program(..), DataDecl(..), Pattern(..), Op(..), Builtin(..), builtinForName)
import Halcyon.Lexer (lexSource, LexError(..))
import Halcyon.Token
import qualified Halcyon.Type as T
import Halcyon.Type (Type)

-- | A parse error, positioned at the token where parsing failed.
data ParseError = ParseError Pos String
  deriving (Eq, Show)

-- | Parse a full program: zero or more top-level @data@ declarations
-- followed by an expression and end of input. Lexes first, so a source
-- string is lexed and parsed in one call.
parseProgram :: String -> Either ParseError Program
parseProgram src = do
  toks <- case lexSource src of
    Left (LexError p m) -> Left (ParseError p m)
    Right t             -> Right t
  (prog, rest) <- runParser parseModule toks
  case rest of
    [Token _ TEOF] -> Right prog
    (Token p t : _) -> Left (ParseError p ("unexpected token after expression: " <> describe t))
    []              -> Left (ParseError (Pos 0 0) "unexpected end of input")

-- | A module: @dataDecl* expr@. The zero-decl case is a bare expression, so
-- every pre-v2 program parses unchanged.
parseModule :: Parser Program
parseModule = do
  decls <- parseDataDecls
  expr <- parseExpr
  return (Program decls expr)

-- | Zero or more consecutive top-level @data@ declarations.
parseDataDecls :: Parser [DataDecl]
parseDataDecls = do
  t <- peek
  case t of
    TData -> do { d <- parseDataDecl; (d :) <$> parseDataDecls }
    _     -> return []

-- | @data <TypeName> <tyvar>* = ('|'? <Ctor> <fieldType>*)+@
parseDataDecl :: Parser DataDecl
parseDataDecl = do
  p <- consumeT TData
  Token _ (TIdent name) <- expectCapitalized "type"
  tyvars <- parseTyvars
  let tvs = zip tyvars [0 ..]
  consumeT TAssign
  ctors <- parseCtorAlts tvs
  return (DataDecl p name tyvars ctors)

-- | Constructor alternatives separated by @|@, with an optional leading @|@.
parseCtorAlts :: [(String, Int)] -> Parser [(String, [Type])]
parseCtorAlts tvs = do
  t <- peek
  case t of
    TPipe -> consumeTok >> parseCtorRest tvs
    _     -> parseCtorRest tvs

parseCtorRest :: [(String, Int)] -> Parser [(String, [Type])]
parseCtorRest tvs = do
  ctor <- parseCtor tvs
  t <- peek
  case t of
    TPipe -> consumeTok >> ((ctor :) <$> parseCtorRest tvs)
    _     -> return [ctor]

parseCtor :: [(String, Int)] -> Parser (String, [Type])
parseCtor tvs = do
  Token p (TIdent name) <- expectCapitalized "constructor"
  fields <- parseFields (posLine p) tvs
  return (name, fields)

-- | A constructor's field types run while the next token is a type-atom on
-- the SAME source line as the constructor name. This keeps a following
-- top-level expression that begins with a capitalized name from being
-- swallowed as another field type; field types spanning lines are written
-- inside parentheses instead.
parseFields :: Int -> [(String, Int)] -> Parser [Type]
parseFields cl tvs = do
  p <- peekPos
  t <- peek
  if posLine p == cl && typeAtomStart t
    then do { ty <- parseTypeExpr tvs; (ty :) <$> parseFields cl tvs }
    else return []

-- | Zero or more declared type variables (lowercase identifiers), stopping
-- at the first non-lowercase-name token.
parseTyvars :: Parser [String]
parseTyvars = do
  t <- peek
  case t of
    TIdent n | not (isCapitalized n) -> do
      consumeTok
      (n :) <$> parseTyvars
    _ -> return []

-- ---------------------------------------------------------------------
-- Type expressions (field types in data declarations)
--
--   typeExpr := typeApp ('->' typeExpr)?          (right-associative)
--   typeApp  := typeAtom typeAtom*                (left-associative)
--   typeAtom := 'Int' | 'Float' | 'Bool' | 'String'
--            | '[' typeExpr ']' | '(' typeExpr ')'
--            | <lowercase> (type variable) | <Capitalized> (data type)
-- ---------------------------------------------------------------------

parseTypeExpr :: [(String, Int)] -> Parser Type
parseTypeExpr tvs = do
  a <- parseTypeApp tvs
  t <- peek
  case t of
    TArrow -> consumeTok >> (T.TFun a <$> parseTypeExpr tvs)
    _      -> return a

parseTypeApp :: [(String, Int)] -> Parser Type
parseTypeApp tvs = do
  p <- peekPos
  t <- peek
  a <- parseTypeAtom tvs
  case t of
    -- Only a bare capitalized constructor name continues application on the
    -- same source line (@Maybe Int@). A parenthesized type, a primitive, a
    -- list type, or a type variable is complete on its own, so a following
    -- atom begins a new field or a new argument.
    TIdent n | isDataName n -> go p n []
    _                       -> return a
  where
    -- Only a bare capitalized constructor name continues application on the
    -- same source line (@Maybe Int@). A parenthesized type, a primitive, a
    -- list type, or a type variable is complete on its own, so a following
    -- atom begins a new field or a new argument.
    isDataName n = isCapitalized n && n `notElem` ["Int", "Float", "Bool", "String"]
    -- A bare constructor name may be applied to following type atoms on the
    -- same source line (e.g. @Maybe Int@); a parenthesized or primitive
    -- type is complete on its own, so a following atom begins a new field.
    go p n as = do
      q <- peekPos
      t <- peek
      if posLine q == posLine p && typeAtomStart t
        then do
          b <- parseTypeAtom tvs
          go p n (as ++ [b])
        else return (T.TData n as)

parseTypeAtom :: [(String, Int)] -> Parser Type
parseTypeAtom tvs = do
  p <- peekPos
  t <- peek
  case t of
    TIdent n -> consumeTok >> case n of
      "Int"    -> return T.TInt
      "Float"  -> return T.TFloat
      "Bool"   -> return T.TBool
      "String" -> return T.TStr
      _ | isCapitalized n -> return (T.TData n [])
        | otherwise -> case lookup n tvs of
            Just idx -> return (T.TVar idx)
            Nothing  -> failAt p ("undeclared type variable: " <> n)
    TLBracket -> do
      consumeTok
      inner <- parseTypeExpr tvs
      consumeT TRBracket
      return (T.TList inner)
    TLParen -> do
      consumeTok
      inner <- parseTypeExpr tvs
      consumeT TRParen
      return inner
    _ -> failAt p ("expected a type, found " <> describe t)

-- | True when a token can begin a type atom (used to continue application).
typeAtomStart :: Tok -> Bool
typeAtomStart = \case
  TIdent _   -> True
  TLBracket  -> True
  TLParen    -> True
  _          -> False

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
--   expr     := let | if | lambda | match | binary(1)
--   let      := 'let' 'rec'? name '=' expr 'in' expr
--   if       := 'if' expr 'then' expr 'else' expr
--   lambda   := 'fn' name+ '=>' expr
--   match    := 'match' expr 'with' '|' pat '=>' expr ('|' pat '=>' expr)*
--   pat      := patApp ('::' pat)?            (cons is right-associative)
--   patApp   := patAtom patAtom*              (constructor application only)
--   patAtom  := '_' | name | literal | '(' pat ')' | '[' pat, ... ']'
--   binary levels: 1 || , 2 && , 3 == /= , 4 < <= > >= ,
--                  5 + - , 6 * / (all left-associative)
--   unary    := ('-' | '!') unary | application
--   application := atom atom*  (left-associative)
--   atom     := literal | name | '(' expr ')' | '[' list ']'
parseExpr :: Parser Expr
parseExpr = do
  t <- peek
  case t of
    TLet  -> parseLet
    TIf   -> parseIf
    TFn   -> parseLambda
    TMatch -> parseMatch
    _     -> parseBinary 1

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

-- | @match scrut with | pat => e | pat => e ...@. The scrutinee is a full
-- expression; @with@ is a keyword so it naturally terminates the scrutinee.
parseMatch :: Parser Expr
parseMatch = do
  p <- consumeT TMatch
  scrut <- parseExpr
  consumeT TWith
  branches <- parseBranches
  return (EMatch p scrut branches)

parseBranches :: Parser [(Pattern, Expr)]
parseBranches = do
  p <- peekPos
  t <- peek
  case t of
    TPipe -> consumeTok >> parseBranchesRest []
    _     -> failAt p "expected '|' to start a match branch"

parseBranchesRest :: [(Pattern, Expr)] -> Parser [(Pattern, Expr)]
parseBranchesRest acc = do
  pat <- parsePattern
  consumeT TArrow
  body <- parseExpr
  let branch = (pat, body)
  t <- peek
  case t of
    TPipe -> consumeTok >> parseBranchesRest (acc ++ [branch])
    _     -> return (acc ++ [branch])

-- | A pattern. Cons (@::@) is right-associative; @[a, b, c]@ is sugar for a
-- nested @::@ chain ending in @[]@.
parsePattern :: Parser Pattern
parsePattern = do
  p <- peekPos
  a <- parsePatternApp
  t <- peek
  case t of
    TCons -> consumeTok >> (PCons p a <$> parsePattern)
    _     -> return a

parsePatternApp :: Parser Pattern
parsePatternApp = do
  p <- peekPos
  a <- parsePatternAtom
  case a of
    PConstr _ _ _ -> go p a
    _             -> return a
  where
    go p a = do
      t <- peek
      if patAtomStart t
        then do
          arg <- parsePatternAtom
          go p (appendArg p a arg)
        else return a

appendArg :: Pos -> Pattern -> Pattern -> Pattern
appendArg p (PConstr _ n args) arg = PConstr p n (args ++ [arg])
appendArg _ _ _ = PWild (Pos 0 0) -- unreachable; kept total

parsePatternAtom :: Parser Pattern
parsePatternAtom = do
  p <- peekPos
  t <- peek
  case t of
    TIdent n
      | n == "_"      -> consumeTok >> return (PWild p)
      | isCapitalized n -> consumeTok >> return (PConstr p n [])
      | otherwise     -> consumeTok >> return (PVar p n)
    TInt i    -> consumeTok >> return (PInt p i)
    TFloat d  -> consumeTok >> return (PFloat p d)
    TTrue     -> consumeTok >> return (PBool p True)
    TFalse    -> consumeTok >> return (PBool p False)
    TStr s    -> consumeTok >> return (PStr p s)
    TLBracket -> parsePList
    TLParen   -> consumeTok >> parsePattern >>= \pat -> consumeT TRParen >> return pat
    _         -> failAt p ("expected a pattern, found " <> describe t)

parsePList :: Parser Pattern
parsePList = do
  p <- consumeT TLBracket
  items <- parsePItems
  consumeT TRBracket
  case items of
    [] -> return (PNil p)
    ps -> return (PList p ps)
  where
    parsePItems = do
      t <- peek
      case t of
        TRBracket -> return []
        _ -> do
          first <- parsePattern
          rest <- commaPItems
          return (first : rest)
    commaPItems = do
      t <- peek
      case t of
        TComma -> consumeTok >> parsePattern >>= \x -> (x :) <$> commaPItems
        _      -> return []

-- | True when the token can begin a pattern.
patAtomStart :: Tok -> Bool
patAtomStart = \case
  TInt _    -> True
  TFloat _  -> True
  TStr _    -> True
  TTrue     -> True
  TFalse    -> True
  TIdent _  -> True
  TLParen   -> True
  TLBracket -> True
  _         -> False

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
    TIdent n
      | isCapitalized n -> consumeTok >> return (EConstr p n)
      | otherwise       -> consumeTok >> return (maybe (EVar p n) (EBuiltin p) (builtinForName n))
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

-- | A capitalized identifier (type or constructor name).
expectCapitalized :: String -> Parser Token
expectCapitalized what = Parser $ \ts -> case ts of
  (tk@(Token _ (TIdent n)) : rest) | isCapitalized n -> Right (tk, rest)
  (Token p t : _) -> Left (ParseError p ("expected a capitalized " <> what <> " name, found " <> describe t))
  []              -> Left (ParseError (Pos 0 0) ("expected a capitalized " <> what <> " name, found end of input"))

-- | A name starts with an uppercase letter. Constructor and type names are
-- capitalized; variables and type variables are lowercase.
isCapitalized :: String -> Bool
isCapitalized []     = False
isCapitalized (c : _) = c >= 'A' && c <= 'Z'

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
  EConstr p _     -> p
  ELambda p _ _   -> p
  EApply p _ _    -> p
  ELet p _ _ _ _  -> p
  EIf p _ _ _     -> p
  EMatch p _ _    -> p
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
  TLet        -> "'let'"
  TRec        -> "'rec'"
  TIn         -> "'in'"
  TFn         -> "'fn'"
  TIf         -> "'if'"
  TThen       -> "'then'"
  TElse       -> "'else'"
  TData       -> "'data'"
  TMatch      -> "'match'"
  TWith       -> "'with'"
  TTrue       -> "'true'"
  TFalse      -> "'false'"
  TPlus       -> "'+'"
  TMinus      -> "'-'"
  TStar       -> "'*'"
  TSlash      -> "'/'"
  TLt         -> "'<'"
  TLe         -> "'<='"
  TGt         -> "'>'"
  TGe         -> "'>='"
  TEq         -> "'=='"
  TNe         -> "'/='"
  TAnd        -> "'&&'"
  TOr         -> "'||'"
  TNot        -> "'!'"
  TAssign     -> "'='"
  TArrow      -> "'=>'"
  TCons       -> "'::'"
  TPipe       -> "'|'"
  TLParen     -> "'('"
  TRParen     -> "')'"
  TLBracket   -> "'['"
  TRBracket   -> "']'"
  TComma      -> "','"
  TEOF        -> "end of input"