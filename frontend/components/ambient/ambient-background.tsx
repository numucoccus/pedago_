"use client";

import React, { useEffect, useRef } from "react";

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  alpha: number;
  baseAlpha: number;
}

export function AmbientBackground() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const glowRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    // Check prefers-reduced-motion
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReducedMotion) return;

    const isTouchDevice = "ontouchstart" in window || navigator.maxTouchPoints > 0;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    // Dynamic particle count based on viewport
    const particleCount = isTouchDevice ? 20 : Math.min(65, Math.floor((width * height) / 25000));
    const particles: Particle[] = [];

    for (let i = 0; i < particleCount; i++) {
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.35,
        vy: (Math.random() - 0.5) * 0.35,
        radius: Math.random() * 2.2 + 0.8,
        baseAlpha: Math.random() * 0.35 + 0.15,
        alpha: Math.random() * 0.35 + 0.15,
      });
    }

    const mouse = {
      x: -1000,
      y: -1000,
      targetX: -1000,
      targetY: -1000,
      trail: [] as Array<{ x: number; y: number; alpha: number }>,
    };

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (isTouchDevice) return;
      mouse.targetX = e.clientX;
      mouse.targetY = e.clientY;

      if (glowRef.current) {
        glowRef.current.style.transform = `translate3d(${e.clientX - 250}px, ${e.clientY - 250}px, 0)`;
      }
    };

    window.addEventListener("resize", handleResize);
    if (!isTouchDevice) {
      window.addEventListener("mousemove", handleMouseMove, { passive: true });
    }

    let lastTime = performance.now();

    const render = (time: number) => {
      const dt = Math.min((time - lastTime) / 16.66, 2);
      lastTime = time;

      ctx.clearRect(0, 0, width, height);

      // Smooth mouse lerp
      if (!isTouchDevice) {
        mouse.x += (mouse.targetX - mouse.x) * 0.15;
        mouse.y += (mouse.targetY - mouse.y) * 0.15;

        // Mouse trail
        if (mouse.x > 0 && mouse.y > 0) {
          mouse.trail.push({ x: mouse.x, y: mouse.y, alpha: 0.22 });
          if (mouse.trail.length > 12) {
            mouse.trail.shift();
          }
        }

        // Draw trail
        for (let i = 0; i < mouse.trail.length; i++) {
          const pt = mouse.trail[i];
          pt.alpha *= 0.88;
          ctx.beginPath();
          ctx.arc(pt.x, pt.y, (i + 1) * 0.9, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(99, 102, 241, ${pt.alpha * 0.4})`;
          ctx.fill();
        }
      }

      // Draw drifting spores
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];

        // Cursor repulsion
        if (!isTouchDevice && mouse.x > 0) {
          const dx = p.x - mouse.x;
          const dy = p.y - mouse.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          const maxRepel = 120;

          if (dist < maxRepel && dist > 0) {
            const force = (1 - dist / maxRepel) * 1.5;
            p.x += (dx / dist) * force;
            p.y += (dy / dist) * force;
          }
        }

        p.x += p.vx * dt;
        p.y += p.vy * dt;

        // Wrap around bounds
        if (p.x < 0) p.x = width;
        if (p.x > width) p.x = 0;
        if (p.y < 0) p.y = height;
        if (p.y > height) p.y = 0;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(129, 140, 248, ${p.alpha})`;
        ctx.fill();
      }

      animationFrameId = requestAnimationFrame(render);
    };

    animationFrameId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener("resize", handleResize);
      if (!isTouchDevice) {
        window.removeEventListener("mousemove", handleMouseMove);
      }
    };
  }, []);

  return (
    <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden" aria-hidden="true">
      {/* Slow aurora gradient mesh */}
      <div
        className="absolute -top-[30%] -left-[10%] h-[70vw] w-[70vw] rounded-full opacity-35 blur-[120px] dark:opacity-25 transition-transform duration-1000 animate-pulse"
        style={{
          background: "radial-gradient(circle, rgba(99, 102, 241, 0.45) 0%, rgba(56, 189, 248, 0.15) 70%, transparent 100%)",
          animationDuration: "14s",
        }}
      />
      <div
        className="absolute top-[35%] -right-[15%] h-[65vw] w-[65vw] rounded-full opacity-30 blur-[130px] dark:opacity-20 transition-transform duration-1000"
        style={{
          background: "radial-gradient(circle, rgba(168, 85, 247, 0.4) 0%, rgba(99, 102, 241, 0.15) 70%, transparent 100%)",
        }}
      />

      {/* Subtle cursor follower glow */}
      <div
        ref={glowRef}
        className="hidden md:block absolute top-0 left-0 h-[500px] w-[500px] rounded-full pointer-events-none opacity-20 dark:opacity-15 blur-[90px] transition-transform duration-75 will-change-transform"
        style={{
          background: "radial-gradient(circle, rgba(99, 102, 241, 0.6) 0%, rgba(14, 165, 233, 0.2) 60%, transparent 100%)",
        }}
      />

      {/* Spores canvas */}
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />
    </div>
  );
}
