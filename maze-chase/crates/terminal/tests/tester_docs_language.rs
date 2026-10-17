//! Tester docs-language guard (issue #596 sweep): the public maze-chase
//! surfaces must stay free of internal milestone codes, milestone counters,
//! and em/en dashes so the shipped documentation keeps one unified product
//! voice. The single meta policy line in docs/index.md is allowlisted
//! explicitly. Prose surfaces get the full check; the game HTML gets the
//! milestone and dash checks.

use std::fs;
use std::path::PathBuf;

fn maze_root() -> PathBuf {
    PathBuf::from(env!("CARGO_MANIFEST_DIR"))
        .parent()
        .unwrap()
        .parent()
        .unwrap()
        .to_path_buf()
}

fn docs_prose() -> Vec<PathBuf> {
    let root = maze_root();
    let mut files = vec![root.join("README.md"), root.join("web/e2e/README.md")];
    let mut docs: Vec<PathBuf> = fs::read_dir(root.join("docs"))
        .expect("maze-chase/docs must be readable")
        .map(|entry| entry.expect("docs entry").path())
        .filter(|p| p.extension().map(|x| x == "md").unwrap_or(false))
        .collect();
    docs.sort();
    files.extend(docs);
    files
}

fn shell_files() -> Vec<PathBuf> {
    vec![
        maze_root().join("index.html"),
        maze_root().join("play.html"),
    ]
}

fn is_word_char(c: char) -> bool {
    c.is_ascii_alphanumeric() || c == '_'
}

/// Bare internal code like `M1`, not part of a word or longer run (`E1M1`,
/// `test-m2-fixture`, `TestM4PackagingArtifacts` all pass clean).
fn has_bare_code(line: &str) -> bool {
    let chars: Vec<char> = line.chars().collect();
    for i in 0..chars.len() {
        if chars[i] == 'M'
            && chars
                .get(i + 1)
                .map(|c| c.is_ascii_digit())
                .unwrap_or(false)
        {
            let prev_ok = i == 0 || !is_word_char(chars[i - 1]);
            let after = chars.get(i + 2).copied().unwrap_or(' ');
            if prev_ok && !is_word_char(after) {
                return true;
            }
        }
    }
    false
}

/// `phase` at a word start followed by whitespace and a digit.
fn has_phase_counter(line: &str) -> bool {
    let lower = line.to_lowercase();
    let mut from = 0;
    while let Some(pos) = lower[from..].find("phase") {
        let idx = from + pos;
        let prev_ok = idx == 0
            || !lower[..idx]
                .chars()
                .last()
                .map(is_word_char)
                .unwrap_or(false);
        let rest = lower[idx + "phase".len()..].trim_start();
        if prev_ok
            && rest
                .chars()
                .next()
                .map(|c| c.is_ascii_digit())
                .unwrap_or(false)
        {
            return true;
        }
        from = idx + "phase".len();
    }
    false
}

fn collect_offenses(files: &[PathBuf], include_codes: bool, allowlist: &[&str]) -> Vec<String> {
    let mut offenses = Vec::new();
    for path in files {
        let text = fs::read_to_string(path)
            .unwrap_or_else(|e| panic!("{} must be readable: {e}", path.display()));
        for (i, line) in text.lines().enumerate() {
            let n = i + 1;
            let trimmed = line.trim();
            if allowlist.contains(&trimmed) {
                continue;
            }
            if include_codes && has_bare_code(line) {
                offenses.push(format!(
                    "{}:{n} bare milestone code: {trimmed}",
                    path.display()
                ));
            }
            if line.to_lowercase().contains("milestone") {
                offenses.push(format!(
                    "{}:{n} milestone wording: {trimmed}",
                    path.display()
                ));
            }
            if has_phase_counter(line) {
                offenses.push(format!("{}:{n} phase counter: {trimmed}", path.display()));
            }
            if line.contains('\u{2013}') || line.contains('\u{2014}') {
                offenses.push(format!("{}:{n} em/en dash: {trimmed}", path.display()));
            }
        }
    }
    offenses
}

#[test]
fn public_docs_carry_no_milestone_language() {
    let allowlist = ["One cohesive product view; no milestone counters or sprint references."];
    let mut offenses = collect_offenses(&docs_prose(), true, &allowlist);
    offenses.extend(collect_offenses(&shell_files(), false, &allowlist));
    assert!(
        offenses.is_empty(),
        "milestone language or dash residue in public docs:\n{}",
        offenses.join("\n")
    );
}

/// Every `python3 -m http.server` mention on a public serving surface must
/// also spell the Windows interpreter (`python -m http.server`): a
/// python.org Windows install ships no `python3` alias, so python3-only
/// guidance breaks the documented default flow there (Windows tester
/// report, issue #582 fix round). The check is file-level and whitespace
/// normalizes first, so a wrapped Windows spelling (`python -m` /
/// `http.server` on the next line) still counts.
#[test]
fn serve_guidance_pairs_the_windows_python() {
    let root = maze_root();
    let surfaces = [
        root.join("README.md"),
        root.join("docs/web.md"),
        root.join("docs/release.md"),
        root.join("web/e2e/README.md"),
        root.join("play.html"),
        root.join("web/e2e/browser-e2e.js"),
        root.join("web/maze-chase.js"),
    ];
    let mut paired = 0;
    let mut offenses = Vec::new();
    for path in surfaces {
        let text = fs::read_to_string(&path)
            .unwrap_or_else(|e| panic!("{} must be readable: {e}", path.display()));
        let flat = text.split_whitespace().collect::<Vec<_>>().join(" ");
        if flat.contains("python3 -m http.server") {
            paired += 1;
            if !flat.contains("python -m http.server") {
                offenses.push(format!(
                    "{}: `python3 -m http.server` without the Windows `python -m http.server` spelling",
                    path.display()
                ));
            }
        }
    }
    assert!(
        offenses.is_empty(),
        "python3-only serve guidance on public surfaces:\n{}",
        offenses.join("\n")
    );
    assert!(
        paired >= 6,
        "the pairing check must cover the documented serving surfaces, only {paired} mention http.server"
    );
}
