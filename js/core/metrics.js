// iPhone 18 Pro Max: 2868 x 1320 px @ 460 ppi, 3x  =>  440 x 956 pt.
export const W = 440;
export const H = 956;
export const R = 62; // display corner radius (pt)
export const BEZEL = 15.5; // body edge -> display edge (78 x 163.4 mm body vs 72.9 mm display)
export const ICON = 62;
export const ICON_R = ICON * 0.2237;
export const ISLAND = { w: 100, h: 30, top: 11 }; // 16.57 mm wide on the 18 Pro line (~20% smaller than 17 Pro)

// Home grid
export const COL_PITCH = 96.5;
export const ROW_PITCH = 112;
export const GRID_X = 28;
export const GRID_Y = 92;
export const slotXY = (i) => ({
    x: GRID_X + (i % 4) * COL_PITCH + (COL_PITCH - ICON) / 2,
    y: GRID_Y + Math.floor(i / 4) * ROW_PITCH,
});
export const DOCK = { x: 12, y: 836, w: 416, h: 96 };
export const dockXY = (i) => ({ x: DOCK.x + (DOCK.w - 4 * ICON) / 5 * (i + 1) + ICON * i, y: DOCK.y + (DOCK.h - ICON) / 2 });
