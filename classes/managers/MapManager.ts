
import { GRID_SIZE, GridPoint, Vector2 } from '../../types';
import { GameEngine } from '../GameEngine';
import { Tree, Rock, Bush, Crystal } from '../Entities';

export class MapManager {
  engine: GameEngine;
  grid: number[][] = []; // 0=grass, 1=path, 2=tower, 3=rock_blocked, 4=tree_blocked, 5=water, 6=sand
  occupied: boolean[][] = []; // Tracks non-terrain obstacles (Decorations)
  enemyPath: Vector2[] = [];
  flyPath: Vector2[] = []; // Smoothed path for flying units

  constructor(engine: GameEngine) {
    this.engine = engine;
    this.initGrid();
  }

  private initGrid() {
    this.grid = [];
    this.occupied = [];
    for (let y = 0; y < GRID_SIZE; y++) {
      this.grid[y] = [];
      this.occupied[y] = [];
      for (let x = 0; x < GRID_SIZE; x++) {
        this.grid[y][x] = 0;
        this.occupied[y][x] = false;
      }
    }
  }

  generate() {
    let success = false;
    let attempts = 0;

    // Retry loop to ensure valid complex path
    while (!success && attempts < 50) {
        attempts++;
        this.initGrid();
        success = this.generatePath();
    }

    // Fallback if random gen fails repeatedly
    if (!success) {
        this.initGrid();
        this.enemyPath = [];
        for(let i=0; i<GRID_SIZE; i++) {
            this.enemyPath.push({x: i, y: 10});
            this.grid[10][i] = 1;
        }
    }

    // Post-generation: Create smoothed path for flying units
    this.generateSmoothPath();

    // Decorate map
    this.generateDecorations();
  }

  private generatePath(): boolean {
      // 0 = Start Left (Going Right)
      // 1 = Start Bottom (Going Up)
      const startEdge = Math.random() > 0.5 ? 0 : 1;
      
      let currentX = 0;
      let currentY = 0;
      let targetX = 0;
      let targetY = 0;

      // START & TARGET setup
      if (startEdge === 0) {
          // Left Edge Start -> Right Edge Target
          currentX = 0;
          currentY = Math.floor(Math.random() * (GRID_SIZE - 4)) + 2; // Avoid absolute corners
          targetX = GRID_SIZE - 1;
          targetY = Math.floor(Math.random() * GRID_SIZE);
      } else {
          // Bottom Edge Start -> Top Edge Target
          // (Note: In 2D array, high index is visually bottom if rendered top-down, 
          // but in this Iso engine, Y=GRID_SIZE is bottom corner visually)
          currentX = Math.floor(Math.random() * (GRID_SIZE - 4)) + 2;
          currentY = GRID_SIZE - 1;
          targetX = Math.floor(Math.random() * GRID_SIZE);
          targetY = 0;
      }

      const path: GridPoint[] = [{gx: currentX, gy: currentY}];
      const visited = new Set<string>();
      visited.add(`${currentX},${currentY}`);

      // Complexity settings
      const minLength = GRID_SIZE * 1.8; // Require longer paths
      let stuck = false;

      // Safety counter
      let steps = 0;
      const maxSteps = GRID_SIZE * GRID_SIZE;

      while ((Math.abs(currentX - targetX) > 0 || Math.abs(currentY - targetY) > 0) && steps < maxSteps) {
          steps++;
          
          const neighbors = [
              {dx: 1, dy: 0}, {dx: -1, dy: 0},
              {dx: 0, dy: 1}, {dx: 0, dy: -1}
          ];

          let validMoves = [];

          for (const m of neighbors) {
              const nx = currentX + m.dx;
              const ny = currentY + m.dy;

              // 1. Check Bounds
              if (nx < 0 || nx >= GRID_SIZE || ny < 0 || ny >= GRID_SIZE) continue;

              // 2. Check Visited
              if (visited.has(`${nx},${ny}`)) continue;

              // 3. ADJACENCY CHECK (The "No Blob" Rule)
              // We check the neighbors of the CANDIDATE tile (nx, ny).
              // If it touches any ALREADY visited tile that is NOT the current tile (where we are now), 
              // then moving there would create a 2x2 blob or touch the path elsewhere.
              let touchingOtherPath = false;
              for (const n of neighbors) {
                  const nnx = nx + n.dx;
                  const nny = ny + n.dy;
                  const key = `${nnx},${nny}`;
                  
                  // If neighbor is visited AND it's not the tile we are currently standing on...
                  if (visited.has(key) && !(nnx === currentX && nny === currentY)) {
                      touchingOtherPath = true;
                      break;
                  }
              }

              if (!touchingOtherPath) {
                  validMoves.push({nx, ny, dx: m.dx, dy: m.dy});
              }
          }

          if (validMoves.length === 0) {
              stuck = true;
              break;
          }

          // Weighted Random Choice
          // Calculate weights to prefer target direction but allow zig-zags
          const weightedMoves = validMoves.map(m => {
              // Distance heuristic
              const dist = Math.abs(m.nx - targetX) + Math.abs(m.ny - targetY);
              
              // Base weight
              let weight = 100;
              
              // Penalize moving away from target heavily, but don't forbid it
              const prevDist = Math.abs(currentX - targetX) + Math.abs(currentY - targetY);
              if (dist < prevDist) weight += 50; // Approaching
              else weight -= 20; // Moving away

              // Random noise to create zig-zags
              weight += Math.random() * 80;

              return { move: m, weight: Math.max(1, weight) };
          });

          // Select based on weight
          const totalWeight = weightedMoves.reduce((a,b) => a + b.weight, 0);
          let rand = Math.random() * totalWeight;
          let selected = weightedMoves[0].move;

          for(const wm of weightedMoves) {
              rand -= wm.weight;
              if (rand <= 0) {
                  selected = wm.move;
                  break;
              }
          }

          currentX = selected.nx;
          currentY = selected.ny;
          path.push({gx: currentX, gy: currentY});
          visited.add(`${currentX},${currentY}`);
      }

      // Validation
      // 1. Must reach target area (within 1 tile)
      const distToTarget = Math.abs(currentX - targetX) + Math.abs(currentY - targetY);
      if (stuck || distToTarget > 1) return false;

      // 2. Must be long enough
      if (path.length < minLength) return false;

      // Success - Commit to class state
      this.enemyPath = path.map(p => ({x: p.gx, y: p.gy}));
      for(const p of path) {
          this.grid[p.gy][p.gx] = 1; 
      }
      
      return true;
  }

  // Uses Chaikin's Algorithm or subdivision to create a smooth curve from the grid path
  private generateSmoothPath() {
      if (this.enemyPath.length < 2) {
          this.flyPath = [...this.enemyPath];
          return;
      }

      // Convert grid coords to floats for smoothing
      let points = this.enemyPath.map(p => ({x: p.x, y: p.y}));

      // Iterations of smoothing (Corner cutting)
      const iterations = 3;
      
      for(let k=0; k<iterations; k++) {
          const newPoints: Vector2[] = [];
          // Keep start
          newPoints.push(points[0]);

          for(let i=0; i<points.length-1; i++) {
              const p0 = points[i];
              const p1 = points[i+1];

              // Cut corners at 25% and 75%
              const q = { x: 0.75 * p0.x + 0.25 * p1.x, y: 0.75 * p0.y + 0.25 * p1.y };
              const r = { x: 0.25 * p0.x + 0.75 * p1.x, y: 0.25 * p0.y + 0.75 * p1.y };

              newPoints.push(q);
              newPoints.push(r);
          }
          
          // Keep end
          newPoints.push(points[points.length-1]);
          points = newPoints;
      }

      this.flyPath = points;
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

    // 3. Populate Entities
    // Iterate all tiles to decide spawn
    for(let y=0; y<GRID_SIZE; y++) {
        for(let x=0; x<GRID_SIZE; x++) {
            const tile = this.grid[y][x];
            
            // Only spawn on Grass (0) or Sand (6)
            if (tile === 0 || tile === 6) {
                const rnd = Math.random();
                
                // Trees: Only on Grass, higher density
                if (tile === 0 && rnd < 0.15) {
                    this.occupied[y][x] = true;
                    this.engine.entities.push(new Tree(x, y));
                }
                // Rocks: Grass or Sand, medium density
                else if (rnd < 0.20) { // 5% chance (0.15 to 0.20)
                    this.occupied[y][x] = true;
                    this.engine.entities.push(new Rock(x, y));
                }
                // Bushes: Grass
                else if (tile === 0 && rnd < 0.25) { 
                    this.occupied[y][x] = true;
                    this.engine.entities.push(new Bush(x, y));
                }
                // Crystals: Rare, mostly on grass
                else if (rnd > 0.99) {
                    this.occupied[y][x] = true;
                    this.engine.entities.push(new Crystal(x, y));
                }
            }
        }
    }
  }

  isBuildable(x: number, y: number): boolean {
      if (x < 0 || x >= GRID_SIZE || y < 0 || y >= GRID_SIZE) return false;
      if (this.occupied[y][x]) return false; // Check occupancy
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
