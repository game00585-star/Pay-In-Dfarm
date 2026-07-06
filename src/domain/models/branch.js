/**
 * @typedef {Object} Branch
 * @property {string} id
 * @property {string} code
 * @property {string} name
 * @property {string} area
 * @property {boolean} active
 */

export function createBranch(input = {}) {
  return {
    id: input.id || '',
    code: input.code || '',
    name: input.name || '',
    area: input.area || '',
    active: input.active ?? true
  };
}

