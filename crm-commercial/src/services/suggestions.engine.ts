import type { Lead, Activity } from '../types';
import type { SmartSuggestion } from '../types/prospection.types';
import { computeLeadScore, getQualificationCompleteness } from './scoring.engine';

export function generateSuggestions(lead: Lead, activities: Activity[]): SmartSuggestion[] {
  const suggestions: SmartSuggestion[] = [];
  const leadActivities = activities.filter(a => a.leadId === lead.id);
  const leadName = `${lead.firstName} ${lead.lastName}`;
  const score = computeLeadScore(lead, activities);

  // 1. No contact in X days
  if (leadActivities.length > 0) {
    const lastActivityDate = leadActivities
      .map(a => new Date(a.completedAt || a.updatedAt || a.createdAt).getTime())
      .sort((a, b) => b - a)[0];
    const daysSince = Math.floor((Date.now() - lastActivityDate) / (1000 * 60 * 60 * 24));
    if (daysSince >= 5) {
      suggestions.push({
        id: `no-contact-${lead.id}`,
        type: 'warning',
        icon: 'bi-clock-history',
        message: `${leadName} n'a pas été contacté depuis ${daysSince} jours`,
        priority: daysSince >= 10 ? 'high' : 'medium',
        actionLabel: 'Planifier un appel',
        actionRoute: `/activities/new?leadId=${lead.id}`,
        leadId: lead.id,
        leadName,
      });
    }
  } else if (lead.status !== 'gagne' && lead.status !== 'perdu') {
    // No activity at all
    suggestions.push({
      id: `no-activity-${lead.id}`,
      type: 'warning',
      icon: 'bi-exclamation-triangle',
      message: `${leadName} n'a aucune activité enregistrée`,
      priority: 'high',
      actionLabel: 'Planifier un premier contact',
      actionRoute: `/activities/new?leadId=${lead.id}`,
      leadId: lead.id,
      leadName,
    });
  }

  // 2. High budget, no visit
  const q = lead.qualification;
  const highBudget = q?.budgetRange === '20k_50k' || q?.budgetRange === 'plus_50k' ||
    (lead.estimatedValue && parseFloat(lead.estimatedValue) >= 20000);
  const hasVisit = leadActivities.some(a => a.type === 'visite');
  if (highBudget && !hasVisit && lead.status !== 'gagne' && lead.status !== 'perdu') {
    suggestions.push({
      id: `needs-visit-${lead.id}`,
      type: 'opportunity',
      icon: 'bi-geo-alt',
      message: `Budget élevé pour ${leadName} — planifiez une visite technique`,
      priority: 'medium',
      actionLabel: 'Planifier une visite',
      actionRoute: `/activities/new?leadId=${lead.id}`,
      leadId: lead.id,
      leadName,
    });
  }

  // 3. Qualified without proposition
  if (lead.status === 'qualifie') {
    const createdDate = new Date(lead.updatedAt).getTime();
    const daysSinceQualified = Math.floor((Date.now() - createdDate) / (1000 * 60 * 60 * 24));
    if (daysSinceQualified >= 7) {
      suggestions.push({
        id: `stale-qualified-${lead.id}`,
        type: 'action',
        icon: 'bi-file-earmark-text',
        message: `${leadName} est qualifié depuis ${daysSinceQualified} jours sans proposition`,
        priority: 'high',
        actionLabel: 'Envoyer proposition',
        actionRoute: `/leads/${lead.id}`,
        leadId: lead.id,
        leadName,
      });
    }
  }

  // 4. Missing decision maker
  if (q && q.isDecisionMaker === false) {
    suggestions.push({
      id: `no-decision-maker-${lead.id}`,
      type: 'warning',
      icon: 'bi-person-x',
      message: `${leadName} n'est pas le décideur — identifiez le contact principal`,
      priority: 'medium',
      leadId: lead.id,
      leadName,
    });
  }

  // 5. Competition detected
  if (q?.hasCompetition) {
    suggestions.push({
      id: `competition-${lead.id}`,
      type: 'warning',
      icon: 'bi-exclamation-diamond',
      message: `${leadName} compare avec la concurrence — accélérez le processus`,
      priority: 'high',
      actionLabel: 'Voir le lead',
      actionRoute: `/leads/${lead.id}`,
      leadId: lead.id,
      leadName,
    });
  }

  // 6. Incomplete qualification
  const completeness = getQualificationCompleteness(lead);
  if (completeness < 50 && lead.status !== 'gagne' && lead.status !== 'perdu') {
    suggestions.push({
      id: `incomplete-qual-${lead.id}`,
      type: 'action',
      icon: 'bi-clipboard-check',
      message: `Qualification incomplète (${completeness}%) pour ${leadName}`,
      priority: completeness < 20 ? 'high' : 'medium',
      actionLabel: 'Compléter',
      actionRoute: `/prospection/qualify/${lead.id}`,
      leadId: lead.id,
      leadName,
    });
  }

  // 7. High score, low stage
  if (score.total >= 70 && lead.status === 'prospect') {
    suggestions.push({
      id: `high-score-low-stage-${lead.id}`,
      type: 'opportunity',
      icon: 'bi-arrow-up-circle',
      message: `Score élevé (${score.total}) pour ${leadName} — qualifiez ce lead rapidement`,
      priority: 'high',
      actionLabel: 'Qualifier',
      actionRoute: `/leads/${lead.id}`,
      leadId: lead.id,
      leadName,
    });
  }

  // 8. Urgent timeline no recent activity
  if (q?.timeline === 'urgent' && lead.status !== 'gagne' && lead.status !== 'perdu') {
    const hasRecentActivity = leadActivities.some(a => {
      const date = new Date(a.completedAt || a.createdAt).getTime();
      return (Date.now() - date) / (1000 * 60 * 60 * 24) < 2;
    });
    if (!hasRecentActivity) {
      suggestions.push({
        id: `urgent-inactive-${lead.id}`,
        type: 'warning',
        icon: 'bi-alarm',
        message: `Projet urgent pour ${leadName} sans activité récente`,
        priority: 'high',
        actionLabel: 'Contacter maintenant',
        actionRoute: `/activities/new?leadId=${lead.id}`,
        leadId: lead.id,
        leadName,
      });
    }
  }

  // 9. Large surface + security = premium opportunity
  if (lead.surface && parseFloat(lead.surface) > 150 &&
    q?.desiredServices?.includes('securite') &&
    lead.status !== 'gagne' && lead.status !== 'perdu') {
    suggestions.push({
      id: `premium-opportunity-${lead.id}`,
      type: 'opportunity',
      icon: 'bi-gem',
      message: `Grande surface + sécurité = opportunité premium pour ${leadName}`,
      priority: 'medium',
      leadId: lead.id,
      leadName,
    });
  }

  return suggestions.sort((a, b) => {
    const priorityOrder: Record<string, number> = { high: 0, medium: 1, low: 2 };
    return priorityOrder[a.priority] - priorityOrder[b.priority];
  });
}

export function getTopSuggestions(leads: Lead[], activities: Activity[], limit = 8): SmartSuggestion[] {
  const activeLeads = leads.filter(l => l.status !== 'gagne' && l.status !== 'perdu');
  const allSuggestions: SmartSuggestion[] = [];

  for (const lead of activeLeads) {
    const suggestions = generateSuggestions(lead, activities);
    allSuggestions.push(...suggestions);
  }

  // Deduplicate and sort by priority
  const priorityOrder: Record<string, number> = { high: 0, medium: 1, low: 2 };
  allSuggestions.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

  return allSuggestions.slice(0, limit);
}
