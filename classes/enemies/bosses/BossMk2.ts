
import { EnemyVariant, Vector2, ParticleBehavior } from '../../../types';
import { BossEnemy } from '../BossEnemy';
import { GameEngine } from '../../GameEngine';
import { ParticleEffect, Debris } from '../../Particle';
import { IKLeg, solveTwoBoneIK } from '../../IK';

export class BossMk2 extends BossEnemy {
    wingAngle: number = 0;
    abdomenPulse: number = 0;
    isDying: boolean = false;
    deathTimer: number = 0;

    // IK
    legs: IKLeg[] = [];
    
    constructor(path: Vector2[], wave: number) {
        super(path, wave, EnemyVariant.BOSS_MK2, 25.0, 0.5, 400); 
        
        // Init 4 Legs
        for(let i=0; i<4; i++) {
            this.legs.push(new IKLeg(0, 0, 15, 15, 180));
        }
    }

    update(dt: number, engine: GameEngine) {
        if (this.health <= 0 && !this.isDying) {
            this.isDying = true;
            this.health = 1; 
            engine.audio.playCancel(); 
            engine.shakeScreen(5);
        }

        if (this.isDying) {
            this.updateDeathSequence(dt, engine);
            return;
        }

        super.update(dt, engine);
        
        if (Math.random() > 0.95) {
             const pos = engine.getScreenPos(this.gridPos.x, this.gridPos.y);
             const p = new ParticleEffect({x: pos.x, y: pos.y + 10}, 20, '#a3e635', {x:0,y:2}, 0.5, ParticleBehavior.PHYSICS);
             engine.particles.push(p);
        }

        // --- IK UPDATE ---
        const pos = engine.getScreenPos(this.gridPos.x, this.gridPos.y);
        const time = Date.now() / 200 + this.wobbleOffset;
        const hover = Math.sin(time) * 5;
        const renderY = pos.y - 40 + hover;

        const isGroupA = this.legs[0].isStepping || this.legs[3].isStepping;
        const isGroupB = this.legs[1].isStepping || this.legs[2].isStepping;

        // Leg 0 (Front Right), Leg 1 (Back Right), Leg 2 (Front Left), Leg 3 (Back Left)
        this.legs.forEach((leg, i) => {
            const isLeft = i >= 2;
            const isBack = (i % 2) === 1;
            const idealX = pos.x + (isLeft ? -25 : 25) + (isBack ? -5 : 5);
            const idealY = renderY + 40 + (isBack ? 10 : -10);
            
            // Allow step if diagonal pair is grounded
            const myGroupStepping = (i === 0 || i === 3) ? isGroupA : isGroupB;
            const otherGroupStepping = (i === 0 || i === 3) ? isGroupB : isGroupA;
            
            leg.update(idealX, idealY, dt, !otherGroupStepping);
        });
    }

    updateDeathSequence(dt: number, engine: GameEngine) {
        this.deathTimer += dt;
        const pos = engine.getScreenPos(this.gridPos.x, this.gridPos.y);

        if (this.deathTimer < 1500) {
            this.gridPos.x += (Math.random()-0.5) * 0.1;
            this.gridPos.y += (Math.random()-0.5) * 0.1;
            this.abdomenPulse += dt * 0.01;
            
            if (Math.random() > 0.5) {
                const p = new ParticleEffect(pos, 30, '#bef264', 
                    {x: (Math.random()-0.5)*5, y: (Math.random()-0.5)*5}, 
                    0.8, ParticleBehavior.PHYSICS);
                engine.particles.push(p);
            }
        } 
        else {
            engine.shakeScreen(20);
            engine.audio.playExplosion();
            
            for(let i=0; i<40; i++) {
                const angle = Math.random() * Math.PI * 2;
                const speed = Math.random() * 8 + 2;
                const vel = { x: Math.cos(angle)*speed, y: Math.sin(angle)*speed };
                const color = Math.random() > 0.5 ? '#a3e635' : '#facc15'; 
                const p = new ParticleEffect(pos, 30, color, vel, 1.5, ParticleBehavior.PHYSICS);
                p.size = Math.random() * 5 + 3;
                engine.particles.push(p);
            }

            engine.particles.push(new Debris(pos, 40, 'rgba(255,255,255,0.4)', {x:-5, y:-5}, 20, 10));
            engine.particles.push(new Debris(pos, 40, 'rgba(255,255,255,0.4)', {x:5, y:-5}, 20, 10));
            engine.particles.push(new Debris(pos, 30, '#854d0e', {x:0, y:-8}, 15, 15));

            for(let i=0; i<8; i++) {
                 const p = new ParticleEffect(pos, 10, '#fef08a', 
                    {x:(Math.random()-0.5)*6, y:(Math.random()-0.5)*6}, 
                    2.0, ParticleBehavior.PHYSICS);
                 p.size = 4;
                 engine.particles.push(p);
            }

            engine.removeEntity(this.id);
             let bounty = this.moneyValue + Math.floor(engine.gameState.wave);
            engine.gameState.money += bounty;
            engine.spawnLootEffect(this.gridPos, bounty);
            engine.addFloatingText(`+$${bounty}`, this.gridPos, '#fbbf24', true);
        }
    }

    drawModel(ctx: CanvasRenderingContext2D, pos: Vector2) {
        const time = Date.now() / 200 + this.wobbleOffset;
        const hover = this.isDying ? 0 : Math.sin(time) * 5;
        const renderY = pos.y - 40 + hover;

        const isPhase1Death = this.isDying && this.deathTimer < 1500;
        
        // --- DRAW LEGS ---
        ctx.strokeStyle = '#713f12';
        ctx.lineWidth = 3;
        ctx.lineCap = 'round';
        
        this.legs.forEach((leg, i) => {
            const isLeft = i >= 2;
            const rootX = pos.x + (isLeft ? -10 : 10);
            const rootY = renderY + 5;
            
            const joint = solveTwoBoneIK(
                {x: rootX, y: rootY},
                leg.current,
                18, // Thigh
                22, // Shin
                isLeft // Flip knee
            );

            ctx.beginPath();
            ctx.moveTo(rootX, rootY);
            ctx.quadraticCurveTo(joint.x, joint.y - 5, joint.x, joint.y); // Curved thigh
            ctx.lineTo(leg.current.x, leg.current.y);
            ctx.stroke();
            
            // Claw foot
            ctx.fillStyle = '#422006';
            ctx.beginPath(); ctx.arc(leg.current.x, leg.current.y, 2, 0, Math.PI*2); ctx.fill();
        });

        // --- WINGS ---
        if (!this.isDying || isPhase1Death) {
            const flutter = Math.sin(Date.now()); 
            ctx.fillStyle = 'rgba(254, 240, 138, 0.4)'; 
            ctx.save();
            ctx.translate(pos.x, renderY - 10);
            
            ctx.save();
            ctx.scale(1, 0.2 + Math.abs(flutter)*0.8);
            ctx.beginPath();
            ctx.ellipse(-15, 0, 30, 10, -0.2, 0, Math.PI*2);
            ctx.fill();
            ctx.strokeStyle = 'rgba(255,255,255,0.5)'; ctx.stroke();
            ctx.restore();

            ctx.save();
            ctx.scale(1, 0.2 + Math.abs(flutter)*0.8);
            ctx.beginPath();
            ctx.ellipse(15, 0, 30, 10, 0.2, 0, Math.PI*2);
            ctx.fill();
             ctx.strokeStyle = 'rgba(255,255,255,0.5)'; ctx.stroke();
            ctx.restore();
            
            ctx.restore();
        }

        // --- ABDOMEN ---
        const pulse = this.isDying ? this.abdomenPulse : Math.sin(time * 2) * 2;
        const abWidth = 20 + pulse;
        const abHeight = 28 + pulse * 0.5;
        
        const gradAb = ctx.createRadialGradient(pos.x, renderY + 15, 0, pos.x, renderY + 15, abWidth);
        gradAb.addColorStop(0, '#facc15'); 
        gradAb.addColorStop(0.7, '#ca8a04'); 
        gradAb.addColorStop(1, '#854d0e'); 
        
        if (isPhase1Death && Math.floor(Date.now()/50)%2===0) {
             ctx.fillStyle = '#fff'; 
        } else {
             ctx.fillStyle = gradAb;
        }

        ctx.beginPath();
        ctx.ellipse(pos.x, renderY + 15, abWidth, abHeight, 0, 0, Math.PI*2);
        ctx.fill();
        
        ctx.fillStyle = 'rgba(0,0,0,0.3)';
        for(let i=0; i<3; i++) {
            const yOff = 5 + i * 8;
            ctx.beginPath();
            ctx.ellipse(pos.x, renderY + 15 + yOff, abWidth * 0.8, 3, 0, 0, Math.PI*2);
            ctx.fill();
        }

        // --- THORAX & HEAD ---
        ctx.fillStyle = '#422006'; 
        ctx.beginPath();
        ctx.ellipse(pos.x, renderY - 5, 12, 14, 0, 0, Math.PI*2);
        ctx.fill();
        
        const headY = renderY - 18;
        ctx.fillStyle = '#713f12';
        ctx.beginPath();
        ctx.arc(pos.x, headY, 9, 0, Math.PI*2);
        ctx.fill();
        
        ctx.fillStyle = '#a1a1aa';
        ctx.beginPath();
        ctx.moveTo(pos.x - 4, headY + 5); ctx.lineTo(pos.x - 2, headY + 12); ctx.lineTo(pos.x - 8, headY + 10);
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(pos.x + 4, headY + 5); ctx.lineTo(pos.x + 2, headY + 12); ctx.lineTo(pos.x + 8, headY + 10);
        ctx.fill();

        const eyeColor = '#ef4444';
        ctx.fillStyle = eyeColor;
        ctx.shadowColor = eyeColor;
        ctx.shadowBlur = 5;
        ctx.beginPath(); ctx.arc(pos.x - 4, headY - 2, 2, 0, Math.PI*2); ctx.fill();
        ctx.beginPath(); ctx.arc(pos.x + 4, headY - 2, 2, 0, Math.PI*2); ctx.fill();
        ctx.beginPath(); ctx.arc(pos.x, headY - 4, 1.5, 0, Math.PI*2); ctx.fill();
        ctx.shadowBlur = 0;
        
        ctx.fillStyle = '#a16207';
        ctx.beginPath();
        ctx.moveTo(pos.x, headY - 5);
        ctx.lineTo(pos.x - 8, headY - 15);
        ctx.lineTo(pos.x, headY - 10);
        ctx.lineTo(pos.x + 8, headY - 15);
        ctx.fill();
    }
}
