export class CaseNotificationService {
  constructor({ repository }) {
    this.repository = repository;
  }

  notify(caseItem, message, targetRole = caseItem.assignedRole) {
    return this.repository.saveNotification({
      notificationId: `case-noti-${Date.now()}-${Math.random().toString(16).slice(2)}`,
      caseId: caseItem.caseId,
      targetRole,
      targetUser: caseItem.assignedUser || '',
      channel: 'IN_APP',
      pushReady: true,
      lineReady: true,
      teamsReady: true,
      emailReady: true,
      message,
      status: 'UNREAD',
      createdAt: new Date().toISOString()
    });
  }
}
