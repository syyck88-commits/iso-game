
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

    // --- SELECTION LOGIC ---
    
    // 1. Check for Tower Click (Precise Grid Check)
    if (this.hoverTile) {
        const { gx, gy } = this.hoverTile;
        const towerOnTile = this.engine.entities.find(e => 
            e.gridPos.x === gx && 
            e.gridPos.y === gy && 
            e.type.startsWith('TOWER')
        );

        if (towerOnTile) {
            this.selectedEntityId = towerOnTile.id;
            this.engine.audio.playBuild(); 
            if (this.engine.callbacks.onSelect) this.engine.callbacks.onSelect(towerOnTile.id);
            if (this.engine.callbacks.onBuild) this.engine.callbacks.onBuild(); 
            return;
        }

        // If no tower, but we are in build mode, BUILD.
        if (this.selectedTowerType) {
            this.engine.buildTower(this.hoverTile, this.selectedTowerType);
            return;
        }
    }

    // 2. Check for Enemy Click (Screen Space Raycast)
    // If we didn't click a tower or build, try to select an enemy
    const hitEntity = this.getHitEntity(this.mouseScreenPos.x, this.mouseScreenPos.y);
    if (hitEntity) {
        this.selectedEntityId = hitEntity.id;
        if (this.engine.callbacks.onSelect) this.engine.callbacks.onSelect(hitEntity.id);
        this.engine.audio.playBuild(); // Use basic UI click sound
        return;
    }

    // 3. Clicked Empty Void -> Deselect
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
          this.selectedEntityId = null; 
          if (this.engine.callbacks.onSelect) this.engine.callbacks.onSelect(null);
      }
  }

  getHitEntity(sx: number, sy: number) {
     // Check hit against entities (front-to-back sort for checking)
     // Filter out non-selectable things
     const checkList = this.engine.entities.filter(e => 
         e.type !== EntityType.FLOATING_TEXT && 
         e.type !== EntityType.PROJECTILE &&
         e.type !== EntityType.PARTICLE
     );
     
     // Sort by depth (closest to camera first)
     checkList.sort((a, b) => b.depth - a.depth);

     for (const ent of checkList) {
         const pos = this.engine.getScreenPos(ent.gridPos.x, ent.gridPos.y);
         let visualY = pos.y;
         let radius = 30; 

         // Adjust hit box for visuals
         visualY -= ent.zHeight; 
         
         // Larger hitbox for flying/bosses
         if (ent.zHeight > 10) radius = 40;

         const dx = sx - pos.x;
         const dy = sy - visualY;
         
         if (dx*dx + dy*dy < radius*radius) {
             return ent;
         }
     }
     return null;
  }
}
