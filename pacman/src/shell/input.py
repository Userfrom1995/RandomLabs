"""Key decoding and remappable bindings for interactive play.

Bytes read from stdin in raw mode are translated into game actions
(up/down/left/right/pause/quit/confirm/restart/mute/help) by a pure,
headless-testable decoder. Arrow keys and control keys are fixed; single-character movement
and menu keys are remappable through Keymap (validated, duplicates
rejected). Partial escape sequences are held as leftover bytes until the
rest arrives, so slow terminals never misread an arrow as Escape.
"""

UP, DOWN, LEFT, RIGHT = "up", "down", "left", "right"
PAUSE, QUIT, CONFIRM, RESTART = "pause", "quit", "confirm", "restart"
MUTE, HELP = "mute", "help"
ACTIONS = (UP, DOWN, LEFT, RIGHT, PAUSE, QUIT, CONFIRM, RESTART, MUTE, HELP)

# Fixed spellings every terminal sends; never remappable.
FIXED_SPELLINGS = {
    b"\x1b[A": UP, b"\x1bOA": UP,
    b"\x1b[B": DOWN, b"\x1bOB": DOWN,
    b"\x1b[C": RIGHT, b"\x1bOC": RIGHT,
    b"\x1b[D": LEFT, b"\x1bOD": LEFT,
    b"\x03": QUIT,      # Ctrl-C
    b"\x1b": PAUSE,     # lone Escape
    b"\r": CONFIRM, b"\n": CONFIRM, b" ": CONFIRM,
}

DEFAULT_BINDS = {
    UP: ("w", "k"),
    DOWN: ("s", "j"),
    LEFT: ("a", "h"),
    RIGHT: ("d", "l"),
    PAUSE: ("p",),
    QUIT: ("q",),
    CONFIRM: (),
    RESTART: ("r",),
    MUTE: ("m",),
    HELP: ("?",),
}


class Keymap:
    """Action lookup over single-char bindings plus fixed spellings."""

    def __init__(self, binds=None):
        table = {a: tuple(DEFAULT_BINDS[a]) for a in ACTIONS}
        if binds:
            for action, chars in dict(binds).items():
                self._check_action(action)
                table[action] = self._check_chars(action, chars)
        self._table = table
        self._chars = {}
        for action, chars in table.items():
            for ch in chars:
                key = ch.encode("ascii")
                if key in FIXED_SPELLINGS or key in self._chars:
                    raise ValueError("duplicate binding: %r" % ch)
                self._chars[key] = action

    @staticmethod
    def _check_action(action):
        if action not in ACTIONS:
            raise ValueError("unknown action: %r (want %s)" % (action, "/".join(ACTIONS)))

    @staticmethod
    def _check_chars(action, chars):
        if isinstance(chars, str):
            chars = [chars]
        clean = []
        for ch in chars:
            if not isinstance(ch, str) or len(ch) != 1 or not ch.isascii() or not ch.isprintable():
                raise ValueError("binding for %s must be a printable ASCII char, got %r" % (action, ch))
            if ch in (" ",) and action != CONFIRM:
                raise ValueError("binding for %s must not steal %r" % (action, ch))
            clean.append(ch)
        return tuple(clean)

    def bindings(self, action):
        self._check_action(action)
        return self._table[action]

    def action_for(self, spelling):
        """Map one raw spelling (bytes) to an action or None."""
        if spelling in FIXED_SPELLINGS:
            return FIXED_SPELLINGS[spelling]
        return self._chars.get(spelling)

    def describe(self):
        lines = []
        for action in ACTIONS:
            chars = ", ".join(self._table[action]) or "-"
            lines.append("%-7s %s" % (action, chars))
        lines.append("arrows: always move; esc: pause; ctrl-c: quit; enter: confirm; m: mute; ?: help")
        return "\n".join(lines)


def parse_binds(specs):
    """Parse ['up=k', 'pause=.'] CLI specs into a {action: [chars]} map."""
    merged = {}
    for spec in specs or ():
        if "=" not in spec:
            raise ValueError("binding must look like action=key, got %r" % (spec,))
        action, _, key = spec.partition("=")
        action, key = action.strip().lower(), key.strip()
        if action not in ACTIONS:
            raise ValueError("unknown action: %r (want %s)" % (action, "/".join(ACTIONS)))
        if len(key) != 1:
            raise ValueError("binding for %s must be one char, got %r" % (action, key))
        merged.setdefault(action, []).append(key)
    return merged


def decode_stream(data, keymap=None):
    """Split raw bytes into (actions, leftover).

    Complete key spellings become actions in order; a trailing partial
    escape sequence is returned as leftover for the next read. Unknown
    bytes are dropped (never crash on pasted text or window noise).
    """
    keymap = keymap or Keymap()
    actions = []
    buf = bytes(data)
    multi = [sp for sp in FIXED_SPELLINGS if len(sp) > 1]
    while buf:
        matched = False
        for length in (3, 2):
            if len(buf) >= length:
                action = keymap.action_for(buf[:length])
                if action is not None:
                    actions.append(action)
                    buf = buf[length:]
                    matched = True
                    break
        if matched:
            continue
        if len(buf) <= 2 and any(len(sp) > len(buf) and sp.startswith(buf) for sp in multi):
            return actions, buf  # partial escape: wait for more bytes
        action = keymap.action_for(buf[:1])
        if action is not None:
            actions.append(action)
        buf = buf[1:]  # unknown byte: drop, never crash
    return actions, b""
