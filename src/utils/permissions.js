// Role-based permissions configuration and check helper
// Comprehensive matrix covering ADMIN, SOCIETY_ADMIN, COMMITTEE_MEMBER, RESIDENT, GUARD, and FAMILY_MEMBER

export const PERMISSIONS = {
  dashboard: {
    ADMIN: ['view'],
    SOCIETY_ADMIN: ['view'],
    COMMITTEE_MEMBER: ['view'],
    ACCOUNTANT: ['view'],
    RESIDENT: ['view'],
    FAMILY_MEMBER: ['view'],
    GUARD: ['view'],
  },
  resident: {
    ADMIN: ['view', 'create', 'edit', 'delete', 'promote', 'status'],
    SOCIETY_ADMIN: ['view', 'create', 'edit', 'delete', 'promote', 'status'],
    COMMITTEE_MEMBER: ['view'],
    ACCOUNTANT: [],
    RESIDENT: ['view_directory', 'view_own'],
    FAMILY_MEMBER: ['view_directory', 'view_own'],
    GUARD: ['view_directory'],
  },
  property: {
    ADMIN: ['view', 'create', 'edit', 'delete'],
    SOCIETY_ADMIN: ['view', 'create', 'edit', 'delete'],
    COMMITTEE_MEMBER: ['view'],
    ACCOUNTANT: [],
    RESIDENT: ['view_own'],
    FAMILY_MEMBER: ['view_own'],
    GUARD: ['view'],
  },
  parking_slots: {
    ADMIN: ['view', 'create_slot', 'edit_slot', 'delete_slot', 'allocate', 'release'],
    SOCIETY_ADMIN: ['view', 'create_slot', 'edit_slot', 'delete_slot', 'allocate', 'release'],
    COMMITTEE_MEMBER: ['view', 'allocate', 'release'],
    ACCOUNTANT: [],
    RESIDENT: ['view_own', 'request'],
    FAMILY_MEMBER: ['view_own'],
    GUARD: ['view'],
  },
  flat_history: {
    ADMIN: ['view'],
    SOCIETY_ADMIN: ['view'],
    COMMITTEE_MEMBER: ['view'],
    ACCOUNTANT: [],
    RESIDENT: ['view_own'],
    FAMILY_MEMBER: ['view_own'],
    GUARD: [],
  },
  tenant_management: {
    ADMIN: ['view', 'approve', 'reject'],
    SOCIETY_ADMIN: ['view', 'approve', 'reject'],
    COMMITTEE_MEMBER: ['view', 'approve', 'reject'],
    ACCOUNTANT: [],
    RESIDENT: ['view_own', 'apply'],
    FAMILY_MEMBER: ['view_own'],
    GUARD: [],
  },
  guard: {
    ADMIN: ['view', 'create', 'edit', 'delete', 'edit_shift'],
    SOCIETY_ADMIN: ['view', 'create', 'edit', 'delete', 'edit_shift'],
    COMMITTEE_MEMBER: ['view', 'edit_shift'],
    ACCOUNTANT: [],
    RESIDENT: ['view'],
    FAMILY_MEMBER: ['view'],
    GUARD: ['view_own', 'view_shifts'],
  },
  visitor_logs: {
    ADMIN: ['view'],
    SOCIETY_ADMIN: ['view'],
    COMMITTEE_MEMBER: ['view'],
    ACCOUNTANT: [],
    RESIDENT: ['view_own', 'create', 'approve', 'reject'],
    FAMILY_MEMBER: ['view_own', 'create', 'approve', 'reject'],
    GUARD: ['view', 'create', 'checkin', 'checkout'],
  },
  notice: {
    ADMIN: ['view', 'create', 'edit', 'delete'],
    SOCIETY_ADMIN: ['view', 'create', 'edit', 'delete'],
    COMMITTEE_MEMBER: ['view', 'create', 'edit_own', 'delete_own'],
    ACCOUNTANT: ['view'],
    RESIDENT: ['view', 'acknowledge'],
    FAMILY_MEMBER: ['view', 'acknowledge'],
    GUARD: ['view'],
  },
  complaints: {
    ADMIN: ['view', 'discuss', 'update_status'],
    SOCIETY_ADMIN: ['view', 'discuss', 'update_status'],
    COMMITTEE_MEMBER: ['view', 'discuss', 'update_status'],
    ACCOUNTANT: [],
    RESIDENT: ['view_own', 'create', 'discuss'],
    FAMILY_MEMBER: ['view_own', 'create', 'discuss'],
    GUARD: ['view_own', 'create'],
  },
  accountant: {
    ADMIN: ['view', 'create', 'edit', 'toggle_status', 'appoint'],
    SOCIETY_ADMIN: ['view', 'create', 'edit', 'toggle_status', 'appoint'],
    COMMITTEE_MEMBER: ['view'],
    ACCOUNTANT: ['view'],
    RESIDENT: ['view'],
    FAMILY_MEMBER: ['view'],
    GUARD: [],
  },
  manage_bills: {
    ADMIN: ['view', 'create', 'edit', 'delete', 'generate'],
    SOCIETY_ADMIN: ['view', 'create', 'edit', 'delete', 'generate'],
    COMMITTEE_MEMBER: ['view'],
    ACCOUNTANT: ['view', 'create', 'edit', 'delete', 'generate'],
    RESIDENT: ['view_own', 'pay'],
    FAMILY_MEMBER: ['view_own', 'pay'],
    GUARD: [],
  },
  maintenance: {
    ADMIN: ['view', 'create', 'edit', 'delete'],
    SOCIETY_ADMIN: ['view', 'create', 'edit', 'delete'],
    COMMITTEE_MEMBER: ['view', 'create', 'edit'],
    ACCOUNTANT: ['view', 'create', 'edit'],
    RESIDENT: [],
    FAMILY_MEMBER: [],
    GUARD: [],
  },
  amenities: {
    ADMIN: ['view', 'create', 'edit', 'delete', 'manage_bookings'],
    SOCIETY_ADMIN: ['view', 'create', 'edit', 'delete', 'manage_bookings'],
    COMMITTEE_MEMBER: ['view', 'manage_bookings'],
    ACCOUNTANT: [],
    RESIDENT: ['view', 'book'],
    FAMILY_MEMBER: ['view', 'book'],
    GUARD: ['view'],
  },
  reports: {
    ADMIN: ['view'],
    SOCIETY_ADMIN: ['view'],
    COMMITTEE_MEMBER: ['view'],
    ACCOUNTANT: ['view', 'export'],
    RESIDENT: [],
    FAMILY_MEMBER: [],
    GUARD: [],
  },
  society_documents: {
    ADMIN: ['view', 'upload', 'edit', 'delete', 'download'],
    SOCIETY_ADMIN: ['view', 'upload', 'edit', 'delete', 'download'],
    COMMITTEE_MEMBER: ['view', 'download'],
    ACCOUNTANT: ['view', 'download'],
    RESIDENT: ['view', 'download'],
    FAMILY_MEMBER: ['view', 'download'],
    GUARD: ['view'],
  },
  emergency: {
    ADMIN: ['view', 'trigger', 'resolve'],
    SOCIETY_ADMIN: ['view', 'trigger', 'resolve'],
    COMMITTEE_MEMBER: ['view', 'trigger', 'resolve'],
    ACCOUNTANT: [],
    RESIDENT: ['view', 'trigger', 'resolve'],
    FAMILY_MEMBER: ['view', 'trigger', 'resolve'],
    GUARD: ['view', 'trigger', 'respond', 'resolve'],
  },
  settings: {
    ADMIN: ['view', 'edit'],
    SOCIETY_ADMIN: ['view', 'edit'],
    COMMITTEE_MEMBER: ['view', 'edit'],
    ACCOUNTANT: ['view', 'edit'],
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
 * In the section-based permission model, having access to a module grants full operations within that module.
 * @param {Object|string} user - User object or role string
 * @param {string} module - Module identifier (e.g. 'resident', 'notice', 'guard', 'visitor_logs', 'manage_bills')
 * @param {string} [action='view'] - Optional action identifier (defaults to 'view')
 * @returns {boolean}
 */
export function hasPermission(user, module, action = 'view') {
  if (!user) return false;

  let role = typeof user === 'string'
    ? user
    : (user.activePanel || user.activeRole || user.role || user.role_name || '');
  if (role) role = role.toUpperCase();
  if (role === 'COMMITTEE') role = 'COMMITTEE_MEMBER';

  // 1. Super Admin and Society Admin have full access
  if (role === 'ADMIN' || role === 'SUPER_ADMIN' || role === 'SOCIETY_ADMIN') {
    return true;
  }

  // 2. Check dynamic permissions if provided on the user object / context
  if (typeof user === 'object') {
    const dyn = user.dynamic_permissions || user.permissions || user.sections;
    if (dyn && typeof dyn === 'object' && dyn[module] !== undefined) {
      const val = dyn[module];
      if (typeof val === 'boolean') return val;
      if (Array.isArray(val)) {
        if (val.length === 0) return false;
        // If action is specific or wildcard, having section enabled grants all actions
        return true;
      }
      if (val === 1 || val === '1' || val === 'true') return true;
      if (val === 0 || val === '0' || val === 'false') return false;
    }
  }

  // 3. For Committee Member or Accountant, if no override exists, check module baseline
  const modulePerms = PERMISSIONS[module];
  if (!modulePerms) return false;

  const rolePerms = modulePerms[role] || [];
  return rolePerms.length > 0;
}

/**
 * Check if a section/module is permitted for the current user
 * @param {Object|string} user
 * @param {string} module
 * @returns {boolean}
 */
export function hasSectionPermission(user, module) {
  return hasPermission(user, module, 'view');
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
  hasSectionPermission,
  isAccountant,
  isResident,
  isGuard,
  isFamilyMember,
  isCommitteeMember,
  isAdmin,
};
