{-# LANGUAGE LambdaCase #-}
module Halcyon.Ast
  ( Expr(..)
  , Program(..)
  , TopDef(..)
  , DataDecl(..)
  , RecordDecl(..)
  , ClassDecl(..)
  , InstanceDecl(..)
  , Pattern(..)
  , Op(..)
  , Builtin(..)
  , opName
  , builtinName
  , builtinForName
  , progDataDecls
  , progRecordDecls
  , progLetNames
  , progClassDecls
  , progInstanceDecls
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
  | EChar    Pos Char
  | EList    Pos [Expr]
  | EVar     Pos String
  | EConstr  Pos String            -- ^ reference to a data constructor
  | ELambda  Pos [String] Expr   -- ^ @fn a b => body@
  | EApply   Pos Expr Expr       -- ^ left-associative application
  | ELet     Pos Bool String Expr Expr  -- ^ @let [rec] x = e in b@
  | EIf      Pos Expr Expr Expr
  | EMatch   Pos Expr [(Pattern, Expr)]  -- ^ @match e with | pat => e@
  | ERecord  Pos [(String, Expr)]   -- ^ record literal @{ f1 = e1, ..., fn = en }@
  | EProj    Pos Expr String        -- ^ field projection @e.f@
  | EUpdate  Pos Expr String Expr   -- ^ functional update @{ e with f = e' }@
  | EBin     Pos Op Expr Expr
  | ENeg     Pos Expr            -- ^ unary minus
  | ENot     Pos Expr            -- ^ boolean not
  | EBuiltin Pos Builtin
  deriving (Eq, Show)

-- | A whole Halcyon program (v3 grammar: @decl* expr@). The imports are
-- resolved before typechecking/evaluating (see 'Halcyon.Module'); the
-- defs hold the merged top-level data declarations and @let@ bindings; the
-- final expression may be absent, making the program a definitions-only
-- module (valid to import, runnable as a type-checked no-result program).
data Program = Program
  { progImports :: [String]        -- ^ @import "path"@ list, not yet resolved
  , progDefs    :: [TopDef]
  , progExpr    :: Maybe Expr
  }
  deriving (Eq, Show)

-- | A top-level definition. @data@/@record@ declarations and @let [rec]
-- @name = e@ bindings share a namespace for names in the final expression.
-- @class@/@instance@ declarations (v3, milestone 19) define type classes and
-- their instances.
data TopDef
  = DefData DataDecl
  | DefRecord RecordDecl
  | DefClass ClassDecl
  | DefInstance InstanceDecl
  | DefLet Pos Bool String Expr
  deriving (Eq, Show)

-- | The @data@ declarations of a program, in order.
progDataDecls :: Program -> [DataDecl]
progDataDecls p = [d | DefData d <- progDefs p]

-- | The @record@ declarations of a program, in order.
progRecordDecls :: Program -> [RecordDecl]
progRecordDecls p = [d | DefRecord d <- progDefs p]

-- | The names bound by top-level @let@ definitions, in order.
progLetNames :: Program -> [String]
progLetNames p = [n | DefLet _ _ n _ <- progDefs p]

-- | The @class@ declarations of a program, in order.
progClassDecls :: Program -> [ClassDecl]
progClassDecls p = [d | DefClass d <- progDefs p]

-- | The @instance@ declarations of a program, in order.
progInstanceDecls :: Program -> [InstanceDecl]
progInstanceDecls p = [d | DefInstance d <- progDefs p]

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

-- | A top-level @record@ declaration: @record <Name> <tyvar>* =
-- @{ <field> : <type>, ... }@. Field types are parsed into
-- 'Halcyon.Type.Type' where declared type variables are 'TVar' indices and
-- concrete/data types are names. Fields resolve the record by their globally
-- unique field name set (two records may not share a field set).
data RecordDecl = RecordDecl
  { rdPos    :: Pos
  , rdName   :: String
  , rdTyvars :: [String]
  , rdFields :: [(String, Type)]  -- ^ field name -> field type, in declaration order
  }
  deriving (Eq, Show)

-- | A top-level @class@ declaration:
-- @class <Name> <tyvar> where <method> : <type>, ...@. The class has exactly
-- one type parameter; every method type is written over that parameter, which
-- is represented as @'Halcyon.Type'.TVar 0@.
data ClassDecl = ClassDecl
  { cdPos     :: Pos
  , cdName    :: String
  , cdVar     :: String            -- ^ the single class type variable
  , cdMethods :: [(String, Type)]  -- ^ method name -> declared type
  }
  deriving (Eq, Show)

-- | A top-level @instance@ declaration:
-- @instance Ctx? <Class> <head> where <method> = <expr>, ...@. The optional
-- context is a single @ClassName tyvar@ constraint (the head's leading type
-- variable). Instance heads are closed types built from primitives, data or
-- record names, and list types; type variables in a head all resolve to the
-- head's leading variable (@'Halcyon.Type'.TVar 0@).
data InstanceDecl = InstanceDecl
  { idPos     :: Pos
  , idClass   :: String
  , idCtx     :: Maybe (String, Type)  -- ^ context constraint (class, type), if any
  , idHead    :: Type                  -- ^ the instance head type
  , idMethods :: [(String, Expr)]      -- ^ method name -> implementation
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
  | PChar  Pos Char
  | PNil   Pos
  | PCons  Pos Pattern Pattern   -- ^ @x :: xs@
  | PList  Pos [Pattern]
  | PConstr Pos String [Pattern]
  | PRecord Pos [(String, Pattern)]  -- ^ record pattern @{ x = a, y = b }@
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
-- curried like @cons@. The string operations (milestone 20) mirror the
-- interpreter's canonical rendering (@str@ is the reflection escape hatch,
-- the same output the CLI prints).
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
  | BIntToStr
  | BFloatToStr
  | BBoolToStr
  | BStrToStr
  | BListToStr
  | BStrLen
  | BCharAt
  | BSubstr
  | BStrAppend
  | BStrContains
  | BStr
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
  BIntToStr   -> "intToStr"
  BFloatToStr -> "floatToStr"
  BBoolToStr  -> "boolToStr"
  BStrToStr   -> "strToStr"
  BListToStr  -> "listToStr"
  BStrLen     -> "strLen"
  BCharAt     -> "charAt"
  BSubstr     -> "substr"
  BStrAppend  -> "strAppend"
  BStrContains -> "strContains"
  BStr        -> "str"

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
  "intToStr"   -> Just BIntToStr
  "floatToStr" -> Just BFloatToStr
  "boolToStr"  -> Just BBoolToStr
  "strToStr"   -> Just BStrToStr
  "listToStr"  -> Just BListToStr
  "strLen"     -> Just BStrLen
  "charAt"     -> Just BCharAt
  "substr"     -> Just BSubstr
  "strAppend"  -> Just BStrAppend
  "strContains" -> Just BStrContains
  "str"        -> Just BStr
  _            -> Nothing