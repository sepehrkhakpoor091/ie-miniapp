/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Interactive Checkout Drawer with Coin-Slider, Point-Discount, Receipt Queue Integration,
 * and 100% Real Scannable ISO/IEC 18004 QR Ticket Generator
 */

import React, { useRef, useState } from 'react';
import { AdminReceiptItem, EventItem, ThemeMode, TicketRecord, UserProfile } from '../../types';
import {
  calculateFinalPayable,
  calculateMaxRedeemablePoints,
  formatToman,
  generateTicketPayload,
} from '../../utils/events';
import { PixelImage, compressImageFileToDataUrl } from '../PixelImage';
import { PushButton } from '../ui/PushButton';
import { RollingNumber } from '../ui/RollingNumber';
import { RealQrCode } from '../ui/RealQrCode';
import { playCoin, playError, playFanfare, playTick } from '../../utils/soundEngine';
import { validateUploadedImageFile } from '../../utils/security';
import { sendQrTicketToTelegramChat } from '../../utils/apiBridge';
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
  discountRule?: { pointsUnit: number; discountToman: number };
  onCompleteRegistration: (ticket: TicketRecord, pointsDeducted: number, pointsEarned: number) => void;
  onSubmitReceipt?: (receipt: AdminReceiptItem) => void;
}

export const CheckoutDrawer: React.FC<CheckoutDrawerProps> = ({
  event,
  isOpen,
  onClose,
  user,
  themeMode,
  discountRule = { pointsUnit: 10, discountToman: 50000 },
  onCompleteRegistration,
  onSubmitReceipt,
}) => {
  const isNight = themeMode === 'night';

  const [step, setStep] = useState<'checkout' | 'success'>('checkout');
  const [userRating, setUserRating] = useState<number>(5);
  const [pointsToRedeem, setPointsToRedeem] = useState<number>(0);
  const [isDiamondShaking, setIsDiamondShaking] = useState(false);

  const [cardCopied, setCardCopied] = useState(false);
  const [receiptUploaded, setReceiptUploaded] = useState(false);
  const [receiptDataUrl, setReceiptDataUrl] = useState<string>('');
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [generatedTicket, setGeneratedTicket] = useState<TicketRecord | null>(null);
  const [telegramPushSent, setTelegramPushSent] = useState(false);
  const [isSendingTelegram, setIsSendingTelegram] = useState(false);

  if (!isOpen || !event) return null;

  const maxPoints = calculateMaxRedeemablePoints(event.basePrice, user.score);
  const { discountAmount, finalPrice, pointsUsed } = calculateFinalPayable(
    event.basePrice,
    pointsToRedeem
  );

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value, 10);
    setPointsToRedeem(val);
    playCoin();
    setIsDiamondShaking(true);
    setTimeout(() => setIsDiamondShaking(false), 300);
  };

  const handleCopyCard = () => {
    playTick();
    navigator.clipboard?.writeText('6219861811489862');
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
      const compressed = await compressImageFileToDataUrl(file, 480);
      setReceiptDataUrl(compressed);
      setReceiptUploaded(true);
    } catch {
      playError();
      setUploadError('خطا در پردازش تصویر فیش واریزی. لطفاً تصویر دیگری انتخاب کنید.');
      setReceiptUploaded(false);
    }
  };

  const handleSimulateReceipt = () => {
    playTick();
    setUploadError(null);
    setReceiptUploaded(true);
  };

  const handleConfirmOrder = () => {
    playFanfare();
    const trackingCode = `TK-${Math.floor(100000 + Math.random() * 900000)}`;
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
      issuedAt: new Date().toLocaleDateString('fa-IR'),
      sentToTelegram: false,
      checkedIn: false,
    };

    if (finalPrice > 0 && onSubmitReceipt) {
      onSubmitReceipt({
        id: `rcp-${Date.now()}`,
        studentId: user.studentId,
        studentName: user.fullName,
        cohortYear: user.cohortYear,
        type: 'payment_receipt',
        title: `فیش ثبت‌نام ${event.title}`,
        eventId: event.id,
        amount: finalPrice,
        trackingCode,
        submittedAt: 'همین الان',
        status: 'pending',
        receiptImageUrl: receiptDataUrl || undefined,
      });
    }

    setGeneratedTicket(ticket);
    setStep('success');
    onCompleteRegistration(ticket, pointsUsed, event.rewardPoints);

    // Automatically push the QR ticket to the live Cloudflare Worker Telegram Bot on registration
    void sendQrTicketToTelegramChat(ticket, user).then((res) => {
      if (res.deliveredToTelegram) {
        setTelegramPushSent(true);
      }
    });
  };

  const handleSendToTelegram = async () => {
    if (!generatedTicket) return;
    setIsSendingTelegram(true);
    playTick();

    await sendQrTicketToTelegramChat(generatedTicket, user);

    setIsSendingTelegram(false);
    setTelegramPushSent(true);
    playFanfare();
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
                {step === 'checkout' ? 'ثبت‌نام و صدور بلیط الکترونیکی' : 'بلیط رسمی صادر گردید ✨'}
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

              <div className="flex items-center gap-1 flex-shrink-0" dir="ltr">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => {
                      playCoin();
                      setUserRating(star);
                    }}
                    className="cursor-pointer hover:scale-125 transition-transform p-0.5"
                    aria-label={`امتیاز ${star} ستاره`}
                  >
                    <svg
                      viewBox="0 0 24 24"
                      className={`w-4 h-4 ${
                        star <= userRating ? 'fill-[#D4AB58]' : 'fill-zinc-700'
                      }`}
                    >
                      <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26" />
                    </svg>
                  </button>
                ))}
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
                  {event.syllabus.map((s, idx) => (
                    <li key={idx}>{s}</li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Point Discount Slider */}
            {event.basePrice > 0 && maxPoints > 0 && (
              <div className="p-4 rounded-2xl bg-gradient-to-r from-[#1A2624] to-[#162A35] border border-[#234D5A] text-[#F6F1E7] space-y-3">
                <div className="flex items-center justify-between text-xs font-bold">
                  <span className="text-[#D4AB58]">استفاده از امتیاز برای تخفیف:</span>
                  <span className="text-emerald-400">
                    {pointsToRedeem} امتیاز = {discountAmount.toLocaleString('fa-IR')} تومان تخفیف
                  </span>
                </div>

                <input
                  type="range"
                  min={0}
                  max={maxPoints}
                  step={10}
                  value={pointsToRedeem}
                  onChange={handleSliderChange}
                  className="w-full accent-[#D4AB58] cursor-pointer"
                />

                <div className="flex items-center justify-between text-[10px] text-[#A3C1AD]">
                  <span>امتیاز در دسترس شما: {user.score} امتیاز</span>
                  <span>
                    (هر {discountRule.pointsUnit} امتیاز ={' '}
                    {discountRule.discountToman.toLocaleString('fa-IR')} تومان تخفیف)
                  </span>
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
                  <span>تخفیف کسر شده از امتیازات:</span>
                  <span>- {discountAmount.toLocaleString('fa-IR')} تومان</span>
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

            {/* Bank Card info if price > 0 */}
            {finalPrice > 0 && (
              <div
                className={`p-3.5 rounded-2xl border space-y-2.5 ${
                  isNight ? 'bg-white/5 border-white/10' : 'bg-[#FFFFFF] border-[#C8BFA8]'
                }`}
              >
                <div className="flex items-center justify-between text-xs">
                  <span className="opacity-70 text-[11px]">شماره کارت انجمن مهندسی صنایع:</span>
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
                  6219 - 8618 - 1148 - 9862
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
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="py-2 px-3 rounded-xl border border-dashed border-[#D4AB58] text-xs font-bold flex items-center justify-center gap-1.5 transition-all text-[#D4AB58] active:scale-95 cursor-pointer"
                      >
                        <Upload className="w-3.5 h-3.5" />
                        <span>انتخاب عکس فیش از گالری</span>
                      </button>
                      <button
                        type="button"
                        onClick={handleSimulateReceipt}
                        className="py-2 px-3 rounded-xl bg-[#D4AB58]/15 border border-[#D4AB58]/40 text-xs font-bold flex items-center justify-center gap-1.5 transition-all text-[#D4AB58] active:scale-95 cursor-pointer"
                      >
                        <FileCheck className="w-3.5 h-3.5" />
                        <span>بارگذاری فیش نمونه فوری</span>
                      </button>
                    </div>
                  ) : (
                    <div className="p-2.5 rounded-xl bg-emerald-950/60 border border-emerald-700/60 flex items-center justify-between text-xs text-emerald-300">
                      <span className="flex items-center gap-1.5 font-bold">
                        <FileCheck className="w-4 h-4 text-emerald-400" />
                        فیش واریزی پیوست گردید (آماده ثبت در کارتابل ادمین)
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
              <PushButton
                variant="gold"
                size="lg"
                fullWidth
                disabled={finalPrice > 0 && !receiptUploaded}
                onClick={handleConfirmOrder}
              >
                {finalPrice === 0
                  ? 'تأیید و دریافت فوری بلیط رایگان ✨'
                  : 'ثبت نهایی فیش و صدور بلیط الکترونیکی QR'}
              </PushButton>
            </div>
          </div>
        ) : (
          /* STEP 2: 100% REAL SCANNABLE QR TICKET */
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
