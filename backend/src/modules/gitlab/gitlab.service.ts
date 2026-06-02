import { env, isGitlabEnabled } from '../../config/env';
import {
  recetteAppLabels,
  recetteSeverityLabels,
  type RecetteFeature,
  type RecetteFeedback,
} from '../../db/schema';

// Donnees necessaires pour composer un ticket GitLab a partir d'un retour de recette.
// Decouple de l'infra : ne depend ni de la DB ni du client HTTP.
export interface RecetteIssueInput {
  feature: Pick<RecetteFeature, 'app' | 'module' | 'title' | 'code' | 'route'>;
  feedback: Pick<
    RecetteFeedback,
    | 'title'
    | 'severity'
    | 'stepsToReproduce'
    | 'expectedResult'
    | 'actualResult'
    | 'author'
  >;
}

export interface GitlabIssuePayload {
  title: string;
  description: string;
  labels: string[];
}

export interface GitlabIssue {
  iid: number;
  webUrl: string;
}

// Logique pure (testable) : transforme un retour de recette en payload GitLab.
export function buildIssuePayload(input: RecetteIssueInput): GitlabIssuePayload {
  const { feature, feedback } = input;
  const severity = recetteSeverityLabels[feedback.severity].label;
  const appLabel = recetteAppLabels[feature.app];

  const title = `[Recette] ${feature.module} — ${feedback.title}`;

  const sections: string[] = [
    `**Feature** : ${feature.title} (\`${feature.code}\`)`,
    `**Application** : ${appLabel}`,
    `**Severite** : ${severity}`,
    `**Remonte par** : ${feedback.author}`,
  ];
  if (feature.route) sections.push(`**Ecran** : \`${feature.route}\``);

  const blocks: string[] = [sections.join('\n')];

  if (feedback.stepsToReproduce) {
    blocks.push(`### Etapes pour reproduire\n${feedback.stepsToReproduce}`);
  }
  if (feedback.expectedResult) {
    blocks.push(`### Resultat attendu\n${feedback.expectedResult}`);
  }
  if (feedback.actualResult) {
    blocks.push(`### Resultat obtenu\n${feedback.actualResult}`);
  }

  blocks.push('---\n_Ticket cree automatiquement depuis le centre de recette Neo._');

  return {
    title,
    description: blocks.join('\n\n'),
    labels: ['recette', `app::${feature.app}`, `severite::${feedback.severity}`],
  };
}

// Cree l'issue sur GitLab. Retourne null si l'integration est desactivee ou en cas d'echec
// (best-effort : ne doit jamais faire echouer la remontee de bug cote utilisateur).
export async function createIssue(
  input: RecetteIssueInput
): Promise<GitlabIssue | null> {
  if (!isGitlabEnabled) return null;

  const payload = buildIssuePayload(input);
  const projectId = encodeURIComponent(env.GITLAB_PROJECT_ID!);
  const url = `${env.GITLAB_URL}/api/v4/projects/${projectId}/issues`;

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'PRIVATE-TOKEN': env.GITLAB_TOKEN!,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        title: payload.title,
        description: payload.description,
        labels: payload.labels.join(','),
      }),
    });

    if (!res.ok) {
      console.error(
        `[gitlab] Creation issue echouee (${res.status}): ${await res.text()}`
      );
      return null;
    }

    const data = (await res.json()) as { iid: number; web_url: string };
    return { iid: data.iid, webUrl: data.web_url };
  } catch (error) {
    console.error('[gitlab] Erreur reseau lors de la creation de l\'issue:', error);
    return null;
  }
}
