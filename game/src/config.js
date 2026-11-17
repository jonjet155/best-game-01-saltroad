// SALTROAD tuning: every number the game balances on lives here, in one
// place, so the road can be tuned without touching the simulation.
export const VIEW_W = 1280;
export const VIEW_H = 720;
export const STEP = 1 / 60;
export const LEGS = 7;
export const BEST_KEY = 'saltroad-best-score';

// The road band: the caravan rolls along y = ROAD_Y, hazards spawn on it.
export const ROAD_TOP = 330;
export const ROAD_BOTTOM = 600;
export const ROAD_Y = 465;
export const CARAVAN_X = 300; // the caravan holds this screen x; the world scrolls past it

export const CARAVAN_MAX_HP = 100;
export const WARDEN_MAX_HP = 100;
export const WARDEN_SPEED = 310;
export const WARDEN_RADIUS = 15;

// Supplies drain as the road rolls on; reach 0 and the caravan starves.
export const SUPPLY_DRAIN_PER_SEC = 0.55;
export const START_SUPPLIES = 60;
export const START_SALT = 24;

// Water: the desert's second currency. Heat waves drink it; rain refills
// it; run dry in the heat and the caravan starts to suffer.
export const START_WATER = 40;
export const WATER_MAX = 100;
export const HEAT_DRAIN_PER_SEC = 1.2;
export const THIRST_HULL_PER_SEC = 2;
export const CONDENSER_RATE = 0.4;
export const RAIN_RATE = 0.5;

// Salt-shot (click): the core verb. Free, short cooldown, aimed at the mouse.
export const SHOT_COOLDOWN = 0.22;
export const SHOT_SPEED = 760;
export const SHOT_DAMAGE = 26;
export const SHOT_RADIUS = 6;
export const SHOT_RANGE = 700;

// Salt cannon (SPACE): a blast ahead of the caravan. Costs salt.
export const CANNON_COST_SALT = 6;
export const CANNON_RADIUS = 150;
export const CANNON_DAMAGE = 70;
export const CANNON_COOLDOWN = 1.1;

// Bridge (E): planks over the nearest gap. Costs supplies.
export const BRIDGE_COST_SUPPLIES = 4;
export const BRIDGE_RANGE = 420;
export const BRIDGE_COOLDOWN = 0.6;

// Horn (Q): the guards charge the nearest raider.
export const HORN_COOLDOWN = 8;
export const GUARD_DAMAGE = 45;
export const GUARD_SPEED = 520;

// R: rotate the wagons — the front wagon takes the road hits, so put the
// toughest one in front when the rocks get thick.
export const WAGON_TYPES = {
  salt: { name: 'SALT', hp: 60, color: '#f8f4e8' },
  water: { name: 'WATER', hp: 80, color: '#38bdf8' },
  guard: { name: 'GUARD', hp: 120, color: '#b91c1c' },
};

// Hazard kinds. hp scales a little with the leg; see hazards.js.
export const HAZARD_TYPES = {
  rock: { name: 'ROCK', hp: 30, speed: 0, radius: 22, damage: 8, score: 15, salt: 1, supplies: 0, color: '#6b5a44' },
  gap: { name: 'GAP', hp: 1, speed: 0, radius: 34, damage: 12, score: 25, salt: 0, supplies: 0, color: '#3d2c17' },
  raider: { name: 'RAIDER', hp: 46, speed: 68, radius: 16, damage: 6, score: 40, salt: 3, supplies: 2, color: '#2b2118' },
  wisp: { name: 'SANDWISP', hp: 20, speed: 132, radius: 11, damage: 4, score: 30, salt: 2, supplies: 1, color: '#c98f2e' },
  worm: { name: 'SAND-WORM', hp: 60, speed: 0, radius: 20, damage: 10, score: 50, salt: 2, supplies: 2, color: '#a16207' },
  storm: { name: 'DUST STORM', hp: 40, speed: 0, radius: 90, damage: 0, score: 60, salt: 2, supplies: 0, color: '#92400e' },
  slide: { name: 'ROCKSLIDE', hp: 1, speed: 0, radius: 40, damage: 0, score: 0, salt: 0, supplies: 0, color: '#78716c' },
  mirage: { name: 'MIRAGE', hp: 10, speed: 0, radius: 22, damage: 0, score: 5, salt: 0, supplies: 0, color: '#e7e5e4' },
  tyrant: { name: 'SAND TYRANT', hp: 650, speed: 26, radius: 40, damage: 14, score: 1500, salt: 30, supplies: 15, color: '#78350f' },
  chief: { name: 'RAIDER CHIEF', hp: 650, speed: 30, radius: 44, damage: 16, score: 2000, salt: 40, supplies: 20, color: '#4a1420' },
};

// What each leg sends. length is in road-metres; the caravan's speed
// (oxen, upgrades) turns metres into seconds. Leg 4 ends with the Sand
// Tyrant, leg 7 with the Raider Chief.
export const LEG_PLANS = [
  { length: 620, count: 9, mix: { rock: 0.6, raider: 0.4 }, speed: 13, saltBonus: 8, supplyBonus: 10 },
  { length: 680, count: 13, mix: { rock: 0.4, raider: 0.35, gap: 0.15, worm: 0.1 }, speed: 14, saltBonus: 10, supplyBonus: 12 },
  { length: 740, count: 17, mix: { rock: 0.3, raider: 0.3, gap: 0.15, wisp: 0.15, slide: 0.1 }, speed: 15, saltBonus: 12, supplyBonus: 14 },
  { length: 800, count: 21, mix: { rock: 0.25, raider: 0.3, gap: 0.15, wisp: 0.15, worm: 0.1, mirage: 0.05 }, speed: 16, saltBonus: 14, supplyBonus: 16, boss: 'tyrant' },
  { length: 860, count: 25, mix: { rock: 0.2, raider: 0.3, gap: 0.15, wisp: 0.15, worm: 0.1, storm: 0.05, mirage: 0.05 }, speed: 17, saltBonus: 16, supplyBonus: 18 },
  { length: 920, count: 29, mix: { rock: 0.2, raider: 0.35, gap: 0.15, wisp: 0.15, worm: 0.05, storm: 0.05, slide: 0.05 }, speed: 18, saltBonus: 18, supplyBonus: 20 },
  { length: 980, count: 24, mix: { rock: 0.2, raider: 0.35, gap: 0.15, wisp: 0.15, worm: 0.05, storm: 0.05, mirage: 0.05 }, speed: 19, saltBonus: 20, supplyBonus: 22, boss: 'chief' },
];

// Weather, rolled per leg from the seeded generator (leg 7 is always a
// sandstorm — the chief rides in on it).
export const WEATHERS = {
  clear: { name: 'CLEAR DAWN', line: 'Easy road, clear sight.' },
  heat: { name: 'HEAT WAVE', line: 'Water drains fast — run dry and the hull suffers.' },
  storm: { name: 'SANDSTORM', line: 'Hazards crowd the road; dust blinds the far edge.' },
  rain: { name: 'RARE RAIN', line: 'Water refills and the hull drinks a little.' },
};

// Route choice at each post: three roads to the next leg.
export const ROUTES = [
  { id: 'shortcut', name: 'SHORT CUT', line: 'Steep and raider-haunted: 25% shorter, 40% more hazards', lengthMult: 0.75, countMult: 1.4, waterBonus: 0, supplyBonus: 0 },
  { id: 'safe', name: 'SAFE ROAD', line: 'The long way round: 30% longer, 30% fewer hazards', lengthMult: 1.3, countMult: 0.7, waterBonus: 0, supplyBonus: 0 },
  { id: 'oasis', name: 'OASIS DETOUR', line: 'Same road, but the oasis refills: +25 water, +15 supplies', lengthMult: 1.0, countMult: 1.0, waterBonus: 25, supplyBonus: 15 },
];

// Trading post: salt is the currency. Prices differ nowhere yet — the
// post IS the price list; the choice is what the caravan needs most.
export const TRADES = [
  { id: 'water', name: 'WATER +25', line: 'A skin of water', cost: 10, key: '7' },
  { id: 'repair', name: 'REPAIR +30', line: 'Hull and wagons', cost: 8, key: '8' },
  { id: 'guard', name: 'HIRE GUARD', line: '+1 guard rider', cost: 15, key: '9' },
  { id: 'wagon', name: 'NEW WAGON', line: '+1 salt wagon', cost: 25, key: '0' },
  { id: 'scout', name: 'HIRE SCOUT', line: 'Sees the road ahead', cost: 20, key: '' },
  { id: 'healer', name: 'HIRE HEALER', line: 'Mends the hull', cost: 20, key: '' },
  { id: 'captain', name: 'HIRE CAPTAIN', line: 'Guards hit harder', cost: 25, key: '' },
];

// Between-leg upgrades: draft one of three at the outfitter's camp,
// drawn from twelve. id, name, line, apply — apply mutates the caravan's
// upgrade bundle.
export const UPGRADES = [
  { id: 'wagons', name: 'BIG WAGONS', line: '+25 max hull, repair 20 now', apply: (u) => { u.maxHpBonus += 25; u.healNow += 20; } },
  { id: 'oxen', name: 'SWIFT OXEN', line: 'Caravan rolls 18% faster', apply: (u) => { u.speedMult *= 1.18; } },
  { id: 'cannon', name: 'SALT CANNON', line: 'Cannon +35 damage, +40 reach', apply: (u) => { u.cannonDamage += 35; u.cannonRadius += 40; } },
  { id: 'guards', name: 'SHARP GUARDS', line: 'Horn hits +25, recharges 3s faster', apply: (u) => { u.guardDamage += 25; u.hornCut += 3; } },
  { id: 'stores', name: 'SALT STORES', line: 'Kills drop +1 salt, +18 salt now', apply: (u) => { u.saltBonus += 1; u.saltNow += 18; } },
  { id: 'rims', name: 'IRON RIMS', line: 'Road hits hurt 35% less', apply: (u) => { u.armorMult *= 0.65; } },
  { id: 'throw', name: 'LONG THROW', line: 'Salt-shots +14 damage, +80 range', apply: (u) => { u.shotDamage += 14; u.shotRange += 80; } },
  { id: 'packed', name: 'WELL PACKED', line: '+20 supplies now, drain 25% slower', apply: (u) => { u.supplyNow += 20; u.drainMult *= 0.75; } },
  { id: 'ballista', name: 'BALLISTA WAGON', line: 'A wagon that auto-fires at hazards', apply: (u) => { u.ballista = true; } },
  { id: 'wheels', name: 'REINFORCED WHEELS', line: 'Road hits -20% more, +8% speed', apply: (u) => { u.armorMult *= 0.8; u.speedMult *= 1.08; } },
  { id: 'condenser', name: 'WATER CONDENSER', line: 'Drips +0.4 water every second', apply: (u) => { u.condenser = true; } },
  { id: 'cache', name: 'DEEP CACHE', line: '+30 salt now, kills drop +1 salt', apply: (u) => { u.saltBonus += 1; u.saltNow += 30; } },
];
