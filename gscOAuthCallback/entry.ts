import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const { code, redirect_uri, site_url } = await req.json();
    if (!code) return Response.json({ error: "Missing authorization code" }, { status: 400 });

    const clientId = Deno.env.get("GSC_CLIENT_ID");
    const clientSecret = Deno.env.get("GSC_CLIENT_SECRET");

    // Exchange code for tokens
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri,
        grant_type: "authorization_code",
      }),
    });

    const tokens = await tokenRes.json();
    if (!tokens.refresh_token) {
      return Response.json({
        error: "No refresh_token returned. Make sure you used prompt=consent.",
        details: tokens
      }, { status: 400 });
    }

    // Fetch list of verified sites from Search Console
    const sitesRes = await fetch("https://www.googleapis.com/webmasters/v3/sites", {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });
    const sitesData = await sitesRes.json();
    const sites = (sitesData.siteEntry || []).map((s) => s.siteUrl);
    const resolvedSiteUrl = site_url || sites[0] || "";

    const config = JSON.stringify({
      refresh_token: tokens.refresh_token,
      site_url: resolvedSiteUrl,
    });

    // Upsert a DataSourceConnection record for Google Search Console
    const allConns = await base44.asServiceRole.entities.DataSourceConnection.list();
    const gscRecord = allConns.find((r) => r.source_system === "Google Search Console");

    if (gscRecord) {
      await base44.asServiceRole.entities.DataSourceConnection.update(gscRecord.id, {
        config,
        status: "Connected",
        last_success_at: new Date().toISOString(),
        last_error_message: null,
      });
    } else {
      await base44.asServiceRole.entities.DataSourceConnection.create({
        source_system: "Google Search Console",
        status: "Connected",
        config,
        last_success_at: new Date().toISOString(),
        freshness_sla_hours: 168,
      });
    }

    return Response.json({ success: true, sites, site_url: resolvedSiteUrl });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});