export class CaseCommentService {
  addComment(caseItem, { commentType = 'Public', text = '', createdBy = '', createdRole = '' } = {}) {
    const comment = {
      commentId: `case-comment-${Date.now()}-${Math.random().toString(16).slice(2)}`,
      commentType,
      text,
      createdBy,
      createdRole,
      createdAt: new Date().toISOString()
    };
    return {
      ...caseItem,
      comments: [comment, ...(caseItem.comments || [])],
      updatedAt: new Date().toISOString()
    };
  }
}

export const caseCommentService = new CaseCommentService();
