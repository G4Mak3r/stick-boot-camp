const TAU = Math.PI * 2;
const palettes = {
  nebula: ['#53f6ff', '#8d6cff', '#ff4fd8', '#62ffb9'],
  rings: ['#ffd166', '#53f6ff', '#ff4fd8', '#ffffff'],
  tunnel: ['#62ffb9', '#53f6ff', '#8d6cff', '#ff4fd8'],
  bars: ['#53f6ff', '#62ffb9', '#ffd166', '#ff4fd8'],
  aurora: ['#62ffb9', '#53f6ff', '#d8fff4', '#8d6cff']
};

export class Visualizer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d', { alpha: false });
    this.dpr = 1;
    this.w = 0; this.h = 0; this.cx = 0; this.cy = 0;
    this.t = 0;
    this.preset = localStorage.getItem('nv:preset') || 'nebula';
    this.pointer = { x: 0, y: 0, down: false, pulse: 0 };
    this.particles = [];
    this.maxParticles = 360;
    this.resize();
  }

  resize() {
    const maxDpr = Math.min(2, window.devicePixelRatio || 1);
    this.dpr = maxDpr;
    this.w = Math.max(1, innerWidth);
    this.h = Math.max(1, innerHeight);
    this.cx = this.w / 2; this.cy = this.h / 2;
    this.canvas.width = Math.floor(this.w * this.dpr);
    this.canvas.height = Math.floor(this.h * this.dpr);
    this.canvas.style.width = this.w + 'px';
    this.canvas.style.height = this.h + 'px';
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
  }

  setPreset(name) {
    if (!palettes[name]) return;
    this.preset = name;
    localStorage.setItem('nv:preset', name);
  }

  touch(x, y, down = true) {
    this.pointer.x = x; this.pointer.y = y; this.pointer.down = down; this.pointer.pulse = 1;
    for (let i = 0; i < 24; i++) this.spawn(x, y, 1.1, palettes[this.preset][i % 4]);
  }

  spawn(x, y, energy, color) {
    if (this.particles.length > this.maxParticles) this.particles.splice(0, this.particles.length - this.maxParticles);
    const a = Math.random() * TAU;
    const s = (30 + Math.random() * 330) * energy;
    this.particles.push({
      x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: .45 + Math.random() * 1.2,
      age: 0, size: 1 + Math.random() * 4.5, color, spin: (Math.random() - .5) * 8
    });
  }

  render(audio, settings, dt) {
    this.t += dt;
    const ctx = this.ctx;
    const glow = settings.glow;
    const pal = palettes[this.preset];
    this.maxParticles = Math.floor(130 + 390 * settings.particles);

    ctx.globalCompositeOperation = 'source-over';
    const bg = ctx.createLinearGradient(0, 0, this.w, this.h);
    bg.addColorStop(0, '#04050e'); bg.addColorStop(.55, '#07091a'); bg.addColorStop(1, '#02030a');
    ctx.fillStyle = bg; ctx.fillRect(0, 0, this.w, this.h);

    this.drawBackdrop(ctx, audio, pal, glow);
    if (this.preset === 'nebula') this.drawNebula(ctx, audio, pal, glow);
    if (this.preset === 'rings') this.drawRings(ctx, audio, pal, glow);
    if (this.preset === 'tunnel') this.drawTunnel(ctx, audio, pal, glow);
    if (this.preset === 'bars') this.drawBars(ctx, audio, pal, glow);
    if (this.preset === 'aurora') this.drawAurora(ctx, audio, pal, glow);

    this.updateParticles(ctx, audio, dt, pal, glow);
    this.drawVignette(ctx);
  }

  drawBackdrop(ctx, audio, pal, glow) {
    const r = Math.max(this.w, this.h) * (.32 + audio.level * .12);
    const g = ctx.createRadialGradient(this.cx, this.cy, 0, this.cx, this.cy, r);
    g.addColorStop(0, hexAlpha(pal[0], .12 + audio.level * .15));
    g.addColorStop(.4, hexAlpha(pal[1], .08));
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, this.w, this.h);

    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 80; i++) {
      const x = (Math.sin(i * 91.7) * .5 + .5) * this.w;
      const y = (Math.sin(i * 37.1 + 2) * .5 + .5) * this.h;
      const tw = .25 + .75 * Math.sin(this.t * (1 + i % 5) + i);
      ctx.fillStyle = `rgba(180,230,255,${(.06 + tw * .12) * glow})`;
      ctx.beginPath(); ctx.arc(x, y, .7 + tw * 1.5, 0, TAU); ctx.fill();
    }
    ctx.restore();
  }

  drawNebula(ctx, audio, pal, glow) {
    ctx.save(); ctx.translate(this.cx, this.cy); ctx.globalCompositeOperation = 'lighter';
    const bars = 164;
    for (let i = 0; i < bars; i++) {
      const f = audio.freq[Math.floor(i / bars * audio.freq.length)] / 255;
      const a = i / bars * TAU + this.t * .08;
      const base = Math.min(this.w, this.h) * .16;
      const len = base + f * Math.min(this.w, this.h) * .34 + audio.bass * 42;
      const x1 = Math.cos(a) * base, y1 = Math.sin(a) * base;
      const x2 = Math.cos(a) * len, y2 = Math.sin(a) * len;
      ctx.strokeStyle = hexAlpha(pal[i % pal.length], .18 + f * .7);
      ctx.lineWidth = 1 + f * 5;
      ctx.shadowBlur = 22 * glow + f * 34 * glow;
      ctx.shadowColor = pal[i % pal.length];
      ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
    }
    this.drawWaveform(ctx, audio, pal[0], Math.min(this.w, this.h) * (.08 + audio.bass * .05));
    ctx.restore();
  }

  drawRings(ctx, audio, pal, glow) {
    ctx.save(); ctx.translate(this.cx, this.cy); ctx.globalCompositeOperation = 'lighter';
    const count = 9;
    for (let k = 0; k < count; k++) {
      const rr = Math.min(this.w, this.h) * (.09 + k * .045 + audio.bass * .045);
      const bins = 192;
      ctx.beginPath();
      for (let i = 0; i <= bins; i++) {
        const a = i / bins * TAU;
        const f = audio.freq[(i * 3 + k * 23) % audio.freq.length] / 255;
        const wob = Math.sin(a * (3 + k % 5) + this.t * (1.4 + k * .13)) * 8;
        const rad = rr + f * 80 + wob;
        const x = Math.cos(a) * rad, y = Math.sin(a) * rad;
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.strokeStyle = hexAlpha(pal[k % pal.length], .16 + .1 * k);
      ctx.lineWidth = 1.2 + audio.level * 4;
      ctx.shadowBlur = 18 * glow; ctx.shadowColor = pal[k % pal.length];
      ctx.stroke();
    }
    ctx.restore();
  }

  drawTunnel(ctx, audio, pal, glow) {
    ctx.save(); ctx.translate(this.cx, this.cy); ctx.globalCompositeOperation = 'lighter';
    const layers = 38;
    for (let k = layers; k >= 1; k--) {
      const z = k / layers;
      const rot = this.t * (.18 + audio.mid * .7) + k * .22;
      const sides = 6;
      const rad = z * Math.max(this.w, this.h) * .62 * (1 + audio.bass * .18);
      ctx.beginPath();
      for (let i = 0; i <= sides; i++) {
        const a = i / sides * TAU + rot;
        const pulse = 1 + Math.sin(this.t * 3 + k * .42 + i) * .04;
        const x = Math.cos(a) * rad * pulse, y = Math.sin(a) * rad * pulse;
        if (!i) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.strokeStyle = hexAlpha(pal[k % pal.length], .035 + (1 - z) * .32 + audio.level * .1);
      ctx.lineWidth = 1 + (1 - z) * 5;
      ctx.shadowBlur = 16 * glow; ctx.shadowColor = pal[k % pal.length];
      ctx.stroke();
    }
    ctx.restore();
  }

  drawBars(ctx, audio, pal, glow) {
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    const n = 96;
    const gap = 3;
    const bw = this.w / n;
    for (let i = 0; i < n; i++) {
      const f = audio.freq[Math.floor(i / n * audio.freq.length)] / 255;
      const h = 10 + Math.pow(f, 1.4) * this.h * .72;
      const x = i * bw;
      const y = this.h - h - 20;
      const grad = ctx.createLinearGradient(0, y, 0, this.h);
      grad.addColorStop(0, hexAlpha(pal[i % pal.length], .95));
      grad.addColorStop(1, hexAlpha(pal[(i + 1) % pal.length], .18));
      ctx.fillStyle = grad;
      ctx.shadowBlur = 18 * glow; ctx.shadowColor = pal[i % pal.length];
      roundRect(ctx, x + gap, y, Math.max(2, bw - gap * 2), h, 9); ctx.fill();
    }
    this.drawWaveformAt(ctx, audio, pal[2], this.h * .36, glow);
    ctx.restore();
  }

  drawAurora(ctx, audio, pal, glow) {
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (let band = 0; band < 6; band++) {
      ctx.beginPath();
      const y0 = this.h * (.28 + band * .085);
      for (let x = -20; x <= this.w + 20; x += 12) {
        const idx = Math.floor((x / this.w) * audio.freq.length) % audio.freq.length;
        const f = audio.freq[Math.max(0, idx)] / 255;
        const y = y0 + Math.sin(x * .009 + this.t * (1.1 + band * .11) + band) * (28 + band * 8) - f * 120;
        if (x < 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.strokeStyle = hexAlpha(pal[band % pal.length], .18 + audio.mid * .35);
      ctx.lineWidth = 18 + band * 4;
      ctx.shadowBlur = 35 * glow; ctx.shadowColor = pal[band % pal.length];
      ctx.stroke();
    }
    this.drawWaveformAt(ctx, audio, pal[1], this.h * .74, glow);
    ctx.restore();
  }

  drawWaveform(ctx, audio, color, radius) {
    const n = audio.time.length;
    ctx.beginPath();
    for (let i = 0; i <= 256; i++) {
      const a = i / 256 * TAU;
      const v = (audio.time[Math.floor(i / 256 * n)] - 128) / 128;
      const r = radius + v * 70 + audio.level * 30;
      const x = Math.cos(a) * r, y = Math.sin(a) * r;
      if (!i) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.closePath(); ctx.strokeStyle = hexAlpha(color, .68); ctx.lineWidth = 2.2; ctx.stroke();
  }

  drawWaveformAt(ctx, audio, color, y, glow) {
    ctx.beginPath();
    const n = audio.time.length;
    for (let i = 0; i < this.w; i += 4) {
      const v = (audio.time[Math.floor(i / this.w * n)] - 128) / 128;
      const yy = y + v * (42 + audio.level * 90);
      if (!i) ctx.moveTo(i, yy); else ctx.lineTo(i, yy);
    }
    ctx.strokeStyle = hexAlpha(color, .72); ctx.lineWidth = 2.5; ctx.shadowBlur = 18 * glow; ctx.shadowColor = color; ctx.stroke();
  }

  updateParticles(ctx, audio, dt, pal, glow) {
    const spawnRate = (audio.bass * 8 + audio.treble * 4) * this.maxParticles / 360;
    for (let i = 0; i < spawnRate; i++) {
      const a = Math.random() * TAU;
      const r = Math.min(this.w, this.h) * (.09 + Math.random() * .26);
      this.spawn(this.cx + Math.cos(a) * r, this.cy + Math.sin(a) * r, .35 + audio.level, pal[Math.floor(Math.random() * pal.length)]);
    }
    this.pointer.pulse = Math.max(0, this.pointer.pulse - dt * 1.6);
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.age += dt; if (p.age >= p.life) { this.particles.splice(i, 1); continue; }
      p.vx *= Math.pow(.18, dt); p.vy *= Math.pow(.18, dt);
      p.x += p.vx * dt; p.y += p.vy * dt;
      const k = 1 - p.age / p.life;
      ctx.fillStyle = hexAlpha(p.color, k * .86);
      ctx.shadowBlur = (10 + p.size * 5) * glow; ctx.shadowColor = p.color;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.size * (0.4 + k), 0, TAU); ctx.fill();
    }
    if (this.pointer.pulse > 0) {
      ctx.strokeStyle = hexAlpha(pal[0], this.pointer.pulse * .75);
      ctx.lineWidth = 2 + this.pointer.pulse * 7;
      ctx.shadowBlur = 40 * glow; ctx.shadowColor = pal[0];
      ctx.beginPath(); ctx.arc(this.pointer.x, this.pointer.y, (1 - this.pointer.pulse) * 130 + 20, 0, TAU); ctx.stroke();
    }
    ctx.restore();
  }

  drawVignette(ctx) {
    const g = ctx.createRadialGradient(this.cx, this.cy, Math.min(this.w,this.h)*.2, this.cx, this.cy, Math.max(this.w,this.h)*.72);
    g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,.62)');
    ctx.fillStyle = g; ctx.fillRect(0,0,this.w,this.h);
  }
}

function hexAlpha(hex, a) {
  const c = hex.replace('#','');
  const n = parseInt(c,16);
  return `rgba(${(n>>16)&255},${(n>>8)&255},${n&255},${Math.max(0,Math.min(1,a))})`;
}

function roundRect(ctx, x, y, w, h, r) {
  r = Math.min(r, w / 2, h / 2);
  ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
}
