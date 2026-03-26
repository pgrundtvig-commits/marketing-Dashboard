import { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { format, subDays, startOfQuarter } from "date-fns";
import { Loader2 } from "lucide-react";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

const TABS = [
  { key: "LinkedIn Paid", label: "LinkedIn Paid" },
  { key: "LinkedIn Organic", label: "LinkedIn Organic" },
  { key: "Paid Search", label: "Paid Search" },
  { key: "Website", label: "Website" },
  { key: "Email Campaigns", label: "Email" },
  { key: "Webinars", label: "Webinars" },
  { key: "Events", label: "Events" },
  { key: "Trade Media/PR", label: "Trade Media/PR" },
];

function fmt(val) {
  if (!val && val !== 0) return "—";
  return new Intl.NumberFormat("da-DK").format(Math.round(val));
}
function fmtPct(val) {
  if (val === null || val === undefined) return "—";
  return (val * 100).toFixed(1) + "%";
}
function fmtDKK(val) {
  if (!val) return "—";
  return new Intl.NumberFormat("da-DK", { style: "currency", currency: "DKK", maximumFractionDigits: 0 }).format(val);
}

function sum(rows, field) {
  return rows.reduce((s, r) => s + (r[field] || 0), 0);
}

export default function PalsgaardPulsChannels() {
  const [activeTab, setActiveTab] = useState("LinkedIn Paid");
  const [metrics, setMetrics] = useState([]);
  const [keyEvents, setKeyEvents] = useState([]);
  const [campaigns, setCampaigns] = useState([]);
  const [campaignMaps, setCampaignMaps] = useState([]);
  const [budgetLines, setBudgetLines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState("daily");

  // Date range: last 30 days
  const end = new Date(); end.setHours(0, 0, 0, 0);
  const start = subDays(end, 29);
  const startStr = format(start, "yyyy-MM-dd");
  const endStr = format(end, "yyyy-MM-dd");

  useEffect(() => {
    Promise.all([
      base44.entities.ChannelMetricDaily.list("-date", 5000),
      base44.entities.KeyEventDaily.list("-date", 5000),
      base44.entities.Campaign.list(),
      base44.entities.CampaignMap.list(),
      base44.entities.BudgetLine.list(),
    ]).then(([m, ke, c, cm, b]) => {
      setMetrics(m);
      setKeyEvents(ke);
      setCampaigns(c);
      setCampaignMaps(cm);
      setBudgetLines(b);
    }).finally(() => setLoading(false));
  }, []);

  const chanMetrics = useMemo(() =>
    metrics.filter(r => r.channel === activeTab && r.date >= startStr && r.date <= endStr),
    [metrics, activeTab, startStr, endStr]);

  // Group by source_system to detect dual-sourced channels
  const metricsBySource = useMemo(() => {
    const grouped = {};
    chanMetrics.forEach(r => {
      const src = r.source_system || "Unknown";
      if (!grouped[src]) grouped[src] = [];
      grouped[src].push(r);
    });
    return grouped;
  }, [chanMetrics]);

  const chanKE = useMemo(() =>
    keyEvents.filter(r => r.channel === activeTab && r.date >= startStr && r.date <= endStr),
    [keyEvents, activeTab, startStr, endStr]);

  const kpi = useMemo(() => ({
    impressions: sum(chanMetrics, "impressions"),
    reach: sum(chanMetrics, "reach"),
    clicks: sum(chanMetrics, "clicks"),
    engagements: sum(chanMetrics, "engagements"),
    sessions: sum(chanMetrics, "sessions"),
    engagedSessions: sum(chanMetrics, "engaged_sessions"),
    spend: sum(chanMetrics, "spend_dkk"),
    engRate: sum(chanMetrics, "impressions") > 0
      ? sum(chanMetrics, "engagements") / sum(chanMetrics, "impressions") : null,
    sessEngRate: sum(chanMetrics, "sessions") > 0
      ? sum(chanMetrics, "engaged_sessions") / sum(chanMetrics, "sessions") : null,
    totalKE: chanKE.reduce((s, e) => s + (e.key_event_count || 0), 0),
  }), [chanMetrics, chanKE]);

  // Time series
  const timeSeries = useMemo(() => {
    const days = [];
    const d = new Date(start);
    while (d <= end) {
      const ds = format(d, "yyyy-MM-dd");
      const dm = chanMetrics.filter(r => r.date === ds);
      days.push({
        date: format(d, "dd/MM"),
        impressions: sum(dm, "impressions"),
        clicks: sum(dm, "clicks"),
        engagements: sum(dm, "engagements"),
        sessions: sum(dm, "sessions"),
        spend: sum(dm, "spend_dkk"),
      });
      d.setDate(d.getDate() + 1);
    }
    return days;
  }, [chanMetrics, start, end]);

  // Top campaigns — built directly from raw channel data, no mapping needed
  const topCampaigns = useMemo(() => {
    const byId = {};
    chanMetrics.forEach(r => {
      const key = r.campaign_id || "(not set)";
      if (!byId[key]) byId[key] = {
        campaign_id: key,
        source_system: r.source_system,
        impressions: 0, clicks: 0, engagements: 0, sessions: 0, spend: 0,
      };
      byId[key].impressions += r.impressions || 0;
      byId[key].clicks += r.clicks || 0;
      byId[key].engagements += r.engagements || 0;
      byId[key].sessions += r.sessions || 0;
      byId[key].spend += r.spend_dkk || 0;
    });
    return Object.values(byId).sort((a, b) => b.impressions - a.impressions).slice(0, 20);
  }, [chanMetrics]);

  // Key events breakdown
  const keBreakdown = useMemo(() => {
    const byName = {};
    chanKE.forEach(e => { byName[e.key_event_name] = (byName[e.key_event_name] || 0) + (e.key_event_count || 0); });
    return Object.entries(byName).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count);
  }, [chanKE]);

  // Budget
  const budgetData = useMemo(() => {
    const cur = budgetLines.filter(b => b.channel === activeTab);
    return { planned: sum(cur, "planned_dkk"), actual: sum(cur, "actual_dkk") };
  }, [budgetLines, activeTab]);

  const isWeChat = activeTab === "WeChat";

  if (loading) return (
    <div className="flex items-center justify-center h-96">
      <Loader2 className="w-8 h-8 animate-spin" style={{ color: "#1a2e4a" }} />
    </div>
  );

  return (
    <div className="min-h-screen" style={{ background: "#f5f5f0" }}>
      {/* Header */}
      <div className="px-6 pt-6 pb-4" style={{ background: "#1a2e4a" }}>
        <div className="max-w-screen-2xl mx-auto">
          <h1 className="text-2xl font-bold text-white tracking-tight">Channel Performance</h1>
          <p className="text-sm mt-0.5" style={{ color: "#a8c5d6" }}>Last 30 days · drill-down per channel</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white border-b border-gray-200 overflow-x-auto">
        <div className="max-w-screen-2xl mx-auto px-6 flex gap-0">
          {TABS.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                activeTab === tab.key
                  ? "border-[#1a2e4a] text-[#1a2e4a]"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-screen-2xl mx-auto px-6 py-6 space-y-6">
        {/* Data source badges */}
          {Object.keys(metricsBySource).length > 1 && (
            <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
              <p className="text-xs font-semibold text-blue-900 mb-2">Data sources:</p>
              <div className="flex gap-2 flex-wrap">
                {Object.keys(metricsBySource).map(src => (
                  <span key={src} className="inline-block px-2 py-1 bg-blue-100 text-blue-900 text-xs font-medium rounded">
                    {src}
                  </span>
                ))}
              </div>
              <p className="text-xs text-blue-700 mt-2">Below metrics combine data from multiple sources. LinkedIn Paid API provides impressions/clicks; GA4 provides sessions/conversions.</p>
            </div>
          )}

        {/* KPI summary row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-4">
            {[
              { title: "Impressions", value: kpi.impressions },
              { title: "Reach", value: kpi.reach },
              { title: "Clicks", value: kpi.clicks },
              { title: "Engagements", value: kpi.engagements },
              { title: "Eng. Rate", value: kpi.engRate !== null ? fmtPct(kpi.engRate) : "—", raw: true },
              { title: "Spend (DKK)", value: kpi.spend, dkk: true },
            ].map(card => (
              <div key={card.title} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">{card.title}</p>
                <p className="text-xl font-bold mt-1" style={{ color: "#1a2e4a" }}>
                  {card.raw ? card.value : card.dkk ? fmtDKK(card.value) : fmt(card.value)}
                </p>
              </div>
            ))}
          </div>

        {/* LinkedIn regional split */}
        {(activeTab === "LinkedIn Paid" || activeTab === "LinkedIn Organic") && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <h3 className="text-sm font-semibold text-gray-700 mb-4">Regional Breakdown (LinkedIn)</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left py-2 px-3 text-xs font-semibold text-gray-400 uppercase">Region / Campaign</th>
                    <th className="text-right py-2 px-3 text-xs font-semibold text-gray-400 uppercase">Impressions</th>
                    <th className="text-right py-2 px-3 text-xs font-semibold text-gray-400 uppercase">Clicks</th>
                    <th className="text-right py-2 px-3 text-xs font-semibold text-gray-400 uppercase">Engagements</th>
                    <th className="text-right py-2 px-3 text-xs font-semibold text-gray-400 uppercase">Spend (DKK)</th>
                  </tr>
                </thead>
                <tbody>
                  {(() => {
                    const byRegion = {};
                    chanMetrics.forEach(r => {
                      const camp = campaigns.find(c => c.campaign_id === r.campaign_id);
                      const region = camp?.region || "Unknown";
                      if (!byRegion[region]) byRegion[region] = { impressions: 0, clicks: 0, engagements: 0, spend: 0 };
                      byRegion[region].impressions += r.impressions || 0;
                      byRegion[region].clicks += r.clicks || 0;
                      byRegion[region].engagements += r.engagements || 0;
                      byRegion[region].spend += r.spend_dkk || 0;
                    });
                    const rows = Object.entries(byRegion).sort((a, b) => b[1].impressions - a[1].impressions);
                    if (!rows.length) return <tr><td colSpan={5} className="text-center py-6 text-gray-400 text-sm">No data</td></tr>;
                    return rows.map(([region, d]) => (
                      <tr key={region} className="border-b border-gray-50 hover:bg-gray-50">
                        <td className="py-2 px-3 font-medium text-gray-800">{region}</td>
                        <td className="py-2 px-3 text-right">{fmt(d.impressions)}</td>
                        <td className="py-2 px-3 text-right">{fmt(d.clicks)}</td>
                        <td className="py-2 px-3 text-right">{fmt(d.engagements)}</td>
                        <td className="py-2 px-3 text-right">{fmtDKK(d.spend)}</td>
                      </tr>
                    ));
                  })()}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Charts row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-gray-700">Trend</h3>
            </div>
            {timeSeries.every(d => !d.impressions && !d.sessions) ? (
              <div className="flex items-center justify-center h-48 text-gray-400 text-sm">
                {activeTab} — Data available once integration is live
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={timeSeries}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0ee" />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} interval="preserveStartEnd" />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip />
                  <Legend iconSize={10} wrapperStyle={{ fontSize: 10 }} />
                  <Line type="monotone" dataKey="impressions" stroke="#1a2e4a" name="Impressions" dot={false} strokeWidth={2} />
                  <Line type="monotone" dataKey="clicks" stroke="#4a7c6f" name="Clicks" dot={false} strokeWidth={1.5} />
                  <Line type="monotone" dataKey="engagements" stroke="#7cb8d4" name="Engagements" dot={false} strokeWidth={1.5} strokeDasharray="4 2" />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Key events */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <h3 className="text-sm font-semibold text-gray-700 mb-4">Key Events</h3>
            {keBreakdown.length === 0 ? (
              <div className="flex items-center justify-center h-48 text-gray-400 text-sm">No key events for this channel</div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={keBreakdown} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0ee" />
                  <XAxis type="number" tick={{ fontSize: 10 }} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={120} />
                  <Tooltip />
                  <Bar dataKey="count" fill="#4a7c6f" name="Count" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Top campaigns — raw from channel data */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-gray-700">Campaigns <span className="text-xs font-normal text-gray-400 ml-1">— as reported by {activeTab}</span></h3>
          </div>
          {topCampaigns.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-6">No campaign data available for this channel yet</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left py-2 px-3 text-xs font-semibold text-gray-400 uppercase">Campaign ID (from source)</th>
                    <th className="text-left py-2 px-3 text-xs font-semibold text-gray-400 uppercase">Source</th>
                    <th className="text-right py-2 px-3 text-xs font-semibold text-gray-400 uppercase">Impressions</th>
                    <th className="text-right py-2 px-3 text-xs font-semibold text-gray-400 uppercase">Clicks</th>
                    <th className="text-right py-2 px-3 text-xs font-semibold text-gray-400 uppercase">Engagements</th>
                    <th className="text-right py-2 px-3 text-xs font-semibold text-gray-400 uppercase">Sessions</th>
                    <th className="text-right py-2 px-3 text-xs font-semibold text-gray-400 uppercase">Spend (DKK)</th>
                  </tr>
                </thead>
                <tbody>
                  {topCampaigns.map(c => (
                    <tr key={c.campaign_id} className="border-b border-gray-50 hover:bg-gray-50">
                      <td className="py-2 px-3">
                        <span className={`font-mono text-xs ${c.campaign_id === "(not set)" ? "text-gray-400 italic" : "text-gray-800"}`}>
                          {c.campaign_id}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-xs text-gray-400">{c.source_system || "—"}</td>
                      <td className="py-2 px-3 text-right">{fmt(c.impressions)}</td>
                      <td className="py-2 px-3 text-right">{fmt(c.clicks)}</td>
                      <td className="py-2 px-3 text-right">{fmt(c.engagements)}</td>
                      <td className="py-2 px-3 text-right">{fmt(c.sessions)}</td>
                      <td className="py-2 px-3 text-right">{fmtDKK(c.spend)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Budget vs Actual */}
        {(budgetData.planned > 0 || budgetData.actual > 0) && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <h3 className="text-sm font-semibold text-gray-700 mb-4">Budget vs. Actual</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <div>
                <p className="text-xs text-gray-400 font-semibold uppercase">Planned</p>
                <p className="text-xl font-bold mt-1" style={{ color: "#1a2e4a" }}>{fmtDKK(budgetData.planned)}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400 font-semibold uppercase">Actual</p>
                <p className="text-xl font-bold mt-1" style={{ color: "#4a7c6f" }}>{fmtDKK(budgetData.actual)}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400 font-semibold uppercase">Utilisation</p>
                <p className="text-xl font-bold mt-1" style={{ color: budgetData.actual > budgetData.planned ? "#ef4444" : "#22c55e" }}>
                  {budgetData.planned > 0 ? ((budgetData.actual / budgetData.planned) * 100).toFixed(1) + "%" : "—"}
                </p>
              </div>
            </div>
            {budgetData.planned > 0 && (
              <div className="mt-4 h-3 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: Math.min((budgetData.actual / budgetData.planned) * 100, 100) + "%",
                    background: budgetData.actual > budgetData.planned ? "#ef4444" : "#4a7c6f",
                  }}
                />
              </div>
            )}
          </div>
        )}

        {/* WeChat note */}
        {activeTab === "WeChat" && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 text-center">
            <p className="text-sm font-medium text-amber-800">WeChat data is imported manually via CSV upload</p>
            <p className="text-xs text-amber-600 mt-1">Use the Data Import page to upload WeChat performance data</p>
          </div>
        )}
      </div>
    </div>
  );
}