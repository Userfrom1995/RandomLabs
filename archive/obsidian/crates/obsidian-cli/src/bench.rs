//! Benchmark runner: per-image encode/decode + fidelity gate, CSV output.
//! The shell harness `benchmarks/run_kodak.sh` and `benchmarks/aggregate.py`
//! wrap this for the full Kodak protocol.

use obsidian_core::image::{Channels, Image};
use std::path::PathBuf;
use std::process::Command;
use std::time::Instant;

/// Generate a deterministic synthetic "photographic" RGB image: a smooth
/// low-frequency base (sum of sinusoids) plus a few shaded rectangles (edges)
/// and fine texture noise scaled by `noise_amp`. It exercises YCoCg-R + the GAP
/// predictor + the GR backend the way real photos do, so it is a faithful (if
/// not bit-identical) proxy for the Kodak corpus when that dataset is not
/// available in the env. Lower `noise_amp` yields the peaked, low-entropy
/// residuals that dominate real photographs (and where the CMARC context model
/// should win), while the default `8` is a near-noise stress proxy.
fn synth_photo(seed: u64, w: usize, h: usize, noise_amp: f64) -> Image {
    let mut s = seed;
    let mut rng = || {
        s = s.wrapping_mul(6364136223846793005).wrapping_add(1);
        s
    };
    let mut img = Image::new(w as u32, h as u32, Channels::Rgb).unwrap();
    struct Tone {
        fx: f64,
        fy: f64,
        px: f64,
        py: f64,
        amp: f64,
        base: f64,
    }
    let mut tones = Vec::new();
    for _ in 0..3 {
        tones.push(Tone {
            fx: 1.0 + (rng() % 5) as f64 * 0.5,
            fy: 1.0 + (rng() % 5) as f64 * 0.5,
            px: (rng() % 1000) as f64 / 1000.0 * 6.283,
            py: (rng() % 1000) as f64 / 1000.0 * 6.283,
            amp: 40.0 + (rng() % 60) as f64,
            base: 90.0 + (rng() % 80) as f64,
        });
    }
    let objs: Vec<(usize, usize, usize, usize, i32)> = (0..4)
        .map(|_| {
            (
                rng() as usize % w,
                rng() as usize % h,
                8 + rng() as usize % (w / 3),
                8 + rng() as usize % (h / 3),
                (rng() % 200) as i32,
            )
        })
        .collect();
    for c in 0..3 {
        let tone = &tones[c];
        for y in 0..h {
            for x in 0..w {
                let mut v = tone.base
                    + tone.amp
                        * ((tone.fx * x as f64 / w as f64 * 6.283 + tone.px).sin()
                            + (tone.fy * y as f64 / h as f64 * 6.283 + tone.py).sin());
                for (ox, oy, ow, oh, sh) in &objs {
                    if x >= *ox && x < ox + ow && y >= *oy && y < oy + oh {
                        v += *sh as f64 * 0.3;
                    }
                }
                v += (((rng() % 17) as f64) - 8.0) * noise_amp;
                let v = v.clamp(0.0, 255.0) as i32;
                img.planes[c][y * w + x] = v as u8;
            }
        }
    }
    img
}

/// `bench-synth`: encode a batch of synthetic photographic images under the
/// v1 single-`k` GR backend (`OBSIDIAN_CM=0`), the M2.5 context-mixing backend
/// (default), and the CMARC context-modeled binary range coder (`OBSIDIAN_CARC=1`),
/// reporting the mean bpp of each so the entropy-stage deltas can be tracked
/// without the Kodak dataset. Every encode is round-trip verified bit-exact.
pub fn cmd_bench_synth(args: &[String]) -> i32 {
    let mut effort = 4u8;
    let mut count = 64usize;
    let mut size = 256usize;
    let mut seed = 1337u64;
    let mut noise = 1.0f64;
    let mut it = args.iter();
    while let Some(a) = it.next() {
        match a.as_str() {
            "--noise" => match it.next() {
                Some(v) => match v.parse::<f64>() {
                    Ok(n) if n >= 0.0 => noise = n,
                    _ => {
                        eprintln!("obsidian: --noise must be a non-negative number");
                        return 1;
                    }
                },
                None => {
                    eprintln!("obsidian: --noise requires a value");
                    return 1;
                }
            },
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
            "--count" | "-n" => match it.next() {
                Some(v) => match v.parse::<usize>() {
                    Ok(n) if n >= 1 => count = n,
                    _ => {
                        eprintln!("obsidian: --count must be a positive integer");
                        return 1;
                    }
                },
                None => {
                    eprintln!("obsidian: --count requires a value");
                    return 1;
                }
            },
            "--size" | "-s" => match it.next() {
                Some(v) => match v.parse::<usize>() {
                    Ok(n) if n >= 1 => size = n,
                    _ => {
                        eprintln!("obsidian: --size must be a positive integer");
                        return 1;
                    }
                },
                None => {
                    eprintln!("obsidian: --size requires a value");
                    return 1;
                }
            },
            "--seed" => match it.next() {
                Some(v) => match v.parse::<u64>() {
                    Ok(s) => seed = s,
                    _ => {
                        eprintln!("obsidian: --seed must be an integer");
                        return 1;
                    }
                },
                None => {
                    eprintln!("obsidian: --seed requires a value");
                    return 1;
                }
            },
            _ => {
                eprintln!("obsidian: unexpected argument '{a}'");
                return 1;
            }
        }
    }

    let mut v1_total = 0.0f64;
    let mut cm_total = 0.0f64;
    let mut carc_total = 0.0f64;
    let mut carc_mix_total = 0.0f64;
    let mut failed = 0usize;
    println!(
        "idx,effort,size,v1_bpp,cm_bpp,carc_bpp,carc_mix_bpp,cm_delta,carc_delta,carc_mix_delta_vs_carc,cm_rt,carc_rt,carc_mix_rt"
    );
    for i in 0..count {
        let img = synth_photo(seed + i as u64 * 7919, size, size, noise);
        let area = img.area() as f64;

        // v1 GR backend.
        std::env::set_var("OBSIDIAN_CM", "0");
        std::env::set_var("OBSIDIAN_CARC", "0");
        let (v1_bytes, _v1_stats) = match obsidian_core::encode(&img, effort) {
            Ok(v) => v,
            Err(e) => {
                eprintln!("obsidian: v1 encode failed: {e}");
                failed += 1;
                continue;
            }
        };
        let v1_bpp = (v1_bytes.len() as f64 * 8.0) / area;

        // M2.5 context mixing (default).
        std::env::remove_var("OBSIDIAN_CM");
        std::env::set_var("OBSIDIAN_CARC", "0");
        let (cm_bytes, _cm_stats) = match obsidian_core::encode(&img, effort) {
            Ok(v) => v,
            Err(e) => {
                eprintln!("obsidian: cm encode failed: {e}");
                failed += 1;
                continue;
            }
        };
        let cm_bpp = (cm_bytes.len() as f64 * 8.0) / area;
        let cm_rt = match obsidian_core::roundtrip(&img, effort) {
            Ok((_, _, back)) => back == img,
            Err(_) => false,
        };

        // R2 CMARC context-modeled binary range coder (opt-in). The safety net
        // keeps whichever is smaller, so a carc_bpp == cm_bpp means CMARC lost
        // and fell back to the model's best GR backend (no expansion).
        std::env::remove_var("OBSIDIAN_CM");
        std::env::set_var("OBSIDIAN_CARC", "1");
        let (carc_bytes, _carc_stats) = match obsidian_core::encode(&img, effort) {
            Ok(v) => v,
            Err(e) => {
                eprintln!("obsidian: carc encode failed: {e}");
                failed += 1;
                continue;
            }
        };
        let carc_bpp = (carc_bytes.len() as f64 * 8.0) / area;
        let carc_rt = match obsidian_core::roundtrip(&img, effort) {
            Ok((_, _, back)) => back == img,
            Err(_) => false,
        };

        // R2.4 logistic-mixed CMARC (force-select so we measure the backend's own
        // bytes, not the safety-net fallback). The force seam guarantees the
        // CARC_MIX mode is chosen; round-trip still stays bit-exact.
        std::env::set_var("OBSIDIAN_CARC", "1");
        std::env::set_var("OBSIDIAN_CARC_MIX", "1");
        std::env::set_var("OBSIDIAN_CARC_MIX_FORCE", "1");
        let (carc_mix_bytes, _carc_mix_stats) = match obsidian_core::encode(&img, effort) {
            Ok(v) => v,
            Err(e) => {
                eprintln!("obsidian: carc_mix encode failed: {e}");
                failed += 1;
                continue;
            }
        };
        let carc_mix_bpp = (carc_mix_bytes.len() as f64 * 8.0) / area;
        std::env::remove_var("OBSIDIAN_CARC_MIX_FORCE");
        std::env::remove_var("OBSIDIAN_CARC_MIX");
        let carc_mix_rt = match obsidian_core::roundtrip(&img, effort) {
            Ok((_, _, back)) => back == img,
            Err(_) => false,
        };

        v1_total += v1_bpp;
        cm_total += cm_bpp;
        carc_total += carc_bpp;
        carc_mix_total += carc_mix_bpp;
        println!(
            "{},{},{}x{},{:.4},{:.4},{:.4},{:.4},{:+.4},{:+.4},{:+.4},{},{},{}",
            i,
            effort,
            size,
            size,
            v1_bpp,
            cm_bpp,
            carc_bpp,
            carc_mix_bpp,
            cm_bpp - v1_bpp,
            carc_bpp - cm_bpp,
            carc_mix_bpp - carc_bpp,
            cm_rt,
            carc_rt,
            carc_mix_rt
        );
    }
    if failed > 0 {
        eprintln!("bench-synth: {failed} image(s) failed");
        return 3;
    }
    let v1_mean = v1_total / count as f64;
    let cm_mean = cm_total / count as f64;
    let carc_mean = carc_total / count as f64;
    let carc_mix_mean = carc_mix_total / count as f64;
    println!(
        "MEAN,v1={:.4} bpp, cm={:.4} bpp, carc={:.4} bpp, carc_mix={:.4} bpp, cm_delta={:+.4}, carc_delta_vs_cm={:+.4}, carc_mix_delta_vs_carc={:+.4}",
        v1_mean,
        cm_mean,
        carc_mean,
        carc_mix_mean,
        cm_mean - v1_mean,
        carc_mean - cm_mean,
        carc_mix_mean - carc_mean
    );
    0
}

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
