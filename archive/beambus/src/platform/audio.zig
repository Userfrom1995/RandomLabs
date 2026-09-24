//! Beambus SDL audio glue: owns the SDL audio device and a synth, feeding
//! it via SDL_QueueAudio (no callback, no threads). Degrades to silent when
//! no audio device exists (headless CI).
const std = @import("std");
const c = @cImport({
    @cInclude("SDL.h");
});
const synth = @import("synth.zig");
const Synth = synth.Synth;
const Sfx = synth.Sfx;
pub const sample_rate = synth.sample_rate;

pub const Audio = struct {
    device: c.SDL_AudioDeviceID = 0,
    synth: Synth = .{},
    enabled: bool = false,
    /// Scratch buffer for one frame of samples.
    buf: [2048]f32 = undefined,

    pub fn init(self: *Audio) void {
        var want: c.SDL_AudioSpec = undefined;
        want.freq = sample_rate;
        want.format = c.AUDIO_F32;
        want.channels = 1;
        want.samples = 512;
        want.callback = null;
        want.userdata = null;
        var got: c.SDL_AudioSpec = undefined;
        self.device = c.SDL_OpenAudioDevice(null, 0, &want, &got, 0);
        if (self.device == 0) {
            // No audio hardware (e.g. headless CI); keep playing silent.
            self.enabled = false;
            return;
        }
        c.SDL_PauseAudioDevice(self.device, 0);
        self.enabled = true;
    }

    pub fn deinit(self: *Audio) void {
        if (self.device != 0) c.SDL_CloseAudioDevice(self.device);
        self.device = 0;
        self.enabled = false;
    }

    pub fn trigger(self: *Audio, sfx: Sfx) void {
        if (!self.enabled) return;
        self.synth.trigger(sfx);
    }

    /// Synthesizes and queues `frames` samples of the current mix.
    pub fn pump(self: *Audio, frames: usize) void {
        if (!self.enabled) return;
        if (frames > self.buf.len) return;
        const dt = 1.0 / @as(f32, @floatFromInt(sample_rate));
        self.synth.render(self.buf[0..frames], dt);
        const bytes: usize = frames * @sizeOf(f32);
        _ = c.SDL_QueueAudio(self.device, &self.buf, @intCast(bytes));
    }
};