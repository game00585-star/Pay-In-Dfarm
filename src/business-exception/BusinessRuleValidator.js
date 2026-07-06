export class BusinessRuleValidator {
  collect(record = {}) {
    const exceptions = [];
    const riskFlags = new Set(record.riskFlags || []);
    (record.shiftReconciliation?.riskFlags || []).forEach((flag) => riskFlags.add(flag));
    (record.shiftPayinMatches || []).flatMap((match) => match.riskFlags || []).forEach((flag) => riskFlags.add(flag));
    (record.documents || []).forEach((document) => {
      (document.riskFlags || []).forEach((flag) => riskFlags.add(flag));
      if (Number(document.classificationResult?.confidence || document.parserResult?.confidence || 100) < 90) riskFlags.add('LOW_CONFIDENCE');
      if (Number(document.classificationResult?.confidence || document.parserResult?.confidence || 100) < 70) riskFlags.add('MANUAL_REVIEW_REQUIRED');
      if (document.ocr?.success === false || document.parserResult?.warnings?.includes('OCR_OFFLINE')) riskFlags.add('OCR_INCOMPLETE');
      if (document.manualMatch) riskFlags.add('MANUAL_OVERRIDE');
    });
    if (record.accountingOverride) riskFlags.add('ACCOUNTING_OVERRIDE');
    if (record.auditOverride) riskFlags.add('AUDIT_OVERRIDE');
    riskFlags.forEach((ruleCode) => exceptions.push({
      ruleCode,
      expectedValue: '',
      actualValue: '',
      difference: record.shiftReconciliation?.difference ?? record.depositBatch?.difference ?? record.difference ?? 0
    }));
    (record.shiftReconciliation?.paymentDetails || []).forEach((detail) => {
      if (Number(detail.difference || 0) <= 0) return;
      const ruleCodeByKey = {
        CASH: 'PAYIN_OVER_AMOUNT',
        BANK_TRANSFER: 'BANK_TRANSFER_OVER_AMOUNT',
        MAEMANEE: 'MAEMANEE_OVER_AMOUNT',
        CRM: 'CRM_OVER_AMOUNT',
        DEBTOR_TRANSFER: 'DEBTOR_TRANSFER_OVER_AMOUNT'
      };
      const ruleCode = ruleCodeByKey[detail.key];
      if (ruleCode) {
        exceptions.push({
          ruleCode,
          expectedValue: detail.expectedAmount,
          actualValue: detail.actualAmount,
          difference: detail.difference
        });
      }
    });
    (record.shiftReconciliation?.paymentDetails || []).forEach((detail) => {
      if (detail.key === 'CASH' && Number(detail.difference || 0) < 0) {
        exceptions.push({
          ruleCode: 'PAYIN_SHORT_AMOUNT',
          expectedValue: detail.expectedAmount,
          actualValue: detail.actualAmount,
          difference: detail.difference
        });
      }
    });
    return exceptions;
  }
}

export const businessRuleValidator = new BusinessRuleValidator();
