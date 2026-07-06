/**
 * @typedef {Object} AuditLog
 * @property {string} id
 * @property {string} action
 * @property {string} recordId
 * @property {string} actor
 * @property {string} actorRole
 * @property {unknown} before
 * @property {unknown} after
 * @property {string} createdAt
 */

export function createAuditLog({ action, recordId = '', actor, actorRole, before = null, after = null }) {
  return {
    id: `log-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    action,
    recordId,
    actor,
    actorRole,
    before,
    after,
    createdAt: new Date().toISOString()
  };
}

