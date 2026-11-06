const {test}=require('node:test'),assert=require('node:assert/strict');
const {clean,initials}=require('../profile-model.js');
test('profile normalizes names, constrains accents and rejects external or executable avatars',()=>{
 assert.equal(clean({name:'  Yndsi  '}).name,'Yndsi');assert.equal(clean({name:'   '}).name,'YNDSI');
 assert.equal(clean({accent:'red;url(x)'}).accent,'violet');assert.equal(clean({name:'x'.repeat(100)}).name.length,32);
 for(const avatar of ['javascript:alert(1)','https://example.com/photo.png','data:image/svg+xml;base64,PHN2Zz4=','data:image/png;base64,AA" onerror="alert(1)','data:image/png;base64,'+'A'.repeat(180001)])assert.equal(clean({avatar}).avatar,'');
 assert.equal(clean({avatar:'data:image/webp;base64,AAAA'}).avatar,'data:image/webp;base64,AAAA');
 assert.equal(initials('Мой Профиль'),'МП');
});
test('saving and cancelling profile leave game and stream records intact',async()=>{
 const fs=require('node:fs'),vm=require('node:vm');let saves=0;
 const fields={'#profileForm':{reportValidity:()=>true},'#profileName':{value:'Новый ник'},'#profileBio':{value:'Хорроры и инди'}};
 const context={window:{},page:'settings',workspaceAccess:true,YndsiProfile:require('../profile-model.js'),settings:()=>'',render(){},db:{profile:{name:'Old'},games:[{id:'g'}],streams:[{id:'s'}]},$:s=>fields[s],save(){saves++},toast(){},document:{documentElement:{style:{setProperty(){}}},querySelector:s=>s.includes('profileAccent')?{value:'cyan'}:null}};
 vm.createContext(context);vm.runInContext(fs.readFileSync('profile-ui.js','utf8'),context);
 context.cancelProfile();assert.equal(context.db.profile.name,'Old');assert.equal(saves,0);
 await context.saveProfile();assert.equal(context.db.profile.name,'Новый ник');assert.equal(context.db.profile.accent,'cyan');assert.equal(saves,1);assert.equal(context.db.games[0].id,'g');assert.equal(context.db.streams[0].id,'s');
 fields['#profileName'].value='  ';await context.saveProfile();assert.equal(saves,1);
});
test('first member setup saves own workspace and shared identity without changing ID',async()=>{
 const fs=require('node:fs'),vm=require('node:vm');let privateSaves=0,destination='';
 const shared={code:'D9307A3BA714',name:'Игрок',bio:'',avatar:'',profile_completed:false};
 const fields={'#profileForm':{reportValidity:()=>true},'#profileName':{value:'MyNickname'},'#profileBio':{value:'Инди'}};
 const context={esc:s=>String(s??''),workspaceAccess:true,page:'settings',YndsiProfile:require('../profile-model.js'),db:{profile:{name:'Owner'},games:[{id:'untouched'}]},settings:()=>'',render(){},$:s=>fields[s],save(){privateSaves++},toast(){},go:p=>{destination=p},document:{documentElement:{style:{setProperty(){}}},querySelector:()=>null},window:{ynSync:{getUser:()=>({id:'friend'})},ynSocial:{profile:shared,publishIdentity:async p=>Object.assign(shared,{name:p.name,avatar:p.avatar,bio:p.bio,profile_completed:true})}}};
 vm.createContext(context);vm.runInContext(fs.readFileSync('profile-ui.js','utf8'),context);
 assert.ok(context.profileForm().includes('D9307A3BA714'));assert.ok(context.profileForm().includes('Сохранить и начать'));
 await context.saveProfile();assert.equal(privateSaves,1);assert.equal(destination,'friends');assert.equal(shared.name,'MyNickname');assert.equal(shared.code,'D9307A3BA714');assert.equal(shared.profile_completed,true);assert.equal(context.db.profile.name,'MyNickname');
});
