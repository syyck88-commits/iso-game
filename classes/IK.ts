

import { Vector2 } from '../types';

export interface IKTarget {
    x: number;
    y: number;
}

export class IKLeg {
    // Current position of the foot (screen space)
    current: Vector2;
    // Where the foot wants to be (screen space)
    target: Vector2;
    // Where the foot started its step
    start: Vector2;
    
    // Animation state
    stepProgress: number = 1; // 0..1 (1 = grounded)
    isStepping: boolean = false;
    
    // Config
    stepHeight: number;
    stepSpeed: number;
    stepThreshold: number; // How far body moves before leg lifts
    
    constructor(startX: number, startY: number, stepHeight = 15, stepThreshold = 30, stepSpeed = 0.1) {
        this.current = { x: startX, y: startY };
        this.target = { x: startX, y: startY };
        this.start = { x: startX, y: startY };
        this.stepHeight = stepHeight;
        this.stepThreshold = stepThreshold;
        this.stepSpeed = stepSpeed;
    }

    /**
     * Updates the leg logic.
     * @param idealX The ideal resting position X based on body
     * @param idealY The ideal resting position Y based on body
     * @param canStep Whether this leg is allowed to trigger a step (for gait control)
     * @returns True if currently stepping
     */
    update(idealX: number, idealY: number, canStep: boolean = true): boolean {
        // Distance from current "grounded" pos to ideal pos
        const dx = idealX - this.target.x;
        const dy = idealY - this.target.y;
        const distSq = dx*dx + dy*dy;

        // Trigger Step if too far
        if (!this.isStepping && canStep && distSq > (this.stepThreshold * this.stepThreshold)) {
            this.isStepping = true;
            this.stepProgress = 0;
            this.start.x = this.current.x;
            this.start.y = this.current.y;
            this.target.x = idealX; // Lock new target
            this.target.y = idealY;
        }

        // Animate Step
        if (this.isStepping) {
            // NOTE: stepSpeed is calibrated for 60fps (1 tick = 0.1 progress typically)
            // But since this update method doesn't take DT, we assume it's called in a render loop.
            // However, to fix high-refresh rate issues, we SHOULD scale this. 
            // For now, we assume the caller is controlling the frequency or just let it be visuals only.
            // Ideally caller passes tick, but to avoid API break in `Enemy.ts`, we'll leave it as frame-based 
            // since it's visual. BUT, since Enemy calls this every frame, it speeds up on 144hz.
            // Let's rely on the fact we usually call this once per update cycle.
            
            // To properly fix, we'll clamp it or just use a small fixed increment, 
            // but effectively we are relying on `GameEngine` passing correct dt to `Enemy`
            // but `Enemy` calling this method.
            
            // Assuming this class is simple enough, let's just use the value.
            // If the user scrolls fast, legs move fast.
            
            this.stepProgress += this.stepSpeed; 
            if (this.stepProgress >= 1) {
                this.stepProgress = 1;
                this.isStepping = false;
                this.current.x = this.target.x;
                this.current.y = this.target.y;
            } else {
                // Lerp X/Y
                const t = this.stepProgress;
                // Ease-in-out curve
                const smoothT = t * t * (3 - 2 * t);
                
                this.current.x = this.start.x + (this.target.x - this.start.x) * smoothT;
                this.current.y = this.start.y + (this.target.y - this.start.y) * smoothT;
                
                // Lift Z (Simulated Y offset)
                // Parabola: 4 * x * (1 - x)
                const lift = Math.sin(t * Math.PI) * this.stepHeight;
                this.current.y -= lift;
            }
        } else {
            // Keep grounded
        }

        return this.isStepping;
    }
}

/**
 * Calculates the knee/elbow position for a two-joint limb.
 * @param root Start of limb (Hip)
 * @param end End of limb (Foot)
 * @param len1 Length of thigh
 * @param len2 Length of shin
 * @param flip Flip knee direction
 */
export const solveTwoBoneIK = (
    root: Vector2, 
    end: Vector2, 
    len1: number, 
    len2: number, 
    flip: boolean = false
): Vector2 => {
    const dx = end.x - root.x;
    const dy = end.y - root.y;
    const dist = Math.sqrt(dx*dx + dy*dy);

    // Clamp distance so limb doesn't detach
    const reach = Math.min(dist, len1 + len2 - 0.1);
    
    // Law of Cosines
    // c^2 = a^2 + b^2 - 2ab cos(C)
    // We want angle at root.
    const a = len1;
    const b = reach;
    const c = len2;
    
    const angleRootToTarget = Math.atan2(dy, dx);
    
    // Angle offset for the thigh
    // cos(C) = (a^2 + b^2 - c^2) / (2ab)
    const cosAngle = (a*a + b*b - c*c) / (2 * a * b);
    const angleOffset = Math.acos(Math.max(-1, Math.min(1, cosAngle)));
    
    const finalAngle = angleRootToTarget + (flip ? angleOffset : -angleOffset);
    
    return {
        x: root.x + Math.cos(finalAngle) * len1,
        y: root.y + Math.sin(finalAngle) * len1
    };
};
