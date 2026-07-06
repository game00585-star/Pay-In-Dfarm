export class CaseAttachmentService {
  addAttachment(caseItem, attachment = {}) {
    const saved = {
      attachmentId: `case-att-${Date.now()}-${Math.random().toString(16).slice(2)}`,
      filename: attachment.filename || 'attachment',
      fileType: attachment.fileType || 'Image',
      fileSize: Number(attachment.fileSize || 0),
      uploadedBy: attachment.uploadedBy || '',
      uploadedAt: new Date().toISOString(),
      action: attachment.action || 'UPLOAD'
    };
    return {
      ...caseItem,
      attachments: [saved, ...(caseItem.attachments || [])],
      updatedAt: new Date().toISOString()
    };
  }
}

export const caseAttachmentService = new CaseAttachmentService();
