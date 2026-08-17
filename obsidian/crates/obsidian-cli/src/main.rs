#[path = "bench.rs"]
mod bench;
mod cli;

fn main() {
    std::process::exit(cli::run(std::env::args().skip(1).collect()));
}
