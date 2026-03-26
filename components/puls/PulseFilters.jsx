import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { BookmarkPlus, Bookmark } from "lucide-react";

const DATE_PRESETS = [
  { value: "7d", label: "Last 7 days" },
  { value: "30d", label: "Last 30 days" },
  { value: "QTD", label: "This Quarter" },
  { value: "YTD", label: "Year to Date" },
  { value: "custom", label: "Custom" },
];

const CHANNELS = [
  "all",
  "LinkedIn Paid",
  "LinkedIn Organic",
  "Paid Search",
  "Website",
  "Email Campaigns",
  "Webinars",
  "Events",
  "Trade Media/PR",
  "Partner/Distributor",
];

const REGIONS = ["all", "EMEA", "AMER", "ASPAC", "Global"];

export default function PulseFilters({ filters, onChange, campaigns }) {
  const [savedViews, setSavedViews] = useState([]);
  const [saveName, setSaveName] = useState("");
  const [showSave, setShowSave] = useState(false);

  useEffect(() => {
    base44.entities.SavedView.list().then(setSavedViews);
  }, []);

  const handleSave = async () => {
    if (!saveName.trim()) return;
    await base44.entities.SavedView.create({ name: saveName.trim(), filters });
    const updated = await base44.entities.SavedView.list();
    setSavedViews(updated);
    setSaveName("");
    setShowSave(false);
  };

  const handleLoadView = (view) => {
    onChange({ ...filters, ...view.filters });
  };

  return (
    <div className="px-6 py-3 flex flex-wrap items-center gap-3">
      {/* Date presets */}
      <div className="flex gap-1 flex-wrap">
        {DATE_PRESETS.map(p => (
          <button
            key={p.value}
            onClick={() => onChange({ ...filters, datePreset: p.value })}
            className={`px-3 py-1.5 text-xs font-medium rounded-full transition-colors ${
              filters.datePreset === p.value
                ? "text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
            style={filters.datePreset === p.value ? { background: "#1a2e4a" } : {}}
          >
            {p.label}
          </button>
        ))}
      </div>

      {filters.datePreset === "custom" && (
        <div className="flex gap-2 items-center">
          <input
            type="date"
            value={filters.customStart || ""}
            onChange={e => onChange({ ...filters, customStart: e.target.value })}
            className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none"
          />
          <span className="text-xs text-gray-400">to</span>
          <input
            type="date"
            value={filters.customEnd || ""}
            onChange={e => onChange({ ...filters, customEnd: e.target.value })}
            className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none"
          />
        </div>
      )}

      <div className="h-4 w-px bg-gray-200" />

      {/* Region */}
      <select
        value={filters.region}
        onChange={e => onChange({ ...filters, region: e.target.value })}
        className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 bg-white text-gray-600 focus:outline-none"
      >
        {REGIONS.map(r => <option key={r} value={r}>{r === "all" ? "All Regions" : r}</option>)}
      </select>

      {/* Channel */}
      <select
        value={filters.channel}
        onChange={e => onChange({ ...filters, channel: e.target.value })}
        className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 bg-white text-gray-600 focus:outline-none"
      >
        {CHANNELS.map(c => <option key={c} value={c}>{c === "all" ? "All Channels" : c}</option>)}
      </select>

      <div className="h-4 w-px bg-gray-200" />

      {/* Saved views */}
      {savedViews.length > 0 && (
        <select
          onChange={e => {
            const v = savedViews.find(sv => sv.id === e.target.value);
            if (v) handleLoadView(v);
          }}
          className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 bg-white text-gray-600 focus:outline-none"
          defaultValue=""
        >
          <option value="" disabled>Load saved view…</option>
          {savedViews.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
        </select>
      )}

      <button
        onClick={() => setShowSave(v => !v)}
        className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-800 transition-colors"
        title="Save current view"
      >
        <Bookmark className="w-3.5 h-3.5" />
        Save view
      </button>

      {showSave && (
        <div className="flex items-center gap-2">
          <input
            type="text"
            placeholder="View name…"
            value={saveName}
            onChange={e => setSaveName(e.target.value)}
            className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none w-32"
          />
          <button
            onClick={handleSave}
            className="px-2 py-1.5 text-xs text-white rounded-lg"
            style={{ background: "#4a7c6f" }}
          >
            Save
          </button>
        </div>
      )}
    </div>
  );
}