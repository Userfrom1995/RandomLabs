{-# LANGUAGE LambdaCase #-}
module Halcyon.Compile
  ( compileProgram
  , CompileError(..)
  , disassemble
  , Program(..)
  , Func(..)
  , Instr(..)
  ) where

import Control.Monad (when)
import qualified Data.Map.Strict as Map
import Data.List (intersperse)

import Halcyon.Ast
import Halcyon.Op
import Halcyon.Parser (parseProgram, ParseError(..))
import Halcyon.Token (Pos(..))
import Halcyon.Value

-- | A positioned compile error.
data CompileError = CompileError Pos String
  deriving (Eq, Show)

-- | Compile a source string into a Program. Lexes, parses, then lowers to
-- bytecode with closure/upvalue analysis.
compileProgram :: String -> Either CompileError Program
compileProgram src = case parseProgram src of
  Left (ParseError p m) -> Left (CompileError p m)
  Right expr -> do
    (_, st) <- runC (compileExpr expr >> emit Halt >> resolvePatches) initState
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

compileExpr :: Expr -> CompileM ()
compileExpr = \case
  EInt _ i      -> emitConst (CValue (VInt i))
  EFloat _ d    -> emitConst (CValue (VFloat d))
  EBool _ b     -> emitConst (CValue (VBool b))
  EStr _ s      -> emitConst (CValue (VStr s))
  EList _ es    -> do
    mapM_ compileExpr es
    emit (MakeList (length es))
  EVar p name   -> resolveRef p name
  EBuiltin _ b  -> emitConst (CValue (VBuiltin b))
  ELambda p params body -> compileLambda p params body
  EApply p fn arg -> do
    compileExpr fn
    compileExpr arg
    emit Call
  ELet p rec name bound body -> compileLet p rec name bound body
  EIf p c t e   -> do
    compileExpr c
    labFalse <- emitJump JKJumpIfFalse
    compileExpr t
    labEnd <- emitJump JKJump
    defineLabel labFalse
    compileExpr e
    defineLabel labEnd
  EBin p op a b -> do
    compileExpr a
    compileExpr b
    emit (opToInstr p op)
  ENeg p x      -> compileExpr x >> emit Neg
  ENot p x      -> compileExpr x >> emit Not

compileLet :: Pos -> Bool -> String -> Expr -> Expr -> CompileM ()
compileLet p rec name bound body = case bound of
  ELambda _ params body' -> do
    s <- registerLocal name
    when rec (emit (NewCell s))
    compileLambda p params body'
    emit (StoreLocal s)
    compileExpr body
  _ | rec -> compileError p ("let rec requires a function value for " <> name)
    | otherwise -> do
        compileExpr bound
        s <- registerLocal name
        emit (StoreLocal s)
        compileExpr body

-- | Compile a lambda. Builds the function, stores it in the enclosing
-- function's constant pool, and emits the closure-construction sequence.
compileLambda :: Pos -> [String] -> Expr -> CompileM ()
compileLambda _ params body = do
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
  compileExpr body
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