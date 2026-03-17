export type RoleType = 'admin' | 'integrateur' | 'auditeur' | 'commercial';

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  role: RoleType;
  roles: RoleType[];
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: User;
}

export interface JWTPayload {
  userId: string;
  email: string;
  role: RoleType;
  roles: RoleType[];
  exp: number;
}
