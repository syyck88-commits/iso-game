
import { EnemyVariant, Vector2 } from '../types';
import { BaseEnemy } from './enemies/BaseEnemy';
import { NormalEnemy, FastEnemy, TankEnemy, SwarmEnemy } from './enemies/MinionEnemies';
import { HealerEnemy, SplitterEnemy, MechEnemy, GhostEnemy } from './enemies/SpecialEnemies';
import { BossMk1 } from './enemies/bosses/BossMk1';
import { BossMk2 } from './enemies/bosses/BossMk2';
import { BossMk3 } from './enemies/bosses/BossMk3';
import { BossFinal } from './enemies/bosses/BossFinal';

export class EnemyFactory {
    static create(variant: EnemyVariant, path: Vector2[], wave: number): BaseEnemy {
        switch(variant) {
            case EnemyVariant.FAST: return new FastEnemy(path, wave);
            case EnemyVariant.TANK: return new TankEnemy(path, wave);
            case EnemyVariant.SWARM: return new SwarmEnemy(path, wave);
            case EnemyVariant.HEALER: return new HealerEnemy(path, wave);
            case EnemyVariant.SPLITTER: return new SplitterEnemy(path, wave);
            case EnemyVariant.MECH: return new MechEnemy(path, wave);
            case EnemyVariant.GHOST: return new GhostEnemy(path, wave);
            
            case EnemyVariant.BOSS_MK1: return new BossMk1(path, wave);
            case EnemyVariant.BOSS_MK2: return new BossMk2(path, wave);
            case EnemyVariant.BOSS_MK3: return new BossMk3(path, wave);
            case EnemyVariant.BOSS_FINAL: return new BossFinal(path, wave);
            
            case EnemyVariant.NORMAL:
            default: return new NormalEnemy(path, wave);
        }
    }
}
