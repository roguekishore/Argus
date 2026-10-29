// Shared film caption: one short line per chapter, top-left of the frame, Archivo light condensed.
// Letters rise and fade in with a stagger; the previous line rises and fades out. Mirrors `ProjectName`
// in Work.tsx (333 / 133 ms, 150 + c·18 ms) and the work index's `--ease-text-in` / `--ease-text-out`.
//
// Usage inside a film's draw():
//   const CAPTIONS: CaptionTrack = { lines: [...], starts: [0, 10, 20], color: INK };
//   drawCaption(p, t, view, CAPTIONS);
import { clamp01, css } from "./kit";
export const SANS = '"Archivo Variable", "Archivo", ui-sans-serif, system-ui, sans-serif';
if (typeof document !== "undefined" && document.fonts) {
    // canvas text does not always trigger a webfont load on its own
    void document.fonts.load(`300 26px ${SANS}`).catch(() => { });
}
/** CSS cubic-bezier. */
export function cubicBezier(p1x, p1y, p2x, p2y) {
    return (u) => {
        if (u <= 0)
            return 0;
        if (u >= 1)
            return 1;
        let s = u;
        for (let k = 0; k < 8; k++) {
            const o = 1 - s;
            const x = 3 * p1x * o * o * s + 3 * p2x * o * s * s + s * s * s - u;
            const dx = 3 * p1x * o * (o - 2 * s) + 3 * p2x * s * (2 * o - s) + 3 * s * s;
            if (Math.abs(dx) < 1e-6)
                break;
            s -= x / dx;
        }
        const o = 1 - s;
        return 3 * p1y * o * o * s + 3 * p2y * o * s * s + s * s * s;
    };
}
export const easeTextIn = cubicBezier(0, 0, 0, 1);
export const easeTextOut = cubicBezier(0.75, 0, 0.85, 1);
const CAP_PAD = 24;
const CAP_SIZE = 26;
const CAP_LH = 42;
const CAP_SHIFT = CAP_SIZE * 1.15;
const TEXT_IN = 0.333;
const TEXT_OUT = 0.133;
const TEXT_DELAY = 0.15;
const TEXT_STAGGER = 0.018;
function captionLine(p, text, x, baseY, clipW, col, role, dt) {
    const c = p.ctx;
    c.save();
    c.font = `300 ${CAP_SIZE}px ${SANS}`;
    if ("fontStretch" in c)
        c.fontStretch = "condensed";
    c.textAlign = "left";
    c.textBaseline = "alphabetic";
    // the clip reaches below the baseline so descenders (g, y, p) aren't cut
    c.beginPath();
    c.rect(x, baseY - CAP_LH * 0.8, clipW, CAP_LH * 1.3);
    c.clip();
    let cx = x;
    for (let k = 0; k < text.length; k++) {
        const ch = text[k];
        let dy = 0;
        let a = 1;
        if (role === "out") {
            const u = easeTextOut(clamp01(dt / TEXT_OUT));
            dy = -u * CAP_SHIFT;
            a = 1 - u;
        }
        else if (role === "in") {
            const u = easeTextIn(clamp01((dt - TEXT_DELAY - k * TEXT_STAGGER) / TEXT_IN));
            dy = (1 - u) * CAP_SHIFT;
            a = u;
        }
        c.fillStyle = css(col, a);
        c.fillText(ch, cx, baseY + dy);
        cx += c.measureText(ch).width;
    }
    c.restore();
}
/** Draw the caption for time `t`. Call outside any camera transform so it stays pinned to the frame. */
export function drawCaption(p, t, view, track) {
    const { lines, starts, color, loopAt } = track;
    let i, t0, prev;
    if (loopAt !== undefined && t >= loopAt) {
        i = 0;
        t0 = loopAt;
        prev = lines[lines.length - 1];
    }
    else {
        i = starts.length - 1;
        while (i > 0 && t < starts[i])
            i--;
        t0 = starts[i];
        prev = i > 0 ? lines[i - 1] : null;
    }
    const dt = t - t0;
    const x = view.x0 + CAP_PAD;
    const baseY = view.y0 + CAP_PAD + CAP_SIZE;
    const clipW = Math.max(200, view.x1 - view.x0 - CAP_PAD * 2);
    const line = lines[i];
    const inDone = TEXT_DELAY + Math.max(0, line.length - 1) * TEXT_STAGGER + TEXT_IN;
    if (prev && dt < inDone + 0.02) {
        if (dt < TEXT_OUT + 0.02)
            captionLine(p, prev, x, baseY, clipW, color, "out", dt);
        captionLine(p, line, x, baseY, clipW, color, "in", dt);
    }
    else
        captionLine(p, line, x, baseY, clipW, color, "idle", 0);
}
