

import { EntityType, Vector2, ParticleBehavior } from '../../types';
import { BaseTower } from './BaseTower';
import { GameEngine } from '../GameEngine';
import { BaseEnemy } from '../enemies/BaseEnemy';
import { ParticleEffect, Shell } from '../Particle';

export class SniperTower extends BaseTower {
    // Visual state
    chargeLevel: number = 0;
    ventTimer: number = 0;

    constructor(x: number, y: number) {
        super(EntityType.TOWER_SNIPER, x, y);
        this.maxCooldown = 120;
        this.range = 7;
        this.damage = 35;
        this.totalSpent = 50;
    }

    getUpgradeCost(): number {
        return Math.floor(50 * Math.pow(1.5, this.level));
    }

    performUpgradeStats() {
        this.damage = Math.floor(this.damage * 1.5);
        this.range += 0.5;
        this.maxCooldown = Math.max(5, Math.floor(this.maxCooldown * 0.85));
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

        if (this.cooldown <= 0) {
            const enemies = engine.enemies;
            let bestTarget: BaseEnemy | null = null;
            
            // Sniper Logic: Prioritize High HP
            for (const e of enemies) {
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
                
                const pivotY = 45;
                const targetCenterY = 15;
                this.rotation = Math.atan2((screenT.y - targetCenterY) - (screenS.y - pivotY), screenT.x - screenS.x);
                
                // Fire
                engine.spawnProjectile(this, bestTarget);
                engine.audio.playSniper();
                
                // Muzzle Flash
                const tipX = screenS.x + Math.cos(this.rotation) * 60;
                const tipY = screenS.y - pivotY + Math.sin(this.rotation) * 60;
                
                // Railgun discharge particles
                for(let i=0; i<8; i++) {
                   const vel = {
                       x: Math.cos(this.rotation) * (5 + Math.random() * 5),
                       y: Math.sin(this.rotation) * (5 + Math.random() * 5)
                   };
                   engine.particles.push(new ParticleEffect(
                       {x: tipX, y: tipY}, 
                       60, '#22d3ee', vel, 0.4, ParticleBehavior.PHYSICS
                   ));
                }

                // Heavy Recoil
                this.recoil = 12;
                this.cooldown = this.maxCooldown;
                
                // Eject large casing (slug sabot)
                const shellVel = {
                    x: -Math.sin(this.rotation) * 2,
                    y: Math.cos(this.rotation) * 2 - 3 
                };
                const shell = new Shell(screenS, 50, shellVel);
                shell.size = 4; // Bigger shell
                shell.color = '#334155'; // Dark sabot
                engine.particles.push(shell);
            }
        }
    }

    spawnVentParticles(engine: GameEngine) {
        const pos = engine.getScreenPos(this.gridPos.x, this.gridPos.y);
        const yOff = 45;
        // Vent from sides of the barrel
        const leftX = pos.x + Math.cos(this.rotation + Math.PI/2) * 10;
        const leftY = pos.y - yOff + Math.sin(this.rotation + Math.PI/2) * 10;
        
        const rightX = pos.x + Math.cos(this.rotation - Math.PI/2) * 10;
        const rightY = pos.y - yOff + Math.sin(this.rotation - Math.PI/2) * 10;

        const p1 = new ParticleEffect({x: leftX, y: leftY}, 50, 'rgba(255,255,255,0.2)', {x:0, y:-1}, 0.8, ParticleBehavior.FLOAT);
        const p2 = new ParticleEffect({x: rightX, y: rightY}, 50, 'rgba(255,255,255,0.2)', {x:0, y:-1}, 0.8, ParticleBehavior.FLOAT);
        engine.particles.push(p1);
        engine.particles.push(p2);
    }

    drawModel(ctx: CanvasRenderingContext2D, pos: Vector2) {
        const scale = this.constructionScale;
        const height = 40;

        // --- SHADOW ---
        ctx.fillStyle = 'rgba(0,0,0,0.4)';
        ctx.beginPath(); ctx.ellipse(pos.x, pos.y, 20 * scale, 10 * scale, 0, 0, Math.PI * 2); ctx.fill();

        // --- BASE (Hydraulic Tripod) ---
        ctx.fillStyle = '#1e293b';
        // Legs
        for(let i=0; i<3; i++) {
            const angle = (Math.PI*2 * i) / 3;
            const lx = Math.cos(angle) * 15 * scale;
            const ly = Math.sin(angle) * 8 * scale;
            
            ctx.beginPath();
            ctx.moveTo(pos.x, pos.y - 10*scale);
            ctx.lineTo(pos.x + lx, pos.y + ly);
            ctx.lineWidth = 4;
            ctx.strokeStyle = '#334155';
            ctx.stroke();
            
            // Feet
            ctx.beginPath(); ctx.arc(pos.x + lx, pos.y + ly, 3, 0, Math.PI*2); ctx.fill();
        }

        // Central Pillar
        const grad = ctx.createLinearGradient(pos.x - 8, pos.y - height, pos.x + 8, pos.y);
        grad.addColorStop(0, '#475569'); grad.addColorStop(1, '#0f172a');
        ctx.fillStyle = grad;
        ctx.fillRect(pos.x - 8 * scale, pos.y - height * scale, 16 * scale, height * scale);
        
        // Tech detail lines
        ctx.fillStyle = '#22c55e';
        ctx.fillRect(pos.x - 2*scale, pos.y - 30*scale, 4*scale, 20*scale); // Green strip

        // --- TURRET ASSEMBLY ---
        ctx.save();
        ctx.translate(pos.x, pos.y - height * scale);
        ctx.rotate(this.rotation);
        ctx.scale(scale, scale);
        
        // Apply Recoil
        const recoilX = -this.recoil;
        ctx.translate(recoilX, 0);

        // 1. Main Housing (Rear)
        ctx.fillStyle = '#334155';
        ctx.beginPath();
        ctx.moveTo(-10, -8); ctx.lineTo(15, -8); ctx.lineTo(15, 8); ctx.lineTo(-10, 8);
        ctx.closePath();
        ctx.fill();
        
        // 2. Capacitor Banks (Sides)
        // Charge glow intensity
        const chargeGlow = this.chargeLevel; // 0 to 1
        const capColor = `rgba(34, 211, 238, ${0.3 + chargeGlow * 0.7})`; // Cyan glow

        // Side Tank Left
        ctx.fillStyle = '#1e293b'; ctx.fillRect(0, -12, 12, 4);
        ctx.fillStyle = capColor; ctx.fillRect(2, -11, 8 * chargeGlow, 2); 
        
        // Side Tank Right
        ctx.fillStyle = '#1e293b'; ctx.fillRect(0, 8, 12, 4);
        ctx.fillStyle = capColor; ctx.fillRect(2, 9, 8 * chargeGlow, 2);

        // 3. Rails (Barrel)
        const barrelLen = 45;
        
        // Top Rail
        ctx.fillStyle = '#0f172a'; 
        ctx.fillRect(15, -6, barrelLen, 3);
        
        // Bottom Rail
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(15, 3, barrelLen, 3);
        
        // Magnetic Core (Between rails)
        // Pulsates when fully charged
        let coreAlpha = chargeGlow;
        if (chargeGlow > 0.9) coreAlpha = 0.8 + Math.sin(Date.now() / 50) * 0.2;
        
        ctx.fillStyle = `rgba(34, 211, 238, ${coreAlpha})`;
        ctx.shadowColor = '#22d3ee';
        ctx.shadowBlur = coreAlpha * 15;
        ctx.fillRect(15, -2, barrelLen - 2, 4);
        ctx.shadowBlur = 0;
        
        // Rail Braces
        ctx.fillStyle = '#475569';
        ctx.fillRect(35, -7, 4, 14);
        ctx.fillRect(55, -7, 4, 14);

        // 4. Scope / Sensor
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(5, -14, 10, 4); // Stem
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(2, -18, 16, 6); // Scope Body
        
        // Lens reflection
        ctx.fillStyle = '#ef4444'; // Red targeting lens
        ctx.beginPath(); ctx.arc(18, -15, 2, 0, Math.PI*2); ctx.fill();

        ctx.restore();
    }
}
