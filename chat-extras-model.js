(function(root){
 const validId=id=>typeof id==='string'&&/^[1-9][0-9]{0,19}$/.test(id);
 function parse(value){if(typeof value!=='string')return null;const hit=/^↪ #([1-9][0-9]{0,19})\n> ([^\r\n]{0,180})\n\n([\s\S]*)$/.exec(value);return hit?{id:hit[1],quote:hit[2],body:hit[3]}:null}
 function excerpt(value){const p=parse(value);return String(p?p.body:value||'').replace(/[\r\n\t]+/g,' ').slice(0,180)}
 function encode(body,reply){if(!reply||!validId(String(reply.id)))return body;const value='↪ #'+reply.id+'\n> '+excerpt(reply.quote)+'\n\n'+body;if(value.length>2000)throw Error('REPLY_TOO_LONG');return value}
 function muteCodes(value){return [...new Set((Array.isArray(value)?value:[]).filter(code=>typeof code==='string'&&/^[A-F0-9]{12}$/.test(code)))].slice(0,500)}
 const api={validId,parse,excerpt,encode,muteCodes};if(typeof module==='object'&&module.exports)module.exports=api;root.RivloChatExtras=api;
})(typeof globalThis!=='undefined'?globalThis:this);
