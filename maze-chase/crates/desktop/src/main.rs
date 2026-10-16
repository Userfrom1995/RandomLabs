//! `maze-chase-desktop`: the native desktop game binary.
//!
//! Owns everything the library cannot: CLI parsing, session
//! construction, and the winit event loop. The game itself lives in
//! the library (`App`): this file maps the CLI outcome to an exit code.

use maze_chase_desktop::app::App;
use maze_chase_desktop::cli::{parse_args, usage, Cli, VERSION};
use maze_chase_desktop::window;

fn main() {
    let args: Vec<String> = std::env::args().skip(1).collect();
    match parse_args(&args) {
        Cli::Help => println!("{}", usage()),
        Cli::Version => println!("maze-chase-desktop {VERSION}"),
        Cli::Error(msg) => {
            eprintln!("{msg}");
            std::process::exit(2);
        }
        Cli::Run(opts) => {
            let app = App::new(opts.dir.clone());
            std::process::exit(window::run(app, opts));
        }
    }
}
