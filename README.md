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

## Character progression

Leveling works like MapleStory's.

- **Job advancements.** Everyone starts as a Novice. You advance to 1st job at level 10 (Warrior, Rogue or Mage), 2nd job at 30 (two choices per class), 3rd job at 60 and 4th job at 100. Each job brings its own skills and attribute growth. Advancing is permanent.
- **AP.** Every level gives 5 AP to put into STR, DEX, INT, VIT or LUK. Auto-assign spends it in your class's ratio.
- **SP and skill books.** Every level gives 3 SP (1 as a Novice) into the skill book of the job those levels belong to: Novice 1-9, 1st job 10-29, 2nd job 30-59, 3rd job 60-99, 4th job 100+. SP can only be spent on that job's skills. Max ranks are 10 (Novice), 20 (1st job) and 30 (2nd to 4th job).
- **Rotation.** Up to 3 actives fire on their own, 4 at 3rd job and 5 at 4th.
- **EXP curve.** The Novice levels go fast, then each level costs a bit more than the last, so 3rd and 4th job are a real grind.

Old saves are converted when they load: skill ranks are scaled to the new max ranks, each job's book is trimmed back to the SP that job's levels give, and you get the extra AP for the levels you already have. The tables live in `src/game/data/classes.js` and `src/game/data/skills.js`.

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
