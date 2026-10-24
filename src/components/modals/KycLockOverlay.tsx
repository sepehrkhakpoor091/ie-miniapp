/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Full-Screen KYC Security Lock Screen for Student ID Verification
 * Enforces strict MIME (JPG/PNG/WebP), <= 4 MB size, Magic Bytes & Dimension validation
 */

import React, { useState } from 'react';
import { AdminReceiptItem, KycStatus, ThemeMode } from '../../types';
import { PixelImage, compressImageFileToDataUrl } from '../PixelImage';
import { PushButton } from '../ui/PushButton';
import { playError, playFanfare, playTick } from '../../utils/soundEngine';
import { validateUploadedImageFile } from '../../utils/security';
import {
  ShieldAlert,
  Upload,
  Clock,
  IdCard,
  RefreshCw,
} from 'lucide-react';

interface KycLockOverlayProps {
  status: KycStatus;
  themeMode: ThemeMode;
  onUpdateStatus: (newStatus: KycStatus) => void;
  studentId?: string;
  fullName?: string;
  cohortYear?: string;
  onSubmitKycCard?: (item: AdminReceiptItem) => void;
}

export const KycLockOverlay: React.FC<KycLockOverlayProps> = ({
  status,
  onUpdateStatus,
  studentId = '4021202422',
  fullName = 'دانشجوی مهندسی صنایع',
  cohortYear = '۱۴۰۲',
  onSubmitKycCard,
}) => {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // If already verified, do not render lock overlay
  if (status === 'verified') return null;

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadError(null);

    const validation = await validateUploadedImageFile(file);
    if (!validation.valid) {
      playError();
      setUploadError(validation.error || 'فایل انتخاب‌شده معتبر نیست.');
      setSelectedImage(null);
      e.target.value = '';
      return;
    }

    playTick();
    try {
      const compressed = await compressImageFileToDataUrl(file, 640);
      setSelectedImage(compressed);
    } catch {
      playError();
      setUploadError('خطا در خواندن تصویر کارت دانشجویی. لطفاً تصویر دیگری انتخاب کنید.');
      setSelectedImage(null);
    }
  };

  const handleSubmitForReview = () => {
    if (!selectedImage) return;
    setIsSubmitting(true);
    playTick();

    setTimeout(() => {
      setIsSubmitting(false);
      onSubmitKycCard?.({
        id: `kyc-${Date.now()}`,
        studentId,
        studentName: fullName,
        cohortYear,
        type: 'student_card',
        title: `تایید کارت دانشجویی ورودی ${cohortYear} (${fullName})`,
        trackingCode: `KYC-${Math.floor(1000 + Math.random() * 9000)}`,
        submittedAt: 'همین الان',
        status: 'pending',
        receiptImageUrl: selectedImage,
      });
      onUpdateStatus('pending_review');
      playFanfare();
    }, 500);
  };

  return (
    <div className="fixed inset-0 z-40 flex flex-col justify-between overflow-y-auto bg-[#0C121D] text-[#F6F1E7] p-4 sm:p-6 animate-fade-in select-none">
      <div className="max-w-md mx-auto w-full my-auto py-6 space-y-5">
        {/* Shield / Mascot Header */}
        <div className="text-center space-y-3">
          <div className="relative inline-block">
            <div className="w-24 h-24 mx-auto rounded-3xl bg-[#1A2424] border-2 border-[#D4AB58] flex items-center justify-center p-3 shadow-[0_0_25px_rgba(212,171,88,0.25)]">
              <PixelImage
                filename="20_badge_shield.png"
                alt="قفل احراز هویت"
                className="w-16 h-16 object-contain"
              />
            </div>
            <div className="absolute -bottom-2 -right-2 bg-[#9E2A2B] text-white p-1.5 rounded-full border-2 border-[#101622] shadow">
              <ShieldAlert className="w-4 h-4" />
            </div>
          </div>

          <div>
            <h2 className="text-xl font-bold text-[#F6F1E7]">احراز هویت کارت دانشجویی فردوسی</h2>
            <p className="text-xs text-[#91B5BE] mt-1">
              جهت حفظ امنیت سامانه انجمن مهندسی صنایع، دسترسی منوط به تایید تصویر کارت دانشجویی است.
            </p>
          </div>
        </div>

        {/* Student Info Pill */}
        <div className="p-3.5 rounded-2xl bg-[#1A2424] border border-[#253247] flex items-center justify-between text-xs">
          <div>
            <span className="opacity-60 block text-[10px]">دانشجوی متقاضی:</span>
            <span className="font-bold text-[#F6F1E7]">{fullName}</span>
          </div>
          <div className="text-left">
            <span className="opacity-60 block text-[10px]">شماره دانشجویی:</span>
            <span className="font-bold font-mono text-[#D4AB58] tracking-wider">{studentId}</span>
          </div>
        </div>

        {/* Body by Status */}
        {status === 'pending_review' ? (
          <div className="p-5 rounded-2xl bg-[#16576B]/20 border border-[#16576B] text-center space-y-3">
            <div className="w-12 h-12 mx-auto rounded-full bg-[#16576B]/40 flex items-center justify-center text-[#91B5BE]">
              <Clock className="w-6 h-6 animate-spin" style={{ animationDuration: '6s' }} />
            </div>
            <div>
              <h3 className="font-bold text-sm text-[#91B5BE]">مدارک شما در صف بررسی شورای مرکزی قرار دارد</h3>
              <p className="text-xs text-zinc-300 mt-1 leading-relaxed">
                تصویر کارت دانشجویی شما با موفقیت دریافت و رمزنگاری شد. پس از تطبیق شماره دانشجویی توسط ادمین انجمن، حساب شما به صورت خودکار فعال خواهد شد.
              </p>
            </div>
            <div className="pt-2 border-t border-white/10">
              <span className="text-[11px] text-zinc-400">وضعیت: در انتظار تایید شورای مرکزی (@Isefum)</span>
            </div>
          </div>
        ) : (
          <div className="p-5 rounded-2xl bg-[#1A2424] border border-[#253247] space-y-4">
            <div className="flex items-center gap-2 text-xs text-[#D4AB58] font-bold">
              <IdCard className="w-4 h-4" />
              <span>بارگذاری تصویر کارت فیزیکی دانشجویی (JPG / PNG / WebP حداکثر ۴ مگابایت)</span>
            </div>

            {uploadError && (
              <div className="p-3 rounded-xl bg-[#EF4444]/15 border border-[#EF4444]/40 text-[#EF4444] text-xs font-bold leading-5">
                {uploadError}
              </div>
            )}

            {/* Upload Zone */}
            <div className="border-2 border-dashed border-[#253247] hover:border-[#D4AB58] rounded-xl p-4 text-center transition-colors">
              {selectedImage ? (
                <div className="space-y-3">
                  <div className="h-32 rounded-lg bg-black/40 flex items-center justify-center p-2 relative overflow-hidden border border-emerald-500/40">
                    <img
                      src={selectedImage}
                      alt="پیش‌نمایش کارت دانشجویی"
                      className="max-h-full max-w-full object-contain rounded"
                    />
                  </div>
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-emerald-400 font-bold">✓ تصویر کارت تایید باینری شد و آماده ارسال است</span>
                    <button
                      type="button"
                      onClick={() => setSelectedImage(null)}
                      className="text-[#E77F6E] underline hover:opacity-80 cursor-pointer"
                    >
                      تغییر تصویر
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <Upload className="w-8 h-8 mx-auto text-[#91B5BE]" />
                  <p className="text-xs text-zinc-300">
                    تصویر واضح از روی کارت دانشجویی دانشگاه فردوسی مشهد بارگذاری نمایید
                  </p>
                  <div className="flex items-center justify-center gap-2 pt-2">
                    <label className="cursor-pointer px-4 py-2 rounded-xl bg-[#253247] hover:bg-[#2F3F59] text-xs font-bold text-[#F6F1E7] border border-[#354661] transition-all">
                      انتخاب فایل تصویر کارت دانشجویی
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        className="hidden"
                        onChange={handleFileChange}
                      />
                    </label>
                  </div>
                </div>
              )}
            </div>

            <PushButton
              variant="gold"
              fullWidth
              disabled={!selectedImage || isSubmitting}
              onClick={handleSubmitForReview}
              icon={isSubmitting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
            >
              {isSubmitting ? 'در حال رمزنگاری و ارسال...' : 'ارسال مدارک برای تأیید شورا'}
            </PushButton>
          </div>
        )}
      </div>

      {/* Footer support notice */}
      <div className="text-center text-[11px] opacity-60 pb-2">
        کانال رسمی انجمن علمی مهندسی صنایع دانشگاه فردوسی مشهد (@Isefum)
      </div>
    </div>
  );
};
