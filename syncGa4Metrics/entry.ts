import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';
import { JWT } from 'npm:google-auth-library@9.6.3';

const GA4_API = "https://analyticsdata.googleapis.com/v1beta";

const KEY_EVENT_NAMES = ["generate_lead", "contact_form", "file_download", "ipaper_download", "faq_article_click"];

async function getAccessToken() {
  let raw = Deno.env.get("GA4_SERVICE_ACCOUNT_JSON") || "";
  raw = raw.trim();
  if (!raw.startsWith("{")) raw = "{" + raw;
  if (!raw.endsWith("}")) raw = raw + "}";
  let serviceAccount;
  try {
    serviceAccount = JSON.parse(raw);
  } catch (e) {
    throw new Error(`Cannot parse GA4_SERVICE_ACCOUNT_JSON: ${e.message}. First 100 chars: ${raw.slice(0, 100)}`);
  }
  const client = new JWT({
    email: serviceAccount.client_email,
    key: serviceAccount.private_key,
    scopes: ["https://www.googleapis.com/auth/analytics.readonly"],
  });
  const token = await client.getAccessToken();
  return token.token;
}

function formatDate(ga4DateStr) {
  const s = ga4DateStr;
  return `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}`;
}

function mapChannelGroup(ga4Channel, campaignName) {
  const camp = (campaignName || "").toLowerCase();
  
  // UTM-based override — if campaign name contains platform signal, use it
  if (camp.includes("linkedin")) return ga4Channel.includes("Paid") ? "LinkedIn Paid" : "LinkedIn Organic";
  if (camp.includes("wechat") || camp.includes("we_chat")) return "WeChat";
  if (camp.includes("youtube") || camp.includes("yt_")) return "YouTube";
  
  // Fall back to GA4 channel group — but keep it generic
  const map = {
    "Paid Search": "Paid Search",
    "Organic Search": "Website (Inbound)",
    "Organic Social": "Social (Organic)",
    "Paid Social": "Social (Paid)",
    "Email": "Email Campaigns",
    "Direct": "Website (Inbound)",
    "Referral": "Website (Inbound)",
    "Display": "Display",
    "Unassigned": "Other",
    "(none)": "Website (Inbound)",
  };
  return map[ga4Channel] || "Other";
}

// Pull A: Daily sessions + engaged sessions by date / channel / campaign / landing page
async function fetchPullA(accessToken, propertyId, startDate, endDate) {
  const body = {
    dateRanges: [{ startDate, endDate }],
    dimensions: [
      { name: "date" },
      { name: "sessionDefaultChannelGroup" },
      { name: "sessionCampaignName" },
      { name: "landingPagePlusQueryString" },
    ],
    metrics: [
      { name: "sessions" },
      { name: "engagedSessions" },
      { name: "totalUsers" },
    ],
    limit: 100000,
  };
  const res = await fetch(`${GA4_API}/properties/${propertyId}:runReport`, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`GA4 Pull A error ${res.status}: ${await res.text()}`);
  return res.json();
}

// Pull B: Daily key events by event name / channel / campaign / landing page
async function fetchPullB(accessToken, propertyId, startDate, endDate) {
  const body = {
    dateRanges: [{ startDate, endDate }],
    dimensions: [
      { name: "date" },
      { name: "eventName" },
      { name: "sessionDefaultChannelGroup" },
      { name: "sessionCampaignName" },
      { name: "landingPagePlusQueryString" },
    ],
    metrics: [
      { name: "keyEvents" },
    ],
    dimensionFilter: {
      filter: {
        fieldName: "eventName",
        inListFilter: { values: KEY_EVENT_NAMES },
      },
    },
    limit: 100000,
  };
  const res = await fetch(`${GA4_API}/properties/${propertyId}:runReport`, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`GA4 Pull B error ${res.status}: ${await res.text()}`);
  return res.json();
}

async function updateConnectionStatus(base44, status, errorMsg) {
  try {
    const existing = await base44.asServiceRole.entities.DataSourceConnection.filter({ source_system: "Google Analytics" });
    const now = new Date().toISOString();
    const payload = {
      source_system: "Google Analytics",
      status,
      last_sync_at: now,
      ...(status === "Connected" ? { last_success_at: now, last_error_message: null } : { last_error_message: errorMsg }),
      freshness_sla_hours: 24,
    };
    if (existing && existing.length > 0) {
      await base44.asServiceRole.entities.DataSourceConnection.update(existing[0].id, payload);
    } else {
      await base44.asServiceRole.entities.DataSourceConnection.create(payload);
    }
  } catch (_) { /* non-fatal */ }
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    let user = null;
    try { user = await base44.auth.me(); } catch (_) { /* scheduled/unauthenticated */ }
    if (user && user.role !== "admin") {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }

    const propertyId = Deno.env.get("GA4_PROPERTY_ID");
    if (!propertyId) return Response.json({ error: "GA4_PROPERTY_ID not set" }, { status: 500 });

    const body = req.method === "POST" ? await req.json().catch(() => ({})) : {};
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const ymd = yesterday.toISOString().slice(0, 10);
    const startDate = body.startDate || ymd;
    const endDate = body.endDate || ymd;

    const accessToken = await getAccessToken();

    // Store campaign names exactly as reported by GA4 — no mapping override
    const resolveCampaign = (name) => {
      if (!name || name === "(not set)" || name === "(none)") return "(not set)";
      return name;
    };

    // --- Pull A: Traffic + Engagement → ChannelMetricDaily ---
     const reportA = await fetchPullA(accessToken, propertyId, startDate, endDate);
     const trafficRows = (reportA.rows || []).map((row) => {
       const [dateVal, channelGroup, campaignName, landingPage] = row.dimensionValues.map((d) => d.value);
       const [sessions, engagedSessions, totalUsers] = row.metricValues.map((m) => parseFloat(m.value) || 0);
       return {
         date: formatDate(dateVal),
         channel: mapChannelGroup(channelGroup, campaignName),
         source_system: "Google Analytics",
         campaign_id: resolveCampaign(campaignName),
         asset_id: landingPage && landingPage !== "(not set)" ? landingPage.slice(0, 500) : null,
         sessions,
         engaged_sessions: engagedSessions,
         // Map website traffic to dashboard-compatible fields:
         clicks: sessions,         // "traffic action"
         engagements: engagedSessions, // "engagement action"
         impressions: null,
         spend_dkk: null,
       };
     });

    // --- Pull B: Key Events → KeyEventDaily ---
     const reportB = await fetchPullB(accessToken, propertyId, startDate, endDate);
     const keyEventRows = (reportB.rows || []).map((row) => {
       const [dateVal, eventName, channelGroup, campaignName, landingPage] = row.dimensionValues.map((d) => d.value);
       const [keyEventCount] = row.metricValues.map((m) => parseFloat(m.value) || 0);
       const normalizedEvent = KEY_EVENT_NAMES.includes(eventName) ? eventName : "other";
       return {
         date: formatDate(dateVal),
         channel: mapChannelGroup(channelGroup, campaignName),
         source_system: "Google Analytics",
         campaign_id: resolveCampaign(campaignName),
         asset_id: landingPage && landingPage !== "(not set)" ? landingPage.slice(0, 500) : null,
         key_event_name: normalizedEvent,
         key_event_count: keyEventCount,
       };
     });

    // Bulk insert both
    if (trafficRows.length > 0) {
      await base44.asServiceRole.entities.ChannelMetricDaily.bulkCreate(trafficRows);
    }
    if (keyEventRows.length > 0) {
      await base44.asServiceRole.entities.KeyEventDaily.bulkCreate(keyEventRows);
    }

    await updateConnectionStatus(base44, "Connected", null);

    return Response.json({
      traffic_rows: trafficRows.length,
      key_event_rows: keyEventRows.length,
      startDate,
      endDate,
    });
  } catch (error) {
    console.error("GA4 sync error:", error.message);
    try {
      const base44 = createClientFromRequest(req);
      await updateConnectionStatus(base44, "Error", error.message);
    } catch (_) { /* ignore */ }
    return Response.json({ error: error.message }, { status: 500 });
  }
});