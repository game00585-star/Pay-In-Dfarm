const MAX_FILE_SIZE = 10 * 1024 * 1024;
const IMAGE_COMPRESS_THRESHOLD = 2 * 1024 * 1024;
const SUPPORTED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'];
const MOCK_STORAGE_PREFIX = 'dfarm_mock_storage:';

function readAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function loadImage(dataUrl) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = dataUrl;
  });
}

async function compressImage(file) {
  const sourceUrl = await readAsDataUrl(file);
  const image = await loadImage(sourceUrl);
  const maxSide = 1600;
  const scale = Math.min(1, maxSide / Math.max(image.width, image.height));
  const width = Math.max(1, Math.round(image.width * scale));
  const height = Math.max(1, Math.round(image.height * scale));
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');
  context.drawImage(image, 0, 0, width, height);
  const mimeType = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
  const quality = mimeType === 'image/png' ? undefined : 0.78;
  const dataUrl = canvas.toDataURL(mimeType, quality);
  const response = await fetch(dataUrl);
  const blob = await response.blob();
  const compressedFile = new File([blob], file.name, { type: mimeType, lastModified: Date.now() });
  return { file: compressedFile, dataUrl, width, height };
}

async function createImageMetadata(file) {
  const shouldCompress = file.size > IMAGE_COMPRESS_THRESHOLD;
  const imageResult = shouldCompress ? await compressImage(file) : { file, dataUrl: await readAsDataUrl(file) };
  const image = await loadImage(imageResult.dataUrl);
  return {
    storageFile: imageResult.file,
    imageUrl: imageResult.dataUrl,
    thumbnailUrl: imageResult.dataUrl,
    width: imageResult.width || image.width,
    height: imageResult.height || image.height,
    compressed: shouldCompress,
    fileSize: imageResult.file.size,
    mimeType: imageResult.file.type
  };
}

async function createPdfMetadata(file) {
  return {
    storageFile: file,
    imageUrl: await readAsDataUrl(file),
    thumbnailUrl: '',
    width: 0,
    height: 0,
    compressed: false,
    fileSize: file.size,
    mimeType: file.type
  };
}

export class MockStorageService {
  validateFile(file) {
    if (!file) return { valid: false, error: 'ไม่พบไฟล์' };
    if (!SUPPORTED_TYPES.includes(file.type)) {
      return { valid: false, error: 'รองรับเฉพาะ jpg, jpeg, png, pdf' };
    }
    if (file.size > MAX_FILE_SIZE) {
      return { valid: false, error: 'ไฟล์ต้องไม่เกิน 10MB' };
    }
    return { valid: true };
  }

  async prepareDocumentFile({ file, documentType, uploadedBy, note = '' }) {
    const validation = this.validateFile(file);
    if (!validation.valid) {
      return {
        error: validation.error,
        uploadStatus: 'FAILED'
      };
    }

    const now = new Date().toISOString();
    const metadata = file.type === 'application/pdf'
      ? await createPdfMetadata(file)
      : await createImageMetadata(file);
    const id = `doc-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const safeFilename = metadata.storageFile.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const storagePath = `mock-storage/payin-documents/${id}/${safeFilename}`;
    if (typeof localStorage !== 'undefined' && metadata.imageUrl) {
      localStorage.setItem(`${MOCK_STORAGE_PREFIX}${storagePath}`, metadata.imageUrl);
    }

    return {
      id,
      documentType,
      filename: metadata.storageFile.name,
      originalFilename: file.name,
      fileName: metadata.storageFile.name,
      fileSize: metadata.fileSize,
      mimeType: metadata.mimeType,
      contentType: metadata.mimeType,
      width: metadata.width,
      height: metadata.height,
      imageUrl: storagePath,
      thumbnailUrl: metadata.thumbnailUrl ? `${storagePath}#thumbnail` : '',
      previewUrl: metadata.thumbnailUrl,
      url: storagePath,
      storagePath,
      uploadStatus: 'READY',
      uploadedAt: now,
      uploadedBy,
      note,
      rotation: 0,
      compressed: metadata.compressed,
      storageFile: metadata.storageFile
    };
  }
}

export const mockStorageService = new MockStorageService();
