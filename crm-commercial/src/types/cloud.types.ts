export type CloudInstanceStatus = 'provisioning' | 'running' | 'stopped' | 'error' | 'destroying';

export interface CloudInstance {
  id: string;
  clientId: string;
  tenantId: string;
  containerId?: string;
  containerName?: string;
  domain: string;
  status: CloudInstanceStatus;
  haVersion?: string;
  port?: number;
  lastHeartbeat?: string;
  entityCount: number;
  automationCount: number;
  isOnline: boolean;
  memoryLimitMb: number;
  cpuLimit: string;
  errorMessage?: string;
  provisionedAt?: string;
  createdAt: string;
  updatedAt: string;
  client: {
    id: string;
    firstName: string;
    lastName: string;
    email?: string;
    phone?: string;
    address?: string;
    city?: string;
  };
}

export interface CloudStats {
  total: number;
  running: number;
  online: number;
  errors: number;
}

export interface CreateInstanceInput {
  clientId: string;
  domain?: string;
  memoryLimitMb?: number;
  cpuLimit?: string;
  haVersion?: string;
}
