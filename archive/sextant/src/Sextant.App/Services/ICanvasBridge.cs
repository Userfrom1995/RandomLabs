// Bridge seam: ALL JS interop goes through ICanvasBridge so headless tests can
// substitute NullCanvasBridge. Chunky typed-array batches per layer; no style
// logic, no math, no state in JS (see wwwroot/js/canvasInterop.js).

namespace Sextant.App.Services;

/// <summary>One drawable layer batch: flat XY vertex buffer plus draw kind.</summary>
public sealed record LayerBatch(
    string Layer,
    float[] Vertices,
    string Kind,
    string Stroke,
    string Fill,
    float LineWidth);

/// <summary>Transient overlays: route line, frontier dots, isochrone fill.</summary>
public sealed record OverlayBatch(
    float[]? RouteLine,
    float[]? FrontierDots,
    float[]? IsochroneFill);

public interface ICanvasBridge
{
    void DrawBatches(LayerBatch[] batches);
    void DrawOverlays(OverlayBatch overlays);
    void Clear();
    void Resize(int width, int height, double dpr);
}

/// <summary>Headless/test recorder: captures calls without any JS runtime.</summary>
public sealed class NullCanvasBridge : ICanvasBridge
{
    public List<LayerBatch[]> Batches { get; } = new();
    public List<OverlayBatch> Overlays { get; } = new();
    public int Clears { get; private set; }
    public (int W, int H, double Dpr) LastSize { get; private set; }

    public void DrawBatches(LayerBatch[] batches) => Batches.Add(batches);
    public void DrawOverlays(OverlayBatch overlays) => Overlays.Add(overlays);
    public void Clear() => Clears++;
    public void Resize(int width, int height, double dpr) => LastSize = (width, height, dpr);
}
