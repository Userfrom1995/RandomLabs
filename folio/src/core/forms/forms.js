// Folio forms core: pure field-def validation + flatten/XFA decisions.
// Executor (pdf-lib form API) lives in ui/tools/form-ops.js.

// Sniff XFA: static XFA XML inside the AcroForm dict marks legacy forms.
export function xfaDetect(pdfLatin1Text) {
  return /\/XFA\b/.test(String(pdfLatin1Text || ""));
}

const FIELD_TYPES = ["text", "checkbox", "dropdown", "radio", "list"];

// def: {name, type, page (1-based), rect {x,y,w,h}, options?, value?}
export function validateFieldDef(def, pageCount) {
  if (!def || typeof def !== "object") throw new Error("field: need a definition object");
  if (!def.name || !String(def.name).trim()) throw new Error("field: name is required");
  if (!FIELD_TYPES.includes(def.type)) throw new Error("field: type must be " + FIELD_TYPES.join("/"));
  const p = Number(def.page);
  if (!Number.isInteger(p) || p < 1 || p > pageCount) throw new Error("field: page out of range 1.." + pageCount);
  const r = def.rect || {};
  for (const k of ["x", "y", "w", "h"]) {
    if (!Number.isFinite(Number(r[k]))) throw new Error("field: rect." + k + " must be a number");
  }
  if (Number(r.w) <= 0 || Number(r.h) <= 0) throw new Error("field: rect must have positive size");
  if ((def.type === "dropdown" || def.type === "radio" || def.type === "list") && !(def.options || []).length) {
    throw new Error("field: " + def.type + " needs options[]");
  }
  if ((def.type === "dropdown" || def.type === "radio" || def.type === "list") && def.value !== undefined) {
    const opts = (def.options || []).map((o) => String(o));
    if (!opts.includes(String(def.value))) {
      throw new Error("field: value " + JSON.stringify(String(def.value)) + " not in options for " + JSON.stringify(String(def.name)));
    }
  }
  return {
    name: String(def.name).slice(0, 120),
    type: def.type,
    page: p,
    rect: { x: Number(r.x), y: Number(r.y), w: Number(r.w), h: Number(r.h) },
    options: (def.options || []).map((o) => String(o).slice(0, 200)),
    value: def.value === undefined ? undefined : String(def.value),
  };
}

// Fill-value coercion per field kind; throws on type mismatch.
export function coerceFillValue(kind, value) {
  if (kind === "checkbox") {
    if (typeof value === "boolean") return value;
    if (value === "on" || value === "yes" || value === "true" || value === 1) return true;
    if (value === "off" || value === "no" || value === "false" || value === 0) return false;
    throw new Error("fill: checkbox needs a boolean-ish value");
  }
  if (kind === "text") return String(value === undefined ? "" : value).slice(0, 4000);
  return String(value === undefined ? "" : value).slice(0, 500);
}
