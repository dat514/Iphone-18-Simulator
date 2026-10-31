import { ctx } from "../core/ctx.js";
import { Group } from "../core/motion.js";
import { H } from "../core/metrics.js";
import { h, clamp } from "../core/util.js";
import { sfx, buzz } from "../core/audio.js";

const KB_H = 316;
const L1 = "qwertyuiop".split("");
const L2 = "asdfghjkl".split("");
const L3 = "zxcvbnm".split("");
const N1 = "1234567890".split("");
const N2 = ["-", "/", ":", ";", "(", ")", "$", "&", "@", '"'];
const N3 = [".", ",", "?", "!", "'"];

export function initKeyboard() {
    const el = ctx.el.kb;
    el.innerHTML = `<div class="kb-bg" data-glass data-glass-lite data-glass-static data-glass-bezel="1"></div><div class="kb-keys"></div><div class="kb-pop"></div>`;
    const keys = el.querySelector(".kb-keys");
    const pop = el.querySelector(".kb-pop");
    const st = { mode: "abc", shift: false, caps: false, target: null, vis: false };
    const g = new Group({ y: KB_H }, { response: 0.44, damping: 0.9 }, (v) => {
        el.style.transform = `translate3d(0,${v.y.toFixed(1)}px,0)`;
        el.style.visibility = v.y >= KB_H - 0.5 ? "hidden" : "visible";
        ctx.screen.style.setProperty("--kb", `${Math.max(0, KB_H - v.y).toFixed(1)}px`);
    });
    g.snap({ y: KB_H });

    const key = (label, o = {}) => {
        const k = h("button.k", { "data-k": o.v ?? label, class: o.cls || "", html: o.html || label });
        return k;
    };
    function render() {
        keys.innerHTML = "";
        const up = st.shift || st.caps;
        const row = (arr, cls = "") => h("div.kr" + (cls ? "." + cls : ""), arr);
        if (st.mode === "abc") {
            const f = (c) => key(up ? c.toUpperCase() : c, { v: up ? c.toUpperCase() : c });
            keys.append(row(L1.map(f)), row(L2.map(f), "r2"));
            keys.append(row([key("", { v: "shift", cls: "fn sh" + (st.shift ? " on" : "") + (st.caps ? " caps" : ""), html: '<svg viewBox="0 0 24 24" width="22" height="22"><path d="M12 4 3.500 13H9v6h6v-6h5.500z" fill="currentColor"/></svg>' }), ...L3.map(f), key("", { v: "del", cls: "fn", html: '<svg viewBox="0 0 24 24" width="26" height="26"><path d="M9 5h11a1.500 1.500 0 0 1 1.500 1.500v11A1.500 1.500 0 0 1 20 19H9l-6-7z" fill="none" stroke="currentColor" stroke-width="1.800" stroke-linejoin="round"/><path d="M12.500 9.500l5 5M17.500 9.500l-5 5" stroke="currentColor" stroke-width="1.800" stroke-linecap="round"/></svg>' })], "r3"));
        } else {
            keys.append(row(N1.map((c) => key(c))), row(N2.map((c) => key(c))));
            keys.append(row([key("#+=", { v: "noop", cls: "fn" }), ...N3.map((c) => key(c)), key("", { v: "del", cls: "fn", html: '<svg viewBox="0 0 24 24" width="26" height="26"><path d="M9 5h11a1.500 1.500 0 0 1 1.500 1.500v11A1.500 1.500 0 0 1 20 19H9l-6-7z" fill="none" stroke="currentColor" stroke-width="1.800" stroke-linejoin="round"/><path d="M12.500 9.500l5 5M17.500 9.500l-5 5" stroke="currentColor" stroke-width="1.800" stroke-linecap="round"/></svg>' })], "r3 n"));
        }
        keys.append(row([key(st.mode === "abc" ? "123" : "ABC", { v: "mode", cls: "fn" }), key("space", { v: " ", cls: "space" }), key("return", { v: "ret", cls: "fn ret" })], "r4"));
    }
    render();

    function insert(t) {
        const tg = st.target;
        if (!tg) return;
        if (tg.isContentEditable) document.execCommand("insertText", false, t);
        else {
            const s = tg.selectionStart ?? tg.value.length;
            const e = tg.selectionEnd ?? s;
            tg.setRangeText(t, s, e, "end");
            tg.dispatchEvent(new Event("input", { bubbles: true }));
        }
    }
    function back() {
        const tg = st.target;
        if (!tg) return;
        if (tg.isContentEditable) return document.execCommand("delete");
        const s = tg.selectionStart ?? 0;
        const e = tg.selectionEnd ?? s;
        if (s !== e) tg.setRangeText("", s, e, "end");
        else if (s > 0) tg.setRangeText("", s - 1, s, "end");
        tg.dispatchEvent(new Event("input", { bubbles: true }));
    }
    function press(v) {
        sfx.key();
        if (v === "del") return back();
        if (v === "shift") {
            const now = performance.now();
            if (now - (st.lastShift || 0) < 350) (st.caps = true), (st.shift = false);
            else if (st.caps) st.caps = false;
            else st.shift = !st.shift;
            st.lastShift = now;
            return render();
        }
        if (v === "mode") {
            st.mode = st.mode === "abc" ? "num" : "abc";
            return render();
        }
        if (v === "noop") return;
        if (v === "ret") {
            const tg = st.target;
            if (tg?.tagName === "TEXTAREA" || tg?.isContentEditable) return insert("\n");
            tg?.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
            tg?.dispatchEvent(new CustomEvent("kb-return", { bubbles: true }));
            return;
        }
        insert(v);
        if (st.shift && !st.caps) {
            st.shift = false;
            render();
        }
    }

    let rep = 0;
    keys.addEventListener("pointerdown", (e) => {
        const k = e.target.closest(".k");
        if (!k) return;
        e.preventDefault();
        e.stopPropagation();
        const v = k.dataset.k;
        k.classList.add("down");
        buzz(4);
        // key callout bubble for letters/numbers
        if (v.length === 1 && v !== " ") {
            const kr = ctx.rect(k);
            pop.textContent = v;
            pop.style.cssText = `left:${kr.x + kr.w / 2 - 33}px;top:${kr.y - kr.h - 22 - (H - KB_H) + 6}px;`;
            pop.classList.add("on");
        }
        try { k.setPointerCapture(e.pointerId); } catch {};
        if (v === "del") {
            press(v);
            rep = setTimeout(function loop() {
                press("del");
                rep = setTimeout(loop, 55);
            }, 420);
        }
        k._v = v;
    });
    const up = (e) => {
        const k = e.target.closest?.(".k");
        clearTimeout(rep);
        pop.classList.remove("on");
        keys.querySelectorAll(".down").forEach((x) => x.classList.remove("down"));
        if (!k || e.type === "pointercancel") return;
        const r = k.getBoundingClientRect();
        const inside = e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top - 8 && e.clientY <= r.bottom + 8;
        if (inside && k._v !== "del") press(k._v);
    };
    keys.addEventListener("pointerup", up);
    keys.addEventListener("pointercancel", up);

    const isField = (t) => t?.matches?.("input[data-kb],textarea[data-kb],[contenteditable][data-kb]");
    ctx.screen.addEventListener("focusin", (e) => isField(e.target) && api.show(e.target));
    ctx.screen.addEventListener("focusout", (e) => {
        if (isField(e.target)) setTimeout(() => !isField(document.activeElement) && api.hide(), 30);
    });

    const api = (ctx.mod.kb = {
        get visible() { return st.vis; },
        height: KB_H,
        show(t) {
            st.target = t;
            if (!st.vis) {
                st.vis = true;
                g.to({ y: 0 });
            }
            st.mode = "abc";
            st.shift = !t.value;
            render();
        },
        hide() {
            if (!st.vis) return;
            st.vis = false;
            document.activeElement?.blur?.();
            g.to({ y: KB_H }, { params: { response: 0.38, damping: 1 } });
        },
    });
}
