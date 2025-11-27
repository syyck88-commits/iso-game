
import { Vector2 } from '../../../types';

// --- HELPERS ---
const drawInsectLeg = (ctx: CanvasRenderingContext2D, rootX: number, rootY: number, len: number, angle: number, color: string) => {
    const kneeX = rootX + Math.cos(angle) * (len * 0.5);
    const kneeY = rootY + Math.sin(angle) * (len * 0.5) - 4; // Knee goes up
    const footX = rootX + Math.cos(angle) * len;
    const footY = rootY + Math.sin(angle) * len * 0.8 + 2; // Foot hits ground

    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(rootX, rootY);
    ctx.lineTo(kneeX, kneeY);
    ctx.lineTo(footX, footY);
    ctx.stroke();
};

export const drawNormal = (ctx: CanvasRenderingContext2D, pos: Vector2, time: number) => {
    // Animation vars
    const t = time * 2; // Speed up animation relative to game time
    const bounce = Math.abs(Math.sin(t * 2)) * 3;
    const bodyY = pos.y - 14 - bounce;
    
    // Colors
    const colorDark = '#7f1d1d';
    const colorMain = '#dc2626';
    const colorHighlight = '#f87171';
    const colorMetal = '#334155';
    const colorGlow = '#facc15';

    // --- LEGS (6 legs for insect look) ---
    // Draw back legs first (darker)
    for(let i=0; i<3; i++) {
        // Right side (Back)
        const offset = i * 2; // Leg spacing
        const phase = i % 2 === 0 ? t : t + Math.PI; // Alternating gait
        const angleBase = 0.5 + (i * 0.4); // Spread out angles
        const legSweep = Math.sin(phase) * 0.3;
        
        drawInsectLeg(ctx, pos.x + 4, bodyY, 14, angleBase + legSweep, '#5c1414');
        
        // Left side (Back)
        drawInsectLeg(ctx, pos.x - 4, bodyY, 14, Math.PI - angleBase - legSweep, '#5c1414');
    }

    // --- LOWER BODY (Abdomen) ---
    ctx.fillStyle = colorDark;
    ctx.beginPath();
    ctx.ellipse(pos.x, bodyY + 2, 8, 6, 0, 0, Math.PI*2);
    ctx.fill();

    // --- UPPER BODY (Carapace / Armor) ---
    // Main shell
    const grad = ctx.createRadialGradient(pos.x - 2, bodyY - 5, 0, pos.x, bodyY, 12);
    grad.addColorStop(0, colorHighlight);
    grad.addColorStop(0.5, colorMain);
    grad.addColorStop(1, colorDark);
    
    ctx.fillStyle = grad;
    ctx.beginPath();
    // Shield shape
    ctx.moveTo(pos.x - 8, bodyY + 2);
    ctx.quadraticCurveTo(pos.x - 10, bodyY - 5, pos.x - 6, bodyY - 10); // Left shoulder
    ctx.lineTo(pos.x + 6, bodyY - 10); // Neck
    ctx.quadraticCurveTo(pos.x + 10, bodyY - 5, pos.x + 8, bodyY + 2); // Right shoulder
    ctx.quadraticCurveTo(pos.x, bodyY + 8, pos.x - 8, bodyY + 2); // Bottom curve
    ctx.fill();

    // Armor Segmentation lines
    ctx.strokeStyle = 'rgba(0,0,0,0.3)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(pos.x - 9, bodyY - 2);
    ctx.quadraticCurveTo(pos.x, bodyY + 2, pos.x + 9, bodyY - 2);
    ctx.stroke();

    // --- HEAD ---
    const headY = bodyY - 8;
    ctx.fillStyle = colorMetal;
    ctx.beginPath();
    ctx.arc(pos.x, headY, 5, 0, Math.PI*2);
    ctx.fill();

    // Visor / Eye
    ctx.fillStyle = colorGlow;
    ctx.shadowColor = colorGlow;
    ctx.shadowBlur = 5;
    ctx.beginPath();
    ctx.rect(pos.x - 3, headY - 1, 6, 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    // Mandibles
    ctx.fillStyle = '#94a3b8';
    ctx.beginPath();
    ctx.moveTo(pos.x - 2, headY + 3);
    ctx.lineTo(pos.x - 4, headY + 7);
    ctx.lineTo(pos.x - 1, headY + 5);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(pos.x + 2, headY + 3);
    ctx.lineTo(pos.x + 4, headY + 7);
    ctx.lineTo(pos.x + 1, headY + 5);
    ctx.fill();

    // --- FRONT LEGS (Lighter) ---
    ctx.fillStyle = '#9ca3af';
    for(let i=0; i<3; i++) {
        const offset = i * 2;
        const phase = i % 2 === 0 ? t : t + Math.PI;
        const angleBase = 0.5 + (i * 0.4);
        const legSweep = Math.sin(phase) * 0.3;
        
        // Right Knee Highlight
        const rAngle = angleBase + legSweep;
        const rx = pos.x + 4 + Math.cos(rAngle) * 7;
        const ry = bodyY + Math.sin(rAngle) * 7 - 4;
        ctx.beginPath(); ctx.arc(rx, ry, 1, 0, Math.PI*2); ctx.fill();

         // Left Knee Highlight
        const lAngle = Math.PI - angleBase - legSweep;
        const lx = pos.x - 4 + Math.cos(lAngle) * 7;
        const ly = bodyY + Math.sin(lAngle) * 7 - 4;
        ctx.beginPath(); ctx.arc(lx, ly, 1, 0, Math.PI*2); ctx.fill();
    }
    
    // Engine Glow (Backpack)
    const engineIntensity = (Math.sin(t * 10) + 1) * 0.5; // Flicker
    ctx.fillStyle = `rgba(248, 113, 113, ${0.5 + engineIntensity * 0.5})`;
    ctx.globalCompositeOperation = 'lighter';
    ctx.beginPath();
    ctx.arc(pos.x, bodyY - 6, 2, 0, Math.PI*2);
    ctx.fill();
    ctx.globalCompositeOperation = 'source-over';
};

export const drawFast = (ctx: CanvasRenderingContext2D, pos: Vector2, time: number) => {
    const floatY = pos.y - 20;
    // Aerodynamic shape
    ctx.fillStyle = 'rgba(251, 146, 60, 0.6)'; ctx.beginPath();
    ctx.moveTo(pos.x, floatY); ctx.lineTo(pos.x - 15, floatY - 5); ctx.lineTo(pos.x - 15, floatY + 5); ctx.fill();
    
    // Core
    ctx.fillStyle = '#f59e0b'; 
    ctx.beginPath(); 
    ctx.moveTo(pos.x + 12, floatY); // Nose
    ctx.lineTo(pos.x - 8, floatY - 6); // Wing L
    ctx.lineTo(pos.x - 4, floatY); // Tail
    ctx.lineTo(pos.x - 8, floatY + 6); // Wing R
    ctx.closePath(); 
    ctx.fill();

    // Engine Trail
    ctx.fillStyle = '#fff'; 
    ctx.fillRect(pos.x - 10, floatY - 1, 4, 2);
    
    // Speed lines
    if (Math.random() > 0.5) {
        ctx.strokeStyle = 'rgba(255,255,255,0.5)';
        ctx.beginPath();
        ctx.moveTo(pos.x - 15, floatY - 3);
        ctx.lineTo(pos.x - 25, floatY - 3);
        ctx.stroke();
    }
};

export const drawTank = (ctx: CanvasRenderingContext2D, pos: Vector2, time: number) => {
    // "Heavy Siege Platform" - Visual Style
    
    // Heavy suspension movement
    const rumble = Math.sin(time * 5) * 1.5;
    const chassisY = pos.y - 14 - Math.abs(rumble);
    
    // Colors
    const cTreadDark = '#0f172a';
    const cTreadLight = '#475569';
    const cArmorDark = '#14532d';
    const cArmorMid = '#166534';
    const cArmorLight = '#4ade80'; // Highlights
    const cBarrel = '#1e293b';

    // Animation for tracks
    const treadSpeed = time * 20;
    const treadOffset = treadSpeed % 6; 

    const drawTreadSide = (offsetX: number, flip: boolean) => {
        // Main Tread Shape
        ctx.fillStyle = cTreadDark;
        ctx.beginPath();
        if (!flip) {
            ctx.moveTo(pos.x - 22 + offsetX, chassisY + 8);
            ctx.lineTo(pos.x - 12 + offsetX, chassisY + 14); // Front bottom
            ctx.lineTo(pos.x - 12 + offsetX, chassisY + 4);  // Front top
            ctx.lineTo(pos.x - 24 + offsetX, chassisY - 2);  // Back top
            ctx.lineTo(pos.x - 24 + offsetX, chassisY + 6);  // Back bottom
        } else {
            ctx.moveTo(pos.x + 22 + offsetX, chassisY + 8);
            ctx.lineTo(pos.x + 12 + offsetX, chassisY + 14);
            ctx.lineTo(pos.x + 12 + offsetX, chassisY + 4);
            ctx.lineTo(pos.x + 24 + offsetX, chassisY - 2);
            ctx.lineTo(pos.x + 24 + offsetX, chassisY + 6);
        }
        ctx.fill();

        // Moving Tread Links
        ctx.strokeStyle = cTreadLight;
        ctx.lineWidth = 1;
        ctx.beginPath();

        // Calculate path for dashes
        // We simulate this by drawing short lines along the top and bottom edges
        // Top Edge
        const startTopX = !flip ? pos.x - 24 + offsetX : pos.x + 12 + offsetX;
        const startTopY = !flip ? chassisY - 2 : chassisY + 4;
        const endTopX   = !flip ? pos.x - 12 + offsetX : pos.x + 24 + offsetX;
        const endTopY   = !flip ? chassisY + 4 : chassisY - 2;
        
        // Bottom Edge
        const startBotX = !flip ? pos.x - 24 + offsetX : pos.x + 12 + offsetX;
        const startBotY = !flip ? chassisY + 6 : chassisY + 14;
        const endBotX   = !flip ? pos.x - 12 + offsetX : pos.x + 24 + offsetX;
        const endBotY   = !flip ? chassisY + 14 : chassisY + 6;

        const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

        // Draw Links
        for (let i = 0; i < 5; i++) {
            const t = ((i * 1.5) + treadOffset) % 6 / 6;
            
            // Top Tread Link
            const tx = lerp(startTopX, endTopX, t);
            const ty = lerp(startTopY, endTopY, t);
            ctx.moveTo(tx, ty);
            ctx.lineTo(tx, ty + 2); // Small vertical lug
            
            // Bottom Tread Link (moves opposite direction visually if rotating, but here linear for simplicity)
            const bx = lerp(endBotX, startBotX, t); // Reverse direction for bottom return
            const by = lerp(endBotY, startBotY, t);
            ctx.moveTo(bx, by);
            ctx.lineTo(bx, by - 2);
        }
        ctx.stroke();

        // Wheels inside treads (Detail) - Rotate them
        ctx.fillStyle = '#020617';
        for(let i=0; i<3; i++) {
            const wheelX = !flip ? pos.x - 20 + offsetX + (i*4) : pos.x + 20 + offsetX - (i*4);
            const wheelY = chassisY + 6 + (i*2);
            
            ctx.beginPath(); ctx.arc(wheelX, wheelY, 2, 0, Math.PI*2); ctx.fill();
            
            // Spoke
            ctx.strokeStyle = '#334155';
            ctx.lineWidth = 1;
            ctx.beginPath();
            const rot = time * -5;
            ctx.moveTo(wheelX + Math.cos(rot)*2, wheelY + Math.sin(rot)*2);
            ctx.lineTo(wheelX - Math.cos(rot)*2, wheelY - Math.sin(rot)*2);
            ctx.stroke();
        }
    };

    // Draw Left Tread
    drawTreadSide(0, false);
    
    // Draw Right Tread
    drawTreadSide(0, true);

    // Tread Protectors (Armor over wheels)
    ctx.fillStyle = cArmorMid;
    ctx.beginPath(); // Left
    ctx.moveTo(pos.x - 24, chassisY - 4);
    ctx.lineTo(pos.x - 10, chassisY + 3);
    ctx.lineTo(pos.x - 10, chassisY + 8);
    ctx.lineTo(pos.x - 24, chassisY + 2);
    ctx.fill();
    ctx.beginPath(); // Right
    ctx.moveTo(pos.x + 24, chassisY - 4);
    ctx.lineTo(pos.x + 10, chassisY + 3);
    ctx.lineTo(pos.x + 10, chassisY + 8);
    ctx.lineTo(pos.x + 24, chassisY + 2);
    ctx.fill();

    // --- CHASSIS (Main Body) ---
    const gradBody = ctx.createLinearGradient(pos.x - 10, chassisY - 10, pos.x + 10, chassisY + 10);
    gradBody.addColorStop(0, '#3f6212');
    gradBody.addColorStop(1, '#1a2e05');
    ctx.fillStyle = gradBody;
    
    ctx.beginPath();
    ctx.moveTo(pos.x, chassisY + 12); // Front Tip
    ctx.lineTo(pos.x + 16, chassisY + 4); // Right Front
    ctx.lineTo(pos.x + 16, chassisY - 6); // Right Back
    ctx.lineTo(pos.x, chassisY - 10); // Back center
    ctx.lineTo(pos.x - 16, chassisY - 6); // Left Back
    ctx.lineTo(pos.x - 16, chassisY + 4); // Left Front
    ctx.closePath();
    ctx.fill();

    // Reactive Armor Plates (Detail)
    ctx.fillStyle = 'rgba(255,255,255,0.1)';
    ctx.beginPath(); // Front Glacis
    ctx.moveTo(pos.x, chassisY + 10);
    ctx.lineTo(pos.x + 12, chassisY + 3);
    ctx.lineTo(pos.x, chassisY - 2);
    ctx.lineTo(pos.x - 12, chassisY + 3);
    ctx.fill();
    
    // --- TURRET ---
    const turretY = chassisY - 8;
    // Turret rotation (Slow scanning)
    const scan = Math.sin(time * 0.5) * 0.2; // +/- radians
    
    ctx.save();
    ctx.translate(pos.x, turretY);
    ctx.rotate(scan); // Scan rotation

    // Turret Base
    ctx.fillStyle = cArmorDark;
    ctx.beginPath();
    ctx.ellipse(0, 0, 10, 8, 0, 0, Math.PI*2);
    ctx.fill();
    
    // Turret Top
    const gradTurret = ctx.createLinearGradient(-8, -8, 8, 8);
    gradTurret.addColorStop(0, cArmorMid);
    gradTurret.addColorStop(1, cArmorDark);
    ctx.fillStyle = gradTurret;
    ctx.beginPath();
    ctx.moveTo(-8, 4);
    ctx.lineTo(8, 4);
    ctx.lineTo(10, -5);
    ctx.lineTo(-10, -5);
    ctx.closePath();
    ctx.fill();
    
    // Highlight edge
    ctx.strokeStyle = cArmorLight;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(-10, -5); ctx.lineTo(10, -5);
    ctx.stroke();

    // DUAL CANNONS
    ctx.fillStyle = cBarrel;
    const recoil = Math.max(0, Math.sin(time * 8)); // Random recoil feel
    
    // Left Barrel
    ctx.fillRect(-6, 2, 3, 16 - (recoil * 2)); 
    // Right Barrel
    ctx.fillRect(3, 2, 3, 16 - (recoil * 2));
    
    // Muzzle ends
    ctx.fillStyle = '#000';
    ctx.fillRect(-5.5, 18 - (recoil * 2), 2, 2);
    ctx.fillRect(3.5, 18 - (recoil * 2), 2, 2);

    ctx.restore();

    // --- EXHAUST ---
    // Smoke puffs from back
    const smokeY = chassisY - 8;
    const smokeOffset = Math.sin(time * 10) * 2;
    ctx.fillStyle = `rgba(100, 116, 139, ${0.4 + smokeOffset * 0.1})`;
    ctx.beginPath();
    ctx.arc(pos.x - 10, smokeY - 4 - smokeOffset, 3 + smokeOffset, 0, Math.PI*2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(pos.x + 10, smokeY - 4 - smokeOffset, 2 + smokeOffset, 0, Math.PI*2);
    ctx.fill();
};

export const drawSwarm = (ctx: CanvasRenderingContext2D, pos: Vector2, time: number) => {
    ctx.fillStyle = '#facc15';
    for(let i=0; i<5; i++) {
        const t = time + i * 1.5;
        const ox = Math.sin(t) * 12 + Math.cos(t * 0.5) * 5;
        const oy = Math.cos(t * 0.8) * 6 - 15;
        
        ctx.save();
        ctx.translate(pos.x + ox, pos.y + oy);
        
        // Wings
        const flap = Math.sin(time * 20);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.beginPath(); ctx.ellipse(0, -2, 4, 1 + flap, 0, 0, Math.PI*2); ctx.fill();
        
        // Body
        ctx.fillStyle = '#eab308';
        ctx.beginPath(); ctx.arc(0, 0, 2.5, 0, Math.PI*2); ctx.fill();
        
        ctx.restore();
    }
};
