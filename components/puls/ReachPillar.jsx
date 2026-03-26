import PulseKPICard from "./PulseKPICard";

export default function ReachPillar({ data }) {
  const { impressions, pImpressions, reach, pReach, sessions, pSessions, brandedClicks, pBrandedClicks, brandedImpressions, pBrandedImpressions } = data;

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-50" style={{ background: "linear-gradient(135deg, #1a2e4a 0%, #2a4570 100%)" }}>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-blue-300" />
          <h2 className="text-sm font-bold text-white uppercase tracking-widest">Brand Reach</h2>
        </div>
        <p className="text-xs mt-0.5" style={{ color: "#a8c5d6" }}>Impressions · Reach · Web · Branded Search</p>
      </div>
      <div className="p-4 grid grid-cols-2 gap-3">
        <PulseKPICard
          title="Impressions"
          value={impressions}
          previous={pImpressions}
          subtitle="All channels"
        />
        <PulseKPICard
          title="Unique Reach"
          value={reach || null}
          previous={pReach}
          subtitle="Paid reach"
        />
        <PulseKPICard
          title="Web Sessions"
          value={sessions}
          previous={pSessions}
          subtitle="GA4"
        />
        <PulseKPICard
          title="Follower Growth"
          comingSoon
          subtitle="LinkedIn / YouTube / WeChat"
        />
        <PulseKPICard
          title="Branded Clicks"
          value={brandedClicks}
          previous={pBrandedClicks}
          subtitle="GSC branded search"
        />
        <PulseKPICard
          title="Branded Impressions"
          value={brandedImpressions}
          previous={pBrandedImpressions}
          subtitle="GSC branded search"
        />
      </div>
    </div>
  );
}