# stealth-game-20261121-entry

[![make.fun · best-stealth-game-20261121-1759](https://make.fun/badge/best-stealth-game-20261121-1759.svg)](https://make.fun/bounty/best-stealth-game-20261121-1759?utm_source=github&utm_medium=readme&utm_campaign=best-stealth-game-20261121-1759)
[![rank](https://make.fun/badge/best-stealth-game-20261121-1759/shelbyxxx1/stealth-game-20261121-entry/rank.svg)](https://make.fun/bounty/best-stealth-game-20261121-1759/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-stealth-game-20261121-1759)
[![reward](https://make.fun/badge/best-stealth-game-20261121-1759/shelbyxxx1/stealth-game-20261121-entry/reward.svg)](https://make.fun/bounty/best-stealth-game-20261121-1759?utm_source=github&utm_medium=readme&utm_campaign=best-stealth-game-20261121-1759)

**Lantern Row** — a top-down stealth game in a night market. You are Rani, a courier. Someone stole the market's three spice ledgers: slip through the lantern-lit lanes, recover them, and reach the canal boat unseen.

Guards (market wardens) patrol fixed routes with vision cones that stalls and walls cut off. Lantern light exposes you — a lit player is spotted faster and from further away — while shadow hides you. Running is loud; sneaking is quiet. Each guard's suspicion feeds one detection meter: fill it and the alarm sounds, the wardens chase your last seen position, and getting caught restarts the level.

Three levels: the market lane, the spice warehouses, and the captain's yard, where the captain's cone is longer and wider and the yard is bright with little shadow. All artwork is original, drawn in code on canvas. Sound is synthesized with WebAudio. No image, font or audio files, no dependencies, no build step, no network requests.

## Play

- **WASD / arrows:** move
- **Shift:** sneak (slower, quieter, harder to spot)
- **Ctrl:** run (faster, louder — guards hear it)
- **R:** retry the current level
- **P / Escape:** pause
- **M:** toggle sound
- **Enter / click:** start, continue

Collect every ledger in a level, then reach the boat. Getting caught restarts the level; the game counts how many times you were spotted.

## Run

```sh
node serve.ts
```

Open http://localhost:8080 in desktop Chrome. No build step. To open `game/index.html` directly via `file://`, Chrome needs `--allow-file-access-from-files` to permit local ES-module imports; a static server is recommended for ordinary play.

## Hand-in

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

The hand-in program clears the output directory's entries (never the directory itself), copies `game/` and the four real JPEG renders in `screenshots/`, then generates `dossier.json` using the unchanged competition vendor library. Do not point the output directory at the source repository or any directory containing it.

`shots.json` lists the four deterministic staged views. Add its queries to the game URL to reproduce the frozen frames: each plays the real rules forward from a fresh world with a simple autopilot, so the same seed always gives the same frame.

Built for make.fun. This repository is the entry; it does not submit itself.
