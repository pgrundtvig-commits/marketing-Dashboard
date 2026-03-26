import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Loader2, CalendarDays, Video } from "lucide-react";
import { format } from "date-fns";

const REGION_COLORS = { EMEA: "bg-blue-100 text-blue-700", AMER: "bg-green-100 text-green-700", ASPAC: "bg-purple-100 text-purple-700", Global: "bg-gray-100 text-gray-600" };

export default function EventsWebinars() {
  const [events, setEvents] = useState([]);
  const [webinars, setWebinars] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("events");

  useEffect(() => {
    Promise.all([
      base44.entities.Event.list("-date", 200),
      base44.entities.Webinar.list("-date", 200),
    ]).then(([e, w]) => { setEvents(e); setWebinars(w); }).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex items-center justify-center h-96"><Loader2 className="w-8 h-8 animate-spin" style={{ color: "#1a2e4a" }} /></div>;

  const items = tab === "events" ? events : webinars;

  return (
    <div className="min-h-screen" style={{ background: "#f5f5f0" }}>
      <div className="px-6 pt-6 pb-4" style={{ background: "#1a2e4a" }}>
        <div className="max-w-screen-xl mx-auto">
          <h1 className="text-2xl font-bold text-white">Events & Webinars</h1>
          <p className="text-sm mt-0.5" style={{ color: "#a8c5d6" }}>{events.length} events · {webinars.length} webinars</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-screen-xl mx-auto px-6 flex gap-0">
          {[{ key: "events", label: "Events", TabIcon: CalendarDays }, { key: "webinars", label: "Webinars", TabIcon: Video }].map(({ key, label, TabIcon }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`flex items-center gap-2 px-5 py-3 text-sm font-medium border-b-2 transition-colors ${tab === key ? "border-[#1a2e4a] text-[#1a2e4a]" : "border-transparent text-gray-500 hover:text-gray-700"}`}
            >
              <TabIcon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-screen-xl mx-auto px-6 py-6">
        {items.length === 0 ? (
          <div className="bg-white rounded-2xl border border-dashed border-gray-200 p-12 text-center">
            <p className="text-base font-medium text-gray-400">{tab === "events" ? "Events" : "Webinars"} — No data yet</p>
            <p className="text-sm text-gray-300 mt-1">Records will appear here once added via Data Import</p>
          </div>
        ) : (
          <div className="grid gap-3">
            {items.map(item => (
              <div key={item.id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 flex items-start gap-4">
                <div className="flex-shrink-0 w-12 h-12 rounded-xl flex flex-col items-center justify-center text-white text-xs font-bold" style={{ background: "#1a2e4a" }}>
                  {item.date ? <><span className="text-base leading-none">{format(new Date(item.date), "d")}</span><span>{format(new Date(item.date), "MMM")}</span></> : "?"}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900">{item.name}</p>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    {item.region && <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${REGION_COLORS[item.region] || "bg-gray-100 text-gray-600"}`}>{item.region}</span>}
                    {item.location && <span className="text-xs text-gray-400">{item.location}</span>}
                    {item.platform && <span className="text-xs text-gray-400">{item.platform}</span>}
                    {item.campaign_id && <span className="text-xs text-gray-400">Campaign: {item.campaign_id}</span>}
                  </div>
                  {item.notes && <p className="text-xs text-gray-400 mt-1">{item.notes}</p>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}