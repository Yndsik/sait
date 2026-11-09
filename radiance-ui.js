/* Optional atmosphere, stored per account on this device. */
(()=>{
 const root=document.documentElement,view=document.getElementById('view'),t=(ru,en)=>ynI18n.language==='en'?en:ru;let actor=null,style='glow',queued=false;
 const owner=()=>window.ynSync?.getUser()?.id||'guest';
 function read(){actor=owner();try{style=localStorage.getItem('rivlo_atmosphere:'+actor)==='plain'?'plain':'glow'}catch{style='glow'}apply()}
 function apply(){root.dataset.atmosphere=style;view.querySelectorAll('[data-radiance]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.radiance===style)))}
 function scan(){queued=false;if(actor!==owner())read();if(page!=='settings'||view.querySelector('.radiance-settings'))return;const target=view.querySelector('.aura-settings')||view.querySelector('.chroma-settings');if(!target)return;const card=document.createElement('section');card.className='card radiance-settings';card.innerHTML=`<div><span class="eyebrow">${t('АТМОСФЕРА','ATMOSPHERE')}</span><h2>${t('Добавь немного сияния','A little more glow')}</h2><p>${t('Мягкий свет в цвет выбранной темы. Сохраняется на этом устройстве.','Soft light matching your chosen palette. Saved on this device.')}</p></div><div class="radiance-options" role="group" aria-label="${t('Фон интерфейса','Interface background')}">${[['glow','Сияние','Glow'],['plain','Без сияния','No glow']].map(([v,ru,en])=>`<button class="btn" type="button" data-radiance="${v}" onclick="ynRadiance.choose('${v}')">${t(ru,en)}</button>`).join('')}</div>`;target.after(card);apply()}
 function queue(){if(!queued){queued=true;requestAnimationFrame(scan)}}
 window.ynRadiance={choose(value){if(!['glow','plain'].includes(value))return;style=value;try{localStorage.setItem('rivlo_atmosphere:'+owner(),value)}catch{}apply()}};
 new MutationObserver(queue).observe(view,{childList:true,subtree:true});window.addEventListener('yndsi-session',()=>{read();queue()});window.addEventListener('yndsi-language',()=>{view.querySelector('.radiance-settings')?.remove();queue()});read();queue();
})();
