(function(root){
 const types={photo:['image/jpeg','image/png','image/webp'],voice:['audio/mp4','audio/webm','audio/ogg'],video:['video/mp4','video/webm']};
 function mime(value){return String(value||'').split(';')[0].trim().toLowerCase()}
 function validate(kind,type,bytes,duration){type=mime(type);if(!types[kind]?.includes(type))throw Error('Формат не поддерживается этим браузером');const max=kind==='photo'?8*1024*1024:kind==='voice'?10*1024*1024:20*1024*1024;if(!Number.isFinite(bytes)||bytes<=0||bytes>max)throw Error('Файл слишком большой или пустой');if(kind!=='photo'&&(!Number.isFinite(duration)||duration<=0||duration>(kind==='voice'?120:30)))throw Error('Запись слишком длинная');return type}
 function format(kind,support){const options=kind==='voice'?['audio/mp4','audio/webm;codecs=opus','audio/webm','audio/ogg;codecs=opus']:['video/mp4','video/webm;codecs=vp8,opus','video/webm'];return options.find(support)||null}
 function elapsed(start,now,pausedMs=0,pausedSince=0){return Math.max(0,((pausedSince||now)-start-pausedMs)/1000)}
 function clock(seconds){const total=Math.max(0,Math.floor(seconds||0));return String(Math.floor(total/60)).padStart(2,'0')+':'+String(total%60).padStart(2,'0')}
 const model={mime,validate,format,elapsed,clock};if(typeof module!=='undefined'&&module.exports)module.exports=model;else root.YndsiMedia=model;
})(typeof globalThis!=='undefined'?globalThis:this);
