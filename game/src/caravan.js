// The caravan: wagons of salt, a water wagon and a guard wagon, two ox
// teams, a banner — and the hull that decides whether the journey lives
// or dies. It holds a fixed screen position while the road scrolls past
// it; distance is what moves.
//
// Each wagon has its own role and its own health. The FRONT wagon takes
// the road hits, so the order matters: rotate the wagons (R) to put the
// tough guard wagon in front when the rocks get thick. A wagon at 0 hp
// breaks and its role is lost until a new one is bought at a post.
import { CARAVAN_MAX_HP, CARAVAN_X, ROAD_Y, WAGON_TYPES } from './config.js';

export function createCaravan() {
  return {
    x: CARAVAN_X,
    y: ROAD_Y,
    hp: CARAVAN_MAX_HP,
    maxHp: CARAVAN_MAX_HP,
    hitFlash: 0,
    // Wagon bounce phase, driven by the world's clock for a rolling feel.
    bob: 0,
    wagons: [
      { type: 'guard', hp: WAGON_TYPES.guard.hp, maxHp: WAGON_TYPES.guard.hp },
      { type: 'salt', hp: WAGON_TYPES.salt.hp, maxHp: WAGON_TYPES.salt.hp },
      { type: 'water', hp: WAGON_TYPES.water.hp, maxHp: WAGON_TYPES.water.hp },
    ],
  };
}

export function hasWagon(caravan, type) {
  return caravan.wagons.some((w) => w.type === type);
}

// A road hit lands on the caravan: the front wagon takes the full blow
// and the hull takes half. Armour (IRON RIMS, REINFORCED WHEELS) softens
// the hull's share. Returns { lost, broke } — broke names a wagon type
// that just broke, or null.
export function damageCaravan(caravan, amount, armorMult) {
  const lost = Math.max(1, Math.round((amount / 2) * armorMult));
  caravan.hp = Math.max(0, caravan.hp - lost);
  caravan.hitFlash = 0.25;
  let broke = null;
  const front = caravan.wagons[0];
  if (front) {
    front.hp -= amount;
    if (front.hp <= 0) {
      broke = front.type;
      caravan.wagons.shift();
    }
  }
  return { lost, broke };
}

export function repairCaravan(caravan, amount) {
  caravan.hp = Math.min(caravan.maxHp, caravan.hp + amount);
}

export function repairWagons(caravan, amount) {
  for (const w of caravan.wagons) w.hp = Math.min(w.maxHp, w.hp + amount);
}

// Rotate the wagons: the front wagon goes to the rear, so a fresh tough
// wagon takes the road hits.
export function rotateWagons(caravan) {
  if (caravan.wagons.length > 1) {
    caravan.wagons.push(caravan.wagons.shift());
  }
}

// The caravan's footprint, for collisions: front bumper to rear wagon.
export function caravanFront(caravan) {
  return caravan.x + 130;
}

export function caravanRear(caravan) {
  return caravan.x - 170;
}
