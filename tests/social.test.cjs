const {test}=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
const html=fs.readFileSync('index.html','utf8');const scripts=[...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)].map(m=>m[1]).filter(s=>s.trim());
function setup(owner){
 const elements=new Map(),classes=new Set();const get=id=>{if(!elements.has(id))elements.set(id,{textContent:'',innerHTML:'',value:'',style:{},addEventListener(){},classList:{toggle(){},add(){},remove(){}}});return elements.get(id)};
 const local={streams:[],games:[{id:'private',title:'PRIVATE OWNER DATA'}],notes:[],tasks:[],folders:[]};let workspaceReads=0,writes=0;
 const client={rpc:async()=>({data:owner,error:null}),from(){workspaceReads++;return {select(){return this},eq(){return this},maybeSingle:async()=>({data:{data:local},error:null})}},auth:{getSession:async()=>({data:{session:{user:{id:'guest-or-owner',email:'test@example.invalid'}}}}),onAuthStateChange(){}}};
 const context={console,Date,JSON,structuredClone,Event:class{},setTimeout:()=>1,clearTimeout(){},confirm:()=>true,localStorage:{getItem:()=>JSON.stringify(local),setItem(){writes++}},document:{querySelector:s=>get(s),querySelectorAll:()=>[],getElementById:id=>get('#'+id),body:{dataset:{},classList:{add:c=>classes.add(c),remove:c=>classes.delete(c)}}},window:{supabase:{createClient:()=>client},dispatchEvent(){},ynSocial:{reset(){},render(){get('#view').innerHTML='FRIENDS ONLY'}}}};
 vm.createContext(context);vm.runInContext(scripts[0],context);vm.runInContext(scripts.find(s=>s.includes('const SUPABASE_URL=')),context);
 return {context,elements,classes,reads:()=>workspaceReads,writes:()=>writes};
}
test('invited friend never loads or saves the owner workspace and routes only to friends',async()=>{
 const state=setup(false);await new Promise(setImmediate);assert.equal(state.reads(),0);assert.equal(state.classes.has('session-ready'),true);
 assert.equal(state.context.document.body.dataset.role,'friend');assert.equal(state.elements.get('#view').innerHTML.includes('PRIVATE OWNER DATA'),false);
 vm.runInContext("go('settings');save()",state.context);assert.equal(vm.runInContext('page',state.context),'friends');assert.equal(state.writes(),0);
 assert.equal(vm.runInContext('db.games.length',state.context),0);
});
test('verified owner retains workspace loading',async()=>{const state=setup(true);await new Promise(setImmediate);assert.equal(state.reads(),1);assert.equal(state.context.document.body.dataset.role,'owner');assert.equal(state.classes.has('session-ready'),true)});
test('chat merges large IDs without precision loss and escapes user labels',()=>{
 const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const context={window:{ynSync:{getUser:()=>null},addEventListener(){}},setInterval(){},YndsiProfile:require('../profile-model.js'),profileAvatar:p=>esc(p.name),esc};vm.createContext(context);vm.runInContext(fs.readFileSync('social-ui.js','utf8'),context);
 const result=context.mergeChatMessages([{id:'9007199254740993',body:'old'}],[{id:'9007199254740992',body:'earlier'},{id:'9007199254740993',body:'updated'}]);assert.equal(result.length,2);assert.equal(result[0].id,'9007199254740992');assert.equal(result[1].body,'updated');
 const rendered=context.socialLinks([{code:'ABCDEF123456',name:'<img onerror=alert(1)>',status:'accepted'}]);assert.equal(rendered.includes('<img onerror'),false);assert.ok(rendered.includes('&lt;img'));
});
