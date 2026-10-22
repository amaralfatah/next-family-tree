"use client";

import { useCallback, useEffect, useLayoutEffect, useRef } from "react";

/*
 * The person sheet's motion, after Apple's "Designing Fluid Interfaces" (WWDC 2018): springs set by
 * damping ratio and response, started from the sheet's current position so they can be grabbed
 * mid-flight, a drag that follows the finger 1:1, release velocity handed to the spring, and
 * momentum projection to decide between dismissing and settling back.
 */

/** One step of a damped spring (mass 1). `response` is roughly the time to reach the target, in seconds. */
function springStep(x: number, v: number, target: number, dt: number, damping: number, response: number): [number, number] {
  const stiffness = (2 * Math.PI / response) ** 2;
  const friction = (4 * Math.PI * damping) / response;
  const a = -stiffness * (x - target) - friction * v;
  const nv = v + a * dt;
  return [x + nv * dt, nv];
}

/**
 * Where a flick would come to rest (Apple's sample code). 0.998 is scroll's deceleration; a sheet this
 * short uses the snappier 0.99, so only a real flick, not a slow nudge, carries it past halfway.
 */
function project(velocity: number, decelerationRate = 0.99) {
  return ((velocity / 1000) * decelerationRate) / (1 - decelerationRate);
}

/** Resistance past an edge: the further the drag, the less the sheet follows. */
function rubberband(overshoot: number, dimension: number, constant = 0.55) {
  return (overshoot * dimension * constant) / (dimension + constant * Math.abs(overshoot));
}

const reducedMotion = () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/**
 * Drives a sheet's translateY. Enters from below on mount; `dismiss()` leaves the same way and then
 * calls `onDismissed`. On touch, the sheet can be dragged down to close (or flicked), and it rubber-bands
 * when pulled up. With reduced motion it fades instead of sliding.
 */
export function useSheetMotion<T extends HTMLElement>(onDismissed: () => void) {
  const ref = useRef<T>(null);
  const y = useRef(0);
  const velocity = useRef(0);
  const frame = useRef(0);
  const drag = useRef<{ startY: number; startOffset: number; active: boolean; samples: { t: number; y: number }[] } | null>(null);
  const done = useRef(onDismissed);
  useEffect(() => {
    done.current = onDismissed;
  }, [onDismissed]);

  const apply = useCallback(() => {
    if (ref.current) ref.current.style.transform = `translate3d(0, ${y.current}px, 0)`;
  }, []);

  // Fully below its resting place, including the gap to the bottom edge on larger screens.
  const offscreen = useCallback(() => {
    const el = ref.current;
    if (!el) return 0;
    const parent = el.offsetParent as HTMLElement | null;
    return parent ? parent.clientHeight - el.offsetTop : el.offsetHeight;
  }, []);

  const animateTo = useCallback(
    (target: number, opts: { damping: number; response: number; then?: () => void }) => {
      cancelAnimationFrame(frame.current);
      let last = performance.now();
      const tick = (now: number) => {
        const dt = Math.min((now - last) / 1000, 1 / 30);
        last = now;
        [y.current, velocity.current] = springStep(y.current, velocity.current, target, dt, opts.damping, opts.response);
        if (Math.abs(y.current - target) < 0.5 && Math.abs(velocity.current) < 5) {
          y.current = target;
          velocity.current = 0;
          apply();
          opts.then?.();
          return;
        }
        apply();
        frame.current = requestAnimationFrame(tick);
      };
      frame.current = requestAnimationFrame(tick);
    },
    [apply],
  );

  const fade = useCallback((to: 0 | 1, then?: () => void) => {
    const el = ref.current;
    if (!el) return then?.();
    el.animate([{ opacity: to ? 0 : 1 }, { opacity: to }], { duration: 160, easing: "ease-out", fill: "forwards" }).onfinish = () => then?.();
  }, []);

  // Enter from below, critically damped: the sheet appeared because of a tap, not a throw.
  useLayoutEffect(() => {
    if (reducedMotion()) {
      fade(1);
      return;
    }
    y.current = offscreen();
    velocity.current = 0;
    apply();
    animateTo(0, { damping: 1, response: 0.35 });
    return () => cancelAnimationFrame(frame.current);
  }, [animateTo, apply, fade, offscreen]);

  const dismiss = useCallback(() => {
    if (reducedMotion()) return fade(0, () => done.current());
    animateTo(offscreen(), { damping: 1, response: 0.3, then: () => done.current() });
  }, [animateTo, fade, offscreen]);

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    // A sheet is dragged with a finger or pen; a mouse clicks its buttons.
    if (e.pointerType === "mouse" || e.button !== 0) return;
    cancelAnimationFrame(frame.current); // grab it mid-flight, from where it is now
    drag.current = { startY: e.clientY, startOffset: y.current, active: false, samples: [{ t: e.timeStamp, y: y.current }] };
  }, []);

  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      const d = drag.current;
      if (!d) return;
      const dy = e.clientY - d.startY;
      if (!d.active) {
        if (Math.abs(dy) < 10) return; // hysteresis: a tap stays a tap
        d.active = true;
        (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
      }
      const raw = d.startOffset + dy;
      y.current = raw >= 0 ? raw : -rubberband(-raw, offscreen());
      apply();
      d.samples.push({ t: e.timeStamp, y: y.current });
      while (d.samples.length > 2 && e.timeStamp - d.samples[0].t > 100) d.samples.shift();
    },
    [apply, offscreen],
  );

  const onPointerUp = useCallback(
    (e: React.PointerEvent) => {
      const d = drag.current;
      drag.current = null;
      if (!d) return;
      const first = d.samples[0];
      const last = d.samples[d.samples.length - 1];
      const elapsed = (last.t - first.t) / 1000;
      velocity.current = elapsed > 0 ? (last.y - first.y) / elapsed : 0;
      if (!d.active) {
        // A tap without a drag: let it through, and put the sheet back if it was grabbed mid-flight.
        if (y.current !== 0) animateTo(0, { damping: 1, response: 0.3 });
        return;
      }
      e.preventDefault();
      const height = offscreen();
      if (reducedMotion()) {
        if (y.current > height / 2) return fade(0, () => done.current());
        y.current = 0;
        return apply();
      }
      // Decide from where the gesture is going, not where the finger let go.
      if (y.current + project(velocity.current) > height / 2) {
        animateTo(height, { damping: 1, response: 0.3, then: () => done.current() });
      } else {
        // A flick back up carried momentum, so it may overshoot a little (Apple's drawer: 0.8 / 0.3).
        animateTo(0, { damping: Math.abs(velocity.current) > 300 ? 0.8 : 1, response: 0.3 });
      }
    },
    [animateTo, apply, fade, offscreen],
  );

  return { ref, dismiss, handlers: { onPointerDown, onPointerMove, onPointerUp, onPointerCancel: onPointerUp } };
}
