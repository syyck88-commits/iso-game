import { EntityType, Vector2, EnemyVariant } from '../../types';
import { BaseEntity, generateId } from '../BaseEntity';
import { GameEngine } from '../GameEngine';

export abstract class BaseEnemy extends BaseEntity {
  variant: EnemyVariant;
  path: Vector2[] = [];
  pathIndex: number = 0;
  
  health: number;
  maxHealth: number;
  speed: number;
  wobbleOffset: number;
  
  // Bounty value
  moneyValue: number = 10;

  // Visual & State
  isDying: boolean = false;
  deathTimer: number = 0;
  opacity: number = 1.0;
  scale: number = 1.0;
  rotation: number = 0;

  // Status Effects
  slowTimer: number = 0;
  slowFactor: number = 0.5;

  constructor(path: Vector2[], waveDifficulty: number, variant: EnemyVariant) {
    super(EntityType.ENEMY_MINION, path[0].x, path[0].y);
    this.path = path;
    this.variant = variant;
    this.wobbleOffset = Math.random() * 100;
    
    // Default dummy values, overridden by subclasses
    this.maxHealth = 10;
    this.health = 10;
    this.speed = 0.05;
  }

  // Shared movement logic
  update(dt: number, engine: GameEngine) {
    // Tick scaling: normalize to 60fps (16ms)
    const tick = dt / 16.0;

    // 1. Death Sequence Logic
    if (this.health <= 0 && !this.isDying) {
        this.isDying = true;
        this.health = 0; // Clamp
        this.onDeathStart(engine);
    }

    if (this.isDying) {
        this.deathTimer += dt;
        this.onDeathUpdate(dt, engine);
        if (this.opacity <= 0 || this.scale <= 0 || this.deathTimer > 1500) {
             this.finalizeDeath(engine);
        }
        return; // Don't move or act if dying
    }

    // Update Status Effects
    if (this.slowTimer > 0) {
        this.slowTimer -= dt;
    }

    // 2. Standard Update (Movement & Abilities)
    this.onUpdate(dt, engine); 

    // Pathfinding
    if (this.pathIndex < this.path.length - 1) {
      const target = this.path[this.pathIndex + 1];
      const dx = target.x - this.gridPos.x;
      const dy = target.y - this.gridPos.y;
      const dist = Math.sqrt(dx*dx + dy*dy);

      // Scaled movement speed with SLOW factor
      let currentSpeed = this.speed;
      if (this.slowTimer > 0) currentSpeed *= this.slowFactor;

      const moveStep = currentSpeed * tick;

      if (dist < moveStep) {
        this.gridPos.x = target.x;
        this.gridPos.y = target.y;
        this.pathIndex++;
      } else {
        this.gridPos.x += (dx / dist) * moveStep;
        this.gridPos.y += (dy / dist) * moveStep;
        
        // Face movement direction roughly (for rendering rotation if needed)
        // this.rotation = Math.atan2(dy, dx);
      }
    } else {
      // Reached End
      this.onReachEnd(engine);
    }
  }

  applySlow(durationMs: number) {
      this.slowTimer = Math.max(this.slowTimer, durationMs);
  }

  // Hook for special abilities / Particles
  onUpdate(dt: number, engine: GameEngine) {}

  // Called ONCE when HP <= 0
  onDeathStart(engine: GameEngine) {
      // Default: Money and explosion sound
      let bounty = this.moneyValue + Math.floor(engine.gameState.wave);
      engine.gameState.money += bounty;
      engine.spawnLootEffect(this.gridPos, bounty);
      engine.addFloatingText(`+$${bounty}`, this.gridPos, '#fbbf24');
      engine.audio.playExplosion();
  }

  // Called every frame during death
  onDeathUpdate(dt: number, engine: GameEngine) {
      // Default generic fade out
      this.opacity -= dt * 0.002;
  }

  // Called to actually remove entity
  finalizeDeath(engine: GameEngine) {
      engine.removeEntity(this.id);
  }

  onReachEnd(engine: GameEngine) {
      engine.removeEntity(this.id);
      let dmg = 1;
      // Bosses deal more damage
      if (this.variant.startsWith('BOSS')) dmg = 10;
      if (this.variant === EnemyVariant.BOSS_FINAL) dmg = 1000;
      
      engine.gameState.health = Math.max(0, engine.gameState.health - dmg);
      engine.addFloatingText(`-${dmg} HP`, this.gridPos, '#ef4444', true);
      engine.audio.playHit();
      engine.shakeScreen(5);
  }

  draw(ctx: CanvasRenderingContext2D, pos: Vector2) {
      ctx.save();
      ctx.globalAlpha = Math.max(0, this.opacity);

      // 1. Draw Shadow (Projected to Ground)
      // `pos` is the entity's Z-shifted air position. 
      // Shadow must be at `pos.y + this.zHeight`.
      const shadowPos = { x: pos.x, y: pos.y + this.zHeight };
      this.drawShadow(ctx, shadowPos);

      // 2. Draw Specific Enemy Graphics
      // Apply death transforms if needed
      if (this.isDying) {
          ctx.translate(pos.x, pos.y);
          ctx.scale(this.scale, this.scale);
          ctx.rotate(this.rotation);
          ctx.translate(-pos.x, -pos.y);
      }

      // Visual indicator for SLOW
      if (!this.isDying && this.slowTimer > 0) {
          ctx.save();
          ctx.globalCompositeOperation = 'source-atop';
          ctx.fillStyle = 'rgba(192, 132, 252, 0.3)'; // Purple tint
          // This composition is tricky with custom draw calls, 
          // instead we can just draw a "Frost" circle under them or over them
          ctx.restore();
          
          // Draw frost aura
          ctx.fillStyle = 'rgba(168, 85, 247, 0.3)';
          ctx.beginPath();
          ctx.ellipse(pos.x, pos.y, 12, 6, 0, 0, Math.PI*2);
          ctx.fill();
      }

      this.drawModel(ctx, pos);

      // 3. Draw HP Bar (Only if alive)
      if (!this.isDying) {
          this.drawHealthBar(ctx, pos);
      }
      
      ctx.restore();
  }

  abstract drawModel(ctx: CanvasRenderingContext2D, pos: Vector2): void;

  drawShadow(ctx: CanvasRenderingContext2D, pos: Vector2) {
    // If dying and flying away, fade shadow faster
    if (this.isDying && this.zHeight > 10) return; 
    
    ctx.fillStyle = `rgba(0,0,0,${0.3 * this.scale * this.opacity})`;
    ctx.beginPath();
    ctx.ellipse(pos.x, pos.y, 12 * this.scale, 6 * this.scale, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  drawHealthBar(ctx: CanvasRenderingContext2D, pos: Vector2) {
    if (this.health < this.maxHealth) {
        const barWidth = 20;
        const barHeight = 4;
        const barY = pos.y - 35; // Relative to body
        const pct = Math.max(0, this.health / this.maxHealth);

        ctx.fillStyle = 'rgba(0,0,0,0.6)';
        ctx.fillRect(pos.x - barWidth/2, barY, barWidth, barHeight);

        ctx.fillStyle = pct > 0.5 ? '#22c55e' : (pct > 0.2 ? '#eab308' : '#ef4444');
        ctx.fillRect(pos.x - barWidth/2, barY, barWidth * pct, barHeight);
    }
  }
}