{-# LANGUAGE LambdaCase #-}
module Halcyon.Compile
  ( compileProgram
  , CompileError(..)
  , disassemble
  , Program(..)
  , Func(..)
  , Instr(..)
  ) where

import Control.Monad (forM_, when)
import qualified Data.Map.Strict as Map
import Data.List (intersperse, nub)

import qualified Halcyon.Ast as Ast
import Halcyon.Ast (Expr(..), DataDecl(..), Pattern(..), Op(..), Builtin(..))
import Halcyon.Data (DataEnv, emptyDataEnv, buildDataEnv, ctorFor, CtorInfo(..))
import Halcyon.Op
import Halcyon.Parser (parseProgram, ParseError(..))
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
  Right (Ast.Program decls expr) -> do
    denv <- case buildDataEnv decls of
      Left m  -> Left (CompileError (Pos 0 0) m)
      Right d -> Right d
    (_, st) <- runC (compileExpr denv True expr >> emit Halt >> resolvePatches) initState
    let entry = Func "main" [] (csCode st) (csConsts st) [] []
    Right (Program entry)

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
compileExpr :: DataEnv -> Bool -> Expr -> CompileM ()
compileExpr denv inTail = \case
  EInt _ i      -> emitConst (CValue (VInt i))
  EFloat _ d    -> emitConst (CValue (VFloat d))
  EBool _ b     -> emitConst (CValue (VBool b))
  EStr _ s      -> emitConst (CValue (VStr s))
  EList _ es    -> do
    mapM_ (compileExpr denv False) es
    emit (MakeList (length es))
  EVar p name   -> resolveRef p name
  EConstr p name -> compileConstr p denv name
  EBuiltin _ b  -> emitConst (CValue (VBuiltin b))
  ELambda p params body -> compileLambda p denv params body
  EApply p fn arg -> case saturatedConstr denv fn arg of
    Just (name, ar, args) -> do
      mapM_ (compileExpr denv False) args
      idx <- dataIdx name ar
      emit (MakeData idx)
    Nothing -> do
      compileExpr denv False fn
      compileExpr denv False arg
      emit (if inTail then TailCall else Call)
  ELet p rec name bound body -> compileLet p rec name denv bound inTail body
  EIf p c t e   -> do
    compileExpr denv False c
    labFalse <- emitJump JKJumpIfFalse
    compileExpr denv inTail t
    labEnd <- emitJump JKJump
    defineLabel labFalse
    compileExpr denv inTail e
    defineLabel labEnd
  EMatch p scrut branches -> compileMatch p denv inTail scrut branches
  EBin p op a b -> do
    compileExpr denv False a
    compileExpr denv False b
    emit (opToInstr p op)
  ENeg p x      -> compileExpr denv False x >> emit Neg
  ENot p x      -> compileExpr denv False x >> emit Not

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

compileLet :: Pos -> Bool -> String -> DataEnv -> Expr -> Bool -> Expr -> CompileM ()
compileLet p rec name denv bound inTail body = case bound of
  ELambda _ params body' -> do
    s <- registerLocal name
    when rec (emit (NewCell s))
    compileLambda p denv params body'
    emit (StoreLocal s)
    compileExpr denv inTail body
  _ | rec -> compileError p ("let rec requires a function value for " <> name)
    | otherwise -> do
        compileExpr denv False bound
        s <- registerLocal name
        emit (StoreLocal s)
        compileExpr denv inTail body

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
compileMatch :: Pos -> DataEnv -> Bool -> Expr -> [(Pattern, Expr)] -> CompileM ()
compileMatch p denv inTail scrut branches = case branches of
  [] -> compileError p "empty match"
  _ -> do
    compileExpr denv False scrut
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
      compilePattern denv varSlot failTarget pat
      emitJumpTo (bodyLabs !! i)
    defineLabel failLab
    emit Fail
    forM_ (zip bodyLabs branches) $ \(bodyLab, (_, body)) -> do
      defineLabel bodyLab
      compileExpr denv inTail body
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
  PNil _        -> []
  PCons _ h t   -> patternVars h ++ patternVars t
  PList _ ps    -> concatMap patternVars ps
  PConstr _ _ ps -> concatMap patternVars ps

-- | Compile a pattern's test chain against the value on top of the operand
-- stack. Each test pops the current value and jumps to the fail target on
-- mismatch. Structural patterns bind their subvalues into anonymous temp
-- slots and re-push them one at a time, so at every point where a test can
-- fail the operand stack holds only the value under test: a failed test
-- always falls out of the chain with a clean stack, ready for the next
-- branch.
compilePattern :: DataEnv -> Map.Map String Int -> Int -> Pattern -> CompileM ()
compilePattern denv varSlot failLab = \case
  PWild _       -> emit Pop
  PVar _ n      -> case Map.lookup n varSlot of
    Just s  -> emit (BindLocal s)
    Nothing -> compileError posZero ("unbound pattern variable: " <> n)
  PInt _ i      -> addConst (CValue (VInt i)) >>= \c -> emitTestTo failLab (\t -> TestInt c t)
  PFloat _ d    -> addConst (CValue (VFloat d)) >>= \c -> emitTestTo failLab (\t -> TestFloat c t)
  PBool _ b     -> addConst (CValue (VBool b)) >>= \c -> emitTestTo failLab (\t -> TestBool c t)
  PStr _ s      -> addConst (CValue (VStr s)) >>= \c -> emitTestTo failLab (\t -> TestStr c t)
  PNil _        -> emitTestTo failLab TestNil
  PCons _ h t   -> do
    emitTestTo failLab TestCons
    headTmp <- registerTempSlot
    tailTmp <- registerTempSlot
    emit (BindLocal headTmp)
    emit (BindLocal tailTmp)
    emit (PushLocal headTmp)
    compilePattern denv varSlot failLab h
    emit (PushLocal tailTmp)
    compilePattern denv varSlot failLab t
  PList _ ps    -> compilePList ps
  PConstr _ name ps -> do
    c <- dataIdx name (length ps)
    emitTestTo failLab (\t -> TestConstr c t)
    temps <- mapM (const registerTempSlot) ps
    mapM_ (\s -> emit (BindLocal s)) temps
    forM_ (zip temps ps) $ \(s, sub) -> do
      emit (PushLocal s)
      compilePattern denv varSlot failLab sub
  where
    compilePList [] = emitTestTo failLab TestNil
    compilePList (pat : rest) = do
      emitTestTo failLab TestCons
      headTmp <- registerTempSlot
      tailTmp <- registerTempSlot
      emit (BindLocal headTmp)
      emit (BindLocal tailTmp)
      emit (PushLocal headTmp)
      compilePattern denv varSlot failLab pat
      emit (PushLocal tailTmp)
      compilePList rest

-- | Compile a lambda. Builds the function, stores it in the enclosing
-- function's constant pool, and emits the closure-construction sequence.
compileLambda :: Pos -> DataEnv -> [String] -> Expr -> CompileM ()
compileLambda _ denv params body = do
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
    })
  compileExpr denv True body
  emit Return
  resolvePatches
  finished <- get
  let headScope = head (csScopes finished)
      code = csCode finished
      consts = csConsts finished
      upvals = [(h, i) | (_, h, i) <- csUpvals headScope]
      upvalNames = [n | (n, _, _) <- csUpvals headScope]
      func = Func ("<lambda" <> show (csLambda finished) <> ">") params code consts upvals upvalNames
  -- restore the enclosing function's state, then register the func
  modify' (\s -> s
    { csScopes = csScopes outer
    , csCode = csCode outer
    , csNextCell = csNextCell outer
    , csConsts = csConsts outer
    , csConstMap = csConstMap outer
    , csLambda = csLambda outer
    , csLabels = csLabels outer
    , csPatches = csPatches outer
    })
  funcIdx <- addConst (CFunc func)
  emit (MakeClosure funcIdx)

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
    CData _ _ -> do
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
    walkOuter k [] = compileError p ("unbound name: " <> name)
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