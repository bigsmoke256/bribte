import { LucideIcon, TrendingUp, TrendingDown } from "lucide-react";
import { motion } from "framer-motion";

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  trend?: { value: number; positive: boolean };
  variant?: "default" | "primary" | "success" | "warning" | "info";
  delay?: number;
}

const variantConfig = {
  default: {
    card: "bg-card",
    icon: "bg-primary/10 text-primary",
    text: "text-card-foreground",
    sub: "text-muted-foreground",
  },
  primary: {
    card: "primary-gradient text-primary-foreground",
    icon: "bg-primary-foreground/15 text-primary-foreground",
    text: "text-primary-foreground",
    sub: "text-primary-foreground/70",
  },
  success: {
    card: "bg-card border-success/20",
    icon: "bg-success/10 text-success",
    text: "text-card-foreground",
    sub: "text-muted-foreground",
  },
  warning: {
    card: "bg-card border-warning/20",
    icon: "bg-warning/10 text-warning",
    text: "text-card-foreground",
    sub: "text-muted-foreground",
  },
  info: {
    card: "bg-card border-info/20",
    icon: "bg-info/10 text-info",
    text: "text-card-foreground",
    sub: "text-muted-foreground",
  },
};

export function StatCard({ title, value, subtitle, icon: Icon, trend, variant = "default", delay = 0 }: StatCardProps) {
  const config = variantConfig[variant];

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay, ease: "easeOut" }}
      className={`stat-card ${config.card} group`}
    >
      <div className="flex items-start justify-between">
        <div className="space-y-2 min-w-0 flex-1">
          <p className={`text-[11px] font-semibold uppercase tracking-widest ${config.sub}`}>{title}</p>
          <motion.p
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: delay + 0.15 }}
            className={`text-2xl lg:text-3xl font-display font-extrabold ${config.text} tracking-tight`}
          >
            {value}
          </motion.p>
          {subtitle && <p className={`text-xs ${config.sub}`}>{subtitle}</p>}
          {trend && (
            <div className={`inline-flex items-center gap-1 metric-badge ${trend.positive ? "metric-badge-success" : "metric-badge-destructive"}`}>
              {trend.positive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
              <span>{Math.abs(trend.value)}%</span>
            </div>
          )}
        </div>
        <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${config.icon} transition-transform duration-300 group-hover:scale-110`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
    </motion.div>
  );
}
