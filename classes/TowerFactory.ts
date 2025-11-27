
import { EntityType, Vector2 } from '../types';
import { BaseTower } from './towers/BaseTower';
import { BasicTower } from './towers/BasicTower';
import { SniperTower } from './towers/SniperTower';
import { PulseTower } from './towers/PulseTower';
import { LaserTower } from './towers/LaserTower';

export class TowerFactory {
    static create(type: EntityType, x: number, y: number): BaseTower {
        switch (type) {
            case EntityType.TOWER_BASIC: return new BasicTower(x, y);
            case EntityType.TOWER_SNIPER: return new SniperTower(x, y);
            case EntityType.TOWER_PULSE: return new PulseTower(x, y);
            case EntityType.TOWER_LASER: return new LaserTower(x, y);
            default: return new BasicTower(x, y);
        }
    }

    // Static drawer for UI previews / ghost buildings
    static drawPreview(ctx: CanvasRenderingContext2D, pos: Vector2, type: EntityType, rotation?: number) {
        // Create a dummy instance to render
        // This is cheap enough for UI 
        let tower: BaseTower;
        switch (type) {
            case EntityType.TOWER_BASIC: tower = new BasicTower(0,0); break;
            case EntityType.TOWER_SNIPER: tower = new SniperTower(0,0); break;
            case EntityType.TOWER_PULSE: tower = new PulseTower(0,0); break;
            case EntityType.TOWER_LASER: tower = new LaserTower(0,0); break;
            default: tower = new BasicTower(0,0); break;
        }
        
        tower.constructionScale = 1.0;
        
        // Preset rotations for preview
        if (rotation !== undefined) {
             tower.rotation = rotation;
        } else if (type === EntityType.TOWER_BASIC || type === EntityType.TOWER_SNIPER || type === EntityType.TOWER_LASER) {
             // Default isometric-friendly angle if not specified
             tower.rotation = -Math.PI / 4;
        }
        
        tower.drawModel(ctx, pos);
    }
}
