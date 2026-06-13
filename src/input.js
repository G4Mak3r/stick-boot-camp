export class Input{
  constructor(audio){
    this.audio=audio; this.x=0; this.jump=false; this.fire=false; this.reload=false; this.switch=false; this.aimY=0; this.started=false;
    this.pad=document.getElementById('leftPad'); this.knob=document.getElementById('stickKnob');
    this.ids={pad:null,fire:null,jump:null}; this.center={x:0,y:0}; this.bind();
  }
  bind(){
    const start=()=>{this.audio.unlock(); this.started=true};
    document.addEventListener('pointerdown', start, {passive:true});
    const pd=e=>{e.preventDefault(); this.ids.pad=e.pointerId; this.center=this.rectCenter(this.pad); this.movePad(e); this.pad.setPointerCapture(e.pointerId);};
    this.pad.addEventListener('pointerdown', pd);
    this.pad.addEventListener('pointermove', e=>{ if(e.pointerId===this.ids.pad) this.movePad(e); });
    const endPad=e=>{ if(e.pointerId===this.ids.pad){ this.ids.pad=null; this.x=0; this.aimY=0; this.knob.style.transform='translate(0px,0px)'; }};
    this.pad.addEventListener('pointerup', endPad); this.pad.addEventListener('pointercancel', endPad);
    this.hold('fireBtn','fire'); this.hold('jumpBtn','jump');
    this.tap('reloadBtn','reload'); this.tap('weaponBtn','switch');
    window.addEventListener('keydown',e=>{ if(e.code==='KeyA'||e.code==='ArrowLeft')this.x=-1; if(e.code==='KeyD'||e.code==='ArrowRight')this.x=1; if(e.code==='Space'||e.code==='KeyW')this.jump=true; if(e.code==='KeyR')this.reload=true; if(e.code==='KeyQ')this.switch=true; if(e.code==='KeyF')this.fire=true; });
    window.addEventListener('keyup',e=>{ if(['KeyA','ArrowLeft','KeyD','ArrowRight'].includes(e.code))this.x=0; if(e.code==='Space'||e.code==='KeyW')this.jump=false; if(e.code==='KeyF')this.fire=false; });
  }
  rectCenter(el){const r=el.getBoundingClientRect(); return {x:r.left+r.width/2,y:r.top+r.height/2};}
  movePad(e){ const dx=e.clientX-this.center.x, dy=e.clientY-this.center.y; const len=Math.hypot(dx,dy), max=48; const k=len>max?max/len:1; this.knob.style.transform=`translate(${dx*k}px,${dy*k}px)`; this.x=Math.max(-1,Math.min(1,dx/max)); this.aimY=Math.max(-1,Math.min(1,dy/max)); }
  hold(id, prop){ const el=document.getElementById(id); el.addEventListener('pointerdown',e=>{e.preventDefault(); this[prop]=true; el.classList.add('down'); el.setPointerCapture(e.pointerId);}); const up=e=>{this[prop]=false; el.classList.remove('down')}; el.addEventListener('pointerup',up); el.addEventListener('pointercancel',up); }
  tap(id, prop){ const el=document.getElementById(id); el.addEventListener('pointerdown',e=>{e.preventDefault(); this[prop]=true; el.classList.add('down'); setTimeout(()=>el.classList.remove('down'),120);}); }
  consume(name){ const v=this[name]; this[name]=false; return v; }
}
