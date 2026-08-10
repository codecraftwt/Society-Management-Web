import { useContext, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import Select from "./common/Select";



const DASHBOARD_ROUTES = {
  SUPER_ADMIN:      "/superadmin",
  SOCIETY_ADMIN:    "/admin",
  COMMITTEE_MEMBER: "/committee",
  RESIDENT:         "/resident",
  FAMILY_MEMBER:    "/family",
  GUARD:            "/guard",
  ACCOUNTANT:       "/accountant",
};

const ROLE_LABELS = {
  SUPER_ADMIN:      "Super Admin",
  SOCIETY_ADMIN:    "Society Admin",
  COMMITTEE_MEMBER: "Committee Member",
  RESIDENT:         "Resident",
  FAMILY_MEMBER:    "Family Member",
  GUARD:            "Guard",
  ACCOUNTANT:       "Accountant",
};

export default function RoleSwitcher() {
  const { user, switchRole } = useContext(AuthContext);
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState(null);

  // Don't render at all if user has only one role
  if (!user || !user.roles || user.roles.length <= 1) return null;

  const handleSwitch = async (e) => {
    const role = e.target.value;
    if (role === user.activeRole) return;

    setLoading(true);
    setError(null);

    try {
      await switchRole(role);
      const destination = DASHBOARD_ROUTES[role] ?? "/";
      navigate(destination, { replace: true });
    } catch (err) {
      setError(err?.response?.data?.message ?? "Failed to switch role");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <Select
        value={user.activeRole}
        onChange={handleSwitch}
        disabled={loading}
        style={{
          padding:      "6px 10px",
          borderRadius: "var(--border-radius-md)",
          border:       "1.5px solid var(--glass-border)",
          background:   "var(--card-inner-bg)",
          color:        "var(--text-primary)",
          fontSize:     13,
          cursor:       loading ? "wait" : "pointer",
        }}
        title="Switch active role"
      >
        {user.roles.map((role) => (
          <option key={role} value={role}>
            {ROLE_LABELS[role] ?? role}
          </option>
        ))}
      </Select>

      {error && (
        <span style={{ color: "var(--color-danger)", fontSize: 12 }}>
          {error}
        </span>
      )}
    </div>
  );
}