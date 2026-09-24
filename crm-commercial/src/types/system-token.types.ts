export interface SystemToken {
  id: string;
  name: string;
  tokenPrefix: string;
  roleNames: string[];
  createdByEmail: string | null;
  lastUsedAt: string | null;
  revokedAt: string | null;
  createdAt: string;
}

export interface CreateSystemTokenInput {
  name: string;
  roleIds: string[];
}

export interface CreatedSystemToken {
  id: string;
  raw: string;
}
