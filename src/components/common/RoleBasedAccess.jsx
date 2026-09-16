import React, { useContext } from "react";
import { AuthContext } from "../../context/AuthContext";
import { hasPermission } from "../../utils/permissions";

/**
 * Standardized RoleBasedAccess component for Web.
 * Gated rendering of UI sections or controls based on module permission.
 *
 * @param {Object} props
 * @param {string} props.module - The module/section identifier (e.g. 'parking_slots', 'notice', 'manage_bills')
 * @param {string} [props.action] - Optional specific action (defaults to 'view')
 * @param {React.ReactNode} [props.fallback=null] - Optional fallback UI when access is denied
 * @param {React.ReactNode} props.children - Child elements to render if authorized
 */
export default function RoleBasedAccess({ module, action = "view", fallback = null, children }) {
  const { user } = useContext(AuthContext);

  if (!module) return <>{children}</>;

  const isAllowed = hasPermission(user, module, action);

  if (!isAllowed) {
    return fallback ? <>{fallback}</> : null;
  }

  return <>{children}</>;
}
