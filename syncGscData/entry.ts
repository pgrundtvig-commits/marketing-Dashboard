import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

async function getAccessToken(refreshToken) {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: Deno.env.get("GSC_CLIENT_ID"),
      client_secret: Deno.env.get("GSC_CLIENT_SECRET"),
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });
  const data = await res.json();
  if (!data.access_token) throw new Error("Failed to refresh GSC token: " + JSON.stringify(data));
  return data.access_token;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Allow scheduled automations (no user session) OR admin users
    const user = await base44.auth.me().catch(() => null);
    if (user !== null && user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { startDate, endDate, rowLimit = 1000 } = await req.json().catch(() => ({}));

    // Load GSC config — prefer DB-stored token (from OAuth flow), fall back to secret
    const allConnsEarly = await base44.asServiceRole.entities.DataSourceConnection.list();
    const gscRecord2 = allConnsEarly.find((r) => r.source_system === "Google Search Console");

    let refresh_token, site_url;
    if (gscRecord2?.config) {
      try {
        const cfg = JSON.parse(gscRecord2.config);
        refresh_token = cfg.refresh_token;
        site_url = cfg.site_url;
      } catch (_) {}
    }
    // Fall back to secrets
    if (!refresh_token) refresh_token = Deno.env.get("GSC_REFRESH_TOKEN");
    if (!site_url) site_url = Deno.env.get("GSC_SITE_URL");

    if (!refresh_token || !site_url) return Response.json({ error: "GSC_REFRESH_TOKEN or GSC_SITE_URL not configured." }, { status: 400 });

    const accessToken = await getAccessToken(refresh_token);

    // Find connection record for status tracking
    const gscRecord = gscRecord2 || null;

    const end = endDate || new Date().toISOString().slice(0, 10);
    const startD = startDate || (() => { const d = new Date(); d.setDate(d.getDate() - 90); return d.toISOString().slice(0, 10); })();

    // Fetch query data (keywords) from Search Console
    const queryRes = await fetch(
      `https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(site_url)}/searchAnalytics/query`,
      {
        method: "POST",
        headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          startDate: startD,
          endDate: end,
          dimensions: ["date", "query", "page"],
          rowLimit,
        }),
      }
    );
    const queryData = await queryRes.json();

    if (queryData.error) throw new Error(JSON.stringify(queryData.error));

    const rows = (queryData.rows || []).map((r) => ({
      date: r.keys[0],
      query: r.keys[1],
      page: r.keys[2],
      clicks: r.clicks,
      impressions: r.impressions,
      ctr: r.ctr,
      position: r.position,
    }));

    // Upsert into SearchConsoleMetric entity
    if (rows.length > 0) {
      // Clear old data for the date range (more efficient filtered query)
      const toDelete = await base44.asServiceRole.entities.SearchConsoleMetric.filter({
        date: { $gte: startD, $lte: end }
      });
      const BATCH = 50;
      for (let i = 0; i < toDelete.length; i += BATCH) {
        await Promise.all(toDelete.slice(i, i + BATCH).map(rec =>
          base44.asServiceRole.entities.SearchConsoleMetric.delete(rec.id)
        ));
      }
      // Bulk insert in chunks of 500
      for (let i = 0; i < rows.length; i += 500) {
        await base44.asServiceRole.entities.SearchConsoleMetric.bulkCreate(rows.slice(i, i + 500));
      }
    }

    // Update connection status
    if (gscRecord) {
      await base44.asServiceRole.entities.DataSourceConnection.update(gscRecord.id, {
        status: "Connected",
        last_success_at: new Date().toISOString(),
        last_sync_at: new Date().toISOString(),
      });
    }

    return Response.json({ success: true, rows_synced: rows.length, startDate: startD, endDate: end });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});