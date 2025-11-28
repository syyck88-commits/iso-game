
import { GameEngine } from '../GameEngine';
import { ParticleEffect, FloatingText } from '../Entities';
import { Vector2, ParticleBehavior } from '../../types';

export class VfxSystem {
    private engine: GameEngine;

    constructor(engine: GameEngine) {
        this.engine = engine;
    }

    spawnExplosion(gridPos: Vector2, color: string) {
        const center = this.engine.getScreenPos(gridPos.x, gridPos.y);
        const zBase = 15; // Slightly above ground
        
        const particlesToAdd: ParticleEffect[] = [];

        // 1. Initial Flash
        const flash = new ParticleEffect(center, zBase, '#fff', {x:0,y:0}, 0.1, ParticleBehavior.FLOAT, 'FLASH');
        flash.size = 60;
        particlesToAdd.push(flash);

        // 2. Shockwave Ring
        const shockwave = new ParticleEffect(center, 5, color, {x:0, y:0}, 0.4, ParticleBehavior.FLOAT, 'SHOCKWAVE');
        shockwave.size = 10;
        particlesToAdd.push(shockwave);

        // 3. Fireball Plume
        for(let i=0; i<6; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = Math.random() * 2;
            const vel = { x: Math.cos(angle) * speed, y: Math.sin(angle) * speed * 0.5 - 2 };
            
            const p = new ParticleEffect(center, zBase, '#fff', vel, 0.4 + Math.random()*0.3, ParticleBehavior.FLOAT, 'FIRE');
            p.size = 20 + Math.random() * 20;
            particlesToAdd.push(p);
        }

        // 4. Smoke Trails
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
        
        if (this.engine.preview.active) {
            this.engine.preview.particles.push(...particlesToAdd);
        } else {
            this.engine.particles.push(...particlesToAdd);
        }
    }

    spawnHitEffect(gridPos: Vector2) {
        const center = this.engine.getScreenPos(gridPos.x, gridPos.y);
        const particlesToAdd: ParticleEffect[] = [];
        for(let i=0; i<5; i++) {
            const vel = { x: (Math.random() - 0.5) * 3, y: (Math.random() - 0.5) * 3 };
            particlesToAdd.push(new ParticleEffect(center, 15, '#fff', vel, 0.4));
        }
        if (this.engine.preview.active) {
            this.engine.preview.particles.push(...particlesToAdd);
        } else {
            this.engine.particles.push(...particlesToAdd);
        }
    }

    spawnBuildEffect(gridPos: Vector2, color = '#60a5fa') {
        const center = this.engine.getScreenPos(gridPos.x, gridPos.y);
        for(let i=0; i<15; i++) {
            const speed = 2 + Math.random() * 4;
            const angle = (Math.PI) + (Math.random() * Math.PI);
            const vel = { 
                x: (Math.random() - 0.5) * 4, 
                y: -4 - Math.random() * 3 
            };
            const p = new ParticleEffect(center, 0, color, vel, 1.0, ParticleBehavior.PHYSICS);
            p.size = 2 + Math.random() * 2;
            this.engine.particles.push(p);
        }
    }

    spawnLootEffect(gridPos: Vector2, amount: number) {
        if (this.engine.preview.active) return;
        const center = this.engine.getScreenPos(gridPos.x, gridPos.y);
        const targetScreenPos = { x: 300, y: 50 }; 
        const count = Math.min(15, Math.ceil(amount / 5));
        
        for(let i=0; i<count; i++) {
            const burstVel = { 
                x: (Math.random() - 0.5) * 8, 
                y: -5 - Math.random() * 5 
            };
            
            const p = new ParticleEffect(center, 20, '#fbbf24', burstVel, 1.5, ParticleBehavior.UI_TARGET);
            p.targetPos = targetScreenPos;
            this.engine.particles.push(p);
        }
    }

    spawnParticle(gridPos: Vector2, z: number, color: string) {
        const center = this.engine.getScreenPos(gridPos.x, gridPos.y);
        const vel = { x: (Math.random() - 0.5), y: (Math.random() - 0.5) - 1 };
        const p = new ParticleEffect(center, z, color, vel, 0.5);
        if (this.engine.preview.active) {
            this.engine.preview.particles.push(p);
        } else {
            this.engine.particles.push(p);
        }
    }

    spawnAmbientParticles() {
        if (this.engine.preview.active) return;
        const x = Math.random() * this.engine.renderer.width;
        const y = Math.random() * this.engine.renderer.height;
        const p = new ParticleEffect({x, y}, 0, 'rgba(100, 255, 218, 0.3)', {x:0, y:0}, 4.0, ParticleBehavior.FLOAT);
        p.size = 1 + Math.random() * 2;
        this.engine.particles.push(p);
    }

    addFloatingText(text: string, gridPos: Vector2, color: string, isCrit: boolean = false) {
        if (this.engine.preview.active) return;
        this.engine.entities.push(new FloatingText(text, gridPos, color, isCrit));
    }

    shakeScreen(intensity: number) {
        this.engine.renderer.shake(intensity);
    }
}
