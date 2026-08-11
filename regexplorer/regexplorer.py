"""Regexplorer - watch a regex engine work, one step at a time.

Regexplorer is a small, dependency-free Python CLI that turns a regular
expression into a living diagram. It:

* parses a pattern into an AST (literals, ``.``, character classes, ``*``,
  ``+``, ``?``, alternation, grouping, and the ``^``/``$`` anchors),
* builds a Thompson NFA from that AST using the classic textbook
  construction,
* draws the state machine as an ASCII graph in the terminal,
* simulates matching either with the textbook NFA + set of active states
  (``--engine nfa``, no backtracking, linear time) or with greedy
  backtracking over the AST (``--engine backtrack``), and animates each
  step so you can watch the engine explore the input - which transitions
  fire, where backtracks happen, and whether the match succeeds.

A few usage examples::

    python3 -m regexplorer 'a(b|c)*d' 'abccbd'
    python3 -m regexplorer --engine backtrack '(a+)+b' 'aaaa' --max-steps 1000
    python3 -m regexplorer --diagram-only '^a(b|c)*d$'
    python3 -m regexplorer --quiet '[a-c]+' 'xxabdy'   # -> MATCH 2-5

Everything runs on the Python standard library only (``argparse``, ``sys``,
``time``, ``collections``, ``itertools``, ``math``).
"""

from __future__ import annotations

__version__ = "1.0.0"

import argparse
import itertools
import math
import sys
import time
from collections import deque

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

# A terminal cell is roughly twice as tall as it is wide; we pick the numbers
# below so the diagram reads comfortably in a typical 80-column terminal.
_COLUMN_GAP = 4  # horizontal gap between stacked columns of states
_ROW_GAP = 4     # vertical gap between states stacked in one column
_LEFT_MARGIN = 2  # room for the "start" arrow in front of the start state

_EPSILON = "ε"

_DEFAULT_DELAY = 0.25
_DEFAULT_MAX_STEPS = 200_000
_MAX_PATTERN_LEN = 200
_MAX_TEXT_LEN = 2000
_MAX_DISPLAY_STEPS = 500
_MAX_NESTING = 100

# Characters with special meaning outside a character class.
_METACHARS = frozenset(".^$*+?()[]|\\-")

# Single-character escapes and their expansions.
_ESCAPE_SINGLE = {
    "n": "\n",
    "t": "\t",
    "r": "\r",
    "f": "\f",
    "v": "\v",
    "0": "\0",
}

# Predefined character classes: \d \w \s (and their complements \D \W \S).
_PREDEFINED = {
    "d": frozenset("0123456789"),
    "w": frozenset(
        "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789_"
    ),
    "s": frozenset(" \t\n\r\f\v"),
}

_ANSI = {
    "reset": "\x1b[0m",
    "red": "\x1b[31m",
    "green": "\x1b[32m",
    "yellow": "\x1b[33m",
    "cyan": "\x1b[36m",
}

# Node ids are assigned in parse order so the AST and its traces are
# deterministic; ids are only used for display and statistics.
_NODE_IDS = itertools.count(1)


def _color(text, key, enabled):
    """Wrap ``text`` in an ANSI color when ``enabled``, else return it bare."""
    if not enabled:
        return text
    return "%s%s%s" % (_ANSI[key], text, _ANSI["reset"])


# ---------------------------------------------------------------------------
# Errors
# ---------------------------------------------------------------------------


class RegexplorerError(Exception):
    """Base class for every user-facing Regexplorer problem."""


class PatternError(RegexplorerError):
    """Raised when a pattern cannot be parsed."""


# ---------------------------------------------------------------------------
# AST nodes
# ---------------------------------------------------------------------------


class _Node:
    __slots__ = ("id",)

    def __init__(self):
        self.id = next(_NODE_IDS)


class Lit(_Node):
    """A single literal character."""

    __slots__ = ("char", "matcher", "display")

    def __init__(self, char):
        super().__init__()
        self.char = char
        self.matcher = lambda ch, c=char: ch == c
        self.display = _lit_display(char)


class AnyChar(_Node):
    """``.`` - any character except newline (mirrors Python's dot)."""

    __slots__ = ("matcher", "display")

    def __init__(self):
        super().__init__()
        self.matcher = lambda ch: ch != "\n"
        self.display = "."


class CharClass(_Node):
    """A character class (``[abc]``, ``[a-z]``, ``[^0-9]``, ``\\d`` ...)."""

    __slots__ = ("matcher", "display")

    def __init__(self, matcher, display):
        super().__init__()
        self.matcher = matcher
        self.display = display


class Seq(_Node):
    """Concatenation of several sub-expressions."""

    __slots__ = ("parts",)

    def __init__(self, *parts):
        super().__init__()
        self.parts = list(parts)


class Alt(_Node):
    """Alternation - try each branch in order."""

    __slots__ = ("branches",)

    def __init__(self, *branches):
        super().__init__()
        self.branches = list(branches)


class Star(_Node):
    """``x*`` - zero or more repetitions."""

    __slots__ = ("child",)

    def __init__(self, child):
        super().__init__()
        self.child = child


class Plus(_Node):
    """``x+`` - one or more repetitions."""

    __slots__ = ("child",)

    def __init__(self, child):
        super().__init__()
        self.child = child


class Opt(_Node):
    """``x?`` - zero or one repetitions."""

    __slots__ = ("child",)

    def __init__(self, child):
        super().__init__()
        self.child = child


class Anchor(_Node):
    """A zero-width assertion: ``^`` (start) or ``$`` (end)."""

    __slots__ = ("kind",)

    def __init__(self, kind):
        super().__init__()
        self.kind = kind


def _lit_display(char):
    """Human-readable rendering of a literal character for diagrams."""
    if char == "\n":
        return "\\n"
    if char == "\t":
        return "\\t"
    if char == "\r":
        return "\\r"
    if char == "\f":
        return "\\f"
    if char == "\v":
        return "\\v"
    if char == "\0":
        return "\\0"
    return char


# ---------------------------------------------------------------------------
# Parser
# ---------------------------------------------------------------------------


def compile_pattern(pattern):
    """Parse ``pattern`` into an AST.

    Raises :class:`PatternError` on invalid syntax. The supported grammar::

        alt     := concat ('|' concat)*
        concat  := repeat*
        repeat  := atom ('*' | '+' | '?')*
        atom    := literal | '.' | '^' | '$' | '[' class ']' | escape
                 | '(' alt ')'
    """
    if not pattern:
        raise PatternError("pattern is empty")
    if len(pattern) > _MAX_PATTERN_LEN:
        raise PatternError(
            "pattern is too long (max %d characters)" % _MAX_PATTERN_LEN
        )
    return _Parser(pattern).parse()


class _Parser:
    """Recursive-descent parser over ``pattern`` (no tokens needed)."""

    def __init__(self, pattern):
        self.pattern = pattern
        self.pos = 0

    def parse(self):
        node = self._parse_alt(0)
        if self.pos != len(self.pattern):
            raise PatternError(
                "unexpected %r at position %d" % (self.pattern[self.pos], self.pos)
            )
        return node

    def _parse_alt(self, depth):
        if depth > _MAX_NESTING:
            raise PatternError("pattern is nested too deeply")
        branches = [self._parse_concat(depth)]
        while self.pos < len(self.pattern) and self.pattern[self.pos] == "|":
            self.pos += 1
            branches.append(self._parse_concat(depth))
        if len(branches) == 1:
            return branches[0]
        return Alt(*branches)

    def _parse_concat(self, depth):
        parts = []
        while self.pos < len(self.pattern):
            ch = self.pattern[self.pos]
            if ch in "|)":
                break
            parts.append(self._parse_repeat(depth))
        if not parts:
            raise PatternError("empty expression")
        if len(parts) == 1:
            return parts[0]
        return Seq(*parts)

    def _parse_repeat(self, depth):
        atom = self._parse_atom(depth)
        while self.pos < len(self.pattern):
            ch = self.pattern[self.pos]
            if ch == "*":
                self.pos += 1
                atom = Star(atom)
            elif ch == "+":
                self.pos += 1
                atom = Plus(atom)
            elif ch == "?":
                self.pos += 1
                atom = Opt(atom)
            else:
                break
        return atom

    def _parse_atom(self, depth):
        if self.pos >= len(self.pattern):
            raise PatternError("expected an expression at end of pattern")
        ch = self.pattern[self.pos]
        if ch == "(":
            self.pos += 1
            if self.pos >= len(self.pattern):
                raise PatternError("unclosed group")
            node = self._parse_alt(depth + 1)
            if self.pos >= len(self.pattern) or self.pattern[self.pos] != ")":
                raise PatternError("unclosed group")
            self.pos += 1
            return node
        if ch == ")":
            raise PatternError("unmatched ')'")
        if ch == "^":
            self.pos += 1
            return Anchor("^")
        if ch == "$":
            self.pos += 1
            return Anchor("$")
        if ch == ".":
            self.pos += 1
            return AnyChar()
        if ch == "[":
            return self._parse_class()
        if ch == "\\":
            return self._parse_escape()
        if ch in "*+?":
            raise PatternError("quantifier %r has nothing to repeat" % ch)
        self.pos += 1
        return Lit(ch)

    def _parse_escape(self):
        if self.pos + 1 >= len(self.pattern):
            raise PatternError("dangling backslash at end of pattern")
        esc = self.pattern[self.pos + 1]
        self.pos += 2
        if esc in _ESCAPE_SINGLE:
            return Lit(_ESCAPE_SINGLE[esc])
        if esc in _PREDEFINED:
            return CharClass(
                _build_class_matcher([("set", _PREDEFINED[esc])], False),
                "\\%s" % esc,
            )
        if esc in ("D", "W", "S"):
            return CharClass(
                _build_class_matcher(
                    [("setneg", _PREDEFINED[esc.lower()])], False
                ),
                "\\%s" % esc,
            )
        if esc == "\\":
            return Lit("\\")
        if esc in _METACHARS or (esc.isprintable() and not esc.isalpha()):
            return Lit(esc)
        raise PatternError("unknown escape \\%s" % esc)

    # -- character classes ------------------------------------------------

    def _parse_class(self):
        start = self.pos
        self.pos += 1  # consume '['
        negated = False
        if self.pos < len(self.pattern) and self.pattern[self.pos] == "^":
            negated = True
            self.pos += 1
        tokens = []
        first = True
        while True:
            if self.pos >= len(self.pattern):
                raise PatternError("unclosed character class (missing ']')")
            ch = self.pattern[self.pos]
            if ch == "]":
                if first:
                    # A ']' right after '[' is a literal member.
                    tokens.append(("char", "]"))
                    self.pos += 1
                    first = False
                    continue
                self.pos += 1
                break
            if ch == "\\":
                tokens.append(self._class_escape())
                first = False
                continue
            if ch == "-":
                tokens.append(("dash",))
                self.pos += 1
                first = False
                continue
            tokens.append(("char", ch))
            self.pos += 1
            first = False
        display = self.pattern[start:self.pos]
        matcher = _build_class_matcher(_expand_class_tokens(tokens), negated)
        return CharClass(matcher, display)

    def _class_escape(self):
        if self.pos + 1 >= len(self.pattern):
            raise PatternError("dangling backslash in character class")
        esc = self.pattern[self.pos + 1]
        self.pos += 2
        if esc in _ESCAPE_SINGLE:
            return ("char", _ESCAPE_SINGLE[esc])
        if esc in _PREDEFINED:
            return ("set", _PREDEFINED[esc])
        if esc in ("D", "W", "S"):
            return ("setneg", _PREDEFINED[esc.lower()])
        if esc in "\\]^-" or (esc.isprintable() and not esc.isalpha()):
            return ("char", esc)
        raise PatternError("unknown escape \\%s in character class" % esc)


def _expand_class_tokens(tokens):
    """Resolve ``a-z`` style ranges inside a class into set tokens.

    ``tokens`` is a list of ``('char', c)``, ``('set', frozenset)``,
    ``('setneg', frozenset)`` and ``('dash',)`` items. A ``dash`` sandwiched
    between two single-character tokens becomes a range; anywhere else it is
    a literal ``-`` (so ``[a-]``, ``[-a]`` and ``[-]`` all work).
    """
    out = []
    i = 0
    while i < len(tokens):
        token = tokens[i]
        if (
            token[0] == "char"
            and i + 2 < len(tokens)
            and tokens[i + 1][0] == "dash"
            and tokens[i + 2][0] == "char"
        ):
            lo, hi = token[1], tokens[i + 2][1]
            if ord(lo) > ord(hi):
                raise PatternError("invalid character range %r-%r" % (lo, hi))
            out.append(
                ("set", frozenset(chr(c) for c in range(ord(lo), ord(hi) + 1)))
            )
            i += 3
            continue
        out.append(token)
        i += 1
    return out


def _build_class_matcher(tokens, negated):
    """Combine class tokens into a ``lambda ch -> bool`` predicate."""
    parts = []
    for token in tokens:
        kind = token[0]
        if kind == "char":
            c = token[1]
            parts.append(lambda ch, c=c: ch == c)
        elif kind == "set":
            s = token[1]
            parts.append(lambda ch, s=s: ch in s)
        elif kind == "setneg":
            s = token[1]
            parts.append(lambda ch, s=s: ch not in s)
        elif kind == "dash":
            parts.append(lambda ch: ch == "-")
    if negated:
        return lambda ch: not any(p(ch) for p in parts)
    return lambda ch: any(p(ch) for p in parts)


# ---------------------------------------------------------------------------
# Pattern pretty-printer (used in the AST tree and tests)
# ---------------------------------------------------------------------------


def _pattern_str(node, top=True):
    """Render an AST node back to a compact regex-like string."""
    t = node.__class__
    if t is Lit:
        return _lit_display(node.char)
    if t is AnyChar:
        return "."
    if t is CharClass:
        return node.display
    if t is Anchor:
        return node.kind
    if t is Seq:
        return "".join(_pattern_str(p, top=False) for p in node.parts)
    if t is Alt:
        inner = "|".join(_pattern_str(b, top=False) for b in node.branches)
        return inner if top else "(" + inner + ")"
    if t is Star:
        return _atom_str(node.child) + "*"
    if t is Plus:
        return _atom_str(node.child) + "+"
    if t is Opt:
        return _atom_str(node.child) + "?"
    return ""


def _atom_str(node):
    """Wrap a node in ``(...)`` unless it is already an atom."""
    t = node.__class__
    if t in (Lit, AnyChar, CharClass, Anchor, Alt):
        # Alt already renders with its own parentheses.
        return _pattern_str(node, top=False)
    return "(" + _pattern_str(node, top=False) + ")"


# ---------------------------------------------------------------------------
# Thompson NFA construction
# ---------------------------------------------------------------------------


class State:
    __slots__ = ("id", "out", "accept")

    def __init__(self, sid):
        self.id = sid
        # Each transition is a tuple (label, label_str, target):
        #   label     - None for epsilon, a ``lambda ch -> bool`` matcher for
        #               a character-consuming edge, or '^' / '$' for an anchor.
        #   label_str - the text drawn on the edge in the diagram.
        self.out = []
        self.accept = False


class NFA:
    """A Thompson NFA: a list of states plus start/accept state ids."""

    def __init__(self):
        self.states = []
        self.start = None
        self.accept = None

    def new_state(self):
        state = State(len(self.states))
        self.states.append(state)
        return state

    def add(self, label, label_str, src, dst):
        src.out.append((label, label_str, dst))


def build_nfa(ast):
    """Build a Thompson NFA for ``ast`` and return the :class:`NFA`."""
    nfa = NFA()
    start, accept = _build_node(nfa, ast)
    nfa.start = start
    nfa.accept = accept
    accept.accept = True
    return nfa


def _build_node(nfa, node):
    t = node.__class__
    if t in (Lit, AnyChar, CharClass):
        s1 = nfa.new_state()
        s2 = nfa.new_state()
        nfa.add(node.matcher, node.display, s1, s2)
        return s1, s2
    if t is Anchor:
        s1 = nfa.new_state()
        s2 = nfa.new_state()
        nfa.add(node.kind, node.kind, s1, s2)
        return s1, s2
    if t is Seq:
        fragments = [_build_node(nfa, part) for part in node.parts]
        for (_, frag_end), (frag_start, _) in zip(fragments[:-1], fragments[1:]):
            nfa.add(None, _EPSILON, frag_end, frag_start)
        return fragments[0][0], fragments[-1][1]
    if t is Alt:
        fragments = [_build_node(nfa, branch) for branch in node.branches]
        s1 = nfa.new_state()
        s2 = nfa.new_state()
        for frag_start, frag_end in fragments:
            nfa.add(None, _EPSILON, s1, frag_start)
            nfa.add(None, _EPSILON, frag_end, s2)
        return s1, s2
    if t is Star:
        frag_start, frag_end = _build_node(nfa, node.child)
        s1 = nfa.new_state()
        s2 = nfa.new_state()
        nfa.add(None, _EPSILON, s1, frag_start)
        nfa.add(None, _EPSILON, s1, s2)
        nfa.add(None, _EPSILON, frag_end, frag_start)
        nfa.add(None, _EPSILON, frag_end, s2)
        return s1, s2
    if t is Plus:
        frag_start, frag_end = _build_node(nfa, node.child)
        s1 = nfa.new_state()
        nfa.add(None, _EPSILON, s1, frag_start)
        nfa.add(None, _EPSILON, frag_end, frag_start)
        return s1, frag_end
    if t is Opt:
        frag_start, frag_end = _build_node(nfa, node.child)
        s1 = nfa.new_state()
        s2 = nfa.new_state()
        nfa.add(None, _EPSILON, s1, frag_start)
        nfa.add(None, _EPSILON, s1, s2)
        nfa.add(None, _EPSILON, frag_end, s2)
        return s1, s2
    raise RegexplorerError("cannot build NFA for %r" % t.__name__)


# ---------------------------------------------------------------------------
# Trace recording
# ---------------------------------------------------------------------------


class Tracer:
    """Collects every engine action so it can be animated and counted.

    Each step is a dict with a ``kind`` plus engine-specific fields; the
    frames and statistics are derived entirely from these steps.
    """

    def __init__(self):
        self.steps = []
        self.path = []  # current backtracking path (stack of AST node ids)

    def step(self, **kw):
        if "path" not in kw and kw.get("kind") in ("try", "backtrack"):
            kw["path"] = list(self.path)
        self.steps.append(kw)


class SimResult:
    """Outcome of one simulation run."""

    __slots__ = ("ok", "span", "aborted", "stats")

    def __init__(self, ok, span, aborted=False, stats=None):
        self.ok = ok
        self.span = span
        self.aborted = aborted
        self.stats = stats if stats is not None else _empty_stats()


def _empty_stats():
    return {"states": 0, "steps": 0, "max_active": 0, "max_depth": 0}


def _nfa_stats(steps):
    seen = set()
    max_active = 0
    for st in steps:
        active = st.get("active")
        if active:
            seen.update(active)
            max_active = max(max_active, len(active))
    return {
        "states": len(seen),
        "steps": len(steps),
        "max_active": max_active,
        "max_depth": 0,
    }


def _bt_stats(steps):
    seen = set()
    max_depth = 0
    for st in steps:
        if "node" in st:
            seen.add(st["node"])
        path = st.get("path")
        if path:
            max_depth = max(max_depth, len(path))
    return {
        "states": len(seen),
        "steps": len(steps),
        "max_active": 0,
        "max_depth": max_depth,
    }


# ---------------------------------------------------------------------------
# Engine 1: textbook NFA simulation (no backtracking)
# ---------------------------------------------------------------------------


def _epsilon_closure(nfa, states, pos, text_len):
    """Expand epsilon (and anchor) transitions, tracking the leftmost start.

    ``states`` maps a state id to the start offset of the thread that reached
    it (its *start*). Epsilon transitions and the ``^``/``$`` anchors (when
    they hold at ``pos``) expand; ``start`` values only ever shrink, so the
    leftmost match start is propagated correctly through the automaton.
    """
    result = dict(states)
    work = deque(states)
    while work:
        sid = work.popleft()
        start = result[sid]
        for label, _ls, target in nfa.states[sid].out:
            if not (
                label is None
                or (label == "^" and pos == 0)
                or (label == "$" and pos == text_len)
            ):
                continue
            t = target.id
            if t not in result or start < result[t]:
                result[t] = start
                work.append(t)
    return result


def nfa_simulate(nfa, text, tracer):
    """Run the textbook NFA simulation: one set of active states, no
    backtracking, over a single pass of the input.

    Reports the leftmost match and stops at the first offset where an
    accepting state is reached (the *shortest* match from the leftmost
    start) - the classic set-based algorithm has no notion of greediness.
    """
    text_len = len(text)
    accept = nfa.accept.id
    active = _epsilon_closure(nfa, {nfa.start.id: 0}, 0, text_len)
    tracer.step(
        kind="search",
        pos=0,
        active=frozenset(active),
        note="start matching at offset 0",
    )
    if accept in active:
        tracer.step(
            kind="accept",
            pos=0,
            active=frozenset(active),
            note="accepting state reached without consuming input",
        )
        return SimResult(True, (0, 0), stats=_nfa_stats(tracer.steps))
    for i in range(text_len):
        ch = text[i]
        fired = []
        next_raw = {}
        for sid, start in active.items():
            for label, label_str, target in nfa.states[sid].out:
                if callable(label) and label(ch):
                    fired.append((sid, label_str, target.id))
                    t = target.id
                    if t not in next_raw or start < next_raw[t]:
                        next_raw[t] = start
        nextset = _epsilon_closure(nfa, next_raw, i + 1, text_len)
        tracer.step(
            kind="consume",
            pos=i,
            char=ch,
            active=frozenset(nextset),
            fired=fired,
            note="consume %r%s" % (ch, "" if fired else " (no transition fires)"),
        )
        if accept in nextset:
            start = nextset[accept]
            tracer.step(
                kind="accept",
                pos=i + 1,
                active=frozenset(nextset),
                note="accepting state reached - match ends at offset %d" % (i + 1),
            )
            return SimResult(True, (start, i + 1), stats=_nfa_stats(tracer.steps))
        fresh = _epsilon_closure(nfa, {nfa.start.id: i + 1}, i + 1, text_len)
        merged = dict(nextset)
        for sid, start in fresh.items():
            if sid not in merged or start < merged[sid]:
                merged[sid] = start
        active = merged
        tracer.step(
            kind="restart",
            pos=i + 1,
            active=frozenset(fresh),
            note="a fresh match could begin at offset %d" % (i + 1),
        )
    tracer.step(
        kind="reject",
        pos=text_len,
        active=frozenset(),
        note="end of input reached without a match",
    )
    return SimResult(False, None, stats=_nfa_stats(tracer.steps))


# ---------------------------------------------------------------------------
# Engine 2: greedy backtracking over the AST
# ---------------------------------------------------------------------------


def backtrack_simulate(ast, text, tracer, max_steps):
    """Run classic greedy backtracking over the AST.

    Continuation-passing recursion implements the usual semantics: quantifiers
    are greedy and try to consume as much as possible first, then give back
    input one step at a time when the rest of the pattern fails. Returns the
    leftmost match, longest among matches at that start (like Python's
    ``re.search``). ``max_steps`` bounds the recursion; when it is exceeded
    the run is marked ``aborted`` so catastrophic patterns like ``(a+)+b`` can
    be shown blowing up instead of hanging.
    """
    text_len = len(text)
    calls = [0]
    aborted = [False]
    old_limit = sys.getrecursionlimit()
    sys.setrecursionlimit(max(old_limit, text_len * 4 + 5000))
    try:
        for start in range(text_len + 1):
            if start > 0:
                tracer.step(
                    kind="search",
                    pos=start,
                    note="start matching at offset %d" % start,
                )
            ok, end = _backtrack_match(
                ast, text, start, text_len, tracer, calls, max_steps, aborted,
                lambda p: (True, p),
            )
            if aborted[0]:
                return SimResult(False, None, aborted=True, stats=_bt_stats(tracer.steps))
            if ok:
                tracer.step(
                    kind="success",
                    pos=end,
                    note="leftmost match found at offset %d" % start,
                )
                return SimResult(True, (start, end), stats=_bt_stats(tracer.steps))
        tracer.step(
            kind="reject",
            pos=text_len,
            note="no match at any offset",
        )
        return SimResult(False, None, stats=_bt_stats(tracer.steps))
    finally:
        sys.setrecursionlimit(old_limit)


def _backtrack_match(node, text, pos, text_len, tracer, calls, max_steps,
                     aborted, cont):
    """Match ``node`` at ``pos``; on success call ``cont(end_pos)``.

    ``cont`` is a continuation that returns ``(ok, end)``. Returns
    ``(True, end)`` if the node matched and the continuation succeeded, or
    ``(False, pos)`` otherwise. Recording happens before any continuation
    runs, so the traced path is the call stack at the moment of each choice.
    """
    calls[0] += 1
    if calls[0] > max_steps:
        aborted[0] = True
        return (False, pos)
    tracer.path.append(node.id)
    try:
        t = node.__class__
        if t in (Lit, AnyChar, CharClass):
            tracer.step(
                kind="try",
                node=node.id,
                pos=pos,
                note="match %s at offset %d" % (node.display, pos),
            )
            if pos < text_len and node.matcher(text[pos]):
                return cont(pos + 1)
            return (False, pos)
        if t is Anchor:
            tracer.step(
                kind="try",
                node=node.id,
                pos=pos,
                note="anchor %s at offset %d" % (node.kind, pos),
            )
            if (node.kind == "^" and pos == 0) or (
                node.kind == "$" and pos == text_len
            ):
                return cont(pos)
            return (False, pos)
        if t is Seq:
            tracer.step(
                kind="try",
                node=node.id,
                pos=pos,
                note="enter sequence at offset %d" % pos,
            )
            return _match_seq_parts(node.parts, 0, text, pos, text_len, tracer,
                                    calls, max_steps, aborted, cont)
        if t is Alt:
            tracer.step(
                kind="try",
                node=node.id,
                pos=pos,
                note="enter alternation at offset %d" % pos,
            )
            for idx, branch in enumerate(node.branches):
                ok, end = _backtrack_match(branch, text, pos, text_len, tracer,
                                           calls, max_steps, aborted, cont)
                if ok:
                    return (True, end)
                tracer.step(
                    kind="backtrack",
                    node=node.id,
                    pos=pos,
                    note="branch %d failed; trying the next alternative" % idx,
                )
            return (False, pos)
        if t is Star:
            tracer.step(
                kind="try",
                node=node.id,
                pos=pos,
                note="enter star at offset %d" % pos,
            )
            return _match_rep(node.child, text, pos, text_len, tracer, calls,
                              max_steps, aborted, cont, require_one=False)
        if t is Plus:
            tracer.step(
                kind="try",
                node=node.id,
                pos=pos,
                note="enter plus at offset %d" % pos,
            )
            return _match_rep(node.child, text, pos, text_len, tracer, calls,
                              max_steps, aborted, cont, require_one=True)
        if t is Opt:
            ok, end = _backtrack_match(node.child, text, pos, text_len, tracer,
                                       calls, max_steps, aborted, cont)
            if ok:
                return (True, end)
            tracer.step(
                kind="backtrack",
                node=node.id,
                pos=pos,
                note="optional part skipped",
            )
            return cont(pos)
    finally:
        tracer.path.pop()
    return (False, pos)


def _match_seq_parts(parts, idx, text, pos, text_len, tracer, calls, max_steps,
                     aborted, cont):
    """Match ``parts[idx:]`` in order via an explicit continuation chain."""
    if idx == len(parts):
        return cont(pos)
    return _backtrack_match(
        parts[idx], text, pos, text_len, tracer, calls, max_steps, aborted,
        lambda p: _match_seq_parts(parts, idx + 1, text, p, text_len, tracer,
                                   calls, max_steps, aborted, cont),
    )


def _match_rep(child, text, pos, text_len, tracer, calls, max_steps, aborted,
               cont, require_one):
    """Match ``child`` greedily as ``*`` (or ``+`` with ``require_one``).

    ``rec(p, count)`` prefers consuming one more copy of ``child`` and only
    falls back to ``cont(p)`` when consuming cannot succeed. An empty match
    of ``child`` never recurses (``q > p`` guard), so ``(a*)*`` cannot spin.
    """
    def rec(p, count):
        if calls[0] > max_steps:
            aborted[0] = True
            return (False, p)
        ok, end = _backtrack_match(
            child, text, p, text_len, tracer, calls, max_steps, aborted,
            lambda q: rec(q, count + 1) if q > p else cont(p),
        )
        if ok:
            return (True, end)
        if require_one and count == 0:
            return (False, p)
        return cont(p)

    return rec(pos, 0)


# ---------------------------------------------------------------------------
# Diagram rendering
# ---------------------------------------------------------------------------


def _box_text(sid, active, accept):
    text = "[%d]" % sid if active else "(%d)" % sid
    if accept:
        text += "*"
    return text


def _line_glyph(dx, dy):
    """Pick a line character from a grid-space delta (``-``/``|``/``/``/``\\``)."""
    adx, ady = abs(dx), abs(dy)
    if adx < ady * 0.5:
        return "|"
    if ady < adx * 0.5:
        return "-"
    return "\\" if (dx > 0) == (dy > 0) else "/"


def _layout_columns(nfa):
    """Assign BFS ranks (columns) and a stable within-column order."""
    start_id = nfa.start.id
    rank = {start_id: 0}
    order = [start_id]
    queue = deque([start_id])
    while queue:
        sid = queue.popleft()
        for _label, _ls, target in nfa.states[sid].out:
            if target.id not in rank:
                rank[target.id] = rank[sid] + 1
                order.append(target.id)
                queue.append(target.id)
    by_rank = {}
    for sid in order:
        by_rank.setdefault(rank[sid], []).append(sid)
    max_rank = max(rank.values())
    return [by_rank.get(r, []) for r in range(max_rank + 1)]


def _diagram_geometry(columns, nfa, active):
    """Compute the char-grid size and the (x, y, width) of every state box."""
    boxes = {}
    x = _LEFT_MARGIN
    height = 0
    for states in columns:
        if not states:
            continue
        col_width = max(
            len(_box_text(s, s in active, nfa.states[s].accept)) for s in states
        )
        y = 1
        for sid in states:
            boxes[sid] = (x, y, col_width)
            y += _ROW_GAP
        height = max(height, y - _ROW_GAP)
        x += col_width + _COLUMN_GAP
    width = x + _LEFT_MARGIN
    return width, height + 2, boxes


def _draw_edge(grid, x1, y1, x2, y2):
    dx, dy = x2 - x1, y2 - y1
    span = max(abs(dx), abs(dy))
    steps = max(1, int(span * 2))
    glyph = _line_glyph(dx, dy)
    for i in range(steps + 1):
        t = i / steps
        x = int(round(x1 + dx * t))
        y = int(round(y1 + dy * t))
        if 0 <= y < len(grid) and 0 <= x < len(grid[y]):
            grid[y][x] = glyph


def _place_label(grid, x, y, label):
    if not label:
        return
    start = x - len(label) // 2
    if 0 <= y < len(grid):
        for i, ch in enumerate(label):
            if 0 <= start + i < len(grid[y]):
                grid[y][start + i] = ch


def render_diagram(nfa, active=frozenset(), color=False):
    """Render the NFA as an ASCII graph.

    States are laid out in BFS-rank columns (left to right) and drawn as
    ``(n)`` boxes (``[n]`` when active), ``(n)*`` marks an accepting state and
    ``→`` marks the start. Epsilon edges are labelled ``ε``. ``active`` is an
    iterable of state ids to highlight.
    """
    columns = _layout_columns(nfa)
    width, height, boxes = _diagram_geometry(columns, nfa, set(active))
    grid = [[" "] * width for _ in range(height)]
    for sid in range(len(nfa.states)):
        if sid not in boxes:
            continue
        bx, by, bw = boxes[sid]
        cx, cy = bx + bw // 2, by
        for _label, label_str, target in nfa.states[sid].out:
            if target.id not in boxes:
                continue
            tbx, tby, tbw = boxes[target.id]
            tx, ty = tbx + tbw // 2, tby
            _draw_edge(grid, cx, cy, tx, ty)
            _place_label(grid, (cx + tx) // 2, (cy + ty) // 2, label_str)
    for sid, (bx, by, bw) in boxes.items():
        text = _box_text(sid, sid in set(active), nfa.states[sid].accept)
        if color and sid in set(active):
            text = _color(text, "green", True)
        for i, ch in enumerate(text):
            if 0 <= by < height and 0 <= bx + i < width:
                grid[by][bx + i] = ch
    sbx, sby, _ = boxes[nfa.start.id]
    if sbx - 1 >= 0 and 0 <= sby < height:
        grid[sby][sbx - 1] = _color("→", "green", color)
    return "\n".join("".join(row).rstrip() for row in grid)


# ---------------------------------------------------------------------------
# AST tree rendering (for the backtracking animation)
# ---------------------------------------------------------------------------


def _node_label(node):
    t = node.__class__
    if t is Lit:
        return repr(node.char)
    if t is AnyChar:
        return "any char"
    if t is CharClass:
        return node.display
    if t is Anchor:
        return "anchor %s" % node.kind
    if t is Seq:
        return "sequence"
    if t is Alt:
        return "alternation"
    if t is Star:
        return "star"
    if t is Plus:
        return "plus"
    if t is Opt:
        return "optional"
    return "?"


def _node_children(node):
    t = node.__class__
    if t is Seq:
        return node.parts
    if t is Alt:
        return node.branches
    if t in (Star, Plus, Opt):
        return [node.child]
    return []


def render_ast(node, highlight=None):
    """Render the AST as an indented tree; ``highlight`` marks the current node."""
    out = []
    _ast_recurse(node, "", True, out, highlight)
    return "\n".join(out)


def _ast_recurse(node, prefix, is_last, out, highlight):
    label = _node_label(node)
    if node.id == highlight:
        label += "  ◀"
    out.append("%s%s- %s" % (prefix, "`" if is_last else "|", label))
    children = _node_children(node)
    for i, child in enumerate(children):
        child_prefix = prefix + ("   " if is_last else "|  ")
        _ast_recurse(child, child_prefix, i == len(children) - 1, out, highlight)


# ---------------------------------------------------------------------------
# Animation frames
# ---------------------------------------------------------------------------


class RenderContext:
    __slots__ = ("pattern", "text", "engine", "nfa", "ast", "color", "trace")

    def __init__(self, pattern, text, engine, nfa, ast, color, trace):
        self.pattern = pattern
        self.text = text
        self.engine = engine
        self.nfa = nfa
        self.ast = ast
        self.color = color
        self.trace = trace


def _engine_name(engine):
    return {
        "nfa": "NFA simulation (no backtracking)",
        "backtrack": "backtracking (greedy, leftmost-longest)",
    }[engine]


def _legend():
    return "(n) state  (n)* accepting  → start  [n] active  ε empty transition"


def _ast_legend():
    return "tree of the parsed pattern · ◀ marks the node the engine is working on"


def _input_lines(text, pos, color):
    pos = max(0, min(pos, len(text)))
    label = text if text else "(empty)"
    head = '  text: "%s"' % label
    caret = " " * (len('  text: "') + pos) + _color("^", "red", color)
    return [head, caret]


def _fmt_set(state_ids):
    return ", ".join(str(s) for s in sorted(state_ids))


def _nfa_action_line(step):
    if "fired" in step and step["fired"]:
        fired = "; ".join("%d -%s-> %d" % (s, ls, d) for s, ls, d in step["fired"])
        return "  ▸ " + step.get("note", "") + "  ·  fired: " + fired
    return "  ▸ " + step.get("note", "")


def _cumulative_stats(steps, engine):
    seen = set()
    max_active = 0
    max_depth = 0
    for st in steps:
        active = st.get("active")
        if active:
            seen.update(active)
            max_active = max(max_active, len(active))
        if "node" in st:
            seen.add(st["node"])
        path = st.get("path")
        if path:
            max_depth = max(max_depth, len(path))
    if engine == "nfa":
        return "states visited %d · steps %d · max active set %d" % (
            len(seen), len(steps), max_active
        )
    return "nodes visited %d · steps %d · max depth %d" % (
        len(seen), len(steps), max_depth
    )


def render_ready_frame(ctx):
    """The opening frame: the machine rendered once before the match runs."""
    lines = [
        "regexplorer · pattern %r · input %r · engine: %s"
        % (ctx.pattern, ctx.text, _engine_name(ctx.engine))
    ]
    lines.extend(_input_lines(ctx.text, 0, ctx.color))
    lines.append("  " + _legend())
    lines.extend("  " + ln for ln in render_diagram(ctx.nfa, color=ctx.color).splitlines())
    lines.append("  ▸ ready to match")
    return "\n".join(lines)


def render_frame(ctx, step, index, total):
    """Render one animation frame for a trace step."""
    lines = [
        "regexplorer · pattern %r · input %r · engine: %s · step %d/%d"
        % (ctx.pattern, ctx.text, _engine_name(ctx.engine), index, total)
    ]
    pos = step.get("pos", 0)
    lines.extend(_input_lines(ctx.text, pos, ctx.color))
    if ctx.engine == "nfa":
        lines.append("  " + _legend())
        lines.extend(
            "  " + ln
            for ln in render_diagram(
                ctx.nfa, step.get("active", frozenset()), ctx.color
            ).splitlines()
        )
        lines.append(_nfa_action_line(step))
        stats = _cumulative_stats(ctx.trace[: index + 1], ctx.engine)
    else:
        lines.append("  " + _ast_legend())
        lines.extend(
            "  " + ln
            for ln in render_ast(ctx.ast, highlight=step.get("node")).splitlines()
        )
        lines.append("  ▸ " + step.get("note", ""))
        stats = _cumulative_stats(ctx.trace[: index + 1], ctx.engine)
    lines.append("  stats: " + stats)
    return "\n".join(lines)


def _summary_line(result, text):
    if result.aborted:
        return "ABORTED after %d steps — the pattern likely causes catastrophic backtracking" % (
            result.stats["steps"]
        )
    if result.ok:
        a, b = result.span
        return "MATCH %r[%d:%d]" % (text[a:b], a, b)
    return "NO MATCH"


def _stats_line(stats, engine):
    if engine == "nfa":
        return "stats: states visited %d · steps %d · max active set %d" % (
            stats["states"], stats["steps"], stats["max_active"]
        )
    return "stats: nodes visited %d · steps %d · max depth %d" % (
        stats["states"], stats["steps"], stats["max_depth"]
    )


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------


def build_parser():
    """Build the command-line argument parser."""
    parser = argparse.ArgumentParser(
        prog="regexplorer",
        description=(
            "A visual regex engine: parse a pattern into an AST, build a "
            "Thompson NFA, draw it as an ASCII graph, and animate the match "
            "one step at a time."
        ),
        epilog=(
            "examples:\n"
            "  python3 -m regexplorer 'a(b|c)*d' 'abccbd'\n"
            "  python3 -m regexplorer --engine backtrack '(a+)+b' 'aaaa' --max-steps 1000\n"
            "  python3 -m regexplorer --diagram-only '^a(b|c)*d$'\n"
            "  python3 -m regexplorer --quiet '[a-c]+' 'xxabdy'\n"
            "exit codes: 0 = match, 1 = no match, 2 = error or aborted run"
        ),
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )
    parser.add_argument(
        "pattern",
        metavar="PATTERN",
        help="regular expression to compile and match against the input.",
    )
    parser.add_argument(
        "input",
        metavar="TEXT",
        nargs="?",
        default="",
        help="text to match against (default: the empty string).",
    )
    mode = parser.add_mutually_exclusive_group()
    mode.add_argument(
        "--diagram-only",
        action="store_true",
        help="print just the NFA state machine and exit.",
    )
    mode.add_argument(
        "--quiet",
        action="store_true",
        help=(
            "print a single machine-readable result line and exit "
            "('MATCH a-b', 'NO MATCH', or 'ABORTED n')."
        ),
    )
    parser.add_argument(
        "--engine",
        choices=("nfa", "backtrack"),
        default="nfa",
        help=(
            "matching engine: 'nfa' runs the textbook Thompson NFA with a set "
            "of active states (no backtracking, linear time, reports the "
            "leftmost-shortest match); 'backtrack' runs classic greedy "
            "backtracking over the AST (leftmost-longest) and animates each "
            "backtrack. (default: nfa)"
        ),
    )
    parser.add_argument(
        "--no-animate",
        action="store_true",
        help="print every frame without screen clears or delays.",
    )
    parser.add_argument(
        "--delay",
        metavar="SECS",
        type=float,
        default=_DEFAULT_DELAY,
        help="seconds between animation frames on a TTY (default: %g)."
        % _DEFAULT_DELAY,
    )
    parser.add_argument(
        "--max-steps",
        metavar="N",
        type=int,
        default=_DEFAULT_MAX_STEPS,
        help=(
            "stop the backtracking engine after N steps to reveal "
            "catastrophic backtracking (default: %d)." % _DEFAULT_MAX_STEPS
        ),
    )
    parser.add_argument(
        "--color",
        choices=("auto", "always", "never"),
        default="auto",
        help="ANSI colors in the animation (default: auto - only on a TTY).",
    )
    parser.add_argument(
        "--version",
        action="version",
        version="regexplorer %s" % __version__,
    )
    return parser


def _play_frames(out, frames, delay, isatty, animate):
    for i, frame in enumerate(frames):
        if animate and isatty:
            out.write("\x1b[2J\x1b[H")
        out.write(frame)
        out.write("\n")
        out.flush()
        if i < len(frames) - 1 and animate and isatty:
            time.sleep(max(delay, 0.0))
    out.flush()


def run(args, out=None, err=None):
    """Execute the CLI for parsed ``args``; return an exit code."""
    out = out if out is not None else sys.stdout
    err = err if err is not None else sys.stderr
    if args.delay < 0:
        err.write("regexplorer: error: --delay must not be negative\n")
        return 2
    if args.max_steps < 1:
        err.write("regexplorer: error: --max-steps must be at least 1\n")
        return 2
    if len(args.input) > _MAX_TEXT_LEN:
        err.write(
            "regexplorer: error: input is too long (max %d characters)\n"
            % _MAX_TEXT_LEN
        )
        return 2
    try:
        ast = compile_pattern(args.pattern)
    except PatternError as exc:
        err.write("regexplorer: error: %s\n" % exc)
        return 2
    nfa = build_nfa(ast)

    if args.diagram_only:
        out.write('pattern: %s\n' % args.pattern)
        out.write(render_diagram(nfa) + "\n")
        out.write(_legend() + "\n")
        return 0

    isatty = hasattr(out, "isatty") and out.isatty()
    color = args.color == "always" or (args.color == "auto" and isatty)
    tracer = Tracer()
    if args.engine == "nfa":
        result = nfa_simulate(nfa, args.input, tracer)
    else:
        result = backtrack_simulate(ast, args.input, tracer, args.max_steps)
    steps = tracer.steps

    if args.quiet:
        if result.aborted:
            out.write("ABORTED %d\n" % result.stats["steps"])
        elif result.ok:
            out.write("MATCH %d-%d\n" % result.span)
        else:
            out.write("NO MATCH\n")
        return 0 if result.ok and not result.aborted else (
            2 if result.aborted else 1
        )

    ctx = RenderContext(args.pattern, args.input, args.engine, nfa, ast, color, steps)
    frames = [render_ready_frame(ctx)]
    skipped = max(0, len(steps) - _MAX_DISPLAY_STEPS)
    for index, step in enumerate(steps):
        if index >= _MAX_DISPLAY_STEPS:
            break
        frames.append(render_frame(ctx, step, index, len(steps)))
    if skipped:
        frames.append(
            "… %d more steps not shown (rerun with --quiet or --no-animate for"
            " the full trace)" % skipped
        )
    _play_frames(out, frames, args.delay, isatty, animate=not args.no_animate)
    out.write(_summary_line(result, args.input) + "\n")
    out.write(_stats_line(result.stats, args.engine) + "\n")
    if result.aborted:
        return 2
    return 0 if result.ok else 1


def main(argv=None):
    """Entry point used by ``python3 -m regexplorer``."""
    parser = build_parser()
    args = parser.parse_args(argv)
    return run(args)


if __name__ == "__main__":
    raise SystemExit(main())
