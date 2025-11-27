import { Vector2, GridPoint, EntityType, GameState, EnemyVariant, ParticleBehavior, GRID_SIZE } from '../types';
import { toScreen, toGrid } from '../utils/isoMath';
import { SoundEngine } from '../utils/sound';
import { BaseEntity, Tower, Projectile, ParticleEffect, FloatingText, TowerFactory, LaserTower } from './Entities';

import { EnemyFactory } from './EnemyFactory';
import { BaseEnemy } from './enemies/BaseEnemy';

import { MapManager } from './managers/MapManager';
import { WaveManager } from './managers/WaveManager';
import { RenderManager } from './managers/RenderManager';
import { InputManager } from './managers/InputManager';

interface EngineCallbacks {
    onBuild?: () => void;
    onSelect?: (entityId: string | null) => void;
}

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

export class GameEngine {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  audio: SoundEngine;
  callbacks: EngineCallbacks;
  
  // Managers
  map: MapManager;
  waves: WaveManager;
  renderer: RenderManager;
  input: InputManager;

  entities: BaseEntity[] = [];
  particles: ParticleEffect[] = [];
  
  gameState: GameState = {
    money: 120,
    wave: 1,
    health: 20,
    gameActive: true
  };

  timeScale: number = 1.0;
  paused: boolean = false;
  ambientTimer: number = 0;
  
  // Debug
  debugMode: boolean = false;
  
  // Preview / Animation Debug
  previewMode: boolean = false;
  previewEntity: BaseEntity | null = null;
  previewEntities: BaseEntity[] = [];
  previewParticles: ParticleEffect[] = [];

  constructor(canvas: HTMLCanvasElement, callbacks: EngineCallbacks = {}) {
    this.canvas = canvas;
    this.callbacks = callbacks;
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) throw new Error('Could not get 2D context');
    this.ctx = ctx;
    this.audio = new SoundEngine();

    this.map = new MapManager(this);
    this.waves = new WaveManager(this);
    this.renderer = new RenderManager(this);
    this.input = new InputManager(this);

    this.map.generate();
    this.renderer.resize(); 
    window.addEventListener('resize', this.renderer.resize.bind(this.renderer));
  }

  get enemies(): BaseEnemy[] {
    return this.entities.filter(e => e.type === EntityType.ENEMY_MINION) as BaseEnemy[];
  }

  get nextWaveType(): string {
      return this.waves.getNextWavePreview(this.gameState.wave);
  }

  // --- PREVIEW MODE API ---
  setPreviewMode(active: boolean) {
      this.previewMode = active;
      if (active) {
          this.paused = true;
          this.spawnPreviewEntity(EnemyVariant.NORMAL); // Default
      } else {
          this.paused = false;
          this.previewEntity = null;
          this.previewEntities = [];
          this.previewParticles = [];
      }
  }

  spawnPreviewEntity(variant: string) {
      this.previewEntities = [];
      this.previewParticles = [];
      const centerGrid = { x: 10, y: 10 };
      
      // Check if it's an EnemyVariant
      if (Object.values(EnemyVariant).includes(variant as EnemyVariant)) {
          // Dummy path needed
          const path = [centerGrid, centerGrid];
          this.previewEntity = EnemyFactory.create(variant as EnemyVariant, path, 20); // Wave 20 scaling
      } 
      // Else assume Tower (EntityType)
      else {
          // Check if valid tower type
          this.previewEntity = TowerFactory.create(variant as EntityType, centerGrid.x, centerGrid.y);
          if (this.previewEntity instanceof Tower) {
              this.previewEntity.constructionScale = 1.0;
          }
      }
      if (this.previewEntity) {
          this.previewEntities.push(this.previewEntity);
      }
  }

  handlePreviewClick(screenX: number, screenY: number) {
      if (!this.previewEntity || !(this.previewEntity instanceof Tower)) return;

      const rect = this.canvas.getBoundingClientRect();
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;
      
      // Inverse Camera Transform
      const entScreenPos = this.getScreenPos(this.previewEntity.gridPos.x, this.previewEntity.gridPos.y);
      const worldScreenX = (screenX - centerX) / 2 + entScreenPos.x;
      const worldScreenY = (screenY - centerY) / 2 + entScreenPos.y;
      
      const gridP = toGrid(worldScreenX, worldScreenY, this.renderer.offsetX, this.renderer.offsetY);
      const dummy = new DummyEnemy(gridP.gx + 0.5, gridP.gy + 0.5); 
      
      this.previewEntities.push(dummy);
      this.previewEntity.forceFire(dummy, this);
  }

  update(rawDt: number) {
    if (this.previewMode) {
        this.updatePreview(rawDt);
        return;
    }

    if (this.gameState.health <= 0) {
        if (this.gameState.gameActive) {
            this.gameState.gameActive = false;
            this.audio.playGameOver();
        }
    }
    
    if (!this.gameState.gameActive) {
        this.audio.setMusicState('IDLE'); 
        return;
    }

    if (this.paused) return;

    const dt = rawDt * this.timeScale;

    this.waves.update(dt);
    this.renderer.update();
    this.updateAudioState();

    this.ambientTimer++;
    if (this.ambientTimer > 10) { 
        this.spawnAmbientParticles();
        this.ambientTimer = 0;
    }

    // Update all entities
    [...this.entities].forEach(ent => ent.update(dt, this));
    
    // Update particles
    this.particles.forEach(p => p.update(dt, this));
    
    // Particle GC
    this.particles = this.particles.filter(p => p.life > 0);
  }

  updatePreview(dt: number) {
      if (!this.previewEntity) return;

      const rect = this.canvas.getBoundingClientRect();
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;
      const dx = this.input.mouseScreenPos.x - centerX;
      const dy = this.input.mouseScreenPos.y - centerY;

      if (this.previewEntity instanceof BaseEnemy) {
          // Convert screen delta to grid delta
          const gridDelta = toGrid(
              this.renderer.offsetX + dx / 2, 
              this.renderer.offsetY + dy / 2, 
              this.renderer.offsetX, 
              this.renderer.offsetY
          );
          
          // Virtual Path
          const target = {
              x: this.previewEntity.gridPos.x + gridDelta.gx * 0.1, 
              y: this.previewEntity.gridPos.y + gridDelta.gy * 0.1
          };
          
          this.previewEntity.path = [this.previewEntity.gridPos, target];
          this.previewEntity.pathIndex = 0;
          
          this.previewEntity.update(dt, this);
      } 
      else if (this.previewEntity instanceof Tower) {
          // Tower rotation towards mouse
          const angle = Math.atan2(dy, dx);
          // @ts-ignore
          if(this.previewEntity['rotateTowards']) {
              // @ts-ignore
              this.previewEntity.rotateTowards(angle, dt, 0.01);
          }
          this.previewEntity.update(dt, this);
      }
      
      // Update other preview entities
      this.previewEntities.forEach(e => {
          if (e !== this.previewEntity) e.update(dt, this);
      });
      
      // Update particles
      this.previewParticles.forEach(p => p.update(dt, this));
      
      // GC
      this.previewEntities = this.previewEntities.filter(e => {
          if (e instanceof Projectile && e.target.health <= 0) return false;
          if (e instanceof DummyEnemy && e.health <= 0) return false;
          return true;
      });
      this.previewParticles = this.previewParticles.filter(p => p.life > 0);
  }

  draw() {
    if (this.previewMode) {
        this.drawPreview();
        return;
    }

    this.renderer.draw(); 

    const renderables = [...this.entities, ...this.particles].sort((a, b) => a.depth - b.depth);

    renderables.forEach(ent => {
      this.drawEntityWithLasers(this.ctx, ent, this.entities);
    });

    this.renderer.postDraw(); 
  }

  // Extracted logic to support both Main and Preview renderers
  drawEntityWithLasers(ctx: CanvasRenderingContext2D, ent: BaseEntity | ParticleEffect, entityList: BaseEntity[]) {
      let screenPos: Vector2;
      if (ent.type === EntityType.PARTICLE) {
         screenPos = (ent as ParticleEffect).screenPos;
         ent.draw(ctx, screenPos);
      } else {
         screenPos = this.getScreenPos(ent.gridPos.x, ent.gridPos.y);
         screenPos.y -= ent.zHeight;
         
         if (ent instanceof LaserTower && ent.targetId) {
             ent.draw(ctx, screenPos);
             if (ent.laserCharge > 0) {
                 const t = entityList.find(e => e.id === ent.targetId);
                 if (t) {
                    const targetPos = this.getScreenPos(t.gridPos.x, t.gridPos.y);
                    targetPos.y -= (t.zHeight + 15); 
                    
                    const startX = screenPos.x + Math.cos(ent.rotation) * 5;
                    const startY = screenPos.y - 45 * ent.constructionScale + Math.sin(ent.rotation) * 5;
                    
                    ctx.save();
                    ctx.globalCompositeOperation = 'lighter';
                    
                    const pulse = Math.sin(Date.now() / 50) * 0.2 + 0.8;
                    const chargeWidth = ent.laserBeamWidth || 1;
                    
                    ctx.strokeStyle = '#fff';
                    ctx.lineWidth = Math.min(3, chargeWidth);
                    ctx.beginPath(); ctx.moveTo(startX, startY); ctx.lineTo(targetPos.x, targetPos.y); ctx.stroke();
                    
                    const chargeColor = ent.laserCharge > 1.5 ? '#a5f3fc' : '#06b6d4'; 
                    ctx.strokeStyle = chargeColor;
                    ctx.lineWidth = Math.min(8, chargeWidth * 2.5) * pulse;
                    ctx.shadowColor = chargeColor;
                    ctx.shadowBlur = 10 * pulse;
                    ctx.beginPath(); ctx.moveTo(startX, startY); ctx.lineTo(targetPos.x, targetPos.y); ctx.stroke();
                    
                    if (ent.laserCharge > 0.5) {
                        ctx.strokeStyle = '#22d3ee';
                        ctx.lineWidth = 1;
                        ctx.shadowBlur = 0;
                        ctx.beginPath();
                        const dx = targetPos.x - startX;
                        const dy = targetPos.y - startY;
                        const dist = Math.sqrt(dx*dx + dy*dy);
                        const angle = Math.atan2(dy, dx);
                        const loops = Math.floor(dist / 20);
                        const timeOffset = Date.now() / 100;

                        for(let i=0; i<=dist; i+=5) {
                            const pct = i/dist;
                            const x = startX + Math.cos(angle) * i;
                            const y = startY + Math.sin(angle) * i;
                            const perpAngle = angle + Math.PI/2;
                            const wave = Math.sin(pct * loops * Math.PI + timeOffset) * (4 * pulse);
                            const finalX = x + Math.cos(perpAngle) * wave;
                            const finalY = y + Math.sin(perpAngle) * wave;
                            if (i===0) ctx.moveTo(finalX, finalY);
                            else ctx.lineTo(finalX, finalY);
                        }
                        ctx.stroke();
                    }
                    ctx.restore();
                 }
             }
         } else {
             ent.draw(ctx, screenPos);
         }
      }
  }

  drawPreview() {
      if (!this.previewEntity) return;

      const ctx = this.ctx;
      const w = this.renderer.width;
      const h = this.renderer.height;

      // 1. Draw Void Background
      ctx.fillStyle = '#111827'; // Dark gray
      ctx.fillRect(0, 0, w, h);

      // 2. Draw Grid (Relative to entity pos to simulate camera follow)
      // Screen pos of entity in "World"
      const worldScreenPos = this.getScreenPos(this.previewEntity.gridPos.x, this.previewEntity.gridPos.y);
      
      ctx.save();
      // Center Zoom
      ctx.translate(w/2, h/2);
      ctx.scale(2, 2);
      
      // Translate such that entity is at (0,0)
      ctx.translate(-worldScreenPos.x, -worldScreenPos.y);

      // Draw faint grid around entity
      const range = 5;
      const cx = Math.floor(this.previewEntity.gridPos.x);
      const cy = Math.floor(this.previewEntity.gridPos.y);
      
      ctx.strokeStyle = 'rgba(255,255,255,0.1)';
      ctx.lineWidth = 1;
      
      for(let x = cx - range; x <= cx + range; x++) {
          const start = this.getScreenPos(x, cy - range);
          const end = this.getScreenPos(x, cy + range + 1);
          ctx.beginPath(); ctx.moveTo(start.x, start.y); ctx.lineTo(end.x, end.y); ctx.stroke();
      }
      for(let y = cy - range; y <= cy + range; y++) {
          const start = this.getScreenPos(cx - range, y);
          const end = this.getScreenPos(cx + range + 1, y);
          ctx.beginPath(); ctx.moveTo(start.x, start.y); ctx.lineTo(end.x, end.y); ctx.stroke();
      }

      // 3. Draw All Preview Entities (Sort depth)
      const renderables = [...this.previewEntities, ...this.previewParticles].sort((a, b) => a.depth - b.depth);
      
      renderables.forEach(ent => {
           this.drawEntityWithLasers(ctx, ent, this.previewEntities);
      });

      ctx.restore();
      
      // 4. Debug Text
      ctx.fillStyle = '#fff';
      ctx.font = '20px monospace';
      ctx.fillText(`PREVIEW: ${this.previewEntity.type}`, 20, 40);
      if (this.previewEntity instanceof BaseEnemy) {
          ctx.fillText(`VARIANT: ${this.previewEntity.variant}`, 20, 65);
      }
      ctx.fillText("MOUSE TO GUIDE / CLICK TO SHOOT", 20, 90);
  }

  getScreenPos(gx: number, gy: number): Vector2 {
      return toScreen(gx + 0.5, gy + 0.5, this.renderer.offsetX, this.renderer.offsetY);
  }

  get selectedEntityId() { return this.input.selectedEntityId; }
  set selectedEntityId(v) { this.input.selectedEntityId = v; }

  restartGame() {
    this.entities = [];
    this.particles = [];
    this.map.generate();
    this.gameState = { money: 120, wave: 1, health: 20, gameActive: true };
    this.waves.reset();
    this.timeScale = 1.0;
    this.paused = false;
    this.input.deselectAll();
    this.audio.setMusicState('IDLE');
    this.renderer.prerenderMap();
  }

  startWave() {
      // INTEREST MECHANIC
      // 10% Interest, capped at $1000 per wave
      const interest = Math.min(1000, Math.floor(this.gameState.money * 0.10));
      if (interest > 0) {
          this.gameState.money += interest;
          this.audio.playGold();
          // Spawn center screen interest text
          const centerGrid = { x: GRID_SIZE/2, y: GRID_SIZE/2 };
          this.addFloatingText(`INTEREST +$${interest}`, centerGrid, '#22c55e', true);
      }

      this.gameState.wave = this.waves.startWave(this.gameState.wave);
      this.audio.playWaveStart(); 
      this.shakeScreen(4); 
  }

  spawnEnemy(variant: EnemyVariant) {
    const enemy = EnemyFactory.create(variant, this.map.enemyPath, this.gameState.wave);
    this.entities.push(enemy);
  }

  // Helper to centralize costs
  getTowerCost(type: EntityType): number {
      switch (type) {
          case EntityType.TOWER_BASIC: return 30;
          case EntityType.TOWER_SNIPER: return 50;
          case EntityType.TOWER_PULSE: return 60;
          case EntityType.TOWER_LASER: return 120;
          default: return 999;
      }
  }

  buildTower(gridPos: GridPoint, type: EntityType) {
      const { gx, gy } = gridPos;
      if (this.map.isBuildable(gx, gy)) {
          const cost = this.getTowerCost(type);
          
          if (this.debugMode || this.gameState.money >= cost) {
            if (!this.debugMode) this.gameState.money -= cost;
            
            this.map.setTile(gx, gy, 2); 
            // Factory Use
            const tower = TowerFactory.create(type, gx, gy);
            this.entities.push(tower);
            
            let buildColor = '#60a5fa';
            if (type === EntityType.TOWER_PULSE) buildColor = '#a855f7';
            if (type === EntityType.TOWER_LASER) buildColor = '#22d3ee';
            
            this.spawnBuildEffect(tower.gridPos, buildColor);
            
            this.audio.playBuild();
            if (!this.debugMode) {
                 this.addFloatingText('-$' + cost, {x: gx, y: gy}, '#ef4444');
            } else {
                 this.addFloatingText('FREE', {x: gx, y: gy}, '#22c55e');
            }
            
            // NOTE: We do NOT deselect the tool here to allow rapid building.
            // But we do ensure we aren't selecting the new tower immediately.
            this.input.selectedEntityId = null;
            this.shakeScreen(2);
          } else {
               this.audio.playCancel();
          }
      } else {
          this.audio.playCancel();
      }
  }

  upgradeSelectedTower() {
    if (!this.input.selectedEntityId) return;
    const tower = this.entities.find(e => e.id === this.input.selectedEntityId) as Tower;
    if (!tower || !(tower instanceof Tower)) return;

    const cost = tower.getUpgradeCost();
    if (this.debugMode || this.gameState.money >= cost) {
      if (!this.debugMode) this.gameState.money -= cost;
      
      tower.upgrade();
      this.spawnBuildEffect(tower.gridPos, '#fbbf24');
      this.audio.playUpgrade();
      this.addFloatingText('UPGRADED', tower.gridPos, '#fbbf24');
      this.shakeScreen(1);
    }
  }

  sellSelectedTower() {
      if (!this.input.selectedEntityId) return;
      const tower = this.entities.find(e => e.id === this.input.selectedEntityId) as Tower;
      if (!tower || !(tower instanceof Tower)) return;
      
      const refund = tower.getSellValue();
      this.gameState.money += refund;
      this.map.setTile(tower.gridPos.x, tower.gridPos.y, 0); // Restore to grass
      
      this.spawnLootEffect(tower.gridPos, refund);
      this.addFloatingText(`+$${refund}`, tower.gridPos, '#fbbf24');
      this.audio.playGold();
      this.spawnBuildEffect(tower.gridPos, '#fbbf24'); // Reuse effect
      
      this.removeEntity(tower.id);
      this.input.selectedEntityId = null;
      if (this.callbacks.onSelect) this.callbacks.onSelect(null);
  }

  spawnProjectile(source: Tower, target: BaseEnemy) {
    const proj = new Projectile(source.gridPos, target, source.damage, source.id);
    if (this.previewMode) {
        this.previewEntities.push(proj);
    } else {
        this.entities.push(proj);
    }
  }

  spawnExplosion(gridPos: Vector2, color: string) {
    const center = this.getScreenPos(gridPos.x, gridPos.y);
    const zBase = 15; // Slightly above ground
    
    const particlesToAdd: ParticleEffect[] = [];

    // 1. Initial Flash (Bright white center)
    const flash = new ParticleEffect(center, zBase, '#fff', {x:0,y:0}, 0.1, ParticleBehavior.FLOAT, 'FLASH');
    flash.size = 60;
    particlesToAdd.push(flash);

    // 2. Shockwave Ring
    const shockwave = new ParticleEffect(center, 5, color, {x:0, y:0}, 0.4, ParticleBehavior.FLOAT, 'SHOCKWAVE');
    shockwave.size = 10;
    particlesToAdd.push(shockwave);

    // 3. Fireball Plume (Rising and expanding)
    for(let i=0; i<6; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * 2;
        const vel = { x: Math.cos(angle) * speed, y: Math.sin(angle) * speed * 0.5 - 2 }; // Upward bias
        
        const p = new ParticleEffect(center, zBase, '#fff', vel, 0.4 + Math.random()*0.3, ParticleBehavior.FLOAT, 'FIRE');
        p.size = 20 + Math.random() * 20;
        particlesToAdd.push(p);
    }

    // 4. Smoke Trails (Dark, lasting longer)
    for(let i=0; i<4; i++) {
        const vel = { x: (Math.random()-0.5)*3, y: -2 - Math.random()*2 };
        const p = new ParticleEffect(center, zBase+10, 'rgba(30,30,30,1)', vel, 1.5, ParticleBehavior.FLOAT, 'SMOKE');
        p.size = 15;
        particlesToAdd.push(p);
    }

    // 5. Debris / Sparks
    for(let i=0; i<8; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 4 + Math.random() * 4;
        const vel = { x: Math.cos(angle) * speed, y: Math.sin(angle) * speed * 0.5 - 2 };
        const p = new ParticleEffect(center, zBase, color, vel, 0.6, ParticleBehavior.PHYSICS, 'DEFAULT');
        p.size = 3;
        particlesToAdd.push(p);
    }

    this.shakeScreen(4);
    
    if (this.previewMode) {
        this.previewParticles.push(...particlesToAdd);
    } else {
        this.particles.push(...particlesToAdd);
    }
  }

  spawnHitEffect(gridPos: Vector2) {
    const center = this.getScreenPos(gridPos.x, gridPos.y);
    const particlesToAdd: ParticleEffect[] = [];
    for(let i=0; i<5; i++) {
        const vel = { x: (Math.random() - 0.5) * 3, y: (Math.random() - 0.5) * 3 };
        particlesToAdd.push(new ParticleEffect(center, 15, '#fff', vel, 0.4));
    }
    if (this.previewMode) {
        this.previewParticles.push(...particlesToAdd);
    } else {
        this.particles.push(...particlesToAdd);
    }
  }

  spawnBuildEffect(gridPos: Vector2, color = '#60a5fa') {
      const center = this.getScreenPos(gridPos.x, gridPos.y);
      for(let i=0; i<15; i++) {
          // Fountain effect: Randomize X/Y direction but biased upwards
          const speed = 2 + Math.random() * 4;
          const angle = (Math.PI) + (Math.random() * Math.PI); // Upward arc
          const vel = { 
              x: (Math.random() - 0.5) * 4, 
              y: -4 - Math.random() * 3 
          };
          // Use physics behavior so they arc and fall
          const p = new ParticleEffect(center, 0, color, vel, 1.0, ParticleBehavior.PHYSICS);
          p.size = 2 + Math.random() * 2;
          this.particles.push(p);
      }
  }

  spawnLootEffect(gridPos: Vector2, amount: number) {
      if (this.previewMode) return; // No loot in preview
      const center = this.getScreenPos(gridPos.x, gridPos.y);
      const targetScreenPos = { x: 300, y: 50 }; 
      const count = Math.min(15, Math.ceil(amount / 5));
      
      // Explosion first, then fly
      for(let i=0; i<count; i++) {
          // Random burst velocity
          const burstVel = { 
              x: (Math.random() - 0.5) * 8, 
              y: -5 - Math.random() * 5 
          };
          
          const p = new ParticleEffect(center, 20, '#fbbf24', burstVel, 1.5, ParticleBehavior.UI_TARGET);
          p.targetPos = targetScreenPos;
          this.particles.push(p);
      }
  }

  spawnParticle(gridPos: Vector2, z: number, color: string) {
     const center = this.getScreenPos(gridPos.x, gridPos.y);
     const vel = { x: (Math.random() - 0.5), y: (Math.random() - 0.5) - 1 };
     const p = new ParticleEffect(center, z, color, vel, 0.5);
     if (this.previewMode) {
         this.previewParticles.push(p);
     } else {
         this.particles.push(p);
     }
  }

  spawnAmbientParticles() {
      if (this.previewMode) return;
      const x = Math.random() * this.renderer.width;
      const y = Math.random() * this.renderer.height;
      const p = new ParticleEffect({x, y}, 0, 'rgba(100, 255, 218, 0.3)', {x:0, y:0}, 4.0, ParticleBehavior.FLOAT);
      p.size = 1 + Math.random() * 2;
      this.particles.push(p);
  }

  addFloatingText(text: string, gridPos: Vector2, color: string, isCrit: boolean = false) {
      if (this.previewMode) return; // No floating text in preview
      this.entities.push(new FloatingText(text, gridPos, color, isCrit));
  }

  removeEntity(id: string) {
    if (this.previewMode) {
        this.previewEntities = this.previewEntities.filter(e => e.id !== id);
    } else {
        this.entities = this.entities.filter(e => e.id !== id);
        if (this.input.selectedEntityId === id) {
             this.input.selectedEntityId = null;
             if (this.callbacks.onSelect) this.callbacks.onSelect(null);
        }
    }
  }

  removeParticle(id: string) {
    if (this.previewMode) {
        this.previewParticles = this.previewParticles.filter(p => p.id !== id);
    } else {
        this.particles = this.particles.filter(p => p.id !== id);
    }
  }
  
  shakeScreen(intensity: number) {
      this.renderer.shake(intensity);
  }

  toggleDebug() {
      this.debugMode = !this.debugMode;
      if (this.debugMode) {
          this.addFloatingText('DEBUG MODE ON', {x: 10, y: 10}, '#22c55e');
      } else {
          this.addFloatingText('DEBUG MODE OFF', {x: 10, y: 10}, '#ef4444');
      }
  }

  setMusicVolume(v: number) { this.audio.setMusicVolume(v); }
  setSfxVolume(v: number) { this.audio.setSfxVolume(v); }

  private updateAudioState() {
    const activeEnemies = this.entities.filter(e => e.type === EntityType.ENEMY_MINION) as BaseEnemy[];
    const hasBoss = activeEnemies.some(e => e.variant.startsWith('BOSS'));
    
    if (this.gameState.health <= 6 && activeEnemies.length > 0) {
        this.audio.setMusicState('PANIC');
        return;
    }

    if (hasBoss) {
        this.audio.setMusicState('BOSS');
    } else if (activeEnemies.length > 0) {
        this.audio.setMusicState('COMBAT');
    } else {
        this.audio.setMusicState('IDLE');
    }
  }
  
  resize() { this.renderer.resize(); }
  setSelectedTower(type: EntityType | null) { this.input.setSelectedTowerType(type); }
  setTimeScale(scale: number) { this.timeScale = scale; }
  togglePause() { this.paused = !this.paused; }
}