export class PipelineProvider {
  get name() {
    return 'PipelineProvider';
  }

  async processDocument() {
    throw new Error('PipelineProvider.processDocument must be implemented');
  }
}
