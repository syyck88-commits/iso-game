
import { EntityType, Vector2, ParticleBehavior, DamageType } from '../../types';
import { BaseTower } from './BaseTower';
import { GameEngine } from '../GameEngine';
import { BaseEnemy } from '../enemies/BaseEnemy';
import { ParticleEffect, Shell } from '../Particle';

export class SniperTower extends BaseTower {
    damageType = DamageType.PIERCING;
    // Visual state
    chargeLevel: number = 0;
    ventTimer: number = 0;

    constructor(x: number, y: number) {
        super(EntityType.TOWER_SNIPER, x, y);
        this.maxCooldown = 120;
        this.range = 7;
        this.damage = 35;
        this.totalSpent = 50;
        this.turnSpeed = 2.5; // Very slow rotation (Balance)
    }

    getUpgradeCost(): number {
        return Math.floor(50 * Math.pow(1.5, this.level));
    }

    performUpgradeStats() {
        this.damage = Math.floor(this.damage * 1.5);
        this.range += 0.5;
        this.maxCooldown = Math.max(5, Math.floor(this.maxCooldown * 0.85));
        this.turnSpeed += 0.5; 
    }

    forceFire(target: BaseEnemy, engine: GameEngine) {
        engine.spawnProjectile(this, target);
        engine.audio.playSniper();
        
        const screenS = engine.getScreenPos(this.gridPos.x, this.gridPos.y);
        const pivotY = 45;
        const tipX = screenS.x + Math.cos(this.rotation) * 40;
        const tipY = screenS.y - pivotY + Math.sin(this.rotation) * 40;
        
        // Railgun discharge particles
        for(let i=0; i<8; i++) {
           const vel = {
               x: Math.cos(this.rotation) * (5 + Math.random() * 5),
               y: Math.sin(this.rotation) * (5 + Math.random() * 5)
           };
           engine.particles.push(new ParticleEffect(
               {x: tipX, y: tipY}, 
               0, '#22d3ee', vel, 0.4, ParticleBehavior.PHYSICS
           ));
        }

        this.recoil = 8;
        this.cooldown = this.maxCooldown;
        
        // Residue
        const shellVel = {
            x: -Math.sin(this.rotation) * 2,
            y: Math.cos(this.rotation) * 2 - 3 
        };
        const residue = new ParticleEffect({x:screenS.x, y:screenS.y}, 40, '#0ea5e9', shellVel, 0.5, ParticleBehavior.PHYSICS);
        residue.size = 2;
        engine.particles.push(residue);
    }

    onTowerUpdate(dt: number, engine: GameEngine) {
        const tick = dt / 16.0;

        // Visual Charge Logic
        const cooldownPct = Math.max(0, this.cooldown / this.maxCooldown);
        this.chargeLevel = 1.0 - cooldownPct;

        if (this.cooldown > 0) this.cooldown -= tick;
        
        // Venting Steam Effect after firing
        if (this.cooldown > this.maxCooldown - 20) {
            this.ventTimer += dt;
            if (this.ventTimer > 50) {
                this.ventTimer = 0;
                this.spawnVentParticles(engine);
            }
        }

        const enemies = engine.enemies;
        let bestTarget: BaseEnemy | null = null;
        
        // Sniper Logic: Prioritize High HP
        for (const e of enemies) {
            if (e.health <= 0 || e.isDying) continue; // Skip Dead

            if (this.getDist(e.gridPos) <= this.range) {
                if (!bestTarget || e.health > bestTarget.health) {
                    bestTarget = e;
                }
            }
        }

        if (bestTarget) {
            this.targetId = bestTarget.id;
            const screenT = engine.getScreenPos(bestTarget.gridPos.x, bestTarget.gridPos.y);
            const screenS = engine.getScreenPos(this.gridPos.x, this.gridPos.y);
            
            const pivotY = 45; // Match visual height (was 50)
            const targetCenterY = 15;
            
            // Calculate Angle
            const targetAngle = Math.atan2((screenT.y - targetCenterY) - (screenS.y - pivotY), screenT.x - screenS.x);
            
            // Rotate Slowly
            const isAimed = this.rotateTowards(targetAngle, dt, 0.1); // Strict tolerance for sniper (must aim well)

            if (this.cooldown <= 0 && isAimed) {
                // Fire
                this.forceFire(bestTarget, engine);
            }
        }
    }

    spawnVentParticles(engine: GameEngine) {
        const pos = engine.getScreenPos(this.gridPos.x, this.gridPos.y);
        // Vent energy from the core
        // Use Z=45 (top of tower) with ground position
        const p1 = new ParticleEffect({x: pos.x, y: pos.y}, 45, 'rgba(34, 211, 238, 0.4)', {x:0, y:-1}, 0.5, ParticleBehavior.FLOAT);
        engine.particles.push(p1);
    }

    drawModel(ctx: CanvasRenderingContext2D, pos: Vector2) {
        const scale = this.constructionScale;
        const height = 45; // Tall, slender tower

        // Colors
        const cSilver = '#94a3b8';
        const cDarkMetal = '#1e293b';
        const cEnergy = '#06b6d4';
        const cGlow = '#67e8f9';

        // --- SHADOW ---
        ctx.fillStyle = 'rgba(0,0,0,0.4)';
        ctx.beginPath(); ctx.ellipse(pos.x, pos.y, 16 * scale, 8 * scale, 0, 0, Math.PI * 2); ctx.fill();

        // --- BASE (Floating Pylons) ---
        ctx.save();
        ctx.translate(pos.x, pos.y);
        ctx.scale(scale, scale);

        // Level Indicators (Stacked Rings Style)
        const totalLevels = Math.max(1, this.level);
        for(let i=0; i<this.level; i++) {
             const progress = i / totalLevels;
             const alpha = 0.9 - (progress * 0.7);

             ctx.strokeStyle = `rgba(34, 211, 238, ${Math.max(0.1, alpha)})`; // Cyan
             ctx.lineWidth = 1;
             ctx.beginPath();
             const r = 20 + (i * 2);
             ctx.ellipse(0, -(i*2), r, r * 0.5, 0, 0, Math.PI*2);
             ctx.stroke();
        }

        // 3 Floating "Feet"
        ctx.fillStyle = cDarkMetal;
        for(let i=0; i<3; i++) {
            const angle = (Math.PI*2 * i) / 3;
            const lx = Math.cos(angle) * 12;
            const ly = Math.sin(angle) * 6;
            
            ctx.beginPath();
            ctx.moveTo(lx, ly);
            ctx.lineTo(lx, ly - 10); // Vertical rise
            ctx.lineTo(lx*0.5, ly*0.5 - 5); // Connect to center
            ctx.fill();
            
            // Glowing pads
            ctx.fillStyle = cEnergy;
            ctx.beginPath(); ctx.arc(lx, ly-10, 1.5, 0, Math.PI*2); ctx.fill();
            ctx.fillStyle = cDarkMetal; // Reset
        }
        
        // Central Pillar
        const gradPillar = ctx.createLinearGradient(-4, -height, 4, 0);
        gradPillar.addColorStop(0, '#cbd5e1'); // Light Silver
        gradPillar.addColorStop(1, '#475569'); // Darker
        ctx.fillStyle = gradPillar;
        ctx.fillRect(-3, -height, 6, height);
        
        // --- TURRET ASSEMBLY ---
        ctx.translate(0, -height);
        ctx.rotate(this.rotation);
        
        // Apply Recoil (Kick back)
        const recoilX = -this.recoil * 0.8;
        ctx.translate(recoilX, 0);

        // 1. Core Housing (Sleek, elongated)
        ctx.fillStyle = cSilver;
        ctx.beginPath();
        ctx.moveTo(10, 0);
        ctx.bezierCurveTo(5, -6, -15, -6, -20, 0); // Top curve
        ctx.bezierCurveTo(-15, 6, 5, 6, 10, 0); // Bottom curve
        ctx.fill();
        
        // Dark accents
        ctx.fillStyle = cDarkMetal;
        ctx.beginPath();
        ctx.moveTo(-10, -2); ctx.lineTo(-18, -2); ctx.lineTo(-18, 2); ctx.lineTo(-10, 2);
        ctx.fill();

        // 2. The "Lance" (Split rails with energy between)
        // Two long prongs
        const prongLen = 30;
        
        // Top Prong
        ctx.fillStyle = '#64748b';
        ctx.beginPath();
        ctx.moveTo(5, -3); ctx.lineTo(5 + prongLen, -4); ctx.lineTo(5 + prongLen - 5, -1); ctx.lineTo(5, -1);
        ctx.fill();
        
        // Bottom Prong
        ctx.fillStyle = '#64748b';
        ctx.beginPath();
        ctx.moveTo(5, 3); ctx.lineTo(5 + prongLen, 4); ctx.lineTo(5 + prongLen - 5, 1); ctx.lineTo(5, 1);
        ctx.fill();

        // 3. Floating Focus Crystals
        // These float between the prongs
        const charge = this.chargeLevel; // 0 to 1
        
        // Energy Beam / Charge
        if (charge > 0.1) {
            ctx.fillStyle = `rgba(34, 211, 238, ${charge})`;
            ctx.shadowColor = cGlow;
            ctx.shadowBlur = charge * 10;
            ctx.fillRect(5, -1, prongLen - 8, 2); // Core beam
            ctx.shadowBlur = 0;
        }

        // Focusing Lens at tip
        ctx.fillStyle = cEnergy;
        ctx.beginPath();
        ctx.moveTo(5 + prongLen, 0);
        ctx.lineTo(5 + prongLen + 4, -2);
        ctx.lineTo(5 + prongLen + 8, 0);
        ctx.lineTo(5 + prongLen + 4, 2);
        ctx.fill();

        // 4. Rear Detail (Counterweight)
        ctx.fillStyle = cEnergy;
        ctx.beginPath(); ctx.arc(-20, 0, 2, 0, Math.PI*2); ctx.fill();

        ctx.restore();
    }
}
