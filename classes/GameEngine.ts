
import { Vector2, GridPoint, EntityType, GameState, EnemyVariant, ParticleBehavior, GRID_SIZE } from '../types';
import { toScreen } from '../utils/isoMath';
import { SoundEngine } from '../utils/sound';
import { BaseEntity, Tower, ParticleEffect, FloatingText, LaserTower } from './Entities';

import { EnemyFactory } from './EnemyFactory';
import { BaseEnemy } from './enemies/BaseEnemy';

import { MapManager } from './managers/MapManager';
import { WaveManager } from './managers/WaveManager';
import { RenderManager } from './managers/RenderManager';
import { InputManager } from './managers/InputManager';

import { VfxSystem } from './systems/VfxSystem';
import { ActionSystem } from './systems/ActionSystem';
import { PreviewSystem } from './systems/PreviewSystem';

interface EngineCallbacks {
    onBuild?: () => void;
    onSelect?: (entityId: string | null) => void;
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

  // Sub-Systems
  vfx: VfxSystem;
  actions: ActionSystem;
  preview: PreviewSystem;

  // Backing fields for main game state
  private _entities: BaseEntity[] = [];
  private _particles: ParticleEffect[] = [];
  
  // Context-Aware Accessors
  get entities(): BaseEntity[] {
      if (this.preview && this.preview.active) return this.preview.entities;
      return this._entities;
  }
  set entities(v: BaseEntity[]) {
      if (this.preview && this.preview.active) this.preview.entities = v;
      else this._entities = v;
  }

  get particles(): ParticleEffect[] {
      if (this.preview && this.preview.active) return this.preview.particles;
      return this._particles;
  }
  set particles(v: ParticleEffect[]) {
      if (this.preview && this.preview.active) this.preview.particles = v;
      else this._particles = v;
  }
  
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
  musicDebugMode: boolean = false;
  
  constructor(canvas: HTMLCanvasElement, callbacks: EngineCallbacks = {}) {
    this.canvas = canvas;
    this.callbacks = callbacks;
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) throw new Error('Could not get 2D context');
    this.ctx = ctx;
    this.audio = new SoundEngine();

    // Initialize Managers
    this.map = new MapManager(this);
    this.waves = new WaveManager(this);
    this.renderer = new RenderManager(this);
    this.input = new InputManager(this);

    // Initialize Systems
    this.vfx = new VfxSystem(this);
    this.actions = new ActionSystem(this);
    this.preview = new PreviewSystem(this);

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

  // --- PREVIEW API DELEGATION ---
  get previewMode() { return this.preview.active; }
  setPreviewMode(active: boolean) { this.preview.setMode(active); }
  spawnPreviewEntity(variant: string) { this.preview.spawnEntity(variant); }
  handlePreviewClick(x: number, y: number) { this.preview.handleClick(x, y); }

  // Expose tracker for debug UI
  get tracker() { return this.audio.tracker; }

  update(rawDt: number) {
    // Process Inputs (WASD Pan, etc)
    this.input.update(rawDt);
    this.renderer.update(rawDt);

    if (this.preview.active) {
        this.preview.update(rawDt);
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
    this.updateAudioState();

    this.ambientTimer++;
    if (this.ambientTimer > 10) { 
        this.vfx.spawnAmbientParticles();
        this.ambientTimer = 0;
    }

    // Update all entities
    [...this.entities].forEach(ent => ent.update(dt, this));
    
    // Update particles
    this.particles.forEach(p => p.update(dt, this));
    
    // Particle GC
    this.particles = this.particles.filter(p => p.life > 0);
  }

  draw() {
    if (this.preview.active) {
        this.preview.draw(this.ctx);
        return;
    }

    this.renderer.draw(); 

    const renderables = [...this.entities, ...this.particles].sort((a, b) => a.depth - b.depth);

    // Pass 1: Draw Shadows (Enemies Only)
    renderables.forEach(ent => {
        if (ent instanceof BaseEnemy) {
             const screenPos = this.getScreenPos(ent.gridPos.x, ent.gridPos.y);
             // Shadows are on the ground, so we don't subtract zHeight here
             ent.drawShadow(this.ctx, screenPos);
        }
    });

    // Pass 2: Draw Bodies & Effects
    renderables.forEach(ent => {
      this.drawEntityWithLasers(this.ctx, ent);
    });

    this.renderer.postDraw(); 
  }

  drawEntityWithLasers(ctx: CanvasRenderingContext2D, ent: BaseEntity | ParticleEffect) {
      let screenPos: Vector2;
      if (ent.type === EntityType.PARTICLE) {
         screenPos = (ent as ParticleEffect).screenPos;
         ent.draw(ctx, screenPos);
      } else {
         screenPos = this.getScreenPos(ent.gridPos.x, ent.gridPos.y);
         screenPos.y -= ent.zHeight;
         
         if (ent instanceof LaserTower && ent.laserCharge > 0) {
             ent.draw(ctx, screenPos);
             
             const target = ent.focusedTarget;
             if (target) {
                const targetPos = this.getScreenPos(target.gridPos.x, target.gridPos.y);
                targetPos.y -= (target.zHeight + 15); 
                
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
         } else {
             ent.draw(ctx, screenPos);
         }
      }
  }

  getScreenPos(gx: number, gy: number): Vector2 {
      return toScreen(gx + 0.5, gy + 0.5, this.renderer.offsetX, this.renderer.offsetY);
  }

  get selectedEntityId() { return this.input.selectedEntityId; }
  set selectedEntityId(v) { this.input.selectedEntityId = v; }

  // --- ACTIONS DELEGATION ---
  restartGame() {
    this._entities = [];
    this._particles = [];
    this.map.generate();
    this.gameState = { money: 120, wave: 1, health: 20, gameActive: true };
    this.waves.reset();
    this.timeScale = 1.0;
    this.paused = false;
    this.input.deselectAll();
    
    // Set to INTRO on restart, not IDLE
    this.audio.setMusicState('INTRO');
    
    this.renderer.prerenderMap();
  }

  startWave() { this.actions.startWave(); }
  
  spawnEnemy(variant: EnemyVariant) { 
      // Use smooth spline path for flying enemies
      const isFlying = variant === EnemyVariant.FAST || variant === EnemyVariant.GHOST || variant === EnemyVariant.SWARM || variant === EnemyVariant.BOSS_MK2 || variant === EnemyVariant.BOSS_MK3;
      const path = isFlying ? this.map.flyPath : this.map.enemyPath;
      
      this.entities.push(EnemyFactory.create(variant, path, this.gameState.wave)); 
  }
  
  buildTower(gridPos: GridPoint, type: EntityType) { this.actions.buildTower(gridPos, type); }
  upgradeSelectedTower() { this.actions.upgradeSelectedTower(); }
  sellSelectedTower() { this.actions.sellSelectedTower(); }
  spawnProjectile(source: Tower, target: BaseEnemy) { this.actions.spawnProjectile(source, target); }

  // --- VFX DELEGATION ---
  spawnExplosion(gridPos: Vector2, color: string) { this.vfx.spawnExplosion(gridPos, color); }
  spawnHitEffect(gridPos: Vector2) { this.vfx.spawnHitEffect(gridPos); }
  spawnBuildEffect(gridPos: Vector2, color?: string) { this.vfx.spawnBuildEffect(gridPos, color); }
  spawnLootEffect(gridPos: Vector2, amount: number) { this.vfx.spawnLootEffect(gridPos, amount); }
  spawnParticle(gridPos: Vector2, z: number, color: string) { this.vfx.spawnParticle(gridPos, z, color); }
  addFloatingText(text: string, gridPos: Vector2, color: string, isCrit: boolean = false) { this.vfx.addFloatingText(text, gridPos, color, isCrit); }
  shakeScreen(intensity: number) { this.vfx.shakeScreen(intensity); }

  getTowerCost(type: EntityType) { return this.actions.getTowerCost(type); }

  removeEntity(id: string) {
    if (this.preview.active) {
        this.preview.removeEntity(id);
    } else {
        this._entities = this._entities.filter(e => e.id !== id);
        if (this.input.selectedEntityId === id) {
             this.input.selectedEntityId = null;
             if (this.callbacks.onSelect) this.callbacks.onSelect(null);
        }
    }
  }

  removeParticle(id: string) {
    if (this.preview.active) {
        this.preview.particles = this.preview.particles.filter(p => p.id !== id);
    } else {
        this._particles = this._particles.filter(p => p.id !== id);
    }
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
    // If music debugger is active, stop automatic state changes
    if (this.musicDebugMode) return;
    
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
    } else if (this.gameState.wave === 1 && this.gameState.gameActive) {
        // Special case: Playing 'INTRO' when sitting on Wave 1 before start
        this.audio.setMusicState('INTRO');
    } else {
        this.audio.setMusicState('IDLE');
    }
  }
  
  resize() { this.renderer.resize(); }
  setSelectedTower(type: EntityType | null) { this.input.setSelectedTowerType(type); }
  setTimeScale(scale: number) { this.timeScale = scale; }
  togglePause() { this.paused = !this.paused; }
}
