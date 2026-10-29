// Argus: one pothole complaint, from report to closure.
// Report (web or WhatsApp) → Triage (AI: dept, priority, SLA; 500 m duplicate → upvote) →
// Assign (IN_PROGRESS, SLA clock) → Escalate (>1 day L1 dept head, >3 days L2 commissioner) →
// Resolve (proof required) → Dispute (stays RESOLVED, dept head reopens, 0.75 × SLA) → Close (citizen only).
import { PI, bump, clamp01, css, easeCubic as ease, easeOutCubic as easeOut, hex, lerp, mix, ripple, seg, tones, } from "./kit";
import { drawCaption } from "./captions";
/* ───────────────────────────── palette ───────────────────────────── */
// Black, white and one magenta. Magenta means "needs attention" (overdue, escalated, the Eye, a dispute);
// white means done (resolved, closed); an outline means in progress.
const GROUND = hex("#0c0c0e");
const INK = hex("#f4f4f5");
const MAG = hex("#ff3db8");
const BLACK = [0, 0, 0];
const ROAD = mix(GROUND, INK, 0.07);
const HOLE = mix(GROUND, BLACK, 0.75);
const { edge: EDGE, idle: IDLE, lock: LOCK, grey: GREY } = tones(GROUND, INK);
const MAG_TXT = mix(MAG, GROUND, 0.3); // magenta text on the white card
/* ───────────────────────────── layout ───────────────────────────── */
const LOOP = 68;
const DAY = 1.2; // film seconds per calendar day
const RANGES = [[0, 8], [8, 18], [18, 26], [26, 38], [38, 46], [46, 58], [58, 66]];
const NAMES = ["Report", "Triage", "Assign", "Escalate", "Resolve", "Dispute", "Close"];
const CAPS = [
    "A citizen reports a pothole.", "AI reads it and routes it.", "The clock starts on Roads.", "Late? It climbs on its own.",
    "Fixed, with photo proof.", "Not fixed? The citizen pushes back.", "The citizen confirms the fix.",
];
const EYE = { x: 700, y: 150 };
const POT = { x: 470, y: 804, rx: 64, ry: 17 };
const PHONE_SLOT = { x: 330, y: 470 };
const TRI = { x: 640, y: 320 };
const SLOT = [{ x: 1240, y: 740 }, { x: 1240, y: 540 }, { x: 1240, y: 340 }];
const FLOOR = [820, 620, 420];
const FOOT_Y = 718; // citizens stand on the kerb
const OFFICE_X = 920;
const PIN1 = { x: 470, y: 752 }, PIN2 = { x: 560, y: 760 };
const CW = 7.8; // Geist Mono 13 px advance
const SUB_X = 130;
const CARD_W = 360, CARD_H = 140;
// [t, x, y] of the six ripples (dot grid)
const RIP = [
    [9.6, EYE.x, EYE.y], [17.4, TRI.x, TRI.y], [34.4, SLOT[2].x, SLOT[2].y],
    [44.2, SLOT[0].x, SLOT[0].y], [51.6, SLOT[1].x, SLOT[1].y], [61.3, PHONE_SLOT.x, PHONE_SLOT.y],
];
/** Chained moves: each segment starts where the last one ended; curved by `arc`, optional walk cycles. */
class Track {
    constructor(x0, y0, s0) {
        this.x0 = x0;
        this.y0 = y0;
        this.s0 = s0;
        this.g = [];
        this.lx = x0;
        this.ly = y0;
        this.ls = s0;
    }
    add(t0, d, x, y, s, arc = 0, cyc = 0) {
        this.g.push({ t0, t1: t0 + d, ax: this.lx, ay: this.ly, as: this.ls, bx: x, by: y, bs: s, arc, cyc });
        this.lx = x;
        this.ly = y;
        this.ls = s;
        return this;
    }
    at(t, o) {
        const g = this.g;
        let i = g.length - 1;
        while (i >= 0 && g[i].t0 > t)
            i--;
        if (i < 0) {
            o.x = this.x0;
            o.y = this.y0;
            o.s = this.s0;
            o.q = 0;
            o.w = 0;
            o.amp = 0;
            return o;
        }
        const k = g[i];
        const q = seg(t, k.t0, k.t1), m = ease(q);
        let x = lerp(k.ax, k.bx, m), y = lerp(k.ay, k.by, m);
        if (k.arc) {
            const dx = k.bx - k.ax, dy = k.by - k.ay, L = Math.hypot(dx, dy) || 1;
            const b = k.arc * Math.sin(PI * m);
            x += (-dy / L) * b;
            y += (dx / L) * b;
        }
        o.x = x;
        o.y = y;
        o.s = lerp(k.as, k.bs, m);
        o.q = q;
        o.w = k.cyc * m;
        o.amp = q > 0 && q < 1 && k.cyc > 0 ? Math.sqrt(Math.sin(PI * q)) : 0;
        return o;
    }
}
/** One-off curved flight (chips, proofs, the mini card). */
function fly(t, t0, t1, x0, y0, x1, y1, arc, o) {
    const q = seg(t, t0, t1), m = ease(q);
    const dx = x1 - x0, dy = y1 - y0, L = Math.hypot(dx, dy) || 1;
    const b = arc * Math.sin(PI * m);
    o.x = x0 + dx * m - (dy / L) * b;
    o.y = y0 + dy * m + (dx / L) * b;
    o.q = q;
    o.s = 1;
    o.w = 0;
    o.amp = 0;
    return o;
}
const A_PHONE = { x: 329, y: 604 }; // citizen A's raised phone
const B_PHONE = { x: 666, y: 604 };
const cardT = new Track(A_PHONE.x, A_PHONE.y, 0)
    .add(5.0, 1.2, PHONE_SLOT.x, PHONE_SLOT.y, 0.6, 30)
    .add(8.4, 1.2, TRI.x, TRI.y, 1, -60)
    .add(18.4, 1.2, SLOT[0].x, SLOT[0].y, 1, -70)
    .add(29.8, 0.2, SLOT[0].x, SLOT[0].y + 12, 1)
    .add(30.0, 1.1, SLOT[1].x, SLOT[1].y, 1, 40)
    .add(33.1, 0.2, SLOT[1].x, SLOT[1].y + 12, 1)
    .add(33.3, 1.1, SLOT[2].x, SLOT[2].y, 1, -70)
    .add(50.0, 1.1, SLOT[1].x, SLOT[1].y, 1, 50)
    .add(52.4, 1.0, SLOT[0].x, SLOT[0].y, 1, -40)
    .add(58.4, 1.4, PHONE_SLOT.x, PHONE_SLOT.y, 0.6, -80)
    .add(66.0, 1.2, A_PHONE.x, A_PHONE.y, 0, 30);
const aT = new Track(200, FOOT_Y, 1).add(0.6, 2.2, 300, FOOT_Y, 1, 0, 2).add(66.0, 1.6, 200, FOOT_Y, 1, 0, 2);
const bT = new Track(60, FOOT_Y, 1).add(13.4, 1.8, 640, FOOT_Y, 1, 0, 5).add(66.2, 1.6, 60, FOOT_Y, 1, 0, 5);
const wT = new Track(OFFICE_X, FLOOR[0], 1).add(38.6, 2.8, 540, FLOOR[0], 1, 0, 4).add(59.0, 2.6, OFFICE_X, FLOOR[0], 1, 0, 4);
const idx = (tab, t) => {
    let i = tab.length - 1;
    while (i >= 0 && tab[i].t > t)
        i--;
    return i;
};
const PILLS = [
    { t: 5.0, v: "FILED" }, { t: 19.8, v: "IN PROGRESS" }, { t: 28.4, v: "OVERDUE" }, { t: 31.0, v: "ESCALATED · L1" },
    { t: 34.3, v: "ESCALATED · L2" }, { t: 44.2, v: "RESOLVED" }, { t: 51.6, v: "REOPENED" }, { t: 52.2, v: "IN PROGRESS" },
    { t: 56.0, v: "RESOLVED" }, { t: 61.3, v: "CLOSED" }, { t: 67.0, v: "FILED" },
];
const PILL_STYLE = {
    FILED: { fill: GREY, txt: GROUND, ring: 0 },
    "IN PROGRESS": { fill: INK, txt: GROUND, ring: 1 },
    OVERDUE: { fill: MAG, txt: GROUND, ring: 0 },
    "ESCALATED · L1": { fill: MAG, txt: GROUND, ring: 0 },
    "ESCALATED · L2": { fill: MAG, txt: GROUND, ring: 0 },
    RESOLVED: { fill: GROUND, txt: INK, ring: 0 },
    REOPENED: { fill: MAG, txt: GROUND, ring: 0 },
    CLOSED: { fill: GROUND, txt: INK, ring: 0 },
};
const pillW = (v) => v.length * 7.3 + 28 + (v === "CLOSED" ? 14 : 0);
const SUB_PRI = [{ t: 12.2, v: "MEDIUM" }, { t: 31.0, v: "HIGH" }, { t: 34.3, v: "CRITICAL" }];
const SUB_SLA = [{ t: 12.6, v: "7 DAYS" }, { t: 51.6, v: "6 DAYS" }];
const SUB_RESET = 67.2;
const COUNT = [
    { t: 19.8, v: "0/7" },
    ...[1, 2, 3, 4, 5, 6, 7].map((n) => ({ t: 20 + DAY * n, v: `${n}/7` })),
    { t: 29.6, v: "+1" }, { t: 30.8, v: "+2" }, { t: 32.0, v: "+3" }, { t: 33.2, v: "+4" }, { t: 34.4, v: "+5" },
    { t: 44.2, v: "" },
    { t: 51.6, v: "0/6" }, { t: 53.6, v: "1/6" }, { t: 54.8, v: "2/6" },
    { t: 56.0, v: "" }, { t: 67.0, v: "" },
];
// audit dots: [t, kind] kinds: 0 create, 1 assignment, 2 state, 3 escalation, 4 dispute, 5 accept
const DOTS = [
    [5.8, 0], [12.6, 1], [19.8, 2], [31.1, 3], [34.4, 3], [44.2, 2], [49.6, 4], [51.6, 2], [56.0, 2], [61.3, 5],
];
const DOT_COL = [GREY, IDLE, LOCK, MAG, MAG, GROUND];
const ECHOES = [
    { t: 4.2, x: POT.x, y: POT.y, r: 74, col: MAG },
    { t: 43.0, x: POT.x, y: POT.y, r: 74, col: INK },
    { t: 55.0, x: POT.x, y: POT.y, r: 78, col: INK },
];
/* ───────────────────────────── derived scalar tracks ───────────────────────────── */
const pulse = (t, a0, a1, b0, b1) => seg(t, a0, a1) * (1 - seg(t, b0, b1));
const act0 = (t) => Math.max(pulse(t, 19.0, 19.8, 30.0, 30.6), pulse(t, 37.2, 37.8, 61.6, 62.4));
const act1 = (t) => Math.max(pulse(t, 30.7, 31.1, 33.2, 33.8), pulse(t, 50.8, 51.2, 52.4, 52.9));
const act2 = (t) => pulse(t, 34.0, 34.4, 36.5, 37.1);
// floors stay lit while escalated (dim after the fix, reset on reopen)
const warnFloor = (t, at) => seg(t, at, at + 0.3) * (1 - seg(t, 51.6, 52.0)) * (1 - 0.5 * seg(t, 44.2, 44.8));
const kneel = (t) => Math.max(seg(t, 41.5, 42.0) * (1 - seg(t, 43.2, 43.8)), seg(t, 53.5, 54.0) * (1 - seg(t, 55.0, 55.6)));
function potState(t, o) {
    let pa = ease(seg(t, 41.6, 43.0));
    pa -= 0.45 * ease(seg(t, 46.6, 48.0));
    pa += 0.45 * ease(seg(t, 53.6, 55.0));
    const back = 1 - ease(seg(t, 66.2, 67.4));
    o.patch = pa * back;
    o.crack = ease(seg(t, 46.6, 48.0)) * (1 - ease(seg(t, 54.0, 54.8)));
    o.thick = ease(seg(t, 53.6, 55.0)) * back;
    return o;
}
function ringRem(t) {
    if (t < 20)
        return 1;
    if (t < 28.4)
        return 1 - (t - 20) / (7 * DAY);
    if (t < 51.6)
        return 0;
    if (t < 52.4)
        return easeOut(seg(t, 51.6, 52.4));
    if (t < SUB_RESET)
        return 1 - (2 / 6) * seg(t, 52.4, 52.4 + 2 * DAY);
    return 1;
}
function ringAlpha(t) {
    if (t < 12.6)
        return 0;
    if (t < 44.2)
        return seg(t, 12.6, 13.0);
    if (t < 51.6)
        return 1 - 0.65 * seg(t, 44.2, 44.8);
    if (t < 56.0)
        return lerp(0.35, 1, seg(t, 51.6, 52.0));
    if (t < SUB_RESET)
        return 1 - 0.65 * seg(t, 56.0, 56.6);
    return 0;
}
/* ───────────────────────────── small painters ───────────────────────────── */
function tickMark(p, x, y, s, q, col, a = 1) {
    if (q <= 0 || a <= 0)
        return;
    const px = [x - 0.26 * s, x - 0.07 * s, x + 0.27 * s], py = [y + 0.02 * s, y + 0.2 * s, y - 0.2 * s];
    const l1 = Math.hypot(px[1] - px[0], py[1] - py[0]);
    const l2 = Math.hypot(px[2] - px[1], py[2] - py[1]);
    const d = q * (l1 + l2);
    const c = p.ctx;
    c.strokeStyle = css(col, a);
    c.lineWidth = Math.max(2, s * 0.11);
    c.lineCap = "round";
    c.lineJoin = "round";
    c.beginPath();
    c.moveTo(px[0], py[0]);
    if (d <= l1)
        c.lineTo(lerp(px[0], px[1], d / l1), lerp(py[0], py[1], d / l1));
    else {
        c.lineTo(px[1], py[1]);
        const f = (d - l1) / l2;
        c.lineTo(lerp(px[1], px[2], f), lerp(py[1], py[2], f));
    }
    c.stroke();
}
/** A proof photo: pin dot + tick on a small rounded rect; `fold` unfolds it from its bottom edge. */
function photo(p, x, y, col, a, fold = 1) {
    if (a <= 0.01 || fold <= 0.02)
        return;
    const w = 26, h = 32 * fold;
    p.rrect(x - w / 2, y + 16 - h, w, h, 6, col, a);
    if (fold > 0.6) {
        p.disc(x, y - 7, 3.5, GROUND, a * seg(fold, 0.6, 1));
        tickMark(p, x, y + 7, 18, seg(fold, 0.7, 1), GROUND, a);
    }
}
function pin(p, x, y, col, a, s) {
    if (a <= 0)
        return;
    p.disc(x, y - 14 * s, 4.5 * s, col, a);
    p.line(x, y - 9 * s, x, y, col, 2.5 * s, a);
}
function bubble(p, x, y, sc, a) {
    if (sc <= 0.02 || a <= 0)
        return;
    const c = p.ctx;
    c.save();
    c.translate(x, y);
    c.scale(sc, sc);
    p.rstroke(-34, -28, 68, 54, 18, INK, 3.5, a);
    p.line(-22, 24, -34, 40, INK, 3.5, a);
    p.line(-34, 40, -10, 26, INK, 3.5, a);
    p.line(-16, -8, 16, -8, GREY, 3, a);
    p.line(-16, 4, 6, 4, GREY, 3, a);
    c.restore();
}
const FG = { s: 1, col: INK, a: 1, walk: 0, amp: 0, lean: 0, dip: 0, hat: false, desk: false, phone: 0, face: 1, br: 0 };
const breath = (t, ph) => 1.5 * Math.sin((2 * PI * 30 * t) / LOOP + ph);
function figure(p, x, footY, o) {
    const a = o.a;
    if (a <= 0.01)
        return;
    const c = p.ctx, s = o.s;
    const walking = o.walk > 0 && o.amp > 0;
    const sw = walking ? Math.sin(2 * PI * o.walk) * 8 * s * o.amp : 0;
    const bob = walking ? -2 * s * Math.abs(Math.sin(2 * PI * o.walk)) * o.amp : 0;
    const top = bob + o.br + o.dip;
    const hipY = footY - 34 * s + o.dip;
    p.line(x - 7 * s, hipY, x - 7 * s + sw, footY, o.col, 6 * s, a);
    p.line(x + 7 * s, hipY, x + 7 * s - sw, footY, o.col, 6 * s, a);
    c.save();
    c.translate(x, hipY);
    c.rotate(o.lean * o.face);
    c.translate(-x, -hipY);
    const headY = footY - 106 * s + top;
    p.rrect(x - 15 * s, footY - 86 * s + top, 30 * s, 52 * s, 14 * s, o.col, a);
    p.disc(x, headY, 15 * s, o.col, a);
    if (o.hat) {
        c.fillStyle = css(INK, a);
        c.beginPath();
        c.arc(x, headY - 1 * s, 17 * s, PI, 2 * PI);
        c.closePath();
        c.fill();
        p.rrect(x - 21 * s, headY - 3 * s, 42 * s, 5 * s, 2.5 * s, INK, a);
        p.line(x - 16 * s, headY + 4.5 * s, x + 16 * s, headY + 4.5 * s, GROUND, 2 * s, a);
    }
    const ph = o.phone;
    const hx = x + (16 + 10 * ph) * s * o.face, hy = lerp(footY - 48 * s, footY - 100 * s, ph) + top;
    p.line(x + 12 * s * o.face, footY - 76 * s + top, hx, hy, o.col, 5 * s, a);
    if (ph > 0.01)
        p.rrect(hx + 3 * s * o.face - 8 * s, hy - 23 * s, 16 * s, 26 * s, 4 * s, MAG, a * ph);
    c.restore();
    if (o.desk)
        p.rrect(x - 36 * s, footY - 40 * s, 72 * s, 40 * s, 8 * s, IDLE, a);
}
function setFig(s, col, a, walk, amp, lean, dip, hat, desk, phone, face, br) {
    FG.s = s;
    FG.col = col;
    FG.a = a;
    FG.walk = walk;
    FG.amp = amp;
    FG.lean = lean;
    FG.dip = dip;
    FG.hat = hat;
    FG.desk = desk;
    FG.phone = phone;
    FG.face = face;
    FG.br = br;
    return FG;
}
const PA = { x: 0, y: 0, s: 1, q: 0, w: 0, amp: 0 };
const PB = { x: 0, y: 0, s: 1, q: 0, w: 0, amp: 0 };
const PW = { x: 0, y: 0, s: 1, q: 0, w: 0, amp: 0 };
const PC = { x: 0, y: 0, s: 1, q: 0, w: 0, amp: 0 };
const PF = { x: 0, y: 0, s: 1, q: 0, w: 0, amp: 0 };
const POTS = { patch: 0, crack: 0, thick: 0 };
const phoneA = (t) => Math.max(seg(t, 3.6, 4.0) * (1 - seg(t, 6.2, 6.6)), seg(t, 48.2, 48.6) * (1 - seg(t, 49.8, 50.2)));
const phoneB = (t) => seg(t, 15.3, 15.6) * (1 - seg(t, 17.4, 17.8));
function drawPeople(p, t) {
    const a0 = act0(t), a1 = act1(t), a2 = act2(t);
    // office: commissioner, dept head, field worker
    setFig(1.12 * (1 + 0.1 * bump(t, 34.2, 34.7)), mix(GREY, INK, a2), 1, 0, 0, 0, 0, false, true, 0, 1, breath(t, 2));
    figure(p, OFFICE_X, FLOOR[2], FG);
    setFig(1 + 0.1 * bump(t, 30.9, 31.4) + 0.1 * bump(t, 51.4, 51.9), mix(GREY, INK, a1), 1, 0, 0, 0, 0, false, true, 0, 1, breath(t, 1));
    figure(p, OFFICE_X, FLOOR[1], FG);
    wT.at(t, PW);
    const k = kneel(t);
    const slouch = 0.12 * (1 - seg(t, 18.4, 19.6)) + 0.12 * seg(t, 62.4, 63.4);
    const faceW = t > 38.5 && t < 59.0 ? -1 : 1;
    setFig(1, mix(GREY, INK, a0), 1, PW.w, PW.amp, 0.7 * k + slouch, 14 * k, true, false, 0, faceW, breath(t, 0));
    figure(p, PW.x, PW.y, FG);
    // citizens
    aT.at(t, PA);
    const st = seg(t, 2.8, 3.4);
    const lookDown = Math.sin(PI * seg(t, 46.6, 48.2));
    setFig(1, INK, 1, PA.w, PA.amp, 0.15 * Math.sin(PI * st) + 0.18 * lookDown, 8 * Math.sin(PI * st), false, false, phoneA(t), t >= 66 ? -1 : 1, breath(t, 3));
    figure(p, PA.x, PA.y, FG);
    bT.at(t, PB);
    const ba = seg(t, 13.4, 13.8) * (1 - seg(t, 67.4, 67.9));
    setFig(1, INK, ba, PB.w, PB.amp, 0, 0, false, false, phoneB(t), t >= 66 ? -1 : 1, breath(t, 4));
    figure(p, PB.x, PB.y, FG);
}
/* ───────────────────────────── the street ───────────────────────────── */
const BUILDINGS = [
    [140, 570, 110, 150], [270, 500, 90, 220], [380, 545, 130, 175], [530, 470, 100, 250], [650, 590, 100, 130],
];
const WINDOWS = [];
BUILDINGS.forEach(([bx, by, bw, bh], bi) => {
    const cols = Math.floor((bw - 12) / 30), rows = Math.floor((bh - 24) / 36);
    for (let j = 0; j < rows; j++) {
        for (let i = 0; i < cols; i++) {
            if ((i * 5 + j * 3 + bi * 2) % 4 === 0)
                continue;
            WINDOWS.push(bx + 14 + i * 30, by + 18 + j * 36);
        }
    }
});
function drawHole(p, cx, cy, rx, ry, st, outer) {
    const c = p.ctx, k = rx / POT.rx;
    c.fillStyle = css(HOLE, 1);
    c.beginPath();
    c.ellipse(cx, cy, rx, ry, 0, 0, PI * 2);
    c.fill();
    c.strokeStyle = css(LOCK, 1);
    c.lineWidth = 2 * Math.max(0.6, k);
    c.stroke();
    if (outer) {
        const ca = 1 - 0.6 * st.patch;
        p.line(cx - 1.1 * rx, cy - 0.2 * ry, cx - 1.4 * rx, cy - 0.6 * ry, LOCK, 2, ca);
        p.line(cx + 1.05 * rx, cy + 0.1 * ry, cx + 1.38 * rx, cy + 0.4 * ry, LOCK, 2, ca);
        p.line(cx - 0.4 * rx, cy - 1.05 * ry, cx - 0.5 * rx, cy - 1.9 * ry, LOCK, 2, ca);
    }
    if (st.patch > 0.01) {
        const pa = st.patch, th = st.thick * 4 * k;
        const pw = rx * 0.92 * (0.25 + 0.75 * pa) + th, ph = ry * 0.8 * (0.25 + 0.75 * pa) + th * 0.6;
        p.rrect(cx - pw, cy - ph, pw * 2, ph * 2, lerp(ph, 6 * k, pa), GREY);
    }
    if (st.crack > 0.01) {
        const w = 2.5 * Math.max(0.6, k), cr = st.crack;
        const seg3 = [
            [-0.55, -0.1, -0.1, 0.55], [0.2, -0.6, 0.65, 0.2], [-0.25, 0.45, 0.3, 0.7],
        ];
        for (const [x0, y0, x1, y1] of seg3) {
            p.line(cx + x0 * rx, cy + y0 * ry, cx + lerp(x0, x1, cr) * rx, cy + lerp(y0, y1, cr) * ry, MAG, w);
        }
    }
}
function drawStreet(p, t) {
    for (const [bx, by, bw, bh] of BUILDINGS)
        p.rrect(bx, by, bw, bh, 10, EDGE);
    for (let i = 0; i < WINDOWS.length; i += 2)
        p.rrect(WINDOWS[i], WINDOWS[i + 1], 18, 18, 4, IDLE);
    // overflowing bin
    p.rrect(160, 696, 34, 24, 4, LOCK);
    p.disc(168, 694, 5, GREY);
    p.disc(178, 691, 5, GREY);
    p.disc(188, 695, 5, GREY);
    // kerb and road
    p.line(120, 720, 770, 720, LOCK, 3);
    p.rrect(120, 726, 650, 140, 12, ROAD);
    for (let x = 150; x < 760; x += 70)
        p.line(x, 796, x + 34, 796, IDLE, 4);
    // flickering streetlight
    p.line(700, 720, 700, 600, LOCK, 4);
    p.line(700, 600, 674, 600, LOCK, 4);
    p.disc(674, 606, 6, IDLE, 0.7 + 0.3 * Math.sin((2 * PI * 5 * t) / LOOP) * Math.sin((2 * PI * 3 * t) / LOOP + 1));
    // pothole
    potState(t, POTS);
    drawHole(p, POT.x, POT.y, POT.rx, POT.ry, POTS, true);
    // photo-snap, patch echoes
    for (const e of ECHOES) {
        const q = seg(t, e.t, e.t + 0.8);
        if (q > 0 && q < 1)
            p.arc(e.x, e.y, e.r * (0.55 + 0.45 * easeOut(q)), 0, PI * 2, e.col, 3, 0.8 * (1 - q));
    }
}
function drawPins(p, t) {
    const c = p.ctx;
    // pin 1 stays on the pothole until the citizen closes it
    const q1 = seg(t, 4.4, 4.9);
    if (q1 > 0) {
        const a = seg(t, 4.4, 4.6) * (1 - seg(t, 61.3, 61.8));
        pin(p, PIN1.x, PIN1.y - 46 * (1 - q1) * (1 - q1), MAG, a, 2.2);
    }
    // pin 2 (the duplicate) is caught by the 500 m ring, turns white, then merges away
    const q2 = seg(t, 15.3, 15.6);
    if (q2 > 0) {
        const a = seg(t, 15.3, 15.45) * (1 - seg(t, 17.0, 17.4));
        pin(p, PIN2.x, PIN2.y - 40 * (1 - q2) * (1 - q2), mix(MAG, INK, seg(t, 16.4, 16.6)), a, 2.2);
    }
    const rq = seg(t, 15.9, 16.6);
    if (rq > 0 && rq < 1) {
        c.save();
        c.beginPath();
        c.rect(120, 440, 650, 426);
        c.clip();
        p.arc(PIN1.x, PIN1.y, 100 * easeOut(rq), 0, PI * 2, INK, 2.5, 0.9 * (1 - 0.4 * rq));
        c.restore();
    }
}
/* ───────────────────────────── the office ───────────────────────────── */
function drawOffice(p, t) {
    const w1 = warnFloor(t, 31.0 - 0.2), w2 = warnFloor(t, 34.1);
    const wf = [0, w1, w2];
    const act = [act0(t), act1(t), act2(t)];
    const left = ["FIELD STAFF", "DEPT HEAD · ROADS", "COMMISSIONER"];
    for (let i = 0; i < 3; i++) {
        p.line(870, FLOOR[i], 1460, FLOOR[i], mix(LOCK, MAG, wf[i]), 3);
        p.text(left[i], 880, FLOOR[i] + 26, { size: 14, col: mix(GREY, INK, act[i]), font: "mono", track: 2, baseline: "middle" });
    }
    p.text("> 1 DAY LATE", 1460, FLOOR[1] + 26, { size: 14, col: mix(LOCK, MAG, w1), font: "mono", track: 2, align: "right", baseline: "middle" });
    p.text("> 3 DAYS LATE", 1460, FLOOR[2] + 26, { size: 14, col: mix(LOCK, MAG, w2), font: "mono", track: 2, align: "right", baseline: "middle" });
    // the order goes back down: a pulse along the tier edge
    const q = seg(t, 36.5, 37.6);
    if (q > 0 && q < 1) {
        const m = ease(q), y = lerp(FLOOR[2], FLOOR[0], m), a = Math.sin(PI * q);
        p.line(1476, FLOOR[2], 1476, FLOOR[0], MAG, 2, 0.25 * a);
        p.disc(1476, y, 7, MAG, a);
    }
}
/* ───────────────────────────── the hero card ───────────────────────────── */
function popText(p, s, x, y, a, sc, col, size, track = 0) {
    if (a <= 0.01)
        return;
    const c = p.ctx;
    c.save();
    c.translate(x, y);
    c.scale(sc, sc);
    p.text(s, 0, 0, { size, col, a, font: "mono", align: "center", baseline: "middle", track });
    c.restore();
}
function drawPill(p, t) {
    const i = idx(PILLS, t);
    if (i < 0)
        return;
    const cur = PILLS[i], prev = i > 0 ? PILLS[i - 1] : cur;
    const q = i > 0 ? seg(t, cur.t, cur.t + 0.25) : 1;
    const w = lerp(pillW(prev.v), pillW(cur.v), q);
    const fill = mix(PILL_STYLE[prev.v].fill, PILL_STYLE[cur.v].fill, q);
    const c = p.ctx, x0 = 130, cy = 94;
    c.save();
    c.translate(x0 + w / 2, cy);
    const pop = 1 + 0.15 * Math.sin(PI * q);
    c.scale(pop, pop);
    c.translate(-(x0 + w / 2), -cy);
    p.rrect(x0, 80, w, 28, 14, fill);
    const ring = lerp(PILL_STYLE[prev.v].ring, PILL_STYLE[cur.v].ring, q);
    if (ring > 0.01)
        p.rstroke(x0 + 1, 81, w - 2, 26, 13, GROUND, 1.8, ring);
    const off = (v) => (v === "CLOSED" ? 7 : 0);
    if (q < 1)
        p.text(prev.v, x0 + w / 2 + off(prev.v), cy, { size: 12, col: PILL_STYLE[prev.v].txt, a: 1 - q, font: "mono", align: "center", baseline: "middle", track: 1.5 });
    p.text(cur.v, x0 + w / 2 + off(cur.v), cy, { size: 12, col: PILL_STYLE[cur.v].txt, a: q, font: "mono", align: "center", baseline: "middle", track: 1.5 });
    if (cur.v === "CLOSED")
        tickMark(p, x0 + 17, cy, 15, seg(t, 61.3, 61.8), INK);
    c.restore();
}
function drawSub(p, t) {
    const tt = t < SUB_RESET ? t : -1;
    const y = 68, size = 13;
    const aw = 1 - seg(tt, 11.8, 12.05);
    if (aw > 0.01)
        p.text("WARD 12", SUB_X, y, { size, col: LOCK, a: aw, font: "mono", baseline: "middle" });
    const ad = seg(tt, 11.8, 12.05);
    if (ad > 0.01)
        popText(p, "ROADS", SUB_X + 2.5 * CW, y, ad, 1 + 0.2 * bump(tt, 11.8, 12.1), LOCK, size);
    // priority word (crossfades on every change)
    const ip = idx(SUB_PRI, tt);
    let lenNow = 0;
    if (ip >= 0) {
        const cur = SUB_PRI[ip], prev = ip > 0 ? SUB_PRI[ip - 1] : null;
        const q = seg(tt, cur.t, cur.t + 0.25);
        lenNow = lerp(prev ? prev.v.length : cur.v.length, cur.v.length, q);
        const px = SUB_X + 8 * CW;
        p.text("·", SUB_X + 6.5 * CW, y, { size, col: LOCK, a: q * (prev ? 1 : 1), font: "mono", align: "center", baseline: "middle" });
        if (prev)
            popText(p, prev.v, px + (prev.v.length * CW) / 2, y, 1 - q, 1, prev.v === "MEDIUM" ? LOCK : MAG_TXT, size);
        popText(p, cur.v, px + (cur.v.length * CW) / 2, y, q, 1 + 0.2 * bump(tt, cur.t, cur.t + 0.3), cur.v === "MEDIUM" ? LOCK : MAG_TXT, size);
    }
    const is = idx(SUB_SLA, tt);
    if (is >= 0 && ip >= 0) {
        const cur = SUB_SLA[is], prev = is > 0 ? SUB_SLA[is - 1] : null;
        const q = seg(tt, cur.t, cur.t + 0.25);
        const sx = SUB_X + (8 + lenNow + 3) * CW;
        p.text("·", sx - 1.5 * CW, y, { size, col: LOCK, a: q, font: "mono", align: "center", baseline: "middle" });
        if (prev)
            popText(p, prev.v, sx + 3 * CW, y, 1 - q, 1, LOCK, size);
        popText(p, cur.v, sx + 3 * CW, y, q, 1 + 0.2 * bump(tt, cur.t, cur.t + 0.3), LOCK, size);
    }
    else if (is >= 0) {
        const cur = SUB_SLA[is];
        popText(p, cur.v, SUB_X + 17 * CW + 3 * CW, y, seg(tt, cur.t, cur.t + 0.25), 1, LOCK, size);
    }
}
function drawRing(p, t) {
    const ra = ringAlpha(t);
    if (ra <= 0.01)
        return;
    const x = 334, y = 26, r = 13;
    const warn = t >= 28.4 && t < 51.6 ? seg(t, 28.4, 28.7) : 0;
    p.arc(x, y, r, 0, PI * 2, mix(EDGE, MAG, warn), 4, ra);
    const rem = ringRem(t);
    if (rem > 0.003)
        p.arc(x, y, r, -PI / 2, PI * 2 * rem, INK, 4, ra);
    const n = t >= 51.6 && t < SUB_RESET ? 6 : 7;
    for (let i = 0; i < n; i++) {
        const th = -PI / 2 + (i * PI * 2) / n, cs = Math.cos(th), sn = Math.sin(th);
        p.line(x + cs * (r - 5), y + sn * (r - 5), x + cs * (r + 5), y + sn * (r + 5), LOCK, 2, ra);
    }
    // day counter
    const i = idx(COUNT, t < SUB_RESET ? t : -1);
    if (i < 0)
        return;
    const cur = COUNT[i], prev = i > 0 ? COUNT[i - 1] : null;
    const q = seg(t, cur.t, cur.t + 0.25);
    const col = (v) => (v.startsWith("+") || (v === "7/7") ? MAG_TXT : LOCK);
    if (prev && prev.v)
        popText(p, prev.v, x, 58, 1 - q, 1, col(prev.v), 12);
    if (cur.v)
        popText(p, cur.v, x, 58, q, 1 + 0.25 * bump(t, cur.t, cur.t + 0.3), col(cur.v), 12);
}
function drawCard(p, cx, cy, sc, t) {
    if (sc < 0.02)
        return;
    const c = p.ctx;
    c.save();
    c.translate(cx - (CARD_W / 2) * sc, cy - (CARD_H / 2) * sc);
    c.scale(sc, sc);
    // overdue / escalated outline
    const wo = seg(t, 28.4, 28.8) * (1 - seg(t, 44.2, 44.8));
    if (wo > 0.01)
        p.rstroke(-12, -12, CARD_W + 24, CARD_H + 24, 26, MAG, 3, wo * (0.35 + 0.35 * (0.5 + 0.5 * Math.sin(t * 7))));
    p.rrect(0, 0, CARD_W, CARD_H, 18, INK);
    // photo thumb mirrors the street pothole
    p.rrect(16, 16, 98, 98, 12, ROAD);
    p.line(26, 56, 52, 56, IDLE, 3);
    p.line(78, 56, 104, 56, IDLE, 3);
    drawHole(p, 65, 86, 28, 9, POTS, false);
    p.text("Pothole", 130, 44, { size: 26, col: GROUND, weight: 500, baseline: "alphabetic" });
    drawSub(p, t);
    drawPill(p, t);
    // DISPUTE chip (status stays RESOLVED)
    const dq = seg(t, 48.8, 49.2) * (1 - seg(t, 51.6, 51.9));
    if (dq > 0.01) {
        const x = 130 + pillW("RESOLVED") + 8, pop = 1 + 0.12 * bump(t, 48.8, 49.3);
        c.save();
        c.translate(x + 34, 94);
        c.scale(pop, pop);
        p.rstroke(-34, -14, 68, 28, 14, MAG, 1.8, dq);
        p.text("DISPUTE", 0, 0, { size: 11, col: MAG_TXT, a: dq, font: "mono", align: "center", baseline: "middle", track: 1 });
        c.restore();
    }
    drawRing(p, t);
    // audit dots
    for (let i = 0; i < DOTS.length; i++) {
        const [te, kind] = DOTS[i];
        const g = easeOut(seg(t, te, te + 0.3));
        if (g <= 0 || t >= SUB_RESET)
            continue;
        const r = 4 * g * (1 + 0.5 * bump(t, te, te + 0.4));
        const dx = 130 + i * 13;
        if (kind === 4)
            p.rrect(dx - r, 126 - r, r * 2, r * 2, 2, MAG);
        else
            p.disc(dx, 126, r, DOT_COL[kind]);
    }
    // upvote badge
    const uq = easeOut(seg(t, 17.2, 17.6)) * (t < SUB_RESET ? 1 : 0);
    if (uq > 0.01) {
        const r = 14 * (uq + 0.25 * bump(t, 17.2, 17.7));
        p.disc(CARD_W, 0, r, MAG);
        p.text("+1", CARD_W, 0, { size: 12, col: GROUND, a: uq, font: "mono", align: "center", baseline: "middle", weight: 500 });
    }
    // proof photos: INK on the right edge, MAG counter-photo on the left
    if (t >= 44.2 && t < 52.4) {
        const q = seg(t, 51.6, 52.4);
        c.save();
        c.translate(50 * ease(q), 0);
        photo(p, 382, 30, INK, 1 - q);
        c.restore();
    }
    if (t >= 49.6 && t < 52.4) {
        const q = seg(t, 51.6, 52.2);
        photo(p, lerp(-22, 20, ease(q)), 30, MAG, 1, 1 - q);
    }
    if (t >= 56.2 && t < SUB_RESET)
        photo(p, 382, 30, INK, 1);
    c.restore();
}
/* ───────────────────────────── top band: caption, tag, the Eye ───────────────────────────── */
const BLINKS = [2.2, 21.9, 40.5, 57.0, 64.1];
const CHIPS = [
    { t0: 11.4, v: "ROADS", tx: SUB_X + 2.5 * CW },
    { t0: 11.8, v: "MEDIUM", tx: SUB_X + 11 * CW },
    { t0: 12.2, v: "7 DAYS", tx: SUB_X + 20 * CW },
];
const CAPTIONS = { lines: CAPS, starts: RANGES.map((r) => r[0]), color: INK };
function drawEye(p, t, lx, ly) {
    const c = p.ctx;
    const oa = ease(seg(t, 8.6, 9.6)) * (1 - ease(seg(t, 17.2, 18.0)));
    const k = 1 + 0.4 * oa;
    let blink = 0;
    for (const b of BLINKS)
        blink = Math.max(blink, bump(t, b, b + 0.3));
    const hw = 70 * k, hh0 = 21 * k, hh = Math.max(1.5, hh0 * (1 - 0.93 * blink));
    c.save();
    c.beginPath();
    c.moveTo(EYE.x - hw, EYE.y);
    c.quadraticCurveTo(EYE.x, EYE.y - 2 * hh, EYE.x + hw, EYE.y);
    c.quadraticCurveTo(EYE.x, EYE.y + 2 * hh, EYE.x - hw, EYE.y);
    c.closePath();
    c.fillStyle = css(ROAD, 1);
    c.fill();
    c.strokeStyle = css(LOCK, 1);
    c.lineWidth = 3;
    c.stroke();
    c.clip();
    const dx = lx - EYE.x, dy = ly - EYE.y, dl = Math.hypot(dx, dy) || 1;
    const off = Math.min(dl * 0.05, hw * 0.42);
    const ix = EYE.x + (dx / dl) * off, iy = EYE.y + (dy / dl) * off * 0.35;
    const r = hh0 * 0.8;
    const scan = bump(t, 11.2, 12.8) + bump(t, 10.0, 11.2) * 0.4;
    p.disc(ix, iy, r, mix(MAG, INK, bump(t, 28.4, 28.8)));
    p.disc(ix, iy, r * (0.36 + 0.14 * scan), GROUND);
    c.restore();
    return { x: ix, y: iy + hh0 * 0.4 };
}
function drawChips(p, t, iris) {
    for (const ch of CHIPS) {
        const q = seg(t, ch.t0, ch.t0 + 0.4);
        if (q <= 0 || q >= 1)
            continue;
        const tx = TRI.x - CARD_W / 2 + ch.tx, ty = TRI.y - CARD_H / 2 + 68;
        fly(t, ch.t0, ch.t0 + 0.4, iris.x, iris.y, tx, ty, ch.tx > SUB_X + 5 * CW ? -36 : 36, PC);
        const a = seg(q, 0, 0.15) * (1 - seg(q, 0.85, 1));
        const sc = 0.5 + 0.5 * easeOut(seg(q, 0, 0.3));
        const w = (ch.v.length * 7.3 + 16) * sc;
        p.rrect(PC.x - w / 2, PC.y - 11 * sc, w, 22 * sc, 11 * sc, MAG, a);
        p.text(ch.v, PC.x, PC.y, { size: 12 * sc, col: GROUND, a, font: "mono", align: "center", baseline: "middle" });
    }
}
/* ───────────────────────────── camera ───────────────────────────── */
// [in0, in1, out0, out1, zoom, anchor x, anchor y]: Escalate push-in, Dispute push-in
const SHOTS = [
    [28.5, 30.0, 36.0, 37.5, 0.07, 1170, 600],
    [49.5, 51.0, 53.5, 55.0, 0.05, 1170, 560],
];
function camera(t) {
    let w = 0, ax = 0, ay = 0;
    for (const [a0, a1, b0, b1, z, x, y] of SHOTS) {
        if (t <= a0 || t >= b1)
            continue;
        const wi = z * ease(seg(t, a0, a1)) * (1 - ease(seg(t, b0, b1)));
        w += wi;
        ax += x * wi;
        ay += y * wi;
    }
    if (w <= 0.0005)
        return null;
    return { z: 1 + w, ax: ax / w, ay: ay / w };
}
/* ───────────────────────────── draw ───────────────────────────── */
function draw(p, t, view) {
    const c = p.ctx;
    cardT.at(t, PF);
    const cardX = PF.x, cardY = PF.y, cardS = PF.s;
    // dot-grid spotlight follows the hero card and whoever is acting
    let fx = cardX, fy = cardY, fw = 1;
    aT.at(t, PA);
    bT.at(t, PB);
    wT.at(t, PW);
    const wa = pulse(t, 38.4, 38.8, 45.6, 46.0) + pulse(t, 53.2, 53.6, 55.8, 56.2);
    const aa = pulse(t, 0.4, 0.8, 7.4, 7.8) + pulse(t, 46.4, 46.8, 50.0, 50.4);
    const ba = pulse(t, 13.4, 13.8, 17.4, 17.8);
    fx += PW.x * wa + PA.x * aa + PB.x * ba;
    fy += (PW.y - 60) * wa + (PA.y - 60) * aa + (PB.y - 60) * ba;
    fw += wa + aa + ba;
    fx /= fw;
    fy /= fw;
    p.dots(view, INK, 0.07, (x, y) => {
        const f = Math.max(0, 1 - Math.hypot(x - fx, y - fy) / 320);
        let s = 0.12 * f * f;
        for (const r of RIP)
            s += ripple(t, r[0], r[1], r[2], x, y);
        return s;
    }, mix(INK, MAG, 0.6));
    const cam = camera(t);
    if (cam) {
        c.save();
        c.translate(cam.ax, cam.ay);
        c.scale(cam.z, cam.z);
        c.translate(-cam.ax, -cam.ay);
    }
    drawStreet(p, t);
    drawOffice(p, t);
    drawPins(p, t);
    drawPeople(p, t);
    // WhatsApp: the second channel pops beside the phone, then folds back into it
    const bq = easeOut(seg(t, 6.6, 7.0)), fq = ease(seg(t, 7.2, 7.6));
    if (bq > 0 && fq < 1) {
        const sc = 0.7 * (bq + 0.12 * bump(t, 6.6, 7.1)) * (1 - fq);
        const bx = lerp(410, A_PHONE.x, fq), by = lerp(588, A_PHONE.y, fq);
        bubble(p, bx, by, sc, 0.95);
        p.text("WHATSAPP", 410, 628, { size: 11, col: GREY, a: seg(t, 6.8, 7.0) * (1 - seg(t, 7.2, 7.4)), font: "mono", align: "center", baseline: "middle", track: 1.5 });
    }
    // points float up from the citizen
    for (const [t0, label] of [[6.4, "+10 PTS"], [62.0, "+20 PTS"]]) {
        const u = seg(t, t0, t0 + 0.8);
        if (u > 0 && u < 1)
            p.text(label, 300, 596 - 30 * easeOut(u), { size: 14, col: INK, a: seg(u, 0, 0.2) * (1 - seg(u, 0.6, 1)), font: "mono", align: "center", baseline: "middle", track: 1 });
    }
    drawCard(p, cardX, cardY, cardS, t);
    // flying proofs and the duplicate's mini card
    const f1 = seg(t, 43.2, 44.2);
    if (f1 > 0 && f1 < 1) {
        fly(t, 43.2, 44.2, 525, 764, SLOT[0].x + 202, SLOT[0].y - 40, -120, PC);
        photo(p, PC.x, PC.y, INK, 1);
    }
    const f2 = seg(t, 55.2, 56.2);
    if (f2 > 0 && f2 < 1) {
        fly(t, 55.2, 56.2, 525, 764, SLOT[0].x + 202, SLOT[0].y - 40, -120, PC);
        photo(p, PC.x, PC.y, INK, 1);
    }
    const f3 = seg(t, 48.6, 49.6);
    if (f3 > 0 && f3 < 1) {
        fly(t, 48.6, 49.6, 335, 610, SLOT[0].x - 202, SLOT[0].y - 40, -140, PC);
        photo(p, PC.x, PC.y, MAG, 1);
    }
    const mq = seg(t, 16.6, 17.4);
    if (mq > 0 && mq < 1) {
        fly(t, 16.6, 17.4, B_PHONE.x, B_PHONE.y, TRI.x, TRI.y, 60, PC);
        const s = lerp(0.3, 0.22, mq), a = 1 - seg(mq, 0.8, 1);
        c.save();
        c.translate(PC.x - (CARD_W / 2) * s, PC.y - (CARD_H / 2) * s);
        c.scale(s, s);
        p.rrect(0, 0, CARD_W, CARD_H, 18, INK, a);
        p.rrect(16, 16, 98, 98, 12, ROAD, a);
        p.rrect(130, 80, 86, 28, 14, GREY, a);
        c.restore();
    }
    // five stars: only the citizen can close
    const pips = seg(t, 60.2, 61.0) * 4;
    if (pips > 0 && t < SUB_RESET) {
        for (let i = 0; i < 5; i++) {
            const th = PI * (0.25 + (i * 0.5) / 4), f = clamp01(pips - i);
            const px = PHONE_SLOT.x + 82 * Math.cos(th), py = 500 + 82 * Math.sin(th);
            p.disc(px, py, 7 * (0.8 + 0.2 * f + 0.25 * bump(t, 60.2 + i * 0.2, 60.5 + i * 0.2)), f > 0 ? INK : LOCK, f > 0 ? 1 : 0.7);
        }
    }
    if (cam)
        c.restore();
    // top band stays out of the camera so the caption never drifts off the core
    const iris = drawEye(p, t, cardX, cardY);
    drawChips(p, t, iris);
    drawCaption(p, t, view, CAPTIONS);
}
export const ARGUS_REEL = 1.7; // the full loop plays as a ~40 s reel
export const argus = {
    ground: "#0c0c0e",
    loop: LOOP,
    still: 35.5,
    chapters: RANGES.map((range, i) => ({ label: NAMES[i], range })),
    draw,
};
