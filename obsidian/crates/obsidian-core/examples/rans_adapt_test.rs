use obsidian_core::rans::{RansEncoder, RansTable, RansDecoder};

fn measure(name: &str, syms: &[usize]) {
    let n = syms.len();
    let size = 512usize;
    let mut table = RansTable::new_adaptive(size);
    let mut plan: Vec<(u32,u32)> = Vec::with_capacity(n);
    for &s in syms { let (f,c)=table.lookup(s); plan.push((f,c)); table.adapt(s); }
    let mut enc = RansEncoder::new();
    for (&s,&(f,c)) in syms.iter().zip(plan.iter()).rev() { enc.put_fc(s,f,c); }
    let b = enc.finish();
    let mut dec = RansDecoder::new(&b).unwrap();
    let mut t = RansTable::new_adaptive(size);
    let got: Vec<usize> = (0..n).map(|_| dec.get(&mut t).unwrap()).collect();
    let bits = b.len() as f64 * 8.0 / n as f64;
    // entropy of true distribution
    let mut hist = vec![0u64; size];
    for &s in syms { hist[s]+=1; }
    let ent: f64 = hist.iter().map(|&h| if h>0 { let p=h as f64/n as f64; -p*p.log2() } else {0.0 }).sum();
    println!("{name}: {} bytes {:.3} bits/sym  entropy={:.3}  ok={}", b.len(), bits, ent, got==syms);
}

fn main() {
    let n = 393216usize;
    let mut seed = 0x1234u64;
    let rnd = |s: &mut u64| { *s ^= *s << 13; *s ^= *s >> 7; *s ^= *s << 17; *s };
    // 1) peaked 87.5% symbol 0
    let mut peaked=Vec::with_capacity(n); let mut seed1=seed;
    for _ in 0..n { if rnd(&mut seed1)%1000<875 {peaked.push(0);} else {peaked.push(1+(rnd(&mut seed1)%390) as usize);} }
    measure("peaked87.5%", &peaked);
    // 2) symbol 0 = 13%, rest uniform over 1..511
    let mut s13=Vec::with_capacity(n); let mut seed2=seed;
    for _ in 0..n { if rnd(&mut seed2)%100<13 {s13.push(0);} else {s13.push(1+(rnd(&mut seed2)%511) as usize);} }
    measure("sym0=13%", &s13);
    // 3) uniform over 0..511
    let mut uni=Vec::with_capacity(n); let mut seed3=seed;
    for _ in 0..n { uni.push((rnd(&mut seed3)%512) as usize); }
    measure("uniform", &uni);
}
