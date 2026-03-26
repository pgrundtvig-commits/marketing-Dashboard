import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Loader2, Search, Plus, X, Check } from "lucide-react";
import { format } from "date-fns";

const STATUS_COLORS = {
  Active: "bg-green-100 text-green-700",
  Planned: "bg-blue-100 text-blue-700",
  Completed: "bg-gray-100 text-gray-600",
  Paused: "bg-yellow-100 text-yellow-700",
};

const REGIONS = ["EMEA", "AMER", "ASPAC", "Global"];
const STATUSES = ["Active", "Planned", "Completed", "Paused"];

const EMPTY_FORM = { campaign_id: "", name: "", region: "EMEA", category: "", start_date: "", end_date: "", owner: "", status: "Active" };

export default function Campaigns() {
  const [campaigns, setCampaigns] = useState([]);
  const [rawCampaignIds, setRawCampaignIds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [regionFilter, setRegionFilter] = useState("all");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    const [camps, metrics] = await Promise.all([
      base44.entities.Campaign.list(),
      base44.entities.ChannelMetricDaily.list("-date", 2000),
    ]);
    setCampaigns(camps);
    // Collect unique campaign_ids from raw data not already in registry
    const registeredIds = new Set(camps.map(c => c.campaign_id));
    const IGNORE = new Set(["(organic)", "(not set)", "(none)", "(cross-network)", "UNMAPPED", "(referral)", "(direct)"]);
    const raw = [...new Set(metrics.map(m => m.campaign_id).filter(id => id && !IGNORE.has(id) && !registeredIds.has(id)))];
    setRawCampaignIds(raw);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const filtered = campaigns.filter(c => {
    if (regionFilter !== "all" && c.region !== regionFilter) return false;
    if (search && !c.name?.toLowerCase().includes(search.toLowerCase()) && !c.campaign_id?.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const openNew = () => { setForm(EMPTY_FORM); setEditingId(null); setShowForm(true); };
  const openEdit = (c) => { setForm({ campaign_id: c.campaign_id || "", name: c.name || "", region: c.region || "EMEA", category: c.category || "", start_date: c.start_date || "", end_date: c.end_date || "", owner: c.owner || "", status: c.status || "Active" }); setEditingId(c.id); setShowForm(true); };

  const handleSave = async () => {
    if (!form.campaign_id || !form.name || !form.region) return;
    setSaving(true);
    const payload = { ...form };
    if (!payload.start_date) delete payload.start_date;
    if (!payload.end_date) delete payload.end_date;
    if (editingId) {
      await base44.entities.Campaign.update(editingId, payload);
    } else {
      await base44.entities.Campaign.create(payload);
    }
    await load();
    setShowForm(false);
    setSaving(false);
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this campaign?")) return;
    await base44.entities.Campaign.delete(id);
    setCampaigns(cs => cs.filter(c => c.id !== id));
  };

  if (loading) return <div className="flex items-center justify-center h-96"><Loader2 className="w-8 h-8 animate-spin" style={{ color: "#1a2e4a" }} /></div>;

  return (
    <div className="min-h-screen" style={{ background: "#f5f5f0" }}>
      <div className="px-6 pt-6 pb-4" style={{ background: "#1a2e4a" }}>
        <div className="max-w-screen-xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">Campaigns</h1>
            <p className="text-sm mt-0.5" style={{ color: "#a8c5d6" }}>{campaigns.length} campaign{campaigns.length !== 1 ? "s" : ""} total</p>
          </div>
          <button
            onClick={openNew}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg text-white border border-white/20 bg-white/10 hover:bg-white/20 transition-colors"
          >
            <Plus className="w-4 h-4" /> Add Campaign
          </button>
        </div>
      </div>

      <div className="max-w-screen-xl mx-auto px-6 py-6 space-y-4">

        {/* Inline form */}
        {showForm && (
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-gray-800">{editingId ? "Edit Campaign" : "New Campaign"}</h2>
              <button onClick={() => setShowForm(false)}><X className="w-4 h-4 text-gray-400" /></button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase block mb-1">Campaign ID *</label>
                <input value={form.campaign_id} onChange={e => setForm(f => ({ ...f, campaign_id: e.target.value }))} placeholder="2026-EMEA-Baking-Q1" className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none font-mono" />
              </div>
              <div className="sm:col-span-1 lg:col-span-1">
                <label className="text-xs font-semibold text-gray-500 uppercase block mb-1">Name *</label>
                <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Baking Innovation Q1 2026" className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none" />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase block mb-1">Region *</label>
                <select value={form.region} onChange={e => setForm(f => ({ ...f, region: e.target.value }))} className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none">
                  {REGIONS.map(r => <option key={r}>{r}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase block mb-1">Category</label>
                <input value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} placeholder="Product / Brand / Event…" className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none" />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase block mb-1">Status</label>
                <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))} className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none">
                  {STATUSES.map(s => <option key={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase block mb-1">Owner</label>
                <input value={form.owner} onChange={e => setForm(f => ({ ...f, owner: e.target.value }))} placeholder="Jane Smith" className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none" />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase block mb-1">Start Date</label>
                <input type="date" value={form.start_date} onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))} className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none" />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase block mb-1">End Date</label>
                <input type="date" value={form.end_date} onChange={e => setForm(f => ({ ...f, end_date: e.target.value }))} className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none" />
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <button
                onClick={handleSave}
                disabled={saving || !form.campaign_id || !form.name || !form.region}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg text-white disabled:opacity-50 transition-colors"
                style={{ background: "#1a2e4a" }}
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                {editingId ? "Save Changes" : "Create Campaign"}
              </button>
              <button onClick={() => setShowForm(false)} className="px-4 py-2 text-sm text-gray-500 hover:text-gray-800 transition-colors">Cancel</button>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="flex gap-3 flex-wrap">
          <div className="relative flex-1 min-w-48">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input type="text" placeholder="Search campaigns…" value={search} onChange={e => setSearch(e.target.value)} className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none" />
          </div>
          <select value={regionFilter} onChange={e => setRegionFilter(e.target.value)} className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white text-gray-600 focus:outline-none">
            <option value="all">All Regions</option>
            {REGIONS.map(r => <option key={r} value={r}>{r}</option>)}
          </select>
        </div>

        {/* Table */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          {filtered.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <p className="text-base font-medium">No campaigns found</p>
              <p className="text-sm mt-1">Add campaigns manually or import via CSV</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-gray-100">
                  <tr>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-gray-400 uppercase">Campaign</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-gray-400 uppercase">Region</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-gray-400 uppercase">Category</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-gray-400 uppercase">Status</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-gray-400 uppercase">Start</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-gray-400 uppercase">End</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-gray-400 uppercase">Owner</th>
                    <th className="py-3 px-4" />
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(c => (
                    <tr key={c.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors group">
                      <td className="py-3 px-4">
                        <p className="font-medium text-gray-900">{c.name}</p>
                        <p className="text-xs text-gray-400 font-mono">{c.campaign_id}</p>
                      </td>
                      <td className="py-3 px-4 text-gray-600">{c.region}</td>
                      <td className="py-3 px-4 text-gray-600">{c.category || "—"}</td>
                      <td className="py-3 px-4">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[c.status] || "bg-gray-100 text-gray-600"}`}>{c.status}</span>
                      </td>
                      <td className="py-3 px-4 text-gray-600">{c.start_date ? format(new Date(c.start_date), "d MMM yyyy") : "—"}</td>
                      <td className="py-3 px-4 text-gray-600">{c.end_date ? format(new Date(c.end_date), "d MMM yyyy") : "—"}</td>
                      <td className="py-3 px-4 text-gray-600">{c.owner || "—"}</td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center gap-2 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => openEdit(c)} className="text-xs text-blue-600 hover:underline">Edit</button>
                          <button onClick={() => handleDelete(c.id)} className="text-xs text-red-500 hover:underline">Delete</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Unregistered campaigns from channel data */}
        {rawCampaignIds.length > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5">
            <p className="text-sm font-semibold text-amber-800 mb-1">Campaign names seen in channel data but not in registry ({rawCampaignIds.length})</p>
            <p className="text-xs text-amber-600 mb-3">These appear in your GA4 / LinkedIn data. Add them to the registry above to enrich them with region, category and status.</p>
            <div className="flex flex-wrap gap-2">
              {rawCampaignIds.map(id => (
                <button
                  key={id}
                  onClick={() => { setForm(f => ({ ...EMPTY_FORM, campaign_id: id, name: id })); setEditingId(null); setShowForm(true); window.scrollTo({ top: 0, behavior: "smooth" }); }}
                  className="text-xs font-mono bg-white border border-amber-300 text-amber-800 px-3 py-1.5 rounded-lg hover:bg-amber-100 transition-colors"
                >
                  + {id}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}