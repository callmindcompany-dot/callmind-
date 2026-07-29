import React, { useEffect, useRef } from 'react';

interface Node3D {
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  label: string;
  color: string;
  size: number;
}

export const DocsHero3D: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = canvas.parentElement?.clientWidth || 800);
    let height = (canvas.height = canvas.parentElement?.clientHeight || 400);

    const handleResize = () => {
      if (!canvas || !canvas.parentElement) return;
      width = canvas.width = canvas.parentElement.clientWidth;
      height = canvas.height = canvas.parentElement.clientHeight;
    };

    window.addEventListener('resize', handleResize);

    const nodes: Node3D[] = [
      { x: -180, y: -60, z: 0, vx: 0.2, vy: 0.1, vz: 0, label: 'IndiaMART & TradeIndia', color: '#3b82f6', size: 8 },
      { x: -60, y: 40, z: 40, vx: -0.1, vy: 0.2, vz: 0.1, label: 'CallMind Webhook', color: '#06b6d4', size: 9 },
      { x: 60, y: -40, z: -30, vx: 0.15, vy: -0.1, vz: -0.1, label: 'Gemini AI Intelligence', color: '#8b5cf6', size: 10 },
      { x: 180, y: 50, z: 20, vx: -0.2, vy: -0.15, vz: 0.1, label: 'Telecaller Mobile App', color: '#10b981', size: 9 },
      { x: 0, y: -100, z: 10, vx: 0.1, vy: 0.1, vz: -0.2, label: 'Supabase RLS DB', color: '#f59e0b', size: 7 },
    ];

    // Background ambient particles
    const ambientParticles = Array.from({ length: 35 }, () => ({
      x: (Math.random() - 0.5) * 600,
      y: (Math.random() - 0.5) * 350,
      z: (Math.random() - 0.5) * 400,
      size: Math.random() * 2 + 1,
      color: 'rgba(59, 130, 246, 0.4)'
    }));

    let angleY = 0;
    let pulseProgress = 0;

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      const focalLength = 400;
      const centerX = width / 2;
      const centerY = height / 2;

      angleY += 0.005;
      pulseProgress = (pulseProgress + 0.015) % 1;

      // Project ambient particles
      ambientParticles.forEach(p => {
        const cosY = Math.cos(angleY);
        const sinY = Math.sin(angleY);
        const rx = p.x * cosY - p.z * sinY;
        const rz = p.z * cosY + p.x * sinY;

        const scale = focalLength / (focalLength + rz + 200);
        const px = centerX + rx * scale;
        const py = centerY + p.y * scale;

        if (scale > 0) {
          ctx.beginPath();
          ctx.arc(px, py, p.size * scale, 0, Math.PI * 2);
          ctx.fillStyle = p.color;
          ctx.fill();
        }
      });

      // Project main nodes
      const projectedNodes = nodes.map(node => {
        node.x += node.vx;
        node.y += node.vy;
        node.z += node.vz;

        if (Math.abs(node.x) > 220) node.vx *= -1;
        if (Math.abs(node.y) > 110) node.vy *= -1;
        if (Math.abs(node.z) > 100) node.vz *= -1;

        const cosY = Math.cos(angleY);
        const sinY = Math.sin(angleY);
        const rx = node.x * cosY - node.z * sinY;
        const rz = node.z * cosY + node.x * sinY;

        const scale = focalLength / (focalLength + rz + 200);
        const px = centerX + rx * scale;
        const py = centerY + node.y * scale;

        return { ...node, px, py, scale };
      });

      // Draw connecting lines between nodes
      for (let i = 0; i < projectedNodes.length; i++) {
        for (let j = i + 1; j < projectedNodes.length; j++) {
          const n1 = projectedNodes[i];
          const n2 = projectedNodes[j];

          const dx = n2.px - n1.px;
          const dy = n2.py - n1.py;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < 280) {
            const alpha = (1 - dist / 280) * 0.45;
            ctx.beginPath();
            ctx.moveTo(n1.px, n1.py);
            ctx.lineTo(n2.px, n2.py);
            ctx.strokeStyle = `rgba(59, 130, 246, ${alpha})`;
            ctx.lineWidth = 1.5 * ((n1.scale + n2.scale) / 2);
            ctx.stroke();

            // Animated glowing signal pulse traveling along line
            const signalX = n1.px + dx * pulseProgress;
            const signalY = n1.py + dy * pulseProgress;
            ctx.beginPath();
            ctx.arc(signalX, signalY, 3 * n1.scale, 0, Math.PI * 2);
            ctx.fillStyle = n1.color;
            ctx.shadowColor = n1.color;
            ctx.shadowBlur = 10;
            ctx.fill();
            ctx.shadowBlur = 0;
          }
        }
      }

      // Draw node spheres & labels
      projectedNodes.sort((a, b) => b.scale - a.scale);
      projectedNodes.forEach(node => {
        const radius = node.size * node.scale;

        // Glowing outer aura
        ctx.beginPath();
        ctx.arc(node.px, node.py, radius * 2.2, 0, Math.PI * 2);
        ctx.fillStyle = `${node.color}22`;
        ctx.fill();

        // Core sphere
        ctx.beginPath();
        ctx.arc(node.px, node.py, radius, 0, Math.PI * 2);
        ctx.fillStyle = node.color;
        ctx.shadowColor = node.color;
        ctx.shadowBlur = 12;
        ctx.fill();
        ctx.shadowBlur = 0;

        // Label tag
        ctx.font = `600 ${Math.max(10, Math.round(11 * node.scale))}px Inter, sans-serif`;
        ctx.fillStyle = '#0f172a';
        ctx.textAlign = 'center';
        ctx.fillText(node.label, node.px, node.py + radius + 16);
      });

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  return (
    <div className="relative w-full h-[320px] md:h-[380px] glass-card rounded-2xl overflow-hidden flex items-center justify-center p-2 border border-slate-200/80 bg-gradient-to-b from-white/70 to-slate-50/60 shadow-lg">
      <div className="absolute top-4 left-4 z-10 flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/80 backdrop-blur-md border border-slate-200 text-xs font-semibold text-slate-700 shadow-sm">
        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
        Live 3D Ecosystem Data Flow
      </div>
      <canvas ref={canvasRef} className="w-full h-full cursor-grab active:cursor-grabbing" />
    </div>
  );
};
