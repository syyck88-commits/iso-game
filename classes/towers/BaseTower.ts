

import { EntityType, Vector2 } from '../../types';
import { BaseEntity } from '../BaseEntity';
import { GameEngine } from '../GameEngine';

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

  // Stats & Economy
  killCount: number = 0;
  totalSpent: number = 0;

  constructor(type: EntityType, x: number, y: number) {
    super(type, x, y);
    // Initial cost tracking usually handled by factory/engine, 
    // but we track upgrades here.
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

  // Abstract methods for subclasses
  abstract onTowerUpdate(dt: number, engine: GameEngine): void;
  abstract drawModel(ctx: CanvasRenderingContext2D, screenPos: Vector2): void;

  draw(ctx: CanvasRenderingContext2D, screenPos: Vector2) {
      this.drawModel(ctx, screenPos);
  }
}
