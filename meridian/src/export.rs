//! Export the index to a compact, self-describing JSON document that a
//! dependency-free browser mirror can load, and rebuild an index from that
//! JSON to verify the round trip.

use crate::index::{build_index, DocMeta, Index, Posting};
use crate::jsonx::{self, Json};
use crate::postings;
use crate::scoring::idf;

pub const INDEX_VERSION: u32 = 1;

const B64: &[u8; 64] = b"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

/// Base64-encodes bytes (RFC 4648 with padding).
pub fn base64_encode(bytes: &[u8]) -> String {
    let mut out = String::with_capacity(bytes.len().div_ceil(3) * 4);
    for chunk in bytes.chunks(3) {
        let b0 = chunk[0] as u32;
        let b1 = chunk.get(1).copied().unwrap_or(0) as u32;
        let b2 = chunk.get(2).copied().unwrap_or(0) as u32;
        let n = (b0 << 16) | (b1 << 8) | b2;
        out.push(B64[((n >> 18) & 0x3f) as usize] as char);
        out.push(B64[((n >> 12) & 0x3f) as usize] as char);
        out.push(if chunk.len() > 1 {
            B64[((n >> 6) & 0x3f) as usize] as char
        } else {
            '='
        });
        out.push(if chunk.len() > 2 {
            B64[(n & 0x3f) as usize] as char
        } else {
            '='
        });
    }
    out
}

/// Base64-decodes a string.
pub fn base64_decode(s: &str) -> Result<Vec<u8>, String> {
    let mut out = Vec::with_capacity(s.len() * 3 / 4);
    let mut acc: u32 = 0;
    let mut bits = 0u32;
    for c in s.chars() {
        if c == '=' {
            break;
        }
        let v = match c {
            'A'..='Z' => (c as u32) - ('A' as u32),
            'a'..='z' => (c as u32) - ('a' as u32) + 26,
            '0'..='9' => (c as u32) - ('0' as u32) + 52,
            '+' => 62,
            '/' => 63,
            _ => return Err(format!("invalid base64 char '{}'", c)),
        };
        acc = (acc << 6) | v;
        bits += 6;
        if bits >= 8 {
            bits -= 8;
            out.push(((acc >> bits) & 0xff) as u8);
        }
    }
    Ok(out)
}

fn doc_json(doc: &DocMeta) -> Json {
    Json::Obj(vec![
        ("id".to_string(), Json::Num(doc.id as f64)),
        ("title".to_string(), Json::Str(doc.title.clone())),
        ("source".to_string(), Json::Str(doc.source.clone())),
        ("url".to_string(), Json::Str(doc.url.clone())),
        ("len".to_string(), Json::Num(doc.length as f64)),
    ])
}

/// Serializes the index to the compact web JSON format.
pub fn index_to_json(index: &Index, name: &str) -> String {
    let mut term_entries: Vec<(String, Json)> = Vec::with_capacity(index.terms.len());
    for (term, entry) in &index.terms {
        let bytes = postings::encode_postings(&entry.postings);
        let b64 = base64_encode(&bytes);
        let idf_val = idf(index, entry.df);
        term_entries.push((
            term.clone(),
            Json::Obj(vec![
                ("df".to_string(), Json::Num(entry.df as f64)),
                ("idf".to_string(), Json::Num(idf_val)),
                ("bytes".to_string(), Json::Num(bytes.len() as f64)),
                ("postings".to_string(), Json::Str(b64)),
            ]),
        ));
    }

    let root = Json::Obj(vec![
        ("version".to_string(), Json::Num(INDEX_VERSION as f64)),
        ("name".to_string(), Json::Str(name.to_string())),
        ("total_docs".to_string(), Json::Num(index.total_docs as f64)),
        ("total_tokens".to_string(), Json::Num(index.total_tokens as f64)),
        ("avg_doc_len".to_string(), Json::Num(index.avg_doc_len)),
        (
            "docs".to_string(),
            Json::Arr(index.docs.iter().map(doc_json).collect()),
        ),
        ("terms".to_string(), Json::Obj(term_entries)),
    ]);
    jsonx::to_string(&root)
}

/// Rebuilds an in-memory index from the exported JSON.
pub fn index_from_json(json_str: &str) -> Result<Index, String> {
    let root = jsonx::parse(json_str)?;
    let total_docs = root
        .get("total_docs")
        .and_then(|v| v.as_num())
        .map(|n| n as usize)
        .ok_or("missing total_docs")?;
    let avg_doc_len = root
        .get("avg_doc_len")
        .and_then(|v| v.as_num())
        .unwrap_or(0.0);

    let docs_json = root
        .get("docs")
        .and_then(|v| v.as_arr())
        .ok_or("missing docs")?;
    let mut docs: Vec<DocMeta> = Vec::with_capacity(docs_json.len());
    let mut total_tokens = 0usize;
    for d in docs_json {
        let id = d.get("id").and_then(|v| v.as_num()).map(|n| n as usize).unwrap_or(0);
        let title = d.get("title").and_then(|v| v.as_str()).unwrap_or("").to_string();
        let source = d.get("source").and_then(|v| v.as_str()).unwrap_or("").to_string();
        let url = d.get("url").and_then(|v| v.as_str()).unwrap_or("").to_string();
        let len = d.get("len").and_then(|v| v.as_num()).map(|n| n as usize).unwrap_or(0);
        total_tokens += len;
        docs.push(DocMeta { id, title, source, url, length: len });
    }

    let terms_json = root
        .get("terms")
        .and_then(|v| v.as_obj())
        .ok_or("missing terms")?;
    let mut terms = std::collections::BTreeMap::new();
    for (term, entry) in terms_json {
        let df = entry.get("df").and_then(|v| v.as_num()).map(|n| n as usize).unwrap_or(0);
        let b64 = entry.get("postings").and_then(|v| v.as_str()).unwrap_or("");
        let bytes = base64_decode(b64)?;
        let postings_list = postings::decode_postings(&bytes).ok_or("corrupt postings")?;
        if postings_list.len() != df {
            return Err(format!("postings count mismatch for '{}'", term));
        }
        terms.insert(
            term.clone(),
            crate::index::TermEntry {
                term: term.clone(),
                df,
                postings: postings_list,
            },
        );
    }

    Ok(Index {
        terms,
        docs,
        total_docs,
        total_tokens,
        avg_doc_len,
    })
}

/// Rebuilds an index the same way `build_index` would, from plain texts.
/// Useful for comparing a rebuilt exported index against a fresh build.
pub fn build_and_compare(
    texts: &[&str],
    titles: &[String],
    sources: &[String],
    urls: &[String],
    exported: &str,
) -> Result<(), String> {
    let original = build_index(texts, titles, sources, urls);
    let rebuilt = index_from_json(exported)?;
    compare_indexes(&original, &rebuilt)
}

/// Compares two indexes for equality (docs, postings, statistics).
pub fn compare_indexes(a: &Index, b: &Index) -> Result<(), String> {
    if a.total_docs != b.total_docs {
        return Err("total_docs differ".to_string());
    }
    if a.terms.len() != b.terms.len() {
        return Err(format!(
            "vocab size differs: {} vs {}",
            a.terms.len(),
            b.terms.len()
        ));
    }
    for (term, entry_a) in &a.terms {
        let entry_b = b
            .terms
            .get(term)
            .ok_or_else(|| format!("term '{}' missing in rebuilt index", term))?;
        if entry_a.df != entry_b.df {
            return Err(format!("df differs for '{}'", term));
        }
        if entry_a.postings != entry_b.postings {
            return Err(format!("postings differ for '{}'", term));
        }
    }
    for d in 0..a.total_docs {
        let da = &a.docs[d];
        let db = &b.docs[d];
        if da.title != db.title || da.source != db.source || da.url != db.url || da.length != db.length
        {
            return Err(format!("doc metadata differs for doc {}", d));
        }
    }
    Ok(())
}

/// A representative posting for stats display.
pub fn posting_repr(p: &Posting) -> Json {
    Json::Obj(vec![
        ("doc".to_string(), Json::Num(p.doc_id as f64)),
        ("tf".to_string(), Json::Num(p.tf as f64)),
        (
            "positions".to_string(),
            Json::Arr(p.positions.iter().map(|x| Json::Num(*x as f64)).collect()),
        ),
    ])
}

#[cfg(test)]
mod tests {
    use super::*;

    fn sample_index() -> Index {
        let texts = ["the quick brown fox jumps", "quick red fox", "the lazy dog"];
        let titles = ["a", "b", "c"].map(|s| s.to_string());
        let sources = ["a.md", "b.md", "c.md"].map(|s| s.to_string());
        let urls = sources.clone();
        build_index(&texts, &titles, &sources, &urls)
    }

    #[test]
    fn base64_round_trip() {
        for s in ["", "f", "fo", "foo", "foobar", "hello world"].iter() {
            let enc = base64_encode(s.as_bytes());
            assert_eq!(base64_decode(&enc).unwrap(), s.as_bytes());
        }
        // Known vectors
        assert_eq!(base64_encode(b"Man"), "TWFu");
        assert_eq!(base64_encode(b"Ma"), "TWE=");
        assert_eq!(base64_encode(b"M"), "TQ==");
        assert_eq!(base64_encode(b"hello world"), "aGVsbG8gd29ybGQ=");
    }

    #[test]
    fn export_round_trip_preserves_index() {
        let original = sample_index();
        let json = index_to_json(&original, "test");
        let rebuilt = index_from_json(&json).unwrap();
        compare_indexes(&original, &rebuilt).unwrap();
    }

    #[test]
    fn export_json_is_parseable_and_compact() {
        let original = sample_index();
        let json = index_to_json(&original, "test");
        assert!(jsonx::parse(&json).is_ok());
        assert!(json.len() < 1500, "compact export, got {}", json.len());
    }

    #[test]
    fn verify_detects_corruption() {
        let original = sample_index();
        let json = index_to_json(&original, "test");
        let mut tampered = json.clone();
        tampered = tampered.replace("\"version\":1", "\"version\":2");
        let rebuilt = index_from_json(&tampered).unwrap();
        assert!(compare_indexes(&original, &rebuilt).is_ok()); // version ignored
        // Tamper with a posting string length.
        let tampered2 = json.replace("TWFu", "TQ==");
        if tampered2 != json {
            let rebuilt2 = index_from_json(&tampered2);
            assert!(rebuilt2.is_err() || compare_indexes(&original, &rebuilt2.unwrap()).is_err());
        }
    }
}