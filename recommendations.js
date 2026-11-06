(function(root){
 const interests=[{id:'1667',name:'Хоррор',words:['horror','хоррор']},{id:'122',name:'RPG',words:['rpg','ролев']},{id:'9',name:'Стратегии',words:['strategy','стратег']},{id:'599',name:'Симуляторы',words:['simulation','симулятор']},{id:'21',name:'Приключения',words:['adventure','приключ']},{id:'19',name:'Экшен',words:['action','экшен']},{id:'492',name:'Инди',words:['indie','инди']}];
 function preference(games){
  const weights=new Map();
  for(const game of games){
   if(['Брошено','Заброшено'].includes(game.status)||(Number(game.rating)>0&&Number(game.rating)<5))continue;
   const text=(Array.isArray(game.genres)?game.genres.join(' '):game.genre||'').toLowerCase();
   const weight=1+(game.favorite?3:0)+(Number(game.rating)>=8?2:0);
   for(const interest of interests)if(interest.words.some(w=>text.includes(w)))weights.set(interest.id,(weights.get(interest.id)||0)+weight);
  }
  return interests.filter(i=>weights.has(i.id)).sort((a,b)=>weights.get(b.id)-weights.get(a.id))[0]||null;
 }
 function candidates(games,owned,mode){
  const ids=new Set(owned.map(g=>String(g.appId||g.id?.replace(/^steam/,''))));
  const titles=new Set(owned.map(g=>g.title?.trim().toLowerCase()).filter(Boolean));
  return games.filter(g=>!g.comingSoon&&!ids.has(String(g.appId))&&!titles.has(g.title.trim().toLowerCase())&&g.reviews&&g.reviews.total>=(mode==='gems'?50:20)&&g.reviews.percent>=(mode==='gems'?85:80));
 }
 const model={interests,preference,candidates};if(typeof module!=='undefined'&&module.exports)module.exports=model;else root.YndsiDiscovery=model;
})(typeof globalThis!=='undefined'?globalThis:this);
