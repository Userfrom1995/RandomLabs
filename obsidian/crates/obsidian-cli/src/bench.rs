//! Benchmark runner: per-image encode/decode + fidelity gate, CSV output.
//! The shell harness `benchmarks/run_kodak.sh` and `benchmarks/aggregate.py`
//! wrap this for the full Kodak protocol.

use obsidian_core::image::Channels;
use std::path::PathBuf;
use std::process::Command;
use std::time::Instant;

pub fn cmd_bench(args: &[String]) -> i32 {
    let mut effort = 4u8;
    let mut json = false;
    let mut positional: Vec<String> = Vec::new();
    let mut it = args.iter();
    while let Some(a) = it.next() {
        match a.as_str() {
            "--effort" | "-e" => match it.next() {
                Some(v) => match v.parse::<u8>() {
                    Ok(e) if e <= 7 => effort = e,
                    _ => {
                        eprintln!("obsidian: --effort must be an integer in 0..=7");
                        return 1;
                    }
                },
                None => {
                    eprintln!("obsidian: --effort requires a value");
                    return 1;
                }
            },
            "--json" => json = true,
            _ => positional.push(a.clone()),
        }
    }
    if positional.len() != 1 {
        eprintln!("obsidian: bench requires <image-dir>");
        return 1;
    }
    let dir = PathBuf::from(&positional[0]);
    let mut files: Vec<PathBuf> = Vec::new();
    match std::fs::read_dir(&dir) {
        Ok(rd) => {
            for ent in rd.flatten() {
                let p = ent.path();
                if p.extension().map(|e| e == "ppm" || e == "pgm").unwrap_or(false) {
                    files.push(p);
                }
            }
        }
        Err(e) => {
            eprintln!("obsidian: cannot read '{}': {e}", dir.display());
            return 2;
        }
    }
    files.sort();
    if files.is_empty() {
        eprintln!("obsidian: no .ppm/.pgm files found in '{}'", dir.display());
        return 1;
    }

    let mut rows = Vec::new();
    let mut failed = 0usize;
    for p in &files {
        let data = match std::fs::read(p) {
            Ok(d) => d,
            Err(e) => {
                eprintln!("obsidian: cannot read '{}': {e}", p.display());
                failed += 1;
                continue;
            }
        };
        let image = match obsidian_core::ppm::read(&data) {
            Ok(i) => i,
            Err(e) => {
                eprintln!("obsidian: bad image '{}': {e}", p.display());
                failed += 1;
                continue;
            }
        };
        let name = p
            .file_stem()
            .map(|s| s.to_string_lossy().to_string())
            .unwrap_or_else(|| p.display().to_string());
        let area = image.area() as f64;

        let t0 = Instant::now();
        let encoded = match obsidian_core::encode(&image, effort) {
            Ok(v) => v,
            Err(e) => {
                eprintln!("obsidian: encode failed on '{}': {e}", p.display());
                failed += 1;
                continue;
            }
        };
        let enc_ms = t0.elapsed().as_secs_f64() * 1000.0;

        let t1 = Instant::now();
        let decoded = match obsidian_core::decode(&encoded.0) {
            Ok(d) => d,
            Err(e) => {
                eprintln!("obsidian: decode failed on '{}': {e}", p.display());
                failed += 1;
                continue;
            }
        };
        let dec_ms = t1.elapsed().as_secs_f64() * 1000.0;

        if decoded != image {
            eprintln!("obsidian: FIDELITY FAILURE on '{}'", p.display());
            failed += 1;
            continue;
        }

        let bpp = (encoded.0.len() as f64 * 8.0) / area;
        let channels = match image.channels {
            Channels::Gray => "gray",
            Channels::Rgb => "rgb",
            Channels::Rgba => "rgba",
        };
        let version = format!("obsidian-{}", obsidian_core::header::VERSION);
        rows.push(format!(
            "{},{},{},{},{},{},{},{:.2},{:.2},{}",
            name,
            version,
            channels,
            encoded.0.len(),
            format!("{bpp:.4}"),
            format!("{enc_ms:.2}"),
            format!("{dec_ms:.2}"),
            enc_ms,
            dec_ms,
            effort
        ));
    }

    // Reference codecs (best effort; skip silently when the tool is absent).
    let refs = run_references(&files);

    if json {
        for r in &rows {
            println!("{r}");
        }
        for r in &refs {
            println!("{r}");
        }
    } else {
        println!("image,codec,channels,bytes,bpp,enc_ms,dec_ms,enc_ms_f,dec_ms_f,effort");
        for r in &rows {
            println!("{r}");
        }
        for r in &refs {
            println!("{r}");
        }
    }
    if failed > 0 {
        eprintln!("bench: {failed} image(s) failed the fidelity gate");
        3
    } else {
        0
    }
}

fn tool_available(name: &str) -> bool {
    Command::new("sh")
        .args(["-c", &format!("command -v {name} >/dev/null 2>&1")])
        .status()
        .map(|s| s.success())
        .unwrap_or(false)
}

/// Run pinned reference codecs over the same PPM set, returning CSV rows in
/// the same format. Tools that are not installed are skipped.
fn run_references(files: &[PathBuf]) -> Vec<String> {
    let mut rows = Vec::new();
    if files.is_empty() {
        return rows;
    }
    let tmp = std::env::temp_dir().join("obsidian-ref");
    let _ = std::fs::create_dir_all(&tmp);

    if tool_available("cjxl") {
        for p in files {
            let out = tmp.join(format!("{}.jxl", p.file_stem().unwrap().to_string_lossy()));
            let t = Instant::now();
            let ok = Command::new("cjxl")
                .args(["-d", "0", "-e", "7", "--lossless_jpeg=0"])
                .arg(p)
                .arg(&out)
                .status()
                .map(|s| s.success())
                .unwrap_or(false);
            let enc_ms = t.elapsed().as_secs_f64() * 1000.0;
            if !ok {
                continue;
            }
            if let Ok(md) = std::fs::metadata(&out) {
                rows.push(format!(
                    "{},{},{},{:.4},{:.2},0.00",
                    p.file_stem().unwrap().to_string_lossy(),
                    "jxl",
                    md.len(),
                    0.0,
                    enc_ms
                ));
            }
        }
    }
    if tool_available("cwebp") {
        for p in files {
            let out = tmp.join(format!("{}.webp", p.file_stem().unwrap().to_string_lossy()));
            let t = Instant::now();
            let ok = Command::new("cwebp")
                .args(["-lossless", "-z", "9", "-m", "6"])
                .arg(p)
                .arg("-o")
                .arg(&out)
                .status()
                .map(|s| s.success())
                .unwrap_or(false);
            let enc_ms = t.elapsed().as_secs_f64() * 1000.0;
            if !ok {
                continue;
            }
            if let Ok(md) = std::fs::metadata(&out) {
                rows.push(format!(
                    "{},{},{},{:.4},{:.2},{:.2}",
                    p.file_stem().unwrap().to_string_lossy(),
                    "webp",
                    md.len(),
                    0.0,
                    enc_ms,
                    0.0
                ));
            }
        }
    }
    rows
}
