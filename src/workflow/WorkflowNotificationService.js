export class WorkflowNotificationService {
  createNotification({ caseId, targetRole, targetUser = '', message, channel = 'IN_APP' }) {
    return {
      notificationId: `wfn-${Date.now()}-${Math.random().toString(16).slice(2)}`,
      caseId,
      targetRole,
      targetUser,
      channel,
      message,
      status: 'UNREAD',
      createdAt: new Date().toISOString()
    };
  }

  forTransition(before, after, action) {
    if (!after?.assignedRole) return [];
    return [
      this.createNotification({
        caseId: after.caseId,
        targetRole: after.assignedRole,
        targetUser: after.assignedUser,
        message: `Workflow ${after.caseId} moved by ${action} from ${before?.currentStep || '-'} to ${after.currentStep}`
      })
    ];
  }
}

export const workflowNotificationService = new WorkflowNotificationService();
