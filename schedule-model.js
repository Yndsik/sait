(function(root){
 const zone='Asia/Atyrau';
 function localParts(value){
  const date=new Date(value);if(!Number.isFinite(date.getTime()))return null;
  const parts=Object.fromEntries(new Intl.DateTimeFormat('en-GB',{timeZone:zone,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(date).map(p=>[p.type,p.value]));
  return {date:`${parts.year}-${parts.month}-${parts.day}`,time:`${parts.hour}:${parts.minute}`};
 }
 function toUTC(date,time){
  if(!/^\d{4}-\d{2}-\d{2}$/.test(date||'')||!/^([01]\d|2[0-3]):[0-5]\d$/.test(time||''))throw Error('Укажи корректные дату и время');
  // Resolve the IANA zone rather than the device timezone; check the round trip.
  const wall=Date.parse(`${date}T${time}:00Z`);if(!Number.isFinite(wall))throw Error('Некорректная дата');
  let instant=wall;
  for(let i=0;i<3;i++){const parts=localParts(instant);const observed=Date.parse(`${parts.date}T${parts.time}:00Z`);instant+=wall-observed;}
  const parts=localParts(instant);if(parts.date!==date||parts.time!==time)throw Error('Некорректная дата');
  return new Date(instant).toISOString();
 }
 function instant(stream){
  if(stream.startsAt&&Number.isFinite(Date.parse(stream.startsAt)))return Date.parse(stream.startsAt);
  try{return Date.parse(toUTC(stream.date,stream.time))}catch{return NaN}
 }
 function next(streams,now=Date.now()){
  return streams.filter(s=>s.status==='Запланирован'&&instant(s)>=now).sort((a,b)=>instant(a)-instant(b))[0]||null;
 }
 function title(stream,games){return games.find(g=>g.id===stream.gameId)?.title||stream.game||'Игра не указана'}
 const model={zone,localParts,toUTC,instant,next,title};if(typeof module!=='undefined'&&module.exports)module.exports=model;else root.YndsiSchedule=model;
})(typeof globalThis!=='undefined'?globalThis:this);
