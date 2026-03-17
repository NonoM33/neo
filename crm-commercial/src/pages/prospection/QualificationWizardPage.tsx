import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardBody, Spinner, Button } from '../../components';
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
    <div className="qualification-wizard">
      {/* Header */}
      <div className="mb-4">
        <button className="btn btn-link text-muted p-0 mb-2" onClick={() => navigate('/prospection')}>
          <i className="bi bi-arrow-left me-1"></i>
          Retour à la prospection
        </button>
        <div className="d-flex align-items-center gap-2">
          <h5 style={{ margin: 0, fontWeight: 600 }}>
            <i className="bi bi-clipboard-check me-2" style={{ color: 'var(--neo-accent)' }}></i>
            {isEditing ? 'Qualifier le prospect' : 'Nouveau prospect'}
          </h5>
          <XPIndicator xp={30} size="md" />
        </div>
      </div>

      {/* Progress bar */}
      <div className="mb-4">
        <div className="d-flex justify-content-between mb-2">
          {['Contact', 'Besoins', 'Budget', 'Technique', 'Résumé'].map((label, i) => (
            <div
              key={label}
              style={{
                textAlign: 'center',
                flex: 1,
                cursor: i + 1 < currentStep ? 'pointer' : 'default',
              }}
              onClick={() => { if (i + 1 < currentStep) setCurrentStep(i + 1); }}
            >
              <div style={{
                width: '28px',
                height: '28px',
                borderRadius: '50%',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '0.75rem',
                fontWeight: 600,
                background: i + 1 <= currentStep ? 'var(--neo-accent)' : 'var(--neo-bg-light)',
                color: i + 1 <= currentStep ? '#fff' : 'var(--neo-text-muted)',
                transition: 'all 0.3s',
              }}>
                {i + 1 < currentStep ? <i className="bi bi-check"></i> : i + 1}
              </div>
              <div style={{
                fontSize: '0.7rem',
                marginTop: '4px',
                color: i + 1 <= currentStep ? 'var(--neo-text-primary)' : 'var(--neo-text-muted)',
                fontWeight: i + 1 === currentStep ? 600 : 400,
              }}>
                {label}
              </div>
            </div>
          ))}
        </div>
        <div style={{
          height: '4px',
          borderRadius: '2px',
          background: 'var(--neo-bg-light)',
          overflow: 'hidden',
        }}>
          <div style={{
            height: '100%',
            width: `${(currentStep / TOTAL_STEPS) * 100}%`,
            borderRadius: '2px',
            background: 'linear-gradient(90deg, var(--neo-accent), var(--neo-primary))',
            transition: 'width 0.4s ease',
          }} />
        </div>
      </div>

      <div className="row g-4">
        <div className="col-lg-8">
          <Card>
            <CardBody style={{ padding: '24px' }}>
              {/* Step 1: Contact */}
              {currentStep === 1 && (
                <div className="animate-fade-in">
                  <h6 className="mb-3" style={{ fontWeight: 600 }}>
                    <i className="bi bi-person me-2"></i>
                    Informations de contact
                  </h6>
                  <div className="row g-3">
                    <div className="col-md-6">
                      <label className="form-label">Prénom *</label>
                      <input className="form-control" value={data.firstName}
                        onChange={e => update({ firstName: e.target.value })} autoFocus />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label">Nom *</label>
                      <input className="form-control" value={data.lastName}
                        onChange={e => update({ lastName: e.target.value })} />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label">Email</label>
                      <input className="form-control" type="email" value={data.email}
                        onChange={e => update({ email: e.target.value })} />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label">Téléphone</label>
                      <input className="form-control" type="tel" value={data.phone}
                        onChange={e => update({ phone: e.target.value })} />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label">Entreprise</label>
                      <input className="form-control" value={data.company}
                        onChange={e => update({ company: e.target.value })} />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label">Source</label>
                      <select className="form-select" value={data.source}
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
                  <h6 className="mb-3" style={{ fontWeight: 600 }}>
                    <i className="bi bi-house-gear me-2"></i>
                    Besoins domotique
                  </h6>
                  <p style={{ color: 'var(--neo-text-secondary)', marginBottom: '16px' }}>
                    Quels services intéressent le prospect ? (sélection multiple)
                  </p>
                  <ServiceSelector
                    selected={data.desiredServices}
                    onChange={services => update({ desiredServices: services })}
                  />
                  <div className="mt-3">
                    <label className="form-label">Besoin principal / Commentaire</label>
                    <textarea className="form-control" rows={3} value={data.primaryNeed}
                      onChange={e => update({ primaryNeed: e.target.value })}
                      placeholder="Que recherche principalement le prospect ?" />
                  </div>
                </div>
              )}

              {/* Step 3: Budget & Timeline */}
              {currentStep === 3 && (
                <div className="animate-fade-in">
                  <h6 className="mb-3" style={{ fontWeight: 600 }}>
                    <i className="bi bi-currency-euro me-2"></i>
                    Budget & Planning
                  </h6>

                  <label className="form-label">Fourchette de budget</label>
                  <div className="row g-2 mb-3">
                    {(Object.entries(BUDGET_RANGE_LABELS) as [BudgetRange, string][]).map(([val, label]) => (
                      <div key={val} className="col-6 col-md-4">
                        <div
                          onClick={() => update({
                            budgetRange: val,
                            estimatedValue: BUDGET_RANGE_VALUES[val],
                          })}
                          style={{
                            padding: '12px',
                            borderRadius: '8px',
                            border: `2px solid ${data.budgetRange === val ? 'var(--neo-accent)' : 'var(--neo-border-color)'}`,
                            background: data.budgetRange === val ? 'var(--neo-accent-light)' : 'var(--neo-bg-light)',
                            cursor: 'pointer',
                            textAlign: 'center',
                            fontSize: '0.85rem',
                            fontWeight: data.budgetRange === val ? 600 : 400,
                            color: data.budgetRange === val ? 'var(--neo-accent)' : 'var(--neo-text-secondary)',
                            transition: 'all 0.2s',
                          }}
                        >
                          {label}
                        </div>
                      </div>
                    ))}
                  </div>

                  <label className="form-label">Délai du projet</label>
                  <div className="row g-2 mb-3">
                    {(Object.entries(TIMELINE_LABELS) as [ProjectTimeline, string][]).map(([val, label]) => (
                      <div key={val} className="col-6 col-md-3">
                        <div
                          onClick={() => update({ timeline: val })}
                          style={{
                            padding: '12px',
                            borderRadius: '8px',
                            border: `2px solid ${data.timeline === val ? 'var(--neo-accent)' : 'var(--neo-border-color)'}`,
                            background: data.timeline === val ? 'var(--neo-accent-light)' : 'var(--neo-bg-light)',
                            cursor: 'pointer',
                            textAlign: 'center',
                            transition: 'all 0.2s',
                          }}
                        >
                          <i className={`bi ${TIMELINE_ICONS[val]}`} style={{
                            display: 'block',
                            fontSize: '1.2rem',
                            marginBottom: '4px',
                            color: data.timeline === val ? 'var(--neo-accent)' : 'var(--neo-text-muted)',
                          }}></i>
                          <span style={{
                            fontSize: '0.8rem',
                            fontWeight: data.timeline === val ? 600 : 400,
                            color: data.timeline === val ? 'var(--neo-accent)' : 'var(--neo-text-secondary)',
                          }}>
                            {label}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="row g-3">
                    <div className="col-md-6">
                      <label className="form-label">Valeur estimée (€)</label>
                      <input className="form-control" type="number" value={data.estimatedValue || ''}
                        onChange={e => update({ estimatedValue: e.target.value ? parseFloat(e.target.value) : undefined })} />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label">Date de clôture prévue</label>
                      <input className="form-control" type="date" value={data.expectedCloseDate}
                        onChange={e => update({ expectedCloseDate: e.target.value })} />
                    </div>
                  </div>
                </div>
              )}

              {/* Step 4: Technical */}
              {currentStep === 4 && (
                <div className="animate-fade-in">
                  <h6 className="mb-3" style={{ fontWeight: 600 }}>
                    <i className="bi bi-tools me-2"></i>
                    Évaluation technique
                  </h6>

                  <div className="mb-3">
                    <label className="form-label">Titre du projet *</label>
                    <input className="form-control" value={data.title}
                      onChange={e => update({ title: e.target.value })}
                      placeholder="Ex: Installation domotique complète" />
                  </div>

                  <label className="form-label">Type de logement</label>
                  <div className="d-flex gap-2 mb-3">
                    {(Object.entries(HOUSING_TYPE_LABELS) as [HousingType, string][]).map(([val, label]) => (
                      <div
                        key={val}
                        onClick={() => update({ housingType: val })}
                        style={{
                          flex: 1,
                          padding: '16px',
                          borderRadius: '10px',
                          border: `2px solid ${data.housingType === val ? 'var(--neo-accent)' : 'var(--neo-border-color)'}`,
                          background: data.housingType === val ? 'var(--neo-accent-light)' : 'var(--neo-bg-light)',
                          cursor: 'pointer',
                          textAlign: 'center',
                          transition: 'all 0.2s',
                        }}
                      >
                        <i className={`bi ${HOUSING_TYPE_ICONS[val]}`} style={{
                          fontSize: '1.5rem',
                          display: 'block',
                          marginBottom: '4px',
                          color: data.housingType === val ? 'var(--neo-accent)' : 'var(--neo-text-muted)',
                        }}></i>
                        <span style={{
                          fontSize: '0.85rem',
                          fontWeight: data.housingType === val ? 600 : 400,
                          color: data.housingType === val ? 'var(--neo-accent)' : 'var(--neo-text-secondary)',
                        }}>
                          {label}
                        </span>
                      </div>
                    ))}
                  </div>

                  <div className="row g-3">
                    <div className="col-md-6">
                      <label className="form-label">Âge du logement</label>
                      <select className="form-select" value={data.housingAge || ''}
                        onChange={e => update({ housingAge: (e.target.value || undefined) as HousingAge | undefined })}>
                        <option value="">Sélectionner</option>
                        {Object.entries(HOUSING_AGE_LABELS).map(([val, label]) => (
                          <option key={val} value={val}>{label}</option>
                        ))}
                      </select>
                    </div>
                    <div className="col-md-6">
                      <label className="form-label">Surface (m²)</label>
                      <input className="form-control" type="number" value={data.surface || ''}
                        onChange={e => update({ surface: e.target.value ? parseFloat(e.target.value) : undefined })} />
                    </div>
                    <div className="col-md-12">
                      <label className="form-label">Installation existante</label>
                      <select className="form-select" value={data.existingInstallation || ''}
                        onChange={e => update({ existingInstallation: (e.target.value || undefined) as ExistingInstallation | undefined })}>
                        <option value="">Sélectionner</option>
                        {Object.entries(EXISTING_INSTALLATION_LABELS).map(([val, label]) => (
                          <option key={val} value={val}>{label}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <hr style={{ borderColor: 'var(--neo-border-color)', margin: '16px 0' }} />

                  <div className="row g-3">
                    <div className="col-md-6">
                      <label className="form-label">Décideur ?</label>
                      <div className="d-flex gap-2">
                        {[true, false].map(val => (
                          <button
                            key={String(val)}
                            type="button"
                            className={`btn btn-sm flex-fill ${data.isDecisionMaker === val ? 'btn-primary' : 'btn-outline-secondary'}`}
                            onClick={() => update({ isDecisionMaker: val })}
                          >
                            {val ? 'Oui' : 'Non'}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="col-md-6">
                      <label className="form-label">Concurrence ?</label>
                      <div className="d-flex gap-2">
                        {[true, false].map(val => (
                          <button
                            key={String(val)}
                            type="button"
                            className={`btn btn-sm flex-fill ${data.hasCompetition === val ? 'btn-primary' : 'btn-outline-secondary'}`}
                            onClick={() => update({ hasCompetition: val })}
                          >
                            {val ? 'Oui' : 'Non'}
                          </button>
                        ))}
                      </div>
                    </div>
                    {data.hasCompetition && (
                      <div className="col-12">
                        <label className="form-label">Détails concurrence</label>
                        <input className="form-control" value={data.competitionDetails}
                          onChange={e => update({ competitionDetails: e.target.value })}
                          placeholder="Quels concurrents ?" />
                      </div>
                    )}
                  </div>

                  <hr style={{ borderColor: 'var(--neo-border-color)', margin: '16px 0' }} />

                  <div className="row g-3">
                    <div className="col-12">
                      <label className="form-label">Adresse</label>
                      <input className="form-control" value={data.address}
                        onChange={e => update({ address: e.target.value })} />
                    </div>
                    <div className="col-md-4">
                      <label className="form-label">Code postal</label>
                      <input className="form-control" value={data.postalCode}
                        onChange={e => update({ postalCode: e.target.value })} />
                    </div>
                    <div className="col-md-8">
                      <label className="form-label">Ville</label>
                      <input className="form-control" value={data.city}
                        onChange={e => update({ city: e.target.value })} />
                    </div>
                    <div className="col-12">
                      <label className="form-label">Notes techniques</label>
                      <textarea className="form-control" rows={3} value={data.technicalNotes}
                        onChange={e => update({ technicalNotes: e.target.value })}
                        placeholder="Particularités techniques, contraintes..." />
                    </div>
                  </div>
                </div>
              )}

              {/* Step 5: Summary */}
              {currentStep === 5 && (
                <div className="animate-fade-in">
                  <h6 className="mb-3" style={{ fontWeight: 600 }}>
                    <i className="bi bi-check-circle me-2"></i>
                    Résumé & Score
                  </h6>

                  <div className="text-center mb-4">
                    <ScoreGauge score={previewScore} size="lg" />
                  </div>

                  <div className="mb-4">
                    <ScoreBreakdown breakdown={previewScore.breakdown} />
                  </div>

                  <hr style={{ borderColor: 'var(--neo-border-color)' }} />

                  {/* Summary */}
                  <div className="row g-3">
                    <div className="col-md-6">
                      <h6 style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--neo-text-secondary)' }}>Contact</h6>
                      <p style={{ margin: '0 0 4px', fontWeight: 600 }}>{data.firstName} {data.lastName}</p>
                      {data.email && <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--neo-text-secondary)' }}>{data.email}</p>}
                      {data.phone && <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--neo-text-secondary)' }}>{data.phone}</p>}
                    </div>
                    <div className="col-md-6">
                      <h6 style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--neo-text-secondary)' }}>Projet</h6>
                      <p style={{ margin: '0 0 4px', fontWeight: 600 }}>{data.title || 'Projet domotique'}</p>
                      {data.budgetRange && <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--neo-text-secondary)' }}>{BUDGET_RANGE_LABELS[data.budgetRange]}</p>}
                      {data.timeline && <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--neo-text-secondary)' }}>{TIMELINE_LABELS[data.timeline]}</p>}
                    </div>
                    <div className="col-12">
                      <h6 style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--neo-text-secondary)' }}>Services</h6>
                      <div className="d-flex flex-wrap gap-1">
                        {data.desiredServices.map(s => (
                          <span key={s} className="badge" style={{
                            background: 'var(--neo-accent-light)',
                            color: 'var(--neo-accent)',
                          }}>
                            {
                              // Import labels
                              { securite: 'Sécurité', energie: 'Énergie', confort: 'Confort', multimedia: 'Multimédia', jardin: 'Jardin' }[s]
                            }
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  {previewSuggestions.length > 0 && (
                    <>
                      <hr style={{ borderColor: 'var(--neo-border-color)' }} />
                      <SuggestionsList
                        suggestions={previewSuggestions}
                        title="Prochaines actions recommandées"
                        maxItems={3}
                      />
                    </>
                  )}
                </div>
              )}
            </CardBody>
          </Card>

          {/* Navigation buttons */}
          <div className="d-flex justify-content-between mt-3">
            <button
              className="btn btn-outline-secondary"
              onClick={currentStep === 1 ? () => navigate('/prospection') : prevStep}
            >
              <i className="bi bi-arrow-left me-1"></i>
              {currentStep === 1 ? 'Annuler' : 'Précédent'}
            </button>

            {currentStep < TOTAL_STEPS ? (
              <button
                className="btn btn-primary"
                onClick={nextStep}
                disabled={!canProceed()}
              >
                Suivant
                <i className="bi bi-arrow-right ms-1"></i>
              </button>
            ) : (
              <Button
                loading={submitting}
                onClick={handleSubmit}
                icon="bi-check-lg"
                style={{
                  background: 'linear-gradient(135deg, var(--neo-accent), var(--neo-primary))',
                  border: 'none',
                }}
              >
                Enregistrer le prospect
              </Button>
            )}
          </div>
        </div>

        {/* Right sidebar: Live score preview */}
        <div className="col-lg-4">
          <div className="glass-card" style={{ padding: '16px', position: 'sticky', top: '80px' }}>
            <h6 style={{ fontWeight: 600, marginBottom: '12px', color: 'var(--neo-text-primary)' }}>
              <i className="bi bi-speedometer2 me-2" style={{ color: 'var(--neo-accent)' }}></i>
              Score en direct
            </h6>
            <div className="text-center mb-3">
              <ScoreGauge score={previewScore} size="md" />
            </div>
            <ScoreBreakdown breakdown={previewScore.breakdown} />

            <hr style={{ borderColor: 'var(--neo-border-color)', margin: '12px 0' }} />

            <div style={{ fontSize: '0.8rem', color: 'var(--neo-text-muted)' }}>
              <p className="mb-1">
                <i className="bi bi-info-circle me-1"></i>
                Complétez les étapes pour augmenter le score
              </p>
              <p className="mb-0">
                Étape {currentStep}/{TOTAL_STEPS}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default QualificationWizardPage;
