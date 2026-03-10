'use client';

import { useRef, useEffect, useCallback } from 'react';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  opacity: number;
  life: number;
}

interface HourglassProps {
  progress: number;
  running: boolean;
  mode: 'work' | 'break';
  width?: number;
  height?: number;
}

export default function Hourglass({ progress, running, mode, width = 180, height = 320 }: HourglassProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const animFrameRef = useRef<number>(0);
  const smoothProgressRef = useRef(progress);
  const lastTimeRef = useRef(0);

  const sandColor = mode === 'work' ? '#c0c0c0' : '#fbbf24';
  const sandColorDim = mode === 'work' ? 'rgba(200,200,200,0.5)' : 'rgba(251,191,36,0.5)';
  const sandColorBright = mode === 'work' ? 'rgba(200,200,200,0.85)' : 'rgba(251,191,36,0.85)';
  const glassStroke = 'rgba(255,255,255,0.08)';
  const glassHighlight = 'rgba(255,255,255,0.025)';

  const cx = width / 2;
  const topY = 22;
  const botY = height - 22;
  const midY = height / 2;
  const neckHalf = 5;
  const topW = width * 0.36;
  const bulbH = midY - topY;
  const topSandMaxH = bulbH * 0.68;
  const botSandMaxH = bulbH * 0.68;

  const getWidthAtY = useCallback((y: number): number => {
    if (y <= topY) return topW;
    if (y >= botY) return topW;
    if (Math.abs(y - midY) < 1) return neckHalf;

    const dist = Math.abs(y - midY);
    const maxDist = bulbH;
    const t = Math.min(dist / maxDist, 1);
    const curved = t * t * (3 - 2 * t);
    return neckHalf + (topW - neckHalf) * curved;
  }, [topY, botY, midY, neckHalf, topW, bulbH]);

  const drawGlassShape = useCallback((ctx: CanvasRenderingContext2D) => {
    const steps = 40;
    ctx.beginPath();
    ctx.moveTo(cx - topW, topY);
    ctx.lineTo(cx + topW, topY);
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const y = topY + (midY - topY) * t;
      ctx.lineTo(cx + getWidthAtY(y), y);
    }
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const y = midY + (botY - midY) * t;
      ctx.lineTo(cx + getWidthAtY(y), y);
    }
    ctx.lineTo(cx - topW, botY);
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const y = botY - (botY - midY) * t;
      ctx.lineTo(cx - getWidthAtY(y), y);
    }
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const y = midY - (midY - topY) * t;
      ctx.lineTo(cx - getWidthAtY(y), y);
    }
    ctx.closePath();
  }, [cx, topW, topY, botY, midY, getWidthAtY]);

  const drawSandBody = useCallback((
    ctx: CanvasRenderingContext2D,
    fromY: number,
    toY: number,
    grad: CanvasGradient,
  ) => {
    if (Math.abs(toY - fromY) < 0.5) return;
    const steps = 24;
    ctx.beginPath();

    const startW = getWidthAtY(fromY);
    ctx.moveTo(cx - startW, fromY);
    ctx.lineTo(cx + startW, fromY);

    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const y = fromY + (toY - fromY) * t;
      ctx.lineTo(cx + getWidthAtY(y), y);
    }
    for (let i = steps; i >= 0; i--) {
      const t = i / steps;
      const y = fromY + (toY - fromY) * t;
      ctx.lineTo(cx - getWidthAtY(y), y);
    }
    ctx.closePath();
    ctx.fillStyle = grad;
    ctx.fill();
  }, [cx, getWidthAtY]);

  const draw = useCallback((timestamp: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dt = lastTimeRef.current ? (timestamp - lastTimeRef.current) / 1000 : 0.016;
    lastTimeRef.current = timestamp;

    const lerpSpeed = 4.0;
    const diff = progress - smoothProgressRef.current;
    smoothProgressRef.current += diff * Math.min(lerpSpeed * dt, 1);
    const sp = Math.max(0, Math.min(1, smoothProgressRef.current));

    const dpr = window.devicePixelRatio || 1;
    if (canvas.width !== width * dpr || canvas.height !== height * dpr) {
      canvas.width = width * dpr;
      canvas.height = height * dpr;
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, height);

    // glass fill
    ctx.save();
    drawGlassShape(ctx);
    ctx.fillStyle = glassHighlight;
    ctx.fill();
    ctx.restore();

    // clip sand inside glass
    ctx.save();
    drawGlassShape(ctx);
    ctx.clip();

    // top sand — drains down, concave surface
    const topSandH = topSandMaxH * (1 - sp);
    if (topSandH > 1) {
      const topSandSurface = midY - 16 - topSandH;
      const grad1 = ctx.createLinearGradient(0, topSandSurface, 0, midY - 16);
      grad1.addColorStop(0, sandColor);
      grad1.addColorStop(0.7, sandColorBright);
      grad1.addColorStop(1, sandColorDim);

      // concave dip at surface center
      const surfaceW = getWidthAtY(topSandSurface);
      const dipDepth = Math.min(6, topSandH * 0.15);
      const steps = 24;

      ctx.beginPath();
      ctx.moveTo(cx - surfaceW, topSandSurface);
      for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        const x = cx - surfaceW + surfaceW * 2 * t;
        const dipT = Math.sin(t * Math.PI);
        const y = topSandSurface + dipDepth * dipT * dipT;
        ctx.lineTo(x, y);
      }

      const bodySteps = 20;
      for (let i = 0; i <= bodySteps; i++) {
        const t = i / bodySteps;
        const y = topSandSurface + (midY - 16 - topSandSurface) * t;
        ctx.lineTo(cx + getWidthAtY(y), y);
      }
      for (let i = bodySteps; i >= 0; i--) {
        const t = i / bodySteps;
        const y = topSandSurface + (midY - 16 - topSandSurface) * t;
        ctx.lineTo(cx - getWidthAtY(y), y);
      }
      ctx.closePath();
      ctx.fillStyle = grad1;
      ctx.fill();
    }

    // bottom sand — fills up, mound surface
    const botSandH = botSandMaxH * sp;
    if (botSandH > 1) {
      const botSandBot = botY - 4;
      const botSandSurface = botSandBot - botSandH;
      const grad2 = ctx.createLinearGradient(0, botSandSurface, 0, botSandBot);
      grad2.addColorStop(0, sandColorDim);
      grad2.addColorStop(0.3, sandColorBright);
      grad2.addColorStop(1, sandColor);

      const surfaceW = getWidthAtY(botSandSurface);
      const moundH = Math.min(8, botSandH * 0.12);
      const steps = 24;

      ctx.beginPath();
      // mound surface
      for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        const x = cx - surfaceW + surfaceW * 2 * t;
        const moundT = Math.sin(t * Math.PI);
        const y = botSandSurface - moundH * moundT;
        ctx.lineTo(x, y);
      }

      const bodySteps = 20;
      for (let i = 0; i <= bodySteps; i++) {
        const t = i / bodySteps;
        const y = botSandSurface + (botSandBot - botSandSurface) * t;
        ctx.lineTo(cx + getWidthAtY(y), y);
      }
      for (let i = bodySteps; i >= 0; i--) {
        const t = i / bodySteps;
        const y = botSandSurface + (botSandBot - botSandSurface) * t;
        ctx.lineTo(cx - getWidthAtY(y), y);
      }
      ctx.closePath();
      ctx.fillStyle = grad2;
      ctx.fill();
    }

    // sand stream through neck
    if (running && sp > 0.001 && sp < 0.999) {
      const streamLen = 30;
      const streamTop = midY - streamLen * 0.4;
      const streamBot = midY + streamLen * 0.6;
      const streamGrad = ctx.createLinearGradient(0, streamTop, 0, streamBot);
      streamGrad.addColorStop(0, `${sandColor}60`);
      streamGrad.addColorStop(0.4, `${sandColor}cc`);
      streamGrad.addColorStop(0.6, `${sandColor}cc`);
      streamGrad.addColorStop(1, `${sandColor}30`);
      ctx.fillStyle = streamGrad;

      ctx.beginPath();
      ctx.moveTo(cx - 1.2, streamTop);
      ctx.lineTo(cx + 1.2, streamTop);
      ctx.lineTo(cx + 0.8, streamBot);
      ctx.lineTo(cx - 0.8, streamBot);
      ctx.closePath();
      ctx.fill();
    }

    // falling particles
    if (running && sp < 0.999) {
      const spawnRate = 0.55;
      if (Math.random() < spawnRate) {
        particlesRef.current.push({
          x: cx + (Math.random() - 0.5) * neckHalf * 0.8,
          y: midY + 2 + Math.random() * 6,
          vx: (Math.random() - 0.5) * 0.4,
          vy: 0.4 + Math.random() * 0.8,
          size: 0.6 + Math.random() * 1.2,
          opacity: 0.4 + Math.random() * 0.5,
          life: 1,
        });
      }
    }

    const botSandSurface = botY - 4 - botSandH;
    const alive: Particle[] = [];
    for (const p of particlesRef.current) {
      p.y += p.vy;
      p.x += p.vx;
      p.vy += 0.06;
      p.life -= 0.012;
      p.opacity = Math.max(0, p.opacity - 0.008);

      if (p.y < botSandSurface - 2 && p.life > 0) {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        const alpha = Math.round(p.opacity * 255).toString(16).padStart(2, '0');
        ctx.fillStyle = `${sandColor}${alpha}`;
        ctx.fill();
        alive.push(p);
      }
    }
    particlesRef.current = alive.slice(-80);

    ctx.restore();

    // glass outline with smooth curves
    ctx.save();
    drawGlassShape(ctx);
    ctx.strokeStyle = glassStroke;
    ctx.lineWidth = 1.2;
    ctx.stroke();
    ctx.restore();

    // glass specular highlight — left edge
    ctx.save();
    ctx.globalAlpha = 0.05;
    const hlSteps = 30;
    ctx.beginPath();
    for (let i = 0; i <= hlSteps; i++) {
      const t = i / hlSteps;
      const y = topY + 12 + (midY - topY - 24) * t;
      const w = getWidthAtY(y);
      const x = cx - w + 5;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 1.5;
    ctx.lineCap = 'round';
    ctx.stroke();
    ctx.beginPath();
    for (let i = 0; i <= hlSteps; i++) {
      const t = i / hlSteps;
      const y = midY + 12 + (botY - midY - 24) * t;
      const w = getWidthAtY(y);
      const x = cx - w + 5;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
    ctx.restore();

    // top & bottom caps
    ctx.strokeStyle = 'rgba(255,255,255,0.1)';
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(cx - topW - 6, topY);
    ctx.lineTo(cx + topW + 6, topY);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(cx - topW - 6, botY);
    ctx.lineTo(cx + topW + 6, botY);
    ctx.stroke();

    // subtle cap decorations
    ctx.strokeStyle = 'rgba(255,255,255,0.04)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(cx - topW - 6, topY - 3);
    ctx.lineTo(cx + topW + 6, topY - 3);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(cx - topW - 6, botY + 3);
    ctx.lineTo(cx + topW + 6, botY + 3);
    ctx.stroke();

    // glow at neck
    if (running && sp < 0.999 && sp > 0.001) {
      const glowGrad = ctx.createRadialGradient(cx, midY, 0, cx, midY, 18);
      glowGrad.addColorStop(0, `${sandColor}14`);
      glowGrad.addColorStop(1, 'transparent');
      ctx.fillStyle = glowGrad;
      ctx.fillRect(cx - 18, midY - 18, 36, 36);
    }

    const settled = !running && Math.abs(progress - smoothProgressRef.current) < 0.001 && particlesRef.current.length === 0;
    if (!settled) {
      animFrameRef.current = requestAnimationFrame(draw);
    }
  }, [progress, running, width, height, sandColor, sandColorDim, sandColorBright, cx, topY, botY, midY, neckHalf, topW, topSandMaxH, botSandMaxH, drawGlassShape, getWidthAtY, glassStroke, glassHighlight]);

  useEffect(() => {
    smoothProgressRef.current = progress;
  }, []);

  useEffect(() => {
    lastTimeRef.current = 0;
    cancelAnimationFrame(animFrameRef.current);
    animFrameRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(animFrameRef.current);
  }, [draw]);

  return (
    <canvas
      ref={canvasRef}
      style={{ width, height }}
      className="drop-shadow-[0_0_30px_rgba(200,200,200,0.06)]"
    />
  );
}
