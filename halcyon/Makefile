# Halcyon - a small functional language and VM in Haskell.
#
#   make            build build/halcyon (GHC, no deps beyond boot libs)
#   make test       build and run the full self-test suite
#   make clean      remove build artifacts
#
# The binary is a single unit: `build/halcyon` is the CLI
# (repl/run/run-vm/check/compile/selftest). The self-test suite is embedded
# in the binary so `halcyon selftest` exercises everything.

GHC   ?= ghc
BIN   := build/halcyon

SRC := $(shell find src -name '*.hs')
TEST_SRC := $(shell find test -name '*.hs')

.PHONY: all test clean run

all: $(BIN)

$(BIN): $(SRC)
	@mkdir -p build
	$(GHC) --make -O2 -outputdir build/obj -o $(BIN) $(SRC)

test: $(BIN)
	$(BIN) selftest

run: $(BIN)
	$(BIN) --help

clean:
	rm -rf build