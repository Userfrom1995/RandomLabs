// Thunderline headless player probe (node stdlib + global WebSocket, no deps).
// Drives a CDP-enabled headless Chrome to the player selftest page and
// prints the verdict as JSON on stdout.
//
// Usage: node cdp_selftest.mjs <page-url> <cdp-port>
//
// Exit 0 with {"verdict":"PASS",...} or {"verdict":"FAIL",...} when the page
// answered; exit 2 on driver errors (chrome unreachable, no page target).
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function main() {
  const pageUrl = process.argv[2];
  const port = process.argv[3];
  if (!pageUrl || !port) {
    console.error("usage: node cdp_selftest.mjs <page-url> <cdp-port>");
    process.exit(2);
  }
  const CDP = "http://127.0.0.1:" + port;
  let id = 1;
  const rpc = (ws, method, params) => new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("rpc timeout " + method)), 15000);
    const onMsg = (ev) => {
      let m;
      try { m = JSON.parse(ev.data.toString()); } catch (e) { return; }
      if (m.id === mid) {
        ws.removeEventListener("message", onMsg);
        clearTimeout(timer);
        if (m.error) { reject(new Error(JSON.stringify(m.error))); }
        else { resolve(m.result); }
      } else if (m.method === "Runtime.consoleAPICalled") {
        const args = (m.params.args || []).map((a) => a.value !== undefined ? a.value : (a.description || a.type));
        console.error("[page console]", ...args);
      } else if (m.method === "Runtime.exceptionThrown") {
        const d = m.params.exceptionDetails || {};
        console.error("[page exception]", (d.exception || {}).description || d.text);
      }
    };
    const mid = id++;
    ws.addEventListener("message", onMsg);
    ws.send(JSON.stringify({ id: mid, method, params: params || {} }));
  });

  const list = await (await fetch(CDP + "/json/list")).json();
  const page = list.find((t) => t.type === "page");
  if (!page) { console.error("no page target"); process.exit(2); }
  const ws = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((res, rej) => {
    ws.addEventListener("open", res);
    ws.addEventListener("error", (e) => rej(new Error("ws: " + e.message)));
  });
  try {
    await rpc(ws, "Runtime.enable");
    await rpc(ws, "Page.enable");
    await rpc(ws, "Page.navigate", { url: pageUrl });
    let verdict = null;
    for (let i = 0; i < 25; i++) {
      await sleep(2000);
      const r = await rpc(ws, "Runtime.evaluate", {
        expression: "({res: (window.__selftestResult || ''), det: (window.__selftestDetail || ''), st: (document.getElementById('selftest')||{}).textContent || '', ready: !document.getElementById('transport').hidden, empty: !document.getElementById('state-empty').hidden, err: !document.getElementById('state-error').hidden, erm: (document.getElementById('errorMsg')||{}).textContent || ''})",
        returnByValue: true,
      });
      const v = r.result.value;
      if (v.res === "PASS" || v.res === "FAIL") {
        verdict = { verdict: v.res, detail: v.det, selftest: v.st, polls: i + 1 };
        break;
      }
      if (v.empty) {
        verdict = { verdict: "EMPTY", detail: "empty card visible", selftest: "", polls: i + 1 };
        break;
      }
      if (v.err) {
        verdict = { verdict: "ERROR", detail: v.erm, selftest: "", polls: i + 1 };
        break;
      }
    }
    if (!verdict) {
      const r = await rpc(ws, "Runtime.evaluate", {
        expression: "({ready: !document.getElementById('transport').hidden, loading: !document.getElementById('state-loading').hidden, err: (document.getElementById('errorMsg')||{}).textContent || '', empty: (document.getElementById('emptyMsg')||{}).textContent || ''})",
        returnByValue: true,
      });
      verdict = { verdict: "FAIL", detail: "page never settled: " + JSON.stringify(r.result.value), selftest: "", polls: 25 };
    }
    console.log(JSON.stringify(verdict));
  } finally {
    ws.close();
  }
}

main().catch((e) => { console.error("driver error: " + (e && e.message)); process.exit(2); });
