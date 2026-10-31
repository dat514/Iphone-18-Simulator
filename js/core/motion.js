import { Spring, animate } from "../spring.js";

/**
 * A group of springs that share parameters and are applied together.
 * `to()` keeps current velocity (or takes the finger's), so interrupting is seamless (WWDC "Fluid Interfaces").
 */
const UNIT = new Set(["s", "p", "u"]);
export class Group {
    constructor(values, params, apply) {
        this.p = params;
        this.apply = apply;
        this.s = {};
        for (const [k, v] of Object.entries(values)) {
            const sp = (this.s[k] = new Spring(v, params));
            if (!UNIT.has(k)) (sp.eps = 0.03), (sp.veps = 0.4); // points / pixels: sub-0.03pt is invisible
        }
        this.done = null;
        this.tick = (dt) => {
            for (const s of Object.values(this.s)) s.step(dt);
            this.apply(this.values);
            const rest = Object.values(this.s).every((s) => s.atRest);
            if (rest && this.done) {
                const d = this.done;
                this.done = null;
                d();
            }
            return !rest;
        };
    }
    get values() {
        const o = {};
        for (const [k, s] of Object.entries(this.s)) o[k] = s.value;
        return o;
    }
    snap(values) {
        for (const [k, v] of Object.entries(values)) this.s[k]?.snap(v);
        this.apply(this.values);
    }
    /** Move current value without touching target/velocity (used while dragging). */
    drive(values) {
        for (const [k, v] of Object.entries(values)) if (this.s[k]) {
            this.s[k].value = this.s[k].target = v;
            this.s[k].velocity = 0;
        }
        this.apply(this.values);
    }
    to(targets, { params, velocity, done } = {}) {
        const pr = params || this.p;
        for (const [k, v] of Object.entries(targets)) {
            const s = this.s[k];
            if (!s) continue;
            s.setParams(pr.response, pr.damping);
            s.set(v);
            if (velocity && velocity[k] != null) s.velocity = velocity[k];
        }
        this.done = done || null;
        animate(this.tick);
    }
    get resting() {
        return Object.values(this.s).every((s) => s.atRest);
    }
}

export const SPRING = {
    open: { response: 0.5, damping: 0.9 },
    close: { response: 0.46, damping: 0.88 },
    ui: { response: 0.42, damping: 0.86 },
    soft: { response: 0.55, damping: 1 },
    bouncy: { response: 0.45, damping: 0.7 },
};
