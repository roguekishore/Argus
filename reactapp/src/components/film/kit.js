// Shared toolkit for the project films: easing, colour and a small canvas painter.
// Every film draws on a virtual 1600×1000 stage; the player fits it to the frame.
export const VW = 1600;
export const VH = 1000;
export const CX = VW / 2;
export const PI = Math.PI;
export const clamp01 = (x) => Math.max(0, Math.min(1, x));
export const seg = (t, a, b) => clamp01((t - a) / (b - a));
export const easeCubic = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
export const easeOutCubic = (x) => 1 - Math.pow(1 - x, 3);
export const easeSine = (x) => 0.5 - 0.5 * Math.cos(PI * x);
export const easeOutQuad = (x) => 1 - (1 - x) * (1 - x);
/** 0 → 1 → 0 over [a, b]. */
export const bump = (t, a, b) => Math.sin(PI * seg(t, a, b));
export const lerp = (a, b, p) => a + (b - a) * p;
export const mix = (a, b, p) => p <= 0 ? a : p >= 1 ? b : [a[0] + (b[0] - a[0]) * p, a[1] + (b[1] - a[1]) * p, a[2] + (b[2] - a[2]) * p];
export const css = (c, a = 1) => `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a})`;
export const hex = (h) => {
    const n = parseInt(h.replace("#", ""), 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};
/** Monochrome steps between the ground and the ink, for tracks, outlines and idle shapes. */
export function tones(ground, ink) {
    return {
        edge: mix(ground, ink, 0.14),
        idle: mix(ground, ink, 0.22),
        lock: mix(ground, ink, 0.34),
        grey: mix(ground, ink, 0.55),
    };
}
export class Painter {
    constructor(ctx) {
        this.ctx = ctx;
    }
    rrPath(x, y, w, h, r) {
        const c = this.ctx;
        r = Math.max(0, Math.min(r, w / 2, h / 2));
        c.beginPath();
        c.moveTo(x + r, y);
        c.arcTo(x + w, y, x + w, y + h, r);
        c.arcTo(x + w, y + h, x, y + h, r);
        c.arcTo(x, y + h, x, y, r);
        c.arcTo(x, y, x + w, y, r);
        c.closePath();
    }
    rrect(x, y, w, h, r, col, a = 1) {
        if (a <= 0 || w <= 0 || h <= 0)
            return;
        this.ctx.fillStyle = css(col, a);
        this.rrPath(x, y, w, h, r);
        this.ctx.fill();
    }
    rstroke(x, y, w, h, r, col, width, a = 1) {
        if (a <= 0)
            return;
        this.ctx.strokeStyle = css(col, a);
        this.ctx.lineWidth = width;
        this.rrPath(x, y, w, h, r);
        this.ctx.stroke();
    }
    line(x1, y1, x2, y2, col, width, a = 1) {
        if (a <= 0)
            return;
        const c = this.ctx;
        c.strokeStyle = css(col, a);
        c.lineWidth = width;
        c.lineCap = "round";
        c.beginPath();
        c.moveTo(x1, y1);
        c.lineTo(x2, y2);
        c.stroke();
    }
    arc(x, y, r, from, sweep, col, width, a = 1) {
        if (a <= 0 || r <= 0)
            return;
        const c = this.ctx;
        c.strokeStyle = css(col, a);
        c.lineWidth = width;
        c.lineCap = "round";
        c.beginPath();
        c.arc(x, y, r, from, from + sweep);
        c.stroke();
    }
    disc(x, y, r, col, a = 1) {
        if (a <= 0 || r <= 0)
            return;
        const c = this.ctx;
        c.fillStyle = css(col, a);
        c.beginPath();
        c.arc(x, y, r, 0, PI * 2);
        c.fill();
    }
    text(s, x, y, o) {
        const a = o.a ?? 1;
        if (a <= 0)
            return;
        const c = this.ctx;
        const fam = o.font === "mono" ? '"Geist Mono Variable", ui-monospace, monospace' : '"Archivo Variable", ui-sans-serif, sans-serif';
        c.font = `${o.weight ?? (o.font === "mono" ? 400 : 300)} ${o.size}px ${fam}`;
        if ("fontStretch" in c)
            c.fontStretch = o.condensed ? "condensed" : "normal";
        if ("letterSpacing" in c)
            c.letterSpacing = `${o.track ?? 0}px`;
        c.textAlign = o.align ?? "left";
        c.textBaseline = o.baseline ?? "alphabetic";
        c.fillStyle = css(o.col, a);
        c.fillText(s, x, y);
        if ("fontStretch" in c)
            c.fontStretch = "normal";
        if ("letterSpacing" in c)
            c.letterSpacing = "0px";
        c.textAlign = "left";
        c.textBaseline = "alphabetic";
    }
    /** Background dot grid. `lit` returns extra alpha (0..1) for a dot, e.g. a spotlight or ripple. */
    dots(view, ink, base, lit, litCol) {
        const c = this.ctx;
        const gap = 40;
        for (let y = Math.floor(view.y0 / gap) * gap; y < view.y1; y += gap) {
            for (let x = Math.floor(view.x0 / gap) * gap; x < view.x1; x += gap) {
                const extra = lit ? lit(x, y) : 0;
                c.fillStyle = extra > 0.005 && litCol ? css(litCol, Math.min(base + extra, base + 0.22)) : css(ink, base);
                c.fillRect(x - 1.5, y - 1.5, 3, 3);
            }
        }
    }
}
/** A ring sweeping outward through the dot grid after an event at time `t0`. */
export function ripple(t, t0, ex, ey, x, y) {
    const dt = t - t0;
    if (dt < 0 || dt > 1.4)
        return 0;
    const d = Math.hypot(x - ex, y - ey);
    return 0.12 * Math.max(0, 1 - Math.abs(d - easeOutCubic(dt / 1.4) * 800) / 50) * (1 - dt / 1.4);
}
