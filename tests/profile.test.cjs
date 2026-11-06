const {test}=require('node:test'),assert=require('node:assert/strict');
const {clean,initials}=require('../profile-model.js');
test('profile normalizes names, constrains accents and rejects external or executable avatars',()=>{
 assert.equal(clean({name:'  Yndsi  '}).name,'Yndsi');assert.equal(clean({name:'   '}).name,'YNDSI');
 assert.equal(clean({accent:'red;url(x)'}).accent,'violet');assert.equal(clean({name:'x'.repeat(100)}).name.length,32);
 for(const avatar of ['javascript:alert(1)','https://example.com/photo.png','data:image/svg+xml;base64,PHN2Zz4=','data:image/png;base64,AA" onerror="alert(1)','data:image/png;base64,'+'A'.repeat(180001)])assert.equal(clean({avatar}).avatar,'');
 assert.equal(clean({avatar:'data:image/webp;base64,AAAA'}).avatar,'data:image/webp;base64,AAAA');
 assert.equal(initials('Мой Профиль'),'МП');
});
test('saving and cancelling profile leave game and stream records intact',()=>{
 const fs=require('node:fs'),vm=require('node:vm');let saves=0;
 const fields={'#profileForm':{reportValidity:()=>true},'#profileName':{value:'Новый ник'},'#profileBio':{value:'Хорроры и инди'}};
 const context={window:{},workspaceOwner:true,YndsiProfile:require('../profile-model.js'),settings:()=>'',render(){},db:{profile:{name:'Old'},games:[{id:'g'}],streams:[{id:'s'}]},$:s=>fields[s],save(){saves++},toast(){},document:{documentElement:{style:{setProperty(){}}},querySelector:s=>s.includes('profileAccent')?{value:'cyan'}:null}};
 vm.createContext(context);vm.runInContext(fs.readFileSync('profile-ui.js','utf8'),context);
 context.cancelProfile();assert.equal(context.db.profile.name,'Old');assert.equal(saves,0);
 context.saveProfile();assert.equal(context.db.profile.name,'Новый ник');assert.equal(context.db.profile.accent,'cyan');assert.equal(saves,1);assert.equal(context.db.games[0].id,'g');assert.equal(context.db.streams[0].id,'s');
 fields['#profileName'].value='  ';context.saveProfile();assert.equal(saves,1);
});
