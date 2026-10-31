import { W } from "./metrics.js";

/** Shared handles to the device DOM + system modules (filled in by system/*.js). */
export const ctx = {
    phone: null,
    screen: null,
    el: {},
    mod: {},
    /** pointer position in screen points */
    pt(e) {
        const r = this.screen.getBoundingClientRect();
        const k = r.width / W;
        return { x: (e.clientX - r.left) / k, y: (e.clientY - r.top) / k };
    },
    /** element rect in screen points */
    rect(el) {
        const sr = this.screen.getBoundingClientRect();
        const k = sr.width / W;
        const r = el.getBoundingClientRect();
        return { x: (r.left - sr.left) / k, y: (r.top - sr.top) / k, w: r.width / k, h: r.height / k };
    },
};
