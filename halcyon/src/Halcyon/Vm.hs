{-# LANGUAGE LambdaCase #-}
module Halcyon.Vm
  ( runVm
  , VmError(..)
  , vmShowValue
  , VmVal(..)
  ) where

import Control.Monad (foldM, mapM, when)
import Data.IORef
import qualified Data.IntMap.Strict as IntMap
import Data.List (intercalate)
import System.IO (hPutStrLn, stderr)

import Halcyon.Ast (Builtin(..), builtinName)
import Halcyon.Op
import Halcyon.Value (Value(..), showFloat)

-- | A VM error (message only; instructions carry no source positions).
newtype VmError = VmError String
  deriving (Eq, Show)

-- | Runtime values of the VM. Closures capture the defining frame's
-- context; upvalues are cells (IORefs) shared with the defining frame.
data VmVal
  = VmInt Integer
  | VmFloat Double
  | VmBool Bool
  | VmStr String
  | VmList [VmVal]
  | VmClosure Func Context
  | VmPartial Func Context [(Int, VmVal)]  -- ^ partially applied: bound param slots
  | VmBuiltin Builtin
  | VmPartialBuiltin Builtin VmVal

-- | A context: the cells of one frame's locals plus the captured context
-- of the closure that created the frame (the lexical chain).
data Context = Context
  { ctxCells :: IntMap.IntMap Cell
  , ctxOuter :: Maybe Context
  }

type Cell = IORef (Maybe VmVal)

data Frame = Frame
  { frFunc :: Func
  , frCtx  :: Context
  , frIp   :: Int
  }

-- | Run a compiled program. Returns the value left on the operand stack at
-- Halt. When @trace@ is True, every executed instruction is printed with
-- the stack state (used by @halcyon run-vm --trace@).
runVm :: Bool -> Program -> IO (Either VmError VmVal)
runVm trace (Program entry) = do
  stackRef <- newIORef []
  framesRef <- newIORef [Frame entry (Context IntMap.empty Nothing) 0]
  run stackRef framesRef
  where
    run stackRef framesRef = loop
      where
        loop = do
          frames <- readIORef framesRef
          case frames of
            [] -> do
              st <- readIORef stackRef
              return $ case st of
                (v : _) -> Right v
                []      -> Left (VmError "operand stack empty at return")
            (f : rest) -> do
              let code = fCode (frFunc f)
                  ip = frIp f
              case code !! ip of
                Halt -> do
                  st <- readIORef stackRef
                  return $ case st of
                    (v : _) -> Right v
                    []      -> Left (VmError "operand stack empty at halt")
                Return -> do
                  writeIORef framesRef rest
                  loop
                instr -> do
                  when trace (traceStep instr)
                  r <- execute instr
                  case r of
                    Left e     -> return (Left e)
                    Right ()   -> loop

        traceStep instr = do
          stack <- readIORef stackRef
          frames <- readIORef framesRef
          let f = head frames
          hPutStrLn stderr
            (show (frIp f) <> ": " <> showInstr instr
             <> "  stack=[" <> intercalate ", " (map vmShowValue stack) <> "]")

        -- Bind inside the Either thread.
        (>>=?) :: IO (Either VmError a) -> (a -> IO (Either VmError ())) -> IO (Either VmError ())
        (>>=?) m k = m >>= \r -> case r of
          Left e  -> return (Left e)
          Right x -> k x

        -- Instruction execution. Each handler returns Right () on success or
        -- Left err to stop the machine.
        execute instr = do
          frames <- readIORef framesRef
          let f = head frames
          case instr of
            PushConst i -> do
              case fConstants (frFunc f) !! i of
                CValue v -> pushS (toVm v) >> bumpIp f >> step
                CFunc _  -> failVm "push_const on a function constant"
            PushLocal s ->
              readCellAt (frCtx f) s >>=? \v -> pushS v >> bumpIp f >> step
            StoreLocal s ->
              popS >>=? \v -> storeCellAt s v >>=? \_ -> bumpIp f >> step
            NewCell s ->
              newEmptyCellAt s >>=? \_ -> bumpIp f >> step
            PushUpvalue h i -> do
              case ctxOuter (frCtx f) of
                Nothing -> failVm "upvalue reference from top-level frame"
                Just outer -> readCellAtWalk h outer i
                  >>=? \v -> pushS v >> bumpIp f >> step
            Pop -> popS >>=? \_ -> bumpIp f >> step
            Add  -> binNum f (+) (+)
            Sub  -> binNum f (-) (-)
            Mul  -> binNum f (*) (*)
            Div  -> binDiv f
            Lt   -> binCmp f (<)  (<)
            Le   -> binCmp f (<=) (<=)
            Gt   -> binCmp f (>)  (>)
            Ge   -> binCmp f (>=) (>=)
            Eq   -> binEq f False
            Ne   -> binEq f True
            And  -> binBool f (&&)
            Or   -> binBool f (||)
            Not  -> unaryNot f
            Neg  -> unaryNeg f
            Jump target -> setIp target
            JumpIfFalse target ->
              popS >>=? \v -> case v of
                VmBool False -> setIp target
                VmBool True  -> bumpIp f >> step
                _            -> failVm ("jump_if_false on non-bool " <> vmShowValue v)
            Call -> do
              rarg <- popS
              rfn <- popS
              case (rarg, rfn) of
                (Left e, _)    -> return (Left e)
                (_, Left e)    -> return (Left e)
                (Right arg, Right fn) -> call f arg fn
            MakeClosure i -> do
              case fConstants (frFunc f) !! i of
                CFunc func -> do
                  r <- validateUpvals (frCtx f) (fUpvals func)
                  case r of
                    Left e   -> return (Left e)
                    Right () -> do
                      pushS (VmClosure func (frCtx f))
                      bumpIp f
                      step
                _ -> failVm "make_closure on non-function constant"
            Cons ->
              popS >>=? \xs -> popS >>=? \x -> case xs of
                VmList l -> pushS (VmList (x : l)) >> bumpIp f >> step
                _        -> failVm ("cons expects a list, got " <> vmShowValue xs)
            Head ->
              popS >>=? \v -> case v of
                VmList (x : _) -> pushS x >> bumpIp f >> step
                VmList []      -> failVm "head of empty list"
                _              -> failVm ("head expects a list, got " <> vmShowValue v)
            Tail ->
              popS >>=? \v -> case v of
                VmList (_ : xs) -> pushS (VmList xs) >> bumpIp f >> step
                VmList []       -> failVm "tail of empty list"
                _               -> failVm ("tail expects a list, got " <> vmShowValue v)
            IsNil ->
              popS >>=? \v -> case v of
                VmList l -> pushS (VmBool (null l)) >> bumpIp f >> step
                _        -> failVm ("isNil expects a list, got " <> vmShowValue v)
            MakeList n -> do
              rvals <- popN n
              case rvals of
                Left e      -> return (Left e)
                Right vals  -> pushS (VmList (reverse vals)) >> bumpIp f >> step

        -- Curried application: every Call applies exactly one argument.
        call f arg fn = case fn of
          VmClosure func captured ->
            let n = length (fParams func)
            in if n == 1
                 then runFrame func captured [(0, arg)]
                 else if n > 1
                   then pushS (VmPartial func captured [(0, arg)]) >> bumpIp f >> step
                   else failVm "function with no parameters"
          VmPartial func captured bound ->
            let n = length (fParams func)
                nextSlot = length bound
                bound' = bound ++ [(nextSlot, arg)]
            in if nextSlot + 1 == n
                 then runFrame func captured bound'
                 else pushS (VmPartial func captured bound') >> bumpIp f >> step
          VmBuiltin b -> applyBuiltin f b arg
          VmPartialBuiltin b x -> case b of
            BCons -> case arg of
              VmList l -> pushS (VmList (x : l)) >> bumpIp f >> step
              _        -> failVm ("cons expects a list, got " <> vmShowValue arg)
            _ -> failVm "internal error: unexpected partial builtin"
          _ -> failVm ("cannot apply " <> vmShowValue fn)

        -- Build a context for a function call and push a fresh frame at ip 0,
        -- advancing the caller's ip past the Call instruction.
        runFrame func captured bound = do
          cellMap <- foldM
            (\m (slot, v) -> do { c <- newIORef (Just v); return (IntMap.insert slot c m) })
            IntMap.empty bound
          let ctx = Context cellMap (Just captured)
          modifyIORef' framesRef (\fs -> case fs of
            (g : rest) -> Frame func ctx 0 : Frame (frFunc g) (frCtx g) (frIp g + 1) : rest
            []         -> [Frame func ctx 0])
          step

        bumpIp f = modifyIORef' framesRef (\fs -> case fs of
          (g : rest) -> Frame (frFunc g) (frCtx g) (frIp g + 1) : rest
          []         -> []) >> step

        setIp ip = modifyIORef' framesRef (\fs -> case fs of
          (g : rest) -> Frame (frFunc g) (frCtx g) ip : rest
          []         -> []) >> step

        step :: IO (Either VmError ())
        step = return (Right ())

        -- Stack helpers
        pushS v = modifyIORef' stackRef (v :)
        popS :: IO (Either VmError VmVal)
        popS = do
          st <- readIORef stackRef
          case st of
            (v : rest) -> writeIORef stackRef rest >> return (Right v)
            []         -> failVm "operand stack underflow"
        popN :: Int -> IO (Either VmError [VmVal])
        popN n = go n
          where
            go 0 = return (Right [])
            go k = do
              rx <- popS
              case rx of
                Left e   -> return (Left e)
                Right x  -> do
                  rxs <- go (k - 1)
                  case rxs of
                    Left e   -> return (Left e)
                    Right xs -> return (Right (x : xs))

        -- Numeric / comparison / boolean helpers (mirroring the interpreter).
        binNum f fi ff = twoArg (\a b -> num2 a b fi ff) (\v -> pushS v >> bumpIp f >> step)
        binDiv f = twoArg div2 (\v -> pushS v >> bumpIp f >> step)
        binCmp f fi ff = twoArg (\a b -> cmp2 a b fi ff) (\v -> pushS v >> bumpIp f >> step)
        binEq f negateRes = twoArg eq2 (\v -> pushS (if negateRes then vmNot v else v) >> bumpIp f >> step)
        binBool f g = twoArg (\a b -> case (a, b) of
          (VmBool x, VmBool y) -> Right (VmBool (g x y))
          _ -> Left "boolean operator on non-bool operands")
          (\v -> pushS v >> bumpIp f >> step)

        twoArg :: (VmVal -> VmVal -> Either String VmVal)
               -> (VmVal -> IO (Either VmError ()))
               -> IO (Either VmError ())
        twoArg op k = do
          rb <- popS
          ra <- popS
          case (ra, rb) of
            (Left e, _)    -> return (Left e)
            (_, Left e)    -> return (Left e)
            (Right a, Right b) -> case op a b of
              Right v -> k v
              Left msg -> failVm msg

        unaryNot f =
          popS >>=? \v -> case v of
            VmBool x -> pushS (VmBool (not x)) >> bumpIp f >> step
            _        -> failVm ("cannot apply ! to " <> vmShowValue v)

        unaryNeg f =
          popS >>=? \v -> case v of
            VmInt i   -> pushS (VmInt (negate i)) >> bumpIp f >> step
            VmFloat d -> pushS (VmFloat (negate d)) >> bumpIp f >> step
            _         -> failVm ("cannot negate " <> vmShowValue v)

        applyBuiltin f b arg = case b of
          BCons  -> pushS (VmPartialBuiltin BCons arg) >> bumpIp f >> step
          BHead  -> case arg of
            VmList (x : _) -> pushS x >> bumpIp f >> step
            VmList []      -> failVm "head of empty list"
            _              -> failVm ("head expects a list, got " <> vmShowValue arg)
          BTail  -> case arg of
            VmList (_ : xs) -> pushS (VmList xs) >> bumpIp f >> step
            VmList []       -> failVm "tail of empty list"
            _               -> failVm ("tail expects a list, got " <> vmShowValue arg)
          BIsNil -> case arg of
            VmList l -> pushS (VmBool (null l)) >> bumpIp f >> step
            _        -> failVm ("isNil expects a list, got " <> vmShowValue arg)

        -- Numeric promotion (Int + Float -> Float within an arithmetic op).
        num2 a b fi ff = case (a, b) of
          (VmInt x, VmInt y)     -> Right (VmInt (fi x y))
          (VmFloat x, VmFloat y) -> Right (VmFloat (ff x y))
          (VmInt x, VmFloat y)   -> Right (VmFloat (ff (fromIntegral x) y))
          (VmFloat x, VmInt y)   -> Right (VmFloat (ff x (fromIntegral y)))
          _ -> Left ("operator + requires numeric operands, got "
                     <> vmShowValue a <> " and " <> vmShowValue b)

        div2 a b = case (a, b) of
          (VmInt x, VmInt y)     | y == 0 -> Left "division by zero"
          (VmInt x, VmInt y)     -> Right (VmInt (x `div` y))
          (VmFloat x, VmFloat y) | y == 0 -> Left "division by zero"
          (VmFloat x, VmFloat y) -> Right (VmFloat (x / y))
          (VmInt x, VmFloat y)   -> Right (VmFloat (fromIntegral x / y))
          (VmFloat x, VmInt y)   | y == 0 -> Left "division by zero"
          (VmFloat x, VmInt y)   -> Right (VmFloat (x / fromIntegral y))
          _ -> Left ("operator / requires numeric operands, got "
                     <> vmShowValue a <> " and " <> vmShowValue b)

        cmp2 a b fi ff = case (a, b) of
          (VmInt x, VmInt y)     -> Right (VmBool (fi x y))
          (VmFloat x, VmFloat y) -> Right (VmBool (ff x y))
          (VmInt x, VmFloat y)   -> Right (VmBool (ff (fromIntegral x) y))
          (VmFloat x, VmInt y)   -> Right (VmBool (ff x (fromIntegral y)))
          _ -> Left ("comparison requires numeric operands, got "
                     <> vmShowValue a <> " and " <> vmShowValue b)

        eq2 a b = case (a, b) of
          (VmInt x, VmInt y)     -> Right (VmBool (x == y))
          (VmFloat x, VmFloat y) -> Right (VmBool (x == y))
          (VmInt x, VmFloat y)   -> Right (VmBool (fromIntegral x == y))
          (VmFloat x, VmInt y)   -> Right (VmBool (x == fromIntegral y))
          (VmBool x, VmBool y)   -> Right (VmBool (x == y))
          (VmStr x, VmStr y)     -> Right (VmBool (x == y))
          (VmList x, VmList y)   -> eqLists x y
          (VmClosure{}, _)       -> Left "cannot compare functions"
          (_, VmClosure{})       -> Left "cannot compare functions"
          (VmPartial{}, _)       -> Left "cannot compare functions"
          (_, VmPartial{})       -> Left "cannot compare functions"
          _ -> Left ("cannot compare " <> vmShowValue a <> " and " <> vmShowValue b)

        eqLists [] [] = Right (VmBool True)
        eqLists (x : xs) (y : ys) = case eq2 x y of
          Right (VmBool True)  -> eqLists xs ys
          Right (VmBool False) -> Right (VmBool False)
          Right _              -> Right (VmBool False)
          Left e               -> Left e
        eqLists _ _ = Right (VmBool False)

        vmNot (VmBool b) = VmBool (not b)
        vmNot v = v

        -- Context helpers. All return IO (Either VmError a) so they compose
        -- with the (>>=?) bind used by the instruction handlers.
        readCellAt ctx s = case IntMap.lookup s (ctxCells ctx) of
          Just c -> readIORef c >>= maybe (failVm ("uninitialized local at slot " <> show s)) (return . Right)
          Nothing -> failVm ("no local at slot " <> show s)

        storeCellAt s v = do
          frames <- readIORef framesRef
          case frames of
            (g : rest) -> do
              let ctx = frCtx g
              case IntMap.lookup s (ctxCells ctx) of
                Just c -> writeIORef c (Just v) >> step
                Nothing -> do
                  c <- newIORef (Just v)
                  let ctx' = ctx { ctxCells = IntMap.insert s c (ctxCells ctx) }
                  writeIORef framesRef (Frame (frFunc g) ctx' (frIp g) : rest)
                  step
            [] -> step

        newEmptyCellAt s = do
          c <- newIORef Nothing
          modifyIORef' framesRef (\fs -> case fs of
            (g : rest) ->
              let ctx = frCtx g
              in Frame (frFunc g) (ctx { ctxCells = IntMap.insert s c (ctxCells ctx) }) (frIp g) : rest
            [] -> [])
          step

        readCellAtWalk h ctx i = do
          r <- walkCtx h ctx
          case r of
            Left e   -> return (Left e)
            Right c  -> readCellAt c i

        validateUpvals ctx upvals = do
          results <- mapM check upvals
          case results of
            []         -> step
            (Left e : _) -> return (Left e)
            (_ : rest) -> case dropWhile isRight results of
              (Left e : _) -> return (Left e)
              _            -> step
          where
            isRight (Right _) = True
            isRight (Left _)  = False
            check (h, i) = do
              r <- walkCtx h ctx
              case r of
                Left e   -> return (Left e)
                Right c  -> case IntMap.lookup i (ctxCells c) of
                  Just _  -> return (Right ())
                  Nothing -> failVm ("upvalue cell not found at " <> show i)

        walkCtx 0 ctx = return (Right ctx)
        walkCtx n ctx = case ctxOuter ctx of
          Just o  -> walkCtx (n - 1) o
          Nothing -> failVm "upvalue chain exhausted"

        failVm :: String -> IO (Either VmError a)
        failVm msg = return (Left (VmError msg))

-- | Convert a Value (used in constant pools) to a VM value.
toVm :: Value -> VmVal
toVm = \case
  VInt i     -> VmInt i
  VFloat d   -> VmFloat d
  VBool b    -> VmBool b
  VStr s     -> VmStr s
  VList vs   -> VmList (map toVm vs)
  VBuiltin b -> VmBuiltin b
  VPartial b v -> VmPartialBuiltin b (toVm v)
  VClosure{} -> error "interpreter closure cannot enter VM constants"

-- | Render a VM value as program output, mirroring 'Halcyon.Value.showValue'
-- so interpreter and VM produce byte-identical output.
vmShowValue :: VmVal -> String
vmShowValue = \case
  VmInt i        -> show i
  VmFloat d      -> showFloat d
  VmBool True    -> "true"
  VmBool False   -> "false"
  VmStr s        -> s
  VmList vs      -> "[" <> intercalate ", " (map vmShowValue vs) <> "]"
  VmClosure{}    -> "<function>"
  VmPartial{}    -> "<function>"
  VmBuiltin b    -> "<builtin: " <> builtinName b <> ">"
  VmPartialBuiltin b x -> "<builtin: " <> builtinName b <> " " <> vmShowValue x <> ">"