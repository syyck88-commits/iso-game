
import { EnemyVariant, Vector2, ParticleBehavior } from '../../../types';
import { BaseEnemy } from '../BaseEnemy';
import { GameEngine } from '../../GameEngine';
import { ParticleEffect, Debris } from '../../Particle';
import { drawHealer } from '../../renderers/enemies/SpecialRenderers';

export class HealerEnemy extends BaseEnemy {
    regenTimer: number = 0;

    constructor(path: Vector2[], wave: number) {
        super(path, wave, EnemyVariant.HEALER);
        const baseHp = 30 + (wave * 10);
        this.maxHealth = baseHp * 1.5;
        this.health = this.maxHealth;
        this.speed = (0.03 + (Math.min(20, wave) * 0.001)) * 0.8;
        this.moneyValue = 30;
        this.zHeight = 25;
    }

    onUpdate(dt: number, engine: GameEngine) {
        this.regenTimer += dt;
        if (this.regenTimer > 60) {
            this.regenTimer = 0;
            if (this.health < this.maxHealth) {
                this.health = Math.min(this.maxHealth, this.health + this.maxHealth * 0.05);
            }
            engine.entities.forEach(e => {
                if (e instanceof BaseEnemy && e !== this && e.health > 0 && e.health < e.maxHealth) {
                    const dx = e.gridPos.x - this.gridPos.x;
                    const dy = e.gridPos.y - this.gridPos.y;
                    if (dx*dx + dy*dy < 9) {
                        e.health = Math.min(e.maxHealth, e.health + 10);
                        const start = engine.getScreenPos(this.gridPos.x, this.gridPos.y);
                        const end = engine.getScreenPos(e.gridPos.x, e.gridPos.y);
                        engine.spawnParticle(e.gridPos, e.zHeight + 10, '#4ade80');
                    }
                }
            });
        }
    }

    onDeathStart(engine: GameEngine) {
        super.onDeathStart(engine);
        // Play glitch sound
        engine.audio.playCancel();
        
        const pos = engine.getScreenPos(this.gridPos.x, this.gridPos.y);
        
        // Spawn 3 broken shield parts exploding outwards
        for(let i=0; i<3; i++) {
            const angle = (Math.PI * 2 * i) / 3;
            const vel = { x: Math.cos(angle)*4, y: Math.sin(angle)*4 - 2 };
            // Using green debris to represent the energy shields
            engine.particles.push(new Debris(pos, this.zHeight, '#4ade80', vel, 6, 8));
        }
        
        this.scale = 1.0;
        this.opacity = 1.0;
    }

    onDeathUpdate(dt: number, engine: GameEngine) {
        this.deathTimer += dt;
        
        // Critical Malfunction Phase (0 - 800ms)
        if (this.deathTimer < 800) {
             this.rotation += dt * 0.02; // Spin out of control
             this.zHeight -= dt * 0.01;  // Fall slowly
             
             // Random Shake
             this.gridPos.x += (Math.random() - 0.5) * 0.05;
             this.gridPos.y += (Math.random() - 0.5) * 0.05;

             // Leak energy particles
             if (this.deathTimer % 50 < 16) {
                 const pos = engine.getScreenPos(this.gridPos.x, this.gridPos.y);
                 const p = new ParticleEffect(
                     pos, 
                     this.zHeight, 
                     '#22c55e', 
                     {x: (Math.random()-0.5)*2, y: 2}, // Drip down
                     0.5, 
                     ParticleBehavior.PHYSICS
                 );
                 engine.particles.push(p);
             }
        } 
        // Explosion Phase
        else {
             const pos = engine.getScreenPos(this.gridPos.x, this.gridPos.y);
             
             // Flash
             const p = new ParticleEffect(pos, this.zHeight, '#fff', {x:0,y:0}, 0.2, ParticleBehavior.FLOAT);
             p.size = 30;
             engine.particles.push(p);
             
             // Shockwave
             const sw = new ParticleEffect(pos, this.zHeight, '#22c55e', {x:0,y:0}, 0.5, ParticleBehavior.FLOAT, 'SHOCKWAVE');
             sw.size = 10;
             engine.particles.push(sw);

             engine.spawnExplosion(this.gridPos, '#16a34a');
             this.opacity = 0;
        }
    }

    drawModel(ctx: CanvasRenderingContext2D, pos: Vector2) {
        drawHealer(ctx, pos, Date.now() / 200 + this.wobbleOffset, this.isDying);
    }
}
