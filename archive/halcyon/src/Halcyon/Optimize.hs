{-# LANGUAGE LambdaCase #-}
-- | A deterministic, semantics-preserving optimizer for compiled Halcyon
-- programs. Runs over a compiled @Program@ and rewrites each function:
--
--   * dead-code elimination: instructions unreachable from the entry point
--     (behind unconditional jumps, or past @Return@/@Fail@/@Halt@) are
--     removed and jump targets remapped.
--   * copy/constant propagation: a local slot stored exactly once from a
--     @push_const@ or @push_local@ and read exactly once by a @push_local@
--     (never captured, with the store dominating the read) collapses: the
--     read inlines the stored value and the store becomes a @pop@.
--   * constant folding: @push_const a; push_const b; add@ folds to
--     @push_const (a + b)@ (and likewise for the other binary operators,
--     unary @neg@/@not@, and comparison/equality). Division by zero is never
--     folded, so the program still raises the runtime error.
--   * dead-store elimination: a @store_local@ to a slot no instruction ever
--     reads (and no directly-nested closure captures) becomes a @pop@; the
--     matching @new_cell@ for an unread @let rec@ slot is removed; a
--     @push_const; pop@ pair is dropped.
--   * redundant jump removal: @jump@ to the very next instruction is removed.
--   * constant-pool rebuild: after rewriting, only constants still referenced
--     survive and every index is remapped, so the optimized disassembly stays
--     clean and deterministic.
--
-- The pass is total: it never fails and never changes observable behavior,
-- which the differential corpus verifies by running every program with and
-- without @--opt@ and requiring byte-identical output.
module Halcyon.Optimize
  ( optimizeProgram
  , Program(..)
  , Func(..)
  , Instr(..)
  ) where

import qualified Data.Map.Strict as Map
import qualified Data.Set as Set
import Data.List (nub)

import Halcyon.Op
import Halcyon.Value (Value(..), showValue)

-- | Optimize a compiled program in place, function by function (nested
-- functions first, then their enclosing function). The instance-dictionary
-- table survives the pass: its method-function constants are kept in the
-- (rebuilt) entry constant pool and every index is remapped, so optimized
-- programs still dispatch methods.
optimizeProgram :: Program -> Program
optimizeProgram (Program entry dicts ctors) =
  let dictIdx = concatMap (map snd . deMethods) (concatMap snd dicts)
      (entry', remap) = optimizeFuncRoots dictIdx entry
      remapDict (cn, entries) =
        (cn, [e { deMethods = [(m, Map.findWithDefault i i remap) | (m, i) <- deMethods e] } | e <- entries])
  in Program entry' (map remapDict dicts) ctors

-- | Optimize one function: remove dead code, propagate copies and constants
-- through locals, fold constant expressions, drop dead stores and redundant
-- jumps, then rebuild the constant pool and remap every index. Returns the
-- entry's index-remap map so callers can remap dictionary references into
-- the entry pool.
optimizeFuncRoots :: [Int] -> Func -> (Func, Map.Map Int Int)
optimizeFuncRoots extraRoots f =
  let pool0 = map optConst (fConstants f)
      captured = capturedByNested pool0
      -- Pass 1: remove unreachable instruction blocks (jump targets always
      -- point at surviving instructions, so no dangling references remain).
      code0 = dce (fCode f)
      -- Pass 2: inline single-use local slots whose value is a constant or a
      -- copy of another slot.
      code1 = propagateCopies captured code0
      readSlots  = [s | PushLocal s <- code1]
      isDeadSlot s = s `notElem` readSlots && s `notElem` captured
      (code2, poolAdds, posMap) = fixpoint pool0 isDeadSlot code1
      pool1 = pool0 ++ poolAdds
      (pool2, remap) = rebuildPool extraRoots pool1 code2
      code3 = map (patchTarget (closeTargets code2 posMap) . patchConst remap) code2
  in (f { fCode = code3, fConstants = pool2 }, remap)
  where
    optConst (CFunc g) = CFunc (optimizeFunc g)
    optConst c         = c

-- | Optimize a function that is not the program entry (no extra constant
-- roots).
optimizeFunc :: Func -> Func
optimizeFunc f = fst (optimizeFuncRoots [] f)

-- ---------------------------------------------------------------------
-- Pass 1: dead-code elimination
-- ---------------------------------------------------------------------

-- | Remove every instruction unreachable from offset 0 (blocks behind
-- unconditional jumps and anything past @Return@/@Fail@/@Halt@), then remap
-- jump targets from old offsets to the surviving layout. Total: unreachable
-- instructions are never executed by a conforming machine, so removing them
-- cannot change behavior. Jump targets always name reachable instructions
-- (a target is reachable by definition the moment it is jumped to).
dce :: [Instr] -> [Instr]
dce code =
  let reach = reachableOffsets code
      survivors = [(oi, i) | (oi, i) <- zip [0 ..] code, oi `Set.member` reach]
      oldToNew = Map.fromList [(oi, ni) | (ni, (oi, _)) <- zip [0 ..] survivors]
  in map (patchTarget oldToNew . snd) survivors

-- | The offsets reachable from the entry point by following fallthrough and
-- jump edges.
reachableOffsets :: [Instr] -> Set.Set Int
reachableOffsets code = go Set.empty [0]
  where
    go seen [] = seen
    go seen (i : rest)
      | i < 0 || i >= length code = go seen rest
      | i `Set.member` seen = go seen rest
      | otherwise =
          let seen' = Set.insert i seen
          in go seen' (successors code i ++ rest)

-- | The successor offsets of the instruction at index @i@: jump targets plus
-- (for everything except unconditional exits) the fallthrough. @Return@,
-- @Fail@ and @Halt@ end the function's control flow here, and @TailCall@
-- never falls through either: the VM either replaces the current frame with
-- the callee (constant-stack recursion) or pops it, so the next instruction
-- is unreachable.
successors :: [Instr] -> Int -> [Int]
successors code i = case code !! i of
  Jump t         -> [t]
  JumpIfFalse t  -> [t, i + 1]
  TestNil t      -> [t, i + 1]
  TestCons t     -> [t, i + 1]
  TestConstr _ t -> [t, i + 1]
  TestRecord _ t -> [t, i + 1]
  TestInt _ t    -> [t, i + 1]
  TestFloat _ t  -> [t, i + 1]
  TestBool _ t   -> [t, i + 1]
  TestStr _ t    -> [t, i + 1]
  TestChar _ t   -> [t, i + 1]
  TailCall       -> []
  _              -> [i + 1]

-- ---------------------------------------------------------------------
-- Pass 2: copy/constant propagation through locals
-- ---------------------------------------------------------------------

-- | Inline single-use local slots. When a slot is stored exactly once (by a
-- @store_local@ or @bind_local@ whose value was pushed by a @push_const@ or
-- @push_local@), read exactly once by a @push_local@, never captured as an
-- upvalue, and the store dominates the read (every path to the read passes
-- the store), the read collapses to the stored value and the store becomes a
-- @pop@ (the feed value is discarded immediately). Copy propagation
-- additionally requires the source slot never to be re-stored, so its value
-- is invariant and the inline is sound even across loops. The pass is total:
-- any doubt leaves the code untouched. The output has exactly the same
-- length and shape (read rewrites and store-to-pop swaps only), so no jump
-- targets shift.
propagateCopies :: [Int] -> [Instr] -> [Instr]
propagateCopies captured = go
  where
    go code =
      let code' = pass captured code
      in if code' == code then code else go code'

-- | One round of propagation. A round inlines only slots whose feed is a
-- constant or a copy of a slot that is not itself being inlined this round,
-- so chained copies resolve one link per round and the inline target is
-- always a live slot.
pass :: [Int] -> [Instr] -> [Instr]
pass captured code =
  let tagged = zip [0 ..] code
      n = length code
      readCnt s = length [() | PushLocal s' <- code, s' == s]
      storeCnt s = length [() | StoreLocal s' <- code, s' == s]
                + length [() | BindLocal s' <- code, s' == s]
      readPos s = [oi | (oi, PushLocal s') <- tagged, s' == s]
      storePos s = [oi | (oi, i) <- tagged, stores s i]
      capturedSet = Set.fromList captured
      doms = dominators code
      dominates si ri = case Map.lookup ri doms of
        Just ds -> si `Set.member` ds
        Nothing -> False
      feedOf s = case storePos s of
        [si] | si > 0, isFeed (code !! (si - 1)) -> Just (si - 1)
        _ -> Nothing
      -- A slot qualifies this round: stored and read exactly once, never
      -- captured, a constant/copy feed, and its store dominates its read.
      qualifies s = readCnt s == 1 && storeCnt s == 1
                    && not (s `Set.member` capturedSet)
                    && case (feedOf s, readPos s) of
                         (Just fi, [ri]) -> dominates fi ri
                         _               -> False
      qualifying = Set.fromList [s | s <- [0 .. n - 1], qualifies s]
      -- The value a qualifying slot resolves to: its feed's constant, a
      -- copy of another slot (chained through slots being inlined), or
      -- nothing when the copy source is not invariant.
      inlineTarget s = case feedOf s of
        Just fi -> case code !! fi of
          PushConst c -> Just (PushConst c)
          PushLocal t
            | t `Set.member` qualifying -> inlineTarget t
            | storeCnt t <= 1 && not (t `Set.member` capturedSet) -> Just (PushLocal t)
            | otherwise -> Nothing
          _ -> Nothing
        Nothing -> Nothing
      rewrite (oi, instr) = case instr of
        PushLocal s
          | s `Set.member` qualifying -> maybe instr id (inlineTarget s)
        StoreLocal s
          | s `Set.member` qualifying -> Pop
        BindLocal s
          | s `Set.member` qualifying -> Pop
        _ -> instr
  in map rewrite tagged
  where
    stores s (StoreLocal s') = s' == s
    stores s (BindLocal s')  = s' == s
    stores _ _               = False
    isFeed (PushConst _) = True
    isFeed (PushLocal _) = True
    isFeed _             = False

-- | Whether instruction offset @c@ dominates offset @r@: every path from the
-- entry point to @r@ passes through @c@. Computed with the classic iterative
-- fixpoint over predecessor intersection.
dominators :: [Instr] -> Map.Map Int (Set.Set Int)
dominators code = go initDoms
  where
    n = length code
    allSet = Set.fromList [0 .. n - 1]
    initDoms = Map.fromList [(i, if i == 0 then Set.singleton 0 else allSet) | i <- [0 .. n - 1]]
    preds = buildPreds code
    go doms =
      let doms' = Map.fromList [(i, step i doms) | i <- [0 .. n - 1]]
      in if doms' == doms then doms else go doms'
    step i doms
      | i == 0 = Set.singleton 0
      | otherwise = case Map.findWithDefault [] i preds of
          []       -> Set.singleton i
          (p : ps) -> Set.insert i
            (foldl1 Set.intersection (map (doms Map.!) (p : ps)))

-- | Predecessor map for the function's control-flow graph.
buildPreds :: [Instr] -> Map.Map Int [Int]
buildPreds code = Map.fromListWith (flip (++))
  [ (s, [i]) | (i, _) <- zip [0 ..] code, s <- successors code i, s >= 0, s < length code ]

-- | The slots of this function's own frame context that are captured (read
-- as upvalues) by any closure nested inside it, transitively. A closure
-- nested @d@ levels below this function reaches this function's own cells
-- at an upvalue hop of exactly @d - 1@ (each hop walks one context; a
-- directly nested closure reads the parent frame at hop 0). Hop counts
-- larger than @d - 1@ name ancestors of this function and never touch its
-- cells, so only the exact matching hops count here.
capturedByNested :: [Const] -> [Int]
capturedByNested = nub . go 1
  where
    go _ [] = []
    go d (c : cs) = case c of
      CFunc g ->
        [i | (h, i) <- fUpvals g, h == d - 1]
          ++ go (d + 1) (fConstants g)
          ++ go d cs
      _       -> go d cs

-- | Iterate the rewrite until no rule fires (each round strictly shrinks the
-- code, so this terminates). Every round works in original-code coordinates
-- (each instruction carries its original offset and jump targets always name
-- original offsets), so the returned position map maps original offsets
-- directly to final offsets and no composition is needed.
fixpoint :: [Const] -> (Int -> Bool) -> [Instr]
         -> ([Instr], [Const], Map.Map Int Int)
fixpoint pool0 isDead code0 = go pool0 (zip [0 .. length code0 - 1] code0)
  where
    go pool tagged =
      let (tagged1, adds1, pm) = rewriteCode pool isDead tagged
          code1 = map snd tagged1
      in if code1 == map snd tagged
           then (code1, adds1, pm)
           else
             let (code2, adds2, pm2) = go (pool ++ adds1) tagged1
             in (code2, adds1 ++ adds2, pm2)

-- ---------------------------------------------------------------------
-- Rewriting
-- ---------------------------------------------------------------------

-- | Rewrite a function's code. Input instructions carry their original
-- offset (the first component); the output keeps those offsets, adds any
-- constants created by folding, and returns a map from original offset to
-- new offset (removed instructions have no entry).
rewriteCode :: [Const] -> (Int -> Bool) -> [(Int, Instr)]
            -> ([(Int, Instr)], [Const], Map.Map Int Int)
rewriteCode pool isDead = go [] [] Map.empty
  where
    go acc adds pm [] =
      (reverse acc, adds, pm)
    go acc adds pm instrs@((oi, _) : _) = case instrs of
      -- push_const a; push_const b; <binary op>  ->  push_const (fold)
      ((_, PushConst a) : (_, PushConst b) : (_, op) : rest)
        | isBin op
        , Just c <- foldBin (pool !! a) (pool !! b) op ->
            let ni = length pool + length adds
            in go ((oi, PushConst ni) : acc) (adds ++ [c])
                 (Map.insert oi (length acc) pm) rest
      -- push_const a; neg | not  ->  push_const (fold)
      ((_, PushConst a) : (_, uop) : rest)
        | uop `elem` [Neg, Not]
        , Just c <- foldUnary (pool !! a) uop ->
            let ni = length pool + length adds
            in go ((oi, PushConst ni) : acc) (adds ++ [c])
                 (Map.insert oi (length acc) pm) rest
      -- push_const; pop  ->  nothing (the value is discarded immediately)
      ((_, PushConst _) : (_, Pop) : rest) ->
        go acc adds pm rest
      -- push_local/push_upvalue; pop  ->  nothing (pure reads of initialized
      -- cells; the compiler never emits an uninitialized read). Cleaned up
      -- after copy propagation turns a store into a pop.
      ((_, PushLocal _) : (_, Pop) : rest) ->
        go acc adds pm rest
      ((_, PushUpvalue _ _) : (_, Pop) : rest) ->
        go acc adds pm rest
      -- a store to a slot nothing ever reads  ->  pop (keep stack height)
      ((_, StoreLocal s) : rest)
        | isDead s ->
            go ((oi, Pop) : acc) adds (Map.insert oi (length acc) pm) rest
      -- a new_cell for a slot nothing ever reads or stores  ->  nothing
      ((_, NewCell s) : rest)
        | isDead s -> go acc adds pm rest
      -- jump to the very next instruction  ->  nothing
      ((_, Jump t) : rest@((j, _) : _))
        | t == j -> go acc adds pm rest
      -- anything else is kept as-is
      _ ->
        let (oi', instr) = head instrs
        in go ((oi', instr) : acc) adds (Map.insert oi' (length acc) pm) (tail instrs)

-- | The binary operators whose constant operands can be folded.
isBin :: Instr -> Bool
isBin instr = instr `elem`
  [Add, Sub, Mul, Div, Lt, Le, Gt, Ge, Eq, Ne, And, Or]

-- | Fold a binary operation on two constant values. Returns Nothing when the
-- operands are not both plain values, when the operation is not defined on
-- them, or when folding would hide a runtime error (division by zero).
foldBin :: Const -> Const -> Instr -> Maybe Const
foldBin (CValue a) (CValue b) instr = case instr of
  Add -> numFold a b (+) (+) (\x y -> fromIntegral x + y)
  Sub -> numFold a b (-) (-) (\x y -> fromIntegral x - y)
  Mul -> numFold a b (*) (*) (\x y -> fromIntegral x * y)
  Div -> divFold a b
  Lt  -> cmpFold a b (<)
  Le  -> cmpFold a b (<=)
  Gt  -> cmpFold a b (>)
  Ge  -> cmpFold a b (>=)
  Eq  -> eqFold a b False
  Ne  -> eqFold a b True
  And -> boolFold a b (&&)
  Or  -> boolFold a b (||)
  _   -> Nothing
foldBin _ _ _ = Nothing

-- | Fold a unary operation on a constant value.
foldUnary :: Const -> Instr -> Maybe Const
foldUnary (CValue v) instr = case instr of
  Neg -> case v of
    VInt i   -> Just (CValue (VInt (negate i)))
    VFloat d -> Just (CValue (VFloat (negate d)))
    _        -> Nothing
  Not -> case v of
    VBool b -> Just (CValue (VBool (not b)))
    _       -> Nothing
  _   -> Nothing
foldUnary _ _ = Nothing

-- | Numeric promotion, mirroring the interpreter and VM: Int + Float
-- promotes to Float.
numFold :: Value -> Value
        -> (Integer -> Integer -> Integer)
        -> (Double -> Double -> Double)
        -> (Integer -> Double -> Double)
        -> Maybe Const
numFold a b fi ff pf = case (a, b) of
  (VInt x, VInt y)     -> Just (CValue (VInt (fi x y)))
  (VFloat x, VFloat y) -> Just (CValue (VFloat (ff x y)))
  (VInt x, VFloat y)   -> Just (CValue (VFloat (pf x y)))
  (VFloat x, VInt y)   -> Just (CValue (VFloat (ff x (fromIntegral y))))
  _ -> Nothing

-- | Division folds only when the divisor is non-zero (both promoted mixes
-- guard the Float divisor; only the pure Int/Int and Float/Float and
-- Int/Float cases can divide by zero).
divFold :: Value -> Value -> Maybe Const
divFold a b = case (a, b) of
  (VInt x, VInt y)     | y /= 0 -> Just (CValue (VInt (x `div` y)))
  (VFloat x, VFloat y) | y /= 0 -> Just (CValue (VFloat (x / y)))
  (VInt x, VFloat y)   | y /= 0 -> Just (CValue (VFloat (fromIntegral x / y)))
  (VFloat x, VInt y)   | y /= 0 -> Just (CValue (VFloat (x / fromIntegral y)))
  _ -> Nothing

cmpFold :: Value -> Value -> (Double -> Double -> Bool) -> Maybe Const
cmpFold a b f = case (a, b) of
  (VInt x, VInt y)     -> Just (CValue (VBool (f (fromIntegral x) (fromIntegral y))))
  (VFloat x, VFloat y) -> Just (CValue (VBool (f x y)))
  (VInt x, VFloat y)   -> Just (CValue (VBool (f (fromIntegral x) y)))
  (VFloat x, VInt y)   -> Just (CValue (VBool (f x (fromIntegral y))))
  _ -> Nothing

eqFold :: Value -> Value -> Bool -> Maybe Const
eqFold a b neg = case eqConst a b of
  Just b' -> Just (CValue (VBool (if neg then not b' else b')))
  Nothing -> Nothing
  where
    eqConst :: Value -> Value -> Maybe Bool
    eqConst x y = case (x, y) of
      (VInt i, VInt j)           -> Just (i == j)
      (VFloat d, VFloat e)       -> Just (d == e)
      (VInt i, VFloat d)         -> Just (fromIntegral i == d)
      (VFloat d, VInt i)         -> Just (d == fromIntegral i)
      (VBool p, VBool q)         -> Just (p == q)
      (VStr s, VStr t)           -> Just (s == t)
      (VChar a, VChar b)           -> Just (a == b)
      (VList xs, VList ys)       -> Just (showValue (VList xs) == showValue (VList ys))
      _ -> Nothing

boolFold :: Value -> Value -> (Bool -> Bool -> Bool) -> Maybe Const
boolFold a b f = case (a, b) of
  (VBool x, VBool y) -> Just (CValue (VBool (f x y)))
  _ -> Nothing

-- ---------------------------------------------------------------------
-- Constant-pool rebuild
-- ---------------------------------------------------------------------

-- | Rebuild the constant pool so only constants referenced by the final code
-- (plus any extra roots, e.g. instance-method functions referenced only by
-- the dictionary table) survive, deduplicating plain values (never
-- functions), and remap every old pool index to its new one.
rebuildPool :: [Int] -> [Const] -> [Instr] -> ([Const], Map.Map Int Int)
rebuildPool extra pool code =
  let refs = nub (extra ++ concatMap instrRefs code)
      (pool', _, remap) = foldl step ([], Map.empty, Map.empty) refs
  in (pool', remap)
  where
    step (acc, seen, remap) oldIdx =
      let c = pool !! oldIdx
      in case c of
        CFunc _ ->
          let ni = length acc
          in (acc ++ [c], seen, Map.insert oldIdx ni remap)
        _ -> case Map.lookup (constEquiv c) seen of
          Just ni -> (acc, seen, Map.insert oldIdx ni remap)
          Nothing ->
            let ni = length acc
            in (acc ++ [c], Map.insert (constEquiv c) ni seen,
                Map.insert oldIdx ni remap)

-- | The constant-pool indices referenced by one instruction.
instrRefs :: Instr -> [Int]
instrRefs = \case
  PushConst i    -> [i]
  MakeClosure i  -> [i]
  MakeData i     -> [i]
  PushConstr i   -> [i]
  MakeRecord c _ -> [c]
  GetField c     -> [c]
  UpdateField c  -> [c]
  TestConstr c _ -> [c]
  TestRecord c _ -> [c]
  TestInt c _    -> [c]
  TestFloat c _  -> [c]
  TestBool c _   -> [c]
  TestStr c _    -> [c]
  TestChar c _   -> [c]
  _              -> []

-- | Close the fixpoint's position map: every jump target that points at an
-- instruction the fixpoint removed (a @jump_to_next@, a folded pair, a dead
-- store, a dead @new_cell@, or a @push_local/pop@ cleanup) resolves to the
-- final position of the first surviving instruction after it. This is exactly
-- where execution would have continued, so remapped targets stay in bounds
-- even when several removals shift earlier offsets. A jump target is always a
-- reachable instruction, and a function always ends in a surviving
-- @return@/@halt@/@fail@, so the walk always terminates in bounds.
closeTargets :: [Instr] -> Map.Map Int Int -> Map.Map Int Int
closeTargets code pm = foldl close pm [t | i <- code, Just t <- [jumpTarget i]]
  where
    close acc t
      | Map.member t acc = acc
      | otherwise        = Map.insert t (nextLive (t + 1)) acc
    nextLive j = case Map.lookup j pm of
      Just x  -> x
      Nothing -> nextLive (j + 1)

-- | The offset a control-flow instruction can jump to, if any.
jumpTarget :: Instr -> Maybe Int
jumpTarget = \case
  Jump t          -> Just t
  JumpIfFalse t   -> Just t
  TestNil t       -> Just t
  TestCons t      -> Just t
  TestConstr _ t  -> Just t
  TestRecord _ t  -> Just t
  TestInt _ t     -> Just t
  TestFloat _ t   -> Just t
  TestBool _ t    -> Just t
  TestStr _ t     -> Just t
  TestChar _ t    -> Just t
  _               -> Nothing

patchTarget :: Map.Map Int Int -> Instr -> Instr
patchTarget pm = \case
  Jump t          -> Jump (Map.findWithDefault t t pm)
  JumpIfFalse t   -> JumpIfFalse (Map.findWithDefault t t pm)
  TestNil t       -> TestNil (Map.findWithDefault t t pm)
  TestCons t      -> TestCons (Map.findWithDefault t t pm)
  TestConstr c t  -> TestConstr c (Map.findWithDefault t t pm)
  TestRecord c t  -> TestRecord c (Map.findWithDefault t t pm)
  TestInt c t     -> TestInt c (Map.findWithDefault t t pm)
  TestFloat c t   -> TestFloat c (Map.findWithDefault t t pm)
  TestBool c t    -> TestBool c (Map.findWithDefault t t pm)
  TestStr c t     -> TestStr c (Map.findWithDefault t t pm)
  TestChar c t    -> TestChar c (Map.findWithDefault t t pm)
  i               -> i

-- | Remap a constant-pool index through the pool rebuild map.
patchConst :: Map.Map Int Int -> Instr -> Instr
patchConst rm = \case
  PushConst i    -> PushConst (Map.findWithDefault i i rm)
  MakeClosure i  -> MakeClosure (Map.findWithDefault i i rm)
  MakeData i     -> MakeData (Map.findWithDefault i i rm)
  PushConstr i   -> PushConstr (Map.findWithDefault i i rm)
  MakeRecord c a -> MakeRecord (Map.findWithDefault c c rm) a
  GetField c     -> GetField (Map.findWithDefault c c rm)
  UpdateField c  -> UpdateField (Map.findWithDefault c c rm)
  TestConstr c t -> TestConstr (Map.findWithDefault c c rm) t
  TestRecord c t -> TestRecord (Map.findWithDefault c c rm) t
  TestInt c t    -> TestInt (Map.findWithDefault c c rm) t
  TestFloat c t  -> TestFloat (Map.findWithDefault c c rm) t
  TestBool c t   -> TestBool (Map.findWithDefault c c rm) t
  TestStr c t    -> TestStr (Map.findWithDefault c c rm) t
  TestChar c t   -> TestChar (Map.findWithDefault c c rm) t
  i              -> i