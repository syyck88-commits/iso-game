
import { EntityType, Vector2 } from '../../types';
import { BaseEntity } from '../BaseEntity';
import { GameEngine } from '../../GameEngine';

export class Bush extends BaseEntity {
    swaySpeed: number;
    swayOffset: number;
    leaves: {x: number, y: number, r: number, c: string}[];

    constructor(x: number, y: number) {
        super(EntityType.BUSH, x, y);
        this.swaySpeed = 2 + Math.random();
        this.swayOffset = Math.random() * 100;
        this.zHeight = 0;
        
        // Pre-generate leaf clusters
        this.leaves = [];
        const count = 3 + Math.floor(Math.random() * 3);
        const palette = ['#4ade80', '#22c55e', '#16a34a'];
        
        for(let i=0; i<count; i++) {
            this.leaves.push({
                x: (Math.random() - 0.5) * 10,
                y: (Math.random() - 0.5) * 6 - 4,
                r: 4 + Math.random() * 4,
                c: palette[Math.floor(Math.random() * palette.length)]
            });
        }
    }

    update(dt: number, engine: GameEngine) {}

    draw(ctx: CanvasRenderingContext2D, pos: Vector2) {
        const time = Date.now() / 1000;
        const sway = Math.sin(time * this.swaySpeed + this.swayOffset) * 1.5;
        const squash = Math.cos(time * this.swaySpeed * 2) * 0.5;

        // Shadow
        ctx.fillStyle = 'rgba(0,0,0,0.2)';
        ctx.beginPath();
        ctx.ellipse(pos.x, pos.y + 2, 10, 5, 0, 0, Math.PI*2);
        ctx.fill();

        ctx.save();
        ctx.translate(pos.x + sway, pos.y + squash);
        
        // Draw leaves
        this.leaves.forEach(leaf => {
            ctx.fillStyle = leaf.c;
            ctx.beginPath();
            ctx.arc(leaf.x, leaf.y, leaf.r, 0, Math.PI*2);
            ctx.fill();
            
            // Highlight
            ctx.fillStyle = 'rgba(255,255,255,0.1)';
            ctx.beginPath();
            ctx.arc(leaf.x - 1, leaf.y - 1, leaf.r * 0.5, 0, Math.PI*2);
            ctx.fill();
        });
        
        // Berry?
        if (this.swayOffset > 80) {
            ctx.fillStyle = '#ef4444';
            ctx.beginPath(); ctx.arc(-2, -5, 2, 0, Math.PI*2); ctx.fill();
            ctx.beginPath(); ctx.arc(4, -2, 1.5, 0, Math.PI*2); ctx.fill();
        }

        ctx.restore();
    }
}
