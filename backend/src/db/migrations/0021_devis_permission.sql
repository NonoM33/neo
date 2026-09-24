-- Nouvelle permission `devis.manage` (chemin /backoffice/quotes).
--
-- Avant cette migration, /backoffice/quotes n'etait rattache a AUCUNE
-- permission : n'importe quel utilisateur du back-office — un role support
-- par exemple — pouvait lire la liste complete des devis et leurs montants.
--
-- L'ajouter au catalogue la rend obligatoire. Les roles existants ne l'ont
-- evidemment pas cochee : sans le rattrapage ci-dessous ils PERDRAIENT
-- l'acces aux devis du jour au lendemain, sans message.
--
-- On l'accorde donc a ceux qui suivent deja une affaire de bout en bout :
-- `projets.manage` (integrateurs) ET `crm.manage` (commerciaux). Oublier les
-- commerciaux serait le comble — c'est le role qui vit dans les devis.
UPDATE roles
SET permissions = permissions || '["devis.manage"]'::jsonb
WHERE (permissions ? 'projets.manage' OR permissions ? 'crm.manage')
  AND NOT (permissions ? 'devis.manage');
