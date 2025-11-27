

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
    
    // Preview Mode Click Handling
    if (this.engine.previewMode) {
        this.engine.handlePreviewClick(this.mouseScreenPos.x, this.mouseScreenPos.y);
        return;
    }

    this.engine.audio.ensureContext();
    if (!this.engine.gameState.gameActive) return;

    // --- SELECTION LOGIC V2 ---
    // User complaint: Hard to select tower, easier to accidentally build.
    // Fix: Strict Grid Priority.

    // 1. Is the mouse over a valid grid tile?
    if (this.hoverTile) {
        const { gx, gy } = this.hoverTile;

        // Check if there is an Entity (Tower) on this tile specifically
        // We use the grid coordinate to find it, which is 100% accurate for towers.
        // We exclude Projectiles/Particles/Text.
        const entityOnTile = this.engine.entities.find(e => 
            e.gridPos.x === gx && 
            e.gridPos.y === gy && 
            e.type.startsWith('TOWER') // Strictly towers
        );

        if (entityOnTile) {
            // USER INTENT: SELECT TOWER
            // Even if Build Mode is active, clicking an existing tower should select it
            // so they can upgrade/sell it.
            this.selectedEntityId = entityOnTile.id;
            
            // Notify UI
            if (this.engine.callbacks.onSelect) this.engine.callbacks.onSelect(entityOnTile.id);
            if (this.engine.callbacks.onBuild) this.engine.callbacks.onBuild(); 
            this.engine.audio.playBuild(); // Use generic click/interaction sound
            return;
        }

        // 2. If no tower, are we in Build Mode?
        if (this.selectedTowerType) {
            // USER INTENT: BUILD
            this.engine.buildTower(this.hoverTile, this.selectedTowerType);
            return;
        }
    }

    // 3. Fallback: Check Screen-Space Entity Hit (For flying enemies, etc)
    // Only if we didn't interact with a tile logic above.
    const hitEntity = this.getHitEntity(this.mouseScreenPos.x, this.mouseScreenPos.y);
    if (hitEntity) {
        this.selectedEntityId = hitEntity.id;
        if (this.engine.callbacks.onSelect) this.engine.callbacks.onSelect(hitEntity.id);
        return;
    }

    // 4. Clicked Empty Void -> Deselect
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

         // Adjust hit box for visuals
         visualY -= ent.zHeight; 
         if (ent.type === EntityType.TOWER_SNIPER) visualY -= 30;

         const dx = sx - pos.x;
         const dy = sy - visualY;
         
         if (dx*dx + dy*dy < radius*radius) {
             return ent;
         }
     }
     return null;
  }
}