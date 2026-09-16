import { Navigate, Outlet } from "react-router-dom";
import { useContext } from "react";
import { AuthContext } from "../../context/AuthContext";
import { hasPermission } from "../../utils/permissions";

/**
 * PermissionRoute
 * Dynamic Route Guard: Prevents unauthorized direct URL access if the user's role
 * does not have permission granted for the specified module.
 *
 * @param {Object} props
 * @param {string} props.module - The module key (e.g. "maintenance", "society_documents", "parking_slots", "manage_bills")
 * @param {string} [props.action="view"] - Action required (defaults to "view")
 * @param {string} [props.fallback] - Optional redirect route override
 */
export default function PermissionRoute({ module, action = "view", fallback = null }) {
  const { user } = useContext(AuthContext);

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  const role = (user.activeRole || user.role || "").toUpperCase();

  // 1. Super Admin and Society Admin have full bypass access
  if (role === "SUPER_ADMIN" || role === "SOCIETY_ADMIN" || role === "ADMIN") {
    return <Outlet />;
  }

  // 2. Check dynamic section/module permission
  if (module && !hasPermission(user, module, action)) {
    const fallbackMap = {
      SUPER_ADMIN: "/superadmin",
      SOCIETY_ADMIN: "/admin",
      COMMITTEE_MEMBER: "/admin",
      ACCOUNTANT: "/accountant",
      GUARD: "/guard",
      RESIDENT: "/resident",
      FAMILY_MEMBER: "/family",
    };
    const targetFallback = fallback || fallbackMap[role] || "/login";
    return <Navigate to={targetFallback} replace />;
  }

  return <Outlet />;
}
