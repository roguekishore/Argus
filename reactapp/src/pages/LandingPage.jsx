import React from 'react';
import { Link } from 'react-router-dom';
import { Button, Card, CardContent } from '../components/ui';
import { ThemeToggle } from '../components/theme-toggle';
import {
    FileText,
    Clock,
    Bell,
    ArrowRight,
    ArrowUpRight,
    Zap,
    MessageSquare,
    Camera,
    ChevronRight,
    Layers,
    BarChart3,
    CheckCircle
} from 'lucide-react';

// Custom Argus Logo Component
const ArgusLogo = ({ className = "w-6 h-6" }) => (
    <svg
        className={className}
        viewBox="-4.8 -4.8 57.60 57.60"
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.448"
        strokeLinecap="round"
        strokeLinejoin="round"
    >
        <circle cx="24" cy="24" r="21.5" />
        <path d="M7.1562,37.3617c6.68-13.4223,19.09-20.5881,21.4016-19.1306,1.6952,1.1638,2.6641,14.5061-2.9941,27.212" />
        <path d="M3.9276,16.2961c.9415-1.7942,1.9659-3.5009,3.0476-3.5325,1.0453-.0307,4.8246,5.95,7.35,14.23" />
        <path d="M20.0551,21.7892c-.0775-3.1524-1.3462-7.1971-2.2507-7.41-1.4-.33-4.8277,2.1706-6.5654,4.6194" />
        <path d="M28.7362,35.6317c3.5856.8641,8.4094,3.8208,8.3376,4.3269a6.1365,6.1365,0,0,1-2.287,2.64" />
        <path d="M34.4259,38.0126c4.0153-4.2419,4.7524-9.2731,4.2931-9.8636s-4.5346-.73-8.93-.1143" />
        <path d="M15.9921,25.2789s1.92-1.6241,2.595-1.388c.6932.2427,3.48,10.3376.4987,21.04" />
    </svg>
);

const LandingPage = () => {
    return (
        <div className="min-h-screen bg-background">
            {/* Navigation */}
            <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b">
                <div className="max-w-7xl mx-auto px-4 sm:px-6">
                    <div className="flex h-14 sm:h-16 items-center justify-between">
                        <Link to="/" className="flex items-center gap-2 group">
                            <div className="w-8 h-8 sm:w-9 sm:h-9  bg-foreground flex items-center justify-center">
                                <ArgusLogo className="h-5 w-5 sm:h-6 sm:w-6 text-background" />
                            </div>
                            <span className="text-lg sm:text-xl font-semibold tracking-tight">Argus</span>
                        </Link>
                        <div className="flex items-center gap-2 sm:gap-3">
                            <ThemeToggle />
                            <Link to="/login" className="hidden sm:block">
                                <Button variant="ghost" size="sm">Log in</Button>
                            </Link>
                            <Link to="/signup">
                                <Button size="sm" className="rounded-full px-4">
                                    Get Started
                                </Button>
                            </Link>
                        </div>
                    </div>
                </div>
            </nav>
            <section className="pt-20 sm:pt-24 pb-8 sm:pb-12">
                <div className="max-w-7xl mx-auto px-4 sm:px-6">
                    {/* Main headline */}
                    <div className="max-w-3xl  mb-8 sm:mb-12 ">
                        {/* <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border bg-muted/50 text-xs sm:text-sm font-medium mb-4 sm:mb-6">
                            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                            Serving 7 Municipal Departments
                        </div> */}
                        <h1 className="pt-10 text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight leading-[1.1] mb-4 sm:mb-6">
                            Civic issues?
                            <br />
                            <span className="text-foreground">Sorted with ease.</span>
                        </h1>
                        <p className="text-base sm:text-lg text-muted-foreground max-w-xl ">
                            Report potholes, broken lights, water issues, anything. We route it to the right people and make sure it gets fixed.
                        </p>
                    </div>

                    {/* Bento Grid */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                        {/* Main CTA Card */}
                        <Card className="col-span-2 row-span-2 bg-foreground text-background overflow-hidden group">
                            <CardContent className="p-0 h-full flex flex-col">
                                <div className="p-5 sm:p-8 flex-1 flex flex-col">
                                    <div className="flex-1">
                                        <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-background/10 flex items-center justify-center mb-4 sm:mb-6">
                                            <FileText className="w-5 h-5 sm:w-6 sm:h-6" />
                                        </div>
                                        <h2 className="text-xl sm:text-2xl md:text-3xl font-semibold mb-2 sm:mb-3">
                                            File a complaint in under 2 minutes
                                        </h2>
                                        <p className="text-background/70 text-sm sm:text-base">
                                            Snap a photo, drop a pin, describe the issue. Our AI handles the rest.
                                        </p>
                                    </div>
                                    <div className="mt-4 sm:mt-6 flex flex-col xs:flex-row gap-2 sm:gap-3">
                                        <Link to="/login" className="flex-1 xs:flex-initial">
                                            <Button size="lg" variant="secondary" className="w-full rounded-full gap-2 group-hover:gap-3 transition-all">
                                                Start Now
                                                <ArrowRight className="w-4 h-4" />
                                            </Button>
                                        </Link>
                                        <Link to="/login" className="flex-1 xs:flex-initial">
                                            <Button size="lg" variant="ghost" className="w-full rounded-full text-background hover:bg-background/10 hover:text-background">
                                                Sign In
                                            </Button>
                                        </Link>
                                    </div>
                                </div>

                                {/* <div className="h-20 sm:h-32 bg-gradient-to-t from-background/5 to-transparent relative overflow-hidden">
                                    <div className="absolute bottom-2 sm:bottom-4 left-5 sm:left-8 right-5 sm:right-8 flex gap-2">
                                        <div className="h-2 sm:h-3 flex-[3] rounded-full bg-background/20" />
                                        <div className="h-2 sm:h-3 flex-[3] rounded-full bg-background/10" />
                                        <div className="h-2 sm:h-3 flex-[3] rounded-full bg-background/10" />
                                    </div>
                                </div> */}
                            </CardContent>
                        </Card>

                        {/* 48hr SLA Card */}
                        <Card className="bg-amber-500 dark:bg-amber-600 text-white border-0 overflow-hidden h-full">
                            <CardContent className="p-4 sm:p-5 h-full flex flex-col">
                                <Clock className="w-5 h-5 sm:w-6 sm:h-6 mb-auto opacity-80" />
                                <div className="mt-4 sm:mt-8">
                                    <div className="text-base sm:text-lg font-semibold mb-1">Efficient Resolution</div>
                                    <p className="text-white/80 text-xs sm:text-sm">Guarantee with auto-escalation</p>
                                </div>
                            </CardContent>
                        </Card>

                        {/* AI Card */}
                        <Card className="bg-violet-500 dark:bg-violet-600 text-white border-0 overflow-hidden h-full">
                            <CardContent className="p-4 sm:p-5 h-full flex flex-col">
                                <Zap className="w-5 h-5 sm:w-6 sm:h-6 mb-auto opacity-80" />
                                <div className="mt-4 sm:mt-8">
                                    <div className="text-base sm:text-lg font-semibold mb-1">AI Routing</div>
                                    <p className="text-white/80 text-xs sm:text-sm">Smart classification to the right dept</p>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Notifications Card */}
                        <Card className="bg-emerald-500 dark:bg-emerald-600 text-white border-0 overflow-hidden h-full">
                            <CardContent className="p-4 sm:p-5 h-full flex flex-col">
                                <Bell className="w-5 h-5 sm:w-6 sm:h-6 opacity-80 mb-auto" />
                                <div className="mt-4 sm:mt-8">
                                    <div className="text-base sm:text-lg font-semibold mb-1">Real-time alerts</div>
                                    <p className="text-white/80 text-xs sm:text-sm">WhatsApp & email updates</p>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Track Card */}
                        <Card className="bg-blue-500 dark:bg-blue-600 text-white border-0 overflow-hidden h-full">
                            <CardContent className="p-4 sm:p-5 h-full flex flex-col">
                                <BarChart3 className="w-5 h-5 sm:w-6 sm:h-6 opacity-80 mb-auto" />
                                <div className="mt-4 sm:mt-8">
                                    <div className="text-base sm:text-lg font-semibold mb-1">Track progress</div>
                                    <p className="text-white/80 text-xs sm:text-sm">Live status dashboard</p>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </section>

            {/* How it works - Minimal timeline */}
            <section className="py-12 sm:py-20">
                <div className="max-w-7xl mx-auto px-4 sm:px-6">
                    <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-8 sm:mb-12">
                        <div>
                            <h2 className="text-2xl sm:text-3xl font-bold mb-2">How it works</h2>
                            <p className="text-muted-foreground">Four steps to resolution</p>
                        </div>
                        <Link to="/signup">
                            <Button variant="outline" className="rounded-full gap-2 w-full sm:w-auto">
                                Try it now <ArrowUpRight className="w-4 h-4" />
                            </Button>
                        </Link>
                    </div>

                    <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
                        {[
                            { num: '01', title: 'Capture', desc: 'Photo + location + description', icon: Camera },
                            { num: '02', title: 'Route', desc: 'AI assigns to right department', icon: Layers },
                            { num: '03', title: 'Resolve', desc: 'Staff works with 48hr deadline', icon: MessageSquare },
                            { num: '04', title: 'Verify', desc: 'You confirm the fix', icon: CheckCircle },
                        ].map((step, i) => (
                            <div key={i} className="group">
                                <div className="flex items-center gap-3 sm:gap-4 mb-3 sm:mb-4">
                                    <span className="text-4xl sm:text-5xl font-bold text-muted-foreground/30 group-hover:text-primary/50 transition-colors">
                                        {step.num}
                                    </span>
                                    <step.icon className="w-5 h-5 sm:w-6 sm:h-6 text-muted-foreground" />
                                </div>
                                <h3 className="text-lg sm:text-xl font-semibold mb-1">{step.title}</h3>
                                <p className="text-sm text-muted-foreground">{step.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Features list - Clean rows */}
            <section className="py-12 sm:py-20 border-t">
                <div className="max-w-7xl mx-auto px-4 sm:px-6">
                    <h2 className="text-2xl sm:text-3xl font-bold mb-8 sm:mb-12">Why Argus?</h2>

                    <div className="space-y-0 divide-y">
                        {[
                            { title: 'Image Recognition', desc: 'AI analyzes photos to categorize issues automatically', tag: 'AI' },
                            { title: 'Auto Escalation', desc: 'Missed deadlines trigger automatic escalation to supervisors', tag: 'SLA' },
                            { title: 'Location Tagging', desc: 'Precise GPS coordinates help staff locate issues faster', tag: 'GEO' },
                            { title: 'Gamification', desc: 'Earn points and badges for civic participation', tag: 'NEW' },
                            { title: 'Multi-channel Alerts', desc: 'Get notified via WhatsApp, SMS, or email — your choice', tag: 'NOTIFY' },
                            { title: 'Analytics Dashboard', desc: 'Department heads track performance metrics in real-time', tag: 'DATA' },
                        ].map((feature, i) => (
                            <div key={i} className="flex flex-col sm:flex-row sm:items-center justify-between py-4 sm:py-6 gap-2 sm:gap-4 group">
                                <div className="flex items-start sm:items-center gap-3 sm:gap-4 flex-1">
                                    <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all shrink-0 mt-1 sm:mt-0" />
                                    <div className="flex-1 min-w-0">
                                        <h3 className="font-semibold text-base sm:text-lg">{feature.title}</h3>
                                        <p className="text-sm text-muted-foreground">{feature.desc}</p>
                                    </div>
                                </div>
                                <span className="text-[10px] sm:text-xs font-mono px-2 py-1 rounded bg-muted text-muted-foreground w-fit">
                                    {feature.tag}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Roles section - Compact */}
            <section className="py-12 sm:py-20 bg-muted/30">
                <div className="max-w-7xl mx-auto px-4 sm:px-6">
                    <div className="text-center mb-8 sm:mb-12">
                        <h2 className="text-2xl sm:text-3xl font-bold mb-2">One platform, every stakeholder</h2>
                        <p className="text-muted-foreground">Built for the entire grievance lifecycle</p>
                    </div>

                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                        {[
                            { role: 'Citizens', action: 'File & track complaints', color: 'bg-blue-500' },
                            { role: 'Staff', action: 'Resolve with proof', color: 'bg-green-500' },
                            { role: 'Dept Heads', action: 'Monitor & assign', color: 'bg-orange-500' },
                            { role: 'Admins', action: 'Full system control', color: 'bg-purple-500' },
                        ].map((item, i) => (
                            <Card key={i} className="overflow-hidden">
                                <CardContent className="p-4 sm:p-5">
                                    <div className={`w-2 h-2 rounded-full ${item.color} mb-3 sm:mb-4`} />
                                    <h3 className="font-semibold mb-1 text-sm sm:text-base">{item.role}</h3>
                                    <p className="text-xs sm:text-sm text-muted-foreground">{item.action}</p>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </div>
            </section>

            {/* Final CTA - Minimal */}
            <section className="py-16 sm:py-24">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 text-center">
                    <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-4 sm:mb-6">
                        Ready to report an issue?
                    </h2>
                    <p className="text-muted-foreground mb-6 sm:mb-8 max-w-md mx-auto text-sm sm:text-base">
                        Join citizens who've successfully resolved their civic complaints.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-3 justify-center">
                        <Link to="/signup">
                            <Button size="lg" className="rounded-full px-6 sm:px-8 gap-2 w-full sm:w-auto">
                                Create Account <ArrowRight className="w-4 h-4" />
                            </Button>
                        </Link>
                        <Link to="/login">
                            <Button size="lg" variant="outline" className="rounded-full px-6 sm:px-8 w-full sm:w-auto">
                                Sign In
                            </Button>
                        </Link>
                    </div>
                </div>
            </section>

            {/* Footer - Minimal */}
            <footer className="border-t py-6 sm:py-8">
                <div className="max-w-7xl mx-auto px-4 sm:px-6">
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                        <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded bg-foreground flex items-center justify-center">
                                <ArgusLogo className="h-4 w-4 text-background" />
                            </div>
                            <span className="text-sm font-medium">Argus</span>
                        </div>
                        <p className="text-xs text-muted-foreground">
                            © {new Date().getFullYear()} Argus. Making cities better, one complaint at a time.
                        </p>
                    </div>
                </div>
            </footer>
        </div>
    );
};

export default LandingPage;
