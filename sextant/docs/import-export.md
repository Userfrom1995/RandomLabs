# Sextant GeoJSON import/export (S5)

`GeoJson.cs` is the single C# codec for both directions. The App import path
(drag-drop, Phase 5b) parses uploads through `GeoJson.Parse` and inserts the
resulting `TileInput`s into the live R-tree; route/isochrone downloads emit
through `GeoJson.EmitFeatureCollection` (isochrone geometries wrap via
`Isochrone.ToGeoJson` first).

## Parse

Accepts Feature and FeatureCollection documents with Point, LineString,
Polygon, and MultiPolygon geometries (MultiPolygon splits into one feature
per polygon, sharing properties). Lenient where round-trips demand it:

- extra ordinates ignored (elevation tolerated),
- unclosed rings auto-closed,
- `properties.name` / `properties.class` passed through (missing class
  defaults the layer to `import`).

Strict everywhere else: every malformed input throws `FormatException`
naming the failure (not-JSON, wrong root type, missing geometry, null
geometry, missing coordinates, unsupported `MultiPoint`/`MultiLineString`/
`GeometryCollection`, short positions, empty rings). `NaN`/`Infinity`
ordinates rejected as non-finite.

## Emit

RFC 7946 FeatureCollection: outer rings counter-clockwise, holes clockwise
(right-hand rule enforced regardless of input winding), explicit ring
closure, F7 coordinates (~1 cm), one line per feature, `\n` terminated, so
emitted collections re-parse through `NdjsonReader` for pack round-trips.
Degenerate geometry (1-point lines, ringless polygons) throws
`ArgumentException` instead of emitting invalid GeoJSON.

## Scope notes

- Dateline-crossing polygons carry through as-is (v1 city pack never
  crosses; splitting is a documented v2 deferral).
- Isochrone export schema is validated end to end: `ToGeoJson` output wraps
  as a Feature and re-parses to closed, CCW-outer polygons
  (`ImportExportTests.IsochroneExport_ParsesAsValidPolygons`).

## Gates

`ImportExportTests.cs`: mixed-collection parse, emit/parse stability,
winding normalize (CW outer + CCW hole in, CCW outer + CW hole out),
MultiPolygon split, open-ring closure, 12-case malformed-input enumeration,
emit-side validation, isochrone schema validation.
