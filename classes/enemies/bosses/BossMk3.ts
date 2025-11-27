
import { EnemyVariant, Vector2, ParticleBehavior } from '../../../types';
import { BossEnemy } from '../BossEnemy';
import { GameEngine } from '../../GameEngine';
import { ParticleEffect, Debris } from '../../Particle';

export class BossMk3 extends BossEnemy {
    // Animation State
    hoverTimer: number = 0;
    glitchTimer: number = 0;
    trailTimer: number = 0;
    
    // Visual Props
    isGlitching: boolean = false;
    scytheAngle: number = 0;
    
    // Death State
    isDying: boolean = false;
    deathTimer: number = 0;

    constructor(path: Vector2[], wave: number) {
        super(path, wave, EnemyVariant.BOSS_MK3, 40.0, 0.3, 500); 
        this.zHeight = 40; // Floating high
    }

    update(dt: number, engine: GameEngine) {
        if (this.health <= 0 && !this.isDying) {
            this.isDying = true;
            this.health = 1;
            engine.audio.playCancel(); // Initial digital distortion sound
            engine.shakeScreen(5);
        }

        if (this.isDying) {
            this.updateDeathSequence(dt, engine);
            return;
        }

        super.update(dt, engine);

        // --- Active Effects ---
        this.hoverTimer += dt * 0.002;
        
        // Random Glitch Effect (Digital Ghost)
        this.glitchTimer += dt;
        if (this.glitchTimer > 200) { // Check every 200ms
            this.glitchTimer = 0;
            this.isGlitching = Math.random() > 0.9; // 10% chance to glitch frame
        }

        // Shadow Trail
        this.trailTimer += dt;
        if (this.trailTimer > 150) {
            this.trailTimer = 0;
            const pos = engine.getScreenPos(this.gridPos.x, this.gridPos.y);
            // Leave a "Shadow" particle
            const p = new ParticleEffect(
                {x: pos.x, y: pos.y}, 
                this.zHeight, 
                'rgba(15, 23, 42, 0.5)', 
                {x: 0, y: 0.5}, 
                0.8, 
                ParticleBehavior.FLOAT
            );
            p.size = 15; // Large shadow blob
            engine.particles.push(p);
        }
    }

    updateDeathSequence(dt: number, engine: GameEngine) {
        this.deathTimer += dt;
        const pos = engine.getScreenPos(this.gridPos.x, this.gridPos.y);

        // Phase 1: Destabilization (0 - 2.0s)
        // The ghost shakes violently, glitches out, and leaks souls
        if (this.deathTimer < 2000) {
            this.isGlitching = true; // Constant glitch
            this.gridPos.x += (Math.random() - 0.5) * 0.2;
            this.gridPos.y += (Math.random() - 0.5) * 0.2;
            this.rotation += 0.1; // Spin out of control slowly

            // Emit data corruption particles
            if (Math.random() > 0.7) {
                 const p = new ParticleEffect(
                    { x: pos.x + (Math.random()-0.5)*30, y: pos.y - 40 + (Math.random()-0.5)*30 },
                    this.zHeight,
                    Math.random() > 0.5 ? '#06b6d4' : '#a855f7', // Cyan/Purple
                    { x: 0, y: -2 },
                    0.5,
                    ParticleBehavior.FLOAT
                 );
                 // Make it a square pixel
                 p.size = 4; 
                 engine.particles.push(p);
            }
            
            // Occasional leaking soul
            if (Math.random() > 0.9) {
                 const angle = Math.random() * Math.PI * 2;
                 const vel = { x: Math.cos(angle), y: Math.sin(angle) - 2 };
                 engine.particles.push(new SoulParticle(pos, this.zHeight, vel));
            }
        }
        // Phase 2: Banished (Explosion + Howl + Souls)
        else {
            engine.shakeScreen(20);
            engine.audio.playExplosion(); // Boom
            engine.audio.playPhantomDeath(); // THE HOWL

            // 1. Scythe Shatters
            engine.particles.push(new Debris(pos, this.zHeight, '#94a3b8', {x: 4, y: -4}, 4, 30)); // Handle
            engine.particles.push(new Debris(pos, this.zHeight, '#a855f7', {x: 6, y: -6}, 10, 20)); // Blade Top
            engine.particles.push(new Debris(pos, this.zHeight, '#a855f7', {x: 8, y: -2}, 10, 20)); // Blade Bottom

            // 2. Cloak Dissolves into Digital Smoke
            for(let i=0; i<30; i++) {
                const vel = { x: (Math.random()-0.5)*4, y: -Math.random()*6 };
                const color = Math.random() > 0.5 ? '#0f172a' : '#581c87'; // Dark Slate or Deep Purple
                const p = new ParticleEffect(pos, this.zHeight, color, vel, 2.0, ParticleBehavior.FLOAT);
                p.size = 6 + Math.random() * 6;
                engine.particles.push(p);
            }

            // 3. RELEASE THE SOULS
            // A burst of wisp particles spiraling out
            for(let i=0; i<20; i++) {
                 const angle = (Math.PI * 2 * i) / 20;
                 const speed = 3 + Math.random() * 2;
                 const vel = { x: Math.cos(angle) * speed, y: Math.sin(angle) * speed - 1 };
                 engine.particles.push(new SoulParticle(pos, this.zHeight, vel));
            }
            
            // 4. Shockwave
            for(let i=0; i<12; i++) {
                 const angle = (Math.PI*2*i)/12;
                 const vel = {x: Math.cos(angle)*5, y: Math.sin(angle)*5};
                 engine.particles.push(new ParticleEffect(pos, this.zHeight, '#06b6d4', vel, 0.6, ParticleBehavior.FLOAT));
            }

            // Cleanup
            engine.removeEntity(this.id);
            let bounty = this.moneyValue + Math.floor(engine.gameState.wave);
            engine.gameState.money += bounty;
            engine.spawnLootEffect(this.gridPos, bounty);
            engine.addFloatingText(`+$${bounty}`, this.gridPos, '#fbbf24', true);
        }
    }
    
    drawModel(ctx: CanvasRenderingContext2D, pos: Vector2) {
        // Animation Vars
        const time = Date.now() / 1000;
        const hover = Math.sin(this.hoverTimer * 2) * 8;
        const renderY = pos.y - 40 + hover;

        // Glitch Offset (Shifts drawing context randomly)
        let gx = 0;
        let gy = 0;
        if (this.isGlitching) {
            gx = (Math.random() - 0.5) * 10;
            gy = (Math.random() - 0.5) * 2;
        }

        ctx.save();
        ctx.translate(gx, gy);
        
        // --- 1. THE SCYTHE (Behind) ---
        // Rotates slightly
        const scytheSway = Math.sin(time) * 0.2;
        ctx.save();
        ctx.translate(pos.x + 25, renderY + 10);
        ctx.rotate(0.3 + scytheSway);
        
        // Handle
        ctx.strokeStyle = '#64748b'; // Slate 500
        ctx.lineWidth = 4;
        ctx.beginPath(); ctx.moveTo(0, 40); ctx.lineTo(0, -60); ctx.stroke();
        
        // Blade Glow
        ctx.shadowColor = '#a855f7';
        ctx.shadowBlur = 15;
        // Blade Shape
        ctx.fillStyle = '#d8b4fe'; // Light purple
        ctx.beginPath();
        ctx.moveTo(0, -50);
        ctx.quadraticCurveTo(-40, -60, -50, -10); // Curve out and down
        ctx.quadraticCurveTo(-35, -40, 0, -40); // Inner curve
        ctx.closePath();
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.restore();


        // --- 2. BACK CLOAK ---
        const cloakSway = Math.sin(time * 2) * 5;
        ctx.fillStyle = '#020617'; // Almost black
        ctx.beginPath();
        ctx.moveTo(pos.x, renderY - 40); // Neck
        ctx.quadraticCurveTo(pos.x - 30, renderY, pos.x - 25 + cloakSway, renderY + 50); // Left bottom
        ctx.quadraticCurveTo(pos.x, renderY + 40, pos.x + 25 + cloakSway, renderY + 50); // Right bottom
        ctx.quadraticCurveTo(pos.x + 30, renderY, pos.x, renderY - 40);
        ctx.fill();


        // --- 3. MAIN BODY (Void) ---
        // A gradient to make it look empty inside
        const gradVoid = ctx.createRadialGradient(pos.x, renderY - 10, 0, pos.x, renderY, 20);
        gradVoid.addColorStop(0, '#1e1b4b'); // Indigo 950
        gradVoid.addColorStop(0.8, '#0f172a'); // Slate 900
        ctx.fillStyle = gradVoid;
        ctx.beginPath();
        ctx.ellipse(pos.x, renderY, 15, 30, 0, 0, Math.PI*2);
        ctx.fill();
        
        // Ribcage hint (subtle)
        ctx.strokeStyle = 'rgba(148, 163, 184, 0.2)';
        ctx.lineWidth = 2;
        for(let i=0; i<3; i++) {
            ctx.beginPath(); 
            ctx.moveTo(pos.x - 8, renderY - 10 + i*6);
            ctx.quadraticCurveTo(pos.x, renderY - 5 + i*6, pos.x + 8, renderY - 10 + i*6);
            ctx.stroke();
        }


        // --- 4. HOOD & HEAD ---
        // Hood
        ctx.fillStyle = '#0f172a'; // Slate 900
        ctx.beginPath();
        ctx.moveTo(pos.x, renderY - 50); // Top peak
        ctx.bezierCurveTo(pos.x - 20, renderY - 45, pos.x - 20, renderY - 20, pos.x - 15, renderY - 10); // Left side
        ctx.lineTo(pos.x, renderY - 15); // Chin dip
        ctx.lineTo(pos.x + 15, renderY - 10); // Right side
        ctx.bezierCurveTo(pos.x + 20, renderY - 20, pos.x + 20, renderY - 45, pos.x, renderY - 50);
        ctx.fill();
        
        // Hood Rim (Highlight)
        ctx.strokeStyle = '#334155';
        ctx.lineWidth = 2;
        ctx.stroke();

        // GLOWING EYES
        const flicker = Math.random() > 0.9 ? 0.5 : 1.0;
        ctx.fillStyle = `rgba(6, 182, 212, ${flicker})`; // Cyan
        ctx.shadowColor = '#06b6d4';
        ctx.shadowBlur = 15;
        
        // Left Eye (Trail)
        ctx.beginPath(); ctx.arc(pos.x - 6, renderY - 28, 3, 0, Math.PI*2); ctx.fill();
        // Right Eye
        ctx.beginPath(); ctx.arc(pos.x + 6, renderY - 28, 3, 0, Math.PI*2); ctx.fill();
        ctx.shadowBlur = 0;

        // Eye Flames (Vertical trails)
        ctx.fillStyle = 'rgba(6, 182, 212, 0.4)';
        ctx.beginPath(); ctx.moveTo(pos.x - 6, renderY - 28); ctx.lineTo(pos.x - 8 - cloakSway*0.2, renderY - 45); ctx.lineTo(pos.x - 4, renderY - 28); ctx.fill();
        ctx.beginPath(); ctx.moveTo(pos.x + 6, renderY - 28); ctx.lineTo(pos.x + 8 - cloakSway*0.2, renderY - 45); ctx.lineTo(pos.x + 4, renderY - 28); ctx.fill();


        // --- 5. HANDS ---
        // Left hand (Empty, casting spell?)
        ctx.fillStyle = '#cbd5e1'; // Bone color
        ctx.beginPath(); 
        ctx.arc(pos.x - 20, renderY + 5 + Math.sin(time*3)*2, 4, 0, Math.PI*2); 
        ctx.fill();
        
        // Spell particles from left hand
        if (Math.random() > 0.5) {
            ctx.fillStyle = '#a855f7';
            ctx.fillRect(pos.x - 25 + Math.random()*10, renderY + Math.random()*10, 2, 2);
        }

        // Right hand (Holding Scythe)
        ctx.fillStyle = '#cbd5e1';
        ctx.beginPath(); ctx.arc(pos.x + 22, renderY + 10, 4, 0, Math.PI*2); ctx.fill();


        // --- 6. FRONT CLOAK FLAPS ---
        ctx.fillStyle = '#1e293b'; // Slightly lighter than back
        ctx.beginPath();
        ctx.moveTo(pos.x - 10, renderY - 15);
        ctx.lineTo(pos.x - 20 + cloakSway*0.5, renderY + 40);
        ctx.lineTo(pos.x - 5, renderY + 30);
        ctx.lineTo(pos.x - 5, renderY - 10);
        ctx.fill();
        
        ctx.beginPath();
        ctx.moveTo(pos.x + 10, renderY - 15);
        ctx.lineTo(pos.x + 20 + cloakSway*0.5, renderY + 40);
        ctx.lineTo(pos.x + 5, renderY + 30);
        ctx.lineTo(pos.x + 5, renderY - 10);
        ctx.fill();

        ctx.restore();
    }
}

// Special particle for escaping souls
class SoulParticle extends ParticleEffect {
    wobble: number = Math.random() * 10;
    
    constructor(pos: Vector2, z: number, vel: Vector2) {
        super(pos, z, '#c084fc', vel, 3.0, ParticleBehavior.FLOAT);
        this.size = 3;
    }

    draw(ctx: CanvasRenderingContext2D, _pos: Vector2) {
        this.wobble += 0.2;
        ctx.save();
        ctx.translate(this.screenPos.x, this.screenPos.y - this.zHeight);
        ctx.globalAlpha = Math.max(0, this.life / this.maxLife);
        
        // Draw wisp head
        ctx.fillStyle = '#e879f9'; // Pink/Purple
        ctx.shadowColor = '#c084fc';
        ctx.shadowBlur = 10;
        
        ctx.beginPath();
        ctx.arc(0, 0, this.size, 0, Math.PI*2);
        ctx.fill();
        
        // Draw Tail (Sine wave trail)
        ctx.strokeStyle = 'rgba(192, 132, 252, 0.6)';
        ctx.lineWidth = 2;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(0, 0);
        
        // Trail flows opposite to velocity roughly, but we just draw it hanging down/back for visual effect
        // Or create a little wiggle behind it
        const tailX = -this.velocity.x * 5;
        const tailY = -this.velocity.y * 5;
        
        ctx.quadraticCurveTo(
            tailX + Math.sin(this.wobble)*5, tailY + 5, 
            tailX + Math.sin(this.wobble + 2)*2, tailY + 15
        );
        ctx.stroke();
        
        ctx.restore();
    }
}
