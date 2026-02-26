import { useState, ReactNode } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Menu, LogOut, PanelLeftClose, PanelLeft, Moon, Sun } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { MetricBar } from "./MetricBar";
import { useTheme } from "next-themes";

interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
}

interface Metric {
  label: string;
  value: string | number;
  trend?: string;
}

interface DashboardLayoutProps {
  children: ReactNode;
  navItems: NavItem[];
  metrics: Metric[];
  portalLabel: string;
  basePath: string;
  onLogout?: () => void;
}

export function DashboardLayout({ children, navItems, metrics, portalLabel, basePath, onLogout }: DashboardLayoutProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme();

  const handleSignOut = () => {
    if (onLogout) {
      onLogout();
      navigate("/login", { replace: true });
    } else {
      navigate("/");
    }
  };

  const SidebarContent = () => (
    <div className="flex flex-col h-full min-h-0">
      <div className={cn("p-4 border-b border-sidebar-border flex items-center gap-2 shrink-0", collapsed && "justify-center px-2")}>
        <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center shrink-0">
          <span className="text-primary-foreground font-bold text-sm">I</span>
        </div>
        {!collapsed && (
          <div className="min-w-0">
            <span className="font-bold text-sidebar-foreground font-['Space_Grotesk'] text-sm">Industry</span>
            <p className="text-[10px] text-sidebar-foreground/60 truncate">{portalLabel}</p>
          </div>
        )}
      </div>

      <div className="px-2 mb-1 pt-4 shrink-0">
        {!collapsed && <p className="text-[10px] text-sidebar-foreground/40 uppercase tracking-wider px-3 py-1">Navigation</p>}
      </div>

      <nav className="flex-1 min-h-0 px-2 space-y-0.5 overflow-y-auto">
        {navItems.map((item) => {
          const isActive =
            location.pathname === item.href ||
            (item.href === `${basePath}/home` && location.pathname === basePath);
          return (
            <Link
              key={item.href}
              to={item.href}
              onClick={() => setMobileOpen(false)}
              className={cn(
                "flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors",
                isActive
                  ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                  : "text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50",
                collapsed && "justify-center px-2"
              )}
            >
              <item.icon className="h-4 w-4 shrink-0" />
              {!collapsed && <span className="truncate">{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      <div className="p-2 border-t border-sidebar-border shrink-0 mt-auto">
        <Button
          variant="ghost"
          onClick={handleSignOut}
          className={cn(
            "w-full text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50",
            collapsed ? "justify-center px-2" : "justify-start gap-2"
          )}
        >
          <LogOut className="h-4 w-4 shrink-0" />
          {!collapsed && <span className="text-sm">Sign Out</span>}
        </Button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background flex">
      <aside
        className={cn(
          "hidden lg:flex flex-col bg-sidebar border-r border-sidebar-border transition-all duration-200 shrink-0 h-screen sticky top-0",
          collapsed ? "w-14" : "w-60"
        )}
      >
        <SidebarContent />
      </aside>

      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="w-64 p-0 bg-sidebar border-sidebar-border [&>button]:hidden">
          <SidebarContent />
        </SheetContent>
      </Sheet>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-12 border-b border-border bg-card flex items-center px-3 gap-2 sticky top-0 z-20">
          <button className="lg:hidden p-1.5 hover:bg-muted rounded-lg" onClick={() => setMobileOpen(true)}>
            <Menu className="h-5 w-5" />
          </button>
          <button className="hidden lg:block p-1.5 hover:bg-muted rounded-lg" onClick={() => setCollapsed(!collapsed)}>
            {collapsed ? <PanelLeft className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
          </button>
          <h1 className="text-sm font-semibold text-foreground truncate font-['Space_Grotesk'] flex-1">
            {navItems.find((n) => n.href === location.pathname)?.label ?? "Dashboard"}
          </h1>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          >
            <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
            <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          </Button>
        </header>

        <MetricBar metrics={metrics} />

        <main className="flex-1 p-4 md:p-6 lg:p-8 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
