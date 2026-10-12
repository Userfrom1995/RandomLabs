"""Raw terminal access with crash-safe teardown and size guarding.

RawTerminal puts stdin into raw mode on entry and ALWAYS restores the
saved terminal attributes on exit, even when the game loop raises: the
restore runs in a finally-style __exit__ and restore failures are counted,
never raised (so they cannot mask the original exception). Minimum-size
handling is a pure check so the too-small screen is unit-testable.
"""

import shutil
import sys

try:
    import termios as _termios
    import tty as _tty
except ImportError:  # non-POSIX platforms have neither
    _termios = None
    _tty = None


class TerminalError(RuntimeError):
    pass


class RawTerminal:
    """Context manager owning stdin raw mode. All OS seams injectable."""

    def __init__(self, stream_in=None, termios_mod="default", tty_mod="default",
                 poller=None):
        self.stream_in = stream_in if stream_in is not None else sys.stdin
        self.termios = _termios if termios_mod == "default" else termios_mod
        self.tty = _tty if tty_mod == "default" else tty_mod
        self._poller = poller
        self.saved = None
        self.restore_errors = 0
        self.active = False

    def _fd(self):
        try:
            return self.stream_in.fileno()
        except Exception as exc:
            raise TerminalError("interactive play needs a real stdin: %s" % exc)

    def __enter__(self):
        if self.termios is None or self.tty is None:
            raise TerminalError("interactive play needs POSIX termios (not on this platform)")
        if not self.stream_in.isatty():
            raise TerminalError("interactive play needs a tty stdin (try --self-check headless)")
        fd = self._fd()
        try:
            self.saved = self.termios.tcgetattr(fd)
        except Exception as exc:
            raise TerminalError("cannot query terminal attributes: %s" % exc)
        try:
            self.tty.setraw(fd)
        except Exception as exc:
            raise TerminalError("cannot set raw mode: %s" % exc)
        self.active = True
        return self

    def __exit__(self, exc_type, exc, tb):
        try:
            if self.saved is not None:
                self.termios.tcsetattr(self._fd(), self.termios.TCSADRAIN, self.saved)
        except Exception:
            self.restore_errors += 1
        finally:
            self.active = False
        return False  # never swallow the loop's exception

    def read_available(self, max_bytes=1024):
        """Return waiting input bytes, b"" when idle. Never blocks."""
        if not self.active:
            raise TerminalError("read_available outside raw terminal session")
        fd = self._fd()
        try:
            if self._poller is not None:
                ready = self._poller(fd)
            else:
                import select
                ready, _, _ = select.select([fd], [], [], 0)
            if not ready:
                return b""
            import os
            return os.read(fd, max_bytes) or b""
        except TerminalError:
            raise
        except Exception:
            return b""

    def size(self):
        """Current terminal size as (cols, rows); never raises."""
        try:
            sh = shutil.get_terminal_size()
            return (int(sh.columns), int(sh.lines))
        except Exception:
            return (80, 24)


def check_size(cols, rows, need_cols, need_rows):
    """None when the screen fits, else an honest too-small message."""
    if cols >= need_cols and rows >= need_rows:
        return None
    return "terminal too small: have %dx%d, need at least %dx%d" % (
        cols, rows, need_cols, need_rows)
