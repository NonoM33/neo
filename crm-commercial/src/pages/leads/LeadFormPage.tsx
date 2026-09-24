import { useCallback, useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Spinner } from '../../components';
import { Card, Btn } from '../../components/neo';
import { leadsService } from '../../services';
import type { CreateLeadInput } from '../../types';
import { LEAD_STATUS_LABELS, LEAD_SOURCE_LABELS } from '../../types';
import { useGamificationStore } from '../../stores';
import { XPIndicator } from '../../components/gamification';

export function LeadFormPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const gamification = useGamificationStore();
  const isEditing = !!id;

  const [loading, setLoading] = useState(isEditing);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [formData, setFormData] = useState<CreateLeadInput>({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    company: '',
    title: '',
    description: '',
    status: 'prospect',
    source: 'site_web',
    estimatedValue: undefined,
    probability: 20,
    address: '',
    city: '',
    postalCode: '',
    surface: undefined,
    expectedCloseDate: '',
  });

  const loadLead = useCallback(async () => {
    try {
      const lead = await leadsService.getLead(id!);
      setFormData({
        firstName: lead.firstName,
        lastName: lead.lastName,
        email: lead.email || '',
        phone: lead.phone || '',
        company: lead.company || '',
        title: lead.title,
        description: lead.description || '',
        status: lead.status,
        source: lead.source,
        estimatedValue: lead.estimatedValue ? parseFloat(lead.estimatedValue) : undefined,
        probability: lead.probability,
        address: lead.address || '',
        city: lead.city || '',
        postalCode: lead.postalCode || '',
        surface: lead.surface ? parseFloat(lead.surface) : undefined,
        expectedCloseDate: lead.expectedCloseDate || '',
      });
    } catch (error) {
      console.error('Failed to load lead:', error);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (isEditing && id) {
      loadLead();
    }
  }, [isEditing, id, loadLead]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>,
  ) => {
    const { name, value, type } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'number' ? (value ? parseFloat(value) : undefined) : value,
    }));
    setErrors((prev) => ({ ...prev, [name]: '' }));
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!formData.firstName.trim()) newErrors.firstName = 'Le prénom est requis';
    if (!formData.lastName.trim()) newErrors.lastName = 'Le nom est requis';
    if (!formData.title.trim()) newErrors.title = 'Le titre du projet est requis';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setSubmitting(true);
    try {
      if (isEditing) {
        await leadsService.updateLead(id!, formData);
      } else {
        await leadsService.createLead(formData);
        gamification.awardXP('lead_created');
      }
      navigate('/leads');
    } catch (error) {
      console.error('Failed to save lead:', error);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <Spinner />;
  }

  return (
    <div style={{ padding: 28 }}>
      <div className="page-head">
        <div className="ph-l">
          <button className="back-link" onClick={() => navigate('/leads')}>
            ← Retour aux leads
          </button>
          <h1 style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {isEditing ? 'Modifier le lead' : 'Nouveau lead'}
            {!isEditing && <XPIndicator xp={15} />}
          </h1>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="lead-grid">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            <Card head="Informations de contact" icon="user">
              <div className="card-body">
                <div className="field-grid" style={{ marginTop: 0, paddingTop: 0, borderTop: 'none' }}>
                  <div>
                    <div className="field-label">Prénom *</div>
                    <input
                      className="neo-field"
                      name="firstName"
                      value={formData.firstName}
                      onChange={handleChange}
                    />
                    {errors.firstName && <div className="field-error">{errors.firstName}</div>}
                  </div>
                  <div>
                    <div className="field-label">Nom *</div>
                    <input
                      className="neo-field"
                      name="lastName"
                      value={formData.lastName}
                      onChange={handleChange}
                    />
                    {errors.lastName && <div className="field-error">{errors.lastName}</div>}
                  </div>
                </div>
                <div className="field-grid">
                  <div>
                    <div className="field-label">Email</div>
                    <input
                      className="neo-field"
                      name="email"
                      type="email"
                      value={formData.email}
                      onChange={handleChange}
                    />
                  </div>
                  <div>
                    <div className="field-label">Téléphone</div>
                    <input
                      className="neo-field"
                      name="phone"
                      type="tel"
                      value={formData.phone}
                      onChange={handleChange}
                    />
                  </div>
                </div>
                <div style={{ marginTop: 14 }}>
                  <div className="field-label">Entreprise</div>
                  <input
                    className="neo-field"
                    name="company"
                    value={formData.company}
                    onChange={handleChange}
                  />
                </div>
              </div>
            </Card>

            <Card head="Projet" icon="target">
              <div className="card-body">
                <div className="field-label">Titre du projet *</div>
                <input
                  className="neo-field"
                  name="title"
                  value={formData.title}
                  onChange={handleChange}
                />
                {errors.title && <div className="field-error">{errors.title}</div>}
                <div style={{ marginTop: 14 }}>
                  <div className="field-label">Description</div>
                  <textarea
                    className="neo-field"
                    name="description"
                    rows={4}
                    value={formData.description}
                    onChange={handleChange}
                  />
                </div>
                <div className="field-grid">
                  <div>
                    <div className="field-label">Source</div>
                    <select
                      className="neo-field"
                      name="source"
                      value={formData.source}
                      onChange={handleChange}
                    >
                      {Object.entries(LEAD_SOURCE_LABELS).map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <div className="field-label">Date de clôture prévue</div>
                    <input
                      className="neo-field"
                      name="expectedCloseDate"
                      type="date"
                      value={formData.expectedCloseDate}
                      onChange={handleChange}
                    />
                  </div>
                </div>
              </div>
            </Card>

            <Card head="Adresse du projet" icon="building">
              <div className="card-body">
                <div className="field-label">Adresse</div>
                <input
                  className="neo-field"
                  name="address"
                  value={formData.address}
                  onChange={handleChange}
                />
                <div className="field-grid">
                  <div>
                    <div className="field-label">Code postal</div>
                    <input
                      className="neo-field"
                      name="postalCode"
                      value={formData.postalCode}
                      onChange={handleChange}
                    />
                  </div>
                  <div>
                    <div className="field-label">Ville</div>
                    <input
                      className="neo-field"
                      name="city"
                      value={formData.city}
                      onChange={handleChange}
                    />
                  </div>
                </div>
                <div style={{ marginTop: 14 }}>
                  <div className="field-label">Surface (m²)</div>
                  <input
                    className="neo-field"
                    name="surface"
                    type="number"
                    value={formData.surface || ''}
                    onChange={handleChange}
                  />
                </div>
              </div>
            </Card>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            <Card head="Qualification" icon="crosshair">
              <div className="card-body">
                {isEditing && (
                  <div style={{ marginBottom: 14 }}>
                    <div className="field-label">Statut</div>
                    <select
                      className="neo-field"
                      name="status"
                      value={formData.status}
                      onChange={handleChange}
                    >
                      {Object.entries(LEAD_STATUS_LABELS).map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
                <div className="field-label">Valeur estimée (€)</div>
                <input
                  className="neo-field"
                  name="estimatedValue"
                  type="number"
                  value={formData.estimatedValue || ''}
                  onChange={handleChange}
                />
                <div style={{ marginTop: 14 }}>
                  <div className="field-label">Probabilité : {formData.probability}%</div>
                  <input
                    type="range"
                    name="probability"
                    min="0"
                    max="100"
                    step="5"
                    value={formData.probability || 0}
                    onChange={handleChange}
                    style={{ width: '100%', accentColor: 'var(--komun)' }}
                  />
                </div>
              </div>
            </Card>

            <Card>
              <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <Btn type="submit" icon="check" disabled={submitting}>
                  {submitting ? 'Enregistrement…' : isEditing ? 'Enregistrer' : 'Créer le lead'}
                </Btn>
                <Btn type="button" variant="subtle" onClick={() => navigate('/leads')}>
                  Annuler
                </Btn>
              </div>
            </Card>
          </div>
        </div>
      </form>
    </div>
  );
}

export default LeadFormPage;
