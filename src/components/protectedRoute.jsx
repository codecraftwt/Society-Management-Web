
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

  // Resolve available panels consistently with RoleSwitcher:
  // Include candidate availablePanels, current society roles, and account roles
  // so multi-society users (e.g. Resident in Soc A + Committee in Soc B) are never locked out.
  const currentSoc = (user?.availableSocieties || []).find(
    (s) => Number(s.id) === Number(user?.society_id)
  );
  const currentSocRoles = Array.isArray(currentSoc?.roles) ? currentSoc.roles : [];
  const candidatePanels = Array.isArray(user?.availablePanels) ? user.availablePanels : [];

  const rawPanels = [
    ...candidatePanels,
    ...currentSocRoles,
    ...(Array.isArray(user?.roles) ? user.roles : [user?.role]),
  ];
  const availablePanels = [...new Set(rawPanels.filter(Boolean))];
  const targetRole = roles?.find((candidate) => availablePanels.includes(candidate));

  // Whether a role switch is actually needed: the route demands a role the
  // current token does NOT carry, but the user's panels allow it.
  const needsSwitch = Boolean(roles && !roles.includes(effectiveRole) && targetRole);

  useEffect(() => {
    if (!needsSwitch) {
      if (switching) setSwitching(false);
      return;
    }
    if (switching) return;

    let isMounted = true;
    setSwitching(true);
    setSwitchError(null);

    switchRole(targetRole)
      .catch((error) => {
        if (isMounted) {
          setSwitchError(error?.response?.data?.message || "Unable to activate this panel.");
        }
      })
      .finally(() => {
        if (isMounted) {
          setSwitching(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [needsSwitch, switchRole, targetRole]);

  // Safety net: if the role switch succeeded (effectiveRole now matches the
  // route) or needsSwitch is cleared, reset switching immediately so the spinner
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
      const fallback = DASHBOARD_ROUTES[effectiveRole] ?? "/login";
      return <Navigate to={fallback} replace state={{ roleSwitchError: switchError }} />;
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
