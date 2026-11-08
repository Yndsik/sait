(function(root){
 function date(value){if(!/^\d{4}-\d{2}-\d{2}$/.test(value||''))return null;const n=Date.parse(value+'T12:00:00Z');return Number.isFinite(n)&&new Date(n).toISOString().slice(0,10)===value?n:null}
 function addDays(value,n){const stamp=date(value);return stamp===null?null:new Date(stamp+n*86400000).toISOString().slice(0,10)}
 function monthDays(year,month){const first=new Date(Date.UTC(year,month,1)),offset=(first.getUTCDay()+6)%7,start=addDays(first.toISOString().slice(0,10),-offset),length=Math.ceil((offset+new Date(Date.UTC(year,month+1,0)).getUTCDate())/7)*7;return Array.from({length},(_,i)=>addDays(start,i))}
 function weekDays(value){const stamp=date(value);if(stamp===null)return [];const offset=(new Date(stamp).getUTCDay()+6)%7,start=addDays(value,-offset);return Array.from({length:7},(_,i)=>addDays(start,i))}
 function streams(items,zone,schedule){return (Array.isArray(items)?items:[]).map((stream,index)=>{if(!stream||typeof stream!=='object')return null;const stamp=schedule.instant(stream);if(!Number.isFinite(stamp))return null;return {stream,index,stamp,...schedule.localParts(stamp,zone)}}).filter(Boolean).sort((a,b)=>a.stamp-b.stamp||a.index-b.index)}
 function links(items,filter='accepted',query=''){const q=String(query||'').trim().toLocaleLowerCase();return (Array.isArray(items)?items:[]).filter(p=>p&&/^[A-F0-9]{12}$/.test(p.code)&&(filter==='all'||filter==='accepted'&&p.status==='accepted'||filter==='incoming'&&p.status==='pending'&&p.incoming||filter==='outgoing'&&p.status==='pending'&&!p.incoming||filter==='blocked'&&p.status==='blocked')&&String(p.name||'').toLocaleLowerCase().includes(q))}
 function pins(value){return [...new Set((Array.isArray(value)?value:[]).filter(id=>/^[A-F0-9]{12}$/.test(id)))].slice(0,3)}
 const api={date,addDays,monthDays,weekDays,streams,links,pins};if(typeof module==='object'&&module.exports)module.exports=api;root.RivloOrbit=api;
})(typeof globalThis!=='undefined'?globalThis:this);
