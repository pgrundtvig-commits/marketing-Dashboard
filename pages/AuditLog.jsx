import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { format } from "date-fns";
import { Loader2, RefreshCw, CheckCircle2, AlertTriangle, Wrench, Info, ChevronDown, ChevronUp } from "lucide-react";

const STATUS_CONFIG = {
  fixed: { label: "Auto-fixed", color: "bg-blue-100 text-blue-700", icon: Wrench },
  flagged: { label: "Needs Review", color: "bg-amber-100 text-amber-700", icon: AlertTriangle },
  ok: { label: "OK", color: "bg-green-100 text-green-700", icon: CheckCircle2 },
};

const SEVERITY_CONFIG = {
  error: { dot: "bg-red-500", label: "Error" },
  warning: { dot: "bg-amber-400", label: "Warning" },
  info: { dot: "bg-blue-400", label: "Info" },
};

function AuditRow({ entry }) {
  const [expanded, setExpanded] = useState(false);
  const st = STATUS_CONFIG[entry.status] || STATUS_CONFIG.ok;
  const sv = SEVERITY_CONFIG[entry.severity] || SEVERITY_CONFIG.info;
  const Icon = st.icon;
  const hasDetail = entry.before_value || entry.after_value || entry.affected_id;

  return (
    <div className="border border-gray-100 rounded-lg bg-white overflow-hidden">
      <div
        className={`flex items-start gap-3 px-4 py-3 ${hasDetail ? "cursor-pointer hover:bg-gray-50" : ""}`}
        onClick={() => hasDetail && setExpanded(v => !v)}
      >
        <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${sv.dot}`} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${st.color}`}>
              <Icon className="w-3 h-3" />
              {st.label}
            </span>
            <span className="text-xs text-gray-400 font-mono">{entry.check_type}</span>
            {entry.affected_entity && (
              <span className="text-xs text-gray-400">→ {entry.affected_entity}</span>
            )}
          </div>
          <p className="text-sm text-gray-700 mt-1 leading-relaxed">{entry.description}</p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className="text-xs text-gray-400">
            {entry.created_date ? format(new Date(entry.created_date), "dd MMM, HH:mm") : "—"}
          </span>
          {entry.run_trigger && (
            <span className="text-xs px-1.5 py-0.5 rounded bg-gray-100 text-gray-500">{entry.run_trigger}</span>
          )}
          {hasDetail && (
            expanded ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />
          )}
        </div>
      </div>

      {expanded && hasDetail && (
        <div className="border-t border-gray-100 px-4 py-3 bg-gray-50 space-y-2">
          {entry.affected_id && (
            <div className="text-xs text-gray-500">
              <span className="font-medium">Affected ID:</span> <span className="font-mono">{entry.affected_id}</span>
            </div>
          )}
          {entry.before_value && (
            <div>
              <p className="text-xs font-medium text-gray-500 mb-1">Before</p>
              <pre className="text-xs bg-red-50 text-red-700 rounded p-2 overflow-x-auto">{entry.before_value}</pre>
            </div>
          )}
          {entry.after_value && (
            <div>
              <p className="text-xs font-medium text-gray-500 mb-1">After</p>
              <pre className="text-xs bg-green-50 text-green-700 rounded p-2 overflow-x-auto">{entry.after_value}</pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function AuditLog() {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [runMsg, setRunMsg] = useState(null);
  const [filter, setFilter] = useState("all");

  const load = async () => {
    const data = await base44.entities.AuditLog.list("-created_date", 200);
    setEntries(data);
  };

  useEffect(() => {
    load().finally(() => setLoading(false));
  }, []);

  const handleRunNow = async () => {
    setRunning(true);
    setRunMsg(null);
    try {
      const res = await base44.functions.invoke("dataReconciliation", { trigger: "manual" });
      setRunMsg({ ok: true, text: `Done — ${res.data?.fixes ?? 0} fixed, ${res.data?.flags ?? 0} flagged` });
      await load();
    } catch (e) {
      setRunMsg({ ok: false, text: "Failed: " + e.message });
    } finally {
      setRunning(false);
    }
  };

  const filtered = filter === "all" ? entries : entries.filter(e => e.status === filter);

  const counts = {
    fixed: entries.filter(e => e.status === "fixed").length,
    flagged: entries.filter(e => e.status === "flagged").length,
    ok: entries.filter(e => e.status === "ok").length,
  };

  if (loading) return (
    <div className="flex items-center justify-center h-96">
      <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
    </div>
  );

  return (
    <div className="min-h-screen" style={{ background: "#f5f5f0" }}>
      {/* Header */}
      <div className="px-6 pt-6 pb-4" style={{ background: "#1a2e4a" }}>
        <div className="max-w-screen-xl mx-auto flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">Audit Log</h1>
            <p className="text-sm mt-0.5" style={{ color: "#a8c5d6" }}>Data consistency checks — auto-fixed & flagged issues</p>
          </div>
          <div className="flex items-center gap-2">
            {runMsg && (
              <span className={`text-xs ${runMsg.ok ? "text-green-300" : "text-red-300"}`}>{runMsg.text}</span>
            )}
            <button
              onClick={handleRunNow}
              disabled={running}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg text-white border border-white/20 bg-white/10 hover:bg-white/20 disabled:opacity-50 transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${running ? "animate-spin" : ""}`} />
              {running ? "Running…" : "Run Now"}
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-screen-xl mx-auto px-6 py-6 space-y-6">
        {/* Summary cards */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { key: "flagged", label: "Needs Review", color: "text-amber-600", bg: "bg-amber-50 border-amber-200" },
            { key: "fixed", label: "Auto-Fixed", color: "text-blue-600", bg: "bg-blue-50 border-blue-200" },
            { key: "ok", label: "Clean Runs", color: "text-green-600", bg: "bg-green-50 border-green-200" },
          ].map(({ key, label, color, bg }) => (
            <button
              key={key}
              onClick={() => setFilter(filter === key ? "all" : key)}
              className={`rounded-xl border p-4 text-left transition-all ${bg} ${filter === key ? "ring-2 ring-offset-1 ring-gray-400" : ""}`}
            >
              <p className={`text-2xl font-bold ${color}`}>{counts[key]}</p>
              <p className="text-sm text-gray-600 mt-0.5">{label}</p>
            </button>
          ))}
        </div>

        {/* Filter bar */}
        <div className="flex items-center gap-2">
          {["all", "flagged", "fixed", "ok"].map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${filter === f ? "bg-gray-800 text-white border-gray-800" : "bg-white text-gray-500 border-gray-200 hover:border-gray-400"}`}
            >
              {f === "all" ? "All" : STATUS_CONFIG[f]?.label}
            </button>
          ))}
          <span className="ml-auto text-xs text-gray-400">{filtered.length} entries</span>
        </div>

        {/* Entries */}
        {filtered.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <Info className="w-8 h-8 mx-auto mb-2 opacity-40" />
            <p className="text-sm">No audit entries yet. Run the reconciliation to get started.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map(e => <AuditRow key={e.id} entry={e} />)}
          </div>
        )}
      </div>
    </div>
  );
}