const ANNOUNCEMENT_KEY = 'dfarm_operations_announcements';

function readAnnouncements() {
  try {
    return JSON.parse(localStorage.getItem(ANNOUNCEMENT_KEY)) || [];
  } catch {
    return [];
  }
}

export class AnnouncementService {
  list() {
    return readAnnouncements();
  }

  publish(announcement = {}) {
    const saved = {
      announcementId: `ann-${Date.now()}-${Math.random().toString(16).slice(2)}`,
      type: announcement.type || 'NOTIFICATION',
      title: announcement.title || 'Announcement',
      message: announcement.message || '',
      audience: announcement.audience || 'ALL',
      status: 'PUBLISHED',
      publishedBy: announcement.publishedBy || '',
      publishedAt: new Date().toISOString()
    };
    localStorage.setItem(ANNOUNCEMENT_KEY, JSON.stringify([saved, ...this.list()].slice(0, 1000)));
    return saved;
  }
}

export const announcementService = new AnnouncementService();
