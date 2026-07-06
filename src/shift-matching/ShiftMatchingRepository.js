const STORAGE_KEY = 'dfarm_shift_payin_matches';

export class ShiftMatchingRepository {
  list() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
    } catch {
      return [];
    }
  }

  save(match) {
    const matches = this.list();
    const next = matches.some((item) => item.matchId === match.matchId)
      ? matches.map((item) => (item.matchId === match.matchId ? match : item))
      : [match, ...matches];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    return match;
  }
}

export const shiftMatchingRepository = new ShiftMatchingRepository();
