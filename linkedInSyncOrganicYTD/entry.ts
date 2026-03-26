import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

const ORG_URN = "urn:li:organization:2414183";
const AD_ACCOUNT_URN = "urn:li:sponsoredAccount:503177178";
const LI_VERSION = '202503';

const YTD_START_MS = new Date('2026-01-01').getTime();

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { accessToken } = await base44.asServiceRole.connectors.getConnection("linkedin");

    const body = await req.json().catch(() => ({}));
    const campaign_id = body.campaign_id || "UNMAPPED";

    const endMs = Date.now();
    const headers = { Authorization: `Bearer ${accessToken}`, 'LinkedIn-Version': LI_VERSION, 'X-Restli-Protocol-Version': '2.0.0' };

    // ── ORGANIC: organizationPageStatistics DAY granularity YTD ──────────
    // Note: v2 org stats endpoint does not accept LinkedIn-Version header
    const statsRes = await fetch(
      `https://api.linkedin.com/v2/organizationPageStatistics?q=organization&organization=${encodeURIComponent(ORG_URN)}&timeIntervals.timeGranularityType=DAY&timeIntervals.timeRange.start=${YTD_START_MS}&timeIntervals.timeRange.end=${endMs}`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );

    let organicSynced = 0;
    if (statsRes.ok) {
      const statsData = await statsRes.json();
      const elements = statsData.elements || [];
      const records = [];

      for (const el of elements) {
        const periodStartMs = el.timeRange?.start;
        if (!periodStartMs) continue;

        const date = new Date(periodStartMs).toISOString().split('T')[0];
        const pageViews = el.totalPageStatistics?.views?.allPageViews?.pageViews || 0;
        const impressions = el.totalPageStatistics?.impressions?.uniqueImpressionsCount || pageViews;
        const clicks = (
          (el.totalPageStatistics?.clicks?.mobileCustomButtonClickCounts?.reduce((s, c) => s + (c.clicks || 0), 0) || 0) +
          (el.totalPageStatistics?.clicks?.desktopCustomButtonClickCounts?.reduce((s, c) => s + (c.clicks || 0), 0) || 0)
        );

        records.push({
          campaign_id,
          source: "organic_share",
          date,
          entity_urn: ORG_URN,
          impressions,
          clicks,
          likes: 0, comments: 0, shares: 0, total_engagements: 0,
          engagement_rate: impressions > 0 ? Math.round((clicks / impressions) * 10000) / 10000 : 0,
          spend: 0,
          synced_at: new Date().toISOString(),
        });
      }

      if (records.length > 0) {
        await base44.asServiceRole.entities.LinkedInMetric.bulkCreate(records);
        organicSynced = records.length;
      }
    }

    // ── PAID: adAnalytics DAY granularity YTD ────────────────────────────
    const paidRes = await fetch(
      `https://api.linkedin.com/rest/adAnalytics?q=analytics&pivot=ACCOUNT&dateRange=(start:(year:2026,month:1,day:1),end:(year:2026,month:3,day:31))&timeGranularity=DAILY&accounts=List(${encodeURIComponent(AD_ACCOUNT_URN)})`,
      { headers }
    );

    let paidSynced = 0;
    if (paidRes.ok) {
      const paidData = await paidRes.json();
      const paidElements = paidData.elements || [];
      const paidRecords = [];

      for (const el of paidElements) {
        const dr = el.dateRange?.start;
        if (!dr) continue;
        const date = `${dr.year}-${String(dr.month).padStart(2, '0')}-${String(dr.day).padStart(2, '0')}`;
        const impressions = el.impressions || 0;
        const clicks = el.clicks || 0;
        const engagements = el.totalEngagements || 0;

        paidRecords.push({
          campaign_id,
          source: "paid_campaign",
          date,
          entity_urn: AD_ACCOUNT_URN,
          impressions,
          clicks,
          likes: 0, comments: 0, shares: 0,
          total_engagements: engagements,
          engagement_rate: impressions > 0 ? Math.round((engagements / impressions) * 10000) / 10000 : 0,
          spend: el.costInLocalCurrency ? parseFloat(el.costInLocalCurrency) : 0,
          synced_at: new Date().toISOString(),
        });
      }

      if (paidRecords.length > 0) {
        await base44.asServiceRole.entities.LinkedInMetric.bulkCreate(paidRecords);
        paidSynced = paidRecords.length;
      }
    } else {
      const errText = await paidRes.text();
      console.error("Paid ads fetch failed:", paidRes.status, errText);
    }

    // Update DataSourceConnection
    const connections = await base44.asServiceRole.entities.DataSourceConnection.filter({ source_system: "LinkedIn" });
    if (connections.length > 0) {
      await base44.asServiceRole.entities.DataSourceConnection.update(connections[0].id, {
        status: "Connected",
        last_sync_at: new Date().toISOString(),
        last_success_at: new Date().toISOString(),
        last_error_message: null,
      });
    }

    return Response.json({ success: true, organic_synced: organicSynced, paid_synced: paidSynced });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});