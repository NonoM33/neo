export const PIPELINE_LEAD_STAGES = ['prospect', 'qualifie', 'proposition', 'negociation'] as const;
export const PIPELINE_PROJECT_STAGES = ['brouillon', 'en_cours', 'termine'] as const;

export type PipelineLeadStage = (typeof PIPELINE_LEAD_STAGES)[number];
export type PipelineProjectStage = (typeof PIPELINE_PROJECT_STAGES)[number];

export type PipelineMoveInput = {
  type?: string;
  id?: string;
  status?: string;
};

export type PipelineMoveValidation =
  | { ok: true; type: 'lead'; id: string; status: PipelineLeadStage }
  | { ok: true; type: 'project'; id: string; status: PipelineProjectStage }
  | { ok: false; status: number; error: string };

export function validatePipelineMove(input: PipelineMoveInput): PipelineMoveValidation {
  const { type, id, status } = input;

  if (!id || !status) {
    return { ok: false, status: 400, error: 'Paramètres manquants' };
  }

  if (type === 'lead') {
    if (!PIPELINE_LEAD_STAGES.includes(status as PipelineLeadStage)) {
      return { ok: false, status: 400, error: 'Statut de lead invalide' };
    }
    return { ok: true, type: 'lead', id, status: status as PipelineLeadStage };
  }

  if (type === 'project') {
    if (!PIPELINE_PROJECT_STAGES.includes(status as PipelineProjectStage)) {
      return { ok: false, status: 400, error: 'Statut de projet invalide' };
    }
    return { ok: true, type: 'project', id, status: status as PipelineProjectStage };
  }

  return { ok: false, status: 400, error: 'Type invalide' };
}
