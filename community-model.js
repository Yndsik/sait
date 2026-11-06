(function(root){
 function newAlerts(previous,rows,baseline){return baseline?[]:rows.filter(r=>BigInt(r.last_id)>BigInt(previous[r.code]||'0')).slice(0,3)}
 function remember(previous,rows){const next={...previous};for(const r of rows)if(BigInt(r.last_id)>BigInt(next[r.code]||'0'))next[r.code]=r.last_id;return next}
 function publicEntries(entries){return (Array.isArray(entries)?entries:[]).filter(e=>Number.isFinite(Date.parse(e.startsAt))&&typeof e.title==='string').map(e=>({title:e.title,game:String(e.game||''),startsAt:e.startsAt})).sort((a,b)=>Date.parse(a.startsAt)-Date.parse(b.startsAt))}
 const model={newAlerts,remember,publicEntries};if(typeof module!=='undefined'&&module.exports)module.exports=model;else root.YndsiCommunity=model;
})(typeof globalThis!=='undefined'?globalThis:this);
