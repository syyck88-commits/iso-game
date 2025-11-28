
import { EntityType, Vector2 } from '../../types';
import { BaseEntity } from '../BaseEntity';
import { GameEngine } from '../../GameEngine';

export class Crystal extends BaseEntity {
    pulseSpeed: number;
    color: string;
    glowColor: string;

    constructor(x: number, y: number) {
        super(EntityType.CRYSTAL, x, y);
        this.pulseSpeed = 1 + Math.random();
        
        if (Math.random() > 0.5) {
            this.color = '#c084fc'; // Purple
            this.glowColor = '#a855f7';
        } else {
            this.color = '#22d3ee'; // Cyan
            this.glowColor = '#06b6d4';
        }
        this.zHeight = 0;
    }

    update(dt: number, engine: GameEngine) {}

    draw(ctx: CanvasRenderingContext2D, pos: Vector2) {
        const time = Date.now() / 500;
        const pulse = Math.sin(time * this.pulseSpeed); // -1 to 1
        const lift = (pulse + 1) * 2; // 0 to 4
        
        // Glow (Ground)
        ctx.globalCompositeOperation = 'lighter';
        ctx.fillStyle = this.glowColor;
        ctx.globalAlpha = 0.2 + (pulse * 0.1);
        ctx.beginPath();
        ctx.ellipse(pos.x, pos.y, 15, 8, 0, 0, Math.PI*2);
        ctx.fill();
        ctx.globalCompositeOperation = 'source-over';
        ctx.globalAlpha = 1.0;

        // Crystal Cluster
        const drawShard = (ox: number, oy: number, w: number, h: number, angle: number) => {
            ctx.save();
            ctx.translate(pos.x + ox, pos.y + oy - lift);
            ctx.rotate(angle);
            
            ctx.fillStyle = this.color;
            ctx.beginPath();
            ctx.moveTo(0, -h); // Tip
            ctx.lineTo(w, 0); // Right
            ctx.lineTo(0, w*0.5); // Bottom
            ctx.lineTo(-w, 0); // Left
            ctx.closePath();
            ctx.fill();
            
            // Facet highlight
            ctx.fillStyle = 'rgba(255,255,255,0.4)';
            ctx.beginPath();
            ctx.moveTo(0, -h);
            ctx.lineTo(w, 0);
            ctx.lineTo(0, 0);
            ctx.fill();
            
            ctx.restore();
        };

        // Main Shard
        drawShard(0, 0, 6, 20, 0);
        // Side Shards
        drawShard(-5, 2, 4, 12, -0.3);
        drawShard(6, 1, 3, 10, 0.4);
    }
}
