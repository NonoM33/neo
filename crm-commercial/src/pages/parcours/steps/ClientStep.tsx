import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { Btn, Card, Icon } from '../../../components/neo';
import { parcoursService } from '../../../services';
import type { Client, CreateClientInput } from '../../../types';
import type { StepProps } from '../parcours.meta';
import { StepNav } from './StepNav';

const EMPTY_FORM = { firstName: '', lastName: '', email: '', phone: '', address: '', city: '' };

export function ClientStep({ state, patch, next }: StepProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Client[]>([]);
  const [searching, setSearching] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [creating, setCreating] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setResults([]);
      return;
    }
    setSearching(true);
    clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      try {
        setResults(await parcoursService.searchClients(q));
      } catch {
        toast.error('Recherche client impossible');
      } finally {
        setSearching(false);
      }
    }, 280);
    return () => clearTimeout(timer.current);
  }, [query]);

  const create = async () => {
    if (!form.firstName.trim() || !form.lastName.trim()) {
      toast.error('Prénom et nom requis');
      return;
    }
    setCreating(true);
    try {
      const input: CreateClientInput = {
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
      };
      if (form.email.trim()) input.email = form.email.trim();
      if (form.phone.trim()) input.phone = form.phone.trim();
      if (form.address.trim()) input.address = form.address.trim();
      if (form.city.trim()) input.city = form.city.trim();
      const client = await parcoursService.createClient(input);
      patch({ client });
      setForm(EMPTY_FORM);
      toast.success('Client créé');
    } catch {
      toast.error('Création du client impossible');
    } finally {
      setCreating(false);
    }
  };

  const set = (key: keyof typeof EMPTY_FORM) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  return (
    <div>
      <h2 className="parcours-lead">À qui est destiné ce projet&nbsp;?</h2>
      <p className="parcours-sub">Recherchez un client existant ou créez-en un nouveau.</p>

      <Card>
        <label className="field-label">Rechercher un client</label>
        <input
          className="neo-field"
          placeholder="Nom, prénom, email…"
          value={query}
          autoComplete="off"
          onChange={(e) => setQuery(e.target.value)}
        />
        <div style={{ marginTop: 12 }}>
          {searching && <div className="t-sub">Recherche…</div>}
          {!searching && query.trim().length >= 2 && results.length === 0 && (
            <div className="t-sub">Aucun client trouvé.</div>
          )}
          {results.map((c) => (
            <button
              key={c.id}
              type="button"
              className="parcours-row parcours-row--clickable"
              onClick={() => patch({ client: c })}
            >
              <Icon name="user" size={20} />
              <div style={{ flex: 1, textAlign: 'left' }}>
                <div className="t-main">
                  {c.firstName} {c.lastName}
                </div>
                <div className="t-sub">{c.email ?? c.phone ?? ''}</div>
              </div>
              <Icon name="arrowRight" size={16} />
            </button>
          ))}
        </div>
      </Card>

      <Card>
        <div className="t-main" style={{ marginBottom: 12 }}>
          <Icon name="user" size={16} /> Nouveau client
        </div>
        <div className="parcours-grid2">
          <div>
            <label className="field-label">Prénom</label>
            <input className="neo-field" value={form.firstName} onChange={set('firstName')} />
          </div>
          <div>
            <label className="field-label">Nom</label>
            <input className="neo-field" value={form.lastName} onChange={set('lastName')} />
          </div>
          <div>
            <label className="field-label">Email</label>
            <input className="neo-field" type="email" value={form.email} onChange={set('email')} />
          </div>
          <div>
            <label className="field-label">Téléphone</label>
            <input className="neo-field" value={form.phone} onChange={set('phone')} />
          </div>
          <div>
            <label className="field-label">Adresse</label>
            <input className="neo-field" value={form.address} onChange={set('address')} />
          </div>
          <div>
            <label className="field-label">Ville</label>
            <input className="neo-field" value={form.city} onChange={set('city')} />
          </div>
        </div>
        <div style={{ marginTop: 14 }}>
          <Btn variant="subtle" icon="user" disabled={creating} onClick={create}>
            Créer le client
          </Btn>
        </div>
      </Card>

      {state.client && (
        <Card>
          <div className="parcours-row">
            <span className="parcours-badge">
              <Icon name="check" size={16} />
            </span>
            <div>
              <div className="t-main">
                {state.client.firstName} {state.client.lastName}
              </div>
              <div className="t-sub">
                {state.client.email ?? state.client.phone ?? 'Client sélectionné'}
              </div>
            </div>
          </div>
        </Card>
      )}

      <StepNav onNext={next} nextDisabled={!state.client} />
    </div>
  );
}
