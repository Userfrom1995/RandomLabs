CXX      ?= g++
CXXFLAGS ?= -std=c++17 -O2 -Wall -Wextra -Wno-unused-parameter
LDFLAGS  ?=

SRCS := $(wildcard src/*.cpp)
TESTS := tests/tests.cpp
OBJS := $(SRCS:src/%.cpp=build/%.o)
TEST_OBJS := $(TESTS:tests/%.cpp=build/%_test.o) $(filter-out build/main.o,$(OBJS))

.PHONY: all test clean

all: gambit

gambit: $(OBJS)
	$(CXX) $(CXXFLAGS) -o $@ $(OBJS) $(LDFLAGS)

build/%.o: src/%.cpp | build
	$(CXX) $(CXXFLAGS) -I src -c $< -o $@

build/%_test.o: tests/%.cpp | build
	$(CXX) $(CXXFLAGS) -I src -c $< -o $@

build:
	mkdir -p build

test: build/gambit_test
	./build/gambit_test

build/gambit_test: $(TEST_OBJS)
	$(CXX) $(CXXFLAGS) -o $@ $(TEST_OBJS) $(LDFLAGS)

clean:
	rm -rf build gambit

.PHONY: all test clean
