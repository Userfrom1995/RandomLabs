{-# LANGUAGE LambdaCase #-}
module Halcyon.Vm
  ( runVm
  , runVmProfiled
  , runVmEffect
  , Profile(..)
  , renderProfile
  , statsLine
  , VmError(..)
  , vmShowValue
  , VmVal(..)
  ) where

import Control.Monad (foldM, mapM, when)
import Data.IORef
import qualified Data.IntMap.Strict as IntMap
import qualified Data.Map.Strict as Map
import Data.List (intercalate, isInfixOf, sortBy)
import System.IO (hPutStrLn, stderr)

import Halcyon.Ast (Builtin(..), builtinName)
import Halcyon.Op
import Halcyon.Classes (unifyHead)
import Halcyon.Value (Value(..), showFloat, showCharLit)
import qualified Halcyon.Type

-- | A VM error (message only; instructions carry no source positions).
newtype VmError = VmError String
  deriving (Eq, Show)

-- | Runtime values of the VM. Closures capture the defining frame's
-- context; upvalues are cells (IORefs) shared with the defining frame.
-- @VmConstr@ is a partially applied data constructor (name, total arity,
-- accumulated arguments); a fully applied constructor is @VmData@.
data VmVal
  = VmInt Integer
  | VmFloat Double
  | VmBool Bool
  | VmStr String
  | VmChar Char
  | VmList [VmVal]
  | VmClosure Func Context
  | VmPartial Func Context [(Int, VmVal)]  -- ^ partially applied: bound param slots
  | VmBuiltin Builtin
  | VmPartialBuiltin Builtin [VmVal]       -- ^ partial curried builtin: accumulated args
  | VmData String [VmVal]
  | VmConstr String Int [VmVal]
  | VmRec String [(String, VmVal)]
  | VmVMethod String                -- ^ a class method reference, dispatched by value type
  | VmDict String [(String, VmVal)] -- ^ an instance dictionary: method name -> implementation
  | VmUnit                          -- ^ the unit value @()@
  | VmEffect String [VmVal]         -- ^ an unevaluated effect (mirrors 'Value.VEffect')

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

-- | A profiling report for a VM run: total instructions executed, per-opcode
-- counts, per-function call counts, and the peak operand-stack and frame
-- depths reached. The counts are deterministic: opcodes and functions are
-- sorted by descending count (ties keep name order).
data Profile = Profile
  { pTotal      :: Int
  , pOpCounts   :: [(String, Int)]
  , pCallCounts :: [(String, Int)]
  , pPeakStack  :: Int
  , pPeakFrames :: Int
  } deriving (Show)

-- | Mutable profiling state threaded through the interpreter loop.
data ProfileState = ProfileState
  { psTotal      :: IORef Int
  , psOps        :: IORef (Map.Map String Int)
  , psCalls      :: IORef (Map.Map String Int)
  , psPeakStack  :: IORef Int
  , psPeakFrames :: IORef Int
  }

-- | Run a compiled program. Returns the value left on the operand stack at
-- Halt. When @trace@ is True, every executed instruction is printed with
-- the stack state (used by @halcyon run-vm --trace@). Method dispatch uses
-- the program's dictionary table (@pDicts@) against the entry function.
runVm :: Bool -> Program -> IO (Either VmError VmVal)
runVm trace prog = do
  r <- runVmProfiled trace prog
  return $ case r of
    Left e        -> Left e
    Right (v, _)  -> Right v

-- | Like 'runVm' but also collects a profiling report. Profiling is pure
-- bookkeeping: the returned value and every runtime error are identical to a
-- non-profiled run, which the differential corpus verifies.
runVmProfiled :: Bool -> Program -> IO (Either VmError (VmVal, Profile))
runVmProfiled trace prog@(Program entry _ _) = do
  stackRef <- newIORef []
  framesRef <- newIORef [Frame entry (Context IntMap.empty Nothing) 0]
  prof <- newProfileState
  r <- runMachine trace (Just prof) prog stackRef framesRef
  case r of
    Left e -> return (Left e)
    Right v -> do
      p <- freezeProfile prof
      return (Right (v, p))
  where
    newProfileState = ProfileState
      <$> newIORef 0
      <*> newIORef Map.empty
      <*> newIORef Map.empty
      <*> newIORef 0
      <*> newIORef 0

    freezeProfile st = do
      total <- readIORef (psTotal st)
      ops <- readIORef (psOps st)
      calls <- readIORef (psCalls st)
      stack <- readIORef (psPeakStack st)
      frames <- readIORef (psPeakFrames st)
      return (Profile total (sortCounts ops) (sortCounts calls) stack frames)

    -- Deterministic ordering: count descending, then name ascending.
    sortCounts = sortBy (\a b -> compare (snd b) (snd a) <> compare (fst a) (fst b)) . Map.toList

-- | Run a compiled program as an effect: execute it, then drive any effect
-- result through the pure effect runner with the given scripted input lines.
-- The runner applies @bind@ continuations by executing the captured closure
-- in a fresh machine with the accumulated argument bound as its first
-- parameter. Returns the accumulated output text and the final result.
runVmEffect :: Program -> [String] -> IO (Either VmError (String, VmVal))
runVmEffect prog inputs = do
  r <- runVm False prog
  case r of
    Left e -> return (Left e)
    Right v -> runEffectValue v inputs
  where
    runEffectValue v inputs0 = case v of
      VmEffect{} -> do
        r0 <- runOne v inputs0
        case r0 of
          Left e -> return (Left e)
          Right (out, res, _) -> return (Right (out, res))
      _ -> return (Right ("", v))

    runOne :: VmVal -> [String] -> IO (Either VmError (String, VmVal, [String]))
    runOne eff is = case eff of
      VmEffect "return" [r]     -> return (Right ("", r, is))
      VmEffect "print" [p]      -> return (Right (vmShowValue p, VmUnit, is))
      VmEffect "printLine" [p]  -> return (Right (vmShowValue p <> "\n", VmUnit, is))
      VmEffect "readLine" []    -> case is of
        (l : ls) -> return (Right ("", VmStr l, ls))
        []       -> return (Right ("", VmStr "", []))
      VmEffect "bind" [e, k]    -> do
        rE <- runOne e is
        case rE of
          Left err -> return (Left err)
          Right (outE, vE, is') -> do
            rK <- applyK k vE
            case rK of
              Left err -> return (Left err)
              Right eff2 -> do
                r2 <- runOne eff2 is'
                case r2 of
                  Left err -> return (Left err)
                  Right (out2, v2, is'') -> return (Right (outE <> out2, v2, is''))
      _ -> return (Left (VmError ("not an effect: " <> vmShowValue eff)))

    applyK :: VmVal -> VmVal -> IO (Either VmError VmVal)
    applyK k v = case k of
      VmClosure func captured -> do
        cellMap <- foldM
          (\m (slot, vv) -> do { c <- newIORef (Just vv); return (IntMap.insert slot c m) })
          IntMap.empty [(0, v)]
        stackRef' <- newIORef []
        framesRef' <- newIORef [Frame func (Context cellMap (Just captured)) 0]
        runMachine False Nothing prog stackRef' framesRef'
      VmPartial{} -> return (Left (VmError "bind continuation must take exactly one argument"))
      _ -> return (Left (VmError ("bind continuation is not a function: " <> vmShowValue k)))

-- | Run the machine from an existing operand stack and frame stack until it
-- halts. The frame stack must hold the initial frame; Halt returns the value
-- left on top of the operand stack. Shared by plain runs, profiling runs,
-- and the effect runner (which executes @bind@ continuations in fresh
-- machines).
runMachine :: Bool -> Maybe ProfileState -> Program -> IORef [VmVal] -> IORef [Frame] -> IO (Either VmError VmVal)
runMachine trace prof (Program entry dicts ctors) stackRef framesRef = loop
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
              instr = code !! ip
          recordProf prof instr frames
          case instr of
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

    -- Per-instruction profiler bookkeeping (a no-op when not profiling).
    recordProf Nothing _ _ = return ()
    recordProf (Just st) instr frames = do
      modifyIORef' (psTotal st) (+ 1)
      modifyIORef' (psOps st) (Map.insertWith (+) (opName instr) 1)
      modifyIORef' (psPeakFrames st) (max (length frames))

    -- The mnemonic of an instruction (the first word of its disassembly).
    opName = takeWhile (/= ' ') . showInstr

    -- Count one function call in the profiler (keyed by function name).
    countCall :: Maybe ProfileState -> String -> IO ()
    countCall (Just st) name =
      modifyIORef' (psCalls st) (Map.insertWith (+) name 1)
    countCall Nothing _ = return ()

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
            CData _ _ -> failVm "push_const on a constructor constant"
            CFunc _  -> failVm "push_const on a function constant"
            CMethod m -> pushS (VmVMethod m) >> bumpIp f >> step
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
        Add  -> binAdd f
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
        PushConstr i -> do
          case fConstants (frFunc f) !! i of
            CData name ar -> pushS (VmConstr name ar []) >> bumpIp f >> step
            _             -> failVm "push_constr on non-constructor constant"
        MakeData i -> do
          case fConstants (frFunc f) !! i of
            CData name ar -> do
              rvals <- popN ar
              case rvals of
                Left e     -> return (Left e)
                Right vals -> pushS (VmData name (reverse vals)) >> bumpIp f >> step
            _ -> failVm "make_data on non-constructor constant"
        BindLocal s ->
          popS >>=? \v -> storeCellAt s v >>=? \_ -> bumpIp f >> step
        TestNil target ->
          popS >>=? \v -> case v of
            VmList [] -> bumpIp f >> step
            VmList _  -> setIp target
            _         -> failVm ("test_nil on non-list " <> vmShowValue v)
        TestCons target ->
          popS >>=? \v -> case v of
            VmList (x : xs) -> pushS (VmList xs) >> pushS x >> bumpIp f >> step
            VmList []       -> setIp target
            _               -> failVm ("test_cons on non-list " <> vmShowValue v)
        TestConstr c target -> do
          case fConstants (frFunc f) !! c of
            CData name ar -> do
              rv <- popS
              case rv of
                Left e -> return (Left e)
                Right (VmData n fs)
                  | n == name && length fs == ar ->
                      mapM_ pushS (reverse fs) >> bumpIp f >> step
                  | otherwise -> setIp target
                Right v -> failVm ("test_constr on non-data value " <> vmShowValue v)
            _ -> failVm "test_constr on non-constructor constant"
        TestInt c target ->
          testLit f c target (\lit v -> case (lit, v) of
            (VmInt i, VmInt j) -> i == j
            _                  -> False)
        TestFloat c target ->
          testLit f c target (\lit v -> case (lit, v) of
            (VmFloat a, VmFloat b) -> a == b
            _                      -> False)
        TestBool c target ->
          testLit f c target (\lit v -> case (lit, v) of
            (VmBool a, VmBool b) -> a == b
            _                    -> False)
        TestStr c target ->
          testLit f c target (\lit v -> case (lit, v) of
            (VmStr a, VmStr b) -> a == b
            _                  -> False)
        TestChar c target ->
          testLit f c target (\lit v -> case (lit, v) of
            (VmChar a, VmChar b) -> a == b
            _                    -> False)
        MakeRecord c ar -> do
          case fConstants (frFunc f) !! c of
            CRec name fields -> do
              rvals <- popN ar
              case rvals of
                Left e      -> return (Left e)
                Right vals  -> do
                  -- The compiler pushes field values in declared order,
                  -- so values already line up with the field names.
                  let rec = VmRec name (zip fields (reverse vals))
                  pushS rec >> bumpIp f >> step
            _ -> failVm "make_record on non-record constant"
        GetField c -> do
          case fConstants (frFunc f) !! c of
            CField name -> do
              rv <- popS
              case rv of
                Left e -> return (Left e)
                Right (VmRec _ fs) -> case lookup name fs of
                  Just v  -> pushS v >> bumpIp f >> step
                  Nothing -> failVm ("no field " <> name <> " in record value")
                Right v -> failVm ("get_field on non-record value " <> vmShowValue v)
            _ -> failVm "get_field on non-field constant"
        UpdateField c -> do
          case fConstants (frFunc f) !! c of
            CField name -> do
              rnv <- popS
              rv <- popS
              case (rnv, rv) of
                (Left e, _)    -> return (Left e)
                (_, Left e)    -> return (Left e)
                (Right nv, Right (VmRec rn fs)) -> do
                  let fs' = map (\case
                                  (f, v) | f == name -> (name, nv)
                                  other               -> other) fs
                  pushS (VmRec rn fs') >> bumpIp f >> step
                (_, Right v) -> failVm ("update_field on non-record value " <> vmShowValue v)
            _ -> failVm "update_field on non-field constant"
        TestRecord c target -> do
          case fConstants (frFunc f) !! c of
            CRec name fields -> do
              rv <- popS
              case rv of
                Left e -> return (Left e)
                Right (VmRec rn fs)
                  | rn == name && length fs == length fields ->
                      mapM_ pushS (reverse (map snd fs)) >> bumpIp f >> step
                  | otherwise -> setIp target
                Right v -> failVm ("test_record on non-record value " <> vmShowValue v)
            _ -> failVm "test_record on non-record constant"
        Fail -> failVm "no matching pattern"
        TailCall -> do
          rarg <- popS
          rfn <- popS
          case (rarg, rfn) of
            (Left e, _)    -> return (Left e)
            (_, Left e)    -> return (Left e)
            (Right arg, Right fn) -> tailCall f arg fn

    -- Pattern literal tests: compare the popped value against a literal
    -- constant-pool entry; jump to the fail target on mismatch, else
    -- continue. The caller supplies the equality on a pair of matching
    -- VM values (Int/Int, Float/Float, ...), monomorphic per test.
    testLit :: Frame -> Int -> Int -> (VmVal -> VmVal -> Bool) -> IO (Either VmError ())
    testLit f c target eq = do
      rv <- popS
      case rv of
        Left e -> return (Left e)
        Right v -> case fConstants (frFunc f) !! c of
          CValue lit -> if eq (toVm lit) v then bumpIp f >> step else setIp target
          _          -> failVm "test on non-literal constant"

    -- Curried application: every Call applies exactly one argument.
    call f arg fn = case fn of
      VmClosure func captured ->
        let n = length (fParams func)
        in countCall prof (fName func) >>
             (if n == 1
                then runFrame func captured [(0, arg)]
                else if n > 1
                  then pushS (VmPartial func captured [(0, arg)]) >> bumpIp f >> step
                  else failVm "function with no parameters")
      VmPartial func captured bound ->
        let n = length (fParams func)
            nextSlot = length bound
            bound' = bound ++ [(nextSlot, arg)]
        in countCall prof (fName func) >>
             (if nextSlot + 1 == n
                then runFrame func captured bound'
                else pushS (VmPartial func captured bound') >> bumpIp f >> step)
      VmConstr name ar as ->
        let as' = as ++ [arg]
        in if length as' == ar
             then pushS (VmData name as') >> bumpIp f >> step
             else pushS (VmConstr name ar as') >> bumpIp f >> step
      VmBuiltin b -> applyBuiltin f b arg
      VmPartialBuiltin b xs -> applyPartialBuiltin f b (xs ++ [arg])
      VmVMethod mname -> dispatchMethod f arg mname
      _ -> failVm ("cannot apply " <> vmShowValue fn)

    -- Dispatch a class method reference to the argument value: find the
    -- instance dictionary whose head matches the argument's runtime type
    -- tag, look up the compiled method function (an entry constant), and
    -- run it in a frame capturing the entry context (so instance method
    -- bodies can reach top-level definitions as entry-frame upvalues).
    dispatchMethod :: Frame -> VmVal -> String -> IO (Either VmError ())
    dispatchMethod f arg mname = do
      let tag = vmTypeOf ctors arg
          hits = [(cn, e) | (cn, es) <- dicts, e <- es,
                   mname `elem` map fst (deMethods e), unifyHead (deHead e) tag]
      case hits of
        ((cn, de) : _) ->
          case lookup mname (deMethods de) of
            Nothing -> failVm ("class " <> cn <> " has no method " <> mname)
            Just idx -> case fConstants entry !! idx of
              CFunc func -> do
                let entryCtx = bottomCtx (frCtx f)
                countCall prof (fName func)
                call f arg (VmClosure func entryCtx)
              _ -> failVm ("instance method is not a function: " <> mname)
        [] -> failVm ("no instance for method " <> mname <> " on " <> vmShowValue arg)

    -- The entry context: walk the current frame's captured context chain
    -- to its root (top-level frame), whose cells hold the compiled
    -- top-level definitions.
    bottomCtx :: Context -> Context
    bottomCtx ctx = case ctxOuter ctx of
      Just o  -> bottomCtx o
      Nothing -> ctx

    -- Tail call: apply one argument and, when the call completes a
    -- function, reuse the current frame instead of pushing a new one
    -- (constant-stack recursion). Partial applications in tail position
    -- cannot reuse the frame; their partial value is simply returned.
    tailCall f arg fn = case fn of
      VmClosure func captured ->
        let n = length (fParams func)
        in if n == 1
             then countCall prof (fName func) >> runTailFrame func captured [(0, arg)]
             else if n > 1
               then pushS (VmPartial func captured [(0, arg)]) >> popFrame
               else failVm "function with no parameters"
      VmPartial func captured bound ->
        let n = length (fParams func)
            nextSlot = length bound
            bound' = bound ++ [(nextSlot, arg)]
        in if nextSlot + 1 == n
             then countCall prof (fName func) >> runTailFrame func captured bound'
             else pushS (VmPartial func captured bound') >> popFrame
      VmConstr name ar as ->
        let as' = as ++ [arg]
        in if length as' == ar
             then pushS (VmData name as') >> popFrame
             else pushS (VmConstr name ar as') >> popFrame
      VmBuiltin b -> applyBuiltin f b arg >>=? \_ -> popFrame
      VmPartialBuiltin b xs -> applyPartialBuiltin f b (xs ++ [arg]) >>=? \_ -> popFrame
      VmVMethod mname -> dispatchMethodTail f arg mname
      _ -> failVm ("cannot apply " <> vmShowValue fn)

    -- Tail-position method dispatch: like 'dispatchMethod' but the method
    -- frame replaces the current one (constant-stack recursive dispatch).
    dispatchMethodTail :: Frame -> VmVal -> String -> IO (Either VmError ())
    dispatchMethodTail f arg mname = do
      let tag = vmTypeOf ctors arg
          hits = [(cn, e) | (cn, es) <- dicts, e <- es,
                   mname `elem` map fst (deMethods e), unifyHead (deHead e) tag]
      case hits of
        ((_, de) : _) ->
          case lookup mname (deMethods de) of
            Nothing -> failVm ("no method " <> mname <> " in instance")
            Just idx -> case fConstants entry !! idx of
              CFunc func -> do
                let entryCtx = bottomCtx (frCtx f)
                countCall prof (fName func)
                tailCall f arg (VmClosure func entryCtx)
              _ -> failVm ("instance method is not a function: " <> mname)
        [] -> failVm ("no instance for method " <> mname <> " on " <> vmShowValue arg)

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

    -- Build a context and REPLACE the current frame with the callee at
    -- ip 0 (tail call): the frame count stays constant.
    runTailFrame func captured bound = do
      cellMap <- foldM
        (\m (slot, v) -> do { c <- newIORef (Just v); return (IntMap.insert slot c m) })
        IntMap.empty bound
      let ctx = Context cellMap (Just captured)
      modifyIORef' framesRef (\fs -> case fs of
        (g : rest) -> Frame func ctx 0 : rest
        []         -> [Frame func ctx 0])
      step

    -- Pop the current frame, leaving its result on the operand stack
    -- (Return semantics, used by partial-application tail calls).
    popFrame = modifyIORef' framesRef (\fs -> case fs of
      (_ : rest) -> rest
      []         -> []) >> step

    bumpIp f = modifyIORef' framesRef (\fs -> case fs of
      (g : rest) -> Frame (frFunc g) (frCtx g) (frIp g + 1) : rest
      []         -> []) >> step

    setIp ip = modifyIORef' framesRef (\fs -> case fs of
      (g : rest) -> Frame (frFunc g) (frCtx g) ip : rest
      []         -> []) >> step

    step :: IO (Either VmError ())
    step = return (Right ())

    -- Stack helpers. pushS also tracks the peak operand-stack depth for
    -- the profiler.
    pushS v = do
      modifyIORef' stackRef (v :)
      case prof of
        Just st -> do
          stk <- readIORef stackRef
          modifyIORef' (psPeakStack st) (max (length stk))
        Nothing -> return ()
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
    binAdd f = twoArg add2 (\v -> pushS v >> bumpIp f >> step)
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

    -- The number of arguments a builtin needs before it can run.
    vmArity :: Builtin -> Int
    vmArity = \case
      BCons   -> 2
      BAppend -> 2
      BTake   -> 2
      BDrop   -> 2
      BCharAt -> 2
      BSubstr -> 3
      BStrAppend  -> 2
      BStrContains -> 2
      BBind   -> 2
      BReadLine -> 0
      _       -> 1

    -- Apply one more argument to a curried builtin partial, completing
    -- once it has accumulated enough arguments (mirrors the
    -- interpreter's applyPartial).
    applyPartialBuiltin f b xs
      | length xs < vmArity b = pushS (VmPartialBuiltin b xs) >> bumpIp f >> step
      | otherwise             = completeBuiltin f b xs

    -- Run a fully-applied builtin, pushing the result (mirrors the
    -- interpreter's completeBuiltin).
    completeBuiltin :: Frame -> Builtin -> [VmVal] -> IO (Either VmError ())
    completeBuiltin f b xs = case (b, xs) of
      (BCons, [x, VmList l])     -> pushS (VmList (x : l)) >> bumpIp f >> step
      (BCons, [_, v])            -> failVm ("cons expects a list, got " <> vmShowValue v)
      (BHead, [VmList (x : _)])  -> pushS x >> bumpIp f >> step
      (BHead, [VmList []])       -> failVm "head of empty list"
      (BHead, [v])               -> failVm ("head expects a list, got " <> vmShowValue v)
      (BTail, [VmList (_ : l)])  -> pushS (VmList l) >> bumpIp f >> step
      (BTail, [VmList []])       -> failVm "tail of empty list"
      (BTail, [v])               -> failVm ("tail expects a list, got " <> vmShowValue v)
      (BIsNil, [VmList l])       -> pushS (VmBool (null l)) >> bumpIp f >> step
      (BIsNil, [v])              -> failVm ("isNil expects a list, got " <> vmShowValue v)
      (BLength, [VmList l])      -> pushS (VmInt (fromIntegral (length l))) >> bumpIp f >> step
      (BLength, [v])             -> failVm ("length expects a list, got " <> vmShowValue v)
      (BReverse, [VmList l])     -> pushS (VmList (reverse l)) >> bumpIp f >> step
      (BReverse, [v])            -> failVm ("reverse expects a list, got " <> vmShowValue v)
      (BAppend, [VmList l1, VmList l2]) -> pushS (VmList (l1 <> l2)) >> bumpIp f >> step
      (BAppend, [_, v])          -> failVm ("append expects a list, got " <> vmShowValue v)
      (BTake, [VmInt n, VmList l]) -> pushS (VmList (take (max 0 (fromIntegral n)) l)) >> bumpIp f >> step
      (BTake, [_, v])            -> failVm ("take expects a list, got " <> vmShowValue v)
      (BTake, [v])               -> failVm ("take expects an Int count, got " <> vmShowValue v)
      (BDrop, [VmInt n, VmList l]) -> pushS (VmList (drop (max 0 (fromIntegral n)) l)) >> bumpIp f >> step
      (BDrop, [_, v])            -> failVm ("drop expects a list, got " <> vmShowValue v)
      (BDrop, [v])               -> failVm ("drop expects an Int count, got " <> vmShowValue v)
      (BIntToStr, [VmInt i])     -> pushS (VmStr (show i)) >> bumpIp f >> step
      (BIntToStr, [v])           -> failVm ("intToStr expects an Int, got " <> vmShowValue v)
      (BFloatToStr, [VmFloat d]) -> pushS (VmStr (showFloat d)) >> bumpIp f >> step
      (BFloatToStr, [v])         -> failVm ("floatToStr expects a Float, got " <> vmShowValue v)
      (BBoolToStr, [VmBool b])   -> pushS (VmStr (if b then "true" else "false")) >> bumpIp f >> step
      (BBoolToStr, [v])          -> failVm ("boolToStr expects a Bool, got " <> vmShowValue v)
      (BStrToStr, [VmStr s])     -> pushS (VmStr s) >> bumpIp f >> step
      (BStrToStr, [v])           -> failVm ("strToStr expects a String, got " <> vmShowValue v)
      (BListToStr, [v@(VmList _)]) -> pushS (VmStr (vmShowValue v)) >> bumpIp f >> step
      (BListToStr, [v])          -> failVm ("listToStr expects a list, got " <> vmShowValue v)
      (BStrLen, [VmStr s])       -> pushS (VmInt (fromIntegral (length s))) >> bumpIp f >> step
      (BStrLen, [v])             -> failVm ("strLen expects a String, got " <> vmShowValue v)
      (BCharAt, [VmStr s, VmInt i])
        | i < 0 || i >= fromIntegral (length s) ->
            failVm ("charAt index " <> show i <> " out of range for a string of length " <> show (length s))
        | otherwise -> pushS (VmChar (s !! fromIntegral i)) >> bumpIp f >> step
      (BCharAt, [VmStr s, v])    -> failVm ("charAt expects an Int index, got " <> vmShowValue v)
      (BCharAt, [v])             -> failVm ("charAt expects a String, got " <> vmShowValue v)
      (BSubstr, [VmStr s, VmInt start, VmInt len])
        | len < 0 -> failVm "substr length must be non-negative"
        | otherwise ->
            pushS (VmStr (take (fromIntegral len) (drop (fromIntegral (max 0 start)) s))) >> bumpIp f >> step
      (BSubstr, [VmStr s, v])    -> failVm ("substr expects an Int start, got " <> vmShowValue v)
      (BSubstr, [v])             -> failVm ("substr expects a String, got " <> vmShowValue v)
      (BStrAppend, [VmStr a, VmStr b]) -> pushS (VmStr (a <> b)) >> bumpIp f >> step
      (BStrAppend, [_, v])       -> failVm ("strAppend expects a String, got " <> vmShowValue v)
      (BStrAppend, [v])          -> failVm ("strAppend expects a String, got " <> vmShowValue v)
      (BStrContains, [VmStr hay, VmStr needle]) ->
          pushS (VmBool (needle `isInfixOf` hay)) >> bumpIp f >> step
      (BStrContains, [_, v])     -> failVm ("strContains expects a String, got " <> vmShowValue v)
      (BStrContains, [v])        -> failVm ("strContains expects a String, got " <> vmShowValue v)
      (BStr, [v])                -> pushS (VmStr (vmShowValue v)) >> bumpIp f >> step
      (BReturn, [v])             -> pushS (VmEffect "return" [v]) >> bumpIp f >> step
      (BBind, [e, k])            -> pushS (VmEffect "bind" [e, k]) >> bumpIp f >> step
      (BPrint, [v])              -> pushS (VmEffect "print" [v]) >> bumpIp f >> step
      (BPrintLine, [v])          -> pushS (VmEffect "printLine" [v]) >> bumpIp f >> step
      _                          -> failVm "internal error: unexpected builtin application"

    applyBuiltin f b arg
      | vmArity b > 1 = pushS (VmPartialBuiltin b [arg]) >> bumpIp f >> step
      | otherwise     = completeBuiltin f b [arg]

    -- Numeric promotion (Int + Float -> Float within an arithmetic op).
    num2 a b fi ff = case (a, b) of
      (VmInt x, VmInt y)     -> Right (VmInt (fi x y))
      (VmFloat x, VmFloat y) -> Right (VmFloat (ff x y))
      (VmInt x, VmFloat y)   -> Right (VmFloat (ff (fromIntegral x) y))
      (VmFloat x, VmInt y)   -> Right (VmFloat (ff x (fromIntegral y)))
      _ -> Left ("operator + requires numeric operands, got "
                 <> vmShowValue a <> " and " <> vmShowValue b)

    -- @+@: numeric with promotion, or string concatenation when both
    -- operands are strings (used by the built-in list Show instance).
    add2 a b = case (a, b) of
      (VmStr x, VmStr y) -> Right (VmStr (x <> y))
      _                  -> num2 a b (+) (+)

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
      (VmChar x, VmChar y)     -> Right (VmBool (x == y))
      (VmUnit, VmUnit)         -> Right (VmBool True)
      (VmList x, VmList y)   -> eqLists x y
      (VmData n1 x, VmData n2 y)
        | n1 == n2  -> eqLists x y
        | otherwise -> Right (VmBool False)
      (VmRec n1 x, VmRec n2 y)
        | n1 == n2 && length x == length y ->
            eqRecs x y
        | otherwise -> Right (VmBool False)
      (VmConstr n1 a1 x, VmConstr n2 a2 y)
        | n1 == n2 && a1 == a2 -> eqLists x y
        | otherwise            -> Right (VmBool False)
      (VmClosure{}, _)       -> Left "cannot compare functions"
      (_, VmClosure{})       -> Left "cannot compare functions"
      (VmPartial{}, _)       -> Left "cannot compare functions"
      (_, VmPartial{})       -> Left "cannot compare functions"
      (VmConstr{}, _)        -> Left "cannot compare functions"
      (_, VmConstr{})        -> Left "cannot compare functions"
      _ -> Left ("cannot compare " <> vmShowValue a <> " and " <> vmShowValue b)

    eqLists [] [] = Right (VmBool True)
    eqLists (x : xs) (y : ys) = case eq2 x y of
      Right (VmBool True)  -> eqLists xs ys
      Right (VmBool False) -> Right (VmBool False)
      Right _              -> Right (VmBool False)
      Left e               -> Left e
    eqLists _ _ = Right (VmBool False)

    -- Records compare by field values in declared order (both sides are
    -- declared-ordered; the compiler guarantees matching names).
    eqRecs [] [] = Right (VmBool True)
    eqRecs ((f1, x) : xs) ((f2, y) : ys)
      | f1 == f2  = case eq2 x y of
          Right (VmBool True)  -> eqRecs xs ys
          Right (VmBool False) -> Right (VmBool False)
          Right _              -> Right (VmBool False)
          Left e               -> Left e
      | otherwise = Right (VmBool False)
    eqRecs _ _ = Right (VmBool False)

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

-- | Render a profiling report as deterministic text (used by @halcyon
-- run-vm --profile@).
renderProfile :: Profile -> String
renderProfile p = unlines
  [ "profile: " <> show (pTotal p) <> " instructions executed"
  , "profile: peak operand-stack depth " <> show (pPeakStack p)
  , "profile: peak frame depth " <> show (pPeakFrames p)
  , ""
  , "calls by function:"
  , renderCounts (pCallCounts p)
  , "instructions by opcode:"
  , renderCounts (pOpCounts p)
  ]
  where
    renderCounts [] = "  (none)"
    renderCounts cs = unlines [ "  " <> name <> ": " <> show n | (name, n) <- cs ]

-- | A single-line summary of a profiling report (used by @halcyon run-vm
-- --stats@).
statsLine :: Profile -> String
statsLine p =
  "profile: " <> show (pTotal p) <> " instructions, peak stack "
  <> show (pPeakStack p) <> ", peak frames " <> show (pPeakFrames p)

-- | Convert a Value (used in constant pools) to a VM value.
toVm :: Value -> VmVal
toVm = \case
  VInt i     -> VmInt i
  VFloat d   -> VmFloat d
  VBool b    -> VmBool b
  VStr s     -> VmStr s
  VChar c    -> VmChar c
  VList vs   -> VmList (map toVm vs)
  VBuiltin b -> VmBuiltin b
  VPartial b vs -> VmPartialBuiltin b (map toVm vs)
  VData n vs -> VmData n (map toVm vs)
  VConstr n ar as -> VmConstr n ar (map toVm as)
  VRec n fs -> VmRec n [(f, toVm v) | (f, v) <- fs]
  VClosure{} -> error "interpreter closure cannot enter VM constants"
  VMethod m  -> VmVMethod m
  VDict c ms -> VmDict c [(m, toVm v) | (m, v) <- ms]
  VUnit      -> VmUnit
  VEffect tag as -> VmEffect tag (map toVm as)

-- | The runtime type tag of a VM value, used to dispatch class methods.
-- Empty lists have no element type; a list instance head matches any list,
-- so the tag only needs the shape. Data values carry their constructor name
-- as the tag; the @ctors@ map translates it to the type name so instance
-- heads (written against the type) match.
vmTypeOf :: Map.Map String String -> VmVal -> Halcyon.Type.Type
vmTypeOf ctors = \case
  VmInt _     -> Halcyon.Type.TInt
  VmFloat _   -> Halcyon.Type.TFloat
  VmBool _    -> Halcyon.Type.TBool
  VmStr _     -> Halcyon.Type.TStr
  VmChar _    -> Halcyon.Type.TChar
  VmList vs   -> case vs of
    (x : _) -> Halcyon.Type.TList (vmTypeOf ctors x)
    []      -> Halcyon.Type.TList (Halcyon.Type.TVar 0)
  VmData n fs -> Halcyon.Type.TData (Map.findWithDefault n n ctors) (map (vmTypeOf ctors) fs)
  VmRec n fs  -> Halcyon.Type.TRec n (map (vmTypeOf ctors . snd) fs)
  _           -> Halcyon.Type.TFun (Halcyon.Type.TVar 0) (Halcyon.Type.TVar 0)

-- | Render a VM value as program output, mirroring 'Halcyon.Value.showValue'
-- so interpreter and VM produce byte-identical output.
vmShowValue :: VmVal -> String
vmShowValue = \case
  VmInt i        -> show i
  VmFloat d      -> showFloat d
  VmBool True    -> "true"
  VmBool False   -> "false"
  VmStr s        -> s
  VmChar c       -> showCharLit c
  VmList vs      -> "[" <> intercalate ", " (map vmShowValue vs) <> "]"
  VmClosure{}    -> "<function>"
  VmPartial{}    -> "<function>"
  VmBuiltin b    -> "<builtin: " <> builtinName b <> ">"
  VmPartialBuiltin b xs -> "<builtin: " <> builtinName b <> " " <> unwords (map vmShowValue xs) <> ">"
  VmData n fs    -> unwords (n : map vmShowValue fs)
  VmConstr n _ _ -> "<constructor: " <> n <> ">"
  VmRec _ fs     -> "{ " <> intercalate ", " (map (\(f, v) -> f <> " = " <> vmShowValue v) fs) <> " }"
  VmVMethod m    -> "<method: " <> m <> ">"
  VmDict c _     -> "<dict: " <> c <> ">"
  VmUnit         -> "()"
  VmEffect tag as -> "<effect: " <> tag <> unwords (map vmShowValue as) <> ">"