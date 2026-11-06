(function(root){
 const zone='Asia/Atyrau',formatters=new Map();
 function validZone(value){try{new Intl.DateTimeFormat('en',{timeZone:value}).format();return typeof value==='string'&&!!value}catch{return false}}
 function localParts(value,timeZone=zone){
  const date=new Date(value);if(!Number.isFinite(date.getTime()))return null;if(!validZone(timeZone))throw Error('Неизвестный часовой пояс');
  if(!formatters.has(timeZone)){if(formatters.size>64)formatters.clear();formatters.set(timeZone,new Intl.DateTimeFormat('en-GB',{timeZone,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}))}
  const parts=Object.fromEntries(formatters.get(timeZone).formatToParts(date).map(p=>[p.type,p.value]));return {date:`${parts.year}-${parts.month}-${parts.day}`,time:`${parts.hour}:${parts.minute}`};
 }
 function resolve(date,time,timeZone=zone){
  if(!/^\d{4}-\d{2}-\d{2}$/.test(date||'')||!/^([01]\d|2[0-3]):[0-5]\d$/.test(time||''))throw Error('Укажи корректные дату и время');
  if(!validZone(timeZone))throw Error('Выбери часовой пояс из списка');const wall=Date.parse(`${date}T${time}:00Z`);if(!Number.isFinite(wall))throw Error('Некорректная дата');
  const offsets=new Set();for(let h=-36;h<=36;h+=6){const instant=wall+h*3600000,p=localParts(instant,timeZone);offsets.add(Date.parse(`${p.date}T${p.time}:00Z`)-instant)}
  return [...offsets].map(offset=>wall-offset).filter(instant=>{const p=localParts(instant,timeZone);return p.date===date&&p.time===time}).sort((a,b)=>a-b).map(instant=>new Date(instant).toISOString());
 }
 function toUTC(date,time,timeZone=zone,occurrence='earlier'){const choices=resolve(date,time,timeZone);if(!choices.length)throw Error('Такой даты или времени нет в выбранном часовом поясе. Проверь перевод часов.');return occurrence==='later'?choices[choices.length-1]:choices[0]}
 function instant(stream){if(stream.startsAt&&Number.isFinite(Date.parse(stream.startsAt)))return Date.parse(stream.startsAt);try{return Date.parse(toUTC(stream.date,stream.time,stream.timeZone||zone))}catch{return NaN}}
 function next(streams,now=Date.now()){return streams.filter(s=>s.status==='Запланирован'&&instant(s)>=now).sort((a,b)=>instant(a)-instant(b))[0]||null}
 function title(stream,games){return games.find(g=>g.id===stream.gameId)?.title||stream.game||'Игра не указана'}
 function label(value,timeZone=zone){try{return new Intl.DateTimeFormat('ru-RU',{timeZone,timeZoneName:'shortOffset'}).formatToParts(new Date(value)).find(p=>p.type==='timeZoneName')?.value||timeZone}catch{return timeZone}}
 const model={zone,validZone,localParts,resolve,toUTC,instant,next,title,label};if(typeof module!=='undefined'&&module.exports)module.exports=model;else root.YndsiSchedule=model;
})(typeof globalThis!=='undefined'?globalThis:this);
