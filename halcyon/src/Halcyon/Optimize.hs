{-# LANGUAGE LambdaCase #-}
-- | A deterministic, semantics-preserving optimizer for compiled Halcyon
-- programs. Runs over a compiled @Program@ and rewrites each function:
--
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

-- | Optimize one function: fold constant expressions, drop dead stores and
-- redundant jumps, then rebuild the constant pool and remap every index.
-- Returns the entry's index-remap map so callers can remap dictionary
-- references into the entry pool.
optimizeFuncRoots :: [Int] -> Func -> (Func, Map.Map Int Int)
optimizeFuncRoots extraRoots f =
  let pool0 = map optConst (fConstants f)
      readSlots  = [s | PushLocal s <- fCode f]
      captured   = [i | CFunc g <- pool0, (0, i) <- fUpvals g]
      isDeadSlot s = s `notElem` readSlots && s `notElem` captured
      (code1, poolAdds, posMap) = fixpoint pool0 isDeadSlot (fCode f)
      pool1 = pool0 ++ poolAdds
      (pool2, remap) = rebuildPool extraRoots pool1 code1
      code2 = map (patchTarget posMap . patchConst remap) code1
  in (f { fCode = code2, fConstants = pool2 }, remap)
  where
    optConst (CFunc g) = CFunc (optimizeFunc g)
    optConst c         = c

-- | Optimize a function that is not the program entry (no extra constant
-- roots).
optimizeFunc :: Func -> Func
optimizeFunc f = fst (optimizeFuncRoots [] f)

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
  _              -> []

-- | Remap a jump target through the position map (targets always name
-- surviving instructions; anything unmapped is kept as-is defensively).
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
  i              -> i