import { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { Loader2, Search, ChevronDown, ChevronUp } from "lucide-react";
import KPICard from "./KPICard";
import { formatNum, formatPct, deltaLabel } from "../utils/measures";

const BRANDED_REGEX = /\b(palsg[aå]ard|paalsg[aå]?rd|pallsgaard|plasgaard|palgard)\b/i;

function isBranded(query) {
  return BRANDED_REGEX.test(query || "");
}

function fmtPos(val) {
  if (val === null || val === undefined) return "—";
  return val.toFixed(1);
}

export default function BrandedSearch({ start, end, prevStart, prevEnd }) {
  const [allData, setAllData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tableOpen, setTableOpen] = useState(false);

  const startStr = start ? start.toISOString().slice(0, 10) : null;
  const endStr = end ? end.toISOString().slice(0, 10) : null;
  const prevStartStr = prevStart ? prevStart.toISOString().slice(0, 10) : null;
  const prevEndStr = prevEnd ? prevEnd.toISOString().slice(0, 10) : null;

  useEffect(() => {
    setLoading(true);
    base44.entities.SearchConsoleMetric.list("-date", 5000)
      .then(setAllData)
      .finally(() => setLoading(false));
  }, []);

  const { cur, prev } = useMemo(() => {
    if (!startStr || !endStr) return { cur: [], prev: [] };
    const cur = allData.filter((r) => r.date >= startStr && r.date <= endStr);
    const prev = prevStartStr && prevEndStr
      ? allData.filter((r) => r.date >= prevStartStr && r.date <= prevEndStr)
      : [];
    return { cur, prev };
  }, [allData, startStr, endStr, prevStartStr, prevEndStr]);

  const kpi = useMemo(() => {
    const branded = cur.filter((r) => isBranded(r.query));
    const prevBranded = prev.filter((r) => isBranded(r.query));

    const totalClicks = cur.reduce((s, r) => s + (r.clicks || 0), 0);
    const totalImpressions = cur.reduce((s, r) => s + (r.impressions || 0), 0);

    const bClicks = branded.reduce((s, r) => s + (r.clicks || 0), 0);
    const bImpressions = branded.reduce((s, r) => s + (r.impressions || 0), 0);
    const bCTR = bImpressions > 0 ? bClicks / bImpressions : null;

    // Impression-weighted avg position
    const bTotalImpForPos = branded.reduce((s, r) => s + (r.impressions || 0), 0);
    const bAvgPos = bTotalImpForPos > 0
      ? branded.reduce((s, r) => s + (r.position || 0) * (r.impressions || 0), 0) / bTotalImpForPos
      : null;

    const shareClicks = totalClicks > 0 ? bClicks / totalClicks : null;
    const shareImpressions = totalImpressions > 0 ? bImpressions / totalImpressions : null;

    // Prev period
    const pbClicks = prevBranded.reduce((s, r) => s + (r.clicks || 0), 0);
    const pbImpressions = prevBranded.reduce((s, r) => s + (r.impressions || 0), 0);
    const pbCTR = pbImpressions > 0 ? pbClicks / pbImpressions : null;
    const prevTotalClicks = prev.reduce((s, r) => s + (r.clicks || 0), 0);
    const pbShareClicks = prevTotalClicks > 0 ? pbClicks / prevTotalClicks : null;

    return {
      bClicks, pbClicks,
      bImpressions, pbImpressions,
      bCTR, pbCTR,
      bAvgPos,
      shareClicks, pbShareClicks,
      shareImpressions,
    };
  }, [cur, prev]);

  const topBrandedQueries = useMemo(() => {
    const branded = cur.filter((r) => isBranded(r.query));
    // Aggregate by query
    const byQuery = {};
    branded.forEach((r) => {
      const q = r.query;
      if (!byQuery[q]) byQuery[q] = { query: q, clicks: 0, impressions: 0, ctrSum: 0, posWSum: 0, impSum: 0 };
      byQuery[q].clicks += r.clicks || 0;
      byQuery[q].impressions += r.impressions || 0;
      byQuery[q].posWSum += (r.position || 0) * (r.impressions || 0);
      byQuery[q].impSum += r.impressions || 0;
    });
    return Object.values(byQuery)
      .map((q) => ({
        ...q,
        ctr: q.impressions > 0 ? q.clicks / q.impressions : 0,
        avgPosition: q.impSum > 0 ? q.posWSum / q.impSum : null,
      }))
      .sort((a, b) => b.clicks - a.clicks)
      .slice(0, 20);
  }, [cur]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-24">
        <Loader2 className="w-5 h-5 animate-spin text-[#004B87]" />
      </div>
    );
  }

  if (allData.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-5 text-center text-sm text-gray-400">
        No Google Search Console data available. Run a sync first.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* KPI Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <KPICard
          title="Branded Clicks"
          value={formatNum(kpi.bClicks)}
          delta={deltaLabel(kpi.bClicks, kpi.pbClicks)}
          accent="#004B87"
          subtitle="GSC branded queries"
        />
        <KPICard
          title="Branded Impressions"
          value={formatNum(kpi.bImpressions)}
          delta={deltaLabel(kpi.bImpressions, kpi.pbImpressions)}
          accent="#2563eb"
        />
        <KPICard
          title="Branded CTR"
          value={kpi.bCTR !== null ? formatPct(kpi.bCTR) : "N/A"}
          delta={deltaLabel(kpi.bCTR, kpi.pbCTR)}
          accent="#0ea5e9"
          subtitle="clicks / impressions"
        />
        <KPICard
          title="Brand Share of Clicks"
          value={kpi.shareClicks !== null ? formatPct(kpi.shareClicks) : "N/A"}
          delta={deltaLabel(kpi.shareClicks, kpi.pbShareClicks)}
          accent="#9333ea"
          subtitle="branded / total site clicks"
        />
      </div>

      {/* Top Branded Queries Table */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <button
          className="flex items-center gap-2 w-full text-left mb-3"
          onClick={() => setTableOpen((v) => !v)}
        >
          <Search className="w-4 h-4 text-gray-400" />
          <h3 className="text-sm font-semibold text-gray-700">Top Branded Queries</h3>
          <span className="text-xs text-gray-400 ml-1">(top 20 by clicks)</span>
          <span className="ml-auto">{tableOpen ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}</span>
        </button>
        {tableOpen && topBrandedQueries.length === 0 && (
          <p className="text-sm text-gray-400 text-center py-6">No branded queries found in selected period.</p>
        )}
        {tableOpen && topBrandedQueries.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left py-2 px-3 text-xs font-medium text-gray-500">Query</th>
                  <th className="text-right py-2 px-3 text-xs font-medium text-gray-500">Clicks</th>
                  <th className="text-right py-2 px-3 text-xs font-medium text-gray-500">Impressions</th>
                  <th className="text-right py-2 px-3 text-xs font-medium text-gray-500">CTR</th>
                  <th className="text-right py-2 px-3 text-xs font-medium text-gray-500">Avg Position</th>
                </tr>
              </thead>
              <tbody>
                {topBrandedQueries.map((row) => (
                  <tr key={row.query} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="py-2 px-3 text-gray-800 font-medium">{row.query}</td>
                    <td className="py-2 px-3 text-right">{formatNum(row.clicks)}</td>
                    <td className="py-2 px-3 text-right">{formatNum(row.impressions)}</td>
                    <td className="py-2 px-3 text-right text-blue-600">{formatPct(row.ctr)}</td>
                    <td className="py-2 px-3 text-right text-gray-600">{fmtPos(row.avgPosition)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}