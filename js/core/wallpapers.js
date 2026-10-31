// Original generated wallpapers (mesh gradients) - no third-party artwork.
export const WALLPAPERS = [
    { id: "aurora", name: "Aurora", css: "radial-gradient(120% 70% at 20% 10%, #7b5cff 0%, transparent 60%), radial-gradient(90% 70% at 90% 30%, #00d4ff 0%, transparent 55%), radial-gradient(100% 80% at 40% 100%, #ff4fa3 0%, transparent 60%), #1a1240" },
    { id: "sunset", name: "Sunset", css: "radial-gradient(110% 70% at 80% 0%, #ffcf5c 0%, transparent 55%), radial-gradient(100% 80% at 10% 40%, #ff5f6d 0%, transparent 60%), radial-gradient(120% 70% at 60% 100%, #6a2cff 0%, transparent 60%), #2a0f3a" },
    { id: "ocean", name: "Ocean", css: "radial-gradient(100% 70% at 70% 0%, #5ef0ff 0%, transparent 55%), radial-gradient(110% 80% at 0% 60%, #1668ff 0%, transparent 60%), radial-gradient(100% 70% at 80% 100%, #00c2a8 0%, transparent 60%), #04163a" },
    { id: "bloom", name: "Bloom", css: "radial-gradient(90% 60% at 30% 15%, #ffd1f0 0%, transparent 60%), radial-gradient(100% 70% at 90% 50%, #b69cff 0%, transparent 60%), radial-gradient(110% 70% at 20% 100%, #ff8fb1 0%, transparent 60%), #3b1a52" },
    { id: "graphite", name: "Graphite", css: "radial-gradient(100% 60% at 70% 0%, #5b5f6e 0%, transparent 60%), radial-gradient(100% 70% at 10% 100%, #2c3040 0%, transparent 60%), #0d0e14" },
    { id: "ember", name: "Ember", css: "radial-gradient(100% 70% at 50% 0%, #ff7a18 0%, transparent 55%), radial-gradient(110% 80% at 100% 70%, #af002d 0%, transparent 60%), radial-gradient(100% 70% at 0% 100%, #4a0d67 0%, transparent 60%), #1a0610" },
];
export const wallpaperCSS = (id, custom) =>
    id === "custom" && custom ? `center / cover no-repeat url(${custom})` : (WALLPAPERS.find((w) => w.id === id) || WALLPAPERS[0]).css;
