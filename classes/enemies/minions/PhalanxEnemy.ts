
import { EnemyVariant, Vector2, ParticleBehavior, DamageType } from '../../../types';
import { BaseEnemy } from '../BaseEnemy';
import { GameEngine } from '../../GameEngine';
import { ParticleEffect, Debris } from '../../Particle';

export class PhalanxEnemy extends BaseEnemy {
    // State
    shieldAngle: number = 0;
    modeTimer: number = 0;
    isLocked: boolean = false;
    
    // Death Physics (3 Shields)
    shieldDebris: { pos: Vector2, vel: Vector2, rot: number, rotVel: number }[] = [];

    constructor(path: Vector2[], wave: number) {
        super(path, wave, EnemyVariant.PHALANX);
        const baseHp = 30 + (wave * 10);
        this.maxHealth = baseHp * 3.5; 
        this.health = this.maxHealth;
        this.speed = (0.03 + (Math.min(20, wave) * 0.001)) * 0.5; // Slow base speed
        this.moneyValue = 45;
        this.zHeight = 25; // Floating
    }

    // Advanced Armor Logic
    takeDamage(amount: number, type: DamageType, engine: GameEngine): number {
        let multiplier = 1.0;
        let label = '';
        let isResist = false;

        // "SHIELD WALL PROTOCOL" Logic
        if (this.isLocked) {
            // IMMUNE to EVERYTHING when locked
            multiplier = 0;
            label = 'IMMUNE';
            isResist = true;
            
            // Deflection sparks
            if (Math.random() > 0.3) {
                const pos = engine.getScreenPos(this.gridPos.x, this.gridPos.y);
                const p = new ParticleEffect(
                    {x: pos.x + (Math.random()-0.5)*10, y: pos.y - 10}, 
                    this.zHeight, 
                    '#fff', 
                    {x:(Math.random()-0.5)*5, y:-2}, 
                    0.3, 
                    ParticleBehavior.PHYSICS,
                    'FLASH'
                );
                p.size = 5;
                engine.particles.push(p);
            }
        } else {
            // Orbit Mode: Standard Tankiness
            if (type === DamageType.KINETIC) {
                multiplier = 0.6; // Innate Armor
                label = 'ARMOR';
                isResist = true;
            }
        }

        const finalDamage = amount * multiplier;
        this.health -= finalDamage;

        // Feedback
        if (label && Math.random() > 0.5) {
             const color = isResist ? '#94a3b8' : '#fff';
             engine.addFloatingText(label, this.gridPos, color, multiplier > 1.0);
        } else if (Math.random() > 0.7 && finalDamage > 0) {
             engine.addFloatingText(`${Math.floor(finalDamage)}`, this.gridPos, '#fff');
        }

        return finalDamage;
    }

    getEnemyInfo() {
        return {
            description: "Tetra-Guardian. Cycles 'Shield Lock' mode which repairs armor. When locked, COMPLETELY IMMUNE to all damage.",
            weakness: [DamageType.EXPLOSIVE, DamageType.ENERGY],
            resistance: [DamageType.KINETIC, DamageType.PIERCING]
        };
    }

    onUpdate(dt: number, engine: GameEngine) {
        this.modeTimer += dt;

        // Cycle: 1.5s Orbit -> 2.0s Lock
        if (!this.isLocked) {
            // Orbit Mode
            this.shieldAngle += dt * 0.002;
            this.slowFactor = 1.0; // Normal speed
            
            // Triggers more often now (1.5s instead of 3s)
            if (this.modeTimer > 1500) {
                this.enterLockMode(engine);
            }
        } else {
            // Lock Mode
            // Shield angle is fixed in draw
            this.slowFactor = 0.1; // Almost stop moving
            
            if (this.modeTimer > 2000) {
                this.exitLockMode(engine);
            }
        }
        
        // Apply speed modifier (BaseEnemy handles the multiply)
        if (this.isLocked) {
            this.applySlow(100); // Hack to force slow update
        }
    }

    enterLockMode(engine: GameEngine) {
        this.isLocked = true;
        this.modeTimer = 0;
        
        // HEALING MECHANIC: Restore 50% Max HP
        const healAmount = Math.floor(this.maxHealth * 0.5);
        if (this.health < this.maxHealth) {
            this.health = Math.min(this.maxHealth, this.health + healAmount);
            engine.addFloatingText(`REPAIR +${healAmount}`, this.gridPos, '#4ade80', true);
            
            // Healing Particles
            for(let i=0; i<8; i++) {
                const p = new ParticleEffect(
                    engine.getScreenPos(this.gridPos.x, this.gridPos.y),
                    this.zHeight,
                    '#4ade80',
                    {x: (Math.random()-0.5)*3, y: -Math.random()*2},
                    0.6,
                    ParticleBehavior.FLOAT
                );
                p.size = 2;
                engine.particles.push(p);
            }
        }

        engine.audio.playImpactMetal(); // Clang sound
        // Visual impact ring
        const pos = engine.getScreenPos(this.gridPos.x, this.gridPos.y);
        const ring = new ParticleEffect(pos, this.zHeight, '#22d3ee', {x:0,y:0}, 0.5, ParticleBehavior.FLOAT, 'SHOCKWAVE');
        ring.size = 5;
        engine.particles.push(ring);
    }

    exitLockMode(engine: GameEngine) {
        this.isLocked = false;
        this.modeTimer = 0;
        engine.audio.playCancel(); // Power down sound
    }

    onDeathStart(engine: GameEngine) {
        super.onDeathStart(engine);
        engine.audio.playExplosion('large');
        
        // Init 3 shields for debris physics
        for(let i=0; i<3; i++) {
            this.shieldDebris.push({
                pos: { x: 0, y: 0 }, // Relative to center
                vel: { 
                    x: (Math.random() - 0.5) * 8, 
                    y: -Math.random() * 5 
                },
                rot: (Math.PI * 2 * i) / 3,
                rotVel: (Math.random() - 0.5) * 0.5
            });
        }
    }

    onDeathUpdate(dt: number, engine: GameEngine) {
        this.deathTimer += dt;
        const tick = dt / 16.0;

        // Phase 1: Core Implosion (0-500ms)
        if (this.deathTimer < 500) {
            this.scale = 1.0 - (this.deathTimer / 500); // Core shrinks
            this.zHeight += 0.5 * tick; // Rises slightly before drop
            
            // Sucking particles
            if (Math.random() > 0.5) {
                const pos = engine.getScreenPos(this.gridPos.x, this.gridPos.y);
                const angle = Math.random() * Math.PI * 2;
                const dist = 30;
                const p = new ParticleEffect(
                    {x: pos.x + Math.cos(angle)*dist, y: pos.y - this.zHeight + Math.sin(angle)*dist},
                    0, '#22d3ee',
                    {x: -Math.cos(angle)*3, y: -Math.sin(angle)*3},
                    0.3, ParticleBehavior.FLOAT
                );
                p.size = 2;
                engine.particles.push(p);
            }
        } 
        // Phase 2: Shield Crash (500ms+)
        else {
            this.scale = 0; // Core gone
            
            // Animate Debris
            this.shieldDebris.forEach(deb => {
                deb.pos.x += deb.vel.x * tick;
                deb.pos.y += deb.vel.y * tick;
                deb.rot += deb.rotVel * tick;
                
                deb.vel.y += 0.4 * tick; // Heavy Gravity
                
                // Floor collision (approximate relative Y)
                if (deb.pos.y > this.zHeight) {
                    deb.pos.y = this.zHeight;
                    deb.vel.y *= -0.3; // Dampened bounce
                    deb.vel.x *= 0.8;  // Friction
                    deb.rotVel *= 0.8;
                }
            });

            if (this.deathTimer > 2500) {
                engine.removeEntity(this.id);
            }
        }
    }

    drawModel(ctx: CanvasRenderingContext2D, pos: Vector2) {
        const floatY = pos.y - this.zHeight + Math.sin(Date.now() / 400) * 4;
        
        ctx.save();
        ctx.translate(pos.x, floatY);

        // -- Sub-draw functions --
        const drawCore = () => {
            if (this.scale <= 0.01) return;
            ctx.save();
            ctx.scale(this.scale, this.scale);
            
            // Core Glow
            const pulse = 10 + Math.sin(Date.now() / 100) * 5;
            ctx.shadowColor = '#22d3ee';
            ctx.shadowBlur = pulse;
            
            // Octahedron Core
            ctx.fillStyle = '#0f172a'; // Black center
            ctx.beginPath();
            ctx.moveTo(0, -15); ctx.lineTo(10, 0); ctx.lineTo(0, 15); ctx.lineTo(-10, 0);
            ctx.closePath();
            ctx.fill();
            
            // Inner Light
            ctx.fillStyle = this.isLocked ? '#f0f9ff' : '#06b6d4'; // White when locked
            ctx.beginPath();
            ctx.moveTo(0, -8); ctx.lineTo(5, 0); ctx.lineTo(0, 8); ctx.lineTo(-5, 0);
            ctx.fill();
            
            ctx.shadowBlur = 0;
            ctx.restore();
        };

        const drawShield = (i: number, angle: number) => {
            ctx.save();
            const plateColor = this.isLocked ? '#0891b2' : '#1e293b'; // Glow vs Dark
            const borderColor = this.isLocked ? '#67e8f9' : '#334155';

            if (this.isLocked) {
                // LOCKED FORMATION: Chevron wall in front
                if (i === 0) ctx.translate(0, 5); // Center low
                if (i === 1) { ctx.translate(-18, -5); ctx.rotate(-0.2); }
                if (i === 2) { ctx.translate(18, -5); ctx.rotate(0.2); }
                
                // Shake if locked (strain)
                ctx.translate((Math.random()-0.5)*2, (Math.random()-0.5)*2);
            } else {
                // ORBIT FORMATION
                const radius = 25;
                ctx.translate(Math.cos(angle) * radius, Math.sin(angle) * radius * 0.3); // Elliptical orbit
            }

            this.drawShieldPlate(ctx, plateColor, borderColor);
            ctx.restore();
        };

        // --- DRAW SEQUENCE ---
        
        if (this.isDying && this.deathTimer > 500) {
            // Draw Crashed Debris
            this.shieldDebris.forEach(deb => {
                ctx.save();
                ctx.translate(deb.pos.x, deb.pos.y); // Relative to center
                ctx.rotate(deb.rot);
                this.drawShieldPlate(ctx, '#334155'); // Dark dead color
                ctx.restore();
            });
        } else {
            if (this.isLocked) {
                // Locked: Core is behind the shield wall
                drawCore();
                for (let i = 0; i < 3; i++) drawShield(i, 0);
            } else {
                // Orbit: Depth sorting
                // Calculate shield depth
                const shields = [0, 1, 2].map(i => {
                    const angle = this.shieldAngle + (Math.PI * 2 * i) / 3;
                    // Y > 0 is front, Y < 0 is back
                    const y = Math.sin(angle); 
                    return { i, angle, y };
                });

                // Sort Back to Front
                shields.sort((a, b) => a.y - b.y);

                // 1. Draw Back Shields (Negative Y)
                shields.filter(s => s.y < 0).forEach(s => drawShield(s.i, s.angle));
                
                // 2. Draw Core (Middle)
                drawCore();
                
                // 3. Draw Front Shields (Positive Y)
                shields.filter(s => s.y >= 0).forEach(s => drawShield(s.i, s.angle));
            }
        }

        ctx.restore();
    }

    drawShieldPlate(ctx: CanvasRenderingContext2D, fill: string, stroke: string = '') {
        // Heavy Trapezoid shape
        ctx.fillStyle = fill;
        ctx.beginPath();
        ctx.moveTo(-8, -15);
        ctx.lineTo(8, -15);
        ctx.lineTo(12, 15);
        ctx.lineTo(-12, 15);
        ctx.closePath();
        ctx.fill();
        
        if (stroke) {
            ctx.strokeStyle = stroke;
            ctx.lineWidth = 2;
            ctx.stroke();
        }
        
        // Tech detail
        ctx.fillStyle = 'rgba(0,0,0,0.3)';
        ctx.fillRect(-4, -5, 8, 10);
    }
}
