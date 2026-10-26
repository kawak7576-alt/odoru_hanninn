import { CardType } from '../types/game';

export const DEFAULT_CARD_IMAGE = '/assets/aistudio/odorugazou_bddf713c.png';
export const DEFAULT_CARD_BACK_IMAGE = '/assets/aistudio/card_back.png';

export const CARD_SPRITE_GRID: Record<CardType, { col: number; row: number }> = {
  first_discoverer: { col: 0, row: 0 },
  culprit: { col: 1, row: 0 },
  detective: { col: 2, row: 0 },
  alibi: { col: 3, row: 0 },
  trade: { col: 0, row: 1 },
  rumor: { col: 1, row: 1 },
  info_manipulation: { col: 2, row: 1 },
  witness: { col: 3, row: 1 },
  civilian: { col: 0, row: 2 },
  conspiracy: { col: 1, row: 2 },
  dog: { col: 2, row: 2 },
  boy: { col: 3, row: 2 },
};

export function getStoredCardImage(): string {
  try {
    const saved = localStorage.getItem('odoru_card_image');
    if (saved && saved.trim()) return saved;
  } catch {
    // fallback
  }
  return DEFAULT_CARD_IMAGE;
}

export function isCardImageEnabled(): boolean {
  try {
    const saved = localStorage.getItem('odoru_card_image_enabled');
    if (saved !== null) return saved === 'true';
  } catch {
    // fallback
  }
  return true; // Enabled by default
}

export function setStoredCardImage(url: string) {
  try {
    localStorage.setItem('odoru_card_image', url);
    window.dispatchEvent(new Event('odoru_card_image_updated'));
  } catch {
    // ignore
  }
}

export function setCardImageEnabled(enabled: boolean) {
  try {
    localStorage.setItem('odoru_card_image_enabled', enabled ? 'true' : 'false');
    window.dispatchEvent(new Event('odoru_card_image_updated'));
  } catch {
    // ignore
  }
}

export function resetCardImageToDefault() {
  setStoredCardImage(DEFAULT_CARD_IMAGE);
  setCardImageEnabled(true);
}

export function getStoredCardBackImage(): string {
  try {
    const saved = localStorage.getItem('odoru_card_back_image');
    if (saved && saved.trim()) return saved;
  } catch {
    // fallback
  }
  return DEFAULT_CARD_BACK_IMAGE;
}

export function setStoredCardBackImage(url: string) {
  try {
    localStorage.setItem('odoru_card_back_image', url);
    window.dispatchEvent(new Event('odoru_card_image_updated'));
  } catch {
    // ignore
  }
}

export function resetCardBackImageToDefault() {
  setStoredCardBackImage(DEFAULT_CARD_BACK_IMAGE);
}
