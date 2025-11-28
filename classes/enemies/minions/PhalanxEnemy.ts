
import { EnemyVariant, Vector2, ParticleBehavior, DamageType } from '../../../types';
import { BaseEnemy } from '../BaseEnemy';
import { GameEngine } from '../../GameEngine';
import { ParticleEffect, Debris } from '../../Particle';

export class PhalanxEnemy extends BaseEnemy {
    shieldAngle: number = 0;
    corePulse: number = 0;
    
    // Death physics for shields
    shield1Pos: Vector2 = { x: 0, y: 0 };
    shield2Pos: Vector2 = { x: 0, y: 0 };
    shield1Vel: Vector2 = { x: 0, y: 0 };
    shield2Vel: Vector2 = { x: 0, y: 0 };

    constructor(path: Vector2[], wave: number) {
        super(path, wave, EnemyVariant.PHALANX);
        const baseHp = 30 + (wave * 10);
        this.maxHealth = baseHp * 4.0; // Very tanky (High HP)
        this.health = this.maxHealth;
        this.speed = (0.03 + (Math.min(20, wave) * 0.001)) * 0.45; // Very Slow
        this.moneyValue = 50;
        this.zHeight = 20;
    }

    // Custom damage logic to simulate armor plating
    takeDamage(amount: number, type: DamageType, engine: GameEngine): number {
        // Phalanx has reactive plating. 
        // Reduces Kinetic/Piercing by 60%
        // Takes extra from Energy/Explosive
        let multiplier = 1.0;
        let label = '';
        
        // Armor Check
        if (type === DamageType.KINETIC || type === DamageType.PIERCING) {
            multiplier = 0.4; // Heavy Armor
            label = "BLOCKED";
            
            // Visual deflection sparks
            if (Math.random() > 0.5) {
                const pos = engine.getScreenPos(this.gridPos.x, this.gridPos.y);
                const p = new ParticleEffect(pos, this.zHeight + 10, '#22d3ee', {x:(Math.random()-0.5)*4, y:-2}, 0.3, ParticleBehavior.PHYSICS);
                p.size = 2;
                engine.particles.push(p);
            }
        }
        else if (type === DamageType.ENERGY) {
            multiplier = 1.5; // Shields melt
            label = "MELT";
        }
        else if (type === DamageType.EXPLOSIVE) {
            multiplier = 1.2; // Structure cracks
            label = "CRACK";
        }

        const finalDamage = amount * multiplier;
        this.health -= finalDamage;

        // Custom Floating Text for resistance feedback
        if (multiplier < 0.8 || multiplier > 1.1) {
             const color = multiplier < 1.0 ? '#94a3b8' : '#22d3ee';
             const text = label + ` ${Math.floor(finalDamage)}`;
             // Only show sometimes to avoid clutter
             if (Math.random() > 0.6) {
                 engine.addFloatingText(text, this.gridPos, color, multiplier > 1.0);
             }
        } else {
             // Standard damage text occasionally
             if (Math.random() > 0.8) {
                 engine.addFloatingText(`${Math.floor(finalDamage)}`, this.gridPos, '#fff');
             }
        }

        return finalDamage;
    }

    getEnemyInfo() {
        return {
            description: "Siege unit. High armor reduces Kinetic damage. Weak to Energy.",
            weakness: [DamageType.ENERGY, DamageType.EXPLOSIVE],
            resistance: [DamageType.KINETIC, DamageType.PIERCING]
        };
    }

    onUpdate(dt: number, engine: GameEngine) {
        this.shieldAngle += dt * 0.001;
        this.corePulse += dt * 0.005;
        
        // Heavy Hum Sound (simulated by particles)
        if (Math.random() > 0.98) {
             const pos = engine.getScreenPos(this.gridPos.x, this.gridPos.y);
             const p = new ParticleEffect(
                 {x: pos.x, y: pos.y + 10}, // Ground
                 0, 
                 'rgba(34, 211, 238, 0.2)', 
                 {x: 0, y: -0.5}, 
                 1.0, 
                 ParticleBehavior.FLOAT
             );
             p.size = 10;
             engine.particles.push(p);
        }
    }

    onDeathStart(engine: GameEngine) {
        super.onDeathStart(engine);
        const pos = engine.getScreenPos(this.gridPos.x, this.gridPos.y);
        
        // Initial crack sound
        engine.audio.playExplosion('medium');
        
        // Setup shield fall physics
        this.shield1Pos = { x: 0, y: 0 };
        this.shield2Pos = { x: 0, y: 0 };
        
        // Shield 1 flies left
        this.shield1Vel = { x: -2 - Math.random(), y: -2 };
        // Shield 2 flies right
        this.shield2Vel = { x: 2 + Math.random(), y: -2 };
    }

    onDeathUpdate(dt: number, engine: GameEngine) {
        const tick = dt / 16.0;
        
        this.deathTimer += dt;

        // Animate Shields falling off
        this.shield1Pos.x += this.shield1Vel.x * tick;
        this.shield1Pos.y += this.shield1Vel.y * tick;
        this.shield1Vel.y += 0.2 * tick; // Gravity
        
        this.shield2Pos.x += this.shield2Vel.x * tick;
        this.shield2Pos.y += this.shield2Vel.y * tick;
        this.shield2Vel.y += 0.2 * tick; // Gravity

        // Core implosion sequence
        if (this.deathTimer < 1000) {
            this.scale = 1.0 - (this.deathTimer / 1000) * 0.5; // Shrink
            // Violent shake
            this.gridPos.x += (Math.random()-0.5) * 0.1;
            this.gridPos.y += (Math.random()-0.5) * 0.1;
            
            // Critical mass sparks
            if (Math.random() > 0.5) {
                 const pos = engine.getScreenPos(this.gridPos.x, this.gridPos.y);
                 const p = new ParticleEffect(pos, this.zHeight, '#22d3ee', {x:0,y:0}, 0.2, ParticleBehavior.FLOAT, 'FLASH');
                 p.size = 20;
                 engine.particles.push(p);
            }
        } else {
            // Final Pop
            const pos = engine.getScreenPos(this.gridPos.x, this.gridPos.y);
            engine.spawnExplosion(this.gridPos, '#06b6d4');
            
            // Glass Shards
            for(let i=0; i<10; i++) {
                const vel = { x: (Math.random()-0.5)*8, y: (Math.random()-0.5)*8 };
                engine.particles.push(new Debris(pos, this.zHeight, '#22d3ee', vel, 6, 6));
            }
            
            this.opacity = 0;
            engine.removeEntity(this.id);
        }
    }

    drawModel(ctx: CanvasRenderingContext2D, pos: Vector2) {
        const floatY = pos.y - this.zHeight + Math.sin(this.corePulse * 2) * 3;
        const shieldState = this.health / this.maxHealth;
        const shieldsActive = shieldState > 0;
        
        ctx.save();
        ctx.translate(pos.x, floatY);
        
        if (this.isDying) {
            const shake = Math.random() * 4;
            ctx.translate(shake, shake);
            ctx.scale(this.scale, this.scale);
        }

        // --- BACK SHIELD ---
        if (!this.isDying && shieldsActive) {
            ctx.save();
            ctx.rotate(this.shieldAngle);
            ctx.fillStyle = 'rgba(8, 145, 178, 0.6)'; // Cyan 600 transparent
            ctx.strokeStyle = '#22d3ee';
            ctx.lineWidth = 1;
            
            // Draw a curved plate
            ctx.beginPath();
            ctx.arc(0, 0, 22, 0, Math.PI, false); // Bottom half
            ctx.lineTo(22, -10);
            ctx.arc(0, -10, 22, 0, Math.PI, true); // Top inner curve
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
            ctx.restore();
        } else if (this.isDying) {
            // Fallen Shield 1
            ctx.save();
            ctx.translate(this.shield1Pos.x, this.shield1Pos.y);
            ctx.rotate(this.shieldAngle + 1);
            ctx.fillStyle = '#155e75';
            ctx.beginPath(); ctx.arc(0, 0, 15, 0, Math.PI); ctx.fill();
            ctx.restore();
        }

        // --- CORE (Octahedron) ---
        // Inner Glow
        const pulse = 10 + Math.sin(this.corePulse * 5) * 5;
        ctx.shadowColor = '#06b6d4';
        ctx.shadowBlur = pulse;
        
        const coreColor = this.health < this.maxHealth * 0.3 ? '#ef4444' : '#1e293b'; // Red if low HP
        ctx.fillStyle = coreColor;
        
        ctx.beginPath();
        ctx.moveTo(0, -15); // Top
        ctx.lineTo(10, 0);  // Right
        ctx.lineTo(0, 15);  // Bottom
        ctx.lineTo(-10, 0); // Left
        ctx.closePath();
        ctx.fill();
        
        // Facets
        ctx.fillStyle = 'rgba(255,255,255,0.1)';
        ctx.beginPath(); ctx.moveTo(0, -15); ctx.lineTo(10,0); ctx.lineTo(0,0); ctx.fill();
        ctx.fillStyle = 'rgba(0,0,0,0.2)';
        ctx.beginPath(); ctx.moveTo(0, 15); ctx.lineTo(-10,0); ctx.lineTo(0,0); ctx.fill();
        
        // Energy Veins
        ctx.strokeStyle = '#22d3ee';
        ctx.lineWidth = 2;
        ctx.shadowBlur = 5;
        ctx.beginPath();
        ctx.moveTo(0, -8); ctx.lineTo(0, 8);
        ctx.moveTo(-5, 0); ctx.lineTo(5, 0);
        ctx.stroke();
        ctx.shadowBlur = 0;

        // --- FRONT SHIELD ---
        if (!this.isDying && shieldsActive) {
            ctx.save();
            ctx.rotate(this.shieldAngle + Math.PI); // Opposite side
            
            // Glassy look
            const alpha = 0.4 + (shieldState * 0.4); // Fades as HP drops
            ctx.fillStyle = `rgba(103, 232, 249, ${alpha})`; 
            ctx.strokeStyle = `rgba(165, 243, 252, ${alpha})`;
            
            ctx.beginPath();
            ctx.arc(0, 0, 22, 0, Math.PI, false);
            ctx.lineTo(22, -10);
            ctx.arc(0, -10, 22, 0, Math.PI, true);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
            
            // Tech details
            ctx.fillStyle = '#fff';
            ctx.globalAlpha = 0.8;
            ctx.fillRect(-18, -2, 4, 4);
            ctx.fillRect(14, -2, 4, 4);
            
            ctx.restore();
        } else if (this.isDying) {
            // Fallen Shield 2
            ctx.save();
            ctx.translate(this.shield2Pos.x, this.shield2Pos.y);
            ctx.rotate(this.shieldAngle + 2);
            ctx.fillStyle = '#155e75';
            ctx.beginPath(); ctx.arc(0, 0, 15, 0, Math.PI); ctx.fill();
            ctx.restore();
        }

        ctx.restore();
    }
}