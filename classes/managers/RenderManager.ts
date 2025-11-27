

import { GameEngine } from '../GameEngine';
import { GRID_SIZE, TILE_HEIGHT, TILE_WIDTH, Vector2, EntityType } from '../../types';
import { toScreen } from '../../utils/isoMath';
import { Tower, TowerFactory } from '../Entities';

export class RenderManager {
  engine: GameEngine;
  shakeTimer: number = 0;
  shakeStrength: number = 0;
  
  width: number = 0;
  height: number = 0;
  offsetX: number = 0;
  offsetY: number = 0;

  offscreenCanvas: HTMLCanvasElement;
  offscreenCtx: CanvasRenderingContext2D;
  
  // Cache procedural noise
  tileNoise: number[][] = [];
  
  // Visual config
  readonly LIGHT_SOURCE = { x: -1, y: -1 }; // Light coming from top-left

  constructor(engine: GameEngine) {
    this.engine = engine;
    this.offscreenCanvas = document.createElement('canvas');
    const ctx = this.offscreenCanvas.getContext('2d', { alpha: true }); 
    if (!ctx) throw new Error('Could not create offscreen context');
    this.offscreenCtx = ctx;

    // Pre-generate static noise for tiles
    for(let y=0; y<GRID_SIZE; y++) {
        this.tileNoise[y] = [];
        for(let x=0; x<GRID_SIZE; x++) {
            this.tileNoise[y][x] = Math.random();
        }
    }
  }

  resize() {
    // Ensure dimensions are at least 1x1 to prevent drawImage errors
    this.width = Math.max(1, window.innerWidth);
    this.height = Math.max(1, window.innerHeight);
    
    this.engine.canvas.width = this.width;
    this.engine.canvas.height = this.height;
    
    this.offscreenCanvas.width = this.width;
    this.offscreenCanvas.height = this.height;

    const gridPixelHeight = GRID_SIZE * TILE_HEIGHT;
    
    this.offsetX = this.width / 2;
    // Move up slightly because isometric height is less than width
    this.offsetY = (this.height / 2) - (gridPixelHeight / 2) + 50; 

    this.prerenderMap();
  }

  prerenderMap() {
    this.offscreenCtx.clearRect(0, 0, this.width, this.height);
    this.drawGrid(this.offscreenCtx);
  }

  shake(intensity: number) {
      this.shakeStrength = intensity;
      this.shakeTimer = 10;
  }

  update() {
      if (this.shakeTimer > 0) {
          this.shakeTimer--;
      } else {
          this.shakeStrength = 0;
      }
  }

  draw() {
    const ctx = this.engine.ctx;
    
    this.drawBackground(ctx);

    let sx = 0, sy = 0;
    if (this.shakeStrength > 0) {
        sx = (Math.random() - 0.5) * this.shakeStrength;
        sy = (Math.random() - 0.5) * this.shakeStrength;
    }

    ctx.save();
    ctx.translate(sx, sy);

    // Draw the static map cache
    // Verify valid dimensions before drawing
    if (this.offscreenCanvas.width > 0 && this.offscreenCanvas.height > 0) {
        ctx.drawImage(this.offscreenCanvas, 0, 0);
    }
    
    // Draw Dynamic Tile Overlay (Animated Water)
    this.drawDynamicTiles(ctx);

    // Draw the tactical path overlay before entities
    this.drawEnemyPath(ctx);

    this.drawRangeIndicators(ctx);
  }

  postDraw() {
     const ctx = this.engine.ctx;
     const hover = this.engine.input.hoverTile;
     const selectedType = this.engine.input.selectedTowerType;

     // Draw Selection/Hover Cursor ONLY if we are in Build Mode (selectedType exists)
     if (hover && selectedType) {
        const { gx, gy } = hover;
        const screenPos = toScreen(gx, gy, this.offsetX, this.offsetY);
        
        const isBuildable = this.engine.map.isBuildable(gx, gy);
        const cost = this.engine.getTowerCost(selectedType);
        const canAfford = this.engine.debugMode || this.engine.gameState.money >= cost;
        
        // Determine Visual State: Valid, Blocked, or Unaffordable
        const isValid = isBuildable && canAfford;

        // Animated Cursor
        const time = Date.now() / 200;
        const hoverOffset = Math.sin(time) * 3;

        ctx.save();
        ctx.translate(screenPos.x, screenPos.y - hoverOffset);
        
        // Determine color
        let strokeColor = '#4ade80'; // Green
        let fillColor = 'rgba(74, 222, 128, 0.2)';

        if (!isBuildable) {
            strokeColor = '#ef4444'; // Red (Blocked)
            fillColor = 'rgba(239, 68, 68, 0.2)';
        } else if (!canAfford) {
            strokeColor = '#9ca3af'; // Grey/Red mix for unaffordable
            fillColor = 'rgba(100, 116, 139, 0.4)';
        }

        // Draw Cursor Shape (Brackets)
        ctx.beginPath();
        ctx.moveTo(0, 0); // Top
        ctx.lineTo(TILE_WIDTH/2, TILE_HEIGHT/2); // Right
        ctx.lineTo(0, TILE_HEIGHT); // Bottom
        ctx.lineTo(-TILE_WIDTH/2, TILE_HEIGHT/2); // Left
        ctx.closePath();
        
        ctx.fillStyle = fillColor;
        ctx.fill();
        
        ctx.lineWidth = 2;
        ctx.strokeStyle = strokeColor;
        ctx.setLineDash([10, 5]);
        ctx.stroke();
        ctx.setLineDash([]);

        // Show cost warning if affordable logic fails
        if (isBuildable && !canAfford) {
             ctx.fillStyle = '#ef4444';
             ctx.font = 'bold 12px monospace';
             ctx.textAlign = 'center';
             ctx.fillText('NO FUNDS', 0, -10);
        }

        ctx.restore();

        // Ghost Tower
        // Only draw if buildable (even if no funds, show ghost so they know what they CANT build)
        if (isBuildable) {
            ctx.save();
            ctx.globalAlpha = 0.6;
            // Ghost visual override for unaffordable
            if (!canAfford) {
                 ctx.globalCompositeOperation = 'luminosity'; // Grayscale-ish
            }
            
            TowerFactory.drawPreview(
                ctx, 
                { x: screenPos.x, y: screenPos.y + TILE_HEIGHT/2 }, 
                selectedType
            );
            
            // Tint red if unaffordable
            if (!canAfford) {
                ctx.globalCompositeOperation = 'source-over';
                ctx.fillStyle = 'rgba(239, 68, 68, 0.3)';
                const h = 40;
                ctx.fillRect(screenPos.x - 10, screenPos.y - 30, 20, h);
            }

            ctx.restore();
        }
    }
    
    // Selection Halo for Entities
    const selId = this.engine.input.selectedEntityId;
    if (selId) {
        const ent = this.engine.entities.find(e => e.id === selId);
        if (ent && ent.type !== EntityType.FLOATING_TEXT) {
            const pos = this.engine.getScreenPos(ent.gridPos.x, ent.gridPos.y);
            pos.y -= ent.zHeight; // visual center
            
            const time = Date.now() / 300;
            ctx.save();
            ctx.translate(pos.x, pos.y);
            
            // Rotating brackets
            ctx.strokeStyle = '#facc15';
            ctx.lineWidth = 2;
            ctx.shadowColor = '#facc15';
            ctx.shadowBlur = 10;
            
            const r = 25;
            ctx.rotate(time);
            
            for(let i=0; i<4; i++) {
                ctx.rotate(Math.PI/2);
                ctx.beginPath();
                ctx.arc(0, 0, r + Math.sin(time*2)*2, 0, Math.PI/4);
                ctx.stroke();
            }
            
            ctx.shadowBlur = 0;
            ctx.restore();
        }
    }

    ctx.restore();
  }

  private drawBackground(ctx: CanvasRenderingContext2D) {
    // Cyber-Grid Background
    const grad = ctx.createRadialGradient(this.width/2, this.height/2, 0, this.width/2, this.height/2, this.width);
    grad.addColorStop(0, '#0f172a'); // Slate 900
    grad.addColorStop(1, '#020617'); // Slate 950
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, this.width, this.height);
    
    ctx.save();
    // Perspective grid effect
    const time = Date.now() / 10000;
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.08)';
    ctx.lineWidth = 1;
    
    // Draw a large rotating grid in the background
    const gridSize = 100;
    const offsetX = (Date.now() / 50) % gridSize;
    const offsetY = (Date.now() / 50) % gridSize;

    ctx.beginPath();
    for (let x = -gridSize; x < this.width + gridSize; x += gridSize) {
        ctx.moveTo(x - offsetX, 0);
        ctx.lineTo(x - offsetX, this.height);
    }
    for (let y = -gridSize; y < this.height + gridSize; y += gridSize) {
        ctx.moveTo(0, y - offsetY);
        ctx.lineTo(this.width, y - offsetY);
    }
    ctx.stroke();
    
    // Vignette
    const gradV = ctx.createRadialGradient(this.width/2, this.height/2, this.height/3, this.width/2, this.height/2, this.height);
    gradV.addColorStop(0, 'transparent');
    gradV.addColorStop(1, 'rgba(0,0,0,0.6)');
    ctx.fillStyle = gradV;
    ctx.fillRect(0,0,this.width, this.height);

    ctx.restore();
  }

  private drawGrid(ctx: CanvasRenderingContext2D) {
    // Draw tiles back-to-front
    for (let y = 0; y < GRID_SIZE; y++) {
      for (let x = 0; x < GRID_SIZE; x++) {
        const screenPos = toScreen(x, y, this.offsetX, this.offsetY);
        this.drawTile(ctx, x, y, screenPos);
      }
    }
  }

  // Improved Water Rendering
  private drawDynamicTiles(ctx: CanvasRenderingContext2D) {
      const time = Date.now();
      const waveOffset = time / 500;
      
      for (let y = 0; y < GRID_SIZE; y++) {
        for (let x = 0; x < GRID_SIZE; x++) {
            if (this.engine.map.getTile(x, y) === 5) { // Water
                const pos = toScreen(x, y, this.offsetX, this.offsetY);
                const noise = this.tileNoise[y][x];
                
                // Bobbing height
                const bob = Math.sin(waveOffset + noise * 10) * 3;
                
                ctx.save();
                ctx.translate(0, 5 + bob); // Water sits lower than land (depth)
                
                // Water Top Surface (Translucent)
                ctx.fillStyle = 'rgba(6, 182, 212, 0.5)'; // Cyan 500
                
                // Create path for top face
                ctx.beginPath();
                ctx.moveTo(pos.x, pos.y);
                ctx.lineTo(pos.x + TILE_WIDTH / 2, pos.y + TILE_HEIGHT / 2);
                ctx.lineTo(pos.x, pos.y + TILE_HEIGHT);
                ctx.lineTo(pos.x - TILE_WIDTH / 2, pos.y + TILE_HEIGHT / 2);
                ctx.closePath();
                ctx.fill();
                
                // Specular Highlights (Reflection)
                ctx.globalCompositeOperation = 'overlay';
                ctx.fillStyle = 'rgba(255,255,255,0.3)';
                const reflectX = pos.x + (noise - 0.5) * 20;
                const reflectY = pos.y + TILE_HEIGHT/2 + (noise - 0.5) * 10;
                ctx.beginPath();
                ctx.ellipse(reflectX, reflectY, 6, 3, 0, 0, Math.PI*2);
                ctx.fill();

                // Foam at edges (if near land)
                const foamPhase = Math.sin(waveOffset * 2 + noise * 20);
                if (foamPhase > 0.7) {
                    ctx.strokeStyle = 'rgba(255,255,255,0.4)';
                    ctx.lineWidth = 1;
                    ctx.beginPath();
                    ctx.moveTo(pos.x - 10, pos.y + 10);
                    ctx.lineTo(pos.x + 10, pos.y + 10);
                    ctx.stroke();
                }

                ctx.restore();
            }
        }
      }
  }

  private drawTile(ctx: CanvasRenderingContext2D, x: number, y: number, pos: Vector2) {
    const tileType = this.engine.map.getTile(x, y);
    const noise = this.tileNoise[y][x];

    if (tileType === 5) {
        // Water Logic: Draw the deep floor
        ctx.fillStyle = '#082f49'; // Very dark blue floor
        ctx.beginPath();
        ctx.moveTo(pos.x, pos.y);
        ctx.lineTo(pos.x + TILE_WIDTH / 2, pos.y + TILE_HEIGHT / 2);
        ctx.lineTo(pos.x, pos.y + TILE_HEIGHT);
        ctx.lineTo(pos.x - TILE_WIDTH / 2, pos.y + TILE_HEIGHT / 2);
        ctx.fill();
        return; // Water top is drawn in dynamic layer
    }

    // --- 1. DETERMINE COLORS ---
    let topColor: string, leftColor: string, rightColor: string;
    let depth = 8; // Voxel thickness

    if (tileType === 1) { // Path (Dirt/Stone)
        topColor = '#57534e'; // Stone Grey
        leftColor = '#44403c'; 
        rightColor = '#292524'; 
        depth = 6;
    } else if (tileType === 3) { // Rock Base
        topColor = '#475569'; // Slate
        leftColor = '#334155';
        rightColor = '#1e293b';
        depth = 20; // High rocks
    } else if (tileType === 6) { // Sand
        topColor = '#fcd34d'; 
        leftColor = '#d97706';
        rightColor = '#b45309';
        depth = 6;
    } else { // Grass (Default)
        // Variation
        const hue = 150 + (noise * 20); // Green to Teal variant
        topColor = `hsl(${hue}, 60%, 40%)`; 
        leftColor = `hsl(${hue}, 60%, 30%)`;
        rightColor = `hsl(${hue}, 60%, 20%)`;
    }

    // --- 2. DRAW SIDES (Depth) ---
    // Right Face (Darkest shadow)
    ctx.fillStyle = rightColor;
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y + TILE_HEIGHT);
    ctx.lineTo(pos.x + TILE_WIDTH / 2, pos.y + TILE_HEIGHT / 2);
    ctx.lineTo(pos.x + TILE_WIDTH / 2, pos.y + TILE_HEIGHT / 2 + depth);
    ctx.lineTo(pos.x, pos.y + TILE_HEIGHT + depth);
    ctx.fill();

    // Left Face (Mid shadow)
    ctx.fillStyle = leftColor;
    ctx.beginPath();
    ctx.moveTo(pos.x - TILE_WIDTH / 2, pos.y + TILE_HEIGHT / 2);
    ctx.lineTo(pos.x, pos.y + TILE_HEIGHT);
    ctx.lineTo(pos.x, pos.y + TILE_HEIGHT + depth);
    ctx.lineTo(pos.x - TILE_WIDTH / 2, pos.y + TILE_HEIGHT / 2 + depth);
    ctx.fill();

    // --- 3. DRAW TOP FACE ---
    ctx.fillStyle = topColor;
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
    ctx.lineTo(pos.x + TILE_WIDTH / 2, pos.y + TILE_HEIGHT / 2);
    ctx.lineTo(pos.x, pos.y + TILE_HEIGHT);
    ctx.lineTo(pos.x - TILE_WIDTH / 2, pos.y + TILE_HEIGHT / 2);
    ctx.closePath();
    ctx.fill();

    // --- 4. TOP FACE LIGHTING (Gradient) ---
    // Simulates sunlight hitting from top-left
    const grad = ctx.createLinearGradient(pos.x - TILE_WIDTH/2, pos.y, pos.x + TILE_WIDTH/2, pos.y + TILE_HEIGHT);
    grad.addColorStop(0, 'rgba(255,255,255,0.1)'); // Highlight
    grad.addColorStop(1, 'rgba(0,0,0,0.1)'); // Shadow
    ctx.fillStyle = grad;
    ctx.fill();

    // --- 5. SURFACE DETAILS (Texture) ---
    if (tileType === 0) { // Grass Tufts
        if (noise > 0.6) {
            ctx.fillStyle = 'rgba(0,0,0,0.2)'; // Shadow
            ctx.fillRect(pos.x - 2 + (noise*10), pos.y + 14, 4, 2);
            ctx.fillStyle = '#86efac'; // Bright grass blade
            ctx.beginPath();
            ctx.moveTo(pos.x + (noise*10), pos.y + 14);
            ctx.lineTo(pos.x + (noise*10) + 2, pos.y + 8);
            ctx.lineTo(pos.x + (noise*10) + 4, pos.y + 14);
            ctx.fill();
        }
    } else if (tileType === 1) { // Path Stones
        if (noise > 0.4) {
            ctx.fillStyle = 'rgba(0,0,0,0.2)';
            const ox = (noise - 0.5) * 20;
            const oy = (noise - 0.5) * 10 + 12;
            ctx.beginPath();
            ctx.ellipse(pos.x + ox, pos.y + oy, 4, 2, 0, 0, Math.PI*2);
            ctx.fill();
            
            ctx.fillStyle = '#78716c'; // Lighter stone
            ctx.beginPath();
            ctx.ellipse(pos.x + ox, pos.y + oy - 1, 3.5, 1.8, 0, 0, Math.PI*2);
            ctx.fill();
        }
    }

    // --- 6. EDGE HIGHLIGHT ---
    // Subtle rim light on top edges
    ctx.strokeStyle = 'rgba(255,255,255,0.05)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
    ctx.lineTo(pos.x + TILE_WIDTH / 2, pos.y + TILE_HEIGHT / 2); // Top Right edge
    ctx.stroke();
    
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
    ctx.lineTo(pos.x - TILE_WIDTH / 2, pos.y + TILE_HEIGHT / 2); // Top Left edge
    ctx.stroke();
  }

  private drawEnemyPath(ctx: CanvasRenderingContext2D) {
      const path = this.engine.map.enemyPath;
      if (path.length < 2) return;

      // Draw dashed line for path logic visualization (Tactical Overlay)
      ctx.save();
      
      // Start Marker
      const start = path[0];
      const startPos = toScreen(start.x + 0.5, start.y + 0.5, this.offsetX, this.offsetY);
      
      // End Marker
      const end = path[path.length - 1];
      const endPos = toScreen(end.x + 0.5, end.y + 0.5, this.offsetX, this.offsetY);
      
      // Base Labels
      this.drawMarker(ctx, startPos, 'SPAWN', '#10b981');
      this.drawMarker(ctx, endPos, 'BASE', '#ef4444');

      ctx.restore();
  }

  private drawMarker(ctx: CanvasRenderingContext2D, pos: Vector2, label: string, color: string) {
      const floatY = pos.y - 15 + Math.sin(Date.now() / 200) * 3;
      
      ctx.save();
      ctx.translate(pos.x, floatY);
      
      // Pin
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(-6, -10);
      ctx.lineTo(6, -10);
      ctx.fill();
      
      // Label box
      ctx.fillStyle = '#0f172a';
      ctx.strokeStyle = color;
      ctx.lineWidth = 1;
      const textWidth = ctx.measureText(label).width + 12;
      ctx.fillRect(-textWidth/2, -26, textWidth, 16);
      ctx.strokeRect(-textWidth/2, -26, textWidth, 16);
      
      // Text
      ctx.fillStyle = color;
      ctx.font = 'bold 10px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(label, 0, -15);
      
      // Shadow on ground
      ctx.restore();
      
      ctx.fillStyle = 'rgba(0,0,0,0.3)';
      ctx.beginPath();
      ctx.ellipse(pos.x, pos.y, 8, 4, 0, 0, Math.PI*2);
      ctx.fill();
  }

  private drawRangeIndicators(ctx: CanvasRenderingContext2D) {
      const selId = this.engine.input.selectedEntityId;
      const time = Date.now() / 1000;
      
      if (selId) {
          const ent = this.engine.entities.find(e => e.id === selId);
          if (ent && ent instanceof Tower) {
              const pos = this.engine.getScreenPos(ent.gridPos.x, ent.gridPos.y);
              this.drawIsoCircle(ctx, pos, ent.range, 'rgba(250, 204, 21, 0.05)', 'rgba(250, 204, 21, 0.4)');
          }
      }

      const hover = this.engine.input.hoverTile;
      const selType = this.engine.input.selectedTowerType;
      
      if (hover && selType) {
          const { gx, gy } = hover;
          const pos = toScreen(gx + 0.5, gy + 0.5, this.offsetX, this.offsetY);
          
          let range = 3.5;
          if (selType === EntityType.TOWER_SNIPER) range = 7;
          if (selType === EntityType.TOWER_PULSE) range = 2.5;
          if (selType === EntityType.TOWER_LASER) range = 4.5;

          if (this.engine.map.isBuildable(gx, gy)) {
              this.drawIsoCircle(ctx, pos, range, 'rgba(255, 255, 255, 0.05)', 'rgba(255, 255, 255, 0.3)');
          }
      }
  }

  private drawIsoCircle(ctx: CanvasRenderingContext2D, center: Vector2, radiusTiles: number, fillColor: string, strokeColor: string) {
      const radiusPxX = radiusTiles * (TILE_WIDTH / 1.4); 
      const radiusPxY = radiusPxX * 0.5;
      
      const time = Date.now() / 500;

      ctx.save();
      ctx.beginPath();
      ctx.ellipse(center.x, center.y, radiusPxX, radiusPxY, 0, 0, Math.PI * 2);
      ctx.fillStyle = fillColor;
      ctx.fill();
      
      ctx.strokeStyle = strokeColor;
      ctx.lineWidth = 2;
      ctx.setLineDash([10, 10]);
      ctx.lineDashOffset = -time * 10;
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();
  }
}
