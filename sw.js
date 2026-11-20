const CACHE='donezo-wave8-v1';
const core=['/','/style.css','/app.js','/platform.js','/wave.js','/competitive.js','/finalize.js','/challenge-bank.js','/expansion.js','/wave5.js','/vendor/fsrs.js','/wave6.js','/manifest.webmanifest','/art/hero.webp','/art/empty.webp','/art/fox-192.png','/art/fox-512.png'];
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(core))));
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>(/^donezo-wave[2345678]-/).test(key)&&key!==CACHE).map(key=>caches.delete(key)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',event=>{
  const request=event.request;
  if(new URL(request.url).pathname.startsWith('/api/'))return;
  if(request.method!=='GET'||new URL(request.url).origin!==self.location.origin)return;
  event.respondWith(fetch(request).then(response=>{
    if(response.ok&&response.type==='basic')caches.open(CACHE).then(cache=>cache.put(request,response.clone())).catch(()=>{});
    return response;
  }).catch(async()=>await caches.match(request)||(request.mode==='navigate'?await caches.match('/'):null)||Response.error()));
});
