//! The Meridian CLI: crawl, index, search, stats, verify, self-checks.
//!
//! No interactive input: everything comes from `--key value` arguments; a
//! missing required value is a clear error with a non-zero exit.

use crate::corpus::{self, Document};
use crate::export;
use crate::index::{self, Index};
use crate::jsonx::{self, Json};
use crate::query;
use crate::scoring::Scorer;
use crate::snippet;

pub fn usage() -> String {
    "Meridian - a full-text search engine built from scratch in Rust\n\n\
         usage: meridian <command> [options]\n\n\
         commands:\n\
         \x20 crawl        --src <dir> --out <corpus>            crawl a directory into a corpus\n\
         \x20 index        --corpus <dir> --out <json> [--name <n>]  build the index and export JSON\n\
         \x20 search       --corpus <dir> --query <q> [--scoring bm25|tfidf] [--top N] [--format text|json]\n\
         \x20 search-index --index <json> --query <q> [--corpus <dir>] [--scoring bm25|tfidf] [--top N] [--format text|json]\n\
         \x20 stats        --corpus <dir>                        corpus and index statistics\n\
         \x20 verify-index --index <json> --corpus <dir>         prove the exported index round-trips\n\
         \x20 check                                              run runtime self-checks\n\
         \x20 help                                               show this help\n\n\
         examples:\n\
         \x20 meridian crawl --src ../ --out corpus\n\
         \x20 meridian index --corpus corpus --out data/index.json --name \"Meridian corpus\"\n\
         \x20 meridian search --corpus corpus --query \"rust AND seismic\" --top 5\n\
         \x20 meridian search-index --index data/index.json --corpus corpus --query \"\\\"search engine\\\"\" --format json"
        .to_string()
}

struct Args {
    positionals: Vec<String>,
    opts: Vec<(String, String)>,
}

fn parse_args(args: &[String]) -> Result<Args, String> {
    let mut positionals = Vec::new();
    let mut opts = Vec::new();
    let mut i = 0;
    while i < args.len() {
        let a = &args[i];
        if a.starts_with("--") {
            let key = a.trim_start_matches("--").to_string();
            // value may be attached: --key=value
            if let Some(eq) = key.find('=') {
                let v = key[eq + 1..].to_string();
                let k = key[..eq].to_string();
                opts.push((k, v));
            } else {
                i += 1;
                let value = args
                    .get(i)
                    .ok_or_else(|| format!("missing value for --{}", key))?;
                opts.push((key, value.clone()));
            }
        } else {
            positionals.push(a.clone());
        }
        i += 1;
    }
    Ok(Args { positionals, opts })
}

fn get(args: &Args, key: &str) -> Option<String> {
    args.opts
        .iter()
        .find(|(k, _)| k == key)
        .map(|(_, v)| v.clone())
}

fn require(args: &Args, key: &str) -> Result<String, String> {
    get(args, key).ok_or_else(|| format!("missing required option --{}", key))
}

fn opt_num(args: &Args, key: &str, default: usize) -> Result<usize, String> {
    match get(args, key) {
        None => Ok(default),
        Some(v) => v
            .parse()
            .map_err(|_| format!("invalid number for --{}: {}", key, v)),
    }
}

fn opt_scorer(args: &Args) -> Result<Scorer, String> {
    match get(args, "scoring") {
        None => Ok(Scorer::Bm25),
        Some(v) => Scorer::parse(&v).ok_or_else(|| {
            format!("invalid scorer '{}' (expected bm25 or tfidf)", v)
        }),
    }
}

fn format_name(args: &Args) -> Result<String, String> {
    match get(args, "format") {
        None => Ok("text".to_string()),
        Some(v) => {
            if v == "text" || v == "json" {
                Ok(v)
            } else {
                Err(format!("invalid format '{}' (expected text or json)", v))
            }
        }
    }
}

fn load_docs(corpus_dir: &str) -> Result<Vec<Document>, String> {
    corpus::load_corpus(std::path::Path::new(corpus_dir))
}

fn build_from_docs(docs: &[Document]) -> Index {
    let texts: Vec<&str> = docs.iter().map(|d| d.text.as_str()).collect();
    let titles: Vec<String> = docs.iter().map(|d| d.title.clone()).collect();
    let sources: Vec<String> = docs.iter().map(|d| d.source.clone()).collect();
    let urls: Vec<String> = docs.iter().map(|d| d.url.clone()).collect();
    index::build_index(&texts, &titles, &sources, &urls)
}

/// Runs a search and formats the output. `docs` supplies document text for
/// snippets (empty when only the exported index is available).
fn run_search(
    index: &Index,
    docs: &[Document],
    query_str: &str,
    scorer: Scorer,
    top: usize,
    json_out: bool,
) -> Result<i32, String> {
    let plan = query::parse_query(query_str)?;
    let hits = query::search(index, scorer, &plan, top);
    let total = query::candidates(index, &plan).len();

    if json_out {
        let mut hits_json = Vec::new();
        for h in hits {
            let doc = index.docs.get(h.doc_id);
            let snippet = docs
                .get(h.doc_id)
                .map(|d| {
                    let s = snippet::generate(&d.text, &h.matches, 220);
                    Json::Obj(vec![
                        ("text".to_string(), Json::Str(s.text)),
                        (
                            "highlights".to_string(),
                            Json::Arr(
                                s.highlights
                                    .iter()
                                    .map(|(a, b)| {
                                        Json::Arr(vec![
                                            Json::Num(*a as f64),
                                            Json::Num(*b as f64),
                                        ])
                                    })
                                    .collect(),
                            ),
                        ),
                        ("left".to_string(), Json::Bool(s.truncated_left)),
                        ("right".to_string(), Json::Bool(s.truncated_right)),
                    ])
                })
                .unwrap_or(Json::Null);
            hits_json.push(Json::Obj(vec![
                ("doc_id".to_string(), Json::Num(h.doc_id as f64)),
                (
                    "title".to_string(),
                    Json::Str(doc.map(|d| d.title.clone()).unwrap_or_default()),
                ),
                (
                    "source".to_string(),
                    Json::Str(doc.map(|d| d.source.clone()).unwrap_or_default()),
                ),
                (
                    "url".to_string(),
                    Json::Str(doc.map(|d| d.url.clone()).unwrap_or_default()),
                ),
                ("score".to_string(), Json::Num(h.score)),
                (
                    "matches".to_string(),
                    Json::Arr(h.matches.iter().map(|m| Json::Str(m.clone())).collect()),
                ),
                (
                    "breakdown".to_string(),
                    Json::Arr(
                        h.breakdown
                            .iter()
                            .map(|(t, s)| {
                                Json::Obj(vec![
                                    ("term".to_string(), Json::Str(t.clone())),
                                    ("score".to_string(), Json::Num(*s)),
                                ])
                            })
                            .collect(),
                    ),
                ),
                ("snippet".to_string(), snippet),
            ]));
        }
        let root = Json::Obj(vec![
            ("query".to_string(), Json::Str(query_str.to_string())),
            ("scorer".to_string(), Json::Str(scorer.name().to_string())),
            ("total".to_string(), Json::Num(total as f64)),
            ("hits".to_string(), Json::Arr(hits_json)),
        ]);
        println!("{}", jsonx::to_string(&root));
    } else {
        println!(
            "Query: {}  (scorer: {}, showing top {} of {} matches)",
            query_str,
            scorer.name(),
            hits.len(),
            total
        );
        println!();
        for (i, h) in hits.iter().enumerate() {
            let doc = index.docs.get(h.doc_id);
            println!("{}. {}  (score {:.4})", i + 1, doc.map(|d| d.title.as_str()).unwrap_or("?"), h.score);
            println!("   {}", doc.map(|d| d.source.as_str()).unwrap_or(""));
            if let Some(d) = docs.get(h.doc_id) {
                let s = snippet::generate(&d.text, &h.matches, 220);
                println!("   {}", render_snippet_text(&s));
            }
            let parts: Vec<String> = h
                .breakdown
                .iter()
                .map(|(t, s)| format!("{}: {:.2}", t, s))
                .collect();
            println!("   [{}]", parts.join(", "));
            println!();
        }
    }
    Ok(0)
}

/// Renders a snippet in plain text with matched terms bracketed.
pub fn render_snippet_text(s: &snippet::Snippet) -> String {
    let mut out = String::new();
    let mut last = 0usize;
    let mut hl = s.highlights.clone();
    hl.sort();
    for (a, b) in hl {
        if a < last {
            continue;
        }
        out.push_str(&s.text[last..a]);
        out.push('[');
        out.push_str(&s.text[a..b]);
        out.push(']');
        last = b;
    }
    out.push_str(&s.text[last..]);
    out
}

fn cmd_crawl(args: &Args) -> Result<i32, String> {
    let src = require(args, "src")?;
    let out = require(args, "out")?;
    let n = corpus::crawl(
        std::path::Path::new(&src),
        std::path::Path::new(&out),
        corpus::default_extensions(),
        corpus::default_skip_names(),
    )?;
    println!(
        "crawled {} document(s) from {} into {}",
        n, src, out
    );
    Ok(0)
}

fn cmd_index(args: &Args) -> Result<i32, String> {
    let corpus_dir = require(args, "corpus")?;
    let out = require(args, "out")?;
    let name = get(args, "name").unwrap_or_else(|| "Meridian corpus".to_string());
    let docs = load_docs(&corpus_dir)?;
    let index = build_from_docs(&docs);
    let json = export::index_to_json(&index, &name);
    let dir = std::path::Path::new(&out)
        .parent()
        .map(|p| p.to_path_buf())
        .unwrap_or_else(|| std::path::PathBuf::from("."));
    std::fs::create_dir_all(&dir).map_err(|e| format!("cannot create {}: {}", dir.display(), e))?;
    std::fs::write(&out, &json).map_err(|e| format!("cannot write {}: {}", out, e))?;

    let (min_len, max_len, avg) = index_stats(&index);
    let raw = raw_bytes(&index);
    let compressed = compressed_bytes(&index);
    println!(
        "indexed {} documents ({} tokens, avg {:.1} terms/doc, lengths {}-{}): {} terms",
        index.total_docs,
        index.total_tokens,
        avg,
        min_len,
        max_len,
        index.terms.len()
    );
    println!(
        "postings compressed to {} bytes (raw est {} bytes): {:.1}x smaller",
        compressed,
        raw,
        raw as f64 / compressed.max(1) as f64
    );
    println!("wrote index to {}", out);
    Ok(0)
}

fn index_stats(index: &Index) -> (usize, usize, f64) {
    let min = index.docs.iter().map(|d| d.length).min().unwrap_or(0);
    let max = index.docs.iter().map(|d| d.length).max().unwrap_or(0);
    (min, max, index.avg_doc_len)
}

fn raw_bytes(index: &Index) -> usize {
    index
        .terms
        .values()
        .map(|e| {
            e.postings
                .iter()
                .map(|p| (p.tf as usize) * (std::mem::size_of::<u32>() * 2 + 4))
                .sum::<usize>()
        })
        .sum()
}

fn compressed_bytes(index: &Index) -> usize {
    index
        .terms
        .values()
        .map(|e| crate::postings::encode_postings(&e.postings).len())
        .sum()
}

fn cmd_search(args: &Args) -> Result<i32, String> {
    let corpus_dir = require(args, "corpus")?;
    let query_str = require(args, "query")?;
    let scorer = opt_scorer(args)?;
    let top = opt_num(args, "top", 10)?;
    let fmt = format_name(args)?;
    let docs = load_docs(&corpus_dir)?;
    let index = build_from_docs(&docs);
    run_search(&index, &docs, &query_str, scorer, top, fmt == "json")
}

fn cmd_search_index(args: &Args) -> Result<i32, String> {
    let index_path = require(args, "index")?;
    let query_str = require(args, "query")?;
    let scorer = opt_scorer(args)?;
    let top = opt_num(args, "top", 10)?;
    let fmt = format_name(args)?;
    let raw = std::fs::read_to_string(&index_path)
        .map_err(|e| format!("cannot read {}: {}", index_path, e))?;
    let index = export::index_from_json(&raw)?;
    let docs = match get(args, "corpus") {
        Some(dir) => load_docs(&dir)?,
        None => Vec::new(),
    };
    run_search(&index, &docs, &query_str, scorer, top, fmt == "json")
}

fn cmd_stats(args: &Args) -> Result<i32, String> {
    let corpus_dir = require(args, "corpus")?;
    let docs = load_docs(&corpus_dir)?;
    let index = build_from_docs(&docs);
    let (min, max, avg) = index_stats(&index);
    let raw = raw_bytes(&index);
    let compressed = compressed_bytes(&index);
    println!("Meridian corpus statistics");
    println!("  documents:       {}", index.total_docs);
    println!("  total tokens:    {}", index.total_tokens);
    println!("  doc length:      {}..{} (avg {:.1})", min, max, avg);
    println!("  vocabulary:      {} terms", index.terms.len());
    let postings_total: usize = index
        .terms
        .values()
        .map(|e| e.postings.iter().map(|p| p.tf as usize).sum::<usize>())
        .sum();
    println!("  postings entries: {}", postings_total);
    println!("  compressed size: {} bytes (raw est {} bytes, {:.1}x smaller)", compressed, raw, raw as f64 / compressed.max(1) as f64);
    let common: Vec<&String> = {
        let mut v: Vec<&String> = index.terms.keys().collect();
        v.sort_by_key(|t| std::cmp::Reverse(index.df(t)));
        v.truncate(10);
        v
    };
    println!("  most common terms:");
    for t in common {
        println!("    {} ({} docs)", t, index.df(t));
    }
    Ok(0)
}

fn cmd_verify_index(args: &Args) -> Result<i32, String> {
    let index_path = require(args, "index")?;
    let corpus_dir = require(args, "corpus")?;
    let raw = std::fs::read_to_string(&index_path)
        .map_err(|e| format!("cannot read {}: {}", index_path, e))?;
    let rebuilt = export::index_from_json(&raw)?;
    let docs = load_docs(&corpus_dir)?;
    let fresh = build_from_docs(&docs);
    export::compare_indexes(&fresh, &rebuilt)?;
    println!(
        "verify-index OK: {} terms, {} docs rebuilt from {} match a fresh build",
        rebuilt.terms.len(),
        rebuilt.total_docs,
        index_path
    );
    Ok(0)
}

fn cmd_check() -> Result<i32, String> {
    let mut failures = 0usize;
    let mut pass = |name: &str, ok: bool, detail: String| {
        if ok {
            println!("PASS  {}", name);
        } else {
            failures += 1;
            println!("FAIL  {} - {}", name, detail);
        }
    };

    let tokens = crate::tokenizer::tokenize("The Quick Brown FOX");
    pass(
        "tokenizer",
        tokens.len() == 4
            && tokens[0].term == "the"
            && tokens[3].term == "fox"
            && tokens[3].position == 3,
        "unexpected tokenization".to_string(),
    );

    let enc = crate::postings::encode_varint(300);
    pass(
        "varint",
        crate::postings::decode_varint(&enc) == Some((300, 2)),
        "varint encode/decode mismatch".to_string(),
    );

    let texts = [
        "the quick brown fox jumps over the lazy dog",
        "quick red fox races the hound",
        "the lazy dog sleeps all day",
    ];
    let titles: Vec<String> = (0..3).map(|i| format!("doc-{}", i)).collect();
    let index = index::build_index(&texts, &titles, &titles, &titles);
    pass(
        "index build",
        index.total_docs == 3 && index.entry("fox").map(|e| e.df) == Some(2),
        "unexpected index".to_string(),
    );

    let plan = query::parse_query("fox AND dog").unwrap();
    let hits = query::search(&index, Scorer::Bm25, &plan, 10);
    pass(
        "boolean AND",
        hits.iter().any(|h| h.doc_id == 0) && !hits.iter().any(|h| h.doc_id == 1),
        "unexpected AND result".to_string(),
    );

    let plan = query::parse_query("\"lazy dog\"").unwrap();
    let hits = query::search(&index, Scorer::Bm25, &plan, 10);
    pass(
        "phrase search",
        hits.iter().any(|h| h.doc_id == 0 || h.doc_id == 2),
        "phrase not found".to_string(),
    );

    let json = export::index_to_json(&index, "check");
    let rebuilt = export::index_from_json(&json).unwrap();
    pass(
        "export round trip",
        export::compare_indexes(&index, &rebuilt).is_ok(),
        "round trip mismatch".to_string(),
    );

    let s = snippet::generate(texts[0], &["fox".to_string()], 60);
    pass(
        "snippet",
        s.text.contains("fox") && !s.highlights.is_empty(),
        "snippet failed".to_string(),
    );

    if failures == 0 {
        println!("all checks passed");
        Ok(0)
    } else {
        println!("{} check(s) failed", failures);
        Err(format!("{} check(s) failed", failures))
    }
}

fn cmd_plan(args: &Args) -> Result<i32, String> {
    let query_str = require(args, "query")?;
    let plan = query::parse_query(&query_str)?;
    println!("query: {}", query_str);
    println!("plan:  {:?}", plan);
    Ok(0)
}

pub fn run(args: &[String]) -> Result<i32, String> {
    let parsed = parse_args(args)?;
    if parsed.positionals.is_empty() {
        println!("{}", usage());
        return Ok(1);
    }
    let cmd = parsed.positionals[0].as_str();
    let rest = Args {
        positionals: parsed.positionals[1..].to_vec(),
        opts: parsed.opts.clone(),
    };
    match cmd {
        "crawl" => cmd_crawl(&rest),
        "index" => cmd_index(&rest),
        "search" => cmd_search(&rest),
        "search-index" => cmd_search_index(&rest),
        "stats" => cmd_stats(&rest),
        "verify-index" => cmd_verify_index(&rest),
        "check" => cmd_check(),
        "plan" => cmd_plan(&rest),
        "help" | "--help" | "-h" => {
            println!("{}", usage());
            Ok(0)
        }
        other => {
            eprintln!("unknown command: {}", other);
            eprintln!("{}", usage());
            Ok(1)
        }
    }
}