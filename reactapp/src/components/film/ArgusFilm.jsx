import { useEffect, useRef } from 'react';
import { Painter, VH, VW, seg } from './kit';
import { argus, ARGUS_REEL } from './argus';

// Core region the film keeps in frame; anything outside it is ground and dots.
const CORE_W = 1360;
const CORE_H = 800;
// Fade through the ground colour when a chapter tile loops back to its start.
const VEIL = 0.45;

export const FILM_LOOP = argus.loop;
export const FILM_CHAPTERS = argus.chapters;

/** Index of the chapter playing at film time `t` (the return morph counts as the last one). */
export function chapterAt(t) {
    let i = FILM_CHAPTERS.length - 1;
    while (i > 0 && FILM_CHAPTERS[i].range[0] > t) i--;
    return i;
}

/**
 * Canvas player for the Argus film. The film is a pure function of time, so pausing just stops the
 * clock, and an off-screen player doesn't run at all.
 *
 *   range    [t0, t1] film seconds to loop (a chapter tile); omit for the full reel
 *   onFrame  called with the film time after every drawn frame
 */
export default function ArgusFilm({ range, onFrame, className = '' }) {
    const canvas = useRef(null);
    const onFrameRef = useRef(onFrame);
    useEffect(() => {
        onFrameRef.current = onFrame;
    }, [onFrame]);

    const rangeKey = range ? `${range[0]}-${range[1]}` : 'reel';
    useEffect(() => {
        const cv = canvas.current;
        const ctx = cv && cv.getContext('2d');
        if (!cv || !ctx) return undefined;
        const r = range;
        const speed = r ? 1 : ARGUS_REEL;
        const painter = new Painter(ctx);
        const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');

        let W = 0, H = 0, dpr = 1;
        let elapsed = 0, last = null, raf = 0, onScreen = false;

        const timeAt = (e) => {
            if (!r) return { t: e % argus.loop, veil: 0 };
            const len = r[1] - r[0];
            const u = e % len;
            return { t: r[0] + u, veil: 1 - Math.min(seg(u, 0, VEIL), 1 - seg(u, len - VEIL, len)) };
        };
        // One representative frame for reduced motion: the escalation peak, or late in a tile's range.
        const stillTime = () => (r ? { t: r[0] + (r[1] - r[0]) * 0.72, veil: 0 } : { t: argus.still, veil: 0 });

        const draw = ({ t, veil }) => {
            if (!W || !H) return;
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
            ctx.globalAlpha = 1;
            ctx.fillStyle = argus.ground;
            ctx.fillRect(0, 0, W, H);
            const s = Math.min(W / CORE_W, H / CORE_H);
            const ox = (W - VW * s) / 2, oy = (H - VH * s) / 2;
            ctx.setTransform(dpr * s, 0, 0, dpr * s, dpr * ox, dpr * oy);
            argus.draw(painter, t, { x0: -ox / s, y0: -oy / s, x1: (W - ox) / s, y1: (H - oy) / s });
            if (veil > 0.001) {
                ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
                ctx.globalAlpha = veil;
                ctx.fillStyle = argus.ground;
                ctx.fillRect(0, 0, W, H);
                ctx.globalAlpha = 1;
            }
            if (onFrameRef.current) onFrameRef.current(t);
        };

        const paint = () => draw(reduce.matches ? stillTime() : timeAt(elapsed));

        const tick = (now) => {
            if (last !== null) elapsed += Math.min(0.1, (now - last) / 1000) * speed;
            last = now;
            draw(timeAt(elapsed));
            raf = requestAnimationFrame(tick);
        };
        const stop = () => {
            if (raf) cancelAnimationFrame(raf);
            raf = 0;
            last = null;
        };
        const sync = () => {
            const run = onScreen && !reduce.matches && !document.hidden;
            if (run && !raf) raf = requestAnimationFrame(tick);
            else if (!run && raf) {
                stop();
                paint();
            }
        };

        const resize = () => {
            const b = cv.getBoundingClientRect();
            dpr = Math.min(window.devicePixelRatio || 1, 2);
            W = b.width;
            H = b.height;
            cv.width = Math.max(1, Math.round(W * dpr));
            cv.height = Math.max(1, Math.round(H * dpr));
            if (!raf) paint();
        };

        const ro = new ResizeObserver(resize);
        ro.observe(cv);
        const io = new IntersectionObserver(([e]) => {
            onScreen = e.isIntersecting;
            sync();
        }, { rootMargin: '100px' });
        io.observe(cv);
        const onVis = () => sync();
        const onReduce = () => {
            paint();
            sync();
        };
        const onFonts = () => { if (!raf) paint(); };
        document.addEventListener('visibilitychange', onVis);
        reduce.addEventListener('change', onReduce);
        // Canvas text doesn't trigger web-font loads; repaint once they land.
        if (document.fonts) {
            document.fonts.ready.then(onFonts);
            document.fonts.addEventListener('loadingdone', onFonts);
        }
        resize();

        return () => {
            if (document.fonts) document.fonts.removeEventListener('loadingdone', onFonts);
            stop();
            ro.disconnect();
            io.disconnect();
            document.removeEventListener('visibilitychange', onVis);
            reduce.removeEventListener('change', onReduce);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [rangeKey]);

    return <canvas ref={canvas} className={`absolute inset-0 h-full w-full ${className}`} style={{ background: argus.ground }} aria-hidden="true" />;
}
