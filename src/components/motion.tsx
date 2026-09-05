import { useEffect, useRef, useState } from 'react';
import { motion, animate, useReducedMotion } from 'framer-motion';

/* Module-private animation presets (kept out of exports for fast-refresh). */
const gentleSpring = { type: 'spring' as const, stiffness: 260, damping: 30 };

/** Fade-and-rise entrance used for cards, rows, panels. */
const riseIn = {
  hidden: { opacity: 0, y: 14 },
  show: (i: number = 0) => ({
    opacity: 1,
    y: 0,
    transition: { ...gentleSpring, delay: Math.min(i * 0.045, 0.4) },
  }),
};

/** Stagger container: children using `riseIn` cascade in sequence. */
export function Stagger({
  children,
  className,
  delay = 0,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) {
  return (
    <motion.div
      className={className}
      initial="hidden"
      animate="show"
      variants={{
        hidden: {},
        show: { transition: { staggerChildren: 0.05, delayChildren: delay } },
      }}
    >
      {children}
    </motion.div>
  );
}

export function StaggerItem({
  children,
  className,
  index = 0,
}: {
  children: React.ReactNode;
  className?: string;
  index?: number;
}) {
  return (
    <motion.div className={className} variants={riseIn} custom={index}>
      {children}
    </motion.div>
  );
}

/**
 * Number that springs to its target whenever `value` changes —
 * used for live metrics so refreshes feel alive instead of snapping.
 */
export function AnimatedNumber({
  value,
  decimals = 0,
  prefix = '',
  suffix = '',
  className,
}: {
  value: number;
  decimals?: number;
  prefix?: string;
  suffix?: string;
  className?: string;
}) {
  const reduce = useReducedMotion();
  const format = (n: number) =>
    `${prefix}${n.toFixed(decimals)}${suffix}`;
  const [display, setDisplay] = useState(() => format(value));
  const prev = useRef(value);

  useEffect(() => {
    if (reduce) {
      setDisplay(format(value));
      prev.current = value;
      return;
    }
    const controls = animate(prev.current, value, {
      duration: 0.9,
      ease: [0.32, 0.72, 0, 1],
      onUpdate: (v) => setDisplay(format(v)),
    });
    prev.current = value;
    return () => controls.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  return <span className={className}>{display}</span>;
}

/**
 * Short highlight flash that replays whenever `pulseKey` changes —
 * ideal for "Updated …" timestamps on live refresh.
 */
export function RefreshFlash({
  pulseKey,
  children,
  className,
}: {
  pulseKey: string | number;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <motion.span
      key={pulseKey}
      className={className}
      initial={{ opacity: 0.25 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.6, ease: 'easeOut' }}
    >
      {children}
    </motion.span>
  );
}
