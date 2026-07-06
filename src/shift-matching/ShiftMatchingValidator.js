import { BranchShiftPolicyService } from '../deposit-batch/BranchShiftPolicyService.js';

function uniqueReferences(payInDocuments = []) {
  const references = payInDocuments.map((document) => document.referenceNo || document.parsedData?.referenceNo || '').filter(Boolean);
  return new Set(references).size === references.length;
}

export class ShiftMatchingValidator {
  constructor({ shiftPolicyService = new BranchShiftPolicyService() } = {}) {
    this.shiftPolicyService = shiftPolicyService;
  }

  validate(match, context = {}) {
    const flags = [];
    if (!match.payInDocumentIds?.length) flags.push('MISSING_SHIFT_PAYIN');
    if (Math.abs(Number(match.difference || 0)) > 0) flags.push('SHIFT_PAYIN_AMOUNT_MISMATCH');
    if (!uniqueReferences(match.payInDocuments || [])) flags.push('DUPLICATE_REFERENCE');
    const references = (match.payInDocuments || []).map((document) => document.referenceNo || document.parsedData?.referenceNo || '').filter(Boolean);
    if ((context.existingReferences || []).some((reference) => references.includes(reference))) flags.push('DUPLICATE_REFERENCE');
    if ((match.payInDocuments || []).some((document) => {
      const transactionDate = document.transactionDate || document.parsedData?.transactionDate;
      return transactionDate && transactionDate !== match.businessDate && !document.manualMatch;
    })) flags.push('PAYIN_DATE_MISMATCH');
    const policyResult = this.shiftPolicyService.validateShiftTime({
      branchCode: match.branchCode,
      businessDate: match.businessDate,
      shift: match.shift,
      closeTime: context.closeTime || match.closeTime
    });
    flags.push(...(policyResult.flags || []));
    const status = flags.length ? (flags.includes('MISSING_SHIFT_PAYIN') || flags.includes('SHIFT_PAYIN_AMOUNT_MISMATCH') ? 'FAIL' : 'WARN') : 'PASS';
    return {
      valid: flags.length === 0,
      status,
      riskFlags: [...new Set(flags)],
      policy: policyResult.policy,
      policyDetail: policyResult.detail
    };
  }
}

export const shiftMatchingValidator = new ShiftMatchingValidator();
