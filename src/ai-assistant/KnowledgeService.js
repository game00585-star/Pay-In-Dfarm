import { businessRuleInterpreter } from './BusinessRuleInterpreter.js';
import { contextRetriever } from './ContextRetriever.js';
import { conversationService } from './ConversationService.js';
import { decisionSupportService } from './DecisionSupportService.js';
import { promptBuilder } from './PromptBuilder.js';
import { queryEngine } from './QueryEngine.js';
import { responseFormatter } from './ResponseFormatter.js';

export class KnowledgeService {
  ask({ question = '', records = [], auditLogs = [], user = {}, filters = {} } = {}) {
    const startedAt = performance.now();
    const prompt = promptBuilder.build({ question, user, filters });
    const context = contextRetriever.retrieve({ records, auditLogs, user, filters });
    const rawResult = queryEngine.run(question, context, prompt);
    const verified = businessRuleInterpreter.enforceVerifiedResponse(rawResult);
    const response = responseFormatter.format(verified);
    const processingTime = Math.round(performance.now() - startedAt);
    const session = {
      sessionId: `KS-${Date.now()}-${Math.random().toString(16).slice(2)}`,
      userId: user.email || user.name || 'system',
      role: user.role || '',
      branchCode: user.branch || '',
      question,
      generatedAnswer: responseFormatter.toText(response),
      confidence: response.confidence,
      sourceReference: response.sourceReference,
      processingTime,
      createdAt: new Date().toISOString(),
      decisionSupport: decisionSupportService.summarize(response)
    };
    conversationService.saveSession(session);
    return { ...response, session, prompt };
  }

  suggestedQuestions(role = '') {
    const common = [
      'วันนี้มีสาขาไหนยังไม่ส่งเอกสาร',
      'สาขาไหนมียอดต่างเกิน 500 บาท',
      'แสดง Case ที่ยังไม่ปิด',
      'ยอด Pay-in วันนี้เท่าไร',
      'AI Accuracy เดือนนี้'
    ];
    const byRole = {
      BRANCH: ['สาขาของฉันยังขาดเอกสารอะไร', 'ยอด Pay-in วันนี้เท่าไร'],
      ACCOUNTING: ['สาขาไหนมียอดต่างเกิน 500 บาท', 'แสดง Case ที่ยังไม่ปิด'],
      AUDIT: ['Audit Finding ที่ยังไม่แก้ไข', 'สาขาไหนมี Manual Override มากที่สุด'],
      EXECUTIVE: ['AI Accuracy เดือนนี้', 'สรุป Risk Trend', 'สาขาไหนมีความเสี่ยงสูง']
    };
    return [...(byRole[role] || []), ...common].slice(0, 8);
  }
}

export const knowledgeService = new KnowledgeService();
