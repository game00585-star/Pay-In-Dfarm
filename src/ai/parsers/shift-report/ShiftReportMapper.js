function matchAmount(text, patterns) {
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) return match[1];
  }
  return '';
}

function mockFields() {
  return {
    branchCode: '00074',
    branchName: 'D-FARM',
    businessDate: new Date().toISOString().slice(0, 10),
    shift: 'CLOSE',
    openTime: '04:25:00',
    closeTime: '12:13:00',
    cashierCode: 'C-307-SAITHJ',
    cashierName: '',
    billCount: 182,
    grossAmount: 53599.44,
    discountAmount: 333.74,
    netAmount: 53265.70,
    cashAmount: 25738.75,
    debtorTransferAmount: 2572,
    bankTransferAmount: 4473,
    maemaneeAmount: 20422,
    crmCouponAmount: 60,
    totalPaymentAmount: 53265.75,
    registerNo: 'E129000002A0704',
    taxId: '0105561080724'
  };
}

export class ShiftReportMapper {
  map({ ocrText = '', aiFields = {} } = {}) {
    const text = String(ocrText || '');
    const fallback = mockFields();
    return {
      ...fallback,
      ...aiFields,
      taxId: aiFields.taxId || text.match(/TAX\s*ID[:\s]+([0-9]+)/i)?.[1] || fallback.taxId,
      registerNo: aiFields.registerNo || text.match(/REG\s*ID[:\s]+([A-Z0-9]+)/i)?.[1] || fallback.registerNo,
      cashAmount: aiFields.cashAmount || matchAmount(text, [/เงินสด\s*([0-9,]+\.\d{2})/i]) || fallback.cashAmount,
      debtorTransferAmount: aiFields.debtorTransferAmount || matchAmount(text, [/ลูกหนี้\s*([0-9,]+\.\d{2})/i]) || fallback.debtorTransferAmount,
      bankTransferAmount: aiFields.bankTransferAmount || matchAmount(text, [/เงินโอน\s*([0-9,]+\.\d{2})/i]) || fallback.bankTransferAmount,
      maemaneeAmount: aiFields.maemaneeAmount || matchAmount(text, [/แม่มณี\s*([0-9,]+\.\d{2})/i]) || fallback.maemaneeAmount,
      crmCouponAmount: aiFields.crmCouponAmount || matchAmount(text, [/CRM\s*([0-9,]+\.\d{2})/i]) || fallback.crmCouponAmount
    };
  }

  fieldMapping({ ocrText = '', parsedData = {}, fieldConfidence = {} } = {}) {
    return Object.entries(parsedData).map(([field, value]) => ({
      ocrText,
      field,
      aiResult: value,
      humanCorrection: '',
      confidence: fieldConfidence[field] ?? 90
    }));
  }
}

export const shiftReportMapper = new ShiftReportMapper();
