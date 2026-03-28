// Pure math helpers for pose analysis — no browser APIs, fully testable.

export interface Landmark {
  x: number;
  y: number;
  z?: number;
  visibility?: number;
}

const EPSILON = 1e-6;

/**
 * Angle in degrees at vertex B formed by A-B-C.
 * Returns 0 if either vector has zero magnitude.
 */
export function angleDeg(a: Landmark, b: Landmark, c: Landmark): number {
  const bax = a.x - b.x;
  const bay = a.y - b.y;
  const bcx = c.x - b.x;
  const bcy = c.y - b.y;
  const magBA = Math.sqrt(bax * bax + bay * bay);
  const magBC = Math.sqrt(bcx * bcx + bcy * bcy);
  if (magBA < EPSILON || magBC < EPSILON) return 0;
  const cosA = (bax * bcx + bay * bcy) / (magBA * magBC);
  return Math.acos(Math.max(-1, Math.min(1, cosA))) * (180 / Math.PI);
}

/**
 * Frame-to-frame velocity (Euclidean distance in normalized coords).
 */
function vel(a: Landmark, b: Landmark): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * armBalance = velUpper / (velUpper + velLower + ε)
 *
 * Upper: shoulders (11,12), elbows (13,14), wrists (15,16)
 * Lower: hips (23,24), knees (25,26), ankles (27,28)
 *
 * Returns 0.5 when prev is null (first frame) or both velocities ≈ 0.
 */
export function computeArmBalance(
  prev: Landmark[] | null,
  curr: Landmark[],
): number {
  if (!prev) return 0.5;

  const upperIdx = [11, 12, 13, 14, 15, 16];
  const lowerIdx = [23, 24, 25, 26, 27, 28];

  const velUpper =
    upperIdx.reduce((sum, i) => sum + vel(prev[i], curr[i]), 0) / upperIdx.length;
  const velLower =
    lowerIdx.reduce((sum, i) => sum + vel(prev[i], curr[i]), 0) / lowerIdx.length;

  if (velUpper + velLower < EPSILON) return 0.5;

  return velUpper / (velUpper + velLower + EPSILON);
}
