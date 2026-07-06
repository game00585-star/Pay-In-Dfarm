const RULE_KEY = 'dfarm_launch_business_rules';

const DEFAULT_RULES = [
  { ruleId: 'BR-CASH-PAYIN', name: 'Cash requires Pay-in', category: 'PAYMENT', enabled: true, severity: 'HIGH' },
  { ruleId: 'BR-SHIFT-TOTAL', name: 'Shift total must match', category: 'RECONCILIATION', enabled: true, severity: 'HIGH' },
  { ruleId: 'BR-DUP-REF', name: 'Duplicate reference is high risk', category: 'REFERENCE', enabled: true, severity: 'CRITICAL' }
];

function readRules() {
  try {
    return JSON.parse(localStorage.getItem(RULE_KEY)) || DEFAULT_RULES;
  } catch {
    return DEFAULT_RULES;
  }
}

export class BusinessRuleCenterService {
  list() {
    return readRules();
  }

  save(rule) {
    const saved = {
      ruleId: rule.ruleId || `BR-${Date.now()}`,
      name: rule.name || 'Business Rule',
      category: rule.category || 'GENERAL',
      enabled: rule.enabled !== false,
      severity: rule.severity || 'MEDIUM',
      updatedAt: new Date().toISOString()
    };
    const next = this.list().some((item) => item.ruleId === saved.ruleId)
      ? this.list().map((item) => (item.ruleId === saved.ruleId ? saved : item))
      : [saved, ...this.list()];
    localStorage.setItem(RULE_KEY, JSON.stringify(next));
    return saved;
  }

  disable(ruleId) {
    const rule = this.list().find((item) => item.ruleId === ruleId);
    return rule ? this.save({ ...rule, enabled: false }) : null;
  }
}

export const businessRuleCenterService = new BusinessRuleCenterService();
