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

const MAX_DPR = 1.5; // Optimized for crisp rendering with lightweight GPU/CPU footprint

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
  cellSize = 12,
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
  interactive = false,
  splashRadius = 0,
  splashStrength = 0,
  glow = 0,
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
    let resizeObserver: ResizeObserver | undefined;

    // Grid states
    let width = 0;
    let height = 0;
    let cols = 1;
    let rows = 1;
    let cellPx = Math.max(8, cellSize);
    let gridOrigin = [0, 0];

    // Precomputed optimization caches (zero allocation in render loop)
    let maskCutout: Uint8Array = new Uint8Array(0);
    let cellFade: Float32Array = new Float32Array(0);

    // Intro progress
    let introStart = performance.now();
    let introProgress = intro ? 0 : 2.0;

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

    // Precomputed color palette (32 discrete tone steps -> 0 string allocations per frame)
    const PALETTE_STEPS = 32;
    const colorPalette: string[] = new Array(PALETTE_STEPS);
    const rebuildPalette = () => {
      const s = settingsRef.current;
      const baseRgb = parseHexRgb(s.color, [146, 146, 146]);
      const hoverRgb = parseHexRgb(s.hoverColor, [255, 255, 255]);
      const baseR = baseRgb[0];
      const baseG = baseRgb[1];
      const baseB = baseRgb[2];
      const diffR = hoverRgb[0] - baseR;
      const diffG = hoverRgb[1] - baseG;
      const diffB = hoverRgb[2] - baseB;

      for (let i = 0; i < PALETTE_STEPS; i++) {
        const toneNorm = i / (PALETTE_STEPS - 1);
        const blend = toneNorm * 0.35;
        const cr = Math.round(baseR + diffR * blend);
        const cg = Math.round(baseG + diffG * blend);
        const cb = Math.round(baseB + diffB * blend);
        const alpha = Math.min(1, Math.max(0.18, 0.45 + 0.55 * toneNorm));
        colorPalette[i] = `rgba(${cr}, ${cg}, ${cb}, ${alpha.toFixed(2)})`;
      }
    };
    rebuildPalette();

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
      const targetCell = Math.max(8, s.cellSize * dpr);
      const nextCols = Math.max(1, Math.round(w / targetCell));
      cellPx = w / nextCols;
      const nextRows = Math.max(1, Math.floor(h / cellPx));
      gridOrigin = [0, (h - nextRows * cellPx) / 2];

      cols = nextCols;
      rows = nextRows;
      const totalCells = cols * rows;

      // Precompute edge vignette fade multiplier once per resize (saves millions of hypot/pow calls)
      cellFade = new Float32Array(totalCells);
      const halfW = width * 0.5;
      const halfH = height * 0.5;
      const fadeDist = Math.hypot(halfW, halfH);

      for (let r = 0; r < rows; r++) {
        const cy = gridOrigin[1] + (r + 0.5) * cellPx;
        const rowBase = r * cols;
        for (let c = 0; c < cols; c++) {
          const cx = gridOrigin[0] + (c + 0.5) * cellPx;
          let alphaMult = 1.0;
          if (s.fade > 0) {
            const dist = Math.hypot(cx - halfW, cy - halfH);
            const norm = dist / fadeDist;
            alphaMult = Math.max(0, 1 - Math.pow(norm, 1.8) * s.fade * 1.5);
          }
          cellFade[rowBase + c] = alphaMult;
        }
      }

      drawMask();
    };

    const drawMask = () => {
      const s = settingsRef.current;
      const content = s.text.trim();
      const totalCells = cols * rows;
      maskCutout = new Uint8Array(totalCells);

      if (!content || width <= 0 || height <= 0) {
        return;
      }

      // Render text mask offscreen and map directly into maskCutout lookup table
      const maskCanvas = document.createElement('canvas');
      const maskW = 512;
      const maskH = Math.max(1, Math.round((height / width) * 512));
      maskCanvas.width = maskW;
      maskCanvas.height = maskH;
      const maskCtx = maskCanvas.getContext('2d');
      if (!maskCtx) return;

      maskCtx.fillStyle = '#000000';
      maskCtx.fillRect(0, 0, maskW, maskH);

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
        const rawMask = maskCtx.getImageData(0, 0, maskW, maskH).data;
        const scaleX = maskW / width;
        const scaleY = maskH / height;

        for (let r = 0; r < rows; r++) {
          const cy = gridOrigin[1] + (r + 0.5) * cellPx;
          const my = Math.floor(cy * scaleY);
          if (my < 0 || my >= maskH) continue;
          const rowBase = r * cols;

          for (let c = 0; c < cols; c++) {
            const cx = gridOrigin[0] + (c + 0.5) * cellPx;
            const mx = Math.floor(cx * scaleX);
            if (mx >= 0 && mx < maskW) {
              const pIdx = (my * maskW + mx) * 4;
              if (rawMask[pIdx] > 110) {
                // Inside text cutout
                maskCutout[rowBase + c] = 1;
              }
            }
          }
        }
      } catch {
        maskCutout.fill(0);
      }
    };

    applyMaskRef.current = () => {
      drawMask();
    };

    replayRef.current = () => {
      introStart = performance.now();
      introProgress = 0;
    };

    // Main 60 FPS Render Loop (Zero Garbage Collection, Ultra-Fast Execution)
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) return undefined;

    const render = (now: number) => {
      if (disposed) return;

      const s = settingsRef.current;
      const dt = Math.min(0.05, (now - lastTime) / 1000);
      lastTime = now;

      if (!s.paused && s.speed > 0 && !reduceMotion.matches) {
        time += dt * 0.8 * s.speed;
      }

      if (introProgress < 2.0) {
        introProgress = Math.min(2.0, ((now - introStart) / 1000 / s.introDuration) * 2.0);
      }

      // Background clear
      ctx.fillStyle = s.backgroundColor;
      ctx.fillRect(0, 0, width, height);

      const halfW = width * 0.5;
      const halfH = height * 0.5;
      const isMixed = s.shapes === 'mixed';
      const shapeFixed = s.shapes === 'squares' ? 0 : s.shapes === 'circles' ? 1 : 2;

      // Base radius calculation
      const baseRadius = cellPx * 0.44 * s.dotSize;

      // Single-pass rendering: direct draw without allocating 20,000 heap objects per frame
      for (let r = 0; r < rows; r++) {
        const cy = gridOrigin[1] + (r + 0.5) * cellPx;
        const rowBase = r * cols;

        for (let c = 0; c < cols; c++) {
          const idx = rowBase + c;

          // 1. Stencil Mask Cutout Check ("Voko" negative space)
          if (maskCutout[idx] === 1) continue;

          // 2. Precomputed Vignette Edge Fade
          const alphaMult = cellFade[idx];
          if (alphaMult <= 0.02) continue;

          const cx = gridOrigin[0] + (c + 0.5) * cellPx;

          // 3. Multi-octave continuous harmonic wave noise (smooth ambient flowing motion)
          const w1 = Math.sin(cx * 0.0035 * s.scale + time * 0.9) * Math.cos(cy * 0.0035 * s.scale + time * 0.7);
          const w2 = Math.sin((cx + cy) * 0.0025 * s.scale - time * 0.6) * Math.cos((cx - cy) * 0.0025 * s.scale + time * 0.5);
          const w3 = Math.sin(Math.hypot(cx - halfW, cy - halfH) * 0.003 * s.scale - time * 0.5);
          const noise = w1 * 0.5 + w2 * 0.35 + w3 * 0.15;

          const tone = Math.min(1, Math.max(0, (noise * 0.5 + 0.5 - s.brightness) * (2.6 * s.contrast) + 0.5));
          const band = Math.floor(tone * 2.999);
          const shapeType = isMixed ? (2 - band) : shapeFixed;

          // 4. Shape size (crest vs trough + intro animation)
          let radius = baseRadius * (0.45 + 0.55 * tone);

          if (introProgress < 2.0) {
            const radial = Math.hypot((cx - halfW) / halfW, (cy - halfH) / halfH);
            const progressRatio = Math.min(1, Math.max(0, (introProgress - radial * 0.5) / 0.4));
            if (progressRatio <= 0.01) continue;
            const back = progressRatio - 1.0;
            radius *= Math.max(0.01, 1.0 + 2.5 * back * back * back + 1.5 * back * back);
          }

          if (radius <= 0.4) continue;

          // 5. Discrete Palette Lookup (Zero String Concatenation per frame)
          const palIdx = Math.min(PALETTE_STEPS - 1, Math.max(0, Math.floor(tone * (PALETTE_STEPS - 1))));
          ctx.fillStyle = colorPalette[palIdx];

          // 6. Draw Shape directly to canvas
          if (shapeType === 0) {
            // Squares
            ctx.fillRect(cx - radius, cy - radius, radius * 2, radius * 2);
          } else if (shapeType === 1) {
            // Circles
            ctx.beginPath();
            ctx.arc(cx, cy, radius, 0, Math.PI * 2);
            ctx.fill();
          } else {
            // Triangles
            ctx.beginPath();
            ctx.moveTo(cx, cy - radius);
            ctx.lineTo(cx + radius * 0.866, cy + radius * 0.5);
            ctx.lineTo(cx - radius * 0.866, cy + radius * 0.5);
            ctx.closePath();
            ctx.fill();
          }
        }
      }

      frameId = requestAnimationFrame(render);
    };

    const handleResize = () => {
      configureGrid();
    };

    resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(root);

    handleResize();
    setReady(true);
    frameId = requestAnimationFrame(render);

    return () => {
      disposed = true;
      if (frameId) cancelAnimationFrame(frameId);
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
