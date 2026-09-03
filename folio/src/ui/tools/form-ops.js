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
    } else if (kind === "dropdown" || kind === "list") field.select(coerceFillValue(kind, raw));
    else if (kind === "radio") field.select(coerceFillValue(kind, raw));
    else throw new Error("fill: unsupported field kind for " + JSON.stringify(name));
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
    if (v.value !== undefined) f.select(v.value);
    f.addToPage(page, at);
  } else if (v.type === "list") {
    const f = form.createOptionList(v.name);
    f.addOptions(v.options);
    if (v.value !== undefined) f.select(v.value);
    f.addToPage(page, at);
  } else if (v.type === "radio") {
    const f = form.createRadioGroup(v.name);
    const n = v.options.length;
    v.options.forEach((opt, i) => {
      const w = Math.min(v.rect.h, v.rect.w / Math.max(1, n));
      f.addOptionToPage(opt, page, { x: v.rect.x + i * (v.rect.w / n), y: v.rect.y, width: w, height: v.rect.h });
    });
    if (v.value !== undefined) f.select(v.value);
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
