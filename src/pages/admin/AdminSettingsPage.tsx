import { useAuth } from "@/lib/auth-context";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { AnimatedCard, SectionHeader } from "@/components/dashboard/DashboardParts";
import { Settings } from "lucide-react";
import { motion } from "framer-motion";

export default function AdminSettingsPage() {
  const { user } = useAuth();
  if (!user) return null;

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-[1400px] mx-auto">
        <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="font-display text-2xl lg:text-3xl font-extrabold tracking-tight">Settings</h1>
          <p className="text-sm text-muted-foreground mt-1">System configuration</p>
        </motion.div>

        <AnimatedCard>
          <SectionHeader title="System Settings" icon={Settings} />
          <div className="py-8 text-center">
            <p className="text-muted-foreground text-sm">System settings and configuration options will appear here.</p>
            <p className="text-xs text-muted-foreground mt-2">Academic year, semester dates, fee structures, and more.</p>
          </div>
        </AnimatedCard>
      </div>
    </DashboardLayout>
  );
}
