
import { EnemyVariant, Vector2 } from '../../../types';
import { BaseEnemy } from '../BaseEnemy';
import { GameEngine } from '../../GameEngine';
import { Debris } from '../../Particle';
import { IKLeg, solveTwoBoneIK } from '../../IK';

export class NormalEnemy extends BaseEnemy {
    walkTimer: number = 0;
    
    // IK System
    legs: IKLeg[] = [];
    legOffsets: Vector2[] = [];

    constructor(path: Vector2[], wave: number) {
        super(path, wave, EnemyVariant.NORMAL);
        const baseHp = 30 + (wave * 10);
        this.maxHealth = baseHp;
        this.health = this.maxHealth;
        this.speed = 0.03 + (Math.min(20, wave) * 0.001);
        this.moneyValue = 15;

        // Initialize Legs in Constructor
        // 6 Legs
        for(let i=0; i<6; i++) {
            // Randomized IK params for organic feel
            // Speed between 100ms and 150ms
            const speedVar = 110 + Math.random() * 40; 
            // Threshold variance
            const threshVar = 14 + Math.random() * 4;
            // Step height variance
            const heightVar = 12 + Math.random() * 5;

            this.legs.push(new IKLeg(0, 0, heightVar, threshVar, speedVar));
            
            // Randomize structural position offset per leg
            this.legOffsets.push({
                x: (Math.random() - 0.5) * 2,
                y: (Math.random() - 0.5) * 2
            });
        }
    }

    onUpdate(dt: number, engine: GameEngine) {
        this.walkTimer += dt;
        if (this.walkTimer > 300) {
            this.walkTimer = 0;
            if (Math.random() > 0.7) {
                 engine.spawnParticle(this.gridPos, 0, '#7f1d1d');
            }
        }

        // --- UPDATE IK LEGS (Logic Loop) ---
        const pos = engine.getScreenPos(this.gridPos.x, this.gridPos.y);
        const bodyY = pos.y - 14;

        // Determine normalized movement vector for "Leading" steps
        let dirX = 0;
        let dirY = 0;
        
        if (this.pathIndex < this.path.length - 1) {
            const next = this.path[this.pathIndex+1];
            const dx = next.x - this.gridPos.x;
            const dy = next.y - this.gridPos.y;
            
            // Convert grid delta to screen delta (approximate isometric projection)
            const sx = (dx - dy) * 26;
            const sy = (dx + dy) * 13;
            
            const len = Math.sqrt(sx*sx + sy*sy);
            if (len > 0.001) {
                dirX = sx / len;
                dirY = sy / len;
            }
        }

        const isGroupAMoving = this.legs[0].isStepping || this.legs[2].isStepping || this.legs[4].isStepping;
        const isGroupBMoving = this.legs[1].isStepping || this.legs[3].isStepping || this.legs[5].isStepping;

        this.legs.forEach((leg, i) => {
            const isLeft = i > 2;
            const row = i % 3; // 0=Front, 1=Mid, 2=Back
            
            // Calculate ideal foot position relative to body
            const spreadX = isLeft ? -18 : 18;
            const spreadY = (row - 1) * 12 + 10; // +10 puts legs visually on "ground" below center
            
            // Apply Lead based on row
            const leadDist = row === 0 ? 35 : (row === 1 ? 20 : 5);
            
            const leadX = dirX * leadDist;
            const leadY = dirY * leadDist;

            // Apply Random Offset (Structural Variation)
            const rndOffset = this.legOffsets[i];

            const idealX = pos.x + spreadX + leadX + rndOffset.x;
            const idealY = bodyY + spreadY + leadY + rndOffset.y;

            // Gait Check
            const isGroupA = (i % 2) === 0;
            const canStep = isGroupA ? !isGroupBMoving : !isGroupAMoving;

            leg.update(idealX, idealY, dt, canStep);
        });
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

        const bodyY = pos.y - 14;
        
        // --- DRAW LEGS ---
        this.legs.forEach((leg, i) => {
            const isLeft = i > 2;
            
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
