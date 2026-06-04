export type ProjectStatus = 'brouillon' | 'en_cours' | 'termine' | 'archive';

export const projectStatusLabels: Record<ProjectStatus, string> = {
  brouillon: 'Brouillon',
  en_cours: 'En cours',
  termine: 'Terminé',
  archive: 'Archivé',
};

export interface ProjectClientRef {
  id: string;
  firstName: string;
  lastName: string;
}

export interface ProjectUserRef {
  id: string;
  firstName: string;
  lastName: string;
  email?: string;
}

export interface Project {
  id: string;
  name: string;
  description: string | null;
  status: ProjectStatus;
  address: string | null;
  city: string | null;
  postalCode: string | null;
  surface: string | null;
  roomCount: number | null;
  createdAt: string;
  updatedAt: string;
  client: ProjectClientRef;
  user: ProjectUserRef;
}

export interface CreateProjectInput {
  clientId: string;
  name: string;
  description?: string;
  status?: ProjectStatus;
  address?: string;
  city?: string;
  postalCode?: string;
  surface?: number;
  roomCount?: number;
}

export type UpdateProjectInput = Partial<CreateProjectInput>;

export interface ProjectFilter {
  status?: ProjectStatus;
  clientId?: string;
  search?: string;
}
