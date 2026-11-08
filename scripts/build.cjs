const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..'),out=path.join(root,'dist');
const siteKey=(process.env.TURNSTILE_SITE_KEY||'').trim();
if(siteKey&&!/^[A-Za-z0-9_-]{10,100}$/.test(siteKey))throw Error('Invalid public Turnstile site key');
fs.rmSync(out,{recursive:true,force:true});fs.mkdirSync(out);
const assets=['index.html','schedule.html','offline.html','manifest.webmanifest','vivid.css','polish.css','rivlo.css','refinement.css','refinement-ui.js','twitch-model.js','twitch-ui.js','profile-view-ui.js','developer-ui.js','friends-discovery-ui.js','handles-model.js','handles-ui.js','studio.css','chat-polish-ui.js','flow-model.js','flow-ui.js','flow.css','atelier.css','atelier-ui.js','orbit.css','orbit-model.js','orbit-calendar.js','orbit-social.js','chroma-ui.js','chroma.css','profile-experience.js','profile-experience.css','landing-ui.js','landing.css','collection-model.js','collection-ui.js','releases.js','updates-ui.js','rivlo-motion.js','schedule-public.css','auth-config.js','auth-captcha.js','auth-session.js','auth-flow.js','twitch-auth-model.js','twitch-auth-ui.js','twitch-auth.css','aura-ui.js','aura.css','chat-extras-model.js','chat-extras-ui.js','chat-extras.css','i18n-dictionary.js','i18n.js','ui-icons.js','community-model.js','recommendations.js','steam-ui.js','schedule-model.js','schedule-ui.js','profile-model.js','profile-covers.js','profile-ui.js','social-ui.js','chat-media-model.js','chat-media-ui.js','chat-view-ui.js','recorder-ui.js','recorder-draft-ui.js','schedule-sharing-ui.js','schedule-public.js','notifications-ui.js','community-plus.js','shared-game-model.js','shared-game-ui.js','creator-admin.js','verification-ui.js','notification-sound.js','site-visitors.js','pwa-ui.js','presence-ui.js','design-ui.js','workspace-ui.js','news-ui.js','guest-ui.js','emoji-ui.js','license.html','android.html','sw.js'];
for(const name of assets)fs.copyFileSync(path.join(root,name),path.join(out,name));
fs.cpSync(path.join(root,'icons'),path.join(out,'icons'),{recursive:true});
fs.writeFileSync(path.join(out,'auth-config.js'),'window.YNDSI_AUTH_CONFIG='+JSON.stringify({turnstileSiteKey:siteKey})+';\n');
console.log('Public assets built. CAPTCHA widget '+(siteKey?'configured':'not configured; enable Supabase CAPTCHA after setting TURNSTILE_SITE_KEY.'));

// Publish exactly the verified Android build; never expose native sources or signing files.
const crypto=require('node:crypto');
const release=JSON.parse(fs.readFileSync(path.join(root,'downloads/android.json'),'utf8'));
if(!/^yndsi-android-test-\d+\.\d+(?:\.\d+)?\.apk$/.test(release.file))throw Error('Invalid Android release filename');
const apkName=release.file,apk=fs.readFileSync(path.join(root,'downloads',apkName));
if(apk.length!==release.bytes||crypto.createHash('sha256').update(apk).digest('hex')!==release.sha256)throw Error('Android APK does not match release checksum');
fs.mkdirSync(path.join(out,'downloads'));fs.copyFileSync(path.join(root,'downloads',apkName),path.join(out,'downloads',apkName));
fs.copyFileSync(path.join(root,'downloads/android.json'),path.join(out,'downloads/android.json'));
