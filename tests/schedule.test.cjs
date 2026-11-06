const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const model=require('../schedule-model.js');
test('Atyrau wall time survives midnight and year boundaries',()=>{
 assert.equal(model.toUTC('2026-11-07','02:30'),'2026-11-06T21:30:00.000Z');
 assert.equal(model.toUTC('2027-01-01','00:00'),'2026-12-31T19:00:00.000Z');
 assert.deepEqual(model.localParts('2026-12-31T19:00:00Z'),{date:'2027-01-01',time:'00:00'});
 for(const [d,t] of [['2026-02-30','20:00'],['2026-11-07','24:00'],['','20:00']])assert.throws(()=>model.toUTC(d,t));
});
test('upcoming ignores past times, cancelled streams and supports legacy records',()=>{
 const now=Date.parse('2026-11-07T10:00:00Z');
 const list=[{id:'past',date:'2026-11-07',time:'14:00',status:'Запланирован'},{id:'cancelled',date:'2026-11-07',time:'16:00',status:'Отменён'},{id:'next',date:'2026-11-07',time:'17:00',status:'Запланирован'},{id:'later',startsAt:'2026-11-08T10:00:00Z',status:'Запланирован'}];
 assert.equal(model.next(list,now).id,'next');assert.equal(model.next([],now),null);
 assert.equal(model.title({gameId:'g',game:'Old'},[{id:'g',title:'New'}]),'New');
 assert.equal(model.title({gameId:'deleted',game:'Old'},[]),'Old');
});
test('stream submission links game, stores UTC, preserves unknown fields and validates before writes',()=>{
 let values={title:'Стрим',gameId:'g',game:'Game',date:'2026-11-07',time:'20:00',duration:'2',status:'Запланирован',description:'Note',plan:'Plan'};
 let saves=0;const context={YndsiSchedule:model,openModal(){},gameRow(){return ''},render(){},db:{games:[{id:'g',title:'Game',status:'Хочу пройти'}],streams:[]},editing:null,uid:()=> 'stream-id',closeModal(){},save(){saves++},toast(){},confirm:()=>true,
 $:()=>({querySelectorAll:()=>Object.entries(values).map(([name,value])=>({name,value,reportValidity:()=>true}))})};
 vm.createContext(context);vm.runInContext(fs.readFileSync('schedule-ui.js','utf8'),context);
 context.saveStream();assert.equal(saves,1);assert.equal(context.db.streams[0].startsAt,'2026-11-07T15:00:00.000Z');assert.equal(context.db.games[0].status,'Скоро на стриме');assert.equal(context.db.streams[0].gameId,'g');
 context.editing='stream-id';context.db.streams[0].category='Preserved';values={...values,time:'21:00'};context.saveStream();assert.equal(context.db.streams.length,1);assert.equal(context.db.streams[0].category,'Preserved');assert.equal(context.db.streams[0].startsAt,'2026-11-07T16:00:00.000Z');
 values={...values,date:'2026-02-30'};context.saveStream();assert.equal(saves,2);
 context.deleteStream();assert.equal(context.db.streams.length,0);assert.equal(saves,3);
});
