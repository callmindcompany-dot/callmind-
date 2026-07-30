import { useEffect, useRef, useState } from 'react';

/**
 * Advances a carousel index on an interval, but ONLY while the section is
 * actually on screen.
 *
 * The showcase carousels auto-advance every few seconds and each slide mounts
 * a ~500KB screenshot. Left running unconditionally they fetch all slides even
 * for a visitor who never scrolls to that section. Gating the timer on an
 * IntersectionObserver means off-screen sections cost nothing.
 *
 * @param count       number of slides
 * @param intervalMs  advance interval in milliseconds
 * @returns { ref } to attach to the section, and the active index + setter
 */
export function useInViewAutoplay(count: number, intervalMs = 5000) {
  const ref = useRef<HTMLElement | null>(null);
  const [index, setIndex] = useState(0);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => setInView(entry.isIntersecting),
      { threshold: 0.2 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!inView || count <= 1) return;
    const timer = setInterval(() => {
      setIndex((prev) => (prev + 1) % count);
    }, intervalMs);
    return () => clearInterval(timer);
  }, [inView, count, intervalMs]);

  return { ref, index, setIndex };
}
