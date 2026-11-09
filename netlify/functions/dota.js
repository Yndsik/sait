const model=require('../../dota-model.js');
// Bounded public read proxy. Isolate limits are a backstop, not edge-wide DDoS protection.
function createService({fetcher=(...args)=>fetch(...args),now=()=>Date.now()}={}){
 const cache=new Map(),pending=new Map(),limits=new Map();let heroes=null,cooldown=0;
 const bounded=(map,key,value,max)=>{if(map.size>=max&&!map.has(key))map.delete(map.keys().next().value);map.set(key,value)};
 const reply=(statusCode,data)=>({statusCode,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':statusCode===200?'public, max-age=120':'no-store','X-Content-Type-Options':'nosniff',...(statusCode===429?{'Retry-After':'60'}:{})},body:JSON.stringify(data)});
 async function get(path){const r=await fetcher('https://api.opendota.com/api/'+path,{signal:AbortSignal.timeout(8000),redirect:'error',headers:{Accept:'application/json'}});if(r.status===429){cooldown=now()+60000;throw Error('RATE')}if(!r.ok)throw Error('UPSTREAM');let text='';if(r.body?.getReader){const reader=r.body.getReader();let size=0;const decoder=new TextDecoder();try{while(true){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>300000){await reader.cancel();throw Error('UPSTREAM')}text+=decoder.decode(value,{stream:true})}text+=decoder.decode()}finally{reader.releaseLock()}}else{text=await r.text();if(text.length>300000)throw Error('UPSTREAM')}try{return JSON.parse(text)}catch{throw Error('UPSTREAM')}}
 return async event=>{
  if(event.httpMethod!=='GET')return reply(405,{error:'METHOD'});const id=model.account(event.queryStringParameters?.id);if(!id)return reply(400,{error:'ID'});
  const time=now(),ip=event.headers?.['x-nf-client-connection-ip']||'unknown',bucket=limits.get(ip);if(bucket&&bucket.until>time&&bucket.count>=12)return reply(429,{error:'RATE'});bounded(limits,ip,bucket&&bucket.until>time?{...bucket,count:bucket.count+1}:{count:1,until:time+60000},1024);
  const hit=cache.get(id);if(hit?.until>time)return reply(200,hit.value);if(cooldown>time)return reply(429,{error:'RATE'});
  try{if(!pending.has(id)){if(pending.size>=4)return reply(429,{error:'RATE'});const job=(async()=>{const [profile,matches]=await Promise.all([get('players/'+id),get('players/'+id+'/recentMatches')]);if(!heroes||heroes.until<now()){try{const value=await get('heroes');if(Array.isArray(value))heroes={value,until:now()+86400000}}catch{ /* Numeric hero ID is an honest fallback. */ }}const value={id,...model.normalize(profile,matches,heroes?.value),fetchedAt:new Date(now()).toISOString(),source:'OpenDota'};bounded(cache,id,{value,until:now()+120000},64);return value})();pending.set(id,job);job.finally(()=>pending.delete(id)).catch(()=>{})}return reply(200,await pending.get(id))}catch(e){return reply(e.message==='RATE'?429:503,{error:e.message==='RATE'?'RATE':'UNAVAILABLE'})}
 }
}
exports.createService=createService;const service=createService();exports.handler=service;exports.handleWithEnv=service;
