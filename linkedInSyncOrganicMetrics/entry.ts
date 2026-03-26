import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

// Palsgaard LinkedIn Organization URN — update if needed
const ORG_URN = "urn:li:organization:2414183";

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const { campaign_id, start_date, end_date } = body;

    if (!campaign_id) return Response.json({ error: 'campaign_id is required' }, { status: 400 });

    const { accessToken } = await base44.asServiceRole.connectors.getConnection("linkedin");

    // Date range defaults: last 30 days
    const end = end_date ? new Date(end_date) : new Date();
    const start = start_date ? new Date(start_date) : new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000);

    const startMs = start.getTime();
    const endMs = end.getTime();

    // Fetch organic posts (shares) for the org
    const postsRes = await fetch(
      `https://api.linkedin.com/v2/shares?q=owners&owners=${encodeURIComponent(ORG_URN)}&sharesPerOwner=50&count=50`,
      { headers: { Authorization: `Bearer ${accessToken}`, 'LinkedIn-Version': '202304' } }
    );
    if (!postsRes.ok) {
      const err = await postsRes.text();
      return Response.json({ error: 'Failed to fetch posts', details: err }, { status: 502 });
    }
    const postsData = await postsRes.json();
    const shares = postsData.elements || [];

    const records = [];

    for (const share of shares) {
      const shareUrn = share.activity || share.id;
      if (!shareUrn) continue;

      // Fetch statistics for this share
      const statsRes = await fetch(
        `https://api.linkedin.com/v2/organizationalEntityShareStatistics?q=organizationalEntity&organizationalEntity=${encodeURIComponent(ORG_URN)}&shares[0]=${encodeURIComponent(shareUrn)}`,
        { headers: { Authorization: `Bearer ${accessToken}`, 'LinkedIn-Version': '202304' } }
      );
      if (!statsRes.ok) continue;
      const statsData = await statsRes.json();
      const stat = statsData.elements?.[0]?.totalShareStatistics;
      if (!stat) continue;

      const impressions = stat.impressionCount || 0;
      const clicks = stat.clickCount || 0;
      const likes = stat.likeCount || 0;
      const comments = stat.commentCount || 0;
      const shares_count = stat.shareCount || 0;
      const engagement_rate = impressions > 0
        ? (clicks + likes + comments + shares_count) / impressions
        : 0;

      records.push({
        campaign_id,
        source: "organic_share",
        date: new Date().toISOString().split('T')[0],
        entity_urn: shareUrn,
        impressions,
        clicks,
        likes,
        comments,
        shares: shares_count,
        total_engagements: 0,
        engagement_rate: Math.round(engagement_rate * 10000) / 10000,
        spend: 0,
        synced_at: new Date().toISOString(),
      });
    }

    if (records.length > 0) {
      await base44.asServiceRole.entities.LinkedInMetric.bulkCreate(records);
    }

    // Update DataSourceConnection status
    const connections = await base44.asServiceRole.entities.DataSourceConnection.filter({ source_system: "LinkedIn" });
    if (connections.length > 0) {
      await base44.asServiceRole.entities.DataSourceConnection.update(connections[0].id, {
        status: "Connected",
        last_sync_at: new Date().toISOString(),
        last_success_at: new Date().toISOString(),
        last_error_message: null,
      });
    }

    return Response.json({ success: true, synced: records.length, message: `Synced ${records.length} organic post(s)` });
  } catch (error) {
    // Try to log error to DataSourceConnection
    try {
      const base44 = createClientFromRequest(req);
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