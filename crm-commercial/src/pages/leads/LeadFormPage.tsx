import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardHeader, CardBody, Spinner, Button, Input, Select, Textarea } from '../../components';
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

  useEffect(() => {
    if (isEditing && id) {
      loadLead();
    }
  }, [id]);

  const loadLead = async () => {
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
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
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

  const statusOptions = Object.entries(LEAD_STATUS_LABELS).map(([value, label]) => ({ value, label }));
  const sourceOptions = Object.entries(LEAD_SOURCE_LABELS).map(([value, label]) => ({ value, label }));

  if (loading) {
    return <Spinner />;
  }

  return (
    <div className="lead-form">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <button className="btn btn-link text-muted p-0 mb-2" onClick={() => navigate('/leads')}>
            <i className="bi bi-arrow-left me-1"></i>
            Retour aux leads
          </button>
          <div className="d-flex align-items-center gap-2">
            <h2 className="mb-0">{isEditing ? 'Modifier le lead' : 'Nouveau lead'}</h2>
            {!isEditing && <XPIndicator xp={15} />}
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="row g-4">
          <div className="col-lg-8">
            {/* Contact Info */}
            <Card className="mb-4">
              <CardHeader>Informations de contact</CardHeader>
              <CardBody>
                <div className="row">
                  <div className="col-md-6">
                    <Input
                      label="Prénom"
                      name="firstName"
                      value={formData.firstName}
                      onChange={handleChange}
                      error={errors.firstName}
                      required
                    />
                  </div>
                  <div className="col-md-6">
                    <Input
                      label="Nom"
                      name="lastName"
                      value={formData.lastName}
                      onChange={handleChange}
                      error={errors.lastName}
                      required
                    />
                  </div>
                </div>
                <div className="row">
                  <div className="col-md-6">
                    <Input
                      label="Email"
                      name="email"
                      type="email"
                      value={formData.email}
                      onChange={handleChange}
                    />
                  </div>
                  <div className="col-md-6">
                    <Input
                      label="Téléphone"
                      name="phone"
                      type="tel"
                      value={formData.phone}
                      onChange={handleChange}
                    />
                  </div>
                </div>
                <Input
                  label="Entreprise"
                  name="company"
                  value={formData.company}
                  onChange={handleChange}
                />
              </CardBody>
            </Card>

            {/* Project Info */}
            <Card className="mb-4">
              <CardHeader>Projet</CardHeader>
              <CardBody>
                <Input
                  label="Titre du projet"
                  name="title"
                  value={formData.title}
                  onChange={handleChange}
                  error={errors.title}
                  required
                />
                <Textarea
                  label="Description"
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                />
                <div className="row">
                  <div className="col-md-6">
                    <Select
                      label="Source"
                      name="source"
                      value={formData.source}
                      onChange={handleChange}
                      options={sourceOptions}
                    />
                  </div>
                  <div className="col-md-6">
                    <Input
                      label="Date de clôture prévue"
                      name="expectedCloseDate"
                      type="date"
                      value={formData.expectedCloseDate}
                      onChange={handleChange}
                    />
                  </div>
                </div>
              </CardBody>
            </Card>

            {/* Address */}
            <Card className="mb-4">
              <CardHeader>Adresse du projet</CardHeader>
              <CardBody>
                <Input
                  label="Adresse"
                  name="address"
                  value={formData.address}
                  onChange={handleChange}
                />
                <div className="row">
                  <div className="col-md-4">
                    <Input
                      label="Code postal"
                      name="postalCode"
                      value={formData.postalCode}
                      onChange={handleChange}
                    />
                  </div>
                  <div className="col-md-8">
                    <Input
                      label="Ville"
                      name="city"
                      value={formData.city}
                      onChange={handleChange}
                    />
                  </div>
                </div>
                <Input
                  label="Surface (m²)"
                  name="surface"
                  type="number"
                  value={formData.surface || ''}
                  onChange={handleChange}
                />
              </CardBody>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="col-lg-4">
            {/* Status & Value */}
            <Card className="mb-4">
              <CardHeader>Qualification</CardHeader>
              <CardBody>
                {isEditing && (
                  <Select
                    label="Statut"
                    name="status"
                    value={formData.status}
                    onChange={handleChange}
                    options={statusOptions}
                  />
                )}
                <Input
                  label="Valeur estimée (€)"
                  name="estimatedValue"
                  type="number"
                  value={formData.estimatedValue || ''}
                  onChange={handleChange}
                />
                <div className="mb-3">
                  <label className="form-label">Probabilité: {formData.probability}%</label>
                  <input
                    type="range"
                    className="form-range"
                    name="probability"
                    min="0"
                    max="100"
                    step="5"
                    value={formData.probability || 0}
                    onChange={handleChange}
                  />
                </div>
              </CardBody>
            </Card>

            {/* Actions */}
            <Card>
              <CardBody>
                <div className="d-grid gap-2">
                  <Button type="submit" loading={submitting} icon="bi-check-lg">
                    {isEditing ? 'Enregistrer' : 'Créer le lead'}
                  </Button>
                  <Button type="button" variant="outline-secondary" onClick={() => navigate('/leads')}>
                    Annuler
                  </Button>
                </div>
              </CardBody>
            </Card>
          </div>
        </div>
      </form>
    </div>
  );
}

export default LeadFormPage;
