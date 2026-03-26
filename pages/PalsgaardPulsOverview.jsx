import { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { format, subDays, startOfQuarter, endOfQuarter, subQuarters } from "date-fns";
import { Loader2, RefreshCw, TrendingUp, TrendingDown, Minus } from "lucide-react";
import PulseFilters from "../components/puls/PulseFilters";
import DataFreshnessDots from "../components/puls/DataFreshnessDots";
import ReachPillar from "../components/puls/ReachPillar";
import EngagementPillar from "../components/puls/EngagementPillar";
import ConversionsPillar from "../components/puls/ConversionsPillar";
import TrendChart from "../components/puls/TrendChart";
import ChannelBreakdownTable from "../components/puls/ChannelBreakdownTable";

const DEFAULT_FILTERS = {
  datePreset: "QTD",
  customStart: null,
  customEnd: null,
  region: "all",
  channel: "all",
};

function getDateRange(preset, customStart, customEnd) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  switch (preset) {
    case "7d": return { start: subDays(today, 6), end: today };
    case "30d": return { start: subDays(today, 29), end: today };
    case "QTD": return { start: startOfQuarter(today), end: today };
    case "YTD": return { start: new Date(today.getFullYear(), 0, 1), end: today };
    case "custom":
      return {
        start: customStart ? new Date(customStart) : subDays(today, 29),
        end: customEnd ? new Date(customEnd) : today,
      };
    default: return { start: startOfQuarter(today), end: today };
  }
}

function getPrevRange(start, end) {
  const diff = end - start;
  const prevEnd = new Date(start.getTime() - 86400000);
  const prevStart = new Date(prevEnd.getTime() - diff);
  return { start: prevStart, end: prevEnd };
}

function inRange(dateStr, start, end) {
  const d = new Date(dateStr);
  return d >= start && d <= end;
}

function sum(rows, field) {
  return rows.reduce((s, r) => s + (r[field] || 0), 0);
}

export default function PalsgaardPulsOverview() {
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [metrics, setMetrics] = useState([]);
  const [keyEvents, setKeyEvents] = useState([]);
  const [leads, setLeads] = useState([]);
  const [webinars, setWebinars] = useState([]);
  const [gscData, setGscData] = useState([]);
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [syncMsg, setSyncMsg] = useState(null);
  const [syncRange, setSyncRange] = useState("7d");

  useEffect(() => {
    Promise.all([
      base44.entities.ChannelMetricDaily.list("-date", 5000),
      base44.entities.KeyEventDaily.list("-date", 5000),
      base44.entities.Lead.list("-created_date", 1000),
      base44.entities.Webinar.list("-date", 500),
      base44.entities.SearchConsoleMetric.list("-date", 5000),
      base44.entities.Campaign.list(),
    ]).then(([m, ke, l, w, gsc, c]) => {
      setMetrics(m);
      setKeyEvents(ke);
      setLeads(l);
      setWebinars(w);
      setGscData(gsc);
      setCampaigns(c);
    }).finally(() => setLoading(false));
  }, []);

  const { start, end } = useMemo(() => getDateRange(filters.datePreset, filters.customStart, filters.customEnd), [filters]);
  const { start: ps, end: pe } = useMemo(() => getPrevRange(start, end), [start, end]);

  const filteredMetrics = useMemo(() => metrics.filter(r => {
    if (filters.region !== "all") {
      const camp = campaigns.find(c => c.campaign_id === r.campaign_id);
      if (camp && camp.region !== filters.region) return false;
    }
    if (filters.channel !== "all" && r.channel !== filters.channel) return false;
    return true;
  }), [metrics, filters, campaigns]);

  const cur = useMemo(() => filteredMetrics.filter(r => inRange(r.date, start, end)), [filteredMetrics, start, end]);
  const prev = useMemo(() => filteredMetrics.filter(r => inRange(r.date, ps, pe)), [filteredMetrics, ps, pe]);

  const curKE = useMemo(() => keyEvents.filter(r => inRange(r.date, start, end) &&
    (filters.channel === "all" || r.channel === filters.channel)), [keyEvents, filters, start, end]);
  const prevKE = useMemo(() => keyEvents.filter(r => inRange(r.date, ps, pe) &&
    (filters.channel === "all" || r.channel === filters.channel)), [keyEvents, filters, ps, pe]);

  const gscStartStr = format(start, "yyyy-MM-dd");
  const gscEndStr = format(end, "yyyy-MM-dd");
  const gscPrevStartStr = format(ps, "yyyy-MM-dd");
  const gscPrevEndStr = format(pe, "yyyy-MM-dd");

  const gscCur = useMemo(() => gscData.filter(r => r.date >= gscStartStr && r.date <= gscEndStr), [gscData, gscStartStr, gscEndStr]);
  const gscPrev = useMemo(() => gscData.filter(r => r.date >= gscPrevStartStr && r.date <= gscPrevEndStr), [gscData, gscPrevStartStr, gscPrevEndStr]);

  const BRANDED_REGEX = /\b(palsg[aå]ard|paalsg[aå]?rd|pallsgaard|plasgaard|palgard)\b/i;
  const brandedCur = useMemo(() => gscCur.filter(r => BRANDED_REGEX.test(r.query || "")), [gscCur]);
  const brandedPrev = useMemo(() => gscPrev.filter(r => BRANDED_REGEX.test(r.query || "")), [gscPrev]);

  const reachData = useMemo(() => ({
    impressions: sum(cur, "impressions"),
    pImpressions: sum(prev, "impressions"),
    reach: sum(cur, "reach"),
    pReach: sum(prev, "reach"),
    sessions: sum(cur, "sessions"),
    pSessions: sum(prev, "sessions"),
    brandedClicks: sum(brandedCur, "clicks"),
    pBrandedClicks: sum(brandedPrev, "clicks"),
    brandedImpressions: sum(brandedCur, "impressions"),
    pBrandedImpressions: sum(brandedPrev, "impressions"),
  }), [cur, prev, brandedCur, brandedPrev]);

  const engData = useMemo(() => {
    const totalEng = sum(cur, "engagements");
    const totalImp = sum(cur, "impressions");
    const pTotalEng = sum(prev, "engagements");
    const pTotalImp = sum(prev, "impressions");
    const emailCur = cur.filter(r => r.channel === "Email Campaigns");
    const emailPrev = prev.filter(r => r.channel === "Email Campaigns");
    const emailSends = sum(emailCur, "sends");
    const emailOpens = sum(emailCur, "opens");
    const emailClicks = sum(emailCur, "clicks");
    const pEmailSends = sum(emailPrev, "sends");
    const pEmailOpens = sum(emailPrev, "opens");
    const pEmailClicks = sum(emailPrev, "clicks");
    const sessions = sum(cur, "sessions");
    const engSessions = sum(cur, "engaged_sessions");
    const pSessions = sum(prev, "sessions");
    const pEngSessions = sum(prev, "engaged_sessions");
    return {
      someEngRate: totalImp > 0 ? totalEng / totalImp : null,
      pSomeEngRate: pTotalImp > 0 ? pTotalEng / pTotalImp : null,
      emailOpenRate: emailSends > 0 ? emailOpens / emailSends : null,
      pEmailOpenRate: pEmailSends > 0 ? pEmailOpens / pEmailSends : null,
      emailClickRate: emailSends > 0 ? emailClicks / emailSends : null,
      pEmailClickRate: pEmailSends > 0 ? pEmailClicks / pEmailSends : null,
      engSessionRate: sessions > 0 ? engSessions / sessions : null,
      pEngSessionRate: pSessions > 0 ? pEngSessions / pSessions : null,
    };
  }, [cur, prev]);

  const convData = useMemo(() => {
    const webinarsCur = webinars.filter(w => inRange(w.date, start, end));
    const webinarsPrev = webinars.filter(w => inRange(w.date, ps, pe));
    const downloads = curKE.filter(e => e.key_event_name === "file_download" || e.key_event_name === "ipaper_download")
      .reduce((s, e) => s + (e.key_event_count || 0), 0);
    const pDownloads = prevKE.filter(e => e.key_event_name === "file_download" || e.key_event_name === "ipaper_download")
      .reduce((s, e) => s + (e.key_event_count || 0), 0);
    const contactForms = curKE.filter(e => e.key_event_name === "contact_form")
      .reduce((s, e) => s + (e.key_event_count || 0), 0);
    const pContactForms = prevKE.filter(e => e.key_event_name === "contact_form")
      .reduce((s, e) => s + (e.key_event_count || 0), 0);
    const mqls = leads.filter(l => l.lead_grade === "A" || l.lead_grade === "B");
    const sqls = leads.filter(l => l.lead_grade === "A");
    return {
      webinarSignups: webinarsCur.length,
      pWebinarSignups: webinarsPrev.length,
      downloads, pDownloads,
      contactForms, pContactForms,
      totalLeads: leads.length,
      mqls: mqls.length,
      sqls: sqls.length,
      mqlToSql: mqls.length > 0 ? sqls.length / mqls.length : null,
    };
  }, [webinars, curKE, prevKE, leads, start, end, ps, pe]);

  const trendData = useMemo(() => {
    const days = [];
    const d = new Date(start);
    while (d <= end) {
      const ds = format(d, "yyyy-MM-dd");
      const dayM = cur.filter(r => r.date === ds);
      const dayKE = curKE.filter(r => r.date === ds);
      days.push({
        date: format(d, "dd MMM"),
        impressions: sum(dayM, "impressions"),
        sessions: sum(dayM, "sessions"),
        engagements: sum(dayM, "engagements"),
        conversions: dayKE.filter(e => e.key_event_name === "generate_lead" || e.key_event_name === "contact_form")
          .reduce((s, e) => s + (e.key_event_count || 0), 0),
      });
      d.setDate(d.getDate() + 1);
    }
    return days;
  }, [cur, curKE, start, end]);

  const getSyncDates = (range) => {
    const end = subDays(new Date(), 1);
    const endStr = format(end, "yyyy-MM-dd");
    const start = new Date(end);
    if (range === "7d") start.setDate(start.getDate() - 6);
    else if (range === "30d") start.setDate(start.getDate() - 29);
    else if (range === "90d") start.setDate(start.getDate() - 89);
    return { startDate: format(start, "yyyy-MM-dd"), endDate: endStr };
  };

  const handleSync = async () => {
    setSyncing(true);
    setSyncMsg(null);
    const { startDate, endDate } = getSyncDates(syncRange);
    try {
      await Promise.allSettled([
        base44.functions.invoke("syncGa4Metrics", { startDate, endDate }),
        base44.functions.invoke("syncGscData", { startDate, endDate }),
      ]);
      const [m, ke, l, w, gsc, c] = await Promise.all([
        base44.entities.ChannelMetricDaily.list("-date", 5000),
        base44.entities.KeyEventDaily.list("-date", 5000),
        base44.entities.Lead.list("-created_date", 1000),
        base44.entities.Webinar.list("-date", 500),
        base44.entities.SearchConsoleMetric.list("-date", 5000),
        base44.entities.Campaign.list(),
      ]);
      setMetrics(m); setKeyEvents(ke); setLeads(l); setWebinars(w); setGscData(gsc); setCampaigns(c);
      setSyncMsg({ ok: true, text: "Synced successfully" });
    } catch (e) {
      setSyncMsg({ ok: false, text: "Sync failed: " + e.message });
    } finally {
      setSyncing(false);
    }
  };

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
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <h1 className="text-2xl font-bold text-white tracking-tight">Palsgaard Puls</h1>
              <p className="text-sm mt-0.5" style={{ color: "#a8c5d6" }}>Executive Overview · {format(start, "d MMM")} – {format(end, "d MMM yyyy")}</p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <DataFreshnessDots />
              {syncMsg && (
                <span className={`text-xs ${syncMsg.ok ? "text-green-300" : "text-red-300"}`}>{syncMsg.text}</span>
              )}
              <select
                value={syncRange}
                onChange={e => setSyncRange(e.target.value)}
                disabled={syncing}
                className="text-xs border border-white/20 rounded-lg px-2 py-1.5 text-white bg-white/10 focus:outline-none disabled:opacity-50"
              >
                <option value="7d">Last 7 days</option>
                <option value="30d">Last 30 days</option>
                <option value="90d">Last 90 days</option>
              </select>
              <button
                onClick={handleSync}
                disabled={syncing}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg text-white border border-white/20 bg-white/10 hover:bg-white/20 disabled:opacity-50 transition-colors"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${syncing ? "animate-spin" : ""}`} />
                {syncing ? "Syncing…" : "Sync"}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="border-b border-gray-200 bg-white shadow-sm">
        <div className="max-w-screen-2xl mx-auto">
          <PulseFilters filters={filters} onChange={setFilters} campaigns={campaigns} />
        </div>
      </div>

      <div className="max-w-screen-2xl mx-auto px-6 py-6 space-y-8">
        {/* Three pillars */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <ReachPillar data={reachData} />
          <EngagementPillar data={engData} />
          <ConversionsPillar data={convData} />
        </div>

        {/* Trend chart */}
        <TrendChart data={trendData} />

        {/* Channel breakdown */}
        <ChannelBreakdownTable metrics={cur} keyEvents={curKE} />
      </div>
    </div>
  );
}