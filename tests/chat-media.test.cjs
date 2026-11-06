const {test}=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
const model=require('../chat-media-model.js');
test('media policy restricts types, sizes and duration',()=>{
 assert.equal(model.validate('voice','audio/webm;codecs=opus',100,2),'audio/webm');assert.equal(model.validate('photo','image/jpeg',1024,null),'image/jpeg');
 for(const args of [['photo','image/svg+xml',10,null],['voice','audio/mp4',0,1],['video','video/mp4',21*1024*1024,2],['video','video/mp4',100,31],['voice','audio/mp4',100,121],['voice','audio/mp4',100,NaN]])assert.throws(()=>model.validate(...args));
 assert.equal(model.format('voice',t=>t==='audio/mp4'),'audio/mp4');assert.equal(model.format('video',()=>false),null);
});
function setup(getUserMedia){
 const fields=new Map();const $=id=>{if(!fields.has(id))fields.set(id,{value:'',textContent:'',innerHTML:'',hidden:false,disabled:false});return fields.get(id)};let stops=0,created=0,preview=0,moved='';
 const stream={getTracks:()=>[{stop(){stops++}}]};
 class Recorder{constructor(){created++;this.mimeType='audio/mp4';this.state='inactive'}static isTypeSupported(type){return type==='audio/mp4'}start(){this.state='recording'}pause(){this.state='paused'}resume(){this.state='recording'}stop(){this.state='inactive';this.ondataavailable?.({data:new Blob(['voice'],{type:'audio/mp4'})});this.onstop?.()}}
 const context={Blob,Date,URL:{createObjectURL:()=> 'blob:test',revokeObjectURL(){}},YndsiMedia:model,MediaRecorder:Recorder,navigator:{mediaDevices:{getUserMedia:getUserMedia||(()=>Promise.resolve(stream))}},document:{getElementById:()=>null,addEventListener(){}},window:{ynSync:{getClient:()=>null,getUser:()=>({id:'sender'})}},social:{chat:{code:'ABCDEF123456'}},setInterval:()=>1,clearInterval(){},go:p=>{moved=p},toast(){},$,esc:s=>String(s)};
 vm.createContext(context);vm.runInContext(fs.readFileSync('chat-media-ui.js','utf8'),context);vm.runInContext(fs.readFileSync('recorder-ui.js','utf8'),context);context.mediaDialogBody=()=>{};context.showMediaPreview=()=>{preview++};
 return {context,stream,stops:()=>stops,created:()=>created,preview:()=>preview,moved:()=>moved};
}
test('cancel while permission is pending stops the subsequently granted stream',async()=>{
 let grant;const state=setup(()=>new Promise(resolve=>{grant=resolve}));const pending=state.context.startChatRecording('voice');state.context.cancelChatMedia();grant(state.stream);await pending;assert.equal(state.stops(),1);assert.equal(state.created(),0);
});
test('stopping a voice recording releases microphone and prepares a preview',async()=>{const state=setup();await state.context.startChatRecording('voice');state.context.stopChatRecording();assert.equal(state.stops(),1);assert.equal(state.preview(),1);assert.equal(vm.runInContext('mediaDraft.blob.type',state.context),'audio/mp4')});
test('leaving the chat cancels recording and releases microphone',async()=>{const state=setup();await state.context.startChatRecording('voice');state.context.go('dashboard');assert.equal(state.stops(),1);assert.equal(state.preview(),0);assert.equal(state.moved(),'dashboard')});

test('retry after lost send acknowledgement reuses the uploaded attachment',async()=>{
 const state=setup();let uploads=0,prepares=0,sends=0,refreshes=0;
 state.context.window.ynSync.getClient=()=>({storage:{from:()=>({upload:async()=>{uploads++;return {error:null}}})}});
 state.context.socialRPC=async name=>{if(name==='yn_media_prepare'){prepares++;return {id:'12345678-1234-1234-1234-123456789abc',path:'sender/file.jpg'}}if(name==='yn_social_send_media'){sends++;if(sends===1)throw Error('network response lost');return null}};
 state.context.refreshFriendChat=async()=>{refreshes++};
 vm.runInContext("mediaDraft.kind='photo';mediaDraft.code='ABCDEF123456';mediaDraft.blob=new Blob(['photo'],{type:'image/jpeg'})",state.context);
 await state.context.sendChatMedia();assert.equal(uploads,1);assert.equal(prepares,1);assert.equal(vm.runInContext('mediaDraft.uploaded',state.context),true);
 await state.context.sendChatMedia();assert.equal(uploads,1);assert.equal(prepares,1);assert.equal(sends,2);assert.equal(refreshes,1);assert.equal(vm.runInContext('mediaDraft.entry',state.context),null);
});

test('pause time is excluded and cancellation while paused releases the microphone',async()=>{
 assert.equal(model.elapsed(1000,11000,2000,8000),5);
 assert.equal(model.clock(65),'01:05');
 const state=setup();await state.context.startChatRecording('voice');
 state.context.pauseChatRecording();assert.equal(vm.runInContext('mediaDraft.recorder.state',state.context),'paused');
 state.context.pauseChatRecording();assert.equal(vm.runInContext('mediaDraft.recorder.state',state.context),'recording');
 state.context.pauseChatRecording();state.context.cancelChatMedia();assert.equal(state.stops(),1);assert.equal(state.preview(),0);
});

test('video camera swap preserves the recording track and microphone; cancel stops all tracks',async()=>{
 const state=setup(),c=state.context;let micStops=0,frontStops=0,rearStops=0,canvasStops=0;
 const mic={stop(){micStops++}},front={stop(){frontStops++}},rear={stop(){rearStops++},getSettings:()=>({facingMode:'environment'})},canvas={stop(){canvasStops++}};
 const stream=(video,audio=[])=>({getTracks:()=>[...video,...audio],getVideoTracks:()=>video,getAudioTracks:()=>audio});
 const nodes=new Map();c.$=id=>{if(!nodes.has(id))nodes.set(id,{style:{setProperty(){}},classList:{add(){},remove(){},toggle(){}},play:()=>Promise.resolve(),readyState:2,videoWidth:640,videoHeight:480});return nodes.get(id)};
 c.document.createElement=()=>({captureStream:()=>stream([canvas]),getContext:()=>({drawImage(){}})});
 c.requestAnimationFrame=()=>1;c.cancelAnimationFrame=()=>{};c.MediaStream=function(tracks){return stream(tracks.filter(t=>t!==mic),tracks.filter(t=>t===mic))};
 c.MediaRecorder.isTypeSupported=()=>true;let calls=0;c.navigator.mediaDevices.getUserMedia=async()=>++calls===1?stream([front],[mic]):stream([rear]);
 await c.startChatRecording('video');assert.equal(state.created(),0);c.beginVideoRecording();
 const recording=vm.runInContext('mediaDraft.recordStream',c);assert.equal(recording.getVideoTracks()[0],canvas);
 await c.flipRecordingCamera();assert.equal(vm.runInContext('mediaDraft.recordStream',c),recording);assert.equal(micStops,0);assert.equal(frontStops,1);
 c.cancelChatMedia();assert.equal(micStops,1);assert.equal(rearStops,1);assert.equal(canvasStops,1);
});
