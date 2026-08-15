{-# LANGUAGE LambdaCase #-}
module Halcyon.Ast
  ( Expr(..)
  , Program(..)
  , DataDecl(..)
  , Pattern(..)
  , Op(..)
  , Builtin(..)
  , opName
  , builtinName
  , builtinForName
  ) where

import Halcyon.Token (Pos)
import Halcyon.Type (Type)

-- | Halcyon expression AST. Every node carries its source position so all
-- type and runtime errors can point at exact locations.
data Expr
  = EInt     Pos Integer
  | EFloat   Pos Double
  | EBool    Pos Bool
  | EStr     Pos String
  | EList    Pos [Expr]
  | EVar     Pos String
  | EConstr  Pos String            -- ^ reference to a data constructor
  | ELambda  Pos [String] Expr   -- ^ @fn a b => body@
  | EApply   Pos Expr Expr       -- ^ left-associative application
  | ELet     Pos Bool String Expr Expr  -- ^ @let [rec] x = e in b@
  | EIf      Pos Expr Expr Expr
  | EMatch   Pos Expr [(Pattern, Expr)]  -- ^ @match e with | pat => e@
  | EBin     Pos Op Expr Expr
  | ENeg     Pos Expr            -- ^ unary minus
  | ENot     Pos Expr            -- ^ boolean not
  | EBuiltin Pos Builtin
  deriving (Eq, Show)

-- | A whole Halcyon program: zero or more top-level algebraic data type
-- declarations followed by the expression to evaluate. The zero-declaration
-- case is exactly a bare expression, so every pre-v2 program still parses.
data Program = Program
  { progData :: [DataDecl]
  , progExpr :: Expr
  }
  deriving (Eq, Show)

-- | A top-level @data@ declaration: @data <Name> <tyvar>* = <Ctor> <ty>* | ...@
-- Field types are parsed into 'Halcyon.Type.Type' where declared type
-- variables are 'TVar' indices and concrete/data types are names.
data DataDecl = DataDecl
  { ddPos    :: Pos
  , ddName   :: String            -- ^ capitalized type name
  , ddTyvars :: [String]          -- ^ declared type parameters
  , ddCtors  :: [(String, [Type])] -- ^ constructor name -> field types
  }
  deriving (Eq, Show)

-- | A structural pattern for @match@. Variable patterns bind monomorphically
-- inside their branch; the trailing @_@ wildcard is the documented idiom for
-- exhaustive handling.
data Pattern
  = PWild  Pos
  | PVar   Pos String
  | PInt   Pos Integer
  | PFloat Pos Double
  | PBool  Pos Bool
  | PStr   Pos String
  | PNil   Pos
  | PCons  Pos Pattern Pattern   -- ^ @x :: xs@
  | PList  Pos [Pattern]
  | PConstr Pos String [Pattern]
  deriving (Eq, Show)

-- | Binary operators, in precedence order (lowest first).
data Op
  = OpOr
  | OpAnd
  | OpEq
  | OpNe
  | OpLt
  | OpLe
  | OpGt
  | OpGe
  | OpAdd
  | OpSub
  | OpMul
  | OpDiv
  deriving (Eq, Ord, Show)

opName :: Op -> String
opName = \case
  OpOr  -> "||"
  OpAnd -> "&&"
  OpEq  -> "=="
  OpNe  -> "/="
  OpLt  -> "<"
  OpLe  -> "<="
  OpGt  -> ">"
  OpGe  -> ">="
  OpAdd -> "+"
  OpSub -> "-"
  OpMul -> "*"
  OpDiv -> "/"

-- | Builtin functions, exposed as first-class references. The first four
-- are the classic list primitives; the rest form a small standard library
-- over lists. @length@/@reverse@ are unary, @append@/@take@/@drop@ are
-- curried like @cons@.
data Builtin
  = BCons
  | BHead
  | BTail
  | BIsNil
  | BLength
  | BReverse
  | BAppend
  | BTake
  | BDrop
  deriving (Eq, Show)

builtinName :: Builtin -> String
builtinName = \case
  BCons    -> "cons"
  BHead    -> "head"
  BTail    -> "tail"
  BIsNil   -> "isNil"
  BLength  -> "length"
  BReverse -> "reverse"
  BAppend  -> "append"
  BTake    -> "take"
  BDrop    -> "drop"

-- | Resolve a builtin by name, if it is one.
builtinForName :: String -> Maybe Builtin
builtinForName = \case
  "cons"    -> Just BCons
  "head"    -> Just BHead
  "tail"    -> Just BTail
  "isNil"   -> Just BIsNil
  "length"  -> Just BLength
  "reverse" -> Just BReverse
  "append"  -> Just BAppend
  "take"    -> Just BTake
  "drop"    -> Just BDrop
  _         -> Nothing