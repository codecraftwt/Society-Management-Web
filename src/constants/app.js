export const APP_NAME = "MySociety";

export const DASHBOARD_ROUTES = {
  SUPER_ADMIN: "/superadmin",
  SOCIETY_ADMIN: "/admin",
  COMMITTEE_MEMBER: "/committee",
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
