function qualityFromFile(file = {}) {
  const size = Number(file.size || file.fileSize || 0);
  const name = String(file.name || file.filename || '').toLowerCase();
  const isPdf = name.endsWith('.pdf') || file.type === 'application/pdf';
  return {
    imageQualityScore: isPdf ? 90 : size > 8 * 1024 * 1024 ? 62 : 88,
    blurDetected: false,
    lowLightDetected: false,
    autoCropReady: !isPdf,
    autoRotateReady: !isPdf,
    duplicateCheckReady: true,
    shouldCompress: size > 2 * 1024 * 1024,
    warnings: size > 10 * 1024 * 1024 ? ['FILE_TOO_LARGE'] : []
  };
}

export class MobileUpload {
  prepareFiles(files = []) {
    return Array.from(files).map((file) => ({
      mobileFileId: `mob-file-${Date.now()}-${Math.random().toString(16).slice(2)}`,
      filename: file.name,
      fileSize: file.size,
      mimeType: file.type,
      source: 'CAMERA_OR_GALLERY',
      previewUrl: URL.createObjectURL(file),
      uploadStatus: 'READY',
      quality: qualityFromFile(file),
      createdAt: new Date().toISOString()
    }));
  }
}

export const mobileUpload = new MobileUpload();
