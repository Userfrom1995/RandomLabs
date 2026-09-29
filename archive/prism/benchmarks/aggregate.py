#!/usr/bin/env python3
import csv, pathlib, sys
p = pathlib.Path("prism/benchmarks/results")
if not p.exists():
    print("no results")
    sys.exit(0)
for f in sorted(p.glob("*.csv")):
    print(f"\n=== {f.name} ===")
    print(open(f).read())
