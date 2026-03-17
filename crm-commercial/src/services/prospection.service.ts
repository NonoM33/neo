import type { Lead, Activity, LeadSource } from '../types';
import type { ProspectionStats } from '../types/prospection.types';
import { computeLeadScore } from './scoring.engine';
import { LEAD_SOURCE_LABELS, LEAD_STATUS_LABELS } from '../types';

export function computeProspectionStats(
  leads: Lead[],
  activities: Activity[],
): ProspectionStats {
  const activeLeads = leads.filter(l => l.status !== 'gagne' && l.status !== 'perdu');

  // Compute scores for all active leads
  const scoredLeads = activeLeads.map(lead => ({
    lead,
    score: computeLeadScore(lead, activities),
  }));

  const totalProspects = activeLeads.length;
  const hotLeads = scoredLeads.filter(s => s.score.total >= 50).length;

  // Cold leads: no activity in 7+ days
  const coldLeads = activeLeads.filter(lead => {
    const leadActivities = activities.filter(a => a.leadId === lead.id);
    if (leadActivities.length === 0) return true;
    const lastDate = leadActivities
      .map(a => new Date(a.completedAt || a.updatedAt || a.createdAt).getTime())
      .sort((a, b) => b - a)[0];
    return (Date.now() - lastDate) / (1000 * 60 * 60 * 24) > 7;
  }).length;

  const avgScore = scoredLeads.length > 0
    ? Math.round(scoredLeads.reduce((sum, s) => sum + s.score.total, 0) / scoredLeads.length)
    : 0;

  // Conversion rates between stages
  const stages = ['prospect', 'qualifie', 'proposition', 'negociation', 'gagne'];
  const conversionByStage = [];
  for (let i = 0; i < stages.length - 1; i++) {
    const from = stages[i];
    const to = stages[i + 1];
    const atOrPast = leads.filter(l => stages.indexOf(l.status) >= stages.indexOf(from)).length;
    const reachedNext = leads.filter(l => stages.indexOf(l.status) >= stages.indexOf(to)).length;
    const rate = atOrPast > 0 ? Math.round((reachedNext / atOrPast) * 100) : 0;
    conversionByStage.push({
      from: LEAD_STATUS_LABELS[from as keyof typeof LEAD_STATUS_LABELS] || from,
      to: LEAD_STATUS_LABELS[to as keyof typeof LEAD_STATUS_LABELS] || to,
      rate,
    });
  }

  // Best sources by average score
  const sourceMap = new Map<string, { totalScore: number; count: number }>();
  for (const { lead, score } of scoredLeads) {
    const existing = sourceMap.get(lead.source) || { totalScore: 0, count: 0 };
    existing.totalScore += score.total;
    existing.count++;
    sourceMap.set(lead.source, existing);
  }
  const bestSources = Array.from(sourceMap.entries())
    .map(([source, data]) => ({
      source,
      label: LEAD_SOURCE_LABELS[source as LeadSource] || source,
      avgScore: Math.round(data.totalScore / data.count),
      count: data.count,
    }))
    .sort((a, b) => b.avgScore - a.avgScore);

  return {
    totalProspects,
    hotLeads,
    coldLeads,
    avgScore,
    conversionByStage,
    bestSources,
  };
}
