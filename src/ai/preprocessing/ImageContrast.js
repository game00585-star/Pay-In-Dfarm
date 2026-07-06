import { MockImagePreprocessor } from './ImagePreprocessor.js';

export class ImageContrast extends MockImagePreprocessor {
  constructor() {
    super({ name: 'ImageContrast', operation: 'AUTO_CONTRAST' });
  }
}
