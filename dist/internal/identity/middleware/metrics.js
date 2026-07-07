"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.incCounter = incCounter;
exports.recordTiming = recordTiming;
exports.getMetrics = getMetrics;
const counters = {};
const timings = {};
function incCounter(name, by = 1) {
    counters[name] = (counters[name] || 0) + by;
}
function recordTiming(name, ms) {
    if (!timings[name])
        timings[name] = [];
    timings[name].push(ms);
}
function getMetrics() {
    return {
        counters: { ...counters },
        timings: { ...timings },
    };
}
exports.default = { incCounter, recordTiming, getMetrics };
