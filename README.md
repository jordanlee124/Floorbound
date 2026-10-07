# Floorbound

A text-based grinding RPG. Climb floors one fight at a time, loot gear and push it with Star Force and cubes, spend stat points, and pick a class and its skills. Each fight starts when you press **Fight** and then plays out on its own.

Runs on the web and on Android. The Android app is the same web build wrapped with [Capacitor](https://capacitorjs.com/).

## Getting started (VS Code)

1. Install [Node.js](https://nodejs.org/) 20 or newer.
2. Open this folder in VS Code and install the recommended extensions when prompted.
3. In the terminal, run `npm install`, then `npm run dev`.
4. Open http://localhost:5173. To debug with breakpoints, use **Run and Debug → Debug game in Chrome**, which starts the dev server for you.

| Command | What it does |
| --- | --- |
| `npm run dev` | Dev server with hot reload |
| `npm run build` | Production web build in `dist/` |
| `npm run preview` | Serve the production build locally |
| `npm run sim -- 4` | Balance sim: 8 bot builds play for 4 hours of game time |
| `npm run android:sync` | Build the web app and copy it into the Android project |
| `npm run android:open` | Open the Android project in Android Studio |
| `npm run android:run` | Build, sync and run on a connected device or emulator |

## Gear progression

Gear works like MapleStory's.

- **Level brackets.** Floors 1-9 drop level 1 gear, floors 10-19 drop level 10 gear, and so on. Each boss opens the next bracket, so you farm a set and then build it up.
- **Star Force.** Spend gold to add stars, which multiply an item's base stats. Max stars depend on item level (10, 15, 20, 25). From ★11 a failure can drop a star, from ★12 an attempt can destroy the item (it drops to ★12 and needs a gold repair), and two drops in a row trigger Chance Time. Safeguard removes the destroy chance on ★12 to ★16 for double gold.
- **Potential.** An item's rarity is its potential tier: Normal, Rare, Epic, Unique, Legendary. Rare and better items have three lines. Red Cubes reroll the lines at once; Black Cubes show the new lines and let you keep either. Either can raise the tier, with a guaranteed tier-up after enough cubes at one tier. Bosses and elites drop cubes, and salvage shards buy them.

The tables live in `src/game/data/starforce.js` and `src/game/data/potentials.js`.

## Android

You need [Android Studio](https://developer.android.com/studio), which brings the Android SDK and a JDK.

1. `npm run android:sync`
2. `npm run android:open`, then press Run in Android Studio. You can also run `npm run android:run` with a device plugged in.

Run `npm run android:sync` after every web change so the app picks it up. To make a Play Store build, use **Build → Generate Signed Bundle** in Android Studio. Keep your keystore out of git.

## Code layout

The game model (`src/game/`) has no DOM code, so the browser, the Android app and the Node balance sim all run the same classes.

- `src/game/Game.js`: one play session. Owns the player and the current fight, and hands out rewards and floor progress.
- `src/game/Player.js`: level, class, attributes, skills, gear and bag. `combatStats()` turns all of that into fight numbers.
- `src/game/Battle.js`: one fight, simulated in 0.1s ticks. `SkillContext` is what a skill can do when it fires.
- `src/game/Item.js`, `Enemy.js`, `Skill.js` (`ActiveSkill`, `PassiveSkill`), `CharacterClass.js`: the game objects.
- `src/game/data/`: tuning tables for classes, skills, items and enemies. `curves.js` holds the growth curves.
- `src/ui/App.js`: the fight loop, input routing, saving and rendering.
- `src/ui/`: one class per view (`BattleView`, `LootPopup`, `HeaderView`) plus `panels/` (one class per tab). Each view exposes named `actions`, and buttons trigger them with `data-act="name"`.
- `tools/sim.mjs`: balance sim. Run it after changing numbers. `npm run sim -- 2 --seed=1` is deterministic, so you can compare runs before and after a refactor. Set `SIMDBG=1` to print each bot's gear (level, stars, tier) every hour.
- `android/`: the Capacitor Android project.

Saves are kept in the browser's or app's local storage. The Save tab has a copyable save code for moving a character between devices.
