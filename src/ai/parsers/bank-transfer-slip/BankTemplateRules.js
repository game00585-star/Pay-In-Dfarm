export const BANK_TEMPLATE_RULES = Object.freeze([
  {
    bankCode: 'KBANK',
    bankName: 'KBank',
    templates: ['K PLUS'],
    keywords: ['k plus', 'kbank', 'kasikorn', 'กสิกร']
  },
  {
    bankCode: 'SCB',
    bankName: 'SCB',
    templates: ['SCB Easy'],
    keywords: ['scb easy', 'scb', 'ไทยพาณิชย์']
  },
  {
    bankCode: 'KTB',
    bankName: 'Krungthai',
    templates: ['Krungthai NEXT'],
    keywords: ['krungthai next', 'krungthai', 'ktb', 'กรุงไทย']
  },
  {
    bankCode: 'BBL',
    bankName: 'Bangkok Bank',
    templates: ['BBL Mobile Banking'],
    keywords: ['bangkok bank', 'bbl', 'กรุงเทพ']
  },
  {
    bankCode: 'BAY',
    bankName: 'Krungsri',
    templates: ['Krungsri Mobile'],
    keywords: ['krungsri', 'bay', 'กรุงศรี']
  },
  {
    bankCode: 'GSB',
    bankName: 'Government Savings Bank',
    templates: ['GSB Mobile Banking'],
    keywords: ['gsb', 'government savings', 'ออมสิน']
  },
  {
    bankCode: 'PROMPTPAY',
    bankName: 'PromptPay',
    templates: ['PromptPay Slip'],
    keywords: ['promptpay', 'พร้อมเพย์', 'qr ref', 'qr']
  }
]);

export function detectBankTemplate({ filename = '', ocrText = '', declaredBank = '' } = {}) {
  const haystack = `${filename} ${ocrText} ${declaredBank}`.toLowerCase();
  const matched = BANK_TEMPLATE_RULES.find((rule) => rule.keywords.some((keyword) => haystack.includes(keyword.toLowerCase())));
  if (!matched) {
    return {
      detectedBank: 'UNKNOWN',
      detectedTemplate: 'Unknown Bank Slip',
      confidence: 45,
      matchedKeywords: []
    };
  }
  const matchedKeywords = matched.keywords.filter((keyword) => haystack.includes(keyword.toLowerCase()));
  return {
    detectedBank: matched.bankCode,
    detectedTemplate: matched.templates[0],
    confidence: Math.min(98, 80 + matchedKeywords.length * 6),
    matchedKeywords
  };
}

export function normalizeBankCode(value = '') {
  const text = String(value || '').trim().toLowerCase();
  const matched = BANK_TEMPLATE_RULES.find((rule) => (
    rule.bankCode.toLowerCase() === text
    || rule.bankName.toLowerCase() === text
    || rule.keywords.some((keyword) => text.includes(keyword.toLowerCase()))
  ));
  return matched?.bankCode || (text ? text.toUpperCase() : '');
}
