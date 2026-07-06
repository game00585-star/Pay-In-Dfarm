export class WorkflowAssignmentService {
  assign(workflowCase, assignment = {}) {
    return {
      ...workflowCase,
      assignedUser: assignment.assignedUser ?? workflowCase.assignedUser,
      assignedRole: assignment.assignedRole ?? workflowCase.assignedRole,
      assignedBranch: assignment.assignedBranch ?? workflowCase.assignedBranch,
      assignedRegion: assignment.assignedRegion ?? workflowCase.assignedRegion,
      updatedAt: new Date().toISOString()
    };
  }

  reassign(workflowCase, target) {
    return this.assign(workflowCase, target);
  }

  transfer(workflowCase, target) {
    return this.assign(workflowCase, target);
  }
}

export const workflowAssignmentService = new WorkflowAssignmentService();
