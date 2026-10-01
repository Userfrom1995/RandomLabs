"""Borderless always-on-top companion window (tkinter shell).

Thin renderer over WindowController: translates core state into canvas
poses and forwards pointer events into the core event API. All
decisions live in controller.py so the behavior stays headless-testable;
this module only touches tkinter and the OS window manager.
"""

from __future__ import annotations

import sys
import time

from ..pet_core import default_save_path, load, save
from ..pet_core.brain import Brain
from ..pet_core.personality import Personality
from . import platform as platform_mod
from .controller import WindowController
from .sprite import CANVAS_BOX, draw_on, shapes


def launch(alpha: float = 1.0, scale: float = 1.0, topmost: bool = True,
           save_path: str | None = None, seed: int | None = None,
           name: str | None = None) -> int:
    """Open the companion window. Returns a process exit code."""
    note = platform_mod.honest_note()
    if note is not None:
        print("error: %s" % note, file=sys.stderr)
        return 2
    try:
        import tkinter as tk
        from tkinter import messagebox
    except Exception as exc:
        print("error: tkinter could not start (%s)" % exc, file=sys.stderr)
        return 2

    target = save_path or default_save_path()
    state, notice = load(target)
    personality = Personality(name=name or state.name, seed=seed)
    if name:
        state.name = personality.name
    brain = Brain(state=state, personality=personality, seed=seed)
    controller = WindowController(brain=brain, alpha=alpha, scale=scale,
                                  topmost=topmost)
    try:
        app = PetWindow(tk, messagebox, controller, target)
    except Exception as exc:
        print("error: no window today (%s)" % exc, file=sys.stderr)
        return 2
    if notice:
        controller.bubble.show(notice)
    controller.bubble.show(personality.line_for_event("greet"))
    app.run()
    return 0


class PetWindow:
    """Borderless topmost window with drag-carry and a speech bubble."""

    FRAME_MS = 50
    TICK_SEC = 0.1
    SAVE_EVERY_SEC = 30.0

    def __init__(self, tk: object, messagebox: object,
                 controller: WindowController, save_path: str) -> None:
        self._tk = tk
        self._messagebox = messagebox
        self.controller = controller
        self.save_path = save_path
        self.root = tk.Tk()
        self.root.title("Desktop Pet")
        self.root.overrideredirect(True)
        self._apply_topmost()
        self._apply_alpha()
        try:
            self.root.attributes("-toolwindow", True)
        except Exception:
            pass
        try:
            self.root.wm_exclude_from_taskbar()
        except Exception:
            pass
        display_scale = platform_mod.probe_tk_scaling(self.root)
        combined = platform_mod.clamp_scale(display_scale * controller.scale)
        self._pixels_per_unit = combined
        width, height = platform_mod.window_size(combined)
        self._width = width
        self._height = height
        self.canvas = tk.Canvas(self.root, width=width, height=height,
                                highlightthickness=0, bg="#0b0e14")
        self.canvas.pack()
        self._place_initial()
        self.canvas.bind("<ButtonPress-1>", self._on_press)
        self.canvas.bind("<B1-Motion>", self._on_motion)
        self.canvas.bind("<ButtonRelease-1>", self._on_release)
        self.canvas.bind("<Button-3>", self._on_menu)
        self.canvas.bind("<Button-2>", self._on_menu)
        self.canvas.bind("<Control-Button-1>", self._on_menu)
        self.root.protocol("WM_DELETE_WINDOW", self.quit_and_save)
        self._accum = 0.0
        self._last_frame = time.monotonic()
        self._last_save = time.monotonic()
        self._walk_anchor_x = controller.brain.state.x
        self._walk_anchor_y = controller.brain.state.y

    # -- window setup --

    def _apply_topmost(self) -> None:
        try:
            self.root.attributes("-topmost", bool(self.controller.topmost))
        except Exception:
            pass

    def _apply_alpha(self) -> None:
        try:
            self.root.attributes("-alpha", float(self.controller.alpha))
        except Exception:
            pass

    def _place_initial(self) -> None:
        state = self.controller.brain.state
        try:
            screen_w = int(self.root.winfo_screenwidth())
            screen_h = int(self.root.winfo_screenheight())
        except Exception:
            screen_w, screen_h = (1280, 800)
        if state.x or state.y:
            x = int(max(0, min(state.x, max(0, screen_w - self._width))))
            y = int(max(0, min(state.y, max(0, screen_h - self._height))))
        else:
            x = max(0, screen_w - self._width - 40)
            y = max(0, screen_h - self._height - 80)
        self.root.geometry("%dx%d+%d+%d" % (self._width, self._height, x, y))

    # -- main loop --

    def run(self) -> None:
        self._frame()
        self.root.mainloop()

    def _frame(self) -> None:
        now = time.monotonic()
        elapsed = min(0.5, max(0.0, now - self._last_frame))
        self._last_frame = now
        self._accum += elapsed
        while self._accum >= self.TICK_SEC:
            self.controller.tick(self.TICK_SEC)
            self._accum -= self.TICK_SEC
            self._follow_walk()
        self.controller.bubble.tick(now)
        self._redraw()
        if now - self._last_save >= self.SAVE_EVERY_SEC:
            self._last_save = now
            self._save_quietly()
        self.root.after(self.FRAME_MS, self._frame)

    def _follow_walk(self) -> None:
        """Drift the window while the pet walks, clamped to the screen."""
        if self.controller.carry.active:
            self._walk_anchor_x = self.controller.brain.state.x
            self._walk_anchor_y = self.controller.brain.state.y
            return
        state = self.controller.brain.state
        dx = (state.x - self._walk_anchor_x) * self._pixels_per_unit
        dy = (state.y - self._walk_anchor_y) * self._pixels_per_unit
        self._walk_anchor_x = state.x
        self._walk_anchor_y = state.y
        if abs(dx) < 0.25 and abs(dy) < 0.25:
            return
        try:
            screen_w = int(self.root.winfo_screenwidth())
            screen_h = int(self.root.winfo_screenheight())
            x = int(self.root.winfo_x() + dx)
            y = int(self.root.winfo_y() + dy)
            x = max(0, min(x, max(0, screen_w - self._width)))
            y = max(0, min(y, max(0, screen_h - self._height)))
            state.x = float(x)
            state.y = float(y)
            self.root.geometry("+%d+%d" % (x, y))
        except Exception:
            pass

    # -- rendering --

    def _redraw(self) -> None:
        canvas = self.canvas
        canvas.delete("all")
        factor = self._pixels_per_unit
        bubble_h = 64.0 * factor
        box = CANVAS_BOX * factor
        self._draw_bubble(canvas, bubble_h)
        pose = self.controller.current_pose()
        drawing = shapes(pose, size=box)
        draw_on(canvas, drawing, dx=0.0, dy=bubble_h * 0.55)
        label = self.controller.activity_label()
        canvas.create_text(8 * factor, self._height - 8 * factor, anchor="sw",
                           text=label, fill="#8a93a8",
                           font=("Helvetica", max(8, int(9 * factor))))

    def _draw_bubble(self, canvas: object, bubble_h: float) -> None:
        bubble = self.controller.bubble
        pad = 8.0 * self._pixels_per_unit
        canvas.create_rectangle(pad, pad, self._width - pad, bubble_h,
                                fill="#141822", outline="#263042")
        text = bubble.text if bubble.visible else self.controller.about_hint()
        canvas.create_text(pad + 8.0 * self._pixels_per_unit, pad + 6.0,
                           anchor="nw", text=text, fill="#d7dce8",
                           font=("Helvetica", max(8, int(10 * self._pixels_per_unit))),
                           width=int(self._width - 2 * pad - 16))

    # -- pointer events --

    def _on_press(self, event: object) -> None:
        now = time.monotonic()
        self.controller.clicks.press(event.x, event.y, now)
        self._press_root_x = int(self.root.winfo_x())
        self._press_root_y = int(self.root.winfo_y())

    def _on_motion(self, event: object) -> None:
        dragged = self.controller.clicks.move(event.x, event.y)
        if not dragged:
            return
        if not self.controller.carry.active:
            off_x = event.x_root - self.root.winfo_x() \
                if hasattr(event, "x_root") else event.x
            off_y = event.y_root - self.root.winfo_y() \
                if hasattr(event, "y_root") else event.y
            self.controller.carry.start(off_x, off_y)
        try:
            base_x = getattr(event, "x_root", None)
            base_y = getattr(event, "y_root", None)
            if base_x is None or base_y is None:
                return
            x = int(base_x - self.controller.carry.offset_x)
            y = int(base_y - self.controller.carry.offset_y)
            screen_w = int(self.root.winfo_screenwidth())
            screen_h = int(self.root.winfo_screenheight())
            x = max(0, min(x, max(0, screen_w - self._width)))
            y = max(0, min(y, max(0, screen_h - self._height)))
            self.root.geometry("+%d+%d" % (x, y))
            state = self.controller.brain.state
            state.x = float(x)
            state.y = float(y)
        except Exception:
            pass

    def _on_release(self, event: object) -> None:
        gesture = self.controller.clicks.release(event.x, event.y,
                                                 time.monotonic())
        if gesture == "drag" or self.controller.carry.active:
            self.controller.drop()
            self._walk_anchor_x = self.controller.brain.state.x
            self._walk_anchor_y = self.controller.brain.state.y
            return
        self.controller.handle_gesture(gesture)

    def _on_menu(self, event: object) -> None:
        try:
            menu = self._tk.Menu(self.root, tearoff=0)
            for action, label in self.controller.menu():
                menu.add_command(
                    label=label,
                    command=lambda act=action: self._menu_chosen(act))
            menu.tk_popup(event.x_root, event.y_root)
        except Exception:
            pass
        finally:
            try:
                menu.grab_release()
            except Exception:
                pass

    def _menu_chosen(self, action: str) -> None:
        text, quit_flag = self.controller.run_menu_action(action)
        if quit_flag:
            self.quit_and_save()
            return
        if action == "about" and text is not None:
            try:
                self._messagebox.showinfo("About Desktop Pet", text)
            except Exception:
                self.controller.bubble.show(text)
            return
        self._apply_topmost()
        self._apply_alpha()

    # -- persistence --

    def _save_quietly(self) -> None:
        try:
            state = self.controller.brain.state
            try:
                state.x = float(self.root.winfo_x())
                state.y = float(self.root.winfo_y())
            except Exception:
                pass
            save(state, self.save_path)
        except Exception:
            pass

    def quit_and_save(self) -> None:
        self._save_quietly()
        try:
            self.root.destroy()
        except Exception:
            pass
