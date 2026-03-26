import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";

function fmt(val) {
  if (val === null || val === undefined || val === 0) return "—";
  return new Intl.NumberFormat("da-DK").format(Math.round(val));
}
function fmtPct(val) {
  if (val === null || val === undefined) return "—";
  return (val * 100).toFixed(1) + "%";
}

const CHANNEL_COLORS = {
  "LinkedIn Paid": "#0077b5",
  "LinkedIn Organic": "#00a0dc",
  "Paid Search": "#ea4335",
  "Website": "#34a853",
  "Email Campaigns": "#fbbc04",
  "Webinars": "#9333ea",
  "Events": "#f97316",
  "Trade Media/PR": "#6b7280",
  "Partner/Distributor": "#0ea5e9",
  "Other": "#d1d5db",
};

export default function ChannelBreakdownTable({ metrics, keyEvents }) {
  const [open, setOpen] = useState(true);

  const byChannel = {};
  metrics.forEach(r => {
    if (!byChannel[r.channel]) byChannel[r.channel] = { impressions: 0, reach: 0, sessions: 0, engaged: 0, engagements: 0 };
    byChannel[r.channel].impressions += r.impressions || 0;
    byChannel[r.channel].reach += r.reach || 0;
    byChannel[r.channel].sessions += r.sessions || 0;
    byChannel[r.channel].engaged += r.engaged_sessions || 0;
    byChannel[r.channel].engagements += r.engagements || 0;
  });
  keyEvents.forEach(e => {
    if (!byChannel[e.channel]) byChannel[e.channel] = { impressions: 0, reach: 0, sessions: 0, engaged: 0, engagements: 0, conversions: 0 };
    byChannel[e.channel].conversions = (byChannel[e.channel].conversions || 0) + (e.key_event_count || 0);
  });

  const rows = Object.entries(byChannel).map(([channel, d]) => ({
    channel,
    ...d,
    engRate: d.impressions > 0 ? d.engagements / d.impressions : null,
    sessionEngRate: d.sessions > 0 ? d.engaged / d.sessions : null,
  })).sort((a, b) => b.impressions - a.impressions);

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
      <button
        className="w-full flex items-center justify-between px-6 py-4 text-left"
        onClick={() => setOpen(o => !o)}
      >
        <h3 className="text-sm font-semibold text-gray-700">Channel Breakdown</h3>
        {open ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronRight className="w-4 h-4 text-gray-400" />}
      </button>
      {open && (
        <div className="overflow-x-auto px-6 pb-6">
          {rows.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">No channel data for selected period</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left py-2 px-3 text-xs font-semibold text-gray-400 uppercase">Channel</th>
                  <th className="text-right py-2 px-3 text-xs font-semibold text-gray-400 uppercase">Impressions</th>
                  <th className="text-right py-2 px-3 text-xs font-semibold text-gray-400 uppercase">Reach</th>
                  <th className="text-right py-2 px-3 text-xs font-semibold text-gray-400 uppercase">Eng. Rate</th>
                  <th className="text-right py-2 px-3 text-xs font-semibold text-gray-400 uppercase">Sessions</th>
                  <th className="text-right py-2 px-3 text-xs font-semibold text-gray-400 uppercase">Sess. Eng. Rate</th>
                  <th className="text-right py-2 px-3 text-xs font-semibold text-gray-400 uppercase">Conversions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(row => (
                  <tr key={row.channel} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                    <td className="py-2.5 px-3 font-medium text-gray-800">
                      <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: CHANNEL_COLORS[row.channel] || "#ccc" }} />
                        {row.channel}
                      </div>
                    </td>
                    <td className="py-2.5 px-3 text-right text-gray-700">{fmt(row.impressions)}</td>
                    <td className="py-2.5 px-3 text-right text-gray-700">{fmt(row.reach)}</td>
                    <td className="py-2.5 px-3 text-right font-medium" style={{ color: "#4a7c6f" }}>{fmtPct(row.engRate)}</td>
                    <td className="py-2.5 px-3 text-right text-gray-700">{fmt(row.sessions)}</td>
                    <td className="py-2.5 px-3 text-right font-medium" style={{ color: "#4a7c6f" }}>{fmtPct(row.sessionEngRate)}</td>
                    <td className="py-2.5 px-3 text-right font-medium" style={{ color: "#7c4a2a" }}>{fmt(row.conversions)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}