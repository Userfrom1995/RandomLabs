{-# LANGUAGE LambdaCase #-}
module Halcyon.Parser
  ( parseProgram
  , ParseError(..)
  ) where

import Halcyon.Ast (Expr(..), Program(..), DataDecl(..), RecordDecl(..), ClassDecl(..), InstanceDecl(..), Pattern(..), Op(..), Builtin(..), TopDef(..), builtinForName)
import Halcyon.Lexer (lexSource, LexError(..))
import Halcyon.Token
import qualified Halcyon.Type as T
import Halcyon.Type (Type, classTypeVar)

-- | A parse error, positioned at the token where parsing failed.
data ParseError = ParseError Pos String
  deriving (Eq, Show)

-- | Parse a full program (v3 grammar): optional @import@ lines, zero or more
-- top-level definitions, and an optional final expression. Lexes first, so a
-- source string is lexed and parsed in one call.
parseProgram :: String -> Either ParseError Program
parseProgram src = do
  toks <- case lexSource src of
    Left (LexError p m) -> Left (ParseError p m)
    Right t             -> Right t
  (prog, rest) <- runParser parseModule (PState toks (Pos 0 0) False)
  case psTokens rest of
    [Token _ TEOF] -> Right prog
    (Token p t : _) -> Left (ParseError p ("unexpected token after expression: " <> describe t))
    []              -> Left (ParseError (Pos 0 0) "unexpected end of input")

-- | A module (v3 grammar): @import* decl* expr?@. Import lines come first;
-- then zero or more top-level definitions (data declarations and @let@
-- bindings); then an optional final expression. Every pre-v3 program (a
-- @dataDecl* expr@ shape) still parses unchanged.
parseModule :: Parser Program
parseModule = do
  imports <- parseImports
  (defs, expr) <- parseDefsAndExpr
  return (Program imports defs expr)

-- | @import "path"@ lines, zero or more.
parseImports :: Parser [String]
parseImports = do
  t <- peek
  case t of
    TImport -> do
      consumeTok
      Token p (TStr path) <- expectString
      rest <- parseImports
      return (path : rest)
    _ -> return []

expectString :: Parser Token
expectString = Parser $ \s -> case psTokens s of
  (tk@(Token _ (TStr _)) : rest) -> Right (tk, s { psTokens = rest, psPrev = tokenPos tk })
  (Token p t : _) -> Left (ParseError p ("expected a string import path, found " <> describe t))
  []              -> Left (ParseError (Pos 0 0) "expected a string import path, found end of input")

-- | Top-level definitions followed by an optional final expression. A
-- leading @let@ is parsed with @parseLetOrDef@: when the token after the
-- bound expression is @in@, the whole @let ... in ...@ is the final
-- expression (the pre-v3 form); any other next token makes it a top-level
-- definition.
parseDefsAndExpr :: Parser ([TopDef], Maybe Expr)
parseDefsAndExpr = do
  t <- peek
  case t of
    TData -> do
      d <- parseDataDecl
      (ds, e) <- parseDefsAndExpr
      return (DefData d : ds, e)
    TRecord -> do
      d <- parseRecordDecl
      (ds, e) <- parseDefsAndExpr
      return (DefRecord d : ds, e)
    TClass -> do
      d <- parseClassDecl
      (ds, e) <- parseDefsAndExpr
      return (DefClass d : ds, e)
    TInstance -> do
      d <- parseInstanceDecl
      (ds, e) <- parseDefsAndExpr
      return (DefInstance d : ds, e)
    TLet  -> parseLetOrDef
    TEOF  -> return ([], Nothing)
    _     -> do
      e <- parseExpr
      return ([], Just e)

-- | Resolve the @let@ ambiguity described in 'parseDefsAndExpr'. The bound
-- expression is parsed with the line-bound application rule so a following
-- top-level expression is never swallowed.
parseLetOrDef :: Parser ([TopDef], Maybe Expr)
parseLetOrDef = do
  p <- consumeT TLet
  rec <- isRec
  Token _ (TIdent name) <- expectIdent
  consumeT TAssign
  setBound True
  bound <- parseExpr
  setBound False
  t' <- peek
  case t' of
    TIn -> do
      consumeTok
      body <- parseExpr
      return ([], Just (ELet p rec name bound body))
    _ -> do
      (ds, e) <- parseDefsAndExpr
      return (DefLet p rec name bound : ds, e)

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

-- | @record <TypeName> <tyvar>* = { <field> : <type> , ... }@
parseRecordDecl :: Parser RecordDecl
parseRecordDecl = do
  p <- consumeT TRecord
  Token _ (TIdent name) <- expectCapitalized "record"
  tyvars <- parseTyvars
  let tvs = zip tyvars [0 ..]
  consumeT TAssign
  consumeT TLBrace
  fields <- parseRecordFields tvs
  consumeT TRBrace
  return (RecordDecl p name tyvars fields)

-- | A record's field list: @name : type@ pairs separated by commas. Runs
-- until the closing brace, so fields may span lines freely.
parseRecordFields :: [(String, Int)] -> Parser [(String, Type)]
parseRecordFields tvs = do
  t <- peek
  case t of
    TRBrace -> return []
    _ -> do
      Token _ (TIdent name) <- expectIdent
      consumeT TColon
      ty <- parseTypeExpr tvs
      rest <- commaFields
      return ((name, ty) : rest)
  where
    commaFields = do
      t <- peek
      case t of
        TComma -> consumeTok >> parseRecordFields tvs
        _      -> return []

-- | @class <Name> <tyvar> where <method> : <type>, ...@. Methods are
-- @name : type@ pairs separated by commas (same line or newlines); a new
-- line whose next token is a name NOT followed by @:@ ends the method list.
parseClassDecl :: Parser ClassDecl
parseClassDecl = do
  p <- consumeT TClass
  Token _ (TIdent name) <- expectCapitalized "class"
  Token _ (TIdent tyvar) <- expectIdent
  if isCapitalized tyvar
    then failAt p ("expected a lowercase class type variable, found " <> tyvar)
    else return ()
  let tvs = [(tyvar, classTypeVar)]
  consumeT TWhere
  methods <- parseClassMethods tvs
  return (ClassDecl p name tyvar methods)

-- | A class method signature list: @name : type@ pairs, comma-separated. A
-- following name not followed by @:@ (e.g. a top-level expression) ends the
-- list, so the class declaration never swallows the next definition.
parseClassMethods :: [(String, Int)] -> Parser [(String, Type)]
parseClassMethods tvs = do
  t <- peek
  t2 <- peek2
  case (t, t2) of
    (TIdent n, Just TColon) -> do
      consumeTok
      consumeT TColon
      ty <- parseTypeExpr tvs
      rest <- parseClassMethods tvs
      return ((n, ty) : rest)
    _ -> return []

-- | @instance Ctx? <Class> <head> where <method> = <expr>, ...@. The
-- optional context is @ClassName tyvar =>@. The head type may optionally
-- repeat the class name (Haskell convention, e.g. @instance Show (Pair a)@);
-- when it does, the class name is stripped so the stored head is the type
-- argument alone, matching the value-tag dispatch used at runtime. Every
-- type variable in the head resolves to @'Halcyon.Type'.TVar 0@ (the head's
-- leading variable). Methods are @name = expr@ pairs, comma-separated (a
-- following name not followed by @=@ ends the list).
parseInstanceDecl :: Parser InstanceDecl
parseInstanceDecl = do
  p <- consumeT TInstance
  Token _ (TIdent classname) <- expectCapitalized "class"
  mctx <- parseOptionalCtx classname
  headT <- parseHeadType
  let headT' = case headT of
        T.TData cn [arg] | cn == classname -> arg
        _                                  -> headT
  consumeT TWhere
  methods <- parseInstanceMethods
  return (InstanceDecl p classname mctx headT' methods)

-- | Parse the optional instance context @ClassName tyvar =>@. The tyvar is
-- the head's leading type variable (@'Halcyon.Type'.TVar 0@).
parseOptionalCtx :: String -> Parser (Maybe (String, Type))
parseOptionalCtx classname = do
  t <- peek
  t2 <- peek2
  case (t, t2) of
    (TIdent n, Just TArrow) | not (isCapitalized n) -> do
      consumeTok
      consumeT TArrow
      return (Just (classname, T.TVar classTypeVar))
    _ -> return Nothing

-- | An instance method list: @name = expr@ pairs, comma-separated. A
-- following name not followed by @=@ (a top-level expression) ends the list.
parseInstanceMethods :: Parser [(String, Expr)]
parseInstanceMethods = do
  t <- peek
  t2 <- peek2
  case (t, t2) of
    (TIdent n, Just TAssign) -> do
      consumeTok
      consumeT TAssign
      setBound True
      e <- parseExpr
      setBound False
      rest <- parseInstanceMethods
      return ((n, e) : rest)
    _ -> return []

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

-- ---------------------------------------------------------------------
-- Instance head types
--
--   headType := headApp ('->' headType)?       (right-associative)
--   headApp  := headAtom headAtom*             (left-associative)
--   headAtom := 'Int' | 'Float' | 'Bool' | 'String'
--            | '[' headType ']' | '(' headType ')'
--            | <lowercase>  -> TVar 0 (the head's leading variable)
--            | <Capitalized> (data/record type)
--
-- Every type variable in an instance head resolves to the leading variable
-- (@'Halcyon.Type'.TVar 0@), matching the instance-head encoding used by
-- the class environment and the runtime dispatcher.
-- ---------------------------------------------------------------------

parseHeadType :: Parser Type
parseHeadType = do
  a <- parseHeadApp
  t <- peek
  case t of
    TArrow -> consumeTok >> (T.TFun a <$> parseHeadType)
    _      -> return a

parseHeadApp :: Parser Type
parseHeadApp = do
  p <- peekPos
  t <- peek
  a <- parseHeadAtom
  case t of
    TIdent n | isCapitalized n && n `notElem` ["Int", "Float", "Bool", "String"] ->
      go p n []
    _ -> return a
  where
    go p n as = do
      q <- peekPos
      t <- peek
      if posLine q == posLine p && typeAtomStart t
        then do
          b <- parseHeadAtom
          go p n (as ++ [b])
        else return (T.TData n as)

parseHeadAtom :: Parser Type
parseHeadAtom = do
  p <- peekPos
  t <- peek
  case t of
    TIdent n -> consumeTok >> case n of
      "Int"    -> return T.TInt
      "Float"  -> return T.TFloat
      "Bool"   -> return T.TBool
      "String" -> return T.TStr
      _ | isCapitalized n -> return (T.TData n [])
        | otherwise -> return (T.TVar classTypeVar)
    TLBracket -> do
      consumeTok
      inner <- parseHeadType
      consumeT TRBracket
      return (T.TList inner)
    TLParen -> do
      consumeTok
      inner <- parseHeadType
      consumeT TRParen
      return inner
    _ -> failAt p ("expected an instance head type, found " <> describe t)

-- | True when a token can begin a type atom (used to continue application).
typeAtomStart :: Tok -> Bool
typeAtomStart = \case
  TIdent _   -> True
  TLBracket  -> True
  TLParen    -> True
  _          -> False

-- | Minimal parser monad: threads the token stream and fails fast.
-- | Parser state: the remaining token stream, the position of the last
-- consumed token (for the same-line application rule in top-level binding
-- bodies), and the @bound@ flag marking that parsing is inside the body of a
-- top-level @let@ definition (where application must not swallow a following
-- expression across a line boundary).
data PState = PState
  { psTokens :: [Token]
  , psPrev   :: Pos
  , psBound  :: Bool
  }

newtype Parser a = Parser { runParser :: PState -> Either ParseError (a, PState) }

instance Functor Parser where
  fmap f (Parser g) = Parser $ \s -> case g s of
    Left e         -> Left e
    Right (a, s')  -> Right (f a, s')

instance Applicative Parser where
  pure a = Parser $ \s -> Right (a, s)
  Parser f <*> Parser g = Parser $ \s -> case f s of
    Left e         -> Left e
    Right (fn, s1) -> case g s1 of
      Left e         -> Left e
      Right (a, s2) -> Right (fn a, s2)

instance Monad Parser where
  Parser g >>= f = Parser $ \s -> case g s of
    Left e         -> Left e
    Right (a, s1) -> runParser (f a) s1

instance MonadFail Parser where
  fail msg = Parser $ \s -> case psTokens s of
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
    TLBrace   -> parseRecordPattern
    TLParen   -> consumeTok >> parsePattern >>= \pat -> consumeT TRParen >> return pat
    _         -> failAt p ("expected a pattern, found " <> describe t)

-- | @{ x = a, y = b }@ record pattern: binds each field's sub-pattern.
parseRecordPattern :: Parser Pattern
parseRecordPattern = do
  p <- consumeT TLBrace
  entries <- go
  consumeT TRBrace
  return (PRecord p entries)
  where
    go = do
      t <- peek
      case t of
        TRBrace -> return []
        TComma  -> consumeTok >> go
        _ -> do
          Token _ (TIdent name) <- expectIdent
          consumeT TAssign
          sub <- parsePattern
          rest <- go
          return ((name, sub) : rest)

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
  TLBrace   -> True
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
    -- Inside a top-level @let@ binding body the application may not cross a
    -- line boundary, so a following top-level expression is never swallowed
    -- as an argument. (Plain expressions and @let ... in ...@ bodies keep the
    -- unrestricted grammar.)
    go fn = do
      lastLine <- Parser $ \s -> Right (posLine (psPrev s), s)
      nextLine <- Parser $ \s -> case psTokens s of
        (Token p _ : _) -> Right (posLine p, s)
        []              -> Right (posLine (psPrev s), s)
      bound <- Parser $ \s -> Right (psBound s, s)
      if bound && nextLine > lastLine
        then return fn
        else do
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
  a <- case t of
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
    TLBrace   -> consumeTok >> parseRecordOrUpdate p
    _         -> failAt p ("expected an expression, found " <> describe t)
  parsePostfix a
  where
    -- Postfix record projection @e.f@, chained (left-associative) and
    -- binding tighter than application so @f a.b@ reads @f (a.b)@.
    parsePostfix e = do
      t <- peek
      case t of
        TDot -> do
          q <- consumeTokPos
          Token _ (TIdent name) <- expectIdent
          parsePostfix (EProj q e name)
        _ -> return e

-- | @{ f1 = e1, ..., fn = en }@ (record literal) or @{ e with f = e' }@
-- (functional update). A literal starts with a field name followed by @=@;
-- anything else is an update whose base expression is followed by @with@.
parseRecordOrUpdate :: Pos -> Parser Expr
parseRecordOrUpdate p = do
  t <- peek
  case t of
    TIdent _ -> do
      t2 <- peek2
      case t2 of
        Just TAssign -> ERecord p <$> parseRecordEntries
        _            -> parseUpdate p
    _ -> parseUpdate p

-- | Record literal entries: @name = expr@ pairs separated by commas, ending
-- at the closing brace.
parseRecordEntries :: Parser [(String, Expr)]
parseRecordEntries = do
  entries <- go
  consumeT TRBrace
  return entries
  where
    go = do
      t <- peek
      case t of
        TRBrace -> return []
        TComma  -> consumeTok >> go
        _ -> do
          Token _ (TIdent name) <- expectIdent
          consumeT TAssign
          e <- parseExpr
          (rest) <- go
          return ((name, e) : rest)

-- | @{ e with f = e' }@: the base expression, then @with@, then the single
-- field update.
parseUpdate :: Pos -> Parser Expr
parseUpdate p = do
  e <- parseExpr
  consumeT TWith
  Token _ (TIdent name) <- expectIdent
  consumeT TAssign
  e' <- parseExpr
  consumeT TRBrace
  return (EUpdate p e name e')

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
expectCapitalized what = Parser $ \s -> case psTokens s of
  (tk@(Token _ (TIdent n)) : rest) | isCapitalized n -> Right (tk, s { psTokens = rest, psPrev = tokenPos tk })
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
  TLBrace   -> True
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
  ERecord p _     -> p
  EProj p _ _     -> p
  EUpdate p _ _ _ -> p
  EBin p _ _ _    -> p
  ENeg p _        -> p
  ENot p _        -> p
  EBuiltin p _    -> p

-- ---------------------------------------------------------------------
-- Token stream helpers
-- ---------------------------------------------------------------------

peek :: Parser Tok
peek = Parser $ \s -> case psTokens s of
  (Token _ t : _) -> Right (t, s)
  []              -> Left (ParseError (Pos 0 0) "unexpected end of input")

peekPos :: Parser Pos
peekPos = Parser $ \s -> case psTokens s of
  (Token p _ : _) -> Right (p, s)
  []              -> Left (ParseError (Pos 0 0) "unexpected end of input")

peekTok :: Parser (Maybe Token)
peekTok = Parser $ \s -> case psTokens s of
  (tk : _) -> Right (Just tk, s)
  []       -> Right (Nothing, s)

-- | The token after the next one (second token in the stream), used to
-- disambiguate record literals from record updates.
peek2 :: Parser (Maybe Tok)
peek2 = Parser $ \s -> case psTokens s of
  (_ : Token _ t : _) -> Right (Just t, s)
  _                   -> Right (Nothing, s)

consumeTok :: Parser ()
consumeTok = Parser $ \s -> case psTokens s of
  (Token p _ : rest) -> Right ((), s { psTokens = rest, psPrev = p })
  []                 -> Left (ParseError (Pos 0 0) "unexpected end of input")

consumeTokPos :: Parser Pos
consumeTokPos = Parser $ \s -> case psTokens s of
  (Token p _ : rest) -> Right (p, s { psTokens = rest, psPrev = p })
  []                 -> Left (ParseError (Pos 0 0) "unexpected end of input")

consumeT :: Tok -> Parser Pos
consumeT t = Parser $ \s -> case psTokens s of
  (Token p t' : rest) | t' == t -> Right (p, s { psTokens = rest, psPrev = p })
  (Token p t' : _)   -> Left (ParseError p ("expected " <> describe t <> ", found " <> describe t'))
  []                 -> Left (ParseError (Pos 0 0) ("expected " <> describe t <> ", found end of input"))

expectIdent :: Parser Token
expectIdent = Parser $ \s -> case psTokens s of
  (tk@(Token _ (TIdent _)) : rest) -> Right (tk, s { psTokens = rest, psPrev = tokenPos tk })
  (Token p t : _) -> Left (ParseError p ("expected a name, found " <> describe t))
  []              -> Left (ParseError (Pos 0 0) "expected a name, found end of input")

isRec :: Parser Bool
isRec = Parser $ \s -> case psTokens s of
  (Token _ TRec : rest) -> Right (True, s { psTokens = rest, psPrev = posOfHead s })
  _                     -> Right (False, s)
  where posOfHead s = case psTokens s of { (Token p _ : _) -> p; [] -> Pos 0 0 }

-- | Set the top-level-binding flag: inside a bound body, application stops
-- across line boundaries.
setBound :: Bool -> Parser ()
setBound b = Parser $ \s -> Right ((), s { psBound = b })

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
  TRecord     -> "'record'"
  TImport     -> "'import'"
  TClass      -> "'class'"
  TInstance   -> "'instance'"
  TWhere      -> "'where'"
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
  TLBrace     -> "'{'"
  TRBrace     -> "'}'"
  TDot        -> "'.'"
  TColon      -> "':'"
  TComma      -> "','"
  TEOF        -> "end of input"