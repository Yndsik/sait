const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),crypto=require('node:crypto');
test('public Android download is the verified APK and includes release metadata',()=>{
 const release=JSON.parse(fs.readFileSync('downloads/android.json','utf8'));const source=fs.readFileSync('downloads/'+release.file),published=fs.readFileSync('dist/downloads/'+release.file);
 assert.equal(published.length,release.bytes);assert.equal(crypto.createHash('sha256').update(published).digest('hex'),release.sha256);assert.ok(source.equals(published));assert.deepEqual(JSON.parse(fs.readFileSync('dist/downloads/android.json','utf8')),release);
});
test('download is reachable without an account and clearly labelled Android test version',()=>{
 const release=JSON.parse(fs.readFileSync('downloads/android.json','utf8')),page=fs.readFileSync('dist/android.html','utf8'),index=fs.readFileSync('dist/index.html','utf8');
 assert.ok(page.includes('/downloads/'+release.file));assert.ok(page.includes('download='));assert.ok(page.includes('Пока только Android'));assert.ok(page.includes('тестовая'));assert.ok(page.includes('Android 7.0'));assert.ok(!page.includes('ynSync'));assert.ok(index.includes('android-promo'));assert.ok(index.includes('class="auth-android"'));assert.ok(index.includes('/android.html'));
 const config=fs.readFileSync('netlify.toml','utf8');assert.ok(config.includes('application/vnd.android.package-archive'));assert.ok(config.includes('Content-Disposition'));
});
