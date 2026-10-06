// Relax mode, chosen on the start card. The world stays as it is -- the drift, the shoals,
// the birds and the bear, the goosanders driving the smolts, the gannets at the bait ball,
// all of them hunting one another as ever -- but nobody goes for the salmon, and the salmon
// goes for nobody: it eats nothing, hunts nothing, strikes no one, is never hungry, and the
// drift is no longer lit up as its food. No net or hook takes it either. It grows with time
// and with the way it swims: down the river while young, anywhere at sea, up the river home.
// And the river is kinder to it (RELAX below, salmon.js), for whoever finds the current too
// hard: swimming costs half the strength, the current carries it off less, and a fish that
// is nearly spent gets its strength back faster where the water is calm.
// It can be switched on the card before each swim; ?relax / ?relax=0 (or the old ?vegan)
// sets it for one visit.
//
// It was called vegan mode until it took in the easing. Only the name the player sees
// changed: `mode.vegan`, this file, the switch's #intro-vegan and the key kept in the
// browser keep the old word, so that whoever had it on still has it on, and so that the
// Extreme fork, which takes the switch away and sets `mode.vegan` itself, goes on working.

const KEY = "salmon-survival-vegan";

// What relax mode eases: the cost of swimming (its share of what the body spends on it),
// how hard the current carries the fish (as a share of the water's speed), and below what
// strength, resting in calm water, it gets its strength back `mend` times as fast.
export const RELAX = { effort: 0.5, carry: 0.6, low: 0.25, mend: 2 };

function read() {
  const query = new URLSearchParams(location.search);
  for (const name of ["relax", "vegan"]) if (query.has(name)) return query.get(name) !== "0";
  try {
    return localStorage.getItem(KEY) === "1";
  } catch {
    return false;
  }
}

// `eased`: the kinder river of relax mode on its own, without the rest of it -- for a fork
// that keeps its hunters and its hunger but spares a beginner the current (Salmon Survival
// Extreme's Tourist level sets it). Relax mode always has it.
export const mode = { vegan: read(), eased: false };
export const easy = () => mode.vegan || mode.eased;

// How hard the current carries the salmon off (salmon.js), and so whatever must keep pace
// with it -- the school on the run past the goosanders (drive.js), which would leave a
// relaxed fish behind if it went with the whole current.
export const carried = () => (easy() ? RELAX.carry : 1);

export function setVegan(on) {
  mode.vegan = !!on;
  try {
    localStorage.setItem(KEY, on ? "1" : "0");
  } catch {}
}
