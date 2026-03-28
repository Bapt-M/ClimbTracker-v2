import { describe, it, expect } from 'vitest';
import { buildPrompt, parseAndValidate } from './video-analysis.service';

describe('buildPrompt', () => {
  it('contains the route name', () => {
    const result = buildPrompt('Voie Test');
    expect(result).toContain('Voie Test');
  });

  it('asks for JSON output', () => {
    const result = buildPrompt('X');
    expect(result).toContain('JSON');
  });
});

describe('parseAndValidate', () => {
  const validJson = JSON.stringify({
    scores: { fluidite: 80, technique: 70, precision: 60, endurance: 50, creativite: 40 },
    suggestions: ['conseil 1'],
    highlights: ['point fort 1'],
  });

  it('parses valid JSON and returns scores', () => {
    const result = parseAndValidate(validJson);
    expect(result.scores.fluidite).toBe(80);
    expect(result.scores.technique).toBe(70);
  });

  it('clamps scores above 100 to 100', () => {
    const json = JSON.stringify({
      scores: { fluidite: 150, technique: 70, precision: 60, endurance: 50, creativite: 40 },
      suggestions: [], highlights: [],
    });
    expect(parseAndValidate(json).scores.fluidite).toBe(100);
  });

  it('clamps scores below 0 to 0', () => {
    const json = JSON.stringify({
      scores: { fluidite: -10, technique: 70, precision: 60, endurance: 50, creativite: 40 },
      suggestions: [], highlights: [],
    });
    expect(parseAndValidate(json).scores.fluidite).toBe(0);
  });

  it('defaults missing suggestions to empty array', () => {
    const json = JSON.stringify({
      scores: { fluidite: 50, technique: 50, precision: 50, endurance: 50, creativite: 50 },
      highlights: [],
    });
    expect(parseAndValidate(json).suggestions).toEqual([]);
  });

  it('defaults missing highlights to empty array', () => {
    const json = JSON.stringify({
      scores: { fluidite: 50, technique: 50, precision: 50, endurance: 50, creativite: 50 },
      suggestions: [],
    });
    expect(parseAndValidate(json).highlights).toEqual([]);
  });

  it('extracts JSON from text with surrounding content', () => {
    const text = 'Voici mon analyse:\n' + validJson + '\nMerci.';
    const result = parseAndValidate(text);
    expect(result.scores.fluidite).toBe(80);
  });

  it('throws if no JSON object found', () => {
    expect(() => parseAndValidate('no json here')).toThrow();
  });
});
