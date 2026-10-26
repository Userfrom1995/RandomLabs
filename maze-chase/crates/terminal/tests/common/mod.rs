//! Shared helpers for the shipped-site contract suites (Refs #660).
//!
//! `tester_site` owns the full site contract; `tester_packaging` reuses the
//! same release-copy facts and the same generic rendered-docs crawl so the two
//! suites cannot drift when either runs alone.

#![allow(dead_code)]

use std::fs;
use std::path::{Component, Path, PathBuf};

pub fn maze_root() -> PathBuf {
    PathBuf::from(env!("CARGO_MANIFEST_DIR"))
        .parent()
        .unwrap()
        .parent()
        .unwrap()
        .to_path_buf()
}

pub fn fnv1a(bytes: &[u8]) -> String {
    let mut hash: u64 = 0xcbf29ce484222325;
    for byte in bytes {
        hash ^= u64::from(*byte);
        hash = hash.wrapping_mul(0x100000001b3);
    }
    format!("{hash:016x}")
}

pub fn normalize(base: &Path, raw: &str) -> Option<PathBuf> {
    let path = raw
        .split('?')
        .next()
        .unwrap_or(raw)
        .split('#')
        .next()
        .unwrap_or(raw);
    if path.is_empty() {
        return Some(base.to_path_buf());
    }
    let target = if path.starts_with('/') {
        maze_root().join(path.trim_start_matches('/'))
    } else {
        base.parent().unwrap_or(base).join(path)
    };
    let mut normalized = PathBuf::new();
    for component in target.components() {
        match component {
            Component::CurDir => {}
            Component::ParentDir => {
                normalized.pop();
            }
            other => normalized.push(other.as_os_str()),
        }
    }
    if path.ends_with('/') || normalized.is_dir() {
        normalized.push("index.html");
    }
    Some(normalized)
}

pub fn has_scheme(link: &str) -> bool {
    let Some((scheme, _)) = link.split_once(':') else {
        return false;
    };
    !scheme.is_empty()
        && scheme.chars().next().unwrap().is_ascii_alphabetic()
        && scheme
            .chars()
            .all(|c| c.is_ascii_alphanumeric() || matches!(c, '+' | '-' | '.'))
}

pub fn internal_links(page: &Path) -> Vec<String> {
    let html = fs::read_to_string(page).expect("read site page");
    let mut links = Vec::new();
    for attr in ["href=\"", "src=\""] {
        let mut rest = html.as_str();
        while let Some(at) = rest.find(attr) {
            rest = &rest[at + attr.len()..];
            let Some(end) = rest.find('"') else { break };
            links.push(rest[..end].to_string());
            rest = &rest[end + 1..];
        }
    }
    links
}

pub fn id_exists(body: &str, fragment: &str) -> bool {
    let needle = format!("id=\"{fragment}\"");
    let mut from = 0;
    while let Some(at) = body[from..].find(&needle) {
        let at = from + at;
        let previous = body[..at].chars().next_back();
        if previous.is_none_or(|c| c.is_whitespace() || c == '<') {
            return true;
        }
        from = at + 1;
    }
    false
}

pub fn site_pages() -> Vec<PathBuf> {
    let root = maze_root();
    let mut pages: Vec<PathBuf> = [
        "index.html",
        "play.html",
        "install.html",
        "downloads.html",
        "compatibility.html",
        "releases.html",
    ]
    .iter()
    .map(|name| root.join(name))
    .collect();
    for entry in fs::read_dir(root.join("docs")).expect("docs must be readable") {
        let path = entry.expect("docs entry").path();
        if path.extension().map(|x| x == "html").unwrap_or(false) {
            pages.push(path);
        }
    }
    pages.sort();
    pages
}

/// Walk every internal href/src in the given pages. Returns
/// `(links_checked, fragments_checked, problems)`.
pub fn check_internal_links(pages: &[PathBuf]) -> (usize, usize, Vec<String>) {
    let root = maze_root();
    let mut checked = 0;
    let mut fragments_checked = 0;
    let mut problems = Vec::new();
    for page in pages {
        for link in internal_links(page) {
            if link.is_empty()
                || link.starts_with("mailto:")
                || link.starts_with("//")
                || has_scheme(&link)
            {
                continue;
            }
            let (path_and_query, fragment) = match link.split_once('#') {
                Some((path, fragment)) => (path, Some(fragment)),
                None => (link.as_str(), None),
            };
            let raw_path = path_and_query.split('?').next().unwrap_or_default();
            if raw_path.ends_with(".md") {
                problems.push(format!("{}: raw markdown link {link}", page.display()));
                continue;
            }
            let Some(target) = normalize(page, raw_path) else {
                problems.push(format!("{}: unnormalizable link {link}", page.display()));
                continue;
            };
            if !target.starts_with(&root) || !target.is_file() {
                problems.push(format!("{}: broken link {link}", page.display()));
                continue;
            }
            if let Some(fragment) = fragment.filter(|f| !f.is_empty()) {
                fragments_checked += 1;
                let body = fs::read_to_string(&target).unwrap_or_default();
                if !id_exists(&body, fragment) {
                    problems.push(format!(
                        "{}: link {link} names a missing id",
                        page.display()
                    ));
                }
            }
            checked += 1;
        }
    }
    (checked, fragments_checked, problems)
}

/// Reject artifact-signing or stable-release claims while leaving the
/// legitimate "signed parity gate" and "design pass signed" wording alone.
pub fn assert_no_signing_or_stable_claim(text: &str, surface: &str) {
    let lower = text.to_lowercase();
    for phrase in [
        "notariz",
        "signed binary",
        "signed binaries",
        "signed artifact",
        "signed artifacts",
        "signed installer",
        "signed installers",
        "signed release",
        "signed releases",
        "binaries are signed",
        "artifacts are signed",
        "all artifacts are signed",
        "release is signed",
        "code signed",
        "codesigned",
    ] {
        assert!(
            !lower.contains(phrase),
            "{surface} claims signing: {phrase}"
        );
    }
    for phrase in [
        "stable release is published",
        "stable release has been published",
        "stable release was published",
        "stable release is live",
        "stable release is out",
        "stable release is now available",
        "stable release is available",
        "stable release is ready",
        "stable release is now live",
        "release is now stable",
        "stable tag is published",
        "stable tag has been published",
        "published as a stable release",
        "published the stable release",
    ] {
        assert!(
            !lower.contains(phrase),
            "{surface} claims a stable release: {phrase}"
        );
    }
}

pub fn release_copy_surfaces() -> Vec<(&'static str, String)> {
    let root = maze_root();
    [
        "downloads.html",
        "releases.html",
        "README.md",
        "docs/release.md",
        "docs/feature-matrix.md",
    ]
    .iter()
    .map(|name| {
        let path = root.join(name);
        let text = fs::read_to_string(&path)
            .unwrap_or_else(|e| panic!("release-copy surface {name} must be readable: {e}"));
        assert!(
            text.contains("maze-chase-v0.1.0-rc.1"),
            "{name} must name the published v0.1.0-rc.1 candidate"
        );
        let lower = text.to_lowercase();
        assert!(
            lower.contains("prerelease") || lower.contains("pre-release"),
            "{name} must keep the candidate marked as a prerelease"
        );
        (*name, text)
    })
    .collect()
}
