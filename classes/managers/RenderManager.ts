
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

    // Генерируем более плавный шум
    for(let y=0; y<GRID_SIZE; y++) {
        this.tileNoise[y] = [];
        for(let x=0; x<GRID_SIZE; x++) {
            // Мягкий шум для вариации цвета
            this.tileNoise[y][x] = Math.random() * 0.15;
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
    // 1. Рисуем ландшафт (Трава, Вода, Песок) как сплошной слой
    this.drawTerrain(this.offscreenCtx);
    // 2. Рисуем дороги поверх ландшафта (Кривые)
    this.drawRoads(this.offscreenCtx);
    // 3. Рисуем строительную сетку поверх всего (тонкая)
    this.drawGridOverlay(this.offscreenCtx);
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
    
    this.drawEnemyPathMarkers(ctx);
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
        
        const time = Date.now() / 200;
        const hoverOffset = Math.sin(time) * 3;

        ctx.save();
        ctx.translate(screenPos.x, screenPos.y - hoverOffset);
        
        let strokeColor = '#4ade80';
        let fillColor = 'rgba(74, 222, 128, 0.4)'; // Более яркая подсветка

        if (!isBuildable) {
            strokeColor = '#ef4444';
            fillColor = 'rgba(239, 68, 68, 0.4)';
        } else if (!canAfford) {
            strokeColor = '#9ca3af';
            fillColor = 'rgba(100, 116, 139, 0.4)';
        }

        // Рисуем курсор строительства (ромб)
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
        ctx.stroke();

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
            
            ctx.restore();
        }
    }
    
    // Подсветка выбранного юнита
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
            
            const r = 25;
            ctx.rotate(time);
            
            // Вращающийся прицел
            for(let i=0; i<4; i++) {
                ctx.rotate(Math.PI/2);
                ctx.beginPath();
                ctx.arc(0, 0, r + Math.sin(time*2)*2, 0, Math.PI/4);
                ctx.stroke();
            }
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
  }

  // --- НОВЫЙ РЕНДЕР ЛАНДШАФТА ---
  private drawTerrain(ctx: CanvasRenderingContext2D) {
    for (let y = 0; y < GRID_SIZE; y++) {
      for (let x = 0; x < GRID_SIZE; x++) {
        const tileType = this.engine.map.getTile(x, y);
        // Дороги рисуем в отдельном проходе drawRoads, здесь пропускаем их или рисуем подложку
        if (tileType === 1) continue; 

        const pos = toScreen(x, y, this.offsetX, this.offsetY);
        this.drawBaseTile(ctx, x, y, pos, tileType);
      }
    }
  }

  private drawBaseTile(ctx: CanvasRenderingContext2D, x: number, y: number, pos: Vector2, tileType: number) {
    const noise = this.tileNoise[y][x]; // Слабый шум 0..0.15

    let color: string;
    let depth = 0;

    if (tileType === 5) { // Water
        color = '#0e7490'; // Cyan 700 base
        depth = 4;
    } else if (tileType === 6) { // Sand
        color = '#d97706'; // Amber 600
        depth = 4;
    } else { // Grass (0) or others
        // Плавная вариация зеленого без резких перепадов
        // HSL: Hue 150 (Green), Saturation 40-50%, Lightness 35-40%
        const hue = 150 + (noise * 10); 
        const lit = 35 + (noise * 10);
        color = `hsl(${hue}, 50%, ${lit}%)`;
        depth = 8; // Высота блока земли
    }

    // Для бесшовного вида мы рисуем только верхнюю грань для травы, если она не на краю
    // Но чтобы оставить объем, нарисуем блок чуть темнее
    
    // Боковые грани (темнее)
    if (depth > 0) {
        ctx.fillStyle = this.darkenColor(color, 0.7); // Right face
        ctx.beginPath();
        ctx.moveTo(pos.x, pos.y + TILE_HEIGHT);
        ctx.lineTo(pos.x + TILE_WIDTH / 2, pos.y + TILE_HEIGHT / 2);
        ctx.lineTo(pos.x + TILE_WIDTH / 2, pos.y + TILE_HEIGHT / 2 + depth);
        ctx.lineTo(pos.x, pos.y + TILE_HEIGHT + depth);
        ctx.fill();

        ctx.fillStyle = this.darkenColor(color, 0.85); // Left face
        ctx.beginPath();
        ctx.moveTo(pos.x - TILE_WIDTH / 2, pos.y + TILE_HEIGHT / 2);
        ctx.lineTo(pos.x, pos.y + TILE_HEIGHT);
        ctx.lineTo(pos.x, pos.y + TILE_HEIGHT + depth);
        ctx.lineTo(pos.x - TILE_WIDTH / 2, pos.y + TILE_HEIGHT / 2 + depth);
        ctx.fill();
    }

    // Верхняя грань (Top Face) - БЕЗ ОБВОДКИ (Stroke)
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
    ctx.lineTo(pos.x + TILE_WIDTH / 2, pos.y + TILE_HEIGHT / 2);
    ctx.lineTo(pos.x, pos.y + TILE_HEIGHT);
    ctx.lineTo(pos.x - TILE_WIDTH / 2, pos.y + TILE_HEIGHT / 2);
    ctx.closePath();
    ctx.fill(); // Только заливка, трава сливается

    // Детали для воды (Блики)
    if (tileType === 5 && noise > 0.1) {
        ctx.fillStyle = 'rgba(255,255,255,0.1)';
        ctx.beginPath(); ctx.ellipse(pos.x, pos.y + 12, 6, 3, 0, 0, Math.PI*2); ctx.fill();
    }
  }

  // Вспомогательная функция затемнения HSL/Hex (упрощенная для HSL строк, которые мы генерируем)
  private darkenColor(hsl: string, factor: number): string {
      // Очень простой хак, так как мы знаем формат нашей строки hsl(...)
      // Для реального проекта лучше использовать tinycolor2 или манипуляции с r,g,b
      if (hsl.startsWith('hsl')) {
          return hsl.replace(/(\d+)%\)/, (match, p1) => `${parseFloat(p1) * factor}%)`);
      }
      return hsl; // Fallback for Hex
  }

  // --- РИСОВАНИЕ ДОРОГ (CURVED) ---
  private drawRoads(ctx: CanvasRenderingContext2D) {
      // Цвет дороги
      const roadColor = '#44403c'; // Stone 700
      const roadBorder = '#292524'; // Stone 800
      const roadWidth = 14; 

      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      // Проход 1: Подложка (Бордюры)
      this.drawRoadConnections(ctx, roadBorder, roadWidth + 4);
      // Проход 2: Асфальт
      this.drawRoadConnections(ctx, roadColor, roadWidth);
      
      // Детали (Камни)
      this.drawRoadDetails(ctx);
  }

  private drawRoadConnections(ctx: CanvasRenderingContext2D, color: string, width: number) {
      ctx.strokeStyle = color;
      ctx.lineWidth = width;
      ctx.beginPath();

      for (let y = 0; y < GRID_SIZE; y++) {
          for (let x = 0; x < GRID_SIZE; x++) {
              if (this.engine.map.getTile(x, y) !== 1) continue;

              const currentPos = this.getTileCenter(x, y);
              
              // Соединяем с соседями, если они тоже дорога
              // Проверяем Right (x+1) и Bottom (y+1), чтобы не рисовать дважды
              
              // Right Neighbor
              if (x < GRID_SIZE - 1 && this.engine.map.getTile(x + 1, y) === 1) {
                  const nextPos = this.getTileCenter(x + 1, y);
                  ctx.moveTo(currentPos.x, currentPos.y);
                  ctx.lineTo(nextPos.x, nextPos.y);
              }
              // Bottom Neighbor
              if (y < GRID_SIZE - 1 && this.engine.map.getTile(x, y + 1) === 1) {
                  const nextPos = this.getTileCenter(x, y + 1);
                  ctx.moveTo(currentPos.x, currentPos.y);
                  ctx.lineTo(nextPos.x, nextPos.y);
              }
              
              // Чтобы узлы не были дырявыми, рисуем точку в центре
              ctx.moveTo(currentPos.x, currentPos.y);
              ctx.lineTo(currentPos.x + 0.1, currentPos.y); // Hack to force dot cap
          }
      }
      ctx.stroke();
  }

  private drawRoadDetails(ctx: CanvasRenderingContext2D) {
      ctx.fillStyle = '#57534e'; // Светлые камушки
      for (let y = 0; y < GRID_SIZE; y++) {
          for (let x = 0; x < GRID_SIZE; x++) {
              if (this.engine.map.getTile(x, y) !== 1) continue;
              if (this.tileNoise[y][x] > 0.1) {
                  const pos = this.getTileCenter(x, y);
                  ctx.beginPath();
                  ctx.arc(pos.x + (this.tileNoise[y][x]-0.07)*30, pos.y + (this.tileNoise[x][y]-0.07)*15, 2, 0, Math.PI*2);
                  ctx.fill();
              }
          }
      }
  }

  private getTileCenter(gx: number, gy: number): Vector2 {
      // Центр ромба изометрии
      const screen = toScreen(gx, gy, this.offsetX, this.offsetY);
      return {
          x: screen.x,
          y: screen.y + TILE_HEIGHT / 2
      };
  }

  // --- СТРОИТЕЛЬНАЯ СЕТКА (Оверлей) ---
  private drawGridOverlay(ctx: CanvasRenderingContext2D) {
    ctx.lineWidth = 1;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)'; // Очень тонкая, едва заметная сетка
    
    // Рисуем сетку поверх всего ландшафта, чтобы было видно клетки
    ctx.beginPath();
    for (let y = 0; y < GRID_SIZE; y++) {
      for (let x = 0; x < GRID_SIZE; x++) {
        const pos = toScreen(x, y, this.offsetX, this.offsetY);
        
        ctx.moveTo(pos.x, pos.y);
        ctx.lineTo(pos.x + TILE_WIDTH / 2, pos.y + TILE_HEIGHT / 2);
        ctx.lineTo(pos.x, pos.y + TILE_HEIGHT);
        ctx.lineTo(pos.x - TILE_WIDTH / 2, pos.y + TILE_HEIGHT / 2);
        ctx.lineTo(pos.x, pos.y);
      }
    }
    ctx.stroke();
  }

  private drawEnemyPathMarkers(ctx: CanvasRenderingContext2D) {
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
