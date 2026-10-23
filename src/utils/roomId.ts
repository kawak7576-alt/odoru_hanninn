/**
 * Helper to normalize room ID to a strictly 2-digit number string ("01" - "99").
 */
export function normalizeRoomId(rawId: string | number | null | undefined): string {
  if (rawId === null || rawId === undefined) return '01';
  const clean = String(rawId).trim().replace(/\D/g, '');
  if (!clean) return '01';
  const num = parseInt(clean, 10);
  if (isNaN(num) || num <= 0) return '01';
  const clamped = Math.min(Math.max(1, num), 99);
  return clamped.toString().padStart(2, '0');
}

/**
 * Generate a random 2-digit room number ("01" - "99")
 */
export function generateRandomRoomId(): string {
  const num = Math.floor(Math.random() * 99) + 1;
  return num.toString().padStart(2, '0');
}
