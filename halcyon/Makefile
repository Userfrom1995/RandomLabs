# Halcyon - a small functional language and VM in Haskell.
#
#   make            build build/halcyon (GHC, no deps beyond boot libs)
#   make test       build and run the full self-test suite
#   make smoke      build and exercise every CLI command end-to-end
#   make clean      remove build artifacts
#
# The binary is a single unit: `build/halcyon` is the CLI
# (repl/run/run-vm/check/compile/selftest). The self-test suite is embedded
# in the binary so `halcyon selftest` exercises everything.

GHC   ?= ghc
BIN   := build/halcyon

SRC := $(shell find src -name '*.hs')
TEST_SRC := $(shell find test -name '*.hs')

.PHONY: all test smoke clean run

all: $(BIN)

$(BIN): $(SRC)
	@mkdir -p build
	$(GHC) --make -O2 -outputdir build/obj -o $(BIN) $(SRC)

test: $(BIN)
	$(BIN) selftest

# Exercise every CLI command end-to-end; any failure aborts with non-zero exit.
smoke: $(BIN)
	set -e; \
	$(BIN) corpus; \
	$(BIN) corpus --examples examples; \
	$(BIN) run examples/fib.hly; \
	$(BIN) run-vm examples/fib.hly; \
	$(BIN) check examples/map.hly; \
	$(BIN) compile examples/promotion.hly > /dev/null; \
	printf '1 + 2\nlet rec f = fn n => if n < 2 then n else f (n - 1) + f (n - 2) in f 10\n' | $(BIN) repl; \
	$(BIN) --version; \
	$(BIN) --help > /dev/null; \
	printf '1 + @\n' > /tmp/halcyon-bad.hly; \
	if $(BIN) run /tmp/halcyon-bad.hly 2>/dev/null; then exit 1; fi; \
	if $(BIN) run 2>/dev/null; then exit 1; fi

run: $(BIN)
	$(BIN) --help

clean:
	rm -rf build