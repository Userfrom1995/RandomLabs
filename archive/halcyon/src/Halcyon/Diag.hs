module Halcyon.Diag
  ( renderError
  ) where

import Halcyon.Token (Pos(..))

-- | Render a positioned error message with the offending source line and a
-- caret pointing at the error column. The message is already prefixed with
-- its position (e.g. @line 3, col 9: type error: ...@); the snippet is
-- appended beneath it so the reader sees exactly where in the source the
-- error points. When the position does not map to a source line (an
-- end-of-file marker, or an empty source) the message is returned as-is.
renderError :: String -> Pos -> String -> String
renderError src pos msg
  | posLine pos <= 0 = msg
  | otherwise =
      case drop (posLine pos - 1) (lines src) of
        []       -> msg
        (ln : _) -> msg <> "\n  " <> ln <> "\n  " <> caret ln
  where
    -- Caret sits under the error column, clamped so it never runs past the
    -- end of the line (a position just past the text still points clearly).
    caret ln =
      let col   = max 0 (posCol pos - 1)
          width = length ln
      in replicate (min col (width + 1)) ' ' <> "^"