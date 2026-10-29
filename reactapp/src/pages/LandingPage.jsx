import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import '@fontsource-variable/archivo/wdth.css';
import '@fontsource-variable/geist-mono';
import './landing.css';
import { ThemeToggle } from '../components/theme-toggle';
import { ArgusLogo } from '../components/common';
import ArgusFilm, { FILM_CHAPTERS, chapterAt } from '../components/film/ArgusFilm';

// ─── Reveal on scroll ─────────────────────────────────────────────────────────
function Reveal({ children, className = '', delay = 0 }) {
    const ref = useRef(null);
    const [inView, setInView] = useState(false);
    useEffect(() => {
        const el = ref.current;
        if (!el) return undefined;
        const obs = new IntersectionObserver(([entry]) => {
            if (entry.isIntersecting) { setInView(true); obs.disconnect(); }
        }, { threshold: 0.1 });
        obs.observe(el);
        return () => obs.disconnect();
    }, []);
    return (
        <div ref={ref} data-in={inView} className={`lp-reveal ${className}`} style={{ transitionDelay: `${delay}ms` }}>
            {children}
        </div>
    );
}

// ─── Film panel ───────────────────────────────────────────────────────────────
function FilmPanel({ range, label, className = '', onFrame }) {
    return (
        <div
            role="img"
            aria-label={label}
            className={`relative w-full overflow-hidden rounded-lg border border-border bg-[#0c0c0e] aspect-[17/10] ${className}`}
        >
            <ArgusFilm range={range} onFrame={onFrame} />
        </div>
    );
}

// ─── Data ─────────────────────────────────────────────────────────────────────
const stages = [
    {
        n: '01',
        title: 'Report',
        range: [0, 8],
        body: 'A citizen files from the web app or WhatsApp with a photo, a pin and a short description.',
    },
    {
        n: '02',
        title: 'Triage and assign',
        range: [8, 26],
        body: 'AI reads the complaint and sets the category, priority and deadline, then routes it to the right department. A repeat report nearby is flagged as a duplicate.',
    },
    {
        n: '03',
        title: 'Escalate and resolve',
        range: [26, 46],
        body: 'Miss the deadline and the complaint climbs the chain by itself. Staff can mark it resolved only with photo proof.',
    },
    {
        n: '04',
        title: 'Dispute and close',
        range: [46, 66],
        body: 'If the fix does not hold, the citizen disputes it and the department head reopens it. The citizen confirms the fix and rates it to close.',
    },
];

const rules = [
    ['Duplicates', 'A new report within 500 m of an open complaint with a similar description is flagged as a likely duplicate.'],
    ['Deadlines', 'Every category carries an SLA, from 3 days for garbage and electrical hazards up to 14 days for uncategorised issues.'],
    ['Escalation', 'Checked every 6 hours. More than 1 day overdue goes to the department head with priority raised one level. More than 3 days goes to the commissioner as critical.'],
    ['Proof of work', 'A complaint cannot move from in progress to resolved without resolution proof on record.'],
    ['Reopening', 'A disputed fix is reopened with 75% of the original deadline.'],
    ['Sign-off', 'The citizen accepts the fix with a rating, or rejects it with a reason.'],
];

const roles = [
    ['Citizen', 'Files complaints, tracks progress, confirms the fix.'],
    ['Staff', 'Receives assignments and submits resolution proof.'],
    ['Department head', 'Monitors performance and reviews disputes and SLAs.'],
    ['Commissioner', 'Oversees escalations across departments.'],
    ['Admin', 'Routes complaints and manages users.'],
];

// ─── Main Component ───────────────────────────────────────────────────────────
const LandingPage = () => {
    const [chapter, setChapter] = useState(0);
    const lastChapter = useRef(0);
    // Called on every frame; only touch React state when the chapter actually changes.
    const onFrame = useCallback((t) => {
        const i = chapterAt(t);
        if (i !== lastChapter.current) {
            lastChapter.current = i;
            setChapter(i);
        }
    }, []);

    return (
        <div className="landing min-h-screen antialiased">

            {/* ── Navigation ── */}
            <nav className="sticky top-0 z-50 h-14 flex items-center justify-between px-4 sm:px-6 border-b border-border bg-background">
                <Link to="/" className="flex items-center gap-2.5">
                    <ArgusLogo className="w-6 h-6" />
                    <span className="text-[17px] font-medium tracking-tight">Argus</span>
                </Link>
                <div className="flex items-center gap-1 sm:gap-3">
                    <ThemeToggle />
                    <Link to="/login" className="lp-link hidden sm:block text-sm px-2">Log in</Link>
                    <Link to="/signup" className="lp-btn lp-btn--solid lp-btn--sm">Get started</Link>
                </div>
            </nav>

            {/* ── Hero ──
                Desktop: copy in a narrow column on the left, the film takes the rest of the screen and is
                sized so the whole stage plus its chapter rail fit the first view. Smaller screens stack. */}
            <header className="px-4 sm:px-6 lg:px-12 pt-8 pb-12 lg:py-8 lg:min-h-[calc(100svh-3.5rem)] lg:flex lg:items-center lg:justify-center">
                <div className="mx-auto w-full max-w-6xl lg:max-w-none lg:w-auto lg:mx-0 lg:grid lg:grid-cols-[25rem_auto] lg:gap-12 lg:items-center">
                    <Reveal>
                        <p className="lp-mono text-[11px] text-muted-foreground flex items-center gap-2.5 mb-5">
                            <span className="w-1.5 h-1.5 bg-[hsl(var(--lp-magenta-fill))]" />
                            Public grievance redressal
                        </p>
                        <h1 className="lp-h1 lp-h1--hero">
                            Every complaint, followed to closure<span className="text-[hsl(var(--lp-magenta))]">.</span>
                        </h1>
                        <p className="mt-5 max-w-md text-[15px] leading-relaxed text-muted-foreground">
                            Report a civic issue and Argus routes it to the right department, enforces the deadline,
                            and asks you to confirm the fix before it closes.
                        </p>
                        <div className="mt-7 flex flex-wrap gap-3">
                            <Link to="/signup" className="lp-btn lp-btn--solid">File a complaint</Link>
                            <Link to="/login" className="lp-btn lp-btn--outline">Track an issue</Link>
                        </div>
                    </Reveal>

                    <Reveal delay={120} className="mt-10 lg:mt-0">
                        <div className="lp-stage">
                            <FilmPanel
                                label="Animation of one pothole complaint moving from report, through AI triage, assignment, escalation, resolution and dispute, to closure."
                                onFrame={onFrame}
                            />
                            <ol className="mt-3 grid grid-cols-7 gap-2 sm:gap-3">
                                {FILM_CHAPTERS.map((c, i) => (
                                    <li key={c.label} data-active={chapter === i} className="lp-rail-item pt-3">
                                        <span className="lp-mono block text-[10px] sm:text-[11px]">{String(i + 1).padStart(2, '0')}</span>
                                        <span className="hidden sm:block mt-1 text-sm">{c.label}</span>
                                    </li>
                                ))}
                            </ol>
                            <p className="sm:hidden mt-3 text-sm text-muted-foreground" aria-hidden="true">
                                {FILM_CHAPTERS[chapter].label}
                            </p>
                        </div>
                    </Reveal>
                </div>
            </header>

            {/* ── How it works ── */}
            <section className="mx-auto max-w-6xl px-4 sm:px-6 pt-20 sm:pt-28">
                <Reveal>
                    <p className="lp-mono text-[11px] text-muted-foreground mb-4">How it works</p>
                    <h2 className="lp-h2 max-w-xl">Four stages, each with an owner.</h2>
                </Reveal>
                <div className="mt-12 grid gap-x-8 gap-y-14 md:grid-cols-2">
                    {stages.map((s, i) => (
                        <Reveal key={s.n} delay={(i % 2) * 80}>
                            <FilmPanel range={s.range} label={`Animation of the ${s.title.toLowerCase()} stage.`} />
                            <div className="mt-5 flex gap-4">
                                <span className="lp-mono text-[11px] text-muted-foreground pt-1">{s.n}</span>
                                <div>
                                    <h3 className="text-xl font-medium tracking-tight">{s.title}</h3>
                                    <p className="mt-2 max-w-md text-[15px] leading-relaxed text-muted-foreground">{s.body}</p>
                                </div>
                            </div>
                        </Reveal>
                    ))}
                </div>
            </section>

            {/* ── Rules ── */}
            <section className="mx-auto max-w-6xl px-4 sm:px-6 pt-24 sm:pt-36">
                <Reveal>
                    <p className="lp-mono text-[11px] text-muted-foreground mb-4">What the system enforces</p>
                    <h2 className="lp-h2 max-w-xl">Rules, not promises.</h2>
                </Reveal>
                <Reveal className="mt-12">
                    <dl className="border-t border-border">
                        {rules.map(([term, desc]) => (
                            <div key={term} className="grid gap-2 py-6 border-b border-border md:grid-cols-[14rem_1fr] md:gap-8">
                                <dt className="lp-mono text-[11px] text-muted-foreground pt-1">{term}</dt>
                                <dd className="max-w-2xl text-[15px] leading-relaxed">{desc}</dd>
                            </div>
                        ))}
                    </dl>
                </Reveal>
            </section>

            {/* ── Roles ── */}
            <section className="mx-auto max-w-6xl px-4 sm:px-6 pt-24 sm:pt-36">
                <Reveal>
                    <p className="lp-mono text-[11px] text-muted-foreground mb-4">Who uses it</p>
                    <h2 className="lp-h2 max-w-xl">One platform for everyone in the chain.</h2>
                </Reveal>
                <Reveal className="mt-12">
                    <ul className="grid border-t border-border sm:grid-cols-2 lg:grid-cols-5">
                        {roles.map(([role, desc]) => (
                            <li key={role} className="py-6 sm:pr-6 border-b border-border lg:border-b-0">
                                <h3 className="text-base font-medium">{role}</h3>
                                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{desc}</p>
                            </li>
                        ))}
                    </ul>
                </Reveal>
            </section>

            {/* ── Closing call to action ── */}
            <section className="mt-24 sm:mt-36 bg-[#0c0c0e] text-[#f4f4f5] dark:border-t dark:border-border">
                <div className="mx-auto max-w-6xl px-4 sm:px-6 py-20 sm:py-28">
                    <Reveal>
                        <h2 className="lp-h1 max-w-4xl">
                            Report. Track. Resolve<span className="text-[hsl(325_100%_62%)]">.</span>
                        </h2>
                        <div className="mt-10 flex flex-wrap gap-3">
                            <Link to="/signup" className="lp-btn lp-btn--magenta">Create an account</Link>
                            <Link to="/login" className="lp-btn lp-btn--ghost-light">Sign in</Link>
                        </div>
                    </Reveal>
                </div>
            </section>

            {/* ── Footer ── */}
            <footer className="border-t border-border">
                <div className="mx-auto max-w-6xl px-4 sm:px-6 py-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <Link to="/" className="flex items-center gap-2.5">
                        <ArgusLogo className="w-5 h-5" />
                        <span className="text-sm font-medium">Argus</span>
                    </Link>
                    <p className="text-xs text-muted-foreground">© {new Date().getFullYear()} Argus</p>
                    <div className="flex items-center gap-5 text-xs">
                        <Link to="/login" className="lp-link">Log in</Link>
                        <Link to="/signup" className="lp-link">Sign up</Link>
                    </div>
                </div>
            </footer>
        </div>
    );
};

export default LandingPage;
