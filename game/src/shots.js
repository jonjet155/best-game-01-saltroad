// Staged scenes for screenshots: ?shot=title|play|win|lose&seed=N builds a
// fixed, deterministic scene with the seeded generator and paints it twice,
// then sets window.__shotReady (and body[data-ready]) so the screenshot
// script knows the frame is done. No wall clock is read here.
import { SCREEN_LOSE, SCREEN_PLAY, SCREEN_TITLE, SCREEN_WIN, startGame, startLeg } from './world.js';
import { createHazard } from './hazards.js';
import { LEGS } from './config.js';

export function stageShot(name, world) {
  if (name === 'title') {
    world.screen = SCREEN_TITLE;
    world.best = 29180;
    world.time = 0.6;
    return { screen: SCREEN_TITLE, best: world.best };
  }
  if (name === 'win' || name === 'lose') {
    startGame(world);
    if (name === 'win') {
      world.screen = SCREEN_WIN;
      world.score = 31240;
      world.kills = 187;
      world.legsDone = LEGS;
      world.saltEarned = 214;
      world.bestStreak = 12;
      world.result = { score: 31240, kills: 187, legs: 7, salt: 214, best: 31240, streak: 12 };
      world.best = 31240;
      return { screen: SCREEN_WIN, best: 31240 };
    }
    world.screen = SCREEN_LOSE;
    world.score = 11860;
    world.kills = 74;
    world.legsDone = 4;
    world.saltEarned = 96;
    world.bestStreak = 6;
    world.caravan.hp = 0;
    world.loseReason = 'THE CARAVAN WAS BROKEN ON THE ROAD';
    world.result = { score: 11860, kills: 74, legs: 4, salt: 96, best: 31240, streak: 6 };
    world.best = 31240;
    return { screen: SCREEN_LOSE, best: 31240 };
  }
  // play: a dense mid-journey on leg 3 in a heat wave, HUD full — water,
  // weather, wagons, crew, streak, and the new hazards all on screen.
  startGame(world);
  startLeg(world, 3, null);
  world.weather = 'heat';
  world.score = 6840;
  world.best = 18260;
  world.salt = 41;
  world.supplies = 38;
  world.water = 55;
  world.chain = 3;
  world.chainTimer = 2.0;
  world.streak = 5;
  world.bestStreak = 7;
  world.kills = 61;
  world.saltEarned = 96;
  world.companions.scout = true;
  world.warden.x = 470;
  world.warden.y = 400;
  world.warden.hp = 78;
  world.caravan.hp = 74;
  world.caravan.wagons[0].hp = 84;
  world.caravan.wagons[1].hp = 41;
  world.distance = 412;
  const kinds = ['rock', 'raider', 'worm', 'gap', 'raider', 'storm', 'raider', 'rock', 'mirage', 'raider', 'slide', 'wisp'];
  const spots = [
    [1120, 420], [980, 520], [1180, 540], [860, 380], [1050, 460],
    [760, 560], [1210, 360], [900, 580], [690, 420], [1150, 480],
    [820, 500], [1000, 380],
  ];
  kinds.forEach((kind, i) => {
    const [x, y] = spots[i];
    const h = createHazard(kind, x, y, 3);
    if (kind === 'worm') h.mode = 'active';
    if (kind === 'slide') h.timer = 1.8;
    world.hazards.push(h);
  });
  world.hazards[3].bridged = true; // one gap already planked over
  world.spawnQueue = ['rock', 'raider', 'gap', 'wisp', 'worm', 'rock'];
  world.totalToSpawn = 17;
  world.spawned = 11;
  world.shots.push({ x: 560, y: 390, vx: 500, vy: -160, traveled: 120, damage: 26, range: 700 });
  world.shots.push({ x: 620, y: 360, vx: 560, vy: -120, traveled: 200, damage: 26, range: 700 });
  world.floats.push({ x: 420, y: 240, text: '+40', color: '#fef3c7', life: 0.9, maxLife: 1.1 });
  world.floats.push({ x: 980, y: 320, text: '+80', color: '#fbbf24', life: 0.8, maxLife: 1.1 });
  world.floats.push({ x: 700, y: 260, text: 'STREAK x5', color: '#38bdf8', life: 1.0, maxLife: 1.1 });
  world.floats.push({ x: 560, y: 520, text: '+3 SALT', color: '#fef3c7', life: 0.7, maxLife: 1.1 });
  world.pickups.push({ x: 500, y: 500, kind: 'salt', value: 3, vx: 0, vy: 0 });
  world.pickups.push({ x: 830, y: 490, kind: 'supplies', value: 2, vx: 0, vy: 0 });
  world.banner = 'LEG 3 OF 7 — HEAT WAVE';
  world.bannerTimer = 1.5;
  world.time = 24.5;
  return { screen: SCREEN_PLAY, best: world.best };
}
