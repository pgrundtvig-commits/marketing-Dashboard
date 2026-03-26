import { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer
} from "recharts";
import GlobalFilters from "../components/dashboard/GlobalFilters";
import KPICard from "../components/dashboard/KPICard";
import DataFreshnessBar from "../components/dashboard/DataFreshnessBar";
import {
  getDateRange, getPreviousPeriod, getYoYPeriod, inDateRange,
  formatPct, formatNum, deltaLabel, CHANNEL_COLORS
} from "../components/utils/measures";
import { Loader2, ChevronDown, ChevronRight, RefreshCw } from "lucide-react";
import { format } from "date-fns";
import BrandedSearch from "../components/dashboard/BrandedSearch";
import ToplineSummary from "../components/dashboard/ToplineSummary";

const DEFAULT_FILTERS = { datePreset: "30d", region: "all", channel: "all", campaign_id: "all" };

const KEY_EVENT_COLORS = {
  generate_lead: "#16a34a",
  contact_form: "#2563eb",
  file_download: "#f97316",
  ipaper_download: "#9333ea",
  faq_article_click: "#6b7280",
  other: "#d1d5db",
};

function applyFilters(data, filters) {
  return data.filter((r) => {
    if (filters.channel && filters.channel !== "all" && r.channel !== filters.channel) return false;
    if (filters.campaign_id && filters.campaign_id !== "all" && r.campaign_id !== filters.campaign_id) return false;
    return true;
  });
}

function sumField(rows, field) {
  return rows.reduce((s, r) => s + (r[field] || 0), 0);
}

export default function ExecutiveOverview() {
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [metrics, setMetrics] = useState([]);
  const [keyEvents, setKeyEvents] = useState([]);
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [channelTableOpen, setChannelTableOpen] = useState(false);
  const [gscData, setGscData] = useState([]);
  const [syncing, setSyncing] = useState(false);
  const [syncMsg, setSyncMsg] = useState(null);
  const [syncRange, setSyncRange] = useState("7d");

  const getSyncDates = (range) => {
    const end = new Date();
    end.setDate(end.getDate() - 1); // yesterday
    const endStr = end.toISOString().slice(0, 10);
    const start = new Date(end);
    if (range === "1d") { /* yesterday only */ }
    else if (range === "7d") start.setDate(start.getDate() - 6);
    else if (range === "30d") start.setDate(start.getDate() - 29);
    else if (range === "90d") start.setDate(start.getDate() - 89);
    else if (range === "365d") start.setDate(start.getDate() - 364);
    return { startDate: start.toISOString().slice(0, 10), endDate: endStr };
  };

  const handleSync = async () => {
    setSyncing(true);
    setSyncMsg(null);
    const { startDate, endDate } = getSyncDates(syncRange);
    try {
      const [ga4Result, gscResult] = await Promise.allSettled([
        base44.functions.invoke("syncGa4Metrics", { startDate, endDate }),
        base44.functions.invoke("syncGscData", { startDate, endDate }),
      ]);

      const ga4Ok = ga4Result.status === "fulfilled";
      const gscOk = gscResult.status === "fulfilled";

      if (!ga4Ok && !gscOk) {
        setSyncMsg({ ok: false, text: "Both syncs failed. Check function logs." });
      } else if (!ga4Ok) {
        setSyncMsg({ ok: false, text: "GA4 sync failed: " + (ga4Result.reason?.message || "unknown error") });
      } else if (!gscOk) {
        setSyncMsg({ ok: false, text: "GSC sync failed (GA4 OK): " + (gscResult.reason?.message || "unknown error") });
      } else {
        setSyncMsg({ ok: true, text: "Sync complete — reloading data…" });
      }

      // Reload data regardless of partial failure
      const [m, ke, c, gsc] = await Promise.all([
        base44.entities.ChannelMetricDaily.list("-date", 5000),
        base44.entities.KeyEventDaily.list("-date", 5000),
        base44.entities.Campaign.list(),
        base44.entities.SearchConsoleMetric.list("-date", 5000),
      ]);
      setMetrics(m);
      setKeyEvents(ke);
      setCampaigns(c);
      setGscData(gsc);
      if (ga4Ok && gscOk) setSyncMsg({ ok: true, text: "Dashboard updated successfully." });
    } catch (e) {
      setSyncMsg({ ok: false, text: "Sync failed: " + e.message });
    } finally {
      setSyncing(false);
    }
  };

  useEffect(() => {
    Promise.all([
      base44.entities.ChannelMetricDaily.list("-date", 5000),
      base44.entities.KeyEventDaily.list("-date", 5000),
      base44.entities.Campaign.list(),
      base44.entities.SearchConsoleMetric.list("-date", 5000),
    ]).then(([m, ke, c, gsc]) => {
      setMetrics(m);
      setKeyEvents(ke);
      setCampaigns(c);
      setGscData(gsc);
    }).finally(() => setLoading(false));
  }, []);

  const { start, end } = useMemo(() =>
    getDateRange(filters.datePreset, filters.customStart, filters.customEnd), [filters]);

  const compPeriod = useMemo(() =>
    filters.compareYoY ? getYoYPeriod(start, end) : getPreviousPeriod(start, end),
    [filters.compareYoY, start, end]);
  const { start: ps, end: pe } = compPeriod;

  const filteredMetrics = useMemo(() => applyFilters(metrics, filters), [metrics, filters]);
  const filteredKeyEvents = useMemo(() => applyFilters(keyEvents, filters), [keyEvents, filters]);

  // Current period aggregates
  const curMetrics = useMemo(() => filteredMetrics.filter((r) => inDateRange(r.date, start, end)), [filteredMetrics, start, end]);
  const prevMetrics = useMemo(() => filteredMetrics.filter((r) => inDateRange(r.date, ps, pe)), [filteredMetrics, ps, pe]);
  const curKeyEvents = useMemo(() => filteredKeyEvents.filter((r) => inDateRange(r.date, start, end)), [filteredKeyEvents, start, end]);
  const prevKeyEvents = useMemo(() => filteredKeyEvents.filter((r) => inDateRange(r.date, ps, pe)), [filteredKeyEvents, ps, pe]);

  const kpi = useMemo(() => {
    const sessions = sumField(curMetrics, "sessions");
    const pSessions = sumField(prevMetrics, "sessions");
    const engaged = sumField(curMetrics, "engaged_sessions");
    const pEngaged = sumField(prevMetrics, "engaged_sessions");
    const engRate = sessions > 0 ? engaged / sessions : null;
    const pEngRate = pSessions > 0 ? pEngaged / pSessions : null;

    const primaryConversions = curKeyEvents
      .filter((e) => e.key_event_name === "generate_lead" || e.key_event_name === "contact_form")
      .reduce((s, e) => s + (e.key_event_count || 0), 0);
    const pPrimaryConversions = prevKeyEvents
      .filter((e) => e.key_event_name === "generate_lead" || e.key_event_name === "contact_form")
      .reduce((s, e) => s + (e.key_event_count || 0), 0);

    const downloads = curKeyEvents
      .filter((e) => e.key_event_name === "file_download" || e.key_event_name === "ipaper_download")
      .reduce((s, e) => s + (e.key_event_count || 0), 0);
    const pDownloads = prevKeyEvents
      .filter((e) => e.key_event_name === "file_download" || e.key_event_name === "ipaper_download")
      .reduce((s, e) => s + (e.key_event_count || 0), 0);

    const faqClicks = curKeyEvents
      .filter((e) => e.key_event_name === "faq_article_click")
      .reduce((s, e) => s + (e.key_event_count || 0), 0);

    return {
      sessions, pSessions, engaged, pEngaged, engRate, pEngRate,
      primaryConversions, pPrimaryConversions,
      downloads, pDownloads, faqClicks,
    };
  }, [curMetrics, prevMetrics, curKeyEvents, prevKeyEvents]);

  // Time series: daily sessions + engaged sessions
  const timeSeriesData = useMemo(() => {
    const days = [];
    const d = new Date(start);
    while (d <= end) {
      const ds = format(d, "yyyy-MM-dd");
      const dayM = curMetrics.filter((r) => r.date === ds);
      const dayKE = curKeyEvents.filter((r) => r.date === ds);
      const sessions = sumField(dayM, "sessions");
      const engaged = sumField(dayM, "engaged_sessions");
      const conversions = dayKE
        .filter((e) => e.key_event_name === "generate_lead" || e.key_event_name === "contact_form")
        .reduce((s, e) => s + (e.key_event_count || 0), 0);
      days.push({ date: format(d, "dd MMM"), sessions, engaged, conversions });
      d.setDate(d.getDate() + 1);
    }
    return days;
  }, [curMetrics, curKeyEvents, start, end]);

  // Key events breakdown by type
  const keyEventBreakdown = useMemo(() => {
    const byName = {};
    curKeyEvents.forEach((e) => {
      const k = e.key_event_name;
      byName[k] = (byName[k] || 0) + (e.key_event_count || 0);
    });
    return Object.entries(byName).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count);
  }, [curKeyEvents]);

  // Sessions by channel
  const byChannel = useMemo(() => {
    const ch = {};
    curMetrics.forEach((r) => {
      if (!ch[r.channel]) ch[r.channel] = { channel: r.channel, sessions: 0, engaged: 0 };
      ch[r.channel].sessions += r.sessions || 0;
      ch[r.channel].engaged += r.engaged_sessions || 0;
    });
    return Object.values(ch)
      .map((c) => ({ ...c, engRate: c.sessions > 0 ? c.engaged / c.sessions : 0 }))
      .sort((a, b) => b.sessions - a.sessions);
  }, [curMetrics]);

  const gscKpi = useMemo(() => {
    const startStr = start ? format(start, "yyyy-MM-dd") : null;
    const endStr = end ? format(end, "yyyy-MM-dd") : null;
    if (!startStr || !endStr) return null;
    const BRANDED_REGEX = /\b(palsg[aå]ard|paalsg[aå]?rd|pallsgaard|plasgaard|palgard)\b/i;
    const cur = gscData.filter((r) => r.date >= startStr && r.date <= endStr);
    const branded = cur.filter((r) => BRANDED_REGEX.test(r.query || ""));
    const bClicks = branded.reduce((s, r) => s + (r.clicks || 0), 0);
    const bImpressions = branded.reduce((s, r) => s + (r.impressions || 0), 0);
    const totalClicks = cur.reduce((s, r) => s + (r.clicks || 0), 0);
    const shareClicks = totalClicks > 0 ? bClicks / totalClicks : null;
    return { bClicks, bImpressions, shareClicks };
  }, [gscData, start, end]);

  if (loading) return (
    <div className="flex items-center justify-center h-96">
      <Loader2 className="w-8 h-8 animate-spin text-[#004B87]" />
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <GlobalFilters filters={filters} onChange={setFilters} campaigns={campaigns} />

      <div className="p-6 space-y-6 max-w-screen-2xl mx-auto">
        <div className="flex items-center justify-between">
          <DataFreshnessBar />
          <div className="flex items-center gap-2 ml-4 flex-shrink-0">
            {syncMsg && (
              <span className={`text-xs ${syncMsg.ok ? "text-green-600" : "text-red-500"}`}>
                {syncMsg.text}
              </span>
            )}
            <select
              value={syncRange}
              onChange={(e) => setSyncRange(e.target.value)}
              disabled={syncing}
              className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 bg-white text-gray-600 focus:outline-none disabled:opacity-50"
            >
              <option value="1d">Yesterday only</option>
              <option value="7d">Last 7 days</option>
              <option value="30d">Last 30 days</option>
              <option value="90d">Last 90 days</option>
              <option value="365d">Last 12 months</option>
            </select>
            <button
              onClick={handleSync}
              disabled={syncing}
              className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 disabled:opacity-50 transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${syncing ? "animate-spin" : ""}`} />
              {syncing ? "Syncing…" : "Sync Now"}
            </button>
          </div>
        </div>

        {/* Topline Summary */}
        <ToplineSummary kpi={kpi} gscKpi={gscKpi} />

        {/* Section: Website Traffic */}
        <div>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
            Website Traffic (GA4){filters.compareYoY && <span className="ml-2 text-[#004B87] normal-case font-normal">vs. same period last year</span>}
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <KPICard
              title="Sessions"
              value={kpi.sessions > 0 ? formatNum(kpi.sessions) : "N/A"}
              delta={deltaLabel(kpi.sessions, kpi.pSessions)}
              accent="#004B87"
            />
            <KPICard
              title="Engaged Sessions"
              value={kpi.engaged > 0 ? formatNum(kpi.engaged) : "N/A"}
              delta={deltaLabel(kpi.engaged, kpi.pEngaged)}
              accent="#2563eb"
            />
            <KPICard
              title="Engagement Rate"
              value={kpi.engRate !== null ? formatPct(kpi.engRate) : "N/A"}
              delta={deltaLabel(kpi.engRate, kpi.pEngRate)}
              accent="#0ea5e9"
              subtitle="engaged / sessions"
            />
            <KPICard
              title="Website Conversions"
              value={kpi.primaryConversions > 0 ? formatNum(kpi.primaryConversions) : "N/A"}
              delta={deltaLabel(kpi.primaryConversions, kpi.pPrimaryConversions)}
              accent="#16a34a"
              subtitle="generate_lead + contact_form"
            />
          </div>
        </div>

        {/* Section: Content & Intent */}
        <div>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Content & Intent Signals (GA4)</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <KPICard
              title="Downloads"
              value={kpi.downloads > 0 ? formatNum(kpi.downloads) : "N/A"}
              delta={deltaLabel(kpi.downloads, kpi.pDownloads)}
              accent="#f97316"
              subtitle="file + iPaper downloads"
            />
            <KPICard
              title="FAQ Article Clicks"
              value={kpi.faqClicks > 0 ? formatNum(kpi.faqClicks) : "N/A"}
              accent="#6b7280"
              subtitle="low-intent signal"
            />
            <KPICard
              title="Spend (DKK)"
              value="N/A"
              subtitle="Connect LinkedIn / Google Ads"
              accent="#ef4444"
            />
          </div>
        </div>

        {/* Charts row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {/* Time series */}
          <div className="xl:col-span-2 bg-white rounded-xl border border-gray-200 p-5">
            <h3 className="text-sm font-semibold text-gray-700 mb-4">Sessions & Conversions Over Time</h3>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={timeSeriesData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} interval="preserveStartEnd" />
                <YAxis yAxisId="left" tick={{ fontSize: 11 }} />
                <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11 }} />
                <Tooltip />
                <Legend iconSize={10} wrapperStyle={{ fontSize: 11 }} />
                <Line yAxisId="left" type="monotone" dataKey="sessions" stroke="#004B87" name="Sessions" dot={false} strokeWidth={2} />
                <Line yAxisId="left" type="monotone" dataKey="engaged" stroke="#2563eb" name="Engaged Sessions" dot={false} strokeWidth={2} strokeDasharray="4 2" />
                <Line yAxisId="right" type="monotone" dataKey="conversions" stroke="#16a34a" name="Conversions (Primary)" dot={false} strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Key event breakdown */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h3 className="text-sm font-semibold text-gray-700 mb-4">Key Events Breakdown</h3>
            {keyEventBreakdown.length === 0 ? (
              <div className="flex items-center justify-center h-48 text-gray-400 text-sm">No key event data</div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={keyEventBreakdown} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis type="number" tick={{ fontSize: 11 }} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={110} />
                  <Tooltip />
                  <Bar dataKey="count" name="Count" radius={[0, 4, 4, 0]}>
                    {keyEventBreakdown.map((entry) => (
                      <rect key={entry.name} fill={KEY_EVENT_COLORS[entry.name] || "#9ca3af"} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Sessions by Channel */}
        <div className="bg-white rounded-xl border border-gray-200">
          <button
            className="w-full flex items-center justify-between px-5 py-4 text-left"
            onClick={() => setChannelTableOpen((o) => !o)}
          >
            <h3 className="text-sm font-semibold text-gray-700">Sessions by Channel</h3>
            {channelTableOpen ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronRight className="w-4 h-4 text-gray-400" />}
          </button>
          {channelTableOpen && (
            <div className="px-5 pb-5 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left py-2 px-3 text-xs font-medium text-gray-500">Channel</th>
                    <th className="text-right py-2 px-3 text-xs font-medium text-gray-500">Sessions</th>
                    <th className="text-right py-2 px-3 text-xs font-medium text-gray-500">Engaged Sessions</th>
                    <th className="text-right py-2 px-3 text-xs font-medium text-gray-500">Engagement Rate</th>
                  </tr>
                </thead>
                <tbody>
                  {byChannel.length === 0 && (
                    <tr><td colSpan={4} className="text-center py-8 text-gray-400 text-sm">No data for selected period</td></tr>
                  )}
                  {byChannel.map((row) => (
                    <tr key={row.channel} className="border-b border-gray-50 hover:bg-gray-50">
                      <td className="py-2 px-3 font-medium text-gray-800">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: CHANNEL_COLORS[row.channel] || "#ccc" }} />
                          {row.channel}
                        </div>
                      </td>
                      <td className="py-2 px-3 text-right">{formatNum(row.sessions)}</td>
                      <td className="py-2 px-3 text-right">{formatNum(row.engaged)}</td>
                      <td className="py-2 px-3 text-right font-medium text-blue-600">{formatPct(row.engRate)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Section: Branded Search (GSC) */}
        <div>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
            Brand Reach — Branded Search (GSC)
          </p>
          <BrandedSearch
            start={start}
            end={end}
            prevStart={ps}
            prevEnd={pe}
          />
        </div>

      </div>
    </div>
  );
}