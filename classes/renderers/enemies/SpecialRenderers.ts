
import { Vector2 } from '../../../types';

export const drawSplitter = (ctx: CanvasRenderingContext2D, pos: Vector2, time: number) => {
    const bounce = Math.abs(Math.sin(time * 2)) * 3;
    const squish = Math.cos(time * 2) * 2;
    
    ctx.fillStyle = '#84cc16'; // Lime
    ctx.beginPath();
    // Irregular blob shape
    ctx.ellipse(pos.x, pos.y - 10 - bounce, 12 + squish, 10 - squish, 0, 0, Math.PI*2);
    ctx.fill();
    
    // Bubbles inside
    ctx.fillStyle = '#bef264';
    ctx.beginPath();
    ctx.arc(pos.x - 4, pos.y - 12 - bounce, 3, 0, Math.PI*2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(pos.x + 5, pos.y - 8 - bounce, 2, 0, Math.PI*2);
    ctx.fill();
};

export const drawHealer = (ctx: CanvasRenderingContext2D, pos: Vector2, time: number, isDying: boolean = false) => {
    // VISUAL UPDATE: Advanced Medical Drone
    // If dying, the hover fails and it shakes
    const hover = isDying ? Math.sin(time * 30) * 2 : Math.sin(time * 1.5) * 4;
    const floatY = pos.y - 25 + hover;
    
    // 1. Rotating Shield Segments
    // If dying, shields are gone (exploded off)
    if (!isDying) {
        ctx.save();
        ctx.translate(pos.x, floatY);
        ctx.rotate(time * 0.8);
        
        ctx.fillStyle = 'rgba(74, 222, 128, 0.4)';
        ctx.strokeStyle = '#4ade80';
        ctx.lineWidth = 1;
        
        for(let i=0; i<3; i++) {
            ctx.rotate((Math.PI * 2) / 3);
            ctx.beginPath();
            ctx.arc(14, 0, 4, 0, Math.PI*2);
            ctx.fill();
            ctx.stroke();
            
            // Energy tether to center
            ctx.beginPath();
            ctx.moveTo(10, 0);
            ctx.lineTo(4, 0);
            ctx.stroke();
        }
        ctx.restore();
    }

    // 2. Main Body (White Capsule)
    // Critical state flashes red/white
    if (isDying && Math.floor(time * 10) % 2 === 0) {
        ctx.fillStyle = '#fee2e2'; // Reddish white
    } else {
        ctx.fillStyle = '#f1f5f9'; // Slate 100
    }
    
    ctx.beginPath();
    ctx.ellipse(pos.x, floatY, 8, 10, 0, 0, Math.PI*2);
    ctx.fill();
    
    // 3. Tech Details
    ctx.fillStyle = '#0f172a'; // Dark slate
    ctx.fillRect(pos.x - 8, floatY - 2, 16, 4); // Belt
    
    // 4. Holographic Cross Projection
    if (!isDying) {
        ctx.save();
        ctx.translate(pos.x, floatY);
        const pulse = (Math.sin(time * 5) + 1) * 0.5; // 0 to 1
        const size = 1 + pulse * 0.2;
        ctx.scale(size, size);
        
        // Glow
        ctx.shadowColor = '#22c55e';
        ctx.shadowBlur = 10;
        
        ctx.fillStyle = '#22c55e';
        ctx.beginPath();
        ctx.rect(-3, -8, 6, 16);
        ctx.rect(-8, -3, 16, 6);
        ctx.fill();
        
        ctx.shadowBlur = 0;
        ctx.restore();
    } else {
        // Dying: Broken cross, flickering off
        if (Math.random() > 0.5) {
             ctx.fillStyle = '#166534'; // Dark green/broken
             ctx.fillRect(pos.x - 3, floatY - 8, 6, 16);
        }
    }
    
    // 5. Engine Thruster (Bottom)
    // Dying: Sputtering
    if (!isDying || Math.random() > 0.5) {
        ctx.fillStyle = isDying ? '#ef4444' : '#60a5fa'; // Red if failing
        ctx.globalAlpha = 0.8;
        ctx.beginPath();
        ctx.moveTo(pos.x - 4, floatY + 8);
        ctx.lineTo(pos.x + 4, floatY + 8);
        ctx.lineTo(pos.x, floatY + 14 + (Math.random() * 3));
        ctx.fill();
        ctx.globalAlpha = 1.0;
    }
};

export const drawMech = (ctx: CanvasRenderingContext2D, pos: Vector2, time: number) => {
    const legSpeed = time * 2;
    const lift = 10;
    const l1y = Math.max(0, Math.sin(legSpeed)) * lift;
    const l1x = Math.cos(legSpeed) * 5;
    const l2y = Math.max(0, Math.sin(legSpeed + Math.PI)) * lift;
    const l2x = Math.cos(legSpeed + Math.PI) * 5;
    ctx.fillStyle = '#334155';
    ctx.beginPath(); ctx.moveTo(pos.x - 8, pos.y - 15); ctx.lineTo(pos.x - 12 + l1x, pos.y - l1y);
    ctx.lineWidth = 4; ctx.strokeStyle = '#475569'; ctx.stroke();
    ctx.beginPath(); ctx.moveTo(pos.x + 8, pos.y - 15); ctx.lineTo(pos.x + 12 + l2x, pos.y - l2y); ctx.stroke();
    const bounce = Math.abs(Math.sin(legSpeed)) * 2;
    const bodyY = pos.y - 25 - bounce;
    const grad = ctx.createLinearGradient(pos.x - 10, bodyY - 10, pos.x + 10, bodyY + 10);
    grad.addColorStop(0, '#94a3b8'); grad.addColorStop(1, '#475569');
    ctx.fillStyle = grad; ctx.fillRect(pos.x - 12, bodyY - 10, 24, 20);
    ctx.fillStyle = '#38bdf8'; ctx.fillRect(pos.x - 5, bodyY - 5, 10, 6);
    ctx.fillStyle = '#1e293b'; ctx.fillRect(pos.x + 4, bodyY - 12, 12, 4); 
};

export const drawGhost = (ctx: CanvasRenderingContext2D, pos: Vector2, time: number) => {
    const floatY = pos.y - 30 + Math.sin(time) * 5;
    ctx.save(); ctx.globalAlpha = 0.8;
    const grad = ctx.createLinearGradient(pos.x, floatY - 20, pos.x, floatY + 20);
    grad.addColorStop(0, '#06b6d4'); grad.addColorStop(1, 'rgba(6, 182, 212, 0)');
    ctx.fillStyle = grad;
    ctx.beginPath(); ctx.moveTo(pos.x, floatY - 20); 
    ctx.bezierCurveTo(pos.x - 15, floatY - 20, pos.x - 15, floatY, pos.x - 10, floatY + 15);
    ctx.lineTo(pos.x, floatY + 20); ctx.lineTo(pos.x + 10, floatY + 15);
    ctx.bezierCurveTo(pos.x + 15, floatY, pos.x + 15, floatY - 20, pos.x, floatY - 20); ctx.fill();
    ctx.fillStyle = '#ecfeff'; ctx.globalAlpha = 1.0; ctx.beginPath();
    ctx.arc(pos.x - 4, floatY - 5, 2, 0, Math.PI*2); ctx.arc(pos.x + 4, floatY - 5, 2, 0, Math.PI*2); ctx.fill();
    ctx.restore();
};
