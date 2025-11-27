
import { EnemyVariant, Vector2, ParticleBehavior } from '../../../types';
import { BossEnemy } from '../BossEnemy';
import { GameEngine } from '../../GameEngine';
import { ParticleEffect, Debris } from '../../Particle';
import { IKLeg, solveTwoBoneIK } from '../../IK';

export class BossMk1 extends BossEnemy {
    // Animation state
    smokeTimer: number = 0;
    sparkTimer: number = 0;
    
    // Visuals
    gearAngle: number = 0;
    bodyBounce: number = 0;
    
    // IK System
    legs: IKLeg[] = [];
    legState: boolean[] = []; 

    constructor(path: Vector2[], wave: number) {
        super(path, wave, EnemyVariant.BOSS_MK1, 15.0, 0.25, 300); 
        
        // Init Legs (4 Legs)
        // Shorter duration (350ms) for punchier steps
        // Threshold (40) to trigger steps sooner
        for(let i=0; i<4; i++) {
             this.legs.push(new IKLeg(0, 0, 40, 40, 350));
             this.legState.push(false);
        }
    }

    update(dt: number, engine: GameEngine) {
        if (this.health <= 0 && !this.isDying) {
            this.isDying = true;
            this.health = 1; 
            engine.audio.playCancel(); 
            engine.shakeScreen(10);
        }

        if (this.isDying) {
            this.updateDeathSequence(dt, engine);
            return; 
        }

        super.update(dt, engine);
        this.updateEffects(dt, engine);
        
        this.gearAngle += dt * 0.005;

        // --- IMPROVED IK LOGIC ---
        const pos = engine.getScreenPos(this.gridPos.x, this.gridPos.y);
        
        // 1. Movement Vector
        let dirX = 0;
        let dirY = 0;
        if (this.pathIndex < this.path.length - 1) {
            const next = this.path[this.pathIndex+1];
            const dx = next.x - this.gridPos.x;
            const dy = next.y - this.gridPos.y;
            // Approx isometric vector
            const sx = (dx - dy);
            const sy = (dx + dy) * 0.5;
            const len = Math.sqrt(sx*sx + sy*sy);
            if (len > 0.001) {
                dirX = sx / len;
                dirY = sy / len;
            }
        }

        // 2. Body Bounce
        const idleBob = Math.sin(Date.now() / 600) * 2;
        let walkBounce = 0;
        if (this.legs.some(l => l.isStepping)) {
            walkBounce = Math.sin(Date.now() / 100) * 3; 
        }
        this.bodyBounce = idleBob + walkBounce;

        // 3. Update Legs
        let isAnyLegMoving = this.legs.some(l => l.isStepping);
        
        // Leg Config (Shorter, Tighter)
        const HIP_X_OFFSET = 32; 
        const LEAD_FRONT = 45;
        const LEAD_BACK = -10;

        this.legs.forEach((leg, i) => {
            const isLeft = (i % 2) === 0; // 0, 2 are Left
            const isFront = i < 2;        // 0, 1 are Front
            
            const hipX = isLeft ? -HIP_X_OFFSET : HIP_X_OFFSET;
            const hipY = isFront ? 20 : -10; 
            const lead = isFront ? LEAD_FRONT : LEAD_BACK;

            const idealX = pos.x + hipX + (dirX * lead);
            const idealY = pos.y + hipY + (dirY * lead);

            // ANTI-SNAP Logic:
            // Calculate distance to target. If it exceeds a "Soft Panic" threshold (e.g. 100px),
            // we FORCE the step even if another leg is moving.
            // This prevents the leg from being dragged into infinity and snapping.
            const distSq = (idealX - leg.current.x)**2 + (idealY - leg.current.y)**2;
            const forceStep = distSq > (100 * 100);

            let canStep = !isAnyLegMoving || forceStep;
            
            const wasStepping = this.legState[i];
            const isNowStepping = leg.update(idealX, idealY, dt, canStep);
            
            if (isNowStepping && !wasStepping) {
                isAnyLegMoving = true; 
            }
            
            this.legState[i] = isNowStepping;

            // Stomp Sound
            if (wasStepping && !isNowStepping) {
                engine.audio.playExplosion('small'); 
                engine.shakeScreen(2); 
                
                const pPos = { x: leg.current.x, y: leg.current.y };
                for(let k=0; k<3; k++) {
                     engine.particles.push(new ParticleEffect(
                         pPos, 0, 'rgba(100,100,100,0.5)', 
                         {x:(Math.random()-0.5)*3, y:-1}, 
                         0.5, ParticleBehavior.FLOAT
                     ));
                }
            }
        });
    }
    
    updateEffects(dt: number, engine: GameEngine) {
        const hpPct = this.health / this.maxHealth;
        const isDamaged = hpPct < 0.6;
        const isCritical = hpPct < 0.3;

        this.smokeTimer += dt;
        const smokeRate = isCritical ? 50 : 100;
        
        if (this.smokeTimer > smokeRate) {
            this.smokeTimer = 0;
            const pos = engine.getScreenPos(this.gridPos.x, this.gridPos.y);
            const smokeColor = isDamaged ? 'rgba(30, 30, 30, 0.6)' : 'rgba(200, 200, 200, 0.4)';
            
            const pipeY = pos.y - 100 + this.bodyBounce;

            const p1 = new ParticleEffect(
                {x: pos.x - 10, y: pipeY}, 
                0, smokeColor, {x: (Math.random()-0.5), y: -2 - Math.random()}, 
                6.0, ParticleBehavior.FLOAT, 'SMOKE'
            );
            p1.size = isDamaged ? 10 : 6;
            engine.particles.push(p1);
            
            const p2 = new ParticleEffect(
                {x: pos.x + 10, y: pipeY}, 
                0, smokeColor, {x: (Math.random()-0.5), y: -2 - Math.random()}, 
                6.0, ParticleBehavior.FLOAT, 'SMOKE'
            );
            p2.size = isDamaged ? 10 : 6;
            engine.particles.push(p2);
        }

        if (isDamaged) {
            this.sparkTimer += dt;
            if (this.sparkTimer > (isCritical ? 50 : 200)) {
                this.sparkTimer = 0;
                const pos = engine.getScreenPos(this.gridPos.x, this.gridPos.y);
                const ox = (Math.random() - 0.5) * 40;
                const oy = (Math.random() - 0.5) * 40 - 40; 
                
                const vel = { x: (Math.random() - 0.5) * 5, y: -Math.random() * 5 };
                const p = new ParticleEffect({x: pos.x + ox, y: pos.y + oy}, 0, '#facc15', vel, 0.4, ParticleBehavior.PHYSICS);
                p.size = 2;
                engine.particles.push(p);
            }
        }
    }

    updateDeathSequence(dt: number, engine: GameEngine) {
        this.deathTimer += dt;
        const center = engine.getScreenPos(this.gridPos.x, this.gridPos.y);

        if (this.deathTimer < 1500) { 
            const pct = this.deathTimer / 1500;
            const ease = pct * pct; 
            this.rotation = (Math.PI / 2) * ease;
            
            if (Math.random() > 0.3) {
                this.gridPos.x += (Math.random() - 0.5) * 0.05;
                this.gridPos.y += (Math.random() - 0.5) * 0.05;
            }
            
            const chance = 0.9 - (this.deathTimer / 4000); 
            if (Math.random() > chance) {
                 const offset = { x: (Math.random() - 0.5) * 30, y: (Math.random() - 0.5) * 40 - 20 };
                 engine.spawnExplosion({x: this.gridPos.x, y: this.gridPos.y}, '#f59e0b');
                 const p = new ParticleEffect({x: center.x + offset.x, y: center.y + offset.y}, 0, '#000', {x:0,y:-2}, 1.0);
                 p.size = 10;
                 engine.particles.push(p);
                 engine.audio.playShoot(0.5); 
            }
        } 
        else {
            this.triggerFinalExplosion(engine);
            engine.removeEntity(this.id);
            let bounty = this.moneyValue + Math.floor(engine.gameState.wave);
            engine.gameState.money += bounty;
            engine.spawnLootEffect(this.gridPos, bounty);
            engine.addFloatingText(`+$${bounty}`, this.gridPos, '#fbbf24', true);
        }
    }

    triggerFinalExplosion(engine: GameEngine) {
        engine.shakeScreen(30); 
        engine.audio.playExplosion(); 
        
        const center = engine.getScreenPos(this.gridPos.x, this.gridPos.y);

        for(let i=0; i<36; i++) {
            const angle = (Math.PI * 2 * i) / 36;
            const speed = 6 + Math.random() * 4;
            const vel = { x: Math.cos(angle) * speed, y: Math.sin(angle) * speed * 0.5 };
            const p = new ParticleEffect(center, 0, '#f97316', vel, 1.2, ParticleBehavior.PHYSICS);
            p.size = 6;
            engine.particles.push(p);
        }

        for(let i=0; i<10; i++) {
            const vel = { x: (Math.random() - 0.5) * 10, y: -5 - Math.random() * 10 };
            engine.particles.push(new Debris(center, 0, '#b45309', vel, 8 + Math.random()*8, 8 + Math.random()*8));
        }

        engine.particles.push(new Debris(center, 0, '#451a03', {x: -6, y: -8}, 16, 25));
        engine.particles.push(new Debris(center, 0, '#451a03', {x: 6, y: -8}, 16, 25));
    }

    drawModel(ctx: CanvasRenderingContext2D, pos: Vector2) {
        let renderPos = { ...pos };
        
        const cBrassLight = '#fcd34d'; 
        const cBrassDark = '#b45309';  
        const cIron = '#374151';       
        const cDarkIron = '#111827';   
        const cGlow = '#f97316';       

        const bodyY = renderPos.y - 45 + this.bodyBounce;

        // --- DRAW LEGS ---
        const indices = [2, 3, 0, 1];
        
        indices.forEach(i => {
            const isLeft = (i % 2) === 0;
            const isFront = i < 2;
            const hipXOffset = 32; // Narrower
            const hipYOffset = isFront ? 20 : 10;
            
            const mountX = renderPos.x + (isLeft ? -hipXOffset : hipXOffset);
            const mountY = bodyY + 15 + hipYOffset;

            if (this.isDying) {
                this.drawStaticLeg(ctx, mountX, mountY, isLeft);
            } else {
                this.drawSteampunkLeg(ctx, mountX, mountY, this.legs[i], isLeft);
            }
        });

        // --- BODY ---
        if (!this.isDying) {
            ctx.fillStyle = 'rgba(0,0,0,0.5)';
            ctx.beginPath();
            ctx.ellipse(renderPos.x, renderPos.y, 40, 15, 0, 0, Math.PI*2);
            ctx.fill();
        }

        const gradIron = ctx.createLinearGradient(renderPos.x, bodyY - 10, renderPos.x, bodyY + 20);
        gradIron.addColorStop(0, '#4b5563');
        gradIron.addColorStop(1, '#1f2937');
        ctx.fillStyle = gradIron;
        ctx.beginPath();
        ctx.arc(renderPos.x, bodyY, 28, 0, Math.PI, false);
        ctx.lineTo(renderPos.x - 28, bodyY);
        ctx.fill();
        
        const gradBrass = ctx.createRadialGradient(renderPos.x - 10, bodyY - 15, 0, renderPos.x, bodyY, 35);
        gradBrass.addColorStop(0, cBrassLight);
        gradBrass.addColorStop(0.5, '#d97706');
        gradBrass.addColorStop(1, cBrassDark);
        ctx.fillStyle = gradBrass;
        ctx.beginPath();
        ctx.arc(renderPos.x, bodyY + 2, 28, Math.PI, 0, false);
        ctx.lineTo(renderPos.x + 28, bodyY + 2);
        ctx.fill();

        ctx.fillStyle = cDarkIron;
        for(let i=0; i<7; i++) {
            const x = renderPos.x - 24 + (i * 8);
            ctx.beginPath(); ctx.arc(x, bodyY, 2, 0, Math.PI*2); ctx.fill();
        }

        // Furnace
        const glowPulse = 0.8 + Math.sin(Date.now()/100) * 0.2;
        ctx.fillStyle = '#451a03';
        ctx.beginPath();
        ctx.arc(renderPos.x, bodyY - 5, 14, 0, Math.PI*2);
        ctx.fill();
        
        ctx.fillStyle = cGlow;
        ctx.globalAlpha = glowPulse;
        ctx.shadowColor = cGlow;
        ctx.shadowBlur = 15;
        ctx.beginPath();
        ctx.arc(renderPos.x, bodyY - 5, 10, 0, Math.PI*2);
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.globalAlpha = 1.0;
        
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(renderPos.x - 10, bodyY - 5); ctx.lineTo(renderPos.x + 10, bodyY - 5);
        ctx.moveTo(renderPos.x - 8, bodyY - 10); ctx.lineTo(renderPos.x + 8, bodyY - 10);
        ctx.moveTo(renderPos.x - 8, bodyY); ctx.lineTo(renderPos.x + 8, bodyY);
        ctx.stroke();

        const pipeH = 35;
        const pipeY = bodyY - 20;
        
        const drawPipe = (x: number) => {
            ctx.fillStyle = cIron;
            ctx.beginPath(); ctx.rect(x - 5, pipeY - pipeH, 10, pipeH); ctx.fill();
            ctx.fillStyle = cBrassDark;
            ctx.beginPath(); ctx.rect(x - 6, pipeY - pipeH - 2, 12, 4); ctx.fill();
            ctx.beginPath(); ctx.rect(x - 6, pipeY - 5, 12, 5); ctx.fill();
        };

        drawPipe(renderPos.x - 10);
        drawPipe(renderPos.x + 10);

        this.drawGear(ctx, renderPos.x - 26, bodyY, 12, this.gearAngle, cBrassDark);
        this.drawGear(ctx, renderPos.x + 26, bodyY, 12, -this.gearAngle, cBrassDark);
        this.drawGear(ctx, renderPos.x, bodyY - 24, 8, this.gearAngle * 2, '#9ca3af');

        ctx.fillStyle = cDarkIron;
        ctx.beginPath(); ctx.arc(renderPos.x - 30, bodyY + 15, 8, 0, Math.PI*2); ctx.fill();
        ctx.beginPath(); ctx.arc(renderPos.x + 30, bodyY + 15, 8, 0, Math.PI*2); ctx.fill();
    }

    drawGear(ctx: CanvasRenderingContext2D, x: number, y: number, radius: number, angle: number, color: string) {
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(angle);
        ctx.fillStyle = color;
        const teeth = 8;
        for(let i=0; i<teeth; i++) {
            ctx.rotate((Math.PI*2)/teeth);
            ctx.fillRect(-3, -radius - 2, 6, 4);
        }
        ctx.beginPath(); ctx.arc(0, 0, radius, 0, Math.PI*2); ctx.fill();
        ctx.fillStyle = '#111';
        ctx.beginPath(); ctx.arc(0, 0, radius * 0.4, 0, Math.PI*2); ctx.fill();
        ctx.restore();
    }

    drawSteampunkLeg(ctx: CanvasRenderingContext2D, hipX: number, hipY: number, leg: IKLeg, flipKnee: boolean) {
        // Shorter, stubbier legs to prevent "twisting" and over-reach
        const thighLen = 18;
        const shinLen = 22;
        
        const knee = solveTwoBoneIK(
            {x: hipX, y: hipY},
            leg.current,
            thighLen,
            shinLen,
            flipKnee 
        );

        this.drawLegSegments(ctx, {x: hipX, y: hipY}, knee, leg.current);
    }

    drawStaticLeg(ctx: CanvasRenderingContext2D, hipX: number, hipY: number, flipKnee: boolean) {
        const kneeX = hipX + (flipKnee ? -10 : 10);
        const kneeY = hipY + 15;
        const footX = kneeX;
        const footY = kneeY + 15;
        this.drawLegSegments(ctx, {x: hipX, y: hipY}, {x: kneeX, y: kneeY}, {x: footX, y: footY});
    }

    drawLegSegments(ctx: CanvasRenderingContext2D, hip: Vector2, knee: Vector2, foot: Vector2) {
        // Safe check for NaN
        if (isNaN(knee.x) || isNaN(knee.y)) return;

        // Upper Leg
        const thighAngle = Math.atan2(knee.y - hip.y, knee.x - hip.x);
        const thighDist = Math.sqrt(Math.pow(knee.x - hip.x, 2) + Math.pow(knee.y - hip.y, 2));

        ctx.save();
        ctx.translate(hip.x, hip.y);
        ctx.rotate(thighAngle);
        ctx.fillStyle = '#57534e'; ctx.fillRect(0, -5, thighDist, 10);
        ctx.fillStyle = '#b45309'; ctx.fillRect(4, -2, thighDist - 8, 4);
        ctx.restore();

        // Lower Leg
        const shinAngle = Math.atan2(foot.y - knee.y, foot.x - knee.x);
        const shinDist = Math.sqrt(Math.pow(foot.x - knee.x, 2) + Math.pow(foot.y - knee.y, 2));
        
        ctx.save();
        ctx.translate(knee.x, knee.y);
        ctx.rotate(shinAngle);
        ctx.fillStyle = '#78350f'; ctx.fillRect(0, -6, shinDist * 0.6, 12);
        ctx.fillStyle = '#e2e8f0'; ctx.fillRect(shinDist * 0.5, -3, shinDist * 0.5, 6);
        ctx.restore();

        // Joints
        this.drawGear(ctx, hip.x, hip.y, 8, this.gearAngle * 2, '#d97706');
        this.drawGear(ctx, knee.x, knee.y, 6, this.gearAngle * -3, '#9ca3af');

        // Foot
        ctx.save();
        ctx.translate(foot.x, foot.y);
        ctx.fillStyle = '#1f2937'; ctx.beginPath(); ctx.rect(-8, -4, 8, 8); ctx.fill();
        ctx.fillStyle = '#b45309'; ctx.fillRect(-8, 5, 18, 3);
        ctx.restore();
    }
}
