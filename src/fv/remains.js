// "Kampf nährt das Leben" (plan, part 2): what a fight leaves is food, on every difficulty.
// A burst enemy leaves its chunks (gore.js), which sink and drift with the current; a small
// one sunk whole can be swallowed as it floats; a big one floating can be bitten, a mouthful
// at a time, until it is picked clean. All of it is worth what the enemy weighed (gore.js
// CORPSE_FOOD by its size), and all of it looks and acts like the base game's food: the
// chunks glow warm while the fish can eat them, and the nearest piece or body in front is
// offered to the food's mark and its snap as a shoal fish is (life.js: shoals hand the
// drift their best `aim`), so the fish turns onto it and takes it by itself.
//
// But fighting must feed a fish without replacing its foraging, or the fish that only
// fights would never need the drift. So the flesh a fish takes is capped against its own
// stomach (salmon.js): no more than a quarter of the stomach's worth at once, filling up
// again only at a third of what the fish digests at most, and a sixteenth of the stomach at
// most from one piece or one bite (two from a body swallowed whole). While that room is
// spent the remains lie dark, and the fish leaves them. The spawner eats nothing (its
// fights give back strength instead: combat.js reward()).
//
// The remains are this page's own (gore.js's pool, the enemies' bodies): the drift's eaters
// -- the armed school, the rival young salmon -- never see them.

import * as THREE from "three";
import { STAGES } from "../salmon.js";
import { CORPSE_FOOD } from "./gore.js";

// (salmon.js: a full stomach empties in this long at the stage's fastest digestion.)
const STOMACH_SECONDS = 150;
// The room for flesh, in shares of the stomach: at most, filling back a second, the most a
// piece or a bite may give, and the least for the remains to be food at all.
const ROOM = 0.25;
const BACK = 0.3 / STOMACH_SECONDS;
const PIECE = 0.06;
const LEAST = 0.02;
// An alevin still on its yolk has no stomach to speak of: what its "stomach" holds here, in
// the yolk's own units (salmon.js eat(): a hundred and tenth of the stage for each).
const YOLK_STOMACH = 8;
// A bite out of a body too big to swallow: what the mouth tears off, by the biter's length,
// and how often it can bite (seconds).
const MOUTHFUL = 0.3;
const BITE_EVERY = 0.45;

// What a stage's stomach holds (in what salmon.js counts it in, a unit eaten times `rich`),
// and what a unit eaten is worth to it.
function stomachOf(st) {
  if (st.yolk) return { holds: YOLK_STOMACH, rich: 1 };
  return { holds: st.rate * STOMACH_SECONDS, rich: st.rich ?? 1 };
}

export function createRemains({ life, gore }) {
  // Each player's room for flesh (a share of the stomach), by id: this page feeds only its own.
  const room = new Map();
  // The bodies bitten into: how much is left on each, and when its jaws may close again.
  // (Every enemy is a record of its own, made as it comes: enemies.js spawn.)
  const bitten = new WeakMap();
  const roomOf = (player) => room.get(player.id) ?? ROOM;

  // Whether `player` can eat what a fight left now.
  function hungry(player) {
    const f = player.fish;
    const st = STAGES[f.stage];
    return !player.down && !st.fasting && !f.airborne && !f.captive && roomOf(player) >= LEAST;
  }

  // `player` eats remains worth `worth` (CORPSE_FOOD units) of `kind`, up to `pieces`
  // pieces' worth: what it gets is capped by its room, and the room shrinks by it. Returns
  // what the salmon took (salmon.js eat()).
  function take(player, worth, kind = "flesh", pieces = 1) {
    const f = player.fish;
    const st = STAGES[f.stage];
    if (st.fasting || !(worth > 0)) return 0;
    const { holds, rich } = stomachOf(st);
    const left = roomOf(player);
    const share = Math.min((worth * rich) / holds, PIECE * pieces, left);
    if (!(share > 0)) return 0;
    room.set(player.id, left - share);
    return player.salmon.eat((share * holds) / rich, kind);
  }

  // What is left on a dead body to bite off (CORPSE_FOOD units).
  function fleshOn(e) {
    let b = bitten.get(e);
    if (!b) {
      b = { left: CORPSE_FOOD * e.size, ready: 0 };
      bitten.set(e, b);
    }
    return b;
  }

  // The point on a body (its axis, tail to snout) nearest `point`, into `out`.
  const tail = new THREE.Vector3(),
    along = new THREE.Vector3();
  function onBody(e, point, out) {
    const h = e.heading;
    tail.copy(e.position).addScaledVector(h, -0.5 * e.size);
    along.copy(h).multiplyScalar(0.94 * e.size);
    const t = Math.max(0, Math.min(1, out.subVectors(point, tail).dot(along) / Math.max(1e-6, along.lengthSq())));
    return out.copy(tail).addScaledVector(along, t);
  }

  // Which bodies are food: dead, not yet eaten or burst, not a jellyfish (its mine is about to
  // go off) and not a fish of the salmon's own school. Whole, if it is small enough to
  // swallow; else bitten, while there is flesh left on it.
  function body(e, L) {
    if (!e.dead || e.eaten || e.burst || e.spec.weapon?.kind === "contact" || e.spec.kin) return null;
    if (e.size <= 1.1 * L) return "whole";
    return fleshOn(e).left > 0.5 ? "bite" : null;
  }

  // The food's mark and snap (life.js): after the shoals have offered their best, the
  // nearest piece or body in front of the mouth, if it is nearer -- by the shoals' own rule,
  // well in front of the mouth and within a body length or so.
  const spot = new THREE.Vector3(),
    near = new THREE.Vector3(),
    toward = new THREE.Vector3();
  let offerTo = null,
    enemies = null;
  function offer(aim, fish) {
    const player = offerTo;
    if (!player || player.fish !== fish || !hungry(player)) return;
    const L = fish.length;
    const piece = gore.nearest?.(fish.mouth, fish.heading, aim.distance, spot);
    if (piece) {
      aim.distance = piece.distance;
      aim.ahead = piece.ahead;
      aim.position = spot;
    }
    for (const e of enemies?.list ?? []) {
      const how = body(e, L);
      if (!how) continue;
      if (how === "whole") near.copy(e.position);
      else onBody(e, fish.mouth, near);
      toward.subVectors(near, fish.mouth);
      const d = toward.length();
      const ahead = toward.dot(fish.heading);
      if (d < aim.distance && ahead > 0.5 * d) {
        aim.distance = d;
        aim.ahead = ahead / Math.max(1e-6, d);
        aim.position = spot.copy(near);
      }
    }
  }
  if (life?.shoals?.update) {
    const shoalsUpdate = life.shoals.update;
    life.shoals.update = function (dt, fish, salmon, time, travel, aim, ...rest) {
      const eaten = shoalsUpdate.call(this, dt, fish, salmon, time, travel, aim, ...rest);
      if (aim) offer(aim, fish);
      return eaten;
    };
  }

  return {
    hungry,
    take,
    body,
    onBody,
    fleshOn,
    // Each step: the room filling back, and the chunks lit for whoever eats here.
    step(dt, player, list) {
      offerTo = player;
      enemies = list;
      room.set(player.id, Math.min(ROOM, roomOf(player) + BACK * dt));
      gore.feed?.(player.fish.position, player.fish.length, hungry(player));
    },
    // A bite out of a body `e` too big to swallow, by `player`, with its mouth at `point`.
    // Returns what it took, or 0 (nothing left, or the jaws not ready yet).
    bite(player, e, point, clock) {
      const b = fleshOn(e);
      if (clock < b.ready || b.left <= 0.5) return 0;
      b.ready = clock + BITE_EVERY;
      const mouthful = Math.min(b.left, CORPSE_FOOD * MOUTHFUL * player.fish.length);
      b.left -= mouthful;
      gore.bite?.(e, point);
      return take(player, mouthful, e.kind);
    },
    // For tests: the room for flesh a player has left (a share of its stomach).
    room: roomOf,
  };
}
