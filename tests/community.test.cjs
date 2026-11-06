const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const model=require('../community-model.js');
test('public schedule client accepts only its public display fields',()=>{
 const source=[{title:'Stream',game:'Game',startsAt:'2030-01-01T15:00:00Z',description:'PRIVATE',plan:'PRIVATE',user_id:'PRIVATE'},{title:'Bad date',startsAt:'bad'}];
 const result=model.publicEntries(source);assert.equal(result.length,1);assert.deepEqual(Object.keys(result[0]).sort(),['game','startsAt','title']);assert.ok(source[0].plan);
});
test('notification baseline suppresses old alerts and preserves big message IDs',()=>{
 const rows=[{code:'A',last_id:'9007199254740993'},{code:'B',last_id:'9'}];assert.equal(model.newAlerts({},rows,true).length,0);
 const remembered=model.remember({},rows);assert.equal(model.newAlerts(remembered,rows,false).length,0);
 assert.equal(model.newAlerts(remembered,[{code:'A',last_id:'9007199254740994'}],false).length,1);
 assert.equal(model.remember(remembered,[{code:'A',last_id:'2'}]).A,'9007199254740993');
});
test('shared schedule viewer uses anonymous RPC and escapes displayed text',async()=>{
 let options,called;const elements=new Map();const get=id=>{if(!elements.has(id))elements.set(id,{innerHTML:'',addEventListener(){}});return elements.get(id)};
 const token='12345678-1234-1234-1234-123456789abc';
 const context={URLSearchParams,location:{search:'?s='+token},document:{getElementById:get,hidden:false},setInterval(){},YndsiProfile:require('../profile-model.js'),YndsiCommunity:model,window:{supabase:{createClient:(url,key,opts)=>{options=opts;return {rpc:async(name,args)=>{called={name,args};return {data:{name:'<script>unsafe</script>',entries:[{title:'Live',startsAt:'2030-01-01T15:00:00Z',description:'PRIVATE',plan:'PRIVATE'}]},error:null}}}}}}};
 vm.createContext(context);vm.runInContext(fs.readFileSync('schedule-public.js','utf8'),context);await new Promise(setImmediate);
 assert.equal(options.auth.persistSession,false);assert.equal(options.auth.detectSessionInUrl,false);assert.equal(called.name,'yn_public_schedule');assert.equal(called.args.p_token,token);assert.ok(get('publicSchedule').innerHTML.includes('&lt;script&gt;'));assert.equal(get('publicSchedule').innerHTML.includes('PRIVATE'),false);
});
test('revoking publication does not depend on saving the private workspace',async()=>{
 const calls=[];const context={workspaceAccess:false,profileForm:()=>'',window:{ynSocial:{reset(){}},ynSync:{getUser:()=>null,syncNow:async()=>false},addEventListener(){}},socialRPC:async(name,args)=>{calls.push({name,args});return {enabled:false,selected_ids:[],entries:[]}},$:()=>null,toast(){}};
 vm.createContext(context);vm.runInContext(fs.readFileSync('schedule-sharing-ui.js','utf8'),context);
 await context.publishSchedule(true,['a'],false);assert.equal(calls.length,0);
 await context.publishSchedule(false,[],false);assert.equal(calls.length,1);assert.equal(calls[0].args.p_enabled,false);
});
test('read position ignores hidden chats and outgoing messages',async()=>{
 const calls=[];const context={page:'friends',workspaceAccess:false,social:{chat:{code:'ABCDEF123456'}},profileForm:()=>'',window:{ynSocial:{reset(){}},ynSync:{getUser:()=>null},addEventListener(){}},document:{hidden:true,addEventListener(){}},setInterval(){},socialRPC:async(name,args)=>{calls.push({name,args})}};
 vm.createContext(context);vm.runInContext(fs.readFileSync('notifications-ui.js','utf8'),context);
 const messages=[{id:'9',mine:false},{id:'10',mine:true}];await context.markChatRead('ABCDEF123456',messages);assert.equal(calls.length,0);
 context.document.hidden=false;context.document.querySelector=()=>({});await context.markChatRead('ABCDEF123456',messages);assert.equal(calls.length,0);context.document.querySelector=()=>null;await context.markChatRead('ABCDEF123456',messages);await context.markChatRead('ABCDEF123456',messages);assert.equal(calls.length,1);assert.equal(calls[0].name,'yn_chat_mark_read');assert.equal(calls[0].args.p_through,'9');
});

test('profile schedule renders published fields in viewer timezone',()=>{
 const context={YndsiCommunity:model,currentTimeZone:()=> 'Asia/Tokyo',esc:s=>String(s).replaceAll('<','&lt;'),window:{ynSync:{getClient:()=>null}},document:{addEventListener(){}},go(){}};
 vm.createContext(context);vm.runInContext(fs.readFileSync('chat-media-ui.js','utf8'),context);
 const html=context.profileSchedulePreview({token:'12345678-1234-1234-1234-123456789abc',entries:[{title:'<Live>',game:'Game',startsAt:'2030-01-01T15:00:00Z',description:'PRIVATE',plan:'PRIVATE'}]});
 assert.ok(html.includes('Asia/Tokyo'));assert.ok(html.includes('&lt;Live>'));assert.ok(html.includes('00:00'));assert.ok(!html.includes('PRIVATE'));assert.ok(!context.profileSchedulePreview(null).includes('Live'));
});
