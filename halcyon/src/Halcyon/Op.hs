{-# LANGUAGE LambdaCase #-}
module Halcyon.Op
  ( Instr(..)
  , Const(..)
  , Func(..)
  , Program(..)
  , showInstr
  , showConst
  , constEquiv
  ) where

import Halcyon.Value (showValue)
import Halcyon.Value (Value)

-- | Bytecode instructions for the Halcyon VM, a stack machine with frames,
-- upvalue cells shared with the defining frame, and closures.
data Instr
  = PushConst Int            -- ^ push constant-pool entry by index
  | PushLocal Int            -- ^ push local cell by slot
  | StoreLocal Int           -- ^ pop value into local cell by slot
  | NewCell Int              -- ^ create an empty local cell at slot (for @let rec@)
  | PushUpvalue Int Int      -- ^ push captured cell: walk @hops@ contexts, read @index@
  | Pop
  | Add
  | Sub
  | Mul
  | Div
  | Lt
  | Le
  | Gt
  | Ge
  | Eq
  | Ne
  | And
  | Or
  | Not
  | Neg
  | Jump Int                 -- ^ unconditional jump to instruction offset
  | JumpIfFalse Int          -- ^ pop bool; jump to offset when false
  | Call                     -- ^ pop arg, pop callable, push result (curried, arity 1)
  | MakeClosure Int          -- ^ build a closure from constant-pool Func; captures upvalues
  | Return                   -- ^ pop frame; result stays on the operand stack
  | Cons
  | Head
  | Tail
  | IsNil
  | MakeList Int             -- ^ pop n values (in order), push a list
  | Halt
  deriving (Eq, Show)

-- | Constant-pool entries: plain values or nested functions.
data Const
  = CValue Value
  | CFunc Func
  deriving (Show)

-- | An immutable compiled function.
data Func = Func
  { fName      :: String
  , fParams    :: [String]
  , fCode      :: [Instr]
  , fConstants :: [Const]
  , fUpvals    :: [(Int, Int)]   -- ^ (hops, cell index) capture specs, in upvalue order
  , fUpvalNames :: [String]      -- ^ names of the captured upvalues (for docs/debug)
  }
  deriving (Show)

-- | A compiled program: the entry (top-level) function; nested functions
-- live recursively in its constant pool.
data Program = Program
  { pEntry :: Func
  }
  deriving (Show)

-- | Render an instruction for the disassembler.
showInstr :: Instr -> String
showInstr = \case
  PushConst i    -> "push_const " <> show i
  PushLocal s    -> "push_local " <> show s
  StoreLocal s   -> "store_local " <> show s
  NewCell s      -> "new_cell " <> show s
  PushUpvalue h i -> "push_upvalue " <> show h <> ":" <> show i
  Pop            -> "pop"
  Add            -> "add"
  Sub            -> "sub"
  Mul            -> "mul"
  Div            -> "div"
  Lt             -> "lt"
  Le             -> "le"
  Gt             -> "gt"
  Ge             -> "ge"
  Eq             -> "eq"
  Ne             -> "ne"
  And            -> "and"
  Or             -> "or"
  Not            -> "not"
  Neg            -> "neg"
  Jump o         -> "jump " <> show o
  JumpIfFalse o  -> "jump_if_false " <> show o
  Call           -> "call"
  MakeClosure i  -> "make_closure " <> show i
  Return         -> "return"
  Cons           -> "cons"
  Head           -> "head"
  Tail           -> "tail"
  IsNil          -> "is_nil"
  MakeList n      -> "make_list " <> show n
  Halt            -> "halt"

-- | Render a constant for the disassembler.
showConst :: Const -> String
showConst = \case
  CValue v -> showValue v
  CFunc f  -> "<fn " <> fName f <> ">"

-- | A canonical form of a constant used for deduplication in the constant
-- pool. Values compare by rendered form; functions always get their own
-- entry (function identity matters).
constEquiv :: Const -> String
constEquiv (CValue v) = "v:" <> showValue v
constEquiv (CFunc f)  = "f:" <> fName f <> ":" <> show (length (fCode f))