export class MobileNotification {
  list({ workflowNotifications = [], auditLogs = [], user = null } = {}) {
    const workflow = workflowNotifications.filter((item) => item.targetRole === user?.role || item.targetUser === user?.email);
    const audit = auditLogs.slice(0, 10).map((log) => ({
      notificationId: `audit-${log.id}`,
      message: `${log.action} by ${log.actor}`,
      createdAt: log.createdAt,
      status: 'READ'
    }));
    return [...workflow, ...audit].slice(0, 30);
  }
}

export const mobileNotification = new MobileNotification();
