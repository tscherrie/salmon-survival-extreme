// Difficulty, in the place of the base game's relax mode (once vegan mode; plan, part 2):
// Tourist for whoever just wants to look round with a gun, Normal as the game is meant,
// Serious for more and harder enemies. It is picked on the title card, kept in the browser,
// and read each step: how much of a strike or a shot reaches the fish, whether a big fish
// can swallow it whole, how many enemies come, and how much it takes to sink them. (In co-op
// each player will have their own.)
//
// Tourist also eases the river itself, for whoever finds the current too hard (a tester:
// "if you don't manage to eat enough at the beginning, you are done"): the base game's relax
// mode lends it its easing (vegan.js: `mode.eased`, the same RELAX numbers -- swimming and
// holding against the current at half the cost, the current carrying the fish off less), and
// a fish nearly out of strength gets food drifting its way (safety.js). Someone who has never
// played starts on Tourist, with a line saying that Normal is the game as it is meant.

import { t } from "../i18n.js";
import { mode } from "../vegan.js";

const KEY = "extreme-difficulty";
// (The base game's saved life, save.js: whoever has one has played here before.)
const SAVE_KEY = "salmon-survival-v1";
export const LEVELS = [
  {
    id: "tourist",
    name: "Tourist",
    line: "Die Gegner treffen kaum, verschluckt wirst du nicht. Schwimmen kostet weniger Kraft, die Strömung reißt dich nicht so leicht mit, und wird deine Kraft knapp, treibt dir mehr Futter zu.",
    taken: 0.4,
    count: 0.7,
    hp: 0.8,
    swallow: false,
    easy: true,
  },
  { id: "normal", name: "Normal", line: "So, wie es gedacht ist.", taken: 1, count: 1, hp: 1, swallow: true, easy: false },
  { id: "serious", name: "Serious", line: "Mehr Gegner, die härter zuschlagen und mehr aushalten.", taken: 1.5, count: 1.4, hp: 1.3, swallow: true, easy: false },
];

// The level in use: ?difficulty=<id> for one visit (tests), else the one kept in the browser;
// someone who has never played here (no level kept, no saved life) starts on Tourist, and
// that is kept for them at once, so that it is still theirs when they come back; anyone else
// on Normal. (A development run -- a jump to a stage or a place, the capture harness, the
// test scenes -- is never a first visit: its scenes are tuned on Normal.)
const query = typeof location === "undefined" ? new URLSearchParams() : new URLSearchParams(location.search);
const asked = LEVELS.find((l) => l.id === query.get("difficulty")) ?? null;
let kept = null,
  saved = false;
try {
  kept = LEVELS.find((l) => l.id === localStorage.getItem(KEY)) ?? null;
  saved = !!localStorage.getItem(SAVE_KEY);
} catch {}
const development = ["capture", "diagnostics", "fvtest", "shots", "stage", "at"].some((k) => query.has(k));
export const firstVisit = !asked && !kept && !saved && !development;
let level = asked ?? kept ?? (firstVisit ? LEVELS[0] : LEVELS[1]);
if (firstVisit) keep(level);
ease();

function keep(l) {
  if (asked) return;
  try {
    localStorage.setItem(KEY, l.id);
  } catch {}
}
// (The base game's easing follows the level at once: salmon.js reads it each step.)
function ease() {
  mode.eased = !!level.easy;
}

// On the title card, where the vegan switch was: the three levels as one row of buttons
// (a .seg, which the card's settings give the look of their other rows), each level's line
// in its tooltip. card.js adds it among the settings as the page loads, with its label, so
// it carries no heading of its own; on a first visit it also puts firstLine() under it.
let row = null,
  hint = null;
export function difficultyRow() {
  if (row || typeof document === "undefined") return row;
  row = document.createElement("div");
  row.className = "fv-difficulty seg";
  row.setAttribute("role", "group");
  row.setAttribute("aria-label", t("Schwierigkeit"));
  const buttons = LEVELS.map((l) => {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = t(l.name);
    button.title = t(l.line);
    button.addEventListener("click", () => {
      pick(l);
      keep(l);
      // (Chosen now: the word for the first visit has done its work.)
      hint?.remove();
      hint = null;
    });
    row.appendChild(button);
    return button;
  });
  const pick = (l) => {
    level = l;
    ease();
    buttons.forEach((b, i) => b.setAttribute("aria-pressed", String(LEVELS[i] === l)));
  };
  pick(level);
  return row;
}

// The line under the levels on a first visit (null otherwise): Tourist to begin with, and
// that Normal is the game as it is meant. It goes once a level is clicked.
export function firstLine() {
  if (!firstVisit || hint || typeof document === "undefined") return hint;
  hint = document.createElement("p");
  hint.className = "fv-first";
  hint.textContent = t("Zum Einstieg Tourist – Normal ist das Spiel, wie gedacht.");
  return hint;
}

// What combat reads each step.
export function createDifficulty() {
  return {
    get level() {
      return level;
    },
  };
}
