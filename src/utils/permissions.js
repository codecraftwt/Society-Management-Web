// Role-based permissions configuration and check helper

export const PERMISSIONS = {
  dashboard: {
    ADMIN: ['view'],
    SOCIETY_ADMIN: ['view'],
    COMMITTEE_MEMBER: ['view'],
  },
  resident: {
    ADMIN: ['view', 'create', 'edit', 'delete', 'promote', 'status'],
    SOCIETY_ADMIN: ['view', 'create', 'edit', 'delete', 'promote', 'status'],
    COMMITTEE_MEMBER: ['view'],
  },
  property: {
    ADMIN: ['view', 'create', 'edit', 'delete'],
    SOCIETY_ADMIN: ['view', 'create', 'edit', 'delete'],
    COMMITTEE_MEMBER: ['view'],
  },
  parking_slots: {
    ADMIN: ['view', 'create_slot', 'edit_slot', 'delete_slot', 'allocate', 'release'],
    SOCIETY_ADMIN: ['view', 'create_slot', 'edit_slot', 'delete_slot', 'allocate', 'release'],
    COMMITTEE_MEMBER: ['view', 'allocate', 'release'],
  },
  flat_history: {
    ADMIN: ['view'],
    SOCIETY_ADMIN: ['view'],
    COMMITTEE_MEMBER: ['view'],
  },
  tenant_management: {
    ADMIN: ['view', 'approve', 'reject'],
    SOCIETY_ADMIN: ['view', 'approve', 'reject'],
    COMMITTEE_MEMBER: ['view', 'approve', 'reject'],
  },
  guard: {
    ADMIN: ['view', 'create', 'edit', 'delete', 'edit_shift'],
    SOCIETY_ADMIN: ['view', 'create', 'edit', 'delete', 'edit_shift'],
    COMMITTEE_MEMBER: ['view', 'edit_shift'],
  },
  visitor_logs: {
    ADMIN: ['view'],
    SOCIETY_ADMIN: ['view'],
    COMMITTEE_MEMBER: ['view'],
  },
  notice: {
    ADMIN: ['view', 'create', 'edit', 'delete'],
    SOCIETY_ADMIN: ['view', 'create', 'edit', 'delete'],
    COMMITTEE_MEMBER: ['view', 'create', 'edit_own', 'delete_own'],
  },
  complaints: {
    ADMIN: ['view', 'discuss', 'update_status'],
    SOCIETY_ADMIN: ['view', 'discuss', 'update_status'],
    COMMITTEE_MEMBER: ['view', 'discuss', 'update_status'],
  },
  accountant: {
    ADMIN: ['view', 'create', 'edit', 'toggle_status', 'appoint'],
    SOCIETY_ADMIN: ['view', 'create', 'edit', 'toggle_status', 'appoint'],
    COMMITTEE_MEMBER: ['view'],
  },
  manage_bills: {
    ADMIN: ['view', 'create', 'edit', 'delete', 'generate'],
    SOCIETY_ADMIN: ['view', 'create', 'edit', 'delete', 'generate'],
    COMMITTEE_MEMBER: ['view'],
  },
  amenities: {
    ADMIN: ['view', 'create', 'edit', 'delete', 'manage_bookings'],
    SOCIETY_ADMIN: ['view', 'create', 'edit', 'delete', 'manage_bookings'],
    COMMITTEE_MEMBER: ['view', 'manage_bookings'],
  },
  reports: {
    ADMIN: ['view'],
    SOCIETY_ADMIN: ['view'],
    COMMITTEE_MEMBER: ['view'],
  },
  society_documents: {
    ADMIN: ['view', 'upload', 'edit', 'delete', 'download'],
    SOCIETY_ADMIN: ['view', 'upload', 'edit', 'delete', 'download'],
    COMMITTEE_MEMBER: ['view', 'download'],
  },
  settings: {
    ADMIN: ['view', 'edit'],
    SOCIETY_ADMIN: ['view', 'edit'],
    COMMITTEE_MEMBER: ['view', 'edit'],
  },
};

/**
 * Check if the given user (or user role) has permission for a specific module and action.
 * @param {Object|string} user - User object or role string
 * @param {string} module - Module identifier (e.g. 'resident', 'notice', 'guard')
 * @param {string} action - Action identifier (e.g. 'view', 'create', 'edit', 'delete')
 * @returns {boolean}
 */
export function hasPermission(user, module, action) {
  if (!user) return false;
  
  const role = typeof user === 'string' 
    ? user 
    : (user.activeRole || user.role || user.role_name || '');
    
  if (role === 'ADMIN' || role === 'SUPER_ADMIN' || role === 'SOCIETY_ADMIN') {
    // Admin roles generally have full access
    const modulePerms = PERMISSIONS[module];
    if (!modulePerms) return true;
    const rolePerms = modulePerms[role] || modulePerms['SOCIETY_ADMIN'] || modulePerms['ADMIN'] || [];
    return rolePerms.includes(action) || true;
  }

  const modulePerms = PERMISSIONS[module];
  if (!modulePerms) return false;

  const rolePerms = modulePerms[role] || [];
  return rolePerms.includes(action);
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
    : (user.activeRole || user.role || user.role_name || '');
  return role === 'COMMITTEE_MEMBER';
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
    : (user.activeRole || user.role || user.role_name || '');
  return role === 'ADMIN' || role === 'SUPER_ADMIN' || role === 'SOCIETY_ADMIN';
}
