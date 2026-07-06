function matchFirst(text, patterns) {
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) return match[1];
  }
  return '';
}

function mockFields(documentType) {
  return {
    payInType: documentType,
    bankName: documentType === 'PAYIN_LOTUS' ? 'Lotus' : documentType === 'PAYIN_COUNTER_SERVICE' ? 'Counter Service' : 'SCB',
    branchName: 'Local Branch',
    transactionDate: new Date().toISOString().slice(0, 10),
    transactionTime: '12:30:00',
    depositAmount: 0,
    feeAmount: 0,
    referenceNo: `PAYIN${Date.now().toString().slice(-8)}`,
    slipNo: `SLIP${Date.now().toString().slice(-8)}`,
    terminalId: '',
    machineId: '',
    accountName: 'บริษัท ดีฟาร์ม จำกัด',
    accountNumberMasked: 'xxx-x-x7890-x',
    confidence: 76
  };
}

export class PayInMapper {
  map({ ocrText = '', aiFields = {}, documentType = 'PAYIN_BANK_COUNTER' } = {}) {
    const text = String(ocrText || '');
    const fallback = mockFields(documentType);
    return {
      ...fallback,
      ...aiFields,
      payInType: aiFields.payInType || documentType,
      depositAmount: aiFields.depositAmount || matchFirst(text, [
        /(?:deposit|amount|ยอดฝาก|จำนวนเงิน|เงินสด)\s*[:\-]?\s*([0-9,]+\.\d{2})/i,
        /([0-9,]+\.\d{2})\s*(?:บาท|THB|฿)/i
      ]) || fallback.depositAmount,
      feeAmount: aiFields.feeAmount || matchFirst(text, [
        /(?:fee|ค่าธรรมเนียม)\s*[:\-]?\s*([0-9,]+\.\d{2})/i
      ]) || fallback.feeAmount,
      transactionDate: aiFields.transactionDate || matchFirst(text, [
        /(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})/
      ]) || fallback.transactionDate,
      transactionTime: aiFields.transactionTime || matchFirst(text, [
        /(\d{1,2}:\d{2}(?::\d{2})?)/
      ]) || fallback.transactionTime,
      referenceNo: aiFields.referenceNo || matchFirst(text, [
        /(?:reference|ref|เลขที่รายการ|หมายเลขอ้างอิง)\s*[:\-]?\s*([A-Z0-9\-\s]+)/i
      ]) || fallback.referenceNo,
      slipNo: aiFields.slipNo || matchFirst(text, [
        /(?:slip|receipt|เลขที่ใบรับฝาก)\s*[:\-]?\s*([A-Z0-9\-\s]+)/i
      ]) || fallback.slipNo,
      terminalId: aiFields.terminalId || matchFirst(text, [
        /(?:terminal|term)\s*[:\-]?\s*([A-Z0-9\-\s]+)/i
      ]) || fallback.terminalId,
      machineId: aiFields.machineId || matchFirst(text, [
        /(?:machine|atm|cdm)\s*[:\-]?\s*([A-Z0-9\-\s]+)/i
      ]) || fallback.machineId
    };
  }

  fieldMapping({ ocrText = '', parsedData = {}, fieldConfidence = {} } = {}) {
    return Object.entries(parsedData).map(([field, value]) => ({
      ocrText,
      field,
      aiResult: value,
      humanCorrection: '',
      confidence: fieldConfidence[field] ?? 86
    }));
  }
}

export const payInMapper = new PayInMapper();
