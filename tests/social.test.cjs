const {test}=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
const html=fs.readFileSync('index.html','utf8');const scripts=[...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)].map(m=>m[1]).filter(s=>s.trim());
function setup(owner){
 const elements=new Map(),classes=new Set();const get=id=>{if(!elements.has(id))elements.set(id,{textContent:'',innerHTML:'',value:'',style:{},setAttribute(){},addEventListener(){},classList:{toggle(){},add(){},remove(){}}});return elements.get(id)};
 const local={streams:[],games:[{id:'private',title:'PRIVATE OWNER DATA'}],notes:[],tasks:[],folders:[]};let workspaceReads=0,writes=0;
 const client={rpc:async()=>({data:owner,error:null}),from(){workspaceReads++;return {select(){return this},eq(){return this},maybeSingle:async()=>({data:{data:local},error:null})}},auth:{getSession:async()=>({data:{session:{user:{id:'guest-or-owner',email:'test@example.invalid'}}}}),onAuthStateChange(){}}};
 const context={console,Date,JSON,structuredClone,Event:class{},setTimeout:()=>1,clearTimeout(){},confirm:()=>true,localStorage:{getItem:()=>JSON.stringify(local),setItem(){writes++}},document:{documentElement:{style:{setProperty(){}}},querySelector:s=>get(s),querySelectorAll:()=>[],getElementById:id=>get('#'+id),body:{dataset:{},classList:{add:c=>classes.add(c),remove:c=>classes.delete(c)}}},window:{supabase:{createClient:()=>client},dispatchEvent(){},ynSocial:{reset(){},render(){get('#view').innerHTML='FRIENDS ONLY'}}}};
 vm.createContext(context);vm.runInContext(scripts[0],context);vm.runInContext(scripts.find(s=>s.includes('const SUPABASE_URL=')),context);
 return {context,elements,classes,reads:()=>workspaceReads,writes:()=>writes};
}
test('invited friend never loads or saves the owner workspace and routes private tools to friends while allowing profile settings',async()=>{
 const state=setup(false);await new Promise(setImmediate);assert.equal(state.reads(),0);assert.equal(state.classes.has('session-ready'),true);
 assert.equal(state.context.document.body.dataset.role,'friend');assert.equal(state.elements.get('#view').innerHTML.includes('PRIVATE OWNER DATA'),false);
 vm.runInContext("go('settings');save()",state.context);assert.equal(vm.runInContext('page',state.context),'settings');vm.runInContext("go('library')",state.context);assert.equal(vm.runInContext('page',state.context),'friends');assert.equal(state.writes(),0);
 assert.equal(vm.runInContext('db.games.length',state.context),0);
});
test('verified owner retains workspace loading',async()=>{const state=setup(true);await new Promise(setImmediate);assert.equal(state.reads(),1);assert.equal(state.context.document.body.dataset.role,'owner');assert.equal(state.classes.has('session-ready'),true)});
test('chat merges large IDs without precision loss and escapes user labels',()=>{
 const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const context={window:{ynSync:{getUser:()=>null},addEventListener(){}},setInterval(){},YndsiProfile:require('../profile-model.js'),profileAvatar:p=>esc(p.name),esc};vm.createContext(context);vm.runInContext(fs.readFileSync('social-ui.js','utf8'),context);
 const result=context.mergeChatMessages([{id:'9007199254740993',body:'old'}],[{id:'9007199254740992',body:'earlier'},{id:'9007199254740993',body:'updated'}]);assert.equal(result.length,2);assert.equal(result[0].id,'9007199254740992');assert.equal(result[1].body,'updated');
 const rendered=context.socialLinks([{code:'ABCDEF123456',name:'<img onerror=alert(1)>',status:'accepted'}]);assert.equal(rendered.includes('<img onerror'),false);assert.ok(rendered.includes('&lt;img'));
});
test('identity sync updates chosen nickname and avatar without publishing private bio',async()=>{
 let sent,fail=false;
 const client={rpc:async(name,args)=>{sent={name,args};return fail?{error:{message:'offline'}}:{data:null,error:null}}};
 const context={workspaceOwner:true,window:{ynSync:{getUser:()=>null,getClient:()=>client},addEventListener(){}},setInterval(){}};
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
 const markup=state.elements.get('#view').innerHTML;assert.ok(markup.includes('Сохранить и начать'));assert.equal(markup.includes('Экспортировать JSON'),false);
 state.context.window.ynSocial.profile.profile_completed=true;vm.runInContext("go('friends')",state.context);assert.equal(vm.runInContext('page',state.context),'friends');
});
