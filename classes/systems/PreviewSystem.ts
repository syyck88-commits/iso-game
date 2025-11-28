
import { GameEngine } from '../GameEngine';
import { BaseEntity, Tower, Projectile, ParticleEffect, TowerFactory } from '../Entities';
import { BaseEnemy } from '../enemies/BaseEnemy';
import { EnemyFactory } from '../EnemyFactory';
import { EnemyVariant, EntityType, Vector2 } from '../../types';
import { toGrid } from '../../utils/isoMath';

class DummyEnemy extends BaseEnemy {
    constructor(x: number, y: number) {
        super([{x,y}], 1, EnemyVariant.NORMAL);
        this.gridPos = {x, y};
        this.id = 'dummy_target_' + Math.random();
        this.health = 10000;
        this.maxHealth = 10000;
        this.zHeight = 0;
    }
    update() {}
    drawModel(ctx: CanvasRenderingContext2D, pos: Vector2) {
        // Simple crosshair
        ctx.strokeStyle = '#ef4444';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(pos.x - 10, pos.y); ctx.lineTo(pos.x + 10, pos.y);
        ctx.moveTo(pos.x, pos.y - 10); ctx.lineTo(pos.x, pos.y + 10);
        ctx.stroke();
    }
}

export class PreviewSystem {
    private engine: GameEngine;
    
    active: boolean = false;
    entity: BaseEntity | null = null;
    entities: BaseEntity[] = [];
    particles: ParticleEffect[] = [];
    
    // State to persist view when entity dies
    lastVariant: string | null = null;
    lastCameraPos: Vector2 = { x: 0, y: 0 };

    constructor(engine: GameEngine) {
        this.engine = engine;
    }

    setMode(active: boolean) {
        this.active = active;
        if (active) {
            this.engine.paused = true;
            this.spawnEntity(EnemyVariant.NORMAL); 
        } else {
            this.engine.paused = false;
            this.entity = null;
            this.entities = [];
            this.particles = [];
            this.lastVariant = null;
        }
    }

    spawnEntity(variant: string) {
        this.entities = [];
        this.particles = [];
        this.lastVariant = variant;
        const centerGrid = { x: 10, y: 10 };
        
        if (Object.values(EnemyVariant).includes(variant as EnemyVariant)) {
            const path = [centerGrid, centerGrid];
            this.entity = EnemyFactory.create(variant as EnemyVariant, path, 20);
        } 
        else {
            this.entity = TowerFactory.create(variant as EntityType, centerGrid.x, centerGrid.y);
            if (this.entity instanceof Tower) {
                this.entity.constructionScale = 1.0;
            }
        }
        if (this.entity) {
            this.entities.push(this.entity);
        }
    }
    
    // Called by GameEngine when an entity is removed (e.g. death animation done)
    removeEntity(id: string) {
        this.entities = this.entities.filter(e => e.id !== id);
        // If the main focused entity died, clear the reference to stop updates
        if (this.entity && this.entity.id === id) {
            // Update last camera pos one last time to keep view steady
            const screenPos = this.engine.getScreenPos(this.entity.gridPos.x, this.entity.gridPos.y);
            this.lastCameraPos = screenPos;
            this.entity = null;
        }
    }

    handleClick(screenX: number, screenY: number) {
        // If entity is dead/gone, click respawns the last selected variant
        if (!this.entity) {
            if (this.lastVariant) {
                this.spawnEntity(this.lastVariant);
            }
            return;
        }

        if (this.entity instanceof BaseEnemy) {
            if (this.entity.isDying) {
                // If already dying, instant respawn
                this.spawnEntity(this.entity.variant);
            } else {
                // Trigger death
                this.entity.health = 0;
            }
            return;
        }
  
        if (this.entity instanceof Tower) {
            const rect = this.engine.canvas.getBoundingClientRect();
            const centerX = rect.width / 2;
            const centerY = rect.height / 2;
            
            const entScreenPos = this.engine.getScreenPos(this.entity.gridPos.x, this.entity.gridPos.y);
            const worldScreenX = (screenX - centerX) / 2 + entScreenPos.x;
            const worldScreenY = (screenY - centerY) / 2 + entScreenPos.y;
            
            const gridP = toGrid(worldScreenX, worldScreenY, this.engine.renderer.offsetX, this.engine.renderer.offsetY);
            const dummy = new DummyEnemy(gridP.gx + 0.5, gridP.gy + 0.5); 
            
            this.entities.push(dummy);
            this.entity.forceFire(dummy, this.engine);
        }
    }

    update(dt: number) {
        // Always update particles
        this.particles.forEach(p => p.update(dt, this.engine));
        
        // Only update focused entity if it exists
        if (this.entity) {
            const rect = this.engine.canvas.getBoundingClientRect();
            const centerX = rect.width / 2;
            const centerY = rect.height / 2;
            const dx = this.engine.input.mouseScreenPos.x - centerX;
            const dy = this.engine.input.mouseScreenPos.y - centerY;
    
            if (this.entity instanceof BaseEnemy) {
                const gridDelta = toGrid(
                    this.engine.renderer.offsetX + dx / 2, 
                    this.engine.renderer.offsetY + dy / 2, 
                    this.engine.renderer.offsetX, 
                    this.engine.renderer.offsetY
                );
                
                const target = {
                    x: this.entity.gridPos.x + gridDelta.gx * 0.1, 
                    y: this.entity.gridPos.y + gridDelta.gy * 0.1
                };
                
                this.entity.path = [this.entity.gridPos, target];
                this.entity.pathIndex = 0;
                
                this.entity.update(dt, this.engine);
            } 
            else if (this.entity instanceof Tower) {
                const angle = Math.atan2(dy, dx);
                // @ts-ignore
                if(this.entity['rotateTowards']) {
                    // @ts-ignore
                    this.entity.rotateTowards(angle, dt, 0.01);
                }
                this.entity.update(dt, this.engine);
            }
        }
        
        // Update secondary entities (projectiles, debris, dummies)
        this.entities.forEach(e => {
            if (e !== this.entity) e.update(dt, this.engine);
        });
        
        // GC
        this.entities = this.entities.filter(e => {
            if (e instanceof Projectile && e.target.health <= 0) return false;
            if (e instanceof DummyEnemy && e.health <= 0) return false;
            return true;
        });
        this.particles = this.particles.filter(p => p.life > 0);
    }

    draw(ctx: CanvasRenderingContext2D) {
        const w = this.engine.renderer.width;
        const h = this.engine.renderer.height;
  
        // 1. Draw Void Background
        ctx.fillStyle = '#111827';
        ctx.fillRect(0, 0, w, h);
  
        let cameraX = 0;
        let cameraY = 0;

        if (this.entity) {
             const worldScreenPos = this.engine.getScreenPos(this.entity.gridPos.x, this.entity.gridPos.y);
             cameraX = worldScreenPos.x;
             cameraY = worldScreenPos.y;
             this.lastCameraPos = worldScreenPos;
        } else {
             // Use last known position if entity dead
             cameraX = this.lastCameraPos.x;
             cameraY = this.lastCameraPos.y;
        }
        
        ctx.save();
        ctx.translate(w/2, h/2);
        ctx.scale(2, 2);
        
        ctx.translate(-cameraX, -cameraY);
  
        // Draw faint grid
        const range = 5;
        // Center grid on 10,10 or current pos
        const cx = this.entity ? Math.floor(this.entity.gridPos.x) : 10;
        const cy = this.entity ? Math.floor(this.entity.gridPos.y) : 10;
        
        ctx.strokeStyle = 'rgba(255,255,255,0.1)';
        ctx.lineWidth = 1;
        
        for(let x = cx - range; x <= cx + range; x++) {
            const start = this.engine.getScreenPos(x, cy - range);
            const end = this.engine.getScreenPos(x, cy + range + 1);
            ctx.beginPath(); ctx.moveTo(start.x, start.y); ctx.lineTo(end.x, end.y); ctx.stroke();
        }
        for(let y = cy - range; y <= cy + range; y++) {
            const start = this.engine.getScreenPos(cx - range, y);
            const end = this.engine.getScreenPos(cx + range + 1, y);
            ctx.beginPath(); ctx.moveTo(start.x, start.y); ctx.lineTo(end.x, end.y); ctx.stroke();
        }
  
        const renderables = [...this.entities, ...this.particles].sort((a, b) => a.depth - b.depth);
        
        renderables.forEach(ent => {
             this.engine.drawEntityWithLasers(ctx, ent);
        });
  
        ctx.restore();
        
        // Debug Text
        ctx.fillStyle = '#fff';
        ctx.font = '20px monospace';
        if (this.entity) {
            ctx.fillText(`PREVIEW: ${this.entity.type}`, 20, 40);
            if (this.entity instanceof BaseEnemy) {
                ctx.fillText(`VARIANT: ${this.entity.variant}`, 20, 65);
                ctx.fillText("MOUSE TO GUIDE / CLICK TO KILL", 20, 90);
            } else {
                 ctx.fillText("MOUSE TO GUIDE / CLICK TO SHOOT", 20, 90);
            }
        } else {
            ctx.fillStyle = '#f87171';
            ctx.fillText("ENTITY DESTROYED", 20, 40);
            ctx.fillStyle = '#fff';
            ctx.fillText("CLICK TO RESPAWN", 20, 65);
        }
    }
}
