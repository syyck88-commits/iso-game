import { TILE_WIDTH, TILE_HEIGHT, Vector2, GridPoint } from '../types';

/**
 * Converts Grid coordinates (logical) to Screen coordinates (pixels).
 * Center is the offset on screen where grid (0,0) should be drawn.
 */
export const toScreen = (gx: number, gy: number, offsetX: number, offsetY: number): Vector2 => {
  const x = (gx - gy) * (TILE_WIDTH / 2) + offsetX;
  const y = (gx + gy) * (TILE_HEIGHT / 2) + offsetY;
  return { x, y };
};

/**
 * Converts Screen coordinates (pixels) to Grid coordinates (logical).
 * Returns integer grid coordinates.
 */
export const toGrid = (sx: number, sy: number, offsetX: number, offsetY: number): GridPoint => {
  const adjX = sx - offsetX;
  const adjY = sy - offsetY;

  // Algebraic inversion of the toScreen formulas
  // x = (gx - gy) * W/2
  // y = (gx + gy) * H/2
  // => gx = (y / (H/2) + x / (W/2)) / 2
  // => gy = (y / (H/2) - x / (W/2)) / 2
  
  const roughX = (adjY / (TILE_HEIGHT / 2) + adjX / (TILE_WIDTH / 2)) / 2;
  const roughY = (adjY / (TILE_HEIGHT / 2) - adjX / (TILE_WIDTH / 2)) / 2;

  return {
    gx: Math.floor(roughX),
    gy: Math.floor(roughY)
  };
};

/**
 * Helper to get the center screen position of a tile for rendering objects.
 */
export const getTileCenter = (gx: number, gy: number, offsetX: number, offsetY: number): Vector2 => {
    return toScreen(gx + 0.5, gy + 0.5, offsetX, offsetY);
};
