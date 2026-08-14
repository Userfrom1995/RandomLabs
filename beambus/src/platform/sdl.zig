//! Beambus SDL platform layer: window, renderer, streaming texture and
//! input. Kept as a thin typed wrapper over the SDL C API so the game loop
//! in main.zig stays readable.
const std = @import("std");
const c = @cImport({
    @cInclude("SDL.h");
});

pub const Error = error{ SdlInit, SdlWindow, SdlRenderer, SdlTexture };

/// Number of SDL scancodes; sized key arrays in the game loop.
pub const scan_count = c.SDL_NUM_SCANCODES;

/// Milliseconds since SDL was initialized, as seconds.
pub fn now() f64 {
    return @as(f64, @floatFromInt(c.SDL_GetTicks())) / 1000.0;
}

/// The input snapshot the platform layer produces each frame.
pub const KeyState = struct {
    left: bool = false,
    right: bool = false,
    up: bool = false,
    down: bool = false,
    fire: bool = false,
    bomb: bool = false,
    focus: bool = false,
    pause: bool = false,
    quit: bool = false,
    restart: bool = false,
};

/// A window, renderer and a streaming texture for the software framebuffer.
pub const Platform = struct {
    window: *c.SDL_Window,
    renderer: *c.SDL_Renderer,
    texture: *c.SDL_Texture,
    width: i32,
    height: i32,

    /// Creates the window, renderer and a streaming ARGB texture of the
    /// arena size. `scale` scales the arena up to the window size.
    pub fn init(scale: u32) !Platform {
        if (c.SDL_Init(c.SDL_INIT_VIDEO | c.SDL_INIT_AUDIO) != 0) {
            std.debug.print("SDL_Init failed: {s}\n", .{c.SDL_GetError()});
            return error.SdlInit;
        }
        errdefer c.SDL_Quit();

        const w: i32 = @intCast(core_arena_w * scale);
        const h: i32 = @intCast(core_arena_h * scale);
        const win = c.SDL_CreateWindow(
            "Beambus",
            c.SDL_WINDOWPOS_UNDEFINED,
            c.SDL_WINDOWPOS_UNDEFINED,
            w,
            h,
            c.SDL_WINDOW_SHOWN,
        ) orelse {
            std.debug.print("SDL_CreateWindow failed: {s}\n", .{c.SDL_GetError()});
            return error.SdlWindow;
        };
        errdefer c.SDL_DestroyWindow(win);

        const ren = c.SDL_CreateRenderer(win, -1, c.SDL_RENDERER_ACCELERATED | c.SDL_RENDERER_PRESENTVSYNC) orelse
            c.SDL_CreateRenderer(win, -1, 0) orelse {
            std.debug.print("SDL_CreateRenderer failed: {s}\n", .{c.SDL_GetError()});
            return error.SdlRenderer;
        };
        errdefer c.SDL_DestroyRenderer(ren);

        const tex = c.SDL_CreateTexture(
            ren,
            c.SDL_PIXELFORMAT_ARGB8888,
            c.SDL_TEXTUREACCESS_STREAMING,
            @intCast(core_arena_w),
            @intCast(core_arena_h),
        ) orelse {
            std.debug.print("SDL_CreateTexture failed: {s}\n", .{c.SDL_GetError()});
            return error.SdlTexture;
        };
        errdefer c.SDL_DestroyTexture(tex);

        return .{
            .window = win,
            .renderer = ren,
            .texture = tex,
            .width = w,
            .height = h,
        };
    }

    pub fn deinit(self: *Platform) void {
        c.SDL_DestroyTexture(self.texture);
        c.SDL_DestroyRenderer(self.renderer);
        c.SDL_DestroyWindow(self.window);
        c.SDL_Quit();
    }

    /// Polls events and returns the combined input snapshot for the frame.
    pub fn pollInput(self: *const Platform, keys: *[c.SDL_NUM_SCANCODES]bool) KeyState {
        _ = self;
        var out = KeyState{};
        var event: c.SDL_Event = undefined;
        while (c.SDL_PollEvent(&event) != 0) {
            switch (event.type) {
                c.SDL_QUIT => out.quit = true,
                c.SDL_KEYDOWN => {
                    if (event.key.repeat == 0) keys[event.key.keysym.scancode] = true;
                },
                c.SDL_KEYUP => {
                    keys[event.key.keysym.scancode] = false;
                },
                else => {},
            }
        }
        out.left = keys[c.SDL_SCANCODE_LEFT] or keys[c.SDL_SCANCODE_A];
        out.right = keys[c.SDL_SCANCODE_RIGHT] or keys[c.SDL_SCANCODE_D];
        out.up = keys[c.SDL_SCANCODE_UP] or keys[c.SDL_SCANCODE_W];
        out.down = keys[c.SDL_SCANCODE_DOWN] or keys[c.SDL_SCANCODE_S];
        out.fire = keys[c.SDL_SCANCODE_SPACE] or keys[c.SDL_SCANCODE_Z] or keys[c.SDL_SCANCODE_X];
        out.bomb = keys[c.SDL_SCANCODE_B] or keys[c.SDL_SCANCODE_V];
        out.focus = keys[c.SDL_SCANCODE_LSHIFT] or keys[c.SDL_SCANCODE_RSHIFT];
        out.pause = keys[c.SDL_SCANCODE_P] or keys[c.SDL_SCANCODE_ESCAPE];
        out.restart = keys[c.SDL_SCANCODE_R];
        return out;
    }

    /// Uploads the software framebuffer to the texture and presents it,
    /// scaled to the window (nearest-neighbour via render copy).
    pub fn present(self: *Platform, pixels: [*]const u32) void {
        _ = c.SDL_UpdateTexture(self.texture, null, pixels, core_arena_w * @sizeOf(u32));
        _ = c.SDL_RenderClear(self.renderer);
        _ = c.SDL_RenderCopy(self.renderer, self.texture, null, null);
        c.SDL_RenderPresent(self.renderer);
    }
};

const core = @import("../core/core.zig");
const core_arena_w = core.arena_w;
const core_arena_h = core.arena_h;