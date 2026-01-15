import { useAuth } from "@/hooks/use-auth";
import { Redirect } from "wouter";
import { Button } from "@/components/ui/button";
import { 
  Loader2, 
  ArrowRight, 
  FileSpreadsheet,
  BarChart3,
  Calculator,
  CheckCircle2,
  Shield,
  Zap,
  TrendingUp,
  LineChart,
  PieChart,
  Download,
  Sparkles,
  Activity,
  Target,
  Layers,
  Lightbulb
} from "lucide-react";
import { useEffect, useState } from "react";

export default function Home() {
  const { isLoading, isAuthenticated } = useAuth();
  const [scrollY, setScrollY] = useState(0);

  useEffect(() => {
    document.title = "Bottomline | Institutional-Grade Financial Modeling";
    
    const metaDescription = document.querySelector('meta[name="description"]');
    if (metaDescription) {
      metaDescription.setAttribute('content', 'Bottomline builds institutional-grade financial models automatically. 5-year projections, DCF valuations, and auditable Excel outputs ready for investment committees.');
    } else {
      const meta = document.createElement('meta');
      meta.name = 'description';
      meta.content = 'Bottomline builds institutional-grade financial models automatically. 5-year projections, DCF valuations, and auditable Excel outputs ready for investment committees.';
      document.head.appendChild(meta);
    }

    const handleScroll = () => setScrollY(window.scrollY);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  if (isLoading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="h-12 w-12 rounded-full border-2 border-primary/30 border-t-primary animate-spin" />
            <div className="absolute inset-0 h-12 w-12 rounded-full bg-primary/20 blur-xl animate-pulse" />
          </div>
          <span className="text-sm text-muted-foreground">Loading Bottomline...</span>
        </div>
      </div>
    );
  }

  if (isAuthenticated) {
    return <Redirect to="/dashboard" />;
  }

  const features = [
    {
      icon: FileSpreadsheet,
      title: "IC-Ready Excel Models",
      description: "Export complete models with live formulas, professional formatting, and institutional-grade presentation.",
      gradient: "from-blue-500 to-cyan-500"
    },
    {
      icon: Calculator,
      title: "DCF & LBO Analysis",
      description: "Full DCF valuation with sensitivity tables, LBO returns analysis, and trading comparables.",
      gradient: "from-violet-500 to-purple-500"
    },
    {
      icon: BarChart3,
      title: "5-Year Projections",
      description: "Complete P&L, balance sheet drivers, working capital schedules, and free cash flow projections.",
      gradient: "from-emerald-500 to-teal-500"
    },
    {
      icon: Shield,
      title: "Audit-Ready Output",
      description: "Every calculation is traceable. No black boxes. Full formula transparency for IC review.",
      gradient: "from-orange-500 to-amber-500"
    },
    {
      icon: Lightbulb,
      title: "Executive Insights",
      description: "Strategic intelligence distilled from your models. Portfolio analytics, risk signals, and actionable recommendations.",
      gradient: "from-amber-500 to-orange-500"
    },
    {
      icon: TrendingUp,
      title: "Scenario Planning",
      description: "Model base, upside, and downside cases with automatic sensitivity analysis across key value drivers.",
      gradient: "from-rose-500 to-pink-500"
    }
  ];

  const stats = [
    { value: "100+", label: "Models Generated", icon: Layers },
    { value: "5-Year", label: "Projections", icon: TrendingUp },
    { value: "6+", label: "Valuation Methods", icon: Target },
    { value: "< 60s", label: "To IC-Ready", icon: Zap }
  ];

  const methodologies = [
    { name: "DCF Analysis", description: "Gordon Growth & Exit Multiple methods with mid-year convention" },
    { name: "Trading Comps", description: "Peer company analysis with EV/EBITDA and P/E multiples" },
    { name: "Precedent Transactions", description: "M&A transaction analysis with implied premiums" },
    { name: "LBO Returns", description: "Leveraged buyout with IRR and MOIC calculations" },
    { name: "Sensitivity Analysis", description: "Two-way tables for key value drivers" },
    { name: "Scenario Modeling", description: "Base, upside, and downside case analysis" }
  ];

  return (
    <div className="min-h-screen bg-background overflow-hidden">
      <nav 
        className="fixed top-0 w-full z-50 transition-all duration-300"
        style={{
          backgroundColor: scrollY > 50 ? 'hsl(var(--background) / 0.8)' : 'transparent',
          backdropFilter: scrollY > 50 ? 'blur(20px)' : 'none',
          borderBottom: scrollY > 50 ? '1px solid hsl(var(--border) / 0.5)' : 'none'
        }}
      >
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center">
              <Activity className="h-4 w-4 text-white" />
            </div>
            <span className="text-xl font-bold tracking-tight">Bottomline</span>
          </div>
          <div className="flex items-center gap-3">
            <Button 
              variant="ghost" 
              size="sm"
              className="text-muted-foreground hover:text-foreground"
              onClick={() => window.location.href = "/auth"} 
              data-testid="button-login"
            >
              Sign in
            </Button>
            <Button 
              size="sm"
              className="btn-premium rounded-full px-5"
              onClick={() => window.location.href = "/auth"} 
              data-testid="button-get-started"
            >
              Get Started
              <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </nav>

      <section className="relative min-h-screen flex items-center justify-center pt-16 hero-gradient">
        <div className="absolute inset-0 grid-pattern opacity-30" />
        
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/20 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-accent/15 rounded-full blur-[100px] animate-pulse" style={{ animationDelay: '1s' }} />
        
        <div className="relative z-10 max-w-5xl mx-auto px-6 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass mb-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <Sparkles className="h-4 w-4 text-accent" />
            <span className="text-sm font-medium">Institutional-Grade Financial Modeling</span>
          </div>
          
          <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight mb-8 animate-in fade-in slide-in-from-bottom-6 duration-700" style={{ animationDelay: '100ms' }}>
            <span className="block">Precision-built models.</span>
            <span className="gradient-text">Decisive outcomes.</span>
          </h1>
          
          <p className="text-xl md:text-2xl text-muted-foreground max-w-2xl mx-auto mb-12 leading-relaxed animate-in fade-in slide-in-from-bottom-6 duration-700" style={{ animationDelay: '200ms' }}>
            5-year projections, DCF valuations, and IC-ready Excel outputs. 
            Generated in seconds, not hours.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16 animate-in fade-in slide-in-from-bottom-6 duration-700" style={{ animationDelay: '300ms' }}>
            <Button 
              size="lg" 
              className="btn-premium h-14 px-8 text-base rounded-full"
              onClick={() => window.location.href = "/auth"}
              data-testid="button-hero-cta"
            >
              <span>Start Building</span>
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
            <Button 
              variant="outline" 
              size="lg"
              className="h-14 px-8 text-base rounded-full glass"
              onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })}
              data-testid="button-learn-more"
            >
              <span>See What's Possible</span>
            </Button>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-8 text-sm animate-in fade-in slide-in-from-bottom-6 duration-700" style={{ animationDelay: '400ms' }}>
            {[
              "No credit card required",
              "Full Excel export",
              "Auditable formulas"
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-2 text-muted-foreground">
                <CheckCircle2 className="h-4 w-4 text-accent" />
                <span>{item}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 animate-bounce">
          <div className="w-6 h-10 rounded-full border-2 border-muted-foreground/30 flex items-start justify-center p-1">
            <div className="w-1 h-2 rounded-full bg-muted-foreground/50" />
          </div>
        </div>
      </section>

      <section className="py-20 relative">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {stats.map((stat, i) => (
              <div 
                key={i} 
                className="bg-card border border-border rounded-xl p-6 text-center group hover:border-primary/40 hover:shadow-lg hover:shadow-primary/10 transition-all duration-300 cursor-default"
                data-testid={`stat-card-${i}`}
              >
                <stat.icon className="h-6 w-6 mx-auto mb-3 text-primary group-hover:text-accent transition-colors duration-300" />
                <div className="text-3xl md:text-4xl font-bold mb-1 text-foreground">{stat.value}</div>
                <div className="text-sm text-muted-foreground uppercase tracking-wider">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="features" className="py-24 relative">
        <div className="absolute inset-0 hero-gradient opacity-50" />
        <div className="max-w-7xl mx-auto px-6 relative z-10">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight mb-6" data-testid="text-features-title">
              Everything you need for
              <span className="gradient-text block">institutional-grade analysis</span>
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Comprehensive financial modeling capabilities trusted by investment professionals.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {features.map((feature, index) => (
              <div 
                key={index}
                className="bg-card border border-border rounded-xl p-8 group hover:border-primary/40 hover:shadow-lg hover:shadow-primary/10 transition-all duration-300"
                data-testid={`feature-card-${index}`}
              >
                <div className={`h-14 w-14 rounded-2xl bg-gradient-to-br ${feature.gradient} flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300`}>
                  <feature.icon className="h-7 w-7 text-white" />
                </div>
                <h3 className="text-xl font-semibold mb-3 text-foreground">{feature.title}</h3>
                <p className="text-muted-foreground leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-24 relative">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">
              Complete Valuation Suite
            </h2>
            <p className="text-lg text-muted-foreground max-w-xl mx-auto">
              Six institutional-grade valuation methodologies in every model
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {methodologies.map((method, i) => (
              <div 
                key={i}
                className="bg-card border border-border rounded-xl p-6 hover:border-primary/40 transition-all duration-300 group"
                data-testid={`methodology-${i}`}
              >
                <div className="flex items-start gap-4">
                  <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 group-hover:bg-primary/20 transition-colors">
                    <LineChart className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold mb-1 text-foreground">{method.name}</h3>
                    <p className="text-sm text-muted-foreground">{method.description}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-24 relative">
        <div className="absolute inset-0 hero-gradient opacity-30" />
        <div className="max-w-5xl mx-auto px-6 text-center relative z-10">
          <div className="bg-card border border-border rounded-xl p-12 md:p-16 shadow-lg shadow-primary/10">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm font-medium mb-8">
              <Zap className="h-4 w-4" />
              <span>Ready to transform your workflow?</span>
            </div>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight mb-6">
              Build your first model
              <span className="gradient-text block">in under a minute</span>
            </h2>
            <p className="text-lg text-muted-foreground max-w-xl mx-auto mb-10">
              Enter your assumptions and Bottomline generates complete 5-year projections, 
              DCF valuations, and IC-ready Excel exports.
            </p>
            <Button 
              size="lg" 
              className="btn-premium h-14 px-10 text-base rounded-full"
              onClick={() => window.location.href = "/auth"}
              data-testid="button-cta-bottom"
            >
              Get Started Free
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </div>
        </div>
      </section>

      <footer className="py-12 border-t border-border">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                <Activity className="h-4 w-4 text-white" />
              </div>
              <span className="font-semibold">Bottomline</span>
            </div>
            <p className="text-sm text-muted-foreground">
              Institutional-grade financial modeling for serious teams.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
