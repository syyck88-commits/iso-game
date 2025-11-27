

import { EnemyVariant, Vector2 } from '../../types';
import { BaseEnemy } from './BaseEnemy';
import { GameEngine } from '../GameEngine';

export class BossEnemy extends BaseEnemy {
     constructor(path: Vector2[], wave: number, variant: EnemyVariant, hpMult: number, speedMult: number, bounty: number) {
        super(path, wave, variant);
        const baseHp = 30 + (wave * 10);
        this.maxHealth = Math.floor(baseHp * hpMult);
        this.health = this.maxHealth;
        this.speed = (0.03 + (Math.min(20, wave) * 0.001)) * speedMult;
        this.moneyValue = bounty;
    }
    
    drawShadow(ctx: CanvasRenderingContext2D, pos: Vector2) {
        // Boss shadow is larger. 'pos' is ground-projected by BaseEnemy.draw call.
        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        ctx.beginPath(); 
        ctx.ellipse(pos.x, pos.y, 35, 17, 0, 0, Math.PI*2); 
        ctx.fill();
    }

    drawModel(ctx: CanvasRenderingContext2D, pos: Vector2) {}
}
