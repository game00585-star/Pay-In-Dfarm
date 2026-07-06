const STORE_KEY = 'dfarm_label_correction_history';

function readHistory() {
  if (typeof localStorage === 'undefined') return [];
  try {
    return JSON.parse(localStorage.getItem(STORE_KEY) || '[]');
  } catch {
    return [];
  }
}

function writeHistory(items) {
  if (typeof localStorage === 'undefined') return;
  localStorage.setItem(STORE_KEY, JSON.stringify(items));
}

export class LabelHistoryRepository {
  list() {
    return readHistory();
  }

  add(entry) {
    const nextEntry = {
      id: entry.id || `label-history-${Date.now()}-${Math.random().toString(16).slice(2)}`,
      changedAt: entry.changedAt || new Date().toISOString(),
      ...entry
    };
    const nextItems = [nextEntry, ...readHistory()].slice(0, 10000);
    writeHistory(nextItems);
    return nextEntry;
  }
}

export const labelHistoryRepository = new LabelHistoryRepository();
