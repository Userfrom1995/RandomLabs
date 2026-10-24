//! Tester site-contract suite for the game-first web experience (Refs #660).
//!
//! Pins the shipped GitHub Pages shape at the static level:
//! - `index.html` is the playable game, with no distribution copy above it;
//! - `play.html` is a query-preserving redirect to the game;
//! - the dedicated subpages exist, share one navigation, and carry honest
//!   release status (Linux built, native rows pending the release workflow);
//! - every `docs/*.md` has a current generated `docs/*.html` counterpart
//!   (the source marker is re-derived here without Node);
//! - every internal href/src in the shipped pages resolves to a committed
//!   file, and every fragment names a real id. Raw `.md` links are rejected.

#![cfg(unix)]

use std::fs;
use std::path::{Component, Path, PathBuf};

const NAV: [&str; 6] = [
    "index.html",
    "install.html",
    "downloads.html",
    "compatibility.html",
    "releases.html",
    "docs/",
];

fn maze_root() -> PathBuf {
    PathBuf::from(env!("CARGO_MANIFEST_DIR"))
        .parent()
        .unwrap()
        .parent()
        .unwrap()
        .to_path_buf()
}

fn read(rel: &str) -> String {
    let path = maze_root().join(rel);
    fs::read_to_string(&path).unwrap_or_else(|e| panic!("{rel} must be readable: {e}"))
}

fn assert_nav(page: &str) {
    let html = read(page);
    for href in NAV {
        assert!(
            html.contains(&format!("href=\"{href}\"")),
            "{page} must link {href}"
        );
    }
    assert_eq!(
        html.matches("aria-current=\"page\"").count(),
        1,
        "{page} must mark exactly one current navigation item"
    );
    assert!(
        html.contains("site.css"),
        "{page} must load the shared site stylesheet"
    );
}

#[test]
fn game_first_index_is_the_playable_page() {
    let html = read("index.html");
    assert!(
        html.contains("id=\"game-canvas\"") && html.contains("id=\"btn-start\""),
        "index.html must be the playable game page"
    );
    assert!(
        html.contains("id=\"boot-status\"") && html.contains("id=\"panel-title\""),
        "index.html must carry the boot and title surfaces"
    );
    assert!(
        html.contains("class=\"site-menu\"") && html.contains("aria-label=\"Maze Chase site\""),
        "index.html must expose the compact site menu"
    );
    assert!(
        !html.contains("class=\"play\"") && !html.contains("release-status"),
        "the game must not sit below a distribution call to action or status block"
    );
    assert!(
        !html.contains("Linux packages") && !html.contains("SHA256SUMS"),
        "distribution copy belongs on the subpages"
    );
    let canvas = html.find("id=\"game-canvas\"").unwrap();
    let menu = html.find("class=\"site-menu\"").unwrap();
    assert!(
        menu < canvas,
        "the site menu must stay in the header, above the board"
    );
    assert!(
        html.contains("<title>Maze Chase - Play</title>"),
        "the game page title must stay stable"
    );
}

#[test]
fn legacy_play_page_redirects_with_query_and_hash() {
    let html = read("play.html");
    assert!(
        html.contains("http-equiv=\"refresh\"") && html.contains("url=index.html"),
        "play.html must meta-refresh to the game page"
    );
    assert!(
        html.contains("rel=\"canonical\" href=\"index.html\""),
        "play.html must declare the game page as canonical"
    );
    for needle in [
        "location.replace",
        "location.search",
        "location.hash",
        "index.html",
    ] {
        assert!(
            html.contains(needle),
            "play.html redirect must preserve the shared URL ({needle})"
        );
    }
    assert!(
        !html.contains("game-canvas"),
        "play.html must not duplicate the game implementation"
    );
}

#[test]
fn dedicated_subpages_share_the_navigation_shell() {
    for page in [
        "install.html",
        "downloads.html",
        "compatibility.html",
        "releases.html",
    ] {
        assert_nav(page);
        let html = read(page);
        assert!(
            html.contains("<main class=\"wrap\" id=\"main\">"),
            "{page} must use the shared main-landmark shell"
        );
        assert_eq!(
            html.matches("<h1>").count(),
            1,
            "{page} must carry exactly one page heading"
        );
        assert!(
            html.contains("class=\"site-footer\"") && html.contains("href=\"docs/\""),
            "{page} must carry the shared footer and docs entry"
        );
        assert!(
            !html.contains(".md\""),
            "{page} must link rendered docs, never raw markdown"
        );
    }
    assert!(maze_root().join("docs/index.html").is_file());
    assert!(maze_root().join("site.css").is_file());
}

#[test]
fn downloads_status_separates_built_from_pending_native_rows() {
    let html = read("downloads.html");
    let start = html
        .find("<div class=\"callout\" id=\"release-status\">")
        .expect("downloads must carry the release status block");
    let block = html[start..]
        .split_once("</div>")
        .expect("the status block must close")
        .0;
    let status = block
        .split('<')
        .map(|piece| piece.split_once('>').map(|(_, text)| text).unwrap_or(piece))
        .collect::<Vec<_>>()
        .join(" ")
        .split_whitespace()
        .collect::<Vec<_>>()
        .join(" ");
    assert!(
        status.contains("Linux packages") && status.contains("built and smoke-tested"),
        "the status must report the Linux packages as built and smoke-tested: {status}"
    );
    assert!(
        status.contains("ship once the release workflow is installed"),
        "the status must mark the native rows as pending the release workflow: {status}"
    );
    for overclaim in [
        "built and signed",
        "built and smoked by the native release job",
        "Windows zip was built",
    ] {
        assert!(
            !status.contains(overclaim),
            "the status must not claim unbuilt native artifacts ({overclaim}): {status}"
        );
    }
    for qa_copy in [
        "passed",
        "assertions",
        "harness",
        "E2E",
        "pre-Pondwake",
        "Tester final rerun",
        "commit ",
    ] {
        assert!(
            !status.contains(qa_copy),
            "the status must stay user-facing, found {qa_copy}: {status}"
        );
    }
    assert!(
        status.split_whitespace().count() <= 120,
        "the release status must stay compact: {status}"
    );
    assert!(
        html.contains("Live now") && html.contains("Native release job"),
        "downloads must label the browser as live and native rows as pending"
    );

    let releases = read("releases.html");
    assert!(
        releases.contains("Release candidate pending"),
        "releases must show the candidate state honestly"
    );
    let releases_flat = releases.split_whitespace().collect::<Vec<_>>().join(" ");
    assert!(
        releases_flat.contains("No stable tag is cut while a binding check is open."),
        "releases must not promise a stable tag while checks are open"
    );

    let readme = read("README.md")
        .split_whitespace()
        .collect::<Vec<_>>()
        .join(" ");
    assert!(
        readme.contains("Linux release packages (deb, rpm, tarballs) are built and smoke-tested"),
        "the README must report the Linux packages as built and smoke-tested"
    );
}

fn fnv1a(bytes: &[u8]) -> String {
    let mut hash: u64 = 0xcbf29ce484222325;
    for byte in bytes {
        hash ^= u64::from(*byte);
        hash = hash.wrapping_mul(0x100000001b3);
    }
    format!("{hash:016x}")
}

#[test]
fn rendered_docs_are_current_and_marked_with_their_source() {
    let docs = maze_root().join("docs");
    let mut sources: Vec<PathBuf> = fs::read_dir(&docs)
        .expect("docs must be readable")
        .map(|entry| entry.expect("docs entry").path())
        .filter(|path| path.extension().map(|x| x == "md").unwrap_or(false))
        .collect();
    sources.sort();
    assert!(sources.len() >= 15, "the docs tree must be complete");
    for source in sources {
        let name = source.file_name().unwrap().to_string_lossy().to_string();
        let html_path = docs.join(format!("{}.html", name.trim_end_matches(".md")));
        assert!(
            html_path.is_file(),
            "docs/{name} needs a committed rendered counterpart"
        );
        let bytes = fs::read(&source).expect("read doc source");
        let marker = format!(
            "generated from docs/{name}; source-bytes: {}; source-fnv: {}",
            bytes.len(),
            fnv1a(&bytes)
        );
        let html = fs::read_to_string(&html_path).expect("read rendered doc");
        assert!(
            html.contains(&marker),
            "{} is stale: run node tools/site/render-docs.mjs",
            html_path.display()
        );
        assert!(
            html.starts_with("<!DOCTYPE html>"),
            "{} must be a rendered HTML page",
            html_path.display()
        );
        assert!(
            html.contains("<article class=\"doc\">") && html.contains("../site.css"),
            "{} must use the docs shell",
            html_path.display()
        );
        assert_eq!(
            html.matches("<h1").count(),
            1,
            "{} must carry exactly one document heading",
            html_path.display()
        );
        assert!(
            !html.contains("<script"),
            "{} must not need scripts to render",
            html_path.display()
        );
    }
}

fn normalize(base: &Path, raw: &str) -> Option<PathBuf> {
    let mut path = raw;
    let fragment = path.find('#').map(|at| {
        let fragment = path[at + 1..].to_string();
        path = &path[..at];
        fragment
    });
    let path = path.split('?').next().unwrap_or(path);
    if fragment.as_deref() == Some("") || path.is_empty() {
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

fn has_scheme(link: &str) -> bool {
    let Some((scheme, _)) = link.split_once(':') else {
        return false;
    };
    !scheme.is_empty()
        && scheme.chars().next().unwrap().is_ascii_alphabetic()
        && scheme
            .chars()
            .all(|c| c.is_ascii_alphanumeric() || matches!(c, '+' | '-' | '.'))
}

fn internal_links(page: &Path) -> Vec<String> {
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

#[test]
fn every_internal_site_link_and_fragment_resolves() {
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
    let mut checked = 0;
    let mut problems = Vec::new();
    for page in &pages {
        for link in internal_links(page) {
            if link.is_empty()
                || link.starts_with('#')
                || link.starts_with("mailto:")
                || link.starts_with("//")
                || has_scheme(&link)
            {
                continue;
            }
            let (raw_path, fragment) = match link.split_once('#') {
                Some((path, fragment)) => (path, Some(fragment)),
                None => (link.as_str(), None),
            };
            if raw_path.ends_with(".md") {
                problems.push(format!("{}: raw markdown link {link}", page.display()));
                continue;
            }
            let Some(target) = normalize(page, &link) else {
                continue;
            };
            if !target.starts_with(&root) || !target.is_file() {
                problems.push(format!("{}: broken link {link}", page.display()));
                continue;
            }
            if let Some(fragment) = fragment {
                if !fragment.is_empty() {
                    let body = fs::read_to_string(&target).unwrap_or_default();
                    if !body.contains(&format!("id=\"{fragment}\"")) {
                        problems.push(format!(
                            "{}: link {link} names a missing id",
                            page.display()
                        ));
                    }
                }
            }
            checked += 1;
        }
    }
    assert!(
        problems.is_empty(),
        "internal site links are broken:\n{}",
        problems.join("\n")
    );
    assert!(
        checked > 200,
        "the link walk must cover the site, only checked {checked}"
    );
}
