(()=>{
 const motion=window.matchMedia?.('(prefers-reduced-motion: reduce)');let previous=null,transition=null;
 const before=render;
 render=function(){before();const view=document.getElementById('view');if(motion?.matches)transition?.cancel();if(previous!==page&&view&&typeof view.animate==='function'&&!motion?.matches){transition?.cancel();transition=view.animate([{opacity:.35,transform:'translateY(9px)'},{opacity:1,transform:'translateY(0)'}],{duration:230,easing:'cubic-bezier(.2,.7,.2,1)'});transition.finished.catch(()=>{})}previous=page};
 const visibility=()=>document.body.classList.toggle('tab-hidden',document.hidden);
 motion?.addEventListener?.('change',()=>{if(motion.matches)transition?.cancel()});
 document.addEventListener('visibilitychange',visibility);visibility();
})();
