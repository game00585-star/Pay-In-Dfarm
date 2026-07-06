export class ResponseFormatter {
  format(result = {}) {
    return {
      summary: result.summary || '',
      detail: result.detail || [],
      sourceReference: result.sourceReference || [],
      confidence: result.confidence || 'LOW',
      recommendation: result.recommendation || ''
    };
  }

  toText(response = {}) {
    return [
      `Summary: ${response.summary}`,
      ...(response.detail || []).map((item) => `- ${item}`),
      response.recommendation ? `Recommendation: ${response.recommendation}` : ''
    ].filter(Boolean).join('\n');
  }
}

export const responseFormatter = new ResponseFormatter();
