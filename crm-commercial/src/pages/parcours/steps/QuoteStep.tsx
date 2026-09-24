import { useState } from 'react';
import { toast } from 'sonner';
import { Btn, Card } from '../../../components/neo';
import { devisService, parcoursService } from '../../../services';
import { fmtEUR, type StepProps } from '../parcours.meta';
import { StepNav } from './StepNav';

export function QuoteStep({ state, patch, next, back }: StepProps) {
  const { project, rooms, quote } = state;
  const [generating, setGenerating] = useState(false);

  const generate = async () => {
    if (!project) return;
    setGenerating(true);
    try {
      const quoteId = await parcoursService.generateQuote(
        project.id,
        rooms.map((r) => r.id)
      );
      const detail = await parcoursService.getQuote(quoteId);
      patch({ quote: detail });
      toast.success('Devis généré');
    } catch {
      toast.error('Génération du devis impossible');
    } finally {
      setGenerating(false);
    }
  };

  if (!quote) {
    const needs = rooms.reduce((sum, r) => sum + r.needs.length, 0);
    return (
      <div>
        <h2 className="parcours-lead">Le devis</h2>
        <p className="parcours-sub">
          Nous générons le devis à partir des {needs} équipement(s) de l'audit.
        </p>
        <Card>
          <div style={{ textAlign: 'center', padding: 24 }}>
            <Btn variant="primary" size="lg" icon="sparkles" disabled={generating} onClick={generate}>
              Générer le devis
            </Btn>
          </div>
        </Card>
        <StepNav onBack={back} />
      </div>
    );
  }

  return (
    <div>
      <h2 className="parcours-lead">Devis {quote.number}</h2>
      <p className="parcours-sub">Vérifiez les lignes avec le client puis passez à la signature.</p>

      <Card>
        {quote.lines.length === 0 ? (
          <div className="t-sub">Aucune ligne — ajustez l'audit.</div>
        ) : (
          quote.lines.map((l) => (
            <div key={l.id} className="parcours-row">
              <div style={{ flex: 1 }}>
                <div className="t-main">{l.description}</div>
                <div className="t-sub">
                  {l.quantity ?? 1} × {fmtEUR(l.unitPriceHT)} HT
                </div>
              </div>
              <div className="t-main">{fmtEUR(l.totalHT)}</div>
            </div>
          ))
        )}
      </Card>

      <Card>
        <div className="parcours-grid2">
          <div className="parcours-kpi">
            <span className="l">Total HT</span>
            <span className="v">{fmtEUR(quote.totalHT)}</span>
          </div>
          <div className="parcours-kpi">
            <span className="l">Total TTC</span>
            <span className="v">{fmtEUR(quote.totalTTC)}</span>
          </div>
        </div>
        <div className="parcours-footnav" style={{ marginTop: 14 }}>
          <Btn variant="ghost" icon="fileText" onClick={() => void devisService.openPdf(quote.id)}>
            Aperçu PDF
          </Btn>
          <span style={{ flex: 1 }} />
          <Btn variant="subtle" onClick={() => patch({ quote: null })}>
            Régénérer
          </Btn>
        </div>
      </Card>

      <StepNav onBack={back} onNext={next} nextLabel="Passer à la signature" />
    </div>
  );
}
