const beforeStreamModal=openModal;
openModal=function(type,item){
 if(type!=='stream')return beforeStreamModal(type,item);
 modalType='stream';editing=item||null;
 const data=db.streams.find(s=>s.id===item)||{};
 const parts=item?YndsiSchedule.localParts(YndsiSchedule.instant(data),currentTimeZone()):null;
 const local=parts||{date:data.date||YndsiSchedule.localParts(Date.now(),currentTimeZone()).date,time:data.time||'20:00'};
 const linked=db.games.find(g=>g.id===data.gameId)||(!data.gameId?db.games.find(g=>g.title===data.game):null);
 $('#modtitle').textContent=item?'Редактировать стрим':'Запланировать стрим';
 $('#modbody').innerHTML=`<p class="tiny">Время вводится в твоём часовом поясе: ${esc(currentTimeZone())}. После сохранения другие пользователи увидят свой местный эквивалент.</p><div class="form">
 <div class="fg full"><label for="streamTitle">Название трансляции</label><input id="streamTitle" class="field" name="title" maxlength="200" value="${esc(data.title||'')}" required></div>
 <div class="fg full"><label for="streamGameId">Игра из библиотеки</label><select class="field" id="streamGameId" name="gameId" onchange="selectStreamGame()"><option value="">Без привязки к библиотеке</option>${db.games.map(g=>`<option value="${esc(g.id)}" ${linked?.id===g.id?'selected':''}>${esc(g.title)}</option>`).join('')}</select></div>
 <div class="fg full"><label for="streamGame">Игра / категория вручную</label><input id="streamGame" class="field" name="game" maxlength="200" value="${esc(linked?.title||data.game||'')}" ${linked?'readonly':''}></div>
 ${[['date','Дата','date',local.date],['time','Время начала','time',local.time],['duration','Длительность, ч','number',data.duration??'']].map(([key,label,type,value])=>`<div class="fg"><label for="stream-${key}">${label}</label><input id="stream-${key}" class="field" name="${key}" type="${type}" value="${esc(value)}" onchange="updateStreamDST()" ${type==='number'?'min="0" max="48" step="0.25"':'required'}></div>`).join('')}
 <div class="fg full" id="streamDST" style="display:none"><label for="streamOccurrence">Это время повторяется при переводе часов</label><select class="field" id="streamOccurrence" name="occurrence"><option value="earlier">Первое повторение</option><option value="later">Второе повторение</option></select></div><div class="fg"><label for="streamStatus">Статус</label><select id="streamStatus" class="field" name="status">${['Запланирован','В процессе','Проведён','Отменён'].map(s=>`<option ${data.status===s?'selected':''}>${s}</option>`).join('')}</select></div>
 <div class="fg full"><label for="streamDescription">Описание</label><textarea id="streamDescription" class="field" name="description">${esc(data.description||'')}</textarea></div>
 <div class="fg full"><label for="streamPlan">План эфира</label><textarea id="streamPlan" class="field" name="plan">${esc(data.plan||'')}</textarea></div>
 </div>${item?'<button class="btn danger" style="margin-top:16px" onclick="deleteStream()">Удалить стрим</button>':''}`;
 updateStreamDST(item?YndsiSchedule.instant(data):null);
 $('#savebtn').onclick=saveStream;
 $('#modalback').classList.add('show');
};
function selectStreamGame(){const game=db.games.find(g=>g.id===$('#streamGameId').value);$('#streamGame').value=game?.title||'';$('#streamGame').readOnly=!!game;if(game&&!$('#streamTitle').value.trim())$('#streamTitle').value='Проходим '+game.title}
function planGame(index){const game=db.games[index];if(!game)return;openModal('stream');$('#streamGameId').value=game.id;selectStreamGame()}
function planSteamGame(id){
 let game=db.games.find(g=>Number(g.appId)===id);
 if(!game){const found=steamState.games.find(g=>g.appId===id);if(!found)return;steamAdd(id);game=db.games.find(g=>Number(g.appId)===id)}
 if(game)planGame(db.games.indexOf(game));
}
function saveStream(){
 const obj={};const fields=[...$('#modbody').querySelectorAll('[name]')];
 for(const field of fields){if(!field.reportValidity())return;obj[field.name]=field.value.trim()}
 if(!obj.title){toast('Укажи название стрима');return}
 try{obj.startsAt=YndsiSchedule.toUTC(obj.date,obj.time,currentTimeZone(),obj.occurrence)}catch(e){toast(e.message);return}
 const game=db.games.find(g=>g.id===obj.gameId);if(game)obj.game=game.title;else obj.gameId=null;
 obj.timeZone=currentTimeZone();obj.duration=obj.duration===''?0:Number(obj.duration);
 const old=editing?db.streams.find(s=>s.id===editing):null;
 if(editing&&!old){toast('Стрим не найден. Открой форму заново.');return}
 if(old)Object.assign(old,obj);else db.streams.push({...obj,id:uid()});
 if(game&&obj.status==='Запланирован'&&['Хочу пройти','В планах'].includes(game.status))game.status='Скоро на стриме';
 closeModal();save();toast('Стрим сохранён · '+currentTimeZone());
}
function deleteStream(){if(!editing||!confirm('Удалить этот стрим из расписания?'))return;db.streams=db.streams.filter(s=>s.id!==editing);closeModal();save();toast('Стрим удалён')}
const beforeScheduleGameRow=gameRow;
gameRow=function(game){const index=db.games.indexOf(game);return beforeScheduleGameRow(game).replace('<div class="actions">',`<div class="actions"><button class="btn mini" onclick="planGame(${index})">Запланировать стрим</button>`)};
upcoming=function(){const stream=YndsiSchedule.next(db.streams);if(!stream)return null;const local=YndsiSchedule.localParts(YndsiSchedule.instant(stream),currentTimeZone());return {...stream,...local,game:YndsiSchedule.title(stream,db.games),time:local.time+' · '+YndsiSchedule.label(YndsiSchedule.instant(stream),currentTimeZone())}};
streamRows=function(){return db.streams.slice().sort((a,b)=>(YndsiSchedule.instant(a)||0)-(YndsiSchedule.instant(b)||0)).map(s=>{const local=YndsiSchedule.localParts(YndsiSchedule.instant(s),currentTimeZone())||{date:s.date,time:s.time};return `<div class="entry row between"><div><b>${esc(s.title)}</b><div class="tiny">${fmt(local.date)} · ${esc(local.time||'Время не задано')} · ${esc(YndsiSchedule.label(YndsiSchedule.instant(s),currentTimeZone()))} · ${esc(YndsiSchedule.title(s,db.games))}</div></div><div class="actions">${statusPill(s.status)}<button class="btn mini" onclick="openStreamIndex(${db.streams.indexOf(s)})">Изменить</button></div></div>`}).join('')||'<div class="empty">Стримов пока нет</div>'};
function openStreamIndex(index){if(db.streams[index])openModal('stream',db.streams[index].id)}
render();

function updateStreamDST(saved){const panel=$('#streamDST');if(!panel)return;try{const choices=YndsiSchedule.resolve($('#stream-date').value,$('#stream-time').value,currentTimeZone());panel.style.display=choices.length>1?'grid':'none';if(saved&&choices.length>1)$('#streamOccurrence').value=Date.parse(saved)===Date.parse(choices[choices.length-1])?'later':'earlier'}catch{panel.style.display='none'}}

function planStreamDate(date){if(!/^\d{4}-\d{2}-\d{2}$/.test(date))return;openModal('stream');const field=document.getElementById('stream-date');if(field){field.value=date;updateStreamDST();document.getElementById('streamTitle')?.focus()}}
