
import { EntityType, Vector2, ParticleBehavior, DamageType } from '../../types';
import { BaseTower } from './BaseTower';
import { GameEngine } from '../GameEngine';
import { BaseEnemy } from '../enemies/BaseEnemy';
import { ParticleEffect } from '../Particle';

export class LaserTower extends BaseTower {
    damageType = DamageType.ENERGY;
    laserCharge: number = 0;
    laserBeamWidth: number = 0;
    
    // Animation
    ringAngleX: number = 0;
    ringAngleY: number = 0;
    heatTimer: number = 0;
    
    // Target caching for performance
    debugTarget: BaseEnemy | null = null;
    focusedTarget: BaseEnemy | null = null;

    constructor(x: number, y: number) {
        super(EntityType.TOWER_LASER, x, y);
        this.maxCooldown = 0; // Continuous
        this.range = 4.5;
        this.damage = 1.0; 
        this.totalSpent = 120;
        this.turnSpeed = 10.0; // Fast tracking
    }

    getUpgradeCost(): number {
        return Math.floor(120 * Math.pow(1.5, this.level));
    }

    performUpgradeStats() {
        this.damage = this.damage * 1.3;
        this.range += 0.5;
        this.turnSpeed += 2.0;
    }
    
    forceFire(target: BaseEnemy, engine: GameEngine) {
        this.debugTarget = target;
        this.laserCharge = 3.0; // Max charge instantly
    }

    onTowerUpdate(dt: number, engine: GameEngine) {
        const tick = dt / 16.0;

        let target: BaseEnemy | null = null;
        const enemies = engine.enemies;
        
        // Spin animation
        const spinSpeed = 0.05 + (this.laserCharge * 0.2);
        this.ringAngleX += spinSpeed * tick;
        this.ringAngleY -= spinSpeed * 0.7 * tick;

        // Heat Particles
        if (this.laserCharge > 0.5) {
            this.heatTimer += dt;
            if (this.heatTimer > 50) {
                this.heatTimer = 0;
                const pos = engine.getScreenPos(this.gridPos.x, this.gridPos.y);
                const p = new ParticleEffect(
                    {x: pos.x, y: pos.y}, 
                    45, 
                    'rgba(6, 182, 212, 0.4)', 
                    {x: (Math.random()-0.5), y: -1}, 
                    0.5, 
                    ParticleBehavior.FLOAT
                );
                p.size = 2;
                if (engine.previewMode) {
                    engine.preview.particles.push(p);
                } else {
                    engine.particles.push(p);
                }
            }
        }

        // DEBUG TARGET PRIORITY
        if (this.debugTarget) {
            target = this.debugTarget;
            // Clean up if debug target dead
            if (this.debugTarget.health <= 0) this.debugTarget = null;
        }

        // Verify existing target
        if (!target && this.targetId) {
            // Check cached target first to avoid array search if possible
            if (this.focusedTarget && this.focusedTarget.id === this.targetId && this.focusedTarget.health > 0 && !this.focusedTarget.isDying) {
                 const dist = this.getDist(this.focusedTarget.gridPos);
                 if (dist <= this.range) {
                     target = this.focusedTarget;
                 }
            }
            
            // Fallback to array search if cache miss or invalid
            if (!target) {
                const existing = enemies.find(e => e.id === this.targetId);
                if (existing && existing.health > 0 && !existing.isDying) {
                    const dist = this.getDist(existing.gridPos);
                    if (dist <= this.range) {
                        target = existing;
                    }
                }
            }
        }

        // Find new target if lost
        if (!target) {
            this.laserCharge = Math.max(0, this.laserCharge - dt * 0.005); // Decay
            let minDist = Infinity;
            for (const e of enemies) {
                if (e.health <= 0 || e.isDying) continue;

                const dist = this.getDist(e.gridPos);
                if (dist <= this.range && dist < minDist) {
                    minDist = dist;
                    target = e;
                }
            }
        }

        if (target) {
            this.targetId = target.id;
            this.focusedTarget = target; // Cache for Renderer and next Update

            // Rotation Logic
            const screenT = engine.getScreenPos(target.gridPos.x, target.gridPos.y);
            const screenS = engine.getScreenPos(this.gridPos.x, this.gridPos.y);
            const pivotY = 50;
            const targetY = 15;
            
            const targetAngle = Math.atan2((screenT.y - targetY) - (screenS.y - pivotY), screenT.x - screenS.x);
            
            // Aim
            const isAimed = this.rotateTowards(targetAngle, dt, 0.5); // Wider tolerance for continuous laser

            if (isAimed) {
                this.laserCharge = Math.min(3.0, this.laserCharge + (dt / 1000));
                
                // Damage is already time-based (dt/16), so it scales correctly with tick
                const actualDamage = (this.damage * (1 + this.laserCharge)) * (dt / 16); 
                
                // Use takeDamage for resistance calculation
                const dealt = target.takeDamage(actualDamage, this.damageType, engine);

                if (target.health <= 0 && dealt > 0) {
                    this.killCount++;
                }

                this.laserBeamWidth = 1 + this.laserCharge * 2;
                
                // Hit Sparks
                if (Math.random() > 0.5) {
                    engine.spawnParticle(target.gridPos, target.zHeight + 5, '#67e8f9');
                }
                if (Math.random() > 0.92) {
                    engine.audio.playLaser();
                }
            } else {
                // If aiming but not locked, charge doesn't increase, but doesn't decay as fast
                 this.laserCharge = Math.max(0, this.laserCharge - dt * 0.001);
            }

        } else {
            this.targetId = null;
            this.focusedTarget = null;
        }
    }

    drawModel(ctx: CanvasRenderingContext2D, pos: Vector2) {
        const scale = this.constructionScale;
        const height = 45;

        // Shadow
        ctx.fillStyle = 'rgba(0,0,0,0.4)';
        ctx.beginPath(); ctx.ellipse(pos.x, pos.y, 18 * scale, 9 * scale, 0, 0, Math.PI * 2); ctx.fill();

        // Rings (Floor)
        for(let i=0; i<this.level; i++) {
            ctx.strokeStyle = '#0891b2';
            ctx.lineWidth = 1;
            ctx.beginPath();
            const r = (20 + i*2) * scale;
            ctx.ellipse(pos.x, pos.y - (i*2*scale), r, r * 0.5, 0, 0, Math.PI*2);
            ctx.stroke();
        }

        // Base Structure (Tripod/Pillar)
        const grad = ctx.createLinearGradient(pos.x - 10, pos.y - height, pos.x + 10, pos.y);
        grad.addColorStop(0, '#cffafe'); grad.addColorStop(1, '#155e75');
        
        ctx.fillStyle = grad;
        // Draw triangular base
        ctx.beginPath();
        ctx.moveTo(pos.x, pos.y + 5);
        ctx.lineTo(pos.x + 10*scale, pos.y - 5);
        ctx.lineTo(pos.x, pos.y - height*scale); // Tip
        ctx.lineTo(pos.x - 10*scale, pos.y - 5);
        ctx.fill();

        // Dark accents
        ctx.fillStyle = '#164e63';
        ctx.fillRect(pos.x - 2*scale, pos.y - 35*scale, 4*scale, 20*scale);

        // --- GYROSCOPIC HEAD ---
        ctx.save();
        ctx.translate(pos.x, pos.y - height * scale);
        ctx.scale(scale, scale);
        
        // Face target
        ctx.rotate(this.rotation);

        // 1. Crystal Holder
        ctx.fillStyle = '#1e293b';
        ctx.beginPath();
        ctx.moveTo(5, 0); ctx.lineTo(10, 10); ctx.lineTo(-10, 10); ctx.lineTo(-5, 0);
        ctx.fill();

        // 2. The Crystal (Prism)
        const glow = this.laserCharge / 3.0; // 0 to 1
        const crystalColor = '#22d3ee';
        ctx.shadowColor = crystalColor;
        ctx.shadowBlur = 10 + glow * 20;
        ctx.fillStyle = '#ccfbf1';
        
        ctx.beginPath();
        ctx.moveTo(0, -8);
        ctx.lineTo(6, 0);
        ctx.lineTo(0, 8);
        ctx.lineTo(-6, 0);
        ctx.closePath();
        ctx.fill();
        ctx.shadowBlur = 0;

        // 3. Rotating Lens Rings
        ctx.lineWidth = 2;
        ctx.strokeStyle = '#0891b2';
        
        // Inner Ring
        ctx.save();
        ctx.rotate(this.ringAngleX);
        ctx.beginPath(); ctx.ellipse(0, 0, 12, 6, 0, 0, Math.PI*2); ctx.stroke();
        // Jewels on ring
        ctx.fillStyle = '#06b6d4';
        ctx.beginPath(); ctx.arc(12, 0, 2, 0, Math.PI*2); ctx.fill();
        ctx.beginPath(); ctx.arc(-12, 0, 2, 0, Math.PI*2); ctx.fill();
        ctx.restore();

        // Outer Ring
        ctx.strokeStyle = '#0e7490';
        ctx.save();
        ctx.rotate(this.ringAngleY);
        ctx.beginPath(); ctx.ellipse(0, 0, 18, 4, 0, 0, Math.PI*2); ctx.stroke();
         // Jewels on ring
        ctx.fillStyle = '#155e75';
        ctx.beginPath(); ctx.arc(0, 4, 2, 0, Math.PI*2); ctx.fill();
        ctx.beginPath(); ctx.arc(0, -4, 2, 0, Math.PI*2); ctx.fill();
        ctx.restore();

        ctx.restore();
    }
}
