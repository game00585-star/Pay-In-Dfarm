import { MockImagePreprocessor } from './ImagePreprocessor.js';

export class ImageRotate extends MockImagePreprocessor {
  constructor() {
    super({ name: 'ImageRotate', operation: 'AUTO_ROTATE' });
  }
}
