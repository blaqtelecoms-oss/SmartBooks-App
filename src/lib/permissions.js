/**
 * Permission helpers — role-based access control for company-scoped actions.
 * Roles: admin (full), bookkeeper (data entry + reporting), auditor (read-only).
 */

const ROLE_LEVELS = {
  super_admin: 100,
  admin: 90,
  accountant: 70,
  business_owner: 80,
  bookkeeper: 50,
  auditor: 10,
  employee: 30,
};

const ACTION_LEVELS = {
  view: 10,       // auditor can view
  create: 50,     // bookkeeper can create
  edit: 50,       // bookkeeper can edit
  delete: 90,     // only admin can delete
  manage_team: 90, // only admin can manage team
  manage_settings: 90,
  export: 10,     // auditor can export
};

/**
 * Check if the user's role permits an action.
 * @param {string} role - the user's role in the company
 * @param {string} action - view|create|edit|delete|manage_team|manage_settings|export
 * @returns {boolean}
 */
export function can(role, action) {
  const userLevel = ROLE_LEVELS[role] || 0;
  const actionLevel = ACTION_LEVELS[action] || 0;
  return userLevel >= actionLevel;
}

/**
 * Get the user's role for a company from company_users.
 * Falls back to 'admin' if they are the company owner.
 */
export function getRoleForCompany(user, companyId, companyMembers) {
  if (!user) return null;
  // Check if owner
  const member = companyMembers?.find(m =>
    m.company_id === companyId &&
    (m.user_id === user.id || m.user_id === user.email)
  );
  if (member) return member.role;
  return null;
}

export const ROLE_LABELS = {
  admin: "Admin",
  bookkeeper: "Bookkeeper",
  auditor: "Auditor",
  accountant: "Accountant",
  super_admin: "Super Admin",
  business_owner: "Business Owner",
  employee: "Employee",
};

export const ROLE_DESCRIPTIONS = {
  admin: "Full access — manage all data, team, and settings",
  bookkeeper: "Data entry, bank allocation, and reporting",
  auditor: "Read-only access to all company data",
};
