(function(){
  function $(s){return document.querySelector(s);} function $all(s){return Array.prototype.slice.call(document.querySelectorAll(s));}
  function toast(t){var el=$('#toast'); if(!el)return; el.textContent=t; el.classList.add('show'); clearTimeout(el._t); el._t=setTimeout(function(){el.classList.remove('show');},2800);}
  function fatal(msg,err){var d=document.createElement('pre');d.style.cssText='position:fixed;z-index:99999;left:10px;right:10px;bottom:10px;max-height:45vh;overflow:auto;padding:12px;border-radius:12px;background:rgba(0,0,0,.88);color:#55f6ff;font:12px/1.35 monospace;white-space:pre-wrap';d.textContent=msg+'\n'+(err&&err.stack?err.stack:(err&&err.message?err.message:err||''));document.body.appendChild(d);}
  window.addEventListener('error',function(e){fatal('JS ERROR',e.error||e.message);});
  window.addEventListener('unhandledrejection',function(e){fatal('PROMISE ERROR',e.reason);});
  try{
    if(!window.AudioEngine||!window.Visualizer) throw new Error('Scripts did not load: AudioEngine/Visualizer missing');
    var canvas=$('#visualizer'); if(!canvas) throw new Error('Canvas not found');
    var audio=new window.AudioEngine(); var viz=new window.Visualizer(canvas);
    var settings={sensitivity:Number(localStorage.getItem('nv:sensitivity')||1.35),glow:Number(localStorage.getItem('nv:glow')||.82),particles:Number(localStorage.getItem('nv:particles')||.78)};
    ['sensitivity','glow','particles'].forEach(function(id){var el=$('#'+id); if(el){el.value=settings[id]; el.addEventListener('input',function(){settings[id]=Number(el.value); localStorage.setItem('nv:'+id,String(settings[id]));});}});
    var raf=0,last=performance.now(),frames=0,started=false,hideTimer=0;
    function hideStart(){var p=$('#startPanel');if(p)p.classList.add('hide');started=true;resetHide();}
    function resetHide(){var ui=$('#ui');if(ui)ui.classList.remove('min');clearTimeout(hideTimer);hideTimer=setTimeout(function(){if(started&&ui)ui.classList.add('min');},10000);}
    function tryFullscreen(){var r=document.documentElement;if(!document.fullscreenElement&&r.requestFullscreen)r.requestFullscreen().catch(function(){});}
    async function mic(){try{await audio.startMic();hideStart();$('#orb').classList.add('live');toast('Микрофон активен');viz.burst(innerWidth/2,innerHeight/2,2.2);tryFullscreen();}catch(e){audio.error=e.message||String(e);audio.startDemo();hideStart();toast('Микрофон не стартовал — включил демо');viz.burst(innerWidth/2,innerHeight/2,2.0);}}
    function demo(){audio.startDemo();hideStart();$('#orb').classList.remove('live');toast('Демо-режим');viz.burst(innerWidth/2,innerHeight/2,2.0);tryFullscreen();}
    function loop(now){var dt=Math.min(.05,(now-last)/1000||.016);last=now;audio.update(dt,settings.sensitivity);viz.render(audio,settings,dt);frames++; if((frames&7)===0){$('#mode').textContent=audio.mode;$('#level').textContent='level '+Math.round(audio.level*100)+'%';var d=$('#debug'); if(d)d.textContent='v4 RAF '+viz.frame+' '+Math.round(viz.w)+'x'+Math.round(viz.h)+' dpr '+viz.dpr.toFixed(1)+(audio.error?' ERR '+audio.error.slice(0,35):' OK');} raf=requestAnimationFrame(loop);}
    $('#micBtn').addEventListener('click',mic); $('#demoBtn').addEventListener('click',demo); $('#testBtn').addEventListener('click',function(){hideStart();viz.burst(innerWidth/2,innerHeight/2,3.2);toast('Canvas impulse');});
    $('#hideBtn').addEventListener('click',function(){$('#ui').classList.add('min');}); $('#wakeBtn').addEventListener('click',resetHide);
    $all('.preset').forEach(function(b){b.classList.toggle('active',b.dataset.preset===viz.preset);b.addEventListener('click',function(){viz.setPreset(b.dataset.preset);$all('.preset').forEach(function(x){x.classList.toggle('active',x===b);});viz.burst(innerWidth/2,innerHeight/2,1.1);toast(b.dataset.preset.toUpperCase());});});
    var sx=0,sy=0; window.addEventListener('pointerdown',function(e){sx=e.clientX;sy=e.clientY;viz.touch(e.clientX,e.clientY);resetHide();},{passive:false}); window.addEventListener('pointermove',function(e){if(e.buttons||e.pressure)viz.touch(e.clientX,e.clientY);},{passive:false}); window.addEventListener('pointerup',function(e){var dx=e.clientX-sx,dy=e.clientY-sy;if(Math.abs(dx)>90&&Math.abs(dx)>Math.abs(dy)*1.5){var names=['nebula','rings','bars','tunnel','aurora'],i=names.indexOf(viz.preset),next=names[(i+(dx<0?1:-1)+names.length)%names.length];viz.setPreset(next);$all('.preset').forEach(function(x){x.classList.toggle('active',x.dataset.preset===next);});toast(next.toUpperCase());}},{passive:false});
    window.addEventListener('resize',function(){viz.resize();}); window.addEventListener('orientationchange',function(){setTimeout(function(){viz.resize();},250);}); document.addEventListener('visibilitychange',function(){if(document.hidden)cancelAnimationFrame(raf);else{last=performance.now();raf=requestAnimationFrame(loop);}});
    // kill old broken service workers/caches once the new code loads, then register safer v4
    if('serviceWorker' in navigator){navigator.serviceWorker.getRegistrations().then(function(regs){regs.forEach(function(r){ if(r.active&&r.active.scriptURL.indexOf('v=4')<0) r.unregister();});}); caches&&caches.keys&&caches.keys().then(function(keys){keys.forEach(function(k){if(k.indexOf('v4')<0)caches.delete(k);});}); window.addEventListener('load',function(){navigator.serviceWorker.register('./sw.js?v=4').catch(function(){});});}
    document.body.classList.add('booted'); audio.startDemo(); viz.burst(innerWidth/2,innerHeight/2,1.3); raf=requestAnimationFrame(loop); toast('V4 запущен: если видишь RAF-счетчик — canvas работает');
  }catch(e){fatal('BOOT FAILED',e);}
})();
