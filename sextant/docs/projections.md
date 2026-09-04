# Sextant projections (S1)

Binding formulas: `progress/286-sextant-research.md` sections 2-3.
Implementation: `src/Sextant.Core/Projections.cs`, `src/Sextant.Core/Geo.cs`.
Goldens: `tests/Sextant.Core.Tests/ProjectionControlPoints.cs`.

## Web Mercator (EPSG:3857, spherical form) - default basemap

Forward (lat clamped to +-85.05112878, out-of-domain returns `Valid=false`):

```
x = R * lonRad
y = R * ln(tan(PI/4 + latRad/2))
```

Inverse:

```
lon = rad2deg(x / R)
lat = rad2deg(2 * atan(exp(y / R)) - PI/2)
```

Properties: conformal (local angles preserved, shapes look right zoomed in);
NOT equal-area and NOT equidistant. Area inflation factor = 1/cos^2(lat).
The sample map carries a scale-bar plus true-area readout (`Geo.SphericalAreaM2`,
Chamberlain spherical-excess sum) so users see the Greenland-vs-Africa distortion.

Golden provenance: constants frozen by evaluating the equations above at double
precision; they agree with PROJ `EPSG:3857` (same spherical series, no datum
shift) to under 1 mm. Tests pin NYC/Berlin at 1.0 m and the world edges
(`R*PI = 20037508.342789244`) at 0.01 m. Re-verify offline with
`cs2cs EPSG:4326 EPSG:3857` or pyproj; no network at test time.

## Albers Equal-Area Conic (spherical, Snyder 14-18) - honest-areas view

Defaults: CONUS USGS triplet phi1=29.5, phi2=45.5, phi0=23.0, lambda0=-96.0.
Constructor throws `ArgumentException` when n = (sin phi1 + sin phi2)/2 = 0.
Exactly equal-area on the sphere by construction; within ~0.1 percent of the
ellipsoidal form at country scale.

Verified properties (all in xUnit, seeded `Random(286)`):

- Origin (lambda0, phi0) maps to (0, 0).
- On-parallel scale k = n*rho/cos(phi) = 1 to 1e-12 on both standard parallels,
  plus a numeric easting-rate check to 1e-9 relative.
- 10k-point roundtrip fuzz, max error < 1e-9 deg in-domain.
- Equal-area: planar shoelace area of projected 1x1 deg cells matches the
  cos-weighted spherical area within 0.5 percent (measured ~2e-5).
- Pole guard: latitudes beyond +-89 return `Valid=false`; asin argument
  clamped to [-1, 1].

## Tile addressing

Tiles are Mercator-addressed only (OSM slippy convention, z 0..19, data bundled
to z14, overzoom beyond). The Albers view never re-tiles: it renders the same
WGS84 feature set through the Albers forward map with graticule + Tissot
ellipses. Control tiles: downtown Portland (-122.6765, 45.5152) z14 = (2608,
5860); NYC z10 = (301, 384).

## Precision notes

- All Core math in `double`; float only at the final Canvas vertex upload.
- `tan(PI/4)` is one ulp off 1.0 in doubles, so the Mercator origin-Y test
  asserts at precision 6, not 9.
