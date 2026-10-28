//! Tester site-contract suite for the game-first web experience (Refs #660).
//!
//! Pins the shipped GitHub Pages shape at the static level:
//! - `index.html` is the playable game, with no distribution copy above it;
//! - `play.html` is a query-preserving redirect to the game;
//! - the dedicated subpages exist, share one navigation, and carry honest
//!   release status (published unsigned rc.1, no stable tag claimed);
//! - every `docs/*.md` has a current generated `docs/*.html` counterpart
//!   (the source and output fingerprints are re-derived here without Node);
//! - every internal href/src in the shipped pages resolves to a committed
//!   file, and every fragment (including same-page ones) names a real id.
//!   Raw `.md` links and links that escape the project are rejected.

#![cfg(unix)]

mod common;

use std::fs;
use std::path::PathBuf;

const NAV: [&str; 6] = [
    "index.html",
    "install.html",
    "downloads.html",
    "compatibility.html",
    "releases.html",
    "docs/",
];

fn read(rel: &str) -> String {
    let path = common::maze_root().join(rel);
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
        html.contains("<a class=\"skip-link\" href=\"#game-main\">")
            && html.contains("<main id=\"game-main\">"),
        "index.html must carry a skip link that bypasses the header into the game"
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
    assert_eq!(
        html.matches("<script>").count(),
        1,
        "play.html must carry exactly one redirect script"
    );
    let script = html
        .split("<script>")
        .nth(1)
        .and_then(|body| body.split("</script>").next())
        .unwrap_or("")
        .lines()
        .map(str::trim)
        .filter(|line| !line.is_empty())
        .collect::<Vec<_>>();
    assert_eq!(
        script,
        [
            "(function () {",
            "var target = \"index.html\" + window.location.search + window.location.hash;",
            "window.location.replace(target);",
            "})();",
        ],
        "play.html must execute exactly the query-and-fragment redirect"
    );
    assert!(
        !html.contains("?seed="),
        "play.html must not claim a seed is read; the game starts a fresh run"
    );
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
        assert_eq!(
            html.matches("<table>").count(),
            html.matches("class=\"table-scroll\"").count(),
            "{page} must contain every wide table in a scroll container"
        );
    }
    assert!(common::maze_root().join("docs/index.html").is_file());
    assert!(common::maze_root().join("site.css").is_file());
}

#[test]
fn downloads_status_reports_the_published_candidate_honestly() {
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
    for published in [
        "maze-chase-v0.1.0-rc.1",
        "40161835683",
        "prerelease",
        "unsigned",
    ] {
        assert!(
            status.contains(published),
            "the status must report the published candidate ({published}): {status}"
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
        html.contains("Live now")
            && html.matches("Published (unsigned)").count() == 4
            && !html.contains("Native release job"),
        "downloads must label the browser as live and the four native rows as published and unsigned"
    );
    let native_rows = html.split_whitespace().collect::<Vec<_>>().join(" ");
    assert!(
        native_rows.contains("Linux and Windows exercise install, launch, and uninstall")
            && native_rows.contains(
                "macOS validates the app bundle, dmg mount, tarball, and a real windowed"
            ),
        "downloads must describe exactly what each native release job ran"
    );
    assert!(
        !native_rows.contains("each host's install, launch, and uninstall"),
        "downloads must not claim a macOS install/uninstall smoke the release run does not contain"
    );
    assert!(
        native_rows.contains("<code>Maze Chase.app</code> (inside the dmg and tarball)")
            && read("releases.html")
                .contains("<code>Maze Chase.app</code> (inside the dmg and tarball)"),
        "the macOS app must be presented as part of the dmg and tarball, not a standalone asset"
    );

    let releases = read("releases.html");
    for published in [
        "Release candidate published",
        "maze-chase-v0.1.0-rc.1",
        "40161835683",
    ] {
        assert!(
            releases.contains(published),
            "releases must report the published candidate ({published})"
        );
    }
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
    for fact in ["maze-chase-v0.1.0-rc.1", "40161835683", "unsigned", "#683"] {
        assert!(
            readme.contains(fact),
            "the README must report the published candidate ({fact})"
        );
    }

    for (surface, text) in common::release_copy_surfaces() {
        common::assert_no_signing_or_stable_claim(&text, surface);
    }
}

#[test]
fn release_claim_checker_catches_paraphrases() {
    let claims = [
        "The binaries are code-signed with a developer certificate.",
        "Installers are signed.",
        "All artifacts have been signed.",
        "Signing is complete for this candidate.",
        "We shipped the stable release.",
        "The stable release is here.",
        "The stable build is live.",
        "The release is now stable.",
        "The build is now stable.",
        "The candidate was promoted to stable.",
        "We are out of prerelease.",
        "The production release is available.",
    ];
    for claim in claims {
        assert!(
            common::signing_or_stable_claim(claim).is_some(),
            "claim checker missed: {claim}"
        );
    }
    for allowed in [
        "The binaries are unsigned.",
        "SmartScreen warns because the binary is unsigned.",
        "This is an unsigned binary.",
        "This is an unsigned release.",
        "This is not now stable.",
        "The design pass signed off on the layout.",
        "The signed parity gate covers the engine rows.",
        "No stable tag is cut while a binding check is open.",
        "The release stays a prerelease until the checks close.",
        "This is not yet a stable release.",
    ] {
        assert_eq!(
            common::signing_or_stable_claim(allowed),
            None,
            "claim checker false-positive: {allowed}"
        );
    }
}

#[test]
fn rendered_docs_are_current_and_marked_with_their_source() {
    let docs = common::maze_root().join("docs");
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
        let marker_base = format!(
            "generated from docs/{name}; source-bytes: {}; source-fnv: {}",
            bytes.len(),
            common::fnv1a(&bytes)
        );
        let html = fs::read_to_string(&html_path).expect("read rendered doc");
        let marker_line = html
            .lines()
            .find(|line| line.contains("source-fnv:"))
            .unwrap_or_else(|| panic!("{} must carry the source marker", html_path.display()));
        assert!(
            marker_line.contains(&marker_base),
            "{} is stale: run node tools/site/render-docs.mjs",
            html_path.display()
        );
        let body = html.replacen(marker_line, "", 1);
        assert!(
            marker_line.contains(&format!("output-fnv: {}", common::fnv1a(body.as_bytes()))),
            "{}: rendered body is stale, run node tools/site/render-docs.mjs",
            html_path.display()
        );
        assert!(
            html.starts_with("<!DOCTYPE html>"),
            "{} must be a rendered HTML page",
            html_path.display()
        );
        assert!(
            html.contains("<article class=\"doc\" id=\"doc-content\" tabindex=\"-1\">")
                && html.contains("<a class=\"skip-link\" href=\"#doc-content\">")
                && html.contains("../site.css"),
            "{} must use the docs shell and skip directly to the article",
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
    let css = fs::read_to_string(common::maze_root().join("site.css")).expect("site.css");
    assert!(
        css.contains("scroll-padding-top: 124px"),
        "the sticky header needs scroll padding so skip and fragment targets clear it"
    );
}

#[test]
fn every_internal_site_link_and_fragment_resolves() {
    let (checked, fragments_checked, problems) =
        common::check_internal_links(&common::site_pages());
    assert!(
        problems.is_empty(),
        "internal site links are broken:\n{}",
        problems.join("\n")
    );
    assert!(
        checked > 200,
        "the link walk must cover the site, only checked {checked}"
    );
    assert!(
        fragments_checked > 0,
        "the fragment walk must cover same-page skip links, checked {fragments_checked}"
    );
}
