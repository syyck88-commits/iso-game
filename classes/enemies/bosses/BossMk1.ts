
import { EnemyVariant, Vector2, ParticleBehavior } from '../../../types';
import { BossEnemy } from '../BossEnemy';
import { GameEngine } from '../../GameEngine';
import { ParticleEffect, Debris } from '../../Particle';
import { IKLeg, solveTwoBoneIK } from '../../IK';

export class BossMk1 extends BossEnemy {
    // Animation state
    smokeTimer: number = 0;
    sparkTimer: number = 0;
    isDying: boolean = false;
    deathTimer: number = 0;
    
    // IK System
    legs: IKLeg[] = [];
    initializedIK: boolean = false;

    constructor(path: Vector2[], wave: number) {
        super(path, wave, EnemyVariant.BOSS_MK1, 15.0, 0.35, 300); 
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
            const smokeColor = isDamaged ? 'rgba(30, 30, 30, 0.6)' : 'rgba(240, 240, 240, 0.3)';
            const zHeight = 100; 
            const riseSpeed = isDamaged ? -2.0 : -1.5; 

            const p1 = new ParticleEffect({x: pos.x - 20, y: pos.y}, zHeight, smokeColor, {x: (Math.random()-0.5), y: riseSpeed}, 2.5, ParticleBehavior.FLOAT);
            p1.size = isDamaged ? 10 : 6;
            engine.particles.push(p1);
            
            const p2 = new ParticleEffect({x: pos.x + 20, y: pos.y}, zHeight, smokeColor, {x: (Math.random()-0.5), y: riseSpeed}, 2.5, ParticleBehavior.FLOAT);
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
                const p = new ParticleEffect({x: pos.x + ox, y: pos.y + oy}, 50, '#facc15', vel, 0.4, ParticleBehavior.PHYSICS);
                p.size = 2;
                engine.particles.push(p);
            }
        }
    }

    updateDeathSequence(dt: number, engine: GameEngine) {
        this.deathTimer += dt;
        const center = engine.getScreenPos(this.gridPos.x, this.gridPos.y);

        if (this.deathTimer < 2000) { 
            if (Math.random() > 0.3) {
                this.gridPos.x += (Math.random() - 0.5) * 0.1;
                this.gridPos.y += (Math.random() - 0.5) * 0.1;
            }
            
            const chance = 0.9 - (this.deathTimer / 4000); 
            if (Math.random() > chance) {
                 const offset = { x: (Math.random() - 0.5) * 30, y: (Math.random() - 0.5) * 40 - 20 };
                 engine.spawnExplosion({x: this.gridPos.x, y: this.gridPos.y}, '#f59e0b');
                 const p = new ParticleEffect({x: center.x + offset.x, y: center.y + offset.y}, 60, '#000', {x:0,y:-2}, 1.0);
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
            const p = new ParticleEffect(center, 50, '#f97316', vel, 1.2, ParticleBehavior.PHYSICS);
            p.size = 6;
            engine.particles.push(p);
        }

        engine.particles.push(new Debris(center, 60, '#451a03', {x: -6, y: -8}, 16, 25));
        engine.particles.push(new Debris(center, 60, '#451a03', {x: 6, y: -8}, 16, 25));
        engine.particles.push(new Debris(center, 30, '#713f12', {x: -8, y: -4}, 12, 30));
        engine.particles.push(new Debris(center, 30, '#713f12', {x: 8, y: -4}, 12, 30));
        engine.particles.push(new Debris(center, 50, '#a16207', {x: 0, y: -10}, 30, 20));

        for(let i=0; i<15; i++) {
            const vel = { x: (Math.random() - 0.5) * 12, y: -Math.random() * 15 - 5 };
            const color = Math.random() > 0.5 ? '#78350f' : '#1f2937'; 
            const p = new ParticleEffect(center, 60, color, vel, 3.0, ParticleBehavior.PHYSICS);
            p.size = 8 + Math.random() * 8;
            engine.particles.push(p);
        }

        for(let i=0; i<30; i++) {
            const vel = { x: (Math.random() - 0.5) * 8, y: -Math.random() * 10 };
            const p = new ParticleEffect(center, 40, '#000', vel, 3.0, ParticleBehavior.PHYSICS);
            p.size = 5;
            engine.particles.push(p);
        }
    }

    drawModel(ctx: CanvasRenderingContext2D, pos: Vector2) {
        let renderPos = { ...pos };
        if (this.isDying) {
            renderPos.x += (Math.random() - 0.5) * 4;
            renderPos.y += (Math.random() - 0.5) * 4;
        }

        // --- IK INIT ---
        if (!this.initializedIK) {
            this.legs.push(new IKLeg(pos.x - 30, pos.y + 20, 20, 20, 0.08)); // Slower, heavier steps
            this.legs.push(new IKLeg(pos.x + 30, pos.y + 20, 20, 20, 0.08));
            this.initializedIK = true;
        }

        // --- IK UPDATE ---
        // Only update legs if not dying
        if (!this.isDying) {
            const leftStep = this.legs[0].isStepping;
            const rightStep = this.legs[1].isStepping;
            this.legs[0].update(pos.x - 40, pos.y + 20, !rightStep);
            this.legs[1].update(pos.x + 40, pos.y + 20, !leftStep);
        }

        const time = Date.now() / 200 + this.wobbleOffset;
        
        // Body lift based on steps
        const lift = (this.legs[0].stepProgress > 0 || this.legs[1].stepProgress > 0) ? 2 : 0;
        const bodyY = renderPos.y - 45 - lift; 
        
        const cPrimary = '#713f12'; 
        const cSecondary = '#451a03'; 
        const cPiston = '#a1a1aa'; 
        
        // --- DRAW LEGS ---
        this.drawHydraulicLeg(ctx, renderPos.x - 22, bodyY + 15, this.legs[0], true, cSecondary, cPiston);
        this.drawHydraulicLeg(ctx, renderPos.x + 22, bodyY + 15, this.legs[1], true, cSecondary, cPiston);
        this.drawHydraulicLeg(ctx, renderPos.x - 24, bodyY + 15, this.legs[0], false, cPrimary, cPiston);
        this.drawHydraulicLeg(ctx, renderPos.x + 24, bodyY + 15, this.legs[1], false, cPrimary, cPiston);

        // --- TORSO ---
        const gradBody = ctx.createLinearGradient(renderPos.x - 20, bodyY - 30, renderPos.x + 20, bodyY + 10);
        gradBody.addColorStop(0, '#a16207'); 
        gradBody.addColorStop(1, '#451a03'); 
        ctx.fillStyle = gradBody;
        
        ctx.beginPath();
        ctx.moveTo(renderPos.x - 18, bodyY + 10); 
        ctx.lineTo(renderPos.x + 18, bodyY + 10); 
        ctx.lineTo(renderPos.x + 28, bodyY - 35); 
        ctx.lineTo(renderPos.x - 28, bodyY - 35); 
        ctx.closePath();
        ctx.fill();
        
        ctx.fillStyle = '#171717';
        ctx.beginPath(); ctx.arc(renderPos.x - 20, bodyY - 28, 2, 0, Math.PI*2); ctx.fill();
        ctx.beginPath(); ctx.arc(renderPos.x + 20, bodyY - 28, 2, 0, Math.PI*2); ctx.fill();
        ctx.beginPath(); ctx.arc(renderPos.x - 14, bodyY + 5, 2, 0, Math.PI*2); ctx.fill();
        ctx.beginPath(); ctx.arc(renderPos.x + 14, bodyY + 5, 2, 0, Math.PI*2); ctx.fill();

        if (!this.isDying) {
            const pulse = Math.sin(time * 10) * 0.2 + 1;
            ctx.fillStyle = '#171717'; 
            ctx.fillRect(renderPos.x - 8, bodyY - 20, 16, 16);
            
            const coreColor = this.health < this.maxHealth * 0.3 ? '#ef4444' : '#f97316';
            ctx.fillStyle = coreColor;
            ctx.shadowColor = coreColor;
            ctx.shadowBlur = 10 * pulse;
            ctx.beginPath();
            ctx.arc(renderPos.x, bodyY - 12, 5 * pulse, 0, Math.PI*2);
            ctx.fill();
            ctx.shadowBlur = 0;
        } else {
            ctx.fillStyle = '#000';
            ctx.fillRect(renderPos.x - 8, bodyY - 20, 16, 16);
            ctx.fillStyle = '#1f1f1f';
            ctx.beginPath(); ctx.arc(renderPos.x, bodyY - 12, 4, 0, Math.PI*2); ctx.fill();
        }

        ctx.fillStyle = '#27272a';
        ctx.beginPath();
        ctx.moveTo(renderPos.x - 18, bodyY - 35); ctx.lineTo(renderPos.x - 24, bodyY - 55); ctx.lineTo(renderPos.x - 10, bodyY - 55); ctx.lineTo(renderPos.x - 12, bodyY - 35);
        ctx.moveTo(renderPos.x + 18, bodyY - 35); ctx.lineTo(renderPos.x + 24, bodyY - 55); ctx.lineTo(renderPos.x + 10, bodyY - 55); ctx.lineTo(renderPos.x + 12, bodyY - 35);
        ctx.fill();
        
        ctx.fillStyle = '#000';
        ctx.fillRect(renderPos.x - 20, bodyY - 57, 8, 3);
        ctx.fillRect(renderPos.x + 12, bodyY - 57, 8, 3);

        // --- ARMS ---
        const armAngle = this.isDying ? Math.PI/2 : Math.sin(time * 1.5) * 0.5;
        
        // Left Arm
        ctx.save();
        ctx.translate(renderPos.x - 28, bodyY - 10);
        ctx.rotate(armAngle);
        ctx.fillStyle = cPrimary;
        ctx.beginPath(); ctx.arc(0, 0, 10, 0, Math.PI*2); ctx.fill(); 
        ctx.fillStyle = '#52525b';
        ctx.fillRect(-8, 5, 16, 25); 
        ctx.fillStyle = cSecondary; 
        ctx.beginPath(); ctx.rect(-12, 15, 24, 30); ctx.fill(); 
        ctx.fillStyle = '#facc15';
        ctx.beginPath();
        ctx.moveTo(-12, 35); ctx.lineTo(12, 45); ctx.lineTo(12, 40); ctx.lineTo(-12, 30);
        ctx.fill();
        ctx.restore();

        // Right Arm
        ctx.save();
        ctx.translate(renderPos.x + 28, bodyY - 10);
        ctx.rotate(-armAngle);
        ctx.fillStyle = cPrimary;
        ctx.beginPath(); ctx.arc(0, 0, 10, 0, Math.PI*2); ctx.fill(); 
        
        ctx.fillStyle = cPiston;
        ctx.fillRect(-3, 0, 6, 20);
        ctx.fillStyle = cSecondary;
        ctx.fillRect(-6, 15, 12, 20); 
        
        ctx.translate(0, 35);
        ctx.fillStyle = '#27272a';
        ctx.fillRect(-12, -5, 24, 20);
        ctx.fillStyle = '#d4d4d8'; 
        ctx.fillRect(-14, 10, 28, 5);
        ctx.restore();
    }

    drawHydraulicLeg(ctx: CanvasRenderingContext2D, rootX: number, rootY: number, leg: IKLeg, isBack: boolean, color: string, pistonColor: string) {
        // Adjust ideal target slightly for back legs vs front legs visually
        // Note: The IKLeg object passed here tracks the FOOT position.
        // We calculate the joint based on that.
        
        const footX = leg.current.x + (isBack ? 0 : 0); // Reuse leg for both sets if visually acceptable, or create 4 legs. 
        // Re-using legs 0 and 1 for 4 visuals is tricky. 
        // Visual hack: Front legs use real IK pos, Back legs use IK pos + slight delay or offset?
        // Let's just offset the visual foot target for back legs
        
        const finalFootX = isBack ? footX : footX + (footX > rootX ? 5 : -5);
        const finalFootY = isBack ? leg.current.y - 5 : leg.current.y + 5;

        // IK Logic
        const joint = solveTwoBoneIK(
            {x: rootX, y: rootY},
            {x: finalFootX, y: finalFootY},
            24, 
            24, 
            rootX < finalFootX
        );

        ctx.strokeStyle = color;
        ctx.lineWidth = 8;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        
        ctx.beginPath(); ctx.moveTo(rootX, rootY); ctx.lineTo(joint.x, joint.y); ctx.stroke();
        
        ctx.beginPath(); ctx.moveTo(joint.x, joint.y); ctx.lineTo(finalFootX, finalFootY); ctx.stroke();
        
        ctx.save();
        ctx.strokeStyle = pistonColor;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(joint.x, joint.y);
        ctx.lineTo(finalFootX, finalFootY); 
        ctx.stroke();
        ctx.restore();
        
        ctx.fillStyle = '#171717';
        ctx.beginPath(); ctx.arc(rootX, rootY, 5, 0, Math.PI*2); ctx.fill();
        ctx.beginPath(); ctx.arc(joint.x, joint.y, 4, 0, Math.PI*2); ctx.fill();
        
        ctx.fillStyle = '#27272a';
        ctx.beginPath();
        ctx.rect(finalFootX - 8, finalFootY - 3, 16, 8);
        ctx.fill();
    }
}
