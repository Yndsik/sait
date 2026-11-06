let profileDraft=null,avatarBusy=false,avatarRequest=0;
function profileAvatar(p,large=false){return `<span class="profile-avatar ${large?'large':''}">${p.avatar?`<img src="${esc(p.avatar)}" alt="Иконка профиля">`:esc(YndsiProfile.initials(p.name))}</span>`}
function currentProfile(){
 const local=YndsiProfile.clean(db.profile),shared=window.ynSocial?.profile;
 if(!shared)return local;
 const fresh=!shared.profile_completed&&shared.name==='Игрок'&&!shared.avatar;
 return {...local,name:fresh?(workspaceOwner?local.name:''):shared.name,avatar:fresh&&workspaceOwner?local.avatar:shared.avatar,bio:workspaceOwner?local.bio:shared.bio};
}
function profileForm(){
 const p=profileDraft||currentProfile(),shared=window.ynSocial?.profile,first=shared?.profile_completed===false;
 return `<section class="card profile-editor"><div class="profile-banner"><div><span class="eyebrow">ТВОЁ ПРОСТРАНСТВО</span><h2>${first?'Добро пожаловать.':'Твой профиль.'}</h2><p>${first?'Придумай ник и выбери аватарку перед началом общения.':'Ник и аватарка меняются только здесь.'}</p></div><span class="profile-decoration" aria-hidden="true">✦</span></div><div class="profile-layout"><aside class="profile-preview"><div id="profilePreview">${profileAvatar(p,true)}<h3>${esc(p.name)}</h3><p>${esc(p.bio||'Здесь начинается следующий стрим.')}</p></div><span class="pill">${first?'Первый вход':'Твой аккаунт'}</span>${shared?`<p class="tiny">Постоянный ID</p><code>${esc(shared.code)}</code><p class="tiny">Не меняется при смене ника, фото или устройства.</p>`:''}</aside><form id="profileForm" onsubmit="event.preventDefault();saveProfile()"><div class="fg"><label for="profileName">Имя / никнейм</label><input id="profileName" class="field" maxlength="32" required value="${esc(p.name)}" placeholder="Придумай свой ник" oninput="previewProfile()"></div><div class="fg"><label for="profileBio">О себе</label><textarea id="profileBio" class="field" maxlength="160" placeholder="Во что играешь и какие истории ищешь" oninput="previewProfile()">${esc(p.bio)}</textarea></div><fieldset class="profile-colors" ${workspaceOwner?'':'style="display:none"'}><legend>Цвет акцента</legend>${Object.entries(YndsiProfile.accents).map(([key,a])=>`<label class="accent-choice"><input type="radio" name="profileAccent" value="${key}" ${p.accent===key?'checked':''} onchange="previewProfile()"><span style="--swatch:${a.color}"></span>${a.name}</label>`).join('')}</fieldset><div class="actions"><label class="btn">Загрузить иконку<input type="file" id="profileFile" accept="image/png,image/jpeg,image/webp" hidden onchange="uploadProfileAvatar(this)"></label><button type="button" class="btn" onclick="removeProfileAvatar()">Убрать иконку</button></div><p class="tiny">JPG, PNG или WebP до 8 МБ. Фото автоматически обрезается по центру и уменьшается. Ник и иконка используются также в общении с друзьями. ${workspaceOwner?'Описание рабочего профиля остаётся личным.':'Описание видно друзьям.'} Фото необязательно — вместо него будут инициалы.</p><p id="profileMessage" class="tiny" role="status"></p><div class="actions"><button class="btn primary" id="profileSave">${first?'Сохранить и начать':'Сохранить профиль'}</button><button type="button" class="btn" ${first?'style="display:none"':''} onclick="cancelProfile()">Отменить изменения</button></div></form></div></section>`;
}
const beforeProfileSettings=settings;
settings=function(){return profileForm()+`<section class="card" style="margin-top:20px"><h2>Безопасность аккаунта</h2><form onsubmit="event.preventDefault();changeProfilePassword()" class="toolbar"><input class="field" id="accountPassword" type="password" minlength="10" required autocomplete="new-password" placeholder="Новый пароль · от 10 символов" aria-label="Новый пароль"><button class="btn" id="accountPasswordSave">Сменить пароль</button></form><p class="tiny" id="accountPasswordStatus" role="status"></p></section>`+(workspaceOwner?`<div style="margin-top:20px">${beforeProfileSettings()}</div>`:'')};
function readProfileDraft(){const current=profileDraft||currentProfile();return YndsiProfile.clean({...current,name:$('#profileName').value,bio:$('#profileBio').value,accent:document.querySelector('[name="profileAccent"]:checked')?.value})}
function previewProfile(){profileDraft=readProfileDraft();$('#profilePreview').innerHTML=profileAvatar(profileDraft,true)+`<h3>${esc(profileDraft.name)}</h3><p>${esc(profileDraft.bio||'Здесь начинается следующий стрим.')}</p>`;$('#profilePreview').style.setProperty('--purple',YndsiProfile.accents[profileDraft.accent].color)}
async function saveProfile(){
 if(avatarBusy){toast('Подожди обработки иконки');return}
 if(!$('#profileForm').reportValidity())return;if(!$('#profileName').value.trim()){toast('Укажи имя профиля');return}
 const first=window.ynSocial?.profile?.profile_completed===false;const profile=readProfileDraft(),session=window.ynSync?.getUser()?.id;const button=$('#profileSave');if(button)button.disabled=true;
 try{await window.ynSocial?.publishIdentity(profile);if(session!==window.ynSync?.getUser()?.id)throw Error('Аккаунт изменился. Открой настройки заново.');profileDraft=null;if(workspaceOwner){db.profile=profile;save()}else render();if(first)go('friends');toast('Профиль сохранён')}
 catch(e){toast('Не удалось сохранить профиль: '+e.message)}finally{if($('#profileSave'))$('#profileSave').disabled=false}
}
function cancelProfile(){avatarRequest++;avatarBusy=false;profileDraft=null;render()}
function removeProfileAvatar(){avatarRequest++;avatarBusy=false;profileDraft={...readProfileDraft(),avatar:''};previewProfile();$('#profileSave').disabled=false;$('#profileMessage').textContent='Иконка будет удалена после сохранения.'}
async function uploadProfileAvatar(input){
 const file=input.files?.[0];if(!file)return;
 if(!['image/png','image/jpeg','image/webp'].includes(file.type)||file.size>8*1024*1024){$('#profileMessage').textContent='Выбери JPG, PNG или WebP размером до 8 МБ.';input.value='';return}
 const request=++avatarRequest;profileDraft=readProfileDraft();avatarBusy=true;$('#profileSave').disabled=true;$('#profileMessage').textContent='Подготавливаем иконку…';const url=URL.createObjectURL(file);
 try{
  const img=new Image();img.src=url;await img.decode();if(request!==avatarRequest)return;
  if(img.naturalWidth*img.naturalHeight>40000000)throw Error('Изображение слишком большое. Выбери фото меньшего разрешения.');
  const canvas=document.createElement('canvas');canvas.width=canvas.height=256;const ctx=canvas.getContext('2d');if(!ctx)throw Error('Не удалось обработать изображение');
  const size=Math.min(img.naturalWidth,img.naturalHeight);if(!size)throw Error('Некорректное изображение');
  ctx.drawImage(img,(img.naturalWidth-size)/2,(img.naturalHeight-size)/2,size,size,0,0,256,256);
  const avatar=canvas.toDataURL('image/webp',0.85);if(avatar.length>180000)throw Error('Иконка слишком большая. Выбери другое изображение.');
  profileDraft={...readProfileDraft(),avatar};if(page==='settings'&&$('#profilePreview')){previewProfile();$('#profileMessage').textContent='Иконка готова. Нажми «Сохранить профиль».'}
 }catch(e){if(request===avatarRequest&&$('#profileMessage'))$('#profileMessage').textContent=e.message||'Не удалось открыть изображение'}
 finally{URL.revokeObjectURL(url);if(request===avatarRequest){avatarBusy=false;if($('#profileSave'))$('#profileSave').disabled=false}input.value=''}
}
function applyProfile(){
 const p=YndsiProfile.clean(currentProfile());document.documentElement.style.setProperty('--purple',YndsiProfile.accents[p.accent].color);
 const avatar=document.querySelector('.topright .avatar');if(avatar){avatar.innerHTML=profileAvatar(p);avatar.title='Настроить профиль: '+p.name;avatar.setAttribute('aria-label',avatar.title)}
 const footer=document.querySelector('.sidefoot');if(footer)footer.innerHTML=`<small>ТВОЁ ПРОСТРАНСТВО</small><b style="display:block;margin:8px 0;overflow-wrap:anywhere">${esc(p.name)}</b><small>${esc(p.bio||'Следующая история начинается здесь.')}</small>`;
}
const beforeProfileRender=render;
render=function(){beforeProfileRender();applyProfile()};
render();

window.ynProfileReset=()=>{avatarRequest++;avatarBusy=false;profileDraft=null};

async function changeProfilePassword(){
 const input=$('#accountPassword');if(!input.reportValidity())return;const button=$('#accountPasswordSave'),status=$('#accountPasswordStatus');button.disabled=true;const session=window.ynSync.getUser()?.id;
 try{const {error}=await window.ynSync.getClient().auth.updateUser({password:input.value});if(error)throw error;if(session!==window.ynSync.getUser()?.id)return;input.value='';toast('Пароль изменён')}catch(e){if(status.isConnected)status.textContent=e.message}finally{if(button.isConnected)button.disabled=false}
}
