
import { GRID_SIZE, GridPoint, Vector2 } from '../../types';
import { GameEngine } from '../GameEngine';
import { Tree } from '../Entities';

export class MapManager {
  engine: GameEngine;
  grid: number[][] = []; // 0=grass, 1=path, 2=tower, 3=rock, 4=tree, 5=water
  enemyPath: Vector2[] = [];

  constructor(engine: GameEngine) {
    this.engine = engine;
    this.initGrid();
  }

  private initGrid() {
    this.grid = [];
    for (let y = 0; y < GRID_SIZE; y++) {
      this.grid[y] = [];
      for (let x = 0; x < GRID_SIZE; x++) {
        this.grid[y][x] = 0;
      }
    }
  }

  generate() {
    this.initGrid();
    
    // Procedural Path Generation (Random Walk from Left to Right)
    let cx = 0;
    let cy = Math.floor(Math.random() * (GRID_SIZE - 6)) + 3; // Start middle-ish
    
    const path: GridPoint[] = [{gx: cx, gy: cy}];
    const visited = new Set<string>();
    visited.add(`${cx},${cy}`);

    let failsafe = 0;
    while(cx < GRID_SIZE - 1 && failsafe < 1000) {
        failsafe++;
        
        const moves = [
            {dx: 1, dy: 0, w: 10}, 
            {dx: 0, dy: 1, w: 3},
            {dx: 0, dy: -1, w: 3}
        ];
        
        const validMoves = moves.filter(m => {
            const nx = cx + m.dx;
            const ny = cy + m.dy;
            return nx >= 0 && nx < GRID_SIZE && ny >= 1 && ny < GRID_SIZE - 1 && !visited.has(`${nx},${ny}`);
        });

        if (validMoves.length === 0) break;

        const totalW = validMoves.reduce((acc, m) => acc + m.w, 0);
        let rnd = Math.random() * totalW;
        let choice = validMoves[0];
        
        for(const m of validMoves) {
            rnd -= m.w;
            if (rnd <= 0) {
                choice = m;
                break;
            }
        }
        
        cx += choice.dx;
        cy += choice.dy;
        path.push({gx: cx, gy: cy});
        visited.add(`${cx},${cy}`);
    }

    if (cx < GRID_SIZE - 1) {
        this.generate(); // Retry
        return;
    }

    this.enemyPath = path.map(p => ({x: p.gx, y: p.gy}));
    for(const p of path) {
        this.grid[p.gy][p.gx] = 1; 
    }

    // Decorate
    this.generateDecorations();
  }

  private generateDecorations() {
    // Lake
    const lakeX = Math.floor(Math.random() * (GRID_SIZE - 4)) + 2;
    const lakeY = Math.floor(Math.random() * (GRID_SIZE - 4)) + 2;
    for(let ly = lakeY; ly < lakeY + 3; ly++) {
        for(let lx = lakeX; lx < lakeX + 3; lx++) {
            if (Math.random() > 0.3 && this.grid[ly][lx] === 0) {
                this.grid[ly][lx] = 5; // Water
            }
        }
    }

    // Trees and Rocks
    for(let i=0; i<30; i++) {
        const rx = Math.floor(Math.random() * GRID_SIZE);
        const ry = Math.floor(Math.random() * GRID_SIZE);
        if (this.grid[ry][rx] === 0) {
            if (Math.random() > 0.4) {
                this.grid[ry][rx] = 4; // Tree
                this.engine.entities.push(new Tree(rx, ry));
            } else {
                this.grid[ry][rx] = 3; // Rock
            }
        }
    }
  }

  isBuildable(x: number, y: number): boolean {
      if (x < 0 || x >= GRID_SIZE || y < 0 || y >= GRID_SIZE) return false;
      return this.grid[y][x] === 0;
  }

  setTile(x: number, y: number, type: number) {
      if (x >= 0 && x < GRID_SIZE && y >= 0 && y < GRID_SIZE) {
          this.grid[y][x] = type;
      }
  }

  getTile(x: number, y: number): number {
      if (x >= 0 && x < GRID_SIZE && y >= 0 && y < GRID_SIZE) {
          return this.grid[y][x];
      }
      return -1;
  }
}
