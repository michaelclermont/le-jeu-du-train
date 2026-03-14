const STORAGE_KEY_PREFIX = 'feedbackLastRead_';
const STORAGE_KEY_ADMIN_PREFIX = 'feedbackAdminLastRead_';

export function getFeedbackLastRead(userId: number): number {
  if (typeof localStorage === 'undefined') return 0;
  const raw = localStorage.getItem(STORAGE_KEY_PREFIX + userId);
  if (raw == null) return 0;
  const n = Number(raw);
  return Number.isFinite(n) ? n : 0;
}

export function setFeedbackLastRead(userId: number, timestamp: number): void {
  if (typeof localStorage === 'undefined') return;
  localStorage.setItem(STORAGE_KEY_PREFIX + userId, String(timestamp));
}

export function getFeedbackAdminLastRead(adminUserId: number): number {
  if (typeof localStorage === 'undefined') return 0;
  const raw = localStorage.getItem(STORAGE_KEY_ADMIN_PREFIX + adminUserId);
  if (raw == null) return 0;
  const n = Number(raw);
  return Number.isFinite(n) ? n : 0;
}

export function setFeedbackAdminLastRead(adminUserId: number, timestamp: number): void {
  if (typeof localStorage === 'undefined') return;
  localStorage.setItem(STORAGE_KEY_ADMIN_PREFIX + adminUserId, String(timestamp));
}
