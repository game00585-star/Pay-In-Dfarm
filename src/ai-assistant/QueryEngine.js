function thaiLower(text = '') {
  return String(text || '').toLowerCase();
}

function amountFromQuestion(question = '', fallback = 500) {
  const match = String(question).match(/(\d[\d,]*)/);
  return match ? Number(match[1].replaceAll(',', '')) : fallback;
}

function source(record = {}, extra = {}) {
  return {
    sourceType: extra.sourceType || 'Record',
    businessDate: record.businessDate || record.date || extra.businessDate || '',
    branch: record.branchName || record.branch || record.branchCode || extra.branch || '',
    document: extra.document || record.id || record.recordId || '',
    reference: extra.reference || record.referenceNo || record.id || ''
  };
}

function isOpenStatus(status = '') {
  return !['CLOSED', 'RESOLVED', 'COMPLETED', 'APPROVED', 'VERIFIED'].includes(String(status || '').toUpperCase());
}

export class QueryEngine {
  run(question = '', context = {}) {
    const q = thaiLower(question);
    if (q.includes('ยังไม่ส่ง') || q.includes('missing')) return this.missingDocuments(context);
    const explicitAmount = amountFromQuestion(question, null);
    if ((q.includes('ยอด') && q.includes('ต่าง')) || q.includes('difference')) return this.differenceOver(context, amountFromQuestion(question));
    if (explicitAmount !== null && context.records.some((record) => Math.abs(Number(record.difference || record.shiftReconciliation?.difference || 0)) > explicitAmount)) return this.differenceOver(context, explicitAmount);
    if (q.includes('case') && (q.includes('ยังไม่ปิด') || q.includes('open'))) return this.openCases(context);
    if (q.includes('audit finding') || q.includes('finding')) return this.openAuditFindings(context);
    if (q.includes('manual override')) return this.manualOverrideRanking(context);
    if (q.includes('pay-in') || q.includes('payin')) return this.payinTotal(context);
    if (q.includes('ai accuracy') || q.includes('ocr accuracy') || q.includes('accuracy')) return this.accuracy(context);
    if (q.includes('risk') || q.includes('เสี่ยง')) return this.riskSummary(context);
    if (q.includes('trend')) return this.trendSummary(context);
    return this.keywordSearch(question, context);
  }

  missingDocuments(context) {
    const rows = context.records.filter((record) => (record.riskFlags || []).some((flag) => String(flag).startsWith('MISSING')) || record.validationResult?.missingDocuments?.length);
    return {
      summary: `พบรายการที่มีเอกสารขาด ${rows.length} รายการ`,
      detail: rows.slice(0, 20).map((record) => `${record.branch || record.branchCode} ${record.date}: ${(record.riskFlags || []).join(', ') || 'Missing document'}`),
      sourceReference: rows.map((record) => source(record, { sourceType: 'Pay-in Record' }))
    };
  }

  differenceOver(context, threshold) {
    const rows = context.records.filter((record) => Math.abs(Number(record.difference || record.shiftReconciliation?.difference || 0)) > threshold);
    return {
      summary: `พบสาขาที่ยอดต่างเกิน ${threshold.toLocaleString('th-TH')} บาท จำนวน ${rows.length} รายการ`,
      detail: rows.slice(0, 20).map((record) => `${record.branch || record.branchCode} ${record.date}: ${Number(record.difference || record.shiftReconciliation?.difference || 0).toLocaleString('th-TH')} บาท`),
      sourceReference: rows.map((record) => source(record, { sourceType: 'Reconciliation' }))
    };
  }

  openCases(context) {
    const rows = [
      ...context.cases.map((item) => ({ ...item, sourceType: 'Case Management' })),
      ...context.workflowCases.map((item) => ({ ...item, sourceType: 'Workflow' })),
      ...context.compliance.cases.map((item) => ({ ...item, sourceType: 'Compliance' }))
    ].filter((item) => isOpenStatus(item.status || item.currentStatus));
    return {
      summary: `พบ Case ที่ยังไม่ปิด ${rows.length} รายการ`,
      detail: rows.slice(0, 20).map((item) => `${item.sourceType}: ${item.caseId || item.workflowId || item.id} | ${item.status || item.currentStatus}`),
      sourceReference: rows.map((item) => source(item, { sourceType: item.sourceType, document: item.caseId || item.workflowId || item.id }))
    };
  }

  openAuditFindings(context) {
    const rows = context.auditFindings.filter((item) => isOpenStatus(item.status));
    return {
      summary: `พบ Audit Finding ที่ยังไม่แก้ไข ${rows.length} รายการ`,
      detail: rows.slice(0, 20).map((item) => `${item.findingId}: ${item.category} | ${item.severity} | ${item.status}`),
      sourceReference: rows.map((item) => source(item, { sourceType: 'Audit Finding', document: item.findingId }))
    };
  }

  manualOverrideRanking(context) {
    const grouped = context.records.reduce((acc, record) => {
      const count = Number(Boolean(record.manualOverride)) + Number(Boolean(record.accountingOverride)) + Number(Boolean(record.auditOverride)) + (record.documents || []).filter((doc) => doc.humanCorrection || doc.correctionHistory?.length).length;
      const branch = record.branch || record.branchCode || 'UNKNOWN';
      acc[branch] = (acc[branch] || 0) + count;
      return acc;
    }, {});
    const rows = Object.entries(grouped).sort((a, b) => b[1] - a[1]).filter(([, count]) => count > 0);
    return {
      summary: `พบสาขาที่มี Manual Override ${rows.length} สาขา`,
      detail: rows.slice(0, 10).map(([branch, count]) => `${branch}: ${count} ครั้ง`),
      sourceReference: context.records.filter((record) => rows.some(([branch]) => branch === (record.branch || record.branchCode))).map((record) => source(record, { sourceType: 'Manual Override' }))
    };
  }

  payinTotal(context) {
    const total = context.records.reduce((sum, record) => sum + Number(record.branchAmount || record.actualPayInAmount || record.payinAmount || 0), 0);
    return {
      summary: `ยอด Pay-in ตามข้อมูลในระบบรวม ${total.toLocaleString('th-TH')} บาท`,
      detail: context.records.slice(0, 20).map((record) => `${record.branch || record.branchCode} ${record.date}: ${Number(record.branchAmount || record.actualPayInAmount || record.payinAmount || 0).toLocaleString('th-TH')} บาท`),
      sourceReference: context.records.map((record) => source(record, { sourceType: 'Pay-in Record' }))
    };
  }

  accuracy(context) {
    const docs = context.documents;
    const confidences = docs.map((doc) => Number(doc.parsedData?.confidence || doc.classificationResult?.confidence || doc.ocrResult?.confidence || 0)).filter(Boolean);
    const avg = confidences.length ? Math.round(confidences.reduce((sum, value) => sum + value, 0) / confidences.length) : 0;
    return {
      summary: `AI/OCR Accuracy เฉลี่ยจากเอกสารที่มีผลอ่านในระบบคือ ${avg}%`,
      detail: docs.slice(0, 20).map((doc) => `${doc.branch || '-'} ${doc.businessDate || '-'} ${doc.documentType}: ${Number(doc.parsedData?.confidence || doc.classificationResult?.confidence || doc.ocrResult?.confidence || 0)}%`),
      sourceReference: docs.filter((doc) => doc.parsedData || doc.classificationResult || doc.ocrResult).map((doc) => source(doc, { sourceType: 'Document AI/OCR', document: doc.documentType, reference: doc.recordId }))
    };
  }

  riskSummary(context) {
    const highRisk = context.records.filter((record) => Number(record.riskScore || 0) >= 70);
    return {
      summary: `พบรายการ High Risk ${highRisk.length} รายการ จากทั้งหมด ${context.records.length} รายการ`,
      detail: highRisk.slice(0, 20).map((record) => `${record.branch || record.branchCode} ${record.date}: risk ${record.riskScore}`),
      sourceReference: highRisk.map((record) => source(record, { sourceType: 'Risk Score' }))
    };
  }

  trendSummary(context) {
    const byDate = context.records.reduce((acc, record) => {
      const key = String(record.date || record.createdAt || '').slice(0, 10) || 'UNKNOWN';
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});
    const rows = Object.entries(byDate).sort(([a], [b]) => a.localeCompare(b));
    return {
      summary: `พบข้อมูล Trend ${rows.length} ช่วงวัน จากข้อมูลจริงในระบบ`,
      detail: rows.slice(-14).map(([date, count]) => `${date}: ${count} records`),
      sourceReference: context.records.map((record) => source(record, { sourceType: 'Trend Record' }))
    };
  }

  keywordSearch(question, context) {
    const keyword = thaiLower(question).trim();
    const rows = context.records.filter((record) => JSON.stringify(record).toLowerCase().includes(keyword));
    return {
      summary: rows.length ? `พบข้อมูลที่ตรงกับคำค้น ${rows.length} รายการ` : 'ไม่พบข้อมูลในระบบที่ตรงกับคำถามนี้',
      detail: rows.slice(0, 20).map((record) => `${record.branch || record.branchCode} ${record.date} ${record.status || ''}`),
      sourceReference: rows.map((record) => source(record, { sourceType: 'Keyword Search' }))
    };
  }
}

export const queryEngine = new QueryEngine();
