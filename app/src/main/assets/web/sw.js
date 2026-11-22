/* Minimal service worker: makes the page installable and lets it open offline.
   Network first (so updates arrive immediately), cache as fallback. */
const CACHE='jdxi-remote-android-v42-dual';
const SHELL=['./','index.html','jdxi.html','banner.png','style.css','jd-xa.css','theme-look.js','ui-scale.js','data.js','dx7.js','pattern-midi.js','app.js','mypatches.js','mixer.js','viz.js','stepper.js','performance.js','wheels.js','punch.js','sequencer.js','fx.js','transfer.js','debug.js','collapse.js','install.js','jd-xa.js','jd-xa-extended.js','jd-xa-inspector.js','jd-xa-deep.js','jdxa.html','jdxa-app.js','jdxa-mixer.js','jdxa-viz.js','jdxa-performance.js','jdxa-punch.js','jdxa-sequencer.js','jdxa-fx.js','jdxa-waves.js','jdxa-synth.js','jdxa-patches.js','jdxa-xa.js','jdxa-boot.js','jd-xa-patch.js','manifest.webmanifest','icon-192.png','icon-512.png'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(CACHE).then(c=>c.addAll(SHELL)).catch(()=>{}));self.skipWaiting()});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()))});
self.addEventListener('fetch',e=>{
 const req=e.request;if(req.method!=='GET'||new URL(req.url).origin!==location.origin)return;
 const key=new URL(req.url);key.search='';
 e.respondWith(fetch(req).then(res=>{if(res.ok){const copy=res.clone();caches.open(CACHE).then(c=>c.put(key.href,copy))}return res})
  .catch(()=>caches.match(key.href).then(r=>r||caches.match('index.html'))));
});
