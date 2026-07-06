export class ForecastDataService {
  buildForecast(trend = [], metric = 'documentTrend') {
    const values = trend.map((item) => Number(item[metric] || 0));
    if (!values.length) return [];
    const average = Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
    const last = values.at(-1) || average;
    const change = values.length > 1 ? last - values.at(-2) : 0;
    return [1, 2, 3].map((step) => ({
      periodOffset: step,
      metric,
      forecastValue: Math.max(0, Math.round(last + (change * step * 0.6) + (average * 0.4))),
      confidence: Math.max(60, 90 - (step * 8))
    }));
  }
}

export const forecastDataService = new ForecastDataService();
