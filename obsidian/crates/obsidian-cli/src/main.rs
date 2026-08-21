#[path = "bench.rs"]
mod bench;
mod cli;
mod image_io;

fn main() {
    std::process::exit(cli::run(std::env::args().skip(1).collect()));
}
