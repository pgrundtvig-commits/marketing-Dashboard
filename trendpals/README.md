# TrendPals — Project Overview
> Sidst opdateret: 2. juni 2026
> Base44 App ID: `6987a5428ef229e6ee55cbb6`
> Ejer: Peter Grundtvig Nielsen, Palsgaard A/S

---

## Hvad er TrendPals?

TrendPals er et internt market intelligence-værktøj bygget i Base44. Det giver Palsgaards Global Account Managers (GAMs) og tekniske salgsteams adgang til kategori-trend-rapporter og account intelligence decks — genereret fra Mintel-rapporter og GNPD-eksportdata.

Rapporterne er struktureret til at åbne tekniske samtaler hos kunder uden at starte med et Palsgaard-produkt. Princippet er *outside-in*: vi viser hvad markedet og kunden selv gør, ikke hvad Palsgaard sælger.

---

## Arkitektur

```
[Knowledge Sources]        [GNPD Exports]         [GlobalTrends]
  Mintel PDFs                XLS / HTML              6 Ice Cream trends
  Whitepapers                PPTX packshots          regional_manifestations[]
  Tech docs                        │
        │                          │
        ▼                          ▼
  [RAG Extraction]         [ProductCandidates]
  Claude API (Sonnet 4)     scored, ranked, pinned
  Prompt v2 → excerpts[]           │
        │                          │
        └──────────┬───────────────┘
                   ▼
           [Report / Slides]
           3-lag slide-struktur
           → Export prompt → Claude.ai → PPTX
```

---

## Entiteter (16 total)

### Kerneentiteter

| Entitet | Formål |
|---|---|
| `Source` | Knowledge sources: Mintel, GNPD, tech docs. Indeholder `excerpts[]` med RAG-output og `mintel_chunks[]` til kapitel-niveau chunking |
| `TrendCandidate` | Projektspecifikke trends med `customer_pains[]`, `conversation_openers[]`, `whats_changing[]`, `why_now[]` |
| `GlobalTrend` | Kategoriniveau trends med `regional_manifestations[]`. 6 Ice Cream trends seedet |
| `Report` | Færdigt report-objekt med `slides[]` (3-lags struktur), `evidence_pack[]`, `product_shortlist[]` |
| `ReportRequest` | Brief indsendt af GAM via formular |
| `Project` | Projektcontainer: kategori, region, audience, objective, selected trends |
| `ProductCandidate` | GNPD-produkter scored og ranked per trend |

### Støtteentiteter

| Entitet | Formål |
|---|---|
| `ProjectKnowledgeLink` | Many-to-many: projekt ↔ knowledge source |
| `GNPDColumnMapping` | Auto-detekteret kolonnemapping per GNPD-eksport |
| `GNPDImageExtraction` | Job-tracking for packshot-udtræk fra HTML-eksport |
| `PDFCuratedProduct` | Produktreferencer ekstraheret fra Mintel PDF-sider |
| `ProductImageRequest` | Packshot-status per produkt |
| `UploadBatch` | Batch-upload tracking for knowledge sources |
| `ClaimMaturity` | Claims rangeret som Emerging / Established / Declining |
| `FlavourMaturity` | Flavours rangeret per kategori og region |
| `FormatTextureMaturity` | Format/tekstur rangeret per kategori og region |

---

## RAG Pipeline

### Prompt v2 — ekstraherede felter per excerpt

```json
{
  "market_signal":      "Hvad sker der i markedet",
  "customer_pain":      "Udfordringen for fødevareproducenten",
  "palsgaard_angle":    "Hvordan Palsgaard-kompetence adresserer det — INGEN produktnavne",
  "has_direct_role":    true/false,
  "capability_area":    "texture_quality | sustainability | cost_efficiency | ...",
  "category_relevance": ["Ice Cream", "Dairy"],
  "confidence":         "high | medium | low",
  "source_quote":       "Kort citat fra kilden (max 2 sætninger)",
  "trend_keywords":     ["overrun", "aeration", "stability"],
  "page_ref":           "p. 14"
}
```

### Processing status (2. juni 2026)

| Status | Antal |
|---|---|
| Processeret (nye felter) | ~30 |
| Afventer reprocessering | ~71 |
| JPG-filer (fejler, skippes) | 38 |
| **Total** | **104** |

**Fejlårsag for JPGs:** Base44 sender dem som dokumenter til Claude API — de skal sendes som `type: "image"` eller skippes. Ikke kritisk for rapportkvalitet.

---

## Slide-struktur (3 lag)

Hvert slide i en rapport er bygget i tre lag:

```
LAG 1 — "What is happening globally"
  └── Fra GlobalTrend.market_signal + whats_changing[]

LAG 2 — "[Region] in focus"
  └── Fra GlobalTrend.regional_manifestations[region]
      + lokale GNPD-produkteksempler

LAG 3 — "What this means for manufacturers"
  └── customer_pains[] + palsgaard_angle + conversation_openers[]
```

Ingen Palsgaard-produktnavne. Ingen doseringstal. Slut altid i kundens verden.

---

## ReportRequest — feltstruktur

Formularen indsender følgende felter til `ReportRequest`-entiteten:

| Felt | Type | Note |
|---|---|---|
| `requester_name` | string | Påkrævet |
| `requester_email` | string | |
| `account` | string | Kundenavn |
| `region` | string | EMEA / ASPAC / Americas / Global |
| `categories` | string | Ice Cream, Bakery, etc. |
| `report_type` | enum | `account` eller `category` |
| `purpose` | string | Formål med mødet |
| `pains` | string | Kommaseparerede udfordringer |
| `context` | string | Specifik kundekontekst |
| `region_zoom` | string | F.eks. "Western Europe" |
| `contact_name` | string | Kontaktperson og rolle |
| `deadline` | date | Møde- eller deadline-dato |
| `status` | enum | `new` → `in_progress` → `delivered` |

**Åben bug:** `submitBrief`-funktionen i Base44 sender kun de gamle felter. Skemaet er korrekt — funktionen mangler opdatering.

---

## Kendte bugs (2. juni 2026)

### 1. `submitBrief` gemmer ikke nye felter
- **Problem:** Funktionen mapper ikke `report_type`, `pains`, `context`, `region_zoom`, `contact_name`
- **Skema:** OK — alle felter eksisterer i `ReportRequest`
- **Fix:** Opdater funktionen i Base44 editor → Functions → `submitBrief`

```javascript
export async function submitBrief(briefData) {
  const record = {
    requester_name:  briefData.requester_name || "",
    requester_email: briefData.requester_email || "",
    account:         briefData.account || "",
    region:          briefData.region || "",
    categories:      briefData.categories || "",
    purpose:         briefData.purpose || "",
    report_type:     briefData.report_type || "category",
    pains:           briefData.pains || "",
    context:         briefData.context || "",
    region_zoom:     briefData.region_zoom || "",
    contact_name:    briefData.contact_name || "",
    deadline:        briefData.deadline || null,
    status:          "new",
    submitted_at:    new Date().toISOString()
  };
  console.log("[submitBrief] Saving:", JSON.stringify(record));
  return await ReportRequest.create(record);
}
```

### 2. `Report.slides` gemmer som tom array (Slides: 0)
- **Problem:** `generateReport` returnerer korrekt JSON fra Claude API, men slides lander ikke i DB
- **Sandsynlig årsag A:** JSON er pakket i markdown-backticks — strip dem før `JSON.parse()`
- **Sandsynlig årsag B:** `max_tokens: 1000` er for lavt — hæv til minimum 4000
- **Workaround:** Brug "Export full report prompt" → indsæt i Claude.ai → byg PPTX herfra

```javascript
// Fix i generateReport:
const raw = data.content.map(i => i.text || "").join("");
const clean = raw.replace(/```json|```/g, "").trim();
const parsed = JSON.parse(clean);
```

### 3. 38 JPG knowledge sources fejler med 500
- **Problem:** Ficha tecnica-filer som JPG sendes som dokumenter — Claude API afviser dem
- **Fix:** Check `source.file_url` extension; send som `type: "image"` eller skip
- **Prioritet:** Lav — påvirker ikke rapportkvalitet

---

## Næste handlinger (prioriteret)

1. **Fix `submitBrief`** — indsæt koden ovenfor i Base44 editor
2. **Test brief** — submit ny brief og verificer alle felter i DB
3. **Process ~71 sources** — kør "Process unprocessed" på Knowledge Sources
4. **Testrapport** — generer Ice Cream EMEA rapport og verificer at `GlobalTrend.regional_manifestations` dukker op på lag 2
5. **Fix slides-bug** — strip backticks + hæv max_tokens i `generateReport`

---

## Workflow: Fra brief til PPTX

```
GAM udfylder brief (TrendPals UI)
        ↓
submitBrief() → ReportRequest (status: new)
        ↓
Peter reviewer brief → opretter Project
        ↓
Project linkes til relevante Knowledge Sources
        ↓
generateReport() → Claude API (Sonnet 4)
  - Injekterer excerpts filtreret på category_relevance + capability_area
  - Injekterer GlobalTrend + regional_manifestations
  - Returnerer slides[] (3-lags struktur)
        ↓
[Workaround] Export prompt → Claude.ai
        ↓
PPTX bygges med python-pptx + Palsgaard template
        ↓
Upload final PPTX til Report.final_pptx_url
```

---

## Tekniske noter

- **Claude API model:** `claude-sonnet-4-20250514`
- **Palsgaard template:** `/mnt/skills/user/palsgaard-powerpoint/assets/Palsgaard_PP_Template.potx`
  Kræver zipfile-patch hver session: erstat `presentationml.template.main+xml` → `presentationml.presentation.main+xml`
- **`sz` font-regel:** Sættes som *attribut* på `<a:rPr sz="1500">` — aldrig som child element
- **HTML escape:** Al tekst i XML skal HTML-escapes (`html.escape()`) — særligt `&`, `"`, `—`
- **GNPD billeder:** JPEGs navngivet `slide{n}_46105.jpg`, gemt i `/home/claude/product_images/`
- **TrendPals Zapier:** Brug `base44_find_entity_record` med brede queries — smalle filtre er upålidelige
