(()=>{
 const key=window.YNDSI_AUTH_CONFIG?.turnstileSiteKey||'';let token='',widget=null,loading=false;
 function status(text){const node=document.getElementById('captchaStatus');if(node)node.textContent=text}
 function mount(){if(!key||widget!==null||!window.turnstile)return;const box=document.getElementById('authCaptcha');if(!box)return;widget=window.turnstile.render(box,{sitekey:key,theme:'dark',size:'flexible',callback:value=>{token=value;status('Проверка пройдена')},'expired-callback':()=>{token='';status('Пройди проверку ещё раз')},'error-callback':()=>{token='';status('Не удалось загрузить проверку. Обнови страницу.')}})}
 function show(){if(!key)return;const box=document.getElementById('captchaArea');if(box)box.hidden=false;if(window.turnstile){mount();return}if(loading)return;loading=true;status('Загружаем проверку…');const script=document.createElement('script');script.src='https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';script.async=true;script.onload=mount;script.onerror=()=>{loading=false;status('Проверка недоступна. Проверь подключение и обнови страницу.')};document.head.appendChild(script)}
 function reset(){token='';if(widget!==null&&window.turnstile){window.turnstile.reset(widget);status('Подтверди, что ты не робот')}}
 window.ynCaptcha={show,reset,getToken(){if(!key)return undefined;if(!token)throw Error('Подтверди, что ты не робот');return token}};
 document.addEventListener('DOMContentLoaded',()=>{if(document.getElementById('authback')?.classList?.contains('show'))show()});
})();
