import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Upload, Download, CheckCircle, AlertCircle, X } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { base44 } from "@/api/base44Client";

const TEMPLATES = {
  "Channel Metrics": {
    headers: ["date","channel","source_system","campaign_id","asset_id","impressions","clicks","engagements","spend_dkk"],
    entity: "ChannelMetricDaily",
    required: ["date","channel","source_system","campaign_id"],
    numeric: ["impressions","clicks","engagements","spend_dkk"]
  },
  "Leads": {
    headers: ["lead_id","created_date","channel","source_system","campaign_id","event_id","webinar_id","lead_grade","country","company"],
    entity: "Lead",
    required: ["campaign_id","channel","lead_grade"],
    numeric: []
  },
  "Budget": {
    headers: ["period","campaign_id","category","planned_dkk","actual_dkk","allocation_percent","owner","notes"],
    entity: "BudgetLine",
    required: ["period","campaign_id","category","planned_dkk"],
    numeric: ["planned_dkk","actual_dkk","allocation_percent"]
  },
  "Email/Webinar": {
    headers: ["date","campaign_id","sends","opens","clicks","registrations","attendees","spend_dkk"],
    entity: "ChannelMetricDaily",
    required: ["date","campaign_id"],
    numeric: ["sends","opens","clicks","registrations","attendees","spend_dkk"]
  }
};

const downloadTemplate = (type) => {
  const t = TEMPLATES[type];
  const csv = t.headers.join(",") + "\n";
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `palsgaard_${type.toLowerCase().replace(/\//g,"_").replace(/ /g,"_")}_template.csv`;
  a.click();
  URL.revokeObjectURL(url);
};

export default function CsvImport({ onImported }) {
  const [type, setType] = useState("Channel Metrics");
  const [status, setStatus] = useState(null);
  const [errors, setErrors] = useState([]);
  const [loading, setLoading] = useState(false);

  const parseCSV = (text) => {
    const lines = text.trim().split("\n");
    const headers = lines[0].split(",").map(h => h.trim().replace(/^"|"$/g,""));
    return lines.slice(1).map((line, i) => {
      const vals = line.split(",").map(v => v.trim().replace(/^"|"$/g,""));
      const obj = {};
      headers.forEach((h, idx) => { obj[h] = vals[idx] || ""; });
      obj.__row = i + 2;
      return obj;
    });
  };

  const validate = (rows, template) => {
    const errs = [];
    rows.forEach(row => {
      template.required.forEach(field => {
        if (!row[field]) errs.push(`Row ${row.__row}: missing required field "${field}"`);
      });
      template.numeric.forEach(field => {
        if (row[field] !== "" && row[field] !== undefined && isNaN(Number(row[field])))
          errs.push(`Row ${row.__row}: "${field}" must be numeric`);
        if (field === "spend_dkk" && Number(row[field]) < 0)
          errs.push(`Row ${row.__row}: spend_dkk must be >= 0`);
      });
      if (row.lead_grade && !["A","B","C","Unknown"].includes(row.lead_grade))
        errs.push(`Row ${row.__row}: lead_grade must be A/B/C/Unknown`);
    });
    return errs;
  };

  const handleFile = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setLoading(true); setErrors([]); setStatus(null);
    const text = await file.text();
    const rows = parseCSV(text);
    const template = TEMPLATES[type];
    const errs = validate(rows, template);
    if (errs.length > 0) { setErrors(errs); setLoading(false); return; }

    const entity = base44.entities[template.entity];
    let success = 0, failed = 0;
    for (const row of rows) {
      const clean = { ...row };
      delete clean.__row;
      template.numeric.forEach(f => { if (clean[f] !== "") clean[f] = Number(clean[f]); });
      Object.keys(clean).forEach(k => { if (clean[k] === "") delete clean[k]; });
      clean.source_system = clean.source_system || "CSV Import";
      await entity.create(clean);
      success++;
    }
    setStatus({ success, failed });
    setLoading(false);
    if (onImported) onImported();
    e.target.value = "";
  };

  return (
    <div className="bg-white rounded-xl border p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-gray-800">CSV Import</h3>
      </div>

      <div className="flex items-center gap-3">
        <Select value={type} onValueChange={setType}>
          <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
          <SelectContent>
            {Object.keys(TEMPLATES).map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
          </SelectContent>
        </Select>
        <Button size="sm" variant="outline" onClick={() => downloadTemplate(type)}>
          <Download className="w-4 h-4 mr-1" />Download Template
        </Button>
      </div>

      <label className="flex flex-col items-center justify-center border-2 border-dashed border-gray-300 rounded-lg p-6 cursor-pointer hover:border-green-500 transition-colors">
        <Upload className="w-8 h-8 text-gray-400 mb-2" />
        <span className="text-sm text-gray-600">Click to upload CSV file</span>
        <span className="text-xs text-gray-400 mt-1">Type: {type}</span>
        <input type="file" accept=".csv" className="hidden" onChange={handleFile} disabled={loading} />
      </label>

      {loading && <p className="text-sm text-blue-600 animate-pulse">Importing...</p>}

      {status && (
        <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 rounded-lg p-3">
          <CheckCircle className="w-4 h-4" />
          Successfully imported {status.success} records.
        </div>
      )}

      {errors.length > 0 && (
        <div className="bg-red-50 rounded-lg p-3 space-y-1 max-h-40 overflow-auto">
          <div className="flex items-center gap-2 text-sm font-medium text-red-700">
            <AlertCircle className="w-4 h-4" />{errors.length} validation errors
          </div>
          {errors.map((e, i) => <p key={i} className="text-xs text-red-600">{e}</p>)}
        </div>
      )}
    </div>
  );
}