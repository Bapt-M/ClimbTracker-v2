import { describe, it, expect } from 'vitest';
import { render, screen } from '../test/utils';
import { HoldColorIndicator } from './HoldColorIndicator';

describe('HoldColorIndicator', () => {
  it('renders an SVG element', () => {
    render(<HoldColorIndicator holdColorHex="#FF0000" />);
    const svg = document.querySelector('svg');
    expect(svg).toBeInTheDocument();
  });

  it('uses the default size of 80', () => {
    render(<HoldColorIndicator holdColorHex="#FF0000" />);
    const svg = document.querySelector('svg');
    expect(svg).toHaveAttribute('width', '80');
    expect(svg).toHaveAttribute('height', '80');
  });

  it('uses custom size when provided', () => {
    render(<HoldColorIndicator holdColorHex="#FF0000" size={100} />);
    const svg = document.querySelector('svg');
    expect(svg).toHaveAttribute('width', '100');
    expect(svg).toHaveAttribute('height', '100');
  });

  it('applies custom className', () => {
    render(<HoldColorIndicator holdColorHex="#FF0000" className="custom-class" />);
    const svg = document.querySelector('svg');
    expect(svg).toHaveClass('custom-class');
  });

  it('creates gradient definitions based on color', () => {
    render(<HoldColorIndicator holdColorHex="#00FF00" />);
    const gradientVolume = document.getElementById('gradVolume-#00FF00');
    expect(gradientVolume).toBeInTheDocument();
  });

  it('handles hex colors with hash prefix', () => {
    render(<HoldColorIndicator holdColorHex="#0000FF" />);
    const svg = document.querySelector('svg');
    expect(svg).toBeInTheDocument();
  });
});
