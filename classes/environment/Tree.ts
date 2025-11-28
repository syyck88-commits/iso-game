
import { EntityType, Vector2 } from '../../types';
import { BaseEntity } from '../BaseEntity';
import { GameEngine } from '../../GameEngine';

export class Tree extends BaseEntity {
    variant: number;
    swayOffset: number;
    scale: number;

    constructor(x: number, y: number) {
        super(EntityType.TREE, x, y);
        this.variant = Math.random();
        this.swayOffset = Math.random() * 100;
        this.scale = 0.8 + Math.random() * 0.4; // Varied height
        this.zHeight = 0;
    }

    update(dt: number, engine: GameEngine) {
        // Trees are static but animate in draw
    }

    draw(ctx: CanvasRenderingContext2D, pos: Vector2) {
        const time = Date.now() / 1000;
        // Wind effect: Sine wave based on time + spatial offset
        const wind = Math.sin(time + this.swayOffset + pos.x * 0.01) * 2;
        const trunkBaseY = pos.y;
        
        ctx.save();
        // Scale variance
        ctx.translate(pos.x, pos.y);
        ctx.scale(this.scale, this.scale);
        ctx.translate(-pos.x, -pos.y);

        // Shadow
        ctx.fillStyle = 'rgba(0,0,0,0.3)';
        ctx.beginPath();
        ctx.ellipse(pos.x, trunkBaseY, 10, 5, 0, 0, Math.PI*2);
        ctx.fill();

        // Trunk
        ctx.fillStyle = '#451a03'; // Dark Wood
        ctx.fillRect(pos.x - 2, trunkBaseY - 10, 4, 10);
        
        // Stylized Cone Layers (Low Poly Pine)
        const greenDark = '#14532d';
        const greenMid = '#166534';
        const greenLight = '#15803d';

        // Helper to draw a cone segment that skews with wind
        const drawCone = (yOffset: number, width: number, height: number, color: string, swayFactor: number) => {
            const currentSway = wind * swayFactor;
            
            ctx.fillStyle = color;
            ctx.beginPath();
            // Bottom corners
            ctx.moveTo(pos.x - width + currentSway * 0.5, trunkBaseY - yOffset); 
            ctx.lineTo(pos.x + width + currentSway * 0.5, trunkBaseY - yOffset); 
            // Top tip (sways more)
            ctx.lineTo(pos.x + currentSway, trunkBaseY - yOffset - height); 
            ctx.closePath();
            ctx.fill();
            
            // Highlight Side (Sun from left)
            ctx.fillStyle = 'rgba(255,255,255,0.05)';
            ctx.beginPath();
            ctx.moveTo(pos.x + currentSway, trunkBaseY - yOffset - height);
            ctx.lineTo(pos.x - width + currentSway * 0.5, trunkBaseY - yOffset);
            ctx.lineTo(pos.x + currentSway * 0.5, trunkBaseY - yOffset);
            ctx.fill();
        };

        // Stacked cones with increasing sway
        drawCone(8, 14, 18, greenDark, 0.5);
        drawCone(20, 12, 16, greenMid, 1.0);
        drawCone(32, 8, 14, greenLight, 1.5);
        
        ctx.restore();
    }
}
