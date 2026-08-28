{-# LANGUAGE LambdaCase #-}
module Halcyon.Compile
  ( compileProgram
  , compileProgramIn
  , CompileError(..)
  , disassemble
  , Program(..)
  , Func(..)
  , Instr(..)
  ) where

import Control.Monad (forM, forM_, when)
import qualified Data.Map.Strict as Map
import Data.List (intersperse, nub)
import qualified Data.Set as Set

import qualified Halcyon.Ast as Ast
import Halcyon.Ast (Expr(..), DataDecl(..), RecordDecl(..), Pattern(..), Op(..), Builtin(..), TopDef(..), InstanceDecl(..))
import Halcyon.Classes (ClassEnv(..), emptyClassEnv, buildClassEnv, methodClass, InstanceInfo(..))
import Halcyon.Data (DataEnv(..), emptyDataEnv, progEnvs, checkProgram, ctorFor, CtorInfo(..))
import Halcyon.Op
import Halcyon.Parser (parseProgram, ParseError(..))
import Halcyon.Record (RecordEnv, recordFor, recordForFields, RecordInfo(..))
import Halcyon.Token (Pos(..))
import Halcyon.Value

-- | A positioned compile error.
data CompileError = CompileError Pos String
  deriving (Eq, Show)

-- | Compile a source string into a compiled Program. Lexes, parses,
-- resolves the data declarations, then lowers to bytecode with closure and
-- upvalue analysis.
compileProgram :: String -> Either CompileError Program
compileProgram src = case parseProgram src of
  Left (ParseError p m) -> Left (CompileError p m)
  Right prog            -> compileProgramIn prog

-- | Compile an already-parsed, fully-resolved program. Top-level @let@
-- definitions become cells in the entry function's scope (a recursive one
-- gets a @NewCell@ first, mirroring 'compileLet'), so closures capturing a
-- top-level name reach it as an upvalue of the entry frame; the final
-- expression (if any) is compiled last, then @Halt@. Class instances are
-- compiled into dictionary entries in the entry function's constant pool,
-- and the dictionary table is attached to the compiled program.
compileProgramIn :: Ast.Program -> Either CompileError Program
compileProgramIn prog = do
  case checkProgram prog of
    Left m  -> Left (CompileError (Pos 0 0) m)
    Right _ -> Right ()
  (denv, renv) <- case progEnvs prog of
    Left m  -> Left (CompileError (Pos 0 0) m)
    Right e -> Right e
  cenv <- case buildClassEnv prog of
    Left m  -> Left (CompileError (Pos 0 0) m)
    Right c -> Right c
  (_, st) <- runC
    (compileDefs denv renv (Ast.progDefs prog) >> compileMaybeExpr denv renv (Ast.progExpr prog) >> emit Halt >> resolvePatches)
    initState { csCenv = cenv }
  (dicts, st') <- runCDicts (compileDicts denv renv cenv) st
  let entry = Func "main" [] (csCode st) (csConsts st') [] []
      ctors = Map.map ciType (deCtors denv)
  Right (Program entry dicts ctors)
  where
    compileDefs denv renv = mapM_ $ \case
      DefData _      -> return ()
      DefRecord _    -> return ()
      DefClass _     -> return ()
      DefInstance _  -> return ()
      DefInfix _ _ _ _ -> return ()
      DefSynonym _ _ _ _ -> return ()
      DefLet p rec name bound -> compileTopLet p rec name denv renv bound

    compileMaybeExpr _ _ Nothing   = return ()
    compileMaybeExpr denv renv (Just e) = compileExpr denv renv True e

-- | Compile every class instance's method functions into the entry function's
-- constant pool, returning the dictionary table (class name -> entries with
-- method name -> entry constant index). Method implementations must be
-- function values.
compileDicts :: DataEnv -> RecordEnv -> ClassEnv -> CompileM [(String, [DictEntry])]
compileDicts denv renv cenv =
  forM (Map.keys (ceClasses cenv)) $ \cn -> do
    let insts = Map.findWithDefault [] cn (ceInstances cenv)
    entries <- forM insts $ \inst -> do
      methods <- forM (iiMethods inst) $ \(mname, body) ->
        case dictLambda body of
          Nothing -> compileError (iiPos inst) ("instance method " <> mname <> " must be a function")
          Just (params, inner) -> do
            func <- buildFunc denv renv params inner
            idx <- addConst (CFunc func)
            return (mname, idx)
      return (DictEntry (iiHead inst) methods)
    return (cn, entries)

-- | The parameter list and body of an instance method implementation (a
-- lambda).
dictLambda :: Expr -> Maybe ([String], Expr)
dictLambda (ELambda _ params body) = Just (params, body)
dictLambda _                       = Nothing

-- | Run a @CompileM@ action against a known initial state, returning both
-- the action's result and the final state (used to compile the instance
-- dictionaries after the entry function is finished).
runCDicts :: CompileM a -> CompileState -> Either CompileError (a, CompileState)
runCDicts m st = case runC m st of
  Left e      -> Left e
  Right (a, st') -> Right (a, st')

-- | Compile one top-level @let@ binding into the current (entry) function's
-- scope, without a body. Mirror of 'compileLet' for the definition form.
compileTopLet :: Pos -> Bool -> String -> DataEnv -> RecordEnv -> Expr -> CompileM ()
compileTopLet p rec name denv renv bound = case bound of
  ELambda _ params body' -> do
    s <- registerLocal name
    when rec (emit (NewCell s))
    compileLambda p denv renv params body'
    emit (StoreLocal s)
  _ | rec -> compileError p ("let rec requires a function value for " <> name)
    | otherwise -> do
        compileExpr denv renv False bound
        s <- registerLocal name
        emit (StoreLocal s)

initState :: CompileState
initState = CompileState
  { csScopes = [emptyScope]
  , csCode = []
  , csNextCell = 0
  , csConsts = []
  , csConstMap = Map.empty
  , csLambda = 0
  , csLabels = Map.empty
  , csNextLabel = 0
  , csPatches = []
  , csCenv = emptyClassEnv
  }

emptyScope :: CScope
emptyScope = CScope { csLocalNames = [], csUpvals = [] }

-- ---------------------------------------------------------------------
-- Compile state and monad
-- ---------------------------------------------------------------------

-- | One function scope: locals (name -> cell index) and captured upvalues
-- (name -> (hops, cell index) capture spec), in a unified cell space.
data CScope = CScope
  { csLocalNames :: [(String, Int)]
  , csUpvals :: [(String, Int, Int)]
  }

data CompileState = CompileState
  { csScopes    :: [CScope]
  , csCode      :: [Instr]           -- normal order (patches resolved at fn end)
  , csNextCell  :: Int
  , csConsts    :: [Const]           -- normal order
  , csConstMap  :: Map.Map String Int
  , csLambda    :: Int
  , csLabels    :: Map.Map Int Int
  , csNextLabel :: Int
  , csPatches   :: [(Int, Int)]      -- (label, instruction offset) to patch
  , csCenv      :: ClassEnv          -- class environment for method references
  }

newtype CompileM a = CompileM { runC :: CompileState -> Either CompileError (a, CompileState) }

instance Functor CompileM where
  fmap f (CompileM g) = CompileM $ \s -> case g s of
    Left e        -> Left e
    Right (a, s') -> Right (f a, s')

instance Applicative CompileM where
  pure a = CompileM $ \s -> Right (a, s)
  CompileM f <*> CompileM g = CompileM $ \s -> case f s of
    Left e        -> Left e
    Right (fn, s1) -> case g s1 of
      Left e        -> Left e
      Right (a, s2) -> Right (fn a, s2)

instance Monad CompileM where
  CompileM g >>= f = CompileM $ \s -> case g s of
    Left e        -> Left e
    Right (a, s1) -> runC (f a) s1

instance MonadFail CompileM where
  fail msg = CompileM $ \_ -> Left (CompileError (posZero) msg)

posZero :: Pos
posZero = Pos 0 0

get :: CompileM CompileState
get = CompileM $ \s -> Right (s, s)

modify' :: (CompileState -> CompileState) -> CompileM ()
modify' f = CompileM $ \s -> Right ((), f s)

compileError :: Pos -> String -> CompileM a
compileError p msg = CompileM $ \_ -> Left (CompileError p msg)

emit :: Instr -> CompileM ()
emit i = modify' (\s -> s { csCode = csCode s ++ [i] })

-- ---------------------------------------------------------------------
-- Compilation
-- ---------------------------------------------------------------------

-- | Compile an expression. The @inTail@ flag marks tail position: a call in
-- tail position compiles to @TailCall@ so the VM reuses the current frame
-- (constant-stack recursion). Sub-expressions whose result is consumed by a
-- surrounding operation are never in tail position.
compileExpr :: DataEnv -> RecordEnv -> Bool -> Expr -> CompileM ()
compileExpr denv renv inTail = \case
  EInt _ i      -> emitConst (CValue (VInt i))
  EFloat _ d    -> emitConst (CValue (VFloat d))
  EBool _ b     -> emitConst (CValue (VBool b))
  EStr _ s      -> emitConst (CValue (VStr s))
  EChar _ c     -> emitConst (CValue (VChar c))
  EList _ es    -> do
    mapM_ (compileExpr denv renv False) es
    emit (MakeList (length es))
  EVar p name   -> resolveRef p name
  EConstr p name -> compileConstr p denv name
  EBuiltin _ b  -> case b of
    BReadLine -> emitConst (CValue (VEffect "readLine" []))
    _         -> emitConst (CValue (VBuiltin b))
  EUnit _     -> emitConst (CValue VUnit)
  ELambda p params body -> compileLambda p denv renv params body
  EApply p fn arg -> case saturatedConstr denv fn arg of
    Just (name, ar, args) -> do
      mapM_ (compileExpr denv renv False) args
      idx <- dataIdx name ar
      emit (MakeData idx)
    Nothing -> do
      compileExpr denv renv False fn
      compileExpr denv renv False arg
      emit (if inTail then TailCall else Call)
  ELet p rec name bound body -> compileLet p rec name denv renv bound inTail body
  EIf p c t e   -> do
    compileExpr denv renv False c
    labFalse <- emitJump JKJumpIfFalse
    compileExpr denv renv inTail t
    labEnd <- emitJump JKJump
    defineLabel labFalse
    compileExpr denv renv inTail e
    defineLabel labEnd
  EMatch p scrut branches -> compileMatch p denv renv inTail scrut branches
  ERecord p fields -> compileRecord p denv renv fields
  EProj p e name -> compileProj p denv renv e name
  EUpdate p e name ne -> compileUpdate p denv renv e name ne
  EBin p op a b -> do
    compileExpr denv renv False a
    compileExpr denv renv False b
    emit (opToInstr p op)
  ENeg p x      -> compileExpr denv renv False x >> emit Neg
  ENot p x      -> compileExpr denv renv False x >> emit Not

-- | Compile a data constructor reference. A nullary constructor is already
-- a complete data value (MakeData pops zero values); a curried reference to
-- a non-nullary constructor is pushed as a value so partial application
-- behaves exactly like the interpreter's 'VConstr'.
compileConstr :: Pos -> DataEnv -> String -> CompileM ()
compileConstr p denv name = case ctorFor name denv of
  Nothing -> compileError p ("unbound constructor: " <> name)
  Just ci -> do
    idx <- dataIdx name (ciArity ci)
    if ciArity ci == 0
      then emit (MakeData idx)
      else emit (PushConstr idx)

-- | Register a @CData@ constant for a constructor (name + total arity) and
-- return its pool index.
dataIdx :: String -> Int -> CompileM Int
dataIdx name ar = do
  st <- get
  case Map.lookup (constEquiv (CData name ar)) (csConstMap st) of
    Just i  -> return i
    Nothing -> do
      let i = length (csConsts st)
      modify' (\s -> s { csConsts = csConsts s ++ [CData name ar], csConstMap = Map.insert (constEquiv (CData name ar)) i (csConstMap s) })
      return i

-- | Register a @CRec@ constant for a record type (name + declared field
-- names) and return its pool index.
recIdx :: String -> [String] -> CompileM Int
recIdx name fields = do
  st <- get
  case Map.lookup (constEquiv (CRec name fields)) (csConstMap st) of
    Just i  -> return i
    Nothing -> do
      let i = length (csConsts st)
      modify' (\s -> s { csConsts = csConsts s ++ [CRec name fields], csConstMap = Map.insert (constEquiv (CRec name fields)) i (csConstMap s) })
      return i

-- | @{ f1 = e1, ..., fn = en }@: evaluate the fields in declared order,
-- then @MakeRecord@ pairs the declared field names with the pushed values.
-- The field set must match a declared record exactly (checked by the type
-- checker), so every declared field is present in the literal.
compileRecord :: Pos -> DataEnv -> RecordEnv -> [(String, Expr)] -> CompileM ()
compileRecord p denv renv fields = do
  let fm = Map.fromList fields
      fset = Map.keysSet fm
  (name, ri) <- case recordForFields fset renv of
    Nothing -> compileError p ("no record with fields " <> show (Set.toList fset))
    Just x  -> return x
  forM_ (riFields ri) $ \(f, _) ->
    case Map.lookup f fm of
      Nothing -> compileError p ("record literal is missing field " <> f)
      Just e  -> compileExpr denv renv False e
  idx <- recIdx name (map fst (riFields ri))
  emit (MakeRecord idx (length (riFields ri)))

-- | @e.f@: compile @e@, then @GetField@ with the field name. The VM looks
-- the field up by name, so this works on any record-valued expression. A
-- projection of a record literal is folded to the literal field expression
-- (Halcyon is pure, so evaluation order cannot be observed).
compileProj :: Pos -> DataEnv -> RecordEnv -> Expr -> String -> CompileM ()
compileProj p denv renv e name = case e of
  ERecord _ fields -> case lookup name fields of
    Just fe  -> compileExpr denv renv False fe
    Nothing  -> compileError p ("no field " <> name <> " in record literal")
  _ -> do
    compileExpr denv renv False e
    c <- fieldIdx name
    emit (GetField c)

-- | @{ e with f = e' }@: compile the record, the new value, then
-- @UpdateField@ to rebuild the record.
compileUpdate :: Pos -> DataEnv -> RecordEnv -> Expr -> String -> Expr -> CompileM ()
compileUpdate p denv renv e name ne = do
  compileExpr denv renv False e
  compileExpr denv renv False ne
  c <- fieldIdx name
  emit (UpdateField c)

-- | Register a @CField@ constant for a record field name and return its
-- pool index.
fieldIdx :: String -> CompileM Int
fieldIdx name = do
  st <- get
  case Map.lookup (constEquiv (CField name)) (csConstMap st) of
    Just i  -> return i
    Nothing -> do
      let i = length (csConsts st)
      modify' (\s -> s { csConsts = csConsts s ++ [CField name], csConstMap = Map.insert (constEquiv (CField name)) i (csConstMap s) })
      return i

-- | When an application spine is a constructor applied to exactly its arity
-- of arguments, compile it to @MakeData@; otherwise fall back to the generic
-- curried call path.
saturatedConstr :: DataEnv -> Expr -> Expr -> Maybe (String, Int, [Expr])
saturatedConstr denv fn arg = go fn [arg]
  where
    go (EApply _ f a) as = go f (a : as)
    go (EConstr _ name) as =
      case fmap ciArity (ctorFor name denv) of
        Just ar | ar == length as && ar > 0 -> Just (name, ar, as)
        _ -> Nothing
    go _ _ = Nothing

compileLet :: Pos -> Bool -> String -> DataEnv -> RecordEnv -> Expr -> Bool -> Expr -> CompileM ()
compileLet p rec name denv renv bound inTail body = case bound of
  ELambda _ params body' -> do
    s <- registerLocal name
    when rec (emit (NewCell s))
    compileLambda p denv renv params body'
    emit (StoreLocal s)
    compileExpr denv renv inTail body
  _ | rec -> compileError p ("let rec requires a function value for " <> name)
    | otherwise -> do
        compileExpr denv renv False bound
        s <- registerLocal name
        emit (StoreLocal s)
        compileExpr denv renv inTail body

-- | Compile a @match@ expression. Layout:
--
-- @
--   <scrutinee>
--   StoreLocal $scr
-- branch0:
--   PushLocal $scr
--   <pattern0 tests, each jumping to branch1 on failure>
--   Jump body0
-- branch1:
--   PushLocal $scr
--   <pattern1 tests, each jumping to fail on failure>
--   Jump body1
-- fail:
--   Fail
-- body0: <body0> ; Jump end
-- body1: <body1> ; Jump end
-- end:
-- @
--
-- Each branch's pattern tests pop the scrutinee and, when the pattern fully
-- matches, fall through to a jump into that branch's body. Every test that
-- fails jumps to the next branch's start (or @Fail@ for the last branch).
compileMatch :: Pos -> DataEnv -> RecordEnv -> Bool -> Expr -> [(Pattern, Expr)] -> CompileM ()
compileMatch p denv renv inTail scrut branches = case branches of
  [] -> compileError p "empty match"
  _ -> do
    compileExpr denv renv False scrut
    scr <- registerLocal "$scr"
    emit (StoreLocal scr)
    let names = nub (concatMap (patternVars . fst) branches)
    slots <- mapM registerLocal names
    let varSlot = Map.fromList (zip names slots)
    let n = length branches
    startLabs <- mapM (const newLabel) [1 .. n]
    bodyLabs <- mapM (const newLabel) [1 .. n]
    endLab <- newLabel
    failLab <- newLabel
    forM_ (zip3 [0 ..] startLabs branches) $ \(i, startLab, (pat, _)) -> do
      defineLabel startLab
      emit (PushLocal scr)
      let failTarget = case drop (i + 1) startLabs of
            (nextLab : _) -> nextLab
            []            -> failLab
      compilePattern denv renv varSlot failTarget pat
      emitJumpTo (bodyLabs !! i)
    defineLabel failLab
    emit Fail
    forM_ (zip bodyLabs branches) $ \(bodyLab, (_, body)) -> do
      defineLabel bodyLab
      compileExpr denv renv inTail body
      emitJumpTo endLab
    defineLabel endLab

-- | All variable names bound by a pattern.
patternVars :: Pattern -> [String]
patternVars = \case
  PWild _       -> []
  PVar _ n      -> [n]
  PInt _ _      -> []
  PFloat _ _    -> []
  PBool _ _     -> []
  PStr _ _      -> []
  PChar _ _     -> []
  PNil _        -> []
  PCons _ h t   -> patternVars h ++ patternVars t
  PList _ ps    -> concatMap patternVars ps
  PConstr _ _ ps -> concatMap patternVars ps
  PRecord _ fs  -> concatMap (patternVars . snd) fs

-- | Compile a pattern's test chain against the value on top of the operand
-- stack. Each test pops the current value and jumps to the fail target on
-- mismatch. Structural patterns bind their subvalues into anonymous temp
-- slots and re-push them one at a time, so at every point where a test can
-- fail the operand stack holds only the value under test: a failed test
-- always falls out of the chain with a clean stack, ready for the next
-- branch.
compilePattern :: DataEnv -> RecordEnv -> Map.Map String Int -> Int -> Pattern -> CompileM ()
compilePattern denv renv varSlot failLab = \case
  PWild _       -> emit Pop
  PVar _ n      -> case Map.lookup n varSlot of
    Just s  -> emit (BindLocal s)
    Nothing -> compileError posZero ("unbound pattern variable: " <> n)
  PInt _ i      -> addConst (CValue (VInt i)) >>= \c -> emitTestTo failLab (\t -> TestInt c t)
  PFloat _ d    -> addConst (CValue (VFloat d)) >>= \c -> emitTestTo failLab (\t -> TestFloat c t)
  PBool _ b     -> addConst (CValue (VBool b)) >>= \c -> emitTestTo failLab (\t -> TestBool c t)
  PStr _ s      -> addConst (CValue (VStr s)) >>= \c -> emitTestTo failLab (\t -> TestStr c t)
  PChar _ c     -> addConst (CValue (VChar c)) >>= \c -> emitTestTo failLab (\t -> TestChar c t)
  PNil _        -> emitTestTo failLab TestNil
  PCons _ h t   -> do
    emitTestTo failLab TestCons
    headTmp <- registerTempSlot
    tailTmp <- registerTempSlot
    emit (BindLocal headTmp)
    emit (BindLocal tailTmp)
    emit (PushLocal headTmp)
    compilePattern denv renv varSlot failLab h
    emit (PushLocal tailTmp)
    compilePattern denv renv varSlot failLab t
  PList _ ps    -> compilePList ps
  PConstr _ name ps -> do
    c <- dataIdx name (length ps)
    emitTestTo failLab (\t -> TestConstr c t)
    temps <- mapM (const registerTempSlot) ps
    mapM_ (\s -> emit (BindLocal s)) temps
    forM_ (zip temps ps) $ \(s, sub) -> do
      emit (PushLocal s)
      compilePattern denv renv varSlot failLab sub
  PRecord _ fields -> compilePRecord fields
  where
    compilePList [] = emitTestTo failLab TestNil
    compilePList (pat : rest) = do
      emitTestTo failLab TestCons
      headTmp <- registerTempSlot
      tailTmp <- registerTempSlot
      emit (BindLocal headTmp)
      emit (BindLocal tailTmp)
      emit (PushLocal headTmp)
      compilePattern denv renv varSlot failLab pat
      emit (PushLocal tailTmp)
      compilePList rest

    -- A record pattern: the field set resolves the record, @TestRecord@
    -- pops the record and pushes its declared-ordered fields, and each
    -- declared field's sub-pattern is matched against the corresponding
    -- pushed value (the pattern's fields must equal the declared set, so the
    -- pairing by name is total).
    compilePRecord fields = do
      let fset = Set.fromList (map fst fields)
      (_, ri) <- case recordForFields fset renv of
        Nothing -> compileError posZero ("no record with fields " <> show (Set.toList fset))
        Just x  -> return x
      let declared = map fst (riFields ri)
      c <- recIdx (riName ri) declared
      emitTestTo failLab (\t -> TestRecord c t)
      temps <- mapM (const registerTempSlot) declared
      mapM_ (\s -> emit (BindLocal s)) temps
      forM_ (zip declared temps) $ \(f, s) ->
        case lookup f fields of
          Nothing -> emit Pop -- unreachable: pattern field set equals declared set
          Just sub -> do
            emit (PushLocal s)
            compilePattern denv renv varSlot failLab sub

-- | Compile a lambda. Builds the function, stores it in the enclosing
-- function's constant pool, and emits the closure-construction sequence.
compileLambda :: Pos -> DataEnv -> RecordEnv -> [String] -> Expr -> CompileM ()
compileLambda _ denv renv params body = do
  func <- buildFunc denv renv params body
  funcIdx <- addConst (CFunc func)
  emit (MakeClosure funcIdx)

-- | Build a compiled function from a parameter list and body, isolating the
-- compilation in a fresh function scope and restoring the enclosing
-- function's state afterwards. The result is not registered anywhere; callers
-- either store it (as a closure constant) or, for instance methods, record
-- its constant-pool index in a dictionary.
buildFunc :: DataEnv -> RecordEnv -> [String] -> Expr -> CompileM Func
buildFunc denv renv params body = do
  outer <- get
  let scope = CScope (zip params [0 ..]) []
  modify' (\s -> s
    { csScopes = scope : csScopes s
    , csCode = []
    , csNextCell = length params
    , csConsts = []
    , csConstMap = Map.empty
    , csLambda = csLambda s + 1
    , csLabels = Map.empty
    , csPatches = []
    , csCenv = csCenv s
    })
  compileExpr denv renv True body
  emit Return
  resolvePatches
  finished <- get
  let headScope = head (csScopes finished)
      code = csCode finished
      consts = csConsts finished
      upvals = [(h, i) | (_, h, i) <- csUpvals headScope]
      upvalNames = [n | (n, _, _) <- csUpvals headScope]
      func = Func ("<lambda" <> show (csLambda finished) <> ">") params code consts upvals upvalNames
  -- restore the enclosing function's state
  modify' (\s -> s
    { csScopes = csScopes outer
    , csCode = csCode outer
    , csNextCell = csNextCell outer
    , csConsts = csConsts outer
    , csConstMap = csConstMap outer
    , csLambda = csLambda outer
    , csLabels = csLabels outer
    , csPatches = csPatches outer
    , csCenv = csCenv outer
    })
  return func

-- | Register a local binding in the current function's scope.
registerLocal :: String -> CompileM Int
registerLocal name = do
  st <- get
  let scope = head (csScopes st)
      slot = csNextCell st
  modify' (\s -> s
    { csScopes = scope { csLocalNames = (name, slot) : csLocalNames scope } : tail (csScopes s)
    , csNextCell = slot + 1
    })
  return slot

-- | Allocate an anonymous cell slot for match temporaries. Not added to the
-- scope's name list (no user reference can hit it), so it stays invisible to
-- 'resolveRef' while providing a unique, cell-safe index.
registerTempSlot :: CompileM Int
registerTempSlot = do
  st <- get
  let slot = csNextCell st
  modify' (\s -> s { csNextCell = slot + 1 })
  return slot

-- | Add a constant to the current function's pool, deduplicating values.
addConst :: Const -> CompileM Int
addConst c = do
  st <- get
  case c of
    CValue _ ->
      case Map.lookup (constEquiv c) (csConstMap st) of
        Just i  -> return i
        Nothing -> do
          let i = length (csConsts st)
          modify' (\s -> s { csConsts = csConsts s ++ [c], csConstMap = Map.insert (constEquiv c) i (csConstMap s) })
          return i
    CData _ _ ->
      case Map.lookup (constEquiv c) (csConstMap st) of
        Just i  -> return i
        Nothing -> do
          let i = length (csConsts st)
          modify' (\s -> s { csConsts = csConsts s ++ [c], csConstMap = Map.insert (constEquiv c) i (csConstMap s) })
          return i
    CRec _ _ ->
      case Map.lookup (constEquiv c) (csConstMap st) of
        Just i  -> return i
        Nothing -> do
          let i = length (csConsts st)
          modify' (\s -> s { csConsts = csConsts s ++ [c], csConstMap = Map.insert (constEquiv c) i (csConstMap s) })
          return i
    CField _ ->
      case Map.lookup (constEquiv c) (csConstMap st) of
        Just i  -> return i
        Nothing -> do
          let i = length (csConsts st)
          modify' (\s -> s { csConsts = csConsts s ++ [c], csConstMap = Map.insert (constEquiv c) i (csConstMap s) })
          return i
    CMethod _ ->
      case Map.lookup (constEquiv c) (csConstMap st) of
        Just i  -> return i
        Nothing -> do
          let i = length (csConsts st)
          modify' (\s -> s { csConsts = csConsts s ++ [c], csConstMap = Map.insert (constEquiv c) i (csConstMap s) })
          return i
    CFunc _ -> do
      let i = length (csConsts st)
      modify' (\s -> s { csConsts = csConsts s ++ [c] })
      return i

emitConst :: Const -> CompileM ()
emitConst c = addConst c >>= \i -> emit (PushConst i)

-- | Resolve a variable reference, emitting the right load instruction.
-- Walks the scope chain outward; the first scope containing the name wins.
resolveRef :: Pos -> String -> CompileM ()
resolveRef p name = do
  st <- get
  let current = head (csScopes st)
  case lookup name (csLocalNames current) of
    Just s  -> emit (PushLocal s)
    Nothing -> case findUpval name (csUpvals current) of
      Just (h, i) -> emit (PushUpvalue h i)
      Nothing     -> walkOuter 1 (tail (csScopes st))
  where
    findUpval n ups = case [(h, i) | (n', h, i) <- ups, n' == n] of
      (x : _) -> Just x
      []      -> Nothing

    walkOuter :: Int -> [CScope] -> CompileM ()
    walkOuter k [] = do
      st <- get
      case methodClass name (csCenv st) of
        Just _  -> emitConst (CMethod name)
        Nothing -> compileError p ("unbound name: " <> name)
    walkOuter k (scope : rest) =
      case lookup name (csLocalNames scope) of
        Just j -> do
          addUpvalue name (k - 1) j
          emit (PushUpvalue (k - 1) j)
        Nothing -> case findUpval name (csUpvals scope) of
          Just (h, j) -> do
            addUpvalue name (k + h) j
            emit (PushUpvalue (k + h) j)
          Nothing -> walkOuter (k + 1) rest

    addUpvalue n h i = modify' (\s ->
      let scope = head (csScopes s)
      in s { csScopes = scope { csUpvals = (n, h, i) : csUpvals scope } : tail (csScopes s) })

opToInstr :: Pos -> Op -> Instr
opToInstr _ = \case
  OpAdd -> Add
  OpSub -> Sub
  OpMul -> Mul
  OpDiv -> Div
  OpLt  -> Lt
  OpLe  -> Le
  OpGt  -> Gt
  OpGe  -> Ge
  OpEq  -> Eq
  OpNe  -> Ne
  OpAnd -> And
  OpOr  -> Or

-- ---------------------------------------------------------------------
-- Jumps
-- ---------------------------------------------------------------------

data JumpKind = JKJump | JKJumpIfFalse

-- | Allocate a fresh label id (for pre-planned branch/body/fail labels).
newLabel :: CompileM Int
newLabel = do
  st <- get
  let lab = csNextLabel st
  modify' (\s -> s { csNextLabel = lab + 1 })
  return lab

-- | Emit a jump with a placeholder target and record the patch.
emitJump :: JumpKind -> CompileM Int
emitJump kind = do
  st <- get
  let lab = csNextLabel st
      placeholder = case kind of
        JKJump        -> Jump 0
        JKJumpIfFalse -> JumpIfFalse 0
  modify' (\s -> s
    { csNextLabel = lab + 1
    , csCode = csCode s ++ [placeholder]
    , csPatches = (lab, length (csCode s)) : csPatches s
    })
  return lab

-- | Emit an unconditional jump targeting an already-allocated label.
emitJumpTo :: Int -> CompileM ()
emitJumpTo lab = do
  st <- get
  modify' (\s -> s
    { csCode = csCode s ++ [Jump 0]
    , csPatches = (lab, length (csCode s)) : csPatches s
    })

-- | Emit a pattern test instruction with a placeholder target, patching it
-- to an already-allocated fail label. @mk@ builds the instruction from its
-- target operand (e.g. @\\t -> TestConstr idx t@).
emitTestTo :: Int -> (Int -> Instr) -> CompileM ()
emitTestTo lab mk = do
  st <- get
  modify' (\s -> s
    { csCode = csCode s ++ [mk 0]
    , csPatches = (lab, length (csCode s)) : csPatches s
    })

defineLabel :: Int -> CompileM ()
defineLabel lab = do
  off <- getsLen
  modify' (\s -> s { csLabels = Map.insert lab off (csLabels s) })
  where
    getsLen = CompileM $ \s -> Right (length (csCode s), s)

-- | Resolve all forward jump patches in the current function's code.
-- Called before a function's code is finalized.
resolvePatches :: CompileM ()
resolvePatches = do
  st <- get
  let labels = csLabels st
      patch (lab, pos) code =
        let tgt = Map.findWithDefault 0 lab labels
        in case code !! pos of
             Jump 0        -> replaceAt pos (Jump tgt) code
             JumpIfFalse 0 -> replaceAt pos (JumpIfFalse tgt) code
             TestNil 0     -> replaceAt pos (TestNil tgt) code
             TestCons 0    -> replaceAt pos (TestCons tgt) code
             TestConstr c 0 -> replaceAt pos (TestConstr c tgt) code
             TestInt c 0   -> replaceAt pos (TestInt c tgt) code
             TestFloat c 0 -> replaceAt pos (TestFloat c tgt) code
             TestBool c 0  -> replaceAt pos (TestBool c tgt) code
             TestStr c 0   -> replaceAt pos (TestStr c tgt) code
             TestChar c 0  -> replaceAt pos (TestChar c tgt) code
             TestRecord c 0 -> replaceAt pos (TestRecord c tgt) code
             _             -> code
  modify' (\s -> s { csCode = foldl (\code p -> patch p code) (csCode s) (csPatches s), csPatches = [] })

replaceAt :: Int -> a -> [a] -> [a]
replaceAt i x xs = let (a, _ : b) = splitAt i xs in a ++ (x : b)

-- ---------------------------------------------------------------------
-- Disassembler
-- ---------------------------------------------------------------------

-- | Deterministic disassembly of a function and its nested functions.
disassemble :: Func -> String
disassemble f = unlines (dis f 0)
  where
    dis fn depth = header : numberedCode <> concatMap (\g -> dis g (depth + 1)) funcs
      where
        header = indent depth
          (fName fn <> "(" <> concat (intersperse ", " (fParams fn)) <> ")"
           <> " upvals=" <> show (length (fUpvals fn))
           <> " consts=" <> show (length (fConstants fn)))
        numberedCode =
          zipWith (\i instr -> indent (depth + 1) (show i <> ": " <> showInstr instr)) [0 ..] (fCode fn)
        funcs = [g | CFunc g <- fConstants fn]
    indent d s = replicate (2 * d) ' ' <> s