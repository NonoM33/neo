import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useCan } from '../hooks';
import type { Feature } from '../config/permissions';

interface RoleRouteProps {
  feature: Feature;
  children: ReactNode;
}

/**
 * Garde de route par feature : redirige vers le dashboard si le rôle de
 * l'utilisateur ne couvre pas la feature demandée.
 */
export function RoleRoute({ feature, children }: RoleRouteProps) {
  if (!useCan(feature)) {
    return <Navigate to="/" replace />;
  }
  return <>{children}</>;
}

export default RoleRoute;
