import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Loader2, CheckCircle2, XCircle, Clock, AlertCircle, RefreshCw } from "lucide-react";
import { format } from "date-fns";

const STATUS_CONFIG = {
  Connected: { icon: CheckCircle2, color: "text-green-500", bg: "bg-green-50 border-green-200" },
  Error: { icon: XCircle, color: "text-red-500", bg: "bg-red-50 border-red-200" },
  Disabled: { icon: Clock, color: "text-gray-400", bg: "bg-gray-50 border-gray-200" },
  "Not Connected": { icon: AlertCircle, color: "text-yellow-500", bg: "bg-yellow-50 border-yellow-200" },
};

export default function Settings() {
  const [connections, setConnections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [gscMsg, setGscMsg] = useState(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const urlCode = params.get("code");
    const success = params.get("gsc_success");
    const error = params.get("gsc_error");

    // If we landed with a code from Google, persist it immediately
    if (urlCode) {
      localStorage.setItem("gsc_pending_code", urlCode);
      localStorage.setItem("gsc_pending_code_time", Date.now().toString());
    }

    // Check both URL and localStorage for an OAuth code (within 10 minutes)
    const storedCode = localStorage.getItem("gsc_pending_code");
    const storedTime = parseInt(localStorage.getItem("gsc_pending_code_time") || "0");
    const codeExpired = Date.now() - storedTime > 10 * 60 * 1000;
    const code = urlCode || (storedCode && !codeExpired ? storedCode : null);

    if (code) {
      localStorage.removeItem("gsc_pending_code");
      localStorage.removeItem("gsc_pending_code_time");
      window.history.replaceState({}, document.title, window.location.pathname);
      setGscMsg({ type: "info", text: "Completing Google authorization…" });
      exchangeCode(code);
    } else if (storedCode && codeExpired) {
      localStorage.removeItem("gsc_pending_code");
      localStorage.removeItem("gsc_pending_code_time");
      setGscMsg({ type: "err", text: "Authorization code expired. Please try reconnecting again." });
    } else if (success) {
      window.history.replaceState({}, document.title, window.location.pathname);
      setGscMsg({ type: "ok", text: "GSC reconnected successfully! The weekly sync will now work." });
    } else if (error) {
      window.history.replaceState({}, document.title, window.location.pathname);
      setGscMsg({ type: "err", text: decodeURIComponent(error) });
    }

    loadConnections();
  }, []);

  async function exchangeCode(code) {
    try {
      const res = await base44.functions.invoke("gscOAuthCallback", {
        code,
        redirect_uri: "https://palsgaard-marketing-kpi.base44.app/Settings",
      });
      if (res.data?.success) {
        setGscMsg({ type: "ok", text: "GSC reconnected successfully! The weekly sync will now work." });
        loadConnections();
      } else {
        setGscMsg({ type: "err", text: res.data?.error || "Token exchange failed." });
      }
    } catch (e) {
      setGscMsg({ type: "err", text: e.message });
    }
  }

  function loadConnections() {
    base44.entities.DataSourceConnection.list()
      .then(setConnections)
      .catch(() => {}) // ignore auth errors on page load
      .finally(() => setLoading(false));
  }

  function startGscReauth() {
    setGscMsg(null);
    // Point directly at the backend function — it handles the code server-side and redirects back
    const redirectUri = "https://palsgaard-marketing-kpi.base44.app/api/apps/69a6e9ed1b1260c91da32cec/functions/gscOAuthCallbackRedirect";
    const params = new URLSearchParams({
      client_id: "252296924380-s7kv0np35j0gbvtbqrlsdlp9364sssht.apps.googleusercontent.com",
      redirect_uri: redirectUri,
      response_type: "code",
      scope: "https://www.googleapis.com/auth/webmasters.readonly",
      access_type: "offline",
      prompt: "consent",
    });
    window.location.href = `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
  }

  if (loading) return (
    <div className="flex items-center justify-center h-96">
      <Loader2 className="w-8 h-8 animate-spin" style={{ color: "#1a2e4a" }} />
    </div>
  );

  return (
    <div className="min-h-screen" style={{ background: "#f5f5f0" }}>
      <div className="px-6 pt-6 pb-4" style={{ background: "#1a2e4a" }}>
        <div className="max-w-screen-xl mx-auto">
          <h1 className="text-2xl font-bold text-white">Settings</h1>
          <p className="text-sm mt-0.5" style={{ color: "#a8c5d6" }}>Data source connection management</p>
        </div>
      </div>

      <div className="max-w-screen-xl mx-auto px-6 py-6 space-y-4">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Data Source Connections</h2>
        {connections.length === 0 ? (
          <div className="bg-white rounded-2xl border border-dashed border-gray-200 p-12 text-center">
            <p className="text-base font-medium text-gray-400">No data source connections configured</p>
            <p className="text-sm text-gray-300 mt-1">Connections are created automatically when a sync runs successfully</p>
          </div>
        ) : (
          <div className="grid gap-3">
            {connections.map(conn => {
              const cfg = STATUS_CONFIG[conn.status] || STATUS_CONFIG["Not Connected"];
              const Icon = cfg.icon;
              return (
                <div key={conn.id} className={`bg-white rounded-xl border shadow-sm p-5 ${cfg.bg}`}>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <Icon className={`w-5 h-5 ${cfg.color}`} />
                      <div>
                        <p className="font-semibold text-gray-900">{conn.source_system}</p>
                        <p className={`text-xs font-medium mt-0.5 ${cfg.color}`}>{conn.status}</p>
                      </div>
                    </div>
                    <div className="text-right text-xs text-gray-500 space-y-1">
                      {conn.last_sync_at && <p>Last sync: {format(new Date(conn.last_sync_at), "d MMM HH:mm")}</p>}
                      {conn.last_success_at && <p className="text-green-600">Last success: {format(new Date(conn.last_success_at), "d MMM HH:mm")}</p>}
                      {conn.freshness_sla_hours && <p>SLA: {conn.freshness_sla_hours}h</p>}
                    </div>
                  </div>
                  {conn.last_error_message && (
                    <div className="mt-3 p-3 bg-red-50 rounded-lg">
                      <p className="text-xs text-red-600 font-medium">Error:</p>
                      <p className="text-xs text-red-500 mt-0.5">{conn.last_error_message}</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* GSC Re-auth Section */}
        <div className="p-5 bg-white rounded-2xl border border-orange-100 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h2 className="text-sm font-semibold text-gray-700">Google Search Console — Re-authenticate</h2>
              <p className="text-xs text-gray-400 mt-0.5">Use this if the weekly GSC sync is failing with token errors</p>
            </div>
            <button
              onClick={startGscReauth}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white"
              style={{ background: "#1a2e4a" }}
            >
              <RefreshCw className="w-4 h-4" />
              Reconnect GSC
            </button>
          </div>

          {gscMsg && (
            <p className={`text-sm mt-2 font-medium ${gscMsg.type === "ok" ? "text-green-600" : gscMsg.type === "info" ? "text-blue-500" : "text-red-500"}`}>
              {gscMsg.text}
            </p>
          )}
        </div>

        <div className="mt-8 p-5 bg-white rounded-2xl border border-gray-100 shadow-sm">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">Channel Definitions</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left py-2 px-3 text-xs font-semibold text-gray-400 uppercase">Channel</th>
                  <th className="text-left py-2 px-3 text-xs font-semibold text-gray-400 uppercase">Primary Data Source</th>
                  <th className="text-left py-2 px-3 text-xs font-semibold text-gray-400 uppercase">Metrics Available</th>
                  <th className="text-left py-2 px-3 text-xs font-semibold text-gray-400 uppercase">Notes</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-gray-50">
                  <td className="py-3 px-3 font-medium text-gray-800">LinkedIn Paid</td>
                  <td className="py-3 px-3 text-gray-700">LinkedIn API</td>
                  <td className="py-3 px-3 text-gray-600 text-xs">Impressions, Reach, Clicks, Spend, Eng. Rate</td>
                  <td className="py-3 px-3 text-gray-500 text-xs">Sessions/conversions via GA4 UTM</td>
                </tr>
                <tr className="border-b border-gray-50">
                  <td className="py-3 px-3 font-medium text-gray-800">LinkedIn Organic</td>
                  <td className="py-3 px-3 text-gray-700">LinkedIn API</td>
                  <td className="py-3 px-3 text-gray-600 text-xs">Impressions, Reach, Clicks, Eng. Rate</td>
                  <td className="py-3 px-3 text-gray-500 text-xs">Regional pages tracked separately</td>
                </tr>
                <tr className="border-b border-gray-50">
                  <td className="py-3 px-3 font-medium text-gray-800">Website (Inbound)</td>
                  <td className="py-3 px-3 text-gray-700">Google Analytics</td>
                  <td className="py-3 px-3 text-gray-600 text-xs">Sessions, Engaged Sessions, Eng. Rate</td>
                  <td className="py-3 px-3 text-gray-500 text-xs">All non-campaign traffic</td>
                </tr>
                <tr className="border-b border-gray-50">
                  <td className="py-3 px-3 font-medium text-gray-800">Email Campaigns</td>
                  <td className="py-3 px-3 text-gray-700">Google Analytics</td>
                  <td className="py-3 px-3 text-gray-600 text-xs">Sessions, Key Events</td>
                  <td className="py-3 px-3 text-gray-500 text-xs">Open/click rate via MA tool</td>
                </tr>
                <tr className="border-b border-gray-50">
                  <td className="py-3 px-3 font-medium text-gray-800">Paid Search</td>
                  <td className="py-3 px-3 text-gray-700">Google Analytics</td>
                  <td className="py-3 px-3 text-gray-600 text-xs">Sessions, Clicks, Key Events</td>
                  <td className="py-3 px-3 text-gray-500 text-xs">Google Ads UTM</td>
                </tr>
                <tr className="border-b border-gray-50">
                  <td className="py-3 px-3 font-medium text-gray-800">Social (Paid)</td>
                  <td className="py-3 px-3 text-gray-700">Google Analytics</td>
                  <td className="py-3 px-3 text-gray-600 text-xs">Sessions, Clicks, Key Events</td>
                  <td className="py-3 px-3 text-gray-500 text-xs">Paid social campaigns from multiple platforms</td>
                </tr>
                <tr className="border-b border-gray-50">
                  <td className="py-3 px-3 font-medium text-gray-800">Social (Organic)</td>
                  <td className="py-3 px-3 text-gray-700">Google Analytics</td>
                  <td className="py-3 px-3 text-gray-600 text-xs">Sessions, Clicks, Key Events</td>
                  <td className="py-3 px-3 text-gray-500 text-xs">Organic social traffic from multiple platforms</td>
                </tr>
                <tr className="border-b border-gray-50">
                  <td className="py-3 px-3 font-medium text-gray-800">Display</td>
                  <td className="py-3 px-3 text-gray-700">Google Analytics</td>
                  <td className="py-3 px-3 text-gray-600 text-xs">Sessions, Key Events</td>
                  <td className="py-3 px-3 text-gray-500 text-xs">Display network and retargeting</td>
                </tr>
                <tr className="border-b border-gray-50">
                  <td className="py-3 px-3 font-medium text-gray-800">WeChat</td>
                  <td className="py-3 px-3 text-gray-700">Manual CSV Import</td>
                  <td className="py-3 px-3 text-gray-600 text-xs">Followers, Impressions, Engagements</td>
                  <td className="py-3 px-3 text-gray-500 text-xs">ASPAC region only</td>
                </tr>
                <tr>
                  <td className="py-3 px-3 font-medium text-gray-800">YouTube</td>
                  <td className="py-3 px-3 text-gray-700">Manual CSV Import</td>
                  <td className="py-3 px-3 text-gray-600 text-xs">Views, Subscribers, Eng. Rate</td>
                  <td className="py-3 px-3 text-gray-500 text-xs">Upcoming: YouTube Analytics API</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div className="mt-4 p-5 bg-white rounded-2xl border border-gray-100 shadow-sm">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">About Palsgaard Puls</h2>
          <div className="space-y-2 text-sm text-gray-500">
            <p>Active data sources: Google Analytics 4, Google Search Console, LinkedIn API</p>
            <p>Upcoming: CRM (365), YouTube API, WeChat API</p>
            <p className="text-xs text-gray-300 mt-4">Currency: DKK · Timezone: Europe/Copenhagen</p>
          </div>
        </div>
      </div>
    </div>
  );
}