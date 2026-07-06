export class PaddleOCRResponseParser {
  parse(rawResponse = {}) {
    const rawBlocks = rawResponse.textBlocks || rawResponse.blocks || rawResponse.result || [];
    const textBlocks = Array.isArray(rawBlocks)
      ? rawBlocks.map((block, index) => ({
        text: block.text || block[1]?.[0] || '',
        confidence: Number(block.confidence ?? block[1]?.[1] ?? 0),
        boundingBox: block.boundingBox || block.box || block[0] || [],
        lineNumber: Number(block.lineNumber || index + 1)
      }))
      : [];
    const rawText = rawResponse.rawText || textBlocks.map((block) => block.text).filter(Boolean).join('\n');
    const confidence = rawResponse.confidence !== undefined
      ? Number(rawResponse.confidence)
      : textBlocks.length
        ? Number((textBlocks.reduce((sum, block) => sum + Number(block.confidence || 0), 0) / textBlocks.length).toFixed(2))
        : 0;

    return {
      success: Boolean(rawResponse.success ?? true),
      rawText,
      textBlocks,
      confidence,
      warnings: rawResponse.warnings || []
    };
  }
}

export const paddleOCRResponseParser = new PaddleOCRResponseParser();
