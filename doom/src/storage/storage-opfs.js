// OPFS provider (research spec 6.1): primary tier. Atomic writes emulate
// rename (write path.tmp, flush, close, copy to path, delete tmp) since
// cross-browser rename is unreliable. Main-thread path uses createWritable
// with mandatory close() to commit. Node-safe: available:false without
// navigator.storage.getDirectory.
async function rootDir() {
  if (typeof navigator === 'undefined' || !navigator.storage || typeof navigator.storage.getDirectory !== 'function') {
    return null;
  }
  return navigator.storage.getDirectory();
}

async function ensureParents(root, path) {
  const parts = path.split('/').slice(0, -1);
  let dir = root;
  for (const part of parts) dir = await dir.getDirectoryHandle(part, { create: true });
  return dir;
}

export function createOpfsProvider() {
  if (typeof navigator === 'undefined' || !navigator.storage || typeof navigator.storage.getDirectory !== 'function') {
    return { tier: 'opfs', available: false };
  }
  const noent = (path) => Object.assign(new Error(`not found: ${path}`), { code: 'E_NOENT', path });
  async function open(path, create) {
    const { assertValidPath } = await import('./provider.js');
    assertValidPath(path);
    const root = await rootDir();
    const dir = await ensureParents(root, path);
    const name = path.split('/').pop();
    return dir.getFileHandle(name, { create: !!create });
  }
  return {
    tier: 'opfs',
    // Real round-trip probe for the ladder: a tier whose getDirectory never
    // resolves (wedged quota, headless quirks) must fall through, never hang
    // the boot. selectProvider races this against probeTimeoutMs.
    async probe() {
      const root = await rootDir();
      const h = await root.getFileHandle('doom-probe.tmp', { create: true });
      const w = await h.createWritable();
      await w.write(new Uint8Array([1, 2, 3]));
      await w.close();
      const f = await h.getFile();
      const back = new Uint8Array(await f.arrayBuffer());
      await root.removeEntry('doom-probe.tmp');
      if (back.length !== 3 || back[0] !== 1) throw new Error('opfs probe mismatch');
      return true;
    },
    async readFile(path) {
      let handle;
      try {
        handle = await open(path, false);
      } catch {
        throw noent(path);
      }
      const file = await handle.getFile();
      return new Uint8Array(await file.arrayBuffer());
    },
    async writeFile(path, data) {
      const u8 = data instanceof Uint8Array ? data : new Uint8Array(data);
      const tmp = `${path}.tmp`;
      const tmpHandle = await open(tmp, true);
      const w = await tmpHandle.createWritable();
      try {
        await w.write(u8);
        await w.close();
      } catch (e) {
        try { await w.abort(); } catch { /* ignore */ }
        throw e;
      }
      // Commit: copy tmp bytes to the destination, then delete tmp.
      const bytes = await this.readFile(tmp);
      const dstHandle = await open(path, true);
      const dw = await dstHandle.createWritable();
      try {
        await dw.write(bytes);
        await dw.close();
      } catch (e) {
        try { await dw.abort(); } catch { /* ignore */ }
        throw e;
      }
      await this.remove(tmp);
    },
    async remove(path) {
      const { assertValidPath } = await import('./provider.js');
      assertValidPath(path);
      try {
        const root = await rootDir();
        const dir = await ensureParents(root, path);
        await dir.removeEntry(path.split('/').pop());
      } catch { /* missing removes are idempotent */ }
    },
    async list(prefix) {
      const { assertValidPath } = await import('./provider.js');
      assertValidPath(prefix || 'doom/');
      const root = await rootDir();
      const out = [];
      async function walk(dir, base) {
        for await (const [name, handle] of dir.entries()) {
          const full = base ? `${base}/${name}` : name;
          if (handle.kind === 'file') {
            if (full.startsWith(prefix)) out.push(full);
          } else {
            await walk(handle, full);
          }
        }
      }
      await walk(root, '');
      return out.sort();
    },
    async readJSON(path) {
      const raw = await this.readFile(path);
      return JSON.parse(new TextDecoder().decode(raw));
    },
    async writeJSON(path, value) {
      await this.writeFile(path, new TextEncoder().encode(JSON.stringify(value)));
    },
  };
}
