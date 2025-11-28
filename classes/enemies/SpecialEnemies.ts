
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
    legs: IKLeg[] = [];
    legState: boolean[] = [false, false]; // Track previous step state for impact effects
    preferredLegIndex: number = 0; // Toggle which leg wants to step next

    constructor(path: Vector2[], wave: number) {
        super(path, wave, EnemyVariant.MECH);
        const baseHp = 30 + (wave * 10);
        this.maxHealth = baseHp * 5.0;
        this.health = this.maxHealth;
        this.speed = (0.03 + (Math.min(20, wave) * 0.001)) * 0.5;
        this.moneyValue = 60;

        // Init Legs (Heavy Industrial Walker) - Scaled Down 50%
        // Height: 25 (was 50), Thresh: 30 (was 60), Duration: 300 (faster steps for smaller size)
        this.legs.push(new IKLeg(0, 0, 25, 30, 300)); // Left
        this.legs.push(new IKLeg(0, 0, 25, 30, 300)); // Right
    }

    onUpdate(dt: number, engine: GameEngine) {
        const pos = engine.getScreenPos(this.gridPos.x, this.gridPos.y);
        
        // Calculate Movement Vector in Screen Space to "reach" forward
        let dirX = 0; 
        let dirY = 0;

        if (this.pathIndex < this.path.length - 1) {
            const next = this.path[this.pathIndex+1];
            const dx = next.x - this.gridPos.x;
            const dy = next.y - this.gridPos.y;
            
            // Convert to screen vector direction (approximate iso projection)
            const sx = (dx - dy);
            const sy = (dx + dy) * 0.5; 
            const len = Math.sqrt(sx*sx + sy*sy);
            
            if (len > 0.001) {
                dirX = sx / len;
                dirY = sy / len;
            }
        }

        // Leg Logic - Scaled Down 50%
        const STRIDE_AHEAD = 25; // Was 50
        const HIP_OFFSET_X = 11; // Was 20
        const HIP_OFFSET_Y = 6;  // Was 10

        // Current leg states
        const leftStepping = this.legs[0].isStepping;
        const rightStepping = this.legs[1].isStepping;

        // Ideal positions relative to body
        const leftIdealX = pos.x - HIP_OFFSET_X + (dirX * STRIDE_AHEAD);
        const leftIdealY = pos.y + HIP_OFFSET_Y + (dirY * STRIDE_AHEAD);
        
        const rightIdealX = pos.x + HIP_OFFSET_X + (dirX * STRIDE_AHEAD);
        const rightIdealY = pos.y + HIP_OFFSET_Y + (dirY * STRIDE_AHEAD);

        // Strict Alternating Gait Control
        if (!leftStepping && !rightStepping) {
             const distLeft = (leftIdealX - this.legs[0].current.x)**2 + (leftIdealY - this.legs[0].current.y)**2;
             const distRight = (rightIdealX - this.legs[1].current.x)**2 + (rightIdealY - this.legs[1].current.y)**2;
             
             // Step threshold squared (scaled down: 30*30)
             const threshSq = 30 * 30; 

             if (distLeft > threshSq && (distLeft > distRight || this.preferredLegIndex === 0)) {
                 this.legs[0].update(leftIdealX, leftIdealY, dt, true); 
                 this.preferredLegIndex = 1; 
             } else if (distRight > threshSq) {
                 this.legs[1].update(rightIdealX, rightIdealY, dt, true); 
                 this.preferredLegIndex = 0; 
             } else {
                 this.legs[0].update(leftIdealX, leftIdealY, dt, false);
                 this.legs[1].update(rightIdealX, rightIdealY, dt, false);
             }
        } else {
            this.legs[0].update(leftIdealX, leftIdealY, dt, leftStepping); 
            this.legs[1].update(rightIdealX, rightIdealY, dt, rightStepping);
        }

        // --- FOOT IMPACT EFFECTS ---
        const handleImpact = (idx: number, isNowStepping: boolean) => {
            const wasStepping = this.legState[idx];
            if (wasStepping && !isNowStepping) {
                const footPos = this.legs[idx].current;
                
                // Mini Dust Cloud
                for(let i=0; i<2; i++) {
                    const p = new ParticleEffect(
                        {x: footPos.x, y: footPos.y}, 
                        0, 
                        'rgba(110, 100, 90, 0.4)',
                        {x: (Math.random()-0.5)*2, y: -0.5 - Math.random()}, 
                        0.5, 
                        ParticleBehavior.FLOAT,
                        'SMOKE'
                    );
                    p.size = 3 + Math.random() * 3;
                    engine.particles.push(p);
                }
            }
            this.legState[idx] = isNowStepping;
        }

        handleImpact(0, this.legs[0].isStepping);
        handleImpact(1, this.legs[1].isStepping);
    }
    
    onDeathStart(engine: GameEngine) {
        super.onDeathStart(engine);
        const pos = engine.getScreenPos(this.gridPos.x, this.gridPos.y);
        
        // Debris (Scaled down)
        engine.particles.push(new Debris(pos, 15, '#334155', {x: 4, y: -5}, 6, 12)); 
        engine.particles.push(new Debris(pos, 15, '#1e293b', {x: -4, y: -5}, 8, 8)); 
        engine.particles.push(new Debris(pos, 18, '#475569', {x: 0, y: -8}, 12, 10));
        
        engine.spawnExplosion(this.gridPos, '#0ea5e9');
        this.opacity = 0; 
    }

    onDeathUpdate(dt: number, engine: GameEngine) {
    }

    drawShadow(ctx: CanvasRenderingContext2D, pos: Vector2) {
        if (this.opacity <= 0) return;
        ctx.fillStyle = 'rgba(0,0,0,0.4)';
        ctx.beginPath(); ctx.ellipse(pos.x, pos.y, 13, 6, 0, 0, Math.PI*2); ctx.fill();
    }

    drawModel(ctx: CanvasRenderingContext2D, pos: Vector2) {
        if (this.opacity <= 0) return;

        // --- SCALED DOWN RENDERING ---
        // Originally: bodyY = pos.y - 45. Now: pos.y - 22.
        const bodyY = pos.y - 22; 
        const time = Date.now() / 200 + this.wobbleOffset;
        
        const isWalking = this.legs[0].isStepping || this.legs[1].isStepping;
        const bob = isWalking ? Math.sin(time * 2) * 1.5 : 0; 
        const renderBodyY = bodyY + bob;

        // --- DRAW LEGS (Industrial) ---
        // Hip attachment points (Scaled: 11)
        const hipXOffset = 11;
        const hipY = renderBodyY + 6;

        this.drawHeavyLeg(ctx, pos.x - hipXOffset, hipY, this.legs[0], true);
        this.drawHeavyLeg(ctx, pos.x + hipXOffset, hipY, this.legs[1], false);


        // --- CHASSIS (Waist + Torso) ---
        
        // 1. Waist Pivot (Hydraulic)
        ctx.fillStyle = '#0f172a'; 
        ctx.fillRect(pos.x - 5, renderBodyY + 7, 10, 4);
        // Pistons
        ctx.fillStyle = '#94a3b8';
        ctx.fillRect(pos.x - 4, renderBodyY + 8, 2, 3);
        ctx.fillRect(pos.x + 2, renderBodyY + 8, 2, 3);

        // 2. Main Torso (Bulky Hex) - Scaled 50%
        const grad = ctx.createLinearGradient(pos.x - 10, renderBodyY - 10, pos.x + 10, renderBodyY + 10);
        grad.addColorStop(0, '#475569'); 
        grad.addColorStop(1, '#1e293b'); 
        ctx.fillStyle = grad;
        
        ctx.beginPath();
        ctx.moveTo(pos.x - 10, renderBodyY - 7); 
        ctx.lineTo(pos.x + 10, renderBodyY - 7); 
        ctx.lineTo(pos.x + 12, renderBodyY + 2);  
        ctx.lineTo(pos.x + 7, renderBodyY + 10); 
        ctx.lineTo(pos.x - 7, renderBodyY + 10); 
        ctx.lineTo(pos.x - 12, renderBodyY + 2);  
        ctx.closePath();
        ctx.fill();

        // Armor Plating Lines
        ctx.strokeStyle = '#64748b'; 
        ctx.lineWidth = 1;
        ctx.stroke();
        
        // Center Vent
        ctx.fillStyle = '#000';
        ctx.fillRect(pos.x - 3, renderBodyY + 2, 6, 5);
        ctx.fillStyle = '#334155';
        ctx.fillRect(pos.x - 3, renderBodyY + 3, 6, 0.5);
        ctx.fillRect(pos.x - 3, renderBodyY + 5, 6, 0.5);


        // 3. Head / Sensor Array
        ctx.fillStyle = '#0f172a';
        ctx.beginPath();
        ctx.moveTo(pos.x - 6, renderBodyY - 7);
        ctx.lineTo(pos.x + 6, renderBodyY - 7);
        ctx.lineTo(pos.x + 4, renderBodyY - 11);
        ctx.lineTo(pos.x - 4, renderBodyY - 11);
        ctx.fill();
        
        // Sensor Eye (Cyclops)
        const glow = (Math.sin(time * 5) + 1) * 0.5;
        ctx.fillStyle = `rgba(239, 68, 68, ${0.5 + glow * 0.5})`; 
        ctx.shadowColor = '#ef4444';
        ctx.shadowBlur = 5;
        ctx.beginPath();
        ctx.arc(pos.x, renderBodyY - 9, 2, 0, Math.PI*2);
        ctx.fill();
        ctx.shadowBlur = 0;


        // --- WEAPONS (Scaled 50%) ---

        // Right Arm: Heavy Gatling Cannon
        ctx.save();
        ctx.translate(pos.x + 12, renderBodyY);
        ctx.rotate(0.1); 
        
        // Shoulder
        ctx.fillStyle = '#334155';
        ctx.beginPath(); ctx.arc(0, 0, 4, 0, Math.PI*2); ctx.fill();
        
        // Gun Body
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(2, -3, 10, 6);
        
        // Barrels (Rotary)
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(12, -2.5, 7, 5); 
        
        // Spin effect
        ctx.fillStyle = '#475569';
        const barrelOffset = Math.sin(time * 20) * 1;
        ctx.fillRect(12, -2 + barrelOffset, 8, 1);
        ctx.fillRect(12, 1 + barrelOffset, 8, 1);
        
        ctx.restore();

        // Left Arm: 6-Rocket Pod (Scaled)
        ctx.save();
        ctx.translate(pos.x - 12, renderBodyY);
        ctx.rotate(-0.1);
        
        // Shoulder
        ctx.fillStyle = '#334155';
        ctx.beginPath(); ctx.arc(0, 0, 4, 0, Math.PI*2); ctx.fill();

        // Missile Box
        ctx.fillStyle = '#1e293b'; 
        ctx.fillRect(-11, -5, 10, 12); 
        
        // Detail rim
        ctx.strokeStyle = '#475569';
        ctx.lineWidth = 0.5;
        ctx.strokeRect(-11, -5, 10, 12);

        // 6 Missiles (2 columns of 3)
        // Scaled offsets
        for (let r = 0; r < 3; r++) {
            for (let c = 0; c < 2; c++) {
                const mx = -9 + (c * 4);
                const my = -3 + (r * 3.5);
                
                // Missile Tip
                ctx.fillStyle = '#ef4444';
                ctx.beginPath(); ctx.arc(mx, my, 1, 0, Math.PI*2); ctx.fill();
            }
        }
        ctx.restore();

        // Steam Vents (Back)
        if (Math.random() > 0.8 && !this.isDying) {
             ctx.fillStyle = 'rgba(255,255,255,0.2)';
             ctx.beginPath(); ctx.arc(pos.x - 5, renderBodyY - 10, 1.5, 0, Math.PI*2); ctx.fill();
             ctx.beginPath(); ctx.arc(pos.x + 5, renderBodyY - 10, 1.5, 0, Math.PI*2); ctx.fill();
        }
    }

    drawHeavyLeg(ctx: CanvasRenderingContext2D, hipX: number, hipY: number, leg: IKLeg, flipKnee: boolean) {
        // Scaled lengths: Thigh 11, Shin 15
        const thighLen = 11;
        const shinLen = 15; 

        const joint = solveTwoBoneIK(
            {x: hipX, y: hipY},
            leg.current,
            thighLen,
            shinLen,
            flipKnee // Outward knees
        );

        // 1. Thigh (Reinforced)
        ctx.strokeStyle = '#334155'; 
        ctx.lineWidth = 5;
        ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(hipX, hipY); ctx.lineTo(joint.x, joint.y); ctx.stroke();
        
        // Armor plate
        ctx.strokeStyle = '#475569';
        ctx.lineWidth = 3;
        ctx.beginPath(); ctx.moveTo(hipX, hipY); ctx.lineTo(joint.x, joint.y); ctx.stroke();

        // 2. Knee Joint
        ctx.fillStyle = '#1e293b';
        ctx.beginPath(); ctx.arc(joint.x, joint.y, 3, 0, Math.PI*2); ctx.fill();
        ctx.fillStyle = '#94a3b8'; 
        ctx.beginPath(); ctx.arc(joint.x, joint.y, 1.2, 0, Math.PI*2); ctx.fill();

        // 3. Shin (Piston)
        ctx.strokeStyle = '#1e293b';
        ctx.lineWidth = 4;
        ctx.beginPath(); ctx.moveTo(joint.x, joint.y); ctx.lineTo(leg.current.x, leg.current.y); ctx.stroke();

        // Inner Hydraulic Piston
        ctx.strokeStyle = '#e2e8f0'; 
        ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.moveTo(joint.x, joint.y); ctx.lineTo(leg.current.x, leg.current.y - 3); ctx.stroke();

        // 4. Heavy Foot (Scaled)
        ctx.fillStyle = '#0f172a';
        ctx.beginPath();
        ctx.moveTo(leg.current.x - 4, leg.current.y - 3);
        ctx.lineTo(leg.current.x + 4, leg.current.y - 3);
        ctx.lineTo(leg.current.x + 5, leg.current.y + 1);
        ctx.lineTo(leg.current.x - 5, leg.current.y + 1);
        ctx.closePath();
        ctx.fill();
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
