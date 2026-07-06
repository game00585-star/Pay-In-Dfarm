import { masterDataRepository } from './MasterDataRepository.js';

export const DEPOSIT_POLICIES = Object.freeze(['EVERY_SHIFT', 'NEXT_DAY', 'COMBINED_DEPOSIT']);
export const BUSINESS_DATE_POLICIES = Object.freeze(['BUSINESS_DATE', 'CALENDAR_DATE', 'CROSS_DAY', 'NIGHT_SHIFT']);

export class BranchPolicyService {
  constructor({ repository = masterDataRepository } = {}) {
    this.repository = repository;
  }

  list(branchCode = '') {
    const policies = this.repository.list('branchPolicies');
    return branchCode ? policies.filter((policy) => policy.branchCode === branchCode) : policies;
  }

  getActivePolicy(branchCode, date = new Date().toISOString().slice(0, 10)) {
    return this.list(branchCode)
      .filter((policy) => policy.status === 'ACTIVE' && String(policy.effectiveDate || '') <= date)
      .sort((a, b) => String(b.effectiveDate).localeCompare(String(a.effectiveDate)))[0] || null;
  }

  save(policy) {
    return this.repository.save('branchPolicies', {
      policyId: policy.policyId || `POL-${policy.branchCode}-${Date.now()}`,
      branchCode: policy.branchCode || '',
      morningStart: policy.morningStart || '08:00',
      morningEnd: policy.morningEnd || '14:00',
      afternoonStart: policy.afternoonStart || '14:00',
      afternoonEnd: policy.afternoonEnd || '21:00',
      depositPolicy: policy.depositPolicy || 'NEXT_DAY',
      paymentPolicy: policy.paymentPolicy || 'TOTAL_ONLY',
      businessDatePolicy: policy.businessDatePolicy || 'BUSINESS_DATE',
      effectiveDate: policy.effectiveDate || new Date().toISOString().slice(0, 10),
      status: policy.status || 'ACTIVE'
    });
  }
}

export const branchPolicyService = new BranchPolicyService();
