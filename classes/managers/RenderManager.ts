
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

  constructor(engine: GameEngine) {
    this.engine = engine;
    this.offscreenCanvas = document.createElement('canvas');
    const ctx = this.offscreenCanvas.getContext('2d', { alpha: true }); // Enable alpha for offscreen
    if (!ctx) throw new Error('Could not create offscreen context');
    this.offscreenCtx = ctx;
  }

  resize() {
    this.width = window.innerWidth;
    this.height = window.innerHeight;
    
    this.engine.canvas.width = this.width;
    this.engine.canvas.height = this.height;
    
    this.offscreenCanvas.width = this.width;
    this.offscreenCanvas.height = this.height;

    this.offsetX = this.width / 2;
    this.offsetY = 100;

    this.prerenderMap();
  }

  prerenderMap() {
    // Clear offscreen, do not draw black background here anymore
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
    
    // Draw animated background first
    this.drawBackground(ctx);

    let sx = 0, sy = 0;
    if (this.shakeStrength > 0) {
        sx = (Math.random() - 0.5) * this.shakeStrength;
        sy = (Math.random() - 0.5) * this.shakeStrength;
    }

    ctx.save();
    ctx.translate(sx, sy);

    // Draw the static map cache
    ctx.drawImage(this.offscreenCanvas, 0, 0);
    
    // Draw the tactical path overlay before entities
    this.drawEnemyPath(ctx);

    this.drawRangeIndicators(ctx);
  }

  postDraw() {
     const ctx = this.engine.ctx;
     const hover = this.engine.input.hoverTile;
     const selectedType = this.engine.input.selectedTowerType;

     if (hover && selectedType) {
        const { gx, gy } = hover;
        const screenPos = toScreen(gx, gy, this.offsetX, this.offsetY);
        const isBuildable = this.engine.map.isBuildable(gx, gy);
        
        const color = isBuildable ? 'rgba(34, 197, 94, 0.5)' : 'rgba(239, 68, 68, 0.4)';
        this.drawHighlight(ctx, screenPos, color);

        if (isBuildable) {
            ctx.save();
            ctx.globalAlpha = 0.6; 
            // Static preview draw via factory
            TowerFactory.drawPreview(
                ctx, 
                { x: screenPos.x, y: screenPos.y + (TILE_HEIGHT / 2) - 10 }, 
                selectedType
            );
            ctx.restore();
        }
    }
    
    const selId = this.engine.input.selectedEntityId;
    if (selId) {
        const ent = this.engine.entities.find(e => e.id === selId);
        if (ent && ent.type !== EntityType.FLOATING_TEXT) {
            const pos = this.engine.getScreenPos(ent.gridPos.x, ent.gridPos.y);
            pos.y -= ent.zHeight;
            
            const time = Date.now() / 300;
            ctx.strokeStyle = '#facc15';
            ctx.lineWidth = 2;
            
            ctx.save();
            ctx.translate(pos.x, pos.y);
            
            ctx.beginPath();
            ctx.ellipse(0, 0, 24 + Math.sin(time)*2, 12 + Math.sin(time), 0, 0, Math.PI*2);
            ctx.setLineDash([10, 10]);
            ctx.lineDashOffset = -time * 20;
            ctx.stroke();
            
            ctx.restore();
        }
    }

    ctx.restore();
  }

  private drawBackground(ctx: CanvasRenderingContext2D) {
    // 1. Base Gradient
    const grad = ctx.createRadialGradient(this.width/2, this.height/2, 0, this.width/2, this.height/2, this.width);
    grad.addColorStop(0, '#0f172a'); // Slate 900
    grad.addColorStop(1, '#020617'); // Slate 950
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, this.width, this.height);
    
    // 2. Animated Cyber Grid
    const time = Date.now() / 1000;
    const scroll = (time * 20) % 50; 
    
    ctx.save();
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.1)'; // Sky Blue low opacity
    ctx.lineWidth = 1;
    
    // Vertical Perspective Lines
    const centerX = this.width / 2;
    const centerY = this.height / 2;
    
    // Horizon line
    const horizonY = -200; 

    // Draw floor grid (Perspective)
    ctx.beginPath();
    for (let i = -20; i <= 20; i++) {
        // Radiating lines
        const x = i * 100;
        ctx.moveTo(centerX, horizonY); 
        ctx.lineTo(centerX + x * 4, this.height * 2); 
    }
    ctx.stroke();

    // Horizontal moving lines
    ctx.beginPath();
    for(let i = 0; i < 20; i++) {
        // Exponential spacing for perspective
        const yBase = i * 50 + scroll; 
        const y = this.height - Math.pow(yBase, 1.2) * 0.5;
        
        if (y > 0 && y < this.height) {
            ctx.moveTo(0, y);
            ctx.lineTo(this.width, y);
        }
    }
    ctx.stroke();

    // 3. Digital Particles (Dust)
    const seed = Math.floor(time); // Change somewhat slowly
    // Use pseudo-random based on time to draw consistent floating bits without storing state
    ctx.fillStyle = 'rgba(14, 165, 233, 0.3)';
    for(let i=0; i<30; i++) {
        const px = ((i * 137.5) + (time * 20)) % this.width;
        const py = ((i * 293.2) + (Math.sin(time + i) * 50)) % this.height;
        ctx.fillRect(px, Math.abs(py), 2, 2);
    }

    ctx.restore();
  }

  private drawGrid(ctx: CanvasRenderingContext2D) {
    for (let y = 0; y < GRID_SIZE; y++) {
      for (let x = 0; x < GRID_SIZE; x++) {
        const screenPos = toScreen(x, y, this.offsetX, this.offsetY);
        this.drawTile(ctx, x, y, screenPos);
      }
    }
  }

  private drawTile(ctx: CanvasRenderingContext2D, x: number, y: number, pos: Vector2) {
    const tileType = this.engine.map.getTile(x, y);

    // Procedural Texture Generation
    const hash = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453;
    const noise = Math.abs(hash - Math.floor(hash));

    if (tileType === 1) {
        // Path
        ctx.fillStyle = '#78350f'; 
    } else if (tileType === 3) {
        // Rock Base
        ctx.fillStyle = '#334155';
    } else if (tileType === 4) {
        // Tree Base
        ctx.fillStyle = '#166534';
    } else if (tileType === 5) {
        // Water
        ctx.fillStyle = '#0ea5e9'; 
    } else {
        // Grass - Add variation
        const gVal = 100 + Math.floor(noise * 30);
        const rVal = 20 - Math.floor(noise * 10);
        const bVal = 80 - Math.floor(noise * 15);
        ctx.fillStyle = `rgb(${rVal}, ${gVal}, ${bVal})`;
    }

    // Top Face
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
    ctx.lineTo(pos.x + TILE_WIDTH / 2, pos.y + TILE_HEIGHT / 2);
    ctx.lineTo(pos.x, pos.y + TILE_HEIGHT);
    ctx.lineTo(pos.x - TILE_WIDTH / 2, pos.y + TILE_HEIGHT / 2);
    ctx.closePath();
    ctx.fill();
    
    // Highlight Edge (Top-Left) for depth definition
    ctx.strokeStyle = 'rgba(255,255,255,0.05)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
    ctx.lineTo(pos.x - TILE_WIDTH / 2, pos.y + TILE_HEIGHT / 2);
    ctx.lineTo(pos.x, pos.y + TILE_HEIGHT);
    ctx.stroke();

    // Shadow Edge (Bottom-Right)
    ctx.strokeStyle = 'rgba(0,0,0,0.1)';
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
    ctx.lineTo(pos.x + TILE_WIDTH / 2, pos.y + TILE_HEIGHT / 2);
    ctx.lineTo(pos.x, pos.y + TILE_HEIGHT);
    ctx.stroke();
    
    // 3D Extrusion (Sides)
    ctx.fillStyle = 'rgba(0,0,0,0.2)';
    let depth = 4;
    if (tileType === 3) depth = 12; 
    if (tileType === 5) depth = 2;
    
    // Left Face
    ctx.beginPath();
    ctx.moveTo(pos.x - TILE_WIDTH / 2, pos.y + TILE_HEIGHT / 2);
    ctx.lineTo(pos.x, pos.y + TILE_HEIGHT);
    ctx.lineTo(pos.x, pos.y + TILE_HEIGHT + depth);
    ctx.lineTo(pos.x - TILE_WIDTH / 2, pos.y + TILE_HEIGHT / 2 + depth);
    ctx.fill();
    
    // Right Face
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y + TILE_HEIGHT);
    ctx.lineTo(pos.x + TILE_WIDTH / 2, pos.y + TILE_HEIGHT / 2);
    ctx.lineTo(pos.x + TILE_WIDTH / 2, pos.y + TILE_HEIGHT / 2 + depth);
    ctx.lineTo(pos.x, pos.y + TILE_HEIGHT + depth);
    ctx.fill();
    
    // Rock Detail
    if (tileType === 3) {
        ctx.fillStyle = '#475569';
        ctx.beginPath();
        ctx.moveTo(pos.x, pos.y - 10);
        ctx.lineTo(pos.x + 15, pos.y + 5);
        ctx.lineTo(pos.x, pos.y + 15);
        ctx.lineTo(pos.x - 15, pos.y + 5);
        ctx.fill();
    }
  }

  private drawEnemyPath(ctx: CanvasRenderingContext2D) {
      const path = this.engine.map.enemyPath;
      if (path.length < 2) return;

      ctx.save();
      // Draw Start and End Markers ONLY (Line removed per request)
      
      if (path.length > 0) {
          const start = path[0];
          const startPos = toScreen(start.x + 0.5, start.y + 0.5, this.offsetX, this.offsetY);
          this.drawIsoCircle(ctx, startPos, 0.4, 'rgba(16, 185, 129, 0.4)', 'rgba(16, 185, 129, 0.8)');
          
          // Skull icon at start
          ctx.fillStyle = '#fff';
          ctx.font = '12px monospace';
          ctx.textAlign = 'center';
          ctx.fillText("SPAWN", startPos.x, startPos.y - 10);
      }

      const end = path[path.length - 1];
      const endPos = toScreen(end.x + 0.5, end.y + 0.5, this.offsetX, this.offsetY);
      this.drawIsoCircle(ctx, endPos, 0.4, 'rgba(239, 68, 68, 0.4)', 'rgba(239, 68, 68, 0.8)');
      
      ctx.fillStyle = '#fff';
      ctx.textAlign = 'center';
      ctx.fillText("BASE", endPos.x, endPos.y - 10);

      ctx.restore();
  }

  private drawHighlight(ctx: CanvasRenderingContext2D, pos: Vector2, color: string) {
    ctx.save();
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
    ctx.lineTo(pos.x + TILE_WIDTH / 2, pos.y + TILE_HEIGHT / 2);
    ctx.lineTo(pos.x, pos.y + TILE_HEIGHT);
    ctx.lineTo(pos.x - TILE_WIDTH / 2, pos.y + TILE_HEIGHT / 2);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = 'white';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.restore();
  }

  private drawRangeIndicators(ctx: CanvasRenderingContext2D) {
      const selId = this.engine.input.selectedEntityId;
      if (selId) {
          const ent = this.engine.entities.find(e => e.id === selId);
          if (ent && ent instanceof Tower) {
              const pos = this.engine.getScreenPos(ent.gridPos.x, ent.gridPos.y);
              this.drawIsoCircle(ctx, pos, ent.range, 'rgba(250, 204, 21, 0.1)', 'rgba(250, 204, 21, 0.4)');
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
              this.drawIsoCircle(ctx, pos, range, 'rgba(255, 255, 255, 0.1)', 'rgba(255, 255, 255, 0.3)');
          }
      }
  }

  private drawIsoCircle(ctx: CanvasRenderingContext2D, center: Vector2, radiusTiles: number, fillColor: string, strokeColor: string) {
      const radiusPxX = radiusTiles * (TILE_WIDTH / 1.4); 
      const radiusPxY = radiusPxX * 0.5;

      ctx.save();
      ctx.beginPath();
      ctx.ellipse(center.x, center.y, radiusPxX, radiusPxY, 0, 0, Math.PI * 2);
      ctx.fillStyle = fillColor;
      ctx.fill();
      ctx.strokeStyle = strokeColor;
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 5]);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();
  }
}
