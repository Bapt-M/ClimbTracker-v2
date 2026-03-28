import { describe, it, expect } from 'vitest';
import { angleDeg, computeArmBalance } from './pose-math';

// Helper: make a minimal NormalizedLandmark-like object
const pt = (x: number, y: number) => ({ x, y, z: 0, visibility: 1 });

describe('angleDeg', () => {
  it('returns 90 for a right angle', () => {
    // A=(0,1) B=(0,0) C=(1,0) → angle at B = 90°
    const result = angleDeg(pt(0, 1), pt(0, 0), pt(1, 0));
    expect(result).toBeCloseTo(90, 1);
  });

  it('returns 180 for collinear points', () => {
    // A=(-1,0) B=(0,0) C=(1,0) → 180°
    const result = angleDeg(pt(-1, 0), pt(0, 0), pt(1, 0));
    expect(result).toBeCloseTo(180, 1);
  });

  it('returns 0 for same direction', () => {
    // A=(1,0) B=(0,0) C=(1,0) → 0°
    const result = angleDeg(pt(1, 0), pt(0, 0), pt(1, 0));
    expect(result).toBeCloseTo(0, 1);
  });

  it('returns 0 when vectors have zero magnitude', () => {
    // degenerate: A=B
    const result = angleDeg(pt(0, 0), pt(0, 0), pt(1, 0));
    expect(result).toBe(0);
  });
});

describe('computeArmBalance', () => {
  it('returns 0.5 when both velocities are zero (first frame)', () => {
    const result = computeArmBalance(null, [
      pt(0.5, 0.5), pt(0.5, 0.5), // indices 0,1 (unused)
      pt(0.5, 0.5), pt(0.5, 0.5), // indices 2,3 (unused)
      pt(0.5, 0.5), pt(0.5, 0.5), // indices 4,5 (unused)
      pt(0.5, 0.5), pt(0.5, 0.5), // indices 6,7 (unused)
      pt(0.5, 0.5), pt(0.5, 0.5), // indices 8,9 (unused)
      pt(0.5, 0.5), pt(0.5, 0.5), // shoulders 11,12 (indices 10,11)
      ...Array(18).fill(null).map(() => pt(0.5, 0.5)), // fill to index 28
    ]);
    expect(result).toBe(0.5);
  });

  it('returns close to 1 when only upper body moves', () => {
    const prev = Array(29).fill(null).map(() => pt(0.5, 0.5));
    const curr = prev.map(p => ({ ...p }));
    // Move shoulders (11,12), elbows (13,14), wrists (15,16) significantly
    curr[11] = pt(0.6, 0.5);
    curr[12] = pt(0.6, 0.5);
    curr[13] = pt(0.6, 0.5);
    curr[14] = pt(0.6, 0.5);
    curr[15] = pt(0.6, 0.5);
    curr[16] = pt(0.6, 0.5);
    const result = computeArmBalance(prev, curr);
    expect(result).toBeGreaterThan(0.9);
  });

  it('returns close to 0 when only lower body moves', () => {
    const prev = Array(29).fill(null).map(() => pt(0.5, 0.5));
    const curr = prev.map(p => ({ ...p }));
    // Move hips (23,24), knees (25,26), ankles (27,28)
    curr[23] = pt(0.6, 0.5);
    curr[24] = pt(0.6, 0.5);
    curr[25] = pt(0.6, 0.5);
    curr[26] = pt(0.6, 0.5);
    curr[27] = pt(0.6, 0.5);
    curr[28] = pt(0.6, 0.5);
    const result = computeArmBalance(prev, curr);
    expect(result).toBeLessThan(0.1);
  });
});
