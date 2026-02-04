export const DEFAULT_GYM_SVG = `
<svg width="800" height="600" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600">
  <defs>
    <style>
      .sector-path {
        stroke: #374151;
        stroke-width: 3;
        cursor: pointer;
        transition: all 0.2s ease;
      }
      .sector-path:hover {
        fill-opacity: 0.8;
        stroke: #1f2937;
        stroke-width: 4;
      }
      .sector-label {
        font-family: Arial, sans-serif;
        font-size: 48px;
        font-weight: bold;
        fill: #1f2937;
        text-anchor: middle;
        dominant-baseline: middle;
        pointer-events: none;
      }
    </style>
  </defs>

  <!-- Sector A - Top Left -->
  <rect
    id="sector-A"
    class="sector-path"
    data-sector="A"
    x="10"
    y="10"
    width="380"
    height="280"
    rx="10"
    fill="#93c5fd"
    fill-opacity="0.6"
  />
  <text class="sector-label" x="200" y="150">A</text>

  <!-- Sector B - Top Right -->
  <rect
    id="sector-B"
    class="sector-path"
    data-sector="B"
    x="410"
    y="10"
    width="380"
    height="280"
    rx="10"
    fill="#86efac"
    fill-opacity="0.6"
  />
  <text class="sector-label" x="600" y="150">B</text>

  <!-- Sector C - Bottom Left -->
  <rect
    id="sector-C"
    class="sector-path"
    data-sector="C"
    x="10"
    y="310"
    width="380"
    height="280"
    rx="10"
    fill="#fcd34d"
    fill-opacity="0.6"
  />
  <text class="sector-label" x="200" y="450">C</text>

  <!-- Sector D - Bottom Right -->
  <rect
    id="sector-D"
    class="sector-path"
    data-sector="D"
    x="410"
    y="310"
    width="380"
    height="280"
    rx="10"
    fill="#f9a8d4"
    fill-opacity="0.6"
  />
  <text class="sector-label" x="600" y="450">D</text>
</svg>
`.trim();

export const DEFAULT_SECTOR_MAPPINGS = {
  A: {
    label: 'Secteur A',
    pathId: 'sector-A',
    coordinates: { x: 200, y: 150 },
  },
  B: {
    label: 'Secteur B',
    pathId: 'sector-B',
    coordinates: { x: 600, y: 150 },
  },
  C: {
    label: 'Secteur C',
    pathId: 'sector-C',
    coordinates: { x: 200, y: 450 },
  },
  D: {
    label: 'Secteur D',
    pathId: 'sector-D',
    coordinates: { x: 600, y: 450 },
  },
};
