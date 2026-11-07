// Cache only the generic offline page. Account data, chat media and app pages always use the network.
const OFFLINE_CACHE='yndsi-offline-v2-rivlo';
self.addEventListener('install',event=>{event.waitUntil(caches.open(OFFLINE_CACHE).then(cache=>cache.add('/offline.html')).then(()=>self.skipWaiting()))});
self.addEventListener('activate',event=>{event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key.startsWith('yndsi-offline-')&&key!==OFFLINE_CACHE).map(key=>caches.delete(key)))).then(()=>self.clients.claim()))});
self.addEventListener('fetch',event=>{
 const url=new URL(event.request.url);
 if(event.request.method!=='GET'||event.request.mode!=='navigate'||url.origin!==self.location.origin)return;
 event.respondWith(fetch(event.request).catch(async()=>await caches.match('/offline.html')||new Response('Нет подключения к интернету',{status:503,headers:{'Content-Type':'text/plain; charset=utf-8'}})));
});
