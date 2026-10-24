/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 100% Real ISO/IEC 18004 Scannable QR Code Generator, Image Decoder, & Live HTML5 Camera Scanner
 * Uses `qrcode` for real camera-scannable QR generation and `jsqr` for decoding uploaded QR images
 * or live camera frames when Telegram.WebApp.showScanQrPopup is unsupported (e.g. Bot API v6.0).
 */

import React, { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';
import jsQR from 'jsqr';
import { Camera, Download, Upload, X } from 'lucide-react';
import { playTick } from '../../utils/soundEngine';

interface RealQrCodeProps {
  payload: string;
  size?: number;
  showDownload?: boolean;
  ticketTitle?: string;
  trackingCode?: string;
  downloadFilename?: string;
}

/**
 * Checks whether Telegram's native showScanQrPopup is supported in the current client.
 * Prevents "[Telegram.WebApp] Method showScanQrPopup is not supported in version 6.0" errors!
 */
export function isTelegramNativeQrPopupSupported(): boolean {
  try {
    if (typeof window === 'undefined') return false;
    const tg = (window as unknown as {
      Telegram?: {
        WebApp?: {
          version?: string;
          platform?: string;
          initData?: string;
          isVersionAtLeast?: (version: string) => boolean;
          showScanQrPopup?: unknown;
        };
      };
    }).Telegram?.WebApp;

    if (!tg || typeof tg.showScanQrPopup !== 'function') return false;
    if (typeof tg.isVersionAtLeast === 'function' && !tg.isVersionAtLeast('6.4')) {
      return false;
    }
    const numericVersion = parseFloat(String(tg.version || '6.0'));
    if (Number.isNaN(numericVersion) || numericVersion < 6.4) {
      return false;
    }
    if (!tg.initData || tg.platform === 'unknown' || tg.platform === 'tdesktop') {
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

/**
 * Decodes a real QR code from an uploaded PNG/JPEG image file using jsQR
 */
export async function decodeQrFromImageFile(file: File): Promise<string | null> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onerror = () => resolve(null);
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => resolve(null);
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = img.width;
          canvas.height = img.height;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            resolve(null);
            return;
          }
          ctx.drawImage(img, 0, 0);
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const decoded = jsQR(imageData.data, imageData.width, imageData.height, {
            inversionAttempts: 'attemptBoth',
          });
          if (decoded && decoded.data) {
            resolve(decoded.data.trim());
            return;
          }
          resolve(null);
        } catch {
          resolve(null);
        }
      };
      img.src = String(reader.result || '');
    };
    reader.readAsDataURL(file);
  });
}

export const RealQrCode: React.FC<RealQrCodeProps> = ({
  payload,
  size = 128,
  showDownload = false,
  ticketTitle,
  trackingCode,
  downloadFilename,
}) => {
  const [qrDataUrl, setQrDataUrl] = useState<string>('');

  useEffect(() => {
    let active = true;
    const cleanPayload = (payload || 'IE-TICKET').trim();
    QRCode.toDataURL(cleanPayload, {
      width: 320,
      margin: 2,
      errorCorrectionLevel: 'M',
      color: {
        dark: '#101622',
        light: '#FFFFFF',
      },
    })
      .then((url) => {
        if (active) setQrDataUrl(url);
      })
      .catch(() => {
        if (active) setQrDataUrl('');
      });

    return () => {
      active = false;
    };
  }, [payload]);

  const handleDownloadQrPng = () => {
    playTick();
    if (!qrDataUrl) return;
    const a = document.createElement('a');
    a.href = qrDataUrl;
    a.download = downloadFilename || `IE_QR_${trackingCode || 'TICKET'}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="inline-flex flex-col items-center gap-2">
      <div
        className="p-2 bg-white rounded-2xl border-2 border-[#101622] shadow-md flex items-center justify-center"
        style={{ width: size + 16, height: size + 16 }}
      >
        {qrDataUrl ? (
          <img
            src={qrDataUrl}
            alt={ticketTitle || `QR ${trackingCode || ''}`}
            style={{ width: size, height: size, imageRendering: 'pixelated' }}
            className="object-contain select-none"
          />
        ) : (
          <div
            style={{ width: size, height: size }}
            className="bg-zinc-200 animate-pulse rounded-lg"
          />
        )}
      </div>

      {showDownload && qrDataUrl && (
        <button
          type="button"
          onClick={handleDownloadQrPng}
          className="px-2.5 py-1 rounded-lg bg-[#354B40] hover:bg-[#2A3C33] text-[#F6F1E7] text-[10px] font-black flex items-center gap-1 cursor-pointer shadow-sm"
        >
          <Download className="w-3 h-3 text-[#D4AB58]" />
          <span>دانلود عکس QR واقعی (PNG)</span>
        </button>
      )}
    </div>
  );
};

interface LiveCameraQrModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDetected: (qrPayload: string) => void;
  onFallbackUploadClick?: () => void;
}

/**
 * Built-in HTML5 WebRTC Camera QR Scanner Modal (jsQR)
 * Used automatically whenever Telegram.WebApp.showScanQrPopup is unavailable (e.g., WebApp v6.0).
 */
export const LiveCameraQrModal: React.FC<LiveCameraQrModalProps> = ({
  isOpen,
  onClose,
  onDetected,
  onFallbackUploadClick,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    let stream: MediaStream | null = null;
    let rafId: number | null = null;
    let cancelled = false;
    setCameraError(null);

    const startCamera = async () => {
      if (
        typeof navigator === 'undefined' ||
        !navigator.mediaDevices ||
        typeof navigator.mediaDevices.getUserMedia !== 'function'
      ) {
        setCameraError(
          'مرورگر فعلی به دوربین زنده دسترسی ندارد. می‌توانید تصویر بارکد QR را از گالری انتخاب کنید.'
        );
        return;
      }

      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' } },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => {});
        }

        const scanFrame = () => {
          if (cancelled) return;
          const video = videoRef.current;
          const canvas = canvasRef.current;
          if (video && canvas && video.readyState === video.HAVE_ENOUGH_DATA) {
            canvas.width = video.videoWidth || 320;
            canvas.height = video.videoHeight || 320;
            const ctx = canvas.getContext('2d');
            if (ctx) {
              ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
              const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
              const code = jsQR(imageData.data, imageData.width, imageData.height, {
                inversionAttempts: 'attemptBoth',
              });
              if (code && code.data && code.data.trim()) {
                onDetected(code.data.trim());
                onClose();
                return;
              }
            }
          }
          rafId = requestAnimationFrame(scanFrame);
        };

        rafId = requestAnimationFrame(scanFrame);
      } catch {
        setCameraError(
          'دسترسی به دوربین مجاز نشد یا دوربینی یافت نشد. لطفاً عکس بارکد QR را آپلود کنید.'
        );
      }
    };

    void startCamera();

    return () => {
      cancelled = true;
      if (rafId !== null) cancelAnimationFrame(rafId);
      if (stream) {
        stream.getTracks().forEach((t) => t.stop());
      }
    };
  }, [isOpen, onClose, onDetected]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md select-none"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm rounded-3xl border-2 border-[#D4AB58] bg-[#121A26] text-[#F6F1E7] p-4 space-y-3 shadow-2xl"
      >
        <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
          <div className="flex items-center gap-2">
            <Camera className="w-4 h-4 text-[#D4AB58]" />
            <span className="text-xs font-black">اسکنر زنده بارکد QR دوربین</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 rounded-lg bg-white/10 flex items-center justify-center cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {!cameraError ? (
          <div className="relative rounded-2xl overflow-hidden border-2 border-[#D4AB58]/50 bg-black aspect-square flex items-center justify-center">
            <video
              ref={videoRef}
              playsInline
              muted
              className="w-full h-full object-cover"
            />
            <canvas ref={canvasRef} className="hidden" />
            <div className="absolute inset-8 border-2 border-dashed border-[#D4AB58] rounded-2xl pointer-events-none" />
          </div>
        ) : (
          <div className="p-4 rounded-2xl bg-amber-500/15 border border-amber-500/40 text-xs font-bold text-amber-200 leading-relaxed text-center space-y-3">
            <p>{cameraError}</p>
            {onFallbackUploadClick && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onFallbackUploadClick();
                }}
                className="px-3.5 py-2 rounded-xl bg-[#D4AB58] text-[#101622] font-black text-xs inline-flex items-center gap-1.5 cursor-pointer"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>انتخاب تصویر بارکد QR از گالری</span>
              </button>
            )}
          </div>
        )}

        <p className="text-[11px] text-[#A3C1AD] text-center font-bold">
          بارکد بلیط دانشجو (IE-TICKET) را مقابل کادر دوربین قرار دهید
        </p>
      </div>
    </div>
  );
};
