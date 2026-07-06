export class WorkflowPermissionService {
  canRead(user, workflowCase) {
    if (!user) return false;
    if (['ADMIN', 'ACCOUNTING', 'AUDIT', 'EXECUTIVE'].includes(user.role)) return true;
    if (user.role === 'BRANCH') return workflowCase.branchName === user.branch || workflowCase.assignedBranch === user.branch;
    if (user.role === 'REGIONAL_MANAGER') {
      if (!user.region && !user.branch) return true;
      return user.region === workflowCase.region
        || user.region === workflowCase.assignedRegion
        || user.branch === workflowCase.assignedRegion
        || String(workflowCase.branchName || '').includes(user.region || user.branch || '');
    }
    return false;
  }

  canAct(user, workflowCase) {
    if (!user || workflowCase.currentStatus === 'COMPLETED') return false;
    if (user.role === 'ADMIN') return true;
    if (user.role === 'EXECUTIVE') return false;
    if (user.role === 'BRANCH') return workflowCase.assignedRole === 'BRANCH' && this.canRead(user, workflowCase);
    if (user.role === 'REGIONAL_MANAGER') return workflowCase.assignedRole === 'REGIONAL_MANAGER' && this.canRead(user, workflowCase);
    return workflowCase.assignedRole === user.role;
  }

  actionsFor(user, workflowCase) {
    if (!this.canAct(user, workflowCase)) return [];
    if (user.role === 'BRANCH') return ['BRANCH_RESUBMIT', 'COMMENT', 'ATTACH_DOCUMENT'];
    if (user.role === 'ACCOUNTING') return ['ACCOUNTING_APPROVE', 'ACCOUNTING_RETURN', 'ACCOUNTING_REJECT', 'REQUEST_MORE_DOCUMENT', 'ASSIGN'];
    if (user.role === 'AUDIT') return ['AUDIT_APPROVE', 'AUDIT_LOCK', 'AUDIT_UNLOCK', 'MANAGER_ESCALATE', 'REJECT'];
    if (user.role === 'REGIONAL_MANAGER') return ['MANAGER_APPROVE', 'REJECT', 'ASSIGN'];
    if (user.role === 'ADMIN') return ['ACCOUNTING_APPROVE', 'ACCOUNTING_RETURN', 'AUDIT_APPROVE', 'MANAGER_ESCALATE', 'COMPLETE', 'REJECT', 'ASSIGN'];
    return [];
  }
}

export const workflowPermissionService = new WorkflowPermissionService();
