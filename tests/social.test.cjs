const {test}=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
const html=fs.readFileSync('index.html','utf8');const scripts=[...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)].map(m=>m[1]).filter(s=>s.trim());
function setup(owner=false,allowed=true){
 const elements=new Map(),classes=new Set(),timers=new Map();let timerId=0,actor=owner?'owner':'member',listener,signup;
 const get=id=>{if(!elements.has(id))elements.set(id,{textContent:'',innerHTML:'',value:'',style:{},handlers:{},setAttribute(){},addEventListener(name,fn){this.handlers[name]=fn},classList:{toggle(){},add(){},remove(){}}});return elements.get(id)};
 const blank=()=>({streams:[],games:[],notes:[],tasks:[],folders:[]});
 const legacy={...blank(),games:[{id:'private',title:'PRIVATE OWNER DATA'}]};const storage=new Map([['yndsi_db',JSON.stringify(legacy)]]),reads=[],writes=[];
 const records=new Map([['owner',legacy],['member',{...blank(),games:[{id:'own',title:'MEMBER GAME'}]}],['second',blank()]]);
 const client={rpc:async()=>({data:{allowed,owner:actor==='owner'},error:null}),from(){let id;return {select(){return this},eq(k,value){id=value;reads.push(value);return this},maybeSingle:async()=>({data:records.has(id)?{data:structuredClone(records.get(id))}:null,error:null}),upsert:async payload=>{writes.push(payload);if(payload.user_id!==actor)return {error:{message:'RLS denied'}};records.set(actor,structuredClone(payload.data));return {error:null}}}},auth:{getSession:async()=>({data:{session:{user:{id:actor,email:'test@example.invalid'}}}}),onAuthStateChange(fn){listener=fn},signUp:async payload=>{signup=payload;return {data:{session:null},error:null}},signInWithPassword:async()=>({data:{session:null},error:null})}};
 const context={console,Date,JSON,structuredClone,Event:class{},setTimeout:(fn,delay=0)=>{const id=++timerId;timers.set(id,{fn,delay});return id},clearTimeout:id=>timers.delete(id),confirm:()=>true,location:{origin:'https://example.invalid'},localStorage:{getItem:key=>storage.get(key)||null,setItem:(key,value)=>storage.set(key,value)},document:{documentElement:{style:{setProperty(){}}},querySelector:s=>get(s),querySelectorAll:()=>[],getElementById:id=>get('#'+id),body:{dataset:{},classList:{add:c=>classes.add(c),remove:c=>classes.delete(c)}}},window:{supabase:{createClient:()=>client},dispatchEvent(){},ynSocial:{reset(){},render(){get('#view').innerHTML='FRIENDS ONLY'}}}};
 vm.createContext(context);vm.runInContext(scripts[0],context);vm.runInContext(scripts.find(s=>s.includes('const SUPABASE_URL=')),context);
 return {context,elements,classes,reads,writes,storage,signup:()=>signup,async switchAccount(id){actor=id;listener('SIGNED_IN',{user:{id,email:'test@example.invalid'}});for(const [key,timer] of timers)if(!timer.delay){timers.delete(key);await timer.fn()}await new Promise(setImmediate)},async flush(){for(const [key,timer] of timers){timers.delete(key);await timer.fn()}await new Promise(setImmediate)}};
}
test('ordinary member receives all personal tools and never adopts legacy owner cache',async()=>{
 const state=setup(false);await new Promise(setImmediate);assert.deepEqual(state.reads,['member']);assert.equal(state.classes.has('session-ready'),true);assert.equal(state.context.document.body.dataset.role,'member');
 assert.equal(vm.runInContext('db.games[0].title',state.context),'MEMBER GAME');
 vm.runInContext("go('library');save()",state.context);assert.equal(vm.runInContext('page',state.context),'library');await state.flush();assert.equal(state.writes.at(-1).user_id,'member');
 assert.ok(state.storage.has('yndsi_db:member'));assert.equal(state.storage.get('yndsi_db:member').includes('PRIVATE OWNER DATA'),false);
});
test('switching accounts clears data and cancels stale scheduled writes',async()=>{
 const state=setup(false);await new Promise(setImmediate);vm.runInContext("db.notes.push({title:'Member secret'});save()",state.context);
 await state.switchAccount('second');await state.flush();assert.equal(vm.runInContext('db.games.length+db.notes.length',state.context),0);assert.equal(state.writes.some(w=>JSON.stringify(w.data).includes('Member secret')),false);
 assert.deepEqual(state.reads,['member','second']);assert.ok(state.storage.get('yndsi_db:member').includes('Member secret'));assert.equal(state.storage.get('yndsi_db:second').includes('Member secret'),false);
});
test('unconfirmed user is denied before reading any workspace',async()=>{const state=setup(false,false);await new Promise(setImmediate);assert.equal(state.reads.length,0);assert.equal(state.classes.has('session-ready'),false)});
test('owner retains the original workspace',async()=>{const state=setup(true);await new Promise(setImmediate);assert.deepEqual(state.reads,['owner']);assert.equal(vm.runInContext('db.games[0].title',state.context),'PRIVATE OWNER DATA');assert.equal(state.context.document.body.dataset.role,'owner')});
test('registration submits nickname and confirmation redirect',async()=>{
 const state=setup(false,false);await new Promise(setImmediate);state.context.window.ynSync.setMode('signup');state.elements.get('#authNickname').value='ChosenNick';state.context.document.getElementById('authEmail').value='person@example.invalid';state.context.document.getElementById('authPassword').value='long-password';await state.elements.get('#authform').handlers.submit({preventDefault(){}});assert.equal(state.signup().options.data.nickname,'ChosenNick');assert.equal(state.signup().options.emailRedirectTo,'https://example.invalid/');
});
test('chat merges large IDs without precision loss and escapes user labels',()=>{
 const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const context={window:{ynSync:{getUser:()=>null},addEventListener(){}},setInterval(){},YndsiProfile:require('../profile-model.js'),profileAvatar:p=>esc(p.name),esc};vm.createContext(context);vm.runInContext(fs.readFileSync('social-ui.js','utf8'),context);
 const result=context.mergeChatMessages([{id:'9007199254740993',body:'old'}],[{id:'9007199254740992',body:'earlier'},{id:'9007199254740993',body:'updated'}]);assert.equal(result.length,2);assert.equal(result[0].id,'9007199254740992');assert.equal(result[1].body,'updated');
 const rendered=context.socialLinks([{code:'ABCDEF123456',name:'<img onerror=alert(1)>',status:'accepted'}]);assert.equal(rendered.includes('<img onerror'),false);assert.ok(rendered.includes('&lt;img'));
});
test('identity sync updates chosen nickname and avatar without publishing private bio',async()=>{
 let sent,fail=false;
 const client={rpc:async(name,args)=>{sent={name,args};return fail?{error:{message:'offline'}}:{data:null,error:null}}};
 const context={workspaceAccess:true,window:{ynSync:{getUser:()=>null,getClient:()=>client},addEventListener(){}},setInterval(){}};
 vm.createContext(context);vm.runInContext(fs.readFileSync('social-ui.js','utf8'),context);
 context.window.ynSync.getUser=()=>({id:'owner'});
 vm.runInContext("social.home={profile:{name:'Old',bio:'Public bio',avatar:'',code:'ABCDEF123456',profile_completed:true},links:[]}",context);
 await context.publishSocialIdentity({name:'MyNick',avatar:'data:image/webp;base64,AAAA',bio:'Private notes'});
 assert.equal(sent.name,'yn_social_profile');assert.equal(sent.args.p_name,'MyNick');assert.equal(sent.args.p_bio,'Public bio');assert.equal(sent.args.p_avatar,'data:image/webp;base64,AAAA');
 assert.equal(vm.runInContext('social.home.profile.name',context),'MyNick');
 fail=true;await assert.rejects(()=>context.publishSocialIdentity({name:'Unsaved',avatar:''}),/offline/);assert.equal(vm.runInContext('social.home.profile.name',context),'MyNick');
});

test('first-login profile gate leads only to settings and disappears after completion',async()=>{
 const state=setup(false);await new Promise(setImmediate);
 state.context.YndsiProfile=require('../profile-model.js');
 state.context.window.ynSocial.profile={code:'ABCDEF123456',name:'Игрок',avatar:'',bio:'',profile_completed:false};
 vm.runInContext(fs.readFileSync('profile-ui.js','utf8'),state.context);
 vm.runInContext("go('friends')",state.context);assert.equal(vm.runInContext('page',state.context),'settings');
 const markup=state.elements.get('#view').innerHTML;assert.ok(markup.includes('Сохранить и начать'));assert.equal(markup.includes('Экспортировать JSON'),true);
 state.context.window.ynSocial.profile.profile_completed=true;vm.runInContext("go('friends')",state.context);assert.equal(vm.runInContext('page',state.context),'friends');
});
