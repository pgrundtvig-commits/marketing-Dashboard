import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import KPICard from "../components/dashboard/KPICard";
import { formatNum } from "../components/utils/measures";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Edit2, Trash2, Loader2, Info } from "lucide-react";
import { REGIONS } from "../components/utils/measures";
import { format } from "date-fns";

const EMPTY = { distributor_id: "", name: "", region: "EMEA", des_score: 0, coverage_n: 0, last_updated: "", notes: "", leads_influenced: 0 };

export default function PartnerDES() {
  const [distributors, setDistributors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(EMPTY);
  const [editId, setEditId] = useState(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    base44.entities.DistributorDES.list().then(setDistributors).finally(() => setLoading(false));
  }, []);

  const avgDES = distributors.length > 0
    ? distributors.reduce((s, d) => s + (d.des_score || 0), 0) / distributors.length
    : 0;
  const totalCoverage = distributors.reduce((s, d) => s + (d.coverage_n || 0), 0);
  const lastUpdated = distributors.length > 0
    ? distributors.sort((a, b) => (b.last_updated || "").localeCompare(a.last_updated || ""))[0]?.last_updated
    : null;

  const save = async () => {
    if (editId) {
      await base44.entities.DistributorDES.update(editId, form);
      setDistributors((prev) => prev.map((d) => d.id === editId ? { ...d, ...form } : d));
    } else {
      const created = await base44.entities.DistributorDES.create(form);
      setDistributors((prev) => [...prev, created]);
    }
    setForm(EMPTY); setEditId(null); setOpen(false);
  };

  const del = async (id) => {
    await base44.entities.DistributorDES.delete(id);
    setDistributors((prev) => prev.filter((d) => d.id !== id));
  };

  const desColor = (score) => {
    if (score >= 75) return "text-green-600";
    if (score >= 50) return "text-yellow-600";
    return "text-red-500";
  };

  if (loading) return (
    <div className="flex items-center justify-center h-96">
      <Loader2 className="w-8 h-8 animate-spin text-[#004B87]" />
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-screen-xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Partner / Distributor DES</h1>
            <div className="flex items-center gap-1 mt-1 text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded px-2 py-1 w-fit">
              <Info className="w-3 h-3" />
              Placeholder — DES methodology pending WOW process finalization
            </div>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="bg-[#004B87]" onClick={() => { setForm(EMPTY); setEditId(null); }}>
                <Plus className="w-4 h-4 mr-1" /> Add Distributor
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader><DialogTitle>{editId ? "Edit" : "Add"} Distributor</DialogTitle></DialogHeader>
              <div className="grid grid-cols-2 gap-3 mt-2">
                {["distributor_id","name","notes"].map((f) => (
                  <div key={f} className={f === "notes" ? "col-span-2" : ""}>
                    <label className="text-xs text-gray-500 capitalize">{f.replace(/_/g," ")}</label>
                    <Input className="mt-1 h-8 text-sm" value={form[f] || ""} onChange={(e) => setForm({ ...form, [f]: e.target.value })} />
                  </div>
                ))}
                <div>
                  <label className="text-xs text-gray-500">Region</label>
                  <Select value={form.region} onValueChange={(v) => setForm({ ...form, region: v })}>
                    <SelectTrigger className="mt-1 h-8 text-sm"><SelectValue /></SelectTrigger>
                    <SelectContent>{REGIONS.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-xs text-gray-500">DES Score (0–100)</label>
                  <Input type="number" min={0} max={100} className="mt-1 h-8 text-sm" value={form.des_score || ""} onChange={(e) => setForm({ ...form, des_score: parseFloat(e.target.value) || 0 })} />
                </div>
                <div>
                  <label className="text-xs text-gray-500">Coverage (n distributors)</label>
                  <Input type="number" className="mt-1 h-8 text-sm" value={form.coverage_n || ""} onChange={(e) => setForm({ ...form, coverage_n: parseInt(e.target.value) || 0 })} />
                </div>
                <div>
                  <label className="text-xs text-gray-500">Leads Influenced</label>
                  <Input type="number" className="mt-1 h-8 text-sm" value={form.leads_influenced || ""} onChange={(e) => setForm({ ...form, leads_influenced: parseInt(e.target.value) || 0 })} />
                </div>
                <div>
                  <label className="text-xs text-gray-500">Last Updated</label>
                  <Input type="date" className="mt-1 h-8 text-sm" value={form.last_updated || ""} onChange={(e) => setForm({ ...form, last_updated: e.target.value })} />
                </div>
              </div>
              <Button className="mt-4 w-full bg-[#004B87]" onClick={save}>Save</Button>
            </DialogContent>
          </Dialog>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-3 gap-4">
          <KPICard title="Avg DES Score" value={avgDES ? avgDES.toFixed(1) : "—"} subtitle="Composite score" accent="#004B87" />
          <KPICard title="Coverage" value={formatNum(totalCoverage)} subtitle="Distributors tracked" accent="#9333ea" />
          <KPICard title="Last Updated" value={lastUpdated || "—"} accent="#6b7280" />
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                {["ID","Name","Region","DES Score","Coverage","Leads Influenced","Last Updated","Notes",""].map((h) => (
                  <th key={h} className="px-3 py-3 text-left text-xs font-medium text-gray-500 whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {distributors.length === 0 && (
                <tr><td colSpan={9} className="py-12 text-center text-gray-400">No distributors added yet</td></tr>
              )}
              {distributors.map((d) => (
                <tr key={d.id} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="px-3 py-2 font-mono text-xs text-gray-500">{d.distributor_id}</td>
                  <td className="px-3 py-2 font-medium text-gray-800">{d.name}</td>
                  <td className="px-3 py-2">
                    <span className="px-2 py-0.5 rounded-full text-xs bg-blue-50 text-blue-700">{d.region}</span>
                  </td>
                  <td className="px-3 py-2">
                    <span className={`text-lg font-bold ${desColor(d.des_score)}`}>{d.des_score ?? "—"}</span>
                    <span className="text-xs text-gray-400 ml-1">/100</span>
                  </td>
                  <td className="px-3 py-2">{d.coverage_n ?? "—"}</td>
                  <td className="px-3 py-2">{d.leads_influenced ?? "—"}</td>
                  <td className="px-3 py-2 text-xs text-gray-500">{d.last_updated || "—"}</td>
                  <td className="px-3 py-2 text-xs text-gray-500 max-w-xs truncate">{d.notes || "—"}</td>
                  <td className="px-3 py-2">
                    <div className="flex gap-1">
                      <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => { setForm({ ...d }); setEditId(d.id); setOpen(true); }}>
                        <Edit2 className="w-3 h-3" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-6 w-6 text-red-400" onClick={() => del(d.id)}>
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