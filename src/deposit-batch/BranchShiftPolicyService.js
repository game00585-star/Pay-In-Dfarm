export const defaultBranchShiftPolicies = [
  {
    branchCode: '00074',
    morningStartTime: '03:00:00',
    morningEndTime: '12:00:00',
    afternoonStartTime: '12:00:00',
    afternoonEndTime: '21:00:00',
    effectiveFrom: '2026-01-01',
    effectiveTo: '',
    isActive: true
  },
  {
    branchCode: '00082',
    morningStartTime: '03:00:00',
    morningEndTime: '12:00:00',
    afternoonStartTime: '12:00:00',
    afternoonEndTime: '22:00:00',
    effectiveFrom: '2026-01-01',
    effectiveTo: '',
    isActive: true
  }
];

function timeToMinutes(value = '00:00:00') {
  const [hours = 0, minutes = 0] = String(value).split(':').map(Number);
  return hours * 60 + minutes;
}

export class BranchShiftPolicyService {
  constructor({ policies } = {}) {
    this.policies = policies || this.readPolicies() || defaultBranchShiftPolicies;
  }

  readPolicies() {
    try {
      return JSON.parse(localStorage.getItem('dfarm_v3_auth_branchShiftPolicies')) || null;
    } catch {
      return null;
    }
  }

  getPolicies() {
    return this.readPolicies() || this.policies;
  }

  findPolicy(branchCode, businessDate = new Date().toISOString().slice(0, 10)) {
    const policies = this.getPolicies();
    return policies.find((policy) => (
      policy.isActive
      && policy.branchCode === branchCode
      && (!policy.effectiveFrom || policy.effectiveFrom <= businessDate)
      && (!policy.effectiveTo || policy.effectiveTo >= businessDate)
    )) || policies.find((policy) => policy.isActive && policy.branchCode === branchCode) || policies[0];
  }

  validateShiftTime({ branchCode, businessDate, shift, openTime, closeTime }) {
    const policy = this.findPolicy(branchCode, businessDate);
    if (!policy || !closeTime) return { valid: true, policy, flags: [] };
    const close = timeToMinutes(closeTime);
    const isMorning = String(shift || '').toUpperCase().includes('MORNING') || String(shift || '').includes('เช้า');
    const start = timeToMinutes(isMorning ? policy.morningStartTime : policy.afternoonStartTime);
    const end = timeToMinutes(isMorning ? policy.morningEndTime : policy.afternoonEndTime);
    const valid = close >= start && close <= end;
    return {
      valid,
      policy,
      flags: valid ? [] : ['SHIFT_TIME_OUT_OF_POLICY'],
      detail: { openTime, closeTime, allowedStart: isMorning ? policy.morningStartTime : policy.afternoonStartTime, allowedEnd: isMorning ? policy.morningEndTime : policy.afternoonEndTime }
    };
  }
}

export const branchShiftPolicyService = new BranchShiftPolicyService();
