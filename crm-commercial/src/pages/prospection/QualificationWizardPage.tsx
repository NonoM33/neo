import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Spinner } from '../../components';
import { Card, Btn, Icon } from '../../components/neo';
import { leadsService } from '../../services';
import { computeLeadScore } from '../../services/scoring.engine';
import { generateSuggestions } from '../../services/suggestions.engine';
import { useGamificationStore } from '../../stores';
import { ServiceSelector, ScoreGauge, ScoreBreakdown, SuggestionsList } from '../../components/prospection';
import { XPIndicator } from '../../components/gamification';
import type { Lead, LeadSource } from '../../types';
import { LEAD_SOURCE_LABELS } from '../../types';
import type {
  HousingType, HousingAge, DesiredService, ExistingInstallation,
  BudgetRange, ProjectTimeline, LeadQualification,
} from '../../types/prospection.types';
import {
  HOUSING_TYPE_LABELS, HOUSING_TYPE_ICONS, HOUSING_AGE_LABELS,
  EXISTING_INSTALLATION_LABELS, BUDGET_RANGE_LABELS, BUDGET_RANGE_VALUES,
  TIMELINE_LABELS, TIMELINE_ICONS,
} from '../../types/prospection.types';

const TOTAL_STEPS = 5;

const STEP_LABELS = ['Contact', 'Besoins', 'Budget', 'Technique', 'Résumé'];

interface WizardData {
  // Step 1: Contact
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  company: string;
  source: LeadSource;
  // Step 2: Needs
  desiredServices: DesiredService[];
  primaryNeed: string;
  // Step 3: Budget & Timeline
  budgetRange?: BudgetRange;
  timeline?: ProjectTimeline;
  estimatedValue?: number;
  expectedCloseDate: string;
  // Step 4: Technical
  title: string;
  housingType?: HousingType;
  housingAge?: HousingAge;
  surface?: number;
  existingInstallation?: ExistingInstallation;
  isDecisionMaker?: boolean;
  hasCompetition?: boolean;
  competitionDetails: string;
  address: string;
  city: string;
  postalCode: string;
  technicalNotes: string;
}

const choiceStyle = (active: boolean) => ({
  padding: 12,
  borderRadius: 'var(--r-sm)',
  border: `1.5px solid ${active ? 'var(--ochre)' : 'var(--line-2)'}`,
  background: active ? 'var(--ochre-soft)' : 'var(--card)',
  cursor: 'pointer',
  textAlign: 'center' as const,
  fontSize: 13.5,
  fontWeight: active ? 600 : 400,
  color: active ? 'var(--ochre-press)' : 'var(--ink-3)',
  transition: 'all .15s var(--ease)',
});

export function QualificationWizardPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const gamification = useGamificationStore();
  const isEditing = !!id;

  const [loading, setLoading] = useState(isEditing);
  const [submitting, setSubmitting] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [wizardStarted, setWizardStarted] = useState(false);

  const [data, setData] = useState<WizardData>({
    firstName: '', lastName: '', email: '', phone: '', company: '',
    source: 'site_web',
    desiredServices: [], primaryNeed: '',
    expectedCloseDate: '', competitionDetails: '',
    address: '', city: '', postalCode: '', technicalNotes: '',
    title: '',
  });

  useEffect(() => {
    if (isEditing && id) loadLead();
  }, [id]);

  const loadLead = async () => {
    try {
      const lead = await leadsService.getLead(id!);
      const q = lead.qualification;
      setData({
        firstName: lead.firstName,
        lastName: lead.lastName,
        email: lead.email || '',
        phone: lead.phone || '',
        company: lead.company || '',
        source: lead.source,
        desiredServices: q?.desiredServices || [],
        primaryNeed: q?.primaryNeed || '',
        budgetRange: q?.budgetRange,
        timeline: q?.timeline,
        estimatedValue: lead.estimatedValue ? parseFloat(lead.estimatedValue) : undefined,
        expectedCloseDate: lead.expectedCloseDate || '',
        title: lead.title,
        housingType: q?.housingType,
        housingAge: q?.housingAge,
        surface: lead.surface ? parseFloat(lead.surface) : undefined,
        existingInstallation: q?.existingInstallation,
        isDecisionMaker: q?.isDecisionMaker,
        hasCompetition: q?.hasCompetition,
        competitionDetails: q?.competitionDetails || '',
        address: lead.address || '',
        city: lead.city || '',
        postalCode: lead.postalCode || '',
        technicalNotes: q?.technicalNotes || '',
      });
    } catch (error) {
      console.error('Failed to load lead:', error);
    } finally {
      setLoading(false);
    }
  };

  const update = (fields: Partial<WizardData>) => {
    setData(prev => ({ ...prev, ...fields }));
  };

  const canProceed = (): boolean => {
    switch (currentStep) {
      case 1: return !!(data.firstName.trim() && data.lastName.trim());
      case 2: return data.desiredServices.length > 0;
      case 3: return true;
      case 4: return !!data.title.trim();
      default: return true;
    }
  };

  const nextStep = () => {
    if (currentStep === 2 && !wizardStarted) {
      gamification.awardXP('qualification_wizard_started');
      setWizardStarted(true);
    }
    setCurrentStep(s => Math.min(s + 1, TOTAL_STEPS));
  };

  const prevStep = () => setCurrentStep(s => Math.max(s - 1, 1));

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const qualification: LeadQualification = {
        housingType: data.housingType,
        housingAge: data.housingAge,
        desiredServices: data.desiredServices,
        existingInstallation: data.existingInstallation,
        budgetRange: data.budgetRange,
        timeline: data.timeline,
        isDecisionMaker: data.isDecisionMaker,
        hasCompetition: data.hasCompetition,
        competitionDetails: data.competitionDetails || undefined,
        technicalNotes: data.technicalNotes || undefined,
        primaryNeed: data.primaryNeed || undefined,
      };

      const leadData = {
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email || undefined,
        phone: data.phone || undefined,
        company: data.company || undefined,
        title: data.title || `Projet domotique - ${data.firstName} ${data.lastName}`,
        source: data.source,
        estimatedValue: data.estimatedValue,
        expectedCloseDate: data.expectedCloseDate || undefined,
        address: data.address || undefined,
        city: data.city || undefined,
        postalCode: data.postalCode || undefined,
        surface: data.surface,
        qualification,
      };

      if (isEditing) {
        await leadsService.updateLead(id!, leadData);
      } else {
        await leadsService.createLead(leadData);
        gamification.awardXP('lead_created');
      }

      gamification.awardXP('lead_qualification_completed');
      navigate('/prospection');
    } catch (error) {
      console.error('Failed to save lead:', error);
    } finally {
      setSubmitting(false);
    }
  };

  // Build a mock lead for score preview
  const previewLead: Lead = {
    id: id || 'preview',
    firstName: data.firstName,
    lastName: data.lastName,
    email: data.email,
    phone: data.phone,
    company: data.company,
    title: data.title || 'Projet',
    status: 'prospect',
    source: data.source,
    estimatedValue: data.estimatedValue?.toString(),
    probability: 20,
    ownerId: '',
    address: data.address,
    city: data.city,
    postalCode: data.postalCode,
    surface: data.surface?.toString(),
    expectedCloseDate: data.expectedCloseDate,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    qualification: {
      housingType: data.housingType,
      housingAge: data.housingAge,
      desiredServices: data.desiredServices,
      existingInstallation: data.existingInstallation,
      budgetRange: data.budgetRange,
      timeline: data.timeline,
      isDecisionMaker: data.isDecisionMaker,
      hasCompetition: data.hasCompetition,
      competitionDetails: data.competitionDetails,
      technicalNotes: data.technicalNotes,
      primaryNeed: data.primaryNeed,
    },
  };

  const previewScore = computeLeadScore(previewLead, []);
  const previewSuggestions = generateSuggestions(previewLead, []);

  if (loading) return <Spinner />;

  const sourceOptions = Object.entries(LEAD_SOURCE_LABELS);

  return (
    <div style={{ padding: 28 }}>
      {/* Header */}
      <div className="page-head">
        <div className="ph-l">
          <button className="back-link" onClick={() => navigate('/prospection')}>
            <Icon name="arrowLeft" size={15} /> Retour à la prospection
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <h1>{isEditing ? 'Qualifier le prospect' : 'Nouveau prospect'}</h1>
            <XPIndicator xp={30} size="md" />
          </div>
        </div>
      </div>

      {/* Stepper */}
      <div style={{ marginBottom: 22 }}>
        <div className="stepper">
          {STEP_LABELS.map((label, i) => {
            const stepNumber = i + 1;
            const state = stepNumber < currentStep
              ? 'done'
              : stepNumber === currentStep
                ? 'current'
                : 'upcoming';
            const clickable = stepNumber < currentStep;
            return (
              <div
                key={label}
                className={`step-node ${state}`}
                style={{ cursor: clickable ? 'pointer' : 'default' }}
                onClick={() => { if (clickable) setCurrentStep(stepNumber); }}
              >
                <span className="step-dot">
                  {state === 'done' ? <Icon name="check" size={20} /> : stepNumber}
                </span>
                <span className="step-t">{label}</span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="lead-grid">
        <div>
          <Card>
            <div className="card-body">
              {/* Step 1: Contact */}
              {currentStep === 1 && (
                <div className="animate-fade-in">
                  <h3 style={{ fontWeight: 600, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Icon name="user" size={18} />
                    Informations de contact
                  </h3>
                  <div className="field-grid" style={{ marginTop: 0, paddingTop: 0, borderTop: 'none' }}>
                    <div>
                      <div className="field-label">Prénom *</div>
                      <input className="neo-field" value={data.firstName}
                        onChange={e => update({ firstName: e.target.value })} autoFocus />
                    </div>
                    <div>
                      <div className="field-label">Nom *</div>
                      <input className="neo-field" value={data.lastName}
                        onChange={e => update({ lastName: e.target.value })} />
                    </div>
                    <div>
                      <div className="field-label">Email</div>
                      <input className="neo-field" type="email" value={data.email}
                        onChange={e => update({ email: e.target.value })} />
                    </div>
                    <div>
                      <div className="field-label">Téléphone</div>
                      <input className="neo-field" type="tel" value={data.phone}
                        onChange={e => update({ phone: e.target.value })} />
                    </div>
                    <div>
                      <div className="field-label">Entreprise</div>
                      <input className="neo-field" value={data.company}
                        onChange={e => update({ company: e.target.value })} />
                    </div>
                    <div>
                      <div className="field-label">Source</div>
                      <select className="neo-field" value={data.source}
                        onChange={e => update({ source: e.target.value as LeadSource })}>
                        {sourceOptions.map(([val, label]) => (
                          <option key={val} value={val}>{label}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {/* Step 2: Needs */}
              {currentStep === 2 && (
                <div className="animate-fade-in">
                  <h3 style={{ fontWeight: 600, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Icon name="home" size={18} />
                    Besoins domotique
                  </h3>
                  <p style={{ color: 'var(--ink-3)', marginBottom: 16, fontSize: 14 }}>
                    Quels services intéressent le prospect ? (sélection multiple)
                  </p>
                  <ServiceSelector
                    selected={data.desiredServices}
                    onChange={services => update({ desiredServices: services })}
                  />
                  <div style={{ marginTop: 16 }}>
                    <div className="field-label">Besoin principal / Commentaire</div>
                    <textarea className="neo-field" rows={3} value={data.primaryNeed}
                      onChange={e => update({ primaryNeed: e.target.value })}
                      placeholder="Que recherche principalement le prospect ?" />
                  </div>
                </div>
              )}

              {/* Step 3: Budget & Timeline */}
              {currentStep === 3 && (
                <div className="animate-fade-in">
                  <h3 style={{ fontWeight: 600, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Icon name="euro" size={18} />
                    Budget & Planning
                  </h3>

                  <div className="field-label">Fourchette de budget</div>
                  <div className="grid-3" style={{ marginBottom: 18 }}>
                    {(Object.entries(BUDGET_RANGE_LABELS) as [BudgetRange, string][]).map(([val, label]) => (
                      <div
                        key={val}
                        onClick={() => update({
                          budgetRange: val,
                          estimatedValue: BUDGET_RANGE_VALUES[val],
                        })}
                        style={choiceStyle(data.budgetRange === val)}
                      >
                        {label}
                      </div>
                    ))}
                  </div>

                  <div className="field-label">Délai du projet</div>
                  <div className="grid-3" style={{ marginBottom: 18 }}>
                    {(Object.entries(TIMELINE_LABELS) as [ProjectTimeline, string][]).map(([val, label]) => {
                      const active = data.timeline === val;
                      return (
                        <div
                          key={val}
                          onClick={() => update({ timeline: val })}
                          style={choiceStyle(active)}
                        >
                          <i className={`bi ${TIMELINE_ICONS[val]}`} style={{
                            display: 'block',
                            fontSize: '1.2rem',
                            marginBottom: 4,
                          }}></i>
                          <span>{label}</span>
                        </div>
                      );
                    })}
                  </div>

                  <div className="field-grid" style={{ marginTop: 0, paddingTop: 0, borderTop: 'none' }}>
                    <div>
                      <div className="field-label">Valeur estimée (€)</div>
                      <input className="neo-field" type="number" value={data.estimatedValue || ''}
                        onChange={e => update({ estimatedValue: e.target.value ? parseFloat(e.target.value) : undefined })} />
                    </div>
                    <div>
                      <div className="field-label">Date de clôture prévue</div>
                      <input className="neo-field" type="date" value={data.expectedCloseDate}
                        onChange={e => update({ expectedCloseDate: e.target.value })} />
                    </div>
                  </div>
                </div>
              )}

              {/* Step 4: Technical */}
              {currentStep === 4 && (
                <div className="animate-fade-in">
                  <h3 style={{ fontWeight: 600, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Icon name="settings" size={18} />
                    Évaluation technique
                  </h3>

                  <div style={{ marginBottom: 16 }}>
                    <div className="field-label">Titre du projet *</div>
                    <input className="neo-field" value={data.title}
                      onChange={e => update({ title: e.target.value })}
                      placeholder="Ex: Installation domotique complète" />
                  </div>

                  <div className="field-label">Type de logement</div>
                  <div style={{ display: 'flex', gap: 12, marginBottom: 18 }}>
                    {(Object.entries(HOUSING_TYPE_LABELS) as [HousingType, string][]).map(([val, label]) => {
                      const active = data.housingType === val;
                      return (
                        <div
                          key={val}
                          onClick={() => update({ housingType: val })}
                          style={{ ...choiceStyle(active), flex: 1, padding: 16 }}
                        >
                          <i className={`bi ${HOUSING_TYPE_ICONS[val]}`} style={{
                            fontSize: '1.5rem',
                            display: 'block',
                            marginBottom: 4,
                          }}></i>
                          <span>{label}</span>
                        </div>
                      );
                    })}
                  </div>

                  <div className="field-grid" style={{ marginTop: 0, paddingTop: 0, borderTop: 'none' }}>
                    <div>
                      <div className="field-label">Âge du logement</div>
                      <select className="neo-field" value={data.housingAge || ''}
                        onChange={e => update({ housingAge: (e.target.value || undefined) as HousingAge | undefined })}>
                        <option value="">Sélectionner</option>
                        {Object.entries(HOUSING_AGE_LABELS).map(([val, label]) => (
                          <option key={val} value={val}>{label}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <div className="field-label">Surface (m²)</div>
                      <input className="neo-field" type="number" value={data.surface || ''}
                        onChange={e => update({ surface: e.target.value ? parseFloat(e.target.value) : undefined })} />
                    </div>
                  </div>
                  <div style={{ marginTop: 14 }}>
                    <div className="field-label">Installation existante</div>
                    <select className="neo-field" value={data.existingInstallation || ''}
                      onChange={e => update({ existingInstallation: (e.target.value || undefined) as ExistingInstallation | undefined })}>
                      <option value="">Sélectionner</option>
                      {Object.entries(EXISTING_INSTALLATION_LABELS).map(([val, label]) => (
                        <option key={val} value={val}>{label}</option>
                      ))}
                    </select>
                  </div>

                  <hr style={{ border: 'none', borderTop: '1px solid var(--line)', margin: '18px 0' }} />

                  <div className="field-grid" style={{ marginTop: 0, paddingTop: 0, borderTop: 'none' }}>
                    <div>
                      <div className="field-label">Décideur ?</div>
                      <div style={{ display: 'flex', gap: 8 }}>
                        {[true, false].map(val => (
                          <Btn
                            key={String(val)}
                            type="button"
                            size="sm"
                            variant={data.isDecisionMaker === val ? 'primary' : 'subtle'}
                            style={{ flex: 1 }}
                            onClick={() => update({ isDecisionMaker: val })}
                          >
                            {val ? 'Oui' : 'Non'}
                          </Btn>
                        ))}
                      </div>
                    </div>
                    <div>
                      <div className="field-label">Concurrence ?</div>
                      <div style={{ display: 'flex', gap: 8 }}>
                        {[true, false].map(val => (
                          <Btn
                            key={String(val)}
                            type="button"
                            size="sm"
                            variant={data.hasCompetition === val ? 'primary' : 'subtle'}
                            style={{ flex: 1 }}
                            onClick={() => update({ hasCompetition: val })}
                          >
                            {val ? 'Oui' : 'Non'}
                          </Btn>
                        ))}
                      </div>
                    </div>
                  </div>
                  {data.hasCompetition && (
                    <div style={{ marginTop: 14 }}>
                      <div className="field-label">Détails concurrence</div>
                      <input className="neo-field" value={data.competitionDetails}
                        onChange={e => update({ competitionDetails: e.target.value })}
                        placeholder="Quels concurrents ?" />
                    </div>
                  )}

                  <hr style={{ border: 'none', borderTop: '1px solid var(--line)', margin: '18px 0' }} />

                  <div style={{ marginBottom: 14 }}>
                    <div className="field-label">Adresse</div>
                    <input className="neo-field" value={data.address}
                      onChange={e => update({ address: e.target.value })} />
                  </div>
                  <div className="field-grid" style={{ marginTop: 0, paddingTop: 0, borderTop: 'none' }}>
                    <div>
                      <div className="field-label">Code postal</div>
                      <input className="neo-field" value={data.postalCode}
                        onChange={e => update({ postalCode: e.target.value })} />
                    </div>
                    <div>
                      <div className="field-label">Ville</div>
                      <input className="neo-field" value={data.city}
                        onChange={e => update({ city: e.target.value })} />
                    </div>
                  </div>
                  <div style={{ marginTop: 14 }}>
                    <div className="field-label">Notes techniques</div>
                    <textarea className="neo-field" rows={3} value={data.technicalNotes}
                      onChange={e => update({ technicalNotes: e.target.value })}
                      placeholder="Particularités techniques, contraintes..." />
                  </div>
                </div>
              )}

              {/* Step 5: Summary */}
              {currentStep === 5 && (
                <div className="animate-fade-in">
                  <h3 style={{ fontWeight: 600, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Icon name="checkCircle" size={18} />
                    Résumé & Score
                  </h3>

                  <div style={{ textAlign: 'center', marginBottom: 22 }}>
                    <ScoreGauge score={previewScore} size="lg" />
                  </div>

                  <div style={{ marginBottom: 22 }}>
                    <ScoreBreakdown breakdown={previewScore.breakdown} />
                  </div>

                  <hr style={{ border: 'none', borderTop: '1px solid var(--line)', margin: '18px 0' }} />

                  {/* Summary */}
                  <div className="field-grid" style={{ marginTop: 0, paddingTop: 0, borderTop: 'none' }}>
                    <div>
                      <div className="field-label">Contact</div>
                      <p style={{ margin: '0 0 4px', fontWeight: 600 }}>{data.firstName} {data.lastName}</p>
                      {data.email && <p style={{ margin: 0, fontSize: 13.5, color: 'var(--ink-3)' }}>{data.email}</p>}
                      {data.phone && <p style={{ margin: 0, fontSize: 13.5, color: 'var(--ink-3)' }}>{data.phone}</p>}
                    </div>
                    <div>
                      <div className="field-label">Projet</div>
                      <p style={{ margin: '0 0 4px', fontWeight: 600 }}>{data.title || 'Projet domotique'}</p>
                      {data.budgetRange && <p style={{ margin: 0, fontSize: 13.5, color: 'var(--ink-3)' }}>{BUDGET_RANGE_LABELS[data.budgetRange]}</p>}
                      {data.timeline && <p style={{ margin: 0, fontSize: 13.5, color: 'var(--ink-3)' }}>{TIMELINE_LABELS[data.timeline]}</p>}
                    </div>
                  </div>
                  <div style={{ marginTop: 14 }}>
                    <div className="field-label">Services</div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                      {data.desiredServices.map(s => (
                        <span key={s} className="pill ochre">
                          {
                            { securite: 'Sécurité', energie: 'Énergie', confort: 'Confort', multimedia: 'Multimédia', jardin: 'Jardin' }[s]
                          }
                        </span>
                      ))}
                    </div>
                  </div>

                  {previewSuggestions.length > 0 && (
                    <>
                      <hr style={{ border: 'none', borderTop: '1px solid var(--line)', margin: '18px 0' }} />
                      <SuggestionsList
                        suggestions={previewSuggestions}
                        title="Prochaines actions recommandées"
                        maxItems={3}
                      />
                    </>
                  )}
                </div>
              )}
            </div>
          </Card>

          {/* Navigation buttons */}
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 16 }}>
            <Btn
              variant="subtle"
              icon="arrowLeft"
              onClick={currentStep === 1 ? () => navigate('/prospection') : prevStep}
            >
              {currentStep === 1 ? 'Annuler' : 'Précédent'}
            </Btn>

            {currentStep < TOTAL_STEPS ? (
              <Btn
                iconRight="arrowRight"
                onClick={nextStep}
                disabled={!canProceed()}
              >
                Suivant
              </Btn>
            ) : (
              <Btn
                variant="ochre"
                icon="check"
                disabled={submitting}
                onClick={handleSubmit}
              >
                {submitting ? 'Enregistrement…' : 'Enregistrer le prospect'}
              </Btn>
            )}
          </div>
        </div>

        {/* Right sidebar: Live score preview */}
        <div>
          <Card head="Score en direct" icon="gauge" style={{ position: 'sticky', top: 80 }}>
            <div className="card-body">
              <div style={{ textAlign: 'center', marginBottom: 16 }}>
                <ScoreGauge score={previewScore} size="md" />
              </div>
              <ScoreBreakdown breakdown={previewScore.breakdown} />

              <hr style={{ border: 'none', borderTop: '1px solid var(--line)', margin: '14px 0' }} />

              <div style={{ fontSize: 13, color: 'var(--ink-3)' }}>
                <p style={{ margin: '0 0 4px', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Icon name="sparkles" size={14} />
                  Complétez les étapes pour augmenter le score
                </p>
                <p style={{ margin: 0 }}>
                  Étape {currentStep}/{TOTAL_STEPS}
                </p>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

export default QualificationWizardPage;
