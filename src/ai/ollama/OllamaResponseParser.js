function extractJsonText(value = '') {
  const text = String(value || '').trim();
  const fencedMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fencedMatch) return fencedMatch[1].trim();
  const firstBrace = text.indexOf('{');
  const lastBrace = text.lastIndexOf('}');
  if (firstBrace >= 0 && lastBrace > firstBrace) return text.slice(firstBrace, lastBrace + 1);
  return text;
}

export class OllamaResponseParser {
  parse(rawResponse, fallbackDocumentType = 'UNKNOWN') {
    const responseText = rawResponse?.response || rawResponse?.message?.content || rawResponse?.text || '';
    try {
      const parsed = JSON.parse(extractJsonText(responseText));
      return {
        documentType: parsed.documentType || fallbackDocumentType,
        confidence: Number(parsed.confidence || 0),
        fields: parsed.fields || {},
        warnings: parsed.warnings || []
      };
    } catch (error) {
      return {
        documentType: fallbackDocumentType,
        confidence: 0,
        fields: {},
        warnings: ['OLLAMA_RESPONSE_PARSE_FAILED', error.message],
        rawText: responseText
      };
    }
  }
}

export const ollamaResponseParser = new OllamaResponseParser();
