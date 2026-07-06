function decimal(value) {
  if (value === undefined || value === null || value === '') return 0;
  const cleaned = String(value).replace(/,/g, '').replace(/[^\d.-]/g, '');
  return Number(Number(cleaned || 0).toFixed(2));
}

function isoDate(value) {
  if (!value) return '';
  const text = String(value).trim();
  const thaiDate = text.match(/(\d{1,2})[/-](\d{1,2})[/-](\d{4})/);
  if (thaiDate) {
    const [, day, month, year] = thaiDate;
    const normalizedYear = Number(year) > 2400 ? Number(year) - 543 : Number(year);
    return `${normalizedYear}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
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

export class ShiftReportNormalizer {
  normalize(fields = {}) {
    return {
      branchCode: fields.branchCode || '',
      branchName: fields.branchName || '',
      businessDate: isoDate(fields.businessDate || fields.saleDate || fields.documentDate),
      shift: fields.shift || '',
      openTime: time(fields.openTime),
      closeTime: time(fields.closeTime),
      cashierCode: fields.cashierCode || '',
      cashierName: fields.cashierName || '',
      billCount: Number(fields.billCount || 0),
      grossAmount: decimal(fields.grossAmount),
      discountAmount: decimal(fields.discountAmount),
      netAmount: decimal(fields.netAmount),
      cashAmount: decimal(fields.cashAmount),
      debtorTransferAmount: decimal(fields.debtorTransferAmount || fields.debtorAccountTransferAmount),
      bankTransferAmount: decimal(fields.bankTransferAmount || fields.transferAmount),
      maemaneeAmount: decimal(fields.maemaneeAmount || fields.maemaneeTransferAmount),
      crmCouponAmount: decimal(fields.crmCouponAmount || fields.couponAmount),
      totalPaymentAmount: decimal(fields.totalPaymentAmount || fields.totalPaidAmount),
      registerNo: fields.registerNo || '',
      taxId: fields.taxId || ''
    };
  }
}

export const shiftReportNormalizer = new ShiftReportNormalizer();
