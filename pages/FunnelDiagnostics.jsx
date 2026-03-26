import { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import GlobalFilters from "../components/dashboard/GlobalFilters";
import REANStageCard from "../components/funnel/REANStageCard";
import StageDetailPanel from "../components/funnel/StageDetailPanel";
import {
  getDateRange, getPreviousPeriod, inDateRange, getQualifiedLeads,
  calcCTR, calcEngagementRate, deltaLabel, formatNum, formatPct, CHANNEL_COLORS
} from "../components/utils/measures";
import { Loader2 } from "lucide-react";

const DEFAULT_FILTERS = { datePreset: "30d", region: "all", channel: "all", campaign_id: "all" };

function applyFilters(data, filters) {
  return data.filter((r) => {
    if (filters.channel !== "all" && r.channel !== filters.channel) return false;
    if (filters.campaign_id !== "all" && r.campaign_id !== filters.campaign_id) return false;
    if (filters.region !== "all" && r.region !== filters.region) return false;
    return true;
  });
}

export default function FunnelDiagnostics() {
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [metrics, setMetrics] = useState([]);
  const [leads, setLeads] = useState([]);
  const [campaigns, setCampaigns] = useState([]);
  const [selectedStage, setSelectedStage] = useState(null);
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

  const fm = useMemo(() => applyFilters(metrics, filters), [metrics, filters]);
  const fl = useMemo(() => applyFilters(leads, filters), [leads, filters]);

  const curr = useMemo(() => {
    const m = fm.filter((r) => inDateRange(r.date, start, end));
    const l = fl.filter((r) => inDateRange(r.created_date, start, end));
    const impressions = m.reduce((s, r) => s + (r.impressions || 0), 0);
    const clicks = m.reduce((s, r) => s + (r.clicks || 0), 0);
    const engagements = m.reduce((s, r) => s + (r.engagements || 0), 0);
    return {
      impressions, clicks, engagements,
      ctr: calcCTR(clicks, impressions),
      engRate: calcEngagementRate(engagements, impressions),
      leads: l.length,
      qualified: getQualifiedLeads(l).length,
      gradeA: l.filter((x) => x.lead_grade === "A").length,
      gradeB: l.filter((x) => x.lead_grade === "B").length,
      gradeC: l.filter((x) => x.lead_grade === "C").length,
    };
  }, [fm, fl, start, end]);

  const prev = useMemo(() => {
    const m = fm.filter((r) => inDateRange(r.date, ps, pe));
    const l = fl.filter((r) => inDateRange(r.created_date, ps, pe));
    const impressions = m.reduce((s, r) => s + (r.impressions || 0), 0);
    const clicks = m.reduce((s, r) => s + (r.clicks || 0), 0);
    const engagements = m.reduce((s, r) => s + (r.engagements || 0), 0);
    return {
      impressions, clicks, engagements,
      leads: l.length,
      qualified: getQualifiedLeads(l).length,
    };
  }, [fm, fl, ps, pe]);

  // Channel-level breakdown for detail panel
  const channelBreakdown = useMemo(() => {
    const ch = {};
    const m = fm.filter((r) => inDateRange(r.date, start, end));
    const l = fl.filter((r) => inDateRange(r.created_date, start, end));
    m.forEach((r) => {
      if (!ch[r.channel]) ch[r.channel] = { channel: r.channel, impressions: 0, clicks: 0, engagements: 0, leads: 0, qualified: 0 };
      ch[r.channel].impressions += r.impressions || 0;
      ch[r.channel].clicks += r.clicks || 0;
      ch[r.channel].engagements += r.engagements || 0;
    });
    l.forEach((r) => {
      if (!ch[r.channel]) ch[r.channel] = { channel: r.channel, impressions: 0, clicks: 0, engagements: 0, leads: 0, qualified: 0 };
      ch[r.channel].leads++;
      if (r.lead_grade === "A" || r.lead_grade === "B") ch[r.channel].qualified++;
    });
    return Object.values(ch).sort((a, b) => b.impressions - a.impressions);
  }, [fm, fl, start, end]);

  // Campaign-level breakdown for detail panel
  const campaignBreakdown = useMemo(() => {
    const cp = {};
    const m = fm.filter((r) => inDateRange(r.date, start, end));
    const l = fl.filter((r) => inDateRange(r.created_date, start, end));
    m.forEach((r) => {
      const name = campaigns.find((c) => c.campaign_id === r.campaign_id)?.name || r.campaign_id || "Unknown";
      if (!cp[name]) cp[name] = { name, impressions: 0, clicks: 0, engagements: 0, leads: 0, qualified: 0 };
      cp[name].impressions += r.impressions || 0;
      cp[name].clicks += r.clicks || 0;
      cp[name].engagements += r.engagements || 0;
    });
    l.forEach((r) => {
      const name = campaigns.find((c) => c.campaign_id === r.campaign_id)?.name || r.campaign_id || "Unknown";
      if (!cp[name]) cp[name] = { name, impressions: 0, clicks: 0, engagements: 0, leads: 0, qualified: 0 };
      cp[name].leads++;
      if (r.lead_grade === "A" || r.lead_grade === "B") cp[name].qualified++;
    });
    return Object.values(cp).sort((a, b) => b.impressions - a.impressions);
  }, [fm, fl, campaigns, start, end]);

  const topByChannel = (metric) =>
    channelBreakdown.sort((a, b) => (b[metric] || 0) - (a[metric] || 0))
      .slice(0, 3)
      .map((c) => ({ label: c.channel, value: formatNum(c[metric]) }));

  if (loading) return (
    <div className="flex items-center justify-center h-96">
      <Loader2 className="w-8 h-8 animate-spin text-[#004B87]" />
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <GlobalFilters filters={filters} onChange={setFilters} campaigns={campaigns} />

      <div className="p-6 max-w-3xl mx-auto space-y-4">
        <div className="mb-6">
          <h1 className="text-xl font-bold text-gray-900">REAN Funnel Diagnostics</h1>
          <p className="text-sm text-gray-500 mt-1">Click a stage to view breakdown by channel and campaign</p>
        </div>

        {/* REAN stages as vertical stacked cards */}
        <REANStageCard
          stage="REACH"
          headline={formatNum(curr.impressions)}
          headlineLabel="Impressions"
          delta={deltaLabel(curr.impressions, prev.impressions)}
          supporting={[]}
          topDrivers={topByChannel("impressions")}
          isSelected={selectedStage === "REACH"}
          onClick={() => setSelectedStage(selectedStage === "REACH" ? null : "REACH")}
        />

        {/* Funnel connector */}
        <div className="flex justify-center"><div className="w-0.5 h-6 bg-gray-300" /></div>

        <REANStageCard
          stage="ENGAGE"
          headline={formatNum(curr.clicks)}
          headlineLabel="Clicks"
          delta={deltaLabel(curr.clicks, prev.clicks)}
          supporting={[
            { label: "CTR", value: formatPct(curr.ctr) },
            { label: "Engagements", value: formatNum(curr.engagements) },
            { label: "Eng. Rate", value: formatPct(curr.engRate) },
          ]}
          topDrivers={topByChannel("clicks")}
          isSelected={selectedStage === "ENGAGE"}
          onClick={() => setSelectedStage(selectedStage === "ENGAGE" ? null : "ENGAGE")}
        />

        <div className="flex justify-center"><div className="w-0.5 h-6 bg-gray-300" /></div>

        <REANStageCard
          stage="ACTIVATE"
          headline={formatNum(curr.leads)}
          headlineLabel="Total Leads"
          delta={deltaLabel(curr.leads, prev.leads)}
          supporting={[]}
          topDrivers={topByChannel("leads")}
          isSelected={selectedStage === "ACTIVATE"}
          onClick={() => setSelectedStage(selectedStage === "ACTIVATE" ? null : "ACTIVATE")}
        />

        <div className="flex justify-center"><div className="w-0.5 h-6 bg-gray-300" /></div>

        <REANStageCard
          stage="NURTURE"
          headline={formatNum(curr.qualified)}
          headlineLabel="Qualified Leads (A+B)"
          delta={deltaLabel(curr.qualified, prev.qualified)}
          supporting={[
            { label: "Grade A", value: formatNum(curr.gradeA) },
            { label: "Grade B", value: formatNum(curr.gradeB) },
            { label: "Grade C", value: formatNum(curr.gradeC) },
          ]}
          topDrivers={topByChannel("qualified")}
          isSelected={selectedStage === "NURTURE"}
          onClick={() => setSelectedStage(selectedStage === "NURTURE" ? null : "NURTURE")}
        />
      </div>

      {/* Slide-in detail panel */}
      {selectedStage && (
        <>
          <div className="fixed inset-0 bg-black/20 z-30" onClick={() => setSelectedStage(null)} />
          <StageDetailPanel
            stage={selectedStage}
            channelData={channelBreakdown}
            topCampaigns={campaignBreakdown}
            onClose={() => setSelectedStage(null)}
          />
        </>
      )}
    </div>
  );
}