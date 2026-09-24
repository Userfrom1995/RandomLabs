use std::process::exit;

fn main() {
    let args: Vec<String> = std::env::args().skip(1).collect();
    match meridian::cli::run(&args) {
        Ok(code) => exit(code),
        Err(e) => {
            eprintln!("error: {}", e);
            exit(1);
        }
    }
}