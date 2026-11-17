// The simulation: one world, one fixed step, no wall clock inside it.
// Screens: title -> play -> camp (outfitter's camp: draft an upgrade,
// choose the road, trade salt at the post) -> ... -> win / lose. The
// caravan rolls on its own; the Warden clears the road ahead of it with
// salt-shots, the salt cannon, bridges and the horn, while weather,
// wagons, companions and a clear-streak shape every leg.
import {
  BRIDGE_COOLDOWN, BRIDGE_COST_SUPPLIES, BRIDGE_RANGE, CANNON_COOLDOWN,
  CANNON_COST_SALT, CANNON_DAMAGE, CANNON_RADIUS, CARAVAN_MAX_HP,
  CONDENSER_RATE, GUARD_DAMAGE, GUARD_SPEED, HEAT_DRAIN_PER_SEC, HORN_COOLDOWN,
  LEGS, LEG_PLANS, RAIN_RATE, ROAD_BOTTOM, ROAD_TOP, ROAD_Y, ROUTES,
  SHOT_COOLDOWN, SHOT_DAMAGE, SHOT_RANGE, SHOT_SPEED, START_SALT,
  START_SUPPLIES, START_WATER, SUPPLY_DRAIN_PER_SEC, THIRST_HULL_PER_SEC,
  TRADES, UPGRADES, VIEW_H, VIEW_W, WAGON_TYPES, WARDEN_MAX_HP,
  WARDEN_RADIUS, WARDEN_SPEED, WATER_MAX, WEATHERS,
} from './config.js';
import { createCaravan, damageCaravan, hasWagon, repairCaravan, repairWagons, rotateWagons } from './caravan.js';
import { createHazard, pickKindForLeg, spawnPoint, updateHazard } from './hazards.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_UPGRADE = 'upgrade'; // the outfitter's camp
export const SCREEN_WIN = 'win';
export const SCREEN_LOSE = 'lose';

// Upgrade / route card layout, shared by the world (clicks) and the renderer.
export function cardRect(i) {
  return { x: 250 + i * 280, y: 290, w: 240, h: 170 };
}

// Trading-post button layout (7 buttons in a row under the cards).
export function tradeRect(i) {
  return { x: 90 + i * 170, y: 520, w: 158, h: 70 };
}

export function upgradeCardAt(world, mx, my) {
  if (world.screen !== SCREEN_UPGRADE || world.campPhase !== 'upgrade') return -1;
  for (let i = 0; i < world.upgradeOptions.length; i += 1) {
    const r = cardRect(i);
    if (mx >= r.x && mx <= r.x + r.w && my >= r.y && my <= r.y + r.h) return i;
  }
  return -1;
}

export function routeCardAt(world, mx, my) {
  if (world.screen !== SCREEN_UPGRADE || world.campPhase !== 'route') return -1;
  for (let i = 0; i < ROUTES.length; i += 1) {
    const r = cardRect(i);
    if (mx >= r.x && mx <= r.x + r.w && my >= r.y && my <= r.y + r.h) return i;
  }
  return -1;
}

export function tradeCardAt(world, mx, my) {
  if (world.screen !== SCREEN_UPGRADE) return -1;
  for (let i = 0; i < TRADES.length; i += 1) {
    const r = tradeRect(i);
    if (mx >= r.x && mx <= r.x + r.w && my >= r.y && my <= r.y + r.h) return i;
  }
  return -1;
}

export function createWorld(rng) {
  return {
    rng,
    screen: SCREEN_TITLE,
    paused: false,
    time: 0,
    score: 0,
    best: 0,
    chain: 0,
    chainTimer: 0,
    streak: 0, // hazards cleared since the caravan last took damage
    bestStreak: 0,
    leg: 1,
    distance: 0,
    legLength: LEG_PLANS[0].length,
    legSpeed: LEG_PLANS[0].speed,
    distanceTotal: 0,
    spawnQueue: [],
    spawnAt: 0, // next spawn, in metres of this leg
    spawned: 0,
    totalToSpawn: 0,
    bossSpawned: false,
    bossFight: false,
    weather: 'clear',
    salt: START_SALT,
    supplies: START_SUPPLIES,
    water: START_WATER,
    caravan: createCaravan(),
    warden: { x: 430, y: ROAD_Y - 60, hp: WARDEN_MAX_HP, maxHp: WARDEN_MAX_HP, hitFlash: 0, down: false, downTimer: 0 },
    guards: [
      { x: 210, y: ROAD_Y - 46, state: 'ride', tx: 0, ty: 0, target: null },
      { x: 210, y: ROAD_Y + 46, state: 'ride', tx: 0, ty: 0, target: null },
    ],
    companions: { scout: false, healer: false, captain: false },
    upgrades: {
      maxHpBonus: 0, healNow: 0, speedMult: 1, cannonDamage: 0, cannonRadius: 0,
      guardDamage: 0, hornCut: 0, saltBonus: 0, saltNow: 0, armorMult: 1,
      shotDamage: 0, shotRange: 0, supplyNow: 0, drainMult: 1,
      ballista: false, condenser: false,
    },
    owned: [],
    upgradeOptions: [],
    campPhase: 'upgrade', // 'upgrade' then 'route'
    route: null,
    hazards: [],
    shots: [],
    spears: [],
    pickups: [],
    particles: [],
    floats: [],
    shotCooldown: 0,
    cannonCooldown: 0,
    bridgeCooldown: 0,
    hornCooldown: 0,
    ballistaTimer: 0,
    cannonFlash: 0,
    kills: 0,
    shotsFired: 0,
    saltEarned: 0,
    legsDone: 0,
    banner: '',
    bannerTimer: 0,
    loseReason: '',
    result: null,
  };
}

function freshUpgrades() {
  return {
    maxHpBonus: 0, healNow: 0, speedMult: 1, cannonDamage: 0, cannonRadius: 0,
    guardDamage: 0, hornCut: 0, saltBonus: 0, saltNow: 0, armorMult: 1,
    shotDamage: 0, shotRange: 0, supplyNow: 0, drainMult: 1,
    ballista: false, condenser: false,
  };
}

export function startGame(world) {
  const best = world.best;
  const rng = world.rng;
  const fresh = createWorld(rng);
  Object.assign(world, fresh, { best, rng });
  world.upgrades = freshUpgrades();
  world.screen = SCREEN_PLAY;
  startLeg(world, 1, null);
}

export function scrollSpeedOf(world) {
  if (world.bossFight) return 0;
  return (96 + world.leg * 6) * world.upgrades.speedMult;
}

function rollWeather(world, leg) {
  if (leg >= LEGS) return 'storm'; // the chief rides in on a sandstorm
  const r = world.rng.next();
  if (r < 0.5) return 'clear';
  if (r < 0.7) return 'heat';
  if (r < 0.9) return 'storm';
  return 'rain';
}

export function startLeg(world, leg, route) {
  const plan = LEG_PLANS[leg - 1];
  const mult = route || { lengthMult: 1, countMult: 1, waterBonus: 0, supplyBonus: 0 };
  world.leg = leg;
  world.distance = 0;
  world.legLength = Math.round(plan.length * mult.lengthMult);
  world.legSpeed = plan.speed;
  world.route = route;
  world.weather = rollWeather(world, leg);
  if (mult.waterBonus) world.water = Math.min(WATER_MAX, world.water + mult.waterBonus);
  if (mult.supplyBonus) world.supplies += mult.supplyBonus;
  const count = Math.max(4, Math.round(plan.count * mult.countMult));
  world.spawnQueue = [];
  for (let i = 0; i < count; i += 1) {
    world.spawnQueue.push(pickKindForLeg(plan, world.rng));
  }
  for (let i = world.spawnQueue.length - 1; i > 0; i -= 1) {
    const j = Math.floor(world.rng.next() * (i + 1));
    [world.spawnQueue[i], world.spawnQueue[j]] = [world.spawnQueue[j], world.spawnQueue[i]];
  }
  world.totalToSpawn = count;
  world.spawned = 0;
  world.spawnAt = world.legLength / count;
  world.bossSpawned = false;
  world.bossFight = false;
  world.banner = leg === LEGS
    ? 'LEG 7 — THE FAR CITY IS NEAR'
    : `LEG ${leg} OF ${LEGS} — ${WEATHERS[world.weather].name}`;
  world.bannerTimer = 2.6;
}

function offerUpgrades(world) {
  const pool = UPGRADES.filter((u) => !world.owned.includes(u.id));
  const options = [];
  while (options.length < 3 && pool.length > 0) {
    const i = Math.floor(world.rng.next() * pool.length);
    options.push(pool.splice(i, 1)[0]);
  }
  while (options.length < 3) options.push(UPGRADES[11]);
  world.upgradeOptions = options;
  world.campPhase = 'upgrade';
}

export function chooseUpgrade(world, index, audio) {
  const up = world.upgradeOptions[index];
  if (!up || world.screen !== SCREEN_UPGRADE || world.campPhase !== 'upgrade') return;
  up.apply(world.upgrades);
  world.owned.push(up.id);
  if (world.upgrades.healNow > 0) {
    world.caravan.maxHp = CARAVAN_MAX_HP + world.upgrades.maxHpBonus;
    repairCaravan(world.caravan, world.upgrades.healNow);
    world.upgrades.healNow = 0;
  }
  if (world.upgrades.saltNow > 0) {
    world.salt += world.upgrades.saltNow;
    world.saltEarned += world.upgrades.saltNow;
    world.upgrades.saltNow = 0;
  }
  if (world.upgrades.supplyNow > 0) {
    world.supplies += world.upgrades.supplyNow;
    world.upgrades.supplyNow = 0;
  }
  if (audio) audio.pickup();
  world.campPhase = 'route';
}

export function chooseRoute(world, index, audio) {
  const route = ROUTES[index];
  if (!route || world.screen !== SCREEN_UPGRADE || world.campPhase !== 'route') return;
  if (audio) audio.pickup();
  world.screen = SCREEN_PLAY;
  startLeg(world, world.leg + 1, route);
}

export function buyTrade(world, index, audio) {
  const trade = TRADES[index];
  if (!trade || world.screen !== SCREEN_UPGRADE) return;
  const cx = world.caravan.x + 60;
  const cy = ROAD_Y - 90;
  if (world.salt < trade.cost) {
    addFloat(world, cx, cy, `NEED ${trade.cost} SALT`, '#f87171');
    return;
  }
  if (trade.id === 'scout' && world.companions.scout) return;
  if (trade.id === 'healer' && world.companions.healer) return;
  if (trade.id === 'captain' && world.companions.captain) return;
  if (trade.id === 'guard' && world.guards.length >= 4) return;
  if (trade.id === 'wagon' && world.caravan.wagons.length >= 4) return;
  world.salt -= trade.cost;
  if (trade.id === 'water') {
    world.water = Math.min(WATER_MAX, world.water + 25);
    addFloat(world, cx, cy, '+25 WATER', '#38bdf8');
  } else if (trade.id === 'repair') {
    repairCaravan(world.caravan, 30);
    repairWagons(world.caravan, 30);
    addFloat(world, cx, cy, 'REPAIRED +30', '#86efac');
  } else if (trade.id === 'guard') {
    world.guards.push({ x: 210, y: ROAD_Y, state: 'ride', tx: 0, ty: 0, target: null });
    addFloat(world, cx, cy, '+1 GUARD RIDER', '#86efac');
  } else if (trade.id === 'wagon') {
    world.caravan.wagons.push({ type: 'salt', hp: WAGON_TYPES.salt.hp, maxHp: WAGON_TYPES.salt.hp });
    addFloat(world, cx, cy, '+1 SALT WAGON', '#86efac');
  } else if (trade.id === 'scout') {
    world.companions.scout = true;
    addFloat(world, cx, cy, 'SCOUT JOINS THE ROAD', '#86efac');
  } else if (trade.id === 'healer') {
    world.companions.healer = true;
    addFloat(world, cx, cy, 'HEALER JOINS THE ROAD', '#86efac');
  } else if (trade.id === 'captain') {
    world.companions.captain = true;
    world.guards.push({ x: 210, y: ROAD_Y, state: 'ride', tx: 0, ty: 0, target: null });
    addFloat(world, cx, cy, 'CAPTAIN JOINS — GUARDS +15', '#86efac');
  }
  if (audio) audio.pickup();
}

function addFloat(world, x, y, text, color) {
  world.floats.push({ x, y, text, color, life: 1.1, maxLife: 1.1 });
  if (world.floats.length > 40) world.floats.shift();
}

function burst(world, x, y, color, n, speed) {
  for (let i = 0; i < n; i += 1) {
    const a = world.rng.range(0, Math.PI * 2);
    const s = world.rng.range(speed * 0.3, speed);
    world.particles.push({
      x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s,
      life: world.rng.range(0.3, 0.7), maxLife: 0.7, color, size: world.rng.range(2, 5),
    });
  }
  if (world.particles.length > 300) world.particles.splice(0, world.particles.length - 300);
}

function breakStreak(world) {
  world.streak = 0;
}

function winGame(world, audio) {
  world.screen = SCREEN_WIN;
  world.result = {
    score: world.score, kills: world.kills, legs: LEGS,
    salt: world.saltEarned, best: Math.max(world.best, world.score),
    streak: world.bestStreak,
  };
  world.best = world.result.best;
  if (audio) audio.win();
}

function loseGame(world, audio, reason) {
  world.screen = SCREEN_LOSE;
  world.loseReason = reason;
  world.result = {
    score: world.score, kills: world.kills, legs: world.legsDone,
    salt: world.saltEarned, best: Math.max(world.best, world.score),
    streak: world.bestStreak,
  };
  world.best = world.result.best;
  if (audio) audio.lose();
}

function killHazard(world, h, audio) {
  world.kills += 1;
  world.chain += 1;
  world.chainTimer = 2.5;
  world.streak += 1;
  world.bestStreak = Math.max(world.bestStreak, world.streak);
  const mult = Math.min(3, 1 + (world.chain - 1) * 0.25);
  const streakMult = 1 + Math.min(world.streak, 10) * 0.05;
  const gained = Math.round(h.score * mult * streakMult);
  world.score += gained;
  addFloat(world, h.x, h.y - 16, `+${gained}`, mult > 1 ? '#fbbf24' : '#fef3c7');
  if (world.chain >= 3) {
    addFloat(world, h.x, h.y - 36, `CHAIN x${Math.min(9, world.chain)}`, '#ea580c');
  }
  if (world.streak >= 5) {
    addFloat(world, h.x, h.y - 54, `STREAK x${world.streak}`, '#38bdf8');
  }
  burst(world, h.x, h.y, h.color, h.kind === 'chief' || h.kind === 'tyrant' ? 46 : 12, 170);
  burst(world, h.x, h.y, '#fef3c7', 6, 120);
  if (h.salt > 0) {
    world.pickups.push({ x: h.x, y: h.y, kind: 'salt', value: h.salt + world.upgrades.saltBonus, vx: 0, vy: 0 });
  }
  if (h.supplies > 0) {
    world.pickups.push({ x: h.x + 12, y: h.y + 8, kind: 'supplies', value: h.supplies, vx: 0, vy: 0 });
  }
  if (world.pickups.length > 48) world.pickups.splice(0, world.pickups.length - 48);
  if (audio) audio.kill();
  if (h.kind === 'chief') {
    world.score += 1000;
    addFloat(world, h.x, h.y - 56, 'THE RAIDER CHIEF FALLS! +1000', '#fbbf24');
    winGame(world, audio);
  } else if (h.kind === 'tyrant') {
    world.score += 800;
    world.bossFight = false;
    world.banner = 'THE SAND TYRANT IS BEATEN!';
    world.bannerTimer = 2.6;
    addFloat(world, h.x, h.y - 56, 'THE SAND TYRANT FALLS! +800', '#fbbf24');
  }
}

function damageHazard(world, h, amount, audio) {
  h.hp -= amount;
  h.hitFlash = 0.12;
  if (audio) audio.hit();
  if (h.hp <= 0) {
    if (h.kind === 'mirage') {
      // A mirage is only light: shooting it earns a little for seeing through it.
      world.score += 5;
      addFloat(world, h.x, h.y - 16, 'MIRAGE!', '#e7e5e4');
      burst(world, h.x, h.y, '#e7e5e4', 8, 90);
      world.hazards.splice(world.hazards.indexOf(h), 1);
      if (audio) audio.pickup();
      return;
    }
    killHazard(world, h, audio);
  }
}

function roadHit(world, h, audio) {
  // A rock, gap, wisp or worm reached the caravan's front bumper.
  const { lost, broke } = damageCaravan(world.caravan, h.damage, world.upgrades.armorMult);
  addFloat(world, world.caravan.x + 120, world.caravan.y - 50, `-${lost} HULL`, '#f87171');
  if (broke) addFloat(world, world.caravan.x + 60, world.caravan.y - 70, `${broke.toUpperCase()} WAGON BROKEN!`, '#f87171');
  if (h.kind === 'gap') {
    world.supplies = Math.max(0, world.supplies - 5);
    addFloat(world, world.caravan.x + 90, world.caravan.y - 88, '-5 SUPPLIES', '#f87171');
  }
  breakStreak(world);
  burst(world, h.x, h.y, '#a8a29e', 10, 140);
  if (audio) audio.hurt();
  world.hazards.splice(world.hazards.indexOf(h), 1);
  if (world.caravan.hp <= 0) loseGame(world, audio, 'THE CARAVAN WAS BROKEN ON THE ROAD');
}

function hullDamage(world, amount, audio) {
  // Slow damage (thirst, dust storm): bypasses the wagon split, small bites.
  world.caravan.hp = Math.max(0, world.caravan.hp - amount);
  world.caravan.hitFlash = 0.15;
  breakStreak(world);
  if (world.caravan.hp <= 0) loseGame(world, audio, 'THE CARAVAN WAS BROKEN ON THE ROAD');
}

function shootAt(world, input, audio) {
  if (world.shotCooldown > 0 || world.warden.down) return;
  const w = world.warden;
  const dx = input.mouse.x - w.x;
  const dy = input.mouse.y - w.y;
  const d = Math.hypot(dx, dy) || 1;
  world.shots.push({
    x: w.x, y: w.y,
    vx: (dx / d) * SHOT_SPEED, vy: (dy / d) * SHOT_SPEED,
    traveled: 0, damage: SHOT_DAMAGE + world.upgrades.shotDamage,
    range: SHOT_RANGE + world.upgrades.shotRange,
  });
  world.shotCooldown = SHOT_COOLDOWN;
  world.shotsFired += 1;
  if (audio) audio.shoot();
}

function fireCannon(world, audio) {
  if (world.cannonCooldown > 0) return;
  if (world.salt < CANNON_COST_SALT) {
    addFloat(world, world.caravan.x + 150, world.caravan.y - 60, 'NEED 6 SALT', '#f87171');
    return;
  }
  world.salt -= CANNON_COST_SALT;
  world.cannonCooldown = CANNON_COOLDOWN;
  world.cannonFlash = 0.3;
  const cx = world.caravan.x + 190;
  const cy = ROAD_Y;
  const radius = CANNON_RADIUS + world.upgrades.cannonRadius;
  const damage = CANNON_DAMAGE + world.upgrades.cannonDamage;
  burst(world, cx, cy, '#fbbf24', 26, 260);
  burst(world, cx, cy, '#fef3c7', 14, 180);
  // The blast shatters rocks and scatters raiders, wisps, worms and
  // storms; a washed-out gap cannot be blasted away — it must be bridged.
  for (const h of [...world.hazards]) {
    if (h.kind === 'gap' || h.kind === 'slide' || h.kind === 'mirage') continue;
    if (Math.hypot(h.x - cx, h.y - cy) < radius + h.radius) damageHazard(world, h, damage, audio);
  }
  if (audio) audio.cannon();
}

function bridgeGap(world, audio) {
  if (world.bridgeCooldown > 0) return;
  const front = world.caravan.x + 130;
  let bestGap = null;
  let bestDist = BRIDGE_RANGE;
  for (const h of world.hazards) {
    if (h.kind !== 'gap' || h.bridged) continue;
    const d = h.x - front;
    if (d >= -20 && d < bestDist) { bestDist = d; bestGap = h; }
  }
  if (!bestGap) {
    addFloat(world, front + 60, ROAD_Y - 60, 'NO GAP AHEAD', '#fde68a');
    return;
  }
  if (world.supplies < BRIDGE_COST_SUPPLIES) {
    addFloat(world, front + 60, ROAD_Y - 60, 'NEED 4 SUPPLIES', '#f87171');
    return;
  }
  world.supplies -= BRIDGE_COST_SUPPLIES;
  world.bridgeCooldown = BRIDGE_COOLDOWN;
  bestGap.bridged = true;
  addFloat(world, bestGap.x, bestGap.y - 44, 'BRIDGED!', '#86efac');
  world.score += 25;
  if (audio) audio.bridge();
}

function blowHorn(world, audio) {
  if (world.hornCooldown > 0) return;
  let target = null;
  let bestDist = 800;
  for (const h of world.hazards) {
    if (h.kind === 'rock' || h.kind === 'gap' || h.kind === 'slide' || h.kind === 'mirage') continue;
    const d = Math.hypot(h.x - world.caravan.x, h.y - world.caravan.y);
    if (d < bestDist) { bestDist = d; target = h; }
  }
  if (!target) {
    addFloat(world, world.caravan.x + 60, ROAD_Y - 70, 'NO RAIDER IN REACH', '#fde68a');
    return;
  }
  world.hornCooldown = Math.max(2, HORN_COOLDOWN - world.upgrades.hornCut);
  for (const g of world.guards) {
    g.state = 'charge';
    g.target = target;
  }
  if (audio) audio.horn();
}

function updateGuards(world, audio, dt) {
  for (const g of world.guards) {
    if (g.state === 'charge' && g.target) {
      const t = g.target;
      if (!world.hazards.includes(t)) { g.state = 'return'; continue; }
      const dx = t.x - g.x;
      const dy = t.y - g.y;
      const d = Math.hypot(dx, dy) || 1;
      g.x += (dx / d) * GUARD_SPEED * dt;
      g.y += (dy / d) * GUARD_SPEED * dt;
      if (d < 30) {
        const bonus = world.companions.captain ? 15 : 0;
        damageHazard(world, t, GUARD_DAMAGE + world.upgrades.guardDamage + bonus, audio);
        addFloat(world, t.x, t.y - 30, 'GUARD HIT!', '#86efac');
        g.state = 'return';
      }
    } else if (g.state === 'return') {
      const hx = world.caravan.x - 90;
      const hy = world.caravan.y + (g === world.guards[0] ? -46 : 46);
      const dx = hx - g.x;
      const dy = hy - g.y;
      const d = Math.hypot(dx, dy) || 1;
      g.x += (dx / d) * GUARD_SPEED * dt;
      g.y += (dy / d) * GUARD_SPEED * dt;
      if (d < 12) { g.state = 'ride'; g.x = hx; g.y = hy; }
    } else {
      // Ride alongside the caravan, bobbing with the road.
      g.x = world.caravan.x - 90;
      g.y = world.caravan.y + (g === world.guards[0] ? -46 : 46) + Math.sin(world.time * 6 + (g === world.guards[0] ? 0 : 2)) * 3;
    }
  }
}

function updateBallista(world, audio, dt) {
  if (!world.upgrades.ballista) return;
  world.ballistaTimer -= dt;
  if (world.ballistaTimer > 0) return;
  world.ballistaTimer = 2;
  let target = null;
  let bestDist = 700;
  for (const h of world.hazards) {
    if (h.kind === 'gap' || h.kind === 'slide' || h.kind === 'mirage') continue;
    const d = Math.hypot(h.x - (world.caravan.x + 130), h.y - ROAD_Y);
    if (d < bestDist) { bestDist = d; target = h; }
  }
  if (!target) return;
  const dx = target.x - (world.caravan.x + 130);
  const dy = target.y - (ROAD_Y - 20);
  const d = Math.hypot(dx, dy) || 1;
  world.shots.push({
    x: world.caravan.x + 130, y: ROAD_Y - 20,
    vx: (dx / d) * SHOT_SPEED, vy: (dy / d) * SHOT_SPEED,
    traveled: 0, damage: 30, range: 700,
  });
  if (audio) audio.shoot();
}

function updatePlay(world, input, audio, dt) {
  world.time += dt;
  const w = world.warden;
  const scroll = scrollSpeedOf(world);

  // Timers.
  for (const k of ['shotCooldown', 'cannonCooldown', 'bridgeCooldown', 'hornCooldown']) {
    if (world[k] > 0) world[k] -= dt;
  }
  if (world.cannonFlash > 0) world.cannonFlash -= dt;
  if (world.bannerTimer > 0) world.bannerTimer -= dt;
  if (world.chainTimer > 0) {
    world.chainTimer -= dt;
    if (world.chainTimer <= 0) world.chain = 0;
  }
  if (world.caravan.hitFlash > 0) world.caravan.hitFlash -= dt;
  if (w.hitFlash > 0) w.hitFlash -= dt;
  world.caravan.bob += dt;

  // Weather: heat drinks water, rain refills it, the condenser drips.
  if (world.weather === 'heat') {
    const drain = HEAT_DRAIN_PER_SEC * (hasWagon(world.caravan, 'water') ? 0.5 : 1.5);
    world.water = Math.max(0, world.water - drain * dt);
    if (world.water <= 0) hullDamage(world, THIRST_HULL_PER_SEC * dt, audio);
  } else if (world.weather === 'rain') {
    world.water = Math.min(WATER_MAX, world.water + RAIN_RATE * dt);
    world.caravan.hp = Math.min(world.caravan.maxHp, world.caravan.hp + 0.5 * dt);
  }
  if (world.upgrades.condenser) {
    world.water = Math.min(WATER_MAX, world.water + CONDENSER_RATE * dt);
  }
  // The healer companion mends the hull as the road rolls on.
  if (world.companions.healer && world.screen === SCREEN_PLAY) {
    world.caravan.hp = Math.min(world.caravan.maxHp, world.caravan.hp + 1.5 * dt);
  }
  if (world.screen !== SCREEN_PLAY) return;

  // The road rolls on: distance, score, supplies.
  if (!world.bossFight) {
    world.distance += world.legSpeed * dt;
    world.distanceTotal += world.legSpeed * dt;
    world.score += world.legSpeed * dt;
    world.supplies -= SUPPLY_DRAIN_PER_SEC * world.upgrades.drainMult * dt;
    if (world.supplies <= 0) {
      world.supplies = 0;
      loseGame(world, audio, 'THE CARAVAN STARVED — SUPPLIES GONE');
      return;
    }
  }

  // The Warden moves with WASD / arrows.
  if (!w.down) {
    const mx = input.moveX();
    const my = input.moveY();
    const len = Math.hypot(mx, my) || 1;
    if (mx !== 0 || my !== 0) {
      w.x += (mx / len) * WARDEN_SPEED * dt;
      w.y += (my / len) * WARDEN_SPEED * dt;
    }
    w.x = Math.max(60, Math.min(VIEW_W - 60, w.x));
    w.y = Math.max(200, Math.min(VIEW_H - 60, w.y));
    w.hp = Math.min(w.maxHp, w.hp + 2 * dt);
    if (input.mouse.clicked) shootAt(world, input, audio);
    if (input.pressed('Space')) fireCannon(world, audio);
    if (input.pressed('KeyE')) bridgeGap(world, audio);
    if (input.pressed('KeyQ')) blowHorn(world, audio);
    if (input.pressed('KeyR')) {
      rotateWagons(world.caravan);
      addFloat(world, world.caravan.x + 60, ROAD_Y - 90, 'WAGONS ROTATED', '#fde68a');
      if (audio) audio.pickup();
    }
  } else {
    w.downTimer -= dt;
    if (w.downTimer <= 0) {
      w.down = false;
      w.hp = 50;
      w.x = world.caravan.x + 60;
      w.y = ROAD_Y - 70;
      addFloat(world, w.x, w.y - 30, 'THE WARDEN IS UP!', '#86efac');
    }
  }

  // Spawning, spread evenly across the leg by distance (sandstorms crowd it).
  const spacing = (world.legLength / world.totalToSpawn) * (world.weather === 'storm' ? 0.75 : 1);
  if (!world.bossFight && world.spawned < world.totalToSpawn && world.distance >= world.spawnAt) {
    const kind = world.spawnQueue[world.spawned];
    const p = spawnPoint(world.rng);
    world.hazards.push(createHazard(kind, p.x, p.y, world.leg));
    world.spawned += 1;
    world.spawnAt += spacing;
  }

  // Bosses: the Sand Tyrant blocks leg 4, the Raider Chief blocks leg 7,
  // each at 92% of the leg. The caravan halts until the boss falls.
  const plan = LEG_PLANS[world.leg - 1];
  if (plan.boss && !world.bossSpawned && world.distance >= world.legLength * 0.92) {
    world.bossSpawned = true;
    world.bossFight = true;
    const bossKind = plan.boss;
    world.hazards.push(createHazard(bossKind, 1250, ROAD_Y, world.leg));
    world.banner = bossKind === 'tyrant'
      ? 'THE SAND TYRANT RISES FROM THE DUNES!'
      : 'THE RAIDER CHIEF BLOCKS THE ROAD!';
    world.bannerTimer = 3;
    if (audio) audio.boss();
  }

  // Hazards.
  for (const h of [...world.hazards]) {
    // Rockslide telegraph: when the timer runs out, the rocks drop.
    if (h.kind === 'slide') {
      h.timer -= dt;
      h.x -= scroll * dt;
      if (h.timer <= 0) {
        for (let i = -1; i <= 1; i += 1) {
          world.hazards.push(createHazard('rock', h.x + i * 46, Math.max(ROAD_TOP + 30, Math.min(ROAD_BOTTOM - 20, h.y + i * 26)), world.leg));
        }
        addFloat(world, h.x, h.y - 40, 'ROCKSLIDE!', '#f87171');
        burst(world, h.x, h.y, '#a8a29e', 16, 180);
        if (audio) audio.cannon();
        world.hazards.splice(world.hazards.indexOf(h), 1);
      } else if (h.x < -80) {
        world.hazards.splice(world.hazards.indexOf(h), 1);
      }
      continue;
    }
    const outcome = updateHazard(h, world, dt, scroll);
    if (outcome === 'gone') {
      world.hazards.splice(world.hazards.indexOf(h), 1);
    } else if (outcome === 'mirage') {
      world.score += 5;
      addFloat(world, h.x, h.y - 20, 'MIRAGE — JUST LIGHT +5', '#e7e5e4');
      world.hazards.splice(world.hazards.indexOf(h), 1);
    } else if (outcome === 'storm-hit') {
      hullDamage(world, 1 * dt, audio);
      if (world.screen !== SCREEN_PLAY) return;
    } else if (outcome === 'caravan') {
      roadHit(world, h, audio);
      if (world.screen !== SCREEN_PLAY) return;
    } else if (outcome === 'tyrant-bite') {
      const { lost, broke } = damageCaravan(world.caravan, h.damage, world.upgrades.armorMult);
      addFloat(world, world.caravan.x + 120, world.caravan.y - 50, `-${lost} HULL`, '#f87171');
      if (broke) addFloat(world, world.caravan.x + 60, world.caravan.y - 70, `${broke.toUpperCase()} WAGON BROKEN!`, '#f87171');
      breakStreak(world);
      burst(world, h.x, h.y, '#a16207', 18, 200);
      if (audio) audio.hurt();
      if (world.caravan.hp <= 0) {
        loseGame(world, audio, 'THE CARAVAN WAS BROKEN ON THE ROAD');
        return;
      }
    } else if (outcome === 'caravan-attack') {
      h.touchCooldown = 1;
      const { lost, broke } = damageCaravan(world.caravan, h.damage, world.upgrades.armorMult);
      addFloat(world, world.caravan.x + 120, world.caravan.y - 50, `-${lost} HULL`, '#f87171');
      if (broke) addFloat(world, world.caravan.x + 60, world.caravan.y - 70, `${broke.toUpperCase()} WAGON BROKEN!`, '#f87171');
      breakStreak(world);
      if (audio) audio.hurt();
      if (world.caravan.hp <= 0) {
        loseGame(world, audio, 'THE CARAVAN WAS BROKEN ON THE ROAD');
        return;
      }
    } else if (outcome === 'warden') {
      h.touchCooldown = 1;
      w.hp -= h.damage;
      w.hitFlash = 0.3;
      breakStreak(world);
      const d = Math.hypot(w.x - h.x, w.y - h.y) || 1;
      w.x += ((w.x - h.x) / d) * 46;
      w.y += ((w.y - h.y) / d) * 46;
      addFloat(world, w.x, w.y - 26, `-${h.damage}`, '#f87171');
      if (audio) audio.hurt();
      if (w.hp <= 0) {
        w.hp = 0;
        w.down = true;
        w.downTimer = 3;
        addFloat(world, w.x, w.y - 40, 'WARDEN DOWN!', '#f87171');
      }
    }
    // Boss summons: the chief calls raiders, the tyrant calls wisps.
    if ((h.kind === 'chief' || h.kind === 'tyrant') && world.hazards.includes(h)) {
      if (h.kind === 'chief' && h.spearCooldown <= 0) {
        h.spearCooldown = 2.4;
        const target = w.down ? world.caravan : (world.rng.chance(0.5) ? w : world.caravan);
        const tx = target === w ? w.x : world.caravan.x + 60;
        const ty = target === w ? w.y : ROAD_Y;
        const dx = tx - h.x;
        const dy = ty - h.y;
        const d = Math.hypot(dx, dy) || 1;
        world.spears.push({ x: h.x - 30, y: h.y - 10, vx: (dx / d) * 420, vy: (dy / d) * 420 });
        if (audio) audio.shoot();
      }
      if (h.summonCooldown <= 0) {
        h.summonCooldown = h.kind === 'chief' ? 7 : 8;
        for (let i = 0; i < 2; i += 1) {
          const p = spawnPoint(world.rng);
          world.hazards.push(createHazard(h.kind === 'chief' ? 'raider' : 'wisp', p.x, p.y, world.leg));
        }
        addFloat(world, h.x, h.y - 60, h.kind === 'chief' ? 'THE CHIEF CALLS RAIDERS!' : 'THE TYRANT CALLS WISPS!', '#f87171');
      }
    }
  }

  updateGuards(world, audio, dt);
  updateBallista(world, audio, dt);

  // Salt-shots fly and hit.
  for (const s of [...world.shots]) {
    s.x += s.vx * dt;
    s.y += s.vy * dt;
    s.traveled += SHOT_SPEED * dt;
    let spent = s.traveled > s.range;
    if (!spent) {
      for (const h of [...world.hazards]) {
        if (h.kind === 'gap' || h.kind === 'slide') continue; // a gap is a hole, a slide is a warning — not targets
        if (Math.hypot(h.x - s.x, h.y - s.y) < h.radius + 6) {
          damageHazard(world, h, s.damage, audio);
          spent = true;
          break;
        }
      }
    }
    if (spent || s.x < -20 || s.x > VIEW_W + 20 || s.y < -20 || s.y > VIEW_H + 20) {
      world.shots.splice(world.shots.indexOf(s), 1);
    }
    if (world.screen !== SCREEN_PLAY) return;
  }

  // Chief's spears.
  for (const sp of [...world.spears]) {
    sp.x += sp.vx * dt;
    sp.y += sp.vy * dt;
    let spent = sp.x < -20 || sp.x > VIEW_W + 20 || sp.y < -20 || sp.y > VIEW_H + 20;
    if (!spent && Math.hypot(sp.x - world.caravan.x - 60, sp.y - ROAD_Y) < 70) {
      const { lost } = damageCaravan(world.caravan, 10, world.upgrades.armorMult);
      addFloat(world, world.caravan.x + 120, ROAD_Y - 50, `-${lost} HULL`, '#f87171');
      breakStreak(world);
      if (audio) audio.hurt();
      spent = true;
      if (world.caravan.hp <= 0) {
        loseGame(world, audio, 'THE CARAVAN WAS BROKEN ON THE ROAD');
        return;
      }
    }
    if (!spent && !w.down && Math.hypot(sp.x - w.x, sp.y - w.y) < WARDEN_RADIUS + 8) {
      w.hp -= 15;
      w.hitFlash = 0.3;
      breakStreak(world);
      if (audio) audio.hurt();
      spent = true;
      if (w.hp <= 0) {
        w.hp = 0;
        w.down = true;
        w.downTimer = 3;
      }
    }
    if (spent) world.spears.splice(world.spears.indexOf(sp), 1);
  }

  // Pickups scroll with the road; the Warden or the caravan gathers them.
  for (const p of [...world.pickups]) {
    p.x -= scroll * dt;
    const dw = Math.hypot(p.x - w.x, p.y - w.y);
    if (!w.down && dw < 130) {
      const d = dw || 1;
      p.x += ((w.x - p.x) / d) * 190 * dt;
      p.y += ((w.y - p.y) / d) * 190 * dt;
    }
    const gotByWarden = !w.down && dw < 34;
    const gotByCaravan = Math.abs(p.x - (world.caravan.x + 60)) < 60 && Math.abs(p.y - ROAD_Y) < 70;
    if (gotByWarden || gotByCaravan) {
      if (p.kind === 'salt') {
        world.salt += p.value;
        world.saltEarned += p.value;
        addFloat(world, p.x, p.y - 18, `+${p.value} SALT`, '#fef3c7');
      } else {
        world.supplies += p.value;
        addFloat(world, p.x, p.y - 18, `+${p.value} SUPPLIES`, '#86efac');
      }
      world.score += 5;
      if (audio) audio.pickup();
      world.pickups.splice(world.pickups.indexOf(p), 1);
    } else if (p.x < -40) {
      world.pickups.splice(world.pickups.indexOf(p), 1);
    }
  }

  // Particles and floats age out.
  for (const pt of [...world.particles]) {
    pt.x += pt.vx * dt;
    pt.y += pt.vy * dt;
    pt.life -= dt;
    if (pt.life <= 0) world.particles.splice(world.particles.indexOf(pt), 1);
  }
  for (const f of [...world.floats]) {
    f.y -= 34 * dt;
    f.life -= dt;
    if (f.life <= 0) world.floats.splice(world.floats.indexOf(f), 1);
  }

  // Leg complete (non-boss legs): the outfitter's camp, then the next leg.
  if (!world.bossFight && world.distance >= world.legLength) {
    world.legsDone = world.leg;
    const bonus = 500 + world.leg * 100;
    world.score += bonus;
    world.salt += plan.saltBonus;
    world.supplies += plan.supplyBonus;
    world.saltEarned += plan.saltBonus;
    addFloat(world, world.caravan.x, ROAD_Y - 80, `LEG ${world.leg} DONE +${bonus}`, '#fbbf24');
    if (world.leg >= LEGS) {
      winGame(world, audio);
      return;
    }
    offerUpgrades(world);
    world.screen = SCREEN_UPGRADE;
    if (audio) audio.dawn();
  }
}

export function update(world, input, audio, dt) {
  if (input.pressed('KeyM')) {
    if (audio) audio.toggleMute();
  }
  if (world.screen === SCREEN_TITLE) {
    if (input.pressed('Enter') || input.pressed('Space') || input.mouse.clicked) {
      if (audio) audio.ensure();
      startGame(world);
      if (audio) audio.legStart();
    }
    return;
  }
  if (world.screen === SCREEN_WIN || world.screen === SCREEN_LOSE) {
    if (input.pressed('Enter') || input.pressed('Space') || input.mouse.clicked) {
      if (audio) audio.ensure();
      startGame(world);
      if (audio) audio.legStart();
    }
    return;
  }
  if (world.screen === SCREEN_UPGRADE) {
    // Trading-post keys: 7 water, 8 repair, 9 guard, 0 new wagon.
    if (input.pressed('Digit7')) buyTrade(world, 0, audio);
    else if (input.pressed('Digit8')) buyTrade(world, 1, audio);
    else if (input.pressed('Digit9')) buyTrade(world, 2, audio);
    else if (input.pressed('Digit0')) buyTrade(world, 3, audio);
    else if (world.campPhase === 'upgrade') {
      if (input.pressed('Digit1')) chooseUpgrade(world, 0, audio);
      else if (input.pressed('Digit2')) chooseUpgrade(world, 1, audio);
      else if (input.pressed('Digit3')) chooseUpgrade(world, 2, audio);
      else if (input.mouse.clicked) {
        const ti = tradeCardAt(world, input.mouse.x, input.mouse.y);
        if (ti >= 0) buyTrade(world, ti, audio);
        else {
          const i = upgradeCardAt(world, input.mouse.x, input.mouse.y);
          if (i >= 0) chooseUpgrade(world, i, audio);
        }
      }
    } else if (world.campPhase === 'route') {
      if (input.pressed('Digit1')) chooseRoute(world, 0, audio);
      else if (input.pressed('Digit2')) chooseRoute(world, 1, audio);
      else if (input.pressed('Digit3')) chooseRoute(world, 2, audio);
      else if (input.mouse.clicked) {
        const ti = tradeCardAt(world, input.mouse.x, input.mouse.y);
        if (ti >= 0) buyTrade(world, ti, audio);
        else {
          const i = routeCardAt(world, input.mouse.x, input.mouse.y);
          if (i >= 0) chooseRoute(world, i, audio);
        }
      }
    }
    return;
  }
  // Play.
  if (input.pressed('KeyP')) {
    world.paused = !world.paused;
    return;
  }
  if (world.paused) return;
  if (input.mouse.down || input.mouse.clicked) {
    if (audio) audio.ensure();
  }
  updatePlay(world, input, audio, dt);
}

// HUD helpers for the renderer.
export function aliveCounts(world) {
  const counts = {};
  for (const h of world.hazards) counts[h.kind] = (counts[h.kind] || 0) + 1;
  return counts;
}

export function incomingRoster(world) {
  const left = world.totalToSpawn - world.spawned;
  const counts = aliveCounts(world);
  const kindParts = [];
  if (counts.rock) kindParts.push(`ROCK x${counts.rock}`);
  if (counts.gap) kindParts.push(`GAP x${counts.gap}`);
  if (counts.raider) kindParts.push(`RAIDER x${counts.raider}`);
  if (counts.wisp) kindParts.push(`WISP x${counts.wisp}`);
  if (counts.worm) kindParts.push(`WORM x${counts.worm}`);
  if (counts.storm) kindParts.push(`STORM x${counts.storm}`);
  if (counts.slide) kindParts.push(`SLIDE x${counts.slide}`);
  if (counts.mirage) kindParts.push(`MIRAGE x${counts.mirage}`);
  if (counts.tyrant) kindParts.push(`TYRANT`);
  if (counts.chief) kindParts.push(`CHIEF`);
  // The roster panel is one line: show at most five kinds, fold the rest.
  const parts = kindParts.slice(0, 5);
  if (kindParts.length > 5) parts.push(`+${kindParts.length - 5} KINDS`);
  if (left > 0) parts.push(`+${left} MORE`);
  // The scout reads the road ahead: the queued hazards show too.
  if (world.companions.scout && world.spawnQueue.length > 0 && parts.length <= 5) {
    const ahead = {};
    for (let i = world.spawned; i < world.spawnQueue.length; i += 1) {
      ahead[world.spawnQueue[i]] = (ahead[world.spawnQueue[i]] || 0) + 1;
    }
    const aheadParts = Object.entries(ahead).map(([k, n]) => `${k.toUpperCase()} x${n}`);
    if (aheadParts.length > 0) parts.push(`SCOUT: ${aheadParts.slice(0, 3).join(' ')}`);
  }
  return parts.join('   ');
}
