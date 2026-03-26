import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

// Confidence thresholds:
// HIGH confidence = auto-fix
// LOW confidence = flag for review

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const logs = [];
  const fixes = [];
  const flags = [];

  const log = async (entry) => {
    const record = await base44.asServiceRole.entities.AuditLog.create(entry);
    logs.push(record);
    if (entry.status === 'fixed') fixes.push(record);
    if (entry.status === 'flagged') flags.push(record);
  };

  let trigger = 'manual';
  let triggerEntityName = null;
  let triggerEntityId = null;

  try {
    const body = await req.json().catch(() => ({}));
    trigger = body.trigger || 'manual';
    triggerEntityName = body.entity_name || null;
    triggerEntityId = body.entity_id || null;
  } catch (_) {}

  try {
    // ── Load all relevant data ─────────────────────────────────────────────
    const [campaigns, campaignMaps, liMetrics, channelMetrics, budgetLines, leads, keyEvents] = await Promise.all([
      base44.asServiceRole.entities.Campaign.list(),
      base44.asServiceRole.entities.CampaignMap.list(),
      base44.asServiceRole.entities.LinkedInMetric.list('-date', 500),
      base44.asServiceRole.entities.ChannelMetricDaily.list('-date', 500),
      base44.asServiceRole.entities.BudgetLine.list(),
      base44.asServiceRole.entities.Lead.list(),
      base44.asServiceRole.entities.KeyEventDaily.list('-date', 500),
    ]);

    const campaignIds = new Set(campaigns.map(c => c.campaign_id));

    // ══════════════════════════════════════════════════════════════════════
    // CHECK 1: LinkedInMetric → Campaign linkage
    // If a LinkedInMetric has campaign_id that doesn't exist in Campaign, flag it
    // If it's "UNMAPPED" that's expected — skip it
    // ══════════════════════════════════════════════════════════════════════
    const orphanedLiMetrics = liMetrics.filter(m =>
      m.campaign_id !== 'UNMAPPED' && !campaignIds.has(m.campaign_id)
    );

    if (orphanedLiMetrics.length > 0) {
      // Group by campaign_id for cleaner logs
      const grouped = {};
      for (const m of orphanedLiMetrics) {
        if (!grouped[m.campaign_id]) grouped[m.campaign_id] = 0;
        grouped[m.campaign_id]++;
      }
      for (const [cid, count] of Object.entries(grouped)) {
        await log({
          run_trigger: trigger,
          entity_name: triggerEntityName,
          entity_id: triggerEntityId,
          check_type: 'linkedin_metric_orphan_campaign',
          status: 'flagged',
          severity: 'warning',
          description: `${count} LinkedInMetric record(s) reference campaign_id "${cid}" which does not exist in the Campaign registry. Review and map this campaign.`,
          affected_entity: 'LinkedInMetric',
          affected_id: cid,
        });
      }
    }

    // ══════════════════════════════════════════════════════════════════════
    // CHECK 2: ChannelMetricDaily → Campaign linkage
    // Same logic — non-UNMAPPED campaign_id must exist
    // ══════════════════════════════════════════════════════════════════════
    const orphanedChannelMetrics = channelMetrics.filter(m =>
      m.campaign_id !== 'UNMAPPED' && !campaignIds.has(m.campaign_id)
    );
    if (orphanedChannelMetrics.length > 0) {
      const grouped = {};
      for (const m of orphanedChannelMetrics) {
        if (!grouped[m.campaign_id]) grouped[m.campaign_id] = 0;
        grouped[m.campaign_id]++;
      }
      for (const [cid, count] of Object.entries(grouped)) {
        await log({
          run_trigger: trigger,
          entity_name: triggerEntityName,
          entity_id: triggerEntityId,
          check_type: 'channel_metric_orphan_campaign',
          status: 'flagged',
          severity: 'warning',
          description: `${count} ChannelMetricDaily record(s) reference campaign_id "${cid}" which does not exist in Campaign registry.`,
          affected_entity: 'ChannelMetricDaily',
          affected_id: cid,
        });
      }
    }

    // ══════════════════════════════════════════════════════════════════════
    // CHECK 3: BudgetLine → Campaign linkage
    // Every BudgetLine must have a valid campaign_id
    // HIGH confidence fix: if there's exactly one campaign and the budget line
    // has an unrecognised ID we do NOT auto-fix (too risky). Always flag.
    // ══════════════════════════════════════════════════════════════════════
    const orphanedBudget = budgetLines.filter(b => !campaignIds.has(b.campaign_id));
    for (const b of orphanedBudget) {
      await log({
        run_trigger: trigger,
        entity_name: triggerEntityName,
        entity_id: triggerEntityId,
        check_type: 'budget_orphan_campaign',
        status: 'flagged',
        severity: 'error',
        description: `BudgetLine "${b.budget_id}" (period: ${b.period}) references campaign_id "${b.campaign_id}" which does not exist. Manual review required.`,
        affected_entity: 'BudgetLine',
        affected_id: b.id,
      });
    }

    // ══════════════════════════════════════════════════════════════════════
    // CHECK 4: Lead → Campaign linkage
    // ══════════════════════════════════════════════════════════════════════
    const orphanedLeads = leads.filter(l => !campaignIds.has(l.campaign_id));
    if (orphanedLeads.length > 0) {
      await log({
        run_trigger: trigger,
        entity_name: triggerEntityName,
        entity_id: triggerEntityId,
        check_type: 'lead_orphan_campaign',
        status: 'flagged',
        severity: 'warning',
        description: `${orphanedLeads.length} Lead record(s) reference campaign IDs not found in the Campaign registry. Review and map them.`,
        affected_entity: 'Lead',
        affected_id: null,
        before_value: JSON.stringify([...new Set(orphanedLeads.map(l => l.campaign_id))]),
      });
    }

    // ══════════════════════════════════════════════════════════════════════
    // CHECK 5: CampaignMap → Campaign linkage
    // Every CampaignMap.campaign_id must point to a real Campaign
    // HIGH confidence auto-fix: if the map points to a non-existent campaign
    // and there's a campaign with a very similar name, flag for review.
    // If the referenced campaign_id simply doesn't exist at all → flag.
    // ══════════════════════════════════════════════════════════════════════
    const orphanedMaps = campaignMaps.filter(m => !campaignIds.has(m.campaign_id));
    for (const m of orphanedMaps) {
      await log({
        run_trigger: trigger,
        entity_name: triggerEntityName,
        entity_id: triggerEntityId,
        check_type: 'campaign_map_broken',
        status: 'flagged',
        severity: 'error',
        description: `CampaignMap "${m.external_campaign_key}" (source: ${m.source_system}) maps to campaign_id "${m.campaign_id}" which does not exist in Campaign registry.`,
        affected_entity: 'CampaignMap',
        affected_id: m.id,
      });
    }

    // ══════════════════════════════════════════════════════════════════════
    // CHECK 6: Campaign status consistency
    // If a Campaign has end_date in the past but status is "Active" → auto-fix to "Completed"
    // HIGH confidence fix
    // ══════════════════════════════════════════════════════════════════════
    const today = new Date().toISOString().split('T')[0];
    const staleActiveCampaigns = campaigns.filter(c =>
      c.status === 'Active' && c.end_date && c.end_date < today
    );
    for (const c of staleActiveCampaigns) {
      await base44.asServiceRole.entities.Campaign.update(c.id, { status: 'Completed' });
      await log({
        run_trigger: trigger,
        entity_name: triggerEntityName,
        entity_id: triggerEntityId,
        check_type: 'campaign_status_stale',
        status: 'fixed',
        severity: 'info',
        description: `Campaign "${c.name}" had status "Active" but end_date (${c.end_date}) is in the past. Auto-updated to "Completed".`,
        affected_entity: 'Campaign',
        affected_id: c.id,
        before_value: JSON.stringify({ status: 'Active' }),
        after_value: JSON.stringify({ status: 'Completed' }),
      });
    }

    // ══════════════════════════════════════════════════════════════════════
    // CHECK 7: LinkedInMetric engagement_rate consistency
    // Recalculate and fix if stored value differs significantly (>0.001)
    // HIGH confidence auto-fix
    // ══════════════════════════════════════════════════════════════════════
    const erMismatches = liMetrics.filter(m => {
      if (!m.impressions || m.impressions === 0) return false;
      const numerator = m.source === 'organic_share'
        ? (m.clicks || 0) + (m.likes || 0) + (m.comments || 0) + (m.shares || 0)
        : (m.total_engagements || 0);
      const expected = Math.round((numerator / m.impressions) * 10000) / 10000;
      return Math.abs((m.engagement_rate || 0) - expected) > 0.001;
    });

    for (const m of erMismatches) {
      const numerator = m.source === 'organic_share'
        ? (m.clicks || 0) + (m.likes || 0) + (m.comments || 0) + (m.shares || 0)
        : (m.total_engagements || 0);
      const newRate = Math.round((numerator / m.impressions) * 10000) / 10000;
      await base44.asServiceRole.entities.LinkedInMetric.update(m.id, { engagement_rate: newRate });
      await log({
        run_trigger: trigger,
        entity_name: triggerEntityName,
        entity_id: triggerEntityId,
        check_type: 'linkedin_engagement_rate_mismatch',
        status: 'fixed',
        severity: 'info',
        description: `LinkedInMetric (${m.source}, ${m.date}) had stale engagement_rate ${m.engagement_rate}. Recalculated to ${newRate}.`,
        affected_entity: 'LinkedInMetric',
        affected_id: m.id,
        before_value: JSON.stringify({ engagement_rate: m.engagement_rate }),
        after_value: JSON.stringify({ engagement_rate: newRate }),
      });
    }

    // ══════════════════════════════════════════════════════════════════════
    // CHECK 8: KeyEventDaily → Campaign linkage
    // ══════════════════════════════════════════════════════════════════════
    const orphanedKE = keyEvents.filter(e =>
      e.campaign_id !== 'UNMAPPED' && !campaignIds.has(e.campaign_id)
    );
    if (orphanedKE.length > 0) {
      const grouped = {};
      for (const e of orphanedKE) {
        if (!grouped[e.campaign_id]) grouped[e.campaign_id] = 0;
        grouped[e.campaign_id]++;
      }
      for (const [cid, count] of Object.entries(grouped)) {
        await log({
          run_trigger: trigger,
          entity_name: triggerEntityName,
          entity_id: triggerEntityId,
          check_type: 'key_event_orphan_campaign',
          status: 'flagged',
          severity: 'warning',
          description: `${count} KeyEventDaily record(s) reference campaign_id "${cid}" which does not exist in Campaign registry.`,
          affected_entity: 'KeyEventDaily',
          affected_id: cid,
        });
      }
    }

    // ══════════════════════════════════════════════════════════════════════
    // If everything was clean, log a summary OK
    // ══════════════════════════════════════════════════════════════════════
    if (logs.length === 0) {
      await log({
        run_trigger: trigger,
        entity_name: triggerEntityName,
        entity_id: triggerEntityId,
        check_type: 'full_reconciliation',
        status: 'ok',
        severity: 'info',
        description: 'All consistency checks passed. No mismatches found.',
      });
    }

    return Response.json({
      success: true,
      total_checks: 8,
      fixes: fixes.length,
      flags: flags.length,
      ok: logs.length - fixes.length - flags.length,
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});