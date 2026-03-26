import KPICard from "./KPICard";
import { formatNum, formatPct, deltaLabel } from "../utils/measures";

/**
 * Three high-level pillar cards: Brand Reach · Engagement · Conversions
 *
 * Brand Reach    = total branded impressions (GSC)
 * Engagement     = engaged sessions (GA4) + engagement rate
 * Conversions    = generate_lead + contact_form key events (GA4)
 */
export default function ToplineSummary({ kpi, gscKpi }) {
  return (
    <div className="mb-2">
      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
        Overall Performance
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Brand Reach */}
        <div className="bg-gradient-to-br from-[#004B87]/5 to-[#004B87]/10 rounded-xl border border-[#004B87]/20 p-5">
          <p className="text-xs font-semibold text-[#004B87] uppercase tracking-wide mb-3">Brand Reach</p>
          <div className="space-y-3">
            <div>
              <p className="text-2xl font-bold text-gray-900">
                {gscKpi?.bImpressions > 0 ? formatNum(gscKpi.bImpressions) : "N/A"}
              </p>
              <p className="text-xs text-gray-500 mt-0.5">Branded Impressions (GSC)</p>
            </div>
            <div className="flex gap-4 text-xs text-gray-600 border-t border-[#004B87]/10 pt-3">
              <span>
                <span className="font-medium text-gray-800">{gscKpi?.bClicks > 0 ? formatNum(gscKpi.bClicks) : "—"}</span>
                {" "}branded clicks
              </span>
              <span>
                <span className="font-medium text-gray-800">{gscKpi?.shareClicks != null ? formatPct(gscKpi.shareClicks) : "—"}</span>
                {" "}brand share
              </span>
            </div>
          </div>
        </div>

        {/* Engagement */}
        <div className="bg-gradient-to-br from-blue-50 to-blue-100/60 rounded-xl border border-blue-200 p-5">
          <p className="text-xs font-semibold text-blue-600 uppercase tracking-wide mb-3">Engagement</p>
          <div className="space-y-3">
            <div>
              <p className="text-2xl font-bold text-gray-900">
                {kpi?.sessions > 0 ? formatNum(kpi.sessions) : "N/A"}
              </p>
              <p className="text-xs text-gray-500 mt-0.5">Sessions (GA4)</p>
            </div>
            <div className="flex gap-4 text-xs text-gray-600 border-t border-blue-100 pt-3">
              <span>
                <span className="font-medium text-gray-800">{kpi?.engaged > 0 ? formatNum(kpi.engaged) : "—"}</span>
                {" "}engaged
              </span>
              <span>
                <span className="font-medium text-gray-800">{kpi?.engRate != null ? formatPct(kpi.engRate) : "—"}</span>
                {" "}eng. rate
              </span>
            </div>
          </div>
        </div>

        {/* Conversions */}
        <div className="bg-gradient-to-br from-green-50 to-green-100/60 rounded-xl border border-green-200 p-5">
          <p className="text-xs font-semibold text-green-600 uppercase tracking-wide mb-3">Conversions</p>
          <div className="space-y-3">
            <div>
              <p className="text-2xl font-bold text-gray-900">
                {kpi?.primaryConversions > 0 ? formatNum(kpi.primaryConversions) : "N/A"}
              </p>
              <p className="text-xs text-gray-500 mt-0.5">Leads + Contact Forms (GA4)</p>
            </div>
            <div className="flex gap-4 text-xs text-gray-600 border-t border-green-100 pt-3">
              <span>
                <span className="font-medium text-gray-800">{kpi?.downloads > 0 ? formatNum(kpi.downloads) : "—"}</span>
                {" "}downloads
              </span>
              <span>
                <span className="font-medium text-gray-800">{kpi?.sessions > 0 && kpi?.primaryConversions > 0 ? formatPct(kpi.primaryConversions / kpi.sessions) : "—"}</span>
                {" "}conv. rate
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}