import { cn } from "@/lib/utils";
import { TrendingUp, TrendingDown, ChevronRight } from "lucide-react";
import { formatNum, formatPct, formatDKK } from "../utils/measures";

const STAGE_CONFIG = {
  REACH: { color: "#0077b5", bg: "bg-blue-50", border: "border-blue-200", label: "REACH", icon: "📡" },
  ENGAGE: { color: "#2563eb", bg: "bg-indigo-50", border: "border-indigo-200", label: "ENGAGE", icon: "💬" },
  ACTIVATE: { color: "#16a34a", bg: "bg-green-50", border: "border-green-200", label: "ACTIVATE", icon: "⚡" },
  NURTURE: { color: "#9333ea", bg: "bg-purple-50", border: "border-purple-200", label: "NURTURE", icon: "🌱" },
};

export default function REANStageCard({ stage, headline, headlineLabel, supporting = [], delta, topDrivers = [], isSelected, onClick }) {
  const cfg = STAGE_CONFIG[stage] || STAGE_CONFIG.REACH;
  const hasDelta = delta !== null && delta !== undefined;
  const isPos = delta > 0;

  return (
    <div
      className={cn(
        "rounded-xl border-2 p-5 cursor-pointer transition-all duration-200",
        cfg.bg, cfg.border,
        isSelected ? "shadow-lg ring-2 ring-offset-1" : "hover:shadow-md"
      )}
      style={isSelected ? { ringColor: cfg.color } : {}}
      onClick={onClick}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-xl">{cfg.icon}</span>
          <span className="text-xs font-bold uppercase tracking-widest" style={{ color: cfg.color }}>
            {cfg.label}
          </span>
        </div>
        {hasDelta && (
          <div className={cn("flex items-center gap-1 text-xs font-medium",
            isPos ? "text-green-600" : "text-red-500")}>
            {isPos ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
            {delta > 0 ? "+" : ""}{delta.toFixed(1)}%
          </div>
        )}
      </div>

      {/* Headline KPI */}
      <div className="mb-2">
        <p className="text-3xl font-bold text-gray-900">{headline}</p>
        <p className="text-xs text-gray-500 mt-0.5">{headlineLabel}</p>
      </div>

      {/* Supporting KPIs */}
      <div className="flex flex-wrap gap-4 mb-3">
        {supporting.map((s, i) => (
          <div key={i}>
            <p className="text-sm font-semibold text-gray-700">{s.value}</p>
            <p className="text-xs text-gray-400">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Top drivers */}
      {topDrivers.length > 0 && (
        <div className="mt-3 pt-3 border-t border-gray-200">
          <p className="text-xs font-medium text-gray-500 mb-1">Top drivers</p>
          <div className="space-y-1">
            {topDrivers.slice(0, 3).map((d, i) => (
              <div key={i} className="flex items-center justify-between">
                <span className="text-xs text-gray-600">{d.label}</span>
                <span className="text-xs font-medium text-gray-800">{d.value}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="mt-3 flex items-center gap-1 text-xs font-medium" style={{ color: cfg.color }}>
        View breakdown <ChevronRight className="w-3 h-3" />
      </div>
    </div>
  );
}