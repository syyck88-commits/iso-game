
import { Vector2, GridPoint, EntityType, GameState, EnemyVariant, ParticleBehavior } from '../types';
import { toScreen } from '../utils/isoMath';
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

  update(rawDt: number) {
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

    this.entities.forEach(ent => ent.update(dt, this));
    this.particles.forEach(p => p.update(dt, this));
    
    // Simple GC
    this.entities = this.entities.filter(e => e.type === EntityType.TOWER_BASIC || e.type.startsWith('TOWER') || e.type === EntityType.TREE || (e as any).health === undefined || (e as any).health > 0 || (e as any).isDying);
    this.particles = this.particles.filter(p => p.life > 0);
  }

  draw() {
    this.renderer.draw(); 

    const renderables = [...this.entities, ...this.particles].sort((a, b) => a.depth - b.depth);

    renderables.forEach(ent => {
      let screenPos: Vector2;
      if (ent.type === EntityType.PARTICLE) {
         screenPos = (ent as ParticleEffect).screenPos;
         ent.draw(this.ctx, screenPos);
      } else {
         screenPos = this.getScreenPos(ent.gridPos.x, ent.gridPos.y);
         screenPos.y -= ent.zHeight;
         
         // Special handling for Tower Laser rendering which needs target info from Engine
         if (ent instanceof LaserTower && ent.targetId) {
             // Draw the tower model first
             ent.draw(this.ctx, screenPos);

             // Draw beam on top (or calculate it)
             if (ent.laserCharge > 0) {
                 const t = this.entities.find(e => e.id === ent.targetId);
                 if (t) {
                    const targetPos = this.getScreenPos(t.gridPos.x, t.gridPos.y);
                    targetPos.y -= (t.zHeight + 15); // Aim at center mass
                    
                    const startX = screenPos.x + Math.cos(ent.rotation) * 5;
                    const startY = screenPos.y - 45 * ent.constructionScale + Math.sin(ent.rotation) * 5;
                    
                    const ctx = this.ctx;
                    ctx.save();
                    ctx.globalCompositeOperation = 'lighter';
                    
                    // Intensity Pulse
                    const pulse = Math.sin(Date.now() / 50) * 0.2 + 0.8;
                    const chargeWidth = ent.laserBeamWidth || 1;
                    
                    // Core Beam (White hot)
                    ctx.strokeStyle = '#fff';
                    ctx.lineWidth = Math.min(3, chargeWidth);
                    ctx.beginPath(); ctx.moveTo(startX, startY); ctx.lineTo(targetPos.x, targetPos.y); ctx.stroke();
                    
                    // Glow Beam
                    const chargeColor = ent.laserCharge > 1.5 ? '#a5f3fc' : '#06b6d4'; 
                    ctx.strokeStyle = chargeColor;
                    ctx.lineWidth = Math.min(8, chargeWidth * 2.5) * pulse;
                    ctx.shadowColor = chargeColor;
                    ctx.shadowBlur = 10 * pulse;
                    ctx.beginPath(); ctx.moveTo(startX, startY); ctx.lineTo(targetPos.x, targetPos.y); ctx.stroke();
                    
                    // Spiral / Helix Effect
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
                            
                            // Spiral offset
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
             ent.draw(this.ctx, screenPos);
         }
      }
    });

    this.renderer.postDraw(); 
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
      this.gameState.wave = this.waves.startWave(this.gameState.wave);
      this.audio.playWaveStart(); 
      this.shakeScreen(4); 
  }

  spawnEnemy(variant: EnemyVariant) {
    const enemy = EnemyFactory.create(variant, this.map.enemyPath, this.gameState.wave);
    this.entities.push(enemy);
  }

  buildTower(gridPos: GridPoint, type: EntityType) {
      const { gx, gy } = gridPos;
      if (this.map.isBuildable(gx, gy)) {
          let cost = 30;
          if (type === EntityType.TOWER_SNIPER) cost = 50;
          if (type === EntityType.TOWER_PULSE) cost = 60;
          if (type === EntityType.TOWER_LASER) cost = 120;
          
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
    this.entities.push(proj);
  }

  spawnExplosion(gridPos: Vector2, color: string) {
    const center = this.getScreenPos(gridPos.x, gridPos.y);
    const zBase = 15; // Slightly above ground
    
    // 1. Initial Flash (Bright white center)
    const flash = new ParticleEffect(center, zBase, '#fff', {x:0,y:0}, 0.1, ParticleBehavior.FLOAT, 'FLASH');
    flash.size = 60;
    this.particles.push(flash);

    // 2. Shockwave Ring
    const shockwave = new ParticleEffect(center, 5, color, {x:0, y:0}, 0.4, ParticleBehavior.FLOAT, 'SHOCKWAVE');
    shockwave.size = 10;
    this.particles.push(shockwave);

    // 3. Fireball Plume (Rising and expanding)
    for(let i=0; i<6; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * 2;
        const vel = { x: Math.cos(angle) * speed, y: Math.sin(angle) * speed * 0.5 - 2 }; // Upward bias
        
        const p = new ParticleEffect(center, zBase, '#fff', vel, 0.4 + Math.random()*0.3, ParticleBehavior.FLOAT, 'FIRE');
        p.size = 20 + Math.random() * 20;
        this.particles.push(p);
    }

    // 4. Smoke Trails (Dark, lasting longer)
    for(let i=0; i<4; i++) {
        const vel = { x: (Math.random()-0.5)*3, y: -2 - Math.random()*2 };
        const p = new ParticleEffect(center, zBase+10, 'rgba(30,30,30,1)', vel, 1.5, ParticleBehavior.FLOAT, 'SMOKE');
        p.size = 15;
        this.particles.push(p);
    }

    // 5. Debris / Sparks
    for(let i=0; i<8; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 4 + Math.random() * 4;
        const vel = { x: Math.cos(angle) * speed, y: Math.sin(angle) * speed * 0.5 - 2 };
        const p = new ParticleEffect(center, zBase, color, vel, 0.6, ParticleBehavior.PHYSICS, 'DEFAULT');
        p.size = 3;
        this.particles.push(p);
    }

    this.shakeScreen(4);
  }

  spawnHitEffect(gridPos: Vector2) {
    const center = this.getScreenPos(gridPos.x, gridPos.y);
    for(let i=0; i<5; i++) {
        const vel = { x: (Math.random() - 0.5) * 3, y: (Math.random() - 0.5) * 3 };
        this.particles.push(new ParticleEffect(center, 15, '#fff', vel, 0.4));
    }
  }

  spawnBuildEffect(gridPos: Vector2, color = '#60a5fa') {
      const center = this.getScreenPos(gridPos.x, gridPos.y);
      for(let i=0; i<10; i++) {
          const vel = { x: 0, y: -2 - Math.random() * 2 };
          this.particles.push(new ParticleEffect(center, 0, color, vel, 1.5));
      }
  }

  spawnLootEffect(gridPos: Vector2, amount: number) {
      const center = this.getScreenPos(gridPos.x, gridPos.y);
      const targetScreenPos = { x: 300, y: 50 }; 
      const count = Math.min(10, Math.ceil(amount / 5));
      
      for(let i=0; i<count; i++) {
          const p = new ParticleEffect(center, 20, '#fbbf24', {x:0, y:0}, 1.5, ParticleBehavior.UI_TARGET);
          p.targetPos = targetScreenPos;
          p.screenPos.x += (Math.random() - 0.5) * 40;
          p.screenPos.y += (Math.random() - 0.5) * 40;
          this.particles.push(p);
      }
  }

  spawnParticle(gridPos: Vector2, z: number, color: string) {
     const center = this.getScreenPos(gridPos.x, gridPos.y);
     const vel = { x: (Math.random() - 0.5), y: (Math.random() - 0.5) - 1 };
     this.particles.push(new ParticleEffect(center, z, color, vel, 0.5));
  }

  spawnAmbientParticles() {
      const x = Math.random() * this.renderer.width;
      const y = Math.random() * this.renderer.height;
      const p = new ParticleEffect({x, y}, 0, 'rgba(100, 255, 218, 0.3)', {x:0, y:0}, 4.0, ParticleBehavior.FLOAT);
      p.size = 1 + Math.random() * 2;
      this.particles.push(p);
  }

  addFloatingText(text: string, gridPos: Vector2, color: string, isCrit: boolean = false) {
      this.entities.push(new FloatingText(text, gridPos, color, isCrit));
  }

  removeEntity(id: string) {
    this.entities = this.entities.filter(e => e.id !== id);
    if (this.input.selectedEntityId === id) {
         this.input.selectedEntityId = null;
         if (this.callbacks.onSelect) this.callbacks.onSelect(null);
    }
  }

  removeParticle(id: string) {
    this.particles = this.particles.filter(p => p.id !== id);
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
