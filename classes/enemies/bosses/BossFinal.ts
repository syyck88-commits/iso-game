
import { EnemyVariant, Vector2, ParticleBehavior } from '../../../types';
import { BossEnemy } from '../BossEnemy';
import { GameEngine } from '../../GameEngine';
import { ParticleEffect } from '../../Particle';

class OrbitDebris {
    angle: number;
    dist: number;
    size: number;
    speed: number;
    color: string;

    constructor() {
        this.angle = Math.random() * Math.PI * 2;
        this.dist = 30 + Math.random() * 40;
        this.size = 2 + Math.random() * 3;
        this.speed = (0.5 + Math.random() * 1.5) * (Math.random() > 0.5 ? 1 : -1);
        this.color = Math.random() > 0.8 ? '#facc15' : (Math.random() > 0.5 ? '#94a3b8' : '#475569');
    }
    
    update(dt: number) {
        this.angle += this.speed * dt * 0.001;
    }
}

export class BossFinal extends BossEnemy {
    // Visual State
    spinAngle: number = 0;
    debris: OrbitDebris[] = [];
    tendrils: {off: number, speed: number}[] = [];
    
    // Intro State
    hasRoared: boolean = false;

    // Death State
    isDying: boolean = false;
    deathTimer: number = 0;
    
    constructor(path: Vector2[], wave: number) {
        super(path, wave, EnemyVariant.BOSS_FINAL, 100.0, 0.2, 5000); // Massive HP
        this.zHeight = 60; // Very high up
        this.moneyValue = 9999;

        // Init Debris
        for(let i=0; i<15; i++) {
            this.debris.push(new OrbitDebris());
        }
        // Init Tendrils settings
        for(let i=0; i<8; i++) {
            this.tendrils.push({ off: Math.random() * Math.PI * 2, speed: 0.5 + Math.random() });
        }
    }

    update(dt: number, engine: GameEngine) {
        if (!this.hasRoared) {
            this.hasRoared = true;
            engine.audio.playVoidIntro();
            engine.shakeScreen(15);
        }

        if (this.health <= 0 && !this.isDying) {
            this.isDying = true;
            this.health = 1;
            engine.audio.playVoidDeath(); 
        }

        if (this.isDying) {
            this.updateDeathSequence(dt, engine);
            return;
        }

        super.update(dt, engine);
        
        // Update Debris
        this.debris.forEach(d => d.update(dt));
        this.spinAngle += dt * 0.0005;

        // Particle Sucking Effect (The Event Horizon)
        if (Math.random() > 0.7) {
            const pos = engine.getScreenPos(this.gridPos.x, this.gridPos.y);
            const angle = Math.random() * Math.PI * 2;
            const dist = 60 + Math.random() * 20;
            // Spawn particle outside moving IN
            // Target is (pos.y - zHeight) which is the visual center
            const startX = pos.x + Math.cos(angle) * dist;
            const startY = pos.y - this.zHeight + Math.sin(angle) * dist;
            
            const vel = {
                x: (pos.x - startX) * 0.02,
                y: (pos.y - this.zHeight - startY) * 0.02
            };
            
            const p = new ParticleEffect(
                {x: startX, y: startY}, 
                0, // Already accounted for Z in startY
                '#818cf8', 
                vel, 
                0.8, 
                ParticleBehavior.FLOAT
            );
            p.size = 2;
            engine.particles.push(p);
        }
    }

    updateDeathSequence(dt: number, engine: GameEngine) {
        this.deathTimer += dt;
        const pos = engine.getScreenPos(this.gridPos.x, this.gridPos.y);

        // Phase 1: Gravity Well Instability (0 - 2.0s)
        // Screen shakes, everything gets sucked in faster
        if (this.deathTimer < 2000) {
             engine.shakeScreen(2);
             
             // Vacuum particles
             for(let i=0; i<3; i++) {
                const angle = Math.random() * Math.PI * 2;
                const dist = 80;
                const p = new ParticleEffect(
                    {x: pos.x + Math.cos(angle)*dist, y: pos.y - this.zHeight + Math.sin(angle)*dist},
                    0, '#fff',
                    {x: -Math.cos(angle)*4, y: -Math.sin(angle)*4},
                    0.5, ParticleBehavior.FLOAT
                );
                p.size = 2 + Math.random() * 4;
                engine.particles.push(p);
             }
        }
        // Phase 2: Collapse (2.0s - 2.2s)
        // Shrink to nothing
        else if (this.deathTimer < 2200) {
             // Visuals handled in draw (scaling down)
        }
        // Phase 3: SUPERNOVA (2.2s+)
        else if (this.deathTimer < 2300) {
            // SINGLE FRAME FLASH handled here? 
            // Better to spawn a giant particle
             if (this.deathTimer - dt < 2200) {
                 // Trigger ONCE
                 engine.shakeScreen(50);
                 
                 // Giant whiteout
                 const whiteout = new ParticleEffect(
                     {x: engine.renderer.width/2, y: engine.renderer.height/2},
                     0, '#ffffff', {x:0, y:0}, 1.0, ParticleBehavior.FLOAT
                 );
                 whiteout.size = 2000; // Cover screen
                 engine.particles.push(whiteout);

                 // Shockwave Ring
                 for(let i=0; i<60; i++) {
                     const angle = (Math.PI*2*i)/60;
                     const speed = 10 + Math.random()*5;
                     const p = new ParticleEffect(
                         pos, this.zHeight, 
                         Math.random()>0.5 ? '#a855f7' : '#06b6d4',
                         {x: Math.cos(angle)*speed, y: Math.sin(angle)*speed},
                         2.0, ParticleBehavior.PHYSICS
                     );
                     p.size = 5 + Math.random() * 5;
                     engine.particles.push(p);
                 }
                 
                 // Remove Boss
                 engine.removeEntity(this.id);
                 
                 // Loot
                 engine.gameState.money += 99999;
                 engine.addFloatingText("VICTORY", this.gridPos, '#fbbf24', true);
             }
        }
    }

    drawModel(ctx: CanvasRenderingContext2D, pos: Vector2) {
        const time = Date.now() / 1000;
        
        // Fix: `pos` passed from GameEngine already accounts for zHeight (screenY - zHeight).
        // So we draw at pos.y directly to align with the hit box / particle center.
        const renderY = pos.y;

        // Death Scaling
        let scale = 1.0;
        if (this.isDying) {
            if (this.deathTimer < 2000) {
                scale = 1.0 + Math.random() * 0.1; // Instability
            } else if (this.deathTimer < 2200) {
                // Implode
                scale = 1.0 - ((this.deathTimer - 2000) / 200);
                scale = Math.max(0, scale);
            } else {
                return; // Gone (Exploded)
            }
        }

        ctx.save();
        ctx.translate(pos.x, renderY);
        ctx.scale(scale, scale);

        // --- 1. VOID TENDRILS (Behind) ---
        ctx.strokeStyle = '#312e81'; // Indigo 900
        ctx.lineWidth = 4;
        this.tendrils.forEach((t, i) => {
            const angle = this.spinAngle + (Math.PI * 2 * i) / 8;
            const sway = Math.sin(time * t.speed + t.off) * 20;
            const len = 50;
            
            const tx = Math.cos(angle) * len + Math.cos(angle + 1.5) * sway;
            const ty = Math.sin(angle) * len + Math.sin(angle + 1.5) * sway;
            
            ctx.beginPath();
            ctx.moveTo(Math.cos(angle)*10, Math.sin(angle)*10);
            ctx.quadraticCurveTo(Math.cos(angle)*30, Math.sin(angle)*30, tx, ty);
            ctx.stroke();
        });


        // --- 2. ACCRETION DISK (Spinning Rings) ---
        // Ellipses rotated
        const colors = ['#4c1d95', '#7c3aed', '#06b6d4']; // Violet -> Cyan
        
        ctx.globalCompositeOperation = 'lighter'; // Glowy
        for(let i=0; i<3; i++) {
            ctx.save();
            ctx.rotate(time * (1 - i*0.2) + i);
            ctx.beginPath();
            ctx.ellipse(0, 0, 40 - i*5, 12 - i*2, i * 0.5, 0, Math.PI*2);
            ctx.strokeStyle = colors[i];
            ctx.lineWidth = 3;
            ctx.stroke();
            ctx.restore();
        }
        ctx.globalCompositeOperation = 'source-over';


        // --- 3. THE EVENT HORIZON (Black Hole Core) ---
        const hpPct = this.health / this.maxHealth;
        
        // Inner Glow (changes color on low HP)
        const coreGlow = hpPct < 0.25 ? '#dc2626' : '#a855f7'; // Red vs Purple
        
        // Halo
        const gradHalo = ctx.createRadialGradient(0, 0, 15, 0, 0, 35);
        gradHalo.addColorStop(0, coreGlow);
        gradHalo.addColorStop(0.5, 'rgba(88, 28, 135, 0.5)');
        gradHalo.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = gradHalo;
        ctx.beginPath(); ctx.arc(0, 0, 35, 0, Math.PI*2); ctx.fill();

        // The Void (Pure Black)
        ctx.fillStyle = '#000';
        ctx.beginPath(); ctx.arc(0, 0, 20, 0, Math.PI*2); ctx.fill();
        
        // Rim Light (White thin circle)
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 1;
        ctx.beginPath(); ctx.arc(0, 0, 20.5, 0, Math.PI*2); ctx.stroke();


        // --- 4. ORBITING DEBRIS ---
        this.debris.forEach(d => {
            const orbitX = Math.cos(d.angle) * d.dist;
            const orbitY = Math.sin(d.angle) * (d.dist * 0.3); // Flatted orbit for 3D look
            
            // Depth sorting: if y > 0 (front), draw after core. If y < 0 (back), draw before.
            // Simplified: Just drawing on top for clarity, but shading by position
            
            const alpha = orbitY < 0 ? 0.5 : 1.0;
            ctx.fillStyle = d.color;
            ctx.globalAlpha = alpha;
            ctx.beginPath(); 
            ctx.fillRect(orbitX - d.size/2, orbitY - d.size/2, d.size, d.size);
            ctx.globalAlpha = 1.0;
        });

        ctx.restore();
    }
}
