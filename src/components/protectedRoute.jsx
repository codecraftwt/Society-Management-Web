


import { Navigate, Outlet } from "react-router-dom";

const DASHBOARD_ROUTES = {
  SUPER_ADMIN:      "/superadmin",
  SOCIETY_ADMIN:    "/admin",
  COMMITTEE_MEMBER: "/committee",
  RESIDENT:         "/resident",
  FAMILY_MEMBER:    "/family",
  GUARD:            "/guard",
  ACCOUNTANT:       "/accountant",
};

const ProtectedRoute = ({ roles }) => {
  const user = JSON.parse(localStorage.getItem("user"));

  // 1. Not logged in
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Determine the effective role to check:
  //   - prefer activeRole (post-RBAC tokens)
  //   - fall back to role (pre-RBAC tokens / old stored user objects)
  const effectiveRole = user.activeRole ?? user.role;

  // 2. No role restriction on this route — pass through
  if (!roles) {
    return <Outlet />;
  }

  // 3. Role is allowed
  if (roles.includes(effectiveRole)) {
    return <Outlet />;
  }

  // 4. Role not allowed — redirect to appropriate dashboard
  const redirect = DASHBOARD_ROUTES[effectiveRole] ?? "/login";
  return <Navigate to={redirect} replace />;
};

export default ProtectedRoute;