import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

// This function acts as the OAuth redirect_uri — Google calls it directly with the code.
// Uses asServiceRole so no user session is needed.
Deno.serve(async (req) => {
  try {
    const url = new URL(req.url);
    const code = url.searchParams.get("code");
    const error = url.searchParams.get("error");

    if (error) {
      return Response.redirect("https://palsgaard-marketing-kpi.base44.app/Settings?gsc_error=" + encodeURIComponent(error), 302);
    }

    if (!code) {
      return Response.redirect("https://palsgaard-marketing-kpi.base44.app/Settings?gsc_error=no_code", 302);
    }

    const clientId = Deno.env.get("GSC_CLIENT_ID");
    const clientSecret = Deno.env.get("GSC_CLIENT_SECRET");
    const redirectUri = "https://palsgaard-marketing-kpi.base44.app/api/apps/69a6e9ed1b1260c91da32cec/functions/gscOAuthCallbackRedirect";

    // Exchange code for tokens
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }),
    });

    const tokens = await tokenRes.json();
    if (!tokens.refresh_token) {
      const errMsg = tokens.error_description || tokens.error || "No refresh_token returned. Try again.";
      return Response.redirect("https://palsgaard-marketing-kpi.base44.app/Settings?gsc_error=" + encodeURIComponent(errMsg), 302);
    }

    // Fetch list of verified sites
    const sitesRes = await fetch("https://www.googleapis.com/webmasters/v3/sites", {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });
    const sitesData = await sitesRes.json();
    const sites = (sitesData.siteEntry || []).map((s) => s.siteUrl);
    const resolvedSiteUrl = sites[0] || Deno.env.get("GSC_SITE_URL") || "";

    const config = JSON.stringify({
      refresh_token: tokens.refresh_token,
      site_url: resolvedSiteUrl,
    });

    // Upsert DataSourceConnection using service role (no user auth needed)
    const base44 = createClientFromRequest(req);
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

    return Response.redirect("https://palsgaard-marketing-kpi.base44.app/Settings?gsc_success=1", 302);
  } catch (err) {
    return Response.redirect("https://palsgaard-marketing-kpi.base44.app/Settings?gsc_error=" + encodeURIComponent(err.message), 302);
  }
});