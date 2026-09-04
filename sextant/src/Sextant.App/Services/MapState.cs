// Phase-0 view state: single source of truth for center/fractional-zoom/
// projection/layers. Projected-vertex cache keyed by (tile, projection id)
// and the pack loader arrive in later phases.

namespace Sextant.App.Services;

public sealed class MapState
{
    public double CenterLon { get; set; } = -122.6765; // Portland downtown
    public double CenterLat { get; set; } = 45.5152;
    public double ZoomFloat { get; set; } = 13.0;
    public string ProjectionId { get; set; } = "mercator";
    public bool RoadsVisible { get; set; } = true;
    public bool BuildingsVisible { get; set; } = true;
    public bool WaterVisible { get; set; } = true;
}
