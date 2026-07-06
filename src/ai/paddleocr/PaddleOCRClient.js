import { DEFAULT_AI_CONFIGURATION, normalizeAIConfiguration } from '../providers/AIConfiguration.js';

export class PaddleOCRClient {
  constructor(configuration = DEFAULT_AI_CONFIGURATION) {
    this.configuration = normalizeAIConfiguration(configuration);
    this.endpoint = this.configuration.paddleOCR.paddleOcrEndpoint || 'http://localhost:8000/ocr';
    this.timeout = Number(this.configuration.paddleOCR.timeout || 120000);
  }

  async requestOCR({ imageBase64, imageFile, language, enableAngleClassification } = {}) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);
    try {
      let body;
      let headers;
      if (imageFile) {
        body = new FormData();
        body.append('image', imageFile);
        body.append('language', language);
        body.append('enableAngleClassification', String(enableAngleClassification));
      } else {
        headers = { 'Content-Type': 'application/json' };
        body = JSON.stringify({
          imageBase64,
          language,
          enableAngleClassification
        });
      }

      const response = await fetch(this.endpoint, {
        method: 'POST',
        signal: controller.signal,
        headers,
        body
      });
      clearTimeout(timeoutId);
      if (!response.ok) throw new Error(`PaddleOCR HTTP ${response.status}`);
      return response.json();
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  }
}
