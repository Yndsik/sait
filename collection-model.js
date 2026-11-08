(function(root){
 const statuses=['all','playing','backlog','done','favorites'];
 function status(game){return game.status==='Прохожу сейчас'?'playing':game.status==='Пройдено'?'done':'backlog'}
 function select(games,{query='',filter='all',sort='recent'}={}){const q=String(query).trim().toLocaleLowerCase().slice(0,100),items=(Array.isArray(games)?games:[]).map((game,index)=>({game,index})).filter(({game})=>game&&(!q||String(game.title||'').toLocaleLowerCase().includes(q))&&(filter==='all'||filter==='favorites'&&game.favorite===true||status(game)===filter));return items.sort((a,b)=>sort==='title'?String(a.game.title||'').localeCompare(String(b.game.title||'')):sort==='progress'?(Number(b.game.progress)||0)-(Number(a.game.progress)||0):b.index-a.index)}
 function cover(value){if(typeof value!=='string'||value.length>360000)return '';if(/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/]+=*$/.test(value))return value;try{const u=new URL(value);return u.protocol==='https:'&&!u.username&&!u.password?u.href:''}catch{return ''}}
 function progress(game){const value=Number(game.progress);return Number.isFinite(value)?Math.max(0,Math.min(100,Math.round(value))):0}
 const api={status,statuses,select,cover,progress};if(typeof module==='object'&&module.exports)module.exports=api;root.RivloCollection=api;
})(typeof globalThis!=='undefined'?globalThis:this);
