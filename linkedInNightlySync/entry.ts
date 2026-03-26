import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

const ORG_URN = "urn:li:organization:2414183";
const AD_ACCOUNT_URN = "urn:li:sponsoredAccount:503177178";
const LI_VERSION = '202503';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const errors = [];

  try {
    const { accessToken } = await base44.asServiceRole.connectors.getConnection("linkedin");

    // Sync window: yesterday
    const yesterday = new Date();
    yesterday.setUTCDate(yesterday.getUTCDate() - 1);
    yesterday.setUTCHours(0, 0, 0, 0);
    const dateStr = yesterday.toISOString().split('T')[0];
    const startMs = yesterday.getTime();
    const endMs = startMs + 86400000; // +1 day

    const headers = { Authorization: `Bearer ${accessToken}`, 'LinkedIn-Version': LI_VERSION, 'X-Restli-Protocol-Version': '2.0.0' };

    // ── ORGANIC: organizationPageStatistics (DAY granularity) ─────────────
    // Note: v2 org stats endpoint does not accept LinkedIn-Version header
    const statsRes = await fetch(
      `https://api.linkedin.com/v2/organizationPageStatistics?q=organization&organization=${encodeURIComponent(ORG_URN)}&timeIntervals.timeGranularityType=DAY&timeIntervals.timeRange.start=${startMs}&timeIntervals.timeRange.end=${endMs}`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );

    let totalOrganic = 0;

    if (statsRes.ok) {
      const statsData = await statsRes.json();
      const elements = statsData.elements || [];
      const organicRecords = [];

      for (const el of elements) {
        const pageViews = el.totalPageStatistics?.views?.allPageViews?.pageViews || 0;
        const impressions = el.totalPageStatistics?.impressions?.uniqueImpressionsCount || pageViews;
        const clicks = (
          (el.totalPageStatistics?.clicks?.mobileCustomButtonClickCounts?.reduce((s, c) => s + (c.clicks || 0), 0) || 0) +
          (el.totalPageStatistics?.clicks?.desktopCustomButtonClickCounts?.reduce((s, c) => s + (c.clicks || 0), 0) || 0)
        );

        const ts = el.timeRange?.start;
        const date = ts ? new Date(ts).toISOString().split('T')[0] : dateStr;

        organicRecords.push({
          campaign_id: "UNMAPPED",
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

      if (organicRecords.length > 0) {
        await base44.asServiceRole.entities.LinkedInMetric.bulkCreate(organicRecords);
        totalOrganic = organicRecords.length;
      }
    } else {
      errors.push("Organic fetch failed: " + await statsRes.text());
    }

    // ── PAID: adAnalytics (DAY granularity) ───────────────────────────────
    const d = yesterday;
    const paidRes = await fetch(
      `https://api.linkedin.com/rest/adAnalytics?q=analytics&pivot=ACCOUNT&dateRange=(start:(year:${d.getUTCFullYear()},month:${d.getUTCMonth()+1},day:${d.getUTCDate()}),end:(year:${d.getUTCFullYear()},month:${d.getUTCMonth()+1},day:${d.getUTCDate()}))&timeGranularity=DAILY&accounts=List(${encodeURIComponent(AD_ACCOUNT_URN)})`,
      { headers }
    );

    let totalPaid = 0;
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
          campaign_id: "UNMAPPED",
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
        totalPaid = paidRecords.length;
      }
    } else {
      errors.push("Paid fetch failed: " + await paidRes.text());
    }

    // ── Update DataSourceConnection ────────────────────────────────────────
    const connections = await base44.asServiceRole.entities.DataSourceConnection.filter({ source_system: "LinkedIn" });
    if (connections.length > 0) {
      const hasErrors = errors.length > 0;
      await base44.asServiceRole.entities.DataSourceConnection.update(connections[0].id, {
        status: hasErrors ? "Error" : "Connected",
        last_sync_at: new Date().toISOString(),
        last_success_at: hasErrors ? connections[0].last_success_at : new Date().toISOString(),
        last_error_message: hasErrors ? errors.join("; ") : null,
      });
    }

    return Response.json({
      success: true,
      date: dateStr,
      organic_synced: totalOrganic,
      paid_synced: totalPaid,
      errors,
    });
  } catch (error) {
    try {
      const connections = await base44.asServiceRole.entities.DataSourceConnection.filter({ source_system: "LinkedIn" });
      if (connections.length > 0) {
        await base44.asServiceRole.entities.DataSourceConnection.update(connections[0].id, {
          status: "Error",
          last_sync_at: new Date().toISOString(),
          last_error_message: error.message,
        });
      }
    } catch (_) {}
    return Response.json({ error: error.message }, { status: 500 });
  }
});