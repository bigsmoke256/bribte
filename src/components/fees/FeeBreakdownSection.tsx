import { AnimatedCard, SectionHeader } from "@/components/dashboard/DashboardParts";
import { Receipt } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";

interface FeeItem {
  id: string; name: string; amount: number; frequency: string;
  category: string; applies_to: string; is_optional: boolean;
}

interface FeeBreakdown {
  oneTime: FeeItem[];
  recurring: FeeItem[];
  optional: FeeItem[];
  oneTimeTotal: number;
  recurringTotal: number;
  optionalTotal: number;
  applicableOneTime: boolean;
  applicableYearly: boolean;
}

interface Props {
  tuition: number;
  studyMode: string;
  feeBreakdown: FeeBreakdown;
  grandTotal: number;
  selectedOptional: Set<string>;
  onToggleOptional: (feeId: string) => void;
}

export function FeeBreakdownSection({ tuition, studyMode, feeBreakdown, grandTotal, selectedOptional, onToggleOptional }: Props) {
  return (
    <AnimatedCard delay={0.12}>
      <SectionHeader title="Fee Structure" icon={Receipt} />
      <div className="mt-4 space-y-4">
        {/* Tuition */}
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Tuition Fee</p>
          <div className="flex items-center justify-between p-3 rounded-xl bg-primary/5">
            <span className="text-sm font-medium">Tuition ({studyMode || "Day"})</span>
            <span className="font-display font-bold">UGX {tuition.toLocaleString()}</span>
          </div>
        </div>

        {/* One-time fees */}
        {feeBreakdown.oneTime.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
              One-Time Fees
              {!feeBreakdown.applicableOneTime && (
                <Badge variant="outline" className="ml-2 text-[10px] h-4">Not applicable this semester</Badge>
              )}
            </p>
            <div className="space-y-1">
              {feeBreakdown.oneTime.map(f => (
                <div key={f.id} className={`flex items-center justify-between p-2.5 rounded-lg hover:bg-muted/40 transition-colors ${!feeBreakdown.applicableOneTime ? "opacity-50" : ""}`}>
                  <span className="text-sm">{f.name}</span>
                  <span className="text-sm font-semibold">UGX {Number(f.amount).toLocaleString()}</span>
                </div>
              ))}
              <Separator />
              <div className="flex items-center justify-between p-2.5 font-semibold">
                <span className="text-sm">Subtotal (One-Time)</span>
                <span className="text-sm">UGX {feeBreakdown.oneTimeTotal.toLocaleString()}</span>
              </div>
            </div>
          </div>
        )}

        {/* Recurring fees */}
        {feeBreakdown.recurring.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Recurring Fees</p>
            <div className="space-y-1">
              {feeBreakdown.recurring.map(f => {
                const isYearly = f.frequency === "yearly";
                const notApplicable = isYearly && !feeBreakdown.applicableYearly;
                return (
                  <div key={f.id} className={`flex items-center justify-between p-2.5 rounded-lg hover:bg-muted/40 transition-colors ${notApplicable ? "opacity-50" : ""}`}>
                    <div>
                      <span className="text-sm">{f.name}</span>
                      <Badge variant="secondary" className="ml-2 text-[10px] h-4">
                        {f.frequency.replace("_", "/")}
                      </Badge>
                      {notApplicable && <Badge variant="outline" className="ml-1 text-[10px] h-4">N/A this sem</Badge>}
                    </div>
                    <span className="text-sm font-semibold">UGX {Number(f.amount).toLocaleString()}</span>
                  </div>
                );
              })}
              <Separator />
              <div className="flex items-center justify-between p-2.5 font-semibold">
                <span className="text-sm">Subtotal (Recurring)</span>
                <span className="text-sm">UGX {feeBreakdown.recurringTotal.toLocaleString()}</span>
              </div>
            </div>
          </div>
        )}

        {/* Optional fees with checkboxes */}
        {feeBreakdown.optional.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Optional Fees</p>
            <div className="space-y-1">
              {feeBreakdown.optional.map(f => (
                <div key={f.id} className="flex items-center justify-between p-2.5 rounded-lg hover:bg-muted/40 transition-colors">
                  <div className="flex items-center gap-3">
                    <Checkbox
                      checked={selectedOptional.has(f.id)}
                      onCheckedChange={() => onToggleOptional(f.id)}
                    />
                    <div>
                      <span className="text-sm">{f.name}</span>
                      <Badge variant="outline" className="ml-2 text-[10px] h-4">Optional</Badge>
                    </div>
                  </div>
                  <span className={`text-sm font-semibold ${selectedOptional.has(f.id) ? "" : "text-muted-foreground"}`}>
                    UGX {Number(f.amount).toLocaleString()}
                  </span>
                </div>
              ))}
              {feeBreakdown.optionalTotal > 0 && (
                <>
                  <Separator />
                  <div className="flex items-center justify-between p-2.5 font-semibold">
                    <span className="text-sm">Subtotal (Optional)</span>
                    <span className="text-sm">UGX {feeBreakdown.optionalTotal.toLocaleString()}</span>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* Grand Total */}
        <Separator className="my-2" />
        <div className="flex items-center justify-between p-3 rounded-xl bg-primary/10">
          <span className="font-display font-bold text-base">Grand Total (This Semester)</span>
          <span className="font-display font-bold text-lg">UGX {grandTotal.toLocaleString()}</span>
        </div>
      </div>
    </AnimatedCard>
  );
}
