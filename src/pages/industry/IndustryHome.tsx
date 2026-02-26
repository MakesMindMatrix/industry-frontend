import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  PartyPopper,
  Trophy,
  BarChart3,
  CalendarDays,
  Sparkles,
  Search,
  BrainCircuit,
  Calendar,
  Plus,
  ArrowRight,
  TrendingUp,
  Users,
  GraduationCap,
  Star,
  FileText,
  Building2,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { fetchIndustryHome, getProfile } from "@/lib/api";

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  PartyPopper,
  Trophy,
  BarChart3,
  TrendingUp,
  GraduationCap,
  CalendarDays,
  Star,
  Users,
};

const quickActions = [
  { label: "Create JD (AI Powered)", icon: Plus, href: "/industry/jd-create", variant: "default" as const },
  { label: "Upload JD", icon: FileText, href: "/industry/jd-upload", variant: "outline" as const },
  { label: "Company Profile", icon: Building2, href: "/industry/profile", variant: "outline" as const },
  { label: "Discover Talent", icon: Search, href: "/industry/shortlisting", variant: "outline" as const },
  { label: "View Competency Matrix", icon: BrainCircuit, href: "/industry/competency", variant: "outline" as const },
  { label: "Plan Future Hiring", icon: Calendar, href: "/industry/future-hiring", variant: "outline" as const },
];

const container = { hidden: {}, show: { transition: { staggerChildren: 0.07 } } };
const item = { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0 } };

export default function IndustryHome() {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const [profile, setProfile] = useState<{ companyName?: string } | null>(null);
  const [home, setHome] = useState<{ hiringHighlights?: Array<{ icon?: string; title: string; time?: string; color?: string; bg?: string }>; newsFeed?: Array<{ tag: string; title: string; desc: string; icon?: string }> } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    getProfile()
      .then((p) => { if (!cancelled) setProfile(p); })
      .catch((err) => {
        if (!cancelled) {
          setProfile(null);
          if ((err as Error)?.message === "Session expired") logout();
        }
      });
    return () => { cancelled = true; };
  }, [logout]);

  useEffect(() => {
    let cancelled = false;
    fetchIndustryHome()
      .then((data) => { if (!cancelled) setHome(data); })
      .catch(() => { if (!cancelled) setHome({ hiringHighlights: [], newsFeed: [] }); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const hiringHighlights = Array.isArray(home?.hiringHighlights) ? home.hiringHighlights : [];
  const newsFeed = Array.isArray(home?.newsFeed) ? home.newsFeed : [];
  const companyName = profile?.companyName || "there";

  return (
    <motion.div className="space-y-8 max-w-5xl mx-auto" variants={container} initial="hidden" animate="show">
      <motion.div variants={item}>
        <div className="rounded-2xl bg-gradient-to-r from-primary/15 via-primary/5 to-accent/10 border border-primary/10 p-6 md:p-8">
          <h1 className="text-2xl md:text-3xl font-bold text-foreground font-['Space_Grotesk']">Welcome back, {companyName} 👋</h1>
          <p className="text-muted-foreground mt-1.5 text-sm md:text-base">Here&apos;s what&apos;s happening in your talent ecosystem. <Button variant="link" className="p-0 h-auto text-primary font-medium" onClick={() => navigate("/industry/profile")}>View profile</Button></p>
        </div>
      </motion.div>

      <motion.section variants={item} className="space-y-4">
        <h2 className="text-lg font-semibold text-foreground font-['Space_Grotesk']">Recent Hiring Highlights</h2>
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : (
          <div className="grid sm:grid-cols-2 gap-3">
            {hiringHighlights.map((h, idx) => {
              const Icon = h.icon ? iconMap[h.icon] ?? PartyPopper : PartyPopper;
              return (
                <Card key={h.title ? `${h.title}-${idx}` : `highlight-${idx}`} className="hover:shadow-md transition-shadow cursor-pointer">
                  <CardContent className="flex items-start gap-3 p-4">
                    <div className={`shrink-0 w-10 h-10 rounded-xl ${h.bg ?? "bg-primary/10"} flex items-center justify-center`}>
                      <Icon className={`h-5 w-5 ${h.color ?? "text-primary"}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground leading-tight">{h.title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{h.time ?? ""}</p>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
        {!loading && hiringHighlights.length === 0 && (
          <p className="text-sm text-muted-foreground">No highlights yet.</p>
        )}
      </motion.section>

      <motion.section variants={item} className="space-y-4">
        <h2 className="text-lg font-semibold text-foreground font-['Space_Grotesk']">News & Updates</h2>
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : (
          <div className="space-y-3">
            {newsFeed.map((n, idx) => {
              const Icon = n.icon ? iconMap[n.icon] ?? GraduationCap : GraduationCap;
              return (
                <Card key={n.title ? `${n.title}-${idx}` : `news-${idx}`} className="hover:shadow-md transition-shadow cursor-pointer group">
                  <CardContent className="flex items-start gap-4 p-4">
                    <div className="shrink-0 w-10 h-10 rounded-xl bg-muted flex items-center justify-center">
                      <Icon className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="secondary" className="text-[10px] px-1.5 py-0">{n.tag}</Badge>
                      </div>
                      <p className="text-sm font-medium text-foreground">{n.title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{n.desc}</p>
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0 mt-1" />
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
        {!loading && newsFeed.length === 0 && (
          <p className="text-sm text-muted-foreground">No news yet.</p>
        )}
      </motion.section>

      <motion.section variants={item} className="space-y-4">
        <h2 className="text-lg font-semibold text-foreground font-['Space_Grotesk']">Quick Actions</h2>
        <div className="flex flex-wrap gap-3">
          {quickActions.map((a) => {
            const Icon = a.icon;
            return (
              <Button key={a.label} variant={a.variant} className="gap-2" onClick={() => navigate(a.href)}>
                <Icon className="h-4 w-4" />
                {a.label}
              </Button>
            );
          })}
        </div>
      </motion.section>
    </motion.div>
  );
}
