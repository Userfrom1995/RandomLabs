fn main() {
    let args: Vec<String> = std::env::args().skip(1).collect();
    match aftershock::cli::run(&args) {
        Ok(code) => std::process::exit(code),
        Err(msg) => {
            eprintln!("error: {}", msg);
            std::process::exit(2);
        }
    }
}
