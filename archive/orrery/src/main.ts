// main.ts — entry point. Wires the canvas, renderer, simulation clock,
// camera, HUD, and input, and runs the requestAnimationFrame loop. Degrades
// gracefully: if WebGL is unavailable the user sees a plain message.

import { Body, DAYS_PER_SECOND, TIME_WARP_STEPS, findBody } from "./bodies.js";
import { AU_SCALE } from "./bodies.js";
import { vec3, vec3Add, vec3Normalize, vec3Scale } from "./math.js";
import { orbitalPosition } from "./kepler.js";
import { Renderer } from "./renderer.js";
import { FreeCamera } from "./camera.js";
import { Hud } from "./ui.js";

const WARP_INDEX_START = 2; // 1×

/** World-space position of a body (matches the renderer's convention). */
const bodyPosition = (body: Body, simDays: number): Vec3Like => {
  if (body.elements.semiMajorAxisAU === 0) return vec3(0, 0, 0);
  const p = orbitalPosition(body.elements, simDays);
  return vec3(p.x * AU_SCALE, p.y * AU_SCALE, p.z * AU_SCALE);
};

type Vec3Like = ReturnType<typeof vec3>;

const main = (): void => {
  const canvas = document.getElementById("gl-canvas") as HTMLCanvasElement | null;
  if (!canvas) throw new Error("orrery: #gl-canvas not found");
  const overlay = document.getElementById("overlay") as HTMLElement | null;

  let renderer: Renderer;
  try {
    renderer = new Renderer(canvas);
  } catch (err) {
    showOverlay(overlay, `WebGL is required — ${err instanceof Error ? err.message : String(err)}`);
    return;
  }

  const camera = new FreeCamera();

  let simDays = 0;
  let timeSec = 0;
  let paused = false;
  let warpIndex = WARP_INDEX_START;
  let selected: string | null = null;
  let follow: Body | null = null;

  const hud = new Hud({
    onPauseToggle: () => {
      paused = !paused;
    },
    onWarpDelta: (delta) => {
      warpIndex = Math.max(0, Math.min(TIME_WARP_STEPS.length - 1, warpIndex + delta));
    },
    onWarpSet: (index) => {
      warpIndex = Math.max(0, Math.min(TIME_WARP_STEPS.length - 1, index));
    },
    onFlyTo: (id) => {
      if (id) {
        const body = findBody(id) ?? null;
        follow = body;
        selected = body ? body.id : null;
        hud.setSelected(selected);
      } else {
        follow = null;
        selected = null;
        hud.setSelected(null);
      }
    },
    onHudToggle: () => {
      /* the Hud toggles its own visibility */
    },
    onPick: (ndcX, ndcY) => {
      const id = renderer.pick(camera, simDays, ndcX, ndcY);
      if (id) {
        follow = findBody(id) ?? null;
        selected = id;
        hud.setSelected(id);
      } else {
        follow = null;
        selected = null;
        hud.setSelected(null);
      }
    },
    onRotate: (dx, dy) => {
      camera.rotate(dx, dy);
      follow = null;
    },
    onPan: (dx, dy) => {
      camera.pan(dx, dy);
      follow = null;
    },
    onZoom: (factor) => {
      camera.scaleSpeed(factor);
    },
  });

  const keys = new Set<string>();
  const keyDown = (e: KeyboardEvent): void => {
    keys.add(e.code);
    if (e.code === "Space") {
      e.preventDefault();
      paused = !paused;
    } else if (e.code === "Equal" || e.code === "NumpadAdd") {
      warpIndex = Math.max(0, Math.min(TIME_WARP_STEPS.length - 1, warpIndex + 1));
    } else if (e.code === "Minus" || e.code === "NumpadSubtract") {
      warpIndex = Math.max(0, Math.min(TIME_WARP_STEPS.length - 1, warpIndex - 1));
    } else if (e.code === "KeyH") {
      document.getElementById("hud-root")?.classList.toggle("hidden");
    } else if (e.code === "KeyF") {
      const target = follow ? null : (findBody(selected ?? "") ?? null);
      follow = target;
      if (target) {
        selected = target.id;
        hud.setSelected(target.id);
      }
    } else if (e.code === "Escape") {
      follow = null;
      selected = null;
      hud.setSelected(null);
    }
  };
  const keyUp = (e: KeyboardEvent): void => {
    keys.delete(e.code);
  };
  window.addEventListener("keydown", keyDown);
  window.addEventListener("keyup", keyUp);

  const resize = (): void => {
    const dpr = window.devicePixelRatio || 1;
    const width = Math.max(1, Math.floor(canvas.clientWidth * dpr));
    const height = Math.max(1, Math.floor(canvas.clientHeight * dpr));
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
      renderer.setViewport(width, height);
    }
  };
  resize();
  window.addEventListener("resize", resize);

  const breakFollowIfMoving = (): void => {
    const forward = (keys.has("KeyW") ? 1 : 0) - (keys.has("KeyS") ? 1 : 0);
    const strafe = (keys.has("KeyD") ? 1 : 0) - (keys.has("KeyA") ? 1 : 0);
    const vertical = (keys.has("KeyE") ? 1 : 0) - (keys.has("KeyQ") ? 1 : 0);
    camera.setKey("forward", forward);
    camera.setKey("strafe", strafe);
    camera.setKey("vertical", vertical);
    if (follow && (forward !== 0 || strafe !== 0 || vertical !== 0)) {
      follow = null;
    }
  };

  let last = performance.now();
  const frame = (now: number): void => {
    const dt = Math.min(0.05, Math.max(0, (now - last) / 1000));
    last = now;
    timeSec += dt;

    breakFollowIfMoving();
    camera.move(dt);

    if (follow) {
      const pos = bodyPosition(follow, simDays);
      const outward = vec3Normalize(pos);
      const target = vec3Add(pos, vec3Scale(outward, follow.visual.radius * 5 + 2));
      camera.approach(target, dt);
      camera.lookAt(pos);
    }

    if (!paused) {
      simDays += TIME_WARP_STEPS[warpIndex] * DAYS_PER_SECOND * dt;
    }

    renderer.draw(camera, simDays, { selected, timeSec });
    hud.update({ simDays, paused, warpIndex, selected });

    if (overlay) overlay.classList.add("hidden");
    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
};

const showOverlay = (overlay: HTMLElement | null, message: string): void => {
  if (!overlay) return;
  overlay.textContent = message;
  overlay.classList.remove("hidden");
  document.getElementById("controls")?.classList.add("hidden");
  document.getElementById("hud-root")?.classList.add("hidden");
};

main();