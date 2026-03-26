import { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import GlobalFilters from "../components/dashboard/GlobalFilters";
import {
  getDateRange, getPreviousPeriod, inDateRange,
  calcCTR, calcEngagementRate, calcCPL, calcCPQL, deltaLabel,
  formatDKK, formatPct, formatNum, CHANNEL_COLORS
} from "../components/utils/measures";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowUpDown, Download, TrendingUp, TrendingDown, Loader2, ChevronDown, ChevronRight } from "lucide-react";

const DEFAULT_FILTERS = { datePreset: "30d", region: "all", channel: "all", campaign_id: "all" };

const ALL_CHANNELS = [
  "Website (Inbound)",
  "Email",
  "Paid",
  "Organic Social",
  "PR/Trade media",
  "Events",
  "Webinars",
  "Landing page (Unknown)",
];

function exportCSV(rows, cols) {
  const header = cols.map((c) => c.label).join(",");
  const body = rows.map((r) => cols.map((c) => r[c.key] ?? "").join(",")).join("\n");
  const blob = new Blob([header + "\n" + body], { type: "text/csv" });
  const a = document.createElement("a"); a.href = URL.createObjectURL(blob);
  a.download = "channel_performance.csv"; a.click();
}

export default function ChannelPerformance() {
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [metrics, setMetrics] = useState([]);
  const [keyEvents, setKeyEvents] = useState([]);
  const [leads, setLeads] = useState([]);
  const [campaigns, setCampaigns] = useState([]);
  const [groupBy, setGroupBy] = useState("channel"); // channel | campaign | region
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState("leads");
  const [sortDir, setSortDir] = useState(-1);
  const [expandedRow, setExpandedRow] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      base44.entities.ChannelMetricDaily.list("-date", 5000),
      base44.entities.KeyEventDaily.list("-date", 5000),
      base44.entities.Lead.list("-created_date", 5000),
      base44.entities.Campaign.list(),
    ]).then(([m, ke, l, c]) => {
      setMetrics(m); setKeyEvents(ke); setLeads(l); setCampaigns(c);
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

  const fm = useMemo(() => applyFilters(metrics), [metrics, filters]);
  const fke = useMemo(() => applyFilters(keyEvents), [keyEvents, filters]);
  const fl = useMemo(() => applyFilters(leads), [leads, filters]);

  const buildRows = (mData, keData, lData, sStart, sEnd) => {
    const grp = {};
    const mFiltered = mData.filter((r) => inDateRange(r.date, sStart, sEnd));
    const keFiltered = keData.filter((r) => inDateRange(r.date, sStart, sEnd));
    const lFiltered = lData.filter((r) => inDateRange(r.created_date, sStart, sEnd));

    const getKey = (r) => {
      if (groupBy === "channel") return r.channel || "Other";
      if (groupBy === "campaign") return r.campaign_id || "Unknown";
      if (groupBy === "region") return r.region || "Unknown";
    };
    const getLabel = (r) => {
      if (groupBy === "channel") return r.channel || "Other";
      if (groupBy === "campaign") return campaigns.find((c) => c.campaign_id === r.campaign_id)?.name || r.campaign_id || "Unknown";
      if (groupBy === "region") return r.region || "Unknown";
    };

    mFiltered.forEach((r) => {
      const key = getKey(r);
      if (!grp[key]) grp[key] = { key, label: getLabel(r), spend: 0, sessions: 0, engagedSessions: 0, impressions: 0, clicks: 0, leads: 0, mql: 0, sql: 0 };
      grp[key].spend += r.spend_dkk || 0;
      grp[key].impressions += r.impressions || 0;
      grp[key].clicks += r.clicks || 0;
      grp[key].sessions += r.sessions || 0;
      grp[key].engagedSessions += r.engaged_sessions || 0;
    });
    keFiltered.forEach((r) => {
      const key = getKey(r);
      if (!grp[key]) grp[key] = { key, label: getLabel(r), spend: 0, sessions: 0, engagedSessions: 0, impressions: 0, clicks: 0, leads: 0, mql: 0, sql: 0 };
    });
    lFiltered.forEach((r) => {
      const key = getKey(r);
      const label = getLabel(r);
      if (!grp[key]) grp[key] = { key, label, spend: 0, sessions: 0, engagedSessions: 0, impressions: 0, clicks: 0, leads: 0, mql: 0, sql: 0 };
      grp[key].leads++;
      // MQL = SQL Lead = No (all non-SQL leads), SQL = SQL Lead = Yes
      // Using lead_grade as proxy: A = SQL, B/C = MQL until CRM field is available
      if (r.lead_grade === "A") grp[key].sql++;
      else grp[key].mql++;
    });

    return Object.values(grp).map((r) => ({
      ...r,
      ctr: calcCTR(r.clicks, r.impressions),
      engRate: r.sessions > 0 ? r.engagedSessions / r.sessions : null,
      cpl: calcCPL(r.spend, r.leads),
    }));
  };

  const currRows = useMemo(() => buildRows(fm, fke, fl, start, end), [fm, fke, fl, start, end, groupBy, campaigns]);
  const prevRows = useMemo(() => buildRows(fm, fke, fl, ps, pe), [fm, fke, fl, ps, pe, groupBy, campaigns]);

  const rows = useMemo(() => {
    return currRows.map((r) => {
      const p = prevRows.find((x) => x.key === r.key);
      return { ...r, leadsChange: p ? deltaLabel(r.leads, p.leads) : null };
    })
      .filter((r) => !search || r.label?.toLowerCase().includes(search.toLowerCase()))
      .sort((a, b) => sortDir * ((b[sortKey] || 0) - (a[sortKey] || 0)));
  }, [currRows, prevRows, search, sortKey, sortDir]);

  // Campaign drill-down for a given channel row
  const getCampaignDrilldown = (channelKey) => {
    const grp = {};
    const lFiltered = fl.filter((r) => inDateRange(r.created_date, start, end) && r.channel === channelKey);
    lFiltered.forEach((r) => {
      const k = r.campaign_id || "Unknown";
      const label = campaigns.find((c) => c.campaign_id === k)?.name || k;
      if (!grp[k]) grp[k] = { label, leads: 0, mql: 0, sql: 0 };
      grp[k].leads++;
      if (r.lead_grade === "A") grp[k].sql++;
      else grp[k].mql++;
    });
    return Object.values(grp).sort((a, b) => b.leads - a.leads).slice(0, 10);
  };

  const COLS = [
    { key: "label", label: groupBy === "channel" ? "Channel" : groupBy === "campaign" ? "Campaign" : "Region", sortable: false },
    { key: "sessions", label: "Sessions", fmt: formatNum },
    { key: "engRate", label: "Eng. Rate", fmt: formatPct },
    { key: "impressions", label: "Impressions", fmt: formatNum },
    { key: "clicks", label: "Clicks", fmt: formatNum },
    { key: "ctr", label: "CTR", fmt: formatPct },
    { key: "leads", label: "New Leads", fmt: formatNum },
    { key: "mql", label: "MQL (proxy)", fmt: formatNum },
    { key: "sql", label: "SQL (proxy)", fmt: formatNum },
    { key: "spend", label: "Spend (DKK)", fmt: formatDKK },
    { key: "cpl", label: "CPL", fmt: formatDKK },
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
          <div>
            <h1 className="text-xl font-bold text-gray-900">Channel Performance</h1>
            <p className="text-sm text-gray-500 mt-0.5">Compare channels side-by-side. CRM outcomes use lead_grade as MQL/SQL proxy until CRM SQL Lead field is connected.</p>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant={groupBy === "channel" ? "default" : "outline"} onClick={() => setGroupBy("channel")}>By Channel</Button>
            <Button size="sm" variant={groupBy === "campaign" ? "default" : "outline"} onClick={() => setGroupBy("campaign")}>By Campaign</Button>
            <Button size="sm" variant={groupBy === "region" ? "default" : "outline"} onClick={() => setGroupBy("region")}>By Region</Button>
          </div>
        </div>

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
                {groupBy === "channel" && <th className="px-3 py-3 w-8" />}
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
                <tr><td colSpan={COLS.length + 1} className="py-12 text-center text-gray-400">No data for selected filters</td></tr>
              )}
              {rows.map((row) => (
                <>
                  <tr key={row.key} className="border-b border-gray-50 hover:bg-gray-50">
                    {groupBy === "channel" && (
                      <td className="px-3 py-2.5">
                        <button onClick={() => setExpandedRow(expandedRow === row.key ? null : row.key)} className="text-gray-400 hover:text-gray-600">
                          {expandedRow === row.key ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                        </button>
                      </td>
                    )}
                    {COLS.map((c) => (
                      <td key={c.key} className="px-3 py-2.5 whitespace-nowrap">
                        {c.key === "label" ? (
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: CHANNEL_COLORS[row.key] || "#9ca3af" }} />
                            <span className="font-medium text-gray-800">{row[c.key] ?? "—"}</span>
                            {row.leadsChange !== null && (
                              <span className={`text-xs flex items-center gap-0.5 ${row.leadsChange > 0 ? "text-green-600" : "text-red-500"}`}>
                                {row.leadsChange > 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                                {row.leadsChange > 0 ? "+" : ""}{row.leadsChange?.toFixed(1)}%
                              </span>
                            )}
                          </div>
                        ) : (
                          c.fmt ? c.fmt(row[c.key]) : row[c.key] ?? "—"
                        )}
                      </td>
                    ))}
                  </tr>
                  {/* Campaign drill-down */}
                  {groupBy === "channel" && expandedRow === row.key && (
                    <tr key={`${row.key}-drilldown`} className="bg-blue-50 border-b border-blue-100">
                      <td colSpan={COLS.length + 1} className="px-6 py-3">
                        <p className="text-xs font-semibold text-[#004B87] mb-2">Top campaigns for {row.label}</p>
                        <table className="w-full text-xs">
                          <thead>
                            <tr className="text-gray-500">
                              <th className="text-left py-1 pr-4">Campaign</th>
                              <th className="text-right py-1 pr-4">New Leads</th>
                              <th className="text-right py-1 pr-4">MQL (proxy)</th>
                              <th className="text-right py-1">SQL (proxy)</th>
                            </tr>
                          </thead>
                          <tbody>
                            {getCampaignDrilldown(row.key).map((d, i) => (
                              <tr key={i} className="border-t border-blue-100">
                                <td className="py-1 pr-4 text-gray-700 font-medium">{d.label}</td>
                                <td className="py-1 pr-4 text-right">{formatNum(d.leads)}</td>
                                <td className="py-1 pr-4 text-right">{formatNum(d.mql)}</td>
                                <td className="py-1 text-right">{formatNum(d.sql)}</td>
                              </tr>
                            ))}
                            {getCampaignDrilldown(row.key).length === 0 && (
                              <tr><td colSpan={4} className="py-2 text-gray-400">No campaign data</td></tr>
                            )}
                          </tbody>
                        </table>
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
        </div>

        <p className="text-xs text-gray-400">
          * MQL (proxy) = Grade B/C leads · SQL (proxy) = Grade A leads · These will map to CRM SQL Lead field once connected.
          "Landing page (Unknown)" bucket highlights attribution gaps where UTM Medium is blank.
        </p>
      </div>
    </div>
  );
}