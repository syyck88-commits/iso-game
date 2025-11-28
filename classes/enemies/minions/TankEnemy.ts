
import { EnemyVariant, Vector2, ParticleBehavior } from '../../../types';
import { BaseEnemy } from '../BaseEnemy';
import { GameEngine } from '../../GameEngine';
import { ParticleEffect } from '../../Particle';

export class TankEnemy extends BaseEnemy {
    dustTimer: number = 0;
    turretAngle: number = 0;
    private _initTurret: boolean = false;

    // Death Animation Physics
    turretPos: Vector2 = { x: 0, y: 0 }; // Relative to body
    turretVel: Vector2 = { x: 0, y: 0 };
    turretHeight: number = 0;
    turretHeightVel: number = 0;
    turretRotVel: number = 0;

    constructor(path: Vector2[], wave: number) {
        super(path, wave, EnemyVariant.TANK);
        const baseHp = 30 + (wave * 10);
        this.maxHealth = baseHp * 3;
        this.health = this.maxHealth;
        this.speed = (0.03 + (Math.min(20, wave) * 0.001)) * 0.6;
        this.moneyValue = 40;
    }

    onUpdate(dt: number, engine: GameEngine) {
        // Initialize turret angle to match body on first frame to prevent snapping
        if (!this._initTurret) {
            this.turretAngle = this.rotation;
            this._initTurret = true;
        }

        // Turret Lag Logic
        // Calculate shortest angle difference
        let diff = this.rotation - this.turretAngle;
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;

        // Smoothly interpolate turret towards body rotation (Lag effect)
        // Factor 0.05 is slower than body turn, creating the "heavy turret" feel
        this.turretAngle += diff * 0.08;

        // Dust kick-up effect from tracks
        this.dustTimer += dt;
        if (this.dustTimer > 150) {
            this.dustTimer = 0;
            const pos = engine.getScreenPos(this.gridPos.x, this.gridPos.y);
            
            // Calc rear position based on HULL rotation
            // Scaled down offsets (was 20 and 12, now 10 and 6 for 50% size)
            const backX = Math.cos(this.rotation + Math.PI) * 10;
            const backY = Math.sin(this.rotation + Math.PI) * 10;
            const sideX = Math.cos(this.rotation + Math.PI/2) * 6;
            const sideY = Math.sin(this.rotation + Math.PI/2) * 6;

            // Left Track Dust
            const p1 = new ParticleEffect(
                {x: pos.x + backX + sideX, y: pos.y + backY + sideY}, 
                0, 'rgba(120, 113, 108, 0.3)', 
                {x:0,y:0}, 0.8, ParticleBehavior.FLOAT, 'SMOKE'
            );
            p1.size = 2; // Smaller dust
            
            // Right Track Dust
            const p2 = new ParticleEffect(
                {x: pos.x + backX - sideX, y: pos.y + backY - sideY}, 
                0, 'rgba(120, 113, 108, 0.3)', 
                {x:0,y:0}, 0.8, ParticleBehavior.FLOAT, 'SMOKE'
            );
            p2.size = 2;

            engine.particles.push(p1);
            engine.particles.push(p2);
        }
    }

    onDeathStart(engine: GameEngine) {
        super.onDeathStart(engine); // Standard Loot/Sound
        
        // Initialize Fly-off Physics
        const angle = Math.random() * Math.PI * 2;
        const speed = 2 + Math.random() * 3;
        this.turretVel = {
            x: Math.cos(angle) * speed,
            y: Math.sin(angle) * speed
        };
        this.turretHeight = 0;
        this.turretHeightVel = 6 + Math.random() * 4; // Pop up
        this.turretRotVel = (Math.random() - 0.5) * 0.8; // Spin

        // Secondary explosion at location to signify the "pop"
        engine.spawnExplosion(this.gridPos, '#f97316');
    }

    onDeathUpdate(dt: number, engine: GameEngine) {
        this.opacity = 1; 
        this.scale = 1;
        
        // Physics Tick
        const tick = dt / 16.0;

        // Apply Velocity
        this.turretPos.x += this.turretVel.x * tick;
        this.turretPos.y += this.turretVel.y * tick;
        this.turretHeight += this.turretHeightVel * tick;
        this.turretAngle += this.turretRotVel * tick;
        
        // Gravity
        this.turretHeightVel -= 0.4 * tick;

        // Ground Bounce
        if (this.turretHeight <= 0) {
            this.turretHeight = 0;
            if (Math.abs(this.turretHeightVel) > 1) {
                this.turretHeightVel = -this.turretHeightVel * 0.4; // Dampened bounce
                this.turretRotVel *= 0.6; // Friction
                this.turretVel.x *= 0.6;
                this.turretVel.y *= 0.6;
            } else {
                this.turretHeightVel = 0;
                this.turretRotVel = 0;
                this.turretVel.x = 0;
                this.turretVel.y = 0;
            }
        }

        // Hull Jitter (Burning)
        this.gridPos.x += (Math.random()-0.5) * 0.02;
        this.gridPos.y += (Math.random()-0.5) * 0.02;

        // Smoke from hull
        if (Math.random() > 0.4) {
             const pos = engine.getScreenPos(this.gridPos.x, this.gridPos.y);
             const p = new ParticleEffect(pos, 20, '#1f2937', {x:(Math.random()-0.5), y:-2}, 2.0, ParticleBehavior.FLOAT, 'SMOKE');
             p.size = 8;
             engine.particles.push(p);
             
             // Smoke from turret if airborne
             if (this.turretHeight > 1) {
                 const tPos = { x: pos.x + this.turretPos.x, y: pos.y + this.turretPos.y };
                 const tp = new ParticleEffect(tPos, this.turretHeight + 10, '#44403c', {x:0,y:-1}, 1.0, ParticleBehavior.FLOAT, 'SMOKE');
                 tp.size = 4;
                 engine.particles.push(tp);
             }
        }

        if (this.deathTimer > 3000) {
             // Final fade out
             this.opacity -= 0.05;
             if (this.opacity <= 0) engine.removeEntity(this.id);
        }
    }
    
    drawShadow(ctx: CanvasRenderingContext2D, pos: Vector2) {
        ctx.fillStyle = `rgba(0,0,0,${0.4 * this.opacity})`;
        // Reduced shadow size (Was 24, 14 -> Now 12, 7)
        ctx.beginPath(); ctx.ellipse(pos.x, pos.y, 12, 7, this.rotation, 0, Math.PI*2); ctx.fill();
        
        // Turret shadow if flying
        if (this.isDying && this.turretHeight > 1) {
            ctx.fillStyle = `rgba(0,0,0,${0.3 * this.opacity})`;
            const tx = pos.x + this.turretPos.x;
            const ty = pos.y + this.turretPos.y;
            ctx.beginPath(); ctx.ellipse(tx, ty, 8, 5, this.turretAngle, 0, Math.PI*2); ctx.fill();
        }
    }

    drawModel(ctx: CanvasRenderingContext2D, pos: Vector2) {
        if (this.opacity <= 0) return;

        const time = Date.now() / 1000;
        
        ctx.save();
        ctx.translate(pos.x, pos.y);
        
        // 50% SCALING
        ctx.scale(0.5, 0.5); 
        ctx.globalAlpha = this.opacity;

        // Visual bounce for terrain movement
        const bounce = !this.isDying ? Math.sin(time * 15) * 1 : 0;
        
        // Colors (Desert Tan / Abrams Scheme)
        const cTrack = '#1c1917';
        const cTrackDetail = '#44403c';
        const cHullDark = this.isDying ? '#292524' : '#57534e'; 
        const cHullMid = this.isDying ? '#44403c' : '#78716c';   
        const cHullLight = this.isDying ? '#57534e' : '#a8a29e'; 
        const cBarrel = '#292524';

        // === 1. DRAW HULL (Rotated by Movement Direction) ===
        ctx.save();
        ctx.rotate(this.rotation);

        // --- TRACKS ---
        const trackLength = 46;
        const trackWidth = 10;
        const trackY = 14; // Distance from center line
        
        const drawTrack = (y: number) => {
            // Main Track Body
            ctx.fillStyle = cTrack;
            ctx.fillRect(-trackLength/2, y - trackWidth/2, trackLength, trackWidth);
            
            // Animated Treads (Stop if dying)
            const speed = this.isDying ? 0 : 20;
            const offset = (time * speed) % 6;
            
            ctx.strokeStyle = cTrackDetail;
            ctx.lineWidth = 2;
            ctx.beginPath();
            
            for(let x = -trackLength/2; x < trackLength/2; x+=6) {
                let tx = x - offset;
                if (tx < -trackLength/2) tx += trackLength;
                
                if (tx > -trackLength/2 + 1 && tx < trackLength/2 - 1) {
                    ctx.moveTo(tx, y - trackWidth/2);
                    ctx.lineTo(tx, y + trackWidth/2);
                }
            }
            ctx.stroke();
            
            // Drive Wheels
            ctx.fillStyle = cHullDark;
            ctx.beginPath(); ctx.arc(-trackLength/2 + 2, y, 3, 0, Math.PI*2); ctx.fill();
            ctx.beginPath(); ctx.arc(trackLength/2 - 2, y, 3, 0, Math.PI*2); ctx.fill();
        };

        drawTrack(-trackY); // Left Track
        drawTrack(trackY);  // Right Track

        // --- HULL BODY ---
        ctx.translate(0, -4 + bounce); // Lift hull

        // Lower Chassis
        ctx.fillStyle = 'rgba(0,0,0,0.3)';
        ctx.fillRect(-22, -13, 44, 26);
        
        // Main Body (Angular Sloped Armor)
        ctx.fillStyle = cHullMid;
        ctx.beginPath();
        ctx.moveTo(22, -10); // Front Right
        ctx.lineTo(26, 0);   // Nose Tip
        ctx.lineTo(22, 10);  // Front Left
        ctx.lineTo(-24, 10); // Rear Left
        ctx.lineTo(-24, -10);// Rear Right
        ctx.closePath();
        ctx.fill();
        
        // Glacis Plate (Highlight)
        ctx.fillStyle = cHullLight;
        ctx.beginPath();
        ctx.moveTo(22, -10);
        ctx.lineTo(26, 0);
        ctx.lineTo(22, 10);
        ctx.lineTo(6, 10); 
        ctx.lineTo(6, -10);
        ctx.closePath();
        ctx.fill();

        // Rear Engine Deck
        ctx.fillStyle = cHullDark;
        ctx.fillRect(-22, -8, 10, 16);
        ctx.fillStyle = '#292524';
        for(let i=0; i<3; i++) {
             ctx.fillRect(-20 + (i*3), -6, 1.5, 12);
        }

        // Turret Ring Hole (Visible when turret flies off)
        if (this.isDying) {
            ctx.fillStyle = '#1c1917';
            ctx.beginPath(); ctx.arc(0, 0, 12, 0, Math.PI*2); ctx.fill();
            // Burnt marks
            ctx.strokeStyle = '#000';
            ctx.lineWidth = 1;
            ctx.beginPath(); 
            ctx.moveTo(-5, -5); ctx.lineTo(5, 5);
            ctx.moveTo(5, -5); ctx.lineTo(-5, 5);
            ctx.stroke();
        }
        
        ctx.restore(); // End Hull Rotation

        // === 2. DRAW TURRET (Rotated Independently) ===
        ctx.save();
        
        if (this.isDying) {
            // Apply fly-off physics
            // Note: We are scaled 0.5, so screen pixels need to be doubled in translation to match 1:1 movement
            ctx.translate(this.turretPos.x * 2, this.turretPos.y * 2);
            ctx.translate(0, -this.turretHeight * 2); // Z-Up
            
            // Tumbling effect handled via this.turretAngle update in update loop
        } else {
             ctx.translate(0, -4 + bounce); // Match hull height
        }
        
        ctx.rotate(this.turretAngle); // Independent rotation

        // Scanning Animation (Idle wobble on top of turret angle)
        const scan = this.isDying ? 0 : Math.sin(time * 1.5) * 0.05;
        ctx.rotate(scan);

        // Turret Shadow (Only if attached, otherwise drawn in drawShadow)
        if (!this.isDying) {
            ctx.fillStyle = 'rgba(0,0,0,0.3)';
            ctx.beginPath();
            ctx.moveTo(10, -10); ctx.lineTo(-14, -14); ctx.lineTo(-24, 0); ctx.lineTo(-14, 14); ctx.lineTo(10, 10);
            ctx.fill();
        }

        // Turret Body (Abrams Shape)
        ctx.fillStyle = cHullMid;
        ctx.beginPath();
        ctx.moveTo(12, -8);  
        ctx.lineTo(-10, -12);
        ctx.lineTo(-20, -8); 
        ctx.lineTo(-20, 8);  
        ctx.lineTo(-10, 12); 
        ctx.lineTo(12, 8);   
        ctx.lineTo(16, 0);   
        ctx.closePath();
        ctx.fill();

        // Turret Roof
        ctx.fillStyle = cHullLight;
        ctx.beginPath();
        ctx.moveTo(10, -6);
        ctx.lineTo(-18, -6);
        ctx.lineTo(-18, 6);
        ctx.lineTo(10, 6);
        ctx.closePath();
        ctx.fill();

        // Gun
        ctx.fillStyle = cBarrel;
        ctx.fillRect(16, -2.5, 30, 5);
        ctx.fillStyle = '#404040';
        ctx.fillRect(32, -3.5, 6, 7); // Bore evacuator
        ctx.fillStyle = '#171717';
        ctx.beginPath(); ctx.arc(46, 0, 2, 0, Math.PI*2); ctx.fill();

        // Hatches & Optics
        ctx.fillStyle = cHullDark;
        ctx.beginPath(); ctx.arc(-8, 3, 4, 0, Math.PI*2); ctx.fill();
        ctx.beginPath(); ctx.arc(-6, -4, 3, 0, Math.PI*2); ctx.fill();

        ctx.fillStyle = '#1f2937';
        ctx.fillRect(8, -6, 4, 4);
        ctx.fillStyle = '#ef4444';
        ctx.fillRect(10, -5, 2, 2);

        // Bustle Rack
        ctx.strokeStyle = '#44403c';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(-20, -6); ctx.lineTo(-24, -6); ctx.lineTo(-24, 6); ctx.lineTo(-20, 6);
        ctx.stroke();
        
        // If dying, add some scorch marks on turret
        if (this.isDying) {
            ctx.fillStyle = 'rgba(0,0,0,0.3)';
            ctx.beginPath(); ctx.arc(0, 0, 8, 0, Math.PI*2); ctx.fill();
        }

        ctx.restore(); // End Turret Rotation

        ctx.restore(); // End Global Transforms
    }
}
