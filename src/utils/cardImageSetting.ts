import { CardType } from '../types/game';

export const DEFAULT_CARD_IMAGE = '/assets/aistudio/odorugazou_bddf713c.png';
export const DEFAULT_CARD_BACK_IMAGE = '/assets/aistudio/card_back.png';
export const DEFAULT_APP_ICON = '/assets/aistudio/image_451e28c3.png';

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

export function updateFavicon(url: string) {
  try {
    let link = document.querySelector<HTMLLinkElement>("link[rel*='icon']");
    if (!link) {
      link = document.createElement('link');
      link.rel = 'icon';
      document.head.appendChild(link);
    }
    link.href = url;

    // Apple touch icon
    let appleLink = document.querySelector<HTMLLinkElement>("link[rel='apple-touch-icon']");
    if (!appleLink) {
      appleLink = document.createElement('link');
      appleLink.rel = 'apple-touch-icon';
      document.head.appendChild(appleLink);
    }
    appleLink.href = url;

    // For social sharing (OGP and Twitter Cards), absolute URL is required
    const absoluteUrl = url.startsWith('http')
      ? url
      : `${window.location.origin}${url.startsWith('/') ? '' : '/'}${url}`;

    // og:image
    let ogImage = document.querySelector<HTMLMetaElement>("meta[property='og:image']");
    if (!ogImage) {
      ogImage = document.createElement('meta');
      ogImage.setAttribute('property', 'og:image');
      document.head.appendChild(ogImage);
    }
    ogImage.content = absoluteUrl;

    let ogImageSecure = document.querySelector<HTMLMetaElement>("meta[property='og:image:secure_url']");
    if (ogImageSecure) {
      ogImageSecure.content = absoluteUrl;
    }

    // twitter:image
    let twitterImage = document.querySelector<HTMLMetaElement>("meta[name='twitter:image']");
    if (!twitterImage) {
      twitterImage = document.createElement('meta');
      twitterImage.setAttribute('name', 'twitter:image');
      document.head.appendChild(twitterImage);
    }
    twitterImage.content = absoluteUrl;
  } catch {
    // ignore
  }
}

export function getStoredAppIcon(): string {
  try {
    const saved = localStorage.getItem('odoru_app_icon');
    if (saved && saved.trim()) return saved;
  } catch {
    // fallback
  }
  return DEFAULT_APP_ICON;
}

export function setStoredAppIcon(url: string) {
  try {
    localStorage.setItem('odoru_app_icon', url);
    updateFavicon(url);
    window.dispatchEvent(new Event('odoru_card_image_updated'));
  } catch {
    // ignore
  }
}

export function resetAppIconToDefault() {
  setStoredAppIcon(DEFAULT_APP_ICON);
}

