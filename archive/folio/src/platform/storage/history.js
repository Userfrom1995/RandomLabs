// Folio job history: IndexedDB when available, memory fallback.
// Never stores file bytes, passwords, or redacted text (params summaries only).
const memLog = [];
let dbp = null;

function openDb() {
  if (dbp || typeof indexedDB === "undefined") return dbp;
  dbp = new Promise((resolve) => {
    try {
      const req = indexedDB.open("folio-history", 1);
      req.onupgradeneeded = () => {
        req.result.createObjectStore("jobs", { keyPath: "jobId" });
        req.result.createObjectStore("prefs", { keyPath: "key" });
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
  return dbp;
}

export async function logJob(entry) {
  const rec = { ...entry, at: Date.now() };
  delete rec.bytes;
  delete rec.password;
  const db = await openDb();
  if (!db) {
    memLog.push(rec);
    return rec;
  }
  await new Promise((resolve) => {
    const tx = db.transaction("jobs", "readwrite");
    tx.objectStore("jobs").put(rec);
    tx.oncomplete = resolve;
    tx.onerror = resolve;
  });
  return rec;
}

export async function listJobs() {
  const db = await openDb();
  if (!db) return [...memLog].reverse();
  return new Promise((resolve) => {
    const out = [];
    const tx = db.transaction("jobs", "readonly");
    tx.objectStore("jobs").openCursor(null, "prev").onsuccess = (e) => {
      const c = e.target.result;
      if (c) {
        out.push(c.value);
        c.continue();
      } else resolve(out);
    };
  });
}

export async function setPref(key, value) {
  const db = await openDb();
  if (!db) return;
  await new Promise((resolve) => {
    const tx = db.transaction("prefs", "readwrite");
    tx.objectStore("prefs").put({ key, value });
    tx.oncomplete = resolve;
    tx.onerror = resolve;
  });
}

export async function getPref(key, fallback) {
  const db = await openDb();
  if (!db) return fallback;
  return new Promise((resolve) => {
    const tx = db.transaction("prefs", "readonly");
    const req = tx.objectStore("prefs").get(key);
    req.onsuccess = () => resolve(req.result ? req.result.value : fallback);
    req.onerror = () => resolve(fallback);
  });
}
