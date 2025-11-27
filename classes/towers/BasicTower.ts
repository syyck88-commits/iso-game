

import { EntityType, Vector2, ParticleBehavior } from '../../types';
import { BaseTower } from './BaseTower';
import { GameEngine } from '../GameEngine';
import { BaseEnemy } from '../enemies/BaseEnemy';
import { Shell, ParticleEffect } from '../Particle';

export class BasicTower extends BaseTower {
    barrelAngle: number = 0;
    spinSpeed: number = 0;

    constructor(x: number, y: number) {
        super(EntityType.TOWER_BASIC, x, y);
        this.maxCooldown = 15;
        this.range = 3.5;
        this.damage = 5;
        this.totalSpent = 30;
        this.turnSpeed = 8.0; // Fast rotation
    }

    getUpgradeCost(): number {
        return Math.floor(30 * Math.pow(1.5, this.level));
    }

    performUpgradeStats() {
        this.damage = Math.floor(this.damage * 1.5);
        this.range += 0.5;
        this.maxCooldown = Math.max(5, Math.floor(this.maxCooldown * 0.85));
        this.turnSpeed += 1.0; // Upgrades improve traverse speed
    }

    forceFire(target: BaseEnemy, engine: GameEngine) {
        engine.spawnProjectile(this, target);
        engine.audio.playShoot(1.2);
        this.recoil = 5;
        this.cooldown = this.maxCooldown;

        const pos = engine.getScreenPos(this.gridPos.x, this.gridPos.y);
        // Pivot Y hardcoded roughly matching model
        const pivotY = 30; 
        const tipX = pos.x + Math.cos(this.rotation) * 20;
        const tipY = pos.y - pivotY + Math.sin(this.rotation) * 20;
        engine.particles.push(new ParticleEffect({x: tipX, y: tipY}, 0, '#60a5fa', {x:0,y:0}, 0.2, ParticleBehavior.FLOAT));
    }

    onTowerUpdate(dt: number, engine: GameEngine) {
        const tick = dt / 16.0;
        
        if (this.cooldown > 0) this.cooldown -= tick;

        // "Spin" is now energy pulsation
        this.barrelAngle += this.spinSpeed * tick;
        this.spinSpeed *= Math.pow(0.95, tick); // Friction

        const enemies = engine.enemies;
        let bestTarget: BaseEnemy | null = null;
        let minDist = Infinity;

        // 1. Find Target (Skip dying)
        for (const e of enemies) {
            if (e.health <= 0 || e.isDying) continue; // Skip Dead

            const dist = this.getDist(e.gridPos);
            if (dist <= this.range) {
                if (dist < minDist) {
                    minDist = dist;
                    bestTarget = e;
                }
            }
        }

        if (bestTarget) {
            this.targetId = bestTarget.id;
            const screenT = engine.getScreenPos(bestTarget.gridPos.x, bestTarget.gridPos.y);
            const screenS = engine.getScreenPos(this.gridPos.x, this.gridPos.y);
            
            const pivotY = 30; 
            const targetCenterY = 15;

            // Calculate Desired Angle
            const targetAngle = Math.atan2((screenT.y - targetCenterY) - (screenS.y - pivotY), screenT.x - screenS.x);
            
            // Smooth Rotate
            const isAimed = this.rotateTowards(targetAngle, dt, 0.3); // 0.3 rad tolerance

            // Energy Charge Up (always happens if target exists)
            this.spinSpeed = Math.min(1.0, this.spinSpeed + 0.1 * tick);

            // Fire (Only if aimed and cooldown ready)
            if (this.cooldown <= 0 && this.spinSpeed > 0.6 && isAimed) {
                engine.spawnProjectile(this, bestTarget);
                engine.audio.playShoot(1.2);
                this.recoil = 5;
                this.cooldown = this.maxCooldown;

                // Effects: Sleek energy sparks
                const pos = engine.getScreenPos(this.gridPos.x, this.gridPos.y);
                const tipX = pos.x + Math.cos(this.rotation) * 20;
                const tipY = pos.y - pivotY + Math.sin(this.rotation) * 20;
                engine.particles.push(new ParticleEffect({x: tipX, y: tipY}, 0, '#60a5fa', {x:0,y:0}, 0.2, ParticleBehavior.FLOAT));
            }
        } else {
            // Spin down if no target
             this.spinSpeed *= 0.9;
        }
    }

    drawModel(ctx: CanvasRenderingContext2D, pos: Vector2) {
        const scale = this.constructionScale;
        const recoil = this.recoil * 0.5; // Reduced recoil movement for sleeker look
        
        // Colors
        const cGoldDark = '#b45309';
        const cGoldLight = '#fcd34d';
        const cEnergy = '#3b82f6';
        const cEnergyGlow = '#93c5fd';

        // --- SHADOW ---
        ctx.fillStyle = 'rgba(0,0,0,0.4)';
        ctx.beginPath(); ctx.ellipse(pos.x, pos.y, 16 * scale, 8 * scale, 0, 0, Math.PI * 2); ctx.fill();
        
        // --- BASE (Rings) ---
        ctx.save();
        ctx.translate(pos.x, pos.y);
        ctx.scale(scale, scale);

        // Level Indicators (Stacked Rings Style)
        // Scaled alpha so it never completely disappears regardless of level count
        const totalLevels = Math.max(1, this.level);
        for(let i=0; i<this.level; i++) {
             // Calculate alpha based on position in stack (0 to 1)
             const progress = i / totalLevels;
             // Fade from 0.9 (bottom) to 0.2 (top)
             const alpha = 0.9 - (progress * 0.7);
             
             ctx.strokeStyle = `rgba(251, 191, 36, ${Math.max(0.1, alpha)})`; // Fading gold
             ctx.lineWidth = 1;
             ctx.beginPath();
             // Base radius 20, growing slightly
             const r = 20 + (i * 2);
             // Moving up stack
             ctx.ellipse(0, -(i * 2), r, r * 0.5, 0, 0, Math.PI*2);
             ctx.stroke();
        }

        // Lower Ring Body
        const gradBase = ctx.createLinearGradient(-15, -10, 15, 0);
        gradBase.addColorStop(0, cGoldDark);
        gradBase.addColorStop(0.5, cGoldLight);
        gradBase.addColorStop(1, cGoldDark);
        ctx.fillStyle = gradBase;
        ctx.beginPath(); ctx.ellipse(0, 0, 16, 8, 0, 0, Math.PI*2); ctx.fill();
        ctx.strokeStyle = '#78350f'; ctx.lineWidth = 1; ctx.stroke();
        
        // Upper Base Structure (Floating style)
        ctx.translate(0, -6);
        ctx.fillStyle = '#451a03'; // Dark center
        ctx.beginPath(); ctx.ellipse(0, 0, 10, 5, 0, 0, Math.PI*2); ctx.fill();

        // --- TURRET BODY (Egg Shape) ---
        ctx.translate(0, -18);
        ctx.rotate(this.rotation);
        ctx.translate(-recoil, 0); // Recoil moves whole head back

        // Main Shell (Curved, Protoss-like)
        const gradShell = ctx.createLinearGradient(-10, -10, 10, 10);
        gradShell.addColorStop(0, cGoldLight);
        gradShell.addColorStop(1, cGoldDark);
        ctx.fillStyle = gradShell;
        
        ctx.beginPath();
        ctx.moveTo(8, 0); // Front tip
        ctx.bezierCurveTo(4, 12, -12, 12, -14, 0); // Bottom curve back
        ctx.bezierCurveTo(-12, -12, 4, -12, 8, 0); // Top curve forward
        ctx.fill();
        
        // Detail Lines
        ctx.strokeStyle = cGoldLight;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(-6, -6); ctx.quadraticCurveTo(0, 0, -6, 6);
        ctx.stroke();

        // --- ENERGY CORE (The "Barrel") ---
        // Instead of a long barrel, it's an exposed crystal at the front
        const pulse = Math.sin(Date.now() / 100) * 0.2 + 0.8;
        
        ctx.fillStyle = cEnergy;
        ctx.shadowColor = cEnergy;
        ctx.shadowBlur = 10 * pulse;
        
        ctx.beginPath();
        ctx.arc(6, 0, 4, 0, Math.PI*2);
        ctx.fill();
        
        // Core center
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(6, 0, 2, 0, Math.PI*2);
        ctx.fill();
        
        ctx.shadowBlur = 0;

        // Floating bits (Orbitals)
        if (this.spinSpeed > 0.1) {
            const orbitTime = Date.now() / 200;
            ctx.fillStyle = cGoldLight;
            
            // Top Orbital
            const oy1 = Math.sin(orbitTime) * 6;
            const ox1 = Math.cos(orbitTime) * 2; // Flattened orbit
            ctx.beginPath(); ctx.arc(-5 + ox1, -8 + oy1, 1.5, 0, Math.PI*2); ctx.fill();
            
            // Bottom Orbital
            const oy2 = Math.sin(orbitTime + Math.PI) * 6;
            const ox2 = Math.cos(orbitTime + Math.PI) * 2;
            ctx.beginPath(); ctx.arc(-5 + ox2, 8 + oy2, 1.5, 0, Math.PI*2); ctx.fill();
        }

        ctx.restore();
        ctx.restore();
    }
}