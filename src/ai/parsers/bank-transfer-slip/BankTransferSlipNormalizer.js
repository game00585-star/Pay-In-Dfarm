import { normalizeBankCode } from './BankTemplateRules.js';

function decimal(value) {
  if (value === undefined || value === null || value === '') return 0;
  const cleaned = String(value).replace(/,/g, '').replace(/[^\d.-]/g, '');
  return Number(Number(cleaned || 0).toFixed(2));
}

function isoDate(value) {
  if (!value) return '';
  const text = String(value).trim();
  const dateMatch = text.match(/(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})/);
  if (dateMatch) {
    const [, day, month, yearValue] = dateMatch;
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

function cleanReference(value) {
  return String(value || '').replace(/[^A-Za-z0-9]/g, '').trim();
}

export class BankTransferSlipNormalizer {
  normalize(fields = {}) {
    const bankName = normalizeBankCode(fields.bankName || fields.detectedBank);
    return {
      transferAmount: decimal(fields.transferAmount || fields.amount),
      transferDate: isoDate(fields.transferDate || fields.date || fields.transactionDate),
      transferTime: time(fields.transferTime || fields.time || fields.transactionTime),
      referenceNo: cleanReference(fields.referenceNo || fields.reference || fields.refNo),
      bankName: bankName || 'UNKNOWN',
      fromBank: normalizeBankCode(fields.fromBank),
      fromAccountName: String(fields.fromAccountName || '').trim(),
      fromAccountNoMasked: String(fields.fromAccountNoMasked || fields.fromAccount || '').trim(),
      toBank: normalizeBankCode(fields.toBank),
      toAccountName: String(fields.toAccountName || '').trim(),
      toAccountNoMasked: String(fields.toAccountNoMasked || fields.toAccount || '').trim(),
      promptPayId: cleanReference(fields.promptPayId || fields.promptpayId),
      transactionId: cleanReference(fields.transactionId || fields.transactionNo || fields.traceNo),
      qrRef: cleanReference(fields.qrRef || fields.qrReference),
      confidence: Number(fields.confidence || 0)
    };
  }
}

export const bankTransferSlipNormalizer = new BankTransferSlipNormalizer();
