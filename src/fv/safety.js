// Tourist's safety net (difficulty.js): a fish nearly out of strength gets food drifting its
// way, so that a beginner who has not eaten enough is not left to waste away in the current
// (a tester: "if you don't manage to eat enough at the beginning, you are done"). Below a
// quarter of its strength (relax mode's mark in the base game, vegan.js RELAX.low) a morsel
// is let into the water a little upstream of the fish every so often, at its own depth, so
// that the current brings it straight to its mouth. It is the river's own drift (life.js
// food.toss): it glows and is marked like any morsel, and the fish snaps at it by itself
// when it comes close. Each is worth enough to a fish of this size to give it back a
// little strength. It stops once the fish has two fifths of its strength back.
// (A spawner eats nothing: its net is relax mode's, resting in calm water: salmon.js.)

import { randomGenerator } from "../../shared/random.js";
import { STAGES } from "../salmon.js";
import { bed, clamp, level, regionWeights } from "../course.js";
import { RELAX } from "../vegan.js";

// What a morsel gives back at least, of the strength bar: salmon.js eat() turns a meal
// into strength at 0.0065 a unit taken, against what the stage digests a second (its
// `rate`), and a unit counts `rich` times for the smallest fish.
const LIFT = 0.06;
// One morsel every so many seconds, no more than so many drifting at once, and until the
// strength is back to this.
const EVERY = 1.6;
const AT_ONCE = 3;
const UNTIL = 0.4;
// A morsel that has drifted past the fish (this many lengths downstream of it), or has
// drifted for this long, is the river's again: it no longer keeps the next one back.
const PAST = 1.5;
const STALE = 8;
// What comes down, by what the fish can swallow (half its length, life.js: gape), as the
// drift has it there: a trout egg for the smallest, an earthworm washed in from the bank
// for a bigger fish in the river, krill in the estuary and at sea. (The sizes are life.js's
// FOODS at their largest.)
const EGG = 0.072,
  WORM = 0.6,
  KRILL = 0.384;

export function createSafetyNet({ life, difficulty }) {
  // (A stream of its own: the net must not change what the enemies do next.)
  const random = randomGenerator(0x5afe7);
  const regions = {};
  const drifting = [];
  let on = false,
    wait = 0,
    clock = 0;

  function morsel(fish) {
    const L = fish.length;
    regionWeights(fish.river.s, regions);
    if ((regions.sea ?? 0) + (regions.estuary ?? 0) > 0.5 && KRILL <= 0.5 * L) return "krill";
    if (WORM <= 0.5 * L) return "earthworm";
    return EGG <= 0.5 * L ? "egg" : null;
  }

  // One morsel a little upstream of the fish, across its way a little at random, at its depth.
  function letIn(fish, st) {
    const type = morsel(fish);
    if (!type) return;
    const L = fish.length;
    const flow = fish.flow ?? { vx: 0, vz: 0 };
    const speed = Math.hypot(flow.vx ?? 0, flow.vz ?? 0);
    let dx, dz;
    if (speed > 0.25) {
      dx = -flow.vx / speed;
      dz = -flow.vz / speed;
    } else {
      // (Slack water: it comes from ahead.)
      const h = Math.hypot(fish.heading.x, fish.heading.z) || 1;
      dx = fish.heading.x / h;
      dz = fish.heading.z / h;
    }
    const d = clamp(2 * L + 1.5 * speed, 1.5 * L, 6 * L + 1);
    const across = (random() - 0.5) * 0.3 * L;
    const item = life.food.toss(type, fish.position.x + dx * d - dz * across, fish.position.z + dz * d + dx * across, fish);
    if (!item) return;
    const lv = level(item.river.s),
      floor = bed(item.river.s, item.river.u);
    if (lv - floor < 0.4) {
      item.alive = false;
      return;
    }
    // At the height of the fish's mouth (life.js keeps the drift at a share of the column,
    // between 0.1 over the bed and 0.1 under the surface).
    item.eta = clamp((fish.mouth.y - floor - 0.1) / (lv - floor - 0.2), 0.04, 0.96);
    item.position.y = floor + 0.1 + (lv - floor - 0.2) * item.eta;
    // Worth at least LIFT of the strength bar to this fish.
    item.nutrition = Math.max(item.nutrition, (LIFT * st.rate) / (0.0065 * (st.rich ?? 1)));
    drifting.push({ item, worth: item.nutrition, born: clock, dx, dz });
  }

  return {
    // Each step of combat, for this page's own player.
    step(dt, player) {
      const f = player.fish;
      const st = STAGES[f.stage];
      clock += dt;
      // (Gone when eaten, drifted off or past the fish, or stale; and life.js reuses a gone
      // morsel's record for new drift, which then is worth what its own kind is.)
      for (let i = drifting.length - 1; i >= 0; i--) {
        const { item, worth, born, dx, dz } = drifting[i];
        const past = (f.position.x - item.position.x) * dx + (f.position.z - item.position.z) * dz > PAST * f.length;
        if (!item.alive || item.eatenAt >= 0 || item.nutrition !== worth || past || clock - born > STALE) drifting.splice(i, 1);
      }
      const able = difficulty.level.easy && !player.down && !f.airborne && !f.captive && !st.yolk && !st.fasting && st.rate > 0;
      if (!able) {
        on = false;
        return;
      }
      if (f.energy < RELAX.low) on = true;
      else if (f.energy >= UNTIL) on = false;
      // (A full stomach is strength on its way already.)
      const full = player.salmon.appetite?.().full ?? 0;
      wait -= dt;
      if (!on || full > 0.85 || drifting.length >= AT_ONCE || wait > 0) return;
      wait = EVERY * (0.8 + 0.4 * random());
      letIn(f, st);
    },
    // For tests: whether it is at work, and how many of its morsels drift now.
    get on() {
      return on;
    },
    get drifting() {
      return drifting.length;
    },
  };
}
