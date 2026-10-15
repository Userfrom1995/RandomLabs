"""Menu-grade navigation for the title, pause, and game-over screens.

Menus are pure data plus a selection index: no I/O, fully headless-testable.
The shell owns one menu per screen (title, pause, over), moves the selection
with up/down (wrapping), and activates the selected item with confirm. Every
item id maps to a real shell transition in ``shell.app``; labels are built
live so toggles (sound on/off) always show the true state.
"""

START, RESUME, RESTART, SOUND, HELP, SCORES, TITLE, AGAIN, QUIT = (
    "start", "resume", "restart", "sound", "help", "scores",
    "quit-to-title", "play-again", "quit",
)


class Menu:
    """One navigable list: title, item ids, and a wrapping selection."""

    def __init__(self, title, items):
        self.title = str(title)
        self.items = list(items)
        if not self.items:
            raise ValueError("menu %r needs at least one item" % (title,))
        self.index = 0

    def move(self, delta):
        """Shift the selection, wrapping around both ends."""
        self.index = (self.index + int(delta)) % len(self.items)
        return self.index

    def current(self):
        return self.items[self.index]

    def reset(self):
        self.index = 0


def title_menu():
    """Title-screen items: start selected so ENTER still starts the run."""
    return Menu("PAC-MAN", [START, HELP, SCORES, SOUND, QUIT])


def pause_menu():
    """Pause items: resume selected so P/ENTER still resumes instantly."""
    return Menu("PAUSED", [RESUME, RESTART, SOUND, HELP, TITLE, QUIT])


def over_menu():
    """Game-over items: play-again selected so ENTER still restarts."""
    return Menu("GAME OVER", [AGAIN, TITLE, QUIT])


def label(item, muted=False, keymap=None):
    """Live one-line label for an item id (toggle states included)."""
    hints = {}
    if keymap is not None:
        try:
            hints = {a: "/".join(keymap.bindings(a)) for a in
                     ("up", "down", "pause", "quit", "restart", "mute", "help")}
        except ValueError:
            hints = {}

    def _live(action, default):
        if not hints:
            return default
        return hints.get(action) or default

    if item == SOUND:
        return "sound: %s [%s]" % ("OFF" if muted else "ON", _live("mute", "M"))
    move = hints.get("up") or "W" if hints else "arrows/WASD"
    table = {
        START: "start game [ENTER]",
        RESUME: "resume [%s] (move: %s)" % (_live("pause", "P"), move),
        RESTART: "restart [%s]" % _live("restart", "R"),
        HELP: "how to play [%s]" % _live("help", "?"),
        SCORES: "high scores",
        TITLE: "quit to title",
        AGAIN: "play again [ENTER]",
        QUIT: "quit [%s]" % _live("quit", "Q"),
    }
    return table.get(item, str(item))
