(function(){
  function clamp(v,a,b){return Math.max(a,Math.min(b,v));}
  function AudioEngine(){
    this.ctx=null; this.analyser=null; this.source=null; this.stream=null;
    this.freq=new Uint8Array(1024); this.time=new Uint8Array(2048);
    this.mode='DEMO'; this.demo=true; this.phase=0; this.level=0; this.raw=0; this.bass=0; this.mid=0; this.treble=0; this.error='';
    this.makeDemo(0);
  }
  AudioEngine.prototype.ensureContext=async function(){
    var AC=window.AudioContext||window.webkitAudioContext;
    if(!AC) throw new Error('Web Audio API not supported');
    if(!this.ctx) this.ctx=new AC({latencyHint:'interactive'});
    if(this.ctx.state!=='running') await this.ctx.resume();
    return this.ctx;
  };
  AudioEngine.prototype.startDemo=function(){this.demo=true;this.mode='DEMO';this.error='';};
  AudioEngine.prototype.stopStream=function(){
    try{if(this.source) this.source.disconnect();}catch(e){}
    this.source=null;
    if(this.stream){this.stream.getTracks().forEach(function(t){t.stop();});}
    this.stream=null;
  };
  AudioEngine.prototype.startMic=async function(){
    this.error='';
    if(!navigator.mediaDevices||!navigator.mediaDevices.getUserMedia) throw new Error('Нет getUserMedia. Открой через HTTPS GitHub Pages.');
    var ctx=await this.ensureContext();
    this.stopStream();
    this.stream=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:false,noiseSuppression:false,autoGainControl:false,channelCount:1},video:false});
    this.analyser=ctx.createAnalyser();
    this.analyser.fftSize=2048; this.analyser.minDecibels=-100; this.analyser.maxDecibels=-5; this.analyser.smoothingTimeConstant=.62;
    this.freq=new Uint8Array(this.analyser.frequencyBinCount); this.time=new Uint8Array(this.analyser.fftSize);
    this.source=ctx.createMediaStreamSource(this.stream); this.source.connect(this.analyser);
    this.demo=false; this.mode='MIC LIVE';
  };
  AudioEngine.prototype.update=function(dt,sensitivity){
    try{
      if(this.demo||!this.analyser){this.phase+=dt;this.makeDemo(this.phase);} else {this.analyser.getByteFrequencyData(this.freq);this.analyser.getByteTimeDomainData(this.time);}
    }catch(e){this.error=e.message||String(e);this.startDemo();this.makeDemo(this.phase);}
    var n=this.freq.length, bassEnd=Math.max(10,Math.floor(n*.08)), midEnd=Math.max(bassEnd+1,Math.floor(n*.35));
    function avg(arr,a,b){var s=0,end=Math.min(arr.length,b);for(var i=a;i<end;i++)s+=arr[i]||0;return s/Math.max(1,end-a)/255;}
    var rms=0,c=0; for(var j=0;j<this.time.length;j+=4){var v=((this.time[j]||128)-128)/128;rms+=v*v;c++;} rms=Math.sqrt(rms/Math.max(1,c));
    var floor=this.demo?.035:.025;
    this.bass=clamp(avg(this.freq,1,bassEnd)*sensitivity*1.9+rms*.55,floor,1);
    this.mid=clamp(avg(this.freq,bassEnd,midEnd)*sensitivity*1.45+rms*.30,floor*.8,1);
    this.treble=clamp(avg(this.freq,midEnd,n)*sensitivity*2.2,floor*.55,1);
    this.raw=clamp(this.bass*.55+this.mid*.32+this.treble*.13+rms*sensitivity*.65,0,1);
    this.level += (this.raw-this.level)*(1-Math.pow(.0009,dt));
  };
  AudioEngine.prototype.makeDemo=function(t){
    var n=this.freq.length, beat=Math.pow(Math.max(0,Math.sin(t*2.55)),8), beat2=Math.pow(Math.max(0,Math.sin(t*1.21+1.2)),5);
    for(var i=0;i<n;i++){
      var x=i/n;
      var bass=238*Math.exp(-x*19)*(.40+beat*1.05);
      var form=118*Math.exp(-Math.pow((x-(.18+Math.sin(t*.33)*.055))/.058,2))*(.55+beat2*.85);
      var mid=84*Math.exp(-Math.pow((x-.42)/.095,2))*(.42+Math.sin(t*1.8)*.23);
      var hi=38*Math.max(0,Math.sin(t*13+i*.1));
      this.freq[i]=clamp(bass+form+mid+hi+10+Math.random()*14,0,255)|0;
    }
    for(var k=0;k<this.time.length;k++){
      var y=128+Math.sin(k*.046+t*6.6)*(28+beat*25)+Math.sin(k*.013+t*2.3)*16;
      this.time[k]=clamp(y,0,255)|0;
    }
  };
  window.AudioEngine=AudioEngine;
})();
