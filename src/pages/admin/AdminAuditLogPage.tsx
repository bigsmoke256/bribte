import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format } from "date-fns";
import { Search, Shield, Activity } from "lucide-react";

interface AuditLog {
  id: string; user_id: string | null; user_email: string | null; action: string;
  table_name: string | null; record_id: string | null; old_values: any; new_values: any;
  description: string | null; created_at: string;
}

export default function AdminAuditLogPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [actionFilter, setActionFilter] = useState("all");

  useEffect(() => { loadLogs(); }, []);

  const loadLogs = async () => {
    setLoading(true);
    const { data } = await supabase.from("audit_logs").select("*").order("created_at", { ascending: false }).limit(500);
    setLogs(data || []);
    setLoading(false);
  };

  const actions = [...new Set(logs.map(l => l.action))];

  const filtered = logs.filter(l => {
    if (actionFilter !== "all" && l.action !== actionFilter) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return l.user_email?.toLowerCase().includes(q) || l.action.toLowerCase().includes(q) ||
        l.table_name?.toLowerCase().includes(q) || l.description?.toLowerCase().includes(q);
    }
    return true;
  });

  const actionColor = (a: string) => {
    if (a.includes("delete") || a.includes("reject")) return "bg-destructive/10 text-destructive";
    if (a.includes("create") || a.includes("approve")) return "bg-emerald-500/10 text-emerald-700";
    if (a.includes("update") || a.includes("save")) return "bg-blue-500/10 text-blue-700";
    return "bg-muted text-muted-foreground";
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-display font-bold">Audit Logs</h1>
        <p className="text-sm text-muted-foreground">Track who changed what and when — accountability trail for all system actions</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-0 shadow-sm"><CardContent className="p-4 text-center">
          <Activity className="w-5 h-5 mx-auto text-primary mb-1" />
          <p className="text-xs text-muted-foreground uppercase">Total Entries</p>
          <p className="text-2xl font-bold">{logs.length}</p>
        </CardContent></Card>
        <Card className="border-0 shadow-sm"><CardContent className="p-4 text-center">
          <Shield className="w-5 h-5 mx-auto text-primary mb-1" />
          <p className="text-xs text-muted-foreground uppercase">Unique Users</p>
          <p className="text-2xl font-bold">{new Set(logs.map(l => l.user_id)).size}</p>
        </CardContent></Card>
        <Card className="border-0 shadow-sm"><CardContent className="p-4 text-center">
          <p className="text-xs text-muted-foreground uppercase">Today's Actions</p>
          <p className="text-2xl font-bold">{logs.filter(l => new Date(l.created_at).toDateString() === new Date().toDateString()).length}</p>
        </CardContent></Card>
      </div>

      <div className="flex gap-3">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search by user, action, table..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10 rounded-xl" />
        </div>
        <Select value={actionFilter} onValueChange={setActionFilter}>
          <SelectTrigger className="w-48 rounded-xl"><SelectValue placeholder="All actions" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Actions</SelectItem>
            {actions.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="py-12 text-center text-muted-foreground">Loading...</div>
      ) : filtered.length === 0 ? (
        <div className="py-12 text-center text-muted-foreground">No audit logs found</div>
      ) : (
        <Card className="border-0 shadow-sm">
          <ScrollArea className="max-h-[600px]">
            <Table>
              <TableHeader><TableRow>
                <TableHead>Timestamp</TableHead><TableHead>User</TableHead><TableHead>Action</TableHead>
                <TableHead>Table</TableHead><TableHead>Description</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {filtered.map(l => (
                  <TableRow key={l.id}>
                    <TableCell className="text-sm text-muted-foreground whitespace-nowrap">{format(new Date(l.created_at), "dd MMM yyyy HH:mm:ss")}</TableCell>
                    <TableCell className="text-sm">{l.user_email || "System"}</TableCell>
                    <TableCell><Badge variant="outline" className={`text-xs ${actionColor(l.action)}`}>{l.action}</Badge></TableCell>
                    <TableCell className="text-sm font-mono">{l.table_name || "—"}</TableCell>
                    <TableCell className="text-sm text-muted-foreground max-w-[300px] truncate">{l.description || "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>
        </Card>
      )}
    </div>
  );
}
