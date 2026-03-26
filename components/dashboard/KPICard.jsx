import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { cn } from "@/lib/utils";

export default function KPICard({ title, value, delta, subtitle, accent, onClick }) {
  const isPositive = delta > 0;
  const isNegative = delta < 0;
  const hasDelta = delta !== null && delta !== undefined;

  return (
    <div
      className={cn(
        "bg-white rounded-xl border border-gray-200 p-5 flex flex-col gap-2",
        onClick && "cursor-pointer hover:shadow-md transition-shadow",
        accent && "border-l-4"
      )}
      style={accent ? { borderLeftColor: accent } : {}}
      onClick={onClick}
    >
      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{title}</p>
      <p className="text-2xl font-bold text-gray-900 leading-none">{value}</p>
      {subtitle && <p className="text-xs text-gray-400">{subtitle}</p>}
      {hasDelta && (
        <div className={cn(
          "flex items-center gap-1 text-xs font-medium",
          isPositive ? "text-green-600" : isNegative ? "text-red-500" : "text-gray-400"
        )}>
          {isPositive ? <TrendingUp className="w-3 h-3" /> : isNegative ? <TrendingDown className="w-3 h-3" /> : <Minus className="w-3 h-3" />}
          {hasDelta ? `${delta > 0 ? "+" : ""}${delta.toFixed(1)}% vs prev period` : "—"}
        </div>
      )}
    </div>
  );
}