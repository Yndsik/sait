import steam from '../netlify/functions/steam.js';
import news from '../netlify/functions/news.js';
import online from '../netlify/functions/online.js';
import twitch from '../netlify/functions/twitch.js';

function response(result){return new Response(result.body,{status:result.statusCode,headers:{...result.headers,'X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer','X-Frame-Options':'DENY'}})}
export default {
 async fetch(request,env,context){
  const url=new URL(request.url),path=url.pathname;
  if(path==='/api/online'||path==='/.netlify/functions/online'){const key=new Request(new URL('/api/online',url),{method:'GET'}),cache=typeof caches!=='undefined'?caches.default:null;if(request.method==='GET'&&cache){const hit=await cache.match(key);if(hit)return hit}if(request.method==='POST'&&Number(request.headers.get('content-length')||0)>256)return new Response('Request too large',{status:413});const body=request.method==='POST'?await request.text():undefined;const result=response(await online.handleWithEnv({httpMethod:request.method,body,requestOrigin:url.origin,headers:{'content-type':request.headers.get('content-type')||'',origin:request.headers.get('origin')||'','x-nf-client-connection-ip':request.headers.get('cf-connecting-ip')||''}},env));if(request.method==='GET'&&result.status===200&&cache&&context?.waitUntil)context.waitUntil(cache.put(key,result.clone()));return result}
  if(path==='/api/twitch'||path==='/.netlify/functions/twitch'){return response(await twitch.handleWithEnv({httpMethod:request.method,queryStringParameters:Object.fromEntries(url.searchParams),headers:{'x-nf-client-connection-ip':request.headers.get('cf-connecting-ip')||''}},env))}
  const isSteam=path==='/.netlify/functions/steam'||path==='/api/steam',isNews=path==='/.netlify/functions/news'||path==='/api/news';
  if(!isSteam&&!isNews){if(path.startsWith('/api/')||path.startsWith('/.netlify/functions/'))return response({statusCode:404,headers:{'Content-Type':'application/json','Cache-Control':'no-store'},body:'{"error":"Not found"}'});return env.ASSETS.fetch(request)}
  let cacheKey,edgeCache;
  if(isNews&&request.method==='GET'&&typeof caches!=='undefined'){const language=url.searchParams.get('lang')||'ru',mode=url.searchParams.get('mode')||'news',game=url.searchParams.get('game')||'all';if(['ru','en'].includes(language)&&['news','updates','deals'].includes(mode)&&['all','dota2','cs2','apex','pubg'].includes(game)){const cacheURL=new URL('/api/news',url);cacheURL.search=new URLSearchParams({lang:language,mode,game}).toString();cacheKey=new Request(cacheURL,{method:'GET'});edgeCache=caches.default;const hit=await edgeCache.match(cacheKey);if(hit)return hit}}
  // Never trust a client-provided Netlify IP header on Cloudflare.
  const event={httpMethod:request.method,queryStringParameters:Object.fromEntries(url.searchParams),headers:{authorization:request.headers.get('authorization')||'','x-nf-client-connection-ip':request.headers.get('cf-connecting-ip')||''}};
  try{const result=response(isSteam?await steam.handleWithEnv(event,{SUPABASE_URL:env.SUPABASE_URL,SUPABASE_PUBLISHABLE_KEY:env.SUPABASE_PUBLISHABLE_KEY,OWNER_USER_ID:env.OWNER_USER_ID,STEAM_SHARED_RATE_LIMIT:env.STEAM_SHARED_RATE_LIMIT}):await news.handler(event));if(edgeCache&&cacheKey&&result.status===200&&context?.waitUntil)context.waitUntil(edgeCache.put(cacheKey,result.clone()));return result}catch{return response({statusCode:503,headers:{'Content-Type':'application/json','Cache-Control':'no-store'},body:'{"error":"Service temporarily unavailable"}'})}
 }
};
