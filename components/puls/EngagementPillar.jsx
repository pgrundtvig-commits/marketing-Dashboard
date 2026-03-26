import PulseKPICard from "./PulseKPICard";

export default function EngagementPillar({ data }) {
  const { someEngRate, pSomeEngRate, emailOpenRate, pEmailOpenRate, emailClickRate, pEmailClickRate, engSessionRate, pEngSessionRate } = data;

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-50" style={{ background: "linear-gradient(135deg, #4a7c6f 0%, #2d6b5e 100%)" }}>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-green-200" />
          <h2 className="text-sm font-bold text-white uppercase tracking-widest">Engagement</h2>
        </div>
        <p className="text-xs mt-0.5" style={{ color: "#b8e0d8" }}>SoMe · Email · Web · MyPalsgaard</p>
      </div>
      <div className="p-4 grid grid-cols-2 gap-3">
        <PulseKPICard
          title="SoMe Eng. Rate"
          value={someEngRate}
          valueType="pct"
          previous={pSomeEngRate}
          subtitle="engagements / impressions"
        />
        <PulseKPICard
          title="Email Open Rate"
          value={emailOpenRate}
          valueType="pct"
          previous={pEmailOpenRate}
          subtitle="opens / sends"
        />
        <PulseKPICard
          title="Email Click Rate"
          value={emailClickRate}
          valueType="pct"
          previous={pEmailClickRate}
          subtitle="clicks / sends"
        />
        <PulseKPICard
          title="Engaged Session Rate"
          value={engSessionRate}
          valueType="pct"
          previous={pEngSessionRate}
          subtitle="GA4 engaged / sessions"
        />
        <div className="col-span-2">
          <PulseKPICard
            title="MyPalsgaard Activity"
            comingSoon
            subtitle="Portal sessions — integration pending"
          />
        </div>
      </div>
    </div>
  );
}