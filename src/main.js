import { AudioEngine } from './audio.js';
import { Visualizer } from './visualizer.js';

const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const canvas = $('#visualizer');
const viz = new Visualizer(canvas);
const audio = new AudioEngine();

const settings = {
  sensitivity: Number(localStorage.getItem('nv:sensitivity') || 1.25),
  glow: Number(localStorage.getItem('nv:glow') || .75),
  particles: Number(localStorage.getItem('nv:particles') || .85)
};

$('#sensitivity').value = settings.sensitivity;
$('#glow').value = settings.glow;
$('#particles').value = settings.particles;

for (const b of $$('.preset')) b.classList.toggle('active', b.dataset.preset === viz.preset);

let last = performance.now();
let raf = 0;
let autoHideTimer = 0;

function toast(text) {
  const el = $('#toast');
  el.textContent = text;
  el.classList.add('show');
  clearTimeout(el._t);
  el._t = setTimeout(() => el.classList.remove('show'), 2600);
}

function hideStart() { $('#startPanel').classList.add('hidden'); }

async function goMic() {
  try {
    await audio.startMic();
    hideStart();
    toast('Микрофон активен — включай музыку рядом');
    tryFullscreen();
  } catch (err) {
    console.error(err);
    toast('Микрофон недоступен. Запускаю демо-режим.');
    audio.startDemo();
    hideStart();
  }
}

function goDemo() {
  audio.startDemo();
  hideStart();
  toast('Демо-режим: визуализатор сам генерирует ритм');
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
  $('#modeLabel').textContent = audio.mode;
  $('#levelLabel').textContent = `level ${Math.round(audio.level * 100)}%`;
  raf = requestAnimationFrame(loop);
}

function setPreset(name) {
  viz.setPreset(name);
  for (const b of $$('.preset')) b.classList.toggle('active', b.dataset.preset === name);
  toast(`${name.toUpperCase()} preset`);
}

$('#micBtn').addEventListener('click', goMic);
$('#demoBtn').addEventListener('click', goDemo);
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
    if ($('#startPanel').classList.contains('hidden')) $('#ui').classList.add('minimal');
  }, 9000);
}
resetAutoHide();
raf = requestAnimationFrame(loop);

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => navigator.serviceWorker.register('./sw.js').catch(() => {}));
}
