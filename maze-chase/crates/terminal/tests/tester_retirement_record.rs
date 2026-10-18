//! Tester retirement-wording guard (issue #642 sweep): the #552 Python
//! reference game is retired, so the public maze-chase docs must state the
//! retirement as a completed event, never as a future plan. The completed
//! campaign merged as the #642 wording sweep; this suite keeps the target
//! sentences present and the stale future-tense class out of the public
//! prose surfaces (README plus every docs/*.md), so a later edit cannot
//! silently regress the record to "will retire" style wording.

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

/// Whitespace-normalized file text: markdown re-wrapping must never break
/// a sentence assertion.
fn flat_text(path: &std::path::Path) -> String {
    let text = fs::read_to_string(path)
        .unwrap_or_else(|e| panic!("{} must be readable: {e}", path.display()));
    text.split_whitespace().collect::<Vec<_>>().join(" ")
}

fn public_docs() -> Vec<PathBuf> {
    let root = maze_root();
    let mut files = vec![root.join("README.md")];
    let mut docs: Vec<PathBuf> = fs::read_dir(root.join("docs"))
        .expect("maze-chase/docs must be readable")
        .map(|entry| entry.expect("docs entry").path())
        .filter(|p| p.extension().map(|x| x == "md").unwrap_or(false))
        .collect();
    docs.sort();
    files.extend(docs);
    files
}

/// The completed-retirement sentences the #642 sweep established. Each is
/// asserted whitespace-normalized so re-wrapping the paragraph is fine but
/// reverting to future tense is not.
#[test]
fn completed_retirement_is_stated_in_past_tense() {
    let root = maze_root();
    let targets = [
        (
            root.join("README.md"),
            "Python reference game is retired in favor of this game, kept as the reference implementation.",
        ),
        (
            root.join("docs/parity.md"),
            "#552 was retired against this checklist and the retirement was recorded in the issue.",
        ),
        (
            root.join("docs/scoreboard.md"),
            "was retired in favor of this game by the Maintainer's explicit step after this verified release merged.",
        ),
        (
            root.join("docs/feature-matrix.md"),
            "was retired in favor of this game by the Maintainer's explicit step after this release merged",
        ),
        (
            root.join("docs/behavior-spec.md"),
            "before the retirement of #552",
        ),
        (
            root.join("docs/release.md"),
            "gated the #552 Python reference retirement",
        ),
    ];
    for (path, sentence) in targets {
        assert!(
            flat_text(&path).contains(sentence),
            "{} must state the completed retirement (missing: {sentence:?})",
            path.display()
        );
    }
}

/// Future-tense retirement wording class swept by #642: none may return to
/// the public prose surfaces. Each pattern is a phrase that previously sat
/// in these files while the retirement was still pending.
#[test]
fn stale_future_tense_retirement_wording_is_gone() {
    let patterns = [
        "retires by",
        "before retiring",
        "retirement gate",
        "can be retired",
        "keeps working until",
        "before any retirement",
        "after this release lands",
        "will retire",
        "remains functional until",
        "awaits retirement",
    ];
    let files = public_docs();
    assert!(
        files.len() >= 6,
        "the guard must cover README plus the docs surfaces, only {} found",
        files.len()
    );
    let mut offenses = Vec::new();
    for path in &files {
        let flat = flat_text(path).to_lowercase();
        for pattern in patterns {
            if flat.contains(pattern) {
                offenses.push(format!(
                    "{}: stale future-tense phrasing {pattern:?}",
                    path.display()
                ));
            }
        }
    }
    assert!(
        offenses.is_empty(),
        "future-tense retirement wording returned to the public docs:\n{}",
        offenses.join("\n")
    );
}
