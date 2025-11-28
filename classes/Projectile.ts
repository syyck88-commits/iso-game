
import { EntityType, Vector2, ParticleBehavior, DamageType, EnemyVariant } from '../types';
import { BaseEntity } from './BaseEntity';
import { GameEngine } from './GameEngine';
import { BaseEnemy } from './enemies/BaseEnemy';
import { ParticleEffect } from './Particle';
import { BaseTower as Tower } from './towers/BaseTower';

export class Projectile extends BaseEntity {
  target: BaseEnemy;
  speed: number = 0.4; // Grid units per tick (at 60fps)
  damage: number;
  damageType: DamageType;
  prevPos: Vector2;
  sourceId: string;
  isRailgun: boolean = false; // Visual flag

  constructor(startPos: Vector2, target: BaseEnemy, damage: number, damageType: DamageType, sourceId: string) {
    super(EntityType.PROJECTILE, startPos.x, startPos.y);
    this.target = target;
    this.damage = damage;
    this.damageType = damageType;
    this.zHeight = 35; // Flying high
    this.prevPos = { ...startPos };
    this.sourceId = sourceId;

    // Detect if this is a heavy shot based on damage type
    if (this.damageType === DamageType.PIERCING) {
        this.isRailgun = true;
        this.speed = 1.2; // Much faster
    }
  }

  update(dt: number, engine: GameEngine) {
    const tick = dt / 16.0;

    if (this.target.health <= 0) {
        engine.removeEntity(this.id);
        return;
    }
    
    // Store previous position for trail drawing
    this.prevPos.x = this.gridPos.x;
    this.prevPos.y = this.gridPos.y;

    const dx = this.target.gridPos.x - this.gridPos.x;
    const dy = this.target.gridPos.y - this.gridPos.y;
    const dist = Math.sqrt(dx*dx + dy*dy);
    
    // Check hit
    const moveDist = this.speed * tick;

    if (dist < Math.max(0.5, moveDist)) {
        // Hit Logic: Delegate to enemy to handle resistances
        const finalDamage = this.target.takeDamage(this.damage, this.damageType, engine);

        // Kill Credit Logic
        if (this.target.health <= 0 && finalDamage > 0) {
            const tower = engine.entities.find(e => e.id === this.sourceId);
            if (tower && tower instanceof Tower) {
                tower.killCount++;
            }
        }

        // --- AUDIO FEEDBACK ---
        // Determine sound based on enemy type
        if (this.target.variant === EnemyVariant.TANK || 
            this.target.variant === EnemyVariant.MECH || 
            this.target.variant === EnemyVariant.PHALANX || 
            this.target.variant.includes('BOSS')) {
            engine.audio.playImpactMetal();
        } else {
            engine.audio.playImpactOrganic();
        }

        engine.spawnHitEffect(this.target.gridPos);
        engine.removeEntity(this.id);
        
    } else {
        this.gridPos.x += (dx / dist) * moveDist;
        this.gridPos.y += (dy / dist) * moveDist;
        
        // Trail Particles
        if (this.isRailgun) {
             // Railgun Trail (Continuous Line effect handled via particles)
             const center = engine.getScreenPos(this.gridPos.x, this.gridPos.y);
             const p = new ParticleEffect(center, this.zHeight, '#22d3ee', {x:0, y:0}, 0.2, ParticleBehavior.FLOAT);
             p.size = 3;
             engine.particles.push(p);
        } else if (Math.random() > 0.4) {
             const center = engine.getScreenPos(this.gridPos.x, this.gridPos.y);
             const p = new ParticleEffect(center, this.zHeight, '#60a5fa', {x:0, y:0}, 0.3, ParticleBehavior.FLOAT);
             p.size = 1.5;
             engine.particles.push(p);
        }
    }
  }

  draw(ctx: CanvasRenderingContext2D, pos: Vector2) {
      if (this.isRailgun) {
          // Simple elongated glow for Railgun
          ctx.save();
          ctx.translate(pos.x, pos.y);
          
          // Blue Core
          ctx.shadowColor = '#22d3ee';
          ctx.shadowBlur = 15;
          ctx.fillStyle = '#ccfbf1';
          ctx.beginPath();
          ctx.arc(0, 0, 4, 0, Math.PI*2);
          ctx.fill();
          
          ctx.shadowBlur = 0;
          ctx.restore();
      } else {
          // Standard Projectile
          ctx.save();
          ctx.translate(pos.x, pos.y);
          
          // Core
          ctx.fillStyle = '#fff';
          ctx.beginPath();
          ctx.arc(0, 0, 3, 0, Math.PI*2);
          ctx.fill();
          
          // Outer Glow
          ctx.shadowColor = '#60a5fa';
          ctx.shadowBlur = 10;
          ctx.fillStyle = '#93c5fd';
          ctx.beginPath();
          ctx.arc(0, 0, 5, 0, Math.PI*2);
          ctx.fill();
          ctx.shadowBlur = 0;
          
          ctx.restore();
      }
  }
}
