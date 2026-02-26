import { Link } from "react-router-dom";
import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { ArrowRight, Building2, Briefcase, Users, Zap, Target, TrendingUp } from "lucide-react";
import { motion } from "framer-motion";

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.1, duration: 0.5 } }),
};

const stats = [
  { value: "200+", label: "Industry Partners" },
  { value: "10K+", label: "Talent Matched" },
  { value: "95%", label: "Placement Rate" },
  { value: "50+", label: "AI Competencies" },
];

const features = [
  { icon: Briefcase, title: "JD Upload & Create", desc: "Upload or create job descriptions; get AI-generated competency matrices." },
  { icon: Target, title: "Smart Shortlisting", desc: "Match and shortlist talent based on skills and growth potential." },
  { icon: TrendingUp, title: "Future Hiring", desc: "Plan hiring and contribute via webinars, mentorship, and hackathons." },
  { icon: Users, title: "Company Profile", desc: "Showcase your brand and opportunities to the talent ecosystem." },
];

export default function Index() {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <section className="relative pt-24 pb-20 overflow-hidden" style={{ background: "var(--gradient-hero)" }}>
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmZmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNCI+PGNpcmNsZSBjeD0iMzAiIGN5PSIzMCIgcj0iMiIvPjwvZz48L2c+PC9zdmc+')] opacity-50" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <div className="grid lg:grid-cols-2 gap-12 items-center min-h-[70vh]">
            <motion.div initial="hidden" animate="visible" className="space-y-8">
              <motion.div variants={fadeUp} custom={0} className="inline-block px-4 py-2 rounded-full bg-white/15 backdrop-blur-sm text-white/90 text-sm font-medium">
                For Industry Partners
              </motion.div>
              <motion.h1 variants={fadeUp} custom={1} className="text-5xl md:text-6xl lg:text-7xl font-extrabold text-white leading-[1.1] tracking-tight">
                Hire AI-Ready Talent{" "}
                <span className="text-[hsl(170,80%,65%)]">Faster</span>
              </motion.h1>
              <motion.p variants={fadeUp} custom={2} className="text-lg md:text-xl text-white/80 max-w-lg leading-relaxed">
                Upload JDs, get competency matrices, shortlist candidates, and contribute to the talent ecosystem — all in one place.
              </motion.p>
              <motion.div variants={fadeUp} custom={3} className="flex flex-wrap gap-4">
                <Button asChild size="lg" variant="secondary" className="rounded-full px-8 text-primary font-semibold shadow-lg hover:shadow-xl transition-shadow">
                  <Link to="/login">Get Started <ArrowRight className="ml-2 h-4 w-4" /></Link>
                </Button>
                <Button asChild size="lg" variant="outline" className="rounded-full px-8 border-white/30 text-white hover:bg-white/10 hover:text-white">
                  <Link to="/login">Partner With Us</Link>
                </Button>
              </motion.div>
            </motion.div>

            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.3, duration: 0.6 }} className="hidden lg:flex justify-center">
              <div className="w-[480px] h-[380px] rounded-2xl bg-white/10 backdrop-blur-sm border border-white/20 flex items-center justify-center overflow-hidden shadow-2xl">
                <div className="text-center text-white/60 space-y-4 p-8">
                  <Building2 className="h-16 w-16 mx-auto text-[hsl(170,80%,65%)]" />
                  <p className="text-2xl font-bold text-white">Industry Portal</p>
                  <p className="text-white/60">Hire • Shortlist • Contribute</p>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      <section className="py-12 bg-card border-b border-border">
        <div className="max-w-5xl mx-auto px-4 grid grid-cols-2 md:grid-cols-4 gap-8">
          {stats.map((s, i) => (
            <motion.div key={s.label} initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={i} className="text-center">
              <div className="text-3xl md:text-4xl font-extrabold text-primary">{s.value}</div>
              <div className="text-sm text-muted-foreground mt-1">{s.label}</div>
            </motion.div>
          ))}
        </div>
      </section>

      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={0} className="text-center mb-14">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground">Built for Industry</h2>
            <p className="text-muted-foreground mt-3 max-w-xl mx-auto">AI-powered hiring tools that connect you to the right talent and help you contribute to the ecosystem.</p>
          </motion.div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((f, i) => (
              <motion.div key={f.title} initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={i + 1} className="bg-card rounded-xl p-6 border border-border hover:shadow-lg transition-shadow">
                <f.icon className="h-8 w-8 text-primary mb-4" />
                <h3 className="font-semibold text-foreground mb-2">{f.title}</h3>
                <p className="text-sm text-muted-foreground">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 bg-muted/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={0}>
            <Zap className="h-12 w-12 text-primary mx-auto mb-4" />
            <h2 className="text-3xl md:text-4xl font-bold text-foreground">Powered by GEN AI</h2>
            <p className="text-muted-foreground mt-3 max-w-xl mx-auto">Competency mapping, smart matching, and ecosystem contributions — all in one industry portal.</p>
            <Button asChild size="lg" className="mt-8 rounded-full px-8">
              <Link to="/login">Sign in to Industry Portal</Link>
            </Button>
          </motion.div>
        </div>
      </section>

      <footer className="py-12 bg-foreground text-background/70">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
                <span className="text-primary-foreground font-bold text-sm">I</span>
              </div>
              <span className="font-bold text-background">Industry Portal</span>
            </div>
            <p className="text-sm">© 2026 Industry Portal. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
