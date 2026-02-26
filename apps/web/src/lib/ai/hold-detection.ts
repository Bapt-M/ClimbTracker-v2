export interface DetectedHold {
  id: string;
  x: number;
  y: number;
  radius: number;
  confidence: number;
}

/**
 * Convert hex color to HSV
 * Returns [h (0-360), s (0-1), v (0-1)]
 */
export function hexToHsv(hex: string): [number, number, number] {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const delta = max - min;

  let h = 0;
  if (delta !== 0) {
    if (max === r) h = ((g - b) / delta) % 6;
    else if (max === g) h = (b - r) / delta + 2;
    else h = (r - g) / delta + 4;
    h = Math.round(h * 60);
    if (h < 0) h += 360;
  }

  const s = max === 0 ? 0 : delta / max;
  const v = max;

  return [h, s, v];
}

/**
 * Check if two HSV colors are within tolerance
 */
function hsvMatches(
  pixelH: number, pixelS: number, pixelV: number,
  targetH: number, targetS: number, targetV: number,
  hTol = 20, sTol = 0.30, vTol = 0.30
): boolean {
  // Hue is circular (0-360)
  const hDiff = Math.min(Math.abs(pixelH - targetH), 360 - Math.abs(pixelH - targetH));
  if (hDiff > hTol) return false;
  if (Math.abs(pixelS - targetS) > sTol) return false;
  if (Math.abs(pixelV - targetV) > vTol) return false;
  return true;
}

interface Point { x: number; y: number; }

/**
 * Simple grid-based clustering of matching pixels
 * Groups nearby pixels into clusters using a grid cell approach
 */
function clusterPixels(matchingPixels: Point[], gridSize: number): Point[][] {
  const cellMap = new Map<string, Point[]>();

  for (const p of matchingPixels) {
    const cx = Math.floor(p.x / gridSize);
    const cy = Math.floor(p.y / gridSize);
    const key = `${cx},${cy}`;
    if (!cellMap.has(key)) cellMap.set(key, []);
    cellMap.get(key)!.push(p);
  }

  // Merge adjacent cells into clusters using flood-fill on the cell grid
  const visited = new Set<string>();
  const clusters: Point[][] = [];

  for (const [key] of cellMap) {
    if (visited.has(key)) continue;
    const [cx, cy] = key.split(',').map(Number);
    const cluster: Point[] = [];
    const queue = [[cx, cy]];
    visited.add(key);

    while (queue.length > 0) {
      const [qx, qy] = queue.shift()!;
      const cellKey = `${qx},${qy}`;
      const cellPixels = cellMap.get(cellKey);
      if (cellPixels) cluster.push(...cellPixels);

      for (const [dx, dy] of [[-1,0],[1,0],[0,-1],[0,1],[-1,-1],[1,-1],[-1,1],[1,1]]) {
        const nk = `${qx+dx},${qy+dy}`;
        if (!visited.has(nk) && cellMap.has(nk)) {
          visited.add(nk);
          queue.push([qx+dx, qy+dy]);
        }
      }
    }

    if (cluster.length > 0) clusters.push(cluster);
  }

  return clusters;
}

/**
 * Detect holds on an image using HSV color thresholding
 * @param canvas - Canvas element with the image drawn
 * @param targetHex - Target color hex string (e.g. "#FF0000")
 * @param tolerance - HSV tolerance (default: moderate)
 * @returns Array of detected holds with normalized coordinates
 */
export function detectHolds(
  canvas: HTMLCanvasElement,
  targetHex: string,
  tolerance: number = 1.0
): DetectedHold[] {
  const ctx = canvas.getContext('2d');
  if (!ctx) return [];

  const { width, height } = canvas;
  const imageData = ctx.getImageData(0, 0, width, height);
  const { data } = imageData;

  const [targetH, targetS, targetV] = hexToHsv(targetHex);

  // Scan pixels and collect matching ones
  const matchingPixels: Point[] = [];
  const step = 2; // Sample every 2nd pixel for performance

  for (let y = 0; y < height; y += step) {
    for (let x = 0; x < width; x += step) {
      const idx = (y * width + x) * 4;
      const r = data[idx] / 255;
      const g = data[idx + 1] / 255;
      const b = data[idx + 2] / 255;
      const a = data[idx + 3];

      if (a < 128) continue; // Skip transparent pixels

      const max = Math.max(r, g, b);
      const min = Math.min(r, g, b);
      const delta = max - min;

      // Skip very dark or very light pixels (background)
      if (max < 0.1 || (max > 0.95 && min > 0.85)) continue;

      let h = 0;
      if (delta > 0.01) {
        if (max === r) h = ((g - b) / delta) % 6;
        else if (max === g) h = (b - r) / delta + 2;
        else h = (r - g) / delta + 4;
        h = h * 60;
        if (h < 0) h += 360;
      }
      const s = max === 0 ? 0 : delta / max;
      const v = max;

      const hTol = 20 * tolerance;
      const sTol = 0.25 * tolerance;
      const vTol = 0.30 * tolerance;

      if (hsvMatches(h, s, v, targetH, targetS, targetV, hTol, sTol, vTol)) {
        matchingPixels.push({ x, y });
      }
    }
  }

  if (matchingPixels.length < 10) return [];

  // Cluster pixels into groups (grid cell size = ~3% of image width)
  const gridSize = Math.max(10, Math.floor(width * 0.03));
  const clusters = clusterPixels(matchingPixels, gridSize);

  // Filter small clusters (noise) and convert to holds
  const minClusterSize = Math.max(5, (width * height) / (step * step * 500));
  const holds: DetectedHold[] = [];

  for (const cluster of clusters) {
    if (cluster.length < minClusterSize) continue;

    // Compute bounding box and center
    let minX = Infinity, maxX = -Infinity;
    let minY = Infinity, maxY = -Infinity;
    let sumX = 0, sumY = 0;

    for (const p of cluster) {
      minX = Math.min(minX, p.x);
      maxX = Math.max(maxX, p.x);
      minY = Math.min(minY, p.y);
      maxY = Math.max(maxY, p.y);
      sumX += p.x;
      sumY += p.y;
    }

    const cx = sumX / cluster.length;
    const cy = sumY / cluster.length;
    const bboxW = maxX - minX;
    const bboxH = maxY - minY;
    const radius = Math.max(bboxW, bboxH) / 2;

    // Confidence based on cluster density
    const area = Math.PI * radius * radius;
    const density = Math.min(1, (cluster.length * step * step) / area);
    const confidence = Math.min(1, density * (cluster.length / minClusterSize) * 0.5);

    holds.push({
      id: crypto.randomUUID(),
      x: cx / width,
      y: cy / height,
      radius: (radius + gridSize) / Math.max(width, height),
      confidence: Math.min(1, confidence),
    });
  }

  // Sort by confidence descending
  return holds.sort((a, b) => b.confidence - a.confidence);
}
