import { AudioEngine } from './audio.js?v=3';
import { Visualizer } from './visualizer.js?v=3';

const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];

function bootError(message, err) {
  console.error(message, err || '');
  const el = document.createElement('pre');
  el.style.cssText = 'position:fixed;left:12px;right:12px;bottom:12px;z-index:9999;padding:12px;border-radius:14px;background:rgba(0,0,0,.8);color:#53f6ff;white-space:pre-wrap;font:12px/1.35 monospace;';
  el.textContent = `${message}\n${err?.stack || err?.message || err || ''}`;
  document.body.appendChild(el);
}

try {
  const canvas = $('#visualizer');
  if (!canvas) throw new Error('Canvas #visualizer not found');

  const viz = new Visualizer(canvas);
  const audio = new AudioEngine();

  const settings = {
    sensitivity: Number(localStorage.getItem('nv:sensitivity') || 1.45),
    glow: Number(localStorage.getItem('nv:glow') || .82),
    particles: Number(localStorage.getItem('nv:particles') || .9)
  };

  $('#sensitivity').value = settings.sensitivity;
  $('#glow').value = settings.glow;
  $('#particles').value = settings.particles;

  for (const b of $$('.preset')) b.classList.toggle('active', b.dataset.preset === viz.preset);

  let last = performance.now();
  let raf = 0;
  let autoHideTimer = 0;
  let frame = 0;
  let started = false;

  function toast(text) {
    const el = $('#toast');
    el.textContent = text;
    el.classList.add('show');
    clearTimeout(el._t);
    el._t = setTimeout(() => el.classList.remove('show'), 3000);
  }

  function hideStart() {
    $('#startPanel').classList.add('hidden');
    started = true;
    resetAutoHide();
  }

  async function goMic() {
    try {
      await audio.startMic();
      document.body.classList.remove('demo-live');
      document.body.classList.add('mic-live');
      hideStart();
      toast('Микрофон активен — включи музыку рядом или хлопни');
      viz.burst(innerWidth / 2, innerHeight / 2, 2.2);
      tryFullscreen();
    } catch (err) {
      console.error(err);
      audio.lastError = err?.message || String(err);
      audio.startDemo();
      document.body.classList.remove('mic-live');
      document.body.classList.add('demo-live');
      hideStart();
      toast('Микрофон не стартовал. Включил демо. Проверь HTTPS/разрешение.');
      viz.burst(innerWidth / 2, innerHeight / 2, 2.0);
    }
  }

  function goDemo() {
    audio.startDemo();
    document.body.classList.remove('mic-live');
    document.body.classList.add('demo-live');
    hideStart();
    toast('Демо-режим: визуализатор сам генерирует ритм');
    viz.burst(innerWidth / 2, innerHeight / 2, 2.1);
    tryFullscreen();
  }

  function tryFullscreen() {
    const root = document.documentElement;
    if (!document.fullscreenElement && root.requestFullscreen) root.requestFullscreen().catch(() => {});
  }

  function loop(now) {
    const dt = Math.min(.05, (now - last) / 1000 || .016);
    last = now;
    audio.update(dt, settings.sensitivity);
    viz.render(audio, settings, dt);

    if ((frame++ & 7) === 0) {
      $('#modeLabel').textContent = audio.mode;
      $('#levelLabel').textContent = `level ${Math.round(audio.level * 100)}%`;
      const dbg = $('#debugLabel');
      if (dbg) dbg.textContent = `${Math.round(viz.w)}×${Math.round(viz.h)} dpr ${viz.dpr.toFixed(1)} ${audio.lastError ? 'ERR ' + audio.lastError.slice(0, 30) : 'OK'}`;
    }
    raf = requestAnimationFrame(loop);
  }

  function setPreset(name) {
    viz.setPreset(name);
    for (const b of $$('.preset')) b.classList.toggle('active', b.dataset.preset === name);
    toast(`${name.toUpperCase()} preset`);
    viz.burst(innerWidth / 2, innerHeight / 2, 1.15);
  }

  $('#micBtn').addEventListener('click', goMic);
  $('#demoBtn').addEventListener('click', goDemo);
  $('#pulseBtn')?.addEventListener('click', () => {
    hideStart();
    viz.burst(innerWidth / 2, innerHeight / 2, 3.0);
    toast('Canvas работает: это тестовый импульс');
  });
  $('#hideBtn').addEventListener('click', () => $('#ui').classList.add('minimal'));
  $('#wakeBtn').addEventListener('click', () => $('#ui').classList.remove('minimal'));

  for (const b of $$('.preset')) b.addEventListener('click', () => setPreset(b.dataset.preset));

  for (const id of ['sensitivity', 'glow', 'particles']) {
    $('#' + id).addEventListener('input', e => {
      settings[id] = Number(e.target.value);
      localStorage.setItem('nv:' + id, String(settings[id]));
    });
  }

  let swipeStart = null;
  const presetNames = ['nebula', 'rings', 'tunnel', 'bars', 'aurora'];
  window.addEventListener('pointerdown', e => {
    swipeStart = { x: e.clientX, y: e.clientY, t: performance.now() };
    viz.touch(e.clientX, e.clientY, true);
    resetAutoHide();
  }, { passive: false });
  window.addEventListener('pointermove', e => {
    if (e.pressure > 0 || e.buttons) viz.touch(e.clientX, e.clientY, true);
  }, { passive: false });
  window.addEventListener('pointerup', e => {
    viz.pointer.down = false;
    if (!swipeStart) return;
    const dx = e.clientX - swipeStart.x;
    const dy = e.clientY - swipeStart.y;
    if (Math.abs(dx) > 90 && Math.abs(dx) > Math.abs(dy) * 1.6) {
      const i = presetNames.indexOf(viz.preset);
      const next = presetNames[(i + (dx < 0 ? 1 : -1) + presetNames.length) % presetNames.length];
      setPreset(next);
    }
    swipeStart = null;
  }, { passive: false });

  window.addEventListener('resize', () => viz.resize());
  window.addEventListener('orientationchange', () => setTimeout(() => viz.resize(), 250));
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) cancelAnimationFrame(raf);
    else { last = performance.now(); raf = requestAnimationFrame(loop); }
  });

  function resetAutoHide() {
    $('#ui').classList.remove('minimal');
    clearTimeout(autoHideTimer);
    autoHideTimer = setTimeout(() => {
      if (started && $('#startPanel').classList.contains('hidden')) $('#ui').classList.add('minimal');
    }, 9000);
  }

  // Важно: демо-движок стартует сразу, поэтому фон живой даже до разрешения микрофона.
  audio.startDemo();
  document.body.classList.add('demo-live');
  resetAutoHide();
  viz.burst(innerWidth / 2, innerHeight / 2, 1.2);
  raf = requestAnimationFrame(loop);

  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('./sw.js?v=3').then(reg => reg.update()).catch(() => {});
    });
  }
} catch (err) {
  bootError('Neon Visualizer failed to boot', err);
}
