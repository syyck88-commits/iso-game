import { EntityType, Vector2 } from '../types';
import { BaseEntity } from './BaseEntity';
import { GameEngine } from './GameEngine';

export class Tree extends BaseEntity {
    variant: number;
    swayOffset: number;

    constructor(x: number, y: number) {
        super(EntityType.TREE, x, y);
        this.variant = Math.random();
        this.swayOffset = Math.random() * 100;
        this.zHeight = 0;
    }

    update(dt: number, engine: GameEngine) {
        // Static mostly
    }

    draw(ctx: CanvasRenderingContext2D, pos: Vector2) {
        const sway = Math.sin((Date.now() / 1000) + this.swayOffset) * 2;
        
        // Trunk
        ctx.fillStyle = '#451a03';
        ctx.fillRect(pos.x - 2, pos.y - 10, 4, 10);

        // Leaves (3 layers)
        const greenBase = this.variant > 0.5 ? 120 : 140; // Variation in hue
        
        ctx.fillStyle = `hsl(${greenBase}, 60%, 35%)`;
        ctx.beginPath();
        ctx.arc(pos.x + sway * 0.5, pos.y - 15, 12, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = `hsl(${greenBase + 10}, 60%, 40%)`;
        ctx.beginPath();
        ctx.arc(pos.x + sway * 0.7, pos.y - 22, 10, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.fillStyle = `hsl(${greenBase + 20}, 70%, 45%)`;
        ctx.beginPath();
        ctx.arc(pos.x + sway, pos.y - 28, 7, 0, Math.PI * 2);
        ctx.fill();
        
        // Shadow (simple)
        ctx.fillStyle = 'rgba(0,0,0,0.2)';
        ctx.beginPath();
        ctx.ellipse(pos.x, pos.y, 8, 4, 0, 0, Math.PI*2);
        ctx.fill();
    }
}