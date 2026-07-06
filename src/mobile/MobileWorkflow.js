export class MobileWorkflow {
  listTasks(workflowCases = [], user = null) {
    if (!user) return [];
    if (user.role === 'BRANCH') return workflowCases.filter((item) => item.assignedBranch === user.branch || item.branchName === user.branch);
    if (user.role === 'REGIONAL_MANAGER') return workflowCases.filter((item) => String(item.branchName || '').includes(user.region || user.branch || ''));
    return workflowCases;
  }
}

export const mobileWorkflow = new MobileWorkflow();
