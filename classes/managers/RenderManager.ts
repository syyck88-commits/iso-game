
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
  
  tileNoise: number[][] = [];
  
  readonly LIGHT_SOURCE = { x: -1, y: -1 }; 

  constructor(engine: GameEngine) {
    this.engine = engine;
    this.offscreenCanvas = document.createElement('canvas');
    const ctx = this.offscreenCanvas.getContext('2d', { alpha: true }); 
    if (!ctx) throw new Error('Could not create offscreen context');
    this.offscreenCtx = ctx;

    for(let y=0; y<GRID_SIZE; y++) {
        this.tileNoise[y] = [];
        for(let x=0; x<GRID_SIZE; x++) {
            this.tileNoise[y][x] = Math.random();
        }
    }
  }

  resize() {
    this.width = Math.max(1, window.innerWidth);
    this.height = Math.max(1, window.innerHeight);
    
    this.engine.canvas.width = this.width;
    this.engine.canvas.height = this.height;
    
    this.offscreenCanvas.width = this.width;
    this.offscreenCanvas.height = this.height;

    const gridPixelHeight = GRID_SIZE * TILE_HEIGHT;
    this.offsetX = this.width / 2;
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

    if (this.offscreenCanvas.width > 0 && this.offscreenCanvas.height > 0) {
        ctx.drawImage(this.offscreenCanvas, 0, 0);
    }
    
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
        const cost = this.engine.getTowerCost(selectedType);
        const canAfford = this.engine.debugMode || this.engine.gameState.money >= cost;
        
        const isValid = isBuildable && canAfford;
        const time = Date.now() / 200;
        const hoverOffset = Math.sin(time) * 3;

        ctx.save();
        ctx.translate(screenPos.x, screenPos.y - hoverOffset);
        
        let strokeColor = '#4ade80';
        let fillColor = 'rgba(74, 222, 128, 0.2)';

        if (!isBuildable) {
            strokeColor = '#ef4444';
            fillColor = 'rgba(239, 68, 68, 0.2)';
        } else if (!canAfford) {
            strokeColor = '#9ca3af';
            fillColor = 'rgba(100, 116, 139, 0.4)';
        }

        ctx.beginPath();
        ctx.moveTo(0, 0); 
        ctx.lineTo(TILE_WIDTH/2, TILE_HEIGHT/2);
        ctx.lineTo(0, TILE_HEIGHT);
        ctx.lineTo(-TILE_WIDTH/2, TILE_HEIGHT/2);
        ctx.closePath();
        
        ctx.fillStyle = fillColor;
        ctx.fill();
        
        ctx.lineWidth = 2;
        ctx.strokeStyle = strokeColor;
        ctx.setLineDash([10, 5]);
        ctx.stroke();
        ctx.setLineDash([]);

        if (isBuildable && !canAfford) {
             ctx.fillStyle = '#ef4444';
             ctx.font = 'bold 12px monospace';
             ctx.textAlign = 'center';
             ctx.fillText('NO FUNDS', 0, -10);
        }

        ctx.restore();

        if (isBuildable) {
            ctx.save();
            ctx.globalAlpha = 0.6;
            if (!canAfford) {
                 ctx.globalCompositeOperation = 'luminosity'; 
            }
            
            TowerFactory.drawPreview(
                ctx, 
                { x: screenPos.x, y: screenPos.y + TILE_HEIGHT/2 }, 
                selectedType
            );
            
            if (!canAfford) {
                ctx.globalCompositeOperation = 'source-over';
                ctx.fillStyle = 'rgba(239, 68, 68, 0.3)';
                const h = 40;
                ctx.fillRect(screenPos.x - 10, screenPos.y - 30, 20, h);
            }

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
            ctx.save();
            ctx.translate(pos.x, pos.y);
            
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
    const grad = ctx.createRadialGradient(this.width/2, this.height/2, 0, this.width/2, this.height/2, this.width);
    grad.addColorStop(0, '#0f172a'); 
    grad.addColorStop(1, '#020617'); 
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, this.width, this.height);
    
    ctx.save();
    const time = Date.now() / 10000;
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.08)';
    ctx.lineWidth = 1;
    
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
    
    const gradV = ctx.createRadialGradient(this.width/2, this.height/2, this.height/3, this.width/2, this.height/2, this.height);
    gradV.addColorStop(0, 'transparent');
    gradV.addColorStop(1, 'rgba(0,0,0,0.6)');
    ctx.fillStyle = gradV;
    ctx.fillRect(0,0,this.width, this.height);

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
    const noise = this.tileNoise[y][x];

    let topColor: string, leftColor: string, rightColor: string;
    let depth = 8; 

    if (tileType === 1) { // Path
        topColor = '#57534e';
        leftColor = '#44403c'; 
        rightColor = '#292524'; 
        depth = 6;
    } else if (tileType === 3) { // Rock Blocked Tile
        topColor = '#475569'; 
        leftColor = '#334155';
        rightColor = '#1e293b';
        depth = 8; // Reset height, Entity handles verticality
    } else if (tileType === 5) { // Water
        topColor = '#06b6d4'; 
        leftColor = '#0891b2'; 
        rightColor = '#164e63'; 
        depth = 4;
    } else if (tileType === 6) { // Sand
        topColor = '#fcd34d'; 
        leftColor = '#d97706';
        rightColor = '#b45309';
        depth = 6;
    } else { // Grass (0) or Tree Blocked (4)
        const hue = 150 + (noise * 20); 
        topColor = `hsl(${hue}, 60%, 40%)`; 
        leftColor = `hsl(${hue}, 60%, 30%)`;
        rightColor = `hsl(${hue}, 60%, 20%)`;
    }

    // Right Face
    ctx.fillStyle = rightColor;
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y + TILE_HEIGHT);
    ctx.lineTo(pos.x + TILE_WIDTH / 2, pos.y + TILE_HEIGHT / 2);
    ctx.lineTo(pos.x + TILE_WIDTH / 2, pos.y + TILE_HEIGHT / 2 + depth);
    ctx.lineTo(pos.x, pos.y + TILE_HEIGHT + depth);
    ctx.fill();

    // Left Face
    ctx.fillStyle = leftColor;
    ctx.beginPath();
    ctx.moveTo(pos.x - TILE_WIDTH / 2, pos.y + TILE_HEIGHT / 2);
    ctx.lineTo(pos.x, pos.y + TILE_HEIGHT);
    ctx.lineTo(pos.x, pos.y + TILE_HEIGHT + depth);
    ctx.lineTo(pos.x - TILE_WIDTH / 2, pos.y + TILE_HEIGHT / 2 + depth);
    ctx.fill();

    // Top Face
    ctx.fillStyle = topColor;
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
    ctx.lineTo(pos.x + TILE_WIDTH / 2, pos.y + TILE_HEIGHT / 2);
    ctx.lineTo(pos.x, pos.y + TILE_HEIGHT);
    ctx.lineTo(pos.x - TILE_WIDTH / 2, pos.y + TILE_HEIGHT / 2);
    ctx.closePath();
    ctx.fill();

    const grad = ctx.createLinearGradient(pos.x - TILE_WIDTH/2, pos.y, pos.x + TILE_WIDTH/2, pos.y + TILE_HEIGHT);
    grad.addColorStop(0, 'rgba(255,255,255,0.1)'); 
    grad.addColorStop(1, 'rgba(0,0,0,0.1)');
    ctx.fillStyle = grad;
    ctx.fill();

    // Surface Details
    if (tileType === 0 || tileType === 4) { // Grass
        if (noise > 0.6) {
            ctx.fillStyle = 'rgba(0,0,0,0.2)'; 
            ctx.fillRect(pos.x - 2 + (noise*10), pos.y + 14, 4, 2);
            ctx.fillStyle = '#86efac'; 
            ctx.beginPath();
            ctx.moveTo(pos.x + (noise*10), pos.y + 14);
            ctx.lineTo(pos.x + (noise*10) + 2, pos.y + 8);
            ctx.lineTo(pos.x + (noise*10) + 4, pos.y + 14);
            ctx.fill();
        }
    } else if (tileType === 1) { // Path
        if (noise > 0.4) {
            ctx.fillStyle = 'rgba(0,0,0,0.2)';
            const ox = (noise - 0.5) * 20;
            const oy = (noise - 0.5) * 10 + 12;
            ctx.beginPath(); ctx.ellipse(pos.x + ox, pos.y + oy, 4, 2, 0, 0, Math.PI*2); ctx.fill();
            ctx.fillStyle = '#78716c'; 
            ctx.beginPath(); ctx.ellipse(pos.x + ox, pos.y + oy - 1, 3.5, 1.8, 0, 0, Math.PI*2); ctx.fill();
        }
    } else if (tileType === 5) { // Water Specular
        ctx.fillStyle = 'rgba(255,255,255,0.2)';
        const ox = (noise - 0.5) * 20;
        const oy = (noise - 0.5) * 10 + 10;
        ctx.beginPath(); ctx.ellipse(pos.x + ox, pos.y + oy, 6, 3, 0, 0, Math.PI*2); ctx.fill();
    }

    ctx.strokeStyle = 'rgba(255,255,255,0.05)';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(pos.x, pos.y); ctx.lineTo(pos.x + TILE_WIDTH / 2, pos.y + TILE_HEIGHT / 2); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(pos.x, pos.y); ctx.lineTo(pos.x - TILE_WIDTH / 2, pos.y + TILE_HEIGHT / 2); ctx.stroke();
  }

  private drawEnemyPath(ctx: CanvasRenderingContext2D) {
      const path = this.engine.map.enemyPath;
      if (path.length < 2) return;

      ctx.save();
      const start = path[0];
      const startPos = toScreen(start.x + 0.5, start.y + 0.5, this.offsetX, this.offsetY);
      const end = path[path.length - 1];
      const endPos = toScreen(end.x + 0.5, end.y + 0.5, this.offsetX, this.offsetY);
      
      this.drawMarker(ctx, startPos, 'SPAWN', '#10b981');
      this.drawMarker(ctx, endPos, 'BASE', '#ef4444');
      ctx.restore();
  }

  private drawMarker(ctx: CanvasRenderingContext2D, pos: Vector2, label: string, color: string) {
      const floatY = pos.y - 15 + Math.sin(Date.now() / 200) * 3;
      
      ctx.save();
      ctx.translate(pos.x, floatY);
      
      ctx.fillStyle = color;
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(-6, -10); ctx.lineTo(6, -10); ctx.fill();
      
      ctx.fillStyle = '#0f172a';
      ctx.strokeStyle = color;
      ctx.lineWidth = 1;
      const textWidth = ctx.measureText(label).width + 12;
      ctx.fillRect(-textWidth/2, -26, textWidth, 16);
      ctx.strokeRect(-textWidth/2, -26, textWidth, 16);
      
      ctx.fillStyle = color;
      ctx.font = 'bold 10px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(label, 0, -15);
      
      ctx.restore();
      
      ctx.fillStyle = 'rgba(0,0,0,0.3)';
      ctx.beginPath(); ctx.ellipse(pos.x, pos.y, 8, 4, 0, 0, Math.PI*2); ctx.fill();
  }

  private drawRangeIndicators(ctx: CanvasRenderingContext2D) {
      const selId = this.engine.input.selectedEntityId;
      
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
