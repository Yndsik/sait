const {Buffer}=require('node:buffer');
const visitors=new Map();
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
exports.handleWithEnv=async(event,env)=>{
 const reply=(statusCode,value)=>({statusCode,headers:{'Content-Type':'application/json','Cache-Control':statusCode===200&&event.httpMethod==='GET'?'public, max-age=20':'no-store'},body:JSON.stringify(value)});
 if(!['GET','POST'].includes(event.httpMethod))return reply(405,{error:'Method not allowed'});
 let args={},rpc='yn_site_online_count';
 if(event.httpMethod==='POST'){
  if(!String(event.headers?.['content-type']||'').toLowerCase().startsWith('application/json'))return reply(415,{error:'JSON required'});
  if(event.requestOrigin&&event.headers?.origin!==event.requestOrigin)return reply(403,{error:'Origin not allowed'});
  if(Buffer.byteLength(event.body||'')>256)return reply(413,{error:'Request too large'});
  let token;try{token=JSON.parse(event.body).visitor}catch{return reply(400,{error:'Invalid visitor'})}
  if(!uuid.test(token||''))return reply(400,{error:'Invalid visitor'});
  // Best-effort edge-instance throttle; database also throttles updates for each visitor token.
  const ip=event.headers?.['x-nf-client-connection-ip'];if(ip){const now=Date.now(),previous=visitors.get(ip);if(previous&&previous.until>now&&previous.hits>=30)return reply(429,{error:'Try later'});if(visitors.size>5000){for(const [key,row] of visitors)if(row.until<=now)visitors.delete(key);if(visitors.size>5000)visitors.delete(visitors.keys().next().value)}visitors.set(ip,{until:previous?.until>now?previous.until:now+60000,hits:previous?.until>now?previous.hits+1:1})}
  args={p_visitor:token};rpc='yn_site_visit';
 }
 try{
  const response=await fetch(env.SUPABASE_URL+'/rest/v1/rpc/'+rpc,{method:'POST',headers:{apikey:env.SUPABASE_PUBLISHABLE_KEY,'Content-Type':'application/json'},body:JSON.stringify(args),signal:AbortSignal.timeout(4000)});
  if(!response.ok)throw Error();
  if(event.httpMethod==='POST')return reply(200,{ok:true});
  const count=await response.json();if(!Number.isSafeInteger(count)||count<0)throw Error();return reply(200,{count,windowSeconds:90});
 }catch{return reply(503,{error:'Count unavailable'})}
};
exports.handler=event=>exports.handleWithEnv({...event,requestOrigin:event.headers?.host?'https://'+event.headers.host:undefined},process.env);
