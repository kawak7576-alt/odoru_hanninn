import { CardType } from '../types/game';

export const DEFAULT_CARD_IMAGE = '/assets/aistudio/odorugazou_bddf713c.png';
export const DEFAULT_CARD_BACK_IMAGE = '/assets/aistudio/card_back.png';
export const DEFAULT_APP_ICON = '/assets/aistudio/image_451e28c3.png';

export interface CustomImagesConfig {
  frontImage: string;
  backImage: string;
  appIcon: string;
  isEnabled: boolean;
  updatedAt: number;
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

// In-memory fallback cache so component re-renders and uploads never drop custom images
let memoryCardImage: string | null = null;
let memoryCardBackImage: string | null = null;
let memoryAppIcon: string | null = null;
let memoryCardImageEnabled: boolean | null = null;

/**
 * Resizes and compresses an image via HTMLCanvas to prevent mobile browser localStorage QuotaExceededError.
 * Uses WebP or high-quality JPEG to keep output under 300KB while maintaining crisp, high-DPI quality.
 */
export async function compressAndResizeImage(
  file: File,
  maxDimension: number = 1400,
  quality: number = 0.88
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

        // 1. Prefer webp
        try {
          const webpData = canvas.toDataURL('image/webp', quality);
          if (webpData.startsWith('data:image/webp')) {
            resolve(webpData);
            return;
          }
        } catch {
          // ignore
        }

        // 2. High-quality JPEG fallback (universally supported, compresses 12-card sheet to ~250KB)
        try {
          const jpegData = canvas.toDataURL('image/jpeg', quality);
          if (jpegData.startsWith('data:image/jpeg')) {
            resolve(jpegData);
            return;
          }
        } catch {
          // ignore
        }

        // 3. Fallback to canvas png or raw reader
        try {
          resolve(canvas.toDataURL('image/png'));
        } catch {
          resolve(e.target?.result as string);
        }
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  });
}

/**
 * Uploads an image file to the backend server and stores the resulting short static file URL.
 * Automatically updates client state, local storage, and broadcasts to other players/devices.
 */
export async function uploadCustomImage(
  file: File,
  type: 'front' | 'back' | 'icon'
): Promise<string> {
  const maxDim = type === 'front' ? 1400 : type === 'back' ? 1200 : 800;
  const quality = type === 'icon' ? 0.9 : 0.88;
  const dataUrl = await compressAndResizeImage(file, maxDim, quality);

  // 1. Attempt upload to server to get permanent short URL path
  try {
    const res = await fetch('/api/upload-image', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ imageType: type, dataUrl }),
    });
    if (res.ok) {
      const data = await res.json();
      if (data.url) {
        const finalUrl = data.url;
        if (type === 'front') {
          setStoredCardImage(finalUrl, false);
          setCardImageEnabled(true, false);
        } else if (type === 'back') {
          setStoredCardBackImage(finalUrl, false);
        } else {
          setStoredAppIcon(finalUrl, false);
        }
        return finalUrl;
      }
    }
  } catch (err) {
    console.warn('Upload to /api/upload-image failed, falling back to local storage and sync:', err);
  }

  // 2. Fallback to client storage + sync
  if (type === 'front') {
    setStoredCardImage(dataUrl, true);
    setCardImageEnabled(true, true);
  } else if (type === 'back') {
    setStoredCardBackImage(dataUrl, true);
  } else {
    setStoredAppIcon(dataUrl, true);
  }
  return dataUrl;
}

export function getStoredCardImage(): string {
  if (memoryCardImage && memoryCardImage.trim()) return memoryCardImage;
  try {
    const saved = localStorage.getItem('odoru_card_image');
    if (saved && saved.trim()) {
      memoryCardImage = saved;
      return saved;
    }
  } catch {
    // fallback
  }
  return DEFAULT_CARD_IMAGE;
}

export function isCardImageEnabled(): boolean {
  if (memoryCardImageEnabled !== null) return memoryCardImageEnabled;
  try {
    const saved = localStorage.getItem('odoru_card_image_enabled');
    if (saved !== null) {
      const val = saved === 'true';
      memoryCardImageEnabled = val;
      return val;
    }
  } catch {
    // fallback
  }
  return true; // Enabled by default
}

export function setStoredCardImage(url: string, syncToServer = true) {
  memoryCardImage = url;
  const now = Date.now();
  try {
    localStorage.setItem('odoru_card_image', url);
  } catch (err) {
    console.warn('localStorage setItem failed (odoru_card_image):', err);
  }
  try {
    localStorage.setItem('odoru_custom_images_updated_at', now.toString());
  } catch {}
  window.dispatchEvent(new Event('odoru_card_image_updated'));
  if (syncToServer) {
    syncCustomImagesToServer({ frontImage: url, updatedAt: now });
  }
}

export function setCardImageEnabled(enabled: boolean, syncToServer = true) {
  memoryCardImageEnabled = enabled;
  const now = Date.now();
  try {
    localStorage.setItem('odoru_card_image_enabled', enabled ? 'true' : 'false');
  } catch (err) {
    console.warn('localStorage setItem failed (odoru_card_image_enabled):', err);
  }
  try {
    localStorage.setItem('odoru_custom_images_updated_at', now.toString());
  } catch {}
  window.dispatchEvent(new Event('odoru_card_image_updated'));
  if (syncToServer) {
    syncCustomImagesToServer({ isEnabled: enabled, updatedAt: now });
  }
}

export function resetCardImageToDefault() {
  const now = Date.now();
  memoryCardImage = DEFAULT_CARD_IMAGE;
  memoryCardImageEnabled = true;
  setStoredCardImage(DEFAULT_CARD_IMAGE, false);
  setCardImageEnabled(true, false);
  try {
    localStorage.setItem('odoru_custom_images_updated_at', now.toString());
  } catch {}
  syncCustomImagesToServer({ frontImage: DEFAULT_CARD_IMAGE, isEnabled: true, updatedAt: now });
}

export function getStoredCardBackImage(): string {
  if (memoryCardBackImage && memoryCardBackImage.trim()) return memoryCardBackImage;
  try {
    const saved = localStorage.getItem('odoru_card_back_image');
    if (saved && saved.trim()) {
      memoryCardBackImage = saved;
      return saved;
    }
  } catch {
    // fallback
  }
  return DEFAULT_CARD_BACK_IMAGE;
}

export function setStoredCardBackImage(url: string, syncToServer = true) {
  memoryCardBackImage = url;
  const now = Date.now();
  try {
    localStorage.setItem('odoru_card_back_image', url);
  } catch (err) {
    console.warn('localStorage setItem failed (odoru_card_back_image):', err);
  }
  try {
    localStorage.setItem('odoru_custom_images_updated_at', now.toString());
  } catch {}
  window.dispatchEvent(new Event('odoru_card_image_updated'));
  if (syncToServer) {
    syncCustomImagesToServer({ backImage: url, updatedAt: now });
  }
}

export function resetCardBackImageToDefault() {
  const now = Date.now();
  memoryCardBackImage = DEFAULT_CARD_BACK_IMAGE;
  setStoredCardBackImage(DEFAULT_CARD_BACK_IMAGE, false);
  try {
    localStorage.setItem('odoru_custom_images_updated_at', now.toString());
  } catch {}
  syncCustomImagesToServer({ backImage: DEFAULT_CARD_BACK_IMAGE, updatedAt: now });
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
  if (memoryAppIcon && memoryAppIcon.trim()) return memoryAppIcon;
  try {
    const saved = localStorage.getItem('odoru_app_icon');
    if (saved && saved.trim()) {
      memoryAppIcon = saved;
      return saved;
    }
  } catch {
    // fallback
  }
  return DEFAULT_APP_ICON;
}

export function setStoredAppIcon(url: string, syncToServer = true) {
  memoryAppIcon = url;
  const now = Date.now();
  try {
    localStorage.setItem('odoru_app_icon', url);
  } catch (err) {
    console.warn('localStorage setItem failed (odoru_app_icon):', err);
  }
  try {
    localStorage.setItem('odoru_custom_images_updated_at', now.toString());
  } catch {}
  updateFavicon(url);
  window.dispatchEvent(new Event('odoru_card_image_updated'));
  if (syncToServer) {
    syncCustomImagesToServer({ appIcon: url, updatedAt: now });
  }
}

export function resetAppIconToDefault() {
  const now = Date.now();
  memoryAppIcon = DEFAULT_APP_ICON;
  setStoredAppIcon(DEFAULT_APP_ICON, false);
  try {
    localStorage.setItem('odoru_custom_images_updated_at', now.toString());
  } catch {}
  syncCustomImagesToServer({ appIcon: DEFAULT_APP_ICON, updatedAt: now });
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
 * Applies custom images received from remote server, ensuring that a default server
 * never overwrites a user's locally configured custom images.
 */
export function applyRemoteCustomImages(remoteImages: Partial<CustomImagesConfig>) {
  if (!remoteImages) return;

  const localFront = memoryCardImage || localStorage.getItem('odoru_card_image');
  const localBack = memoryCardBackImage || localStorage.getItem('odoru_card_back_image');
  const localIcon = memoryAppIcon || localStorage.getItem('odoru_app_icon');
  const localTimeStr = localStorage.getItem('odoru_custom_images_updated_at');
  const localTime = localTimeStr ? parseInt(localTimeStr, 10) : 0;

  const hasLocalCustom =
    (localFront && localFront !== DEFAULT_CARD_IMAGE) ||
    (localBack && localBack !== DEFAULT_CARD_BACK_IMAGE) ||
    (localIcon && localIcon !== DEFAULT_APP_ICON);

  const remoteTime = remoteImages.updatedAt || 0;

  // PROTECTION: If client has custom images, and server only has default (updatedAt === 0),
  // NEVER overwrite client! Push client custom images to server instead.
  if (hasLocalCustom && remoteTime === 0) {
    syncCustomImagesToServer({
      frontImage: localFront || remoteImages.frontImage,
      backImage: localBack || remoteImages.backImage,
      appIcon: localIcon || remoteImages.appIcon,
      isEnabled: isCardImageEnabled(),
      updatedAt: localTime > 0 ? localTime : Date.now(),
    });
    return;
  }

  // If client has custom images that are newer than server, keep local and sync to server
  if (hasLocalCustom && localTime > remoteTime) {
    syncCustomImagesToServer({
      frontImage: localFront || remoteImages.frontImage,
      backImage: localBack || remoteImages.backImage,
      appIcon: localIcon || remoteImages.appIcon,
      isEnabled: isCardImageEnabled(),
      updatedAt: localTime,
    });
    return;
  }

  // Otherwise, apply remoteImages
  let changed = false;

  if (remoteImages.frontImage) {
    memoryCardImage = remoteImages.frontImage;
    try {
      localStorage.setItem('odoru_card_image', remoteImages.frontImage);
    } catch {
      // ignore
    }
    changed = true;
  }

  if (remoteImages.backImage) {
    memoryCardBackImage = remoteImages.backImage;
    try {
      localStorage.setItem('odoru_card_back_image', remoteImages.backImage);
    } catch {
      // ignore
    }
    changed = true;
  }

  if (remoteImages.appIcon) {
    memoryAppIcon = remoteImages.appIcon;
    try {
      localStorage.setItem('odoru_app_icon', remoteImages.appIcon);
    } catch {
      // ignore
    }
    updateFavicon(remoteImages.appIcon);
    changed = true;
  }

  if (typeof remoteImages.isEnabled === 'boolean') {
    memoryCardImageEnabled = remoteImages.isEnabled;
    try {
      localStorage.setItem('odoru_card_image_enabled', remoteImages.isEnabled ? 'true' : 'false');
    } catch {
      // ignore
    }
    changed = true;
  }

  if (remoteTime > 0) {
    try {
      localStorage.setItem('odoru_custom_images_updated_at', remoteTime.toString());
    } catch {
      // ignore
    }
  }

  if (changed) {
    window.dispatchEvent(new Event('odoru_card_image_updated'));
  }
}

/**
 * Fetches latest custom images from server on startup.
 * Guarantees that local custom images are protected and propagated to server.
 */
export async function fetchRemoteCustomImages(): Promise<void> {
  const localFront = memoryCardImage || localStorage.getItem('odoru_card_image');
  const localBack = memoryCardBackImage || localStorage.getItem('odoru_card_back_image');
  const localIcon = memoryAppIcon || localStorage.getItem('odoru_app_icon');
  const localTimeStr = localStorage.getItem('odoru_custom_images_updated_at');
  const localTime = localTimeStr ? parseInt(localTimeStr, 10) : 0;

  const hasLocalCustom =
    (localFront && localFront !== DEFAULT_CARD_IMAGE) ||
    (localBack && localBack !== DEFAULT_CARD_BACK_IMAGE) ||
    (localIcon && localIcon !== DEFAULT_APP_ICON);

  try {
    const res = await fetch('/api/custom-images');
    if (!res.ok) return;
    const remoteData: CustomImagesConfig = await res.json();
    if (remoteData) {
      const remoteTime = remoteData.updatedAt || 0;

      // If client has custom images and remote is default or older: push local to server!
      if (hasLocalCustom && (remoteTime === 0 || localTime > remoteTime)) {
        const sendTime = localTime > 0 ? localTime : Date.now();
        await syncCustomImagesToServer({
          frontImage: localFront || remoteData.frontImage,
          backImage: localBack || remoteData.backImage,
          appIcon: localIcon || remoteData.appIcon,
          isEnabled: isCardImageEnabled(),
          updatedAt: sendTime,
        });
        return;
      }

      // Otherwise apply remote custom images (e.g. on new smartphone opening link)
      applyRemoteCustomImages(remoteData);
    }
  } catch (err) {
    console.warn('Failed to fetch remote custom images:', err);
  }
}
