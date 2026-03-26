import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const clientId = Deno.env.get("GSC_CLIENT_ID");
    if (!clientId) {
      return Response.json({ error: "GSC_CLIENT_ID not set" }, { status: 500 });
    }

    const finalRedirectUri = "https://palsgaard-marketing-kpi.base44.app/Settings";

    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: finalRedirectUri,
      response_type: "code",
      scope: "https://www.googleapis.com/auth/webmasters.readonly",
      access_type: "offline",
      prompt: "consent",
    });

    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params}`;

    return Response.json({ auth_url: authUrl, redirect_uri: finalRedirectUri });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});