
import { EnemyVariant, Vector2, ParticleBehavior } from '../../../types';
import { BaseEnemy } from '../BaseEnemy';
import { GameEngine } from '../../GameEngine';
import { ParticleEffect } from '../../Particle';
import { SwarmEnemy } from '../minions/SwarmEnemy';

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
