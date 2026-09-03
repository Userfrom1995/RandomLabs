// Folio pack manifests + consent-gated loader (binding: sizes from real bundles).
export function parseManifest(json) {
  const m = typeof json === "string" ? JSON.parse(json) : json;
  for (const k of ["id", "version", "bytes", "files", "sha256"]) {
    if (m[k] === undefined) throw new Error("pack manifest missing " + k);
  }
  if (!Array.isArray(m.files) || !m.files.length) throw new Error("pack manifest files must be non-empty");
  return m;
}

export function formatBytes(n) {
  if (n < 1024) return n + " B";
  if (n < 1048576) return (n / 1024).toFixed(1) + " KB";
  return (n / 1048576).toFixed(1) + " MB";
}

// Consent state machine: idle -> downloading -> verifying -> ready | failed; declined is terminal w/ fallback.
export function consentReducer(state, event) {
  switch (state + ":" + event) {
    case "idle:accept":
      return "downloading";
    case "idle:decline":
      return "declined";
    case "downloading:progress":
      return "downloading";
    case "downloading:cancel":
      return "idle";
    case "downloading:done":
      return "verifying";
    case "downloading:fail":
      return "failed";
    case "verifying:ok":
      return "ready";
    case "verifying:fail":
      return "failed";
    case "failed:retry":
      return "downloading";
    case "failed:fallback":
      return "declined";
    case "declined:revoke-check":
      return "declined";
    case "ready:revoke":
      return "idle";
    default:
      return state;
  }
}
