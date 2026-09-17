/* M1 doomgeneric web shim (doomgeneric DG_* five-function boundary).
 * Compiled with build/emcc_m1.sh into wasm/doom-simd.wasm + doom-scalar.wasm.
 * Exposes the stable engine boundary: dg_ScreenBuffer pointer plus width and
 * height, tick entry, key queue. M1 renders into dg_ScreenBuffer;
 *
 * Wires to doomgeneric upstream (ozkl/doomgeneric, GPL-2.0):
 *   doomgeneric_Create(argc, argv) then doomgeneric_Tick() per 35 Hz step.
 * JS drives ticks from the rAF accumulator and uploads dg_ScreenBuffer
 */
#include <stdint.h>
#include <string.h>

#define DOOM_FB_W 320
#define DOOM_FB_H 200

/* Exported 8-bit paletted framebuffer: W*H bytes in Wasm linear memory. */
uint8_t dg_ScreenBuffer[DOOM_FB_W * DOOM_FB_H];

/* Key queue: written by JS (queueKey), consumed once per tick. */
#define KEYQ_SIZE 64
static int keyq[KEYQ_SIZE];
static int keyq_head = 0, keyq_tail = 0;

void DG_QueueKey(int key, int pressed) {
    int v = pressed ? (key & 0xffff) : (0x10000 | (key & 0xffff));
    keyq[keyq_tail] = v;
    keyq_tail = (keyq_tail + 1) % KEYQ_SIZE;
    if (keyq_tail == keyq_head) keyq_head = (keyq_head + 1) % KEYQ_SIZE;
}

/* doomgeneric platform hooks implemented for the web target. */
void DG_Init(void) { memset(dg_ScreenBuffer, 0, sizeof(dg_ScreenBuffer)); }

void DG_DrawFrame(void) {
    /* doomgeneric core writes into dg_ScreenBuffer; nothing to copy:
       JS views this buffer directly (zero-copy contract). */
}

void DG_SleepMs(uint32_t ms) { (void)ms; /* rAF-driven; never block */ }

uint32_t DG_GetTicksMs(void) { return 0; /* clock lives in JS (performance.now) */ }

int DG_GetKey(int *pressed, unsigned char *key) {
    if (keyq_head == keyq_tail) return 0;
    int v = keyq[keyq_head];
    keyq_head = (keyq_head + 1) % KEYQ_SIZE;
    *pressed = (v & 0x10000) ? 0 : 1;
    *key = (unsigned char)(v & 0xff);
    return 1;
}

/* Stable boundary exports (same shape as src/engine/doomEngine.js). */
uint8_t *doom_getFrameBuffer(void) { return dg_ScreenBuffer; }
int doom_getWidth(void) { return DOOM_FB_W; }
int doom_getHeight(void) { return DOOM_FB_H; }
