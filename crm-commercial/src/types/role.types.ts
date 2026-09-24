export interface Role {
  id: string;
  name: string;
  description: string | null;
  permissions: string[];
  isSystem: boolean;
  createdAt: string;
}

export interface PermissionDef {
  key: string;
  label: string;
  group: string;
  path: string;
}

export interface PermissionGroup {
  group: string;
  permissions: PermissionDef[];
}

export interface RoleInput {
  name: string;
  description?: string;
  permissions: string[];
}
