//! Desktop window backend: winit event loop plus softbuffer presentation.
//!
//! [`run`] owns everything the library cannot: window creation, the
//! software surface, frame pacing, and OS event plumbing. The game
//! itself lives in [`App`]: this module maps winit events to `App`
//! calls and presents `App` frames. Rendering and simulation stay
//! hardware-free and fully tested; this file is the thin tested-by-
//! per-OS-runners edge (plus [`Opts`] plumbing from [`crate::cli`]).

use crate::app::App;
use crate::cli::Opts;
use crate::input::winit_to_key;
use softbuffer::{Context, Surface};
use std::num::NonZeroU32;
use std::sync::Arc;
use std::time::{Duration, Instant};
use winit::application::ApplicationHandler;
use winit::event::{ElementState, WindowEvent};
use winit::event_loop::{ActiveEventLoop, ControlFlow, EventLoop};
use winit::keyboard::{KeyCode, PhysicalKey};
use winit::window::{Fullscreen, Window, WindowId};

/// How long a fullscreen `--probe` waits for the window manager to apply
/// the fullscreen resize before capturing at the size the window has.
const FULLSCREEN_SETTLE: Duration = Duration::from_secs(2);

/// Fatal window-bootstrap failure: reported on stderr with exit code 1.
///
/// Every variant used to be a silent `event_loop.exit()`, so a broken
/// display or window manager produced no window, no probe file, and a
/// success exit code.
#[derive(Clone, Debug, PartialEq, Eq)]
enum BootFailure {
    /// The OS refused to create the window (no usable visual, WM refusal).
    Window(String),
    /// softbuffer could not create its display context.
    Context(String),
    /// softbuffer could not create the presentation surface.
    Surface(String),
}

impl BootFailure {
    /// One-line human reason including the underlying backend error.
    fn report(&self) -> String {
        match self {
            Self::Window(e) => format!("cannot create the game window ({e})"),
            Self::Context(e) => format!("cannot create the display context ({e})"),
            Self::Surface(e) => format!("cannot create the presentation surface ({e})"),
        }
    }
}

/// Probe countdown schedule across the startup fullscreen resize.
///
/// A `--fullscreen --probe` run used to start counting redraws while the
/// window was still at its launch size, so small budgets captured the
/// pre-resize 1100x760 frame instead of the display-sized one. The gate
/// holds the countdown until a `Resized` event delivers the monitor's
/// size, with a wall-clock budget so a window manager that never applies
/// the hint cannot hang `--probe` (a bare X server has no WM at all).
#[derive(Clone, Debug)]
enum ProbeGate {
    /// Countdown ticks on every redraw (windowed probes; settled fullscreen).
    Open,
    /// Fullscreen probe waiting for the resize: `expected` is the monitor
    /// size when known, `deadline` bounds the wait.
    AwaitingResize {
        expected: Option<(u32, u32)>,
        deadline: Instant,
    },
}

impl ProbeGate {
    /// Gate a launched session: fullscreen probes hold for the resize.
    fn arm(fullscreen: bool, expected: Option<(u32, u32)>, now: Instant) -> Self {
        if fullscreen {
            Self::AwaitingResize {
                expected,
                deadline: now + FULLSCREEN_SETTLE,
            }
        } else {
            Self::Open
        }
    }

    /// A window resize arrived: the fullscreen display size ends the wait
    /// (any resize does when the monitor size is unknown).
    fn note_resize(&mut self, size: (u32, u32)) {
        if let Self::AwaitingResize { expected, .. } = self {
            if expected.is_none() || *expected == Some(size) {
                *self = Self::Open;
            }
        }
    }

    /// May the probe countdown tick now? Releases itself at the deadline.
    fn ready(&mut self, now: Instant) -> bool {
        if let Self::AwaitingResize { deadline, .. } = self {
            if now >= *deadline {
                *self = Self::Open;
            }
        }
        matches!(self, Self::Open)
    }
}

/// Physical size of the window's monitor (the borderless-fullscreen
/// target), filtering the dummy 1x1 monitor winit reports when no monitor
/// information exists yet.
fn monitor_size(window: &Window) -> Option<(u32, u32)> {
    fn usable(monitor: winit::monitor::MonitorHandle) -> Option<(u32, u32)> {
        let size = monitor.size();
        (size.width > 1 && size.height > 1).then_some((size.width, size.height))
    }
    window
        .current_monitor()
        .and_then(usable)
        .or_else(|| window.primary_monitor().and_then(usable))
}

/// Runtime window state around the session.
struct Runner {
    app: App,
    opts: Opts,
    window: Option<Arc<Window>>,
    surface: Option<Surface<DisplayHandle, Arc<Window>>>,
    context: Option<Context<DisplayHandle>>,
    size: (u32, u32),
    fullscreen: bool,
    last: Instant,
    probe_left: Option<(u32, std::path::PathBuf)>,
    probe_gate: ProbeGate,
    last_frame: Option<crate::frame::Frame>,
    fatal: Option<BootFailure>,
}

use winit::event_loop::OwnedDisplayHandle as DisplayHandle;

impl Runner {
    fn new(app: App, opts: Opts) -> Self {
        Self {
            app,
            fullscreen: opts.fullscreen,
            probe_left: opts.probe.clone(),
            opts,
            window: None,
            surface: None,
            context: None,
            size: (1100, 760),
            last: Instant::now(),
            probe_gate: ProbeGate::Open,
            last_frame: None,
            fatal: None,
        }
    }

    fn ensure_surface(&mut self, event_loop: &ActiveEventLoop) {
        if self.window.is_some() || self.fatal.is_some() {
            return;
        }
        let attrs = winit::window::WindowAttributes::default()
            .with_title("Maze Chase")
            .with_inner_size(winit::dpi::LogicalSize::new(self.size.0, self.size.1));
        let window = match event_loop.create_window(attrs) {
            Ok(w) => Arc::from(w),
            Err(e) => {
                self.abort(event_loop, BootFailure::Window(e.to_string()));
                return;
            }
        };
        if self.fullscreen {
            self.probe_gate = ProbeGate::arm(
                self.probe_left.is_some(),
                monitor_size(&window),
                Instant::now(),
            );
            window.set_fullscreen(Some(Fullscreen::Borderless(None)));
        }
        let context = match Context::new(event_loop.owned_display_handle()) {
            Ok(context) => context,
            Err(e) => {
                self.abort(event_loop, BootFailure::Context(e.to_string()));
                return;
            }
        };
        let mut surface = match Surface::new(&context, Arc::clone(&window)) {
            Ok(surface) => surface,
            Err(e) => {
                self.abort(event_loop, BootFailure::Surface(e.to_string()));
                return;
            }
        };
        resize_surface(&mut surface, self.size);
        self.surface = Some(surface);
        self.context = Some(context);
        self.window = Some(window);
    }

    /// Record a fatal bootstrap failure and stop the loop; [`Self::run`]
    /// prints it and exits non-zero.
    fn abort(&mut self, event_loop: &ActiveEventLoop, failure: BootFailure) {
        if self.fatal.is_none() {
            self.fatal = Some(failure);
        }
        event_loop.exit();
    }

    /// Exit code after the loop stops: 0 for a clean quit, 1 (with the
    /// recorded reason on stderr) for a fatal bootstrap failure.
    fn exit_after_loop(&self) -> i32 {
        match &self.fatal {
            Some(failure) => {
                eprintln!("maze-chase-desktop: {}", failure.report());
                eprintln!("Run on a desktop session. --help for options.");
                1
            }
            None => 0,
        }
    }

    fn toggle_fullscreen(&mut self) {
        self.fullscreen = !self.fullscreen;
        if let Some(window) = &self.window {
            window.set_fullscreen(self.fullscreen.then(|| Fullscreen::Borderless(None)));
        }
    }

    fn draw(&mut self) {
        let now = Instant::now();
        let dt = (now - self.last).as_secs_f64().clamp(0.0, 0.25);
        self.last = now;
        self.app.poll_pad();
        self.app.tick(dt);
        // The probe countdown runs per redraw request even when the
        // frame cannot be presented, so a headless stall cannot hang
        // `--probe` forever. A fullscreen probe first waits for the
        // window-manager resize (bounded by `FULLSCREEN_SETTLE`), so the
        // capture cannot keep the pre-resize window size.
        if self.probe_left.is_some() && self.probe_gate.ready(now) {
            self.tick_probe();
            if self.probe_left.is_none() {
                return;
            }
        }
        let Some(frame) = self.app.render(self.size.0, self.size.1) else {
            return;
        };
        let (Some(surface), Some(_)) = (self.surface.as_mut(), self.window.as_ref()) else {
            return;
        };
        resize_surface(surface, self.size);
        let Ok(mut buffer) = surface.buffer_mut() else {
            return;
        };
        let n = (self.size.0 as usize * self.size.1 as usize)
            .min(buffer.len())
            .min(frame.px.len());
        buffer[..n].copy_from_slice(&frame.px[..n]);
        buffer.present().ok();
        self.last_frame = Some(frame);
    }

    /// Bounded verification countdown: persist the last screenshot and
    /// stop the loop when the frame budget runs out.
    fn tick_probe(&mut self) {
        let Some((left, path)) = self.probe_left.clone() else {
            return;
        };
        if left <= 1 {
            // Capture at the window's current size: a frame presented
            // before a pending resize must not be written with stale
            // dimensions (called only once; the session stops after).
            let frame = self
                .last_frame
                .take()
                .filter(|f| (f.w, f.h) == self.size)
                .or_else(|| self.app.render(self.size.0, self.size.1));
            match frame {
                Some(frame) => {
                    if let Err(e) = std::fs::write(&path, frame.to_ppm()) {
                        eprintln!("maze-chase-desktop: probe screenshot failed ({e})");
                        std::process::exit(1);
                    }
                }
                None => {
                    eprintln!("maze-chase-desktop: probe could not render a frame");
                    std::process::exit(1);
                }
            }
            self.probe_left = None;
            self.app.quit = true;
        } else {
            self.probe_left = Some((left - 1, path));
        }
    }
}

fn resize_surface(surface: &mut Surface<DisplayHandle, Arc<Window>>, size: (u32, u32)) {
    if let (Some(w), Some(h)) = (NonZeroU32::new(size.0), NonZeroU32::new(size.1)) {
        surface.resize(w, h).ok();
    }
}

impl ApplicationHandler for Runner {
    fn resumed(&mut self, event_loop: &ActiveEventLoop) {
        self.ensure_surface(event_loop);
    }

    fn about_to_wait(&mut self, event_loop: &ActiveEventLoop) {
        if self.app.quit {
            event_loop.exit();
            return;
        }
        if let Some(window) = &self.window {
            window.request_redraw();
        } else {
            self.ensure_surface(event_loop);
        }
    }

    fn window_event(&mut self, event_loop: &ActiveEventLoop, _id: WindowId, event: WindowEvent) {
        match event {
            WindowEvent::CloseRequested => event_loop.exit(),
            WindowEvent::Resized(size) => {
                self.size = (size.width.max(1), size.height.max(1));
                self.probe_gate.note_resize(self.size);
            }
            WindowEvent::RedrawRequested => self.draw(),
            WindowEvent::KeyboardInput { event, .. } => {
                if event.state != ElementState::Pressed {
                    return;
                }
                if event.physical_key == PhysicalKey::Code(KeyCode::KeyF) {
                    self.toggle_fullscreen();
                    return;
                }
                if let PhysicalKey::Code(code) = event.physical_key {
                    if let Some(key) = winit_to_key(code) {
                        self.app.on_key(key);
                    }
                }
            }
            _ => {}
        }
    }
}

/// Open the window and run the game. Returns the process exit code.
/// `Err` (exit 1) when no display/backend exists or the window cannot be
/// created (a clear reason goes to stderr in both cases).
pub fn run(app: App, opts: Opts) -> i32 {
    let event_loop = match EventLoop::new() {
        Ok(el) => el,
        Err(_) => {
            eprintln!("maze-chase-desktop: cannot open a display (no windowing backend)");
            eprintln!("Run on a desktop session. --help for options.");
            return 1;
        }
    };
    event_loop.set_control_flow(ControlFlow::Poll);
    let mut runner = Runner::new(app, opts);
    if runner.opts.no_pad {
        runner.app.pad = crate::gamepad::PadPoll::absent();
    }
    let loop_result = event_loop.run_app(&mut runner);
    if runner.fatal.is_some() {
        return runner.exit_after_loop();
    }
    match loop_result {
        Ok(()) => 0,
        Err(e) => {
            eprintln!("maze-chase-desktop: event loop failed ({e})");
            1
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use maze_chase_assets::themes::Rgb;
    use maze_chase_audio::sink::NullSink;
    use std::path::PathBuf;
    use std::time::SystemTime;

    fn tag(suffix: &str) -> String {
        format!(
            "{}-{}",
            suffix,
            SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .map(|d| d.subsec_nanos())
                .unwrap_or(0)
        )
    }

    /// A Runner with no window, audio device, or input hardware.
    fn test_runner(fullscreen: bool, probe: Option<(u32, PathBuf)>) -> Runner {
        let dir = std::env::temp_dir().join(tag("maze-chase-window-config"));
        let app = App::with_audio(dir.clone(), Box::new(NullSink::new()), false);
        let opts = Opts {
            fullscreen,
            no_pad: true,
            dir,
            probe,
        };
        Runner::new(app, opts)
    }

    fn temp_probe_path(suffix: &str) -> PathBuf {
        std::env::temp_dir().join(format!("{}.ppm", tag(suffix)))
    }

    #[test]
    fn probe_gate_is_open_for_windowed_probes() {
        let now = Instant::now();
        let mut gate = ProbeGate::arm(false, Some((1280, 1024)), now);
        assert!(gate.ready(now), "windowed probes tick immediately");
    }

    #[test]
    fn probe_gate_holds_until_the_display_resize_lands() {
        let now = Instant::now();
        let mut gate = ProbeGate::arm(true, Some((1280, 1024)), now);
        assert!(!gate.ready(now), "held while the resize is pending");
        gate.note_resize((1100, 760));
        assert!(
            !gate.ready(now),
            "the pre-resize window size must not release the gate"
        );
        gate.note_resize((1280, 1024));
        assert!(gate.ready(now), "the display resize releases the gate");
    }

    #[test]
    fn probe_gate_expires_so_a_missing_resize_never_hangs() {
        let now = Instant::now();
        let mut gate = ProbeGate::arm(true, Some((1280, 1024)), now);
        assert!(!gate.ready(now));
        assert!(!gate.ready(now + FULLSCREEN_SETTLE - Duration::from_millis(1)));
        assert!(
            gate.ready(now + FULLSCREEN_SETTLE),
            "the settle budget must release a WM that never resizes"
        );
    }

    #[test]
    fn probe_gate_falls_back_to_any_resize_without_monitor_info() {
        let now = Instant::now();
        let mut gate = ProbeGate::arm(true, None, now);
        assert!(!gate.ready(now));
        gate.note_resize((999, 777));
        assert!(gate.ready(now), "any resize is the best signal available");
    }

    #[test]
    fn boot_failures_report_the_stage_and_exit_nonzero() {
        let cases = [
            (
                BootFailure::Window("boom".into()),
                "cannot create the game window",
            ),
            (
                BootFailure::Context("ctx".into()),
                "cannot create the display context",
            ),
            (
                BootFailure::Surface("surf".into()),
                "cannot create the presentation surface",
            ),
        ];
        for (failure, needle) in cases {
            let report = failure.report();
            assert!(
                report.contains(needle),
                "report must name the stage: {report}"
            );
            assert!(
                report.contains("boom") || report.contains("ctx") || report.contains("surf"),
                "report must keep the backend error: {report}"
            );
            let mut runner = test_runner(false, None);
            runner.fatal = Some(failure);
            assert_eq!(
                runner.exit_after_loop(),
                1,
                "a bootstrap failure must exit non-zero, never silent 0"
            );
        }
        assert_eq!(
            test_runner(false, None).exit_after_loop(),
            0,
            "a clean loop exit stays 0"
        );
    }

    #[test]
    fn probe_capture_never_writes_a_stale_size_frame() {
        let path = temp_probe_path("maze-chase-window-stale");
        let mut runner = test_runner(false, Some((1, path.clone())));
        runner.size = (1100, 760);
        runner.last_frame = Some(crate::frame::Frame::blank(1280, 1024, Rgb(255, 0, 0)).unwrap());
        runner.tick_probe();
        assert!(runner.probe_left.is_none());
        assert!(runner.app.quit, "the probe must stop the session");
        let ppm = std::fs::read(&path).unwrap();
        let header = b"P6\n1100 760\n255\n";
        assert!(
            ppm.starts_with(header),
            "capture must use the current window size"
        );
        assert_ne!(
            &ppm[header.len()..header.len() + 3],
            [255, 0, 0],
            "the stale 1280x1024 frame must be re-rendered at 1100x760"
        );
        let _ = std::fs::remove_file(&path);
    }

    #[test]
    fn probe_capture_reuses_the_presented_frame_for_the_current_size() {
        let path = temp_probe_path("maze-chase-window-fresh");
        let mut runner = test_runner(false, Some((1, path.clone())));
        runner.size = (1100, 760);
        runner.last_frame = Some(crate::frame::Frame::blank(1100, 760, Rgb(255, 0, 0)).unwrap());
        runner.tick_probe();
        let ppm = std::fs::read(&path).unwrap();
        let header = b"P6\n1100 760\n255\n";
        assert!(ppm.starts_with(header));
        assert_eq!(
            &ppm[header.len()..header.len() + 3],
            [255, 0, 0],
            "a frame presented at the current size is written as-is"
        );
        let _ = std::fs::remove_file(&path);
    }
}
