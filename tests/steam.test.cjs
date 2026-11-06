const {test}=require('node:test');const assert=require('node:assert/strict');
const {score,normalize}=require('../lib/steam.cjs');
test('score uses sample confidence and review volume without inventing player counts',()=>{
 assert.equal(score(9,9),null);assert.equal(score(101,100),null);
 assert.ok(score(950,1000)>score(500,1000));assert.ok(score(950,1000)>score(95000,100000));
 for(const n of [10,100,1000,1000000])assert.ok(score(n,n)>=0&&score(n,n)<=100);
});
test('missing metrics stay unknown',()=>{const g=normalize({steam_appid:10,name:'Test'});assert.equal(g.reviews,null);assert.equal(g.players,null);assert.equal(g.duration,null);assert.equal(g.gemsScore,null)});
const {handler}=require('../netlify/functions/steam');
test('API fails closed before contacting Steam',async()=>{assert.equal((await handler({httpMethod:'POST'})).statusCode,405);assert.equal((await handler({httpMethod:'GET',headers:{}})).statusCode,503)});
test('owner auth, pagination, App ID and upstream errors',async()=>{
 process.env.SUPABASE_URL='https://example.supabase.co';process.env.SUPABASE_PUBLISHABLE_KEY='public-test';process.env.OWNER_USER_ID='owner';
 const original=global.fetch;let user='other',broken=false;const urls=[];
 global.fetch=async url=>{url=String(url);urls.push(url);if(url.includes('/auth/'))return {ok:true,json:async()=>({id:user})};if(broken)throw Error('offline');if(url.includes('/search/'))return {ok:true,json:async()=>({results_html:'<a data-ds-appid="12345"></a>',total_count:30})};if(url.includes('appdetails'))return {ok:true,json:async()=>({'12345':{success:true,data:{type:'game',steam_appid:12345,name:'Example'}}})};return {ok:true,json:async()=>new URL(url).searchParams.get('filter')==='all'?{query_summary:{total_reviews:100,total_positive:95}}:{reviews:[]}}};
 const e={httpMethod:'GET',headers:{authorization:'Bearer test.token'},queryStringParameters:{q:'Example',page:'2'}};
 try{
 assert.equal((await handler({...e,headers:{}})).statusCode,401);
 assert.equal((await handler(e)).statusCode,403);assert.equal(urls.length,1);
 user='owner';const r=await handler(e);assert.equal(r.statusCode,200);const data=JSON.parse(r.body);assert.equal(data.games[0].appId,12345);assert.equal(data.games[0].reviews.percent,95);assert.ok(data.games[0].gemsScore>0);assert.equal(data.hasMore,true);assert.ok(urls.some(u=>u.includes('start=12')));
 assert.equal((await handler({...e,queryStringParameters:{q:'12345'}})).statusCode,200);
 assert.equal((await handler({...e,queryStringParameters:{page:'-1'}})).statusCode,400);
 broken=true;assert.equal((await handler({...e,queryStringParameters:{q:'Uncached'}})).statusCode,502);
 }finally{global.fetch=original;delete process.env.SUPABASE_URL;delete process.env.SUPABASE_PUBLISHABLE_KEY;delete process.env.OWNER_USER_ID}
});

test('invalid review summaries never produce a fabricated score',()=>{
 for(const summary of [{},{total_reviews:100},{total_reviews:1,total_positive:2}]){
 const g=normalize({steam_appid:10,name:'Test'},{query_summary:summary});assert.equal(g.reviews,null);assert.equal(g.gemsScore,null);
 }
 assert.equal(score(undefined,100),null);
});
