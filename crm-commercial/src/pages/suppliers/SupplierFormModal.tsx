import { useEffect, useState } from 'react';
import { Btn, Modal } from '../../components/neo';
import type { Supplier, SupplierInput } from '../../types/supplier.types';

interface Props {
  open: boolean;
  supplier: Supplier | null;
  onClose: () => void;
  onSubmit: (input: SupplierInput) => Promise<void>;
}

const EMPTY: SupplierInput = {
  name: '',
  email: '',
  phone: '',
  website: '',
  address: '',
  city: '',
  postalCode: '',
  country: 'France',
  contactName: '',
  contactEmail: '',
  contactPhone: '',
  paymentTerms: '',
  deliveryLeadDays: null,
  notes: '',
  isActive: true,
};

function fromSupplier(s: Supplier): SupplierInput {
  return {
    name: s.name,
    email: s.email ?? '',
    phone: s.phone ?? '',
    website: s.website ?? '',
    address: s.address ?? '',
    city: s.city ?? '',
    postalCode: s.postalCode ?? '',
    country: s.country ?? 'France',
    contactName: s.contactName ?? '',
    contactEmail: s.contactEmail ?? '',
    contactPhone: s.contactPhone ?? '',
    paymentTerms: s.paymentTerms ?? '',
    deliveryLeadDays: s.deliveryLeadDays,
    notes: s.notes ?? '',
    isActive: s.isActive,
  };
}

export function SupplierFormModal({ open, supplier, onClose, onSubmit }: Props) {
  const [form, setForm] = useState<SupplierInput>(EMPTY);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) setForm(supplier ? fromSupplier(supplier) : EMPTY);
  }, [open, supplier]);

  const set = <K extends keyof SupplierInput>(key: K, value: SupplierInput[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const handleSubmit = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      await onSubmit(form);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      title={supplier ? 'Modifier le fournisseur' : 'Nouveau fournisseur'}
      onClose={onClose}
      width={680}
      footer={
        <>
          <Btn variant="ghost" onClick={onClose}>
            Annuler
          </Btn>
          <Btn onClick={handleSubmit} disabled={saving || !form.name.trim()}>
            {supplier ? 'Enregistrer' : 'Créer'}
          </Btn>
        </>
      }
    >
      <div className="field-grid">
        <div>
          <div className="field-label">Nom *</div>
          <input
            className="neo-field"
            value={form.name}
            onChange={(e) => set('name', e.target.value)}
          />
        </div>
        <div>
          <div className="field-label">Email</div>
          <input
            className="neo-field"
            type="email"
            value={form.email ?? ''}
            onChange={(e) => set('email', e.target.value)}
          />
        </div>
      </div>

      <div className="field-grid" style={{ marginTop: 12 }}>
        <div>
          <div className="field-label">Téléphone</div>
          <input
            className="neo-field"
            value={form.phone ?? ''}
            onChange={(e) => set('phone', e.target.value)}
          />
        </div>
        <div>
          <div className="field-label">Site web</div>
          <input
            className="neo-field"
            placeholder="https://…"
            value={form.website ?? ''}
            onChange={(e) => set('website', e.target.value)}
          />
        </div>
      </div>

      <div style={{ marginTop: 12 }}>
        <div className="field-label">Adresse</div>
        <input
          className="neo-field"
          value={form.address ?? ''}
          onChange={(e) => set('address', e.target.value)}
        />
      </div>

      <div className="field-grid" style={{ marginTop: 12 }}>
        <div>
          <div className="field-label">Code postal</div>
          <input
            className="neo-field"
            value={form.postalCode ?? ''}
            onChange={(e) => set('postalCode', e.target.value)}
          />
        </div>
        <div>
          <div className="field-label">Ville</div>
          <input
            className="neo-field"
            value={form.city ?? ''}
            onChange={(e) => set('city', e.target.value)}
          />
        </div>
      </div>

      <div className="field-grid" style={{ marginTop: 12 }}>
        <div>
          <div className="field-label">Contact principal</div>
          <input
            className="neo-field"
            value={form.contactName ?? ''}
            onChange={(e) => set('contactName', e.target.value)}
          />
        </div>
        <div>
          <div className="field-label">Email contact</div>
          <input
            className="neo-field"
            type="email"
            value={form.contactEmail ?? ''}
            onChange={(e) => set('contactEmail', e.target.value)}
          />
        </div>
      </div>

      <div className="field-grid" style={{ marginTop: 12 }}>
        <div>
          <div className="field-label">Conditions de paiement</div>
          <input
            className="neo-field"
            placeholder="30 jours fin de mois"
            value={form.paymentTerms ?? ''}
            onChange={(e) => set('paymentTerms', e.target.value)}
          />
        </div>
        <div>
          <div className="field-label">Délai de livraison (jours)</div>
          <input
            className="neo-field"
            type="number"
            min={0}
            value={form.deliveryLeadDays ?? ''}
            onChange={(e) =>
              set('deliveryLeadDays', e.target.value === '' ? null : Number(e.target.value))
            }
          />
        </div>
      </div>

      <div style={{ marginTop: 12 }}>
        <div className="field-label">Notes</div>
        <textarea
          className="neo-field"
          rows={3}
          value={form.notes ?? ''}
          onChange={(e) => set('notes', e.target.value)}
        />
      </div>

      <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 14 }}>
        <input
          type="checkbox"
          checked={form.isActive ?? true}
          onChange={(e) => set('isActive', e.target.checked)}
        />
        Fournisseur actif
      </label>
    </Modal>
  );
}

export default SupplierFormModal;
