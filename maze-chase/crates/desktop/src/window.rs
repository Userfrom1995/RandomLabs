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
use std::time::Instant;
use winit::application::ApplicationHandler;
use winit::event::{ElementState, WindowEvent};
use winit::event_loop::{ActiveEventLoop, ControlFlow, EventLoop};
use winit::keyboard::{KeyCode, PhysicalKey};
use winit::window::{Fullscreen, Window, WindowId};

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
    last_frame: Option<crate::frame::Frame>,
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
            last_frame: None,
        }
    }

    fn ensure_surface(&mut self, event_loop: &ActiveEventLoop) {
        if self.window.is_none() {
            let attrs = winit::window::WindowAttributes::default()
                .with_title("Maze Chase")
                .with_inner_size(winit::dpi::LogicalSize::new(self.size.0, self.size.1));
            let window = match event_loop.create_window(attrs) {
                Ok(w) => Arc::from(w),
                Err(_) => {
                    event_loop.exit();
                    return;
                }
            };
            if self.fullscreen {
                window.set_fullscreen(Some(Fullscreen::Borderless(None)));
            }
            match Context::new(event_loop.owned_display_handle()) {
                Ok(context) => match Surface::new(&context, Arc::clone(&window)) {
                    Ok(mut surface) => {
                        resize_surface(&mut surface, self.size);
                        self.surface = Some(surface);
                        self.context = Some(context);
                        self.window = Some(window);
                    }
                    Err(_) => event_loop.exit(),
                },
                Err(_) => event_loop.exit(),
            }
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
        // `--probe` forever.
        if self.probe_left.is_some() {
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
            if let Some(frame) = &self.last_frame {
                if let Err(e) = std::fs::write(&path, frame.to_ppm()) {
                    eprintln!("maze-chase-desktop: probe screenshot failed ({e})");
                    std::process::exit(1);
                }
            } else {
                // No frame was ever presented: render one headless shot
                // so --probe still yields evidence instead of exit 0
                // with no file.
                match self.app.render(self.size.0, self.size.1) {
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
/// `Err` (exit 1) when no display/backend exists.
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
    match event_loop.run_app(&mut runner) {
        Ok(()) => 0,
        Err(e) => {
            eprintln!("maze-chase-desktop: event loop failed ({e})");
            1
        }
    }
}
