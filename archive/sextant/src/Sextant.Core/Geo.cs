// Sextant.Core - dependency-free headless GIS core (net8.0, zero JS/Blazor/browser APIs).
// All math in double; float only at the final Canvas vertex upload (App layer).

namespace Sextant.Core;

/// <summary>WGS84 longitude/latitude point, degrees. Lon in [-180,180], Lat in [-90,90].</summary>
public readonly record struct GeoPoint(double Lon, double Lat);

/// <summary>Geodetic constants and pure helpers. No wall-clock, no RNG here.</summary>
public static class Geo
{
    /// <summary>WGS84 semi-major axis, meters.</summary>
    public const double A = 6378137.0;

    /// <summary>WGS84 flattening.</summary>
    public const double F = 1.0 / 298.257223563;

    /// <summary>WGS84 semi-minor axis, meters.</summary>
    public static readonly double B = A * (1.0 - F);

    /// <summary>First eccentricity squared.</summary>
    public static readonly double E2 = 2.0 * F - F * F;

    /// <summary>Spherical authalic radius used by Web Mercator (EPSG:3857 spherical form).</summary>
    public const double R = 6378137.0;

    /// <summary>Web Mercator valid latitude clamp (atol that keeps y finite and square).</summary>
    public const double MaxMercatorLat = 85.05112878;

    public static double Deg2Rad(double deg) => deg * (Math.PI / 180.0);

    public static double Rad2Deg(double rad) => rad * (180.0 / Math.PI);

    public static double Clamp(double v, double lo, double hi) =>
        v < lo ? lo : (v > hi ? hi : v);

    public static double ClampLon(double lon) => Clamp(lon, -180.0, 180.0);

    public static double ClampLat(double lat) => Clamp(lat, -90.0, 90.0);

    /// <summary>Great-circle distance in meters (haversine, spherical R).</summary>
    public static double HaversineM(GeoPoint a, GeoPoint b)
    {
        double dLat = Deg2Rad(b.Lat - a.Lat);
        double dLon = Deg2Rad(b.Lon - a.Lon);
        double sLat = Math.Sin(dLat / 2.0);
        double sLon = Math.Sin(dLon / 2.0);
        double h = sLat * sLat + Math.Cos(Deg2Rad(a.Lat)) * Math.Cos(Deg2Rad(b.Lat)) * sLon * sLon;
        return 2.0 * R * Math.Asin(Math.Min(1.0, Math.Sqrt(h)));
    }

    /// <summary>
    /// Approximate geodesic area of a lon/lat ring in square meters, via the
    /// Chamberlain-style spherical-excess sum (sufficient for the distortion readout).
    /// Ring must have at least 3 points; not required to repeat the first point.
    /// </summary>
    public static double SphericalAreaM2(IReadOnlyList<GeoPoint> ring)
    {
        if (ring is null) throw new ArgumentNullException(nameof(ring));
        int n = ring.Count;
        if (n < 3) return 0.0;
        double total = 0.0;
        for (int i = 0; i < n; i++)
        {
            GeoPoint p1 = ring[i];
            GeoPoint p2 = ring[(i + 1) % n];
            total += Deg2Rad(p2.Lon - p1.Lon) * (2.0 + Math.Sin(Deg2Rad(p1.Lat)) + Math.Sin(Deg2Rad(p2.Lat)));
        }
        return Math.Abs(total * R * R / 2.0);
    }
}
