import { ROLES } from '../constants/roles.js';

/**
 * @typedef {Object} UserProfile
 * @property {string} id
 * @property {string} name
 * @property {string} email
 * @property {string} role
 * @property {string} branch
 * @property {boolean} active
 */

export function createUserProfile(input = {}) {
  return {
    id: input.id || '',
    name: input.name || '',
    email: input.email || '',
    role: input.role || ROLES.BRANCH,
    branch: input.branch || '',
    active: input.active ?? true
  };
}

