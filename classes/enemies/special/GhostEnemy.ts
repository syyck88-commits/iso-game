
import { EnemyVariant, Vector2, ParticleBehavior } from '../../../types';
import { BaseEnemy } from '../BaseEnemy';
import { GameEngine } from '../../GameEngine';
import { ParticleEffect } from '../../Particle';

export class GhostEnemy extends BaseEnemy {
    glitchTimer: number = 0;
    teleportTimer: number = 0;
    isGlitching: boolean = false;

    constructor(path: Vector2[], wave: number) {
        super(path, wave, EnemyVariant.GHOST);
        const baseHp = 30 + (wave * 10);
        this.maxHealth = Math.floor(baseHp * 0.8);
        this.health = this.maxHealth;
        this.speed = (0.03 + (Math.min(20, wave) * 0.001)) * 0.9;
        this.moneyValue = 20;
    }

    onUpdate(dt: number, engine: GameEngine) {
        // 1. Existing Glitch Effect
        this.glitchTimer += dt;
        if (this.glitchTimer > 100) {
            this.glitchTimer = 0;
            this.isGlitching = Math.random() > 0.8;
        }

        // 2. Teleportation Logic
        this.teleportTimer += dt;
        
        // Try to teleport every 2 seconds with a 20% chance
        if (this.teleportTimer > 2000) {
            this.teleportTimer = 0;
            
            // Only teleport if healthy enough and random chance hits
            if (Math.random() > 0.8) {
                this.performTeleport(engine);
            }
        }
    }

    performTeleport(engine: GameEngine) {
        // Calculate jump distance (skipping 3 to 6 tiles ahead)
        const jump = 3 + Math.floor(Math.random() * 3);
        const nextIndex = this.pathIndex + jump;

        // Ensure we don't jump past the base
        if (nextIndex < this.path.length - 1) {
            const oldPos = engine.getScreenPos(this.gridPos.x, this.gridPos.y);
            
            // 1. VFX at Old Position (Glitch out)
            const pOut = new ParticleEffect(oldPos, this.zHeight, '#06b6d4', {x:0,y:0}, 0.3, ParticleBehavior.FLOAT, 'FLASH');
            pOut.size = 20;
            engine.particles.push(pOut);
            
            // 2. Move Entity
            this.pathIndex = nextIndex;
            const dest = this.path[this.pathIndex];
            this.gridPos.x = dest.x;
            this.gridPos.y = dest.y;

            // 3. VFX at New Position (Glitch in)
            const newPos = engine.getScreenPos(this.gridPos.x, this.gridPos.y);
            const pIn = new ParticleEffect(newPos, this.zHeight, '#fff', {x:0,y:0}, 0.3, ParticleBehavior.FLOAT, 'FLASH');
            pIn.size = 25;
            engine.particles.push(pIn);

            // Audio feedback (High pitch blip)
            engine.audio.playBuild(); 
        }
    }

    onDeathUpdate(dt: number, engine: GameEngine) {
        this.deathTimer += dt;
        
        // Rising Zigzag Animation
        
        // 1. Rise Up
        this.zHeight += dt * 0.06;
        
        // 2. Zigzag (Sine wave on X axis relative to grid)
        // We modify gridPos slightly to create the wiggle
        const wiggleSpeed = 0.01;
        const wiggleAmount = 0.05;
        this.gridPos.x += Math.sin(this.deathTimer * wiggleSpeed) * wiggleAmount;

        // 3. Expand
        this.scale += dt * 0.003; 
        
        // 4. Fade
        this.opacity -= dt * 0.001; 
        
        // Spawn spirit particles occasionally
        if (Math.random() > 0.8) {
             const pos = engine.getScreenPos(this.gridPos.x, this.gridPos.y);
             const p = new ParticleEffect(
                 pos, 
                 this.zHeight, 
                 'rgba(6, 182, 212, 0.5)', 
                 {x: (Math.random()-0.5), y: 1}, // Fall down slightly as body goes up
                 0.5, 
                 ParticleBehavior.FLOAT
             );
             p.size = 3; 
             engine.particles.push(p);
        }
    }

    drawModel(ctx: CanvasRenderingContext2D, pos: Vector2) {
        const time = Date.now() / 200 + this.wobbleOffset;
        const floatY = pos.y - 30 + Math.sin(time) * 5;
        
        let gx = 0;
        let gy = 0;
        if (this.isGlitching || (this.isDying && Math.random() > 0.7)) {
            gx = (Math.random() - 0.5) * 6;
            gy = (Math.random() - 0.5) * 2;
        }

        ctx.save(); 
        ctx.translate(gx, gy);
        
        ctx.globalAlpha = this.opacity * 0.6; 
        
        const grad = ctx.createLinearGradient(pos.x, floatY - 20, pos.x, floatY + 20);
        grad.addColorStop(0, '#06b6d4'); grad.addColorStop(1, 'rgba(6, 182, 212, 0)');
        ctx.fillStyle = grad;
        
        ctx.beginPath(); ctx.moveTo(pos.x, floatY - 20); 
        ctx.bezierCurveTo(pos.x - 15, floatY - 20, pos.x - 15, floatY, pos.x - 10, floatY + 15);
        ctx.lineTo(pos.x, floatY + 20); ctx.lineTo(pos.x + 10, floatY + 15);
        ctx.bezierCurveTo(pos.x + 15, floatY, pos.x + 15, floatY - 20, pos.x, floatY - 20); ctx.fill();
        
        ctx.fillStyle = '#ecfeff'; 
        ctx.globalAlpha = this.opacity; 
        ctx.beginPath();
        ctx.arc(pos.x - 4, floatY - 5, 2, 0, Math.PI*2); 
        ctx.arc(pos.x + 4, floatY - 5, 2, 0, Math.PI*2); 
        ctx.fill();
        
        ctx.strokeStyle = 'rgba(255,255,255,0.2)';
        ctx.lineWidth = 1;
        for(let i=0; i<5; i++) {
            const y = floatY - 15 + (i * 6) + (time % 1) * 6;
            ctx.beginPath(); ctx.moveTo(pos.x - 10, y); ctx.lineTo(pos.x + 10, y); ctx.stroke();
        }

        ctx.restore();
    }
}
