const CASES_KEY = 'dfarm_cases';
const CASE_NOTIFICATIONS_KEY = 'dfarm_case_notifications';

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

export class CaseRepository {
  listCases() {
    return read(CASES_KEY);
  }

  saveCase(caseItem) {
    const next = this.listCases().some((item) => item.caseId === caseItem.caseId)
      ? this.listCases().map((item) => (item.caseId === caseItem.caseId ? caseItem : item))
      : [caseItem, ...this.listCases()];
    write(CASES_KEY, next);
    return caseItem;
  }

  listNotifications() {
    return read(CASE_NOTIFICATIONS_KEY);
  }

  saveNotification(notification) {
    write(CASE_NOTIFICATIONS_KEY, [notification, ...this.listNotifications()].slice(0, 10000));
    return notification;
  }
}

export const caseRepository = new CaseRepository();
