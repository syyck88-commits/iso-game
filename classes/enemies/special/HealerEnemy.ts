
import { EnemyVariant, Vector2, ParticleBehavior } from '../../../types';
import { BaseEnemy } from '../BaseEnemy';
import { GameEngine } from '../../GameEngine';
import { ParticleEffect, Debris } from '../../Particle';

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
        const time = Date.now() / 200 + this.wobbleOffset;
        const isDying = this.isDying;

        // VISUAL UPDATE: Advanced Medical Drone
        // If dying, the hover fails and it shakes
        const hover = isDying ? Math.sin(time * 30) * 2 : Math.sin(time * 1.5) * 4;
        const floatY = pos.y - 25 + hover;
        
        // 1. Rotating Shield Segments
        // If dying, shields are gone (exploded off)
        if (!isDying) {
            ctx.save();
            ctx.translate(pos.x, floatY);
            ctx.rotate(time * 0.8);
            
            ctx.fillStyle = 'rgba(74, 222, 128, 0.4)';
            ctx.strokeStyle = '#4ade80';
            ctx.lineWidth = 1;
            
            for(let i=0; i<3; i++) {
                ctx.rotate((Math.PI * 2) / 3);
                ctx.beginPath();
                ctx.arc(14, 0, 4, 0, Math.PI*2);
                ctx.fill();
                ctx.stroke();
                
                // Energy tether to center
                ctx.beginPath();
                ctx.moveTo(10, 0);
                ctx.lineTo(4, 0);
                ctx.stroke();
            }
            ctx.restore();
        }

        // 2. Main Body (White Capsule)
        // Critical state flashes red/white
        if (isDying && Math.floor(time * 10) % 2 === 0) {
            ctx.fillStyle = '#fee2e2'; // Reddish white
        } else {
            ctx.fillStyle = '#f1f5f9'; // Slate 100
        }
        
        ctx.beginPath();
        ctx.ellipse(pos.x, floatY, 8, 10, 0, 0, Math.PI*2);
        ctx.fill();
        
        // 3. Tech Details
        ctx.fillStyle = '#0f172a'; // Dark slate
        ctx.fillRect(pos.x - 8, floatY - 2, 16, 4); // Belt
        
        // 4. Holographic Cross Projection
        if (!isDying) {
            ctx.save();
            ctx.translate(pos.x, floatY);
            const pulse = (Math.sin(time * 5) + 1) * 0.5; // 0 to 1
            const size = 1 + pulse * 0.2;
            ctx.scale(size, size);
            
            // Glow
            ctx.shadowColor = '#22c55e';
            ctx.shadowBlur = 10;
            
            ctx.fillStyle = '#22c55e';
            ctx.beginPath();
            ctx.rect(-3, -8, 6, 16);
            ctx.rect(-8, -3, 16, 6);
            ctx.fill();
            
            ctx.shadowBlur = 0;
            ctx.restore();
        } else {
            // Dying: Broken cross, flickering off
            if (Math.random() > 0.5) {
                 ctx.fillStyle = '#166534'; // Dark green/broken
                 ctx.fillRect(pos.x - 3, floatY - 8, 6, 16);
            }
        }
        
        // 5. Engine Thruster (Bottom)
        // Dying: Sputtering
        if (!isDying || Math.random() > 0.5) {
            ctx.fillStyle = isDying ? '#ef4444' : '#60a5fa'; // Red if failing
            ctx.globalAlpha = 0.8;
            ctx.beginPath();
            ctx.moveTo(pos.x - 4, floatY + 8);
            ctx.lineTo(pos.x + 4, floatY + 8);
            ctx.lineTo(pos.x, floatY + 14 + (Math.random() * 3));
            ctx.fill();
            ctx.globalAlpha = 1.0;
        }
    }
}
