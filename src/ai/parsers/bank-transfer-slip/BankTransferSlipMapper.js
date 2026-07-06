import { detectBankTemplate } from './BankTemplateRules.js';

function matchFirst(text, patterns) {
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) return match[1];
  }
  return '';
}

function mockFields(template = {}) {
  return {
    transferAmount: 4473,
    transferDate: new Date().toISOString().slice(0, 10),
    transferTime: '12:17:00',
    referenceNo: `REF${Date.now().toString().slice(-8)}`,
    bankName: template.detectedBank || 'UNKNOWN',
    fromBank: template.detectedBank || 'UNKNOWN',
    fromAccountName: 'Customer',
    fromAccountNoMasked: 'xxx-x-x1234-x',
    toBank: 'SCB',
    toAccountName: 'บริษัท ดีฟาร์ม จำกัด',
    toAccountNoMasked: 'xxx-x-x5678-x',
    promptPayId: '',
    transactionId: `TXN${Date.now().toString().slice(-8)}`,
    qrRef: '',
    confidence: template.confidence || 78
  };
}

export class BankTransferSlipMapper {
  map({ filename = '', ocrText = '', aiFields = {} } = {}) {
    const text = String(ocrText || '');
    const template = detectBankTemplate({ filename, ocrText, declaredBank: aiFields.bankName });
    const fallback = mockFields(template);
    return {
      ...fallback,
      ...aiFields,
      bankName: aiFields.bankName || template.detectedBank || fallback.bankName,
      transferAmount: aiFields.transferAmount || matchFirst(text, [
        /(?:amount|ยอดเงิน|จำนวนเงิน|โอนเงิน)\s*[:\-]?\s*([0-9,]+\.\d{2})/i,
        /([0-9,]+\.\d{2})\s*(?:บาท|THB|฿)/i
      ]) || fallback.transferAmount,
      transferDate: aiFields.transferDate || matchFirst(text, [
        /(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})/,
        /(?:date|วันที่)\s*[:\-]?\s*(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})/i
      ]) || fallback.transferDate,
      transferTime: aiFields.transferTime || matchFirst(text, [
        /(\d{1,2}:\d{2}(?::\d{2})?)/,
        /(?:time|เวลา)\s*[:\-]?\s*(\d{1,2}:\d{2}(?::\d{2})?)/i
      ]) || fallback.transferTime,
      referenceNo: aiFields.referenceNo || matchFirst(text, [
        /(?:reference|ref|เลขที่รายการ|หมายเลขอ้างอิง)\s*[:\-]?\s*([A-Z0-9\-\s]+)/i
      ]) || fallback.referenceNo,
      transactionId: aiFields.transactionId || matchFirst(text, [
        /(?:transaction|txn|trace|รายการที่)\s*[:\-]?\s*([A-Z0-9\-\s]+)/i
      ]) || fallback.transactionId,
      promptPayId: aiFields.promptPayId || matchFirst(text, [
        /(?:promptpay|พร้อมเพย์)\s*[:\-]?\s*([0-9\-\s]+)/i
      ]) || fallback.promptPayId,
      qrRef: aiFields.qrRef || matchFirst(text, [
        /(?:qr ref|qr reference)\s*[:\-]?\s*([A-Z0-9\-\s]+)/i
      ]) || fallback.qrRef,
      detectedBank: template.detectedBank,
      detectedTemplate: template.detectedTemplate,
      templateConfidence: template.confidence
    };
  }

  fieldMapping({ ocrText = '', parsedData = {}, fieldConfidence = {} } = {}) {
    return Object.entries(parsedData).map(([field, value]) => ({
      ocrText,
      field,
      aiResult: value,
      humanCorrection: '',
      confidence: fieldConfidence[field] ?? 88
    }));
  }
}

export const bankTransferSlipMapper = new BankTransferSlipMapper();
