
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
        const trunkBaseY = pos.y;
        
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

        const drawCone = (yOffset: number, width: number, height: number, color: string) => {
            ctx.fillStyle = color;
            ctx.beginPath();
            ctx.moveTo(pos.x - width + sway * (yOffset/50), trunkBaseY - yOffset); // Bottom Left
            ctx.lineTo(pos.x + width + sway * (yOffset/50), trunkBaseY - yOffset); // Bottom Right
            ctx.lineTo(pos.x + sway * ((yOffset+height)/50), trunkBaseY - yOffset - height); // Top Center
            ctx.closePath();
            ctx.fill();
            
            // Highlight Side
            ctx.fillStyle = 'rgba(255,255,255,0.1)';
            ctx.beginPath();
            ctx.moveTo(pos.x + sway * ((yOffset+height)/50), trunkBaseY - yOffset - height);
            ctx.lineTo(pos.x + width + sway * (yOffset/50), trunkBaseY - yOffset);
            ctx.lineTo(pos.x + sway * (yOffset/50), trunkBaseY - yOffset);
            ctx.fill();
        };

        // Stacked cones
        drawCone(10, 12, 15, greenDark);
        drawCone(20, 10, 15, greenMid);
        drawCone(30, 8, 15, greenLight);
    }
}
