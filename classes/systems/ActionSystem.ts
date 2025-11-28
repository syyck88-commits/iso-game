
import { GameEngine } from '../GameEngine';
import { EntityType, GridPoint, GRID_SIZE } from '../../types';
import { Tower, TowerFactory, Projectile } from '../Entities';
import { BaseEnemy } from '../enemies/BaseEnemy';

export class ActionSystem {
    private engine: GameEngine;

    constructor(engine: GameEngine) {
        this.engine = engine;
    }

    startWave() {
        // INTEREST MECHANIC
        const interest = Math.min(1000, Math.floor(this.engine.gameState.money * 0.10));
        if (interest > 0) {
            this.engine.gameState.money += interest;
            this.engine.audio.playGold();
            const centerGrid = { x: GRID_SIZE/2, y: GRID_SIZE/2 };
            this.engine.vfx.addFloatingText(`INTEREST +$${interest}`, centerGrid, '#22c55e', true);
        }
  
        this.engine.gameState.wave = this.engine.waves.startWave(this.engine.gameState.wave);
        this.engine.audio.playWaveStart(); 
        this.engine.vfx.shakeScreen(4); 
    }

    buildTower(gridPos: GridPoint, type: EntityType) {
        const { gx, gy } = gridPos;
        if (this.engine.map.isBuildable(gx, gy)) {
            const cost = this.getTowerCost(type);
            
            if (this.engine.debugMode || this.engine.gameState.money >= cost) {
              if (!this.engine.debugMode) this.engine.gameState.money -= cost;
              
              this.engine.map.setTile(gx, gy, 2); 
              
              const tower = TowerFactory.create(type, gx, gy);
              this.engine.entities.push(tower);
              
              let buildColor = '#60a5fa';
              if (type === EntityType.TOWER_PULSE) buildColor = '#a855f7';
              if (type === EntityType.TOWER_LASER) buildColor = '#22d3ee';
              
              this.engine.vfx.spawnBuildEffect(tower.gridPos, buildColor);
              
              this.engine.audio.playBuild();
              if (!this.engine.debugMode) {
                   this.engine.vfx.addFloatingText('-$' + cost, {x: gx, y: gy}, '#ef4444');
              } else {
                   this.engine.vfx.addFloatingText('FREE', {x: gx, y: gy}, '#22c55e');
              }
              
              this.engine.input.selectedEntityId = null;
              this.engine.vfx.shakeScreen(2);
            } else {
                 this.engine.audio.playCancel();
            }
        } else {
            this.engine.audio.playCancel();
        }
    }

    upgradeSelectedTower() {
        if (!this.engine.input.selectedEntityId) return;
        const tower = this.engine.entities.find(e => e.id === this.engine.input.selectedEntityId) as Tower;
        if (!tower || !(tower instanceof Tower)) return;
    
        const cost = tower.getUpgradeCost();
        if (this.engine.debugMode || this.engine.gameState.money >= cost) {
          if (!this.engine.debugMode) this.engine.gameState.money -= cost;
          
          tower.upgrade();
          this.engine.vfx.spawnBuildEffect(tower.gridPos, '#fbbf24');
          this.engine.audio.playUpgrade();
          this.engine.vfx.addFloatingText('UPGRADED', tower.gridPos, '#fbbf24');
          this.engine.vfx.shakeScreen(1);
        }
    }
    
    sellSelectedTower() {
        if (!this.engine.input.selectedEntityId) return;
        const tower = this.engine.entities.find(e => e.id === this.engine.input.selectedEntityId) as Tower;
        if (!tower || !(tower instanceof Tower)) return;
        
        const refund = tower.getSellValue();
        this.engine.gameState.money += refund;
        this.engine.map.setTile(tower.gridPos.x, tower.gridPos.y, 0); 
        
        this.engine.vfx.spawnLootEffect(tower.gridPos, refund);
        this.engine.vfx.addFloatingText(`+$${refund}`, tower.gridPos, '#fbbf24');
        this.engine.audio.playGold();
        this.engine.vfx.spawnBuildEffect(tower.gridPos, '#fbbf24');
        
        this.engine.removeEntity(tower.id);
        this.engine.input.selectedEntityId = null;
        if (this.engine.callbacks.onSelect) this.engine.callbacks.onSelect(null);
    }

    spawnProjectile(source: Tower, target: BaseEnemy) {
        const proj = new Projectile(source.gridPos, target, source.damage, source.id);
        if (this.engine.preview.active) {
            this.engine.preview.entities.push(proj);
        } else {
            this.engine.entities.push(proj);
        }
    }

    getTowerCost(type: EntityType): number {
        switch (type) {
            case EntityType.TOWER_BASIC: return 30;
            case EntityType.TOWER_SNIPER: return 50;
            case EntityType.TOWER_PULSE: return 60;
            case EntityType.TOWER_LASER: return 120;
            default: return 999;
        }
    }
}
