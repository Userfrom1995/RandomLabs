{-# LANGUAGE LambdaCase #-}
module Halcyon.Op
  ( Instr(..)
  , Const(..)
  , Func(..)
  , Program(..)
  , DictEntry(..)
  , showInstr
  , showConst
  , constEquiv
  ) where

import qualified Data.Map.Strict as Map
import Halcyon.Value (showValue)
import Halcyon.Value (Value)
import Halcyon.Type (Type)

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
  | TailCall                 -- ^ as Call, but reuse the current frame (tail position)
  | MakeClosure Int          -- ^ build a closure from constant-pool Func; captures upvalues
  | Return                   -- ^ pop frame; result stays on the operand stack
  | Cons
  | Head
  | Tail
  | IsNil
  | MakeList Int             -- ^ pop n values (in order), push a list
  | PushConstr Int           -- ^ push a curried constructor reference (const-pool CData)
  | MakeData Int             -- ^ pop arity values, push a data value (const-pool CData)
  | BindLocal Int            -- ^ pop value into a local slot (pattern variable binding)
  | TestNil Int              -- ^ pop; jump to target unless the value is an empty list
  | TestCons Int             -- ^ pop list; push head, tail; jump to target unless cons
  | TestConstr Int Int       -- ^ const index, fail target; pop, push fields; jump on mismatch
  | TestInt Int Int          -- ^ const index, fail target; literal Int test
  | TestFloat Int Int        -- ^ const index, fail target; literal Float test
  | TestBool Int Int         -- ^ const index, fail target; literal Bool test
  | TestStr Int Int          -- ^ const index, fail target; literal String test
  | MakeRecord Int Int       -- ^ const index (CRec), arity; pop n field values, push a record
  | GetField Int             -- ^ const index (CField); pop record, push field value
  | UpdateField Int          -- ^ const index (CField); pop record and new value, push updated record
  | TestRecord Int Int       -- ^ const index (CRec), fail target; pop record, push fields, jump on match
  | Fail                     -- ^ abort with "no matching pattern"
  | Halt
  deriving (Eq, Show)

-- | Constant-pool entries: plain values or nested functions.
data Const
  = CValue Value
  | CFunc Func
  | CData String Int          -- ^ a constructor reference: name + total arity
  | CRec String [String]      -- ^ a record reference: type name + field names in declared order
  | CField String             -- ^ a record field name (for projection/update)
  | CMethod String            -- ^ a class method reference, dispatched by value type
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
-- live recursively in its constant pool. The @pDicts@ table maps each class
-- name to its instance dictionaries (head type + method -> entry constant
-- index), which the VM uses to dispatch method references dynamically. The
-- @pCtors@ map translates a runtime constructor name (the tag carried by
-- data values) to its type name, so method dispatch can match an instance
-- head against the value's type.
data Program = Program
  { pEntry :: Func
  , pDicts :: [(String, [DictEntry])]
  , pCtors :: Map.Map String String
  }
  deriving (Show)

-- | One compiled instance dictionary entry: the instance head type and a
-- mapping from method name to the constant-pool index of the compiled method
-- function (in the entry function's constant pool).
data DictEntry = DictEntry
  { deHead    :: Type
  , deMethods :: [(String, Int)]
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
  TailCall       -> "tail_call"
  MakeClosure i  -> "make_closure " <> show i
  Return         -> "return"
  Cons           -> "cons"
  Head           -> "head"
  Tail           -> "tail"
  IsNil          -> "is_nil"
  MakeList n      -> "make_list " <> show n
  PushConstr i   -> "push_constr " <> show i
  MakeData i     -> "make_data " <> show i
  BindLocal s    -> "bind_local " <> show s
  TestNil t      -> "test_nil " <> show t
  TestCons t     -> "test_cons " <> show t
  TestConstr c t -> "test_constr " <> show c <> " " <> show t
  TestInt c t    -> "test_int " <> show c <> " " <> show t
  TestFloat c t  -> "test_float " <> show c <> " " <> show t
  TestBool c t   -> "test_bool " <> show c <> " " <> show t
  TestStr c t    -> "test_str " <> show c <> " " <> show t
  MakeRecord c a -> "make_record " <> show c <> " " <> show a
  GetField c     -> "get_field " <> show c
  UpdateField c  -> "update_field " <> show c
  TestRecord c t -> "test_record " <> show c <> " " <> show t
  Fail           -> "fail"
  Halt            -> "halt"

-- | Render a constant for the disassembler.
showConst :: Const -> String
showConst = \case
  CValue v -> showValue v
  CFunc f  -> "<fn " <> fName f <> ">"
  CData n a -> n <> "/" <> show a
  CRec n fs -> n <> " {" <> unwords fs <> "}"
  CField f  -> "." <> f
  CMethod m -> "<method " <> m <> ">"

-- | A canonical form of a constant used for deduplication in the constant
-- pool. Values compare by rendered form; functions always get their own
-- entry (function identity matters).
constEquiv :: Const -> String
constEquiv (CValue v) = "v:" <> showValue v
constEquiv (CFunc f)  = "f:" <> fName f <> ":" <> show (length (fCode f))
constEquiv (CData n a) = "d:" <> n <> ":" <> show a
constEquiv (CRec n fs) = "r:" <> n <> ":" <> unwords fs
constEquiv (CField f)  = "f:" <> f
constEquiv (CMethod m) = "m:" <> m