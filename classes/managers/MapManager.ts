

import { GRID_SIZE, GridPoint, Vector2 } from '../../types';
import { GameEngine } from '../GameEngine';
import { Tree } from '../Entities';

export class MapManager {
  engine: GameEngine;
  grid: number[][] = []; // 0=grass, 1=path, 2=tower, 3=rock, 4=tree, 5=water, 6=sand
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
    let cy = Math.floor(Math.random() * (GRID_SIZE - 10)) + 5; // Start middle-ish
    
    const path: GridPoint[] = [{gx: cx, gy: cy}];
    const visited = new Set<string>();
    visited.add(`${cx},${cy}`);

    let failsafe = 0;
    while(cx < GRID_SIZE - 1 && failsafe < 2000) {
        failsafe++;
        
        const moves = [
            {dx: 1, dy: 0, w: 12}, // Bias forward
            {dx: 0, dy: 1, w: 4},
            {dx: 0, dy: -1, w: 4}
        ];
        
        const validMoves = moves.filter(m => {
            const nx = cx + m.dx;
            const ny = cy + m.dy;
            return nx >= 0 && nx < GRID_SIZE && ny >= 2 && ny < GRID_SIZE - 2 && !visited.has(`${nx},${ny}`);
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
    // 1. Generate Water Bodies (Lakes/Coast)
    for(let i=0; i<8; i++) {
        const cx = Math.floor(Math.random() * GRID_SIZE);
        const cy = Math.floor(Math.random() * GRID_SIZE);
        const r = 2 + Math.random() * 3;
        
        for(let y=0; y<GRID_SIZE; y++) {
            for(let x=0; x<GRID_SIZE; x++) {
                const dx = x - cx;
                const dy = y - cy;
                if (dx*dx + dy*dy < r*r) {
                    if (this.grid[y][x] === 0) {
                        this.grid[y][x] = 5; // Water
                    }
                }
            }
        }
    }

    // 2. Sand Borders (Around water)
    const tempGrid = this.grid.map(row => [...row]);
    for(let y=0; y<GRID_SIZE; y++) {
        for(let x=0; x<GRID_SIZE; x++) {
            if (this.grid[y][x] === 5) {
                // Check neighbors
                for(let dy=-1; dy<=1; dy++) {
                    for(let dx=-1; dx<=1; dx++) {
                        const nx = x + dx; 
                        const ny = y + dy;
                        if (nx>=0 && nx<GRID_SIZE && ny>=0 && ny<GRID_SIZE) {
                            if (tempGrid[ny][nx] === 0) {
                                this.grid[ny][nx] = 6; // Sand
                            }
                        }
                    }
                }
            }
        }
    }

    // Trees and Rocks (More density)
    for(let i=0; i<50; i++) {
        const rx = Math.floor(Math.random() * GRID_SIZE);
        const ry = Math.floor(Math.random() * GRID_SIZE);
        if (this.grid[ry][rx] === 0) { // Grass only
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
      return this.grid[y][x] === 0 || this.grid[y][x] === 6; // Buildable on Grass and Sand
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