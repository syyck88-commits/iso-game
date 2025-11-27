
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
    stepDuration: number; // ms
    stepThreshold: number; // Pixels
    
    constructor(startX: number, startY: number, stepHeight = 15, stepThreshold = 30, stepDuration = 150) {
        this.current = { x: startX, y: startY };
        this.target = { x: startX, y: startY };
        this.start = { x: startX, y: startY };
        this.stepHeight = stepHeight;
        this.stepThreshold = stepThreshold;
        this.stepDuration = stepDuration;
    }

    /**
     * Updates the leg logic.
     * @param idealX The ideal resting position X based on body
     * @param idealY The ideal resting position Y based on body
     * @param dt Delta time in ms
     * @param canStep Whether this leg is allowed to trigger a step (for gait control)
     * @returns True if currently stepping
     */
    update(idealX: number, idealY: number, dt: number, canStep: boolean = true): boolean {
        // Distance from current "grounded" pos to ideal pos
        const dx = idealX - this.target.x;
        const dy = idealY - this.target.y;
        const distSq = dx*dx + dy*dy;

        // PANIC SNAP: If leg is dragged too far (e.g. speed boost), snap it instantly
        // This prevents the "sticky leg" stretching artifact
        if (distSq > (this.stepThreshold * this.stepThreshold * 9)) {
            this.target.x = idealX;
            this.target.y = idealY;
            this.current.x = idealX;
            this.current.y = idealY;
            this.isStepping = false;
            this.stepProgress = 1;
            return false;
        }

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
            this.stepProgress += dt / this.stepDuration;
            
            if (this.stepProgress >= 1) {
                this.stepProgress = 1;
                this.isStepping = false;
                this.current.x = this.target.x;
                this.current.y = this.target.y;
            } else {
                // Lerp X/Y
                const t = this.stepProgress;
                // Ease-in-out curve
                const smoothT = t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
                
                this.current.x = this.start.x + (this.target.x - this.start.x) * smoothT;
                this.current.y = this.start.y + (this.target.y - this.start.y) * smoothT;
                
                // Lift Z (Simulated Y offset)
                // Parabola: 4 * x * (1 - x)
                const lift = Math.sin(t * Math.PI) * this.stepHeight;
                this.current.y -= lift;
            }
        } else {
            // Keep grounded at target (prevents drifting if target changed while grounded)
            // Note: usually target doesn't change while grounded, but good for stability
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
