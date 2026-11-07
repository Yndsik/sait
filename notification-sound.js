/* Device-local sound preferences. Never starts audio before a user gesture. */
(()=>{
 let context=null,activated=false,lastPlayed=-Infinity;const overrides=new Map();
 const key=()=> 'yndsi_sound:'+(window.ynSync?.getUser()?.id||'guest');
 function enabled(){if(overrides.has(key()))return overrides.get(key());try{return JSON.parse(localStorage.getItem(key())||'true')!==false}catch{return true}}
 async function unlock(){if(!enabled())return false;try{const Audio=window.AudioContext||window.webkitAudioContext;if(!Audio)return false;if(!context||context.state==='closed')context=new Audio();if(context.state!=='running')await context.resume();activated=context.state==='running';return activated}catch{return false}}
 function status(text){const target=document.getElementById('notificationSoundStatus');if(target)target.textContent=text}
 function play(force=false){if(!enabled()||!activated||context?.state!=='running'||!force&&Date.now()-lastPlayed<2000)return false;try{lastPlayed=Date.now();const now=context.currentTime,gain=context.createGain();gain.connect(context.destination);gain.gain.setValueAtTime(.0001,now);gain.gain.exponentialRampToValueAtTime(.08,now+.015);gain.gain.exponentialRampToValueAtTime(.0001,now+.36);let remaining=2;[660,880].forEach((frequency,i)=>{const oscillator=context.createOscillator();oscillator.frequency.value=frequency;oscillator.connect(gain);oscillator.onended=()=>{oscillator.disconnect();if(!--remaining)gain.disconnect()};oscillator.start(now+i*.1);oscillator.stop(now+.37)});return true}catch{return false}}
 function set(value){overrides.set(key(),!!value);try{localStorage.setItem(key(),JSON.stringify(!!value))}catch{}if(value)unlock().then(ok=>status(ok?'Звук включён. Нажми «Проверить звук».':'Нажми «Проверить звук» и проверь разрешения браузера.'));else status('Звук выключен')}
 async function test(){if(!enabled()){status('Сначала включи звук уведомлений');return}const ok=await unlock();status(ok&&play(true)?'Тестовый сигнал воспроизведён. Проверь громкость устройства.':'Браузер не разрешил звук. Проверь разрешения и громкость устройства.')}
 const gesture=()=>{if(context?.state!=='running')return unlock()};document.addEventListener('pointerdown',gesture,{passive:true});document.addEventListener('keydown',gesture);window.YndsiNoticeSound={enabled,play,set,test};
})();
