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
  | TIdent  String
  | TLet
  | TRec
  | TIn
  | TFn
  | TIf
  | TThen
  | TElse
  | TData
  | TImport
  | TMatch
  | TWith
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
  | TComma
  | TEOF
  deriving (Eq, Show)