//! Windows Tester regression: checkout-stable bytes for `include_str!`.
//!
//! Native evidence (Windows Server 2025, Git for Windows checkout with
//! `core.autocrlf=true`, head 76abb6b0): `cargo build --release --target
//! wasm32-unknown-unknown -p maze-chase-web` produced a 190,851-byte wasm
//! (sha256 d99c23b4...) while the committed `web/maze-chase.wasm` built on
//! Linux is 190,772 bytes (sha256 5ec2a05a...), 41,419 differing bytes.
//! Root cause: `levels/ember-warren.maze` (embedded by
//! `crates/engine/src/maze.rs` via `include_str!`) and
//! `docs/design-tokens.json` (embedded by `crates/assets/src/themes.rs`
//! via `include_str!`) arrive CRLF on a default Git for Windows checkout,
//! and `include_str!` embeds the working-tree bytes verbatim. The game
//! itself is CRLF-tolerant (`Maze::from_rows` trims line ends; the maze
//! parse and the golden replay verify green on the CRLF checkout), so only
//! the shipped build output loses its byte reproducibility, which
//! `docs/release.md` promises for the committed wasm.
//!
//! Fix direction: pin both embedded sources `text eol=lf` in
//! `.gitattributes` so any checkout yields identical bytes under
//! `include_str!`. This test fails on a CRLF checkout until that pin
//! exists; it is the natively caught red at 76abb6b0.

use std::path::PathBuf;

#[test]
fn embedded_sources_are_lf_on_any_checkout() {
    let maze_chase = PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("../..");
    for rel in ["levels/ember-warren.maze", "docs/design-tokens.json"] {
        let path = maze_chase.join(rel);
        let bytes =
            std::fs::read(&path).unwrap_or_else(|e| panic!("read {}: {e}", path.display()));
        assert!(!bytes.is_empty(), "{} is empty", path.display());
        let crlf = bytes
            .windows(2)
            .filter(|w| w.len() == 2 && w[0] == b'\r' && w[1] == b'\n')
            .count();
        assert_eq!(
            crlf,
            0,
            "{} contains {crlf} CRLF sequences; include_str! embeds \
             working-tree bytes, so a CRLF checkout breaks the committed \
             wasm byte reproducibility. Pin this file `text eol=lf` in \
             .gitattributes.",
            path.display()
        );
    }
}
