(function(root){
 const accents={violet:{name:'Фиолетовый',color:'#a58bff'},cyan:{name:'Бирюзовый',color:'#63dfd0'},rose:{name:'Розовый',color:'#f58ab3'},amber:{name:'Янтарный',color:'#f0c56d'}};
 function validZone(value){try{new Intl.DateTimeFormat('en',{timeZone:value}).format();return typeof value==='string'&&!!value}catch{return false}}
 function deviceZone(){return Intl.DateTimeFormat().resolvedOptions().timeZone||'UTC'}
 function clean(value={}){if(!value||typeof value!=='object')value={};return {timeZone:validZone(value.timeZone)?value.timeZone:null,name:String(value.name||'YNDSI').trim().slice(0,32)||'YNDSI',bio:String(value.bio||'').trim().slice(0,160),accent:Object.hasOwn(accents,value.accent)?value.accent:'violet',avatar:typeof value.avatar==='string'&&value.avatar.length<=180000&&/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/]+=*$/.test(value.avatar)?value.avatar:''};}
 function initials(name){return String(name||'Y').trim().split(/\s+/).slice(0,2).map(s=>Array.from(s)[0]||'').join('').toUpperCase()||'Y'}
 const model={accents,clean,initials,validZone,deviceZone};if(typeof module!=='undefined'&&module.exports)module.exports=model;else root.YndsiProfile=model;
})(typeof globalThis!=='undefined'?globalThis:this);
