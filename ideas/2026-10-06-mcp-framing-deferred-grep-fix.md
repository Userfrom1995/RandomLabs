# MCP Framing Deferred-Grep Fix: parsing the double-encoded envelope

## What was built
A surgical fix for issue #544. `terminal-browser/repro.sh` asserted the
capabilities tool result with a plain grep for the unescaped string
`"deferred":[]`, but tb-mcp wraps the tb-agent envelope as an escaped
`text` string inside the JSON-RPC result, so the transcript on disk holds
the escaped form (`deferred\":[]`) and the grep never matched.

## Why this shape
The envelope format is the documented contract (it mirrors the tb-agent
JSON envelope so transcripts compare, and the phase-5 Go unit test
decodes it the same layered way), so the fix changes the checker, not
the format: repro.sh now decodes both JSON layers with python3 and only
falls back to `grep -q -F '\"deferred\":[]'` when python3 is absent.

## How it works
- `terminal-browser/repro.sh`: mcp-framing step runs a python3 heredoc
  that parses each transcript line as JSON-RPC, then parses each
  `content[].text` as the inner envelope, and succeeds only when some
  inner `data.deferred == []`.
- `terminal-browser/tests/test_mcp_framing_deferred.py`: pins that
  repro.sh contains no stale unescaped deferred grep, documents why the
  old pattern misses, and asserts the capabilities envelope carries an
  empty deferred list (live tb-mcp binary when go exists, faithful
  double-encoded simulation otherwise).

## Key files
- `terminal-browser/repro.sh` (mcp framing section)
- `terminal-browser/tests/test_mcp_framing_deferred.py`
- `progress/T-544-mcp-framing-deferred-grep.md`
