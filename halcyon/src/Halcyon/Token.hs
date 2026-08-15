module Halcyon.Token
  ( Pos(..)
  , Token(..)
  , Tok(..)
  ) where

-- | A source position: 1-based line and column.
data Pos = Pos
  { posLine :: !Int
  , posCol  :: !Int
  }
  deriving (Eq, Ord, Show)

-- | A lexed token with its source position.
data Token = Token
  { tokenPos :: !Pos
  , tokenTok :: !Tok
  }
  deriving (Eq, Show)

-- | Token payload.
data Tok
  = TInt    Integer
  | TFloat  Double
  | TStr    String
  | TChar   Char
  | TIdent  String
  | TLet
  | TRec
  | TIn
  | TFn
  | TIf
  | TThen
  | TElse
  | TData
  | TRecord
  | TImport
  | TClass
  | TInstance
  | TWhere
  | TMatch
  | TWith
  | TDo
  | TLeftArrow        -- ^ @<-@ (do-block bind)
  | TSemi             -- ^ @;@ (do-block statement separator)
  | TInfixl           -- ^ @infixl@ (user operator declaration)
  | TInfixr           -- ^ @infixr@ (user operator declaration)
  | TInfix            -- ^ @infix@ (user operator declaration)
  | TType             -- ^ @type@ (type synonym declaration)
  | TOpName String    -- ^ a user-defined operator name (maximal symbol run)
  | TTrue
  | TFalse
  | TPlus
  | TMinus
  | TStar
  | TSlash
  | TLt
  | TLe
  | TGt
  | TGe
  | TEq
  | TNe
  | TAnd
  | TOr
  | TNot
  | TAssign          -- ^ @=@ (let binding, data declaration)
  | TArrow           -- ^ @=>@ (function body, match branch)
  | TCons            -- ^ @::@ (cons pattern)
  | TPipe            -- ^ @|@ (data alternatives, match branches)
  | TLParen
  | TRParen
  | TLBracket
  | TRBracket
  | TLBrace            -- ^ @{@ (record-open)
  | TRBrace            -- ^ @}@ (record-close)
  | TDot               -- ^ @.@ (record projection)
  | TColon             -- ^ @:@ (record field type separator)
  | TComma
  | TEOF
  deriving (Eq, Show)