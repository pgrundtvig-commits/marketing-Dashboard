import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Clock, CheckCircle2, AlertCircle, Minus } from "lucide-react";

function statusDot(conn) {
  if (!conn) return "bg-gray-300";
  if (conn.status === "Error") return "bg-red-400";
  if (conn.status === "Disabled" || conn.status === "Not Connected") return "bg-gray-300";
  // Connected — check staleness
  if (conn.last_success_at) {
    const hoursAgo = (Date.now() - new Date(conn.last_success_at).getTime()) / 3600000;
    return hoursAgo > (conn.freshness_sla_hours || 24) ? "bg-yellow-400" : "bg-green-400";
  }
  return "bg-yellow-400";
}

function relativeTime(iso) {
  if (!iso) return null;
  const diff = (Date.now() - new Date(iso).getTime()) / 60000; // minutes
  if (diff < 60) return `${Math.round(diff)}m ago`;
  if (diff < 1440) return `${Math.round(diff / 60)}h ago`;
  return `${Math.round(diff / 1440)}d ago`;
}

export default function DataFreshnessBar() {
  const [connections, setConnections] = useState([]);

  useEffect(() => {
    base44.entities.DataSourceConnection.list().then(setConnections);
  }, []);

  if (connections.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-4 text-xs text-gray-500">
      {connections.map((c) => (
        <div key={c.id} className="flex items-center gap-1.5">
          <span className={`w-2 h-2 rounded-full flex-shrink-0 ${statusDot(c)}`} />
          <span className="font-medium text-gray-700">{c.source_system}</span>
          {c.last_success_at ? (
            <span className="flex items-center gap-0.5 text-gray-400">
              <Clock className="w-3 h-3" />{relativeTime(c.last_success_at)}
            </span>
          ) : (
            <span className="text-gray-400">{c.status}</span>
          )}
          {c.status === "Error" && c.last_error_message && (
            <span className="text-red-500 truncate max-w-[120px]" title={c.last_error_message}>
              — {c.last_error_message}
            </span>
          )}
        </div>
      ))}
    </div>
  );
}