function decimal(value) {
  if (value === undefined || value === null || value === '') return 0;
  const cleaned = String(value).replace(/,/g, '').replace(/[^\d.-]/g, '');
  return Number(Number(cleaned || 0).toFixed(2));
}

function isoDate(value) {
  if (!value) return '';
  const text = String(value).trim();
  const match = text.match(/(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})/);
  if (match) {
    const [, day, month, yearValue] = match;
    let year = Number(yearValue.length === 2 ? `20${yearValue}` : yearValue);
    if (year > 2400) year -= 543;
    return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  }
  const parsed = new Date(text);
  return Number.isNaN(parsed.getTime()) ? '' : parsed.toISOString().slice(0, 10);
}

function time(value) {
  if (!value) return '';
  const match = String(value).match(/(\d{1,2}):(\d{2})(?::(\d{2}))?/);
  if (!match) return '';
  return `${String(match[1]).padStart(2, '0')}:${match[2]}:${match[3] || '00'}`;
}

function clean(value) {
  return String(value || '').trim();
}

function cleanReference(value) {
  return String(value || '').replace(/[^A-Za-z0-9]/g, '').trim();
}

export class PayInNormalizer {
  normalize(fields = {}) {
    return {
      payInType: clean(fields.payInType),
      bankName: clean(fields.bankName || fields.bank),
      branchName: clean(fields.branchName || fields.bankBranch),
      transactionDate: isoDate(fields.transactionDate || fields.date),
      transactionTime: time(fields.transactionTime || fields.time),
      depositAmount: decimal(fields.depositAmount || fields.payinCashAmount || fields.amount),
      feeAmount: decimal(fields.feeAmount || fields.fee),
      referenceNo: cleanReference(fields.referenceNo || fields.reference || fields.refNo),
      slipNo: cleanReference(fields.slipNo || fields.receiptNo),
      terminalId: cleanReference(fields.terminalId),
      machineId: cleanReference(fields.machineId || fields.atmId),
      accountName: clean(fields.accountName),
      accountNumberMasked: clean(fields.accountNumberMasked || fields.accountNo),
      confidence: Number(fields.confidence || 0)
    };
  }
}

export const payInNormalizer = new PayInNormalizer();
