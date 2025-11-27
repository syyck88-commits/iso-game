
# IsoDefend Engine - Project Structure & Architecture

## 1. Core Application Entry
*   **`index.html`**: Entry point. Sets viewport and imports React via importmap.
*   **`index.tsx`**: Mounts the React root.
*   **`App.tsx`**: 
    *   Main React Component.
    *   Orchestrates the Game State and Sub-components.
    *   Initializes the `GameEngine`.

### UI Components (`components/`)
*   **`LoadingScreen.tsx`**: Handles initial audio generation loading bars and logs.
*   **`TopBar.tsx`**: HUD showing Money, Health, Wave, and Game Controls (Pause, Fast Fwd).
*   **`BuildMenu.tsx`**: Bottom bar for selecting towers and starting waves. Handles Tooltips.
*   **`TowerPanel.tsx`**: Side panel for upgrading and selling selected towers.
*   **`GameOver.tsx`**: End game screen overlay.

## 2. Game Engine Core (`classes/`)
*   **`GameEngine.ts`**: 
    *   **The Hub**: Central class instance. Holds references to all Managers and Entities.
    *   **Loop**: Manages `update()` (logic) and `draw()` (render) cycles.
*   **`TowerFactory.ts`**: Static factory to instantiate towers by enum type and render ghost previews.

### Managers (`classes/managers/`)
*   **`RenderManager.ts`**: Handles Canvas 2D context, offscreen caching, and coordinate conversion.
*   **`MapManager.ts`**: Procedural path generation and grid management.
*   **`WaveManager.ts`**: Enemy spawn logic and level design.
*   **`InputManager.ts`**: Mouse handling and raycasting.

## 3. Entities & Game Objects (`classes/`)
*   **`BaseEntity.ts`**: Abstract base class.
*   **`Entities.ts`**: Barrel file for exports.

### Towers (`classes/towers/`)
*   **`BaseTower.ts`**: Abstract base logic for all towers.
*   **`BasicTower.ts`**: "Gatling Turret" - Rapid fire, minigun visuals.
*   **`SniperTower.ts`**: "Railgun" - High range/damage, slow fire.
*   **`PulseTower.ts`**: "Shockwave" - AoE damage.
*   **`LaserTower.ts`**: "Prism" - Continuous beam damage (Boss killer).

### Enemies (`classes/enemies/`)
*   **`BaseEnemy.ts`**: Abstract base.
*   **`EnemyFactory.ts`**: Static Factory.
*   **`MinionEnemies.ts`**: Normal, Fast, Tank, Swarm.
*   **`SpecialEnemies.ts`**: Healer, Splitter, Mech, Ghost.
*   **`BossEnemy.ts`**: Base Boss class.
*   **`bosses/*`**: Specific Boss implementations (Mk1, Mk2, Mk3, Final).

### Effects
*   **`Projectile.ts`**: Homing projectiles.
*   **`Particle.ts`**: Visual effects (Smoke, Fire, Debris, Shells).
*   **`FloatingText.ts`**: Damage numbers.
*   **`Tree.ts`**: Decor.
*   **`IK.ts`**: Inverse Kinematics solver for procedural animation (Enemy legs).

## 4. Audio Subsystem (`utils/audio/`)
*   **`AudioCore.ts`**: Web Audio API wrapper + Offline Rendering.
*   **`Instruments.ts`**: Synthesizers.
*   **`SFX.ts`**: Sound effects.
*   **`Sequencer.ts`**: Music logic.
*   **`Tracks.ts`**: Music data.

## 5. Utilities (`utils/`)
*   **`isoMath.ts`**: Isometric coordinate conversion.
*   **`types.ts`**: Interfaces and Enums.
