/**
 * Convert RGB to HSL
 * @param r Red (0-255)
 * @param g Green (0-255)
 * @param b Blue (0-255)
 * @returns HSL object with h (0-360), s (0-100), l (0-100)
 */
function rgbToHsl(r: number, g: number, b: number): { h: number; s: number; l: number } {
  r /= 255;
  g /= 255;
  b /= 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

    switch (max) {
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
        break;
      case g:
        h = ((b - r) / d + 2) / 6;
        break;
      case b:
        h = ((r - g) / d + 4) / 6;
        break;
    }
  }

  return {
    h: Math.round(h * 360),
    s: Math.round(s * 100),
    l: Math.round(l * 100),
  };
}

/**
 * Categorize a hex color into a generic color name
 * Uses HSL color space for better color differentiation
 *
 * @param hex Hex color code (e.g., #FF5733 or FF5733)
 * @returns Color category: red, orange, yellow, green, blue, purple, pink, black, white, grey
 */
export function categorizeHexColor(hex: string): string {
  // Remove # if present
  const cleanHex = hex.replace('#', '');

  // Convert to RGB
  const r = parseInt(cleanHex.substring(0, 2), 16);
  const g = parseInt(cleanHex.substring(2, 4), 16);
  const b = parseInt(cleanHex.substring(4, 6), 16);

  // Convert to HSL for better color classification
  const { h, s, l } = rgbToHsl(r, g, b);

  // Check for achromatic colors (low saturation)
  if (s < 15) {
    if (l < 20) return 'black';
    if (l > 85) return 'white';
    return 'grey';
  }

  // Classify by hue (0-360 degrees)
  // Adjusted ranges for better distinction

  // Pink (high lightness reds/magentas)
  if ((h >= 320 || h <= 15) && l > 60 && s > 30) {
    return 'pink';
  }

  // Red (0-15 or 345-360)
  if (h >= 345 || h <= 15) {
    return 'red';
  }

  // Orange (16-45)
  if (h >= 16 && h <= 45) {
    return 'orange';
  }

  // Yellow (46-75)
  if (h >= 46 && h <= 75) {
    return 'yellow';
  }

  // Green (76-165)
  if (h >= 76 && h <= 165) {
    return 'green';
  }

  // Blue (166-255)
  if (h >= 166 && h <= 255) {
    return 'blue';
  }

  // Purple/Violet (256-289)
  if (h >= 256 && h <= 289) {
    return 'purple';
  }

  // Pink/Magenta (290-344)
  if (h >= 290 && h <= 344) {
    // Distinguish between pink and purple based on saturation and lightness
    if (l > 55 || s > 60) {
      return 'pink';
    }
    return 'purple';
  }

  // Fallback
  return 'grey';
}
