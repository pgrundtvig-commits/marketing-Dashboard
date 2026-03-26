import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Loader2, Search } from "lucide-react";
import { format } from "date-fns";

function fmtNum(v) { return v !== null && v !== undefined ? new Intl.NumberFormat("da-DK").format(Math.round(v)) : "—"; }

export default function Distributors() {
  const [distributors, setDistributors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [regionFilter, setRegionFilter] = useState("all");

  useEffect(() => {
    base44.entities.DistributorDES.list().then(setDistributors).finally(() => setLoading(false));
  }, []);

  const filtered = distributors.filter(d => {
    if (regionFilter !== "all" && d.region !== regionFilter) return false;
    if (search && !d.name?.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  if (loading) return <div className="flex items-center justify-center h-96"><Loader2 className="w-8 h-8 animate-spin" style={{ color: "#1a2e4a" }} /></div>;

  return (
    <div className="min-h-screen" style={{ background: "#f5f5f0" }}>
      <div className="px-6 pt-6 pb-4" style={{ background: "#1a2e4a" }}>
        <div className="max-w-screen-xl mx-auto">
          <h1 className="text-2xl font-bold text-white">Distributors</h1>
          <p className="text-sm mt-0.5" style={{ color: "#a8c5d6" }}>DES score · Coverage · Influenced Leads</p>
        </div>
      </div>

      <div className="max-w-screen-xl mx-auto px-6 py-6 space-y-4">
        <div className="flex gap-3 flex-wrap">
          <div className="relative flex-1 min-w-48">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input type="text" placeholder="Search distributors…" value={search} onChange={e => setSearch(e.target.value)} className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none" />
          </div>
          <select value={regionFilter} onChange={e => setRegionFilter(e.target.value)} className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white text-gray-600 focus:outline-none">
            <option value="all">All Regions</option>
            {["EMEA", "AMER", "ASPAC", "Global"].map(r => <option key={r} value={r}>{r}</option>)}
          </select>
        </div>

        {filtered.length === 0 ? (
          <div className="bg-white rounded-2xl border border-dashed border-gray-200 p-12 text-center">
            <p className="text-base font-medium text-gray-400">No distributor data yet</p>
            <p className="text-sm text-gray-300 mt-1">DES scores and distributor records will appear here once added</p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-gray-100">
                  <tr>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-gray-400 uppercase">Distributor</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-gray-400 uppercase">Region</th>
                    <th className="text-right py-3 px-4 text-xs font-semibold text-gray-400 uppercase">DES Score</th>
                    <th className="text-right py-3 px-4 text-xs font-semibold text-gray-400 uppercase">Coverage (N)</th>
                    <th className="text-right py-3 px-4 text-xs font-semibold text-gray-400 uppercase">Leads Influenced</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-gray-400 uppercase">Last Updated</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(d => (
                    <tr key={d.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                      <td className="py-3 px-4">
                        <p className="font-medium text-gray-900">{d.name}</p>
                        <p className="text-xs text-gray-400">{d.distributor_id}</p>
                      </td>
                      <td className="py-3 px-4 text-gray-600">{d.region}</td>
                      <td className="py-3 px-4 text-right">
                        <span className="inline-flex items-center justify-center w-10 h-10 rounded-full text-sm font-bold text-white" style={{ background: d.des_score >= 70 ? "#4a7c6f" : d.des_score >= 40 ? "#f59e0b" : "#ef4444" }}>
                          {d.des_score ?? "—"}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right text-gray-700">{fmtNum(d.coverage_n)}</td>
                      <td className="py-3 px-4 text-right text-gray-700">{fmtNum(d.leads_influenced)}</td>
                      <td className="py-3 px-4 text-gray-500 text-xs">{d.last_updated ? format(new Date(d.last_updated), "d MMM yyyy") : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}