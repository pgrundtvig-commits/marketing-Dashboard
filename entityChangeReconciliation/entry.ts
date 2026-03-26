import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

// Triggered by entity automations — calls the main reconciliation with context
Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);

  const body = await req.json().catch(() => ({}));
  const { event, data } = body;

  const entity_name = event?.entity_name || null;
  const entity_id = event?.entity_id || null;

  // Call the main reconciliation function with context
  const result = await base44.asServiceRole.functions.invoke('dataReconciliation', {
    trigger: 'entity_change',
    entity_name,
    entity_id,
  });

  return Response.json({ success: true, entity_name, entity_id, reconciliation: result });
});