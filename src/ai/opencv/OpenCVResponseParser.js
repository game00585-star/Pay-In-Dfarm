export class OpenCVResponseParser {
  parseQuality(rawResponse = {}) {
    return {
      success: Boolean(rawResponse.success ?? true),
      qualityScore: Number(rawResponse.qualityScore ?? rawResponse.score ?? 0),
      blurScore: Number(rawResponse.blurScore ?? 0),
      brightnessScore: Number(rawResponse.brightnessScore ?? 0),
      contrastScore: Number(rawResponse.contrastScore ?? 0),
      resolutionScore: Number(rawResponse.resolutionScore ?? 0),
      rotationWarning: Boolean(rawResponse.rotationWarning),
      cropWarning: Boolean(rawResponse.cropWarning),
      isTooDark: Boolean(rawResponse.isTooDark),
      isTooBright: Boolean(rawResponse.isTooBright),
      isBlurry: Boolean(rawResponse.isBlurry),
      isLowResolution: Boolean(rawResponse.isLowResolution),
      isLikelyCropped: Boolean(rawResponse.isLikelyCropped),
      warnings: rawResponse.warnings || [],
      status: rawResponse.status || 'PASS'
    };
  }

  parsePreprocess(rawResponse = {}) {
    return {
      success: Boolean(rawResponse.success ?? true),
      originalImage: rawResponse.originalImage || null,
      processedImage: rawResponse.processedImage || rawResponse.originalImage || null,
      preprocessingLog: rawResponse.preprocessingLog || [],
      confidence: Number(rawResponse.confidence ?? 0),
      warnings: rawResponse.warnings || []
    };
  }
}

export const openCVResponseParser = new OpenCVResponseParser();
