// SALTROAD boot and the one loop: input is read every frame, the world
// advances in fixed 1/60 s steps (several in a slow frame, none in a fast
// one), and the renderer paints what is there. The game moves between five
// screens: title, play, upgrade at the outfitter's camp, win and lose —
// every one of them reachable, every one restartable.
//
// ?seed=N fixes the leg's spawns. ?shot=title|play|win|lose (with
// &seed=N) stages that scene instead of running the loop, paints it twice
// and sets window.__shotReady plus body[data-ready="1"] for screenshots.
import { BEST_KEY, STEP } from './config.js';
import { createRandom } from './random.js';
import { createWorld, update } from './world.js';
import { createInput } from './input.js';
import { createAudio } from './audio.js';
import { createRenderer } from './render.js';
import { stageShot } from './shots.js';

const MAX_FRAME = 0.25;

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : 20261117;

const canvas = document.getElementById('game');
const status = document.getElementById('status');
const world = createWorld(createRandom(seed));
const renderer = createRenderer(canvas);
const input = createInput(canvas);
const audio = createAudio();

function readBest() {
  try {
    return Number.parseInt(window.localStorage.getItem(BEST_KEY) ?? '0', 10) || 0;
  } catch {
    return 0;
  }
}

function saveBest(value) {
  try {
    window.localStorage.setItem(BEST_KEY, String(value));
  } catch {
    // Storage can be off (private windows): the best score then lasts this visit only.
  }
}

world.best = readBest();
// Debug handle for play-testing (read-only from the outside in practice):
// lets a test script watch the simulation without touching game logic.
window.__saltroad = world;

function runShot(name) {
  const scene = stageShot(name, world);
  world.best = scene.best;
  let painted = 0;
  function paint() {
    renderer.draw(world, scene.screen);
    painted += 1;
    if (painted < 2) requestAnimationFrame(paint);
    else {
      window.__shotReady = true;
      document.body.dataset.ready = '1';
    }
  }
  requestAnimationFrame(paint);
}

function resize() {
  const scale = renderer.fit();
  const rect = canvas.getBoundingClientRect();
  input.setViewport(scale, 0, 0);
  void rect;
}

window.addEventListener('resize', resize);
resize();

if (shot) {
  runShot(shot);
} else {
  let last = performance.now();
  let acc = 0;
  function frame(now) {
    const dt = Math.min(MAX_FRAME, (now - last) / 1000);
    last = now;
    acc += dt;
    let steps = 0;
    while (acc >= STEP && steps < 5) {
      const before = world.screen;
      update(world, input, audio, STEP);
      acc -= STEP;
      steps += 1;
      // Consume input edges after EVERY step, not just once per frame:
      // several steps can run in one frame, and a single keypress must
      // buy one trade, rotate the wagons once, fire one cannon — not once
      // per step.
      input.endFrame();
      if (world.screen !== before && (world.screen === 'win' || world.screen === 'lose')) {
        saveBest(world.best);
      }
    }
    if (steps === 5) acc = 0;
    renderer.draw(world, world.screen);
    status.textContent = statusLine(world);
    input.endFrame();
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}

function statusLine(w) {
  if (w.screen === 'title') return 'SALTROAD: press Enter to begin. Guide the caravan, reach the far city in 7 legs.';
  if (w.screen === 'win') return `You win! Final score ${w.result ? w.result.score : w.score}. Press Enter to ride again.`;
  if (w.screen === 'lose') return `Game over: ${w.loseReason}. Final score ${w.result ? w.result.score : w.score}. Press Enter to ride again.`;
  if (w.screen === 'upgrade') return `Outfitter's camp after leg ${w.leg}. Draft an upgrade, choose your road, trade at the post: press 1, 2 or 3.`;
  return `Leg ${w.leg} of 7, ${w.weather}. Score ${Math.floor(w.score)}. Caravan ${Math.ceil(w.caravan.hp)}. Salt ${w.salt}, supplies ${Math.floor(w.supplies)}, water ${Math.floor(w.water)}. Streak x${w.streak}.`;
}
