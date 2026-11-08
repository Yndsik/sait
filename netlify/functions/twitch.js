// Public Twitch data only. Application credentials never reach the browser.
function createService({fetcher=(...args)=>fetch(...args),now=()=>Date.now()}={}){
 const cache=new Map(),pending=new Map(),limits=new Map();let token=null,tokenJob=null,credentials='',cooldown=0;
 const reply=(statusCode,value,extra={})=>({statusCode,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff',...extra},body:JSON.stringify(value)});
 const bounded=(map,key,value,max)=>{if(map.size>=max&&!map.has(key))map.delete(map.keys().next().value);map.set(key,value)};
 async function json(response){const text=await response.text();if(text.length>300000)throw Error('UPSTREAM');try{return JSON.parse(text)}catch{throw Error('UPSTREAM')}}
 async function appToken(env){if(token&&token.until>now())return token.value;if(!tokenJob){tokenJob=(async()=>{const response=await fetcher('https://id.twitch.tv/oauth2/token',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({client_id:env.TWITCH_CLIENT_ID,client_secret:env.TWITCH_CLIENT_SECRET,grant_type:'client_credentials'}),signal:AbortSignal.timeout(7000)});if(!response.ok)throw Error('CONFIG');const data=await json(response);if(typeof data.access_token!=='string'||!/^[A-Za-z0-9_-]{8,4096}$/.test(data.access_token)||!Number.isFinite(data.expires_in)||data.expires_in<1)throw Error('CONFIG');token={value:data.access_token,until:now()+Math.max(0,Math.min(data.expires_in,3600)-60)*1000};return token.value})().finally(()=>{tokenJob=null})}return tokenJob}
 async function helix(path,env,retry=true){const access=await appToken(env),response=await fetcher('https://api.twitch.tv/helix/'+path,{headers:{'Client-Id':env.TWITCH_CLIENT_ID,Authorization:'Bearer '+access},signal:AbortSignal.timeout(7000)});if(response.status===401&&retry){if(token?.value===access)token=null;return helix(path,env,false)}if(response.status===429){cooldown=now()+30000;throw Error('RATE')}if(!response.ok)throw Error(response.status===401?'CONFIG':'UPSTREAM');const data=await json(response);if(!Array.isArray(data.data))throw Error('UPSTREAM');return data}
 function image(value){try{const url=new URL(value);return url.protocol==='https:'&&url.hostname==='static-cdn.jtvnw.net'&&!url.username&&!url.password&&!url.port?url.href:''}catch{return ''}}
 function clean(row,exact=false){const id=String(row.id||''),login=String(exact?row.login:row.broadcaster_login||'').toLowerCase();if(!/^[0-9]{1,24}$/.test(id)||!/^[a-z0-9_]{1,25}$/.test(login))return null;return {id,login,name:String(row.display_name||login).slice(0,80),avatar:image(exact?row.profile_image_url:row.thumbnail_url),url:'https://www.twitch.tv/'+login,description:exact?String(row.description||'').slice(0,300):'',live:exact?null:row.is_live===true,game:exact?'':String(row.game_name||'').slice(0,100),title:exact?'':String(row.title||'').slice(0,200)}}
 return async function handle(event,env={}){
  if(event.httpMethod!=='GET')return reply(405,{error:'METHOD'},{Allow:'GET'});
  const q=String(event.queryStringParameters?.q||'').trim(),after=String(event.queryStringParameters?.after||'');
  if(!q||q.length>80||/[\u0000-\u001f\u007f]/.test(q)||after.length>512||!/^[A-Za-z0-9_=+\/-]*$/.test(after))return reply(400,{error:'QUERY'});
  if(!/^[A-Za-z0-9]{5,100}$/.test(env.TWITCH_CLIENT_ID||'')||!env.TWITCH_CLIENT_SECRET)return reply(503,{error:'NOT_CONFIGURED'});
  const signature=env.TWITCH_CLIENT_ID+':'+env.TWITCH_CLIENT_SECRET;if(credentials!==signature){credentials=signature;token=null;cache.clear();cooldown=0}
  // Per-isolate backstop, not a replacement for edge-wide rate limiting.
  const ip=event.headers?.['x-nf-client-connection-ip']||'unknown',bucket=limits.get(ip),time=now();
  if(bucket&&bucket.until>time&&bucket.count>=30)return reply(429,{error:'RATE'},{'Retry-After':'60'});
  bounded(limits,ip,bucket&&bucket.until>time?{...bucket,count:bucket.count+1}:{count:1,until:time+60000},2048);
  const key=q.toLowerCase()+':'+after,hit=cache.get(key);if(hit&&hit.until>time)return reply(200,hit.value);
  if(cooldown>time)return reply(429,{error:'RATE'},{'Retry-After':'30'});
  try{if(!pending.has(key)){if(pending.size>=12)return reply(429,{error:'RATE'},{'Retry-After':'5'});const job=(async()=>{
   const params=new URLSearchParams({query:q,first:'12',live_only:'false'});if(after)params.set('after',after);
   const exact=!after&&/^[A-Za-z0-9_]{1,25}$/.test(q)?helix('users?'+new URLSearchParams({login:q.toLowerCase()}),env).then(d=>d.data.map(r=>clean(r,true)).filter(Boolean)):Promise.resolve([]);
   const [search,users]=await Promise.all([helix('search/channels?'+params,env),exact]);const rows=search.data.slice(0,12).map(r=>clean(r)).filter(Boolean),seen=new Set();
   const items=[...users.map(u=>{const s=rows.find(r=>r.id===u.id);return s?{...u,live:s.live,game:s.game,title:s.title}:u}),...rows].filter(r=>!seen.has(r.id)&&seen.add(r.id));
   const cursor=typeof search.pagination?.cursor==='string'&&search.pagination.cursor.length<=512&&/^[A-Za-z0-9_=+\/-]*$/.test(search.pagination.cursor)?search.pagination.cursor:'';
   const value={items,cursor};bounded(cache,key,{value,until:now()+45000},128);return value;
  })();pending.set(key,job);job.finally(()=>pending.delete(key)).catch(()=>{})}return reply(200,await pending.get(key))}catch(e){if(e.message==='RATE')return reply(429,{error:'RATE'},{'Retry-After':'30'});return reply(503,{error:e.message==='CONFIG'?'NOT_CONFIGURED':'UNAVAILABLE'})}
 }
}
exports.createService=createService;const service=createService();exports.handleWithEnv=service;exports.handler=event=>service(event,process.env);
