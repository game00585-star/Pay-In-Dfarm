export const WORKFLOW_STEPS = Object.freeze({
  DRAFT: 'DRAFT',
  WAITING_AI: 'WAITING_AI',
  WAITING_ACCOUNTING: 'WAITING_ACCOUNTING',
  WAITING_BRANCH: 'WAITING_BRANCH',
  WAITING_AUDIT: 'WAITING_AUDIT',
  WAITING_MANAGER: 'WAITING_MANAGER',
  COMPLETED: 'COMPLETED',
  REJECTED: 'REJECTED'
});

export const WORKFLOW_STATUS = Object.freeze({
  OPEN: 'OPEN',
  IN_PROGRESS: 'IN_PROGRESS',
  WAITING: 'WAITING',
  RETURNED: 'RETURNED',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
  COMPLETED: 'COMPLETED'
});

export const WORKFLOW_PRIORITY = Object.freeze({
  LOW: 'LOW',
  NORMAL: 'NORMAL',
  HIGH: 'HIGH',
  URGENT: 'URGENT',
  CRITICAL: 'CRITICAL'
});

const TRANSITIONS = {
  BRANCH_UPLOAD: { step: WORKFLOW_STEPS.WAITING_AI, status: WORKFLOW_STATUS.IN_PROGRESS, assignedRole: 'SYSTEM' },
  AI_COMPLETE: { step: WORKFLOW_STEPS.WAITING_ACCOUNTING, status: WORKFLOW_STATUS.WAITING, assignedRole: 'ACCOUNTING' },
  ACCOUNTING_APPROVE: { step: WORKFLOW_STEPS.WAITING_AUDIT, status: WORKFLOW_STATUS.APPROVED, assignedRole: 'AUDIT' },
  ACCOUNTING_RETURN: { step: WORKFLOW_STEPS.WAITING_BRANCH, status: WORKFLOW_STATUS.RETURNED, assignedRole: 'BRANCH' },
  ACCOUNTING_REJECT: { step: WORKFLOW_STEPS.REJECTED, status: WORKFLOW_STATUS.REJECTED, assignedRole: 'ACCOUNTING', completed: true },
  REQUEST_MORE_DOCUMENT: { step: WORKFLOW_STEPS.WAITING_BRANCH, status: WORKFLOW_STATUS.RETURNED, assignedRole: 'BRANCH' },
  BRANCH_RESUBMIT: { step: WORKFLOW_STEPS.WAITING_AI, status: WORKFLOW_STATUS.IN_PROGRESS, assignedRole: 'SYSTEM' },
  AUDIT_APPROVE: { step: WORKFLOW_STEPS.COMPLETED, status: WORKFLOW_STATUS.COMPLETED, assignedRole: 'AUDIT', completed: true },
  AUDIT_LOCK: { step: WORKFLOW_STEPS.WAITING_AUDIT, status: WORKFLOW_STATUS.WAITING, assignedRole: 'AUDIT' },
  AUDIT_UNLOCK: { step: WORKFLOW_STEPS.WAITING_AUDIT, status: WORKFLOW_STATUS.IN_PROGRESS, assignedRole: 'AUDIT' },
  MANAGER_ESCALATE: { step: WORKFLOW_STEPS.WAITING_MANAGER, status: WORKFLOW_STATUS.WAITING, assignedRole: 'REGIONAL_MANAGER' },
  MANAGER_APPROVE: { step: WORKFLOW_STEPS.WAITING_AUDIT, status: WORKFLOW_STATUS.APPROVED, assignedRole: 'AUDIT' },
  COMPLETE: { step: WORKFLOW_STEPS.COMPLETED, status: WORKFLOW_STATUS.COMPLETED, assignedRole: 'AUDIT', completed: true },
  REJECT: { step: WORKFLOW_STEPS.REJECTED, status: WORKFLOW_STATUS.REJECTED, assignedRole: 'AUDIT', completed: true }
};

export class WorkflowRuleEngine {
  getTransition(action) {
    return TRANSITIONS[action] || null;
  }

  canTransition(workflowCase, action) {
    if (!workflowCase || [WORKFLOW_STEPS.COMPLETED, WORKFLOW_STEPS.REJECTED].includes(workflowCase.currentStep)) {
      return false;
    }
    return Boolean(this.getTransition(action));
  }

  apply(workflowCase, action, payload = {}) {
    const transition = this.getTransition(action);
    if (!transition) return workflowCase;
    const now = new Date().toISOString();
    return {
      ...workflowCase,
      currentStep: transition.step,
      currentStatus: transition.status,
      assignedRole: payload.assignedRole || transition.assignedRole || workflowCase.assignedRole,
      assignedUser: payload.assignedUser ?? workflowCase.assignedUser,
      assignedBranch: payload.assignedBranch ?? workflowCase.assignedBranch,
      assignedRegion: payload.assignedRegion ?? workflowCase.assignedRegion,
      updatedAt: now,
      completedAt: transition.completed ? now : workflowCase.completedAt || ''
    };
  }
}

export const workflowRuleEngine = new WorkflowRuleEngine();
