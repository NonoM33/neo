export interface Client {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  postalCode: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateClientInput {
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  postalCode?: string;
  notes?: string;
}

export type UpdateClientInput = Partial<CreateClientInput>;

export interface ClientFilter {
  search?: string;
}
