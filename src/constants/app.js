export const APP_NAME = "MySociety";

export const DASHBOARD_ROUTES = {
  SUPER_ADMIN: "/superadmin",
  SOCIETY_ADMIN: "/admin",
  COMMITTEE_MEMBER: "/admin",
  GUARD: "/guard",
  ACCOUNTANT: "/accountant",
  FAMILY_MEMBER: "/family",
  RESIDENT: "/resident",
};

export function getDashboardPath(user) {
  if (!user) return "/login";
  const role = user.activeRole ?? user.role;
  return DASHBOARD_ROUTES[role] || "/login";
}

/**
 * Where "open my profile" should land, per role.
 *
 * Resident, family and admin/committee panels have a dedicated profile screen
 * at <base>/myprofile, so they route straight there. That screen mounts the
 * shared SettingsPanel profile section, which is the same component the
 * settings hub renders for its "My Profile" card, so the two are one
 * implementation rather than two lookalikes.
 *
 * Panels that keep profile inside their settings surface deep-link into it with
 * ?section=profile instead of landing on the settings hub. The accountant used
 * to be the exception because its settings page was profile-only; it is a full
 * SettingsPanel hub now, so it deep-links like the others.
 */
const PROFILE_PATHS = {
  RESIDENT: "/resident/myprofile",
  FAMILY_MEMBER: "/family/myprofile",
  SOCIETY_ADMIN: "/admin/myprofile",
  COMMITTEE_MEMBER: "/admin/myprofile",
  GUARD: "/guard/settings?section=profile",
  SUPER_ADMIN: "/superadmin/settings?section=profile",
  ACCOUNTANT: "/accountant/settings?section=profile",
};

export function getProfilePath(user) {
  if (!user) return "/login";
  const role = user.activeRole ?? user.role;
  return PROFILE_PATHS[role] || `${getDashboardPath(user)}/settings?section=profile`;
}
