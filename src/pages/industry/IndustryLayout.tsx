import { useEffect, useState } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { getToken } from "@/lib/api";
import { DashboardLayout } from "@/components/Dashboard/DashboardLayout";
import { BarChart3, Users, UserCircle, Briefcase, Calendar, Settings, Home, Sparkles, ClipboardList } from "lucide-react";
import { fetchIndustryMetrics } from "@/lib/api";

const navItems = [
  { label: "Home", href: "/industry/home", icon: Home },
  { label: "AI JD Builder", href: "/industry/jd-create", icon: Sparkles },
  { label: "Competency Matrix", href: "/industry/competency", icon: BarChart3 },
  { label: "Talent Discovery", href: "/industry/shortlisting", icon: Users },
  { label: "Active Hiring", href: "/industry/active-hiring", icon: ClipboardList },
  { label: "Future Hiring", href: "/industry/future-hiring", icon: Briefcase },
  { label: "Events & Contributions", href: "/industry/contribute", icon: Calendar },
  { label: "Company Profile", href: "/industry/profile", icon: UserCircle },
  { label: "Settings", href: "/industry/settings", icon: Settings },
];

const defaultMetrics = [
  { label: "Active Postings", value: 0 },
  { label: "New Matches (>85%)", value: 0 },
  { label: "Interviewing Today", value: 0 },
  { label: "Training Pipeline", value: 0 },
];

export default function IndustryLayout() {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const [metrics, setMetrics] = useState(defaultMetrics);

  useEffect(() => {
    // Read token directly so we don't rely on context having re-rendered after login
    if (!getToken()) {
      navigate("/login", { replace: true });
      return;
    }
    fetchIndustryMetrics()
      .then((data) => setMetrics(data.metrics ?? defaultMetrics))
      .catch(() => {});
  }, [navigate]);

  return (
    <DashboardLayout
      navItems={navItems}
      metrics={metrics}
      portalLabel="Industry Portal"
      basePath="/industry"
      onLogout={logout}
    >
      <Outlet />
    </DashboardLayout>
  );
}
