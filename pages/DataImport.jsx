import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Upload, Download, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";

const TEMPLATES = {
  channel_metrics: {
    label: "Channel Metrics",
    entity: "ChannelMetricDaily",
    cols: "date,channel,source_system,campaign_id,asset_id,impressions,clicks,engagements,spend_dkk,sessions,engaged_sessions,sends,opens,registrations,attendees",
    example: "2026-01-15,LinkedIn Paid,LinkedIn,my-campaign-name,,15000,420,890,12500,,,,,",
    note: "date required. channel must match allowed values. campaign_id = raw name from the source platform.",
    numFields: ["impressions","clicks","engagements","spend_dkk","sessions","engaged_sessions","sends","opens","registrations","attendees"],
    validate: (row) => {
      const errors = [];
      if (!row.date) errors.push("date required");
      if (row.spend_dkk !== undefined && row.spend_dkk !== "" && isNaN(parseFloat(row.spend_dkk))) errors.push("spend_dkk must be numeric");
      return errors;
    },
  },
  key_events: {
    label: "Key Events",
    entity: "KeyEventDaily",
    cols: "date,channel,source_system,campaign_id,asset_id,key_event_name,key_event_count",
    example: "2026-01-15,Website,Google Analytics,my-campaign-name,/products/baking,file_download,14",
    note: "key_event_name must be one of: generate_lead, contact_form, file_download, ipaper_download, faq_article_click, other",
    numFields: ["key_event_count"],
    validate: (row) => {
      const errors = [];
      if (!row.date) errors.push("date required");
      if (!row.key_event_name) errors.push("key_event_name required");
      if (!row.key_event_count) errors.push("key_event_count required");
      const validEvents = ["generate_lead","contact_form","file_download","ipaper_download","faq_article_click","other"];
      if (row.key_event_name && !validEvents.includes(row.key_event_name)) errors.push(`key_event_name must be one of: ${validEvents.join(", ")}`);
      return errors;
    },
  },
  leads: {
    label: "Leads",
    entity: "Lead",
    cols: "lead_id,channel,source_system,campaign_id,event_id,webinar_id,lead_grade,country,company,contact_role,region",
    example: "L001,LinkedIn Paid,LinkedIn,my-campaign-name,,,A,Germany,Arla Foods,R&D Manager,EMEA",
    note: "lead_id required. lead_grade must be A/B/C/Unknown.",
    numFields: [],
    validate: (row) => {
      const errors = [];
      if (!row.lead_id) errors.push("lead_id required");
      if (row.lead_grade && !["A","B","C","Unknown"].includes(row.lead_grade)) errors.push("lead_grade must be A/B/C/Unknown");
      return errors;
    },
  },
  budget: {
    label: "Budget Lines",
    entity: "BudgetLine",
    cols: "budget_id,period,campaign_id,channel,category,planned_dkk,actual_dkk,allocation_percent,owner,notes",
    example: "BL001,2026-Q1,my-campaign-name,LinkedIn Paid,ads,150000,98000,,Jane Smith,LinkedIn campaign",
    note: "budget_id + period + campaign_id + category + planned_dkk required.",
    numFields: ["planned_dkk","actual_dkk","allocation_percent"],
    validate: (row) => {
      const errors = [];
      if (!row.budget_id) errors.push("budget_id required");
      if (!row.period) errors.push("period required");
      if (!row.campaign_id) errors.push("campaign_id required");
      if (!row.category) errors.push("category required");
      if (!row.planned_dkk) errors.push("planned_dkk required");
      if (row.planned_dkk && isNaN(parseFloat(row.planned_dkk))) errors.push("planned_dkk must be numeric");
      return errors;
    },
  },
  campaigns: {
    label: "Campaigns",
    entity: "Campaign",
    cols: "campaign_id,name,region,category,start_date,end_date,owner,status",
    example: "2026-EMEA-Baking-Q1,Baking Innovation Q1 2026,EMEA,Product,2026-01-01,2026-03-31,Jane Smith,Active",
    note: "campaign_id + name + region required. status: Active/Planned/Completed/Paused.",
    numFields: [],
    validate: (row) => {
      const errors = [];
      if (!row.campaign_id) errors.push("campaign_id required");
      if (!row.name) errors.push("name required");
      if (!row.region) errors.push("region required");
      if (row.status && !["Active","Planned","Completed","Paused"].includes(row.status)) errors.push("status must be Active/Planned/Completed/Paused");
      return errors;
    },
  },
};

function downloadTemplate(key) {
  const t = TEMPLATES[key];
  const content = [t.cols, t.example].join("\n");
  const blob = new Blob([content], { type: "text/csv" });
  const a = document.createElement("a"); a.href = URL.createObjectURL(blob);
  a.download = `${key}_template.csv`; a.click();
}

function parseCSV(text) {
  const lines = text.trim().split("\n");
  if (lines.length < 2) return [];
  const headers = lines[0].split(",").map((h) => h.trim());
  return lines.slice(1).map((line) => {
    const vals = line.split(",");
    const row = {};
    headers.forEach((h, i) => { row[h] = vals[i]?.trim() ?? ""; });
    return row;
  });
}

export default function DataImport() {
  const [tab, setTab] = useState("channel_metrics");
  const [file, setFile] = useState(null);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleImport = async () => {
    if (!file) return;
    setLoading(true); setResult(null);
    const text = await file.text();
    const rows = parseCSV(text);
    const tmpl = TEMPLATES[tab];
    const valid = []; const errors = [];

    rows.forEach((row, i) => {
      const errs = tmpl.validate(row);
      if (errs.length > 0) errors.push({ row: i + 2, errors: errs });
      else {
        const clean = { ...row };
        tmpl.numFields.forEach((f) => { if (clean[f] !== undefined && clean[f] !== "") clean[f] = parseFloat(clean[f]) || 0; });
        // Remove empty string fields so entity defaults apply
        Object.keys(clean).forEach(k => { if (clean[k] === "") delete clean[k]; });
        valid.push(clean);
      }
    });

    let imported = 0;
    if (valid.length > 0) {
      await base44.entities[tmpl.entity].bulkCreate(valid);
      imported = valid.length;
    }

    setResult({ total: rows.length, imported, errors });
    setLoading(false);
  };

  return (
    <div className="min-h-screen" style={{ background: "#f5f5f0" }}>
      <div className="px-6 pt-6 pb-4" style={{ background: "#1a2e4a" }}>
        <div className="max-w-3xl mx-auto">
          <h1 className="text-2xl font-bold text-white">Data Import</h1>
          <p className="text-sm mt-0.5" style={{ color: "#a8c5d6" }}>Import marketing data via CSV. Download a template to see the required format.</p>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-6 py-6">
        <Tabs value={tab} onValueChange={(v) => { setTab(v); setFile(null); setResult(null); }}>
          <TabsList className="grid grid-cols-5 w-full">
            {Object.entries(TEMPLATES).map(([k, t]) => (
              <TabsTrigger key={k} value={k} className="text-xs">{t.label}</TabsTrigger>
            ))}
          </TabsList>

          {Object.entries(TEMPLATES).map(([k, tmpl]) => (
            <TabsContent key={k} value={k} className="space-y-4 mt-4">
              {/* Template download */}
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-blue-800">CSV Template: {tmpl.label}</p>
                  <p className="text-xs text-blue-600 mt-1 font-mono break-all">{tmpl.cols}</p>
                  <p className="text-xs text-blue-500 mt-2">{tmpl.note}</p>
                </div>
                <Button size="sm" variant="outline" className="border-blue-300 text-blue-700 flex-shrink-0" onClick={() => downloadTemplate(k)}>
                  <Download className="w-4 h-4 mr-1" /> Template
                </Button>
              </div>

              {/* File upload */}
              <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center bg-white">
                <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                <p className="text-sm text-gray-600 mb-3">Select your CSV file</p>
                <Input type="file" accept=".csv" className="max-w-xs mx-auto" onChange={(e) => { setFile(e.target.files[0]); setResult(null); }} />
                {file && <p className="text-xs text-gray-500 mt-2">{file.name}</p>}
              </div>

              {file && (
                <Button className="w-full" style={{ background: "#1a2e4a" }} onClick={handleImport} disabled={loading}>
                  {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />}
                  Import {tmpl.label}
                </Button>
              )}

              {result && (
                <div className={`rounded-xl p-4 border ${result.errors.length > 0 ? "bg-yellow-50 border-yellow-200" : "bg-green-50 border-green-200"}`}>
                  <div className="flex items-center gap-2 mb-2">
                    {result.errors.length === 0
                      ? <CheckCircle2 className="w-4 h-4 text-green-600" />
                      : <AlertCircle className="w-4 h-4 text-yellow-600" />}
                    <p className="text-sm font-medium">
                      {result.imported} of {result.total} rows imported successfully
                    </p>
                  </div>
                  {result.errors.length > 0 && (
                    <div className="mt-2 space-y-1 max-h-40 overflow-y-auto">
                      {result.errors.map((e, i) => (
                        <p key={i} className="text-xs text-yellow-700">Row {e.row}: {e.errors.join("; ")}</p>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </div>
  );
}