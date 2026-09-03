// Folio workspace storage: OPFS when available, in-memory fallback otherwise.
// Layout: /folio/work/<jobId>/{input/<name>, session.pdf, output/<name>, tmp/*}
const mem = new Map();
let useOpfs = false;
let rootHandle = null;

export async function initStorage() {
  try {
    if (typeof navigator !== "undefined" && navigator.storage && navigator.storage.getDirectory) {
      rootHandle = await navigator.storage.getDirectory();
      useOpfs = true;
    }
  } catch {
    useOpfs = false;
  }
  return { backend: useOpfs ? "opfs" : "memory" };
}

export function backend() {
  return useOpfs ? "opfs" : "memory";
}

async function dir(path, create) {
  let h = rootHandle;
  for (const part of path.split("/").filter(Boolean)) h = await h.getDirectoryHandle(part, { create: !!create });
  return h;
}

export async function writeFile(path, bytes) {
  if (!useOpfs) {
    mem.set(path, bytes.slice ? bytes.slice(0) : bytes);
    return { path, backend: "memory", bytes: bytes.length };
  }
  const i = path.lastIndexOf("/");
  const d = await dir(path.slice(0, i), true);
  const fh = await d.getFileHandle(path.slice(i + 1), { create: true });
  const w = await fh.createWritable();
  await w.write(bytes);
  await w.close();
  return { path, backend: "opfs", bytes: bytes.length };
}

export async function readFile(path) {
  if (!useOpfs) {
    const b = mem.get(path);
    if (!b) throw new Error("not found: " + path);
    return b;
  }
  const i = path.lastIndexOf("/");
  const d = await dir(path.slice(0, i), false);
  const fh = await d.getFileHandle(path.slice(i + 1));
  const f = await fh.getFile();
  return new Uint8Array(await f.arrayBuffer());
}

export async function listFiles(prefix) {
  if (!useOpfs) return [...mem.keys()].filter((k) => k.startsWith(prefix));
  try {
    const d = await dir(prefix, false);
    const out = [];
    for await (const [name] of d.entries()) out.push(prefix.replace(/\/$/, "") + "/" + name);
    return out;
  } catch {
    return [];
  }
}

export function jobPaths(jobId) {
  const base = "folio/work/" + jobId;
  return {
    input: (name) => base + "/input/" + name,
    session: () => base + "/session.pdf",
    output: (name) => base + "/output/" + name,
    tmp: (name) => base + "/tmp/" + name,
  };
}
