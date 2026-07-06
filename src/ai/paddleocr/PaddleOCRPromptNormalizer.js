export class PaddleOCRPromptNormalizer {
  normalizeInput(image) {
    if (!image) return { imageBase64: '', imageFile: null };
    if (typeof image === 'string') {
      return {
        imageBase64: image.replace(/^data:[^;]+;base64,/, ''),
        imageFile: null
      };
    }
    return {
      imageBase64: image.previewUrl?.replace(/^data:[^;]+;base64,/, '') || image.imageUrl?.replace(/^data:[^;]+;base64,/, '') || '',
      imageFile: image.storageFile || image.file || null
    };
  }
}

export const paddleOCRPromptNormalizer = new PaddleOCRPromptNormalizer();
