
import { EntityType, Vector2, DamageType, TargetingMode } from '../../types';
import { BaseEntity } from '../BaseEntity';
import { GameEngine } from '../GameEngine';
import { BaseEnemy } from '../enemies/BaseEnemy';

export abstract class BaseTower extends BaseEntity {
  range: number = 3;
  cooldown: number = 0;
  maxCooldown: number = 60;
  damage: number = 5;
  level: number = 1;
  rotation: number = 0; 
  targetId: string | null = null;
  recoil: number = 0; 
  constructionScale: number = 0; // Animation
  
  // Targeting
  targetingMode: TargetingMode = TargetingMode.CLOSEST;
  
  // Type of damage this tower deals
  abstract damageType: DamageType;

  // Rotation Logic
  turnSpeed: number = 5; // Radians per second

  // Stats & Economy
  killCount: number = 0;
  totalSpent: number = 0;

  constructor(type: EntityType, x: number, y: number) {
    super(type, x, y);
  }

  abstract getUpgradeCost(): number;
  
  upgrade() {
    const cost = this.getUpgradeCost();
    this.totalSpent += cost;
    this.level++;
    this.performUpgradeStats();
    this.constructionScale = 0.5; // Pop effect
  }

  abstract performUpgradeStats(): void;
  
  // Debug / Preview firing
  abstract forceFire(target: BaseEnemy, engine: GameEngine): void;

  getSellValue(): number {
      return Math.floor(this.totalSpent * 0.7);
  }

  update(dt: number, engine: GameEngine) {
      const tick = dt / 16.0;

      // Construction Animation
      if (this.constructionScale < 1) {
          this.constructionScale = Math.min(1, this.constructionScale + 0.1 * tick);
      }
      
      // Recoil Recovery
      if (this.recoil > 0) this.recoil = Math.max(0, this.recoil - 0.5 * tick); 

      // Active Logic only when built
      if (this.constructionScale >= 0.9) {
          this.onTowerUpdate(dt, engine);
      }
  }

  protected getDist(pos: Vector2) {
      const dx = pos.x - this.gridPos.x;
      const dy = pos.y - this.gridPos.y;
      return Math.sqrt(dx*dx + dy*dy);
  }
  
  protected rotateTowards(targetAngle: number, dt: number, tolerance: number = 0.1): boolean {
      let diff = targetAngle - this.rotation;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      
      const maxTurn = this.turnSpeed * (dt / 1000);
      
      if (Math.abs(diff) <= maxTurn) {
          this.rotation = targetAngle;
          return true;
      } else {
          this.rotation += Math.sign(diff) * maxTurn;
          return Math.abs(diff) < tolerance;
      }
  }

  /**
   * Helper to find the best target based on TargetingMode
   */
  protected getBestTarget(enemies: BaseEnemy[]): BaseEnemy | null {
      let bestTarget: BaseEnemy | null = null;
      let bestScore = -Infinity; // For maximization (First, Strongest)
      let minScore = Infinity;   // For minimization (Closest, Weakest)

      for (const e of enemies) {
          if (e.health <= 0 || e.isDying) continue; 

          const dist = this.getDist(e.gridPos);
          if (dist > this.range) continue;

          switch (this.targetingMode) {
              case TargetingMode.CLOSEST:
                  // Minimize Distance
                  if (dist < minScore) {
                      minScore = dist;
                      bestTarget = e;
                  }
                  break;
              
              case TargetingMode.WEAKEST:
                  // Minimize Health
                  if (e.health < minScore) {
                      minScore = e.health;
                      bestTarget = e;
                  }
                  break;

              case TargetingMode.STRONGEST:
                  // Maximize Health
                  if (e.health > bestScore) {
                      bestScore = e.health;
                      bestTarget = e;
                  }
                  break;

              case TargetingMode.FIRST:
                  // Maximize Path Progress (Simple heuristic: Path Index + fractional progress towards next)
                  // Simply using pathIndex is usually enough for grid based, 
                  // but closer to next node is better tie breaker.
                  // We'll just use pathIndex for now as primary sort key
                  const score = e.pathIndex;
                  if (score > bestScore) {
                      bestScore = score;
                      bestTarget = e;
                  } else if (score === bestScore) {
                      // Tie breaker: Closest to tower
                      if (dist < minScore) {
                          minScore = dist;
                          bestTarget = e;
                      }
                  }
                  break;
          }
      }
      return bestTarget;
  }

  abstract onTowerUpdate(dt: number, engine: GameEngine): void;
  abstract drawModel(ctx: CanvasRenderingContext2D, screenPos: Vector2): void;

  draw(ctx: CanvasRenderingContext2D, screenPos: Vector2) {
      this.drawModel(ctx, screenPos);
  }
}
