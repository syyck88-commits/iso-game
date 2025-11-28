
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
        }
    }

    spawnEntity(variant: string) {
        this.entities = [];
        this.particles = [];
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

    handleClick(screenX: number, screenY: number) {
        if (!this.entity || !(this.entity instanceof Tower)) return;
  
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

    update(dt: number) {
        if (!this.entity) return;
  
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
        
        this.entities.forEach(e => {
            if (e !== this.entity) e.update(dt, this.engine);
        });
        
        this.particles.forEach(p => p.update(dt, this.engine));
        
        // GC
        this.entities = this.entities.filter(e => {
            if (e instanceof Projectile && e.target.health <= 0) return false;
            if (e instanceof DummyEnemy && e.health <= 0) return false;
            return true;
        });
        this.particles = this.particles.filter(p => p.life > 0);
    }

    draw(ctx: CanvasRenderingContext2D) {
        if (!this.entity) return;

        const w = this.engine.renderer.width;
        const h = this.engine.renderer.height;
  
        // 1. Draw Void Background
        ctx.fillStyle = '#111827';
        ctx.fillRect(0, 0, w, h);
  
        const worldScreenPos = this.engine.getScreenPos(this.entity.gridPos.x, this.entity.gridPos.y);
        
        ctx.save();
        ctx.translate(w/2, h/2);
        ctx.scale(2, 2);
        
        ctx.translate(-worldScreenPos.x, -worldScreenPos.y);
  
        // Draw faint grid
        const range = 5;
        const cx = Math.floor(this.entity.gridPos.x);
        const cy = Math.floor(this.entity.gridPos.y);
        
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
        ctx.fillText(`PREVIEW: ${this.entity.type}`, 20, 40);
        if (this.entity instanceof BaseEnemy) {
            ctx.fillText(`VARIANT: ${this.entity.variant}`, 20, 65);
        }
        ctx.fillText("MOUSE TO GUIDE / CLICK TO SHOOT", 20, 90);
    }
}
