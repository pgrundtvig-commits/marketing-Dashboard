import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (user?.role !== "admin") return Response.json({ error: "Forbidden" }, { status: 403 });

  const raw = Deno.env.get("GA4_SERVICE_ACCOUNT_JSON") || "";
  return Response.json({
    length: raw.length,
    first50: raw.slice(0, 50),
    last20: raw.slice(-20),
    startsWithBrace: raw.trimStart().startsWith("{"),
    startsWithQuote: raw.startsWith('"'),
    propertyId: Deno.env.get("GA4_PROPERTY_ID"),
  });
});