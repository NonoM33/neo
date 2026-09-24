import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Btn, Card, Icon } from '../../../components/neo';
import { parcoursService } from '../../../services';
import type { ParcoursSignMode } from '../../../types/parcours.types';
import type { StepProps } from '../parcours.meta';
import { StepNav } from './StepNav';

export function SignStep({ state, patch, next, back }: StepProps) {
  const { quote, signature, client } = state;
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!quote || !signature || signature.status === 'signed') return;
    const timer = setInterval(async () => {
      try {
        const r = await parcoursService.refreshSignature(quote.id);
        if (r.status === 'signed') patch({ signature: { ...signature, status: 'signed' } });
      } catch {
        /* le polling silencieux ne doit pas casser l'UI */
      }
    }, 3000);
    return () => clearInterval(timer);
  }, [quote, signature, patch]);

  const start = async (mode: ParcoursSignMode) => {
    if (!quote) return;
    setBusy(true);
    try {
      const r = await parcoursService.createSignature(quote.id, mode);
      patch({
        signature: { id: r.id, mode, status: 'pending', signingUrl: r.signingUrl, sentTo: r.sentTo },
      });
    } catch {
      toast.error('Lancement de la signature impossible');
    } finally {
      setBusy(false);
    }
  };

  const cancel = async () => {
    if (!quote) return;
    try {
      await parcoursService.cancelSignature(quote.id);
    } catch {
      /* on annule côté UI même si l'API échoue */
    }
    patch({ signature: null });
  };

  if (signature?.status === 'signed') {
    return (
      <div>
        <Card>
          <div style={{ textAlign: 'center', padding: 32 }}>
            <Icon name="checkCircle" size={42} />
            <h2 className="parcours-lead" style={{ marginTop: 8 }}>
              Devis signé&nbsp;!
            </h2>
            <p className="parcours-sub">
              Merci {client?.firstName ?? ''}. Le devis est accepté.
            </p>
          </div>
        </Card>
        <StepNav onNext={next} />
      </div>
    );
  }

  if (signature?.mode === 'direct' && signature.signingUrl) {
    return (
      <div>
        <h2 className="parcours-lead">Signature du devis</h2>
        <p className="parcours-sub">Le client signe ci-dessous. La validation est automatique.</p>
        <Card>
          <iframe
            title="Signature du devis"
            src={signature.signingUrl}
            style={{ width: '100%', height: 540, border: 'none', borderRadius: 8 }}
          />
        </Card>
        <div className="parcours-footnav">
          <Btn variant="subtle" icon="x" onClick={() => void cancel()}>
            Annuler
          </Btn>
          <span style={{ flex: 1 }} />
          <span className="t-sub">En attente de signature…</span>
        </div>
      </div>
    );
  }

  if (signature?.mode === 'remote') {
    return (
      <div>
        <h2 className="parcours-lead">Devis envoyé</h2>
        <p className="parcours-sub">
          Un email de signature a été envoyé à {signature.sentTo ?? client?.email ?? 'le client'}.
        </p>
        <Card>
          <div style={{ textAlign: 'center', padding: 32 }}>
            <Icon name="mail" size={42} />
            <p className="parcours-sub">En attente de la signature du client…</p>
            <Btn variant="subtle" onClick={() => void cancel()}>
              Annuler l'envoi
            </Btn>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div>
      <h2 className="parcours-lead">Faire signer le devis</h2>
      <p className="parcours-sub">Sur place, ou à distance par email.</p>
      <div className="parcours-grid2">
        <div className="parcours-tile parcours-tile--action" onClick={() => !busy && void start('direct')}>
          <Icon name="edit" size={22} />
          <div>
            <div className="t-main">Signer ici</div>
            <div className="t-sub">Sur cet écran</div>
          </div>
        </div>
        <div className="parcours-tile parcours-tile--action" onClick={() => !busy && void start('remote')}>
          <Icon name="send" size={22} />
          <div>
            <div className="t-main">Envoyer par email</div>
            <div className="t-sub">{client?.email ?? 'le client'}</div>
          </div>
        </div>
      </div>
      <StepNav onBack={back} />
    </div>
  );
}
