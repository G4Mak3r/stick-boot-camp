import {AudioKit} from './sound.js';
import {Input} from './input.js';
import {Game} from './game.js';

const canvas = document.getElementById('game');
const audio = new AudioKit();
const input = new Input(audio);
const game = new Game(canvas, input, audio);

let last = performance.now();
function frame(now){
  const raw = Math.min(0.033, (now-last)/1000 || 0.016);
  last = now;
  game.tick(raw);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

window.addEventListener('resize',()=>game.resize(), {passive:true});
window.addEventListener('orientationchange',()=>setTimeout(()=>game.resize(),120), {passive:true});
document.addEventListener('visibilitychange',()=>{ if(document.hidden) game.pause('PAUSED'); });
window.addEventListener('blur',()=>game.pause('PAUSED'));
