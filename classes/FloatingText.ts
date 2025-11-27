import { EntityType, Vector2, GameObject } from '../types';
import { GameEngine } from './GameEngine';
import { generateId } from './BaseEntity';

export class FloatingText implements GameObject {
    id: string;
    type = EntityType.FLOATING_TEXT;
    gridPos: Vector2;
    zHeight: number;
    text: string;
    color: string;
    life: number = 1.0;
    offsetY: number = 0;
    isCrit: boolean = false;

    constructor(text: string, gridPos: Vector2, color: string, isCrit: boolean = false) {
        this.id = generateId();
        this.gridPos = { ...gridPos };
        this.zHeight = 60; // Start high
        this.text = text;
        this.color = color;
        this.isCrit = isCrit;
    }

    get depth() { return 99999; } // UI layer

    update(dt: number, engine: GameEngine) {
        this.life -= dt * 0.001; // Fix: scale to seconds
        this.offsetY -= this.isCrit ? 0.8 : 0.5; // Float up
        if (this.life <= 0) engine.removeEntity(this.id);
    }

    draw(ctx: CanvasRenderingContext2D, screenPos: Vector2) {
        ctx.save();
        const alpha = Math.max(0, this.life);
        ctx.globalAlpha = alpha;
        
        // Scale effect on spawn
        let scale = 1.0;
        if (this.life > 0.8) {
            scale = 1 + (this.life - 0.8) * 2; // Pop out
        }

        ctx.font = this.isCrit ? '900 24px monospace' : 'bold 16px monospace';
        ctx.textAlign = 'center';
        
        // Glow
        ctx.shadowColor = this.color;
        ctx.shadowBlur = this.isCrit ? 10 : 0;
        
        ctx.translate(screenPos.x, screenPos.y + this.offsetY - this.zHeight);
        ctx.scale(scale, scale);
        
        // Stroke for readability
        ctx.strokeStyle = 'black';
        ctx.lineWidth = 3;
        ctx.strokeText(this.text, 0, 0);
        
        ctx.fillStyle = this.color;
        ctx.fillText(this.text, 0, 0);
        
        ctx.restore();
    }
}