// Folio form executors: fill AcroForm (F1), create fields (F2-tier2 bonus),
// flatten (F3), XFA legacy banner (F4-tier3 detector). Write path: pdf-lib.
import { validateFieldDef, coerceFillValue, xfaDetect } from "../../core/forms/forms.js";

function fieldKind(doc, PDFLib, field) {
  if (field instanceof PDFLib.PDFTextField) return "text";
  if (field instanceof PDFLib.PDFCheckBox) return "checkbox";
  if (field instanceof PDFLib.PDFDropdown) return "dropdown";
  if (field instanceof PDFLib.PDFRadioGroup) return "radio";
  if (field instanceof PDFLib.PDFOptionList) return "list";
  void doc;
  return "unknown";
}

export function describeForm(bytes, PDFLib) {
  return PDFLib.PDFDocument.load(bytes).then((doc) => {
    const form = doc.getForm();
    return form.getFields().map((f) => ({ name: f.getName(), kind: fieldKind(doc, PDFLib, f) }));
  });
}

// M4c form overlay: full field geometry for positioned HTML inputs.
// Returns [{name, kind, page (1-based, null when unresolvable), rect
// {x,y,w,h} in PDF points (null when the widget carries no Rect),
// options[], value}]. Never throws per-field: unresolvable geometry
// yields nulls so the shell can fall back to the generated field list.
export async function describeFields(bytes, PDFLib) {
  const doc = await PDFLib.PDFDocument.load(bytes);
  const form = doc.getForm();
  const pages = doc.getPages();
  const q = (n) => Math.round(Number(n) * 10) / 10;
  return form.getFields().map((f) => {
    const kind = fieldKind(doc, PDFLib, f);
    let rect = null;
    let page = null;
    try {
      const widgets = f.acroField.getWidgets() || [];
      const w = widgets[0];
      if (w) {
        try {
          const r = w.getRectangle();
          if (r && Number.isFinite(r.x) && Number.isFinite(r.width)) {
            rect = { x: q(r.x), y: q(r.y), w: q(r.width), h: q(r.height) };
          }
        } catch { /* widget without a usable Rect: list fallback */ }
        try {
          const pref = w.P ? w.P() : null;
          if (pref) {
            const idx = pages.findIndex((pg) => String(pg.ref) === String(pref));
            if (idx >= 0) page = idx + 1;
          }
        } catch { /* page unresolvable: list fallback */ }
      }
    } catch { /* no widgets: list fallback */ }
    let options = [];
    let value = null;
    try {
      if (kind === "text") value = f.getText();
      else if (kind === "checkbox") value = f.isChecked();
      else if (kind === "dropdown" || kind === "list" || kind === "radio") {
        try {
          options = f.getOptions() || [];
        } catch { options = []; }
        try {
          value = f.getSelected();
        } catch { value = null; }
      }
    } catch { /* unreadable value: input renders empty */ }
    return { name: f.getName(), kind, page, rect, options, value };
  });
}

export async function fillForm(bytes, values, PDFLib) {
  const doc = await PDFLib.PDFDocument.load(bytes);
  const form = doc.getForm();
  let filled = 0;
  for (const [name, raw] of Object.entries(values || {})) {
    let field = null;
    try {
      field = form.getField(name);
    } catch {
      throw new Error("fill: no field named " + JSON.stringify(name));
    }
    const kind = fieldKind(doc, PDFLib, field);
    if (kind === "text") field.setText(coerceFillValue("text", raw));
    else if (kind === "checkbox") {
      if (coerceFillValue("checkbox", raw)) field.check();
      else field.uncheck();
    } else if (kind === "dropdown" || kind === "list" || kind === "radio") {
      // pdf-lib select() records unknown options silently, which would
      // report success while viewers render a broken field. Validate first.
      const want = coerceFillValue(kind, raw);
      const options = field.getOptions();
      if (!options.includes(want)) {
        throw new Error("fill: " + JSON.stringify(name) + " has no option " + JSON.stringify(want) + " (options: " + options.join(", ") + ")");
      }
      field.select(want);
    } else throw new Error("fill: unsupported field kind for " + JSON.stringify(name));
    filled++;
  }
  form.updateFieldAppearances();
  return { bytes: await doc.save(), filled };
}

export async function createField(bytes, def, PDFLib) {
  const doc = await PDFLib.PDFDocument.load(bytes);
  const v = validateFieldDef(def, doc.getPageCount());
  const form = doc.getForm();
  const page = doc.getPages()[v.page - 1];
  const at = { x: v.rect.x, y: v.rect.y, width: v.rect.w, height: v.rect.h };
  if (v.type === "text") {
    const f = form.createTextField(v.name);
    if (v.value !== undefined) f.setText(v.value);
    f.addToPage(page, at);
  } else if (v.type === "checkbox") {
    const f = form.createCheckBox(v.name);
    f.addToPage(page, at);
    if (v.value !== undefined && coerceFillValue("checkbox", v.value)) f.check();
  } else if (v.type === "dropdown") {
    const f = form.createDropdown(v.name);
    f.addOptions(v.options);
    if (v.value !== undefined) {
      if (!v.options.includes(v.value)) throw new Error("field: value " + JSON.stringify(v.value) + " not in options for " + JSON.stringify(v.name));
      f.select(v.value);
    }
    f.addToPage(page, at);
  } else if (v.type === "list") {
    const f = form.createOptionList(v.name);
    f.addOptions(v.options);
    if (v.value !== undefined) {
      if (!v.options.includes(v.value)) throw new Error("field: value " + JSON.stringify(v.value) + " not in options for " + JSON.stringify(v.name));
      f.select(v.value);
    }
    f.addToPage(page, at);
  } else if (v.type === "radio") {
    const f = form.createRadioGroup(v.name);
    const n = v.options.length;
    v.options.forEach((opt, i) => {
      const w = Math.min(v.rect.h, v.rect.w / Math.max(1, n));
      f.addOptionToPage(opt, page, { x: v.rect.x + i * (v.rect.w / n), y: v.rect.y, width: w, height: v.rect.h });
    });
    if (v.value !== undefined) {
      if (!v.options.includes(v.value)) throw new Error("field: value " + JSON.stringify(v.value) + " not in options for " + JSON.stringify(v.name));
      f.select(v.value);
    }
  }
  form.updateFieldAppearances();
  return doc.save();
}

export async function flattenForm(bytes, PDFLib) {
  const doc = await PDFLib.PDFDocument.load(bytes);
  doc.getForm().flatten();
  return doc.save();
}

export function xfaBanner(bytes) {
  const dec = new TextDecoder("latin1");
  const head = dec.decode(bytes.slice(0, Math.min(bytes.length, 200000)));
  const isXfa = xfaDetect(head) || xfaDetect(dec.decode(bytes.slice(-50000)));
  return isXfa
    ? "Legacy XFA form detected: fill is not feasible client-side. Flatten or print-to-PDF first, then fill here."
    : "";
}
