
export interface Vector2 {
  x: number;
  y: number;
}

export interface GridPoint {
  gx: number;
  gy: number;
}

export enum EntityType {
  TOWER_BASIC = 'TOWER_BASIC',
  TOWER_SNIPER = 'TOWER_SNIPER',
  TOWER_PULSE = 'TOWER_PULSE',
  TOWER_LASER = 'TOWER_LASER', 
  ENEMY_MINION = 'ENEMY_MINION',
  PROJECTILE = 'PROJECTILE',
  PARTICLE = 'PARTICLE',
  FLOATING_TEXT = 'FLOATING_TEXT',
  
  // Environment
  TREE = 'TREE',
  ROCK = 'ROCK',
  BUSH = 'BUSH',
  CRYSTAL = 'CRYSTAL'
}

export enum DamageType {
  KINETIC = 'KINETIC',     // Bullets (Basic)
  PIERCING = 'PIERCING',   // Railgun (Sniper)
  EXPLOSIVE = 'EXPLOSIVE', // Shockwave (Pulse)
  ENERGY = 'ENERGY'        // Beam (Laser)
}

export enum EnemyVariant {
  NORMAL = 'NORMAL',
  FAST = 'FAST',
  TANK = 'TANK',
  SWARM = 'SWARM',
  GHOST = 'GHOST',
  MECH = 'MECH',
  HEALER = 'HEALER',     
  SPLITTER = 'SPLITTER', 
  PHALANX = 'PHALANX', // New Mob
  
  // Boss Tiers
  BOSS_MK1 = 'BOSS_MK1',   
  BOSS_MK2 = 'BOSS_MK2',   
  BOSS_MK3 = 'BOSS_MK3',   
  BOSS_FINAL = 'BOSS_FINAL' 
}

export enum ParticleBehavior {
  PHYSICS = 'PHYSICS', 
  UI_TARGET = 'UI_TARGET', 
  FLOAT = 'FLOAT' 
}

export interface GameObject {
  id: string;
  type: EntityType;
  gridPos: Vector2;
  zHeight: number;
  update: (dt: number, engine: any) => void;
  draw: (ctx: CanvasRenderingContext2D, screenPos: Vector2) => void;
  depth: number;
}

export interface Particle extends GameObject {
  life: number;
  maxLife: number;
  color: string;
  velocity: Vector2;
  size: number;
  behavior: ParticleBehavior;
  targetPos?: Vector2;
}

export interface GameState {
  money: number;
  wave: number;
  health: number;
  gameActive: boolean;
}

export const GRID_SIZE = 30;
export const TILE_WIDTH = 52;
export const TILE_HEIGHT = 26;