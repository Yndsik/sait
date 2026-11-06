const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
test('CAPTCHA is fail-closed when configured, clears expired tokens and resets after use',()=>{
 const nodes=new Map(),events={};let options,resets=0;
 const context={window:{YNDSI_AUTH_CONFIG:{turnstileSiteKey:'public-site-key'},turnstile:{render:(box,o)=>{options=o;return 1},reset(){resets++}}},document:{getElementById:id=>{if(!nodes.has(id))nodes.set(id,{});return nodes.get(id)},addEventListener:(name,fn)=>events[name]=fn}};
 vm.createContext(context);vm.runInContext(fs.readFileSync('auth-captcha.js','utf8'),context);context.window.ynCaptcha.show();assert.throws(()=>context.window.ynCaptcha.getToken(),/не робот/);
 options.callback('real-token');assert.equal(context.window.ynCaptcha.getToken(),'real-token');options['expired-callback']();assert.throws(()=>context.window.ynCaptcha.getToken());
 options.callback('new-token');context.window.ynCaptcha.reset();assert.equal(resets,1);assert.throws(()=>context.window.ynCaptcha.getToken());
});
test('build publishes only explicit assets and excludes source, SQL, tests and secret configuration',()=>{
 const build=env=>vm.runInNewContext(fs.readFileSync('scripts/build.cjs','utf8'),{require,__dirname:path.resolve('scripts'),process:{env},console:{log(){}}});build({TURNSTILE_SITE_KEY:'public-site-key',TURNSTILE_SECRET_KEY:'secret-must-not-ship'});
 assert.ok(fs.existsSync('dist/index.html'));assert.ok(fs.existsSync('dist/sw.js'));assert.ok(fs.existsSync('dist/auth-captcha.js'));
 for(const name of ['package.json','netlify.toml','.git','.env','supabase','tests','docs','netlify','scripts','lib'])assert.equal(fs.existsSync('dist/'+name),false,name);
 const config=fs.readFileSync('dist/auth-config.js','utf8');assert.ok(config.includes('public-site-key'));assert.ok(!config.includes('secret-must-not-ship'));
 build({});
});
test('shared Steam quota fails closed and never calls Steam when quota is denied',async()=>{
 const {handler}=require('../netlify/functions/steam.js'),original=global.fetch;const names=['SUPABASE_URL','SUPABASE_PUBLISHABLE_KEY','STEAM_SHARED_RATE_LIMIT'],saved=names.map(n=>process.env[n]);
 Object.assign(process.env,{SUPABASE_URL:'https://example.supabase.co',SUPABASE_PUBLISHABLE_KEY:'public',STEAM_SHARED_RATE_LIMIT:'true'});let quotaOK=true;const seen=[];
 global.fetch=async url=>{seen.push(String(url));if(String(url).includes('/auth/'))return {ok:true,json:async()=>({id:'quota-member',email_confirmed_at:'2026-01-01'})};if(String(url).includes('/rpc/yn_steam_quota'))return {ok:quotaOK,json:async()=>false};throw Error('must not contact Steam')};
 try{const e={httpMethod:'GET',headers:{authorization:'Bearer test.token'},queryStringParameters:{q:'Game'}};
 const denied=await handler(e);assert.equal(denied.statusCode,429);assert.equal(denied.headers['Retry-After'],'60');assert.ok(seen.every(u=>u.includes('example.supabase.co')));
 quotaOK=false;assert.equal((await handler(e)).statusCode,503);const before=seen.length;assert.equal((await handler({...e,queryStringParameters:{page:'-1'}})).statusCode,400);assert.equal(seen.length,before);
 }finally{global.fetch=original;names.forEach((n,i)=>{if(saved[i]===undefined)delete process.env[n];else process.env[n]=saved[i]})}
});
test('Steam backpressure bounds concurrent authenticated requests per instance',async()=>{
 const {handler}=require('../netlify/functions/steam.js'),original=global.fetch,oldURL=process.env.SUPABASE_URL,oldKey=process.env.SUPABASE_PUBLISHABLE_KEY;const releases=[];
 process.env.SUPABASE_URL='https://example.supabase.co';process.env.SUPABASE_PUBLISHABLE_KEY='public';global.fetch=()=>new Promise(resolve=>releases.push(()=>resolve({ok:false})));
 try{const e={httpMethod:'GET',headers:{authorization:'Bearer test.token'}};const pending=Array.from({length:4},()=>handler(e));assert.equal((await handler(e)).statusCode,429);releases.forEach(fn=>fn());await Promise.all(pending)}finally{global.fetch=original;if(oldURL===undefined)delete process.env.SUPABASE_URL;else process.env.SUPABASE_URL=oldURL;if(oldKey===undefined)delete process.env.SUPABASE_PUBLISHABLE_KEY;else process.env.SUPABASE_PUBLISHABLE_KEY=oldKey}
});
