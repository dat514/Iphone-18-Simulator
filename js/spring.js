/*
 * Spring physics (SwiftUI-style: response + dampingFraction).
 * Springs keep their velocity when the target changes, so interrupting an
 * animation (press -> release -> press) feels continuous, exactly like iOS.
 */

export const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const SUBSTEP = 1 / 240;

export class Spring {
    constructor(value = 0, { response = 0.4, damping = 0.8 } = {}) {
        this.value = value;
        this.target = value;
        this.velocity = 0;
        this.eps = 0.0004; // rest thresholds (position / velocity). Pixel springs use looser ones.
        this.veps = 0.0008;
        this.setParams(response, damping);
    }

    setParams(response, damping) {
        const w = (2 * Math.PI) / response;
        this.k = w * w;
        this.c = 2 * damping * w;
        return this;
    }

    set(target) {
        this.target = target;
        return this;
    }

    snap(value) {
        this.value = this.target = value;
        this.velocity = 0;
        return this;
    }

    step(dt) {
        let remaining = Math.min(dt, 0.05);
        while (remaining > 0) {
            const h = Math.min(SUBSTEP, remaining);
            const accel = this.k * (this.target - this.value) - this.c * this.velocity;
            this.velocity += accel * h;
            this.value += this.velocity * h;
            remaining -= h;
        }
        if (this.atRest) this.snap(this.target);
        return this.value;
    }

    get atRest() {
        return Math.abs(this.velocity) < this.veps && Math.abs(this.target - this.value) < this.eps;
    }
}

/* One shared rAF loop that only runs while something is animating. */
const active = new Set();
let raf = 0;
let last = 0;

function frame(now) {
    const dt = Math.min((now - last) / 1000, 0.05);
    last = now;
    for (const fn of Array.from(active)) {
        if (!fn(dt)) active.delete(fn);
    }
    raf = active.size ? requestAnimationFrame(frame) : 0;
}

/** Register fn(dt) -> boolean (true = keep running). Safe to call repeatedly. */
export function animate(fn) {
    active.add(fn);
    if (!raf) {
        last = performance.now();
        raf = requestAnimationFrame(frame);
    }
}

/** iOS-like rubber band: moves with the finger but saturates at `limit`. */
export function rubber(delta, limit) {
    return limit * Math.tanh(delta / (limit * 1.8));
}

export const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

/** Shortest signed angular difference in degrees. */
export function angleDelta(from, to) {
    return ((((to - from) % 360) + 540) % 360) - 180;
}
