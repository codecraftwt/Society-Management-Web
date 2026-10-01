import { useContext, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  MdSupervisorAccount,
  MdAdminPanelSettings,
  MdGroups,
  MdHome,
  MdFamilyRestroom,
  MdSecurity,
  MdAccountBalance,
  MdExpandMore,
  MdCheck,
} from "react-icons/md";
import { AuthContext } from "../context/AuthContext";
import { DASHBOARD_ROUTES } from "../constants/app";

const ROLE_META = {
  SUPER_ADMIN: { label: "Super Admin", hint: "Platform-wide control", Icon: MdSupervisorAccount },
  SOCIETY_ADMIN: { label: "Society Admin", hint: "Full society management", Icon: MdAdminPanelSettings },
  COMMITTEE_MEMBER: { label: "Committee Member", hint: "Assigned committee duties", Icon: MdGroups },
  RESIDENT: { label: "Resident", hint: "Home, dues and services", Icon: MdHome },
  FAMILY_MEMBER: { label: "Family Member", hint: "Limited resident access", Icon: MdFamilyRestroom },
  GUARD: { label: "Guard", hint: "Gate and security duties", Icon: MdSecurity },
  ACCOUNTANT: { label: "Accountant", hint: "Billing and finance", Icon: MdAccountBalance },
};

const metaFor = (role) =>
  ROLE_META[role] ?? { label: role, hint: "Switch panel", Icon: MdGroups };

/**
 * Panel / role switcher.
 *
 * Replaces a native <select> with a real popover so it matches the rest of the
 * UI: a trigger that shows the active panel, and a menu that gives every role
 * an icon, a label and a one-line description.
 *
 * Switching re-issues the auth token server-side (see AuthContext.switchRole),
 * so the menu is disabled while that request is in flight to avoid firing the
 * same switch twice.
 */
export default function RoleSwitcher({ fullWidth = false }) {
  const { user, switchRole } = useContext(AuthContext);
  const navigate = useNavigate();

  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const wrapRef = useRef(null);

  /* Only offer panels the API says this user actually has. `roles` always
     contains RESIDENT for an accountant (even one appointed from outside the
     society), so availablePanels is the only safe source — it is derived from
     AccountantAssignment.is_society_resident server-side. */
  const available = Array.isArray(user?.availablePanels) && user.availablePanels.length
    ? user.availablePanels
    : null;
  const roles = (available ?? user?.roles ?? []).filter(Boolean);
  const activeRole = user?.activeRole;

  /* Dismiss on outside click or Escape. */
  useEffect(() => {
    if (!open) return undefined;

    const onPointerDown = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    const onKeyDown = (e) => {
      if (e.key === "Escape") setOpen(false);
    };

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  // Only meaningful for users who actually have more than one panel. An
  // outsider accountant has exactly one (ACCOUNTANT), so no trigger renders.
  if (!user || roles.length <= 1) return null;

  const active = metaFor(activeRole);
  const ActiveIcon = active.Icon;

  const handleSwitch = async (role) => {
    if (role === activeRole || loading) return;

    // Defence in depth: never offer a switch the API would reject.
    if (!roles.includes(role)) return;

    setLoading(true);
    setError(null);
    setOpen(false);

    try {
      await switchRole(role);
      navigate(DASHBOARD_ROUTES[role] ?? "/", { replace: true });
    } catch (err) {
      setError(err?.response?.data?.message ?? "Failed to switch role");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`rsw ${fullWidth ? "rsw--block" : ""}`} ref={wrapRef}>
      <button
        type="button"
        className="rsw__trigger"
        onClick={() => setOpen((v) => !v)}
        disabled={loading}
        aria-haspopup="listbox"
        aria-expanded={open}
        title="Switch active panel"
      >
        <span className="rsw__trigger-icon" aria-hidden>
          <ActiveIcon size={16} />
        </span>

        <span className="rsw__trigger-text">
          <span className="rsw__trigger-label">{active.label}</span>
        </span>

        <MdExpandMore
          size={16}
          className={`rsw__chev ${open ? "is-open" : ""}`}
          aria-hidden
        />
      </button>

      {open && (
        <div className="rsw__menu" role="listbox" aria-label="Switch active panel">
          <span className="rsw__menu-head" aria-hidden>
            Switch panel
          </span>

          {roles.map((role) => {
            const meta = metaFor(role);
            const Icon = meta.Icon;
            const isActive = role === activeRole;

            return (
              <button
                key={role}
                type="button"
                role="option"
                aria-selected={isActive}
                className={`rsw__opt ${isActive ? "is-active" : ""}`}
                onClick={() => handleSwitch(role)}
                disabled={loading}
              >
                <span className="rsw__opt-icon" aria-hidden>
                  <Icon size={15} />
                </span>

                <span className="rsw__opt-text">
                  <span className="rsw__opt-label">{meta.label}</span>
                  <span className="rsw__opt-hint">{meta.hint}</span>
                </span>

                {isActive && <MdCheck size={15} className="rsw__opt-check" aria-hidden />}
              </button>
            );
          })}
        </div>
      )}

      {error && <span className="rsw__error">{error}</span>}
    </div>
  );
}
