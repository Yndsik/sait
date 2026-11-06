const {interests}=require('../../recommendations.js');
const {normalize}=require('../../lib/steam.cjs');
const cache=new Map(), pending=new Map(),requests=new Map(),attempts=new Map();let active=0;
async function remote(url, ttl=900000) {
  const hit=cache.get(url); if(hit?.expires>Date.now())return hit.value;
  if(pending.has(url))return pending.get(url);
  const job=(async()=>{const r=await fetch(url,{signal:AbortSignal.timeout(10000)});if(!r.ok)throw Error('HTTP '+r.status);let value;try{value=await r.json()}catch{throw Error('INVALID_JSON')} ;if(cache.size>=500)cache.delete(cache.keys().next().value);cache.set(url,{value,expires:Date.now()+ttl});return value;})();
  pending.set(url,job);try{return await job}finally{pending.delete(url)}
}
async function detail(id){
  const data=await remote(`https://store.steampowered.com/api/appdetails?appids=${id}&l=russian&cc=KZ`);
  if(!data[id]?.success||data[id].data.type!=='game')return null;
  let reviewsError=null;
  const reviewURL=new URL('https://api.steampowered.com/IUserReviewsService/GetAppReviews/v1/');
  reviewURL.searchParams.set('input_json',JSON.stringify({appid:Number(id),filter:0,languages:['all'],day_range:0,review_type:0,purchase_type:1,num_per_page:1,display_language:'russian'}));
  const reviews=await remote(reviewURL.toString()).catch(e=>{reviewsError=/^HTTP \d{3}$/.test(e.message)?e.message:e.message==='INVALID_JSON'?'Ответ Steam не является JSON':'Сеть или время ожидания';return null});
  const game=normalize(data[id].data,reviews);
  if(!game.reviews)game.reviewsError=reviewsError||'В ответе Steam нет корректной сводки отзывов';
  return game;
}
async function handle(event){
  const reply=(statusCode,data)=>({statusCode,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff',...(statusCode===429?{'Retry-After':'60'}:{})},body:JSON.stringify(data)});
  if(event.httpMethod!=='GET')return reply(405,{error:'Метод не поддерживается'});
  const p=event.queryStringParameters||{},q=typeof p.q==='string'?p.q.trim():'',page=Number(p.page||1);
  if(q.length>100||!Number.isInteger(page)||page<1||page>100)return reply(400,{error:'Некорректный запрос'});
  const base=process.env.SUPABASE_URL,key=process.env.SUPABASE_PUBLISHABLE_KEY;
  if(!base||!key)return reply(503,{error:'Нужна настройка серверного доступа: SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY.'});
  const token=event.headers?.authorization||event.headers?.Authorization;
  if(!/^Bearer [\w.-]+$/.test(token||''))return reply(401,{error:'Войди в аккаунт'});
  const ip=event.headers?.['x-nf-client-connection-ip'];if(ip){const now=Date.now(),entry=attempts.get(ip);if(entry&&entry.until>now){if(entry.count++>=60)return reply(429,{error:'Слишком много запросов. Подожди минуту.'})}else{if(attempts.size>=2000)attempts.delete(attempts.keys().next().value);attempts.set(ip,{count:1,until:now+60000})}}
  try{
    const r=await fetch(new URL('/auth/v1/user',base),{headers:{apikey:key,Authorization:token},signal:AbortSignal.timeout(8000)});
    if(!r.ok)return reply(401,{error:'Сессия истекла. Войди снова.'});
    const member=await r.json();
    if(!member.id||(!member.email_confirmed_at&&!member.invited_at&&member.id!==process.env.OWNER_USER_ID))return reply(403,{error:'Подтверди электронную почту'});
    if(process.env.STEAM_SHARED_RATE_LIMIT==='true'){const quota=await fetch(new URL('/rest/v1/rpc/yn_steam_quota',base),{method:'POST',headers:{apikey:key,Authorization:token,'Content-Type':'application/json'},body:'{}',signal:AbortSignal.timeout(8000)});if(!quota.ok)return reply(503,{error:'Проверка лимита запросов недоступна'});if(await quota.json()!==true)return reply(429,{error:'Слишком много запросов. Подожди минуту.'})}
    const now=Date.now(),recent=requests.get(member.id);if(recent&&recent.until>now){if(recent.count>=30)return reply(429,{error:'Слишком много запросов. Подожди минуту.'});recent.count++}else{if(requests.size>=2000)requests.delete(requests.keys().next().value);requests.set(member.id,{count:1,until:now+60000})}
  }catch{return reply(503,{error:'Сервис авторизации недоступен'})}
  try{
    if(p.id||/^\d+$/.test(q)){
      const id=p.id||q;if(!/^[1-9]\d{0,9}$/.test(id))return reply(400,{error:'Некорректный App ID'});
      const game=await detail(id);return game?reply(200,{games:[game],total:1,page:1,hasMore:false}):reply(404,{error:'Игра не найдена в Steam'});
    }
    if(p.tag&&!interests.some(i=>i.id===p.tag))return reply(400,{error:'Неизвестное направление'});
    const u=new URL('https://store.steampowered.com/search/results/');
    if(p.tag)u.searchParams.set('tags',p.tag);
    if(p.discovery==='1')u.searchParams.set('filter','popularnew');
    Object.entries({term:q,start:(page-1)*12,count:12,json:1,infinite:1,category1:998,sort_by:p.discovery==='1'||p.gems==='1'?'Released_DESC':'_ASC',l:'russian',cc:'KZ'}).forEach(([k,v])=>u.searchParams.set(k,v));
    const result=await remote(u.toString(),300000);
    const ids=[...new Set([...String(result.results_html||'').matchAll(/data-ds-appid="(\d+)"/g)].map(m=>m[1]))].slice(0,12);
    // Bounded concurrency and partial failures; no full Steam database in the browser.
    const games=[],failed=[];
    for(let i=0;i<ids.length;i+=3){const batch=await Promise.allSettled(ids.slice(i,i+3).map(detail));batch.forEach((r,j)=>{if(r.status==='fulfilled'){if(r.value)games.push(r.value)}else failed.push(ids[i+j])})}
    if(ids.length&&failed.length===ids.length)throw Error('upstream');
    return reply(200,{games,total:Number(result.total_count)||0,page,hasMore:page*12<Number(result.total_count),partial:failed.length>0,fetchedAt:new Date().toISOString()});
  }catch{return reply(502,{error:'Steam временно недоступен. Повтори запрос позже.'})}
}
// Local backpressure bounds fan-out per warm instance; edge/WAF limits are still required for DDoS.
exports.handler=async event=>{if(active>=4)return {statusCode:429,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','Retry-After':'10'},body:JSON.stringify({error:'Сервис занят. Попробуй чуть позже.'})};active++;try{return await handle(event)}finally{active--}};
