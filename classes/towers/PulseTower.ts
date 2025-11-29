
import { EntityType, Vector2, ParticleBehavior, DamageType } from '../../types';
import { BaseTower } from './BaseTower';
import { GameEngine } from '../GameEngine';
import { ParticleEffect } from '../Particle';
import { BaseEnemy } from '../enemies/BaseEnemy';

export class PulseTower extends BaseTower {
    damageType = DamageType.EXPLOSIVE;
    // Visual State
    coreHeight: number = 0;
    spinAngle: number = 0;
    arcTimer: number = 0;

    constructor(x: number, y: number) {
        super(EntityType.TOWER_PULSE, x, y);
        this.maxCooldown = 50;
        this.range = 2.5; 
        this.damage = 8;
        this.totalSpent = 60;
    }

    getUpgradeCost(): number {
        return Math.floor(60 * Math.pow(1.5, this.level));
    }

    performUpgradeStats() {
        this.damage = Math.floor(this.damage * 1.5);
        this.range += 0.5;
        this.maxCooldown = Math.max(5, Math.floor(this.maxCooldown * 0.85));
    }
    
    forceFire(target: BaseEnemy, engine: GameEngine) {
        // AoE Trigger
        this.cooldown = this.maxCooldown;
        this.recoil = 20; 
        engine.audio.playPulse();

        const center = engine.getScreenPos(this.gridPos.x, this.gridPos.y);
        
        // Effects
        const wave = new ParticleEffect(center, 5, '#a855f7', {x:0, y:0}, 0.6, ParticleBehavior.FLOAT, 'SHOCKWAVE');
        wave.size = 5; 
        
        const waveInner = new ParticleEffect(center, 5, '#e9d5ff', {x:0, y:0}, 0.3, ParticleBehavior.FLOAT, 'SHOCKWAVE');
        waveInner.size = 5; 

        const flash = new ParticleEffect(center, 45, '#fff', {x:0, y:0}, 0.2, ParticleBehavior.FLOAT, 'FLASH');
        flash.size = 50;

        if (engine.previewMode) {
             engine.preview.particles.push(wave, waveInner, flash);
        } else {
             engine.particles.push(wave, waveInner, flash);
        }
    }

    onTowerUpdate(dt: number, engine: GameEngine) {
        const tick = dt / 16.0;

        // Animation: Spin faster as we charge up
        const chargePct = 1 - (this.cooldown / this.maxCooldown);
        this.spinAngle += (0.1 + chargePct * 0.4) * tick;
        this.coreHeight += 0.1 * tick;

        if (this.cooldown > 0) this.cooldown -= tick;

        // Idle Arcs
        this.arcTimer += dt;
        if (this.arcTimer > 100) {
            this.arcTimer = 0;
            // Chance to spawn idle spark
            if (Math.random() > 0.7) {
                const pos = engine.getScreenPos(this.gridPos.x, this.gridPos.y);
                const p = new ParticleEffect(
                    {x: pos.x, y: pos.y}, 
                    35, 
                    '#a855f7', 
                    {x: (Math.random()-0.5)*2, y: (Math.random()-0.5)*2}, 
                    0.2, 
                    ParticleBehavior.FLOAT
                );
                p.size = 1;
                engine.particles.push(p);
            }
        }

        if (this.cooldown <= 0) {
             // Basic firing logic: Only fire if rotated roughly towards a target? 
             // Pulse tower is omni-directional, so we skip rotation checks.
             
             // Dead check filtered in BaseTower, but we do range check here manually for AoE
             const enemies = engine.enemies;
             const enemiesInRange = enemies.filter(e => {
                 if (e.health <= 0 || e.isDying) return false;
                 return this.getDist(e.gridPos) <= this.range;
             });

             if (enemiesInRange.length > 0) {
                  this.forceFire(enemiesInRange[0], engine); // Trigger visual

                  // Apply Damage & Slow
                  enemiesInRange.forEach(e => {
                      const damageDealt = e.takeDamage(this.damage, this.damageType, engine);
                      
                      // Apply Slow Effect (2 seconds)
                      e.applySlow(2000); 

                      if (e.health <= 0 && damageDealt > 0) this.killCount++;
                      
                      // Hit Effect on Enemy
                      const hitFlash = new ParticleEffect(
                          engine.getScreenPos(e.gridPos.x, e.gridPos.y), 
                          e.zHeight + 15, 
                          '#a855f7', 
                          {x:0, y:0}, 
                          0.2, 
                          ParticleBehavior.FLOAT, 
                          'FLASH'
                      );
                      hitFlash.size = 20;
                      engine.particles.push(hitFlash);
                  });
             }
        }
    }

    drawModel(ctx: CanvasRenderingContext2D, pos: Vector2) {
        const scale = this.constructionScale;
        const charge = 1 - (this.cooldown / this.maxCooldown);
        
        // Idle Hover
        const hover = Math.sin(Date.now() / 300) * 3;
        
        // Recoil Squash & Stretch
        const sq = this.recoil * 0.02; 
        
        // --- SHADOW ---
        ctx.fillStyle = 'rgba(0,0,0,0.4)';
        ctx.beginPath(); ctx.ellipse(pos.x, pos.y, 20 * scale, 10 * scale, 0, 0, Math.PI * 2); ctx.fill();
        
        ctx.save();
        ctx.translate(pos.x, pos.y);
        ctx.scale(scale, scale);

        // Level Indicators
        const totalLevels = Math.max(1, this.level);
        for(let i=0; i<this.level; i++) {
             const progress = i / totalLevels;
             const alpha = 0.9 - (progress * 0.7);

             ctx.strokeStyle = `rgba(168, 85, 247, ${Math.max(0.1, alpha)})`;
             ctx.lineWidth = 1;
             ctx.beginPath();
             const r = 22 + (i * 2);
             ctx.ellipse(0, -(i*2), r, r * 0.5, 0, 0, Math.PI*2);
             ctx.stroke();
        }

        // --- BASE ---
        ctx.fillStyle = '#1e1b4b'; // Dark Indigo
        ctx.beginPath();
        ctx.moveTo(-20, 0); ctx.lineTo(0, 10); ctx.lineTo(20, 0); ctx.lineTo(0, -10);
        ctx.fill();

        const gradBase = ctx.createLinearGradient(-15, -20, 15, 0);
        gradBase.addColorStop(0, '#4c1d95'); gradBase.addColorStop(1, '#1e1b4b');
        ctx.fillStyle = gradBase;
        ctx.fillRect(-12, -15, 24, 15);
        
        // --- PYLONS ---
        for(let i=0; i<4; i++) {
            const angle = (Math.PI/2 * i) + (Math.PI/4);
            const px = Math.cos(angle) * 14;
            const py = Math.sin(angle) * 8;
            
            ctx.fillStyle = '#581c87';
            ctx.beginPath(); ctx.ellipse(px, py, 4, 2, 0, 0, Math.PI*2); ctx.fill();
            
            ctx.fillStyle = '#6b21a8';
            ctx.fillRect(px - 2, py - 35, 4, 35);
            
            ctx.fillStyle = '#d8b4fe';
            ctx.fillRect(px - 1, py - 35, 2, 4);
        }

        // --- FLOATING CORE ---
        ctx.translate(0, -30 + hover);
        
        // Apply Squash on fire
        ctx.scale(1 + sq, 1 - sq);

        // Core Glow (Intensifies with charge)
        const glowSize = 10 + (charge * 15);
        ctx.shadowColor = '#a855f7';
        ctx.shadowBlur = glowSize;
        
        const gradCore = ctx.createRadialGradient(-5, -5, 0, 0, 0, 15);
        gradCore.addColorStop(0, '#fff');
        gradCore.addColorStop(0.4, '#d8b4fe');
        gradCore.addColorStop(1, '#6b21a8');
        
        ctx.fillStyle = gradCore;
        ctx.beginPath(); ctx.arc(0, 0, 12, 0, Math.PI*2); ctx.fill();
        ctx.shadowBlur = 0;

        // Rotating Rings
        // Ring 1
        ctx.save();
        ctx.rotate(this.spinAngle);
        ctx.strokeStyle = '#e9d5ff';
        ctx.lineWidth = 3;
        ctx.beginPath(); ctx.ellipse(0, 0, 18, 6, 0, 0, Math.PI*2); ctx.stroke();
        ctx.restore();

        // Ring 2 (Tilted)
        ctx.save();
        ctx.rotate(-this.spinAngle * 1.5);
        ctx.strokeStyle = '#c084fc';
        ctx.lineWidth = 3;
        ctx.scale(1, 0.4); 
        ctx.beginPath(); ctx.arc(0,0, 22, 0, Math.PI*2); ctx.stroke();
        ctx.restore();
        
        // Residual Plasma Sphere (on fire)
        if (this.recoil > 5) {
             ctx.globalCompositeOperation = 'lighter';
             ctx.fillStyle = `rgba(168, 85, 247, ${this.recoil / 20})`;
             ctx.beginPath(); ctx.arc(0, 0, this.recoil * 1.5, 0, Math.PI*2); ctx.fill();
             ctx.globalCompositeOperation = 'source-over';
        }

        // Lightning Arcs to Pylons
        if (this.recoil > 0 || Math.random() > 0.95) {
            ctx.globalCompositeOperation = 'lighter';
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            const pIdx = Math.floor(Math.random()*4);
            const pAngle = (Math.PI/2 * pIdx) + (Math.PI/4);
            const px = Math.cos(pAngle) * 14;
            const py = Math.sin(pAngle) * 8 + 30; // Relative coords
            
            ctx.moveTo(0,0);
            const midX = px * 0.5 + (Math.random()-0.5)*10;
            const midY = py * 0.5 + (Math.random()-0.5)*10;
            ctx.lineTo(midX, midY);
            ctx.lineTo(px, py);
            ctx.stroke();
            ctx.globalCompositeOperation = 'source-over';
        }

        ctx.restore();
    }
}
