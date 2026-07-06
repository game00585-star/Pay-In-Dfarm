export class BusinessRuleInterpreter {
  enforceVerifiedResponse(result = {}) {
    const sourceCount = result.sourceReference?.length || 0;
    if (!sourceCount) {
      return {
        ...result,
        summary: 'ไม่พบข้อมูลจริงในระบบที่รองรับคำตอบนี้',
        detail: [],
        confidence: 'LOW',
        recommendation: 'แนะนำให้เปิดเอกสารต้นฉบับหรือปรับตัวกรองเพื่อค้นหาใหม่'
      };
    }
    return {
      ...result,
      confidence: sourceCount >= 5 ? 'HIGH' : sourceCount >= 2 ? 'MEDIUM' : 'LOW',
      recommendation: sourceCount < 2 ? 'ควรเปิดเอกสารต้นฉบับเพื่อตรวจทานเพิ่มเติม' : result.recommendation || ''
    };
  }

  canAccess(user = {}, item = {}) {
    if (!user) return false;
    if (user.role === 'BRANCH') return [item.branch, item.branchName, item.branchCode].includes(user.branch);
    if (user.role === 'REGIONAL_MANAGER') return String(item.region || item.branch || item.branchName || '').includes(user.region || user.branch || '');
    return ['ADMIN', 'ACCOUNTING', 'AUDIT', 'EXECUTIVE'].includes(user.role);
  }
}

export const businessRuleInterpreter = new BusinessRuleInterpreter();
