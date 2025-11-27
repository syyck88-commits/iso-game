

import { EntityType, Vector2, Particle, ParticleBehavior } from '../types';
import { GameEngine } from './GameEngine';
import { generateId } from './BaseEntity';

export type ParticleStyle = 'DEFAULT' | 'FIRE' | 'SMOKE' | 'SHOCKWAVE' | 'FLASH';

export class ParticleEffect implements Particle {
  id: string;
  type = EntityType.PARTICLE;
  gridPos: Vector2;
  screenPos: Vector2; 
  zHeight: number;
  
  life: number = 1.0;
  maxLife: number = 1.0;
  velocity: Vector2;
  color: string;
  size: number;
  depthOffset: number; 
  behavior: ParticleBehavior;
  style: ParticleStyle; // New rendering style
  targetPos?: Vector2;
  
  // Physics
  rotation: number = 0;
  angularVel: number = 0;
  
  // Random variance for shapes & movement
  randomScale: number;
  driftPhase: number; // Unique offset for sine wave movement to prevent global sync

  constructor(
      pos: Vector2, 
      z: number, 
      color: string, 
      velocity: Vector2, 
      life: number, 
      behavior: ParticleBehavior = ParticleBehavior.PHYSICS,
      style: ParticleStyle = 'DEFAULT'
  ) {
    this.id = generateId();
    this.gridPos = {x:0, y:0}; 
    this.screenPos = { ...pos };
    this.zHeight = z;
    this.color = color;
    this.velocity = velocity;
    this.maxLife = life;
    this.life = life;
    this.size = Math.random() * 3 + 1;
    this.depthOffset = 1000; 
    this.behavior = behavior;
    this.style = style;
    
    // Random spin
    this.rotation = Math.random() * Math.PI * 2;
    this.angularVel = (Math.random() - 0.5) * 0.2;
    
    // Variance
    this.randomScale = 0.8 + Math.random() * 0.4;
    this.driftPhase = Math.random() * Math.PI * 2; // Unique wind phase
  }

  get depth() { return 10000 + (this.style === 'SMOKE' ? 100 : 0); } 
  
  update(dt: number, engine: GameEngine) {
    const tick = dt / 16.0;

    if (this.behavior === ParticleBehavior.UI_TARGET && this.targetPos) {
        // Homing behavior (Loot)
        const speedSq = this.velocity.x * this.velocity.x + this.velocity.y * this.velocity.y;
        
        if (speedSq > 2 && this.life > this.maxLife * 0.8) {
            // Physics phase
            this.velocity.y += 0.5 * tick; // Gravity
            this.screenPos.x += this.velocity.x * tick;
            this.screenPos.y += this.velocity.y * tick;
        } else {
            // Magnet phase
            const dx = this.targetPos.x - this.screenPos.x;
            const dy = this.targetPos.y - this.screenPos.y;
            this.screenPos.x += dx * 0.1 * tick;
            this.screenPos.y += dy * 0.1 * tick;
            
            if (Math.abs(dx) < 20 && Math.abs(dy) < 20) {
                this.life = 0; // Arrived
            }
        }
        return;
    }

    this.life -= dt * 0.001; 
    
    // Custom movement based on style
    if (this.style === 'SMOKE') {
        this.velocity.x *= 0.95; // High lateral drag
        this.velocity.y *= 0.92; // High vertical drag (Slows down the ejection burst)
        this.velocity.y -= 0.005 * tick; // Constant subtle lift/buoyancy
        
        this.size += 0.1 * tick; // Expand slowly
        
        // Independent turbulent drift using unique phase
        const timeSec = Date.now() / 1000;
        const drift = Math.sin(timeSec + this.driftPhase);
        this.screenPos.x += drift * 0.15 * tick;
    } else if (this.style === 'SHOCKWAVE') {
        this.size += 5.0 * tick; // Expand rapidly
    }

    this.screenPos.x += this.velocity.x * tick;
    this.screenPos.y += this.velocity.y * tick;
    this.rotation += this.angularVel * tick;
    
    if (this.behavior === ParticleBehavior.PHYSICS) {
        this.velocity.y += 0.2 * tick; // Gravity
        this.velocity.x *= 0.96; // Air drag
    } else if (this.behavior === ParticleBehavior.FLOAT) {
        // Drifting float behavior (e.g. magic sparkles, rising energy)
        // Use unique drift phase to avoid "attached" look
        const timeSec = Date.now() / 500;
        this.screenPos.x += Math.sin(timeSec + this.driftPhase) * 0.3 * tick; 
    }
    
    if (this.life <= 0) {
      engine.removeParticle(this.id);
    }
  }

  draw(ctx: CanvasRenderingContext2D, _pos: Vector2) {
    ctx.save();
    
    const lifePct = Math.max(0, this.life / this.maxLife);
    ctx.globalAlpha = lifePct;
    
    // Render Styles
    if (this.style === 'FIRE') {
        ctx.globalCompositeOperation = 'lighter';
        ctx.translate(this.screenPos.x, this.screenPos.y - this.zHeight);
        
        const hue = 40 * lifePct;
        const size = this.size * (0.5 + lifePct); 
        
        const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, size);
        grad.addColorStop(0, `hsla(${hue + 10}, 100%, 90%, 1)`);
        grad.addColorStop(0.4, `hsla(${hue}, 100%, 50%, 0.8)`);
        grad.addColorStop(1, `hsla(${hue - 10}, 100%, 20%, 0)`);
        
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(0, 0, size, 0, Math.PI * 2);
        ctx.fill();

    } else if (this.style === 'SMOKE') {
        ctx.globalCompositeOperation = 'source-over';
        ctx.translate(this.screenPos.x, this.screenPos.y - this.zHeight);
        // NO ROTATION for smoke to keep perspective flat (horizontal ovals)
        
        // Flatten Y to look like an isometric circle (Horizontal Oval)
        // Use randomScale to vary the squish slightly
        ctx.scale(1.0 + (this.randomScale-1)*0.2, 0.6 + (this.randomScale-1)*0.2); 
        
        ctx.fillStyle = this.color; 
        ctx.globalAlpha = lifePct * 0.4; // Smoke is transparent
        
        ctx.beginPath();
        ctx.arc(0, 0, this.size, 0, Math.PI * 2);
        ctx.fill();

    } else if (this.style === 'SHOCKWAVE') {
        ctx.globalCompositeOperation = 'lighter';
        ctx.translate(this.screenPos.x, this.screenPos.y - this.zHeight);
        
        ctx.scale(1, 0.5); 
        
        ctx.beginPath();
        ctx.arc(0, 0, this.size, 0, Math.PI * 2);
        ctx.lineWidth = 10 * lifePct;
        ctx.strokeStyle = this.color;
        ctx.stroke();

    } else if (this.style === 'FLASH') {
        ctx.globalCompositeOperation = 'lighter';
        ctx.translate(this.screenPos.x, this.screenPos.y - this.zHeight);
        
        ctx.fillStyle = '#fff';
        ctx.shadowColor = '#fff';
        ctx.shadowBlur = 20;
        
        ctx.beginPath();
        ctx.arc(0, 0, this.size * lifePct, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;

    } else {
        // DEFAULT / DEBRIS
        if (this.behavior !== ParticleBehavior.PHYSICS) {
           ctx.globalCompositeOperation = 'lighter';
        }
        ctx.translate(this.screenPos.x, this.screenPos.y - this.zHeight);
        ctx.rotate(this.rotation);

        ctx.fillStyle = this.color;
        
        if (this.behavior === ParticleBehavior.UI_TARGET) {
             // Gold coin shape
             ctx.beginPath();
             ctx.arc(0, 0, this.size + 2, 0, Math.PI * 2);
             ctx.strokeStyle = '#fff';
             ctx.lineWidth = 1;
             ctx.stroke();
             ctx.fill();
        } else {
            // Debris/Pixel
            ctx.fillRect(-this.size/2, -this.size/2, this.size, this.size);
        }
    }
    
    ctx.restore();
  }
}

export class Debris extends ParticleEffect {
    width: number;
    height: number;

    constructor(pos: Vector2, z: number, color: string, vel: Vector2, w: number, h: number) {
        super(pos, z, color, vel, 2.0, ParticleBehavior.PHYSICS);
        this.width = w;
        this.height = h;
        this.angularVel = (Math.random() - 0.5) * 0.5; // Fast spin
    }

    draw(ctx: CanvasRenderingContext2D, _pos: Vector2) {
        ctx.save();
        // Fade out
        ctx.globalAlpha = Math.max(0, this.life / this.maxLife);
        
        ctx.translate(this.screenPos.x, this.screenPos.y - this.zHeight);
        ctx.rotate(this.rotation);
        
        ctx.fillStyle = this.color;
        // Draw rectangular debris (limb)
        ctx.fillRect(-this.width/2, -this.height/2, this.width, this.height);
        
        // Highlight edge
        ctx.fillStyle = 'rgba(255,255,255,0.2)';
        ctx.fillRect(-this.width/2, -this.height/2, this.width/2, this.height);
        
        ctx.restore();
    }
}

export class Shell extends ParticleEffect {
    constructor(pos: Vector2, z: number, vel: Vector2) {
        super(pos, z, '#fcd34d', vel, 0.8, ParticleBehavior.PHYSICS);
        this.size = 2;
        this.angularVel = (Math.random() > 0.5 ? 1 : -1) * 0.5; // Fast spin
    }

    draw(ctx: CanvasRenderingContext2D, _pos: Vector2) {
        ctx.save();
        // Fade out
        ctx.globalAlpha = Math.max(0, this.life / this.maxLife);
        
        ctx.translate(this.screenPos.x, this.screenPos.y - this.zHeight);
        ctx.rotate(this.rotation);
        
        // Brass casing
        ctx.fillStyle = '#b45309'; // Dark gold border
        ctx.fillRect(-2, -1, 4, 2);
        
        ctx.fillStyle = '#fcd34d'; // Gold center
        ctx.fillRect(-1.5, -0.5, 3, 1);
        
        ctx.restore();
    }
}
