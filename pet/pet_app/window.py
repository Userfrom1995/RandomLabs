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
from . import settings as settings_mod
from . import shells as shells_mod
from .controller import WindowController
from .interact import wall_hour
from .sprite import CANVAS_BOX, draw_on, normalize_character, shapes


def launch(alpha: float = 1.0, scale: float = 1.0, topmost: bool = True,
           save_path: str | None = None, seed: int | None = None,
           name: str | None = None, settings_path: str | None = None,
           settings_overrides: dict | None = None,
           character_id: str | None = None) -> int:
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
    settings, settings_note = settings_mod.load_settings(settings_path)
    if notice:
        print("[pet] %s" % notice)
    if settings_note and "no settings file yet" not in settings_note:
        print("[pet] %s" % settings_note)
    for field, value in (settings_overrides or {}).items():
        try:
            settings = settings_mod.with_field(settings, field, value)
        except ValueError as exc:
            print("error: %s" % exc, file=sys.stderr)
            return 2
    settings = settings_mod.with_field(settings, "alpha", alpha) \
        if alpha != 1.0 else settings
    settings = settings_mod.with_field(settings, "scale", scale) \
        if scale != 1.0 else settings
    if not topmost:
        settings = settings_mod.with_field(settings, "topmost", False)
    personality = Personality(name=name or state.name, seed=seed,
                              character_id=state.character_id)
    if name:
        state.name = personality.name
    if character_id is not None:
        from ..pet_core import catalog as catalog_mod

        record, char_notice = catalog_mod.get(character_id)
        state.character_id = record["id"]
        personality.set_character(record["id"])
        if char_notice:
            print("[pet] %s" % char_notice)
    brain = Brain(state=state, personality=personality, seed=seed)
    controller = WindowController(brain=brain, settings=settings,
                                  clock=wall_hour)
    try:
        app = PetWindow(tk, messagebox, controller, target,
                        settings_path or settings_mod.default_settings_path())
    except Exception as exc:
        print("error: no window today (%s)" % exc, file=sys.stderr)
        return 2
    if notice:
        # A corrupt-save notice is a system message: it bypasses the
        # dialogue toggle so data loss is never silent.
        controller.bubble.show("%s %s" % (notice, personality.line_for_event("greet")))
    else:
        controller._say(personality.line_for_event("greet"))
    app.run()
    return 0


class PetWindow:
    """Borderless topmost window with drag-carry and a speech bubble."""

    FRAME_MS = 50
    TICK_SEC = 0.1
    SAVE_EVERY_SEC = 30.0

    def __init__(self, tk: object, messagebox: object,
                 controller: WindowController, save_path: str,
                 settings_path: str | None = None) -> None:
        self._tk = tk
        self._messagebox = messagebox
        self.controller = controller
        self.save_path = save_path
        self.settings_path = settings_path
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
        self._base_display_scale = display_scale
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
        character = normalize_character(
            getattr(self.controller.brain.state, "character_id", "pip"))
        drawing = shapes(pose, size=box, character_id=character)
        draw_on(canvas, drawing, dx=0.0, dy=bubble_h * 0.55)
        ball = self.controller.ball_shape(box)
        if ball is not None:
            draw_on(canvas, [ball], dx=0.0, dy=bubble_h * 0.55)
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
        menu = None
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
            if menu is not None:
                try:
                    menu.grab_release()
                except Exception:
                    pass

    def _menu_chosen(self, action: str) -> None:
        if action == "settings":
            self.open_settings_dialog()
            return
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

    # -- character hot-swap --

    def switch_character(self, character_id: object) -> str:
        """Swap characters live: no window reopen, next frame re-renders.

        The pose blend restarts from the current pose so the swap reads
        as a smooth morph rather than a pop, and the save records the
        selection so restarts restore it (DPI scaling is untouched: all
        coordinates still scale linearly from the same box).
        """
        text, notice = self.controller.switch_character(character_id)
        if notice:
            self.controller.bubble.show("%s %s" % (notice, text))
        self._save_quietly()
        return text

    # -- settings dialog --

    def open_settings_dialog(self) -> None:
        """Settings form: name, toggles, transparency, scale, startup."""
        tk = self._tk
        try:
            dialog = tk.Toplevel(self.root)
        except Exception:
            return
        try:
            dialog.title("Pet Settings")
            dialog.resizable(False, False)
        except Exception:
            pass
        current = self.controller.settings
        state = self.controller.brain.state
        fields: dict[str, object] = {}
        try:
            fields["name_var"] = tk.StringVar(value=state.name)
            toggles = (
                ("wander", "Wander around", current.wander),
                ("play_invites", "Play invitations", current.play_invites),
                ("sleep_schedule", "Bedtime routine", current.sleep_schedule),
                ("dialogue", "Speech bubble chatter", current.dialogue),
                ("topmost", "Always on top", current.topmost),
                ("startup", "Start at login", shells_mod.is_startup_enabled()),
            )
            for key, _label, value in toggles:
                fields[key] = tk.BooleanVar(value=bool(value))
            fields["alpha_var"] = tk.DoubleVar(value=float(current.alpha))
            fields["scale_var"] = tk.DoubleVar(value=float(current.scale))
            fields["bedtime_var"] = tk.StringVar(
                value=settings_mod.format_clock(current.bedtime))
            fields["wake_var"] = tk.StringVar(
                value=settings_mod.format_clock(current.wake))
            fields["status_var"] = tk.StringVar(value=shells_mod.platform_notes())
        except Exception:
            try:
                dialog.destroy()
            except Exception:
                pass
            return
        row = 0
        try:
            tk.Label(dialog, text="Name:").grid(row=row, column=0, sticky="e")
            tk.Entry(dialog, textvariable=fields["name_var"],
                     width=18).grid(row=row, column=1, sticky="w")
            row += 1
            for key, label, _value in toggles:
                tk.Checkbutton(dialog, text=label,
                               variable=fields[key]).grid(
                    row=row, column=0, columnspan=2, sticky="w")
                row += 1
            tk.Label(dialog, text="Transparency:").grid(row=row, column=0,
                                                         sticky="e")
            tk.Scale(dialog, from_=0.3, to=1.0, resolution=0.05,
                     orient="horizontal",
                     variable=fields["alpha_var"]).grid(row=row, column=1,
                                                        sticky="w")
            row += 1
            tk.Label(dialog, text="Size:").grid(row=row, column=0, sticky="e")
            tk.Scale(dialog, from_=0.5, to=3.0, resolution=0.1,
                     orient="horizontal",
                     variable=fields["scale_var"]).grid(row=row, column=1,
                                                        sticky="w")
            row += 1
            tk.Label(dialog, text="Bedtime (HH:MM):").grid(row=row, column=0,
                                                            sticky="e")
            tk.Entry(dialog, textvariable=fields["bedtime_var"],
                     width=8).grid(row=row, column=1, sticky="w")
            row += 1
            tk.Label(dialog, text="Wake up (HH:MM):").grid(row=row, column=0,
                                                            sticky="e")
            tk.Entry(dialog, textvariable=fields["wake_var"],
                     width=8).grid(row=row, column=1, sticky="w")
            row += 1
            tk.Label(dialog, textvariable=fields["status_var"],
                     wraplength=320, justify="left").grid(
                row=row, column=0, columnspan=2, sticky="w")
            row += 1
            buttons = tk.Frame(dialog)
            buttons.grid(row=row, column=0, columnspan=2)
            tk.Button(buttons, text="Save",
                      command=lambda: self._save_settings_dialog(
                          dialog, fields)).pack(side="left")
            tk.Button(buttons, text="Cancel",
                      command=dialog.destroy).pack(side="left")
        except Exception:
            try:
                dialog.destroy()
            except Exception:
                pass

    def _save_settings_dialog(self, dialog: object, fields: dict) -> None:
        """Validate the dialog form, apply live, and persist."""
        status_var = fields.get("status_var")
        def complain(text: str) -> None:
            try:
                if status_var is not None:
                    status_var.set(text)
            except Exception:
                pass
        try:
            data = self.controller.settings.to_dict()
            for key in ("wander", "play_invites", "sleep_schedule",
                        "dialogue", "topmost"):
                var = fields.get(key)
                data[key] = bool(var.get()) if var is not None else data[key]
            alpha_var = fields.get("alpha_var")
            scale_var = fields.get("scale_var")
            try:
                data["alpha"] = float(alpha_var.get()) if alpha_var else 1.0
                data["scale"] = float(scale_var.get()) if scale_var else 1.0
            except (TypeError, ValueError):
                complain("Transparency and size must be numbers.")
                return
            bedtime_var = fields.get("bedtime_var")
            wake_var = fields.get("wake_var")
            try:
                data["bedtime"] = settings_mod.parse_clock(
                    bedtime_var.get() if bedtime_var else "22:00")
                data["wake"] = settings_mod.parse_clock(
                    wake_var.get() if wake_var else "07:00")
            except ValueError as exc:
                complain(str(exc))
                return
            new_settings = settings_mod.AppSettings.from_dict(data)
        except ValueError as exc:
            complain("Settings not saved (%s)." % exc)
            return
        name_var = fields.get("name_var")
        try:
            wanted = name_var.get().strip() if name_var is not None else ""
        except Exception:
            wanted = ""
        if wanted and wanted != self.controller.brain.state.name:
            self.controller.brain.rename(wanted)
        try:
            self.controller.apply_settings(new_settings)
        except ValueError as exc:
            complain("Settings not saved (%s)." % exc)
            return
        self._apply_topmost()
        self._apply_alpha()
        self._apply_scale_live()
        self._save_settings_quietly()
        startup_var = fields.get("startup")
        if startup_var is not None:
            try:
                want_startup = bool(startup_var.get())
            except Exception:
                want_startup = shells_mod.is_startup_enabled()
            if want_startup != shells_mod.is_startup_enabled():
                ok, note = shells_mod.set_startup(want_startup)
                if not ok:
                    self.controller._say(note)
        self._save_quietly()
        try:
            dialog.destroy()
        except Exception:
            pass

    def _apply_scale_live(self) -> None:
        """Resize the window when the scale setting changes."""
        try:
            combined = platform_mod.clamp_scale(
                self._display_scale() * self.controller.scale)
        except Exception:
            return
        self._pixels_per_unit = combined
        width, height = platform_mod.window_size(combined)
        self._width = width
        self._height = height
        try:
            self.canvas.config(width=width, height=height)
        except Exception:
            pass
        try:
            x = int(self.root.winfo_x())
            y = int(self.root.winfo_y())
            self.root.geometry("%dx%d+%d+%d" % (width, height, x, y))
        except Exception:
            pass

    def _display_scale(self) -> float:
        try:
            return float(self._base_display_scale)
        except AttributeError:
            return 1.0
        except (TypeError, ValueError):
            return 1.0

    # -- persistence --

    def _save_settings_quietly(self) -> None:
        if not self.settings_path:
            return
        try:
            settings_mod.save_settings(self.controller.settings,
                                       self.settings_path)
        except Exception:
            pass

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
        self._save_settings_quietly()

    def quit_and_save(self) -> None:
        self._save_quietly()
        try:
            self.root.destroy()
        except Exception:
            pass
