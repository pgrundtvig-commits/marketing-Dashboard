import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import GlobalFilters from "@/components/dashboard/GlobalFilters";
import KpiCard from "@/components/dashboard/KpiCard";
import DataFreshnessBar from "@/components/dashboard/DataFreshnessBar";
import {
  formatDKK, formatNum, formatPct, calcCTR, calcEngRate, calcCPL, calcCPQL,
  isQualified, getDateRange, getPreviousPeriod, deltaLabel, GRADE_COLORS,
  applyFilters, aggregateMetrics
} from "@/components/measures";
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer
} from "recharts";
import { createPageUrl } from "@/utils";

const defaultFilters = () => {
  const { start, end } = getDateRange("30d");
  return { preset: "30d", dateStart: start, dateEnd: end, region: "all", channel: "all", campaign: "all", event: "all", webinar: "all" };
};

export default function Overview() {
  const [filters, setFilters] = useState(defaultFilters());
  const [metrics, setMetrics] = useState([]);
  const [leads, setLeads] = useState([]);
  const [budgets, setBudgets] = useState([]);
  const [campaigns, setCampaigns] = useState([]);
  const [events, setEvents] = useState([]);
  const [webinars, setWebinars] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      base44.entities.ChannelMetricDaily.list(),
      base44.entities.Lead.list(),
      base44.entities.BudgetLine.list(),
      base44.entities.Campaign.list(),
      base44.entities.Event.list(),
      base44.entities.Webinar.list(),
    ]).then(([m, l, b, c, ev, wb]) => {
      setMetrics(m); setLeads(l); setBudgets(b);
      setCampaigns(c); setEvents(ev); setWebinars(wb);
      setLoading(false);
    });
  }, []);

  const filteredMetrics = applyFilters(metrics, filters, "date");
  const filteredLeads = applyFilters(leads, { ...filters, region: "all" }, "created_date").filter(l => {
    if (filters.region !== "all" && l.region !== filters.region) return false;
    if (filters.channel !== "all" && l.channel !== filters.channel) return false;
    if (filters.campaign !== "all" && l.campaign_id !== filters.campaign) return false;
    return true;
  });

  const agg = aggregateMetrics(filteredMetrics);
  const totalLeads = filteredLeads.length;
  const qualLeads = filteredLeads.filter(l => isQualified(l.lead_grade)).length;
  const spend = agg.spend_dkk;
  const ctr = calcCTR(agg.clicks, agg.impressions);
  const engRate = calcEngRate(agg.engagements, agg.impressions);
  const cpl = calcCPL(spend, totalLeads);
  const cpql = calcCPQL(spend, qualLeads);

  // Previous period for deltas
  const prev = filters.dateStart && filters.dateEnd ? getPreviousPeriod(filters.dateStart, filters.dateEnd) : null;
  const prevMetrics = prev ? applyFilters(metrics, { ...filters, dateStart: prev.start, dateEnd: prev.end }, "date") : [];
  const prevLeads = prev ? applyFilters(leads, { ...filters, dateStart: prev.start, dateEnd: prev.end }, "created_date") : [];
  const prevAgg = aggregateMetrics(prevMetrics);
  const prevTotal = prevLeads.length;
  const prevQual = prevLeads.filter(l => isQualified(l.lead_grade)).length;

  // Time series data (weekly buckets)
  const timeSeriesMap = {};
  filteredMetrics.forEach(m => {
    const week = m.date ? m.date.slice(0,7) : "Unknown";
    if (!timeSeriesMap[week]) timeSeriesMap[week] = { period: week, spend: 0 };
    timeSeriesMap[week].spend += m.spend_dkk || 0;
  });
  filteredLeads.forEach(l => {
    const week = (l.created_date || "").slice(0,7) || "Unknown";
    if (!timeSeriesMap[week]) timeSeriesMap[week] = { period: week, spend: 0 };
    timeSeriesMap[week].totalLeads = (timeSeriesMap[week].totalLeads || 0) + 1;
    if (isQualified(l.lead_grade)) timeSeriesMap[week].qualLeads = (timeSeriesMap[week].qualLeads || 0) + 1;
  });
  const timeSeries = Object.values(timeSeriesMap).sort((a,b) => a.period.localeCompare(b.period));

  // Quality mix stacked bar (by month)
  const qualMixMap = {};
  filteredLeads.forEach(l => {
    const month = (l.created_date || "").slice(0,7) || "Unknown";
    if (!qualMixMap[month]) qualMixMap[month] = { period: month, A: 0, B: 0, C: 0, Unknown: 0 };
    qualMixMap[month][l.lead_grade] = (qualMixMap[month][l.lead_grade] || 0) + 1;
  });
  const qualMix = Object.values(qualMixMap).sort((a,b) => a.period.localeCompare(b.period));

  // Leads by Channel
  const channelLeadMap = {};
  filteredLeads.forEach(l => {
    const ch = l.channel || "Other";
    if (!channelLeadMap[ch]) channelLeadMap[ch] = { channel: ch, leads: 0, spend: 0 };
    channelLeadMap[ch].leads++;
  });
  filteredMetrics.forEach(m => {
    const ch = m.channel || "Other";
    if (channelLeadMap[ch]) channelLeadMap[ch].spend += m.spend_dkk || 0;
  });
  const channelData = Object.values(channelLeadMap).map(c => ({
    ...c,
    cpql: calcCPQL(c.spend, channelLeadMap[c.channel]?.leads) || 0
  })).sort((a,b) => b.leads - a.leads);

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-700" />
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <GlobalFilters filters={filters} onChange={setFilters} campaigns={campaigns} events={events} webinars={webinars} />
      <DataFreshnessBar metrics={metrics} leads={leads} />

      <div className="p-6 space-y-6">
        {/* KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <KpiCard title="Spend" value={formatDKK(spend)} delta={deltaLabel(spend, prevAgg.spend_dkk)} deltaPositiveIsGood={false} color="rose" />
          <KpiCard title="Total Leads" value={formatNum(totalLeads)} delta={deltaLabel(totalLeads, prevTotal)} color="green"
            onClick={() => window.location.href = createPageUrl("PerformanceDrivers")} />
          <KpiCard title="Qualified Leads (A+B)" value={formatNum(qualLeads)} subtitle={`${totalLeads > 0 ? ((qualLeads/totalLeads)*100).toFixed(0) : 0}% of total`}
            delta={deltaLabel(qualLeads, prevQual)} color="green" />
          <KpiCard title="CPL" value={formatDKK(cpl)} delta={deltaLabel(cpl, calcCPL(prevAgg.spend_dkk, prevTotal))} deltaPositiveIsGood={false} color="amber" />
          <KpiCard title="CPQL" value={formatDKK(cpql)} delta={deltaLabel(cpql, calcCPQL(prevAgg.spend_dkk, prevQual))} deltaPositiveIsGood={false} color="amber" />
          <KpiCard title="Impressions" value={formatNum(agg.impressions)} delta={deltaLabel(agg.impressions, prevAgg.impressions)} color="blue" />
          <KpiCard title="Clicks" value={formatNum(agg.clicks)} subtitle={`CTR: ${formatPct(ctr)}`}
            delta={deltaLabel(agg.clicks, prevAgg.clicks)} color="blue" />
          <KpiCard title="Engagement Rate" value={formatPct(engRate)} delta={deltaLabel(engRate, calcEngRate(prevAgg.engagements, prevAgg.impressions))} color="purple" />
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-xl border p-5">
            <h3 className="font-semibold text-gray-800 mb-4">Spend vs Leads Over Time</h3>
            {timeSeries.length > 0 ? (
              <ResponsiveContainer width="100%" height={240}>
                <LineChart data={timeSeries}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="period" tick={{ fontSize: 11 }} />
                  <YAxis yAxisId="left" tick={{ fontSize: 11 }} />
                  <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Legend />
                  <Line yAxisId="left" type="monotone" dataKey="spend" name="Spend (DKK)" stroke="#ef4444" strokeWidth={2} dot={false} />
                  <Line yAxisId="right" type="monotone" dataKey="totalLeads" name="Total Leads" stroke="#16a34a" strokeWidth={2} dot={false} />
                  <Line yAxisId="right" type="monotone" dataKey="qualLeads" name="Qualified Leads" stroke="#86efac" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            ) : <p className="text-sm text-gray-400 text-center py-12">No data for selected period</p>}
          </div>

          <div className="bg-white rounded-xl border p-5">
            <h3 className="font-semibold text-gray-800 mb-4">Lead Quality Mix Over Time</h3>
            {qualMix.length > 0 ? (
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={qualMix}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="period" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Legend />
                  {["A","B","C","Unknown"].map(g => (
                    <Bar key={g} dataKey={g} stackId="a" fill={GRADE_COLORS[g]} name={`Grade ${g}`} />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            ) : <p className="text-sm text-gray-400 text-center py-12">No lead data for selected period</p>}
          </div>
        </div>

        {/* Leads by Channel */}
        <div className="bg-white rounded-xl border p-5">
          <h3 className="font-semibold text-gray-800 mb-4">Leads & CPQL by Channel</h3>
          {channelData.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-xs text-gray-500 uppercase tracking-wide">
                    <th className="text-left py-2 pr-4">Channel</th>
                    <th className="text-right py-2 pr-4">Leads</th>
                    <th className="text-right py-2 pr-4">Spend (DKK)</th>
                    <th className="text-right py-2">CPQL (DKK)</th>
                  </tr>
                </thead>
                <tbody>
                  {channelData.map(row => (
                    <tr key={row.channel} className="border-b hover:bg-gray-50">
                      <td className="py-2 pr-4 font-medium">{row.channel}</td>
                      <td className="py-2 pr-4 text-right text-green-700 font-semibold">{row.leads}</td>
                      <td className="py-2 pr-4 text-right">{formatDKK(row.spend)}</td>
                      <td className="py-2 text-right">{formatDKK(row.cpql)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : <p className="text-sm text-gray-400 text-center py-8">No channel data</p>}
        </div>
      </div>
    </div>
  );
}