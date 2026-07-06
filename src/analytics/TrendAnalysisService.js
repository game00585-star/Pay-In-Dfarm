function dateKey(value) {
  return String(value || new Date().toISOString()).slice(0, 10);
}

function weekKey(date) {
  const current = new Date(date);
  const first = new Date(current.getFullYear(), 0, 1);
  const week = Math.ceil((((current - first) / 86400000) + first.getDay() + 1) / 7);
  return `${current.getFullYear()}-W${String(week).padStart(2, '0')}`;
}

function monthKey(value) {
  return dateKey(value).slice(0, 7);
}

function quarterKey(value) {
  const date = new Date(value || new Date());
  return `${date.getFullYear()}-Q${Math.floor(date.getMonth() / 3) + 1}`;
}

function yearKey(value) {
  return dateKey(value).slice(0, 4);
}

export class TrendAnalysisService {
  build(records = [], period = 'Daily') {
    const keyFn = {
      Daily: dateKey,
      Weekly: (value) => weekKey(value || new Date()),
      Monthly: monthKey,
      Quarterly: quarterKey,
      Yearly: yearKey
    }[period] || dateKey;
    const grouped = records.reduce((acc, record) => {
      const key = keyFn(record.businessDate || record.date || record.createdAt);
      acc[key] = acc[key] || [];
      acc[key].push(record);
      return acc;
    }, {});
    return Object.entries(grouped).sort(([a], [b]) => a.localeCompare(b)).map(([bucket, bucketRecords]) => ({
      bucket,
      documentTrend: bucketRecords.reduce((sum, record) => sum + (record.documents?.length || 0), 0),
      riskTrend: bucketRecords.reduce((sum, record) => sum + Number(record.riskScore || 0), 0),
      differenceTrend: bucketRecords.reduce((sum, record) => sum + Math.abs(Number(record.difference || record.shiftReconciliation?.difference || 0)), 0),
      aiAccuracyTrend: this.averageConfidence(bucketRecords),
      ocrAccuracyTrend: this.ocrRate(bucketRecords),
      workflowTrend: bucketRecords.filter((record) => ['APPROVED', 'CLOSED'].includes(record.status)).length
    }));
  }

  averageConfidence(records = []) {
    const values = records.flatMap((record) => record.documents || []).map((doc) => Number(doc.parsedData?.confidence || doc.classificationResult?.confidence || 0)).filter(Boolean);
    return values.length ? Math.round(values.reduce((sum, value) => sum + value, 0) / values.length) : 0;
  }

  ocrRate(records = []) {
    const docs = records.flatMap((record) => record.documents || []);
    if (!docs.length) return 0;
    return Math.round((docs.filter((doc) => doc.rawText || doc.ocrResult || doc.parsedData).length / docs.length) * 100);
  }
}

export const trendAnalysisService = new TrendAnalysisService();
