
import { EnemyVariant } from '../../types';
import { GameEngine } from '../GameEngine';

export class WaveManager {
  engine: GameEngine;
  spawnQueue: EnemyVariant[] = [];
  spawnTimer: number = 0;
  spawnDelay: number = 1000;

  constructor(engine: GameEngine) {
    this.engine = engine;
  }

  reset() {
      this.spawnQueue = [];
      this.spawnTimer = 0;
  }

  update(dt: number) {
    if (this.spawnQueue.length > 0) {
        this.spawnTimer += dt;
        if (this.spawnTimer >= this.spawnDelay) {
            this.spawnTimer = 0;
            const type = this.spawnQueue.shift();
            if (type) this.engine.spawnEnemy(type);
        }
    }
  }

  getWaveInfo(wave: number): { composition: EnemyVariant[], delay: number } {
    const queue: EnemyVariant[] = [];
    let delay = 1000;

    // --- LEVEL DESIGN 1-20 (BALANCED) ---
    switch(wave) {
        case 1: // Intro
            for(let i=0; i<6; i++) queue.push(EnemyVariant.NORMAL);
            delay = 1500;
            break;
        case 2: // Speed test
            for(let i=0; i<10; i++) queue.push(EnemyVariant.FAST);
            delay = 1000;
            break;
        case 3: // Armor test
            for(let i=0; i<5; i++) queue.push(EnemyVariant.TANK);
            delay = 1500;
            break;
        case 4: // AoE Check (Swarm)
            for(let i=0; i<20; i++) queue.push(EnemyVariant.SWARM);
            delay = 500;
            break;
        case 5: // BOSS 1: THE BREAKER
            queue.push(EnemyVariant.BOSS_MK1);
            for(let i=0; i<5; i++) queue.push(EnemyVariant.NORMAL);
            break;
        case 6: // NEW: Phalanx Intro (Shields)
            // Phalanx are slow but tough. Introduced after first boss.
            for(let i=0; i<4; i++) queue.push(EnemyVariant.PHALANX);
            delay = 2000;
            break;
        case 7: // Ghost Intro (Evasion)
            for(let i=0; i<8; i++) queue.push(EnemyVariant.GHOST);
            break;
        case 8: // Sustain Check (Healer + Tank)
            for(let i=0; i<3; i++) queue.push(EnemyVariant.HEALER);
            for(let i=0; i<5; i++) queue.push(EnemyVariant.TANK);
            break;
        case 9: // Splitter Intro
            for(let i=0; i<6; i++) queue.push(EnemyVariant.SPLITTER);
            break;
        case 10: // BOSS 2: SWARM QUEEN
            queue.push(EnemyVariant.BOSS_MK2);
            for(let i=0; i<25; i++) queue.push(EnemyVariant.SWARM);
            delay = 300;
            break;
        case 11: // Mech Intro (Heavy Armor)
            for(let i=0; i<5; i++) queue.push(EnemyVariant.MECH);
            delay = 2000;
            break;
        case 12: // Infiltration (Fast + Ghost)
            for(let i=0; i<12; i++) queue.push(EnemyVariant.FAST);
            for(let i=0; i<8; i++) queue.push(EnemyVariant.GHOST);
            delay = 800;
            break;
        case 13: // The Wall (Phalanx + Healer)
            // Healers behind Phalanxes is a classic trope. Hard to kill.
            for(let i=0; i<5; i++) queue.push(EnemyVariant.PHALANX);
            for(let i=0; i<4; i++) queue.push(EnemyVariant.HEALER);
            delay = 1500;
            break;
        case 14: // The Horde (Splitter + Swarm)
            for(let i=0; i<8; i++) queue.push(EnemyVariant.SPLITTER);
            for(let i=0; i<15; i++) queue.push(EnemyVariant.SWARM);
            break;
        case 15: // BOSS 3: PHANTOM LORD
            queue.push(EnemyVariant.BOSS_MK3);
            for(let i=0; i<10; i++) queue.push(EnemyVariant.GHOST);
            break;
        case 16: // Siege (Mech + Phalanx)
            for(let i=0; i<4; i++) queue.push(EnemyVariant.MECH);
            for(let i=0; i<4; i++) queue.push(EnemyVariant.PHALANX);
            break;
        case 17: // Regen Hell (Tank + Healer + Splitter)
            for(let i=0; i<5; i++) queue.push(EnemyVariant.TANK);
            for(let i=0; i<5; i++) queue.push(EnemyVariant.HEALER);
            for(let i=0; i<5; i++) queue.push(EnemyVariant.SPLITTER);
            break;
        case 18: // Chaos Rush (Fast + Swarm + Ghost)
            for(let i=0; i<15; i++) queue.push(EnemyVariant.FAST);
            for(let i=0; i<20; i++) queue.push(EnemyVariant.SWARM);
            for(let i=0; i<10; i++) queue.push(EnemyVariant.GHOST);
            delay = 400;
            break;
        case 19: // Elite Guard (Pre-Boss Test)
            queue.push(EnemyVariant.MECH);
            queue.push(EnemyVariant.PHALANX);
            queue.push(EnemyVariant.MECH);
            queue.push(EnemyVariant.PHALANX);
            queue.push(EnemyVariant.GHOST);
            queue.push(EnemyVariant.HEALER);
            queue.push(EnemyVariant.HEALER);
            break;
        case 20: // FINAL BOSS: WORLD EATER
            queue.push(EnemyVariant.BOSS_FINAL);
            break;
        default: // Endless mode
            const count = 10 + (wave - 20) * 2;
            for(let i=0; i<count; i++) {
                const r = Math.random();
                if (r > 0.9) queue.push(EnemyVariant.PHALANX);
                else if (r > 0.8) queue.push(EnemyVariant.MECH);
                else if (r > 0.7) queue.push(EnemyVariant.HEALER);
                else if (r > 0.6) queue.push(EnemyVariant.SPLITTER);
                else queue.push(EnemyVariant.NORMAL);
            }
            delay = Math.max(200, 800 - (wave * 20));
            break;
    }
    return { composition: queue, delay };
  }

  getNextWavePreview(currentWave: number): { type: string, count: number } {
      const nextWave = currentWave + 1;
      const info = this.getWaveInfo(nextWave);
      if (info.composition.length === 0) return { type: EnemyVariant.NORMAL, count: 0 };
      
      const count = info.composition.length;
      
      // Check for boss
      const boss = info.composition.find(e => e.startsWith('BOSS'));
      if (boss) return { type: 'BOSS', count: 1 };

      // Return majority type or first type
      return { type: info.composition[0], count };
  }

  startWave(currentWave: number) {
    const wave = currentWave + 1;
    this.engine.audio.playUpgrade(); 
    
    const info = this.getWaveInfo(wave);
    
    this.spawnQueue = info.composition;
    this.spawnDelay = info.delay;
    this.spawnTimer = 0;

    return wave;
  }
}
