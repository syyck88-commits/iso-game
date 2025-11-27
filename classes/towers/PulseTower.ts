

import { EntityType, Vector2, ParticleBehavior } from '../../types';
import { BaseTower } from './BaseTower';
import { GameEngine } from '../GameEngine';
import { ParticleEffect } from '../Particle';

export class PulseTower extends BaseTower {
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

    onTowerUpdate(dt: number, engine: GameEngine) {
        const tick = dt / 16.0;

        // Animation
        this.spinAngle += (0.05 + (1 - (this.cooldown/this.maxCooldown)) * 0.2) * tick;
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
             const enemies = engine.enemies;
             const enemiesInRange = enemies.filter(e => this.getDist(e.gridPos) <= this.range);

             if (enemiesInRange.length > 0) {
                  this.cooldown = this.maxCooldown;
                  this.recoil = 15;
                  engine.audio.playPulse();

                  const center = engine.getScreenPos(this.gridPos.x, this.gridPos.y);
                  
                  // 1. Ground Shockwave Ring
                  for(let i=0; i<24; i++) {
                      const ang = (Math.PI * 2 * i) / 24;
                      const vel = { x: Math.cos(ang) * 6, y: Math.sin(ang) * 3 }; 
                      const p = new ParticleEffect(center, 5, '#c084fc', vel, 0.5);
                      p.size = 3;
                      engine.particles.push(p);
                  }

                  // 2. Vertical Energy Discharge
                  for(let i=0; i<8; i++) {
                      const p = new ParticleEffect(
                          center, 
                          30, 
                          '#fff', 
                          {x: (Math.random()-0.5)*4, y: -Math.random()*5}, 
                          0.4, 
                          ParticleBehavior.FLOAT
                      );
                      engine.particles.push(p);
                  }

                  enemiesInRange.forEach(e => {
                      e.health -= this.damage;
                      if (e.health <= 0) this.killCount++;
                      engine.spawnHitEffect(e.gridPos);
                      // Visual link
                      // engine.spawnParticle(e.gridPos, e.zHeight, '#a855f7');
                  });
             }
        }
    }

    drawModel(ctx: CanvasRenderingContext2D, pos: Vector2) {
        const scale = this.constructionScale;
        const bounce = Math.sin(this.coreHeight) * 3;
        const energyPct = 1 - (this.cooldown / this.maxCooldown);
        const glowIntensity = 0.5 + energyPct * 0.5;

        // --- SHADOW ---
        ctx.fillStyle = 'rgba(0,0,0,0.4)';
        ctx.beginPath(); ctx.ellipse(pos.x, pos.y, 20 * scale, 10 * scale, 0, 0, Math.PI * 2); ctx.fill();

        // --- INDUSTRIAL BASE ---
        ctx.fillStyle = '#1e1b4b'; // Dark Indigo
        // Base plate
        ctx.beginPath();
        ctx.moveTo(pos.x - 20*scale, pos.y);
        ctx.lineTo(pos.x, pos.y + 10*scale);
        ctx.lineTo(pos.x + 20*scale, pos.y);
        ctx.lineTo(pos.x, pos.y - 10*scale);
        ctx.fill();

        // Base Block
        const gradBase = ctx.createLinearGradient(pos.x-15, pos.y-20, pos.x+15, pos.y);
        gradBase.addColorStop(0, '#4c1d95');
        gradBase.addColorStop(1, '#1e1b4b');
        ctx.fillStyle = gradBase;
        ctx.fillRect(pos.x - 12*scale, pos.y - 15*scale, 24*scale, 15*scale);
        
        // --- 4 PYLONS (Containment) ---
        for(let i=0; i<4; i++) {
            const angle = (Math.PI/2 * i) + (Math.PI/4);
            const px = Math.cos(angle) * 14 * scale;
            const py = Math.sin(angle) * 8 * scale;
            
            // Pylon Base
            ctx.fillStyle = '#581c87';
            ctx.beginPath(); 
            ctx.ellipse(pos.x + px, pos.y + py, 4*scale, 2*scale, 0, 0, Math.PI*2); 
            ctx.fill();
            
            // Pylon Shaft
            ctx.fillStyle = '#6b21a8';
            ctx.fillRect(pos.x + px - 2*scale, pos.y + py - 35*scale, 4*scale, 35*scale);
            
            // Pylon Tip
            ctx.fillStyle = '#d8b4fe';
            ctx.fillRect(pos.x + px - 1*scale, pos.y + py - 35*scale, 2*scale, 4*scale);
        }

        // --- FLOATING CORE ---
        ctx.save();
        ctx.translate(pos.x, pos.y - 25*scale - bounce);
        
        // Scale pulse on fire
        const expansion = this.recoil > 0 ? (this.recoil / 5) : 0;
        ctx.scale(1 + expansion, 1 + expansion);

        // Core Glow
        const coreColor = '#a855f7';
        ctx.shadowColor = this.recoil > 0 ? '#fff' : coreColor;
        ctx.shadowBlur = 15 * glowIntensity + (this.recoil * 2);
        
        // Draw Core (Sphere look)
        const gradCore = ctx.createRadialGradient(-3, -3, 0, 0, 0, 10);
        gradCore.addColorStop(0, '#fff');
        gradCore.addColorStop(0.3, '#d8b4fe');
        gradCore.addColorStop(1, '#7e22ce');
        ctx.fillStyle = gradCore;
        
        ctx.beginPath();
        ctx.arc(0, 0, 10, 0, Math.PI*2);
        ctx.fill();
        ctx.shadowBlur = 0;

        // Rotating Rings around core
        ctx.strokeStyle = `rgba(216, 180, 254, ${glowIntensity})`;
        ctx.lineWidth = 2;
        
        ctx.save();
        ctx.rotate(this.spinAngle);
        ctx.beginPath(); ctx.ellipse(0, 0, 16, 4, 0, 0, Math.PI*2); ctx.stroke();
        ctx.restore();

        ctx.save();
        ctx.rotate(-this.spinAngle * 1.5);
        ctx.beginPath(); ctx.ellipse(0, 0, 14, 8, 0, 0, Math.PI*2); ctx.stroke();
        ctx.restore();

        // --- LIGHTNING ARCS ---
        if (Math.random() > 0.5 || this.recoil > 0) {
            ctx.globalCompositeOperation = 'lighter';
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            // Pick a random pylon pos relative to center
            const pIdx = Math.floor(Math.random()*4);
            const pAngle = (Math.PI/2 * pIdx) + (Math.PI/4);
            const px = Math.cos(pAngle) * 14 * scale;
            const py = Math.sin(pAngle) * 8 * scale + 10; // Adjust for coordinate space
            
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
