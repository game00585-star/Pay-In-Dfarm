export class DecisionSupportService {
  summarize(response = {}) {
    const confidence = response.confidence || 'LOW';
    return {
      trend: response.summary || '',
      risk: (response.sourceReference || []).filter((item) => String(item.sourceType || '').includes('Risk')).length,
      pendingCase: (response.detail || []).filter((item) => String(item).toLowerCase().includes('open') || String(item).includes('ยังไม่')).length,
      confidence,
      nextAction: confidence === 'LOW' ? 'เปิดเอกสารต้นฉบับเพื่อตรวจสอบ' : 'ใช้ข้อมูลอ้างอิงประกอบการตัดสินใจ'
    };
  }
}

export const decisionSupportService = new DecisionSupportService();
