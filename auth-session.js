(function(root){
 const KEY='yndsi_auth_session_v1',PREF='yndsi_auth_remember';
 function create(local,session){let remembered=true;const memory=new Map();try{remembered=local?.getItem(PREF)!=='0'}catch{remembered=false}
 const read=(store,key)=>{try{return store?.getItem(key)||null}catch{return memory.get(key)||null}},write=(store,key,value)=>{try{store?.setItem(key,value);if(!store)memory.set(key,value)}catch{memory.set(key,value)}},remove=(store,key)=>{try{store?.removeItem(key)}catch{}memory.delete(key)};
 return {get remembered(){return remembered},choose(value){value=!!value;if(value!==remembered){const old=remembered?local:session,next=value?local:session,saved=read(old,KEY);if(saved)write(next,KEY,saved);remove(old,KEY);remembered=value}write(local,PREF,value?'1':'0');if(!value)remove(local,KEY)},save(value){if(!value?.access_token||!value.refresh_token)return;write(remembered?local:session,KEY,JSON.stringify(value));remove(remembered?session:local,KEY)},load(){try{return JSON.parse(read(remembered?local:session,KEY)||'null')}catch{return null}},clear(){remove(local,KEY);remove(session,KEY)},migrate(legacyKey){const raw=read(local,legacyKey);remove(local,legacyKey);if(!remembered||!raw)return null;try{const value=JSON.parse(raw);if(value?.access_token&&value.refresh_token){if(!this.load())this.save(value);return value}}catch{}return null},key:KEY};
 }
 const api={create};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.YndsiAuthSession=api;
})(globalThis);
