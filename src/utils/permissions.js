// Role-based permissions configuration and check helper
// Comprehensive matrix covering ADMIN, SOCIETY_ADMIN, COMMITTEE_MEMBER, RESIDENT, GUARD, and FAMILY_MEMBER

export const PERMISSIONS = {
  dashboard: {
    ADMIN: ['view'],
    SOCIETY_ADMIN: ['view'],
    COMMITTEE_MEMBER: ['view'],
    RESIDENT: ['view'],
    FAMILY_MEMBER: ['view'],
    GUARD: ['view'],
  },
  resident: {
    ADMIN: ['view', 'create', 'edit', 'delete', 'promote', 'status'],
    SOCIETY_ADMIN: ['view', 'create', 'edit', 'delete', 'promote', 'status'],
    COMMITTEE_MEMBER: ['view'],
    RESIDENT: ['view_directory', 'view_own'],
    FAMILY_MEMBER: ['view_directory', 'view_own'],
    GUARD: ['view_directory'],
  },
  property: {
    ADMIN: ['view', 'create', 'edit', 'delete'],
    SOCIETY_ADMIN: ['view', 'create', 'edit', 'delete'],
    COMMITTEE_MEMBER: ['view'],
    RESIDENT: ['view_own'],
    FAMILY_MEMBER: ['view_own'],
    GUARD: ['view'],
  },
  parking_slots: {
    ADMIN: ['view', 'create_slot', 'edit_slot', 'delete_slot', 'allocate', 'release'],
    SOCIETY_ADMIN: ['view', 'create_slot', 'edit_slot', 'delete_slot', 'allocate', 'release'],
    COMMITTEE_MEMBER: ['view', 'allocate', 'release'],
    RESIDENT: ['view_own', 'request'],
    FAMILY_MEMBER: ['view_own'],
    GUARD: ['view'],
  },
  flat_history: {
    ADMIN: ['view'],
    SOCIETY_ADMIN: ['view'],
    COMMITTEE_MEMBER: ['view'],
    RESIDENT: ['view_own'],
    FAMILY_MEMBER: ['view_own'],
    GUARD: [],
  },
  tenant_management: {
    ADMIN: ['view', 'approve', 'reject'],
    SOCIETY_ADMIN: ['view', 'approve', 'reject'],
    COMMITTEE_MEMBER: ['view', 'approve', 'reject'],
    RESIDENT: ['view_own', 'apply'],
    FAMILY_MEMBER: ['view_own'],
    GUARD: [],
  },
  guard: {
    ADMIN: ['view', 'create', 'edit', 'delete', 'edit_shift'],
    SOCIETY_ADMIN: ['view', 'create', 'edit', 'delete', 'edit_shift'],
    COMMITTEE_MEMBER: ['view', 'edit_shift'],
    RESIDENT: ['view'],
    FAMILY_MEMBER: ['view'],
    GUARD: ['view_own', 'view_shifts'],
  },
  visitor_logs: {
    ADMIN: ['view'],
    SOCIETY_ADMIN: ['view'],
    COMMITTEE_MEMBER: ['view'],
    RESIDENT: ['view_own', 'create', 'approve', 'reject'],
    FAMILY_MEMBER: ['view_own', 'create', 'approve', 'reject'],
    GUARD: ['view', 'create', 'checkin', 'checkout'],
  },
  notice: {
    ADMIN: ['view', 'create', 'edit', 'delete'],
    SOCIETY_ADMIN: ['view', 'create', 'edit', 'delete'],
    COMMITTEE_MEMBER: ['view', 'create', 'edit_own', 'delete_own'],
    RESIDENT: ['view', 'acknowledge'],
    FAMILY_MEMBER: ['view', 'acknowledge'],
    GUARD: ['view'],
  },
  complaints: {
    ADMIN: ['view', 'discuss', 'update_status'],
    SOCIETY_ADMIN: ['view', 'discuss', 'update_status'],
    COMMITTEE_MEMBER: ['view', 'discuss', 'update_status'],
    RESIDENT: ['view_own', 'create', 'discuss'],
    FAMILY_MEMBER: ['view_own', 'create', 'discuss'],
    GUARD: ['view_own', 'create'],
  },
  accountant: {
    ADMIN: ['view', 'create', 'edit', 'toggle_status', 'appoint'],
    SOCIETY_ADMIN: ['view', 'create', 'edit', 'toggle_status', 'appoint'],
    COMMITTEE_MEMBER: ['view'],
    RESIDENT: ['view'],
    FAMILY_MEMBER: ['view'],
    GUARD: [],
  },
  manage_bills: {
    ADMIN: ['view', 'create', 'edit', 'delete', 'generate'],
    SOCIETY_ADMIN: ['view', 'create', 'edit', 'delete', 'generate'],
    COMMITTEE_MEMBER: ['view'],
    RESIDENT: ['view_own', 'pay'],
    FAMILY_MEMBER: ['view_own', 'pay'],
    GUARD: [],
  },
  amenities: {
    ADMIN: ['view', 'create', 'edit', 'delete', 'manage_bookings'],
    SOCIETY_ADMIN: ['view', 'create', 'edit', 'delete', 'manage_bookings'],
    COMMITTEE_MEMBER: ['view', 'manage_bookings'],
    RESIDENT: ['view', 'book'],
    FAMILY_MEMBER: ['view', 'book'],
    GUARD: ['view'],
  },
  reports: {
    ADMIN: ['view'],
    SOCIETY_ADMIN: ['view'],
    COMMITTEE_MEMBER: ['view'],
    RESIDENT: [],
    FAMILY_MEMBER: [],
    GUARD: [],
  },
  society_documents: {
    ADMIN: ['view', 'upload', 'edit', 'delete', 'download'],
    SOCIETY_ADMIN: ['view', 'upload', 'edit', 'delete', 'download'],
    COMMITTEE_MEMBER: ['view', 'download'],
    RESIDENT: ['view', 'download'],
    FAMILY_MEMBER: ['view', 'download'],
    GUARD: ['view'],
  },
  emergency: {
    ADMIN: ['view', 'trigger', 'resolve'],
    SOCIETY_ADMIN: ['view', 'trigger', 'resolve'],
    COMMITTEE_MEMBER: ['view', 'trigger', 'resolve'],
    RESIDENT: ['view', 'trigger'],
    FAMILY_MEMBER: ['view', 'trigger'],
    GUARD: ['view', 'trigger', 'respond'],
  },
  settings: {
    ADMIN: ['view', 'edit'],
    SOCIETY_ADMIN: ['view', 'edit'],
    COMMITTEE_MEMBER: ['view', 'edit'],
    RESIDENT: ['view', 'edit_profile'],
    FAMILY_MEMBER: ['view', 'edit_profile'],
    GUARD: ['view', 'edit_profile'],
  },
};

/**
 * Check if the given user (or user role) has permission for a specific module and action.
 * @param {Object|string} user - User object or role string
 * @param {string} module - Module identifier (e.g. 'resident', 'notice', 'guard', 'visitor_logs')
 * @param {string} action - Action identifier (e.g. 'view', 'create', 'edit', 'delete', 'approve')
 * @returns {boolean}
 */
/**
 * Check if the given user (or user role) has permission for a specific module and action.
 * Evaluates dynamic permissions returned by API first, falling back to static role matrix.
 * @param {Object|string} user - User object or role string
 * @param {string} module - Module identifier (e.g. 'resident', 'notice', 'guard', 'visitor_logs', 'manage_bills')
 * @param {string} action - Action identifier (e.g. 'view', 'create', 'edit', 'delete', 'approve', 'generate')
 * @returns {boolean}
 */
export function hasPermission(user, module, action) {
  if (!user) return false;

  const role = typeof user === 'string'
    ? user
    : (user.activePanel || user.activeRole || user.role || user.role_name || '');

  // 1. Super Admin and Society Admin have full access
  if (role === 'ADMIN' || role === 'SUPER_ADMIN' || role === 'SOCIETY_ADMIN') {
    return true;
  }

  // 2. Check dynamic permissions if provided on the user object / context
  if (typeof user === 'object') {
    const dyn = user.dynamic_permissions || user.permissions;
    if (dyn && dyn[module] && Array.isArray(dyn[module])) {
      return dyn[module].includes(action);
    }
  }

  // 3. Fallback to baseline role permissions matrix
  const modulePerms = PERMISSIONS[module];
  if (!modulePerms) return false;

  const rolePerms = modulePerms[role] || [];
  return rolePerms.includes(action);
}

/**
 * Check if the active user is an Accountant
 * @param {Object|string} user
 * @returns {boolean}
 */
export function isAccountant(user) {
  if (!user) return false;
  const role = typeof user === 'string'
    ? user
    : (user.activePanel || user.activeRole || user.role || user.role_name || '');
  return role === 'ACCOUNTANT';
}

/**
 * Check if the active user is a Resident
 * @param {Object|string} user
 * @returns {boolean}
 */
export function isResident(user) {
  if (!user) return false;
  const role = typeof user === 'string'
    ? user
    : (user.activePanel || user.activeRole || user.role || user.role_name || '');
  return role === 'RESIDENT';
}

/**
 * Check if the active user is a Security Guard
 * @param {Object|string} user
 * @returns {boolean}
 */
export function isGuard(user) {
  if (!user) return false;
  const role = typeof user === 'string'
    ? user
    : (user.activePanel || user.activeRole || user.role || user.role_name || '');
  return role === 'GUARD';
}

/**
 * Check if the active user is a Family Member
 * @param {Object|string} user
 * @returns {boolean}
 */
export function isFamilyMember(user) {
  if (!user) return false;
  const role = typeof user === 'string'
    ? user
    : (user.activePanel || user.activeRole || user.role || user.role_name || '');
  return role === 'FAMILY_MEMBER';
}

/**
 * Check if the active user is a Committee Member
 * @param {Object|string} user
 * @returns {boolean}
 */
export function isCommitteeMember(user) {
  if (!user) return false;
  const role = typeof user === 'string'
    ? user
    : (user.activePanel || user.activeRole || user.role || user.role_name || '');
  return role === 'COMMITTEE_MEMBER' || role === 'COMMITTEE';
}

/**
 * Check if the active user is an Admin
 * @param {Object|string} user
 * @returns {boolean}
 */
export function isAdmin(user) {
  if (!user) return false;
  const role = typeof user === 'string'
    ? user
    : (user.activePanel || user.activeRole || user.role || user.role_name || '');
  return role === 'ADMIN' || role === 'SUPER_ADMIN' || role === 'SOCIETY_ADMIN';
}

export default {
  PERMISSIONS,
  hasPermission,
  isAccountant,
  isResident,
  isGuard,
  isFamilyMember,
  isCommitteeMember,
  isAdmin,
};
