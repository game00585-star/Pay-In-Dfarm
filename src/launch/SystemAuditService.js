export class SystemAuditService {
  summarize(auditLogs = []) {
    const configurationChange = auditLogs.filter((log) => String(log.action || '').includes('CONFIGURATION'));
    const permissionChange = auditLogs.filter((log) => String(log.action || '').includes('PERMISSION') || String(log.action || '').includes('USER'));
    const workflowChange = auditLogs.filter((log) => String(log.action || '').includes('WORKFLOW'));
    const businessRuleChange = auditLogs.filter((log) => String(log.action || '').includes('BUSINESS_RULE'));
    const aiProviderChange = auditLogs.filter((log) => String(log.action || '').includes('AI') || String(log.action || '').includes('PROVIDER'));
    return {
      configurationChange,
      permissionChange,
      workflowChange,
      businessRuleChange,
      aiProviderChange,
      totalEvents: auditLogs.length
    };
  }
}

export const systemAuditService = new SystemAuditService();
