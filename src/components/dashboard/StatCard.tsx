import { LucideIcon } from "lucide-react";

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  trend?: { value: number; positive: boolean };
  variant?: "default" | "primary" | "success" | "warning" | "info";
}

const variantStyles = {
  default: "bg-card",
  primary: "bg-primary text-primary-foreground",
  success: "bg-success text-success-foreground",
  warning: "bg-warning text-warning-foreground",
  info: "bg-info text-info-foreground",
};

const iconVariantStyles = {
  default: "bg-primary/10 text-primary",
  primary: "bg-primary-foreground/20 text-primary-foreground",
  success: "bg-success-foreground/20 text-success-foreground",
  warning: "bg-warning-foreground/20 text-warning-foreground",
  info: "bg-info-foreground/20 text-info-foreground",
};

export function StatCard({ title, value, subtitle, icon: Icon, trend, variant = "default" }: StatCardProps) {
  return (
    <div className={`stat-card ${variantStyles[variant]} animate-fade-in`}>
      <div className="flex items-start justify-between">
        <div className="space-y-1.5">
          <p className={`text-xs font-medium uppercase tracking-wider ${variant === "default" ? "text-muted-foreground" : "opacity-80"}`}>{title}</p>
          <p className="text-2xl font-display font-bold">{value}</p>
          {subtitle && <p className={`text-xs ${variant === "default" ? "text-muted-foreground" : "opacity-70"}`}>{subtitle}</p>}
          {trend && (
            <p className={`text-xs font-medium ${trend.positive ? "text-success" : "text-destructive"}`}>
              {trend.positive ? "↑" : "↓"} {Math.abs(trend.value)}% from last month
            </p>
          )}
        </div>
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${iconVariantStyles[variant]}`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
    </div>
  );
}
