import { masterDataRepository } from './MasterDataRepository.js';

export class BusinessRuleService {
  constructor({ repository = masterDataRepository } = {}) {
    this.repository = repository;
  }

  list() {
    return this.repository.list('businessRules');
  }

  save(rule) {
    return this.repository.save('businessRules', {
      ruleId: rule.ruleId || `BR-${Date.now()}`,
      ruleCode: rule.ruleCode || rule.code || `RULE-${Date.now()}`,
      name: rule.name || 'Business Rule',
      category: rule.category || 'GENERAL',
      severity: rule.severity || 'MEDIUM',
      status: rule.status || (rule.enabled === false ? 'INACTIVE' : 'ACTIVE'),
      enabled: rule.enabled !== false
    });
  }

  setEnabled(ruleId, enabled) {
    const rule = this.list().find((item) => item.ruleId === ruleId);
    return rule ? this.save({ ...rule, enabled, status: enabled ? 'ACTIVE' : 'INACTIVE' }) : null;
  }
}

export const businessRuleService = new BusinessRuleService();
