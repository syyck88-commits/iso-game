
import { EnemyVariant, Vector2, ParticleBehavior } from '../../../types';
import { BaseEnemy } from '../BaseEnemy';
import { GameEngine } from '../../GameEngine';
import { ParticleEffect } from '../../Particle';

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
