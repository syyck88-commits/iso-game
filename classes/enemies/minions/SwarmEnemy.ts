
import { EnemyVariant, Vector2, ParticleBehavior } from '../../../types';
import { BaseEnemy } from '../BaseEnemy';
import { GameEngine } from '../../GameEngine';
import { ParticleEffect } from '../../Particle';

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
