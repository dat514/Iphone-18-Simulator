import { registerApp } from "../core/apps.js";
import { h, sys, clamp } from "../core/util.js";
import { page, btn, ICO, tabBar } from "../core/ui.js";
import { Group } from "../core/motion.js";
import { W, H } from "../core/metrics.js";
import { ctx } from "../core/ctx.js";
import { tone } from "../core/audio.js";
import { registerGlass } from "../glass.js";

// shared photo library (camera writes, photos reads)
ctx.photos = [];
const rnd = (seed) => () => ((seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296);
const sample = (i) => {
    const r = rnd(i * 977 + 13);
    const h1 = Math.floor(r() * 360), h2 = (h1 + 40 + Math.floor(r() * 120)) % 360, h3 = (h1 + 200) % 360;
    return { bg: `radial-gradient(90% 60% at ${20 + r() * 60}% ${r() * 50}%, hsl(${h1} 85% 62%), transparent 65%), radial-gradient(80% 70% at ${r() * 100}% 100%, hsl(${h2} 80% 55%), transparent 60%), hsl(${h3} 45% 22%)` };
};
const SAMPLES = Array.from({ length: 27 }, (_, i) => sample(i + 3));

/* ================================ Camera ================================ */
export function initCamera() {
    registerApp({
        id: "camera", name: "Camera", status: "light", bg: "#000",
        build(root, api) {
            const app = h("div.app.dk.cam");
            root.append(app);
            const video = h("video", { autoplay: true, muted: true, playsinline: true });
            video.muted = true;
            const fb = h("div.vfa");
            const vf = h("div.vf", [fb, video]);
            const flash = h("div.shutflash");
            const zoom = h("div.zoom", ["0.5", "1×", "2", "5"].map((z, i) => h("button" + (i === 1 ? ".on" : ""), { on: { click: (e) => setZoom(z, e.currentTarget) } }, z)));
            const thumb = h("button.cthumb", { on: { click: () => ctx.mod.wm.open("photos", ctx.rect(thumb)) } });
            const shut = h("button.shutter", h("i"));
            const flip = h("button.cflip", { html: `<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="#fff" stroke-width="2.200" stroke-linecap="round" stroke-linejoin="round"><path d="M20 8a8 8 0 0 0-14-2M4 4v3h3M4 16a8 8 0 0 0 14 2m2 2v-3h-3"/></svg>`, on: { click: () => { facing = facing === "user" ? "environment" : "user"; start(); } } });
            const modes = h("div.modes", ["Cinematic", "Video", "Photo", "Portrait", "Pano"].map((m) => h("span" + (m === "Photo" ? ".on" : ""), m)));
            app.append(vf, flash, zoom, modes, h("div.cbar", [thumb, shut, flip]));
            let stream = null, facing = "environment", z = 1;
            const setZoom = (label, b) => {
                zoom.querySelectorAll("button").forEach((x) => x.classList.toggle("on", x === b));
                z = label === "0.5" ? 0.6 : parseFloat(label);
                video.style.transform = fb.style.transform = `scale(${z})`;
            };
            async function start() {
                stop();
                try {
                    stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: facing }, audio: false });
                    video.srcObject = stream;
                    app.classList.add("live");
                } catch {
                    app.classList.remove("live");
                }
            }
            function stop() {
                stream?.getTracks().forEach((t) => t.stop());
                stream = null;
                app.classList.remove("live");
            }
            const paintThumb = () => {
                const p = ctx.photos[0];
                thumb.style.background = p ? (p.src ? `center / cover url(${p.src})` : p.bg) : "#2c2c2e";
            };
            shut.addEventListener("click", () => {
                let item;
                if (app.classList.contains("live") && video.videoWidth) {
                    const c = document.createElement("canvas");
                    c.width = 720; c.height = 960;
                    const sx = video.videoWidth, sy = video.videoHeight;
                    const k = Math.max(720 / sx, 960 / sy) / z;
                    c.getContext("2d").drawImage(video, (sx - 720 / k) / 2, (sy - 960 / k) / 2, 720 / k, 960 / k, 0, 0, 720, 960);
                    item = { src: c.toDataURL("image/jpeg", 0.82) };
                } else item = sample(Date.now() % 997);
                ctx.photos.unshift(item);
                flash.classList.remove("go"); void flash.offsetWidth; flash.classList.add("go");
                tone(2400, 0.03, 0.12, "square"); setTimeout(() => tone(1500, 0.05, 0.1, "square"), 45);
                thumb.classList.remove("pop"); void thumb.offsetWidth; thumb.classList.add("pop");
                paintThumb();
            });
            paintThumb();
            api.hooks = { open: start, close: stop, destroy: stop };
        },
    });
}

/* ================================ Photos ================================ */
export function initPhotos() {
    registerApp({
        id: "photos", name: "Photos", status: "auto",
        build(root, api) {
            const app = h("div.app.photos");
            root.append(app);
            const p = page({ title: "Library", large: true });
            const grid = h("div.pgrid");
            p.scroll.append(grid);
            p.scroll.style.padding = "96px 0 120px";
            app.append(p.el);
            const all = () => [...ctx.photos, ...SAMPLES];
            const paint = () => {
                grid.innerHTML = "";
                all().forEach((it, i) => {
                    const t = h("button.pth", { style: it.src ? { background: `center / cover url(${it.src})` } : { background: it.bg }, on: { click: () => openViewer(it, t) } });
                    grid.append(t);
                });
            };

            function openViewer(it, thumb) {
                const r = ctx.rect(thumb);
                const bg = h("div.vbg");
                const img = h("div.vimg", { style: it.src ? { background: `center / cover url(${it.src})` } : { background: it.bg } });
                const close = btn(ICO.back, () => dismiss(), "circle");
                close.classList.add("vclose");
                const view = h("div.viewer", [bg, img, close]);
                app.append(view);
                registerGlass(close);
                const full = { x: 0, y: (H - 600) / 2, w: W, h: 600, r: 0 };
                const g = new Group({ x: r.x, y: r.y, w: r.w, h: r.h, r: 0 }, { response: 0.5, damping: 0.88 }, (v) => {
                    Object.assign(img.style, { transform: `translate3d(${v.x}px,${v.y}px,0)`, width: v.w + "px", height: v.h + "px", borderRadius: v.r + "px" });
                });
                g.snap({ x: r.x, y: r.y, w: r.w, h: r.h, r: 0 });
                requestAnimationFrame(() => { bg.style.opacity = 1; g.to(full); close.classList.add("in"); });
                let sy = null, sx = null, vy = 0, lastY = 0, lastT = 0;
                const dismiss = (v) => {
                    bg.style.opacity = 0; close.classList.remove("in");
                    const rr = ctx.rect(thumb);
                    g.to({ x: rr.x, y: rr.y, w: rr.w, h: rr.h, r: 0 }, { params: { response: 0.46, damping: 0.9 }, velocity: v, done: () => view.remove() });
                };
                img.addEventListener("pointerdown", (e) => { const q = ctx.pt(e); sy = q.y; sx = q.x; lastY = q.y; lastT = performance.now(); try { img.setPointerCapture(e.pointerId); } catch {}; });
                img.addEventListener("pointermove", (e) => {
                    if (sy == null) return;
                    const q = ctx.pt(e);
                    const dy = q.y - sy, dx = q.x - sx;
                    const now = performance.now();
                    vy = (q.y - lastY) / Math.max(0.008, (now - lastT) / 1000); lastY = q.y; lastT = now;
                    const k = clamp(dy / 500, 0, 1);
                    const s = 1 - 0.4 * k;
                    bg.style.opacity = 1 - k * 1.2;
                    g.drive({ x: dx + (W - W * s) / 2 * 0, y: full.y + dy, w: full.w * s, h: full.h * s, r: 28 * k });
                    img.style.transformOrigin = "50% 50%";
                });
                img.addEventListener("pointerup", () => {
                    if (sy == null) return;
                    const moved = g.values.y - full.y;
                    sy = null;
                    if (moved > 130 || vy > 700) dismiss({ y: vy });
                    else { bg.style.opacity = 1; g.to(full, { velocity: { y: vy } }); }
                });
            }
            paint();
            api.hooks = { open: paint };
        },
    });
}

/* ================================= Music ================================= */
const SONGS = [
    { title: "Neon Drift", artist: "Synth Lab", bpm: 86, root: 57, prog: [[0, 3, 7, 10], [5, 8, 12, 15], [3, 7, 10, 14], [7, 10, 14, 17]], art: "linear-gradient(135deg,#ff7a18,#af002d 60%,#319197)" },
    { title: "Glass Garden", artist: "Liquid Pad", bpm: 72, root: 52, prog: [[0, 4, 7, 11], [5, 9, 12, 16], [7, 11, 14, 17], [2, 5, 9, 12]], art: "linear-gradient(135deg,#7b5cff,#00d4ff)" },
    { title: "Midnight Loop", artist: "Dat514", bpm: 98, root: 50, prog: [[0, 3, 7], [8, 12, 15], [5, 8, 12], [10, 14, 17]], art: "linear-gradient(135deg,#0f2027,#2c5364 55%,#ff4fa3)" },
];
export function initMusic() {
    registerApp({
        id: "music", name: "Music", status: "auto",
        build(root, api) {
            const app = h("div.app.music");
            root.append(app);
            const p = page({ title: "Library", large: true });
            app.append(p.el);
            const fileIn = h("input", { type: "file", accept: "audio/*", style: { display: "none" }, on: { change: (e) => { const f = e.target.files[0]; if (!f) return; SONGS.push({ title: f.name.replace(/\.[^.]+$/, ""), artist: "On This iPhone", url: URL.createObjectURL(f), art: "linear-gradient(135deg,#444,#999)" }); paint(); play(SONGS.length - 1); } } });
            const list = h("div.grp");
            p.scroll.append(list, h("button.addm", { on: { click: () => fileIn.click() } }, "+ Add song from device"), fileIn);
            // mini player + now playing
            const mini = h("div.mini-p", { "data-glass": "", "data-glass-lite": "", "data-glass-bezel": "30", "data-glass-static": "" });
            const np = h("div.np");
            app.append(mini, np);
            requestAnimationFrame(() => registerGlass(mini));

            let ac = null, master = null, timer = 0, nextT = 0, step = 0, i = 0, playing = false, t0 = 0, acc = 0, audio = null;
            const DUR = 180;
            const song = () => SONGS[i];
            const midi = (n) => 440 * Math.pow(2, (n - 69) / 12);
            const note = (f, t, d, type, v) => {
                const o = ac.createOscillator(), g = ac.createGain();
                o.type = type; o.frequency.value = f;
                g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(v, t + Math.min(0.08, d / 3)); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
                o.connect(g).connect(master); o.start(t); o.stop(t + d + 0.05);
            };
            const sched = () => {
                const s = song();
                const beat = 60 / s.bpm;
                while (nextT < ac.currentTime + 0.25) {
                    const bar = Math.floor(step / 4) % s.prog.length, ch = s.prog[bar], b = step % 4;
                    if (b === 0) ch.forEach((n, k) => note(midi(s.root + n - 12), nextT, beat * 4.2, "sine", 0.1 - k * 0.012));
                    note(midi(s.root + 12 + ch[(step * 3 + (step >> 2)) % ch.length]), nextT, beat * 0.9, "triangle", 0.09);
                    if (b % 2 === 0) note(midi(s.root - 12 + ch[0]), nextT, beat * 0.5, "sine", 0.13);
                    nextT += beat / 2 * 2 / 2 * 1; step++;
                }
            };
            const gainNow = () => (sys.get("silent") ? 0 : sys.get("volume") * 0.9);
            sys.on("volume", () => { if (master) master.gain.value = gainNow(); if (audio) audio.volume = sys.get("volume"); }, false);
            const prog = () => ({ cur: audio ? audio.currentTime : acc + (playing ? (performance.now() - t0) / 1000 : 0), dur: audio ? audio.duration || 0 : DUR });
            function push() {
                const s = song();
                const m = { title: s.title, artist: s.artist, playing, art: s.art, getProgress: prog };
                mini.style.display = "";
                ctx.mod.island.update("music", m.title ? m : null);
                ctx.mod.ccMedia(m);
                mini.innerHTML = `<span class="ma" style="background:${s.art}"></span><b>${s.title}</b><button data-a="t">${playing ? "❚❚" : "▶"}</button><button data-a="n">▶▶</button>`;
                np.querySelector?.(".npt") && (np.querySelector(".npt").textContent = s.title);
                paintNP();
            }
            function start() {
                const s = song();
                if (s.url) { audio ||= new Audio(); if (audio.src !== s.url) audio.src = s.url; audio.volume = sys.get("volume"); audio.onended = () => api2.next(); audio.play(); playing = true; push(); return; }
                audio?.pause(); audio = null;
                ac ||= new (window.AudioContext || window.webkitAudioContext)();
                ac.resume();
                master = ac.createGain(); master.gain.value = gainNow(); master.connect(ac.destination);
                nextT = ac.currentTime + 0.05; step = 0; t0 = performance.now(); playing = true;
                clearInterval(timer); timer = setInterval(() => { sched(); if (prog().cur > DUR) api2.next(); }, 60);
                push();
            }
            function stop() {
                if (audio) { acc = audio.currentTime; audio.pause(); }
                else { acc += (performance.now() - t0) / 1000; clearInterval(timer); master?.disconnect(); master = null; }
                playing = false; push();
            }
            const play = (k) => { if (audio) { audio.pause(); audio = null; } clearInterval(timer); master?.disconnect(); acc = 0; i = (k + SONGS.length) % SONGS.length; start(); };
            const api2 = (ctx.mod.player = { toggle: () => (playing ? stop() : start()), next: () => play(i + 1), prev: () => play(i - 1), get playing() { return playing; } });
            const paint = () => {
                list.innerHTML = "";
                SONGS.forEach((s, k) => list.append(h("div.cell.tap.song", { on: { click: () => (k === i && playing ? openNP() : play(k)) } }, [h("span.sa", { style: { background: s.art } }), h("span.ct", { html: `<b>${s.title}</b><em>${s.artist}</em>` })])));
            };
            mini.addEventListener("click", (e) => {
                const b = e.target.closest("button");
                if (b) return b.dataset.a === "t" ? api2.toggle() : api2.next();
                openNP();
            });
            function paintNP() {
                const s = song();
                np.style.setProperty("--art", s.art);
                np.innerHTML = `<div class="npbg" style="background:${s.art}"></div><button class="npx">⌄</button><div class="nart ${playing ? "big" : ""}" style="background:${s.art}"></div><div class="npt">${s.title}</div><div class="npa">${s.artist}</div><div class="npctl"><button data-a="p">${ctx.mod.ICO.prev}</button><button data-a="t" class="big">${playing ? ctx.mod.ICO.pause : ctx.mod.ICO.play}</button><button data-a="n">${ctx.mod.ICO.next}</button></div>`;
            }
            np.addEventListener("click", (e) => {
                const b = e.target.closest("button");
                if (!b) return;
                if (b.classList.contains("npx")) return closeNP();
                ({ p: api2.prev, t: api2.toggle, n: api2.next })[b.dataset.a]?.();
            });
            const openNP = () => (paintNP(), np.classList.add("on"));
            const closeNP = () => np.classList.remove("on");
            paint(); push();
            ctx.mod.island.update("music", null);
            ctx.mod.ccMedia(null);
            const _push = push;
            api.hooks = { open: paint };
            mini.style.display = "none";
        },
    });
}
