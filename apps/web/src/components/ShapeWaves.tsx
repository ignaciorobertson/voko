import React, { useEffect, useRef, useState } from 'react';
import './ShapeWaves.css';

export interface ShapeWavesProps {
  text?: string;
  fontFamily?: string;
  fontWeight?: number | string;
  textSize?: number;
  shapes?: 'mixed' | 'squares' | 'circles' | 'triangles';
  cellSize?: number;
  dotSize?: number;
  color?: string;
  hoverColor?: string;
  backgroundColor?: string;
  speed?: number;
  scale?: number;
  contrast?: number;
  brightness?: number;
  flow?: number;
  direction?: number;
  fade?: number;
  interactive?: boolean;
  splashRadius?: number;
  splashStrength?: number;
  glow?: number;
  intro?: boolean;
  introDuration?: number;
  introKey?: number;
  paused?: boolean;
  onError?: (error: Error) => void;
  className?: string;
  style?: React.CSSProperties;
}

const MAX_DPR = 2;
const SIMULATION_STEP = 1 / 60;
const WAVE_SPEED = 0.42;
const WAVE_FRICTION = 0.94;
const WAVE_DECAY = 0.972;
const SETTLED_THRESHOLD = 0.008;

const parseHexRgb = (hex: string, fallback: [number, number, number]): [number, number, number] => {
  if (!hex || typeof hex !== 'string') return fallback;
  const clean = hex.replace('#', '').trim();
  if (clean.length === 3) {
    return [
      parseInt(clean[0] + clean[0], 16),
      parseInt(clean[1] + clean[1], 16),
      parseInt(clean[2] + clean[2], 16),
    ];
  }
  if (clean.length === 6) {
    return [
      parseInt(clean.slice(0, 2), 16),
      parseInt(clean.slice(2, 4), 16),
      parseInt(clean.slice(4, 6), 16),
    ];
  }
  return fallback;
};

export const ShapeWaves: React.FC<ShapeWavesProps> = ({
  text = 'Voko',
  fontFamily = 'Inter, "Geist Sans", system-ui, sans-serif',
  fontWeight = 800,
  textSize = 0.5,
  shapes = 'mixed',
  cellSize = 10,
  dotSize = 0.75,
  color = '#929292',
  hoverColor = '#ffffff',
  backgroundColor = '#120f17',
  speed = 1,
  scale = 1,
  contrast = 1,
  brightness = 0.4,
  flow = 0,
  direction = 0,
  fade = 0.15,
  interactive = true,
  splashRadius = 40,
  splashStrength = 0.4,
  glow = 0.35,
  intro = true,
  introDuration = 1.6,
  introKey = 0,
  paused = false,
  className = '',
  style,
}) => {
  const rootRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [ready, setReady] = useState(true);

  const settingsRef = useRef({
    text,
    fontFamily,
    fontWeight,
    textSize,
    shapes,
    cellSize,
    dotSize,
    color,
    hoverColor,
    backgroundColor,
    speed,
    scale,
    contrast,
    brightness,
    flow,
    direction,
    fade,
    interactive,
    splashRadius,
    splashStrength,
    glow,
    intro,
    introDuration,
    paused,
  });

  settingsRef.current = {
    text,
    fontFamily,
    fontWeight,
    textSize,
    shapes,
    cellSize,
    dotSize,
    color,
    hoverColor,
    backgroundColor,
    speed,
    scale,
    contrast,
    brightness,
    flow,
    direction,
    fade,
    interactive,
    splashRadius,
    splashStrength,
    glow,
    intro,
    introDuration,
    paused,
  };

  const applyMaskRef = useRef<() => void>(() => {});
  const replayRef = useRef<() => void>(() => {});

  useEffect(() => {
    applyMaskRef.current();
  }, [text, fontFamily, fontWeight, textSize]);

  useEffect(() => {
    if (introKey) replayRef.current();
  }, [introKey]);

  useEffect(() => {
    const root = rootRef.current;
    const canvas = canvasRef.current;
    if (!root || !canvas) return undefined;

    let disposed = false;
    let frameId = 0;
    let lastTime = performance.now();
    let time = 0;
    let dpr = 1;
    let bounds: DOMRect | null = null;
    let resizeObserver: ResizeObserver | undefined;

    // Grid states
    let width = 0;
    let height = 0;
    let cols = 1;
    let rows = 1;
    let cellPx = Math.max(8, cellSize);
    let gridOrigin = [0, 0];

    // Ripple simulation PDE buffers
    let heights = new Float32Array(1);
    let previousHeights = new Float32Array(1);
    let charges = new Float32Array(1);
    let chargesActive = false;
    let simulationBacklog = 0;

    // Intro progress
    let introStart = performance.now();
    let introProgress = intro ? 0 : 2.0;

    // Text Cutout Mask Canvas
    const maskCanvas = document.createElement('canvas');
    const maskCtx = maskCanvas.getContext('2d');
    let maskData: Uint8ClampedArray | null = null;
    let maskW = 1;
    let maskH = 1;

    const pointer = { x: 0, y: 0, at: 0, inside: false };
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

    const invalidateBounds = () => {
      bounds = null;
    };

    const splash = (x: number, y: number, strength: number) => {
      const s = settingsRef.current;
      const sigma = Math.max(0.6, (s.splashRadius / cellPx) * 0.5);
      const reach = Math.ceil(sigma * 2.8);
      const centerCol = (x - gridOrigin[0]) / cellPx - 0.5;
      const centerRow = (y - gridOrigin[1]) / cellPx - 0.5;
      const minRow = Math.max(0, Math.floor(centerRow - reach));
      const maxRow = Math.min(rows - 1, Math.ceil(centerRow + reach));
      const minCol = Math.max(0, Math.floor(centerCol - reach));
      const maxCol = Math.min(cols - 1, Math.ceil(centerCol + reach));

      for (let r = minRow; r <= maxRow; r++) {
        const dy = r - centerRow;
        const rowBase = r * cols;
        for (let c = minCol; c <= maxCol; c++) {
          const dx = c - centerCol;
          const bump = strength * Math.exp(-(dx * dx + dy * dy) / (2 * sigma * sigma));
          const idx = rowBase + c;
          if (idx >= 0 && idx < heights.length) {
            heights[idx] = Math.min(1.5, heights[idx] + bump);
          }
        }
      }
      chargesActive = true;
    };

    const handlePointerMove = (e: PointerEvent) => {
      if (!settingsRef.current.interactive) return;
      if (!bounds) bounds = root.getBoundingClientRect();
      const now = performance.now();
      const x = (e.clientX - bounds.left) * dpr;
      const y = (e.clientY - bounds.top) * dpr;
      const inside = x >= 0 && y >= 0 && x <= width && y <= height;

      if (inside) {
        const elapsed = pointer.inside ? Math.max(8, now - pointer.at) : 16;
        const dist = pointer.inside ? Math.hypot(x - pointer.x, y - pointer.y) : 0;
        const speedVal = (dist / elapsed) * 1000;
        splash(x, y, Math.min(1, 0.25 + speedVal * 0.0004) * settingsRef.current.splashStrength);
      }
      pointer.x = x;
      pointer.y = y;
      pointer.at = now;
      pointer.inside = inside;
    };

    const stepRipples = () => {
      const lastCol = cols - 1;
      const lastRow = rows - 1;
      let peak = 0;

      for (let r = 0; r < rows; r++) {
        const up = (r === 0 ? r : r - 1) * cols;
        const down = (r === lastRow ? r : r + 1) * cols;
        const base = r * cols;
        for (let c = 0; c < cols; c++) {
          const idx = base + c;
          const left = base + (c === 0 ? c : c - 1);
          const right = base + (c === lastCol ? c : c + 1);
          const h = heights[idx];
          const laplacian = heights[left] + heights[right] + heights[up + c] + heights[down + c] - 4 * h;
          const vel = (h - previousHeights[idx]) * WAVE_FRICTION;
          const next = (h + vel + WAVE_SPEED * laplacian) * WAVE_DECAY;
          previousHeights[idx] = next;
          const charge = Math.min(1, Math.max(0, next));
          charges[idx] = charge;
          if (charge > peak) peak = charge;
        }
      }

      const tmp = heights;
      heights = previousHeights;
      previousHeights = tmp;

      if (peak < SETTLED_THRESHOLD) {
        heights.fill(0);
        previousHeights.fill(0);
        charges.fill(0);
        chargesActive = false;
      }
      return peak;
    };

    const updateCharges = (dt: number) => {
      if (!chargesActive) return;
      simulationBacklog = Math.min(simulationBacklog + dt, SIMULATION_STEP * 4);
      while (simulationBacklog >= SIMULATION_STEP) {
        simulationBacklog -= SIMULATION_STEP;
        stepRipples();
      }
    };

    const configureGrid = () => {
      dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR);
      const rect = root.getBoundingClientRect();
      const w = Math.max(10, Math.floor((rect.width || window.innerWidth) * dpr));
      const h = Math.max(10, Math.floor((rect.height || 600) * dpr));

      width = w;
      height = h;
      canvas.width = w;
      canvas.height = h;

      const s = settingsRef.current;
      const targetCell = Math.max(7, s.cellSize * dpr);
      const nextCols = Math.max(1, Math.round(w / targetCell));
      cellPx = w / nextCols;
      const nextRows = Math.max(1, Math.floor(h / cellPx));
      gridOrigin = [0, (h - nextRows * cellPx) / 2];

      if (nextCols !== cols || nextRows !== rows || charges.length !== nextCols * nextRows) {
        cols = nextCols;
        rows = nextRows;
        charges = new Float32Array(cols * rows);
        heights = new Float32Array(cols * rows);
        previousHeights = new Float32Array(cols * rows);
        chargesActive = false;
      }
    };

    const drawMask = () => {
      if (!maskCtx) return;
      const s = settingsRef.current;
      const content = s.text.trim();

      if (!content || width <= 0 || height <= 0) {
        maskData = null;
        return;
      }

      // Downsample mask to 512x288 for rapid sampling
      maskW = 512;
      maskH = Math.max(1, Math.round((height / width) * 512));
      maskCanvas.width = maskW;
      maskCanvas.height = maskH;

      maskCtx.fillStyle = '#000000';
      maskCtx.fillRect(0, 0, maskW, maskH);

      // Clean, large bold typography for the text cutout
      let fontPx = Math.max(18, Math.round(maskH * s.textSize * 0.95));
      maskCtx.font = `${s.fontWeight} ${fontPx}px ${s.fontFamily}`;
      const measured = maskCtx.measureText(content).width;
      const maxAllowed = maskW * 0.88;
      if (measured > maxAllowed) {
        fontPx = Math.max(14, Math.floor((fontPx * maxAllowed) / measured));
        maskCtx.font = `${s.fontWeight} ${fontPx}px ${s.fontFamily}`;
      }

      maskCtx.textAlign = 'center';
      maskCtx.textBaseline = 'middle';
      maskCtx.fillStyle = '#FFFFFF';
      maskCtx.fillText(content, maskW / 2, maskH / 2);

      try {
        maskData = maskCtx.getImageData(0, 0, maskW, maskH).data;
      } catch {
        maskData = null;
      }
    };

    applyMaskRef.current = () => {
      drawMask();
    };

    replayRef.current = () => {
      introStart = performance.now();
      introProgress = 0;
    };

    // Main 60 FPS Render Loop
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) return undefined;

    const render = (now: number) => {
      if (disposed) return;

      const s = settingsRef.current;
      const dt = Math.min(0.1, (now - lastTime) / 1000);
      lastTime = now;

      if (!s.paused && s.speed > 0 && !reduceMotion.matches) {
        time += dt * 0.8 * s.speed;
      }
      updateCharges(dt);

      if (introProgress < 2.0) {
        introProgress = Math.min(2.0, ((now - introStart) / 1000 / s.introDuration) * 2.0);
      }

      // Background clear
      ctx.fillStyle = s.backgroundColor;
      ctx.fillRect(0, 0, width, height);

      const baseRgb = parseHexRgb(s.color, [146, 146, 146]);
      const hoverRgb = parseHexRgb(s.hoverColor, [255, 255, 255]);

      const baseR = baseRgb[0];
      const baseG = baseRgb[1];
      const baseB = baseRgb[2];
      const diffR = hoverRgb[0] - baseR;
      const diffG = hoverRgb[1] - baseG;
      const diffB = hoverRgb[2] - baseB;

      const halfW = width * 0.5;
      const halfH = height * 0.5;
      const fadeDist = Math.hypot(halfW, halfH);
      const isMixed = s.shapes === 'mixed';
      const shapeFixed = s.shapes === 'squares' ? 0 : s.shapes === 'circles' ? 1 : 2;

      // Batch collectors for high-performance rendering (3 draw calls per frame)
      const circles: { x: number; y: number; r: number; color: string }[] = [];
      const squares: { x: number; y: number; r: number; color: string }[] = [];
      const triangles: { x: number; y: number; r: number; color: string }[] = [];

      const maskScaleX = maskW / width;
      const maskScaleY = maskH / height;

      for (let r = 0; r < rows; r++) {
        const cy = gridOrigin[1] + (r + 0.5) * cellPx;
        const rowBase = r * cols;

        for (let c = 0; c < cols; c++) {
          const cx = gridOrigin[0] + (c + 0.5) * cellPx;
          const idx = rowBase + c;

          // 1. Text Cutout Stencil Mask ("Voko" in empty space)
          if (maskData) {
            const mx = Math.floor(cx * maskScaleX);
            const my = Math.floor(cy * maskScaleY);
            if (mx >= 0 && mx < maskW && my >= 0 && my < maskH) {
              const pIdx = (my * maskW + mx) * 4;
              if (maskData[pIdx] > 110) {
                // Cutout text: shapes do not render inside letters
                continue;
              }
            }
          }

          // 2. Vignette edge fade
          let alphaMult = 1.0;
          if (s.fade > 0) {
            const dist = Math.hypot(cx - halfW, cy - halfH);
            const norm = dist / fadeDist;
            alphaMult = Math.max(0, 1 - Math.pow(norm, 1.8) * s.fade * 1.5);
          }
          if (alphaMult <= 0.02) continue;

          // 3. Multi-octave continuous wave noise (Harmonic rolling clouds)
          const w1 = Math.sin(cx * 0.0035 * s.scale + time * 0.9) * Math.cos(cy * 0.0035 * s.scale + time * 0.7);
          const w2 = Math.sin((cx + cy) * 0.0025 * s.scale - time * 0.6) * Math.cos((cx - cy) * 0.0025 * s.scale + time * 0.5);
          const w3 = Math.sin(Math.hypot(cx - halfW, cy - halfH) * 0.003 * s.scale - time * 0.5);
          const noise = w1 * 0.5 + w2 * 0.35 + w3 * 0.15;

          const tone = Math.min(1, Math.max(0, (noise * 0.5 + 0.5 - s.brightness) * (2.6 * s.contrast) + 0.5));
          const band = Math.floor(tone * 2.999);

          const charge = charges[idx] || 0;
          const stepped = (band + Math.floor(Math.min(0.999, charge) * 3)) % 3;

          const shapeType = isMixed ? (2 - stepped) : shapeFixed;

          // 4. Shape size (crest vs trough + intro animation)
          const baseRadius = (cellPx * 0.44) * s.dotSize;
          let radius = baseRadius * (0.45 + 0.55 * tone);

          if (charge > 0) {
            radius = Math.min(cellPx * 0.48, radius * (1 + charge * 0.5));
          }

          if (introProgress < 2.0) {
            const radial = Math.hypot((cx - halfW) / halfW, (cy - halfH) / halfH);
            const progressRatio = Math.min(1, Math.max(0, (introProgress - radial * 0.5) / 0.4));
            if (progressRatio <= 0.01) continue;
            const back = progressRatio - 1.0;
            radius *= Math.max(0.01, 1.0 + 2.5 * back * back * back + 1.5 * back * back);
          }

          if (radius <= 0.4) continue;

          // 5. Color interpolation (Resting silver -> Bright crest white / Ripple hover)
          const blend = Math.min(1, Math.max(0, tone * 0.35 + charge * 1.2));
          const cr = Math.round(baseR + diffR * blend);
          const cg = Math.round(baseG + diffG * blend);
          const cb = Math.round(baseB + diffB * blend);
          const alpha = Math.min(1, Math.max(0.15, (0.4 + 0.6 * tone) * alphaMult));

          const colStr = `rgba(${cr}, ${cg}, ${cb}, ${alpha.toFixed(2)})`;

          if (shapeType === 0) {
            squares.push({ x: cx, y: cy, r: radius, color: colStr });
          } else if (shapeType === 1) {
            circles.push({ x: cx, y: cy, r: radius, color: colStr });
          } else {
            triangles.push({ x: cx, y: cy, r: radius, color: colStr });
          }
        }
      }

      // Draw Squares
      for (let i = 0; i < squares.length; i++) {
        const item = squares[i];
        ctx.fillStyle = item.color;
        ctx.fillRect(item.x - item.r, item.y - item.r, item.r * 2, item.r * 2);
      }

      // Draw Circles (Batched)
      for (let i = 0; i < circles.length; i++) {
        const item = circles[i];
        ctx.fillStyle = item.color;
        ctx.beginPath();
        ctx.arc(item.x, item.y, item.r, 0, Math.PI * 2);
        ctx.fill();
      }

      // Draw Triangles
      for (let i = 0; i < triangles.length; i++) {
        const item = triangles[i];
        ctx.fillStyle = item.color;
        ctx.beginPath();
        ctx.moveTo(item.x, item.y - item.r);
        ctx.lineTo(item.x + item.r * 0.866, item.y + item.r * 0.5);
        ctx.lineTo(item.x - item.r * 0.866, item.y + item.r * 0.5);
        ctx.closePath();
        ctx.fill();
      }

      // Mouse Glow Halo
      if (s.glow > 0 && chargesActive && pointer.inside) {
        ctx.save();
        const grad = ctx.createRadialGradient(pointer.x, pointer.y, 0, pointer.x, pointer.y, s.splashRadius * 2.5 * dpr);
        grad.addColorStop(0, `rgba(56, 189, 248, ${(0.14 * s.glow).toFixed(3)})`);
        grad.addColorStop(1, 'rgba(56, 189, 248, 0)');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, width, height);
        ctx.restore();
      }

      frameId = requestAnimationFrame(render);
    };

    const handleResize = () => {
      invalidateBounds();
      configureGrid();
      drawMask();
    };

    resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(root);
    window.addEventListener('pointermove', handlePointerMove, { passive: true });
    window.addEventListener('scroll', invalidateBounds, { capture: true, passive: true });

    handleResize();
    setReady(true);
    frameId = requestAnimationFrame(render);

    return () => {
      disposed = true;
      if (frameId) cancelAnimationFrame(frameId);
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('scroll', invalidateBounds, { capture: true });
      resizeObserver?.disconnect();
    };
  }, []);

  return (
    <div
      ref={rootRef}
      className={`shape-waves ${className}`}
      data-ready={ready}
      style={{ backgroundColor, ...style }}
      aria-hidden="true"
    >
      <canvas ref={canvasRef} className="shape-waves__canvas" />
    </div>
  );
};

export default ShapeWaves;
