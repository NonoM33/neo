// Gestion des comptes staff (back-office porté dans l'app React).
// Aligné sur l'API /api/users qui n'expose que le rôle legacy à 3 valeurs.
export type StaffRole = 'admin' | 'integrateur' | 'auditeur';

export const staffRoleLabels: Record<StaffRole, string> = {
  admin: 'Administrateur',
  integrateur: 'Intégrateur',
  auditeur: 'Auditeur',
};

export interface StaffUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string | null;
  role: StaffRole;
  createdAt: string;
}

export interface CreateStaffUserInput {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone?: string;
  role: StaffRole;
}

export interface UpdateStaffUserInput {
  email?: string;
  password?: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  role?: StaffRole;
}

export interface StaffUserFilter {
  role?: StaffRole;
  search?: string;
}
