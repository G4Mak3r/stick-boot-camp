export class AudioKit{
  constructor(){ this.ctx=null; this.master=null; this.enabled=false; }
  unlock(){
    if(this.enabled) return;
    const C = window.AudioContext || window.webkitAudioContext;
    if(!C) return;
    this.ctx = this.ctx || new C();
    this.master = this.master || this.ctx.createGain();
    this.master.gain.value=.28; this.master.connect(this.ctx.destination);
    if(this.ctx.state==='suspended') this.ctx.resume();
    this.enabled=true;
  }
  tone(type='sine', f=440, dur=.08, gain=.2, slide=0){
    if(!this.ctx) return; const t=this.ctx.currentTime;
    const o=this.ctx.createOscillator(), g=this.ctx.createGain(); o.type=type; o.frequency.setValueAtTime(f,t); if(slide) o.frequency.exponentialRampToValueAtTime(Math.max(30,f+slide), t+dur);
    g.gain.setValueAtTime(gain,t); g.gain.exponentialRampToValueAtTime(.001,t+dur);
    o.connect(g); g.connect(this.master); o.start(t); o.stop(t+dur+.02);
  }
  noise(dur=.08, gain=.15, filter=900){
    if(!this.ctx) return; const t=this.ctx.currentTime, len=Math.max(1, this.ctx.sampleRate*dur|0);
    const b=this.ctx.createBuffer(1,len,this.ctx.sampleRate), d=b.getChannelData(0); for(let i=0;i<len;i++) d[i]=(Math.random()*2-1)*(1-i/len);
    const s=this.ctx.createBufferSource(); s.buffer=b; const f=this.ctx.createBiquadFilter(); f.type='bandpass'; f.frequency.value=filter; const g=this.ctx.createGain(); g.gain.value=gain;
    s.connect(f); f.connect(g); g.connect(this.master); s.start(t);
  }
  shot(w){ this.unlock(); const m={pistol:[420,.07,.22,900], rifle:[520,.045,.16,1300], shotgun:[210,.11,.32,550]}[w]||[400,.06,.2,900]; this.noise(m[1],m[2],m[3]); this.tone('square',m[0],m[1],.045,-120); }
  click(){ this.unlock(); this.tone('square',135,.045,.08,-30); }
  reload(){ this.unlock(); this.tone('triangle',260,.07,.08,90); setTimeout(()=>this.tone('triangle',180,.06,.07,110),120); }
  hit(){ this.unlock(); this.noise(.05,.08,420); }
  pickup(){ this.unlock(); this.tone('sine',660,.08,.12,260); }
  death(){ this.unlock(); this.tone('sawtooth',180,.18,.12,-120); }
}
