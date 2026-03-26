import { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import GlobalFilters from "../components/dashboard/GlobalFilters";
import KPICard from "../components/dashboard/KPICard";
import { formatDKK, formatPct, calcBudgetUsedPct, CHANNELS } from "../components/utils/measures";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Download, Loader2, Edit2, Trash2 } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from "recharts";

const DEFAULT_FILTERS = { datePreset: "30d", region: "all", channel: "all", campaign_id: "all" };
const EMPTY_LINE = { budget_id: "", period: "", campaign_id: "", channel: "", category: "ads", planned_dkk: 0, actual_dkk: 0, allocation_percent: null, owner: "", event_id: "", webinar_id: "", notes: "" };

function exportCSV(rows) {
  const cols = ["budget_id","period","campaign_id","channel","category","planned_dkk","actual_dkk","allocation_percent","owner","notes"];
  const header = cols.join(",");
  const body = rows.map((r) => cols.map((c) => r[c] ?? "").join(",")).join("\n");
  const blob = new Blob([header + "\n" + body], { type: "text/csv" });
  const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "budget_lines.csv"; a.click();
}

export default function BudgetCostLines() {
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [budgets, setBudgets] = useState([]);
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(EMPTY_LINE);
  const [editId, setEditId] = useState(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    Promise.all([
      base44.entities.BudgetLine.list("-period", 1000),
      base44.entities.Campaign.list(),
    ]).then(([b, c]) => { setBudgets(b); setCampaigns(c); }).finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() =>
    budgets.filter((b) => {
      if (filters.campaign_id !== "all" && b.campaign_id !== filters.campaign_id) return false;
      if (filters.channel !== "all" && b.channel !== filters.channel) return false;
      return true;
    }), [budgets, filters]);

  const totalPlanned = filtered.reduce((s, b) => s + (b.planned_dkk || 0), 0);
  const totalActual = filtered.reduce((s, b) => s + (b.actual_dkk || 0), 0);
  const usedPct = calcBudgetUsedPct(totalActual, totalPlanned);

  // By period for chart
  const byPeriod = useMemo(() => {
    const p = {};
    filtered.forEach((b) => {
      const k = b.period || "Unknown";
      if (!p[k]) p[k] = { period: k, planned: 0, actual: 0 };
      p[k].planned += b.planned_dkk || 0;
      p[k].actual += b.actual_dkk || 0;
    });
    return Object.values(p).sort((a, b) => a.period.localeCompare(b.period));
  }, [filtered]);

  const save = async () => {
    if (editId) {
      const updated = await base44.entities.BudgetLine.update(editId, form);
      setBudgets((prev) => prev.map((b) => b.id === editId ? { ...b, ...form } : b));
    } else {
      const created = await base44.entities.BudgetLine.create(form);
      setBudgets((prev) => [...prev, created]);
    }
    setForm(EMPTY_LINE); setEditId(null); setOpen(false);
  };

  const del = async (id) => {
    await base44.entities.BudgetLine.delete(id);
    setBudgets((prev) => prev.filter((b) => b.id !== id));
  };

  if (loading) return (
    <div className="flex items-center justify-center h-96">
      <Loader2 className="w-8 h-8 animate-spin text-[#004B87]" />
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <GlobalFilters filters={filters} onChange={setFilters} campaigns={campaigns} />
      <div className="p-6 space-y-6 max-w-screen-xl mx-auto">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-gray-900">Budget & Cost Lines</h1>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => exportCSV(filtered)}><Download className="w-4 h-4 mr-1" /> Export</Button>
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="bg-[#004B87]" onClick={() => { setForm(EMPTY_LINE); setEditId(null); }}>
                  <Plus className="w-4 h-4 mr-1" /> Add Budget Line
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader><DialogTitle>{editId ? "Edit" : "Add"} Budget Line</DialogTitle></DialogHeader>
                <div className="grid grid-cols-2 gap-3 mt-2">
                  {["budget_id","period","campaign_id","owner","notes"].map((f) => (
                    <div key={f} className={f === "notes" ? "col-span-2" : ""}>
                      <label className="text-xs text-gray-500 capitalize">{f.replace(/_/g," ")}</label>
                      <Input className="mt-1 h-8 text-sm" value={form[f] || ""} onChange={(e) => setForm({ ...form, [f]: e.target.value })} />
                    </div>
                  ))}
                  <div>
                    <label className="text-xs text-gray-500">Channel</label>
                    <Select value={form.channel || ""} onValueChange={(v) => setForm({ ...form, channel: v })}>
                      <SelectTrigger className="mt-1 h-8 text-sm"><SelectValue placeholder="Channel" /></SelectTrigger>
                      <SelectContent>{CHANNELS.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-xs text-gray-500">Category</label>
                    <Select value={form.category || "ads"} onValueChange={(v) => setForm({ ...form, category: v })}>
                      <SelectTrigger className="mt-1 h-8 text-sm"><SelectValue /></SelectTrigger>
                      <SelectContent>{["ads","agency","event","creative","pr","other"].map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  {["planned_dkk","actual_dkk","allocation_percent"].map((f) => (
                    <div key={f}>
                      <label className="text-xs text-gray-500">{f.replace(/_/g," ")}</label>
                      <Input type="number" className="mt-1 h-8 text-sm" value={form[f] || ""} onChange={(e) => setForm({ ...form, [f]: parseFloat(e.target.value) || 0 })} />
                    </div>
                  ))}
                </div>
                <Button className="mt-4 w-full bg-[#004B87]" onClick={save}>Save</Button>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-3 gap-4">
          <KPICard title="Budget Planned" value={formatDKK(totalPlanned)} accent="#004B87" />
          <KPICard title="Actual Spend" value={formatDKK(totalActual)} accent="#ef4444" />
          <KPICard title="Budget Used %" value={formatPct(usedPct)} accent={usedPct > 1 ? "#ef4444" : "#16a34a"} />
        </div>

        {/* Chart */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Planned vs Actual by Period</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={byPeriod}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="period" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v) => formatDKK(v)} />
              <Legend iconSize={10} wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="planned" fill="#004B87" name="Planned" radius={[4,4,0,0]} />
              <Bar dataKey="actual" fill="#ef4444" name="Actual" radius={[4,4,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                {["Period","Campaign","Channel","Category","Planned (DKK)","Actual (DKK)","Used %","Alloc %","Owner",""].map((h) => (
                  <th key={h} className="px-3 py-3 text-left text-xs font-medium text-gray-500 whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && <tr><td colSpan={10} className="py-12 text-center text-gray-400">No budget lines yet</td></tr>}
              {filtered.map((b) => (
                <tr key={b.id} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="px-3 py-2">{b.period}</td>
                  <td className="px-3 py-2 text-xs text-gray-500">{campaigns.find((c) => c.campaign_id === b.campaign_id)?.name || b.campaign_id}</td>
                  <td className="px-3 py-2">{b.channel || "—"}</td>
                  <td className="px-3 py-2">{b.category}</td>
                  <td className="px-3 py-2 text-right">{formatDKK(b.planned_dkk)}</td>
                  <td className="px-3 py-2 text-right">{formatDKK(b.actual_dkk)}</td>
                  <td className="px-3 py-2 text-right">
                    <span className={`font-medium ${calcBudgetUsedPct(b.actual_dkk, b.planned_dkk) > 1 ? "text-red-500" : "text-green-600"}`}>
                      {formatPct(calcBudgetUsedPct(b.actual_dkk, b.planned_dkk))}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-right">{b.allocation_percent ? b.allocation_percent + "%" : "—"}</td>
                  <td className="px-3 py-2">{b.owner || "—"}</td>
                  <td className="px-3 py-2">
                    <div className="flex gap-1">
                      <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => { setForm({ ...b }); setEditId(b.id); setOpen(true); }}>
                        <Edit2 className="w-3 h-3" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-6 w-6 text-red-400" onClick={() => del(b.id)}>
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}