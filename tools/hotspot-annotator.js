#!/usr/bin/env node
// Composites labeled shape overlays onto a scene image, for visually
// verifying hotspot coordinates against the actual art before wiring them
// into src/data/*.ts. Coordinates are fractions (0-1) of the image's own
// width/height, same convention as the Hotspot type's x/y/w/h.
//
// Usage:
//   node tools/hotspot-annotator.js <scene.jpg> <shapes.json> [output.png]
//
// shapes.json is an array of shape objects. Supported types:
//   { "type": "rect",    "x": 0.05, "y": 0.51, "w": 0.15, "h": 0.07, "label": "hotspot-8", "color": "red" }
//   { "type": "circle",  "cx": 0.5, "cy": 0.5, "r": 0.03, "label": "...", "color": "lime" }
//   { "type": "ellipse", "cx": 0.5, "cy": 0.5, "rx": 0.05, "ry": 0.02, "label": "...", "color": "orange" }
//   { "type": "polygon", "points": [[0.1,0.1],[0.2,0.1],[0.15,0.2]], "label": "...", "color": "cyan" }
//   { "type": "line",    "x1": 0.1, "y1": 0.1, "x2": 0.3, "y2": 0.4, "label": "...", "color": "magenta" }
//   { "type": "quad",    "points": [[x0,y0],[x1,y1],[x2,y2],[x3,y3]], "label": "...", "color": "yellow" }
//     Exactly 4 corners, each positioned independently (unlike "rect",
//     whose 4 corners are all derived from a single x/y/w/h) — for masking
//     objects that aren't axis-aligned, e.g. a lever seen at an angle, or a
//     tilted/perspective-skewed card. Corners are numbered 1-4 in the
//     overlay in the order given, so you can nudge one at a time.
// `color` and `label` are optional on every shape; color cycles through a
// default palette (by shape index) when omitted.

const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const PALETTE = ['red', 'dodgerblue', 'lime', 'orange', 'magenta', 'cyan', 'yellow', 'violet'];

function escapeXml(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function shapeToSvg(shape, index, width, height) {
  const color = shape.color || PALETTE[index % PALETTE.length];
  const strokeWidth = 3;
  let el = '';
  let labelX;
  let labelY;

  switch (shape.type) {
    case 'rect': {
      const x = shape.x * width;
      const y = shape.y * height;
      const w = shape.w * width;
      const h = shape.h * height;
      el = `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${color}" fill-opacity="0.15" stroke="${color}" stroke-width="${strokeWidth}" />`;
      labelX = x;
      labelY = y - 6;
      break;
    }
    case 'circle': {
      const cx = shape.cx * width;
      const cy = shape.cy * height;
      const r = shape.r * width;
      el = `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${color}" fill-opacity="0.15" stroke="${color}" stroke-width="${strokeWidth}" />`;
      labelX = cx - r;
      labelY = cy - r - 6;
      break;
    }
    case 'ellipse': {
      const cx = shape.cx * width;
      const cy = shape.cy * height;
      const rx = shape.rx * width;
      const ry = shape.ry * height;
      el = `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="${color}" fill-opacity="0.15" stroke="${color}" stroke-width="${strokeWidth}" />`;
      labelX = cx - rx;
      labelY = cy - ry - 6;
      break;
    }
    case 'polygon': {
      const pts = shape.points.map(([px, py]) => `${px * width},${py * height}`).join(' ');
      el = `<polygon points="${pts}" fill="${color}" fill-opacity="0.15" stroke="${color}" stroke-width="${strokeWidth}" />`;
      const xs = shape.points.map(([px]) => px * width);
      const ys = shape.points.map(([, py]) => py * height);
      labelX = Math.min(...xs);
      labelY = Math.min(...ys) - 6;
      break;
    }
    case 'quad': {
      if (!Array.isArray(shape.points) || shape.points.length !== 4) {
        throw new Error('quad shape requires exactly 4 points');
      }
      const pts = shape.points.map(([px, py]) => `${px * width},${py * height}`).join(' ');
      const handles = shape.points
        .map(([px, py], i) => {
          const hx = px * width;
          const hy = py * height;
          return `<circle cx="${hx}" cy="${hy}" r="5" fill="${color}" stroke="white" stroke-width="1.5" /><text x="${hx + 8}" y="${hy - 8}" fill="${color}" font-family="sans-serif" font-size="12" font-weight="bold" stroke="black" stroke-width="0.4" paint-order="stroke">${i + 1}</text>`;
        })
        .join('');
      el = `<polygon points="${pts}" fill="${color}" fill-opacity="0.15" stroke="${color}" stroke-width="${strokeWidth}" />${handles}`;
      const xs = shape.points.map(([px]) => px * width);
      const ys = shape.points.map(([, py]) => py * height);
      labelX = Math.min(...xs);
      labelY = Math.min(...ys) - 6;
      break;
    }
    case 'line': {
      const x1 = shape.x1 * width;
      const y1 = shape.y1 * height;
      const x2 = shape.x2 * width;
      const y2 = shape.y2 * height;
      el = `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${color}" stroke-width="${strokeWidth}" />`;
      labelX = Math.min(x1, x2);
      labelY = Math.min(y1, y2) - 6;
      break;
    }
    default:
      throw new Error(`Unknown shape type: ${shape.type}`);
  }

  const label = shape.label
    ? `<text x="${labelX}" y="${Math.max(labelY, 12)}" fill="${color}" font-family="sans-serif" font-size="16" font-weight="bold" stroke="black" stroke-width="0.5" paint-order="stroke">${escapeXml(shape.label)}</text>`
    : '';

  return el + label;
}

async function annotate(imagePath, shapes, outputPath) {
  const image = sharp(imagePath);
  const { width, height } = await image.metadata();
  const body = shapes.map((shape, i) => shapeToSvg(shape, i, width, height)).join('\n');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">${body}</svg>`;
  await image.composite([{ input: Buffer.from(svg), top: 0, left: 0 }]).toFile(outputPath);
  return { width, height, outputPath };
}

async function main() {
  const [imagePath, shapesPath, outputPath] = process.argv.slice(2);
  if (!imagePath || !shapesPath) {
    console.error('Usage: node tools/hotspot-annotator.js <scene.jpg> <shapes.json> [output.png]');
    process.exit(1);
  }
  const shapes = JSON.parse(fs.readFileSync(shapesPath, 'utf8'));
  const out = outputPath || path.join(path.dirname(imagePath), `${path.basename(imagePath, path.extname(imagePath))}.annotated.png`);
  const result = await annotate(imagePath, shapes, out);
  console.log(`Annotated ${shapes.length} shape(s) onto ${result.width}x${result.height} image -> ${result.outputPath}`);
}

if (require.main === module) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}

module.exports = { annotate };
