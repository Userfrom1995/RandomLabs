// S1 projections: Web Mercator (EPSG:3857 spherical, Snyder) + spherical Albers
// Equal-Area Conic (Snyder 14-18) with CONUS USGS default triplet.
// Forward never throws on out-of-domain points: returns Valid=false instead.

namespace Sextant.Core;

/// <summary>Projected meters plus domain-validity flag.</summary>
public readonly record struct ProjectionResult(double X, double Y, bool Valid);

/// <summary>Pure forward/inverse projection contract.</summary>
public interface IProjection
{
    string Id { get; }
    string Name { get; }
    ProjectionResult Forward(double lonDeg, double latDeg);
    (double Lon, double Lat, bool Valid) Inverse(double x, double y);
}

/// <summary>
/// Web Mercator, spherical form (what OSM/Google/Bing use).
/// Conformal; NOT equal-area. Area inflation factor = 1/cos^2(lat).
/// </summary>
public sealed class WebMercatorProjection : IProjection
{
    public string Id => "mercator";
    public string Name => "Web Mercator (EPSG:3857 spherical)";

    public static double LatClamp => Geo.MaxMercatorLat;

    public ProjectionResult Forward(double lonDeg, double latDeg)
    {
        if (double.IsNaN(lonDeg) || double.IsNaN(latDeg) ||
            double.IsInfinity(lonDeg) || double.IsInfinity(latDeg))
            return new ProjectionResult(double.NaN, double.NaN, false);
        if (latDeg < -Geo.MaxMercatorLat || latDeg > Geo.MaxMercatorLat)
            return new ProjectionResult(double.NaN, double.NaN, false);
        double lonRad = Geo.Deg2Rad(Geo.ClampLon(lonDeg));
        double latRad = Geo.Deg2Rad(latDeg);
        double x = Geo.R * lonRad;
        double y = Geo.R * Math.Log(Math.Tan(Math.PI / 4.0 + latRad / 2.0));
        return new ProjectionResult(x, y, true);
    }

    public (double Lon, double Lat, bool Valid) Inverse(double x, double y)
    {
        if (double.IsNaN(x) || double.IsNaN(y) ||
            double.IsInfinity(x) || double.IsInfinity(y))
            return (double.NaN, double.NaN, false);
        double lonDeg = Geo.Rad2Deg(x / Geo.R);
        double latDeg = Geo.Rad2Deg(2.0 * Math.Atan(Math.Exp(y / Geo.R)) - Math.PI / 2.0);
        if (lonDeg < -180.0 || lonDeg > 180.0 || latDeg < -90.0 || latDeg > 90.0)
            return (lonDeg, latDeg, false);
        return (lonDeg, latDeg, true);
    }
}

/// <summary>
/// Spherical Albers Equal-Area Conic (Snyder 14-18). Exactly equal-area on the
/// sphere by construction; max ~0.1 percent deviation vs ellipsoidal at country
/// scale, which is what the area-preservation test asserts.
/// Defaults: CONUS USGS triplet phi1=29.5, phi2=45.5, phi0=23, lambda0=-96.
/// </summary>
public sealed class AlbersProjection : IProjection
{
    public string Id => "albers";
    public string Name => "Albers Equal-Area Conic (spherical)";

    public double Phi1Deg { get; }
    public double Phi2Deg { get; }
    public double Phi0Deg { get; }
    public double Lambda0Deg { get; }

    private readonly double _n;
    private readonly double _c;
    private readonly double _rho0;

    public AlbersProjection(
        double phi1Deg = 29.5, double phi2Deg = 45.5,
        double phi0Deg = 23.0, double lambda0Deg = -96.0)
    {
        double phi1 = Geo.Deg2Rad(phi1Deg);
        double phi2 = Geo.Deg2Rad(phi2Deg);
        double phi0 = Geo.Deg2Rad(phi0Deg);
        double n = (Math.Sin(phi1) + Math.Sin(phi2)) / 2.0;
        if (n == 0.0)
            throw new ArgumentException("Albers standard parallels must satisfy phi1 != -phi2 (n != 0).", nameof(phi1Deg));
        double c = Math.Cos(phi1) * Math.Cos(phi1) + 2.0 * n * Math.Sin(phi1);
        double rho0 = Math.Sqrt(Math.Max(0.0, c - 2.0 * n * Math.Sin(phi0))) / n;
        Phi1Deg = phi1Deg;
        Phi2Deg = phi2Deg;
        Phi0Deg = phi0Deg;
        Lambda0Deg = lambda0Deg;
        _n = n;
        _c = c;
        _rho0 = rho0;
    }

    public ProjectionResult Forward(double lonDeg, double latDeg)
    {
        if (double.IsNaN(lonDeg) || double.IsNaN(latDeg) ||
            double.IsInfinity(lonDeg) || double.IsInfinity(latDeg))
            return new ProjectionResult(double.NaN, double.NaN, false);
        if (latDeg < -89.0 || latDeg > 89.0)
            return new ProjectionResult(double.NaN, double.NaN, false);
        double phi = Geo.Deg2Rad(latDeg);
        double lambda = Geo.Deg2Rad(lonDeg);
        double lambda0 = Geo.Deg2Rad(Lambda0Deg);
        double inner = _c - 2.0 * _n * Math.Sin(phi);
        if (inner < 0.0)
            return new ProjectionResult(double.NaN, double.NaN, false);
        double rho = Math.Sqrt(inner) / _n;
        double theta = _n * (lambda - lambda0);
        double x = Geo.R * rho * Math.Sin(theta);
        double y = Geo.R * (_rho0 - rho * Math.Cos(theta));
        return new ProjectionResult(x, y, true);
    }

    public (double Lon, double Lat, bool Valid) Inverse(double x, double y)
    {
        if (double.IsNaN(x) || double.IsNaN(y) ||
            double.IsInfinity(x) || double.IsInfinity(y))
            return (double.NaN, double.NaN, false);
        double xn = x / Geo.R;
        double yn = y / Geo.R;
        double rho = Math.Sqrt(xn * xn + (_rho0 - yn) * (_rho0 - yn));
        if (_n < 0.0) rho = -rho;
        if (rho == 0.0)
            return (Lambda0Deg, 90.0 * Math.Sign(_n), true);
        double theta = Math.Atan2(xn, _rho0 - yn);
        double lambda = Geo.Deg2Rad(Lambda0Deg) + theta / _n;
        double arg = (_c - rho * rho * _n * _n) / (2.0 * _n);
        arg = Geo.Clamp(arg, -1.0, 1.0);
        double phi = Math.Asin(arg);
        return (Geo.Rad2Deg(lambda), Geo.Rad2Deg(phi), true);
    }
}

/// <summary>
/// Pure point re-projection between two projections. App keeps WGS84 source of
/// truth and caches projected vertices per projection id (one LRU generation).
/// <see cref="Reprojector.ReprojectTo"/> carries whole tile inputs across.
/// </summary>
public static class Reprojector
{
    /// <summary>Project a WGS84 lon/lat point into the destination projection.</summary>
    public static ProjectionResult FromWgs84(double lonDeg, double latDeg, IProjection dst)
    {
        ArgumentNullException.ThrowIfNull(dst);
        return dst.Forward(lonDeg, latDeg);
    }

    /// <summary>Move a projected point from one projection to another via WGS84.</summary>
    public static ProjectionResult Between(double x, double y, IProjection src, IProjection dst)
    {
        ArgumentNullException.ThrowIfNull(src);
        ArgumentNullException.ThrowIfNull(dst);
        var inv = src.Inverse(x, y);
        if (!inv.Valid) return new ProjectionResult(double.NaN, double.NaN, false);
        return dst.Forward(inv.Lon, inv.Lat);
    }

    /// <summary>
    /// Re-project a WGS84 tile input into the destination projection (the
    /// Phase 5 Albers view path: WGS84 stays the source of truth, projected
    /// vertices are per-projection cache generations). Points that fall
    /// outside the destination domain are dropped; a feature left with no
    /// valid geometry returns null.
    /// </summary>
    public static TileInput? ReprojectTo(TileInput input, IProjection dst)
    {
        ArgumentNullException.ThrowIfNull(input);
        ArgumentNullException.ThrowIfNull(dst);
        return input switch
        {
            PointInput pt => ProjectPoint(pt, pt.Point, dst) is { } q
                ? new PointInput(pt.Layer, q) : null,
            PolylineInput pl => ProjectLine(pl, pl.Points, dst) is { } q && q.Count >= 2
                ? new PolylineInput(pl.Layer, q) : null,
            PolygonInput pg => ProjectPolygon(pg, dst) is { } q && q.Count > 0
                ? new PolygonInput(pg.Layer, q) : null,
            _ => throw new ArgumentOutOfRangeException(nameof(input)),
        };
    }

    private static GeoPoint? ProjectPoint(TileInput input, GeoPoint p, IProjection dst)
    {
        _ = input;
        var r = dst.Forward(p.Lon, p.Lat);
        // Projected meters ride in the GeoPoint fields so the tile pipeline
        // shape stays uniform; the caller renders them as planar meters.
        return r.Valid ? new GeoPoint(r.X, r.Y) : null;
    }

    private static List<GeoPoint>? ProjectLine(TileInput input, IReadOnlyList<GeoPoint> line, IProjection dst)
    {
        var output = new List<GeoPoint>(line.Count);
        foreach (var p in line)
            if (ProjectPoint(input, p, dst) is { } q)
                output.Add(q);
        return output;
    }

    private static List<IReadOnlyList<GeoPoint>>? ProjectPolygon(PolygonInput pg, IProjection dst)
    {
        var rings = new List<IReadOnlyList<GeoPoint>>(pg.Rings.Count);
        foreach (var ring in pg.Rings)
        {
            var projected = ProjectLine(pg, ring, dst);
            if (projected is not null && projected.Count >= 3)
                rings.Add(projected);
        }
        return rings;
    }
}
