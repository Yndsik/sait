let profileDraft=null,avatarBusy=false,avatarRequest=0;
function profileAvatar(p,large=false){return `<span class="profile-avatar ${large?'large':''}">${p.avatar?`<img src="${esc(p.avatar)}" alt="Иконка профиля">`:esc(YndsiProfile.initials(p.name))}</span>`}
function profileForm(){
 const p=profileDraft||YndsiProfile.clean(db.profile);
 return `<section class="card profile-editor"><div class="profile-banner"><div><span class="eyebrow">ТВОЁ ПРОСТРАНСТВО</span><h2>Настрой под себя.</h2><p>Твой профиль, твои цвета, твоя история.</p></div><span class="profile-decoration" aria-hidden="true">✦</span></div><div class="profile-layout"><aside class="profile-preview"><div id="profilePreview">${profileAvatar(p,true)}<h3>${esc(p.name)}</h3><p>${esc(p.bio||'Здесь начинается следующий стрим.')}</p></div><span class="pill">Личный профиль</span></aside><form id="profileForm" onsubmit="event.preventDefault();saveProfile()"><div class="fg"><label for="profileName">Имя / никнейм</label><input id="profileName" class="field" maxlength="32" required value="${esc(p.name)}" oninput="previewProfile()"></div><div class="fg"><label for="profileBio">О себе</label><textarea id="profileBio" class="field" maxlength="160" placeholder="Во что играешь и какие истории ищешь" oninput="previewProfile()">${esc(p.bio)}</textarea></div><fieldset class="profile-colors"><legend>Цвет акцента</legend>${Object.entries(YndsiProfile.accents).map(([key,a])=>`<label class="accent-choice"><input type="radio" name="profileAccent" value="${key}" ${p.accent===key?'checked':''} onchange="previewProfile()"><span style="--swatch:${a.color}"></span>${a.name}</label>`).join('')}</fieldset><div class="actions"><label class="btn">Загрузить иконку<input type="file" id="profileFile" accept="image/png,image/jpeg,image/webp" hidden onchange="uploadProfileAvatar(this)"></label><button type="button" class="btn" onclick="removeProfileAvatar()">Убрать иконку</button></div><p class="tiny">JPG, PNG или WebP до 8 МБ. Фото автоматически обрезается по центру и уменьшается. Ник и иконка используются также в общении с друзьями. Описание рабочего профиля остаётся личным.</p><p id="profileMessage" class="tiny" role="status"></p><div class="actions"><button class="btn primary" id="profileSave">Сохранить профиль</button><button type="button" class="btn" onclick="cancelProfile()">Отменить изменения</button></div></form></div></section>`;
}
const beforeProfileSettings=settings;
settings=function(){return profileForm()+`<div style="margin-top:20px">${beforeProfileSettings()}</div>`};
function readProfileDraft(){const current=profileDraft||YndsiProfile.clean(db.profile);return YndsiProfile.clean({...current,name:$('#profileName').value,bio:$('#profileBio').value,accent:document.querySelector('[name="profileAccent"]:checked')?.value})}
function previewProfile(){profileDraft=readProfileDraft();$('#profilePreview').innerHTML=profileAvatar(profileDraft,true)+`<h3>${esc(profileDraft.name)}</h3><p>${esc(profileDraft.bio||'Здесь начинается следующий стрим.')}</p>`;$('#profilePreview').style.setProperty('--purple',YndsiProfile.accents[profileDraft.accent].color)}
async function saveProfile(){
 if(avatarBusy){toast('Подожди обработки иконки');return}
 if(!$('#profileForm').reportValidity())return;if(!$('#profileName').value.trim()){toast('Укажи имя профиля');return}
 const profile=readProfileDraft(),session=window.ynSync?.getUser()?.id;const button=$('#profileSave');if(button)button.disabled=true;
 try{await window.ynSocial?.publishIdentity(profile);if(session!==window.ynSync?.getUser()?.id)throw Error('Аккаунт изменился. Открой настройки заново.');db.profile=profile;profileDraft=null;save();toast('Профиль сохранён. Статус облака — вверху страницы.')}
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
 const p=YndsiProfile.clean(workspaceOwner?(page==='friends'?window.ynSocial?.profile||db.profile:db.profile):window.ynSocial?.profile||{});document.documentElement.style.setProperty('--purple',YndsiProfile.accents[p.accent].color);
 const avatar=document.querySelector('.topright .avatar');if(avatar){avatar.innerHTML=profileAvatar(p);avatar.title='Настроить профиль: '+p.name;avatar.setAttribute('aria-label',avatar.title)}
 const footer=document.querySelector('.sidefoot');if(footer)footer.innerHTML=`<small>ТВОЁ ПРОСТРАНСТВО</small><b style="display:block;margin:8px 0;overflow-wrap:anywhere">${esc(p.name)}</b><small>${esc(p.bio||'Следующая история начинается здесь.')}</small>`;
}
const beforeProfileRender=render;
render=function(){beforeProfileRender();applyProfile()};
render();

window.ynProfileReset=()=>{avatarRequest++;avatarBusy=false;profileDraft=null};
