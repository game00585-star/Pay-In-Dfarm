export class CaseAssignmentService {
  assign(caseItem, { assignedRole = caseItem.assignedRole, assignedUser = caseItem.assignedUser } = {}) {
    return {
      ...caseItem,
      assignedRole,
      assignedUser,
      updatedAt: new Date().toISOString()
    };
  }

  escalate(caseItem, targetRole = 'REGIONAL_MANAGER') {
    return this.assign(caseItem, { assignedRole: targetRole });
  }
}

export const caseAssignmentService = new CaseAssignmentService();
