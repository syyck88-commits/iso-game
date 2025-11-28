
import { EntityType, Vector2, EnemyVariant, TILE_WIDTH, TILE_HEIGHT, DamageType } from '../../types';
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

  constructor(path: Vector2[], wave: number, variant: EnemyVariant) {
    super(EntityType.ENEMY_MINION, path[0].x, path[0].y);
    this.path = path;
    this.variant = variant;
    this.wobbleOffset = Math.random() * 100;
    
    // Default dummy values, overridden by subclasses
    this.maxHealth = 10;
    this.health = 10;
    this.speed = 0.05;
  }

  getEnemyInfo() {
      let description = "A standard hostile unit.";
      let weakness: DamageType[] = [];
      let resistance: DamageType[] = [];

      switch (this.variant) {
          case EnemyVariant.GHOST:
              description = "Ethereal form. Physical attacks pass right through it. Requires Energy or Explosive disruption.";
              weakness = [DamageType.ENERGY, DamageType.EXPLOSIVE];
              resistance = [DamageType.KINETIC, DamageType.PIERCING];
              break;
          case EnemyVariant.TANK:
              description = "Heavily armored plating. Small caliber rounds ricochet. Vulnerable to armor-piercing and explosives.";
              weakness = [DamageType.EXPLOSIVE, DamageType.PIERCING];
              resistance = [DamageType.KINETIC];
              break;
          case EnemyVariant.SWARM:
              description = "Mass of small targets. Hard to hit with precision weapons. Area of Effect (Explosive) recommended.";
              weakness = [DamageType.EXPLOSIVE, DamageType.ENERGY];
              resistance = [DamageType.PIERCING];
              break;
          case EnemyVariant.FAST:
              description = "Lightweight speedster. High mobility but fragile structure. Any hit hurts.";
              weakness = [DamageType.KINETIC];
              break;
          case EnemyVariant.MECH:
              description = "Advanced composite alloy. Resistant to bullets. Sustained Energy beams melt its joints.";
              weakness = [DamageType.ENERGY];
              resistance = [DamageType.KINETIC];
              break;
          case EnemyVariant.HEALER:
              description = "Support unit. Repairs nearby allies. Priority target.";
              weakness = [DamageType.PIERCING]; // Snipers good for picking them off
              break;
          default:
              description = "Basic infantry unit. Balanced defenses.";
      }
      
      // Bosses have general resistances
      if (this.variant.toString().includes('BOSS')) {
          description = "APEX CLASS THREAT. Massive durability.";
          resistance.push(DamageType.KINETIC);
      }

      return { description, weakness, resistance };
  }

  /**
   * Applies damage with resistance/weakness logic based on variant.
   */
  takeDamage(amount: number, type: DamageType, engine: GameEngine): number {
      if (this.health <= 0 || this.isDying) return 0;

      let multiplier = 1.0;
      let textLabel = '';

      switch (this.variant) {
          case EnemyVariant.GHOST:
              // Ghosts are immune to physical/kinetic stuff. Requires Energy/Explosive.
              if (type === DamageType.KINETIC || type === DamageType.PIERCING) {
                  multiplier = 0.05; // 95% Resistance (bullets pass through)
                  textLabel = 'PHASE';
              } else if (type === DamageType.ENERGY) {
                  multiplier = 2.0; // Weak to Energy
                  textLabel = 'CRIT';
              } else if (type === DamageType.EXPLOSIVE) {
                  multiplier = 1.5;
              }
              break;

          case EnemyVariant.TANK:
              // Heavy Armor. Ricochets bullets. Needs Explosive (HE) or Piercing.
              if (type === DamageType.KINETIC) {
                  multiplier = 0.1; // Ricochet
                  textLabel = 'RICOCHET';
              } else if (type === DamageType.EXPLOSIVE) {
                  multiplier = 2.5; // HE shells wreck tracks
                  textLabel = 'CRUSH';
              } else if (type === DamageType.PIERCING) {
                  multiplier = 1.5; // Railgun punches through
              }
              break;

          case EnemyVariant.SWARM:
              // Hard to hit with single shots, weak to AoE.
              if (type === DamageType.EXPLOSIVE) {
                  multiplier = 2.0; // AoE is effective
                  textLabel = 'SPLAT';
              } else if (type === DamageType.PIERCING) {
                  multiplier = 0.5; // Over-penetration / Miss
                  textLabel = 'MISS';
              }
              break;
          
          case EnemyVariant.FAST:
              // Light armor, kinetic rips them apart.
              if (type === DamageType.KINETIC) {
                  multiplier = 1.5;
              }
              break;

          case EnemyVariant.MECH:
              // Composite armor.
              if (type === DamageType.KINETIC) {
                  multiplier = 0.4;
                  textLabel = 'ARMOR';
              }
              if (type === DamageType.ENERGY) {
                  multiplier = 1.5; // Heat melts joints
                  textLabel = 'MELT';
              }
              break;
      }

      // Bosses have general mild resistance to standard Kinetic to force weapon variety
      if (this.variant.startsWith('BOSS')) {
          if (type === DamageType.KINETIC) multiplier = 0.5;
      }

      // Random Crit (Global) - 5% chance
      let isCrit = false;
      if (Math.random() > 0.95) {
          multiplier *= 2.0;
          isCrit = true;
          textLabel = 'CRIT!';
      }

      const finalDamage = amount * multiplier;
      this.health -= finalDamage;

      // Kill logic handled by caller

      // Visual Feedback
      // Only show float text if damage is significant or resistant to reduce clutter
      // But ALWAYS show "RESIST" or "WEAK" labels
      let textColor = '#fff';
      let showText = false;
      let displayText = Math.floor(finalDamage).toString();

      if (multiplier <= 0.5) {
          // RESIST
          textColor = '#9ca3af'; // Grey
          displayText = textLabel || 'RESIST';
          showText = true; // Always show resistance info
      } else if (multiplier >= 1.5) {
          // WEAKNESS
          textColor = isCrit ? '#facc15' : '#f87171'; // Yellow or Red
          displayText = textLabel ? `${textLabel} ${Math.floor(finalDamage)}` : `${Math.floor(finalDamage)}!`;
          showText = true;
      } else {
          // Normal Damage
          // Only show some normal damage numbers to reduce spam, especially for lasers
          if (type !== DamageType.ENERGY || Math.random() > 0.8) {
              showText = true;
          }
      }

      if (showText && !this.isDying) {
          // Add slight random offset to prevent stacking
          const offset = { 
              x: this.gridPos.x + (Math.random()-0.5)*0.5, 
              y: this.gridPos.y + (Math.random()-0.5)*0.5 - 0.5 
          };
          
          // Resistance text floats slower
          const isImportant = multiplier >= 1.5 || multiplier <= 0.5;
          engine.addFloatingText(displayText, offset, textColor, isImportant);
      }

      return finalDamage;
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
        
        // Calculate Screen Space Rotation
        const dirX = (dx / dist);
        const dirY = (dy / dist);
        
        const screenDx = (dirX - dirY) * (TILE_WIDTH / 2);
        const screenDy = (dirX + dirY) * (TILE_HEIGHT / 2);
        
        const targetRot = Math.atan2(screenDy, screenDx);
        
        let diff = targetRot - this.rotation;
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;
        
        this.rotation += diff * 0.2; 
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
      const shadowPos = { x: pos.x, y: pos.y + this.zHeight };
      this.drawShadow(ctx, shadowPos);

      // 2. Draw Specific Enemy Graphics
      if (this.isDying) {
          ctx.translate(pos.x, pos.y);
          ctx.scale(this.scale, this.scale);
          ctx.rotate(this.rotation); 
          ctx.translate(-pos.x, -pos.y);
      }

      // Visual indicator for SLOW
      if (!this.isDying && this.slowTimer > 0) {
          ctx.save();
          // Draw frost aura
          ctx.fillStyle = 'rgba(168, 85, 247, 0.3)';
          ctx.beginPath();
          ctx.ellipse(pos.x, pos.y, 12, 6, 0, 0, Math.PI*2);
          ctx.fill();
          ctx.restore();
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

        let color = '#22c55e';
        if (this.variant === EnemyVariant.GHOST) color = '#22d3ee';
        if (this.variant === EnemyVariant.TANK) color = '#f97316';

        if (pct < 0.3) color = '#ef4444';

        ctx.fillStyle = color;
        ctx.fillRect(pos.x - barWidth/2, barY, barWidth * pct, barHeight);
    }
  }
}
