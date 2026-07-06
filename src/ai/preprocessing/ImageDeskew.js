import { MockImagePreprocessor } from './ImagePreprocessor.js';

export class ImageDeskew extends MockImagePreprocessor {
  constructor() {
    super({ name: 'ImageDeskew', operation: 'DESKEW_AND_PERSPECTIVE_CORRECTION' });
  }
}
