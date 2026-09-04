// S2 addressing: slippy-map tile math (OSM convention). Tiles are
// Mercator-addressed only; the Albers view (P2) never re-tiles (research 3.2).

namespace Sextant.Core;

/// <summary>Slippy tile id. Z in [0,19]; data bundled to z14, overzoom beyond.</summary>
public readonly record struct TileId(int Z, int X, int Y);

/// <summary>Tile bounds in both WGS84 degrees and Mercator meters.</summary>
public readonly record struct TileBounds(
    double West, double South, double East, double North,
    double MinX, double MinY, double MaxX, double MaxY);

public static class TileMath
{
    public const int MinZ = 0;
    public const int MaxZ = 19;
    public const int DataMaxZ = 14;

    public static TileId LonLatToTile(double lonDeg, double latDeg, int z)
    {
        if (z < MinZ || z > MaxZ)
            throw new ArgumentOutOfRangeException(nameof(z), "Zoom must be in [0,19].");
        double latClamped = Geo.Clamp(latDeg, -Geo.MaxMercatorLat, Geo.MaxMercatorLat);
        double lon = Geo.ClampLon(lonDeg);
        double n = Math.Pow(2.0, z);
        int x = (int)Math.Floor((lon + 180.0) / 360.0 * n);
        double latRad = Geo.Deg2Rad(latClamped);
        int y = (int)Math.Floor((1.0 - Math.Log(Math.Tan(latRad) + 1.0 / Math.Cos(latRad)) / Math.PI) / 2.0 * n);
        int max = (int)n - 1;
        return new TileId(z, Math.Min(Math.Max(x, 0), max), Math.Min(Math.Max(y, 0), max));
    }

    public static TileBounds Bounds(int z, int x, int y)
    {
        double n = Math.Pow(2.0, z);
        if (z < MinZ || z > MaxZ)
            throw new ArgumentOutOfRangeException(nameof(z), "Zoom must be in [0,19].");
        if (x < 0 || x >= (int)n || y < 0 || y >= (int)n)
            throw new ArgumentOutOfRangeException(nameof(x), "Tile x/y out of range for zoom.");
        double west = x / n * 360.0 - 180.0;
        double east = (x + 1) / n * 360.0 - 180.0;
        double north = Geo.Rad2Deg(Math.Atan(Math.Sinh(Math.PI * (1.0 - 2.0 * y / n))));
        double south = Geo.Rad2Deg(Math.Atan(Math.Sinh(Math.PI * (1.0 - 2.0 * (y + 1) / n))));
        var merc = new WebMercatorProjection();
        var sw = merc.Forward(west, south);
        var ne = merc.Forward(east, north);
        return new TileBounds(west, south, east, north, sw.X, sw.Y, ne.X, ne.Y);
    }

    /// <summary>Overzoom scale for fractional zoom rendering: 2^(zFloat - zInt).</summary>
    public static double OverzoomScale(double zFloat, int zInt) => Math.Pow(2.0, zFloat - zInt);

    /// <summary>Data zoom for a view zoom: clamped to bundled data, overzoom beyond.</summary>
    public static int DataZoom(double zFloat) =>
        Math.Min(DataMaxZ, Math.Max(MinZ, (int)Math.Floor(zFloat)));
}
