// Hazards on the road ahead: rocks to shatter, gaps to bridge, raiders
// to drive off, sandwisps to outrun, sand-worms that erupt from below,
// dust storms that grind the caravan, rockslides with a telegraphed
// warning, mirages that are only light — and, at the end of legs 4 and 7,
// the Sand Tyrant and the Raider Chief.
import { CARAVAN_X, HAZARD_TYPES, ROAD_BOTTOM, ROAD_TOP, ROAD_Y, VIEW_W } from './config.js';

export function spawnPoint(rng) {
  // Any point on the road, just past the right edge of the screen.
  return { x: VIEW_W + 60 + rng.range(0, 120), y: rng.range(ROAD_TOP + 30, ROAD_BOTTOM - 20) };
}

export function createHazard(kind, x, y, leg) {
  const t = HAZARD_TYPES[kind];
  const scale = 1 + (leg - 1) * 0.08;
  return {
    kind,
    name: t.name,
    x,
    y,
    hp: t.hp * scale,
    maxHp: t.hp * scale,
    speed: t.speed * (1 + (leg - 1) * 0.03),
    radius: t.radius,
    damage: t.damage,
    score: t.score,
    salt: t.salt,
    supplies: t.supplies,
    color: t.color,
    wobble: 0,
    wobbleSpeed: 2 + leg * 0.12,
    hitFlash: 0,
    touchCooldown: 0,
    bridged: false, // gaps only: planks laid by the Warden
    attacking: false, // raiders only: stopped at the caravan, hacking at it
    spearCooldown: kind === 'chief' ? 3 : 0, // chief only
    summonCooldown: kind === 'chief' ? 7 : (kind === 'tyrant' ? 8 : 0),
    baseY: y,
    mode: kind === 'worm' ? 'erupt' : (kind === 'tyrant' ? 'surface' : null),
    modeTimer: kind === 'worm' ? 0.8 : (kind === 'tyrant' ? 5 : 0), // worm erupts, tyrant surfaces then burrows
    timer: kind === 'slide' ? 2.5 : 0, // rockslide telegraph countdown
  };
}

// Pick the next kind for a leg's spawn queue from the leg's mix.
export function pickKindForLeg(plan, rng) {
  const entries = Object.entries(plan.mix);
  let roll = rng.next();
  for (const [kind, weight] of entries) {
    roll -= weight;
    if (roll <= 0) return kind;
  }
  return entries[0][0];
}

// One fixed step of one hazard. scroll is how fast the road slides left
// (px/s); the caravan is halted during boss fights, so scroll is 0 there
// and raiders walk in under their own feet. Returns an outcome string
// for the world to resolve, or null.
export function updateHazard(h, world, dt, scroll) {
  h.wobble += dt * h.wobbleSpeed;
  if (h.hitFlash > 0) h.hitFlash -= dt;
  if (h.touchCooldown > 0) h.touchCooldown -= dt;
  if (h.spearCooldown > 0) h.spearCooldown -= dt;
  if (h.summonCooldown > 0) h.summonCooldown -= dt;

  if (h.kind === 'rock' || h.kind === 'gap') {
    h.x -= scroll * dt;
    if (!h.bridged && h.x - h.radius < CARAVAN_X + 130) return 'caravan';
    if (h.x < -80) return 'gone';
    return null;
  }
  if (h.kind === 'mirage') {
    // Only light: it shimmers through the caravan, harmless.
    h.x -= scroll * dt;
    if (h.x - h.radius < CARAVAN_X + 130) return 'mirage';
    if (h.x < -80) return 'gone';
    return null;
  }
  if (h.kind === 'slide') {
    // A telegraphed rockslide: the world counts its timer down and drops
    // the rocks when it runs out.
    h.x -= scroll * dt;
    if (h.x < -80) return 'gone';
    return null;
  }
  if (h.kind === 'storm') {
    h.x -= (scroll + 70) * dt;
    h.y = h.baseY + Math.sin(h.wobble * 0.9) * 20;
    if (Math.abs(h.x - (CARAVAN_X + 60)) < 140 && Math.abs(h.y - ROAD_Y) < 100) return 'storm-hit';
    if (h.x < -140) return 'gone';
    return null;
  }
  if (h.kind === 'worm') {
    if (h.mode === 'erupt') {
      h.modeTimer -= dt;
      if (h.modeTimer <= 0) h.mode = 'active';
      return null;
    }
    h.x -= (scroll + 12) * dt;
    if (h.x - h.radius < CARAVAN_X + 130) return 'caravan'; // bite, then burrows away
    if (h.x < -80) return 'gone';
    return null;
  }
  if (h.kind === 'wisp') {
    h.x -= (scroll + h.speed) * dt;
    h.y = h.baseY + Math.sin(h.wobble * 2.4) * 46;
    if (h.x - h.radius < CARAVAN_X + 130) return 'caravan';
    if (h.x < -80) return 'gone';
    return null;
  }
  if (h.kind === 'tyrant') {
    // The Sand Tyrant surfaces for a while, then burrows and erupts
    // somewhere new along the road.
    h.modeTimer -= dt;
    if (h.mode === 'surface' && h.modeTimer <= 0) {
      h.mode = 'burrow';
      h.modeTimer = 3;
      return null;
    }
    if (h.mode === 'burrow') {
      // Slide unseen toward the caravan while buried.
      if (h.x > CARAVAN_X + 260) h.x -= 60 * dt;
      if (h.modeTimer <= 0) {
        h.mode = 'surface';
        h.modeTimer = 5;
        if (Math.abs(h.x - (CARAVAN_X + 130)) < 170) return 'tyrant-bite';
      }
      return null;
    }
    // Surface: crawl at the caravan and bite on contact.
    if (h.x > CARAVAN_X + 200) {
      h.x -= (scroll + h.speed) * dt;
    } else if (h.touchCooldown <= 0) {
      return 'caravan-attack';
    }
    h.y = h.baseY + Math.sin(h.wobble * 1.1) * 8;
    return null;
  }
  if (h.kind === 'chief') {
    // The chief strides in to x=980 and plants himself across the road.
    if (h.x > 980) h.x -= (scroll + 90) * dt;
    h.y = h.baseY + Math.sin(h.wobble * 1.1) * 8;
    return null;
  }
  // Raider: runs down the road at the caravan; if the Warden is close, it
  // turns on the Warden instead.
  const w = world.warden;
  const dw = Math.hypot(h.x - w.x, h.y - w.y);
  if (!w.down && dw < 90) {
    const d = dw || 1;
    h.x += ((w.x - h.x) / d) * h.speed * dt;
    h.y += ((w.y - h.y) / d) * h.speed * dt;
    if (dw < 34 && h.touchCooldown <= 0) return 'warden';
    return null;
  }
  if (h.x > CARAVAN_X + 130) {
    h.x -= (scroll + h.speed * 0.6) * dt;
    h.y += Math.sin(h.wobble * 1.6) * 12 * dt;
    h.attacking = false;
  } else {
    // At the wagons: hack at the caravan once a second.
    h.attacking = true;
    if (h.touchCooldown <= 0) return 'caravan-attack';
  }
  if (h.x < -80) return 'gone';
  return null;
}
