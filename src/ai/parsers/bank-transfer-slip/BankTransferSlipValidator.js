function sameDate(left, right) {
  return Boolean(left && right && left === right);
}

function isCompanyAccount(name = '', companyAccounts = []) {
  if (!name) return true;
  if (!companyAccounts.length) return true;
  const normalized = String(name).toLowerCase().replace(/\s+/g, '');
  return companyAccounts.some((account) => normalized.includes(String(account).toLowerCase().replace(/\s+/g, '')));
}

export class BankTransferSlipValidator {
  validate(parsedData = {}, context = {}) {
    const flags = [];
    const warnings = [];
    if (!Number(parsedData.transferAmount || 0)) flags.push('TRANSFER_AMOUNT_MISSING');
    if (!parsedData.transferDate) flags.push('TRANSFER_DATE_MISSING');
    if (!parsedData.referenceNo && !parsedData.transactionId) flags.push('REFERENCE_OR_TRANSACTION_MISSING');
    if (parsedData.referenceNo && (context.existingReferences || []).includes(parsedData.referenceNo)) flags.push('DUPLICATE_REFERENCE_NO');
    if (!isCompanyAccount(parsedData.toAccountName, context.companyAccounts || ['D-FARM', 'บริษัท ดีฟาร์ม'])) flags.push('WRONG_DESTINATION_ACCOUNT');
    if (context.businessDate && parsedData.transferDate && !sameDate(parsedData.transferDate, context.businessDate)) flags.push('DATE_MISMATCH');
    if (context.bankTransferAmount !== undefined && context.bankTransferAmount !== null && context.bankTransferAmount !== '') {
      const expected = Number(Number(context.bankTransferAmount || 0).toFixed(2));
      const actual = Number(Number(parsedData.transferAmount || 0).toFixed(2));
      if (Math.abs(expected - actual) > 1) flags.push('BANK_TRANSFER_MISMATCH');
    }
    if (flags.includes('DUPLICATE_REFERENCE_NO')) warnings.push('Reference number already exists in current dataset.');
    return {
      valid: flags.length === 0,
      flags,
      warnings,
      status: flags.length ? 'FAIL' : 'PASS'
    };
  }
}

export const bankTransferSlipValidator = new BankTransferSlipValidator();
