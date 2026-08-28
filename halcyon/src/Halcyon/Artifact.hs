{-# LANGUAGE LambdaCase #-}
-- | Serialized bytecode artifacts (v4, milestone 25): a compiled program can
-- be written to a deterministic text format (@HALCYONBC1@) with
-- @halcyon compile -o out.hbc@ and loaded again with @halcyon run out.hbc@
-- without re-lexing, re-parsing, or re-typechecking the source.
--
-- The format is line-based and token-oriented:
--
-- > HALCYONBC1
-- > version 1
-- > entry <func>
-- > dicts <n> <dict>*
-- > ctors <n> <ctor>*
--
-- where a @<func>@ is
--
-- > func <name> <nparams> <param>*
-- > upvals <n> (<hops> <index>)*
-- > upnames <n> <name>*
-- > code <n> <instr>*
-- > consts <n> <const>*
-- > endfunc
--
-- @#@ starts a comment that runs to the end of the line. Names are quoted
-- strings so any identifier (including user-defined operators) round-trips
-- unchanged; integers, floats, characters (by code point), and types all have
-- explicit encodings so the artifact is unambiguous. Serialization is
-- deterministic: the same compiled program always produces the same text.
module Halcyon.Artifact
  ( serializeProgram
  , parseArtifact
  , artifactMagic
  ) where

import Data.Char (chr, ord)
import qualified Data.Map.Strict as Map

import Halcyon.Ast (builtinForName, builtinName)
import Halcyon.Op
import Halcyon.Type (Type(..))
import Halcyon.Value (Value(..))

-- | The leading marker of every bytecode artifact.
artifactMagic :: String
artifactMagic = "HALCYONBC1"

artifactVersion :: Int
artifactVersion = 1

-- ---------------------------------------------------------------------
-- Serialization
-- ---------------------------------------------------------------------

-- | Render a compiled program as a @HALCYONBC1@ artifact. Fails (Left) only
-- when a value that has no artifact encoding reaches the constant pool, which
-- the compiler never produces (closures and dictionary/constructor values are
-- runtime-only).
serializeProgram :: Program -> Either String String
serializeProgram (Program entry dicts ctors) = do
  entryS <- serializeFunc entry
  dictS <- serializeDicts dicts
  let ctorS = serializeCtors ctors
  pure $
    artifactMagic <> "\n"
    <> "# Halcyon bytecode artifact, format version " <> show artifactVersion <> "\n"
    <> "version " <> show artifactVersion <> "\n"
    <> "entry " <> entryS <> "\n"
    <> "dicts " <> show (length dicts) <> "\n"
    <> dictS
    <> "ctors " <> show (Map.size ctors) <> "\n"
    <> ctorS

-- | A deterministic @constructor-name = type-name@ mapping (sorted keys).
serializeCtors :: Map.Map String String -> String
serializeCtors ctors =
  concat ["ctor " <> quote n <> " " <> quote t <> "\n" | (n, t) <- Map.toList ctors]

-- | Render a type for the artifact (used for instance dictionary heads).
serializeType :: Type -> String
serializeType = \case
  TVar v        -> "tvar " <> show v
  TInt          -> "tint"
  TFloat        -> "tfloat"
  TBool         -> "tbool"
  TStr          -> "tstr"
  TChar         -> "tchar"
  TList t       -> "tlist " <> serializeType t
  TData n ts    -> "tdata " <> quote n <> " " <> show (length ts) <> concat [" " <> serializeType t | t <- ts]
  TRec n ts     -> "trec " <> quote n <> " " <> show (length ts) <> concat [" " <> serializeType t | t <- ts]
  TFun a b      -> "tfun " <> serializeType a <> " " <> serializeType b
  TUnit         -> "tunit"
  TEffect t     -> "teffect " <> serializeType t

serializeDicts :: [(String, [DictEntry])] -> Either String String
serializeDicts dicts = do
  parts <- mapM serializeOne dicts
  pure (concat parts)
  where
    serializeOne (cn, es) = do
      entries <- mapM serializeEntry es
      pure ("dict " <> quote cn <> " " <> show (length es) <> "\n" <> concat entries)
    serializeEntry (DictEntry headTy methods) =
      pure ("  type " <> serializeType headTy <> "\n"
            <> "  methods " <> show (length methods) <> "\n"
            <> concat ["  method " <> quote n <> " " <> show i <> "\n" | (n, i) <- methods])

serializeFunc :: Func -> Either String String
serializeFunc (Func name params code consts upvals upnames) = do
  constsS <- mapM serializeConst consts
  pure $
    "func " <> quote name <> " " <> show (length params)
    <> concat [" " <> quote p | p <- params] <> "\n"
    <> "upvals " <> show (length upvals)
    <> concat [" " <> show h <> " " <> show i | (h, i) <- upvals] <> "\n"
    <> "upnames " <> show (length upnames)
    <> concat [" " <> quote u | u <- upnames] <> "\n"
    <> "code " <> show (length code) <> "\n"
    <> concat ["  " <> serializeInstr i <> "\n" | i <- code]
    <> "consts " <> show (length consts) <> "\n"
    <> concat ["  " <> c <> "\n" | c <- constsS]
    <> "endfunc"

serializeConst :: Const -> Either String String
serializeConst = \case
  CValue v      -> ("cvalue " <>) <$> serializeValue v
  CFunc f       -> ("cfunc " <>) <$> serializeFunc f
  CData n a     -> pure ("cdata " <> quote n <> " " <> show a)
  CRec n fs     -> pure ("crec " <> quote n <> " " <> show (length fs) <> concat [" " <> quote f | f <- fs])
  CField f      -> pure ("cfield " <> quote f)
  CMethod m     -> pure ("cmethod " <> quote m)

serializeValue :: Value -> Either String String
serializeValue = \case
  VInt i       -> pure ("vint " <> show i)
  VFloat d     -> pure ("vfloat " <> show d)
  VBool True   -> pure "vbool true"
  VBool False  -> pure "vbool false"
  VStr s       -> pure ("vstr " <> quote s)
  VChar c      -> pure ("vchar " <> show (ord c))
  VList vs     -> do
    parts <- mapM serializeValue vs
    pure ("vlist " <> show (length vs) <> concat [" " <> p | p <- parts])
  VData n vs   -> do
    parts <- mapM serializeValue vs
    pure ("vdata " <> quote n <> " " <> show (length vs) <> concat [" " <> p | p <- parts])
  VRec n fs    -> do
    parts <- mapM (\(f, v) -> (,) f <$> serializeValue v) fs
    pure ("vrec " <> quote n <> " " <> show (length fs)
          <> concat [" " <> quote f <> " " <> p | (f, p) <- parts])
  VUnit        -> pure "vunit"
  VEffect tag vs -> do
    parts <- mapM serializeValue vs
    pure ("veffect " <> quote tag <> " " <> show (length vs) <> concat [" " <> p | p <- parts])
  VBuiltin b   -> pure ("vbuiltin " <> quote (builtinName b))
  -- Runtime-only values the compiler never puts in the constant pool.
  VClosure{}   -> Left "cannot serialize a closure into a bytecode artifact"
  VPartial{}   -> Left "cannot serialize a partial builtin into a bytecode artifact"
  VConstr{}    -> Left "cannot serialize a partial constructor into a bytecode artifact"
  VMethod{}    -> Left "cannot serialize a method reference into a bytecode artifact"
  VDict{}      -> Left "cannot serialize a dictionary into a bytecode artifact"

serializeInstr :: Instr -> String
serializeInstr = \case
  PushConst i      -> "push_const " <> show i
  PushLocal s      -> "push_local " <> show s
  StoreLocal s     -> "store_local " <> show s
  NewCell s        -> "new_cell " <> show s
  PushUpvalue h i  -> "push_upvalue " <> show h <> " " <> show i
  Pop              -> "pop"
  Add              -> "add"
  Sub              -> "sub"
  Mul              -> "mul"
  Div              -> "div"
  Lt               -> "lt"
  Le               -> "le"
  Gt               -> "gt"
  Ge               -> "ge"
  Eq               -> "eq"
  Ne               -> "ne"
  And              -> "and"
  Or               -> "or"
  Not              -> "not"
  Neg              -> "neg"
  Jump o           -> "jump " <> show o
  JumpIfFalse o    -> "jump_if_false " <> show o
  Call             -> "call"
  TailCall         -> "tail_call"
  MakeClosure i    -> "make_closure " <> show i
  Return           -> "return"
  Cons             -> "cons"
  Head             -> "head"
  Tail             -> "tail"
  IsNil            -> "is_nil"
  MakeList n       -> "make_list " <> show n
  PushConstr i     -> "push_constr " <> show i
  MakeData i       -> "make_data " <> show i
  BindLocal s      -> "bind_local " <> show s
  TestNil t        -> "test_nil " <> show t
  TestCons t       -> "test_cons " <> show t
  TestConstr c t   -> "test_constr " <> show c <> " " <> show t
  TestInt c t      -> "test_int " <> show c <> " " <> show t
  TestFloat c t    -> "test_float " <> show c <> " " <> show t
  TestBool c t     -> "test_bool " <> show c <> " " <> show t
  TestStr c t      -> "test_str " <> show c <> " " <> show t
  TestChar c t     -> "test_char " <> show c <> " " <> show t
  MakeRecord c a   -> "make_record " <> show c <> " " <> show a
  GetField c       -> "get_field " <> show c
  UpdateField c    -> "update_field " <> show c
  TestRecord c t   -> "test_record " <> show c <> " " <> show t
  Fail             -> "fail"
  Halt             -> "halt"

-- | Quote a string for the artifact: backslash-escape the characters that
-- could otherwise split or corrupt a token.
quote :: String -> String
quote s = "\"" <> concatMap escape s <> "\""
  where
    escape = \case
      '\\' -> "\\\\"
      '"'  -> "\\\""
      '\n' -> "\\n"
      '\t' -> "\\t"
      '\r' -> "\\r"
      c    -> [c]

-- ---------------------------------------------------------------------
-- Parsing
-- ---------------------------------------------------------------------

-- | A parsed artifact token: a quoted string or a bare word.
data Tok = TokStr String | TokWord String
  deriving (Show)

-- | The parser state: the remaining tokens.
data PState = PState { psToks :: [Tok] }

-- | A tiny hand-rolled parser monad over the token stream, in the same style
-- as 'Halcyon.Parser'.
newtype Parser a = Parser { runParser :: PState -> Either String (a, PState) }

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

-- | Parse an artifact's text back into a compiled program. Fails (Left) on
-- any malformed input with a message pointing at the offending token.
parseArtifact :: String -> Either String Program
parseArtifact src = do
  toks <- tokenize (lines src)
  (prog, rest) <- runParser parseProgram' (PState toks)
  case psToks rest of
    []         -> Right prog
    (t : _)    -> Left ("trailing tokens after artifact: " <> show t)

parseProgram' :: Parser Program
parseProgram' = do
  _ <- expectWord artifactMagic
  _ <- expectWord "version"
  v <- expectInt
  whenFail (v /= artifactVersion) ("unsupported artifact version " <> show v <> " (expected " <> show artifactVersion <> ")")
  _ <- expectWord "entry"
  entry <- parseFunc
  _ <- expectWord "dicts"
  nd <- expectInt
  dicts <- manyN nd parseDict
  _ <- expectWord "ctors"
  nc <- expectInt
  ctors <- Map.fromList <$> manyN nc parseCtor
  pure (Program entry dicts ctors)

parseCtor :: Parser (String, String)
parseCtor = do
  _ <- expectWord "ctor"
  n <- expectName
  t <- expectName
  pure (n, t)

parseDict :: Parser (String, [DictEntry])
parseDict = do
  _ <- expectWord "dict"
  cn <- expectName
  ne <- expectInt
  es <- manyN ne parseDictEntry
  pure (cn, es)

parseDictEntry :: Parser DictEntry
parseDictEntry = do
  _ <- expectWord "type"
  headTy <- parseType
  _ <- expectWord "methods"
  nm <- expectInt
  ms <- manyN nm parseMethod
  pure (DictEntry headTy ms)

parseMethod :: Parser (String, Int)
parseMethod = do
  _ <- expectWord "method"
  n <- expectName
  i <- expectInt
  pure (n, i)

parseFunc :: Parser Func
parseFunc = do
  _ <- expectWord "func"
  name <- expectName
  np <- expectInt
  params <- manyN np expectName
  _ <- expectWord "upvals"
  nu <- expectInt
  upvals <- manyN nu ((,) <$> expectInt <*> expectInt)
  _ <- expectWord "upnames"
  nun <- expectInt
  upnames <- manyN nun expectName
  _ <- expectWord "code"
  nc <- expectInt
  code <- manyN nc parseInstr
  _ <- expectWord "consts"
  nk <- expectInt
  consts <- manyN nk parseConst
  _ <- expectWord "endfunc"
  pure (Func name params code consts upvals upnames)

parseConst :: Parser Const
parseConst = do
  w <- expectAny
  case w of
    "cvalue" -> CValue <$> parseValue
    "cfunc"  -> CFunc <$> parseFunc
    "cdata"  -> CData <$> expectName <*> expectInt
    "crec"   -> do
      n <- expectName
      nf <- expectInt
      fs <- manyN nf expectName
      pure (CRec n fs)
    "cfield"  -> CField <$> expectName
    "cmethod" -> CMethod <$> expectName
    _         -> failParse ("expected a constant, got " <> show w)

parseValue :: Parser Value
parseValue = do
  w <- expectAny
  case w of
    "vint"     -> VInt <$> expectInteger
    "vfloat"   -> VFloat <$> expectDouble
    "vbool"    -> VBool <$> parseBool
    "vstr"     -> VStr <$> expectName
    "vchar"    -> VChar . chr <$> expectInt
    "vlist"    -> VList <$> (expectInt >>= \n -> manyN n parseValue)
    "vdata"    -> VData <$> expectName <*> (expectInt >>= \n -> manyN n parseValue)
    "vrec"     -> do
      n <- expectName
      nf <- expectInt
      fs <- manyN nf ((,) <$> expectName <*> parseValue)
      pure (VRec n fs)
    "vunit"    -> pure VUnit
    "veffect"  -> do
      tag <- expectName
      n <- expectInt
      VEffect tag <$> manyN n parseValue
    "vbuiltin" -> do
      n <- expectName
      case builtinForName n of
        Just b  -> pure (VBuiltin b)
        Nothing -> failParse ("unknown builtin name in artifact: " <> show n)
    _          -> failParse ("expected a value, got " <> show w)

-- | Either with a custom error (failParse).
failParse :: String -> Parser a
failParse msg = Parser $ \_ -> Left msg

parseInstr :: Parser Instr
parseInstr = do
  w <- expectAny
  case w of
    "push_const"     -> PushConst <$> expectInt
    "push_local"     -> PushLocal <$> expectInt
    "store_local"    -> StoreLocal <$> expectInt
    "new_cell"       -> NewCell <$> expectInt
    "push_upvalue"   -> PushUpvalue <$> expectInt <*> expectInt
    "pop"            -> pure Pop
    "add"            -> pure Add
    "sub"            -> pure Sub
    "mul"            -> pure Mul
    "div"            -> pure Div
    "lt"             -> pure Lt
    "le"             -> pure Le
    "gt"             -> pure Gt
    "ge"             -> pure Ge
    "eq"             -> pure Eq
    "ne"             -> pure Ne
    "and"            -> pure And
    "or"             -> pure Or
    "not"            -> pure Not
    "neg"            -> pure Neg
    "jump"           -> Jump <$> expectInt
    "jump_if_false"  -> JumpIfFalse <$> expectInt
    "call"           -> pure Call
    "tail_call"      -> pure TailCall
    "make_closure"   -> MakeClosure <$> expectInt
    "return"         -> pure Return
    "cons"           -> pure Cons
    "head"           -> pure Head
    "tail"           -> pure Tail
    "is_nil"         -> pure IsNil
    "make_list"      -> MakeList <$> expectInt
    "push_constr"    -> PushConstr <$> expectInt
    "make_data"      -> MakeData <$> expectInt
    "bind_local"     -> BindLocal <$> expectInt
    "test_nil"       -> TestNil <$> expectInt
    "test_cons"      -> TestCons <$> expectInt
    "test_constr"    -> TestConstr <$> expectInt <*> expectInt
    "test_int"       -> TestInt <$> expectInt <*> expectInt
    "test_float"     -> TestFloat <$> expectInt <*> expectInt
    "test_bool"      -> TestBool <$> expectInt <*> expectInt
    "test_str"       -> TestStr <$> expectInt <*> expectInt
    "test_char"      -> TestChar <$> expectInt <*> expectInt
    "make_record"    -> MakeRecord <$> expectInt <*> expectInt
    "get_field"      -> GetField <$> expectInt
    "update_field"   -> UpdateField <$> expectInt
    "test_record"    -> TestRecord <$> expectInt <*> expectInt
    "fail"           -> pure Fail
    "halt"           -> pure Halt
    _                -> failParse ("unknown instruction in artifact: " <> show w)

parseType :: Parser Type
parseType = do
  w <- expectAny
  case w of
    "tvar"    -> TVar <$> expectInt
    "tint"    -> pure TInt
    "tfloat"  -> pure TFloat
    "tbool"   -> pure TBool
    "tstr"    -> pure TStr
    "tchar"   -> pure TChar
    "tlist"   -> TList <$> parseType
    "tdata"   -> TData <$> expectName <*> (expectInt >>= \n -> manyN n parseType)
    "trec"    -> TRec <$> expectName <*> (expectInt >>= \n -> manyN n parseType)
    "tfun"    -> TFun <$> parseType <*> parseType
    "tunit"   -> pure TUnit
    "teffect" -> TEffect <$> parseType
    _         -> failParse ("expected a type, got " <> show w)

-- ---------------------------------------------------------------------
-- Tokenizer and parser plumbing
-- ---------------------------------------------------------------------

-- | Run a parser action over the remaining tokens.
manyN :: Int -> Parser a -> Parser [a]
manyN n p = if n <= 0 then pure [] else (:) <$> p <*> manyN (n - 1) p

whenFail :: Bool -> String -> Parser ()
whenFail cond msg = if cond then failParse msg else pure ()

-- | Expect and consume one token as its text.
expectAny :: Parser String
expectAny = Parser $ \s -> case psToks s of
  (t : rest) -> Right (tokText t, s { psToks = rest })
  []         -> Left "unexpected end of artifact"

-- | Expect the given keyword.
expectWord :: String -> Parser ()
expectWord w = Parser $ \s -> case psToks s of
  (t : rest)
    | tokText t == w -> Right ((), s { psToks = rest })
    | otherwise      -> Left ("expected " <> w <> ", got " <> show t)
  [] -> Left ("expected " <> w <> ", but the artifact ended")

-- | Expect a name (a quoted string or a bare word).
expectName :: Parser String
expectName = expectAny

-- | Expect an integer token.
expectInt :: Parser Int
expectInt = Parser $ \s -> case psToks s of
  (t : rest) ->
    case reads (tokText t) :: [(Int, String)] of
      [(n, "")] -> Right (n, s { psToks = rest })
      _         -> Left ("expected an integer, got " <> show t)
  [] -> Left "expected an integer, but the artifact ended"

-- | Expect an arbitrary-precision integer token.
expectInteger :: Parser Integer
expectInteger = Parser $ \s -> case psToks s of
  (t : rest) ->
    case reads (tokText t) :: [(Integer, String)] of
      [(n, "")] -> Right (n, s { psToks = rest })
      _         -> Left ("expected an integer, got " <> show t)
  [] -> Left "expected an integer, but the artifact ended"

-- | Expect a float token.
expectDouble :: Parser Double
expectDouble = Parser $ \s -> case psToks s of
  (t : rest) ->
    case reads (tokText t) :: [(Double, String)] of
      [(d, "")] -> Right (d, s { psToks = rest })
      _         -> Left ("expected a float, got " <> show t)
  [] -> Left "expected a float, but the artifact ended"

-- | Expect the literal @true@ or @false@.
parseBool :: Parser Bool
parseBool = Parser $ \s -> case psToks s of
  (t : rest)
    | tokText t == "true"  -> Right (True, s { psToks = rest })
    | tokText t == "false" -> Right (False, s { psToks = rest })
    | otherwise            -> Left ("expected true or false, got " <> show t)
  [] -> Left "expected true or false, but the artifact ended"

tokText :: Tok -> String
tokText (TokStr s)   = s
tokText (TokWord w)  = w

-- | Tokenize an artifact: split the source into lines, strip @#@ comments,
-- then split each line into whitespace-separated tokens, handling quoted
-- strings with escapes.
tokenize :: [String] -> Either String [Tok]
tokenize = fmap concat . mapM tokenizeLine
  where
    tokenizeLine ln = tokenizeWords (fst (break (== '#') ln))

    tokenizeWords :: String -> Either String [Tok]
    tokenizeWords = go . dropWhile isSpace
      where
        go [] = Right []
        go ('"' : rest) = do
          (s, rest') <- readString rest
          restToks <- tokenizeWords (dropWhile isSpace rest')
          pure (TokStr s : restToks)
        go s = do
          let (w, rest) = span (not . isSpace) s
          restToks <- tokenizeWords (dropWhile isSpace rest)
          pure (TokWord w : restToks)

    -- Read a quoted string starting just after the opening quote; returns the
    -- unescaped content and the remaining input after the closing quote.
    readString :: String -> Either String (String, String)
    readString = go []
      where
        go acc [] = Left "unterminated string in artifact"
        go acc (c : rest) = case c of
          '\\' -> case rest of
            ('\\' : r) -> go (acc <> "\\") r
            ('"' : r)  -> go (acc <> "\"") r
            ('n' : r)  -> go (acc <> "\n") r
            ('t' : r)  -> go (acc <> "\t") r
            ('r' : r)  -> go (acc <> "\r") r
            (o : r)    -> Left ("bad escape in artifact string: \\" <> [o])
            []         -> Left "unterminated escape in artifact string"
          '"' -> Right (acc, rest)
          ch  -> go (acc <> [ch]) rest

isSpace :: Char -> Bool
isSpace c = c == ' ' || c == '\t'