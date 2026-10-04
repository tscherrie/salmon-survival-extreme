// Two things the game long kept in one flag (touchMode, decided once at load) are apart here:
//
// The kind of device, `handheld`: a phone or a tablet, or a computer. It decides what the
// game starts with -- the graphics it recommends, the picture as sharp as a phone's screen
// and no more, the layout for a small screen held sideways -- and it is told by what the
// browser says it runs on, not by the pointer: a Windows, Linux, ChromeOS or Mac computer is
// a computer, touch screen or not. (Chromium on a Windows 2-in-1 folded into a tablet, or with
// its keyboard off, reports nothing but a coarse pointer and no hover, so a test of the
// pointer alone sent such a computer the phone version, and its touch pad steered nothing.)
//
// The controls in use, `scheme`: "mouse" (the mouse or the touch pad, and the keyboard) or
// "touch". They start as the kind of device suggests and then follow the hand: a mouse moved
// or clicked on the page, or one of the game's keys, and the mouse and the keyboard are
// in use; a finger (or a pen, which cannot capture the pointer either and steers as a finger
// does) on the river or on the touch controls, and touch is. A computer with a touch screen,
// or a tablet with a keyboard and a touch pad, plays either way, and changes over without a
// reload. ?touch and ?desktop (or ?mouse) in the address hold one scheme for good.
//
// For an extension (src/mods.js) this object is `game.controls`: `controls.touch` is whether
// the touch controls are in use now, `controls.on(fn)` calls fn(scheme, event) at every
// change (and returns a function that stops it), `controls.handheld` is the kind of device.
// #habitat carries the class "touch" while the touch controls are in use, and "handheld" on
// a phone or a tablet. `game.touchMode` reads `controls.touch` at the moment it is read (so
// read it when it matters, not once at the start).

// Phones, and tablets that say so (an Android tablet leaves "Mobile" out, but not "Android").
const HANDHELD_UA = /Android|iPhone|iPad|iPod|Mobile|Silk|Kindle|Opera Mini/i;

export function handheldDevice() {
  const ua = navigator.userAgent;
  if (HANDHELD_UA.test(ua) || navigator.userAgentData?.mobile) return true;
  const touchPoints = navigator.maxTouchPoints > 1;
  const finePointer = matchMedia("(any-pointer: fine)").matches;
  // iPadOS presents itself as a Mac, but a Mac has no touch screen: a "Mac" that can be
  // touched with no fine pointer, or with the home-screen flag only iOS and iPadOS have (an
  // iPad with a touch pad has a fine pointer), is an iPad.
  if (/Macintosh/.test(ua) && touchPoints && (!finePointer || "standalone" in navigator)) return true;
  // Chrome on a big Android tablet asks for the desktop pages, as a Linux computer: one that
  // can be touched and has neither a fine pointer nor anything that hovers is that tablet.
  // (A Chromebook says CrOS, and a Windows tablet is a computer; see above.)
  if (/X11; Linux/.test(ua) && !/CrOS/.test(ua) && touchPoints && !finePointer && !matchMedia("(any-hover: hover)").matches) return true;
  return false;
}
export const isDesktop = () => !handheldDevice();

// What a mouse has to travel, in pixels, before it takes the controls over from a finger:
// a real move, not the pointer events a browser makes up for a cursor that stands still.
const MOUSE_TRAVEL = 12;
// The game's keys: steering and swimming, the dash, and the keys of the HUD's buttons.
const GAME_KEYS = new Set(["KeyW", "KeyA", "KeyS", "KeyD", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Space", "KeyE", "KeyF", "KeyG", "KeyI", "KeyL", "KeyM", "KeyP", "KeyT"]);
// A key pressed while a finger is on the screen, or just after, is someone playing with
// both: they keep the touch controls, and the keys work there anyway (main.js reads them
// whichever controls are in use).
const FINGER_GRACE = 1500;

// `river(target)`: whether a finger put down there takes the touch controls (the river, the
// touch controls themselves, the start button).
export function createControls({ habitat, handheld, scheme, pinned = false, river = () => true }) {
  const listeners = new Set();
  let travel = 0;
  const fingers = new Set();
  let fingerAt = -Infinity;
  const controls = {
    handheld,
    pinned,
    scheme,
    get touch() {
      return controls.scheme === "touch";
    },
    // Hands the controls to `next`, with the event that did it (or null); false when nothing
    // changed. Each listener gets (scheme, event), after #habitat's classes have.
    use(next, event = null) {
      if (pinned || next === controls.scheme || (next !== "touch" && next !== "mouse")) return false;
      controls.scheme = next;
      travel = 0;
      habitat.classList.toggle("touch", next === "touch");
      for (const listener of listeners) listener(next, event);
      return true;
    },
    on(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
  habitat.classList.toggle("touch", scheme === "touch");
  habitat.classList.toggle("handheld", handheld);
  if (pinned) return controls;

  // (All on the window and before anything else hears of it, so that whatever the event then
  // does, it does with the controls it was made with.)
  const options = { capture: true, passive: true };
  window.addEventListener(
    "pointermove",
    (event) => {
      if (event.pointerType !== "mouse" || controls.scheme === "mouse") return;
      travel += Math.abs(event.movementX || 0) + Math.abs(event.movementY || 0);
      if (travel >= MOUSE_TRAVEL) controls.use("mouse", event);
    },
    options,
  );
  window.addEventListener(
    "pointerdown",
    (event) => {
      if (event.pointerType === "mouse") return void controls.use("mouse", event);
      fingers.add(event.pointerId);
      fingerAt = performance.now();
      travel = 0;
      if (river(event.target)) controls.use("touch", event);
    },
    options,
  );
  const lift = (event) => {
    if (event.pointerType === "mouse") return;
    fingers.delete(event.pointerId);
    fingerAt = performance.now();
  };
  window.addEventListener("pointerup", lift, options);
  window.addEventListener("pointercancel", lift, options);
  window.addEventListener(
    "keydown",
    (event) => {
      if (controls.scheme === "mouse" || !GAME_KEYS.has(event.code) || event.ctrlKey || event.metaKey || event.altKey) return;
      // (Not a name typed into a field.)
      if (event.target?.closest?.("input, textarea, select, [contenteditable]")) return;
      if (fingers.size || performance.now() - fingerAt < FINGER_GRACE) return;
      controls.use("mouse", event);
    },
    options,
  );
  return controls;
}
