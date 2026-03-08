import { useAuth } from "@/lib/auth-context";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { AnimatedCard, SectionHeader } from "@/components/dashboard/DashboardParts";
import { Settings, Building2, GraduationCap, CreditCard, UserCheck, Save, Loader2, RefreshCw, Shield, Eye, EyeOff, KeyRound, Lock } from "lucide-react";
import { motion } from "framer-motion";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";

interface SettingRow {
  id: string;
  key: string;
  value: string;
  category: string;
}

export default function AdminSettingsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [settings, setSettings] = useState<SettingRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState<Record<string, string>>({});

  // Security / password state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);

  const fetchSettings = async () => {
    setLoading(true);
    const { data } = await supabase.from("system_settings").select("*").order("category");
    if (data) setSettings(data as SettingRow[]);
    setLoading(false);
  };

  useEffect(() => { fetchSettings(); }, []);

  const getValue = (key: string) => dirty[key] ?? settings.find(s => s.key === key)?.value ?? "";

  const setValue = (key: string, value: string) => {
    setDirty(prev => ({ ...prev, [key]: value }));
  };

  const hasPendingChanges = Object.keys(dirty).length > 0;

  const handleSave = async () => {
    setSaving(true);
    try {
      for (const [key, value] of Object.entries(dirty)) {
        await supabase.from("system_settings").update({ value, updated_at: new Date().toISOString() }).eq("key", key);
      }
      setDirty({});
      await fetchSettings();
      toast({ title: "Settings saved", description: "All changes have been applied successfully." });
    } catch {
      toast({ title: "Error", description: "Failed to save settings.", variant: "destructive" });
    }
    setSaving(false);
  };

  const handleChangePassword = async () => {
    if (!newPassword || !confirmPassword) {
      toast({ title: "Error", description: "Please fill in all password fields.", variant: "destructive" });
      return;
    }
    if (newPassword.length < 6) {
      toast({ title: "Error", description: "New password must be at least 6 characters.", variant: "destructive" });
      return;
    }
    if (newPassword !== confirmPassword) {
      toast({ title: "Error", description: "New passwords do not match.", variant: "destructive" });
      return;
    }

    setChangingPassword(true);
    try {
      // Re-authenticate with current password first
      if (currentPassword) {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: user?.email || "",
          password: currentPassword,
        });
        if (signInError) {
          toast({ title: "Error", description: "Current password is incorrect.", variant: "destructive" });
          setChangingPassword(false);
          return;
        }
      }

      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;

      toast({ title: "Password updated", description: "Your password has been changed successfully." });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (e: any) {
      toast({ title: "Error", description: e.message || "Failed to update password.", variant: "destructive" });
    }
    setChangingPassword(false);
  };

  if (!user) return null;

  const Field = ({ label, settingKey, placeholder, type = "text" }: { label: string; settingKey: string; placeholder?: string; type?: string }) => (
    <div className="space-y-1.5">
      <Label className="text-xs font-medium text-muted-foreground">{label}</Label>
      <Input
        type={type}
        value={getValue(settingKey)}
        onChange={e => setValue(settingKey, e.target.value)}
        placeholder={placeholder}
        className="h-10"
      />
    </div>
  );

  const ToggleField = ({ label, description, settingKey }: { label: string; description: string; settingKey: string }) => (
    <div className="flex items-center justify-between py-3 border-b last:border-0">
      <div>
        <p className="text-sm font-medium">{label}</p>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      <Switch
        checked={getValue(settingKey) === "true"}
        onCheckedChange={checked => setValue(settingKey, checked ? "true" : "false")}
      />
    </div>
  );

  const PasswordInput = ({ label, value, onChange, show, onToggleShow, placeholder }: {
    label: string; value: string; onChange: (v: string) => void; show: boolean; onToggleShow: () => void; placeholder?: string;
  }) => (
    <div className="space-y-1.5">
      <Label className="text-xs font-medium text-muted-foreground">{label}</Label>
      <div className="relative">
        <Input
          type={show ? "text" : "password"}
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          className="h-10 pr-10"
        />
        <button type="button" onClick={onToggleShow}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
          {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        </button>
      </div>
    </div>
  );

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-[1400px] mx-auto">
        <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-2xl lg:text-3xl font-extrabold tracking-tight">Settings</h1>
            <p className="text-sm text-muted-foreground mt-1">System configuration & preferences</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={fetchSettings} disabled={loading}>
              <RefreshCw className={`w-4 h-4 mr-1.5 ${loading ? "animate-spin" : ""}`} /> Refresh
            </Button>
            <Button size="sm" onClick={handleSave} disabled={!hasPendingChanges || saving}>
              {saving ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <Save className="w-4 h-4 mr-1.5" />}
              Save Changes
            </Button>
          </div>
        </motion.div>

        {loading ? (
          <div className="py-20 flex items-center justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : (
          <Tabs defaultValue="general" className="space-y-4">
            <TabsList className="bg-muted/60">
              <TabsTrigger value="general" className="gap-1.5"><Building2 className="w-3.5 h-3.5" /> Institution</TabsTrigger>
              <TabsTrigger value="academic" className="gap-1.5"><GraduationCap className="w-3.5 h-3.5" /> Academic</TabsTrigger>
              <TabsTrigger value="fees" className="gap-1.5"><CreditCard className="w-3.5 h-3.5" /> Fees</TabsTrigger>
              <TabsTrigger value="enrollment" className="gap-1.5"><UserCheck className="w-3.5 h-3.5" /> Enrollment</TabsTrigger>
              <TabsTrigger value="security" className="gap-1.5"><Shield className="w-3.5 h-3.5" /> Security</TabsTrigger>
            </TabsList>

            <TabsContent value="general">
              <AnimatedCard>
                <SectionHeader title="Institution Details" icon={Building2} />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Field label="Institution Name" settingKey="institution_name" placeholder="e.g. BRIBTE" />
                  <Field label="Email Address" settingKey="institution_email" type="email" placeholder="info@example.com" />
                  <Field label="Phone Number" settingKey="institution_phone" placeholder="+254..." />
                  <Field label="Address" settingKey="institution_address" placeholder="City, Country" />
                </div>
              </AnimatedCard>
            </TabsContent>

            <TabsContent value="academic">
              <AnimatedCard>
                <SectionHeader title="Academic Calendar" icon={GraduationCap} />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Field label="Current Academic Year" settingKey="current_academic_year" placeholder="2025/2026" />
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-muted-foreground">Current Semester</Label>
                    <Select value={getValue("current_semester")} onValueChange={v => setValue("current_semester", v)}>
                      <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">Semester 1</SelectItem>
                        <SelectItem value="2">Semester 2</SelectItem>
                        <SelectItem value="3">Semester 3 (Summer)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Field label="Semester Start Date" settingKey="semester_start_date" type="date" />
                  <Field label="Semester End Date" settingKey="semester_end_date" type="date" />
                </div>
              </AnimatedCard>
            </TabsContent>

            <TabsContent value="fees">
              <AnimatedCard>
                <SectionHeader title="Fee Configuration" icon={CreditCard} />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-muted-foreground">Currency</Label>
                    <Select value={getValue("currency")} onValueChange={v => setValue("currency", v)}>
                      <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="UGX">UGX - Ugandan Shilling</SelectItem>
                        <SelectItem value="KES">KES - Kenyan Shilling</SelectItem>
                        <SelectItem value="USD">USD - US Dollar</SelectItem>
                        <SelectItem value="GBP">GBP - British Pound</SelectItem>
                        <SelectItem value="EUR">EUR - Euro</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Field label="Payment Deadline (days after enrollment)" settingKey="payment_deadline_days" type="number" />
                  <Field label="Late Fee Penalty (%)" settingKey="late_fee_penalty" type="number" />
                </div>
              </AnimatedCard>
            </TabsContent>

            <TabsContent value="enrollment">
              <AnimatedCard>
                <SectionHeader title="Enrollment Rules" icon={UserCheck} />
                <div className="space-y-1 mb-4">
                  <Field label="Max Courses Per Student" settingKey="max_enrollment_per_student" type="number" />
                </div>
                <ToggleField
                  label="Allow Late Enrollment"
                  description="Students can enroll after the semester start date"
                  settingKey="allow_late_enrollment"
                />
                <ToggleField
                  label="Auto-Approve Enrollments"
                  description="Enrollments are approved instantly without admin review"
                  settingKey="auto_approve_enrollment"
                />
              </AnimatedCard>
            </TabsContent>

            {/* Security Tab */}
            <TabsContent value="security" className="space-y-4">
              <AnimatedCard>
                <SectionHeader title="Change Password" icon={KeyRound} />
                <p className="text-xs text-muted-foreground mb-4">Update your admin account password. Use a strong password with at least 6 characters.</p>
                <div className="max-w-md space-y-4">
                  <PasswordInput
                    label="Current Password"
                    value={currentPassword}
                    onChange={setCurrentPassword}
                    show={showCurrent}
                    onToggleShow={() => setShowCurrent(!showCurrent)}
                    placeholder="Enter your current password"
                  />
                  <Separator />
                  <PasswordInput
                    label="New Password"
                    value={newPassword}
                    onChange={setNewPassword}
                    show={showNew}
                    onToggleShow={() => setShowNew(!showNew)}
                    placeholder="Enter new password (min 6 chars)"
                  />
                  <PasswordInput
                    label="Confirm New Password"
                    value={confirmPassword}
                    onChange={setConfirmPassword}
                    show={showConfirm}
                    onToggleShow={() => setShowConfirm(!showConfirm)}
                    placeholder="Re-enter new password"
                  />
                  {newPassword && confirmPassword && newPassword !== confirmPassword && (
                    <p className="text-xs text-destructive">Passwords do not match</p>
                  )}
                  <Button onClick={handleChangePassword} disabled={changingPassword || !currentPassword || !newPassword || !confirmPassword || newPassword !== confirmPassword}
                    className="w-full sm:w-auto">
                    {changingPassword ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Lock className="w-4 h-4 mr-2" />}
                    {changingPassword ? "Updating..." : "Update Password"}
                  </Button>
                </div>
              </AnimatedCard>

              <AnimatedCard>
                <SectionHeader title="Account Information" icon={Shield} />
                <div className="space-y-3 max-w-md">
                  <div>
                    <Label className="text-xs font-medium text-muted-foreground">Email Address</Label>
                    <p className="text-sm font-medium mt-0.5">{user?.email || "—"}</p>
                  </div>
                  <div>
                    <Label className="text-xs font-medium text-muted-foreground">Full Name</Label>
                    <p className="text-sm font-medium mt-0.5">{user?.fullName || "—"}</p>
                  </div>
                  <div>
                    <Label className="text-xs font-medium text-muted-foreground">Role</Label>
                    <p className="text-sm font-medium mt-0.5 capitalize">{user?.role || "—"}</p>
                  </div>
                </div>
              </AnimatedCard>
            </TabsContent>
          </Tabs>
        )}
      </div>
    </DashboardLayout>
  );
}
