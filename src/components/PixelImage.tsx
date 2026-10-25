/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Ultra-Fast Pixel-Art Image Loader with On-The-Fly WebP CDN Compression (wsrv.nl),
 * Module-Level 0ms In-Memory URL Cache, Async Decoding, Shimmer Skeleton & Vector Fallback
 */

import React, { useState, useEffect } from 'react';

interface PixelImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  filename: string;
  alt: string;
  fallbackText?: string;
  className?: string;
}

const GITHUB_USER = 'sepehrkhakpoor091';
const GITHUB_REPO = 'ie-miniapp';

/**
 * Module-level cache so once an asset resolves, switching tabs reuses the cached URL in 0ms
 * without re-checking fallbacks or re-triggering layout shifts.
 */
export const resolvedUrlCache = new Map<string, string>();

const FILENAME_ALIAS_MAP: Record<string, string> = {
  '06_char_clock.png': '29_icon_calendar.png',
  '08_char_megaphone.png': '34_icon_ann_doc.png',
  '30_icon_scroll.png': '34_icon_ann_doc.png',
  '19_badge_Gear.png': '19_badge_trophy.png',
  '20_badge_chart.png': '20_badge_shield.png',
  '21_badge_code.png': '21_badge_medal.png',
  '22_badge_helmet.png': '22_badge_book.png',
  '23_badge_idea.png': '23_badge_diamond.png',
  '24_badge_trophy.png': '24_badge_crown.png',
  '14_ev_python.png': '14_ev_workshop.png',
  '15_ev_factory.png': '15_ev_visit.png',
  '10_char_guard.png': '08_char_admin.png',
  '11_banner_security.png': '12_banner_admin.png',
};

export function isDirectImageSource(rawName: string): boolean {
  const trimmed = (rawName || '').trim();
  return (
    trimmed.startsWith('data:image/') ||
    trimmed.startsWith('blob:') ||
    trimmed.startsWith('http://') ||
    trimmed.startsWith('https://')
  );
}

export function normalizeAssetFilename(rawName: string): string {
  const trimmed = (rawName || '').trim();
  if (isDirectImageSource(trimmed)) {
    return trimmed;
  }
  const stripped = trimmed.replace(/^\/+/, '').replace(/^assets\//, '');
  return FILENAME_ALIAS_MAP[stripped] || stripped;
}

export function buildCandidateUrls(rawName: string): string[] {
  const cleanName = normalizeAssetFilename(rawName);
  if (isDirectImageSource(cleanName)) {
    return [cleanName];
  }
  const cached = resolvedUrlCache.get(cleanName);
  const urls = [
    // URL 1 (Compressed WebP Root via wsrv.nl global CDN):
    `https://wsrv.nl/?url=raw.githubusercontent.com/${GITHUB_USER}/${GITHUB_REPO}/main/${cleanName}&output=webp&q=88`,
    // URL 2 (Direct jsDelivr Root):
    `https://cdn.jsdelivr.net/gh/sepehrkhakpoor091/ie-miniapp@main/${cleanName}`,
    // URL 3 (Direct Raw Root):
    `https://raw.githubusercontent.com/${GITHUB_USER}/${GITHUB_REPO}/main/${cleanName}`,
    // URL 4 (Subfolder Fallback):
    `https://cdn.jsdelivr.net/gh/sepehrkhakpoor091/ie-miniapp@main/assets/${cleanName}`,
  ];

  if (cached) {
    return [cached, ...urls.filter((u) => u !== cached)];
  }
  return urls;
}

/**
 * Converts an uploaded image file into a compact DataURL.
 * For avatars/medals (maxDimension <= 256), preserves crisp pixel art PNG.
 * For KYC cards & payment receipts (maxDimension = 900), outputs compressed JPEG Base64 (max width 900px).
 */
export function compressImageFileToDataUrl(
  file: File,
  maxDimension = 192,
  outputMimeType?: 'image/jpeg' | 'image/png'
): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('خطا در خواندن فایل تصویر'));
    reader.onload = () => {
      const dataUrl = String(reader.result || '');
      const img = new Image();
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          const ratio = Math.min(
            1,
            maxDimension / Math.max(img.width || 1, img.height || 1)
          );
          canvas.width = Math.max(1, Math.round(img.width * ratio));
          canvas.height = Math.max(1, Math.round(img.height * ratio));
          const ctx = canvas.getContext('2d');
          if (ctx) {
            const useJpeg =
              outputMimeType === 'image/jpeg' ||
              (!outputMimeType && maxDimension >= 400);
            if (useJpeg) {
              ctx.fillStyle = '#FFFFFF';
              ctx.fillRect(0, 0, canvas.width, canvas.height);
              ctx.imageSmoothingEnabled = true;
              ctx.imageSmoothingQuality = 'high';
              ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
              resolve(canvas.toDataURL('image/jpeg', 0.85));
            } else {
              ctx.imageSmoothingEnabled = false;
              ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
              resolve(canvas.toDataURL('image/png'));
            }
            return;
          }
        } catch {
          // Fallback to raw dataUrl
        }
        resolve(dataUrl);
      };
      img.onerror = () => resolve(dataUrl);
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
  });
}

export const PixelImage: React.FC<PixelImageProps> = ({
  filename,
  alt,
  fallbackText,
  className = '',
  style,
  ...rest
}) => {
  const cleanName = normalizeAssetFilename(filename);
  const candidateUrls = buildCandidateUrls(cleanName);

  const [urlIndex, setUrlIndex] = useState<number>(0);
  const [hasFailedAll, setHasFailedAll] = useState<boolean>(false);
  const [isLoaded, setIsLoaded] = useState<boolean>(() => resolvedUrlCache.has(cleanName));

  useEffect(() => {
    setUrlIndex(0);
    setHasFailedAll(false);
    setIsLoaded(resolvedUrlCache.has(cleanName));
  }, [cleanName]);

  const currentSrc = candidateUrls[urlIndex] || candidateUrls[0];

  const handleLoad = () => {
    resolvedUrlCache.set(cleanName, currentSrc);
    setIsLoaded(true);
  };

  const handleError = () => {
    if (urlIndex < candidateUrls.length - 1) {
      setUrlIndex((prev) => prev + 1);
    } else {
      setHasFailedAll(true);
      setIsLoaded(true);
    }
  };

  if (hasFailedAll) {
    return (
      <div
        className={`relative overflow-hidden select-none flex items-center justify-center ${className}`}
        title={alt}
      >
        <PixelArtVectorFallback filename={cleanName} label={fallbackText || alt} />
      </div>
    );
  }

  return (
    <div className={`relative overflow-hidden select-none ${className}`}>
      {!isLoaded && (
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-gradient-to-r from-[#1A2433]/40 via-[#2C3E55]/50 to-[#1A2433]/40 animate-pulse rounded-inherit pointer-events-none"
        />
      )}
      <img
        src={currentSrc}
        alt={alt}
        decoding="async"
        onLoad={handleLoad}
        onError={handleError}
        className={`w-full h-full object-inherit pixelated select-none transition-opacity duration-200 ${
          isLoaded ? 'opacity-100' : 'opacity-0'
        }`}
        style={{
          imageRendering: 'pixelated',
          ...style,
        }}
        {...rest}
      />
    </div>
  );
};

/**
 * Custom 8-Bit SVG Sprite Generator when offline or if all 4 CDN tiers fail
 */
const PixelArtVectorFallback: React.FC<{ filename: string; label: string }> = ({
  filename,
}) => {
  if (filename.includes('09_banner_night')) {
    return (
      <svg viewBox="0 0 320 140" className="w-full h-full object-cover pixelated" preserveAspectRatio="xMidYMid slice">
        <rect width="320" height="140" fill="#101622" />
        <rect x="30" y="18" width="4" height="4" fill="#FCE7A4" />
        <rect x="85" y="12" width="3" height="3" fill="#D4AB58" />
        <rect x="190" y="24" width="4" height="4" fill="#FCE7A4" />
        <rect x="260" y="15" width="24" height="24" rx="12" fill="#F6F1E7" opacity="0.9" />
        <rect x="254" y="12" width="20" height="20" rx="10" fill="#101622" />
        <polygon points="0,110 70,55 140,110" fill="#172234" />
        <polygon points="100,110 185,45 270,110" fill="#1C293D" />
        <polygon points="210,110 275,65 320,110" fill="#151F30" />
        <rect x="35" y="65" width="120" height="60" fill="#253247" />
        <rect x="45" y="55" width="100" height="12" fill="#354B40" />
        <rect x="75" y="45" width="40" height="12" fill="#D4AB58" />
        <rect x="50" y="75" width="12" height="14" fill="#FCE7A4" />
        <rect x="72" y="75" width="12" height="14" fill="#FCE7A4" />
        <rect x="94" y="75" width="12" height="14" fill="#38BDF8" />
        <rect x="116" y="75" width="12" height="14" fill="#FCE7A4" />
        <rect x="0" y="120" width="320" height="20" fill="#1A2424" />
      </svg>
    );
  }

  if (filename.includes('10_banner_day')) {
    return (
      <svg viewBox="0 0 320 140" className="w-full h-full object-cover pixelated" preserveAspectRatio="xMidYMid slice">
        <rect width="320" height="140" fill="#BAE6FD" />
        <circle cx="265" cy="30" r="18" fill="#FDE047" />
        <rect x="45" y="25" width="50" height="14" rx="7" fill="#FFFFFF" opacity="0.85" />
        <rect x="160" y="18" width="65" height="16" rx="8" fill="#FFFFFF" opacity="0.85" />
        <polygon points="0,115 80,60 160,115" fill="#86EFAC" />
        <polygon points="120,115 210,50 320,115" fill="#4ADE80" />
        <rect x="35" y="65" width="120" height="60" fill="#E2E8F0" />
        <rect x="45" y="55" width="100" height="12" fill="#354B40" />
        <rect x="50" y="75" width="12" height="14" fill="#38BDF8" />
        <rect x="72" y="75" width="12" height="14" fill="#38BDF8" />
        <rect x="94" y="75" width="12" height="14" fill="#38BDF8" />
        <rect x="116" y="75" width="12" height="14" fill="#38BDF8" />
        <rect x="0" y="120" width="320" height="20" fill="#354B40" />
      </svg>
    );
  }

  if (filename.includes('01_avatar_boy') || filename.includes('02_avatar_girl')) {
    const isGirl = filename.includes('girl');
    return (
      <svg viewBox="0 0 64 64" className="w-full h-full bg-[#1C2836] pixelated">
        <rect width="64" height="64" fill={isGirl ? '#354B40' : '#1E2D3D'} />
        <rect x="20" y="12" width="24" height="10" fill={isGirl ? '#4A2511' : '#271810'} />
        <rect x="20" y="20" width="24" height="20" fill="#F5CBA7" />
        <rect x="25" y="26" width="4" height="4" fill="#101622" />
        <rect x="35" y="26" width="4" height="4" fill="#101622" />
        <rect x="28" y="34" width="8" height="2" fill="#C0392B" />
        <rect x="14" y="42" width="36" height="22" fill={isGirl ? '#E77F6E' : '#354B40'} />
        <rect x="26" y="42" width="12" height="8" fill="#D4AB58" />
      </svg>
    );
  }

  if (filename.includes('13_ev_featured')) {
    return (
      <svg viewBox="0 0 320 150" className="w-full h-full object-cover pixelated" preserveAspectRatio="xMidYMid slice">
        <rect width="320" height="150" fill="#16576B" />
        <rect x="0" y="105" width="320" height="45" fill="#354B40" />
        <rect x="195" y="32" width="95" height="68" rx="4" fill="#F6F1E7" stroke="#8C5A32" strokeWidth="5" />
        <rect x="205" y="44" width="45" height="6" fill="#354B40" />
        <rect x="205" y="56" width="70" height="5" fill="#E77F6E" />
        <rect x="205" y="68" width="55" height="5" fill="#D4AB58" />
        <rect x="205" y="80" width="65" height="6" fill="#16576B" />
      </svg>
    );
  }

  if (filename.includes('35_icon_moon')) {
    return (
      <svg viewBox="0 0 24 24" fill="none" className="w-full h-full p-0.5">
        <path
          d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
          fill="#FACC15"
          stroke="#FEF08A"
          strokeWidth="1.5"
        />
      </svg>
    );
  }

  if (filename.includes('36_icon_sun')) {
    return (
      <svg viewBox="0 0 24 24" fill="none" className="w-full h-full p-0.5">
        <circle cx="12" cy="12" r="4.5" fill="#FACC15" stroke="#FEF08A" strokeWidth="1.5" />
        <path
          d="M12 2.5v2.25M12 19.25v2.25M4.75 12H2.5M21.5 12h-2.25M5.28 5.28l1.6 1.6M17.12 17.12l1.6 1.6M18.72 5.28l-1.6 1.6M6.88 17.12l-1.6 1.6"
          stroke="#FDE047"
          strokeWidth="2"
          strokeLinecap="round"
        />
      </svg>
    );
  }

  if (filename.includes('31_icon_bell')) {
    return (
      <svg viewBox="0 0 24 24" fill="none" className="w-full h-full p-0.5">
        <path
          d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9z"
          fill="#FACC15"
          stroke="#FEF08A"
          strokeWidth="1.5"
        />
        <path d="M13.73 21a2 2 0 01-3.46 0" stroke="#FDE047" strokeWidth="2" strokeLinecap="round" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 64 64" className="w-full h-full p-2 pixelated">
      <rect x="8" y="8" width="48" height="48" rx="10" fill="#253247" stroke="#D4AB58" strokeWidth="3" />
      <polygon points="32,14 37,25 49,26 40,34 43,46 32,40 21,46 24,34 15,26 27,25" fill="#D4AB58" />
    </svg>
  );
};
