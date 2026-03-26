import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';
import { JWT } from 'npm:google-auth-library@9.6.3';

const GA4_API = "https://analyticsdata.googleapis.com/v1beta";
const KEY_EVENT_NAMES = ["generate_lead", "contact_form", "file_download", "ipaper_download", "faq_article_click"];

async function getAccessToken() {
  let raw = Deno.env.get("GA4_SERVICE_ACCOUNT_JSON") || "";
  raw = raw.trim();
  if (!raw.startsWith("{")) raw = "{" + raw;
  if (!raw.endsWith("}")) raw = raw + "}";
  const serviceAccount = JSON.parse(raw);
  const client = new JWT({
    email: serviceAccount.client_email,
    key: serviceAccount.private_key,
    scopes: ["https://www.googleapis.com/auth/analytics.readonly"],
  });
  const token = await client.getAccessToken();
  return token.token;
}

function formatDate(ga4DateStr) {
  return `${ga4DateStr.slice(0, 4)}-${ga4DateStr.slice(4, 6)}-${ga4DateStr.slice(6, 8)}`;
}

function mapChannelGroup(ga4Channel) {
  const map = {
    "Paid Search": "Paid Search",
    "Organic Search": "Website",
    "Organic Social": "LinkedIn Organic",
    "Paid Social": "LinkedIn Paid",
    "Email": "Email Campaigns",
    "Direct": "Website",
    "Referral": "Website",
    "Display": "Other",
    "Unassigned": "Other",
    "(none)": "Website",
  };
  return map[ga4Channel] || "Website";
}

const resolveCampaign = (mapLookup, name) => {
  if (!name || name === "(not set)" || name === "(none)") return "UNMAPPED";
  return mapLookup[name] || name;
};

async function ga4Fetch(accessToken, propertyId, body) {
  const res = await fetch(`${GA4_API}/properties/${propertyId}:runReport`, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`GA4 error ${res.status}: ${await res.text()}`);
  return res.json();
}

// POST body: { startDate: "YYYY-MM-DD", endDate: "YYYY-MM-DD" }
// Process one month-range per call to stay within CPU limits.
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (user?.role !== "admin") {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = req.method === "POST" ? await req.json().catch(() => ({})) : {};
    if (!body.startDate || !body.endDate) {
      return Response.json({ error: "startDate and endDate required (YYYY-MM-DD)" }, { status: 400 });
    }

    const propertyId = Deno.env.get("GA4_PROPERTY_ID");
    if (!propertyId) return Response.json({ error: "GA4_PROPERTY_ID not set" }, { status: 500 });

    const accessToken = await getAccessToken();

    // Load campaign map
    const campaignMaps = await base44.asServiceRole.entities.CampaignMap.filter({ source_system: "Google Analytics" });
    const mapLookup = {};
    (campaignMaps || []).forEach((m) => { mapLookup[m.external_campaign_key] = m.campaign_id; });

    const startDate = body.startDate;
    const endDate = body.endDate;

    // Pull A: Traffic + Engagement
    const reportA = await ga4Fetch(accessToken, propertyId, {
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
    });

    // Pull B: Key Events
    const reportB = await ga4Fetch(accessToken, propertyId, {
      dateRanges: [{ startDate, endDate }],
      dimensions: [
        { name: "date" },
        { name: "eventName" },
        { name: "sessionDefaultChannelGroup" },
        { name: "sessionCampaignName" },
        { name: "landingPagePlusQueryString" },
      ],
      metrics: [{ name: "keyEvents" }],
      dimensionFilter: {
        filter: {
          fieldName: "eventName",
          inListFilter: { values: KEY_EVENT_NAMES },
        },
      },
      limit: 100000,
    });

    const trafficRows = (reportA.rows || []).map((row) => {
      const [dateVal, channelGroup, campaignName, landingPage] = row.dimensionValues.map((d) => d.value);
      const [sessions, engagedSessions] = row.metricValues.map((m) => parseFloat(m.value) || 0);
      return {
        date: formatDate(dateVal),
        channel: mapChannelGroup(channelGroup),
        source_system: "Google Analytics",
        campaign_id: resolveCampaign(mapLookup, campaignName),
        asset_id: landingPage && landingPage !== "(not set)" ? landingPage.slice(0, 500) : null,
        sessions,
        engaged_sessions: engagedSessions,
        clicks: sessions,
        engagements: engagedSessions,
        impressions: null,
        spend_dkk: null,
      };
    });

    const keyEventRows = (reportB.rows || []).map((row) => {
      const [dateVal, eventName, channelGroup, campaignName, landingPage] = row.dimensionValues.map((d) => d.value);
      const [keyEventCount] = row.metricValues.map((m) => parseFloat(m.value) || 0);
      return {
        date: formatDate(dateVal),
        channel: mapChannelGroup(channelGroup),
        source_system: "Google Analytics",
        campaign_id: resolveCampaign(mapLookup, campaignName),
        asset_id: landingPage && landingPage !== "(not set)" ? landingPage.slice(0, 500) : null,
        key_event_name: KEY_EVENT_NAMES.includes(eventName) ? eventName : "other",
        key_event_count: keyEventCount,
      };
    });

    // Insert in batches of 500 to avoid payload limits
    const BATCH = 500;
    let trafficInserted = 0;
    for (let i = 0; i < trafficRows.length; i += BATCH) {
      await base44.asServiceRole.entities.ChannelMetricDaily.bulkCreate(trafficRows.slice(i, i + BATCH));
      trafficInserted += Math.min(BATCH, trafficRows.length - i);
    }

    let keyEventInserted = 0;
    for (let i = 0; i < keyEventRows.length; i += BATCH) {
      await base44.asServiceRole.entities.KeyEventDaily.bulkCreate(keyEventRows.slice(i, i + BATCH));
      keyEventInserted += Math.min(BATCH, keyEventRows.length - i);
    }

    return Response.json({
      traffic_rows: trafficInserted,
      key_event_rows: keyEventInserted,
      startDate,
      endDate,
    });
  } catch (error) {
    console.error("backfillGa4 error:", error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});