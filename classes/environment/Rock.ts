
import { EntityType, Vector2 } from '../../types';
import { BaseEntity } from '../BaseEntity';
import { GameEngine } from '../../GameEngine';

export class Rock extends BaseEntity {
    seed: number;
    scale: number;
    colorBase: string;
    colorDark: string;
    colorLight: string;

    constructor(x: number, y: number) {
        super(EntityType.ROCK, x, y);
        this.seed = Math.random();
        this.scale = 0.8 + Math.random() * 0.5;
        this.zHeight = 0;
        
        // Randomize stone color slightly
        if (Math.random() > 0.5) {
            this.colorBase = '#64748b'; // Slate 500
            this.colorDark = '#475569'; // Slate 600
            this.colorLight = '#94a3b8'; // Slate 400
        } else {
            this.colorBase = '#57534e'; // Stone 500
            this.colorDark = '#44403c'; // Stone 600
            this.colorLight = '#78716c'; // Stone 400
        }
    }

    update(dt: number, engine: GameEngine) {}

    draw(ctx: CanvasRenderingContext2D, pos: Vector2) {
        ctx.save();
        ctx.translate(pos.x, pos.y);
        ctx.scale(this.scale, this.scale);

        // Shadow
        ctx.fillStyle = 'rgba(0,0,0,0.3)';
        ctx.beginPath();
        ctx.ellipse(0, 2, 14, 7, 0, 0, Math.PI*2);
        ctx.fill();

        // Main Rock (Polygon)
        // We draw a "Low Poly" rock by drawing facets
        
        // Base shape
        ctx.fillStyle = this.colorDark;
        ctx.beginPath();
        ctx.moveTo(-10, 5);
        ctx.lineTo(8, 7);
        ctx.lineTo(12, 0);
        ctx.lineTo(5, -10);
        ctx.lineTo(-8, -8);
        ctx.closePath();
        ctx.fill();

        // Top Facet (Highlight)
        ctx.fillStyle = this.colorLight;
        ctx.beginPath();
        ctx.moveTo(-5, -2);
        ctx.lineTo(2, -5);
        ctx.lineTo(6, -2);
        ctx.lineTo(0, 2);
        ctx.closePath();
        ctx.fill();

        // Side Facet (Mid)
        ctx.fillStyle = this.colorBase;
        ctx.beginPath();
        ctx.moveTo(-8, -8);
        ctx.lineTo(-5, -2);
        ctx.lineTo(0, 2);
        ctx.lineTo(-10, 5);
        ctx.closePath();
        ctx.fill();
        
        // Right Facet
        ctx.fillStyle = this.colorBase;
        ctx.beginPath();
        ctx.moveTo(12, 0);
        ctx.lineTo(6, -2);
        ctx.lineTo(0, 2);
        ctx.lineTo(8, 7);
        ctx.closePath();
        ctx.fill();

        // Moss Detail (optional)
        if (this.seed > 0.6) {
            ctx.fillStyle = 'rgba(20, 83, 45, 0.6)'; // Moss green
            ctx.beginPath();
            ctx.ellipse(-2, -4, 3, 2, 0.2, 0, Math.PI*2);
            ctx.fill();
        }

        ctx.restore();
    }
}
