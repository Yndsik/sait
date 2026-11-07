const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
test('Android only loads the production HTTPS origin and disables insecure transport/debugging',()=>{
 const c=JSON.parse(fs.readFileSync('capacitor.config.json','utf8'));assert.equal(c.server.url,'https://yndsi-streamer-hub.pages.dev');assert.equal(c.server.cleartext,false);assert.deepEqual(c.server.allowNavigation,['yndsi-streamer-hub.pages.dev']);assert.equal(c.webDir,'mobile-shell');assert.equal(c.android.allowMixedContent,false);assert.equal(c.android.webContentsDebuggingEnabled,false);
 const m=fs.readFileSync('android/app/src/main/AndroidManifest.xml','utf8');for(const expected of ['android:usesCleartextTraffic="false"','android:allowBackup="false"','android.permission.CAMERA','android.permission.RECORD_AUDIO'])assert.ok(m.includes(expected));assert.ok(!m.includes('ACCESS_FINE_LOCATION'));
});
test('fallback includes no account data and website build excludes Android sources',()=>{
 const f=fs.readFileSync('mobile-shell/offline.html','utf8');assert.ok(f.includes('https://yndsi-streamer-hub.pages.dev/'));assert.ok(!f.includes('supabase'));assert.ok(!f.includes('secret'));
 for(const p of ['capacitor.config.json','mobile-shell','android','package-lock.json'])assert.ok(!fs.existsSync('dist/'+p),p);
});
