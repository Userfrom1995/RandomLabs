CXX      ?= g++
CXXFLAGS ?= -std=c++17 -O2 -Wall -Wextra -Wno-unused-parameter
LDFLAGS  ?=
INCFLAGS := -I src -I tests

SRCS := $(wildcard src/*.cpp)
OBJS := $(SRCS:src/%.cpp=build/%.o)
# The CLI's `test` command needs the test runner, so tests.cpp is part of the
# main binary (without its standalone main). The standalone test binary gets
# the same runner with TEST_BINARY defined to provide a main.
ENGINE_OBJS := $(filter-out build/main.o,$(OBJS))
TEST_RUNNER := build/tests.o
TEST_MAIN := build/tests_test.o

.PHONY: all test clean

all: gambit

gambit: $(OBJS) $(TEST_RUNNER)
	$(CXX) $(CXXFLAGS) -o $@ $^ $(LDFLAGS)

build/%.o: src/%.cpp | build
	$(CXX) $(CXXFLAGS) -I src -I tests -c $< -o $@

build/tests.o: tests/tests.cpp | build
	$(CXX) $(CXXFLAGS) -I src -I tests -c $< -o $@

build/tests_test.o: tests/tests.cpp | build
	$(CXX) $(CXXFLAGS) -DTEST_BINARY -I src -I tests -c $< -o $@

build:
	mkdir -p build

test: build/gambit_test
	./build/gambit_test

build/gambit_test: $(ENGINE_OBJS) $(TEST_MAIN)
	$(CXX) $(CXXFLAGS) -o $@ $^ $(LDFLAGS)

clean:
	rm -rf build gambit

.PHONY: all test clean