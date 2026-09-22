import React, { useEffect, useRef } from 'react';

interface Star {
  x: number;
  y: number;
  radius: number;
  baseAlpha: number;
  alpha: number;
  speed: number;
  phase: number;
  color: string;
  glow: boolean;
}

export const Starfield: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
      initStars();
    };
    window.addEventListener('resize', handleResize);

    const STAR_COLORS = [
      'rgba(255, 255, 255,',     // Pure white
      'rgba(255, 255, 255,',     // Pure white (weighted)
      'rgba(224, 242, 254,',     // Ice blue
      'rgba(186, 230, 253,',     // Soft cyan-blue
      'rgba(254, 249, 195,',     // Warm pale gold
    ];

    let stars: Star[] = [];

    const initStars = () => {
      // 800+ total stars across multiple cosmic depths
      const count = Math.min(Math.floor((width * height) / 1800), 950);
      stars = Array.from({ length: count }, (_, i) => {
        const isBright = i < 45; // 45 prominent stars with glow
        const isMid = i >= 45 && i < 300; // 255 mid-depth stars
        // rest are distant micro-stars

        const radius = isBright
          ? Math.random() * 1.4 + 1.4
          : isMid
          ? Math.random() * 0.9 + 0.8
          : Math.random() * 0.5 + 0.35;

        const baseAlpha = isBright
          ? Math.random() * 0.35 + 0.65
          : isMid
          ? Math.random() * 0.35 + 0.45
          : Math.random() * 0.3 + 0.25;

        return {
          x: Math.random() * width,
          y: Math.random() * height,
          radius,
          baseAlpha,
          alpha: baseAlpha,
          speed: Math.random() * 0.02 + 0.008,
          phase: Math.random() * Math.PI * 2,
          color: STAR_COLORS[Math.floor(Math.random() * STAR_COLORS.length)],
          glow: isBright,
        };
      });
    };

    initStars();

    let t = 0;
    const render = () => {
      ctx.clearRect(0, 0, width, height);
      t += 0.015;

      for (let i = 0; i < stars.length; i++) {
        const star = stars[i];
        // Organic sinusoidal twinkling
        const currentAlpha = star.baseAlpha * (0.65 + 0.35 * Math.sin(t * star.speed * 60 + star.phase));

        if (star.glow) {
          // Soft radial celestial aura for prominent stars
          const grad = ctx.createRadialGradient(
            star.x,
            star.y,
            0,
            star.x,
            star.y,
            star.radius * 4,
          );
          grad.addColorStop(0, `${star.color} ${currentAlpha * 0.6})`);
          grad.addColorStop(1, `${star.color} 0)`);
          ctx.beginPath();
          ctx.arc(star.x, star.y, star.radius * 4, 0, Math.PI * 2);
          ctx.fillStyle = grad;
          ctx.fill();
        }

        // Star core
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.radius, 0, Math.PI * 2);
        ctx.fillStyle = `${star.color} ${currentAlpha})`;
        ctx.fill();
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-0 opacity-100"
    />
  );
};
