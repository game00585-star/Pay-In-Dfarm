export const CASE_TYPES = Object.freeze([
  'Missing Document',
  'Wrong Amount',
  'OCR Error',
  'AI Review',
  'Manual Review',
  'Accounting Request',
  'Audit Investigation',
  'General'
]);

export const CASE_STATUSES = Object.freeze({
  OPEN: 'OPEN',
  WAITING_BRANCH: 'WAITING_BRANCH',
  WAITING_ACCOUNTING: 'WAITING_ACCOUNTING',
  WAITING_AUDIT: 'WAITING_AUDIT',
  IN_PROGRESS: 'IN_PROGRESS',
  RESOLVED: 'RESOLVED',
  CLOSED: 'CLOSED'
});

export const CASE_PRIORITIES = Object.freeze(['LOW', 'NORMAL', 'HIGH', 'URGENT', 'CRITICAL']);

export class CaseWorkflow {
  transition(caseItem, action, payload = {}) {
    const now = new Date().toISOString();
    const transitions = {
      REQUEST_MORE_DOCUMENT: { status: CASE_STATUSES.WAITING_BRANCH, assignedRole: 'BRANCH' },
      RETURN_CASE: { status: CASE_STATUSES.WAITING_BRANCH, assignedRole: 'BRANCH' },
      APPROVE: { status: CASE_STATUSES.RESOLVED, assignedRole: caseItem.assignedRole },
      REJECT: { status: CASE_STATUSES.CLOSED, assignedRole: caseItem.assignedRole, closedAt: now },
      ASSIGN_INVESTIGATION: { status: CASE_STATUSES.WAITING_AUDIT, assignedRole: 'AUDIT' },
      LOCK_CASE: { status: CASE_STATUSES.IN_PROGRESS, locked: true },
      UNLOCK_CASE: { status: CASE_STATUSES.IN_PROGRESS, locked: false },
      OVERRIDE: { status: CASE_STATUSES.IN_PROGRESS },
      RESOLVE: { status: CASE_STATUSES.RESOLVED },
      CLOSE: { status: CASE_STATUSES.CLOSED, closedAt: now }
    };
    const transition = transitions[action] || {};
    return {
      ...caseItem,
      ...transition,
      assignedRole: payload.assignedRole || transition.assignedRole || caseItem.assignedRole,
      assignedUser: payload.assignedUser ?? caseItem.assignedUser,
      updatedAt: now,
      closedAt: transition.closedAt || caseItem.closedAt || ''
    };
  }
}

export const caseWorkflow = new CaseWorkflow();
