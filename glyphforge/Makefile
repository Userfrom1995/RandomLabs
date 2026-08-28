# Glyphforge - build with the system Kotlin compiler (kotlinc), zero deps.
#
#   make            build build/glyphforge.jar
#   make test       build and run the full self-test suite
#   make clean      remove build artifacts
#
# The jar is a single runnable unit: `java -jar build/glyphforge.jar` is the
# CLI, and `java -jar build/glyphforge.jar --selftest` runs the whole test
# suite (tests are compiled into the same jar so the tester needs nothing else).

KOTLINC ?= kotlinc
JAR     := build/glyphforge.jar

SRC := $(shell find src -name '*.kt')

.PHONY: all test clean run

all: $(JAR)

$(JAR): $(SRC)
	@mkdir -p build
	$(KOTLINC) -include-runtime -d $(JAR) $(SRC)

test: $(JAR)
	java -jar $(JAR) --selftest

run: $(JAR)
	java -jar $(JAR) --help

clean:
	rm -rf build