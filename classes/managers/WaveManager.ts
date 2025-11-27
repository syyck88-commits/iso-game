
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

    // --- LEVEL DESIGN 1-20 ---
    switch(wave) {
        case 1: // Intro
            for(let i=0; i<5; i++) queue.push(EnemyVariant.NORMAL);
            delay = 1500;
            break;
        case 2: // Speed test
            for(let i=0; i<8; i++) queue.push(EnemyVariant.FAST);
            delay = 1200;
            break;
        case 3: // Armor test
            for(let i=0; i<4; i++) queue.push(EnemyVariant.TANK);
            for(let i=0; i<4; i++) queue.push(EnemyVariant.NORMAL);
            break;
        case 4: // Swarm intro
            for(let i=0; i<15; i++) queue.push(EnemyVariant.SWARM);
            delay = 600;
            break;
        case 5: // BOSS 1: THE BREAKER
            queue.push(EnemyVariant.BOSS_MK1);
            for(let i=0; i<5; i++) queue.push(EnemyVariant.NORMAL);
            break;
        case 6: // Regeneration intro
            for(let i=0; i<3; i++) queue.push(EnemyVariant.HEALER);
            for(let i=0; i<6; i++) queue.push(EnemyVariant.TANK);
            break;
        case 7: // Ghost intro
            for(let i=0; i<8; i++) queue.push(EnemyVariant.GHOST);
            break;
        case 8: // Splitter intro
            for(let i=0; i<5; i++) queue.push(EnemyVariant.SPLITTER);
            delay = 2000; // Give time to kill them
            break;
        case 9: // Mech + Healer combo
            for(let i=0; i<4; i++) queue.push(EnemyVariant.MECH);
            for(let i=0; i<4; i++) queue.push(EnemyVariant.HEALER);
            break;
        case 10: // BOSS 2: SWARM QUEEN
            queue.push(EnemyVariant.BOSS_MK2);
            for(let i=0; i<20; i++) queue.push(EnemyVariant.SWARM);
            delay = 400;
            break;
        case 11: // Fast Regeneration
            for(let i=0; i<10; i++) queue.push(EnemyVariant.FAST);
            for(let i=0; i<5; i++) queue.push(EnemyVariant.HEALER);
            break;
        case 12: // Invisible Tank
            for(let i=0; i<6; i++) queue.push(EnemyVariant.GHOST);
            for(let i=0; i<4; i++) queue.push(EnemyVariant.TANK);
            break;
        case 13: // The Blob
            for(let i=0; i<10; i++) queue.push(EnemyVariant.SPLITTER);
            break;
        case 14: // Heavy Assault
            for(let i=0; i<8; i++) queue.push(EnemyVariant.MECH);
            break;
        case 15: // BOSS 3: PHANTOM LORD
            queue.push(EnemyVariant.BOSS_MK3);
            for(let i=0; i<10; i++) queue.push(EnemyVariant.GHOST);
            break;
        case 16: // Chaos I
            for(let i=0; i<30; i++) queue.push(EnemyVariant.SWARM);
            for(let i=0; i<5; i++) queue.push(EnemyVariant.SPLITTER);
            delay = 300;
            break;
        case 17: // Chaos II
            for(let i=0; i<5; i++) queue.push(EnemyVariant.HEALER);
            for(let i=0; i<5; i++) queue.push(EnemyVariant.MECH);
            for(let i=0; i<5; i++) queue.push(EnemyVariant.TANK);
            break;
        case 18: // Chaos III
            for(let i=0; i<10; i++) queue.push(EnemyVariant.FAST);
            for(let i=0; i<10; i++) queue.push(EnemyVariant.GHOST);
            break;
        case 19: // Pre-Boss
            for(let i=0; i<5; i++) queue.push(EnemyVariant.TANK);
            for(let i=0; i<5; i++) queue.push(EnemyVariant.MECH);
            for(let i=0; i<5; i++) queue.push(EnemyVariant.SPLITTER);
            break;
        case 20: // FINAL BOSS: WORLD EATER
            queue.push(EnemyVariant.BOSS_FINAL);
            break;
        default: // Endless mode
            const count = 10 + (wave - 20) * 2;
            for(let i=0; i<count; i++) {
                const r = Math.random();
                if (r > 0.9) queue.push(EnemyVariant.MECH);
                else if (r > 0.8) queue.push(EnemyVariant.HEALER);
                else if (r > 0.7) queue.push(EnemyVariant.SPLITTER);
                else queue.push(EnemyVariant.NORMAL);
            }
            delay = Math.max(200, 800 - (wave * 20));
            break;
    }
    return { composition: queue, delay };
  }

  getNextWavePreview(currentWave: number): EnemyVariant | 'BOSS' {
      const nextWave = currentWave + 1;
      const info = this.getWaveInfo(nextWave);
      if (info.composition.length === 0) return EnemyVariant.NORMAL;
      
      // Check for boss
      const boss = info.composition.find(e => e.startsWith('BOSS'));
      if (boss) return 'BOSS';

      // Return majority type or first type
      return info.composition[0];
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
