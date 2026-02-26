import { TrendingUp } from "lucide-react";

interface Metric {
  label: string;
  value: string | number;
  trend?: string;
}

interface MetricBarProps {
  metrics: Metric[];
}

export function MetricBar({ metrics }: MetricBarProps) {
  return (
    <div className="flex items-center gap-1 px-4 py-2 border-b border-border bg-card overflow-x-auto">
      {metrics.map((m, i) => (
        <div key={m.label} className="flex items-center gap-3 px-3 py-1.5 shrink-0">
          <div>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{m.label}</p>
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-bold text-foreground">{m.value}</span>
              {m.trend && (
                <span className="text-[10px] text-accent flex items-center gap-0.5">
                  <TrendingUp className="h-2.5 w-2.5" /> {m.trend}
                </span>
              )}
            </div>
          </div>
          {i < metrics.length - 1 && <div className="w-px h-8 bg-border ml-3" />}
        </div>
      ))}
    </div>
  );
}
