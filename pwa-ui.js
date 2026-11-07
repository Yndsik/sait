(()=>{
 let prompt=null;if(window.Capacitor?.isNativePlatform?.())document.documentElement.classList.add('native-app');
 const standalone=()=>window.Capacitor?.isNativePlatform?.()||window.matchMedia('(display-mode: standalone)').matches||navigator.standalone===true;
 function installPanel(){return `<section class="card install-panel"><div><span class="eyebrow">YNDSI С СОБОЙ</span><h2>Как приложение на телефоне</h2><p class="muted">${standalone()?'Ты уже открыл YNDSI с главного экрана.':'Добавь YNDSI на главный экран: своя иконка и отдельное окно.'}</p></div><button class="btn primary" type="button" onclick="ynInstall.open()">${standalone()?'Об установленной версии':'Установить на телефон'}</button><p class="tiny">Для переписки и синхронизации нужен интернет. Сайт и установленная версия используют один аккаунт; при первом открытии может понадобиться вход.</p></section>`}
 function close(){document.getElementById('installDialog')?.close()}
 async function open(){
  if(prompt&&!standalone()){const event=prompt;prompt=null;try{await event.prompt();await event.userChoice;return}catch{}}
  let dialog=document.getElementById('installDialog');if(!dialog){dialog=document.createElement('dialog');dialog.id='installDialog';dialog.className='media-dialog';dialog.setAttribute('aria-label','Установка YNDSI');document.body.appendChild(dialog);dialog.addEventListener('click',e=>{if(e.target===dialog)close()})}
  dialog.innerHTML=`<h2>${standalone()?'YNDSI на твоём телефоне':'Добавить YNDSI на главный экран'}</h2>${standalone()?'<p>Это установленная версия нашего сайта. Новые возможности появляются вместе с обновлениями сайта.</p>':'<p><b>На iPhone:</b></p><ol class="install-steps"><li>Открой этот сайт в <b>Safari</b>.</li><li>Нажми <b>«Поделиться»</b> — квадрат со стрелкой вверх (иногда он находится в меню браузера).</li><li>Выбери <b>«На экран Домой»</b>. Если есть переключатель «Открывать как веб-приложение», включи его.</li><li>Нажми <b>«Добавить»</b> и открой иконку YNDSI на главном экране.</li></ol><p class="tiny">На Android: меню Chrome → «Установить приложение» или «Добавить на главный экран».</p>'}<p class="muted">Камера и микрофон запросят разрешение при записи. Push при закрытом приложении пока не подключён.</p><form method="dialog"><button class="btn primary">Понятно</button></form>`;
  if(!dialog.open)dialog.showModal();
 }
 window.ynInstall={open};
 const before=settings;settings=function(){return (window.Capacitor?.isNativePlatform?.()?'':'<section class="card install-panel"><span class="eyebrow">ПРИЛОЖЕНИЕ ДЛЯ ANDROID</span><h2>YNDSI теперь на Android</h2><p class="muted">Первая тестовая версия доступна только на Android. Бесплатный APK, Android 7.0+.</p><a class="btn primary" href="/android.html">Скачать для Android</a></section>')+installPanel()+before()};
 window.addEventListener('beforeinstallprompt',event=>{event.preventDefault();prompt=event});
 window.addEventListener('appinstalled',()=>{prompt=null;if(typeof page!=='undefined'&&page==='settings')render()});
 if('serviceWorker' in navigator&&location.protocol==='https:')window.addEventListener('load',()=>{navigator.serviceWorker.register('/sw.js',{updateViaCache:'none'}).catch(()=>{})});
})();
