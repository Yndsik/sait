(function(root){
 const reserved=new Set(['admin','administrator','rivlo','yndsi','support','help','settings','profile','privacy','developer','official','moderator','system','login','signup','api','null','undefined']);
 function normalize(value){return String(value||'').trim().replace(/^@/,'').toLowerCase()}
 const valid=value=>/^[a-z][a-z0-9_]{2,23}$/.test(value)&&!reserved.has(value);
 function parse(value,origin){const text=String(value||'').trim();if(/^https?:\/\//i.test(text)){try{const url=new URL(text);if(url.origin!==origin||url.username||url.password||url.pathname!=='/'||url.hash)return null;const h=normalize(url.searchParams.get('u'));return valid(h)?h:null}catch{return null}}const h=normalize(text);return valid(h)?h:null}
 function link(handle,origin){return valid(handle)?new URL('/?u='+encodeURIComponent(handle),origin).href:null}
 function clean(p){if(!p||!valid(p.handle)||!/^[A-F0-9]{12}$/.test(p.code))return null;return {cover:['auto','aurora','ocean','sunset','forest','ember','cosmos','ice','orchid'].includes(p.cover)?p.cover:'auto',coverImage:typeof p.coverImage==='string'&&p.coverImage.length<=360000&&/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/]+=*$/.test(p.coverImage)?p.coverImage:'',code:p.code,handle:p.handle,name:String(p.name||p.handle).slice(0,32),bio:String(p.bio||'').slice(0,160),avatar:typeof p.avatar==='string'&&p.avatar.length<=180000&&/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/]+=*$/.test(p.avatar)?p.avatar:'',verified:p.verified===true,followers:Number.isSafeInteger(p.followers)&&p.followers>=0?p.followers:null,schedule:p.schedule||null}}
 const api={normalize,valid,parse,link,clean};if(typeof module==='object'&&module.exports)module.exports=api;root.RivloHandles=api;
})(typeof globalThis!=='undefined'?globalThis:this);
