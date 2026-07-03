// Mask utility functions for the canvas overlay.
// All mask coordinates are normalized [0..1] relative to the video display area,
// so masks scale with the video display dimensions.
import type {
  Mask,
  RectMask,
  CircleMask,
  EllipseMask,
  PolygonMask,
  CurveMask,
} from './types';

export function newId(prefix: string = 'mk'): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export function createRect(x: number, y: number, w: number, h: number, fill = '#000000'): RectMask {
  return {
    id: newId(),
    type: 'rect',
    name: 'Rectangle',
    x,
    y,
    w: Math.max(0.001, w),
    h: Math.max(0.001, h),
    fill,
    opacity: 1,
    locked: false,
    visible: true,
  };
}

export function createCircle(cx: number, cy: number, r: number, fill = '#000000'): CircleMask {
  return {
    id: newId(),
    type: 'circle',
    name: 'Circle',
    cx,
    cy,
    r: Math.max(0.001, r),
    fill,
    opacity: 1,
    locked: false,
    visible: true,
  };
}

export function createEllipse(cx: number, cy: number, rx: number, ry: number, fill = '#000000'): EllipseMask {
  return {
    id: newId(),
    type: 'ellipse',
    name: 'Ellipse',
    cx,
    cy,
    rx: Math.max(0.001, rx),
    ry: Math.max(0.001, ry),
    fill,
    opacity: 1,
    locked: false,
    visible: true,
  };
}

export function createPolygon(points: { x: number; y: number }[], fill = '#000000'): PolygonMask {
  return {
    id: newId(),
    type: 'polygon',
    name: 'Polygon',
    points,
    fill,
    opacity: 1,
    locked: false,
    visible: true,
  };
}

export function createCurve(points: { x: number; y: number }[], closed = false, fill = '#000000'): CurveMask {
  return {
    id: newId(),
    type: 'curve',
    name: 'Curve',
    points,
    closed,
    fill,
    opacity: 1,
    locked: false,
    visible: true,
  };
}

// Render a single mask to a CanvasRenderingContext2D.
// The ctx is expected to already be scaled so that the unit square (0..1, 0..1)
// maps to the target render area. Width/height of that area are passed for hit testing
// only.
export function drawMask(ctx: CanvasRenderingContext2D, mask: Mask): void {
  if (!mask.visible) return;
  ctx.save();
  ctx.globalAlpha = mask.opacity;
  ctx.fillStyle = mask.fill;

  switch (mask.type) {
    case 'rect': {
      const r = mask as RectMask;
      const radius = r.borderRadius || 0;
      if (radius > 0) {
        roundRectPath(ctx, r.x, r.y, r.w, r.h, radius);
        ctx.fill();
      } else {
        ctx.fillRect(r.x, r.y, r.w, r.h);
      }
      break;
    }
    case 'circle': {
      const c = mask as CircleMask;
      ctx.beginPath();
      ctx.arc(c.cx, c.cy, c.r, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    case 'ellipse': {
      const e = mask as EllipseMask;
      ctx.beginPath();
      ctx.ellipse(e.cx, e.cy, e.rx, e.ry, 0, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    case 'polygon': {
      const p = mask as PolygonMask;
      if (p.points.length < 2) break;
      ctx.beginPath();
      ctx.moveTo(p.points[0].x, p.points[0].y);
      for (let i = 1; i < p.points.length; i++) {
        ctx.lineTo(p.points[i].x, p.points[i].y);
      }
      ctx.closePath();
      ctx.fill();
      break;
    }
    case 'curve': {
      const c = mask as CurveMask;
      if (c.points.length < 2) break;
      ctx.beginPath();
      ctx.moveTo(c.points[0].x, c.points[0].y);
      // Use quadratic curves through midpoints for smooth path
      for (let i = 1; i < c.points.length - 1; i++) {
        const xc = (c.points[i].x + c.points[i + 1].x) / 2;
        const yc = (c.points[i].y + c.points[i + 1].y) / 2;
        ctx.quadraticCurveTo(c.points[i].x, c.points[i].y, xc, yc);
      }
      // Last point
      const last = c.points[c.points.length - 1];
      ctx.lineTo(last.x, last.y);
      if (c.closed) {
        const first = c.points[0];
        ctx.quadraticCurveTo(last.x, last.y, first.x, first.y);
        ctx.closePath();
      }
      ctx.fill();
      break;
    }
  }

  ctx.restore();
}

function roundRectPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
): void {
  const radius = Math.min(r, Math.min(w, h) / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

// Hit testing - check if a normalized point is inside a mask
export function hitTestMask(mask: Mask, nx: number, ny: number): boolean {
  if (!mask.visible) return false;

  switch (mask.type) {
    case 'rect': {
      const r = mask as RectMask;
      return nx >= r.x && nx <= r.x + r.w && ny >= r.y && ny <= r.y + r.h;
    }
    case 'circle': {
      const c = mask as CircleMask;
      const dx = nx - c.cx;
      const dy = ny - c.cy;
      return dx * dx + dy * dy <= c.r * c.r;
    }
    case 'ellipse': {
      const e = mask as EllipseMask;
      const dx = nx - e.cx;
      const dy = ny - e.cy;
      return (dx * dx) / (e.rx * e.rx) + (dy * dy) / (e.ry * e.ry) <= 1;
    }
    case 'polygon': {
      return pointInPolygon(nx, ny, (mask as PolygonMask).points);
    }
    case 'curve': {
      // For hit-testing curves, use polygon approximation
      return pointInPolygon(nx, ny, (mask as CurveMask).points);
    }
  }
}

function pointInPolygon(x: number, y: number, points: { x: number; y: number }[]): boolean {
  let inside = false;
  for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
    const xi = points[i].x;
    const yi = points[i].y;
    const xj = points[j].x;
    const yj = points[j].y;
    const intersect =
      yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi + 1e-12) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

// Move a mask by a delta in normalized coords
export function translateMask(mask: Mask, dx: number, dy: number): Mask {
  switch (mask.type) {
    case 'rect':
      return { ...mask, x: mask.x + dx, y: mask.y + dy } as RectMask;
    case 'circle':
      return { ...mask, cx: mask.cx + dx, cy: mask.cy + dy } as CircleMask;
    case 'ellipse':
      return { ...mask, cx: mask.cx + dx, cy: mask.cy + dy } as EllipseMask;
    case 'polygon':
      return {
        ...mask,
        points: mask.points.map((p) => ({ x: p.x + dx, y: p.y + dy })),
      } as PolygonMask;
    case 'curve':
      return {
        ...mask,
        points: mask.points.map((p) => ({ x: p.x + dx, y: p.y + dy })),
      } as CurveMask;
  }
}

// Get the axis-aligned bounding box of a mask in normalized coords.
export function getMaskBBox(mask: Mask): {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
} {
  switch (mask.type) {
    case 'rect': {
      const r = mask as RectMask;
      return { minX: r.x, minY: r.y, maxX: r.x + r.w, maxY: r.y + r.h };
    }
    case 'circle': {
      const c = mask as CircleMask;
      return {
        minX: c.cx - c.r,
        minY: c.cy - c.r,
        maxX: c.cx + c.r,
        maxY: c.cy + c.r,
      };
    }
    case 'ellipse': {
      const e = mask as EllipseMask;
      return {
        minX: e.cx - e.rx,
        minY: e.cy - e.ry,
        maxX: e.cx + e.rx,
        maxY: e.cy + e.ry,
      };
    }
    case 'polygon':
    case 'curve': {
      const pts = (mask as PolygonMask | CurveMask).points;
      if (pts.length === 0) return { minX: 0, minY: 0, maxX: 0, maxY: 0 };
      let minX = pts[0].x;
      let minY = pts[0].y;
      let maxX = pts[0].x;
      let maxY = pts[0].y;
      for (const p of pts) {
        if (p.x < minX) minX = p.x;
        if (p.y < minY) minY = p.y;
        if (p.x > maxX) maxX = p.x;
        if (p.y > maxY) maxY = p.y;
      }
      return { minX, minY, maxX, maxY };
    }
  }
}