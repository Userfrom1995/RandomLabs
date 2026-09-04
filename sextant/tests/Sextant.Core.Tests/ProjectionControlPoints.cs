// Binding golden control points for S1 projections (research 3.3, architect test matrix).
// Frozen by evaluating the spherical Mercator equations at double precision
// (x = R*lonRad, y = R*ln(tan(PI/4 + latRad/2)), R = 6378137.0).
// These agree with PROJ EPSG:3857 (spherical series, no datum shift) to well
// under 1 mm; the xUnit assertions below pin them at 1.0 m (cities) and
// 0.01 m (world edges) so any geodetic drift fails loudly.
// Cross-check command: cs2cs EPSG:4326 EPSG:3857, or pyproj Transformer("EPSG:4326","EPSG:3857").

namespace Sextant.Core.Tests;

public static class ProjectionControlPoints
{
    public const double R = 6378137.0;

    // World half-extent: R * PI, the y of (0, 85.05112878) and x of (180, 0).
    public const double WorldEdge = 20037508.342789244;

    // NYC (-73.9857, 40.7484): spherical forward.
    public const double NycX = -8236050.45;
    public const double NycY = 4975301.25;

    // Berlin (13.4050, 52.5200): spherical forward.
    public const double BerlinX = 1492237.77;
    public const double BerlinY = 6894699.80;

    // North edge (0, 85.05112878) -> (0, WorldEdge); east edge (180, 0) -> (WorldEdge, 0).
    public const double NorthEdgeLat = 85.05112878;

    // Albers CONUS USGS triplet (research 3.2): origin maps to (0, 0).
    public const double AlbersPhi1 = 29.5;
    public const double AlbersPhi2 = 45.5;
    public const double AlbersPhi0 = 23.0;
    public const double AlbersLambda0 = -96.0;
}
