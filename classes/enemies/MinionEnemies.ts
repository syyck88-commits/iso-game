
import { EnemyVariant, Vector2, ParticleBehavior } from '../../types';
import { BaseEnemy } from './BaseEnemy';
import { GameEngine } from '../GameEngine';
import { ParticleEffect, Debris } from '../Particle';
import { IKLeg, solveTwoBoneIK } from '../IK';

export class NormalEnemy extends BaseEnemy {
    walkTimer: number = 0;
    
    // IK System
    legs: IKLeg[] = [];
    initializedIK: boolean = false;

    constructor(path: Vector2[], wave: number) {
        super(path, wave, EnemyVariant.NORMAL);
        const baseHp = 30 + (wave * 10);
        this.maxHealth = baseHp;
        this.health = this.maxHealth;
        this.speed = 0.03 + (Math.min(20, wave) * 0.001);
        this.moneyValue = 15;
    }

    onUpdate(dt: number, engine: GameEngine) {
        this.walkTimer += dt;
        if (this.walkTimer > 300) {
            this.walkTimer = 0;
            if (Math.random() > 0.7) {
                 engine.spawnParticle(this.gridPos, 0, '#7f1d1d');
            }
        }
    }

    onDeathStart(engine: GameEngine) {
        super.onDeathStart(engine);
        const pos = engine.getScreenPos(this.gridPos.x, this.gridPos.y);
        
        for(let i=0; i<6; i++) {
            const angle = (Math.PI * 2 * i) / 6;
            const speed = 2 + Math.random() * 3;
            const vel = { x: Math.cos(angle) * speed, y: Math.sin(angle) * speed - 2 };
            engine.particles.push(new Debris(pos, this.zHeight + 5, '#5c1414', vel, 8, 2));
        }

        engine.particles.push(new Debris(pos, this.zHeight + 10, '#b91c1c', {x: 1, y: -4}, 12, 12));
        engine.particles.push(new Debris(pos, this.zHeight + 10, '#450a0a', {x: -1, y: -3}, 10, 8));

        this.opacity = 0;
    }

    onDeathUpdate(dt: number, engine: GameEngine) {
    }

    drawModel(ctx: CanvasRenderingContext2D, pos: Vector2) {
        if (this.opacity <= 0) return;

        // --- IK INITIALIZATION ---
        if (!this.initializedIK) {
            // 6 Legs
            for(let i=0; i<6; i++) {
                // Initialize legs at rough starting positions
                // 0,1,2 = Right side, 3,4,5 = Left side
                const isLeft = i > 2;
                const offsetX = isLeft ? -15 : 15;
                const offsetY = ((i % 3) - 1) * 10;
                this.legs.push(new IKLeg(pos.x + offsetX, pos.y + offsetY, 10, 10, 0.2));
            }
            this.initializedIK = true;
        }

        const bodyY = pos.y - 14;
        
        // --- UPDATE LEGS ---
        // Tripod Gait: Group A (0, 2, 4) and Group B (1, 3, 5) move alternately
        const isGroupAMoving = this.legs[0].isStepping || this.legs[2].isStepping || this.legs[4].isStepping;
        const isGroupBMoving = this.legs[1].isStepping || this.legs[3].isStepping || this.legs[5].isStepping;

        this.legs.forEach((leg, i) => {
            const isLeft = i > 2;
            const row = i % 3; // 0=Front, 1=Mid, 2=Back
            
            // Calculate ideal foot position relative to body
            const spreadX = isLeft ? -18 : 18;
            const spreadY = (row - 1) * 12 + 10; // +10 puts legs visually on "ground" below center
            
            const idealX = pos.x + spreadX;
            const idealY = bodyY + spreadY;

            // Gait Check
            const isGroupA = (i % 2) === 0;
            const canStep = isGroupA ? !isGroupBMoving : !isGroupAMoving;

            leg.update(idealX, idealY, canStep);

            // Draw Leg
            const rootX = pos.x + (isLeft ? -6 : 6);
            const rootY = bodyY; // Hip height
            
            const joint = solveTwoBoneIK(
                {x: rootX, y: rootY}, 
                leg.current, 
                12, // Thigh
                12, // Shin
                isLeft // Flip knee direction
            );

            ctx.strokeStyle = '#5c1414';
            ctx.lineWidth = 2;
            ctx.lineCap = 'round';
            ctx.beginPath();
            ctx.moveTo(rootX, rootY);
            ctx.lineTo(joint.x, joint.y);
            ctx.lineTo(leg.current.x, leg.current.y);
            ctx.stroke();
            
            // Foot dot
            ctx.fillStyle = '#450a0a';
            ctx.beginPath(); ctx.arc(leg.current.x, leg.current.y, 1.5, 0, Math.PI*2); ctx.fill();
        });

        // --- BODY ---
        ctx.fillStyle = '#450a0a';
        ctx.beginPath(); ctx.ellipse(pos.x, bodyY + 4, 8, 6, 0, 0, Math.PI*2); ctx.fill();

        const grad = ctx.createRadialGradient(pos.x - 2, bodyY - 5, 0, pos.x, bodyY, 12);
        grad.addColorStop(0, '#f87171');
        grad.addColorStop(0.6, '#b91c1c');
        grad.addColorStop(1, '#450a0a');
        ctx.fillStyle = grad;
        
        ctx.beginPath();
        ctx.moveTo(pos.x - 9, bodyY + 2);
        ctx.quadraticCurveTo(pos.x - 10, bodyY - 5, pos.x - 6, bodyY - 10);
        ctx.lineTo(pos.x + 6, bodyY - 10);
        ctx.quadraticCurveTo(pos.x + 10, bodyY - 5, pos.x + 9, bodyY + 2);
        ctx.quadraticCurveTo(pos.x, bodyY + 10, pos.x - 9, bodyY + 2);
        ctx.fill();

        const headY = bodyY - 8;
        ctx.fillStyle = '#334155';
        ctx.beginPath(); ctx.arc(pos.x, headY, 5, 0, Math.PI*2); ctx.fill();

        ctx.fillStyle = '#facc15';
        ctx.shadowColor = '#facc15'; ctx.shadowBlur = 5;
        ctx.beginPath(); ctx.rect(pos.x - 3, headY - 1, 6, 2); ctx.fill();
        ctx.shadowBlur = 0;
    }
}

export class FastEnemy extends BaseEnemy {
    exhaustTimer: number = 0;

    constructor(path: Vector2[], wave: number) {
        super(path, wave, EnemyVariant.FAST);
        const baseHp = 30 + (wave * 10);
        this.maxHealth = Math.floor(baseHp * 0.6);
        this.health = this.maxHealth;
        this.speed = (0.03 + (Math.min(20, wave) * 0.001)) * 1.8;
        this.moneyValue = 10;
        this.zHeight = 25; // Flying high
    }

    onUpdate(dt: number, engine: GameEngine) {
        // Engine Exhaust Trail
        this.exhaustTimer += dt;
        if (this.exhaustTimer > 50) {
            this.exhaustTimer = 0;
            const pos = engine.getScreenPos(this.gridPos.x, this.gridPos.y);
            const p = new ParticleEffect(
                {x: pos.x - 12, y: pos.y}, 
                this.zHeight, 
                'rgba(251, 146, 60, 0.6)', 
                {x: -1 - Math.random(), y: 0}, 
                0.4, 
                ParticleBehavior.FLOAT
            );
            p.size = 2;
            engine.particles.push(p);
        }
    }

    onDeathStart(engine: GameEngine) {
        super.onDeathStart(engine);
    }

    onDeathUpdate(dt: number, engine: GameEngine) {
        this.rotation += dt * 0.01;
        this.zHeight = Math.max(0, this.zHeight - dt * 0.03);
        this.gridPos.x += (Math.random()-0.5) * 0.1; 
        
        if (this.zHeight <= 0) {
            engine.spawnExplosion(this.gridPos, '#f97316');
            this.opacity = 0;
        }
    }

    drawModel(ctx: CanvasRenderingContext2D, pos: Vector2) {
        const time = Date.now();
        const floatY = pos.y - 5; 
        const zigzagX = Math.sin(time / 100) * 0.1;
        const tilt = Math.sin(time / 200) * 0.015;
        
        ctx.translate(zigzagX, 0);
        ctx.rotate(tilt);

        ctx.fillStyle = '#c2410c'; 
        ctx.beginPath();
        ctx.moveTo(pos.x + 15, floatY); 
        ctx.lineTo(pos.x - 10, floatY - 8); 
        ctx.lineTo(pos.x - 5, floatY); 
        ctx.lineTo(pos.x - 10, floatY + 8); 
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = '#60a5fa';
        ctx.beginPath();
        ctx.ellipse(pos.x + 2, floatY, 4, 2, 0, 0, Math.PI*2);
        ctx.fill();

        ctx.fillStyle = '#fff';
        ctx.shadowColor = '#f97316';
        ctx.shadowBlur = 10;
        ctx.fillRect(pos.x - 10, floatY - 2, 4, 4);
        ctx.shadowBlur = 0;
        
        ctx.rotate(-tilt);
        ctx.translate(-zigzagX, 0);
    }
}

export class TankEnemy extends BaseEnemy {
    dustTimer: number = 0;

    constructor(path: Vector2[], wave: number) {
        super(path, wave, EnemyVariant.TANK);
        const baseHp = 30 + (wave * 10);
        this.maxHealth = baseHp * 3;
        this.health = this.maxHealth;
        this.speed = (0.03 + (Math.min(20, wave) * 0.001)) * 0.6;
        this.moneyValue = 40;
    }

    onUpdate(dt: number, engine: GameEngine) {
        this.dustTimer += dt;
        if (this.dustTimer > 200) {
            this.dustTimer = 0;
            const pos = engine.getScreenPos(this.gridPos.x, this.gridPos.y);
            const p1 = new ParticleEffect({x: pos.x - 15, y: pos.y + 10}, 0, 'rgba(100,100,100,0.3)', {x:0,y:0}, 0.8, ParticleBehavior.FLOAT);
            const p2 = new ParticleEffect({x: pos.x + 15, y: pos.y + 10}, 0, 'rgba(100,100,100,0.3)', {x:0,y:0}, 0.8, ParticleBehavior.FLOAT);
            engine.particles.push(p1);
            engine.particles.push(p2);
        }
    }

    onDeathUpdate(dt: number, engine: GameEngine) {
        this.opacity = 1; 
        this.scale = 1;
        this.gridPos.x += (Math.random()-0.5) * 0.05;
        this.gridPos.y += (Math.random()-0.5) * 0.05;

        if (Math.random() > 0.5) {
             const pos = engine.getScreenPos(this.gridPos.x, this.gridPos.y);
             const p = new ParticleEffect(pos, 20, '#1f2937', {x:(Math.random()-0.5), y:-2}, 2.0, ParticleBehavior.FLOAT);
             p.size = 5;
             engine.particles.push(p);
        }

        if (this.deathTimer > 1000) {
             engine.spawnExplosion(this.gridPos, '#1f2937');
             this.opacity = 0;
        }
    }
    
    drawShadow(ctx: CanvasRenderingContext2D, pos: Vector2) {
        ctx.fillStyle = 'rgba(0,0,0,0.4)';
        ctx.beginPath(); ctx.ellipse(pos.x, pos.y, 20, 10, 0, 0, Math.PI*2); ctx.fill();
    }

    drawModel(ctx: CanvasRenderingContext2D, pos: Vector2) {
        const time = Date.now() / 200 + this.wobbleOffset;
        const rumble = this.isDying ? 0 : Math.sin(time * 5) * 1.5;
        const chassisY = pos.y - 14 - Math.abs(rumble);
        
        ctx.fillStyle = '#0f172a';
        ctx.beginPath();
        ctx.moveTo(pos.x - 22, chassisY + 8); ctx.lineTo(pos.x - 12, chassisY + 14);
        ctx.lineTo(pos.x - 12, chassisY + 4); ctx.lineTo(pos.x - 24, chassisY - 2);
        ctx.lineTo(pos.x - 24, chassisY + 6); ctx.fill();
        ctx.beginPath();
        ctx.moveTo(pos.x + 22, chassisY + 8); ctx.lineTo(pos.x + 12, chassisY + 14);
        ctx.lineTo(pos.x + 12, chassisY + 4); ctx.lineTo(pos.x + 24, chassisY - 2);
        ctx.lineTo(pos.x + 24, chassisY + 6); ctx.fill();

        const gradBody = ctx.createLinearGradient(pos.x - 10, chassisY - 10, pos.x + 10, chassisY + 10);
        gradBody.addColorStop(0, '#3f6212'); gradBody.addColorStop(1, '#1a2e05');
        ctx.fillStyle = gradBody;
        ctx.beginPath();
        ctx.moveTo(pos.x, chassisY + 12); ctx.lineTo(pos.x + 16, chassisY + 4);
        ctx.lineTo(pos.x + 16, chassisY - 6); ctx.lineTo(pos.x, chassisY - 10);
        ctx.lineTo(pos.x - 16, chassisY - 6); ctx.lineTo(pos.x - 16, chassisY + 4);
        ctx.closePath(); ctx.fill();

        const turretY = chassisY - 8;
        const scan = this.isDying ? time * 10 : Math.sin(time * 0.5) * 0.2;
        
        ctx.save();
        ctx.translate(pos.x, turretY);
        ctx.rotate(scan);
        
        ctx.fillStyle = '#14532d';
        ctx.beginPath(); ctx.ellipse(0, 0, 10, 8, 0, 0, Math.PI*2); ctx.fill();
        
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(-6, 2, 3, 16); 
        ctx.fillRect(3, 2, 3, 16);  
        
        ctx.restore();
    }
}

export class SwarmEnemy extends BaseEnemy {
    sparkTimer: number = 0;

    constructor(path: Vector2[], wave: number) {
        super(path, wave, EnemyVariant.SWARM);
        const baseHp = 30 + (wave * 10);
        this.maxHealth = Math.floor(baseHp * 0.25);
        this.health = this.maxHealth;
        this.speed = (0.03 + (Math.min(20, wave) * 0.001)) * 1.4;
        this.moneyValue = 5;
        this.zHeight = 15;
    }

    onUpdate(dt: number, engine: GameEngine) {
        this.sparkTimer += dt;
        if (this.sparkTimer > 300) {
            this.sparkTimer = 0;
            const pos = engine.getScreenPos(this.gridPos.x, this.gridPos.y);
            const p = new ParticleEffect(
                {x: pos.x, y: pos.y}, 
                this.zHeight, 
                '#fef08a', 
                {x: 0, y: 0}, 
                0.3, 
                ParticleBehavior.FLOAT
            );
            p.size = 1;
            engine.particles.push(p);
        }
    }

    onDeathUpdate(dt: number, engine: GameEngine) {
        if (this.deathTimer > 0) {
             const pos = engine.getScreenPos(this.gridPos.x, this.gridPos.y);
             for(let i=0; i<5; i++) {
                 const vel = { x: (Math.random()-0.5)*5, y: (Math.random()-0.5)*5 };
                 engine.particles.push(new ParticleEffect(pos, this.zHeight, '#eab308', vel, 0.4, ParticleBehavior.PHYSICS));
             }
             this.opacity = 0;
        }
    }

    drawModel(ctx: CanvasRenderingContext2D, pos: Vector2) {
        const time = Date.now() / 200 + this.wobbleOffset;
        const jitterX = Math.sin(time * 20) * 2; 
        
        ctx.fillStyle = '#facc15';
        for(let i=0; i<3; i++) {
            const t = time + i * 1.5;
            const ox = Math.sin(t) * 12 + Math.cos(t * 0.5) * 5 + jitterX;
            const oy = Math.cos(t * 0.8) * 6 - 5;
            
            ctx.save();
            ctx.translate(pos.x + ox, pos.y + oy);
            const flap = Math.sin(time * 30);
            
            ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
            ctx.beginPath(); ctx.ellipse(0, -2, 4, 1 + flap, 0, 0, Math.PI*2); ctx.fill();
            
            ctx.shadowColor = '#eab308';
            ctx.shadowBlur = 5;
            ctx.fillStyle = '#eab308';
            ctx.beginPath(); ctx.arc(0, 0, 2, 0, Math.PI*2); ctx.fill();
            ctx.shadowBlur = 0;
            
            ctx.restore();
        }
    }
}
