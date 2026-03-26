import { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import GlobalFilters from "../components/dashboard/GlobalFilters";
import {
  getDateRange, getPreviousPeriod, inDateRange, getQualifiedLeads,
  calcCTR, calcEngagementRate, calcCPL, calcCPQL, deltaLabel,
  formatDKK, formatPct, formatNum, CHANNEL_COLORS
} from "../components/utils/measures";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowUpDown, Download, TrendingUp, TrendingDown, Loader2 } from "lucide-react";

const DEFAULT_FILTERS = { datePreset: "30d", region: "all", channel: "all", campaign_id: "all" };

function exportCSV(rows, cols) {
  const header = cols.map((c) => c.label).join(",");
  const body = rows.map((r) => cols.map((c) => r[c.key] ?? "").join(",")).join("\n");
  const blob = new Blob([header + "\n" + body], { type: "text/csv" });
  const a = document.createElement("a"); a.href = URL.createObjectURL(blob);
  a.download = "performance_drivers.csv"; a.click();
}

export default function PerformanceDrivers() {
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [metrics, setMetrics] = useState([]);
  const [leads, setLeads] = useState([]);
  const [campaigns, setCampaigns] = useState([]);
  const [groupBy, setGroupBy] = useState("channel"); // channel | campaign
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState("leads");
  const [sortDir, setSortDir] = useState(-1);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      base44.entities.ChannelMetricDaily.list("-date", 2000),
      base44.entities.Lead.list("-created_date", 5000),
      base44.entities.Campaign.list(),
    ]).then(([m, l, c]) => {
      setMetrics(m); setLeads(l); setCampaigns(c);
    }).finally(() => setLoading(false));
  }, []);

  const { start, end } = useMemo(() => getDateRange(filters.datePreset, filters.customStart, filters.customEnd), [filters]);
  const { start: ps, end: pe } = useMemo(() => getPreviousPeriod(start, end), [start, end]);

  const applyFilters = (data) => data.filter((r) => {
    if (filters.channel !== "all" && r.channel !== filters.channel) return false;
    if (filters.campaign_id !== "all" && r.campaign_id !== filters.campaign_id) return false;
    if (filters.region !== "all" && r.region !== filters.region) return false;
    return true;
  });

  const buildRows = (mData, lData, sStart, sEnd) => {
    const grp = {};
    const mFiltered = mData.filter((r) => inDateRange(r.date, sStart, sEnd));
    const lFiltered = lData.filter((r) => inDateRange(r.created_date, sStart, sEnd));
    mFiltered.forEach((r) => {
      const key = groupBy === "channel" ? r.channel : r.campaign_id;
      const label = groupBy === "channel" ? r.channel : (campaigns.find((c) => c.campaign_id === key)?.name || key || "Unknown");
      if (!grp[key]) grp[key] = { key, label, spend: 0, impressions: 0, clicks: 0, engagements: 0, leads: 0, A: 0, B: 0, C: 0 };
      grp[key].spend += r.spend_dkk || 0;
      grp[key].impressions += r.impressions || 0;
      grp[key].clicks += r.clicks || 0;
      grp[key].engagements += r.engagements || 0;
    });
    lFiltered.forEach((r) => {
      const key = groupBy === "channel" ? r.channel : r.campaign_id;
      const label = groupBy === "channel" ? r.channel : (campaigns.find((c) => c.campaign_id === key)?.name || key || "Unknown");
      if (!grp[key]) grp[key] = { key, label, spend: 0, impressions: 0, clicks: 0, engagements: 0, leads: 0, A: 0, B: 0, C: 0 };
      grp[key].leads++;
      if (r.lead_grade === "A") grp[key].A++;
      else if (r.lead_grade === "B") grp[key].B++;
      else if (r.lead_grade === "C") grp[key].C++;
    });
    return Object.values(grp).map((r) => ({
      ...r,
      qualified: r.A + r.B,
      ctr: calcCTR(r.clicks, r.impressions),
      engRate: calcEngagementRate(r.engagements, r.impressions),
      cpl: calcCPL(r.spend, r.leads),
      cpql: calcCPQL(r.spend, r.A + r.B),
    }));
  };

  const fm = useMemo(() => applyFilters(metrics), [metrics, filters]);
  const fl = useMemo(() => applyFilters(leads), [leads, filters]);

  const currRows = useMemo(() => buildRows(fm, fl, start, end), [fm, fl, start, end, groupBy, campaigns]);
  const prevRows = useMemo(() => buildRows(fm, fl, ps, pe), [fm, fl, ps, pe, groupBy, campaigns]);

  const rows = useMemo(() => {
    return currRows.map((r) => {
      const p = prevRows.find((x) => x.key === r.key);
      return { ...r, leadsChange: p ? deltaLabel(r.leads, p.leads) : null };
    }).filter((r) => !search || r.label?.toLowerCase().includes(search.toLowerCase()))
      .sort((a, b) => sortDir * ((b[sortKey] || 0) - (a[sortKey] || 0)));
  }, [currRows, prevRows, search, sortKey, sortDir]);

  const topMovers = useMemo(() =>
    [...rows].filter((r) => r.leadsChange !== null)
      .sort((a, b) => Math.abs(b.leadsChange) - Math.abs(a.leadsChange))
      .slice(0, 3), [rows]);

  const COLS = [
    { key: "label", label: groupBy === "channel" ? "Channel" : "Campaign", sortable: false },
    { key: "spend", label: "Spend (DKK)", fmt: formatDKK },
    { key: "impressions", label: "Impressions", fmt: formatNum },
    { key: "clicks", label: "Clicks", fmt: formatNum },
    { key: "ctr", label: "CTR", fmt: formatPct },
    { key: "engRate", label: "Eng. Rate", fmt: formatPct },
    { key: "leads", label: "Total Leads", fmt: formatNum },
    { key: "A", label: "Grade A", fmt: formatNum },
    { key: "B", label: "Grade B", fmt: formatNum },
    { key: "C", label: "Grade C", fmt: formatNum },
    { key: "qualified", label: "Qualified", fmt: formatNum },
    { key: "cpl", label: "CPL", fmt: formatDKK },
    { key: "cpql", label: "CPQL", fmt: formatDKK },
  ];

  const sort = (key) => { if (sortKey === key) setSortDir(-sortDir); else { setSortKey(key); setSortDir(-1); } };

  if (loading) return (
    <div className="flex items-center justify-center h-96">
      <Loader2 className="w-8 h-8 animate-spin text-[#004B87]" />
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <GlobalFilters filters={filters} onChange={setFilters} campaigns={campaigns} />
      <div className="p-6 space-y-4 max-w-screen-2xl mx-auto">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-xl font-bold text-gray-900">Performance Drivers</h1>
          <div className="flex gap-2">
            <Button size="sm" variant={groupBy === "channel" ? "default" : "outline"} onClick={() => setGroupBy("channel")}>By Channel</Button>
            <Button size="sm" variant={groupBy === "campaign" ? "default" : "outline"} onClick={() => setGroupBy("campaign")}>By Campaign</Button>
          </div>
        </div>

        {/* Top movers */}
        {topMovers.length > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <p className="text-xs font-semibold text-amber-700 mb-2">📈 Top Movers (vs previous period)</p>
            <div className="flex flex-wrap gap-4">
              {topMovers.map((m) => (
                <div key={m.key} className="flex items-center gap-2 text-sm">
                  <span className="text-gray-700 font-medium">{m.label}</span>
                  <span className={`flex items-center gap-0.5 font-bold ${m.leadsChange > 0 ? "text-green-600" : "text-red-500"}`}>
                    {m.leadsChange > 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                    {m.leadsChange > 0 ? "+" : ""}{m.leadsChange.toFixed(1)}%
                  </span>
                  <span className="text-gray-400 text-xs">leads</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Search + export */}
        <div className="flex gap-3">
          <Input placeholder="Search..." value={search} onChange={(e) => setSearch(e.target.value)} className="h-8 text-sm w-64" />
          <Button size="sm" variant="outline" onClick={() => exportCSV(rows, COLS)}>
            <Download className="w-4 h-4 mr-1" /> Export CSV
          </Button>
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                {COLS.map((c) => (
                  <th key={c.key}
                    className={`px-3 py-3 text-left text-xs font-medium text-gray-500 whitespace-nowrap ${c.sortable !== false ? "cursor-pointer hover:text-gray-800" : ""}`}
                    onClick={() => c.sortable !== false && sort(c.key)}>
                    <div className="flex items-center gap-1">
                      {c.label}
                      {c.sortable !== false && <ArrowUpDown className="w-3 h-3" />}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && (
                <tr><td colSpan={COLS.length} className="py-12 text-center text-gray-400">No data for selected filters</td></tr>
              )}
              {rows.map((row) => (
                <tr key={row.key} className="border-b border-gray-50 hover:bg-gray-50">
                  {COLS.map((c) => (
                    <td key={c.key} className="px-3 py-2.5 whitespace-nowrap">
                      {c.fmt ? c.fmt(row[c.key]) : row[c.key] ?? "—"}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}