function accountMatches(parsedData = {}, companyAccounts = []) {
  if (!companyAccounts.length) return true;
  const accountName = String(parsedData.accountName || '').toLowerCase().replace(/\s+/g, '');
  const accountNumber = String(parsedData.accountNumberMasked || '').replace(/\D/g, '');
  return companyAccounts.some((account) => {
    const text = String(account).toLowerCase().replace(/\s+/g, '');
    const digits = String(account).replace(/\D/g, '');
    return (accountName && text && accountName.includes(text)) || (accountNumber && digits && accountNumber.endsWith(digits.slice(-4)));
  });
}

export class PayInValidator {
  validate(parsedData = {}, context = {}) {
    const flags = [];
    if (!Number(parsedData.depositAmount || 0)) flags.push('PAYIN_AMOUNT_MISSING');
    if (context.expectedAmount !== undefined && context.expectedAmount !== '' && Math.abs(Number(parsedData.depositAmount || 0) - Number(context.expectedAmount || 0)) > 1) flags.push('PAYIN_AMOUNT_MISMATCH');
    if (context.depositDate && parsedData.transactionDate && context.depositDate !== parsedData.transactionDate) flags.push('DEPOSIT_DATE_MISMATCH');
    if (parsedData.referenceNo && (context.existingReferences || []).includes(parsedData.referenceNo)) flags.push('PAYIN_REFERENCE_DUPLICATE');
    if (!accountMatches(parsedData, context.companyAccounts || ['D-FARM', 'บริษัท ดีฟาร์ม', '1234567890'])) flags.push('WRONG_BANK_ACCOUNT');
    return {
      valid: flags.length === 0,
      status: flags.length ? 'FAIL' : 'PASS',
      flags
    };
  }
}

export const payInValidator = new PayInValidator();
