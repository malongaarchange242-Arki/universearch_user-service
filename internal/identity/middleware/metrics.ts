/**
 * Simple in-memory metrics for middleware.
 * This is intentionally minimal: counters and duration recording.
 * Replace with Prometheus/StatsD exporter as needed.
 */
type Counters = Record<string, number>;
type Timings = Record<string, number[]>;

const counters: Counters = {};
const timings: Timings = {};

export function incCounter(name: string, by = 1) {
  counters[name] = (counters[name] || 0) + by;
}

export function recordTiming(name: string, ms: number) {
  if (!timings[name]) timings[name] = [];
  timings[name].push(ms);
}

export function getMetrics() {
  return {
    counters: { ...counters },
    timings: { ...timings },
  } as const;
}

export default { incCounter, recordTiming, getMetrics };
