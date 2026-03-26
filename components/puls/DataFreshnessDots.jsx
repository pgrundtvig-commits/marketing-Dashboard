import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";

function getDot(conn) {
  if (conn.status === "Not Connected" || conn.status === "Disabled") return { color: "#6b7280", label: "Not connected" };
  if (conn.status === "Error") return { color: "#ef4444", label: "Error" };
  if (!conn.last_success_at) return { color: "#f59e0b", label: "Never synced" };
  const hoursAgo = (Date.now() - new Date(conn.last_success_at).getTime()) / 3600000;
  const sla = conn.freshness_sla_hours || 24;
  if (hoursAgo <= sla) return { color: "#22c55e", label: `${Math.round(hoursAgo)}h ago` };
  if (hoursAgo <= sla * 2) return { color: "#f59e0b", label: `${Math.round(hoursAgo)}h ago` };
  return { color: "#ef4444", label: `${Math.round(hoursAgo)}h ago` };
}

export default function DataFreshnessDots() {
  const [connections, setConnections] = useState([]);

  useEffect(() => {
    base44.entities.DataSourceConnection.list().then(setConnections);
  }, []);

  if (connections.length === 0) return null;

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {connections.map(conn => {
        const dot = getDot(conn);
        return (
          <div key={conn.id} className="flex items-center gap-1.5 group relative cursor-default">
            <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: dot.color }} />
            <span className="text-xs text-white/70 hidden sm:inline">{conn.source_system}</span>
            {/* Tooltip */}
            <div className="absolute bottom-full left-0 mb-1.5 hidden group-hover:block z-50 bg-gray-900 text-white text-xs rounded-lg px-2 py-1.5 whitespace-nowrap shadow-lg">
              {conn.source_system}: {dot.label}
              {conn.last_error_message && <div className="text-red-300 mt-0.5 max-w-xs truncate">{conn.last_error_message}</div>}
            </div>
          </div>
        );
      })}
    </div>
  );
}