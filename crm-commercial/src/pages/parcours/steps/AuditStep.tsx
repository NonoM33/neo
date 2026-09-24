import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Btn, Card, Icon } from '../../../components/neo';
import { parcoursService } from '../../../services';
import type { Product } from '../../../types';
import type { ParcoursNeed, ParcoursRoom } from '../../../types/parcours.types';
import { auditTotalQty, ROOM_PRESETS, roomTotalQty, type StepProps } from '../parcours.meta';
import { EquipmentPanel } from './EquipmentPanel';
import { StepNav } from './StepNav';

export function AuditStep({ state, patch, next, back }: StepProps) {
  const { project, rooms, currentRoomId } = state;
  const [catalog, setCatalog] = useState<Product[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const list = await parcoursService.getCatalog();
        if (!cancelled) setCatalog(list);
      } catch {
        if (!cancelled) toast.error('Chargement du catalogue impossible');
      } finally {
        if (!cancelled) setCatalogLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const addRoom = async (preset: { type: string; name: string }) => {
    if (!project) return;
    const sameType = rooms.filter((r) => r.type === preset.type).length;
    const name = sameType > 0 ? `${preset.name} ${sameType + 1}` : preset.name;
    try {
      const piece = await parcoursService.createPiece(project.id, { name, type: preset.type });
      const room: ParcoursRoom = {
        id: piece.id,
        name: piece.name,
        type: piece.type,
        icon: piece.icon ?? null,
        linkedRoomIds: piece.linkedRoomIds ?? [],
        needs: [],
      };
      patch({ rooms: [...rooms, room], currentRoomId: room.id });
    } catch {
      toast.error('Ajout de la pièce impossible');
    }
  };

  const delRoom = async (id: string) => {
    try {
      await parcoursService.deletePiece(id);
      const remaining = rooms.filter((r) => r.id !== id);
      patch({
        rooms: remaining,
        currentRoomId: currentRoomId === id ? remaining[0]?.id ?? null : currentRoomId,
      });
    } catch {
      toast.error('Suppression de la pièce impossible');
    }
  };

  const updateNeeds = (roomId: string, needs: ParcoursNeed[]) =>
    patch({ rooms: rooms.map((r) => (r.id === roomId ? { ...r, needs } : r)) });

  const current = rooms.find((r) => r.id === currentRoomId) ?? null;
  const totalQty = auditTotalQty(rooms);

  return (
    <div>
      <h2 className="parcours-lead">Audit &amp; équipements</h2>
      <p className="parcours-sub">
        {rooms.length} pièce(s) · {totalQty} équipement(s) à installer.
      </p>

      <Card>
        <div className="t-main" style={{ marginBottom: 8 }}>
          Pièces du logement
        </div>
        {rooms.length === 0 ? (
          <div className="t-sub">Ajoutez les pièces à équiper.</div>
        ) : (
          <div className="parcours-rooms">
            {rooms.map((r) => (
              <div
                key={r.id}
                className={`parcours-tile ${r.id === currentRoomId ? 'on' : ''}`}
                onClick={() => patch({ currentRoomId: r.id })}
              >
                <Icon name="home" size={18} />
                <div style={{ flex: 1 }}>
                  <div className="t-main">{r.name}</div>
                  <div className="t-sub">{roomTotalQty(r)} besoin(s)</div>
                </div>
                <Btn
                  variant="danger-ghost"
                  size="sm"
                  icon="trash"
                  onClick={(e) => {
                    e.stopPropagation();
                    void delRoom(r.id);
                  }}
                />
              </div>
            ))}
          </div>
        )}
        <div className="parcours-chips" style={{ marginTop: 14 }}>
          {ROOM_PRESETS.map((rp) => (
            <button
              key={rp.type}
              type="button"
              className="parcours-chip"
              onClick={() => void addRoom(rp)}
            >
              <Icon name="plus" size={13} /> {rp.name}
            </button>
          ))}
        </div>
      </Card>

      {current && (
        <EquipmentPanel
          room={current}
          catalog={catalog}
          loading={catalogLoading}
          onNeedsChange={(needs) => updateNeeds(current.id, needs)}
        />
      )}

      <StepNav onBack={back} onNext={next} nextLabel="Générer le devis" nextDisabled={totalQty === 0} />
    </div>
  );
}
