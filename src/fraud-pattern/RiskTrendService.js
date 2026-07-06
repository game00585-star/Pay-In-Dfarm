export class RiskTrendService {
  trend(records = [], windows = [7, 30, 90, 180, 365]) {
    return windows.map((days) => {
      const since = new Date();
      since.setDate(since.getDate() - days);
      const scoped = records.filter((record) => new Date(`${record.date || record.createdAt || ''}T00:00:00`) >= since);
      const averageRisk = scoped.length ? Math.round(scoped.reduce((sum, record) => sum + Number(record.riskScore || 0), 0) / scoped.length) : 0;
      return {
        days,
        records: scoped.length,
        averageRisk,
        exceptionCount: scoped.flatMap((record) => record.businessExceptions || []).length
      };
    });
  }
}

export const riskTrendService = new RiskTrendService();
