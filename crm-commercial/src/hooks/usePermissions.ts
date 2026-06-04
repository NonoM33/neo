import { useAuthStore } from '../stores';
import { rolesCanAccess, type Feature } from '../config/permissions';
import type { RoleType } from '../types';

/** Rôles effectifs de l'utilisateur (multi-rôles, fallback sur le rôle legacy). */
export function useUserRoles(): RoleType[] {
  const user = useAuthStore((state) => state.user);
  if (!user) return [];
  if (user.roles?.length) return user.roles;
  return user.role ? [user.role] : [];
}

/** Indique si l'utilisateur courant peut accéder à une feature. */
export function useCan(feature: Feature): boolean {
  const roles = useUserRoles();
  return rolesCanAccess(feature, roles);
}
