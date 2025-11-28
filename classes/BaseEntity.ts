
import { GameObject, EntityType, Vector2 } from '../types';
import { GameEngine } from './GameEngine';

let idCounter = 0;
export const generateId = () => `ent_${++idCounter}`;

export abstract class BaseEntity implements GameObject {
  id: string;
  type: EntityType;
  gridPos: Vector2;
  zHeight: number = 0;
  
  constructor(type: EntityType, x: number, y: number) {
    this.id = generateId();
    this.type = type;
    this.gridPos = { x, y };
  }

  get depth(): number {
    return this.gridPos.x + this.gridPos.y; 
  }

  abstract update(dt: number, engine: GameEngine): void;
  abstract draw(ctx: CanvasRenderingContext2D, screenPos: Vector2): void;
  
  // New method for shadow pass (default empty)
  drawShadow(ctx: CanvasRenderingContext2D, screenPos: Vector2): void {}
}
