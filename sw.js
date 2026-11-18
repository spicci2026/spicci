const V='spicci-2026-11-18j';
const PRE=["./", "index.html", "privacy.html", "termini.html", "fonti.html", "aiuto.html", "pro.html", "manifest.webmanifest", "favicon.ico", "icons/icon-192.png", "icons/icon-512.png", "icons/maskable-192.png", "icons/maskable-512.png", "icons/apple-touch-icon.png", "icons/favicon-32.png"];
self.addEventListener('install',e=>{e.waitUntil(caches.open(V).then(c=>c.addAll(PRE)).then(()=>self.skipWaiting()));});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==V).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));});
self.addEventListener('fetch',e=>{
  const r=e.request; if(r.method!=='GET') return;
  const u=new URL(r.url); if(u.origin!==location.origin) return;
  if(r.mode==='navigate'){
    e.respondWith(fetch(r).then(res=>{const cp=res.clone(); caches.open(V).then(c=>c.put(r,cp)); return res;})
      .catch(()=>caches.match(r).then(m=>m||caches.match('index.html'))));
    return;
  }
  e.respondWith(caches.match(r).then(m=>{
    const net=fetch(r).then(res=>{ if(res.ok){const cp=res.clone(); caches.open(V).then(c=>c.put(r,cp));} return res; }).catch(()=>m);
    return m||net;
  }));
});
