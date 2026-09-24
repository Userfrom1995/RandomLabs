module Main (main) where

-- | Standalone entry point for the Cabal test-suite; the Makefile and the
-- `halcyon selftest` command run the same suite via 'Halcyon.Selftest'.
import System.Exit (exitFailure, exitSuccess)

import Halcyon.Selftest (runSelftest)

main :: IO ()
main = runSelftest >>= \ok -> if ok then exitSuccess else exitFailure