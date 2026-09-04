# Sextant geocoding (S5)

Offline trigram + prefix index over bundled pack names (`Geocode.cs`, built
offline by `Sextant.Pack` into `geocode.idx.json`, version
`sextant-geocode/1`). The App loads the asset and queries it in memory; the
UI debounces at 150 ms and renders the top 8.

## Text folding

`GeocodeText.Normalize`: NFKD decompose, drop `NonSpacingMark`, invariant
lowercase, collapse whitespace. `Café` -> `cafe`, `Zürich` -> `zurich`,
`São Paulo` -> `sao paulo`. Characters with no decomposition (e.g. `ø`,
`ł`, CJK) survive folding and still match literally.

## Trigrams

Padded character trigrams (`  ab  ` for input `ab`), stored as an inverted
`tri -> sorted int[]` posting map plus the folded strings. Single shared
padded trigrams are noise (query `zzzqx` shares `  z` with `Zurich Kiosk`),
so non-prefix candidates need at least two shared trigrams to rank.

## Ranking

```
score = 2*prefixBonus + exactBonus + overlap/len + classWeight + popWeight
```

- `prefixBonus` = 1 when the folded name starts with the folded query.
- `overlap/len` = shared trigrams over query trigrams.
- `classWeight`: Poi 0.5, Street 0.3, Place 0.2.
- `popWeight`: packer-assigned Pop in [0, 0.5] (POI 0.3, place 0.2, street
  0.1, primary arterials +0.05).
- `exactBonus` = 1 on full-name equality. Deviation from the research
  formula, added after the gates caught `River` losing to `Riverside Cafe`
  (POI class+pop outweighed the overlap gap). An exact match must win its
  own query.

Ties break by folded name, then id: queries are pure functions of the
entries, replayed identically every run.

## Asset budget

v1 city pack: 38 named entries (23 streets, 12 POIs, 3 places),
`geocode.idx.json` 4.4 KB vs the 500 KB budget. Entries sort by (folded
name, lon, lat) before id assignment, so the bytes are deterministic.

## Gates

`GeocodeTests.cs`: 50+ curated queries (exact + lowercase + unique/ambiguous
prefix over the pack-faithful corpus), typo tolerance (`powel books`,
`libary`), diacritic probes, POI-beats-place ordering, empty/unknown
queries, top-K cap, JSON round-trip preserving ranking, determinism replay.
