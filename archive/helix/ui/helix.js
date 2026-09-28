const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const tooltip = document.getElementById('tooltip');
let points = []; // {id,x,y,meta}
let lit = new Set();
let queryPt = null;

const apiBase = ''; // same origin; for local serve, api at /api/*

async function fetchProjection() {
  try {
    const r = await fetch('/api/projection');
    if (!r.ok) throw new Error('no api');
    const j = await r.json();
    points = j.points || [];
  } catch {
    // fallback to demo.json
    const r = await fetch('data/demo.json');
    if (r.ok) {
      const j = await r.json();
      // demo.json may be index dump; try to extract projection
      if (j.points) points = j.points;
      else if (j.Projection) points = j.Projection;
      else if (Array.isArray(j)) points = j;
      else points = [];
      // if it's a full index json, try to synthesize random 2d
      if (points.length === 0 && j.entries) {
        points = j.entries.map((e,i)=>({id:e.id, x: Math.random()*2-1, y: Math.random()*2-1, meta:e.meta}));
      }
    }
  }
  render();
  updateStats();
}

function updateStats() {
  fetch('/api/stats').then(r=>r.json()).then(j=>{
    document.getElementById('stats').textContent = `count ${j.count} dim ${j.dim} layers ${j.layers} pq ${j.pq?.enabled?'on':'off'}`;
  }).catch(()=>{
    document.getElementById('stats').textContent = `${points.length} points (offline demo)`;
  });
}

function render() {
  const W = canvas.width, H = canvas.height;
  ctx.clearRect(0,0,W,H);
  if (points.length === 0) {
    ctx.fillStyle = '#8b95a1';
    ctx.fillText('no points - load demo or ingest', 20, 20);
    return;
  }
  // bounds
  let minX = Infinity, maxX=-Infinity, minY=Infinity, maxY=-Infinity;
  for (const p of points) { minX=Math.min(minX,p.x); maxX=Math.max(maxX,p.x); minY=Math.min(minY,p.y); maxY=Math.max(maxY,p.y); }
  const pad = 0.1;
  const rangeX = (maxX-minX)||1, rangeY=(maxY-minY)||1;
  minX-=rangeX*pad; maxX+=rangeX*pad; minY-=rangeY*pad; maxY+=rangeY*pad;
  const sx = x => ((x - minX)/(maxX-minX))* (W-20) +10;
  const sy = y => ((y - minY)/(maxY-minY))* (H-20) +10;

  // draw query edges
  if (queryPt) {
    ctx.strokeStyle = 'rgba(42,106,233,0.25)';
    ctx.lineWidth = 1;
    for (const id of lit) {
      const p = points.find(q=>q.id===id);
      if (!p) continue;
      ctx.beginPath();
      ctx.moveTo(sx(queryPt.x), sy(queryPt.y));
      ctx.lineTo(sx(p.x), sy(p.y));
      ctx.stroke();
    }
  }

  for (const p of points) {
    const x = sx(p.x), y = sy(p.y);
    const isLit = lit.has(p.id);
    const isQuery = queryPt && queryPt.id===p.id;
    ctx.beginPath();
    ctx.arc(x,y, isLit?6:3, 0, Math.PI*2);
    ctx.fillStyle = isQuery ? '#ffd54f' : isLit ? '#2a6ae9' : '#8b95a1';
    if (isLit) { ctx.shadowBlur=12; ctx.shadowColor='#2a6ae9'; }
    else { ctx.shadowBlur=0; }
    ctx.fill();
    ctx.shadowBlur=0;
  }
  // store transform for hit test
  canvas._sx = sx; canvas._sy = sy;
}

canvas.addEventListener('mousemove', e=>{
  const rect = canvas.getBoundingClientRect();
  const mx = (e.clientX-rect.left)/rect.width*canvas.width;
  const my = (e.clientY-rect.top)/rect.height*canvas.height;
  let hit = null;
  let bestD=12;
  for (const p of points) {
    const x=canvas._sx(p.x), y=canvas._sy(p.y);
    const d=Math.hypot(x-mx,y-my);
    if (d<bestD){bestD=d; hit=p;}
  }
  if (hit) {
    tooltip.style.display='block';
    tooltip.style.left=e.clientX+10+'px';
    tooltip.style.top=e.clientY+10+'px';
    tooltip.textContent=`id ${hit.id} (${hit.x.toFixed(2)},${hit.y.toFixed(2)})`;
  } else tooltip.style.display='none';
});
canvas.addEventListener('mouseleave', ()=>tooltip.style.display='none');

canvas.addEventListener('click', e=>{
  const rect=canvas.getBoundingClientRect();
  const mx=(e.clientX-rect.left)/rect.width*canvas.width;
  const my=(e.clientY-rect.top)/rect.height*canvas.height;
  let hit=null,bestD=14;
  for (const p of points) {
    const x=canvas._sx(p.x), y=canvas._sy(p.y);
    const d=Math.hypot(x-mx,y-my);
    if (d<bestD){bestD=d; hit=p;}
  }
  if (hit) {
    // use this point's vector if available via API? fallback: query by id's vector via search using its coordinates as proxy
    // We call search with a vector of dimension guessed from stats; instead we fetch the point's stored vector via a synthetic approach: just search with projection coords expanded? Not correct dimensionally.
    // Instead we fetch the entry's vector via a direct lookup if API supported; for now we request search by clicking id: we send the point's id to backend via a custom endpoint? Simpler: just use the point's x,y as query only for demo 2D; but real search needs D-dim. So we ask server for that vector via a helper: if demo, we can search by id by asking /api/search with that point's vector reconstructed? We don't have it. So we instead call /api/search with the stored vector if we have it in points meta? Demo points include no vector. So we fallback to client-side nearest in 2D as mock.
    // Try to call server with a vector derived from point's projected? That will be wrong dimensionally. So we try to fetch vector via a dedicated lookup by trying to POST search with the point's actual vector if we have a local cache of vectors from demo.json entries.
    if (window._vectors && window._vectors[hit.id]) {
      document.getElementById('query-vec').value = JSON.stringify(window._vectors[hit.id]);
      doSearch(window._vectors[hit.id], hit);
    } else {
      // fallback 2D mock highlighting
      const k = parseInt(document.getElementById('k-input').value)||5;
      const sorted = points.map(p=>({p, d: Math.hypot(p.x-hit.x, p.y-hit.y)})).sort((a,b)=>a.d-b.d).slice(0,k);
      lit = new Set(sorted.map(s=>s.p.id));
      queryPt = hit;
      render();
      showResults(sorted.map(s=>({id:s.p.id, distance:s.d, meta:s.p.meta})));
    }
  }
});

async function doSearch(vec, hitPt) {
  const k = parseInt(document.getElementById('k-input').value)||5;
  const ef = parseInt(document.getElementById('ef-slider').value)||40;
  const mode = document.getElementById('mode-sel').value;
  const metric = document.getElementById('metric-sel').value;
  if (!vec) {
    try { vec = JSON.parse(document.getElementById('query-vec').value); } catch { alert('invalid query vector JSON'); return; }
  }
  try {
    const r = await fetch('/api/search', {method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({vector: vec, k, ef, mode, metric})});
    const j = await r.json();
    if (j.error) { alert(j.error); return; }
    lit = new Set(j.results.map(x=>x.id));
    queryPt = hitPt || {x:0,y:0,id:'query'};
    // if hitPt provided, keep its projection; else find avg of results for queryPt
    if (!hitPt) {
      let sx=0,sy=0,c=0;
      for (const id of lit){ const p=points.find(q=>q.id===id); if(p){ sx+=p.x; sy+=p.y; c++; } }
      if(c) queryPt = {x:sx/c, y:sy/c, id:'query'};
    }
    render();
    showResults(j.results);
    document.getElementById('visited').textContent = `visited ${j.visited} mode ${j.mode}`;
  } catch (e) {
    // offline fallback: 2D distance
    const k2 = k;
    const sorted = points.map(p=>({p, d: Math.hypot(p.x - (hitPt?hitPt.x:0), p.y-(hitPt?hitPt.y:0))})).sort((a,b)=>a.d-b.d).slice(0,k2);
    lit = new Set(sorted.map(s=>s.p.id));
    queryPt = hitPt||{x:0,y:0,id:'query'};
    render();
    showResults(sorted.map(s=>({id:s.p.id, distance:s.d})));
  }
}

function showResults(results) {
  const ol=document.getElementById('result-list');
  ol.innerHTML='';
  for (const r of results) {
    const li=document.createElement('li');
    li.textContent=`${r.id} - ${Number(r.distance).toFixed(4)}`;
    if (r.meta) li.title = JSON.stringify(r.meta);
    ol.appendChild(li);
  }
}

document.getElementById('btn-search').onclick=()=>{ const v=document.getElementById('query-vec').value.trim(); if(!v){ alert('paste query vector'); return;} let vec; try{vec=JSON.parse(v);}catch{alert('bad json');return;} doSearch(vec,null); };
document.getElementById('ef-slider').oninput=e=>{ document.getElementById('ef-val').textContent=e.target.value; };
document.getElementById('btn-demo').onclick=async()=>{
  await fetchProjection();
  // try to load vectors for click-to-query
  try{ const r=await fetch('data/demo.json'); const j=await r.json(); if(j.vectors){ window._vectors=j.vectors; } else if(j.entries){ window._vectors={}; for(const en of j.entries) window._vectors[en.id]=en.vec; } }catch{}
};
document.getElementById('btn-paste').onclick=async()=>{
  const txt=document.getElementById('paste-area').value.trim();
  if(!txt){ return; }
  let items;
  try {
    if (txt.startsWith('[')) items=JSON.parse(txt);
    else if (txt.startsWith('{')) { const o=JSON.parse(txt); items=o.items||[o]; }
    else {
      // CSV: lines id,vec (comma separated, vector in quotes/brackets)
      const lines=txt.split('\n').filter(Boolean);
      items=lines.map(line=>{
        const parts=line.split(',');
        const id=parseInt(parts[0].trim());
        const vec=parts.slice(1).map(x=>parseFloat(x.trim())).filter(x=>!isNaN(x));
        return {id, vector:vec};
      });
    }
  } catch(e){ document.getElementById('ingest-msg').textContent='parse error '+e; return; }
  try{
    const r=await fetch('/api/index/batch',{method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({items})});
    const j=await r.json();
    document.getElementById('ingest-msg').textContent = j.error ? 'error '+j.error : `ingested ${j.count}`;
    await fetchProjection();
  }catch(e){ document.getElementById('ingest-msg').textContent='fetch failed (no server)'; }
};
document.getElementById('file-input').onchange=async e=>{
  const f=e.target.files[0]; if(!f) return;
  const txt=await f.text();
  document.getElementById('paste-area').value=txt;
};

// initial
fetchProjection();
