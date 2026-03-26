// Reusable KPI measures with divide-by-zero safety

export const safeDiv = (numerator, denominator) => {
  if (!denominator || denominator === 0) return null;
  return numerator / denominator;
};

export const calcCTR = (clicks, impressions) => safeDiv(clicks, impressions);
export const calcEngagementRate = (engagements, impressions) => safeDiv(engagements, impressions);
export const calcWebsiteEngagementRate = (engagedSessions, sessions) => safeDiv(engagedSessions, sessions);
export const calcCPL = (spend, totalLeads) => safeDiv(spend, totalLeads);
export const calcCPQL = (spend, qualifiedLeads) => safeDiv(spend, qualifiedLeads);
export const calcBudgetUsedPct = (actual, planned) => safeDiv(actual, planned);

export const getQualifiedLeads = (leads) =>
  leads.filter((l) => l.lead_grade === "A" || l.lead_grade === "B");

export const formatDKK = (val) => {
  if (val === null || val === undefined) return "—";
  return new Intl.NumberFormat("da-DK", {
    style: "currency",
    currency: "DKK",
    maximumFractionDigits: 0,
  }).format(val);
};

export const formatPct = (val) => {
  if (val === null || val === undefined) return "—";
  return (val * 100).toFixed(1) + "%";
};

export const formatNum = (val) => {
  if (val === null || val === undefined) return "—";
  return new Intl.NumberFormat("da-DK").format(Math.round(val));
};

export const CHANNELS = [
  "LinkedIn Paid",
  "LinkedIn Organic",
  "Paid Search",
  "Website",
  "Email Campaigns",
  "Webinars",
  "Events",
  "Trade Media/PR",
  "Partner/Distributor",
  "Other",
];

export const SOURCE_SYSTEMS = [
  "LinkedIn",
  "Google Analytics",
  "Google Ads",
  "365 CRM",
  "Manual",
  "CSV Import",
];

export const REGIONS = ["EMEA", "AMER", "ASPAC", "Global"];
export const LEAD_GRADES = ["A", "B", "C", "Unknown"];

export const GRADE_COLORS = {
  A: "#16a34a",
  B: "#2563eb",
  C: "#d97706",
  Unknown: "#9ca3af",
};

export const CHANNEL_COLORS = {
  "LinkedIn Paid": "#0077b5",
  "LinkedIn Organic": "#00a0dc",
  "Paid Search": "#ea4335",
  Website: "#34a853",
  "Email Campaigns": "#fbbc04",
  Webinars: "#9333ea",
  Events: "#f97316",
  "Trade Media/PR": "#6b7280",
  "Partner/Distributor": "#0ea5e9",
  Other: "#d1d5db",
};

export const getDateRange = (preset, customStart, customEnd) => {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  switch (preset) {
    case "7d": {
      const start = new Date(today); start.setDate(start.getDate() - 6);
      return { start, end: today };
    }
    case "30d": {
      const start = new Date(today); start.setDate(start.getDate() - 29);
      return { start, end: today };
    }
    case "QTD": {
      const q = Math.floor(now.getMonth() / 3);
      return { start: new Date(now.getFullYear(), q * 3, 1), end: today };
    }
    case "YTD":
      return { start: new Date(now.getFullYear(), 0, 1), end: today };
    case "custom":
      return {
        start: customStart ? new Date(customStart) : today,
        end: customEnd ? new Date(customEnd) : today,
      };
    default: {
      const start = new Date(today); start.setDate(start.getDate() - 29);
      return { start, end: today };
    }
  }
};

export const getPreviousPeriod = (start, end) => {
  const diff = end - start;
  const prevEnd = new Date(start.getTime() - 1);
  const prevStart = new Date(prevEnd.getTime() - diff);
  return { start: prevStart, end: prevEnd };
};

// Shift a date range back exactly one year
export const getYoYPeriod = (start, end) => {
  const s = new Date(start);
  const e = new Date(end);
  s.setFullYear(s.getFullYear() - 1);
  e.setFullYear(e.getFullYear() - 1);
  return { start: s, end: e };
};

export const inDateRange = (dateStr, start, end) => {
  if (!dateStr) return false;
  const d = new Date(dateStr);
  return d >= start && d <= end;
};

export const deltaLabel = (current, previous) => {
  if (previous === null || previous === undefined || previous === 0) return null;
  return ((current - previous) / Math.abs(previous)) * 100;
};