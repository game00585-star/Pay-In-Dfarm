export class ShiftReportPrompt {
  build({ ocrText = '' } = {}) {
    return [
      'You are a local POS shift report parser.',
      'Return only valid JSON. Do not include markdown.',
      'Document type: POS_SUMMARY.',
      'Extract branchCode, branchName, businessDate, shift, openTime, closeTime, cashierCode, cashierName, billCount, grossAmount, discountAmount, netAmount, cashAmount, debtorTransferAmount, bankTransferAmount, maemaneeAmount, crmCouponAmount, totalPaymentAmount, registerNo, taxId.',
      'Use numbers for amounts. Use ISO date and HH:mm:ss when possible.',
      `OCR text:\n${ocrText}`,
      'JSON schema: {"documentType":"POS_SUMMARY","confidence":0,"fields":{},"fieldConfidence":{},"warnings":[]}'
    ].join('\n');
  }
}

export const shiftReportPrompt = new ShiftReportPrompt();
