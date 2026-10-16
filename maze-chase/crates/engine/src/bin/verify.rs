//! `maze-chase-verify`: headless Phase 2 + Phase 3 acceptance run.
//!
//! Prints one row per matrix check and exits non-zero on any failure:
//! `cargo run -p maze-chase-engine --bin maze-chase-verify`.

use maze_chase_engine::verify::run_all;

fn main() {
    let checks = run_all();
    let mut failed = 0;
    for check in &checks {
        let mark = if check.passed { "ok  " } else { "FAIL" };
        println!("{mark} {:26} {}", check.name, check.detail);
        if !check.passed {
            failed += 1;
        }
    }
    println!(
        "verify: {}/{} checks passed",
        checks.len() - failed,
        checks.len()
    );
    if failed > 0 {
        std::process::exit(1);
    }
}
