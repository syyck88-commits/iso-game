
import { Vector2 } from '../../../types';

export const drawBossMk1 = (ctx: CanvasRenderingContext2D, pos: Vector2, time: number) => {
    const step = Math.abs(Math.sin(time));
    const bodyY = pos.y - 30 - step * 2;
    
    // Body (Blocky)
    ctx.fillStyle = '#78350f'; // Dark Brown
    ctx.fillRect(pos.x - 20, bodyY - 20, 40, 40);
    
    // Shoulders
    ctx.fillStyle = '#92400e';
    ctx.fillRect(pos.x - 25, bodyY - 25, 15, 20);
    ctx.fillRect(pos.x + 10, bodyY - 25, 15, 20);
    
    // Glowing Core
    ctx.fillStyle = '#f97316'; // Orange lava
    ctx.beginPath();
    ctx.moveTo(pos.x - 5, bodyY - 5);
    ctx.lineTo(pos.x + 5, bodyY - 5);
    ctx.lineTo(pos.x, bodyY + 10);
    ctx.fill();
};

export const drawBossMk2 = (ctx: CanvasRenderingContext2D, pos: Vector2, time: number) => {
    const t = time * 2;
    const floatY = pos.y - 35;
    
    // Abdomen (Pulsing)
    const pulse = Math.sin(t) * 2;
    ctx.fillStyle = '#facc15';
    ctx.beginPath();
    ctx.ellipse(pos.x, floatY + 10, 15 + pulse, 20, 0, 0, Math.PI*2);
    ctx.fill();
    // Stripes
    ctx.fillStyle = '#000';
    ctx.fillRect(pos.x - 10, floatY + 5, 20, 2);
    ctx.fillRect(pos.x - 12, floatY + 12, 24, 2);
    
    // Head
    ctx.fillStyle = '#854d0e';
    ctx.beginPath();
    ctx.arc(pos.x, floatY - 15, 10, 0, Math.PI*2);
    ctx.fill();
    
    // Wings (Fast flutter)
    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    const wingW = 30 * Math.abs(Math.cos(time * 10));
    ctx.beginPath();
    ctx.ellipse(pos.x - 10, floatY - 5, wingW, 5, -0.5, 0, Math.PI*2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(pos.x + 10, floatY - 5, wingW, 5, 0.5, 0, Math.PI*2);
    ctx.fill();
};

export const drawBossMk3 = (ctx: CanvasRenderingContext2D, pos: Vector2, time: number) => {
    const floatY = pos.y - 50 + Math.sin(time * 0.5) * 8;
    
    // Cloak
    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.moveTo(pos.x, floatY - 30); // Hood tip
    ctx.quadraticCurveTo(pos.x - 25, floatY, pos.x - 20, floatY + 40); // L side
    ctx.lineTo(pos.x, floatY + 30);
    ctx.lineTo(pos.x + 20, floatY + 40); // R side
    ctx.quadraticCurveTo(pos.x + 25, floatY, pos.x, floatY - 30);
    ctx.fill();
    
    // Scythe
    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(pos.x + 15, floatY + 20);
    ctx.lineTo(pos.x + 25, floatY - 20);
    ctx.stroke();
    
    ctx.fillStyle = '#a855f7'; // Purple Blade
    ctx.beginPath();
    ctx.arc(pos.x + 25, floatY - 20, 15, 3, 5);
    ctx.lineTo(pos.x + 25, floatY - 20);
    ctx.fill();
    
    // Eyes
    ctx.fillStyle = '#d8b4fe';
    ctx.shadowColor = '#a855f7';
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.arc(pos.x - 5, floatY - 10, 3, 0, Math.PI*2);
    ctx.arc(pos.x + 5, floatY - 10, 3, 0, Math.PI*2);
    ctx.fill();
    ctx.shadowBlur = 0;
};

export const drawBossFinal = (ctx: CanvasRenderingContext2D, pos: Vector2, time: number) => {
    const floatY = pos.y - 60;
    
    // Black Hole Center
    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.arc(pos.x, floatY, 25, 0, Math.PI*2);
    ctx.fill();
    
    // Accretion Disk
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    
    for(let i=0; i<3; i++) {
        ctx.save();
        ctx.translate(pos.x, floatY);
        ctx.rotate(time * (1 + i*0.5));
        ctx.beginPath();
        ctx.ellipse(0, 0, 35 + i*10, 10 + i*5, i, 0, Math.PI*2);
        ctx.strokeStyle = i === 0 ? '#ef4444' : (i === 1 ? '#f59e0b' : '#3b82f6');
        ctx.stroke();
        ctx.restore();
    }
    
    // Red Eyes in the dark
    const flicker = Math.random() > 0.9 ? 0 : 1;
    if (flicker) {
        ctx.fillStyle = '#ef4444';
        ctx.shadowColor = '#ef4444';
        ctx.shadowBlur = 20;
        ctx.beginPath();
        ctx.arc(pos.x - 8, floatY - 5, 4, 0, Math.PI*2);
        ctx.arc(pos.x + 8, floatY - 5, 4, 0, Math.PI*2);
        ctx.fill();
        ctx.shadowBlur = 0;
    }
};
