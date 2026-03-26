import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

const AD_ACCOUNT_URN = "urn:li:sponsoredAccount:503177178";
const ORG_URN = "urn:li:organization:2414183";

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { accessToken } = await base44.asServiceRole.connectors.getConnection("linkedin");

    const h = { Authorization: `Bearer ${accessToken}` };

    // Try versioned REST API (202304) for adAnalytics
    const restHeaders = { ...h, 'LinkedIn-Version': '202503', 'X-Restli-Protocol-Version': '2.0.0' };

    const restAnalyticsRes = await fetch(
      `https://api.linkedin.com/rest/adAnalytics?q=analytics&pivot=ACCOUNT&dateRange=(start:(year:2026,month:1,day:1),end:(year:2026,month:3,day:25))&timeGranularity=MONTHLY&accounts=List(${encodeURIComponent(AD_ACCOUNT_URN)})`,
      { headers: restHeaders }
    );
    const v2AccountData = { status: restAnalyticsRes.status, body: await restAnalyticsRes.json().catch(e => e.message) };

    // Also try listing ad accounts to see what's accessible
    const adAccountsRes = await fetch(
      `https://api.linkedin.com/rest/adAccounts?q=search&search=(type:(values:List(BUSINESS)))`,
      { headers: restHeaders }
    );
    const adAccountsData = { status: adAccountsRes.status, body: await adAccountsRes.json().catch(e => e.message) };

    // Try organizationPageStatistics with MONTH granularity for organic
    // timeRange: Jan 1 2026 to Mar 25 2026 in epoch ms
    const orgStatsMonthly = await fetch(
      `https://api.linkedin.com/v2/organizationPageStatistics?q=organization&organization=${encodeURIComponent(ORG_URN)}&timeIntervals.timeGranularityType=MONTH&timeIntervals.timeRange.start=1735689600000&timeIntervals.timeRange.end=1742860800000`,
      { headers: h }
    );
    const orgStatsData = await orgStatsMonthly.json();
    // Extract just impressions/views summary per period
    const organicSummary = orgStatsData.elements?.map(el => ({
      timeRange: el.timeRange,
      uniqueImpressionsCount: el.totalPageStatistics?.impressions?.uniqueImpressionsCount,
      pageViews: el.totalPageStatistics?.views?.allPageViews?.pageViews,
    }));

    return Response.json({ restAnalytics: v2AccountData, adAccounts: adAccountsData, organicSummary, organicStatus: orgStatsMonthly.status });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});