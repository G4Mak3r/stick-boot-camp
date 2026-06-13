(function(){
  var TAU=Math.PI*2;
  var palettes={nebula:['#55f6ff','#916bff','#ff4fd8','#63ffbd'],rings:['#ffd166','#55f6ff','#ff4fd8','#ffffff'],bars:['#55f6ff','#63ffbd','#ffd166','#ff4fd8'],tunnel:['#63ffbd','#55f6ff','#916bff','#ff4fd8'],aurora:['#63ffbd','#55f6ff','#d8fff4','#916bff']};
  function hexA(hex,a){var c=hex.replace('#',''),n=parseInt(c,16);return 'rgba('+((n>>16)&255)+','+((n>>8)&255)+','+(n&255)+','+Math.max(0,Math.min(1,a))+')';}
  function rr(ctx,x,y,w,h,r){r=Math.min(r,w/2,h/2);ctx.beginPath();ctx.moveTo(x+r,y);ctx.arcTo(x+w,y,x+w,y+h,r);ctx.arcTo(x+w,y+h,x,y+h,r);ctx.arcTo(x,y+h,x,y,r);ctx.arcTo(x,y,x+w,y,r);ctx.closePath();}
  function Visualizer(canvas){
    this.canvas=canvas; this.ctx=canvas.getContext('2d',{alpha:false});
    this.w=1;this.h=1;this.cx=0;this.cy=0;this.dpr=1;this.t=0;this.frame=0;
    this.preset=localStorage.getItem('nv:preset')||'nebula'; if(!palettes[this.preset]) this.preset='nebula';
    this.particles=[];this.maxParticles=400;this.pointer={x:0,y:0,down:false,pulse:0};
    this.resize(); this.burst(innerWidth/2,innerHeight/2,1.5);
  }
  Visualizer.prototype.resize=function(){
    this.dpr=Math.min(2,window.devicePixelRatio||1); this.w=Math.max(2,window.innerWidth||document.documentElement.clientWidth||800); this.h=Math.max(2,window.innerHeight||document.documentElement.clientHeight||450); this.cx=this.w/2; this.cy=this.h/2;
    this.canvas.width=Math.floor(this.w*this.dpr); this.canvas.height=Math.floor(this.h*this.dpr); this.canvas.style.width=this.w+'px'; this.canvas.style.height=this.h+'px';
    this.ctx.setTransform(this.dpr,0,0,this.dpr,0,0);
  };
  Visualizer.prototype.setPreset=function(name){if(palettes[name]){this.preset=name;localStorage.setItem('nv:preset',name);}};
  Visualizer.prototype.spawn=function(x,y,e,color){
    if(this.particles.length>this.maxParticles) this.particles.splice(0,this.particles.length-this.maxParticles);
    var a=Math.random()*TAU,s=(40+Math.random()*360)*e;
    this.particles.push({x:x,y:y,vx:Math.cos(a)*s,vy:Math.sin(a)*s,age:0,life:.45+Math.random()*1.4,size:1+Math.random()*4.8,color:color});
  };
  Visualizer.prototype.burst=function(x,y,e){var p=palettes[this.preset];for(var i=0;i<Math.floor(75*e);i++)this.spawn(x,y,e,p[i%p.length]);this.pointer.x=x;this.pointer.y=y;this.pointer.pulse=1;};
  Visualizer.prototype.touch=function(x,y){this.pointer.x=x;this.pointer.y=y;this.pointer.pulse=1;var p=palettes[this.preset];for(var i=0;i<20;i++)this.spawn(x,y,1,p[i%p.length]);};
  Visualizer.prototype.render=function(audio,set,dt){
    this.t+=dt; this.frame++; var ctx=this.ctx,pal=palettes[this.preset],glow=set.glow;
    this.maxParticles=Math.floor(130+430*set.particles);
    ctx.globalCompositeOperation='source-over';
    var bg=ctx.createLinearGradient(0,0,this.w,this.h);bg.addColorStop(0,'#03040b');bg.addColorStop(.55,'#080b1c');bg.addColorStop(1,'#010208');ctx.fillStyle=bg;ctx.fillRect(0,0,this.w,this.h);
    this.backdrop(ctx,audio,pal,glow); this.idle(ctx,audio,pal,glow);
    if(this.preset==='nebula') this.nebula(ctx,audio,pal,glow); else if(this.preset==='rings') this.rings(ctx,audio,pal,glow); else if(this.preset==='bars') this.bars(ctx,audio,pal,glow); else if(this.preset==='tunnel') this.tunnel(ctx,audio,pal,glow); else this.aurora(ctx,audio,pal,glow);
    this.parts(ctx,audio,dt,pal,glow); this.vignette(ctx);
    // visible heartbeat: proves RAF is alive
    ctx.save();ctx.globalCompositeOperation='source-over';ctx.fillStyle='rgba(85,246,255,.86)';ctx.font='12px ui-monospace,monospace';ctx.fillText('RAF '+this.frame,12,this.h-14);ctx.restore();
  };
  Visualizer.prototype.backdrop=function(ctx,a,p,g){
    var r=Math.max(this.w,this.h)*(.34+a.level*.12),gr=ctx.createRadialGradient(this.cx,this.cy,0,this.cx,this.cy,r);gr.addColorStop(0,hexA(p[0],.16+a.level*.22));gr.addColorStop(.45,hexA(p[1],.08));gr.addColorStop(1,'rgba(0,0,0,0)');ctx.fillStyle=gr;ctx.fillRect(0,0,this.w,this.h);
    ctx.save();ctx.globalCompositeOperation='lighter';for(var i=0;i<90;i++){var x=(Math.sin(i*91.7)*.5+.5)*this.w,y=(Math.sin(i*37.1+2)*.5+.5)*this.h,tw=.3+.7*Math.sin(this.t*(1+i%5)+i);ctx.fillStyle='rgba(190,235,255,'+((.07+tw*.12)*g)+')';ctx.beginPath();ctx.arc(x,y,.7+tw*1.6,0,TAU);ctx.fill();}ctx.restore();
  };
  Visualizer.prototype.idle=function(ctx,a,p,g){ctx.save();ctx.globalCompositeOperation='lighter';for(var i=0;i<18;i++){var y=this.h*(i+.5)/18,amp=9+a.level*36+Math.sin(this.t*1.2+i)*5;ctx.beginPath();for(var x=-20;x<=this.w+20;x+=24){var yy=y+Math.sin(x*.012+this.t*(.9+i*.018)+i*.7)*amp;if(x<0)ctx.moveTo(x,yy);else ctx.lineTo(x,yy);}ctx.strokeStyle=hexA(p[i%p.length],(.026+a.level*.045)*g);ctx.lineWidth=1;ctx.stroke();}ctx.restore();};
  Visualizer.prototype.nebula=function(ctx,a,p,g){ctx.save();ctx.translate(this.cx,this.cy);ctx.globalCompositeOperation='lighter';var bars=168,min=Math.min(this.w,this.h);for(var i=0;i<bars;i++){var f=(a.freq[Math.floor(i/bars*a.freq.length)]||0)/255,ang=i/bars*TAU+this.t*.08,base=min*.15,len=base+f*min*.36+a.bass*48;ctx.strokeStyle=hexA(p[i%p.length],.18+f*.72);ctx.lineWidth=1+f*5;ctx.shadowBlur=20*g+f*34*g;ctx.shadowColor=p[i%p.length];ctx.beginPath();ctx.moveTo(Math.cos(ang)*base,Math.sin(ang)*base);ctx.lineTo(Math.cos(ang)*len,Math.sin(ang)*len);ctx.stroke();}this.waveCircle(ctx,a,p[0],min*(.08+a.bass*.05));ctx.restore();};
  Visualizer.prototype.rings=function(ctx,a,p,g){ctx.save();ctx.translate(this.cx,this.cy);ctx.globalCompositeOperation='lighter';for(var k=0;k<10;k++){var rr0=Math.min(this.w,this.h)*(.08+k*.044+a.bass*.04);ctx.beginPath();for(var i=0;i<=220;i++){var an=i/220*TAU,f=(a.freq[(i*3+k*23)%a.freq.length]||0)/255,rad=rr0+f*86+Math.sin(an*(3+k%5)+this.t*(1.5+k*.13))*8,x=Math.cos(an)*rad,y=Math.sin(an)*rad;if(i===0)ctx.moveTo(x,y);else ctx.lineTo(x,y);}ctx.strokeStyle=hexA(p[k%p.length],.18+.08*k);ctx.lineWidth=1.2+a.level*4;ctx.shadowBlur=20*g;ctx.shadowColor=p[k%p.length];ctx.stroke();}ctx.restore();};
  Visualizer.prototype.bars=function(ctx,a,p,g){ctx.save();ctx.globalCompositeOperation='lighter';var n=96,bw=this.w/n;for(var i=0;i<n;i++){var f=(a.freq[Math.floor(i/n*a.freq.length)]||0)/255,h=12+Math.pow(f,1.35)*this.h*.74,x=i*bw,y=this.h-h-20,gr=ctx.createLinearGradient(0,y,0,this.h);gr.addColorStop(0,hexA(p[i%p.length],.95));gr.addColorStop(1,hexA(p[(i+1)%p.length],.2));ctx.fillStyle=gr;ctx.shadowBlur=18*g;ctx.shadowColor=p[i%p.length];rr(ctx,x+3,y,Math.max(2,bw-6),h,8);ctx.fill();}this.waveLine(ctx,a,p[2],this.h*.36,g);ctx.restore();};
  Visualizer.prototype.tunnel=function(ctx,a,p,g){ctx.save();ctx.translate(this.cx,this.cy);ctx.globalCompositeOperation='lighter';for(var k=38;k>=1;k--){var z=k/38,rot=this.t*(.2+a.mid*.7)+k*.22,rad=z*Math.max(this.w,this.h)*.62*(1+a.bass*.18);ctx.beginPath();for(var i=0;i<=6;i++){var an=i/6*TAU+rot,pu=1+Math.sin(this.t*3+k*.42+i)*.04,x=Math.cos(an)*rad*pu,y=Math.sin(an)*rad*pu;if(i===0)ctx.moveTo(x,y);else ctx.lineTo(x,y);}ctx.strokeStyle=hexA(p[k%p.length],.04+(1-z)*.32+a.level*.1);ctx.lineWidth=1+(1-z)*5;ctx.shadowBlur=16*g;ctx.shadowColor=p[k%p.length];ctx.stroke();}ctx.restore();};
  Visualizer.prototype.aurora=function(ctx,a,p,g){ctx.save();ctx.globalCompositeOperation='lighter';for(var b=0;b<6;b++){ctx.beginPath();var y0=this.h*(.26+b*.09);for(var x=-20;x<=this.w+20;x+=10){var idx=Math.max(0,Math.floor(x/this.w*a.freq.length)%a.freq.length),f=(a.freq[idx]||0)/255,y=y0+Math.sin(x*.009+this.t*(1.1+b*.11)+b)*(28+b*8)-f*124;if(x<0)ctx.moveTo(x,y);else ctx.lineTo(x,y);}ctx.strokeStyle=hexA(p[b%p.length],.18+a.mid*.35);ctx.lineWidth=18+b*4;ctx.shadowBlur=35*g;ctx.shadowColor=p[b%p.length];ctx.stroke();}this.waveLine(ctx,a,p[1],this.h*.75,g);ctx.restore();};
  Visualizer.prototype.waveCircle=function(ctx,a,color,r){ctx.beginPath();for(var i=0;i<=256;i++){var an=i/256*TAU,v=((a.time[Math.floor(i/256*a.time.length)]||128)-128)/128,rad=r+v*70+a.level*34,x=Math.cos(an)*rad,y=Math.sin(an)*rad;if(i===0)ctx.moveTo(x,y);else ctx.lineTo(x,y);}ctx.closePath();ctx.strokeStyle=hexA(color,.7);ctx.lineWidth=2.2;ctx.stroke();};
  Visualizer.prototype.waveLine=function(ctx,a,color,y,g){ctx.beginPath();for(var x=0;x<this.w;x+=4){var v=((a.time[Math.floor(x/this.w*a.time.length)]||128)-128)/128,yy=y+v*(42+a.level*90);if(x===0)ctx.moveTo(x,yy);else ctx.lineTo(x,yy);}ctx.strokeStyle=hexA(color,.76);ctx.lineWidth=2.5;ctx.shadowBlur=18*g;ctx.shadowColor=color;ctx.stroke();};
  Visualizer.prototype.parts=function(ctx,a,dt,p,g){var spawn=(a.bass*7+a.treble*3)*this.maxParticles/360;for(var s=0;s<spawn;s++){var an=Math.random()*TAU,r=Math.min(this.w,this.h)*(.1+Math.random()*.28);this.spawn(this.cx+Math.cos(an)*r,this.cy+Math.sin(an)*r,.35+a.level,p[Math.floor(Math.random()*p.length)]);}this.pointer.pulse=Math.max(0,this.pointer.pulse-dt*1.6);ctx.save();ctx.globalCompositeOperation='lighter';for(var i=this.particles.length-1;i>=0;i--){var q=this.particles[i];q.age+=dt;if(q.age>=q.life){this.particles.splice(i,1);continue;}q.vx*=Math.pow(.18,dt);q.vy*=Math.pow(.18,dt);q.x+=q.vx*dt;q.y+=q.vy*dt;var k=1-q.age/q.life;ctx.fillStyle=hexA(q.color,k*.86);ctx.shadowBlur=(10+q.size*5)*g;ctx.shadowColor=q.color;ctx.beginPath();ctx.arc(q.x,q.y,q.size*(.4+k),0,TAU);ctx.fill();}if(this.pointer.pulse>0){ctx.strokeStyle=hexA(p[0],this.pointer.pulse*.78);ctx.lineWidth=2+this.pointer.pulse*7;ctx.shadowBlur=42*g;ctx.shadowColor=p[0];ctx.beginPath();ctx.arc(this.pointer.x,this.pointer.y,(1-this.pointer.pulse)*140+20,0,TAU);ctx.stroke();}ctx.restore();};
  Visualizer.prototype.vignette=function(ctx){var gr=ctx.createRadialGradient(this.cx,this.cy,Math.min(this.w,this.h)*.2,this.cx,this.cy,Math.max(this.w,this.h)*.75);gr.addColorStop(0,'rgba(0,0,0,0)');gr.addColorStop(1,'rgba(0,0,0,.62)');ctx.fillStyle=gr;ctx.fillRect(0,0,this.w,this.h);};
  window.Visualizer=Visualizer;
})();
