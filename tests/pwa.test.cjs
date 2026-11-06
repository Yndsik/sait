const {test}=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
function worker(){const events={},writes=[];let offline=false;const fallback={offline:true};const context={URL,Response,self:{location:{origin:'https://example.invalid'},addEventListener:(name,fn)=>events[name]=fn,skipWaiting:async()=>{},clients:{claim:async()=>{}}},caches:{open:async()=>({add:async url=>writes.push(url)}),match:async()=>fallback,keys:async()=>['yndsi-offline-v0','other-cache'],delete:async key=>writes.push('delete:'+key)},fetch:async request=>{if(offline)throw Error('offline');return {url:request.url}}};vm.createContext(context);vm.runInContext(fs.readFileSync('sw.js','utf8'),context);return {events,writes,fallback,disconnect(){offline=true}}}
test('worker caches only generic offline page and bypasses APIs, media and external requests',async()=>{
 const w=worker();let pending;w.events.install({waitUntil:p=>pending=p});await pending;assert.deepEqual(w.writes,['/offline.html']);
 for(const request of [{url:'https://example.invalid/api/messages',method:'GET',mode:'cors'},{url:'https://example.invalid/',method:'POST',mode:'navigate'},{url:'https://storage.invalid/private.jpg',method:'GET',mode:'navigate'}])w.events.fetch({request,respondWith(){assert.fail('private or external request intercepted')}});
 const request={url:'https://example.invalid/?code=auth-callback',method:'GET',mode:'navigate'};w.events.fetch({request,respondWith:p=>pending=p});assert.deepEqual(await pending,{url:request.url});assert.deepEqual(w.writes,['/offline.html']);
 w.disconnect();w.events.fetch({request,respondWith:p=>pending=p});assert.equal(await pending,w.fallback);
 w.events.activate({waitUntil:p=>pending=p});await pending;assert.ok(w.writes.includes('delete:yndsi-offline-v0'));assert.ok(!w.writes.includes('delete:other-cache'));
});
test('manifest and iPhone metadata refer to valid local PNG icons',()=>{
 const manifest=JSON.parse(fs.readFileSync('manifest.webmanifest','utf8'));assert.equal(manifest.display,'standalone');assert.equal(manifest.scope,'/');assert.ok(manifest.start_url.startsWith('/'));
 for(const icon of [...manifest.icons,{src:'/icons/apple-touch-icon.png',sizes:'180x180'}]){const bytes=fs.readFileSync('.'+icon.src);assert.equal(bytes.subarray(1,4).toString(),'PNG');const size=Number(icon.sizes.split('x')[0]);assert.equal(bytes.readUInt32BE(16),size);assert.equal(bytes.readUInt32BE(20),size)}
 const html=fs.readFileSync('index.html','utf8');assert.ok(html.includes('apple-mobile-web-app-capable'));assert.ok(html.includes('viewport-fit=cover'));assert.ok(html.includes('src="pwa-ui.js"'));
});
