import PulseKPICard from "./PulseKPICard";

export default function ConversionsPillar({ data }) {
  const { webinarSignups, pWebinarSignups, downloads, pDownloads, contactForms, pContactForms, totalLeads, mqls, sqls, mqlToSql } = data;
  const hasLeads = totalLeads > 0;

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-50" style={{ background: "linear-gradient(135deg, #7c4a2a 0%, #9b6038 100%)" }}>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-orange-200" />
          <h2 className="text-sm font-bold text-white uppercase tracking-widest">Conversions</h2>
        </div>
        <p className="text-xs mt-0.5" style={{ color: "#f5d6b8" }}>Activity → Engagement → MQL → SQL</p>
      </div>
      <div className="p-4 space-y-4">
        {/* Phase 1 */}
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: "#7c4a2a" }}>Phase 1 — Activity to Engagement</p>
          <div className="grid grid-cols-2 gap-3">
            <PulseKPICard
              title="Webinar Signups"
              value={webinarSignups}
              previous={pWebinarSignups}
              subtitle="from Webinar entity"
            />
            <PulseKPICard
              title="Downloads"
              value={downloads}
              previous={pDownloads}
              subtitle="file + iPaper"
            />
            <div className="col-span-2">
              <PulseKPICard
                title="Contact Form Submissions"
                value={contactForms}
                previous={pContactForms}
                subtitle="contact_form key event"
              />
            </div>
          </div>
        </div>

        {/* Phase 2 */}
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: "#7c4a2a" }}>Phase 2 — MQL → SQL → Opportunity</p>
          {hasLeads ? (
            <div className="grid grid-cols-2 gap-3">
              <PulseKPICard title="MQLs" value={mqls} subtitle="Lead grade A or B" />
              <PulseKPICard title="SQLs" value={sqls} subtitle="Lead grade A" />
              <div className="col-span-2">
                <PulseKPICard
                  title="MQL → SQL Rate"
                  value={mqlToSql}
                  valueType="pct"
                  subtitle="SQL / MQL"
                />
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-gray-200 p-4 text-center">
              <p className="text-sm font-medium text-gray-400">CRM Leads — Data available once CRM integration is live</p>
              <p className="text-xs text-gray-300 mt-1">MQL, SQL and opportunity data pending</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}