import { Link } from 'react-router-dom';
import { Btn, Card, Icon } from '../../../components/neo';
import { fmtEUR, type StepProps } from '../parcours.meta';

export function DoneStep({ state, reset }: StepProps) {
  const { project, rooms, quote, invoice, instance } = state;
  return (
    <div>
      <Card>
        <div style={{ textAlign: 'center', padding: 32 }}>
          <Icon name="checkCircle" size={46} />
          <h2 className="parcours-lead" style={{ marginTop: 8 }}>
            Projet créé de A à Z
          </h2>
          <p className="parcours-sub">Tout est enregistré dans le back-office.</p>

          <div className="parcours-grid2" style={{ maxWidth: 560, margin: '18px auto 0' }}>
            <div className="parcours-kpi">
              <span className="l">Pièces</span>
              <span className="v">{rooms.length}</span>
            </div>
            <div className="parcours-kpi">
              <span className="l">Devis</span>
              <span className="v">{quote ? fmtEUR(quote.totalTTC) : '—'}</span>
            </div>
            <div className="parcours-kpi">
              <span className="l">Acompte</span>
              <span className="v">{invoice ? '✓' : '—'}</span>
            </div>
            <div className="parcours-kpi">
              <span className="l">Box cloud</span>
              <span className="v">{instance ? '✓' : '—'}</span>
            </div>
          </div>

          <div className="parcours-footnav" style={{ justifyContent: 'center', marginTop: 26 }}>
            {project && (
              <Link to={`/projets/${project.id}/edit`}>
                <Btn variant="subtle" icon="folder">
                  Ouvrir le projet
                </Btn>
              </Link>
            )}
            <Btn variant="primary" icon="plus" onClick={reset}>
              Nouveau parcours
            </Btn>
          </div>
        </div>
      </Card>
    </div>
  );
}
