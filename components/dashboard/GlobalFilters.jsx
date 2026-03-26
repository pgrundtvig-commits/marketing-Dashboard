import { useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Calendar, Filter, X } from "lucide-react";
import { CHANNELS, REGIONS, getDateRange } from "@/components/utils/measures";
import SavedViewsMenu from "./SavedViewsMenu";
import { Switch } from "@/components/ui/switch";

const PRESETS = ["7d", "30d", "QTD", "YTD", "Custom"];

export default function GlobalFilters({ filters, onChange, campaigns = [], events = [], webinars = [] }) {
  const [showCustom, setShowCustom] = useState(false);

  const set = (key, val) => onChange({ ...filters, [key]: val });

  const applyPreset = (preset) => {
    if (preset === "Custom") { setShowCustom(true); set("preset", "Custom"); return; }
    setShowCustom(false);
    const { start, end } = getDateRange(preset);
    onChange({ ...filters, preset, dateStart: start, dateEnd: end });
  };

  const clearAll = () => {
    onChange({ preset: "30d", ...getDateRange("30d"), region: "all", channel: "all", campaign: "all", event: "all", webinar: "all" });
    setShowCustom(false);
  };

  const handleLoadView = (savedFilters) => {
    onChange(savedFilters);
    if (savedFilters.preset === "Custom") setShowCustom(true);
    else setShowCustom(false);
  };

  return (
    <div className="bg-white border-b px-6 py-3 flex flex-wrap items-center gap-3">
      <Filter className="w-4 h-4 text-gray-400 shrink-0" />

      <div className="flex gap-1">
        {PRESETS.map(p => (
          <Button key={p} size="sm" variant={filters.preset === p ? "default" : "outline"}
            className={`h-7 px-3 text-xs ${filters.preset === p ? "bg-green-700 hover:bg-green-800" : ""}`}
            onClick={() => applyPreset(p)}>{p}</Button>
        ))}
      </div>

      {showCustom && (
        <div className="flex items-center gap-1">
          <Calendar className="w-3 h-3 text-gray-400" />
          <Input type="date" value={filters.dateStart || ""} onChange={e => set("dateStart", e.target.value)} className="h-7 text-xs w-32" />
          <span className="text-xs text-gray-400">–</span>
          <Input type="date" value={filters.dateEnd || ""} onChange={e => set("dateEnd", e.target.value)} className="h-7 text-xs w-32" />
        </div>
      )}

      <Select value={filters.region || "all"} onValueChange={v => set("region", v)}>
        <SelectTrigger className="h-7 text-xs w-32"><SelectValue placeholder="Region" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Regions</SelectItem>
          {REGIONS.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
        </SelectContent>
      </Select>

      <Select value={filters.channel || "all"} onValueChange={v => set("channel", v)}>
        <SelectTrigger className="h-7 text-xs w-44"><SelectValue placeholder="Channel" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Channels</SelectItem>
          {CHANNELS.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
        </SelectContent>
      </Select>

      <Select value={filters.campaign || "all"} onValueChange={v => set("campaign", v)}>
        <SelectTrigger className="h-7 text-xs w-48"><SelectValue placeholder="Campaign" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Campaigns</SelectItem>
          {campaigns.map(c => <SelectItem key={c.id} value={c.campaign_id}>{c.campaign_id}</SelectItem>)}
        </SelectContent>
      </Select>

      <Select value={filters.event || "all"} onValueChange={v => set("event", v)}>
        <SelectTrigger className="h-7 text-xs w-36"><SelectValue placeholder="Event" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Events</SelectItem>
          {events.map(e => <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>)}
        </SelectContent>
      </Select>

      <Select value={filters.webinar || "all"} onValueChange={v => set("webinar", v)}>
        <SelectTrigger className="h-7 text-xs w-36"><SelectValue placeholder="Webinar" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Webinars</SelectItem>
          {webinars.map(w => <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>)}
        </SelectContent>
      </Select>

      <div className="flex items-center gap-1.5 ml-1">
        <Switch
          id="yoy-toggle"
          checked={!!filters.compareYoY}
          onCheckedChange={(v) => set("compareYoY", v)}
          className="h-4 w-7 data-[state=checked]:bg-[#004B87]"
        />
        <label htmlFor="yoy-toggle" className="text-xs text-gray-500 cursor-pointer whitespace-nowrap">vs. prev. year</label>
      </div>

      <Button size="sm" variant="ghost" className="h-7 text-xs text-gray-400 hover:text-gray-600" onClick={clearAll}>
        <X className="w-3 h-3 mr-1" />Clear
      </Button>

      <SavedViewsMenu currentFilters={filters} onLoad={handleLoadView} />
    </div>
  );
}