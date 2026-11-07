const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..'),out=path.join(root,'dist');
const siteKey=(process.env.TURNSTILE_SITE_KEY||'').trim();
if(siteKey&&!/^[A-Za-z0-9_-]{10,100}$/.test(siteKey))throw Error('Invalid public Turnstile site key');
fs.rmSync(out,{recursive:true,force:true});fs.mkdirSync(out);
const assets=['index.html','schedule.html','offline.html','manifest.webmanifest','vivid.css','schedule-public.css','auth-config.js','auth-captcha.js','auth-session.js','auth-flow.js','i18n-dictionary.js','i18n.js','ui-icons.js','community-model.js','recommendations.js','steam-ui.js','schedule-model.js','schedule-ui.js','profile-model.js','profile-ui.js','social-ui.js','chat-media-model.js','chat-media-ui.js','recorder-ui.js','schedule-sharing-ui.js','schedule-public.js','notifications-ui.js','pwa-ui.js','presence-ui.js','design-ui.js','workspace-ui.js','news-ui.js','guest-ui.js','emoji-ui.js','license.html','android.html','sw.js'];
for(const name of assets)fs.copyFileSync(path.join(root,name),path.join(out,name));
fs.cpSync(path.join(root,'icons'),path.join(out,'icons'),{recursive:true});
fs.writeFileSync(path.join(out,'auth-config.js'),'window.YNDSI_AUTH_CONFIG='+JSON.stringify({turnstileSiteKey:siteKey})+';\n');
console.log('Public assets built. CAPTCHA widget '+(siteKey?'configured':'not configured; enable Supabase CAPTCHA after setting TURNSTILE_SITE_KEY.'));

// Publish exactly the verified Android build; never expose native sources or signing files.
const crypto=require('node:crypto');
const apkName='yndsi-android-test-1.0.apk',apk=fs.readFileSync(path.join(root,'downloads',apkName));
const release=JSON.parse(fs.readFileSync(path.join(root,'downloads/android.json'),'utf8'));
if(release.file!==apkName||apk.length!==release.bytes||crypto.createHash('sha256').update(apk).digest('hex')!==release.sha256)throw Error('Android APK does not match release checksum');
fs.mkdirSync(path.join(out,'downloads'));fs.copyFileSync(path.join(root,'downloads',apkName),path.join(out,'downloads',apkName));
fs.copyFileSync(path.join(root,'downloads/android.json'),path.join(out,'downloads/android.json'));
