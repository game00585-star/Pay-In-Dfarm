const DEFAULT_CONFIG = Object.freeze({
  reconciliationMode: 'TOTAL_ONLY',
  strictPaymentTypeValidation: false,
  totalFieldSource: 'TOTAL_PAYMENT_AMOUNT'
});

export class ShiftReconciliationValidator {
  constructor({ config = DEFAULT_CONFIG } = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  validate(reconciliation) {
    const riskFlags = [];
    if (!reconciliation.shiftReportId) riskFlags.push('MISSING_SHIFT_REPORT');
    if (Math.abs(Number(reconciliation.difference || 0)) > 0) riskFlags.push('SHIFT_TOTAL_AMOUNT_MISMATCH');
    riskFlags.push(...this.missingDocumentFlags(reconciliation));
    if (this.config.strictPaymentTypeValidation) {
      reconciliation.paymentDetails
        .filter((detail) => Math.abs(Number(detail.difference || 0)) > 0)
        .forEach((detail) => riskFlags.push(`${detail.key}_MISMATCH`));
    }
    const status = riskFlags.includes('SHIFT_TOTAL_AMOUNT_MISMATCH') || riskFlags.includes('MISSING_SHIFT_REPORT') ? 'FAIL' : riskFlags.length ? 'WARN' : 'PASS';
    const riskScore = Math.min(100, riskFlags.reduce((sum, flag) => sum + (flag.startsWith('MISSING') ? 25 : flag.includes('MISMATCH') ? 45 : 20), 0));
    return {
      valid: riskFlags.length === 0,
      status,
      riskScore,
      riskFlags: [...new Set(riskFlags)]
    };
  }

  missingDocumentFlags(reconciliation) {
    const flags = [];
    const detailByKey = Object.fromEntries((reconciliation.paymentDetails || []).map((detail) => [detail.key, detail]));
    if (Number(detailByKey.CASH?.expectedAmount || 0) > 0 && !reconciliation.payInDocuments?.length) flags.push('MISSING_PAYIN');
    if (Number(detailByKey.BANK_TRANSFER?.expectedAmount || 0) > 0 && !reconciliation.bankTransferDocuments?.length) flags.push('MISSING_BANK_TRANSFER');
    if (Number(detailByKey.MAEMANEE?.expectedAmount || 0) > 0 && !reconciliation.maemaneeDocuments?.length) flags.push('MISSING_MAEMANEE');
    if (Number(detailByKey.CRM?.expectedAmount || 0) > 0 && !reconciliation.crmDocuments?.length) flags.push('MISSING_CRM');
    if (Number(detailByKey.DEBTOR_TRANSFER?.expectedAmount || 0) > 0 && !reconciliation.debtorTransferDocuments?.length) flags.push('MISSING_DEBTOR_TRANSFER');
    return flags;
  }
}

export const shiftReconciliationValidator = new ShiftReconciliationValidator();
