//! The Meridian CLI: crawl, index, search, stats, verify, self-checks.
//!
//! No interactive input: everything comes from `--key value` arguments; a
//! missing required value is a clear error with a non-zero exit.

use crate::corpus::{self, Document};
use crate::export;
use crate::index::{self, Index};
use crate::jsonx::{self, Json};
use crate::query;
use crate::query::SearchOptions;
use crate::scoring::Scorer;
use crate::snippet;

pub fn usage() -> String {
    "Meridian - a full-text search engine built from scratch in Rust\n\n\
     usage: meridian <command> [options]\n\n\
     commands:\n\
     \x20 crawl        --src <dir> --out <corpus> [--threads N]\n\
     \x20 index        --corpus <dir> --out <json> [--name <n>] [--threads N]\n\
     \x20 search       --corpus <dir> --query <q> [--scoring bm25|tfidf] [--top N] [--offset N] [--limit N] [--format text|json] [--stem on|off] [--signals on|off] [--stopwords on|off] [--threads N]\n\
     \x20 search-index --index <json> --query <q> [--corpus <dir>] [--scoring bm25|tfidf] [--top N] [--offset N] [--limit N] [--format text|json] [--stem on|off] [--signals on|off] [--stopwords on|off] [--threads N]\n\
     \x20 suggest      --index <json> --prefix <p> [--top N] [--format text|json]\n\
     \x20 stats        --corpus <dir> [--format text|json]             corpus and index statistics\n\
     \x20 plan         --query <q>                                     show the parsed query plan\n\
     \x20 verify-index --index <json> --corpus <dir>         prove the exported index round-trips\n\
     \x20 bench        --index <json> [--iterations N]       run the built-in query benchmark\n\
     \x20 check                                              run runtime self-checks\n\
     \x20 help                                               show this help\n\n\
     options:\n\
     \x20 --stem      on|off     expand query terms to whole word families (default off)\n\
     \x20 --signals   on|off     title boost + proximity ranking signals (default on)\n\
     \x20 --stopwords on|off     drop common words from ranked queries (default on)\n\
     \x20 --offset    N          skip the first N ranked results (default 0)\n\
     \x20 --limit     N          show at most N results per page (default 20)\n\
     \x20 --threads   N          worker count for crawl/index/search (default: cpu count)\n\
     \x20 --time                 print wall-clock ms per phase\n\n\
     query syntax:\n\
     \x20 AND/OR/NOT, parentheses, \"quoted phrases\" (with ~N slop), term* / term? wildcards,\n\
     \x20 title:term / source:term fields, term~ (fuzzy d=1), term~2 (fuzzy d=2), term^N boosting\n\n\
     examples:\n\
     \x20 meridian crawl --src ../ --out corpus --threads 8\n\
     \x20 meridian index --corpus corpus --out data/index.json --name \"Meridian corpus\" --threads 4\n\
     \x20 meridian search --corpus corpus --query \"rust AND seismic\" --top 5 --stem on\n\
     \x20 meridian search-index --index data/index.json --corpus corpus --query \"\\\"search engine\\\"~1\" --format json\n\
     \x20 meridian search-index --index data/index.json --corpus corpus --query \"title:search*\" --offset 0 --limit 10\n\
     \x20 meridian suggest --index data/index.json --prefix \"sear\"\n\
     \x20 meridian plan --query \"searching~ engine\""
        .to_string()
}

struct Args {
    positionals: Vec<String>,
    opts: Vec<(String, String)>,
}

/// Options that act as bare flags (no value consumed).
fn is_flag(key: &str) -> bool {
    key == "time"
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
            } else if is_flag(&key) {
                opts.push((key, "true".to_string()));
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

fn opt_bool(args: &Args, key: &str, default: bool) -> Result<bool, String> {
    match get(args, key) {
        None => Ok(default),
        Some(v) => match v.as_str() {
            "on" | "true" | "1" => Ok(true),
            "off" | "false" | "0" => Ok(false),
            _ => Err(format!("invalid value '{}' for --{} (expected on or off)", v, key)),
        },
    }
}

fn opt_threads(args: &Args) -> Result<usize, String> {
    match get(args, "threads") {
        None => Ok(std::thread::available_parallelism().map(|n| n.get()).unwrap_or(1)),
        Some(v) => {
            let n: usize = v
                .parse()
                .map_err(|_| format!("invalid number for --threads: {}", v))?;
            if n == 0 {
                return Err("--threads must be at least 1".to_string());
            }
            Ok(n)
        }
    }
}

fn opt_signals(args: &Args) -> Result<SearchOptions, String> {
    Ok(SearchOptions {
        stem: opt_bool(args, "stem", false)?,
        signals: opt_bool(args, "signals", true)?,
        stopwords: opt_bool(args, "stopwords", true)?,
    })
}

/// A simple wall-clock timer for `--time` phase reporting.
struct Timer {
    start: std::time::Instant,
}

impl Timer {
    fn new() -> Timer {
        Timer {
            start: std::time::Instant::now(),
        }
    }

    fn ms(&self) -> f64 {
        self.start.elapsed().as_secs_f64() * 1000.0
    }
}

fn load_docs(corpus_dir: &str) -> Result<Vec<Document>, String> {
    corpus::load_corpus(std::path::Path::new(corpus_dir))
}

fn build_from_docs(docs: &[Document]) -> Index {
    build_from_docs_with(docs, 1)
}

fn build_from_docs_with(docs: &[Document], threads: usize) -> Index {
    let texts: Vec<&str> = docs.iter().map(|d| d.text.as_str()).collect();
    let titles: Vec<String> = docs.iter().map(|d| d.title.clone()).collect();
    let sources: Vec<String> = docs.iter().map(|d| d.source.clone()).collect();
    let urls: Vec<String> = docs.iter().map(|d| d.url.clone()).collect();
    index::build_index_with(&texts, &titles, &sources, &urls, threads)
}

/// Runs a search and formats the output. `docs` supplies document text for
/// snippets (empty when only the exported index is available). `offset`/`limit`
/// page the ranked results and `threads` parallelizes scoring.
#[allow(clippy::too_many_arguments)]
fn run_search(
    index: &Index,
    docs: &[Document],
    query_str: &str,
    scorer: Scorer,
    opts: SearchOptions,
    top: usize,
    offset: usize,
    limit: usize,
    threads: usize,
    json_out: bool,
) -> Result<i32, String> {
    let started = Timer::new();
    let plan = query::parse_query(query_str)?;
    let rank_top = top.max(offset.saturating_add(limit));
    let hits = query::search_with(index, scorer, &opts, &plan, rank_top, threads);
    let total = query::candidates(index, &opts, &plan).len();
    let suggestions = query::suggestions(index, &plan);
    let elapsed = started.ms();

    let page: Vec<&crate::query::SearchHit> = hits
        .iter()
        .skip(offset.min(hits.len()))
        .take(limit)
        .collect();
    let limit = limit.max(1);
    let pages = if total == 0 { 0 } else { total.div_ceil(limit) };

    if json_out {
        let mut hits_json = Vec::new();
        for h in page {
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
                            .map(|b| {
                                Json::Obj(vec![
                                    ("term".to_string(), Json::Str(b.term.clone())),
                                    ("score".to_string(), Json::Num(b.score)),
                                    ("title".to_string(), Json::Bool(b.title)),
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
            ("stem".to_string(), Json::Bool(opts.stem)),
            ("signals".to_string(), Json::Bool(opts.signals)),
            ("stopwords".to_string(), Json::Bool(opts.stopwords)),
            ("total_hits".to_string(), Json::Num(total as f64)),
            ("offset".to_string(), Json::Num(offset as f64)),
            ("limit".to_string(), Json::Num(limit as f64)),
            ("pages".to_string(), Json::Num(pages as f64)),
            ("ms".to_string(), Json::Num(elapsed)),
            (
                "suggestions".to_string(),
                Json::Arr(suggestions.iter().map(|s| Json::Str(s.clone())).collect()),
            ),
            ("hits".to_string(), Json::Arr(hits_json)),
        ]);
        println!("{}", jsonx::to_string(&root));
    } else {
        let shown = page.len();
        let first = if shown == 0 { 0 } else { offset + 1 };
        let last = if shown == 0 { 0 } else { offset + shown };
        println!(
            "Query: {}  (scorer: {}, stem: {}, signals: {}, stopwords: {}, showing {}..{} of {} matches, {:.1} ms)",
            query_str,
            scorer.name(),
            if opts.stem { "on" } else { "off" },
            if opts.signals { "on" } else { "off" },
            if opts.stopwords { "on" } else { "off" },
            first,
            last,
            total,
            elapsed
        );
        if !suggestions.is_empty() {
            println!("Did you mean: {}", suggestions.join(", "));
        }
        println!();
        for (i, h) in page.iter().enumerate() {
            let doc = index.docs.get(h.doc_id);
            println!("{}. {}  (score {:.4})", offset + i + 1, doc.map(|d| d.title.as_str()).unwrap_or("?"), h.score);
            println!("   {}", doc.map(|d| d.source.as_str()).unwrap_or(""));
            if let Some(d) = docs.get(h.doc_id) {
                let s = snippet::generate(&d.text, &h.matches, 220);
                println!("   {}", render_snippet_text(&s));
            }
            let parts: Vec<String> = h
                .breakdown
                .iter()
                .map(|b| {
                    let tag = if b.title { " [title]" } else { "" };
                    format!("{}: {:.2}{}", b.term, b.score, tag)
                })
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
    let threads = opt_threads(args)?;
    let time = get(args, "time").is_some();
    let started = Timer::new();
    let n = corpus::crawl_with_threads(
        std::path::Path::new(&src),
        std::path::Path::new(&out),
        corpus::default_extensions(),
        corpus::default_skip_names(),
        threads,
    )?;
    println!(
        "crawled {} document(s) from {} into {} ({})",
        n,
        src,
        out,
        if time {
            format!("{:.1} ms, {} threads", started.ms(), threads)
        } else {
            format!("{} threads", threads)
        }
    );
    Ok(0)
}

fn cmd_index(args: &Args) -> Result<i32, String> {
    let corpus_dir = require(args, "corpus")?;
    let out = require(args, "out")?;
    let name = get(args, "name").unwrap_or_else(|| "Meridian corpus".to_string());
    let threads = opt_threads(args)?;
    let time = get(args, "time").is_some();
    let started = Timer::new();
    let docs = load_docs(&corpus_dir)?;
    let index = build_from_docs_with(&docs, threads);
    let index_ms = started.ms();
    let json = export::index_to_json(&index, &name);
    let dir = std::path::Path::new(&out)
        .parent()
        .map(|p| p.to_path_buf())
        .unwrap_or_else(|| std::path::PathBuf::from("."));
    std::fs::create_dir_all(&dir).map_err(|e| format!("cannot create {}: {}", dir.display(), e))?;
    std::fs::write(&out, &json).map_err(|e| format!("cannot write {}: {}", out, e))?;
    let total_ms = started.ms();

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
    if time {
        println!(
            "timing: index {:.1} ms, export+write {:.1} ms, total {:.1} ms ({} threads)",
            index_ms,
            total_ms - index_ms,
            total_ms,
            threads
        );
    }
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
    let opts = opt_signals(args)?;
    let top = opt_num(args, "top", 10)?;
    let offset = opt_num(args, "offset", 0)?;
    let limit = opt_num(args, "limit", 20)?;
    let threads = opt_threads(args)?;
    let fmt = format_name(args)?;
    let docs = load_docs(&corpus_dir)?;
    let index = build_from_docs(&docs);
    run_search(&index, &docs, &query_str, scorer, opts, top, offset, limit, threads, fmt == "json")
}

fn cmd_search_index(args: &Args) -> Result<i32, String> {
    let index_path = require(args, "index")?;
    let query_str = require(args, "query")?;
    let scorer = opt_scorer(args)?;
    let opts = opt_signals(args)?;
    let top = opt_num(args, "top", 10)?;
    let offset = opt_num(args, "offset", 0)?;
    let limit = opt_num(args, "limit", 20)?;
    let threads = opt_threads(args)?;
    let fmt = format_name(args)?;
    let raw = std::fs::read_to_string(&index_path)
        .map_err(|e| format!("cannot read {}: {}", index_path, e))?;
    let index = export::index_from_json(&raw)?;
    let docs = match get(args, "corpus") {
        Some(dir) => load_docs(&dir)?,
        None => Vec::new(),
    };
    run_search(&index, &docs, &query_str, scorer, opts, top, offset, limit, threads, fmt == "json")
}

fn cmd_suggest(args: &Args) -> Result<i32, String> {
    let index_path = require(args, "index")?;
    let prefix = require(args, "prefix")?;
    let top = opt_num(args, "top", 8)?;
    let fmt = format_name(args)?;
    let raw = std::fs::read_to_string(&index_path)
        .map_err(|e| format!("cannot read {}: {}", index_path, e))?;
    let index = export::index_from_json(&raw)?;
    let suggestions = crate::wildcard::suggest_prefix(&index, &prefix, top);
    if fmt == "json" {
        let root = Json::Obj(vec![
            ("prefix".to_string(), Json::Str(prefix)),
            (
                "suggestions".to_string(),
                Json::Arr(suggestions.iter().map(|s| Json::Str(s.clone())).collect()),
            ),
        ]);
        println!("{}", jsonx::to_string(&root));
    } else {
        println!("suggestions for '{}':", prefix);
        for (i, s) in suggestions.iter().enumerate() {
            println!("  {}. {}", i + 1, s);
        }
    }
    Ok(0)
}

fn cmd_stats(args: &Args) -> Result<i32, String> {
    let corpus_dir = require(args, "corpus")?;
    let fmt = format_name(args)?;
    let docs = load_docs(&corpus_dir)?;
    let index = build_from_docs(&docs);
    let (min, max, avg) = index_stats(&index);
    let raw = raw_bytes(&index);
    let compressed = compressed_bytes(&index);
    let postings_total: usize = index
        .terms
        .values()
        .map(|e| e.postings.iter().map(|p| p.tf as usize).sum::<usize>())
        .sum();
    let common: Vec<&String> = {
        let mut v: Vec<&String> = index.terms.keys().collect();
        v.sort_by_key(|t| std::cmp::Reverse(index.df(t)));
        v.truncate(10);
        v
    };

    if fmt == "json" {
        let root = Json::Obj(vec![
            ("documents".to_string(), Json::Num(index.total_docs as f64)),
            ("total_tokens".to_string(), Json::Num(index.total_tokens as f64)),
            ("vocabulary".to_string(), Json::Num(index.terms.len() as f64)),
            (
                "doc_length".to_string(),
                Json::Obj(vec![
                    ("min".to_string(), Json::Num(min as f64)),
                    ("max".to_string(), Json::Num(max as f64)),
                    ("avg".to_string(), Json::Num(avg)),
                ]),
            ),
            ("postings_entries".to_string(), Json::Num(postings_total as f64)),
            ("compressed_bytes".to_string(), Json::Num(compressed as f64)),
            ("raw_bytes_estimate".to_string(), Json::Num(raw as f64)),
            (
                "common_terms".to_string(),
                Json::Arr(
                    common
                        .iter()
                        .map(|t| {
                            let entry = index.entry(t).expect("term in vocab");
                            Json::Obj(vec![
                                ("term".to_string(), Json::Str(t.to_string())),
                                ("df".to_string(), Json::Num(entry.df as f64)),
                                (
                                    "repr".to_string(),
                                    export::posting_repr(&entry.postings[0]),
                                ),
                            ])
                        })
                        .collect(),
                ),
            ),
        ]);
        println!("{}", jsonx::to_string(&root));
        return Ok(0);
    }

    println!("Meridian corpus statistics");
    println!("  documents:       {}", index.total_docs);
    println!("  total tokens:    {}", index.total_tokens);
    println!("  doc length:      {}..{} (avg {:.1})", min, max, avg);
    println!("  vocabulary:      {} terms", index.terms.len());
    println!("  postings entries: {}", postings_total);
    println!("  compressed size: {} bytes (raw est {} bytes, {:.1}x smaller)", compressed, raw, raw as f64 / compressed.max(1) as f64);
    println!("  most common terms:");
    for t in common {
        println!("    {} ({} docs)", t, index.df(t));
    }
    Ok(0)
}

const BENCH_QUERIES: &[&str] = &[
    "search",
    "search engine",
    "\"search engine\"",
    "rust AND programming",
    "rust OR cargo OR index",
    "\"inverted index\" AND postings",
    "searching~",
    "indexing~2",
    "搜索引擎",
    "postings search",
];

fn cmd_bench(args: &Args) -> Result<i32, String> {
    let index_path = require(args, "index")?;
    let iterations = opt_num(args, "iterations", 20)?;
    let raw = std::fs::read_to_string(&index_path)
        .map_err(|e| format!("cannot read {}: {}", index_path, e))?;
    let index = export::index_from_json(&raw)?;
    let opts = SearchOptions::default();
    let scorer = Scorer::Bm25;

    let mut total_ms = 0.0f64;
    println!("bench: {} queries x {} iterations over {}", BENCH_QUERIES.len(), iterations, index_path);
    for q in BENCH_QUERIES {
        let plan = query::parse_query(q)?;
        let mut best = f64::INFINITY;
        let mut sum = 0.0;
        for _ in 0..iterations {
            let t = Timer::new();
            query::search(&index, scorer, &opts, &plan, 10);
            let ms = t.ms();
            sum += ms;
            if ms < best {
                best = ms;
            }
        }
        let avg = sum / iterations.max(1) as f64;
        total_ms += avg;
        println!(
            "  {:24} avg {:8.3} ms   best {:8.3} ms   {} hits",
            format!("\"{}\"", q),
            avg,
            best,
            query::candidates(&index, &opts, &plan).len()
        );
    }
    println!("total avg per query: {:.3} ms", total_ms);
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
    let opts = SearchOptions::default();
    let hits = query::search(&index, Scorer::Bm25, &opts, &plan, 10);
    pass(
        "boolean AND",
        hits.iter().any(|h| h.doc_id == 0) && !hits.iter().any(|h| h.doc_id == 1),
        "unexpected AND result".to_string(),
    );

    let plan = query::parse_query("\"lazy dog\"").unwrap();
    let hits = query::search(&index, Scorer::Bm25, &opts, &plan, 10);
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
        "suggest" => cmd_suggest(&rest),
        "stats" => cmd_stats(&rest),
        "verify-index" => cmd_verify_index(&rest),
        "check" => cmd_check(),
        "plan" => cmd_plan(&rest),
        "bench" => cmd_bench(&rest),
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