export class AudioEngine {
  constructor() {
    this.ctx = null;
    this.analyser = null;
    this.freq = new Uint8Array(1024);
    this.time = new Uint8Array(1024);
    this.mode = 'IDLE';
    this.demoPhase = 0;
    this.demo = false;
    this.stream = null;
    this.level = 0;
    this.bass = 0;
    this.mid = 0;
    this.treble = 0;
  }

  async startMic() {
    this.ctx = this.ctx || new (window.AudioContext || window.webkitAudioContext)({ latencyHint: 'interactive' });
    await this.ctx.resume();
    this.stream = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
      video: false
    });
    const source = this.ctx.createMediaStreamSource(this.stream);
    this.analyser = this.ctx.createAnalyser();
    this.analyser.fftSize = 2048;
    this.analyser.smoothingTimeConstant = 0.76;
    this.freq = new Uint8Array(this.analyser.frequencyBinCount);
    this.time = new Uint8Array(this.analyser.fftSize);
    source.connect(this.analyser);
    this.demo = false;
    this.mode = 'MIC LIVE';
  }

  startDemo() {
    this.demo = true;
    this.mode = 'DEMO SYNTH';
  }

  stopStream() {
    if (this.stream) this.stream.getTracks().forEach(t => t.stop());
    this.stream = null;
  }

  update(dt, sensitivity = 1) {
    if (this.demo || !this.analyser) {
      this.demoPhase += dt;
      this.makeDemo(this.demoPhase);
    } else {
      this.analyser.getByteFrequencyData(this.freq);
      this.analyser.getByteTimeDomainData(this.time);
    }

    const n = this.freq.length;
    const bassEnd = Math.max(8, Math.floor(n * 0.08));
    const midEnd = Math.max(bassEnd + 1, Math.floor(n * 0.34));
    const avg = (a, b) => {
      let s = 0;
      for (let i = a; i < b; i++) s += this.freq[i] || 0;
      return s / Math.max(1, b - a) / 255;
    };
    this.bass = Math.min(1, avg(1, bassEnd) * sensitivity * 1.42);
    this.mid = Math.min(1, avg(bassEnd, midEnd) * sensitivity * 1.25);
    this.treble = Math.min(1, avg(midEnd, n) * sensitivity * 1.8);
    const raw = this.bass * .48 + this.mid * .33 + this.treble * .19;
    this.level += (Math.min(1, raw) - this.level) * (1 - Math.pow(.001, dt));
  }

  makeDemo(t) {
    const n = this.freq.length;
    const beat = Math.pow(Math.max(0, Math.sin(t * 2.15)), 7);
    for (let i = 0; i < n; i++) {
      const x = i / n;
      const bass = 210 * Math.exp(-x * 18) * (0.45 + beat * 0.9);
      const formant = 95 * Math.exp(-Math.pow((x - (0.18 + Math.sin(t * .37) * .04)) / .055, 2));
      const hi = 55 * Math.max(0, Math.sin(t * 9 + i * .07));
      const noise = 18 * Math.random();
      this.freq[i] = Math.max(0, Math.min(255, bass + formant + hi + noise));
    }
    for (let i = 0; i < this.time.length; i++) {
      const v = 128 + Math.sin(i * .045 + t * 6) * 34 + Math.sin(i * .011 + t * 2.2) * 24;
      this.time[i] = Math.max(0, Math.min(255, v));
    }
  }
}
