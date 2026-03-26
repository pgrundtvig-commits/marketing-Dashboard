import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

const AD_ACCOUNT_URN = "urn:li:sponsoredAccount:503177178";

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const { campaign_id, start_date, end_date } = body;
    if (!campaign_id) return Response.json({ error: 'campaign_id is required' }, { status: 400 });

    const { accessToken } = await base44.asServiceRole.connectors.getConnection("linkedin");

    const end = end_date ? new Date(end_date) : new Date();
    const start = start_date ? new Date(start_date) : new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Fetch all active campaigns under the account
    const campaignsRes = await fetch(
      `https://api.linkedin.com/v2/adCampaignsV2?q=search&search.account.values[0]=${encodeURIComponent(AD_ACCOUNT_URN)}&search.status.values[0]=ACTIVE&count=50`,
      { headers: { Authorization: `Bearer ${accessToken}`, 'LinkedIn-Version': '202304' } }
    );
    if (!campaignsRes.ok) {
      return Response.json({ error: 'Failed to fetch campaigns', details: await campaignsRes.text() }, { status: 502 });
    }
    const campaignsData = await campaignsRes.json();
    const liCampaigns = campaignsData.elements || [];
    if (liCampaigns.length === 0) {
      return Response.json({ success: true, synced: 0, message: 'No active campaigns found' });
    }

    const params = new URLSearchParams({
      q: "analytics",
      pivot: "CAMPAIGN",
      dateRange_start_year: start.getFullYear(),
      dateRange_start_month: start.getMonth() + 1,
      dateRange_start_day: start.getDate(),
      dateRange_end_year: end.getFullYear(),
      dateRange_end_month: end.getMonth() + 1,
      dateRange_end_day: end.getDate(),
      timeGranularity: "DAILY",
      fields: "dateRange,impressions,clicks,totalEngagements,costInLocalCurrency,pivotValue",
    });
    liCampaigns.forEach((c, i) => {
      params.set(`campaigns[${i}]`, `urn:li:sponsoredCampaign:${c.id}`);
    });

    const analyticsRes = await fetch(
      `https://api.linkedin.com/v2/adAnalytics?${params.toString()}`,
      { headers: { Authorization: `Bearer ${accessToken}`, 'LinkedIn-Version': '202304' } }
    );
    if (!analyticsRes.ok) {
      return Response.json({ error: 'Failed to fetch ad analytics', details: await analyticsRes.text() }, { status: 502 });
    }

    const analyticsData = await analyticsRes.json();
    const elements = analyticsData.elements || [];

    const records = elements.map((el) => {
      const impressions = el.impressions || 0;
      const clicks = el.clicks || 0;
      const total_engagements = el.totalEngagements || 0;
      const spend = el.costInLocalCurrency ? parseFloat(el.costInLocalCurrency) : 0;
      const engagement_rate = impressions > 0 ? total_engagements / impressions : 0;
      const dr = el.dateRange?.start;
      const date = dr
        ? `${dr.year}-${String(dr.month).padStart(2, '0')}-${String(dr.day).padStart(2, '0')}`
        : new Date().toISOString().split('T')[0];
      const entity_urn = el.pivotValue || AD_ACCOUNT_URN;

      return {
        campaign_id,
        source: "paid_campaign",
        date,
        entity_urn,
        impressions,
        clicks,
        likes: 0,
        comments: 0,
        shares: 0,
        total_engagements,
        engagement_rate: Math.round(engagement_rate * 10000) / 10000,
        spend,
        synced_at: new Date().toISOString(),
      };
    });

    if (records.length > 0) {
      await base44.asServiceRole.entities.LinkedInMetric.bulkCreate(records);
    }

    const connections = await base44.asServiceRole.entities.DataSourceConnection.filter({ source_system: "LinkedIn" });
    if (connections.length > 0) {
      await base44.asServiceRole.entities.DataSourceConnection.update(connections[0].id, {
        status: "Connected",
        last_sync_at: new Date().toISOString(),
        last_success_at: new Date().toISOString(),
        last_error_message: null,
      });
    }

    return Response.json({ success: true, synced: records.length, li_campaigns_found: liCampaigns.length });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});