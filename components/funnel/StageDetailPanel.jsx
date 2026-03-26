import { X, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell
} from "recharts";
import { CHANNEL_COLORS, formatNum, formatPct } from "../utils/measures";
import { createPageUrl } from "@/utils";

const STAGE_KEYS = {
  REACH: { metric: "impressions", label: "Impressions" },
  ENGAGE: { metric: "clicks", label: "Clicks" },
  ACTIVATE: { metric: "leads", label: "Total Leads" },
  NURTURE: { metric: "qualified", label: "Qualified Leads" },
};

export default function StageDetailPanel({ stage, channelData, topCampaigns, onClose }) {
  if (!stage) return null;
  const cfg = STAGE_KEYS[stage] || STAGE_KEYS.REACH;

  const driversUrl = createPageUrl(`PerformanceDrivers?stage=${stage}`);

  return (
    <div className="fixed right-0 top-0 h-full w-full max-w-lg bg-white shadow-2xl z-40 flex flex-col border-l border-gray-200">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
        <h2 className="font-bold text-gray-800">{stage} — Breakdown</h2>
        <Button variant="ghost" size="icon" onClick={onClose}><X className="w-4 h-4" /></Button>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* By Channel bar chart */}
        <div>
          <h3 className="text-sm font-semibold text-gray-700 mb-3">{cfg.label} by Channel</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={channelData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 11 }} />
              <YAxis type="category" dataKey="channel" tick={{ fontSize: 11 }} width={120} />
              <Tooltip formatter={(v) => formatNum(v)} />
              <Bar dataKey={cfg.metric} radius={[0, 4, 4, 0]}>
                {channelData.map((d) => (
                  <Cell key={d.channel} fill={CHANNEL_COLORS[d.channel] || "#6b7280"} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Top 10 Campaigns */}
        <div>
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Top Campaigns</h3>
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left py-2 text-gray-500">Campaign</th>
                <th className="text-right py-2 text-gray-500">{cfg.label}</th>
              </tr>
            </thead>
            <tbody>
              {topCampaigns.slice(0, 10).map((c, i) => (
                <tr key={i} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="py-2 text-gray-700">{c.name}</td>
                  <td className="py-2 text-right font-medium">{formatNum(c[cfg.metric])}</td>
                </tr>
              ))}
              {topCampaigns.length === 0 && (
                <tr><td colSpan={2} className="py-4 text-center text-gray-400">No data</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* CTA */}
      <div className="px-6 py-4 border-t border-gray-200">
        <a href={driversUrl}>
          <Button className="w-full bg-[#004B87] hover:bg-[#003a6b]">
            <ExternalLink className="w-4 h-4 mr-2" /> Open Full Drivers Table
          </Button>
        </a>
      </div>
    </div>
  );
}