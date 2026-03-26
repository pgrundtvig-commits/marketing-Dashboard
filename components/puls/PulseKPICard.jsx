import { TrendingUp, TrendingDown, Minus } from "lucide-react";

function formatVal(val, type) {
  if (val === null || val === undefined) return "—";
  if (type === "pct") return (val * 100).toFixed(1) + "%";
  if (type === "num") return new Intl.NumberFormat("da-DK").format(Math.round(val));
  if (type === "dkk") return new Intl.NumberFormat("da-DK", { style: "currency", currency: "DKK", maximumFractionDigits: 0 }).format(val);
  return String(val);
}

function getDelta(current, previous) {
  if (!previous || previous === 0 || current === null || current === undefined) return null;
  return ((current - previous) / Math.abs(previous)) * 100;
}

export default function PulseKPICard({ title, value, valueType = "num", previous, subtitle, accent = "#1a2e4a", comingSoon = false }) {
  const delta = getDelta(value, previous);
  const isPositive = delta !== null && delta > 0;
  const isNegative = delta !== null && delta < 0;

  if (comingSoon) {
    return (
      <div className="bg-white rounded-xl border border-dashed border-gray-200 shadow-sm p-4 flex flex-col gap-1">
        <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">{title}</p>
        <p className="text-sm text-gray-400 italic mt-1">Coming soon</p>
        {subtitle && <p className="text-xs text-gray-300 mt-0.5">{subtitle}</p>}
      </div>
    );
  }

  const displayVal = formatVal(value, valueType);
  const isNA = displayVal === "—" || (typeof value === "number" && value === 0 && previous === 0);

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex flex-col gap-1">
      <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">{title}</p>
      <div className="flex items-end gap-2 mt-1">
        <span className="text-2xl font-bold" style={{ color: isNA ? "#9ca3af" : "#1a2e4a" }}>
          {displayVal}
        </span>
        {delta !== null && !isNA && (
          <div className={`flex items-center gap-0.5 mb-0.5 text-xs font-semibold ${isPositive ? "text-green-600" : isNegative ? "text-red-500" : "text-gray-400"}`}>
            {isPositive ? <TrendingUp className="w-3.5 h-3.5" /> : isNegative ? <TrendingDown className="w-3.5 h-3.5" /> : <Minus className="w-3.5 h-3.5" />}
            {Math.abs(delta).toFixed(1)}%
          </div>
        )}
      </div>
      {subtitle && <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>}
      {isNA && value === 0 && previous === undefined && (
        <p className="text-xs text-gray-300 italic">No data for period</p>
      )}
    </div>
  );
}