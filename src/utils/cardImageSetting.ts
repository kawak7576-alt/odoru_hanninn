import { CardType } from '../types/game';

export const DEFAULT_CARD_IMAGE = '/assets/aistudio/odorugazou_bddf713c.png';
export const DEFAULT_CARD_BACK_IMAGE = '/assets/aistudio/card_back.png';
export const DEFAULT_APP_ICON = '/assets/aistudio/image_451e28c3.png';

export interface CustomImagesConfig {
  frontImage: string;
  backImage: string;
  appIcon: string;
  isEnabled: boolean;
}

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

/**
 * Resizes and compresses an image via HTMLCanvas to prevent mobile browser localStorage QuotaExceededError.
 * Keeps output under 300KB while maintaining crisp, high-DPI quality.
 */
export async function compressAndResizeImage(
  file: File,
  maxDimension: number = 1600,
  quality: number = 0.85
): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('ファイル読み込みに失敗しました'));
    reader.onload = (e) => {
      const img = new Image();
      img.onerror = () => reject(new Error('画像の読み込みに失敗しました'));
      img.onload = () => {
        let width = img.naturalWidth || img.width;
        let height = img.naturalHeight || img.height;

        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(e.target?.result as string);
          return;
        }

        // High quality smoothing
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, width, height);

        // Prefer webp, fallback to jpeg or png
        try {
          const webpData = canvas.toDataURL('image/webp', quality);
          if (webpData.startsWith('data:image/webp')) {
            resolve(webpData);
            return;
          }
        } catch {
          // fallback
        }

        try {
          const isJpeg = file.type === 'image/jpeg' || file.type === 'image/jpg';
          const format = isJpeg ? 'image/jpeg' : 'image/png';
          resolve(canvas.toDataURL(format, quality));
        } catch {
          resolve(e.target?.result as string);
        }
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  });
}

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

export function setStoredCardImage(url: string, syncToServer = true) {
  try {
    localStorage.setItem('odoru_card_image', url);
  } catch (err) {
    console.warn('localStorage setItem failed (odoru_card_image):', err);
  }
  window.dispatchEvent(new Event('odoru_card_image_updated'));
  if (syncToServer) {
    syncCustomImagesToServer({ frontImage: url });
  }
}

export function setCardImageEnabled(enabled: boolean, syncToServer = true) {
  try {
    localStorage.setItem('odoru_card_image_enabled', enabled ? 'true' : 'false');
  } catch (err) {
    console.warn('localStorage setItem failed (odoru_card_image_enabled):', err);
  }
  window.dispatchEvent(new Event('odoru_card_image_updated'));
  if (syncToServer) {
    syncCustomImagesToServer({ isEnabled: enabled });
  }
}

export function resetCardImageToDefault() {
  setStoredCardImage(DEFAULT_CARD_IMAGE, true);
  setCardImageEnabled(true, true);
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

export function setStoredCardBackImage(url: string, syncToServer = true) {
  try {
    localStorage.setItem('odoru_card_back_image', url);
  } catch (err) {
    console.warn('localStorage setItem failed (odoru_card_back_image):', err);
  }
  window.dispatchEvent(new Event('odoru_card_image_updated'));
  if (syncToServer) {
    syncCustomImagesToServer({ backImage: url });
  }
}

export function resetCardBackImageToDefault() {
  setStoredCardBackImage(DEFAULT_CARD_BACK_IMAGE, true);
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

export function setStoredAppIcon(url: string, syncToServer = true) {
  try {
    localStorage.setItem('odoru_app_icon', url);
  } catch (err) {
    console.warn('localStorage setItem failed (odoru_app_icon):', err);
  }
  updateFavicon(url);
  window.dispatchEvent(new Event('odoru_card_image_updated'));
  if (syncToServer) {
    syncCustomImagesToServer({ appIcon: url });
  }
}

export function resetAppIconToDefault() {
  setStoredAppIcon(DEFAULT_APP_ICON, true);
}

/**
 * Sends updated custom images to server so all mobile devices & other players receive them
 */
export async function syncCustomImagesToServer(changes: Partial<CustomImagesConfig>) {
  try {
    await fetch('/api/custom-images', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(changes),
    });
  } catch (err) {
    console.warn('Failed to sync custom images to server:', err);
  }
}

/**
 * Applies custom images received from remote server
 */
export function applyRemoteCustomImages(images: Partial<CustomImagesConfig>) {
  let changed = false;

  if (images.frontImage) {
    try {
      localStorage.setItem('odoru_card_image', images.frontImage);
      changed = true;
    } catch {
      // ignore
    }
  }

  if (images.backImage) {
    try {
      localStorage.setItem('odoru_card_back_image', images.backImage);
      changed = true;
    } catch {
      // ignore
    }
  }

  if (images.appIcon) {
    try {
      localStorage.setItem('odoru_app_icon', images.appIcon);
      updateFavicon(images.appIcon);
      changed = true;
    } catch {
      // ignore
    }
  }

  if (typeof images.isEnabled === 'boolean') {
    try {
      localStorage.setItem('odoru_card_image_enabled', images.isEnabled ? 'true' : 'false');
      changed = true;
    } catch {
      // ignore
    }
  }

  if (changed) {
    window.dispatchEvent(new Event('odoru_card_image_updated'));
  }
}

/**
 * Fetches latest custom images from server on startup (vital for smartphones joining via URL)
 */
export async function fetchRemoteCustomImages(): Promise<void> {
  try {
    const res = await fetch('/api/custom-images');
    if (!res.ok) return;
    const data: CustomImagesConfig = await res.json();
    if (data) {
      applyRemoteCustomImages(data);

      // If client has custom images locally that differ from server default, push local to server
      const localFront = localStorage.getItem('odoru_card_image');
      const localBack = localStorage.getItem('odoru_card_back_image');
      const localIcon = localStorage.getItem('odoru_app_icon');
      
      const shouldPushLocal =
        (localFront && localFront !== DEFAULT_CARD_IMAGE && data.frontImage === DEFAULT_CARD_IMAGE) ||
        (localBack && localBack !== DEFAULT_CARD_BACK_IMAGE && data.backImage === DEFAULT_CARD_BACK_IMAGE) ||
        (localIcon && localIcon !== DEFAULT_APP_ICON && data.appIcon === DEFAULT_APP_ICON);

      if (shouldPushLocal) {
        syncCustomImagesToServer({
          frontImage: localFront || data.frontImage,
          backImage: localBack || data.backImage,
          appIcon: localIcon || data.appIcon,
          isEnabled: isCardImageEnabled(),
        });
      }
    }
  } catch (err) {
    console.warn('Failed to fetch remote custom images:', err);
  }
}
