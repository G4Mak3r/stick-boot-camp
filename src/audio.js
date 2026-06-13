export class AudioEngine {
  constructor() {
    this.ctx = null;
    this.analyser = null;
    this.source = null;
    this.freq = new Uint8Array(1024);
    this.time = new Uint8Array(2048);
    this.mode = 'DEMO READY';
    this.demoPhase = 0;
    this.demo = true;
    this.stream = null;
    this.level = 0;
    this.rawLevel = 0;
    this.bass = 0;
    this.mid = 0;
    this.treble = 0;
    this.ok = false;
    this.lastError = '';
    this.startDemo();
  }

  async ensureContext() {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) throw new Error('Web Audio API not supported');
    if (!this.ctx) this.ctx = new AC({ latencyHint: 'interactive' });
    if (this.ctx.state !== 'running') await this.ctx.resume();
    return this.ctx;
  }

  async startMic() {
    this.lastError = '';
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      throw new Error('getUserMedia unavailable: open via HTTPS GitHub Pages, not file preview');
    }
    const ctx = await this.ensureContext();
    this.stopStream();

    this.stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: false,
        noiseSuppression: false,
        autoGainControl: false,
        channelCount: 1
      },
      video: false
    });

    this.analyser = ctx.createAnalyser();
    this.analyser.fftSize = 2048;
    this.analyser.minDecibels = -95;
    this.analyser.maxDecibels = -8;
    this.analyser.smoothingTimeConstant = 0.68;
    this.freq = new Uint8Array(this.analyser.frequencyBinCount);
    this.time = new Uint8Array(this.analyser.fftSize);
    this.source = ctx.createMediaStreamSource(this.stream);
    this.source.connect(this.analyser);

    this.demo = false;
    this.ok = true;
    this.mode = 'MIC LIVE';
    return true;
  }

  startDemo() {
    this.demo = true;
    this.ok = true;
    this.mode = 'DEMO SYNTH';
    if (!this.freq || this.freq.length < 64) this.freq = new Uint8Array(1024);
    if (!this.time || this.time.length < 64) this.time = new Uint8Array(2048);
  }

  stopStream() {
    if (this.source) {
      try { this.source.disconnect(); } catch (_) {}
    }
    this.source = null;
    if (this.stream) this.stream.getTracks().forEach(t => t.stop());
    this.stream = null;
  }

  update(dt, sensitivity = 1) {
    try {
      if (this.demo || !this.analyser) {
        this.demoPhase += dt;
        this.makeDemo(this.demoPhase);
      } else {
        if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume().catch(() => {});
        this.analyser.getByteFrequencyData(this.freq);
        this.analyser.getByteTimeDomainData(this.time);
      }
    } catch (e) {
      this.lastError = e.message || String(e);
      this.startDemo();
    }

    const n = Math.max(1, this.freq.length);
    const bassEnd = Math.max(8, Math.floor(n * 0.075));
    const midEnd = Math.max(bassEnd + 1, Math.floor(n * 0.33));
    const avg = (a, b) => {
      let s = 0;
      const end = Math.min(n, b);
      for (let i = a; i < end; i++) s += this.freq[i] || 0;
      return s / Math.max(1, end - a) / 255;
    };

    let rms = 0;
    for (let i = 0; i < this.time.length; i += 4) {
      const v = ((this.time[i] || 128) - 128) / 128;
      rms += v * v;
    }
    rms = Math.sqrt(rms / Math.max(1, Math.floor(this.time.length / 4)));

    const visualFloor = this.demo ? 0 : 0.018;
    this.bass = Math.min(1, Math.max(visualFloor, avg(1, bassEnd) * sensitivity * 1.8 + rms * 0.45));
    this.mid = Math.min(1, Math.max(visualFloor * 0.75, avg(bassEnd, midEnd) * sensitivity * 1.38 + rms * 0.25));
    this.treble = Math.min(1, Math.max(visualFloor * 0.5, avg(midEnd, n) * sensitivity * 2.0));

    const raw = Math.min(1, this.bass * .52 + this.mid * .32 + this.treble * .16 + rms * sensitivity * 0.65);
    this.rawLevel = raw;
    this.level += (raw - this.level) * (1 - Math.pow(0.0005, dt));
  }

  makeDemo(t) {
    const n = this.freq.length;
    const beat = Math.pow(Math.max(0, Math.sin(t * 2.35)), 8);
    const beat2 = Math.pow(Math.max(0, Math.sin(t * 1.13 + 1.4)), 5);
    for (let i = 0; i < n; i++) {
      const x = i / n;
      const bass = 235 * Math.exp(-x * 20) * (0.42 + beat * 0.95);
      const formant = 110 * Math.exp(-Math.pow((x - (0.18 + Math.sin(t * .31) * .055)) / .06, 2)) * (0.55 + beat2 * .8);
      const second = 78 * Math.exp(-Math.pow((x - 0.38) / .09, 2)) * (0.4 + Math.sin(t * 1.9) * .25);
      const hi = 42 * Math.max(0, Math.sin(t * 12 + i * .095));
      const noise = 12 + 16 * Math.random();
      this.freq[i] = Math.max(0, Math.min(255, bass + formant + second + hi + noise));
    }
    for (let i = 0; i < this.time.length; i++) {
      const v = 128 + Math.sin(i * .047 + t * 6.8) * (28 + beat * 24) + Math.sin(i * .013 + t * 2.1) * 18;
      this.time[i] = Math.max(0, Math.min(255, v));
    }
  }
}
