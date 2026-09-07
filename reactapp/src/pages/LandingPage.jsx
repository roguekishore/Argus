import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../components/ui';
import { ThemeToggle } from '../components/theme-toggle';
import {
    Clock, Bell, ArrowRight, ArrowUpRight,
    Zap, MessageSquare, Camera, ChevronRight,
    Layers, BarChart3, CheckCircle, Shield, Star, Users,
    TrendingUp, MapPin, Award
} from 'lucide-react';

// ─── Argus Logo ───────────────────────────────────────────────────────────────
const ArgusLogo = ({ className = 'w-6 h-6' }) => (
    <svg className={className} viewBox="-4.8 -4.8 57.60 57.60" xmlns="http://www.w3.org/2000/svg"
        fill="none" stroke="currentColor" strokeWidth="2.448" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="24" cy="24" r="21.5" />
        <path d="M7.1562,37.3617c6.68-13.4223,19.09-20.5881,21.4016-19.1306,1.6952,1.1638,2.6641,14.5061-2.9941,27.212" />
        <path d="M3.9276,16.2961c.9415-1.7942,1.9659-3.5009,3.0476-3.5325,1.0453-.0307,4.8246,5.95,7.35,14.23" />
        <path d="M20.0551,21.7892c-.0775-3.1524-1.3462-7.1971-2.2507-7.41-1.4-.33-4.8277,2.1706-6.5654,4.6194" />
        <path d="M28.7362,35.6317c3.5856.8641,8.4094,3.8208,8.3376,4.3269a6.1365,6.1365,0,0,1-2.287,2.64" />
        <path d="M34.4259,38.0126c4.0153-4.2419,4.7524-9.2731,4.2931-9.8636s-4.5346-.73-8.93-.1143" />
        <path d="M15.9921,25.2789s1.92-1.6241,2.595-1.388c.6932.2427,3.48,10.3376.4987,21.04" />
    </svg>
);

// ─── useInView hook ───────────────────────────────────────────────────────────
function useInView(options = {}) {
    const ref = useRef(null);
    const [inView, setInView] = useState(false);
    useEffect(() => {
        const el = ref.current;
        if (!el) return;
        const obs = new IntersectionObserver(([entry]) => {
            if (entry.isIntersecting) { setInView(true); obs.disconnect(); }
        }, { threshold: 0.1, ...options });
        obs.observe(el);
        return () => obs.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);
    return [ref, inView];
}

// ─── AnimatedSection ──────────────────────────────────────────────────────────
function AnimatedSection({ children, className = '', delay = 0, direction = 'up' }) {
    const [ref, inView] = useInView();
    const transforms = {
        up: 'translateY(28px)',
        down: 'translateY(-28px)',
        left: 'translateX(28px)',
        right: 'translateX(-28px)',
    };
    return (
        <div
            ref={ref}
            className={className}
            style={{
                opacity: inView ? 1 : 0,
                transform: inView ? 'translate(0)' : transforms[direction],
                transition: `opacity 0.75s cubic-bezier(0.16,1,0.3,1) ${delay}ms, transform 0.75s cubic-bezier(0.16,1,0.3,1) ${delay}ms`,
            }}
        >
            {children}
        </div>
    );
}

// ─── Section label ────────────────────────────────────────────────────────────
function SectionLabel({ children }) {
    return (
        <span className="inline-flex items-center gap-1.5 text-[10px] tracking-[0.18em] uppercase font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 px-2.5 py-1 rounded-full mb-4">
            <span className="w-1 h-1 rounded-full bg-emerald-500" style={{ animation: 'argus-pulse-dot 2s ease infinite' }} />
            {children}
        </span>
    );
}

// ─── Ticker ───────────────────────────────────────────────────────────────────
const tickerItems = [
    'Pothole on Anna Salai — resolved in 31 hrs',
    'Water leak, T. Nagar — escalated to dept head',
    'Street light out, Adyar — assigned to Electricity',
    'Garbage overflow, Mylapore — resolved in 12 hrs',
    'Sewage blockage, Velachery — under review',
    'Park maintenance, Nungambakkam — staff dispatched',
    'Broken footpath, Egmore — complaint filed',
];

function Ticker() {
    const doubled = [...tickerItems, ...tickerItems];
    return (
        <div className="argus-ticker-pause relative bg-foreground/[0.03] dark:bg-white/[0.03] backdrop-blur-sm border-b border-border h-9 flex items-center overflow-hidden">
            <span className="relative z-10 flex items-center gap-2 text-[9px] tracking-[0.18em] uppercase font-semibold px-4 border-r border-border shrink-0 h-full bg-background">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" style={{ animation: 'argus-pulse-dot 2s ease infinite' }} />
                <span className="text-emerald-600 dark:text-emerald-400 hidden xs:inline">Live</span>
            </span>
            <div className="flex-1 overflow-hidden">
                <div
                    className="argus-ticker-track flex whitespace-nowrap"
                    style={{ animation: 'argus-ticker 42s linear infinite' }}
                >
                    {doubled.map((item, i) => (
                        <span key={i} className="inline-flex items-center gap-2.5 px-8 text-[11px] text-muted-foreground">
                            <span className="w-1 h-1 rounded-full bg-emerald-400/60 shrink-0" />
                            {item}
                        </span>
                    ))}
                </div>
            </div>
        </div>
    );
}

// ─── Product Mockup ───────────────────────────────────────────────────────────
function ProductMockup() {
    return (
        <div className="relative" style={{ animation: 'argus-float 6s ease-in-out infinite' }}>
            {/* Glow behind card */}
            <div className="absolute inset-0 -m-8 rounded-3xl bg-gradient-to-br from-emerald-400/10 via-blue-400/5 to-violet-400/10 blur-3xl dark:from-emerald-400/8 dark:via-blue-400/4 dark:to-violet-400/8" />

            {/* Browser frame */}
            <div className="relative border border-border bg-card rounded-2xl shadow-2xl shadow-foreground/8 dark:shadow-black/40 overflow-hidden">
                {/* Title bar */}
                <div className="h-9 bg-muted border-b border-border flex items-center px-3.5 gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full bg-red-400/60" />
                    <div className="w-2.5 h-2.5 rounded-full bg-amber-400/60" />
                    <div className="w-2.5 h-2.5 rounded-full bg-emerald-400/60" />
                    <div className="mx-auto flex items-center gap-1.5 bg-background/50 rounded-md px-3 py-1 text-[10px] text-muted-foreground">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        argus.city/dashboard
                    </div>
                </div>

                {/* App content */}
                <div className="p-5 space-y-4 bg-background">
                    {/* Nav strip */}
                    <div className="flex items-center justify-between pb-4 border-b border-border">
                        <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-lg bg-foreground flex items-center justify-center">
                                <ArgusLogo className="w-3.5 h-3.5 text-background" />
                            </div>
                            <div className="h-3 w-14 bg-foreground/70 rounded-sm" />
                        </div>
                        <div className="flex gap-2 items-center">
                            <div className="h-6 w-20 bg-muted rounded-lg" />
                            <div className="w-7 h-7 rounded-full bg-muted" />
                        </div>
                    </div>

                    {/* Stat cards */}
                    <div className="grid grid-cols-3 gap-3">
                        {[
                            { val: '247', label: 'Active', color: 'from-blue-500/10 to-blue-500/5', dot: 'bg-blue-500' },
                            { val: '94%', label: 'Resolved', color: 'from-emerald-500/10 to-emerald-500/5', dot: 'bg-emerald-500' },
                            { val: '38h', label: 'Avg Time', color: 'from-amber-500/10 to-amber-500/5', dot: 'bg-amber-500' },
                        ].map((s, i) => (
                            <div key={i} className={`rounded-xl bg-gradient-to-br ${s.color} border border-border p-3 space-y-2`}>
                                <div className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
                                <div className="text-xl font-bold leading-none text-foreground" style={{ fontFamily: 'var(--font-display)' }}>{s.val}</div>
                                <div className="text-[10px] text-muted-foreground font-medium">{s.label}</div>
                            </div>
                        ))}
                    </div>

                    {/* Complaint list */}
                    <div className="rounded-xl border border-border overflow-hidden">
                        <div className="px-3.5 py-2.5 border-b border-border bg-muted/40 flex items-center justify-between">
                            <div className="h-2 w-24 bg-foreground/30 rounded" />
                            <div className="h-5 w-14 bg-primary/10 rounded-full" />
                        </div>
                        {[
                            { color: 'bg-amber-500', w: 'w-28' },
                            { color: 'bg-emerald-500', w: 'w-36' },
                            { color: 'bg-blue-500', w: 'w-24' },
                        ].map((row, i) => (
                            <div key={i} className="px-3.5 py-3 border-b last:border-0 border-border flex items-center gap-3">
                                <div className={`w-2 h-2 rounded-full ${row.color} shrink-0`} />
                                <div className={`h-2 ${row.w} bg-foreground/10 rounded`} />
                                <div className="ml-auto h-5 w-16 bg-muted rounded-full" />
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Floating resolved card */}
            <div className="absolute -bottom-5 -left-6 bg-card border border-border rounded-xl shadow-xl dark:shadow-black/30 px-3.5 py-3 flex items-center gap-3 min-w-[190px]">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0">
                    <CheckCircle className="w-4 h-4 text-emerald-500" />
                </div>
                <div>
                    <p className="text-[11px] font-semibold leading-tight">Issue Resolved</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">Pothole · Anna Salai</p>
                </div>
                <div className="ml-auto text-[10px] text-emerald-500 font-semibold">31h</div>
            </div>

            {/* Floating assignment pill */}
            <div className="absolute -top-4 -right-5 bg-card border border-border rounded-xl shadow-lg dark:shadow-black/30 px-3 py-2 flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-violet-500/10 border border-violet-500/20 flex items-center justify-center">
                    <Users className="w-3 h-3 text-violet-500" />
                </div>
                <span className="text-[11px] font-medium">Staff assigned</span>
            </div>
        </div>
    );
}

// ─── Data ─────────────────────────────────────────────────────────────────────
const testimonials = [
    { quote: "Filed a pothole complaint at 8 AM, saw road crew by evening. Never happened before Argus.", name: "Priya R.", role: "Citizen, T. Nagar", rating: 5, avatar: "PR" },
    { quote: "We reduced resolution times by 60%. The auto-escalation alone changed our department's culture.", name: "K. Venkatesh", role: "Dept Head, Roads", rating: 5, avatar: "KV" },
    { quote: "Finally, a system where citizens can actually see what's happening with their complaints.", name: "Sundar M.", role: "Commissioner's Office", rating: 5, avatar: "SM" },
];

const stats = [
    { num: '12,400+', label: 'Issues reported',    icon: TrendingUp },
    { num: '94%',     label: 'Resolution rate',    icon: CheckCircle },
    { num: '38 hrs',  label: 'Avg. resolution',    icon: Clock },
    { num: '7',       label: 'Depts connected',    icon: Layers },
];

const features = [
    { title: 'Image Recognition',    desc: 'AI analyzes photos to auto-categorize issue types with high accuracy.',               tag: 'AI',     Icon: Camera },
    { title: 'Auto Escalation',       desc: 'Missed deadlines trigger automatic escalation to supervisors instantly.',            tag: 'SLA',    Icon: Zap },
    { title: 'Location Tagging',      desc: 'Precise GPS coordinates help field staff locate and reach issues faster.',           tag: 'GEO',    Icon: MapPin },
    { title: 'Civic Gamification',    desc: 'Earn points and badges for active civic participation and verified reports.',        tag: 'NEW',    Icon: Award },
    { title: 'Multi-channel Alerts',  desc: 'Status updates via WhatsApp, SMS, or email — choose what works for you.',           tag: 'NOTIFY', Icon: Bell },
    { title: 'Analytics Dashboard',   desc: 'Department heads track performance metrics, SLA compliance and trends in real-time.',tag: 'DATA',   Icon: BarChart3 },
];

const roles = [
    { role: 'Citizens',   action: 'File complaints, track progress, confirm resolution', icon: Users,    accent: 'from-blue-500/15 to-blue-500/5 dark:from-blue-500/10 dark:to-blue-500/[0.03]',    dot: 'bg-blue-500',    ring: 'ring-blue-500/30' },
    { role: 'Staff',      action: 'Receive assignments, submit resolution proof',         icon: Shield,   accent: 'from-emerald-500/15 to-emerald-500/5 dark:from-emerald-500/10 dark:to-emerald-500/[0.03]', dot: 'bg-emerald-500', ring: 'ring-emerald-500/30' },
    { role: 'Dept Heads', action: 'Monitor performance, assign tasks, review SLAs',      icon: BarChart3,accent: 'from-amber-500/15 to-amber-500/5 dark:from-amber-500/10 dark:to-amber-500/[0.03]',  dot: 'bg-amber-500',   ring: 'ring-amber-500/30' },
    { role: 'Admins',     action: 'Full system control and configuration',                icon: Zap,      accent: 'from-violet-500/15 to-violet-500/5 dark:from-violet-500/10 dark:to-violet-500/[0.03]',dot: 'bg-violet-500',  ring: 'ring-violet-500/30' },
];

const deptRows = [
    { dept: 'Roads',        staff: 'roads1@gmail.com',        head: 'roadshead@gmail.com' },
    { dept: 'Water Supply', staff: 'water1@gmail.com',        head: 'waterhead@gmail.com' },
    { dept: 'Sewerage',     staff: 'sewerage1@gmail.com',     head: 'seweragehead@gmail.com' },
    { dept: 'Electricity',  staff: 'electricity1@gmail.com',  head: 'electricityhead@gmail.com' },
    { dept: 'Garbage',      staff: 'garbage1@gmail.com',      head: 'garbagehead@gmail.com' },
    { dept: 'Public Safety',staff: 'safety1@gmail.com',       head: 'safetyhead@gmail.com' },
    { dept: 'Parks',        staff: 'parks1@gmail.com',        head: 'parkshead@gmail.com' },
];

const systemRoles = [
    { role: 'Citizen',      email: 'citizen@gmail.com',      desc: 'File and track complaints',           dot: 'bg-blue-500',   badge: 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-500/10' },
    { role: 'Admin',        email: 'admin@gmail.com',         desc: 'Route complaints, manage users',      dot: 'bg-violet-500', badge: 'text-violet-600 dark:text-violet-400 bg-violet-50 dark:bg-violet-500/10' },
    { role: 'Super Admin',  email: 'superadmin@gmail.com',    desc: 'Full system management',              dot: 'bg-red-500',    badge: 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-500/10' },
    { role: 'Commissioner', email: 'commissioner@gmail.com',  desc: 'High-level oversight & escalations', dot: 'bg-amber-500',  badge: 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/10' },
];

// ─── Main Component ───────────────────────────────────────────────────────────
const LandingPage = () => {
    return (
        <div className="min-h-screen bg-background text-foreground antialiased">

            {/* ── Navigation ── */}
            <nav className="sticky top-0 z-50 bg-background/75 backdrop-blur-xl border-b border-border/60 h-14 flex items-center px-4 sm:px-6 justify-between">
                <Link to="/" className="flex items-center gap-2.5 group">
                    <div className="w-8 h-8 rounded-xl bg-foreground flex items-center justify-center shrink-0 transition-all duration-200 group-hover:scale-105 group-hover:shadow-lg group-hover:shadow-foreground/10">
                        <ArgusLogo className="w-4.5 h-4.5 text-background" />
                    </div>
                    <span className="text-[17px] font-bold tracking-tight" style={{ fontFamily: 'var(--font-display)' }}>
                        Argus
                    </span>
                </Link>
                <div className="flex items-center gap-2">
                    <ThemeToggle />
                    <Link to="/login" className="hidden sm:block">
                        <Button variant="ghost" size="sm" className="rounded-xl text-xs tracking-wide font-medium text-muted-foreground hover:text-foreground">
                            Log in
                        </Button>
                    </Link>
                    <Link to="/signup">
                        <Button size="sm" className="rounded-xl text-xs tracking-wide font-semibold gap-1.5 px-4 shadow-sm">
                            Get started <ArrowRight className="w-3 h-3" />
                        </Button>
                    </Link>
                </div>
            </nav>

            {/* ── Live Ticker ── */}
            <Ticker />

            {/* ── Hero ── */}
            <section className="relative overflow-hidden pt-20 sm:pt-28 pb-20 sm:pb-28">
                {/* Background elements */}
                <div className="absolute inset-0 overflow-hidden pointer-events-none">
                    <div className="absolute -top-40 -right-40 w-[700px] h-[700px] rounded-full bg-gradient-to-br from-emerald-400/8 via-blue-400/5 to-violet-400/8 blur-3xl" />
                    <div className="absolute -bottom-40 -left-40 w-[600px] h-[600px] rounded-full bg-gradient-to-tr from-violet-400/6 to-emerald-400/4 blur-3xl" />
                    {/* Subtle dot grid */}
                    <div className="absolute inset-0" style={{
                        backgroundImage: 'radial-gradient(circle, hsl(var(--border)) 1px, transparent 1px)',
                        backgroundSize: '32px 32px',
                        opacity: 0.5
                    }} />
                    <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-background" />
                </div>

                <div className="relative mx-auto max-w-6xl px-4 sm:px-6">
                    <div className="grid lg:grid-cols-2 gap-14 lg:gap-20 items-center">
                        {/* Left — Copy */}
                        <div>
                            <AnimatedSection delay={0}>
                                <SectionLabel>Public Grievance Redressal System</SectionLabel>
                            </AnimatedSection>
                            <AnimatedSection delay={80}>
                                <h1
                                    className="text-[2.75rem] sm:text-5xl lg:text-[3.5rem] font-extrabold leading-[1.06] tracking-tight mb-5"
                                    style={{ fontFamily: 'var(--font-display)' }}
                                >
                                    Civic issues,{' '}
                                    <span className="argus-gradient-text">
                                        sorted<br className="hidden sm:block" /> with ease.
                                    </span>
                                </h1>
                            </AnimatedSection>
                            <AnimatedSection delay={140}>
                                <p className="text-[15px] sm:text-base text-muted-foreground max-w-[420px] leading-relaxed mb-8 font-light">
                                    Report potholes, broken lights, water issues — anything. We route it to the right people and track it until resolved.
                                </p>
                            </AnimatedSection>
                            <AnimatedSection delay={200}>
                                <div className="flex flex-wrap gap-3 mb-10">
                                    <Link to="/signup">
                                        <Button size="lg" className="rounded-xl gap-2 font-semibold h-12 px-6 shadow-lg shadow-foreground/10 text-sm">
                                            File a complaint <ArrowRight className="w-4 h-4" />
                                        </Button>
                                    </Link>
                                    <Link to="/login">
                                        <Button size="lg" variant="outline" className="rounded-xl gap-2 h-12 px-6 text-sm font-medium">
                                            Track your issue <ArrowUpRight className="w-3.5 h-3.5" />
                                        </Button>
                                    </Link>
                                </div>
                            </AnimatedSection>
                            {/* Stat strip */}
                            <AnimatedSection delay={260}>
                                <div className="grid grid-cols-2 sm:grid-cols-4 rounded-2xl overflow-hidden border border-border bg-card shadow-sm">
                                    {stats.map((s, i) => (
                                        <div key={i} className={`p-4 text-center ${i !== stats.length - 1 ? 'border-r border-border' : ''}`}>
                                            <div className="text-2xl font-extrabold leading-none mb-1.5" style={{ fontFamily: 'var(--font-display)' }}>
                                                {s.num}
                                            </div>
                                            <div className="text-[10px] tracking-wider text-muted-foreground uppercase font-medium">
                                                {s.label}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </AnimatedSection>
                        </div>

                        {/* Right — Product mockup */}
                        <AnimatedSection delay={300} direction="left" className="hidden lg:block">
                            <ProductMockup />
                        </AnimatedSection>
                    </div>
                </div>
            </section>

            {/* ── Bento Grid ── */}
            <section className="py-20 sm:py-28 bg-muted/30 dark:bg-white/[0.02]">
                <div className="mx-auto max-w-6xl px-4 sm:px-6">
                    <AnimatedSection>
                        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-12">
                            <div>
                                <SectionLabel>Platform</SectionLabel>
                                <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight" style={{ fontFamily: 'var(--font-display)' }}>
                                    Built for speed
                                </h2>
                            </div>
                            <span className="text-[11px] tracking-widest text-muted-foreground uppercase font-medium">
                                Core capabilities
                            </span>
                        </div>
                    </AnimatedSection>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        {/* Main card */}
                        <AnimatedSection className="col-span-1 sm:col-span-2 sm:row-span-2" delay={0}>
                            <div className="relative bg-foreground text-background h-full flex flex-col justify-between p-8 sm:p-10 min-h-[300px] rounded-2xl overflow-hidden group cursor-default">
                                <div className="absolute inset-0 bg-gradient-to-br from-white/5 via-transparent to-transparent" />
                                <div className="absolute -bottom-20 -right-20 w-64 h-64 rounded-full bg-emerald-400/5 blur-3xl" />
                                <div className="relative">
                                    <div className="inline-flex items-center gap-1.5 text-[10px] tracking-[0.15em] uppercase font-semibold text-white/40 mb-5">
                                        File in under 2 minutes
                                    </div>
                                    <h2 className="text-2xl sm:text-3xl font-extrabold leading-snug mb-4" style={{ fontFamily: 'var(--font-display)' }}>
                                        Snap a photo.<br />Drop a pin.<br />We handle the rest.
                                    </h2>
                                    <p className="text-sm text-white/55 leading-relaxed max-w-xs">
                                        AI classifies your complaint, routes it to the right department, and sends you updates until it's fixed.
                                    </p>
                                </div>
                                <Link to="/signup" className="mt-8 self-start relative">
                                    <Button variant="secondary" size="sm" className="rounded-xl text-xs font-semibold gap-2 group-hover:gap-3 transition-all">
                                        Start now <ArrowRight className="w-3.5 h-3.5" />
                                    </Button>
                                </Link>
                            </div>
                        </AnimatedSection>

                        {/* Feature tiles */}
                        {[
                            { Icon: Clock,     num: '48 hr',  label: 'SLA guarantee',   sub: 'Auto-escalation on breach', accent: 'group-hover:text-amber-500' },
                            { Icon: Zap,       num: 'AI',     label: 'Smart routing',    sub: 'Right dept, every time',    accent: 'group-hover:text-violet-500' },
                            { Icon: Bell,      num: 'Live',   label: 'Real-time alerts', sub: 'WhatsApp, SMS & email',     accent: 'group-hover:text-blue-500' },
                            { Icon: BarChart3, num: '360°',   label: 'Full visibility',  sub: 'Track every update',        accent: 'group-hover:text-emerald-500' },
                        ].map(({ Icon, num, label, sub, accent }, i) => (
                            <AnimatedSection key={i} delay={100 + i * 60}>
                                <div className="argus-card-hover group bg-card border border-border hover:border-foreground/20 p-6 h-full flex flex-col justify-between min-h-[145px] cursor-default rounded-2xl transition-colors duration-200">
                                    <Icon className={`w-5 h-5 text-muted-foreground mb-5 transition-colors duration-200 ${accent}`} strokeWidth={1.5} />
                                    <div>
                                        <div className="text-2xl font-extrabold leading-none mb-1.5" style={{ fontFamily: 'var(--font-display)' }}>
                                            {num}
                                        </div>
                                        <div className="text-sm font-semibold mb-0.5">{label}</div>
                                        <div className="text-[11px] text-muted-foreground leading-relaxed">{sub}</div>
                                    </div>
                                </div>
                            </AnimatedSection>
                        ))}
                    </div>
                </div>
            </section>

            {/* ── How It Works ── */}
            <section className="py-20 sm:py-28">
                <div className="mx-auto max-w-6xl px-4 sm:px-6">
                    <AnimatedSection>
                        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-14">
                            <div>
                                <SectionLabel>Process</SectionLabel>
                                <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight" style={{ fontFamily: 'var(--font-display)' }}>
                                    How it works
                                </h2>
                            </div>
                            <span className="text-[11px] tracking-widest text-muted-foreground uppercase font-medium">Four steps</span>
                        </div>
                    </AnimatedSection>

                    <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        {[
                            { num: '01', title: 'Capture',  desc: 'Photo + GPS + short description. Takes under two minutes.',                      Icon: Camera,       bg: 'from-blue-500/10 to-blue-500/5 dark:from-blue-500/8 dark:to-blue-500/[0.02]',       icon: 'text-blue-500 bg-blue-500/10' },
                            { num: '02', title: 'Route',    desc: 'AI classifies the issue and assigns it to the right department automatically.',  Icon: Layers,       bg: 'from-violet-500/10 to-violet-500/5 dark:from-violet-500/8 dark:to-violet-500/[0.02]', icon: 'text-violet-500 bg-violet-500/10' },
                            { num: '03', title: 'Resolve',  desc: 'Staff works the complaint with a deadline. Missed? It auto-escalates.',          Icon: MessageSquare,bg: 'from-amber-500/10 to-amber-500/5 dark:from-amber-500/8 dark:to-amber-500/[0.02]',   icon: 'text-amber-500 bg-amber-500/10' },
                            { num: '04', title: 'Verify',   desc: 'You confirm the fix. Complaint closes. Points and badges awarded.',              Icon: CheckCircle,  bg: 'from-emerald-500/10 to-emerald-500/5 dark:from-emerald-500/8 dark:to-emerald-500/[0.02]', icon: 'text-emerald-500 bg-emerald-500/10' },
                        ].map((step, i) => (
                            <AnimatedSection key={i} delay={i * 90}>
                                <div className={`relative h-full bg-gradient-to-br ${step.bg} border border-border rounded-2xl p-6 sm:p-7 group hover:shadow-lg hover:shadow-foreground/5 transition-all duration-300 cursor-default`}>
                                    <div className="flex items-start justify-between mb-7">
                                        <span className="text-[10px] tracking-[0.15em] text-muted-foreground font-semibold">{step.num}</span>
                                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${step.icon}`}>
                                            <step.Icon className="w-4.5 h-4.5" strokeWidth={1.75} />
                                        </div>
                                    </div>
                                    <h3 className="text-xl font-extrabold mb-2.5" style={{ fontFamily: 'var(--font-display)' }}>
                                        {step.title}
                                    </h3>
                                    <p className="text-[13px] text-muted-foreground leading-relaxed">{step.desc}</p>

                                    {/* Connector arrow — all except last */}
                                    {i < 3 && (
                                        <div className="hidden lg:flex absolute -right-6 top-1/2 -translate-y-1/2 z-10 w-8 justify-center">
                                            <ChevronRight className="w-4 h-4 text-border" />
                                        </div>
                                    )}
                                </div>
                            </AnimatedSection>
                        ))}
                    </div>
                </div>
            </section>

            {/* ── Features List ── */}
            <section className="py-20 sm:py-28 bg-muted/30 dark:bg-white/[0.02]">
                <div className="mx-auto max-w-6xl px-4 sm:px-6">
                    <AnimatedSection>
                        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-10 pb-6 border-b border-border">
                            <div>
                                <SectionLabel>Capabilities</SectionLabel>
                                <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight" style={{ fontFamily: 'var(--font-display)' }}>
                                    Why Argus?
                                </h2>
                            </div>
                            <span className="text-[11px] tracking-widest text-muted-foreground uppercase font-medium">6 core features</span>
                        </div>
                    </AnimatedSection>

                    <div>
                        {features.map((f, i) => (
                            <AnimatedSection key={i} delay={i * 45}>
                                <div className="argus-feature-row group flex items-center gap-5 py-5 border-b border-border/70 hover:bg-card hover:px-5 hover:-mx-5 hover:rounded-xl hover:border-transparent hover:shadow-sm transition-all duration-200 cursor-default">
                                    <span className="text-[10px] tracking-widest text-muted-foreground/40 w-7 shrink-0 font-semibold tabular-nums">
                                        {String(i + 1).padStart(2, '0')}
                                    </span>
                                    <div className="w-9 h-9 rounded-xl bg-card border border-border flex items-center justify-center shrink-0 group-hover:border-foreground/20 transition-colors">
                                        <f.Icon className="w-4 h-4 text-muted-foreground" strokeWidth={1.5} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-semibold leading-tight">{f.title}</p>
                                        <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{f.desc}</p>
                                    </div>
                                    <span className="text-[9px] tracking-[0.15em] text-muted-foreground bg-card border border-border px-2.5 py-1 rounded-lg shrink-0 hidden sm:block font-semibold uppercase">
                                        {f.tag}
                                    </span>
                                    <ChevronRight className="argus-feature-arrow w-4 h-4 text-muted-foreground/30 transition-transform duration-200 shrink-0" />
                                </div>
                            </AnimatedSection>
                        ))}
                    </div>
                </div>
            </section>

            {/* ── Social Proof ── */}
            <section className="py-20 sm:py-28">
                <div className="mx-auto max-w-6xl px-4 sm:px-6">
                    <AnimatedSection>
                        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-12">
                            <div>
                                <SectionLabel>Testimonials</SectionLabel>
                                <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight" style={{ fontFamily: 'var(--font-display)' }}>
                                    Trusted by citizens<br className="hidden sm:block" /> &amp; officials
                                </h2>
                            </div>
                        </div>
                    </AnimatedSection>

                    <div className="grid sm:grid-cols-3 gap-4">
                        {testimonials.map((t, i) => (
                            <AnimatedSection key={i} delay={i * 100}>
                                <div className="argus-card-hover group bg-card border border-border rounded-2xl p-6 sm:p-7 h-full flex flex-col justify-between hover:border-foreground/15 transition-colors duration-200">
                                    <div>
                                        <div className="flex gap-0.5 mb-5">
                                            {Array.from({ length: t.rating }).map((_, j) => (
                                                <Star key={j} className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                                            ))}
                                        </div>
                                        <p className="text-[14px] leading-relaxed text-foreground/85 mb-6">"{t.quote}"</p>
                                    </div>
                                    <div className="flex items-center gap-3 pt-5 border-t border-border">
                                        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-emerald-400/30 to-blue-400/30 flex items-center justify-center shrink-0">
                                            <span className="text-[11px] font-bold text-foreground">{t.avatar}</span>
                                        </div>
                                        <div>
                                            <p className="text-sm font-semibold leading-tight">{t.name}</p>
                                            <p className="text-[11px] text-muted-foreground mt-0.5">{t.role}</p>
                                        </div>
                                    </div>
                                </div>
                            </AnimatedSection>
                        ))}
                    </div>
                </div>
            </section>

            {/* ── Roles ── */}
            <section className="py-20 sm:py-28 bg-muted/30 dark:bg-white/[0.02]">
                <div className="mx-auto max-w-6xl px-4 sm:px-6">
                    <AnimatedSection>
                        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-12">
                            <div>
                                <SectionLabel>Access</SectionLabel>
                                <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight" style={{ fontFamily: 'var(--font-display)' }}>
                                    One platform,<br className="hidden sm:block" /> every stakeholder
                                </h2>
                            </div>
                            <span className="text-[11px] tracking-widest text-muted-foreground uppercase font-medium">Full lifecycle</span>
                        </div>
                    </AnimatedSection>

                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                        {roles.map((r, i) => (
                            <AnimatedSection key={i} delay={i * 80}>
                                <div className={`relative bg-gradient-to-br ${r.accent} border border-border rounded-2xl p-5 sm:p-6 h-full group hover:border-foreground/20 hover:shadow-sm transition-all duration-200 cursor-default overflow-hidden`}>
                                    <div className={`w-10 h-10 rounded-xl ring-1 ${r.ring} flex items-center justify-center mb-5`} style={{ background: 'hsl(var(--card))' }}>
                                        <r.icon className="w-5 h-5 text-muted-foreground" strokeWidth={1.5} />
                                    </div>
                                    <div className={`w-2 h-2 rounded-full ${r.dot} mb-3`} />
                                    <h3 className="text-base font-extrabold mb-1.5" style={{ fontFamily: 'var(--font-display)' }}>
                                        {r.role}
                                    </h3>
                                    <p className="text-[12px] text-muted-foreground leading-relaxed">{r.action}</p>
                                </div>
                            </AnimatedSection>
                        ))}
                    </div>
                </div>
            </section>

            {/* ── Final CTA ── */}
            <section className="py-20 sm:py-28">
                <div className="mx-auto max-w-6xl px-4 sm:px-6">
                    <AnimatedSection>
                        <div className="relative overflow-hidden rounded-3xl bg-foreground text-background px-6 sm:px-16 py-16 sm:py-20 text-center">
                            {/* Background glows */}
                            <div className="absolute top-0 left-1/4 w-80 h-80 bg-emerald-400/8 rounded-full blur-3xl -translate-y-1/2" />
                            <div className="absolute bottom-0 right-1/4 w-64 h-64 bg-violet-400/8 rounded-full blur-3xl translate-y-1/2" />
                            <div className="absolute inset-0 bg-gradient-to-b from-white/[0.04] to-transparent pointer-events-none" />

                            <div className="relative">
                                <div className="inline-flex items-center gap-1.5 text-[10px] tracking-[0.18em] uppercase font-semibold text-white/40 mb-6">
                                    <span className="w-1 h-1 rounded-full bg-emerald-400" style={{ animation: 'argus-pulse-dot 2s ease infinite' }} />
                                    Ready to make your city better?
                                </div>
                                <h2 className="text-3xl sm:text-5xl font-extrabold leading-tight mb-4 tracking-tight" style={{ fontFamily: 'var(--font-display)' }}>
                                    Report. Track. Resolve.
                                </h2>
                                <p className="text-[14px] text-white/50 max-w-sm mx-auto mb-10 leading-relaxed">
                                    Join thousands of citizens who've successfully resolved civic complaints using Argus.
                                </p>
                                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                                    <Link to="/signup">
                                        <Button size="lg" variant="secondary" className="rounded-xl gap-2 font-semibold w-full sm:w-auto h-12 px-8 text-sm shadow-lg">
                                            Create account <ArrowRight className="w-4 h-4" />
                                        </Button>
                                    </Link>
                                    <Link to="/login">
                                        <Button size="lg" variant="ghost"
                                            className="rounded-xl text-white/60 hover:text-white hover:bg-white/10 border border-white/15 hover:border-white/30 w-full sm:w-auto h-12 px-8 text-sm font-medium">
                                            Sign in
                                        </Button>
                                    </Link>
                                </div>
                            </div>
                        </div>
                    </AnimatedSection>
                </div>
            </section>

            {/* ── Demo Credentials ── */}
            <section className="pb-20 sm:pb-28">
                <div className="mx-auto max-w-6xl px-4 sm:px-6">
                    <AnimatedSection>
                        <div className="mb-8">
                            <div className="inline-flex items-center gap-2 rounded-full border border-amber-200 dark:border-amber-500/25 bg-amber-50 dark:bg-amber-500/8 px-3 py-1.5 mb-5">
                                <span className="w-1.5 h-1.5 rounded-full bg-amber-500" style={{ animation: 'argus-pulse-dot 2s ease infinite' }} />
                                <span className="text-[10px] tracking-[0.15em] uppercase font-semibold text-amber-600 dark:text-amber-400">Test Mode — Demo Access</span>
                            </div>
                            <h2 className="text-2xl font-extrabold mb-2" style={{ fontFamily: 'var(--font-display)' }}>
                                Demo Credentials
                            </h2>
                            <p className="text-sm text-muted-foreground">
                                Explore using these test accounts. Password for all:{' '}
                                <code className="text-foreground bg-muted px-2 py-0.5 rounded-lg text-xs font-mono font-medium border border-border">
                                    argusargus
                                </code>
                            </p>
                        </div>
                    </AnimatedSection>

                    <div className="grid lg:grid-cols-2 gap-4">
                        {/* Dept table */}
                        <AnimatedSection delay={100}>
                            <div className="bg-card border border-border rounded-2xl p-5 sm:p-6 h-full">
                                <h3 className="text-sm font-semibold flex items-center gap-2.5 mb-5 pb-4 border-b border-border">
                                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                                    Departments &amp; Staff
                                </h3>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-xs">
                                        <thead>
                                            <tr className="border-b border-border">
                                                <th className="pb-2.5 text-left text-[10px] tracking-widest text-muted-foreground font-semibold uppercase">Dept</th>
                                                <th className="pb-2.5 text-left text-[10px] tracking-widest text-muted-foreground font-semibold uppercase">Staff</th>
                                                <th className="pb-2.5 text-left text-[10px] tracking-widest text-muted-foreground font-semibold uppercase">Head</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-border/60">
                                            {deptRows.map((row, i) => (
                                                <tr key={i} className="group hover:bg-muted/40 transition-colors rounded-lg">
                                                    <td className="py-3 font-semibold text-[12px]">{row.dept}</td>
                                                    <td className="py-3 text-[11px] text-muted-foreground font-mono">{row.staff}</td>
                                                    <td className="py-3 text-[11px] text-muted-foreground font-mono">{row.head}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </AnimatedSection>

                        {/* System roles */}
                        <AnimatedSection delay={160}>
                            <div className="bg-card border border-border rounded-2xl p-5 sm:p-6 h-full flex flex-col">
                                <h3 className="text-sm font-semibold flex items-center gap-2.5 mb-5 pb-4 border-b border-border">
                                    <span className="w-2.5 h-2.5 rounded-full bg-violet-500" />
                                    System Roles
                                </h3>
                                <div className="space-y-0 divide-y divide-border/60 flex-1">
                                    {systemRoles.map((u, i) => (
                                        <div key={i} className="flex items-start gap-3.5 py-4 group hover:bg-muted/30 transition-colors -mx-2 px-2 rounded-xl">
                                            <div className={`w-2 h-2 rounded-full ${u.dot} mt-2 shrink-0`} />
                                            <div className="min-w-0 flex-1">
                                                <div className="flex flex-wrap items-center gap-2 mb-0.5">
                                                    <span className="text-[13px] font-semibold">{u.role}</span>
                                                    <span className={`text-[10px] font-mono px-2 py-0.5 rounded-md font-medium ${u.badge}`}>{u.email}</span>
                                                </div>
                                                <p className="text-[11px] text-muted-foreground">{u.desc}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                <div className="mt-5 border border-dashed border-border rounded-xl px-4 py-3 text-center text-xs text-muted-foreground bg-muted/30">
                                    Password for all accounts:{' '}
                                    <code className="text-foreground font-semibold font-mono">argusargus</code>
                                </div>
                            </div>
                        </AnimatedSection>
                    </div>
                </div>
            </section>

            {/* ── Footer ── */}
            <footer className="border-t border-border py-8">
                <div className="mx-auto max-w-6xl px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-lg bg-foreground flex items-center justify-center">
                            <ArgusLogo className="w-4 h-4 text-background" />
                        </div>
                        <span className="text-sm font-bold" style={{ fontFamily: 'var(--font-display)' }}>Argus</span>
                    </div>
                    <p className="text-[11px] tracking-wide text-muted-foreground text-center">
                        © {new Date().getFullYear()} Argus — Making cities better, one complaint at a time.
                    </p>
                    <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                        <span>Built with</span>
                        <span className="text-rose-500">♥</span>
                        <span>for civic good</span>
                    </div>
                </div>
            </footer>
        </div>
    );
};

export default LandingPage;
