export class ReleaseService {
  getRelease() {
    return {
      version: '1.0.0',
      name: 'D-FARM Pay-in AI Enterprise Financial Document Intelligence Platform',
      status: 'RELEASE_CANDIDATE',
      releaseDate: new Date().toISOString().slice(0, 10),
      capabilities: [
        '100+ branch operations',
        'Local AI/OCR with Ollama, PaddleOCR, OpenCV',
        'Shift reconciliation',
        'Business exception and risk analytics',
        'Enterprise workflow',
        'Production readiness and operations center'
      ]
    };
  }
}

export const releaseService = new ReleaseService();
