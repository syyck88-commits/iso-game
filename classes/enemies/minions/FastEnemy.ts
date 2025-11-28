
import { EnemyVariant, Vector2, ParticleBehavior } from '../../../types';
import { BaseEnemy } from '../BaseEnemy';
import { GameEngine } from '../../GameEngine';
import { ParticleEffect } from '../../Particle';

export class FastEnemy extends BaseEnemy {
    exhaustTimer: number = 0;

    constructor(path: Vector2[], wave: number) {
        super(path, wave, EnemyVariant.FAST);
        const baseHp = 30 + (wave * 10);
        this.maxHealth = Math.floor(baseHp * 0.6);
        this.health = this.maxHealth;
        this.speed = (0.03 + (Math.min(20, wave) * 0.001)) * 1.8;
        this.moneyValue = 10;
        this.zHeight = 25; // Flying high
    }

    onUpdate(dt: number, engine: GameEngine) {
        // Engine Exhaust Trail
        this.exhaustTimer += dt;
        if (this.exhaustTimer > 30) {
            this.exhaustTimer = 0;
            const pos = engine.getScreenPos(this.gridPos.x, this.gridPos.y);
            
            // Adjust exhaust to emit behind the jet based on rotation
            const backX = Math.cos(this.rotation + Math.PI) * 15;
            const backY = Math.sin(this.rotation + Math.PI) * 15;
            
            const p = new ParticleEffect(
                {x: pos.x + backX, y: pos.y + backY}, 
                this.zHeight, 
                'rgba(251, 146, 60, 0.6)', 
                {x: 0, y: 0}, 
                0.4, 
                ParticleBehavior.FLOAT
            );
            p.size = 2;
            engine.particles.push(p);
        }
    }

    onDeathStart(engine: GameEngine) {
        super.onDeathStart(engine);
    }

    onDeathUpdate(dt: number, engine: GameEngine) {
        this.rotation += dt * 0.01;
        this.zHeight = Math.max(0, this.zHeight - dt * 0.03);
        this.gridPos.x += (Math.random()-0.5) * 0.1; 
        
        if (this.zHeight <= 0) {
            engine.spawnExplosion(this.gridPos, '#f97316');
            this.opacity = 0;
        }
    }

    drawModel(ctx: CanvasRenderingContext2D, pos: Vector2) {
        const floatY = pos.y - 5; 
        
        // --- ROTATION TRANSFORM ---
        ctx.save();
        ctx.translate(pos.x, floatY);
        ctx.rotate(this.rotation);
        
        // Draw centered at (0,0) assuming sprite points RIGHT (0 radians)
        
        // Wings
        ctx.fillStyle = 'rgba(251, 146, 60, 0.6)'; 
        ctx.beginPath();
        ctx.moveTo(10, 0); 
        ctx.lineTo(-12, -8); 
        ctx.lineTo(-12, 8); 
        ctx.fill();
        
        // Body (Fuselage)
        ctx.fillStyle = '#ea580c'; // Darker Orange
        ctx.beginPath(); 
        ctx.moveTo(15, 0); // Nose
        ctx.lineTo(-10, -5); // Tail Left
        ctx.lineTo(-8, 0); // Tail Center
        ctx.lineTo(-10, 5); // Tail Right
        ctx.closePath(); 
        ctx.fill();

        // Cockpit
        ctx.fillStyle = '#60a5fa'; // Blue glass
        ctx.beginPath();
        ctx.ellipse(2, 0, 4, 2, 0, 0, Math.PI*2);
        ctx.fill();

        // Engine Glow
        ctx.fillStyle = '#fff';
        ctx.shadowColor = '#f97316';
        ctx.shadowBlur = 10;
        ctx.fillRect(-11, -1.5, 3, 3);
        ctx.shadowBlur = 0;

        ctx.restore();
    }
}
