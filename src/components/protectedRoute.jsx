
import { Navigate, Outlet } from "react-router-dom";
import { useContext, useEffect, useState } from "react";
import { AuthContext } from "../context/AuthContext";

const DASHBOARD_ROUTES = {
  SUPER_ADMIN:      "/superadmin",
  SOCIETY_ADMIN:    "/admin",
  COMMITTEE_MEMBER: "/admin",
  RESIDENT:         "/resident",
  FAMILY_MEMBER:    "/family",
  GUARD:            "/guard",
  ACCOUNTANT:       "/accountant",
};

const ProtectedRoute = ({ roles }) => {
  const { user, switchRole } = useContext(AuthContext);
  const [switching, setSwitching] = useState(false);
  const [switchError, setSwitchError] = useState(null);

  // 1. Not logged in
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Determine the effective role to check:
  //   - prefer activeRole (post-RBAC tokens)
  //   - fall back to role (pre-RBAC tokens / old stored user objects)
  const effectiveRole = user.activeRole ?? user.role;

  // A user can open a panel URL directly while the cached token is still
  // scoped to another valid panel (for example /accountant with activeRole
  // RESIDENT). If the requested route is explicitly available, activate that
  // panel before rendering its children so API calls use the correct role.
  const availablePanels = Array.isArray(user.availablePanels) ? user.availablePanels : [];
  const targetRole = roles?.find((candidate) => availablePanels.includes(candidate));

  // Whether a role switch is actually needed: the route demands a role the
  // current token does NOT carry, but the user's panels allow it.
  // When the user already switched via the RoleSwitcher (which updates the
  // context user before navigating), effectiveRole already matches `roles`
  // so needsSwitch is false and the auto-switch useEffect is skipped entirely.
  const needsSwitch = Boolean(roles && !roles.includes(effectiveRole) && targetRole);

  useEffect(() => {
    if (!needsSwitch || switching) return;
    let cancelled = false;
    setSwitching(true);
    setSwitchError(null);
    switchRole(targetRole)
      .catch((error) => {
        if (!cancelled) setSwitchError(error?.response?.data?.message || "Unable to activate this panel.");
      })
      .finally(() => {
        if (!cancelled) setSwitching(false);
      });
    return () => { cancelled = true; };
  // Do not depend on `switching`: setting it to true would clean up the
  // request that is responsible for setting it back to false.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [needsSwitch, switchRole, targetRole]);

  // Safety net: if the role switch succeeded (effectiveRole now matches the
  // route) but the useEffect cleanup cancelled the `.finally()` callback
  // that was supposed to clear `switching`, reset it here so the spinner
  // does not stay on screen forever.
  useEffect(() => {
    if (!needsSwitch && switching) {
      setSwitching(false);
    }
  }, [needsSwitch, switching]);

  // 2. No role restriction on this route — pass through
  if (!roles) {
    return <Outlet />;
  }

  if (needsSwitch) {
    if (switching) {
      return (
        <div
          role="status"
          aria-live="polite"
          style={{
            minHeight: "100vh",
            display: "grid",
            placeItems: "center",
            background: "var(--page-bg, #f7f3ff)",
            color: "var(--text-primary, #1f2937)",
            fontFamily: "inherit",
          }}
        >
          <div style={{ textAlign: "center", padding: 24 }}>
            <div
              style={{
                width: 36,
                height: 36,
                margin: "0 auto 12px",
                border: "4px solid rgba(139, 92, 246, .22)",
                borderTopColor: "#8b5cf6",
                borderRadius: "50%",
                animation: "role-switch-spin .8s linear infinite",
              }}
            />
            <div>Opening your panel…</div>
          </div>
          <style>{`@keyframes role-switch-spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      );
    }
    if (switchError) {
      return <Navigate to="/resident" replace state={{ roleSwitchError: switchError }} />;
    }
    return null;
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
