// Sextant download helper: Blob-based file save for GeoJSON exports.
// No map state, no math; called from Map.razor via IJSRuntime only.
window.sextantDownload = {
  save(name, content) {
    const blob = new Blob([content], { type: "application/geo+json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  }
};
