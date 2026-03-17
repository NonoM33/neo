import type { Lead, Activity } from '../types';
import type { LeadScore, ScoreBreakdown, ScoreLabel } from '../types/prospection.types';
import { SCORE_COLORS } from '../types/prospection.types';

export function computeLeadScore(lead: Lead, activities: Activity[]): LeadScore {
  const leadActivities = activities.filter(a => a.leadId === lead.id);
  const q = lead.qualification;

  // === Profile score (0-20) ===
  let profile = 0;
  if (q?.housingType) profile += 3;
  if (q?.desiredServices && q.desiredServices.length > 0) profile += 4;
  if (lead.surface && parseFloat(lead.surface) > 80) profile += 3;
  if (q?.isDecisionMaker) profile += 5;
  if (lead.address || lead.city) profile += 2;
  if (lead.email && lead.phone) profile += 3;
  profile = Math.min(profile, 20);

  // === Budget score (0-20) ===
  let budget = 0;
  if (q?.budgetRange) {
    const budgetScores: Record<string, number> = {
      plus_50k: 20, '20k_50k': 16, '10k_20k': 12, '5k_10k': 8, moins_5k: 4,
    };
    budget = budgetScores[q.budgetRange] || 0;
  } else if (lead.estimatedValue) {
    const value = parseFloat(lead.estimatedValue);
    if (value >= 50000) budget = 18;
    else if (value >= 20000) budget = 14;
    else if (value >= 10000) budget = 10;
    else if (value >= 5000) budget = 6;
    else budget = 3;
  }
  budget = Math.min(budget, 20);

  // === Engagement score (0-20) ===
  let engagement = 0;
  if (leadActivities.length > 0) {
    // Recency
    const lastActivity = leadActivities
      .map(a => new Date(a.completedAt || a.updatedAt || a.createdAt).getTime())
      .sort((a, b) => b - a)[0];
    const daysSinceLastActivity = (Date.now() - lastActivity) / (1000 * 60 * 60 * 24);
    if (daysSinceLastActivity < 3) engagement += 8;
    else if (daysSinceLastActivity < 7) engagement += 5;
    else if (daysSinceLastActivity < 14) engagement += 2;

    // Volume
    if (leadActivities.length > 5) engagement += 6;
    else if (leadActivities.length > 3) engagement += 4;
    else if (leadActivities.length > 1) engagement += 2;

    // Completed activities
    if (leadActivities.some(a => a.status === 'termine')) engagement += 4;
  }
  engagement = Math.min(engagement, 20);

  // === Timing score (0-20) ===
  let timing = 0;
  if (q?.timeline) {
    const timelineScores: Record<string, number> = {
      urgent: 20, '1_3_mois': 15, '3_6_mois': 8, plus_6_mois: 4,
    };
    timing = timelineScores[q.timeline] || 0;
  } else {
    // Infer from expected close date
    if (lead.expectedCloseDate) {
      const daysToClose = (new Date(lead.expectedCloseDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24);
      if (daysToClose < 30) timing = 16;
      else if (daysToClose < 90) timing = 10;
      else timing = 5;
    }
  }
  // Bonuses
  if (q?.housingAge === 'plus_15') timing = Math.min(timing + 3, 20);
  if (q?.hasCompetition === false) timing = Math.min(timing + 3, 20);
  timing = Math.min(timing, 20);

  // === Completeness score (0-20) ===
  let filledFields = 0;
  const totalFields = 10;
  if (q?.housingType) filledFields++;
  if (q?.housingAge) filledFields++;
  if (q?.desiredServices && q.desiredServices.length > 0) filledFields++;
  if (q?.existingInstallation) filledFields++;
  if (q?.budgetRange) filledFields++;
  if (q?.timeline) filledFields++;
  if (q?.isDecisionMaker !== undefined) filledFields++;
  if (q?.hasCompetition !== undefined) filledFields++;
  if (lead.surface) filledFields++;
  if (lead.address || lead.city) filledFields++;
  const completeness = Math.round((filledFields / totalFields) * 20);

  const total = Math.min(profile + budget + engagement + timing + completeness, 100);
  const breakdown: ScoreBreakdown = { profile, budget, engagement, timing, completeness };
  const label = getScoreLabelFromValue(total);

  return {
    total,
    breakdown,
    label,
    color: SCORE_COLORS[label],
  };
}

function getScoreLabelFromValue(score: number): ScoreLabel {
  if (score >= 75) return 'brulant';
  if (score >= 50) return 'chaud';
  if (score >= 25) return 'tiede';
  return 'froid';
}

export function getQualificationCompleteness(lead: Lead): number {
  const q = lead.qualification;
  if (!q) return 0;
  let filled = 0;
  const total = 10;
  if (q.housingType) filled++;
  if (q.housingAge) filled++;
  if (q.desiredServices?.length) filled++;
  if (q.existingInstallation) filled++;
  if (q.budgetRange) filled++;
  if (q.timeline) filled++;
  if (q.isDecisionMaker !== undefined) filled++;
  if (q.hasCompetition !== undefined) filled++;
  if (lead.surface) filled++;
  if (lead.address || lead.city) filled++;
  return Math.round((filled / total) * 100);
}
