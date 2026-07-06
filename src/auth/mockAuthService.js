import { ROLES } from '../domain/constants/roles.js';
import { masterUsers } from '../infrastructure/database/masterData.js';

const rolePriority = [ROLES.BRANCH, ROLES.ACCOUNTING, ROLES.AUDIT, ROLES.REGIONAL_MANAGER, ROLES.EXECUTIVE, ROLES.ADMIN];

function normalizeRole(role) {
  const upper = String(role || '').toUpperCase();
  return Object.values(ROLES).includes(upper) ? upper : ROLES.BRANCH;
}

export class MockAuthService {
  constructor({ users = masterUsers } = {}) {
    this.users = users;
  }

  async login({ email, role }) {
    const selectedRole = normalizeRole(role);
    const userByEmail = this.users.find((user) => user.email === email && user.active);
    const userByRole = this.users.find((user) => user.role === selectedRole && user.active);
    const user = userByEmail?.role === selectedRole ? userByEmail : userByRole;
    if (!user) {
      throw new Error(`No active mock user for role ${selectedRole}`);
    }
    return { ...user, role: selectedRole };
  }

  async logout() {
    return true;
  }

  listLoginRoles() {
    return rolePriority;
  }
}

export const mockAuthService = new MockAuthService();
