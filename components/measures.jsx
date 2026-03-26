// Reusable KPI calculation measures

export const safe = (num, den) => (!den || den === 0 ? null : num / den);

export const calcCTR = (clicks, impressions) => safe(clicks, impressions);
export const calcEngRate = (engagements, impressions) => safe(engagements, impressions);
export const calcCPL = (spend, leads) => safe(spend, leads);
export const calcCPQL = (spend, qualifiedLeads) => safe(spend, qualifiedLeads);
export const calcBudgetUsed = (actual, planned) => safe(actual, planned);

export const isQualified = (grade) => grade === "A" || grade === "B";

export const formatDKK = (val) => {
  if (val === null || val === undefined) return "—";
  return new Intl.NumberFormat("da-DK", { style: "currency", currency: "DKK", maximumFractionDigits: 0 }).format(val);
};

export const formatNum = (val, decimals = 0) => {
  if (val === null || val === undefined) return "—";
  return new Intl.NumberFormat("da-DK", { maximumFractionDigits: decimals }).format(val);
};

export const formatPct = (val) => {
  if (val === null || val === undefined) return "—";
  return (val * 100).toFixed(1) + "%";
};

export const deltaLabel = (current, previous) => {
  if (!previous || previous === 0) return null;
  const delta = ((current - previous) / previous) * 100;
  return { value: delta.toFixed(1), positive: delta >= 0 };
};

export const CHANNELS = [
  "LinkedIn Paid","LinkedIn Organic","Paid Search","Website",
  "Email Campaigns","Webinars","Events","Trade Media/PR","Partner/Distributor","Other"
];

export const REGIONS = ["EMEA","AMER","ASPAC","Global"];
export const LEAD_GRADES = ["A","B","C","Unknown"];
export const SOURCE_SYSTEMS = ["LinkedIn","Google Analytics","Google Ads","365 CRM","Manual","CSV Import"];

export const GRADE_COLORS = { A: "#22c55e", B: "#86efac", C: "#fbbf24", Unknown: "#94a3b8" };

export const getDateRange = (preset) => {
  const now = new Date();
  const end = now.toISOString().split("T")[0];
  let start;
  switch (preset) {
    case "7d": start = new Date(now - 7 * 864e5).toISOString().split("T")[0]; break;
    case "30d": start = new Date(now - 30 * 864e5).toISOString().split("T")[0]; break;
    case "QTD": {
      const q = Math.floor(now.getMonth() / 3);
      start = new Date(now.getFullYear(), q * 3, 1).toISOString().split("T")[0];
      break;
    }
    case "YTD": start = `${now.getFullYear()}-01-01`; break;
    default: start = new Date(now - 30 * 864e5).toISOString().split("T")[0];
  }
  return { start, end };
};

export const getPreviousPeriod = (start, end) => {
  const s = new Date(start), e = new Date(end);
  const diff = e - s;
  return {
    start: new Date(s - diff - 864e5).toISOString().split("T")[0],
    end: new Date(s - 864e5).toISOString().split("T")[0]
  };
};

export const inRange = (dateStr, start, end) => dateStr >= start && dateStr <= end;

export const applyFilters = (records, filters, dateField = "date") => {
  return records.filter(r => {
    if (filters.dateStart && filters.dateEnd) {
      const d = r[dateField];
      if (d && !inRange(d, filters.dateStart, filters.dateEnd)) return false;
    }
    if (filters.channel && filters.channel !== "all" && r.channel !== filters.channel) return false;
    if (filters.campaign && filters.campaign !== "all" && r.campaign_id !== filters.campaign) return false;
    if (filters.region && filters.region !== "all" && r.region !== filters.region) return false;
    return true;
  });
};

export const aggregateMetrics = (records) => {
  return records.reduce((acc, r) => {
    acc.impressions += r.impressions || 0;
    acc.clicks += r.clicks || 0;
    acc.engagements += r.engagements || 0;
    acc.spend_dkk += r.spend_dkk || 0;
    return acc;
  }, { impressions: 0, clicks: 0, engagements: 0, spend_dkk: 0 });
};