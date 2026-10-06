// JS-backed ICanvasBridge: marshals LayerBatch DTOs to canvasInterop.js.
// Property names serialize camelCase via the default WebAssembly JSON options.

using Microsoft.JSInterop;

namespace Sextant.App.Services;

public sealed class JsCanvasBridge : ICanvasBridge
{
    public const string CanvasId = "sextant-map";

    private readonly IJSRuntime _js;

    public JsCanvasBridge(IJSRuntime js) => _js = js;

    public void DrawBatches(LayerBatch[] batches)
    {
        _ = _js.InvokeVoidAsync("sextantCanvas.drawBatches", CanvasId, (object)batches);
    }

    public void DrawOverlays(OverlayBatch overlays)
    {
        _ = _js.InvokeVoidAsync("sextantCanvas.drawOverlays", CanvasId, (object)overlays);
    }

    public void Clear()
    {
        _ = _js.InvokeVoidAsync("sextantCanvas.clear", CanvasId);
    }

    public void Resize(int width, int height, double dpr)
    {
        _ = _js.InvokeVoidAsync("sextantCanvas.resize", CanvasId, width, height, dpr);
    }
}
