export class MobileDashboard {
  build({ records = [], workflowCases = [], user = null }) {
    const scoped = user?.role === 'BRANCH' ? records.filter((record) => record.branch === user.branch) : records;
    return {
      today: scoped.filter((record) => String(record.createdAt || record.date).slice(0, 10) === new Date().toISOString().slice(0, 10)).length,
      pending: scoped.filter((record) => ['PENDING_ACCOUNTING', 'HIGH_RISK', 'NEED_RETAKE'].includes(record.status)).length,
      rejected: scoped.filter((record) => record.status === 'REJECTED').length,
      returned: scoped.filter((record) => record.status === 'RETURNED').length,
      completed: scoped.filter((record) => ['APPROVED', 'CLOSED'].includes(record.status)).length,
      highRisk: scoped.filter((record) => Number(record.riskScore || 0) >= 70).length,
      workflowPending: workflowCases.filter((item) => !['COMPLETED', 'REJECTED'].includes(item.currentStatus)).length
    };
  }
}

export const mobileDashboard = new MobileDashboard();
