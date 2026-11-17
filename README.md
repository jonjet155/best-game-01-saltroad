# SALTROAD — a caravan journey across the desert at dawn

Guide a salt caravan across the desert to the far city. No fixed base, no
waves to survive: the caravan keeps moving, and you win by REACHING the
city at the end of leg 7 — after beating the Raider Chief who blocks the
road there.

## How to play

- **Move the Warden** with WASD / arrow keys. The caravan rolls on its own.
- **Click** to throw a salt-shot at a hazard or raider (free, short cooldown).
- **SPACE — Salt Cannon**: a blast ahead of the caravan that shatters rocks
  and scatters raiders. Costs 6 salt.
- **E — Bridge**: lay planks over the nearest washed-out gap. Costs 4 supplies.
- **Q — Horn**: rally the guards; they charge the nearest raider. Cooldown 8 s.
- **R — Rotate wagons**: the front wagon takes the road hits, so put the
  toughest one in front when the rocks get thick.

Between legs, at the outfitter's camp, draft **1 of 3 upgrades** (drawn
from 12: bigger wagons, swifter oxen, a ballista wagon, a water
condenser, and more), **choose your road** — short cut, safe road or
oasis detour — and **trade salt** at the post: water, repairs, guard
riders, a new wagon, or hire a scout, healer or guard captain.

## The road fights back

- **Hazards:** rocks, gaps, raiders, sandwisps — plus sand-worms that
  erupt from below, dust storms that grind the caravan, rockslides with
  a telegraphed warning, and mirages that are only light (shooting one
  earns a little for seeing through it).
- **Weather** changes every leg: clear dawn, heat waves (water drains —
  run dry and the hull suffers), sandstorms (hazards crowd the road),
  rare rain (water refills).
- **Wagons** have their own roles and health: salt, water and guard.
  A broken wagon loses its role until a new one is bought.
- **Clear-streak:** every hazard cleared without taking damage raises
  the streak and pays more. One hit resets it.
- **Bosses:** the Sand Tyrant rises on leg 4; the Raider Chief blocks
  the road to the far city on leg 7.

## Win / Lose

- **WIN:** reach the far city on leg 7 and defeat the Raider Chief.
- **LOSE:** the caravan is broken (hull 0) or its supplies run out.

## Resources

- **Salt** is cargo and currency: kills drop it, the cannon spends it.
- **Supplies** feed the caravan and pay for bridges; they drain slowly as
  the road rolls on. Gather the sacks raiders drop.

## Run it

```
node serve.ts            # then open http://localhost:8080
```

`main.ts` (Node 22, standard library only) hands the entry in: it copies
`game/` and `screenshots/` to the output directory and writes
`dossier.json` with the vendored make.fun library. The game itself is
plain static files under `game/` — Canvas 2D, procedural art, synthesized
WebAudio, no network, seeded RNG so every run plays the same road.

## License

MIT — see LICENSE.
