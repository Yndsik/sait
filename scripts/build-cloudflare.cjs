const fs=require('node:fs'),path=require('node:path'),{buildSync}=require('esbuild');
const publicConfig=JSON.parse(fs.readFileSync(path.resolve(__dirname,'../wrangler.jsonc'),'utf8'));
if(!process.env.TURNSTILE_SITE_KEY&&publicConfig.vars?.TURNSTILE_SITE_KEY)process.env.TURNSTILE_SITE_KEY=publicConfig.vars.TURNSTILE_SITE_KEY;
require('./build.cjs');
const root=path.resolve(__dirname,'..'),dist=path.join(root,'dist');
buildSync({entryPoints:[path.join(root,'cloudflare/worker.js')],outfile:path.join(dist,'_worker.js'),bundle:true,format:'esm',platform:'browser',target:'es2022',external:['node:crypto','node:buffer'],minify:true,legalComments:'none',banner:{js:"import * as nodeCrypto from 'node:crypto';import * as nodeBuffer from 'node:buffer';const require=name=>{if(name==='node:crypto')return nodeCrypto;if(name==='node:buffer')return nodeBuffer;throw Error('Unsupported module')};"}});
fs.writeFileSync(path.join(dist,'_routes.json'),JSON.stringify({version:1,include:['/.netlify/functions/*','/api/*'],exclude:[]},null,2)+'\n');
// Reuse the established static security policy instead of maintaining a divergent copy.
const config=fs.readFileSync(path.join(root,'netlify.toml'),'utf8');const rules=[];
for(const block of config.split('[[headers]]').slice(1)){const pattern=block.match(/for\s*=\s*"([^"]+)"/)?.[1];if(!pattern)continue;const values=[...block.matchAll(/^\s{4}([A-Za-z][A-Za-z-]*)\s*=\s*"(.*)"\s*$/gm)].map(m=>'  '+m[1]+': '+m[2]);if(values.length)rules.push(pattern+'\n'+values.join('\n'))}
// Root gets explicit no-store, so account transitions cannot reuse cached HTML.
rules.push('/\n  Cache-Control: no-store');fs.writeFileSync(path.join(dist,'_headers'),rules.join('\n\n')+'\n');
// A real 404 prevents unknown API or source paths from falling back to the application shell.
fs.writeFileSync(path.join(dist,'404.html'),'<!doctype html><html lang="ru"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>YNDSI · 404</title><body style="background:#101820;color:#e4eedb;font:18px system-ui;padding:10vw"><h1>404</h1><p>Страница не найдена / Page not found</p><a style="color:#c6ef72" href="/">На главную / Home</a></body></html>');
console.log('Cloudflare Pages build ready: static assets + narrowly routed Worker APIs.');
