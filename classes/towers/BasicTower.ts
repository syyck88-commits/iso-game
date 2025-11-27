

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
    }

    getUpgradeCost(): number {
        return Math.floor(30 * Math.pow(1.5, this.level));
    }

    performUpgradeStats() {
        this.damage = Math.floor(this.damage * 1.5);
        this.range += 0.5;
        this.maxCooldown = Math.max(5, Math.floor(this.maxCooldown * 0.85));
    }

    onTowerUpdate(dt: number, engine: GameEngine) {
        const tick = dt / 16.0;
        
        if (this.cooldown > 0) this.cooldown -= tick;

        // Spin Logic
        this.barrelAngle += this.spinSpeed * tick;
        this.spinSpeed *= Math.pow(0.95, tick); // Friction

        if (this.cooldown <= 0) {
            const enemies = engine.enemies;
            let bestTarget: BaseEnemy | null = null;
            let minDist = Infinity;

            for (const e of enemies) {
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
                
                const pivotY = 25; // Minigun sits lower
                const targetCenterY = 15;

                this.rotation = Math.atan2((screenT.y - targetCenterY) - (screenS.y - pivotY), screenT.x - screenS.x);

                // Spin Up
                this.spinSpeed = Math.min(1.0, this.spinSpeed + 0.1 * tick);

                // Fire
                if (this.spinSpeed > 0.6) {
                    engine.spawnProjectile(this, bestTarget);
                    engine.audio.playShoot(1.2);
                    this.recoil = 5;
                    this.cooldown = this.maxCooldown;

                    // Effects
                    const pos = engine.getScreenPos(this.gridPos.x, this.gridPos.y);
                    const shellVel = {
                        x: -Math.sin(this.rotation) * (2 + Math.random()) + (Math.random()-0.5),
                        y: Math.cos(this.rotation) * (2 + Math.random()) - 3 
                    };
                    engine.particles.push(new Shell(pos, 40, shellVel));

                    const tipX = pos.x + Math.cos(this.rotation) * 35;
                    const tipY = pos.y - pivotY + Math.sin(this.rotation) * 35;
                    engine.particles.push(new ParticleEffect({x: tipX, y: tipY}, 0, '#fff', {x:0,y:0}, 0.1, ParticleBehavior.FLOAT));
                }
            }
        }
    }

    drawModel(ctx: CanvasRenderingContext2D, pos: Vector2) {
        const scale = this.constructionScale;
        
        // Shadow
        ctx.fillStyle = 'rgba(0,0,0,0.4)';
        ctx.beginPath(); ctx.ellipse(pos.x, pos.y, 16 * scale, 8 * scale, 0, 0, Math.PI * 2); ctx.fill();
        
        // Base Rings
        for(let i=0; i<this.level; i++) {
            ctx.strokeStyle = '#3b82f6';
            ctx.lineWidth = 2;
            ctx.beginPath();
            const r = (18 + i) * scale;
            ctx.ellipse(pos.x, pos.y - (i*3*scale), r, r * 0.5, 0, 0, Math.PI*2);
            ctx.stroke();
        }

        ctx.save();
        ctx.translate(pos.x, pos.y);
        ctx.scale(scale, scale);

        // Tripod
        ctx.strokeStyle = '#334155';
        ctx.lineWidth = 3;
        for(let i=0; i<3; i++) {
            const angle = (Math.PI * 2 * i) / 3 + (Math.PI/2);
            ctx.beginPath(); ctx.moveTo(0, -10); ctx.lineTo(Math.cos(angle)*15, Math.sin(angle)*8); ctx.stroke();
            ctx.fillStyle = '#1e293b'; ctx.beginPath(); ctx.arc(Math.cos(angle)*15, Math.sin(angle)*8, 2, 0, Math.PI*2); ctx.fill();
        }

        // Base
        ctx.fillStyle = '#475569'; ctx.fillRect(-6, -15, 12, 10);
        
        // Turret Head
        ctx.save();
        ctx.translate(0, -25);
        ctx.rotate(this.rotation);
        
        ctx.fillStyle = '#15803d'; ctx.fillRect(-10, -8, 8, 16); // Ammo
        ctx.fillStyle = '#facc15'; ctx.fillRect(-8, -4, 2, 8); // Detail
        ctx.fillStyle = '#1e293b'; ctx.fillRect(-6, -8, 12, 16); // Body
        
        const kick = this.recoil > 0 ? 2 : 0;
        ctx.save();
        ctx.translate(8 - kick, 0); 
        
        // Barrel
        ctx.fillStyle = '#334155'; ctx.fillRect(0, -6, 20, 12);
        const bA = this.barrelAngle;
        ctx.fillStyle = '#94a3b8';
        ctx.fillRect(0, Math.sin(bA)*3 - 1, 20, 2);
        ctx.fillRect(0, Math.sin(bA+2)*3 - 1, 20, 2);
        ctx.fillRect(0, Math.sin(bA+4)*3 - 1, 20, 2);
        
        ctx.fillStyle = '#0f172a'; ctx.fillRect(18, -6, 2, 12); // Muzzle

        if (this.recoil > 0) {
            ctx.translate(22, 0);
            ctx.fillStyle = '#fef08a';
            ctx.globalCompositeOperation = 'lighter';
            ctx.beginPath(); ctx.moveTo(0,0); ctx.lineTo(20, -5); ctx.lineTo(25, 0); ctx.lineTo(20, 5); ctx.fill();
            ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(0,0,6,0,Math.PI*2); ctx.fill();
        }
        ctx.restore(); // End Barrel

        ctx.fillStyle = '#64748b'; ctx.fillRect(-4, -10, 8, 4); // Sight
        ctx.restore(); // End Rot
        ctx.restore(); // End Scale
    }
}
