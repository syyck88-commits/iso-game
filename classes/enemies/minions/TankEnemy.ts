
import { EnemyVariant, Vector2, ParticleBehavior } from '../../../types';
import { BaseEnemy } from '../BaseEnemy';
import { GameEngine } from '../../GameEngine';
import { ParticleEffect } from '../../Particle';

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
