const SESSION_KEY = 'dfarm_ai_assistant_sessions';
const FAVORITE_KEY = 'dfarm_ai_assistant_favorites';

function read(key, fallback = []) {
  try {
    return JSON.parse(localStorage.getItem(key)) || fallback;
  } catch {
    return fallback;
  }
}

function write(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

export class ConversationService {
  listSessions(user = null) {
    const sessions = read(SESSION_KEY);
    if (!user) return [];
    if (user.role === 'BRANCH') return sessions.filter((item) => item.branchCode === user.branch || item.userId === user.email);
    return sessions.filter((item) => item.userId === user.email || ['ADMIN', 'AUDIT', 'EXECUTIVE'].includes(user.role));
  }

  saveSession(session) {
    const sessions = read(SESSION_KEY);
    write(SESSION_KEY, [session, ...sessions].slice(0, 10000));
    return session;
  }

  listFavorites(user = null) {
    return read(FAVORITE_KEY).filter((item) => !user || item.userId === user.email || item.role === user.role);
  }

  saveFavorite(question, user = {}) {
    const saved = {
      favoriteId: `FAQ-${Date.now()}-${Math.random().toString(16).slice(2)}`,
      question,
      userId: user.email || user.name || 'system',
      role: user.role || 'USER',
      createdAt: new Date().toISOString()
    };
    write(FAVORITE_KEY, [saved, ...read(FAVORITE_KEY)].slice(0, 1000));
    return saved;
  }

  dashboard() {
    const sessions = read(SESSION_KEY);
    const durations = sessions.map((item) => Number(item.processingTime || 0)).filter(Boolean);
    const topQuestions = Object.entries(sessions.reduce((acc, item) => {
      acc[item.question] = (acc[item.question] || 0) + 1;
      return acc;
    }, {})).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([question, count]) => ({ question, count }));
    return {
      aiUsage: sessions.length,
      topQuestions,
      averageResponseTime: durations.length ? Math.round(durations.reduce((sum, value) => sum + value, 0) / durations.length) : 0,
      knowledgeCoverage: sessions.length ? Math.round((sessions.filter((item) => item.sourceReference?.length).length / sessions.length) * 100) : 100
    };
  }
}

export const conversationService = new ConversationService();
