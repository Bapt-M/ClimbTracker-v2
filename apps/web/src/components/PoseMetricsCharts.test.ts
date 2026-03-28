import { describe, it, expect } from 'vitest';
import { xOfTime, formatTime, PLOT_W, LEFT_MARGIN } from './PoseMetricsCharts';

describe('xOfTime', () => {
  it('returns 0 for videoTime=0', () => {
    expect(xOfTime(0, 60)).toBe(0);
  });

  it('returns PLOT_W for videoTime=maxVideoTime', () => {
    expect(xOfTime(60, 60)).toBe(PLOT_W);
  });

  it('returns half PLOT_W for midpoint', () => {
    expect(xOfTime(30, 60)).toBeCloseTo(PLOT_W / 2, 1);
  });

  it('returns 0 when maxVideoTime is 0 (edge case)', () => {
    expect(xOfTime(0, 0)).toBe(0);
  });
});

describe('formatTime', () => {
  it('formats 0 as 0:00', () => {
    expect(formatTime(0)).toBe('0:00');
  });

  it('formats 65 as 1:05', () => {
    expect(formatTime(65)).toBe('1:05');
  });

  it('formats 90 as 1:30', () => {
    expect(formatTime(90)).toBe('1:30');
  });

  it('formats 5 as 0:05', () => {
    expect(formatTime(5)).toBe('0:05');
  });
});
