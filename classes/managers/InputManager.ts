
import { GameEngine } from '../GameEngine';
import { Vector2, GridPoint, EntityType, GRID_SIZE } from '../../types';
import { toGrid } from '../../utils/isoMath';
import { Tower } from '../Entities';

export class InputManager {
  engine: GameEngine;
  
  mouseScreenPos: Vector2 = { x: 0, y: 0 };
  hoverTile: GridPoint | null = null;
  
  selectedTowerType: EntityType | null = null;
  selectedEntityId: string | null = null;

  constructor(engine: GameEngine) {
    this.engine = engine;
    this.setupListeners();
  }

  setupListeners() {
    this.engine.canvas.addEventListener('mousemove', this.handleMouseMove.bind(this));
    this.engine.canvas.addEventListener('mousedown', this.handleMouseDown.bind(this));
    this.engine.canvas.addEventListener('contextmenu', this.handleRightClick.bind(this));
  }

  handleMouseMove(e: MouseEvent) {
    const rect = this.engine.canvas.getBoundingClientRect();
    this.mouseScreenPos = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };

    const gridP = toGrid(
        this.mouseScreenPos.x, 
        this.mouseScreenPos.y, 
        this.engine.renderer.offsetX, 
        this.engine.renderer.offsetY
    );
    
    if (gridP.gx >= 0 && gridP.gx < GRID_SIZE && gridP.gy >= 0 && gridP.gy < GRID_SIZE) {
      this.hoverTile = gridP;
    } else {
      this.hoverTile = null;
    }
  }

  handleMouseDown(e: MouseEvent) {
    if (e.button !== 0) return; 
    this.engine.audio.ensureContext();
    if (!this.engine.gameState.gameActive) return;

    // 1. Tower Selection (Only if NOT building)
    if (!this.selectedTowerType) {
      const hitEntity = this.getHitEntity(this.mouseScreenPos.x, this.mouseScreenPos.y);
      if (hitEntity && hitEntity.type.startsWith('TOWER')) {
          this.selectedEntityId = hitEntity.id;
          if (this.engine.callbacks.onSelect) this.engine.callbacks.onSelect(hitEntity.id);
          if (this.engine.callbacks.onBuild) this.engine.callbacks.onBuild(); 
          this.engine.audio.playBuild();
          return;
      }
    }

    // 2. Build on Tile
    if (this.hoverTile && this.selectedTowerType) {
        this.engine.buildTower(this.hoverTile, this.selectedTowerType);
        return;
    }

    // 3. Clicked nothing
    this.deselectAll();
  }

  handleRightClick(e: MouseEvent) {
      e.preventDefault();
      this.engine.audio.playCancel();
      this.deselectAll();
  }

  deselectAll() {
      this.selectedEntityId = null;
      this.selectedTowerType = null;
      if (this.engine.callbacks.onSelect) this.engine.callbacks.onSelect(null);
      if (this.engine.callbacks.onBuild) this.engine.callbacks.onBuild(); 
  }

  setSelectedTowerType(type: EntityType | null) {
      this.selectedTowerType = type;
      if (type) {
          this.selectedEntityId = null; // Clear selection when picking tool
          if (this.engine.callbacks.onSelect) this.engine.callbacks.onSelect(null);
      }
  }

  getHitEntity(sx: number, sy: number) {
     // Check hit against entities (front-to-back sort for checking)
     const checkList = this.engine.entities.filter(e => e.type !== EntityType.FLOATING_TEXT && e.type !== EntityType.PROJECTILE);
     checkList.sort((a, b) => b.depth - a.depth);

     for (const ent of checkList) {
         const pos = this.engine.getScreenPos(ent.gridPos.x, ent.gridPos.y);
         let visualY = pos.y;
         let radius = 30; 

         if (ent.type === EntityType.TOWER_SNIPER) visualY -= 30;
         else if (ent.type === EntityType.TOWER_BASIC) visualY -= 20;
         else if (ent.type === EntityType.TOWER_PULSE) visualY -= 20;
         else if (ent.type === EntityType.TREE) visualY -= 15;

         const dx = sx - pos.x;
         const dy = sy - visualY;
         
         if (dx*dx + dy*dy < radius*radius) {
             return ent;
         }
     }
     return null;
  }
}