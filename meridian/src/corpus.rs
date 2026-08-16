//! The corpus crawler: walk a directory tree, pick up real text documents,
//! normalize them into a clean corpus directory, and record a manifest.

use std::fs;
use std::path::{Path, PathBuf};

/// A document in the corpus.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct Document {
    pub id: usize,
    pub title: String,
    /// The original source path (for display).
    pub source: String,
    /// The relative URL under the project root (for the web UI).
    pub url: String,
    pub text: String,
}

pub const MANIFEST_NAME: &str = "manifest.json";
pub const MAX_DOC_BYTES: u64 = 512 * 1024;

pub fn default_extensions() -> &'static [&'static str] {
    &[".md", ".txt", ".html", ".rst"]
}

pub fn default_skip_names() -> &'static [&'static str] {
    &[
        ".git",
        "target",
        "node_modules",
        "corpus",
        "corpus-src",
        "data",
    ]
}

/// Recursively collects crawlable files under `dir`.
fn collect_files(
    dir: &Path,
    skip: &[String],
    extensions: &[&str],
    out: &mut Vec<PathBuf>,
) -> Result<(), String> {
    let entries = fs::read_dir(dir)
        .map_err(|e| format!("cannot read dir {}: {}", dir.display(), e))?;
    let mut names: Vec<PathBuf> = Vec::new();
    for entry in entries {
        let entry = entry.map_err(|e| format!("cannot list {}: {}", dir.display(), e))?;
        names.push(entry.path());
    }
    names.sort();

    for path in names {
        let name = path
            .file_name()
            .map(|n| n.to_string_lossy().to_string())
            .unwrap_or_default();
        if skip.contains(&name) {
            continue;
        }
        if path.is_dir() {
            collect_files(&path, skip, extensions, out)?;
        } else if is_crawlable(&path, extensions) {
            out.push(path);
        }
    }
    Ok(())
}

fn is_crawlable(path: &Path, extensions: &[&str]) -> bool {
    let name = path
        .file_name()
        .map(|n| n.to_string_lossy().to_string())
        .unwrap_or_default();
    if name.starts_with('.') {
        return false;
    }
    let ext = path
        .extension()
        .map(|x| x.to_string_lossy().to_string())
        .unwrap_or_default();
    extensions
        .iter()
        .any(|e| e.trim_start_matches('.') == ext)
}

fn slugify(stem: &str) -> String {
    let mut out = String::new();
    for c in stem.chars() {
        if c.is_alphanumeric() {
            for lc in c.to_lowercase() {
                out.push(lc);
            }
        } else {
            out.push('-');
        }
    }
    while out.contains("--") {
        out = out.replace("--", "-");
    }
    out.trim_matches('-').to_string()
}

fn derive_title(text: &str, fallback: &str) -> String {
    for line in text.lines() {
        let trimmed = line.trim();
        if trimmed.is_empty() {
            continue;
        }
        if trimmed.starts_with('#') {
            let t = trimmed.trim_start_matches('#').trim();
            if !t.is_empty() {
                return t.to_string();
            }
        }
        // The first non-empty line is the document's opening; if it is not a
        // heading, stop and fall back to the file name.
        break;
    }
    fallback.to_string()
}

/// Crawls `src` into `out`: reads crawlable text files, writes normalized
/// copies plus a `manifest.json`. Returns the number of documents crawled.
///
/// Deterministic: files are visited in sorted path order and ids are assigned
/// in that order.
pub fn crawl(src: &Path, out: &Path, extensions: &[&str], skip: &[&str]) -> Result<usize, String> {
    let mut skip: Vec<String> = skip.iter().map(|s| s.to_string()).collect();
    if let Some(out_name) = out.file_name().map(|n| n.to_string_lossy().to_string()) {
        if !skip.contains(&out_name) {
            skip.push(out_name);
        }
    }

    let mut files = Vec::new();
    collect_files(src, &skip, extensions, &mut files)?;
    files.sort();

    fs::create_dir_all(out)
        .map_err(|e| format!("cannot create {}: {}", out.display(), e))?;

    let mut docs: Vec<(String, String, String)> = Vec::new(); // (file, title, source)
    for (i, path) in files.iter().enumerate() {
        let meta = fs::metadata(path)
            .map_err(|e| format!("cannot stat {}: {}", path.display(), e))?;
        if meta.len() > MAX_DOC_BYTES {
            continue;
        }
        let raw = fs::read(path).map_err(|e| format!("cannot read {}: {}", path.display(), e))?;
        let text = String::from_utf8_lossy(&raw);
        let stem = path
            .file_stem()
            .map(|s| s.to_string_lossy().to_string())
            .unwrap_or_else(|| format!("doc-{}", i));
        let slug = slugify(&stem);
        let file_name = format!("{:04}-{}.txt", i, slug);
        let title = derive_title(&text, &stem.replace('_', " "));
        let rel = relativize(src, path);
        docs.push((file_name.clone(), title, rel));
        fs::write(out.join(&file_name), text.as_bytes())
            .map_err(|e| format!("cannot write {}: {}", file_name, e))?;
    }

    write_manifest(out, &docs)?;
    Ok(docs.len())
}

fn relativize(src: &Path, path: &Path) -> String {
    match path.strip_prefix(src) {
        Ok(rel) => rel.to_string_lossy().to_string(),
        Err(_) => path.to_string_lossy().to_string(),
    }
}

fn write_manifest(out: &Path, docs: &[(String, String, String)]) -> Result<(), String> {
    let mut entries = Vec::new();
    for (id, (file, title, source)) in docs.iter().enumerate() {
        let obj = vec![
            ("id".to_string(), crate::jsonx::Json::Num(id as f64)),
            ("file".to_string(), crate::jsonx::Json::Str(file.clone())),
            ("title".to_string(), crate::jsonx::Json::Str(title.clone())),
            ("source".to_string(), crate::jsonx::Json::Str(source.clone())),
            ("url".to_string(), crate::jsonx::Json::Str(format!("corpus/{}", file))),
        ];
        entries.push(crate::jsonx::Json::Obj(obj));
    }
    let manifest = crate::jsonx::Json::Obj(vec![
        ("version".to_string(), crate::jsonx::Json::Num(1.0)),
        ("count".to_string(), crate::jsonx::Json::Num(docs.len() as f64)),
        ("docs".to_string(), crate::jsonx::Json::Arr(entries)),
    ]);
    let json = crate::jsonx::to_string(&manifest);
    fs::write(out.join(MANIFEST_NAME), json)
        .map_err(|e| format!("cannot write {}: {}", MANIFEST_NAME, e))
}

/// Loads a corpus directory. Uses `manifest.json` when present, otherwise
/// falls back to scanning for `.txt`/`.md` files in sorted order.
pub fn load_corpus(dir: &Path) -> Result<Vec<Document>, String> {
    let manifest_path = dir.join(MANIFEST_NAME);
    let entries: Vec<(usize, String, String, String)> = if manifest_path.exists() {
        let raw = fs::read_to_string(&manifest_path)
            .map_err(|e| format!("cannot read {}: {}", manifest_path.display(), e))?;
        let json = crate::jsonx::parse(&raw)?;
        let docs = json
            .get("docs")
            .and_then(|d| d.as_arr())
            .ok_or("manifest has no docs array")?;
        let mut out = Vec::new();
        for d in docs {
            let id = d.get("id").and_then(|v| v.as_num()).map(|n| n as usize).unwrap_or(0);
            let file = d.get("file").and_then(|v| v.as_str()).unwrap_or("").to_string();
            let title = d.get("title").and_then(|v| v.as_str()).unwrap_or("").to_string();
            let source = d.get("source").and_then(|v| v.as_str()).unwrap_or("").to_string();
            out.push((id, file, title, source));
        }
        out
    } else {
        let mut files: Vec<PathBuf> = fs::read_dir(dir)
            .map_err(|e| format!("cannot read {}: {}", dir.display(), e))?
            .filter_map(|e| e.ok())
            .map(|e| e.path())
            .filter(|p| {
                p.extension()
                    .map(|x| x.to_string_lossy().to_string())
                    .map(|x| x == "txt" || x == "md")
                    .unwrap_or(false)
            })
            .collect();
        files.sort();
        let mut out = Vec::new();
        for (id, p) in files.into_iter().enumerate() {
            let name = p.file_name().map(|n| n.to_string_lossy().to_string()).unwrap_or_default();
            let stem = p.file_stem().map(|s| s.to_string_lossy().to_string()).unwrap_or_default();
            let text = fs::read_to_string(&p)
                .map_err(|e| format!("cannot read {}: {}", p.display(), e))?;
            let title = derive_title(&text, &stem.replace('_', " "));
            out.push((id, name, title, String::new()));
        }
        out
    };

    let mut docs = Vec::new();
    for (id, file, title, source) in entries {
        let text = fs::read_to_string(dir.join(&file))
            .map_err(|e| format!("cannot read {}: {}", dir.join(&file).display(), e))?;
        docs.push(Document {
            id,
            title,
            source,
            url: format!("corpus/{}", file),
            text,
        });
    }
    Ok(docs)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn slugify_is_safe() {
        assert_eq!(slugify("My README"), "my-readme");
        assert_eq!(slugify("a!!b__c"), "a-b-c");
        assert_eq!(slugify("Ünïcode"), "ünïcode");
        assert_eq!(slugify("   "), "");
    }

    #[test]
    fn derive_title_from_heading() {
        assert_eq!(derive_title("# Hello World\nbody", "fallback"), "Hello World");
        assert_eq!(derive_title("##  Deep  \nbody", "fallback"), "Deep");
        assert_eq!(derive_title("no heading here\nbody", "fallback"), "fallback");
    }

    #[test]
    fn crawl_round_trip() {
        let tmp = std::env::temp_dir().join(format!("meridian-crawl-{}", std::process::id()));
        let src = tmp.join("src");
        let out = tmp.join("out");
        fs::create_dir_all(src.join("sub")).unwrap();
        fs::write(src.join("sub").join("alpha.md"), "# Alpha Doc\nsome alpha text").unwrap();
        fs::write(src.join("beta.txt"), "beta plain text").unwrap();
        fs::write(src.join("skip.bin"), "binary").unwrap();

        let n = crawl(&src, &out, &[".md", ".txt"], &[]).unwrap();
        assert_eq!(n, 2);

        let docs = load_corpus(&out).unwrap();
        assert_eq!(docs.len(), 2);
        let alpha = docs.iter().find(|d| d.title == "Alpha Doc").unwrap();
        assert_eq!(alpha.text, "# Alpha Doc\nsome alpha text");
        assert_eq!(alpha.url, format!("corpus/{}", alpha.url.strip_prefix("corpus/").unwrap()));
        assert_eq!(alpha.source, "sub/alpha.md");

        fs::remove_dir_all(&tmp).unwrap();
    }

    #[test]
    fn crawl_skips_out_dir() {
        let tmp = std::env::temp_dir().join(format!("meridian-crawl2-{}", std::process::id()));
        let src = tmp.join("src");
        let out = src.join("corpus");
        fs::create_dir_all(&src).unwrap();
        fs::write(src.join("one.md"), "# One\none text").unwrap();
        let n = crawl(&src, &out, &[".md"], &[]).unwrap();
        assert_eq!(n, 1);
        let docs = load_corpus(&out).unwrap();
        assert_eq!(docs.len(), 1);
        fs::remove_dir_all(&tmp).unwrap();
    }

    #[test]
    fn load_corpus_without_manifest() {
        let tmp = std::env::temp_dir().join(format!("meridian-crawl3-{}", std::process::id()));
        fs::create_dir_all(&tmp).unwrap();
        fs::write(tmp.join("b.txt"), "bee").unwrap();
        fs::write(tmp.join("a.md"), "# Aye\nay").unwrap();
        let docs = load_corpus(&tmp).unwrap();
        assert_eq!(docs.len(), 2);
        assert_eq!(docs[0].title, "Aye");
        fs::remove_dir_all(&tmp).unwrap();
    }
}