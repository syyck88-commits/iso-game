
import { EnemyVariant, Vector2, ParticleBehavior } from '../../types';
import { BaseEnemy } from './BaseEnemy';
import { GameEngine } from '../GameEngine';
import { SwarmEnemy } from './MinionEnemies';
import { ParticleEffect, Debris } from '../Particle';
import { drawHealer } from '../renderers/enemies/SpecialRenderers';
import { IKLeg, solveTwoBoneIK } from '../IK';

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

export class SplitterEnemy extends BaseEnemy {
    dripTimer: number = 0;

    constructor(path: Vector2[], wave: number) {
        super(path, wave, EnemyVariant.SPLITTER);
        const baseHp = 30 + (wave * 10);
        this.maxHealth = baseHp * 2.0;
        this.health = this.maxHealth;
        this.speed = (0.03 + (Math.min(20, wave) * 0.001)) * 0.7;
        this.moneyValue = 35;
    }

    onUpdate(dt: number, engine: GameEngine) {
        this.dripTimer += dt;
        if (this.dripTimer > 200) {
            this.dripTimer = 0;
            const pos = engine.getScreenPos(this.gridPos.x, this.gridPos.y);
            const p = new ParticleEffect(
                {x: pos.x + (Math.random()-0.5)*10, y: pos.y}, 
                10, 
                '#a3e635', 
                {x:0, y: 1}, 
                0.5, 
                ParticleBehavior.PHYSICS
            );
            engine.particles.push(p);
        }
    }

    onDeathStart(engine: GameEngine) {
        super.onDeathStart(engine); 
        for(let i=0; i<3; i++) {
            const child = new SwarmEnemy(this.path, engine.gameState.wave);
            child.pathIndex = this.pathIndex;
            child.gridPos.x = this.gridPos.x + (Math.random() - 0.5) * 0.2;
            child.gridPos.y = this.gridPos.y + (Math.random() - 0.5) * 0.2;
            engine.entities.push(child);
            engine.spawnParticle(child.gridPos, 10, '#facc15');
        }
        this.opacity = 0;
    }

    drawModel(ctx: CanvasRenderingContext2D, pos: Vector2) {
        const time = Date.now() / 200 + this.wobbleOffset;
        const bounce = Math.abs(Math.sin(time * 2)) * 3;
        const squish = Math.cos(time * 2) * 2;
        
        ctx.fillStyle = 'rgba(132, 204, 22, 0.6)';
        ctx.beginPath();
        ctx.ellipse(pos.x, pos.y - 10 - bounce, 14 + squish, 12 - squish, 0, 0, Math.PI*2);
        ctx.fill();
        
        ctx.fillStyle = '#65a30d';
        ctx.beginPath();
        ctx.ellipse(pos.x, pos.y - 10 - bounce, 8 + squish * 0.5, 7 - squish * 0.5, 0, 0, Math.PI*2);
        ctx.fill();
        
        ctx.fillStyle = '#d9f99d';
        const bubY = pos.y - 10 - bounce + Math.sin(time * 5) * 3;
        ctx.beginPath(); ctx.arc(pos.x - 4, bubY - 2, 2, 0, Math.PI*2); ctx.fill();
        ctx.beginPath(); ctx.arc(pos.x + 5, bubY + 3, 1.5, 0, Math.PI*2); ctx.fill();
    }
}

export class MechEnemy extends BaseEnemy {
    stepPhase: number = 0;
    legs: IKLeg[] = [];

    constructor(path: Vector2[], wave: number) {
        super(path, wave, EnemyVariant.MECH);
        const baseHp = 30 + (wave * 10);
        this.maxHealth = baseHp * 5.0;
        this.health = this.maxHealth;
        this.speed = (0.03 + (Math.min(20, wave) * 0.001)) * 0.5;
        this.moneyValue = 60;

        // Init Legs
        // 2 Large Legs
        // Init with dummy positions, they snap on first update
        this.legs.push(new IKLeg(0, 0, 20, 15, 200)); // Left
        this.legs.push(new IKLeg(0, 0, 20, 15, 200)); // Right
    }

    onUpdate(dt: number, engine: GameEngine) {
        // --- UPDATE IK ---
        const pos = engine.getScreenPos(this.gridPos.x, this.gridPos.y);
        
        // Alternating gait
        const leftStep = this.legs[0].isStepping;
        const rightStep = this.legs[1].isStepping;
        
        // Update Left
        this.legs[0].update(pos.x - 16, pos.y + 5, dt, !rightStep);
        // Update Right
        this.legs[1].update(pos.x + 16, pos.y + 5, dt, !leftStep);
    }
    
    onDeathStart(engine: GameEngine) {
        super.onDeathStart(engine);
        const pos = engine.getScreenPos(this.gridPos.x, this.gridPos.y);
        engine.particles.push(new Debris(pos, 20, '#334155', {x: -3, y: -4}, 6, 12));
        engine.particles.push(new Debris(pos, 20, '#334155', {x: 3, y: -4}, 6, 12));
        engine.particles.push(new Debris(pos, 30, '#475569', {x: 0, y: -6}, 20, 15));
        engine.particles.push(new Debris(pos, 35, '#38bdf8', {x: 1, y: -8}, 8, 6));
        engine.spawnExplosion(this.gridPos, '#0ea5e9');
        this.opacity = 0; 
    }

    onDeathUpdate(dt: number, engine: GameEngine) {
    }

    drawShadow(ctx: CanvasRenderingContext2D, pos: Vector2) {
        if (this.opacity <= 0) return;
        ctx.fillStyle = 'rgba(0,0,0,0.4)';
        ctx.beginPath(); ctx.ellipse(pos.x, pos.y, 18, 9, 0, 0, Math.PI*2); ctx.fill();
    }

    drawModel(ctx: CanvasRenderingContext2D, pos: Vector2) {
        if (this.opacity <= 0) return;

        const bodyY = pos.y - 25;
        const time = Date.now() / 200 + this.wobbleOffset;
        const glow = Math.sin(time * 5) * 0.5 + 0.5;

        // Draw Legs
        this.drawIKLeg(ctx, pos.x - 10, bodyY + 10, this.legs[0]);
        this.drawIKLeg(ctx, pos.x + 10, bodyY + 10, this.legs[1]);

        // --- BODY ---
        // Bobs slightly when walking
        const bob = (this.legs[0].stepProgress > 0 && this.legs[0].stepProgress < 1) || (this.legs[1].stepProgress > 0 && this.legs[1].stepProgress < 1) ? 2 : 0;
        const actualBodyY = bodyY + bob;

        const grad = ctx.createLinearGradient(pos.x - 10, actualBodyY - 10, pos.x + 10, actualBodyY + 10);
        grad.addColorStop(0, '#94a3b8'); grad.addColorStop(1, '#475569');
        ctx.fillStyle = grad; 
        ctx.fillRect(pos.x - 12, actualBodyY - 10, 24, 20);
        
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(pos.x - 12, actualBodyY + 5, 24, 2);

        ctx.fillStyle = `rgba(56, 189, 248, ${0.5 + glow * 0.5})`; 
        ctx.shadowColor = '#38bdf8';
        ctx.shadowBlur = glow * 10;
        ctx.fillRect(pos.x - 6, actualBodyY - 6, 12, 6);
        ctx.shadowBlur = 0;
        
        ctx.strokeStyle = '#94a3b8';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(pos.x + 10, actualBodyY - 10);
        ctx.lineTo(pos.x + 10, actualBodyY - 18);
        ctx.stroke();
        
        if (Math.floor(time * 2) % 2 === 0) {
            ctx.fillStyle = '#ef4444';
            ctx.beginPath(); ctx.arc(pos.x + 10, actualBodyY - 18, 1.5, 0, Math.PI*2); ctx.fill();
        }
    }

    drawIKLeg(ctx: CanvasRenderingContext2D, hipX: number, hipY: number, leg: IKLeg) {
        const joint = solveTwoBoneIK(
            {x: hipX, y: hipY},
            leg.current,
            16, // Thigh
            16, // Shin
            hipX < leg.current.x // Flip outward
        );

        ctx.strokeStyle = '#334155'; 
        ctx.lineWidth = 4;
        ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(hipX, hipY); ctx.lineTo(joint.x, joint.y); ctx.stroke();
        
        ctx.beginPath(); ctx.moveTo(joint.x, joint.y); ctx.lineTo(leg.current.x, leg.current.y); ctx.stroke();

        ctx.fillStyle = '#1e293b';
        ctx.beginPath(); ctx.arc(joint.x, joint.y, 3, 0, Math.PI*2); ctx.fill();
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(leg.current.x - 3, leg.current.y - 2, 6, 4);
    }
}

export class GhostEnemy extends BaseEnemy {
    glitchTimer: number = 0;
    isGlitching: boolean = false;

    constructor(path: Vector2[], wave: number) {
        super(path, wave, EnemyVariant.GHOST);
        const baseHp = 30 + (wave * 10);
        this.maxHealth = Math.floor(baseHp * 0.8);
        this.health = this.maxHealth;
        this.speed = (0.03 + (Math.min(20, wave) * 0.001)) * 0.9;
        this.moneyValue = 20;
    }

    onUpdate(dt: number, engine: GameEngine) {
        this.glitchTimer += dt;
        if (this.glitchTimer > 100) {
            this.glitchTimer = 0;
            this.isGlitching = Math.random() > 0.8;
        }
    }

    onDeathUpdate(dt: number, engine: GameEngine) {
        this.opacity -= dt * 0.002;
        this.scale += dt * 0.005; 
        
        if (Math.random() > 0.5) {
             const pos = engine.getScreenPos(this.gridPos.x, this.gridPos.y);
             const p = new ParticleEffect(pos, 20, '#06b6d4', {x:0,y:0}, 0.2, ParticleBehavior.FLOAT);
             p.size = 2; 
             engine.particles.push(p);
        }
    }

    drawModel(ctx: CanvasRenderingContext2D, pos: Vector2) {
        const time = Date.now() / 200 + this.wobbleOffset;
        const floatY = pos.y - 30 + Math.sin(time) * 5;
        
        let gx = 0;
        let gy = 0;
        if (this.isGlitching || this.isDying) {
            gx = (Math.random() - 0.5) * 6;
            gy = (Math.random() - 0.5) * 2;
        }

        ctx.save(); 
        ctx.translate(gx, gy);
        
        ctx.globalAlpha = this.opacity * 0.6; 
        
        const grad = ctx.createLinearGradient(pos.x, floatY - 20, pos.x, floatY + 20);
        grad.addColorStop(0, '#06b6d4'); grad.addColorStop(1, 'rgba(6, 182, 212, 0)');
        ctx.fillStyle = grad;
        
        ctx.beginPath(); ctx.moveTo(pos.x, floatY - 20); 
        ctx.bezierCurveTo(pos.x - 15, floatY - 20, pos.x - 15, floatY, pos.x - 10, floatY + 15);
        ctx.lineTo(pos.x, floatY + 20); ctx.lineTo(pos.x + 10, floatY + 15);
        ctx.bezierCurveTo(pos.x + 15, floatY, pos.x + 15, floatY - 20, pos.x, floatY - 20); ctx.fill();
        
        ctx.fillStyle = '#ecfeff'; 
        ctx.globalAlpha = this.opacity; 
        ctx.beginPath();
        ctx.arc(pos.x - 4, floatY - 5, 2, 0, Math.PI*2); 
        ctx.arc(pos.x + 4, floatY - 5, 2, 0, Math.PI*2); 
        ctx.fill();
        
        ctx.strokeStyle = 'rgba(255,255,255,0.2)';
        ctx.lineWidth = 1;
        for(let i=0; i<5; i++) {
            const y = floatY - 15 + (i * 6) + (time % 1) * 6;
            ctx.beginPath(); ctx.moveTo(pos.x - 10, y); ctx.lineTo(pos.x + 10, y); ctx.stroke();
        }

        ctx.restore();
    }
}
