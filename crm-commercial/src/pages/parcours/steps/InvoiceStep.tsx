import { useState } from 'react';
import { isAxiosError } from 'axios';
import { toast } from 'sonner';
import { Btn, Card, Icon } from '../../../components/neo';
import { parcoursService } from '../../../services';
import { fmtEUR, type StepProps } from '../parcours.meta';
import { StepNav } from './StepNav';

const PERCENTS = [30, 40, 50, 100];

export function InvoiceStep({ state, patch, next, back }: StepProps) {
  const { project, quote, invoice } = state;
  const [pct, setPct] = useState(30);
  const [busy, setBusy] = useState(false);
  const ttc = quote ? parseFloat(quote.totalTTC || '0') : 0;

  const create = async () => {
    if (!project || !quote) return;
    const unitPriceHT = Math.round(((ttc * pct) / 100 / 1.2) * 100) / 100;
    setBusy(true);
    try {
      const inv = await parcoursService.createInvoice({
        projectId: project.id,
        notes: `Acompte ${pct}% — Devis ${quote.number || ''}`,
        lines: [
          {
            description: `Acompte ${pct}% sur devis ${quote.number || ''}`,
            quantity: 1,
            unitPriceHT,
            tvaRate: 20,
          },
        ],
      });
      patch({ invoice: { id: inv.id, number: inv.number, totalTTC: inv.totalTTC } });
      toast.success('Facture créée');
    } catch (err) {
      if (isAxiosError(err) && err.response?.status === 403) {
        toast.error('Facturation réservée aux comptes admin — étape ignorable');
      } else {
        toast.error('Création de la facture impossible');
      }
    } finally {
      setBusy(false);
    }
  };

  if (invoice) {
    return (
      <div>
        <h2 className="parcours-lead">Acompte facturé</h2>
        <p className="parcours-sub">Facture {invoice.number} créée.</p>
        <Card>
          <div className="parcours-row">
            <Icon name="receipt" size={22} />
            <div style={{ flex: 1 }}>
              <div className="t-main">{invoice.number}</div>
              <div className="t-sub">{fmtEUR(invoice.totalTTC)} TTC</div>
            </div>
          </div>
        </Card>
        <StepNav onBack={back} onNext={next} />
      </div>
    );
  }

  return (
    <div>
      <h2 className="parcours-lead">Acompte</h2>
      <p className="parcours-sub">Générez la facture d'acompte pour lancer le projet.</p>
      <Card>
        <div className="t-sub" style={{ marginBottom: 10 }}>
          Montant du devis : <b>{fmtEUR(ttc)}</b> TTC
        </div>
        <div className="parcours-chips">
          {PERCENTS.map((p) => (
            <button
              key={p}
              type="button"
              className={`parcours-chip ${pct === p ? 'on' : ''}`}
              onClick={() => setPct(p)}
            >
              {p}% · {fmtEUR((ttc * p) / 100)}
            </button>
          ))}
        </div>
        <div style={{ marginTop: 18 }}>
          <Btn variant="primary" size="lg" icon="receipt" disabled={busy} onClick={create}>
            Créer la facture d'acompte
          </Btn>
        </div>
      </Card>
      <div className="parcours-footnav">
        <Btn variant="subtle" icon="arrowLeft" onClick={back}>
          Retour
        </Btn>
        <span style={{ flex: 1 }} />
        <Btn variant="ghost" iconRight="arrowRight" onClick={next}>
          Ignorer cette étape
        </Btn>
      </div>
    </div>
  );
}
