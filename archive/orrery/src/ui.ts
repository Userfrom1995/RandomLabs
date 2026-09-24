// ui.ts — DOM overlay. The HUD readout (sim date, warp, selected body) and
// the control bar (pause, warp −/+, slider, fly-to menu, HUD toggle) are
// static in index.html; this module queries them, wires the controls to
// callbacks, and repaints the readout each frame. Pointer input (drag to
// rotate, right-drag to pan, wheel for speed/ctrl+wheel for warp, click to
// pick) is also handled here.

import { EPOCH_MS, PLANETS_ONLY, TIME_WARP_STEPS } from "./bodies.js";

export interface HudCallbacks {
  onPauseToggle: () => void;
  onWarpDelta: (delta: number) => void;
  onWarpSet: (index: number) => void;
  onFlyTo: (id: string | null) => void;
  onHudToggle: () => void;
  onPick: (ndcX: number, ndcY: number) => void;
  onRotate: (dx: number, dy: number) => void;
  onPan: (dx: number, dy: number) => void;
  onZoom: (factor: number) => void;
}

export interface HudState {
  simDays: number;
  paused: boolean;
  warpIndex: number;
  selected: string | null;
}

const warpLabel = (index: number): string => {
  const v = TIME_WARP_STEPS[index] ?? 1;
  return v < 1 ? `${v.toFixed(2)}×` : `${v}×`;
};

export class Hud {
  private readonly callbacks: HudCallbacks;
  private readonly dateEl: HTMLElement;
  private readonly pausedEl: HTMLElement;
  private readonly warpEl: HTMLElement;
  private readonly bodyEl: HTMLElement;
  private readonly pauseBtn: HTMLButtonElement;
  private readonly warpSlider: HTMLInputElement;
  private readonly flySelect: HTMLSelectElement;
  private readonly root: HTMLElement;

  private dragging = false;
  private moved = 0;
  private lastX = 0;
  private lastY = 0;
  private pointers = new Map<number, { x: number; y: number }>();
  private pinchDist = 0;

  constructor(callbacks: HudCallbacks) {
    this.callbacks = callbacks;
    this.root = mustGet("#hud-root");
    this.dateEl = mustGet("#hud-date");
    this.pausedEl = mustGet("#hud-paused");
    this.warpEl = mustGet("#hud-warp");
    this.bodyEl = mustGet("#hud-body");
    this.pauseBtn = mustGet("#btn-pause") as HTMLButtonElement;
    this.warpSlider = mustGet("#warp-slider") as HTMLInputElement;
    this.flySelect = mustGet("#fly-select") as HTMLSelectElement;

    for (const planet of PLANETS_ONLY) {
      const opt = document.createElement("option");
      opt.value = planet.id;
      opt.textContent = planet.name;
      this.flySelect.appendChild(opt);
    }

    this.pauseBtn.addEventListener("click", () => this.callbacks.onPauseToggle());
    mustGet("#btn-warp-down").addEventListener("click", () => this.callbacks.onWarpDelta(-1));
    mustGet("#btn-warp-up").addEventListener("click", () => this.callbacks.onWarpDelta(1));
    this.warpSlider.addEventListener("input", () => {
      this.callbacks.onWarpSet(Number(this.warpSlider.value));
    });
    this.flySelect.addEventListener("change", () => {
      const id = this.flySelect.value || null;
      this.callbacks.onFlyTo(id);
    });
    mustGet("#btn-hud").addEventListener("click", () => {
      this.root.classList.toggle("hidden");
      this.callbacks.onHudToggle();
    });

    this.wirePointer();
    this.wireWheel();
  }

  /** Repaint the HUD readout; called every frame. */
  update(state: HudState): void {
    const date = new Date(EPOCH_MS + state.simDays * 86400000);
    this.dateEl.textContent = date.toISOString().slice(0, 19).replace("T", " ");
    this.pausedEl.textContent = state.paused ? "paused" : "running";
    this.pausedEl.classList.toggle("paused", state.paused);
    this.warpEl.textContent = warpLabel(state.warpIndex);
    this.bodyEl.textContent = state.selected
      ? PLANETS_ONLY.find((p) => p.id === state.selected)?.name ?? "—"
      : "—";
    this.warpSlider.value = String(state.warpIndex);
    this.pauseBtn.textContent = state.paused ? "▶ Resume" : "❚❚ Pause";
  }

  /** Programmatic selection change (e.g. from a click-pick). */
  setSelected(id: string | null): void {
    this.flySelect.value = id ?? "";
  }

  private wireWheel(): void {
    const onWheel = (e: WheelEvent): void => {
      e.preventDefault();
      const factor = Math.exp(-e.deltaY * 0.0012);
      if (e.ctrlKey) {
        this.callbacks.onWarpDelta(Math.sign(e.deltaY));
      } else {
        this.callbacks.onZoom(factor);
      }
    };
    window.addEventListener("wheel", onWheel, { passive: false });
  }

  private wirePointer(): void {
    const canvas = mustGet("#gl-canvas") as HTMLCanvasElement;
    const rect = () => canvas.getBoundingClientRect();

    canvas.addEventListener("pointerdown", (e) => {
      this.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      canvas.setPointerCapture(e.pointerId);
      if (this.pointers.size === 1) {
        this.dragging = true;
        this.moved = 0;
        this.lastX = e.clientX;
        this.lastY = e.clientY;
      } else if (this.pointers.size === 2) {
        this.pinchDist = pointerDistance(this.pointers);
      }
    });

    canvas.addEventListener("pointermove", (e) => {
      const pt = this.pointers.get(e.pointerId);
      if (pt) {
        pt.x = e.clientX;
        pt.y = e.clientY;
      }
      if (this.pointers.size === 2) {
        const d = pointerDistance(this.pointers);
        if (this.pinchDist > 0) {
          this.callbacks.onZoom(d / this.pinchDist);
        }
        this.pinchDist = d;
        return;
      }
      if (!this.dragging) return;
      const dx = e.clientX - this.lastX;
      const dy = e.clientY - this.lastY;
      this.lastX = e.clientX;
      this.lastY = e.clientY;
      this.moved += Math.abs(dx) + Math.abs(dy);
      const isPrimary = e.buttons === 1;
      const isPan = e.buttons === 2 || e.buttons === 4;
      if (isPan) this.callbacks.onPan(dx, dy);
      else if (isPrimary) this.callbacks.onRotate(dx * 0.0035, dy * 0.0035);
    });

    canvas.addEventListener("pointerup", (e) => {
      const wasDragging = this.dragging && this.pointers.size === 1;
      this.pointers.delete(e.pointerId);
      if (this.pointers.size === 0) {
        this.dragging = false;
        this.pinchDist = 0;
      }
      if (wasDragging && this.moved < 6 && e.button === 0) {
        const r = rect();
        const ndcX = ((e.clientX - r.left) / r.width) * 2 - 1;
        const ndcY = -((e.clientY - r.top) / r.height) * 2 + 1;
        this.callbacks.onPick(ndcX, ndcY);
      }
    });

    canvas.addEventListener("contextmenu", (e) => e.preventDefault());
  }
}

const pointerDistance = (pointers: Map<number, { x: number; y: number }>): number => {
  const pts = [...pointers.values()];
  if (pts.length < 2) return 0;
  const dx = pts[0].x - pts[1].x;
  const dy = pts[0].y - pts[1].y;
  return Math.sqrt(dx * dx + dy * dy);
};

const mustGet = (selector: string): HTMLElement => {
  const el = document.querySelector(selector);
  if (!el) throw new Error(`ui: missing element ${selector}`);
  return el as HTMLElement;
};