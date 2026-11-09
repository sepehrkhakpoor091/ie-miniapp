/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Interactive Checkout Drawer with Coin-Slider, Point-Discount, Receipt Queue Integration,
 * and 100% Real Scannable ISO/IEC 18004 QR Ticket Generator
 */

import React, { useEffect, useRef, useState } from 'react';
import {
  AdminReceiptItem,
  BotConfigSettings,
  DiscountRuleConfig,
  DiscountVoucher,
  EventItem,
  ThemeMode,
  TicketRecord,
  UserProfile,
} from '../../types';
import {
  calculateFinalPayable,
  formatToman,
  generateTicketPayload,
  isEventCapacityFull,
  normalizeEvent,
  resolveEventDiscountRule,
} from '../../utils/events';
import { PixelImage, compressImageFileToDataUrl } from '../PixelImage';
import { PushButton } from '../ui/PushButton';
import { RollingNumber } from '../ui/RollingNumber';
import { RealQrCode } from '../ui/RealQrCode';
import { playCoin, playError, playFanfare, playTick } from '../../utils/soundEngine';
import { validateUploadedImageFile } from '../../utils/security';
import {
  loadStoredBotConfig,
  sendQrTicketToTelegramChat,
  uploadPaymentReceiptToBot,
} from '../../utils/apiBridge';
import {
  X,
  Copy,
  Check,
  Upload,
  Calendar,
  Clock,
  MapPin,
  Send,
  Ticket,
  FileCheck,
} from 'lucide-react';

interface CheckoutDrawerProps {
  event: EventItem | null;
  isOpen: boolean;
  onClose: () => void;
  user: UserProfile;
  themeMode: ThemeMode;
  discountRule?: Partial<DiscountRuleConfig> & {
    pointsUnit?: number;
    discountToman?: number;
  };
  botConfig?: Partial<BotConfigSettings>;
  userTickets?: TicketRecord[];
  receipts?: AdminReceiptItem[];
  vouchers?: DiscountVoucher[];
  onConsumeVoucher?: (voucherId: string, pointsDeducted: number) => void;
  onCompleteRegistration: (ticket: TicketRecord, pointsDeducted: number, pointsEarned: number) => void;
  onSubmitReceipt?: (receipt: AdminReceiptItem) => void;
  onRefreshFromServer?: () => Promise<void> | void;
}

export const CheckoutDrawer: React.FC<CheckoutDrawerProps> = ({
  event: rawEvent,
  isOpen,
  onClose,
  user,
  themeMode,
  discountRule = {
    pointsStep: 20,
    discountTomansPerStep: 10000,
    minPoints: 20,
    maxPoints: 100,
  },
  botConfig,
  userTickets = [],
  receipts = [],
  vouchers = [],
  onConsumeVoucher,
  onCompleteRegistration,
  onSubmitReceipt,
  onRefreshFromServer,
}) => {
  const isNight = themeMode === 'night';

  const [step, setStep] = useState<'checkout' | 'pending_approval' | 'success'>('checkout');
  const [pointsToRedeem, setPointsToRedeem] = useState<number>(0);
  const [selectedVoucherId, setSelectedVoucherId] = useState<string>('');
  const [isDiamondShaking, setIsDiamondShaking] = useState(false);

  const [cardCopied, setCardCopied] = useState(false);
  const [receiptUploaded, setReceiptUploaded] = useState(false);
  const [receiptDataUrl, setReceiptDataUrl] = useState<string>('');
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [pendingTrackingCode, setPendingTrackingCode] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const inFlightRequestRef = useRef<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const [generatedTicket, setGeneratedTicket] = useState<TicketRecord | null>(null);
  const [telegramPushSent, setTelegramPushSent] = useState(false);
  const [isSendingTelegram, setIsSendingTelegram] = useState(false);

  useEffect(() => {
    setPointsToRedeem(0);
    setSelectedVoucherId('');
    setReceiptUploaded(false);
    setReceiptDataUrl('');
    setUploadError(null);
    setStep('checkout');
  }, [rawEvent?.id, isOpen]);

  if (!isOpen || !rawEvent) return null;

  const event = normalizeEvent(rawEvent);
  const isFull = isEventCapacityFull(event);
  const effectiveRule = resolveEventDiscountRule(event, discountRule);

  // Fix 1-2: Read dynamic bank card number and holder from botConfig / localStorage
  const storedConfig = loadStoredBotConfig();
  const rawCardNumber = (botConfig?.cardNumber || storedConfig.cardNumber || '6219861811489862').trim();
  const cleanCardDigits = rawCardNumber.replace(/\D/g, '') || '6219861811489862';
  const formattedCardNumber = cleanCardDigits.replace(/(\d{4})(?=\d)/g, '$1 - ');
  const activeCardHolder = (botConfig?.cardHolder || storedConfig.cardHolder || 'انجمن علمی مهندسی صنایع').trim();

  // Fix 1-3: Check if student already has an active ticket or a pending receipt for this workshop
  const alreadyHasTicket = userTickets.some(
    (t) => t.eventId === event.id && (!t.studentId || t.studentId === user.studentId)
  );
  const alreadyHasPendingReceipt = receipts.some(
    (r) =>
      (r.eventId === event.id || r.eventTitle === event.title) &&
      r.studentId === user.studentId &&
      r.status === 'pending' &&
      (r.type === 'receipt' || r.type === 'payment_receipt')
  );
  const isDuplicateRegistration = alreadyHasTicket || alreadyHasPendingReceipt;

  // Fix 1-4: Unused Lootbox Vouchers
  const unusedVouchers = vouchers.filter((v) => !v.isUsed && v.discountPercent > 0);
  const selectedVoucher = unusedVouchers.find((v) => v.id === selectedVoucherId) || null;

  const {
    discountAmount,
    finalPrice: priceAfterPoints,
    pointsUsed,
    discountCode: pointsDiscountCode,
  } = calculateFinalPayable(
    event.basePrice,
    pointsToRedeem,
    discountRule,
    event
  );

  const voucherDiscountAmount = selectedVoucher
    ? Math.round((priceAfterPoints * selectedVoucher.discountPercent) / 100)
    : 0;
  const finalPrice = Math.max(0, priceAfterPoints - voucherDiscountAmount);
  const discountCode = selectedVoucher
    ? pointsDiscountCode
      ? `${pointsDiscountCode}+${selectedVoucher.code}`
      : selectedVoucher.code
    : pointsDiscountCode;

  const applySelectedPoints = (rawVal: number) => {
    const val = Number(rawVal) || 0;
    let snapped = 0;
    if (val > 0) {
      if (val < effectiveRule.minPoints) {
        snapped = effectiveRule.minPoints;
      } else {
        snapped = Math.min(
          effectiveRule.maxPoints,
          Math.floor(val / effectiveRule.pointsStep) * effectiveRule.pointsStep
        );
      }
    }
    setPointsToRedeem(snapped);
    playCoin();
    setIsDiamondShaking(true);
    setTimeout(() => setIsDiamondShaking(false), 300);
  };

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value, 10);
    applySelectedPoints(val);
  };

  const handleCopyCard = () => {
    playTick();
    navigator.clipboard?.writeText(cleanCardDigits);
    setCardCopied(true);
    setTimeout(() => setCardCopied(false), 2000);
  };

  const handleReceiptFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadError(null);

    const validation = await validateUploadedImageFile(file);
    if (!validation.valid) {
      playError();
      setUploadError(validation.error || 'فایل انتخاب‌شده معتبر نیست.');
      setReceiptUploaded(false);
      e.target.value = '';
      return;
    }

    playTick();
    try {
      // Compress via Canvas to standard JPEG Base64 (quality: 0.7, max width 800px)
      const compressed = await compressImageFileToDataUrl(file, 800, 'image/jpeg', 0.7);
      setReceiptDataUrl(compressed);
      setReceiptUploaded(true);
    } catch {
      playError();
      setUploadError('خطا در پردازش تصویر فیش واریزی. لطفاً تصویر دیگری انتخاب کنید.');
      setReceiptUploaded(false);
    }
  };

  const handleConfirmOrder = async () => {
    if (isFull || isDuplicateRegistration) {
      playError();
      return;
    }
    if (finalPrice > 0 && (!receiptUploaded || !receiptDataUrl)) {
      playError();
      setUploadError('لطفاً ابتدا تصویر فیش واریزی را بارگذاری نمایید.');
      return;
    }
    if (inFlightRequestRef.current || isSubmitting || step !== 'checkout') {
      return;
    }
    inFlightRequestRef.current = true;
    setIsSubmitting(true);

    try {
      const trackingCode = `TK-${Math.floor(100000 + Math.random() * 900000)}`;
      const idempotencyKey = trackingCode;
      try {
        localStorage.setItem(`ie_idem_ticket_${idempotencyKey}`, idempotencyKey);
      } catch {
        // Ignore storage error
      }

      const actualPointsDeducted = Math.min(user.score, pointsUsed);

      // Fix 1-1: If finalPrice > 0, DO NOT issue QR ticket or award rewardPoints before admin approval!
      if (finalPrice > 0) {
        const receiptItemId = `rcp-${Date.now()}`;
        if (onSubmitReceipt) {
          onSubmitReceipt({
            id: receiptItemId,
            studentId: user.studentId,
            studentName: user.fullName,
            telegramUserId: user.telegramUserId,
            cohortYear: user.cohortYear,
            type: 'payment_receipt',
            title: `فیش ثبت‌نام ${event.title}`,
            eventId: event.id,
            eventTitle: event.title,
            amount: finalPrice,
            amountTomans: finalPrice,
            trackingCode,
            submittedAt: 'همین الان',
            status: 'pending',
            imageUrl: receiptDataUrl || undefined,
            receiptImageUrl: receiptDataUrl || undefined,
            imageBase64: receiptDataUrl || undefined,
          });
        }

        // Push the compressed Base64 JPEG receipt to the Telegram Bot (`POST /api/miniapp/upload-receipt`)
        await uploadPaymentReceiptToBot({
          itemId: receiptItemId,
          eventId: event.id,
          eventTitle: event.title,
          amountTomans: finalPrice,
          trackingCode,
          studentId: user.studentId,
          studentName: user.fullName,
          cohortYear: user.cohortYear,
          imageBase64: receiptDataUrl || '',
          telegramUserId: user.telegramUserId,
        });

        // Consume redeemed discount points and selected voucher immediately
        if (selectedVoucher || actualPointsDeducted > 0) {
          onConsumeVoucher?.(selectedVoucher?.id || '', actualPointsDeducted);
        }

        playFanfare();
        setPendingTrackingCode(trackingCode);
        setStep('pending_approval');
        await onRefreshFromServer?.();
        return;
      }

      // Free event or 100% discount (finalPrice === 0) -> Issue QR Ticket immediately
      playFanfare();
      const qrPayload = generateTicketPayload(
        event.id,
        user.studentId,
        trackingCode,
        finalPrice
      );

      const ticket: TicketRecord = {
        id: `ticket-${Date.now()}`,
        eventId: event.id,
        eventTitle: event.title,
        eventDate: event.date,
        eventTime: event.time,
        location: event.location,
        studentId: user.studentId,
        studentName: user.fullName,
        trackingCode,
        qrPayload,
        paidAmount: finalPrice,
        discountPointsUsed: pointsUsed,
        voucherCodeUsed: discountCode || undefined,
        issuedAt: new Date().toLocaleDateString('fa-IR'),
        sentToTelegram: true,
        checkedIn: false,
      };

      if (selectedVoucher) {
        onConsumeVoucher?.(selectedVoucher.id, 0);
      }

      setGeneratedTicket(ticket);
      setStep('success');
      onCompleteRegistration(ticket, actualPointsDeducted, event.rewardPoints);

      // Push the QR ticket once to the live Cloudflare Worker Telegram Bot
      const sendRes = await sendQrTicketToTelegramChat(ticket, user);
      if (sendRes.deliveredToTelegram || sendRes.ok) {
        setTelegramPushSent(true);
      }
      await onRefreshFromServer?.();
    } finally {
      inFlightRequestRef.current = false;
      setIsSubmitting(false);
    }
  };

  const handleSendToTelegram = async () => {
    if (!generatedTicket || inFlightRequestRef.current || isSendingTelegram || telegramPushSent) {
      return;
    }
    inFlightRequestRef.current = true;
    setIsSendingTelegram(true);
    playTick();

    try {
      await sendQrTicketToTelegramChat(generatedTicket, user);
      setTelegramPushSent(true);
      playFanfare();
    } finally {
      inFlightRequestRef.current = false;
      setIsSendingTelegram(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/80 backdrop-blur-md select-none animate-fade-in">
      <div
        className={`w-full max-w-lg rounded-t-3xl border-t border-l border-r p-5 shadow-2xl max-h-[92vh] overflow-y-auto flex flex-col ${
          isNight
            ? 'bg-[#141C24] border-[#253247] text-[#F6F1E7]'
            : 'bg-[#FAF7F0] border-[#C8BFA8] text-[#14201B]'
        }`}
      >
        <div className="w-12 h-1.5 rounded-full bg-current/20 mx-auto mb-3 flex-shrink-0" />

        <div className="flex items-center justify-between pb-3 border-b border-current/10 mb-4 flex-shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-[#7FB69E]/20 text-[#7FB69E] flex items-center justify-center border border-[#7FB69E]/30">
              <Ticket className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-black text-sm">
                {step === 'checkout'
                  ? 'ثبت‌نام و صدور بلیط الکترونیکی'
                  : step === 'pending_approval'
                  ? '⏳ در انتظار بررسی و تایید فیش توسط ادمین'
                  : 'بلیط رسمی صادر گردید ✨'}
              </h3>
              <p className="text-[11px] opacity-70">انجمن علمی مهندسی صنایع</p>
            </div>
          </div>
          <button
            onClick={() => {
              playTick();
              onClose();
            }}
            className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-current/10 active:scale-95 cursor-pointer"
            aria-label="بستن پنجره خرید"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {step === 'checkout' ? (
          <div className="space-y-4">
            {/* Fix 1-3: Duplicate Registration Guard Banner */}
            {isDuplicateRegistration && (
              <div className="p-3.5 rounded-2xl bg-amber-500/15 border-2 border-amber-500/50 text-amber-300 text-xs font-extrabold space-y-1">
                {alreadyHasTicket ? (
                  <>
                    <div>✅ شما قبلاً در این کارگاه ثبت‌نام کرده‌اید و بلیط فعال دارید!</div>
                    <div className="text-[11px] opacity-85 font-normal">
                      بلیط QR شما در تب «پروفایل ← بلیط‌های من» در دسترس است و امکان ثبت‌نام تکراری وجود ندارد.
                    </div>
                  </>
                ) : (
                  <>
                    <div>⏳ فیش واریزی شما برای این کارگاه در انتظار بررسی و تایید ادمین است!</div>
                    <div className="text-[11px] opacity-85 font-normal">
                      پس از بررسی و تایید فیش توسط ادمین در کارتابل مالی، بلیط QR و امتیاز کارگاه برای شما صادر خواهد شد.
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Event Summary Card */}
            <div
              className={`p-3.5 rounded-2xl border flex items-center gap-3 ${
                isNight ? 'bg-white/5 border-white/10' : 'bg-[#FFFFFF] border-[#C8BFA8]'
              }`}
            >
              <div className="w-16 h-16 rounded-xl overflow-hidden relative shrink-0 border border-current/10 bg-black/20">
                <PixelImage
                  filename={event.imageFilename}
                  alt={event.title}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="flex-1 min-w-0">
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-[#D4AB58] text-[#101622]">
                  {event.categoryLabel}
                </span>
                <h4 className="text-sm font-black truncate mt-1">{event.title}</h4>
                <div className="text-[11px] opacity-75 mt-0.5">
                  {event.date} • {event.time}
                </div>
              </div>
            </div>

            {/* Reward Points Badge Callout */}
            <div className="p-3 rounded-2xl bg-[#354B40] border border-[#7FB69E]/40 text-[#F6F1E7] flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div
                  className={`w-8 h-8 flex items-center justify-center transition-transform ${
                    isDiamondShaking ? 'scale-125 rotate-12' : ''
                  }`}
                >
                  <PixelImage
                    filename="23_badge_diamond.png"
                    alt="الماس امتیاز"
                    className="w-7 h-7 object-contain"
                  />
                </div>
                <div>
                  <div className="text-xs font-black text-[#D4AB58]">
                    جایزه شرکت در این رویداد: +{event.rewardPoints} امتیاز 💎
                  </div>
                  <div className="text-[10px] text-[#E2ECE7]">
                    پس از حضور و اسکن بارکد QR، امتیاز و گواهی ثبت می‌شود.
                  </div>
                </div>
              </div>
            </div>

            {/* Syllabus & Instructor */}
            <div
              className={`p-3.5 rounded-2xl border space-y-2 text-xs ${
                isNight ? 'bg-white/5 border-white/10' : 'bg-[#FFFFFF] border-[#C8BFA8]'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="opacity-70 text-[11px]">مدرس کارگاه:</span>
                <span className={`font-bold ${isNight ? 'text-[#D4AB58]' : 'text-[#354B40]'}`}>
                  {event.instructor}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="opacity-70 text-[11px]">محل برگزاری:</span>
                <span className="font-semibold">{event.location}</span>
              </div>
              <div className="pt-1.5 border-t border-current/10">
                <span className="opacity-70 text-[10px] block mb-1">سرفصل‌های کلیدی دوره:</span>
                <ul className="text-[11px] opacity-85 space-y-0.5 list-disc pr-3">
                  {(event?.syllabus || []).map((s, idx) => (
                    <li key={idx}>{s}</li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Point Discount Slider (Controlled per-workshop & globally by Admin) */}
            {effectiveRule.enabled && (
              <div className="p-4 rounded-2xl bg-gradient-to-r from-[#1A2624] to-[#162A35] border-2 border-[#D4AB58]/60 text-[#F6F1E7] space-y-3 shadow-lg">
                <div className="flex items-center justify-between gap-2 flex-wrap text-xs font-black">
                  <span className="text-[#D4AB58] flex items-center gap-1.5">
                    <span>💎 نوار تبدیل امتیاز به کد تخفیف کارگاه:</span>
                  </span>
                  <span className="px-2.5 py-1 rounded-xl bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 font-black">
                    {pointsUsed > 0
                      ? `${pointsUsed.toLocaleString('fa-IR')} امتیاز = ${discountAmount.toLocaleString('fa-IR')} تومان تخفیف`
                      : 'نوار را بکشید تا تخفیف اعمال شود'}
                  </span>
                </div>

                {discountCode && (
                  <div className="flex items-center justify-between px-3 py-1.5 rounded-xl bg-[#D4AB58]/20 border border-[#D4AB58]/50 text-[11px] font-black">
                    <span className="text-[#FCE7A4]">🎟 کد تخفیف خودکار اعمال‌شده روی کارگاه:</span>
                    <span className="font-mono text-[#D4AB58] tracking-wider" dir="ltr">
                      {discountCode}
                    </span>
                  </div>
                )}

                <div className="space-y-1.5">
                  <input
                    type="range"
                    min={0}
                    max={effectiveRule.maxPoints}
                    step={effectiveRule.pointsStep}
                    value={pointsToRedeem}
                    onChange={handleSliderChange}
                    aria-label="نوار تبدیل امتیاز به تخفیف"
                    className="w-full h-2.5 rounded-lg accent-[#D4AB58] cursor-pointer"
                  />

                  {/* Interactive Multiplier Step Pills */}
                  <div className="flex items-center gap-1.5 overflow-x-auto pb-1 pt-1">
                    {effectiveRule.steps.map((st) => {
                      const isActive = pointsUsed === st.points;
                      return (
                        <button
                          key={st.points}
                          type="button"
                          onClick={() => applySelectedPoints(st.points)}
                          className={`px-2.5 py-1 rounded-xl text-[10px] font-black shrink-0 transition-all cursor-pointer border ${
                            isActive
                              ? 'bg-[#D4AB58] text-[#101622] border-[#FCE7A4] shadow scale-105'
                              : 'bg-black/30 text-[#E2ECE7] border-white/15 hover:border-[#D4AB58]/60'
                          }`}
                        >
                          {st.points === 0
                            ? 'بدون تخفیف (۰)'
                            : `${st.points.toLocaleString('fa-IR')} امتیاز (${(
                                st.discountTomans / 1000
                              ).toLocaleString('fa-IR')} هزار ت)`}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 text-[10px] text-[#A3C1AD] pt-1 border-t border-white/10 font-bold">
                  <span>
                    ضریب: هر {effectiveRule.pointsStep.toLocaleString('fa-IR')} امتیاز ={' '}
                    {effectiveRule.discountTomansPerStep.toLocaleString('fa-IR')} تومان تخفیف
                  </span>
                  <span>
                    کف: {effectiveRule.minPoints.toLocaleString('fa-IR')} • سقف:{' '}
                    {effectiveRule.maxPoints.toLocaleString('fa-IR')} امتیاز (موجودی شما:{' '}
                    {user.score.toLocaleString('fa-IR')} 💎)
                  </span>
                </div>
              </div>
            )}

            {/* Fix 1-4: Lootbox Discount Vouchers Selector */}
            {event.basePrice > 0 && unusedVouchers.length > 0 && (
              <div
                className={`p-3.5 rounded-2xl border space-y-2 text-xs ${
                  isNight ? 'bg-white/5 border-white/10' : 'bg-[#FFFFFF] border-[#C8BFA8]'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-black text-[#D4AB58]">
                    🎁 اعمال کد تخفیف صندوقچه شانس ({unusedVouchers.length.toLocaleString('fa-IR')} کد فعال):
                  </span>
                  {selectedVoucher && (
                    <button
                      type="button"
                      onClick={() => {
                        playTick();
                        setSelectedVoucherId('');
                      }}
                      className="text-[10px] text-rose-400 underline cursor-pointer"
                    >
                      حذف کد تخفیف
                    </button>
                  )}
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {unusedVouchers.map((v) => {
                    const isSelected = selectedVoucherId === v.id;
                    return (
                      <button
                        key={v.id}
                        type="button"
                        onClick={() => {
                          playCoin();
                          setSelectedVoucherId(isSelected ? '' : v.id);
                        }}
                        className={`px-3 py-1.5 rounded-xl text-[11px] font-black border transition-all cursor-pointer flex items-center gap-1.5 ${
                          isSelected
                            ? 'bg-emerald-500 text-[#101622] border-emerald-300 shadow'
                            : 'bg-black/25 text-[#D4AB58] border-[#D4AB58]/40 hover:border-[#D4AB58]'
                        }`}
                      >
                        <span>🎟 {v.title}</span>
                        <span className="font-mono text-[10px] opacity-85" dir="ltr">
                          ({v.code} • {v.discountPercent}%)
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Price Breakdown */}
            <div
              className={`p-3.5 rounded-2xl border space-y-2 text-xs ${
                isNight ? 'bg-white/5 border-white/10' : 'bg-[#FFFFFF] border-[#C8BFA8]'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="opacity-70">مبلغ پایه ثبت‌نام:</span>
                <span className="font-bold">{formatToman(event.basePrice)}</span>
              </div>

              {discountAmount > 0 && (
                <div className="flex items-center justify-between text-emerald-500 font-bold">
                  <span>
                    تخفیف امتیازی ({pointsUsed.toLocaleString('fa-IR')} الماس • کد {pointsDiscountCode}):
                  </span>
                  <span>- {discountAmount.toLocaleString('fa-IR')} تومان</span>
                </div>
              )}

              {selectedVoucher && voucherDiscountAmount > 0 && (
                <div className="flex items-center justify-between text-emerald-400 font-bold">
                  <span>
                    کد تخفیف صندوقچه ({selectedVoucher.discountPercent}% • {selectedVoucher.code}):
                  </span>
                  <span>- {voucherDiscountAmount.toLocaleString('fa-IR')} تومان</span>
                </div>
              )}

              <div className="pt-2 border-t border-current/10 flex items-center justify-between font-black text-sm">
                <span>مبلغ قابل پرداخت نهایی:</span>
                <span className="text-[#D4AB58] text-base">
                  {finalPrice === 0 ? (
                    <span className="text-emerald-500">رایگان (۱۰۰٪ تخفیف)</span>
                  ) : (
                    <RollingNumber value={finalPrice} suffix="تومان" formatTomanDigits />
                  )}
                </span>
              </div>
            </div>

            {/* Bank Card info if price > 0 (Fix 1-2: Dynamic Card Number & Holder) */}
            {finalPrice > 0 && (
              <div
                className={`p-3.5 rounded-2xl border space-y-2.5 ${
                  isNight ? 'bg-white/5 border-white/10' : 'bg-[#FFFFFF] border-[#C8BFA8]'
                }`}
              >
                <div className="flex items-center justify-between text-xs">
                  <span className="opacity-70 text-[11px]">
                    شماره کارت ({activeCardHolder}):
                  </span>
                  <button
                    onClick={handleCopyCard}
                    className="text-[10px] font-bold text-[#D4AB58] hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    {cardCopied ? (
                      <Check className="w-3 h-3 text-emerald-400" />
                    ) : (
                      <Copy className="w-3 h-3" />
                    )}
                    <span>{cardCopied ? 'کپی شد!' : 'کپی شماره کارت'}</span>
                  </button>
                </div>

                <div
                  className="p-2.5 rounded-xl bg-[#101622] border border-white/10 text-center font-mono text-sm tracking-widest text-[#D4AB58]"
                  dir="ltr"
                >
                  {formattedCardNumber}
                </div>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleReceiptFileChange}
                  className="hidden"
                />

                {uploadError && (
                  <div className="p-2.5 rounded-xl bg-[#EF4444]/15 border border-[#EF4444]/40 text-[#EF4444] text-[11px] font-bold">
                    {uploadError}
                  </div>
                )}

                <div className="pt-1">
                  {!receiptUploaded ? (
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full py-2.5 px-3 rounded-xl border border-dashed border-[#D4AB58] text-xs font-bold flex items-center justify-center gap-1.5 transition-all text-[#D4AB58] active:scale-95 cursor-pointer"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      <span>انتخاب تصویر فیش واریزی از گالری (الزامی)</span>
                    </button>
                  ) : (
                    <div className="p-2.5 rounded-xl bg-emerald-950/60 border border-emerald-700/60 flex items-center justify-between text-xs text-emerald-300">
                      <span className="flex items-center gap-1.5 font-bold">
                        <FileCheck className="w-4 h-4 text-emerald-400" />
                        فیش واریزی پیوست گردید (آماده ارسال برای بررسی ادمین)
                      </span>
                      <button
                        onClick={() => {
                          setReceiptUploaded(false);
                          setReceiptDataUrl('');
                        }}
                        className="text-[10px] underline hover:opacity-80 text-zinc-300 cursor-pointer"
                      >
                        تغییر فیش
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="pt-2">
              {isFull ? (
                <PushButton
                  variant="secondary"
                  size="lg"
                  fullWidth
                  disabled
                  onClick={() => playError()}
                >
                  🔒 تکمیل ظرفیت
                </PushButton>
              ) : isDuplicateRegistration ? (
                <PushButton
                  variant="secondary"
                  size="lg"
                  fullWidth
                  disabled
                  onClick={() => playError()}
                >
                  {alreadyHasTicket
                    ? '✅ قبلاً در این کارگاه ثبت‌نام کرده‌اید'
                    : '⏳ فیش شما در انتظار بررسی ادمین است'}
                </PushButton>
              ) : (
                <PushButton
                  variant="gold"
                  size="lg"
                  fullWidth
                  disabled={isSubmitting || (finalPrice > 0 && !receiptUploaded)}
                  onClick={handleConfirmOrder}
                >
                  {isSubmitting
                    ? 'در حال ارسال اطلاعات...'
                    : finalPrice === 0
                    ? 'تأیید و دریافت فوری بلیط رایگان ✨'
                    : '📤 ارسال فیش واریزی برای بررسی و تایید ادمین'}
                </PushButton>
              )}
            </div>
          </div>
        ) : step === 'pending_approval' ? (
          /* STEP 2A: PAID WORKSHOP RECEIPT SUBMITTED -> WAITING FOR ADMIN APPROVAL */
          <div className="space-y-4 animate-fade-in text-center py-2">
            <div className="rounded-3xl border-2 border-amber-500/60 bg-gradient-to-br from-[#1C2826] via-[#1A2424] to-[#122020] p-5 shadow-2xl space-y-3 text-right text-[#F6F1E7]">
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-lg">
                    ⏳
                  </div>
                  <div>
                    <span className="text-[11px] text-amber-400 font-black block">
                      ⏳ در انتظار بررسی و تایید فیش توسط ادمین
                    </span>
                    <h4 className="font-black text-sm text-[#F6F1E7]">{event.title}</h4>
                  </div>
                </div>
                {pendingTrackingCode && (
                  <span className="text-[10px] font-mono text-[#D4AB58] px-2 py-0.5 rounded bg-black/40 border border-[#D4AB58]/30">
                    {pendingTrackingCode}
                  </span>
                )}
              </div>

              <p className="text-xs leading-relaxed text-[#E2ECE7]">
                تصویر فیش واریزی شما به مبلغ{' '}
                <span className="font-black text-[#D4AB58]">
                  {finalPrice.toLocaleString('fa-IR')} تومان
                </span>{' '}
                با موفقیت به کارتابل مدیریت و ربات تلگرام ارسال گردید.
              </p>

              <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-[11px] text-amber-200 font-bold leading-relaxed">
                📌 بلیط الکترونیکی QR و امتیاز شرکت در کارگاه (+{event.rewardPoints} الماس) بلافاصله پس از بررسی و تایید فیش توسط ادمین در بخش ۲ صادر شده و به چت تلگرام و پروفایل شما ارسال می‌گردد.
              </div>
            </div>

            <PushButton variant="secondary" fullWidth onClick={onClose}>
              متوجه شدم • بازگشت به برنامه رویدادها
            </PushButton>
          </div>
        ) : (
          /* STEP 2B: FREE / 100% DISCOUNT -> 100% REAL SCANNABLE QR TICKET */
          generatedTicket && (
            <div className="space-y-4 animate-fade-in text-center">
              <div className="rounded-3xl border-2 border-[#D4AB58] bg-gradient-to-br from-[#1C2826] via-[#1A2424] to-[#122020] p-5 shadow-2xl space-y-4 text-right relative overflow-hidden text-[#F6F1E7]">
                <div className="absolute top-1/2 -left-3 w-6 h-6 rounded-full bg-[#141C24] border-r-2 border-[#D4AB58]" />
                <div className="absolute top-1/2 -right-3 w-6 h-6 rounded-full bg-[#141C24] border-l-2 border-[#D4AB58]" />

                <div className="flex items-center justify-between border-b border-white/10 pb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-10 h-10 rounded-xl bg-[#D4AB58]/20 border border-[#D4AB58]/40 p-1 flex items-center justify-center">
                      <PixelImage
                        filename="33_icon_ticket_gold.png"
                        alt="بلیط طلایی"
                        className="w-8 h-8 object-contain"
                      />
                    </div>
                    <div>
                      <span className="text-[10px] text-emerald-400 font-bold block">
                        بلیط رسمی با بارکد QR استاندارد قابل اسکن
                      </span>
                      <h4 className="font-black text-sm text-[#F6F1E7]">
                        {generatedTicket.eventTitle}
                      </h4>
                    </div>
                  </div>
                  <span className="text-[10px] font-mono text-[#D4AB58] px-2 py-0.5 rounded bg-black/40 border border-[#D4AB58]/30">
                    {generatedTicket.trackingCode}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="opacity-60 block text-[10px]">دانشجو:</span>
                    <span className="font-bold text-[#D4AB58]">{generatedTicket.studentName}</span>
                  </div>
                  <div>
                    <span className="opacity-60 block text-[10px]">شماره دانشجویی:</span>
                    <span className="font-mono font-bold">{generatedTicket.studentId}</span>
                  </div>
                  <div className="flex items-center gap-1 opacity-80">
                    <Calendar className="w-3.5 h-3.5 text-[#E77F6E]" />
                    <span>{generatedTicket.eventDate}</span>
                  </div>
                  <div className="flex items-center gap-1 opacity-80">
                    <Clock className="w-3.5 h-3.5 text-[#7FB69E]" />
                    <span>{generatedTicket.eventTime}</span>
                  </div>
                  <div className="col-span-2 flex items-center gap-1 opacity-80">
                    <MapPin className="w-3.5 h-3.5 text-[#91B5BE]" />
                    <span className="truncate">{generatedTicket.location}</span>
                  </div>
                </div>

                {/* 100% Real Scannable ISO/IEC 18004 QR Code + PNG Download */}
                <div className="pt-3 border-t border-dashed border-white/20 flex flex-col items-center justify-center space-y-2">
                  <RealQrCode
                    payload={generatedTicket.qrPayload}
                    size={136}
                    showDownload
                    downloadFilename={`ie-ticket-${generatedTicket.trackingCode}`}
                  />
                  <div className="text-[10px] text-zinc-400 font-mono tracking-wider break-all text-center" dir="ltr">
                    {generatedTicket.qrPayload}
                  </div>
                  <span className="text-[10px] text-emerald-400 font-bold">
                    ✨ این عکس QR واقعی است و با اسکنر دوربین یا آپلود عکس در پنل ادمین اسکن می‌شود!
                  </span>
                </div>
              </div>

              <div className="space-y-2 pt-1">
                {!telegramPushSent ? (
                  <PushButton
                    variant="primary"
                    fullWidth
                    disabled={isSendingTelegram}
                    onClick={handleSendToTelegram}
                    icon={<Send className="w-4 h-4 text-emerald-400" />}
                  >
                    {isSendingTelegram
                      ? 'در حال ارسال به ربات...'
                      : '📩 ارسال تصویر بلیط QR به چت ربات تلگرام'}
                  </PushButton>
                ) : (
                  <div className="p-3 rounded-2xl bg-emerald-950/60 border border-emerald-500/60 text-xs text-emerald-300 font-bold flex items-center justify-center gap-2 animate-fade-in">
                    <Check className="w-4 h-4 text-emerald-400 stroke-[3]" />
                    <span>بلیط QR با موفقیت به چت تلگرام شما فرستاده شد!</span>
                  </div>
                )}

                <PushButton variant="secondary" fullWidth onClick={onClose}>
                  بازگشت به برنامه رویدادها
                </PushButton>
              </div>
            </div>
          )
        )}
      </div>
    </div>
  );
};
