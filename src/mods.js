// Extensions to the game. Salmon Survival itself has none; a fork lists its own here, so
// that its changes stay out of main.js. Each is an object with any of these hooks:
//   init(game)         once, before the first frame, with the game's parts (see main.js),
//                      so that what it adds to the scene is compiled with everything else
//   step(dt, outcome)  each step of the world, after life's; it may add to the outcome
//   frame(dt)          each frame, also while the world stands still
//   keepRunning()      true: pause and logbook do not stop the world (a game shared online)
//   takesButton(n)     true: mouse button n is the extension's, not the lunge's
// The controls in use, the mouse and the keyboard or touch, can change hands mid-game (a
// computer with a touch screen): game.controls (src/controls.js) has `touch` for the ones in
// use now and `on(fn)` for each change; game.touchMode is `touch` at the moment it is read.
export const mods = [];
