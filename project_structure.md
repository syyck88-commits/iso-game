
# IsoDefend Engine - Architecture & Project Structure

## 1. Application Entry & UI Layer
The application acts as a React wrapper around a high-performance HTML5 Canvas game engine.

*   **`index.html`**: Entry point. Imports TailwindCSS and defines the Import Map.
*   **`index.tsx`**: React DOM root mount.
*   **`App.tsx`**:
    *   **Controller**: Manages the React lifecycle vs. Game Loop lifecycle.
    *   **State Bridge**: Syncs game data (Money, Wave, HP) to React state for UI rendering.
    *   **Input Handling**: Captures global hotkeys (1-4, Space, Esc) and passes them to the engine.

### UI Components (`components/`)
*   **`LoadingScreen.tsx`**: Displays the procedural audio generation progress. Handles "Start" interactions.
*   **`TopBar.tsx`**: HUD for resources, wave info, and global controls (Pause, Time Scale, Audio Mix).
*   **`BuildMenu.tsx`**:
    *   Tower selection bar.
    *   **Dynamic Icons**: Renders `<canvas>` previews of towers using `TowerFactory.drawPreview` instead of static images.
    *   **Tooltips**: Displays stats (Damage, Speed, Range).
*   **`TowerPanel.tsx`**: Contextual sidebar for upgrading/selling the selected tower. Shows visual stat bars.
*   **`GameOver.tsx`**: End-of-game overlay.

## 2. Core Engine (`classes/`)
*   **`GameEngine.ts`** ("The Hub"):
    *   **Central State**: Holds `entities`, `particles`, and `gameState`.
    *   **Game Loop**: Orchestrates `update(dt)` (Logic) and `draw()` (Render).
    *   **API**: Exposes methods for high-level actions (Build, Sell, Upgrade, Spawn).
    *   **Audio Sync**: Updates audio sequencer state based on game intensity (Combat/Boss/Idle).

### Managers (`classes/managers/`)
*   **`RenderManager.ts`**:
    *   **Pipeline**: Handles Canvas2D Context, double-buffering (`offscreenCanvas`), and screen shake.
    *   **Optimization**: Caches static terrain to an offscreen canvas.
    *   **Visuals**: Renders the Isometric Grid, animated Water tiles, Range indicators, and selection cursors.
*   **`MapManager.ts`**: Handles Grid logic (`0=Grass`, `1=Path`), buildability checks, and procedural path generation (Random Walk).
*   **`WaveManager.ts`**: Defines level design (waves 1-20+), enemy composition queues, and boss encounters.
*   **`InputManager.ts`**: Handles mouse coordinate conversion (Screen to Iso Grid), raycasting for entity selection, and click interactions.

### Factories
*   **`TowerFactory.ts`**: Static factory for creating Tower instances. Contains `drawPreview()` for rendering towers in the UI.
*   **`EnemyFactory.ts`**: Static factory for creating Enemy instances based on `EnemyVariant`.

## 3. Game Objects & Logic (`classes/`)

### Entities
*   **`BaseEntity.ts`**: Abstract parent class handling IDs and Grid positioning.
*   **`Projectile.ts`**: Logic for homing missiles and Railgun instant-hit visuals.
*   **`Particle.ts`**:
    *   **`ParticleEffect`**: Versatile particle system supporting Physics, Floating, and Target-Seeking behaviors.
    *   **Styles**: Supports `SMOKE`, `FIRE`, `SHOCKWAVE`, `FLASH`.
    *   **Subclasses**: `Debris` (rotating shards) and `Shell` (spent casings).
*   **`FloatingText.ts`**: UI entities for damage numbers and critical hits.
*   **`Tree.ts`**: Decorative environmental objects.
*   **`IK.ts`**: **Inverse Kinematics Solver**.
    *   **`IKLeg`**: Manages step logic, target interpolation, and lifting.
    *   **`solveTwoBoneIK`**: Math helper for resolving 2-joint limb positions.

### Towers (`classes/towers/`)
*   **`BaseTower.ts`**: Abstract logic for cooldowns, targeting, rotation (`rotateTowards`), and upgrade math.
*   **`BasicTower.ts`**: "Gatling". Rapid fire, rotating egg-shape model.
*   **`SniperTower.ts`**: "Railgun". Slow fire, high damage. Features visual recoil, charging mechanics, and particle venting.
*   **`PulseTower.ts`**: "Shockwave". AoE damage. Visuals include expanding rings and lightning arcs.
*   **`LaserTower.ts`**: "Prism". Continuous beam damage. Uses Gyroscopic ring visuals and heat-up particles.

### Enemies (`classes/enemies/`)
*   **`BaseEnemy.ts`**: Abstract logic for pathfinding, health, and death state machine (`isDying`, `deathTimer`).
*   **`MinionEnemies.ts`**:
    *   `Normal`: Uses IK for 6-leg insect movement.
    *   `Fast`: Flying jet unit.
    *   `Tank`: Heavy unit with tread animation logic.
    *   `Swarm`: Small, flying cluster.
*   **`SpecialEnemies.ts`**:
    *   `Healer`: Regen aura logic, medical drone visuals.
    *   `Splitter`: Spawns sub-enemies on death.
    *   `Mech`: Large bipedal walker using IK legs.
    *   `Ghost`: Digital transparency effects, evasion logic.
*   **`BossEnemies.ts`**: Barrel export for bosses.
*   **`bosses/`**:
    *   `BossMk1.ts` (The Breaker): Heavy IK walker, explosion phases.
    *   `BossMk2.ts` (Swarm Queen): 4-leg IK, flying wings, abdomen pulsing.
    *   `BossMk3.ts` (Phantom Lord): Floating reaper, soul particle effects, digital glitching.
    *   `BossFinal.ts` (World Eater): Black hole visuals, orbiting debris, supernova death sequence.

### Renderers (`classes/renderers/`)
Separates heavy canvas drawing logic from Entity classes for complex enemies.
*   **`BasicRenderers.ts`**: Drawing logic for Normal, Fast, Tank, Swarm.
*   **`SpecialRenderers.ts`**: Drawing logic for Healer, Mech, Splitter, Ghost.
*   **`BossRenderers.ts`**: Drawing logic for Bosses (used as fallbacks or components).

## 4. Hybrid Audio Subsystem (`utils/audio/`)
The engine uses a **Hybrid Audio Architecture**.

### Core
*   **`AudioCore.ts`**: Manages `AudioContext`, Master Compressor, and Mixer Buses (Music vs SFX). Handles Reverb (Convolver) and Delay sends.
*   **`Instruments.ts`**: Synthesis logic. Creates audio buffers for:
    *   Drums (Kick, Snare, Hats, Tom).
    *   Synths (808 Bass, Supersaws, Plucks, NES Triangles).
*   **`SFX.ts`**: Procedural generation for game events (Explosions, Lasers, UI Clicks, Alarms).

### System A: Tracker Music Engine (Primary)
A high-performance player for complex, pre-composed music using a compact JSON format.
*   **`Tracker.ts`**:
    *   **Decompression**: Inflates GZIP-compressed song data from Base64.
    *   **Runtime Baking**: Synthesizes specific instruments (Acid 303, Heavy Saws, 909 Drums) into buffers using `OfflineAudioContext` during the loading screen.
    *   **Engine**: Parses delta-encoded note data and manages precise scheduling.
*   **`tracks/TrackLibrary.ts`**: Registry of compressed song data strings (e.g., `TRACK_DATA_BOSS`).

### System B: Procedural Sequencer (Legacy/Fallback)
Used for Idle and Combat states until tracker data is available.
*   **`Sequencer.ts`**: 16-step sequencer logic. Handles beat scheduling and dynamic track switching.
*   **`Tracks.ts`**: Defines music data structures (Scales, Drum Patterns, Basslines) for different game states (Idle, Combat).

## 5. Utilities (`utils/`)
*   **`isoMath.ts`**: Math helpers for Isometric Projection (Grid <-> Screen conversion).
*   **`types.ts`**: TypeScript definitions, Enums (`EnemyVariant`, `EntityType`), and global constants.
