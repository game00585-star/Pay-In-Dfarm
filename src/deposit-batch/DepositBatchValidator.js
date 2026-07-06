export class DepositBatchValidator {
  validate(batch, context = {}) {
    const flags = [];
    if (Math.abs(Number(batch.difference || 0)) > 0) flags.push('CASH_DEPOSIT_BATCH_MISMATCH');
    const references = (batch.payInDocuments || []).map((document) => document.referenceNo || document.parsedData?.referenceNo || '').filter(Boolean);
    if (new Set(references).size !== references.length) flags.push('PAYIN_REFERENCE_DUPLICATE');
    if ((context.existingReferences || []).some((reference) => references.includes(reference))) flags.push('PAYIN_REFERENCE_DUPLICATE');
    if ((batch.payInDocuments || []).some((document) => document.riskFlags?.includes('WRONG_BANK_ACCOUNT') || document.validationResult?.flags?.includes('WRONG_BANK_ACCOUNT'))) flags.push('WRONG_BANK_ACCOUNT');
    if ((batch.payInDocuments || []).some((document) => document.riskFlags?.includes('DEPOSIT_DATE_MISMATCH') || document.validationResult?.flags?.includes('DEPOSIT_DATE_MISMATCH'))) flags.push('DEPOSIT_DATE_MISMATCH');
    if ((batch.payInDocuments || []).some((document) => document.riskFlags?.includes('PAYIN_AMOUNT_MISMATCH') || document.validationResult?.flags?.includes('PAYIN_AMOUNT_MISMATCH'))) flags.push('PAYIN_AMOUNT_MISMATCH');
    if ((batch.includedShifts || []).some((shift) => shift.riskFlags?.includes('SHIFT_TIME_OUT_OF_POLICY'))) flags.push('SHIFT_TIME_OUT_OF_POLICY');
    const riskScore = Math.min(100, flags.reduce((sum, flag) => sum + (flag.includes('MISMATCH') ? 35 : flag.includes('DUPLICATE') ? 50 : 25), 0));
    return {
      valid: flags.length === 0,
      status: flags.length ? 'FAIL' : 'PASS',
      riskScore,
      riskFlags: [...new Set(flags)]
    };
  }
}

export const depositBatchValidator = new DepositBatchValidator();
