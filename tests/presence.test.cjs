const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
function setup(rpc){let interval;const node={dataset:{presenceCode:'AAAAAAAAAAAA'},innerHTML:''};const c={workspaceAccess:false,page:'messages',social:{chat:{code:'AAAAAAAAAAAA'}},profileForm:()=>'',esc:s=>String(s??''),currentTimeZone:()=> 'UTC',$:()=>null,document:{hidden:false,querySelectorAll:()=>[node],addEventListener(){}},window:{ynSync:{getUser:()=>null},ynSocial:{reset(){}},addEventListener(){}},setInterval:fn=>{interval=fn},socialRPC:rpc};vm.createContext(c);vm.runInContext(fs.readFileSync('presence-ui.js','utf8'),c);return {c,node,tick:()=>interval()}}
test('presence paints server-confirmed online and typing states, never invents presence',async()=>{
 let peer={code:'AAAAAAAAAAAA',online:true,typing:false,last_seen:'2026-11-07T12:00:00Z'};
 const s=setup(async name=>name==='yn_presence_home'?{visible:true,peers:[peer]}:null);assert.equal(s.c.window.ynPresence.status('AAAAAAAAAAAA'),'Уточняем статус…');
 s.c.workspaceAccess=true;s.c.window.ynSync.getUser=()=>({id:'me'});await s.tick();assert.ok(s.node.innerHTML.includes('в сети'));
 peer={...peer,typing:true};await s.tick();assert.ok(s.node.innerHTML.includes('печатает'));
 peer={...peer,typing:false,online:false};await s.tick();assert.ok(s.node.innerHTML.includes('Последний раз:'));assert.ok(s.node.innerHTML.includes('12:00'));
 s.c.window.ynPresence.reset();assert.equal(s.c.window.ynPresence.status('AAAAAAAAAAAA'),'Уточняем статус…');
});
test('late presence responses cannot restore another account status after reset',async()=>{
 let release;const s=setup(name=>name==='yn_presence_home'?new Promise(resolve=>{release=resolve}):Promise.resolve());s.c.workspaceAccess=true;s.c.window.ynSync.getUser=()=>({id:'me'});
 const pending=s.tick();await new Promise(setImmediate);s.c.window.ynPresence.reset();release({visible:true,peers:[{code:'AAAAAAAAAAAA',online:true}]});await pending;assert.equal(s.c.window.ynPresence.status('AAAAAAAAAAAA'),'Уточняем статус…');
});

test('last seen is enabled by default and an existing opt-out is preserved',async()=>{const s=setup(async name=>name==='yn_presence_home'?{visible:false,peers:[]}:null);assert.match(s.c.window.ynPresence.panel(),/type="checkbox" checked/);s.c.workspaceAccess=true;s.c.window.ynSync.getUser=()=>({id:'me'});await s.tick();assert.doesNotMatch(s.c.window.ynPresence.panel(),/type="checkbox" checked/);assert.equal(s.c.window.ynPresence.status('AAAAAAAAAAAA'),'Последнее посещение недоступно');await s.tick();assert.doesNotMatch(s.c.window.ynPresence.panel(),/type="checkbox" checked/)});
