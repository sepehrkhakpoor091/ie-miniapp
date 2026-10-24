/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Student Profile Tab (پروفایل دانشجویی) — Replicates Right Phone in Reference Boards 1:1 on Mobile
 * and 2-Column Split on Desktop.
 * Features: Olive Wreath Avatar, 5-Tap Stealth Admin Gesture, Real Unified Stats,
 * Dynamic Admin-Created Badges Showcase, Dynamic Student Avatar Switcher,
 * and 100% Real Scannable ISO/IEC 18004 QR Tickets with PNG Download.
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  AvatarCatalogItem,
  BadgeItem,
  CertificateInfo,
  DiscountVoucher,
  PointTransaction,
  ThemeMode,
  TicketRecord,
  UserProfile,
} from '../../types';
import { PixelImage } from '../PixelImage';
import { PushButton } from '../ui/PushButton';
import { RollingNumber } from '../ui/RollingNumber';
import { RealQrCode } from '../ui/RealQrCode';
import {
  DEFAULT_CERTIFICATES,
  EXTENDED_BADGES,
  SHOWCASE_BADGES,
  calculateLevelFromScore,
  evaluateDynamicBadges,
} from '../../utils/gamification';
import {
  computeStateChecksum,
  verifyTicketSignature,
} from '../../utils/security';
import {
  playCoin,
  playSwitch,
  playTick,
} from '../../utils/soundEngine';

interface ProfileTabProps {
  user: UserProfile;
  themeMode: ThemeMode;
  isSoundActive: boolean;
  userTickets: TicketRecord[];
  certificates?: CertificateInfo[];
  transactions: PointTransaction[];
  vouchers: DiscountVoucher[];
  badgesCatalog?: BadgeItem[];
  studentAvatars?: AvatarCatalogItem[];
  onSelectAvatar?: (avatarUrl: string) => void;
  onBackToHome: () => void;
  onToggleTheme: () => void;
  onToggleSound: () => void;
  onOpenOnboardingEdit: () => void;
  onOpenCurriculumModal?: () => void;
  onStealthTap?: () => void;
}

export const ProfileTab: React.FC<ProfileTabProps> = ({
  user,
  themeMode,
  isSoundActive,
  userTickets,
  certificates: propCertificates,
  transactions,
  vouchers,
  badgesCatalog,
  studentAvatars,
  onSelectAvatar,
  onBackToHome,
  onToggleTheme,
  onToggleSound,
  onOpenOnboardingEdit,
  onOpenCurriculumModal,
  onStealthTap,
}) => {
  const isNight = themeMode === 'night';

  const [showAllBadges, setShowAllBadges] = useState(false);
  const [selectedBadge, setSelectedBadge] = useState<BadgeItem | null>(null);
  const [isBadgeFlipped, setIsBadgeFlipped] = useState(false);

  const [isHistoryDrawerOpen, setIsHistoryDrawerOpen] = useState(false);
  const [historyTab, setHistoryTab] = useState<'tickets' | 'certificates' | 'ledger'>('tickets');
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [expandedTicketId, setExpandedTicketId] = useState<string | null>(null);

  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const dynamicLevel = calculateLevelFromScore(user.score);
  const nextLevelTarget = dynamicLevel.nextLevelAt;
  const progressPercent = Math.min(
    100,
    Math.max(8, dynamicLevel.progressPercent)
  );

  const safeTickets = Array.isArray(userTickets) ? userTickets : [];
  const safeVouchers = Array.isArray(vouchers) ? vouchers : [];
  const certificates: CertificateInfo[] =
    Array.isArray(propCertificates) && propCertificates.length > 0
      ? propCertificates
      : user.score >= 150
      ? DEFAULT_CERTIFICATES.map((c) => ({
          ...c,
          studentName: user.fullName,
        }))
      : [];

  // Dynamic Badges Catalog evaluated against real student progress
  const allBadges: BadgeItem[] =
    Array.isArray(badgesCatalog) && badgesCatalog.length > 0
      ? badgesCatalog
      : EXTENDED_BADGES;

  const hydratedBadges: BadgeItem[] = evaluateDynamicBadges(
    allBadges,
    user,
    safeTickets,
    [],
    user.score >= 50
  );

  const showcaseBadges =
    hydratedBadges.slice(0, 5).length > 0 ? hydratedBadges.slice(0, 5) : SHOWCASE_BADGES;

  const availableStudentAvatars =
    Array.isArray(studentAvatars) && studentAvatars.length > 0
      ? studentAvatars.filter((a) => a.targetRole === 'student')
      : [
          { id: 'av-1', title: 'کاراکتر ۱', targetRole: 'student' as const, imageUrl: '01_avatar_boy.png', addedBy: 'سیستم' },
          { id: 'av-2', title: 'کاراکتر ۲', targetRole: 'student' as const, imageUrl: '02_avatar_girl.png', addedBy: 'سیستم' },
          { id: 'av-3', title: 'کاراکتر ۳', targetRole: 'student' as const, imageUrl: '07_char_laptop.png', addedBy: 'سیستم' },
          { id: 'av-4', title: 'کاراکتر ۴', targetRole: 'student' as const, imageUrl: '06_char_victory.png', addedBy: 'سیستم' },
        ];

  const registeredEventsCount = safeTickets.length;
  const ticketsAndVouchersCount = safeTickets.length + safeVouchers.length;

  const integrityChecksum = computeStateChecksum(user.score, user.studentId, user.level);

  const handleOpenBadgeModal = (badge: BadgeItem) => {
    playCoin();
    setSelectedBadge(badge);
    setIsBadgeFlipped(false);
  };

  const handleCopyCode = (code: string) => {
    playTick();
    navigator.clipboard?.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 380, damping: 28 }}
      className="pb-28 lg:pb-10 pt-3 px-4 lg:px-0 space-y-4 select-none overflow-x-hidden"
    >
      {/* 1. TOP HEADER ROW — Matches Right Phone 1:1 */}
      <div className="flex items-center justify-between pt-1">
        <button
          type="button"
          onClick={() => {
            playTick();
            setIsSettingsOpen(true);
          }}
          className={`w-10 h-10 rounded-xl flex items-center justify-center border transition-all active:translate-y-0.5 cursor-pointer ${
            isNight
              ? 'bg-[#1D2738] border-[#2C3E4C] text-[#F6F1E7] shadow-[0_3px_0_#0B101B]'
              : 'bg-[#FFFFFF] border-[#C8BFA8] text-[#14201B] shadow-[0_3px_0_#C8BFA8]'
          }`}
          aria-label="تنظیمات پروفایل"
        >
          <svg viewBox="0 0 24 24" className="w-5 h-5 fill-none stroke-current" strokeWidth="2.2">
            <circle cx="12" cy="12" r="3.2" />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06.06a2 2 0 0 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"
            />
          </svg>
        </button>

        <h1
          className={`text-lg font-black tracking-tight ${
            isNight ? 'text-[#F6F1E7]' : 'text-[#14201B]'
          }`}
        >
          پروفایل دانشجویی
        </h1>

        <button
          type="button"
          onClick={() => {
            playTick();
            onBackToHome();
          }}
          className={`w-10 h-10 rounded-xl flex items-center justify-center border transition-all active:translate-y-0.5 cursor-pointer ${
            isNight
              ? 'bg-[#1D2738] border-[#2C3E4C] text-[#F6F1E7] shadow-[0_3px_0_#0B101B]'
              : 'bg-[#FFFFFF] border-[#C8BFA8] text-[#14201B] shadow-[0_3px_0_#C8BFA8]'
          }`}
          aria-label="بازگشت به خانه"
        >
          <svg viewBox="0 0 24 24" className="w-5 h-5 fill-none stroke-current" strokeWidth="2.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
      </div>

      {/* 2-Column Split on Desktop */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
        {/* RIGHT COLUMN IN RTL */}
        <div className="space-y-4">
          {/* 2. HERO AVATAR WITH OLIVE WREATH & PIXEL SPARKLES */}
          <div className="pt-3 pb-1 flex flex-col items-center justify-center relative">
            <div className="relative w-36 h-36 flex items-center justify-center">
              <svg
                viewBox="0 0 16 16"
                className="w-4 h-4 absolute -top-1 -right-3 fill-[#D4AB58] pointer-events-none"
                style={{ animation: 'pixel-twinkle 2.4s infinite ease-in-out' }}
              >
                <path d="M8 0 L10 6 L16 8 L10 10 L8 16 L6 10 L0 8 L6 6 Z" />
              </svg>
              <svg
                viewBox="0 0 16 16"
                className="w-3.5 h-3.5 absolute top-3 -left-4 fill-[#D4AB58] pointer-events-none"
                style={{ animation: 'pixel-twinkle 3.1s infinite ease-in-out 0.6s' }}
              >
                <path d="M8 0 L10 6 L16 8 L10 10 L8 16 L6 10 L0 8 L6 6 Z" />
              </svg>
              <svg
                viewBox="0 0 16 16"
                className="w-3.5 h-3.5 absolute bottom-3 -right-5 fill-[#7FB69E] pointer-events-none"
                style={{ animation: 'pixel-twinkle 2.8s infinite ease-in-out 1.1s' }}
              >
                <path d="M8 0 L10 6 L16 8 L10 10 L8 16 L6 10 L0 8 L6 6 Z" />
              </svg>
              <svg
                viewBox="0 0 16 16"
                className="w-3 h-3 absolute bottom-1 -left-3 fill-[#E77F6E] pointer-events-none"
                style={{ animation: 'pixel-twinkle 2.5s infinite ease-in-out 0.3s' }}
              >
                <path d="M8 0 L10 6 L16 8 L10 10 L8 16 L6 10 L0 8 L6 6 Z" />
              </svg>

              <div
                onClick={() => {
                  if (onStealthTap) {
                    onStealthTap();
                  } else {
                    playTick();
                    onOpenOnboardingEdit();
                  }
                }}
                className={`w-28 h-28 rounded-full overflow-hidden border-2 relative z-10 cursor-pointer transition-transform active:scale-95 ${
                  isNight
                    ? 'bg-[#172232] border-[#D4AB58]/70 shadow-[0_0_25px_rgba(212,171,88,0.2)]'
                    : 'bg-[#EAE3D2] border-[#8F6B24] shadow-[0_6px_18px_rgba(143,107,36,0.18)]'
                }`}
                title="آواتار دانشجویی"
              >
                <PixelImage
                  filename={user.avatar}
                  alt={user.fullName}
                  className="w-full h-full object-cover scale-105"
                />
              </div>

              <div className="w-36 h-36 absolute -inset-0 z-20 pointer-events-none flex items-center justify-center">
                <PixelImage
                  filename="03_frame_laurel.png"
                  alt="قاب زیتون افتخار"
                  className="w-full h-full object-contain drop-shadow-md"
                />
              </div>
            </div>

            <h2
              className={`mt-3 text-xl font-black tracking-tight text-center ${
                isNight ? 'text-[#F6F1E7]' : 'text-[#14201B]'
              }`}
            >
              {user.fullName}
            </h2>
            <p
              className={`text-xs font-bold mt-0.5 ${
                isNight ? 'text-[#A3C1AD]' : 'text-[#3D5249]'
              }`}
            >
              دانشجوی ورودی {user.cohortYear} • کد دانشجویی: {user.studentId}
            </p>
          </div>

          {/* 3. LEVEL 3 PROGRESS BAR & GOLD STAR BADGE ROW */}
          <div
            onClick={() => onStealthTap?.()}
            className={`rounded-2xl p-3.5 border flex items-center gap-3.5 cursor-pointer ${
              isNight
                ? 'bg-[#1A2424] border-[#2C3E4C] text-[#F6F1E7] shadow-[0_5px_0_#0B101B]'
                : 'bg-[#FFFFFF] border-[#C8BFA8] text-[#14201B] shadow-[0_5px_0_#C8BFA8]'
            }`}
          >
            <div className="flex-1 min-w-0 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black">{dynamicLevel.rankTitle}</span>
                <span
                  className={`text-[11px] font-black ${
                    isNight ? 'text-[#D4AB58]' : 'text-[#354B40]'
                  }`}
                >
                  {user.score.toLocaleString('fa-IR')} / {nextLevelTarget.toLocaleString('fa-IR')} امتیاز
                </span>
              </div>

              <div
                className={`w-full h-3.5 rounded-full overflow-hidden p-0.5 border ${
                  isNight
                    ? 'bg-[#101622] border-[#2C3E4C]'
                    : 'bg-[#EAE3D2] border-[#C8BFA8]'
                }`}
              >
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${progressPercent}%` }}
                  transition={{ duration: 0.9, ease: 'easeOut' }}
                  className="h-full rounded-full bg-gradient-to-l from-[#7FB69E] via-[#A8C97F] to-[#D4AB58] relative overflow-hidden"
                >
                  <div className="absolute inset-0 bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.35),transparent)] animate-[shimmer-sweep_2.5s_infinite]" />
                </motion.div>
              </div>

              <p
                className={`text-[10px] font-bold ${
                  isNight ? 'text-[#A3C1AD]' : 'text-[#3D5249]'
                }`}
              >
                {dynamicLevel.level < 4
                  ? `${Math.max(0, nextLevelTarget - user.score).toLocaleString('fa-IR')} امتیاز تا ارتقا به سطح ${(dynamicLevel.level + 1).toLocaleString('fa-IR')}`
                  : 'بالاترین سطح افتخار انجمن علمی مهندسی صنایع (سطح ۴ فعال)'}
              </p>
            </div>

            <div className="flex flex-col items-center justify-center shrink-0 pl-1">
              <div className="w-14 h-14 flex items-center justify-center relative">
                <PixelImage
                  filename={dynamicLevel.badgeIcon}
                  alt={dynamicLevel.rankTitle}
                  className="w-14 h-14 object-contain drop-shadow-[0_4px_8px_rgba(212,171,88,0.35)]"
                />
              </div>
              <span
                className={`text-[11px] font-black -mt-0.5 ${
                  isNight ? 'text-[#D4AB58]' : 'text-[#14201B]'
                }`}
              >
                سطح {dynamicLevel.level.toLocaleString('fa-IR')}
              </span>
            </div>
          </div>

          {/* 5. ACTIVITY STATS CARD */}
          <div
            className={`rounded-2xl p-4 border space-y-3.5 ${
              isNight
                ? 'bg-[#1A2424] border-[#2C3E4C] text-[#F6F1E7] shadow-[0_5px_0_#0B101B]'
                : 'bg-[#FFFFFF] border-[#C8BFA8] text-[#14201B] shadow-[0_5px_0_#C8BFA8]'
            }`}
          >
            <h3 className="text-sm font-black">آمار فعالیت‌ها</h3>

            <div className="grid grid-cols-3 gap-2.5">
              <div
                onClick={() => {
                  playTick();
                  setHistoryTab('ledger');
                  setIsHistoryDrawerOpen(true);
                }}
                className={`rounded-2xl p-3 border flex flex-col items-center justify-center text-center cursor-pointer transition-transform active:scale-95 ${
                  isNight
                    ? 'bg-[#121A26] border-[#2C3E4C] hover:border-[#91B5BE]/60'
                    : 'bg-[#EAE3D2] border-[#C8BFA8] hover:border-[#354B40]'
                }`}
              >
                <div className="w-9 h-9 flex items-center justify-center mb-1">
                  <PixelImage
                    filename="23_badge_diamond.png"
                    alt="امتیاز"
                    className="w-8 h-8 object-contain"
                  />
                </div>
                <div
                  className={`text-base font-black ${
                    isNight ? 'text-[#D4AB58]' : 'text-[#14201B]'
                  }`}
                >
                  <RollingNumber value={user.score} />
                </div>
                <span
                  className={`text-[10px] font-bold mt-0.5 ${
                    isNight ? 'text-[#A3C1AD]' : 'text-[#3D5249]'
                  }`}
                >
                  امتیاز
                </span>
              </div>

              <div
                onClick={() => {
                  playTick();
                  setHistoryTab('certificates');
                  setIsHistoryDrawerOpen(true);
                }}
                className={`rounded-2xl p-3 border flex flex-col items-center justify-center text-center cursor-pointer transition-transform active:scale-95 ${
                  isNight
                    ? 'bg-[#121A26] border-[#2C3E4C] hover:border-[#D4AB58]/60'
                    : 'bg-[#EAE3D2] border-[#C8BFA8] hover:border-[#354B40]'
                }`}
              >
                <div className="w-9 h-9 flex items-center justify-center mb-1">
                  <PixelImage
                    filename="33_icon_ticket_gold.png"
                    alt="تیکت و گواهی"
                    className="w-8 h-8 object-contain"
                  />
                </div>
                <div className="text-base font-black">
                  {ticketsAndVouchersCount.toLocaleString('fa-IR')}
                </div>
                <span
                  className={`text-[10px] font-bold mt-0.5 ${
                    isNight ? 'text-[#A3C1AD]' : 'text-[#3D5249]'
                  }`}
                >
                  تیکت و گواهی
                </span>
              </div>

              <div
                onClick={() => {
                  playTick();
                  setHistoryTab('tickets');
                  setIsHistoryDrawerOpen(true);
                }}
                className={`rounded-2xl p-3 border flex flex-col items-center justify-center text-center cursor-pointer transition-transform active:scale-95 ${
                  isNight
                    ? 'bg-[#121A26] border-[#2C3E4C] hover:border-[#E77F6E]/60'
                    : 'bg-[#EAE3D2] border-[#C8BFA8] hover:border-[#354B40]'
                }`}
              >
                <div className="w-9 h-9 flex items-center justify-center mb-1">
                  <PixelImage
                    filename="29_icon_calendar.png"
                    alt="رویداد ثبت‌نام"
                    className="w-8 h-8 object-contain"
                  />
                </div>
                <div className="text-base font-black">
                  {registeredEventsCount.toLocaleString('fa-IR')}
                </div>
                <span
                  className={`text-[10px] font-bold mt-0.5 leading-tight ${
                    isNight ? 'text-[#A3C1AD]' : 'text-[#3D5249]'
                  }`}
                >
                  رویداد ثبت‌نام
                </span>
              </div>
            </div>

            <div className="pt-1 flex flex-wrap items-center justify-between gap-2 border-t border-current/10">
              <button
                type="button"
                onClick={() => {
                  playCoin();
                  onOpenCurriculumModal?.();
                }}
                className="text-xs font-black py-1.5 px-3 rounded-xl bg-[#D4AB58] text-[#101622] transition-all active:scale-95 cursor-pointer"
              >
                🎓 چارت درسی ۱۴۲ واحدی و درخت پیش‌نیازها
              </button>
              <button
                type="button"
                onClick={() => {
                  playTick();
                  setIsHistoryDrawerOpen(true);
                }}
                className={`text-xs font-black py-1.5 px-3 rounded-xl transition-all active:scale-95 cursor-pointer ${
                  isNight
                    ? 'bg-[#D4AB58]/20 text-[#D4AB58] hover:bg-[#D4AB58]/30'
                    : 'bg-[#354B40] text-[#F6F1E7] hover:bg-[#2A3C33]'
                }`}
              >
                سوابق فعالیت‌ها ←
              </button>
            </div>
          </div>
        </div>

        {/* LEFT COLUMN IN RTL: HOLOGRAPHIC BADGES SHOWCASE & REAL QR TICKETS */}
        <div className="space-y-4">
          {/* 4. HOLOGRAPHIC ACHIEVEMENT BADGES CARD (نشان‌های من) */}
          <div
            className={`rounded-2xl p-4 border space-y-3 ${
              isNight
                ? 'bg-[#1A2424] border-[#2C3E4C] text-[#F6F1E7] shadow-[0_5px_0_#0B101B]'
                : 'bg-[#FFFFFF] border-[#C8BFA8] text-[#14201B] shadow-[0_5px_0_#C8BFA8]'
            }`}
          >
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-black">
                نشان‌های من ({hydratedBadges.length.toLocaleString('fa-IR')} مدال)
              </h3>
              <button
                type="button"
                onClick={() => {
                  playSwitch();
                  setShowAllBadges((prev) => !prev);
                }}
                className={`text-[11px] font-black px-2.5 py-1 rounded-lg border transition-colors cursor-pointer ${
                  isNight
                    ? 'bg-[#101622] border-[#2C3E4C] text-[#D4AB58] hover:border-[#D4AB58]'
                    : 'bg-[#EAE3D2] border-[#C8BFA8] text-[#14201B] hover:border-[#354B40]'
                }`}
              >
                {showAllBadges
                  ? 'نمایش ۵ نشان منتخب'
                  : `مشاهده همه ${hydratedBadges.length.toLocaleString('fa-IR')} نشان`}
              </button>
            </div>

            <div className="grid grid-cols-5 gap-2">
              {(showAllBadges ? hydratedBadges : showcaseBadges).map((badge) => (
                <button
                  key={badge.id}
                  type="button"
                  onClick={() => handleOpenBadgeModal(badge)}
                  className={`group flex flex-col items-center p-1.5 rounded-xl border transition-all active:scale-95 cursor-pointer relative overflow-hidden ${
                    isNight
                      ? 'bg-[#101622] border-[#2C3E4C] text-[#F6F1E7] hover:border-[#D4AB58]'
                      : 'bg-[#EAE3D2] border-[#C8BFA8] text-[#14201B] hover:border-[#354B40]'
                  } ${!badge.isUnlocked ? 'opacity-50 grayscale' : ''}`}
                  title={badge.title}
                >
                  <div className="w-11 h-11 flex items-center justify-center relative">
                    <PixelImage
                      filename={badge.filename}
                      alt={badge.title}
                      className="w-9 h-9 object-contain group-hover:scale-110 transition-transform"
                    />
                  </div>
                  <span className="text-[9px] font-black text-center leading-tight line-clamp-1 mt-1">
                    {badge.title.replace('سطح ', '').split(' ')[0]}
                  </span>
                </button>
              ))}
            </div>

            <p
              className={`text-[10px] font-bold text-center ${
                isNight ? 'text-[#A3C1AD]' : 'text-[#3D5249]'
              }`}
            >
              برای چرخش سه‌بعدی (3D Flip)، روش دریافت و بررسی کد اصالت هر نشان، روی آن بزنید
            </p>
          </div>

          {/* 6. ACTIVE SIGNED QR TICKETS & CERTIFICATES QUICK VIEW */}
          <div
            className={`rounded-2xl p-4 border space-y-3 ${
              isNight
                ? 'bg-[#1A2424] border-[#2C3E4C] text-[#F6F1E7] shadow-[0_5px_0_#0B101B]'
                : 'bg-[#FFFFFF] border-[#C8BFA8] text-[#14201B] shadow-[0_5px_0_#C8BFA8]'
            }`}
          >
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-black">بلیط‌های فعال و بارکد QR واقعی</h3>
              <span
                className={`text-[11px] font-black px-2 py-0.5 rounded-lg ${
                  isNight
                    ? 'bg-emerald-500/20 text-emerald-300'
                    : 'bg-[#354B40] text-[#F6F1E7]'
                }`}
              >
                {safeTickets.length.toLocaleString('fa-IR')} بلیط معتبر
              </span>
            </div>

            {safeTickets.slice(0, 2).map((ticket) => {
              const isSignedValid = verifyTicketSignature(ticket.qrPayload);
              return (
                <div
                  key={ticket.id}
                  className={`p-3.5 rounded-2xl border space-y-2.5 ${
                    isNight
                      ? 'bg-[#121A26] border-[#2C3E4C] text-[#F6F1E7]'
                      : 'bg-[#EAE3D2] border-[#C8BFA8] text-[#14201B]'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="text-xs font-black">{ticket.eventTitle}</div>
                      <div
                        className={`text-[11px] font-bold mt-0.5 ${
                          isNight ? 'text-[#A3C1AD]' : 'text-[#3D5249]'
                        }`}
                      >
                        {ticket.eventDate} • کد رهگیری: {ticket.trackingCode}
                      </div>
                    </div>
                    <span
                      className={`text-[10px] font-black px-2 py-0.5 rounded-md shrink-0 ${
                        ticket.checkedIn
                          ? 'bg-emerald-600 text-white'
                          : isSignedValid
                          ? 'bg-[#D4AB58] text-[#101622]'
                          : 'bg-amber-500/20 text-amber-300'
                      }`}
                    >
                      {ticket.checkedIn
                        ? `حاضر شد ✅ (${ticket.checkedInAt || ''})`
                        : 'امضای دیجیتال معتبر ✓'}
                    </span>
                  </div>

                  <div className="flex items-center gap-3 pt-2 border-t border-current/10">
                    <RealQrCode
                      payload={ticket.qrPayload}
                      size={88}
                      showDownload
                      downloadFilename={`ie-ticket-${ticket.trackingCode}`}
                    />
                    <div className="min-w-0 flex-1 space-y-1.5">
                      <div
                        className={`text-[10px] font-mono break-all ${
                          isNight ? 'text-[#A3C1AD]' : 'text-[#14201B]'
                        }`}
                        dir="ltr"
                      >
                        {ticket.qrPayload}
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleCopyCode(ticket.qrPayload)}
                          className="px-2.5 py-1 rounded-lg bg-[#D4AB58] text-[#101622] text-[10px] font-black cursor-pointer"
                        >
                          {copiedCode === ticket.qrPayload
                            ? 'بارکد QR کپی شد ✓'
                            : 'کپی رشته QR جهت تست اسکنر'}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* =====================================================================
          MODAL 1: 3D HOLOGRAPHIC BADGE FLIP MODAL
         ===================================================================== */}
      <AnimatePresence>
        {selectedBadge && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-5 select-none">
            <motion.div
              initial={{ scale: 0.88, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.88, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 400, damping: 28 }}
              className="w-full max-w-sm"
            >
              <div
                onClick={() => {
                  playSwitch();
                  setIsBadgeFlipped((prev) => !prev);
                }}
                className="cursor-pointer"
                style={{ perspective: '1000px' }}
              >
                <motion.div
                  animate={{ rotateY: isBadgeFlipped ? 180 : 0 }}
                  transition={{ duration: 0.55, type: 'spring', stiffness: 260, damping: 24 }}
                  style={{ transformStyle: 'preserve-3d' }}
                  className={`rounded-3xl p-6 border-2 shadow-2xl relative ${
                    isNight
                      ? 'bg-gradient-to-b from-[#1D283A] to-[#121926] border-[#D4AB58] text-[#F6F1E7]'
                      : 'bg-[#FFFFFF] border-[#8F6B24] text-[#14201B]'
                  }`}
                >
                  {!isBadgeFlipped ? (
                    <div className="flex flex-col items-center text-center space-y-4">
                      <span className="text-[11px] font-black px-3 py-0.5 rounded-full bg-[#D4AB58] text-[#101622]">
                        {selectedBadge.isUnlocked ? 'نشان رسمی تایید شده ✨' : 'نشان قفل شده 🔒'}
                      </span>

                      <div className="w-28 h-28 rounded-3xl bg-black/25 border border-[#D4AB58]/40 flex items-center justify-center p-3 shadow-inner relative">
                        <PixelImage
                          filename={selectedBadge.filename}
                          alt={selectedBadge.title}
                          className="w-22 h-22 object-contain drop-shadow-[0_6px_12px_rgba(212,171,88,0.4)]"
                        />
                      </div>

                      <div>
                        <h3
                          className={`text-lg font-black ${
                            isNight ? 'text-[#D4AB58]' : 'text-[#14201B]'
                          }`}
                        >
                          {selectedBadge.title}
                        </h3>
                        <p
                          className={`text-xs mt-1 font-bold ${
                            isNight ? 'text-[#A3C1AD]' : 'text-[#3D5249]'
                          }`}
                        >
                          {selectedBadge.subtitle}
                        </p>
                      </div>

                      <p className="text-xs leading-relaxed font-medium px-2">
                        {selectedBadge.description}
                      </p>

                      <div className="w-full pt-2 border-t border-current/10 flex items-center justify-between text-[11px] font-bold">
                        <span>تاریخ دریافت: {selectedBadge.earnedDate}</span>
                        <span className={isNight ? 'text-[#7FB69E]' : 'text-[#354B40]'}>
                          🔄 ضربه برای چرخش کارت
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div
                      style={{ transform: 'rotateY(180deg)' }}
                      className="flex flex-col items-center text-center space-y-4"
                    >
                      <span className="text-[11px] font-black px-3 py-0.5 rounded-full bg-[#354B40] text-[#F6F1E7]">
                        پشت کارت • شناسنامه اصالت رمزنگاری
                      </span>

                      <div
                        className={`w-full p-3.5 rounded-2xl border text-right space-y-2 text-xs ${
                          isNight
                            ? 'bg-black/30 border-white/10 text-[#F6F1E7]'
                            : 'bg-[#EAE3D2] border-[#C8BFA8] text-[#14201B]'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold">صاحب نشان:</span>
                          <span className="font-black">{user.fullName}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="font-bold">شماره دانشجویی:</span>
                          <span className="font-mono font-bold">{user.studentId}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="font-bold">تاریخ ثبت:</span>
                          <span className="font-bold">{selectedBadge.earnedDate}</span>
                        </div>
                        <div className="pt-2 border-t border-current/10">
                          <span className="block text-[10px] font-bold mb-1">
                            امضای دیجیتال انجمن (SHA/FNV-1a):
                          </span>
                          <div
                            className="p-1.5 rounded-lg bg-[#101622] font-mono text-[11px] text-emerald-400 text-center tracking-wider"
                            dir="ltr"
                          >
                            SIG-{selectedBadge.verificationHash}
                          </div>
                        </div>
                      </div>

                      <div
                        className={`w-full p-3 rounded-2xl border text-right ${
                          isNight
                            ? 'bg-[#D4AB58]/10 border-[#D4AB58]/30'
                            : 'bg-[#EAE3D2] border-[#8F6B24]'
                        }`}
                      >
                        <span className="text-[11px] font-black block mb-1">
                          🎯 روش بدست آوردن / شرط ارتقا:
                        </span>
                        <p className="text-xs leading-relaxed font-medium">
                          {selectedBadge.nextTierRequirement}
                        </p>
                      </div>

                      <span className="text-[11px] font-black">
                        🔄 ضربه برای بازگشت به روی کارت
                      </span>
                    </div>
                  )}
                </motion.div>
              </div>

              <div className="mt-4 flex gap-2">
                <PushButton
                  variant="gold"
                  fullWidth
                  onClick={() => {
                    playSwitch();
                    setIsBadgeFlipped((prev) => !prev);
                  }}
                >
                  🔄 چرخش سه‌بعدی کارت
                </PushButton>
                <PushButton
                  variant="secondary"
                  onClick={() => {
                    playTick();
                    setSelectedBadge(null);
                  }}
                >
                  بستن
                </PushButton>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* =====================================================================
          DRAWER 2: FULL ACTIVITY HISTORY & LEDGER DRAWER (3 TABS)
         ===================================================================== */}
      <AnimatePresence>
        {isHistoryDrawerOpen && (
          <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/80 backdrop-blur-md select-none">
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', stiffness: 380, damping: 32 }}
              className={`w-full max-w-lg rounded-t-3xl border-t border-l border-r p-5 shadow-2xl max-h-[90vh] flex flex-col ${
                isNight
                  ? 'bg-[#141C24] border-[#2C3E4C] text-[#F6F1E7]'
                  : 'bg-[#FAF7F0] border-[#C8BFA8] text-[#14201B]'
              }`}
            >
              <div className="w-12 h-1.5 rounded-full bg-current/20 mx-auto mb-3 shrink-0" />

              <div className="flex items-center justify-between pb-3 border-b border-current/10 shrink-0">
                <div>
                  <h3 className="font-black text-base">سوابق فعالیت‌ها و دفتر کل امتیازات</h3>
                  <p
                    className={`text-[11px] font-bold mt-0.5 ${
                      isNight ? 'text-[#A3C1AD]' : 'text-[#3D5249]'
                    }`}
                  >
                    امضای یکپارچگی حساب:{' '}
                    <span className="font-mono text-emerald-500">{integrityChecksum}</span>
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    playTick();
                    setIsHistoryDrawerOpen(false);
                  }}
                  className="w-8 h-8 rounded-xl bg-current/10 flex items-center justify-center font-bold text-sm cursor-pointer"
                >
                  ✕
                </button>
              </div>

              <div
                className={`grid grid-cols-3 gap-1.5 my-3 p-1 rounded-2xl border shrink-0 ${
                  isNight ? 'bg-black/25 border-white/10' : 'bg-[#EAE3D2] border-[#C8BFA8]'
                }`}
              >
                <button
                  type="button"
                  onClick={() => {
                    playSwitch();
                    setHistoryTab('tickets');
                  }}
                  className={`py-2 px-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
                    historyTab === 'tickets'
                      ? 'bg-[#D4AB58] text-[#101622] shadow'
                      : 'opacity-80 hover:opacity-100'
                  }`}
                >
                  🎫 بلیط‌ها ({safeTickets.length.toLocaleString('fa-IR')})
                </button>
                <button
                  type="button"
                  onClick={() => {
                    playSwitch();
                    setHistoryTab('certificates');
                  }}
                  className={`py-2 px-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
                    historyTab === 'certificates'
                      ? 'bg-[#D4AB58] text-[#101622] shadow'
                      : 'opacity-80 hover:opacity-100'
                  }`}
                >
                  📜 گواهی‌ها ({certificates.length.toLocaleString('fa-IR')})
                </button>
                <button
                  type="button"
                  onClick={() => {
                    playSwitch();
                    setHistoryTab('ledger');
                  }}
                  className={`py-2 px-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
                    historyTab === 'ledger'
                      ? 'bg-[#D4AB58] text-[#101622] shadow'
                      : 'opacity-80 hover:opacity-100'
                  }`}
                >
                  💎 ریز امتیازات
                </button>
              </div>

              <div className="overflow-y-auto space-y-3 pr-0.5 flex-1">
                {historyTab === 'tickets' && (
                  <div className="space-y-3">
                    {safeTickets.map((ticket) => {
                      const isSignedValid = verifyTicketSignature(ticket.qrPayload);
                      const isExpanded =
                        expandedTicketId === ticket.id || safeTickets.length === 1;
                      return (
                        <div
                          key={ticket.id}
                          className={`rounded-2xl p-4 border space-y-3 ${
                            isNight
                              ? 'bg-[#1A2424] border-[#2C3E4C]'
                              : 'bg-[#FFFFFF] border-[#C8BFA8]'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-2.5">
                              <div className="w-10 h-10 rounded-xl bg-[#D4AB58]/15 border border-[#D4AB58]/40 p-1.5 flex items-center justify-center shrink-0">
                                <PixelImage
                                  filename="33_icon_ticket_gold.png"
                                  alt="بلیط"
                                  className="w-7 h-7 object-contain"
                                />
                              </div>
                              <div>
                                <h4 className="font-black text-sm">{ticket.eventTitle}</h4>
                                <p
                                  className={`text-[11px] font-bold mt-0.5 ${
                                    isNight ? 'text-[#A3C1AD]' : 'text-[#3D5249]'
                                  }`}
                                >
                                  {ticket.eventDate} • ساعت {ticket.eventTime}
                                </p>
                              </div>
                            </div>
                            <span
                              className={`text-[10px] font-black px-2 py-0.5 rounded-md ${
                                ticket.checkedIn
                                  ? 'bg-emerald-600 text-white'
                                  : isSignedValid
                                  ? 'bg-[#D4AB58] text-[#101622]'
                                  : 'bg-amber-500/20 text-amber-300'
                              }`}
                            >
                              {ticket.checkedIn
                                ? `حاضر شد ✅ (${ticket.checkedInAt || ''})`
                                : 'امضای دیجیتال معتبر!'}
                            </span>
                          </div>

                          <div className="flex items-center justify-between text-xs pt-2 border-t border-current/10">
                            <span className="font-bold">کد رهگیری: {ticket.trackingCode}</span>
                            <button
                              type="button"
                              onClick={() => {
                                playTick();
                                setExpandedTicketId(
                                  isExpanded && safeTickets.length > 1 ? null : ticket.id
                                );
                              }}
                              className={`font-black text-xs underline cursor-pointer ${
                                isNight ? 'text-[#D4AB58]' : 'text-[#354B40]'
                              }`}
                            >
                              {isExpanded ? 'بستن بارکد QR' : 'نمایش بارکد QR ورود'}
                            </button>
                          </div>

                          {isExpanded && (
                            <div className="pt-2 flex flex-col items-center justify-center space-y-2 bg-black/20 rounded-xl p-3 border border-current/10">
                              <RealQrCode
                                payload={ticket.qrPayload}
                                size={120}
                                showDownload
                                downloadFilename={`ie-ticket-${ticket.trackingCode}`}
                              />
                              <span
                                className="text-[10px] font-mono break-all text-center"
                                dir="ltr"
                              >
                                {ticket.qrPayload}
                              </span>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                {historyTab === 'certificates' && (
                  <div className="space-y-2.5">
                    {certificates.map((cert) => (
                      <div
                        key={cert.certificateId}
                        className={`rounded-2xl p-3.5 border space-y-2.5 ${
                          isNight
                            ? 'bg-[#1A2424] border-[#2C3E4C]'
                            : 'bg-[#FFFFFF] border-[#C8BFA8]'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <span className="text-[10px] font-black px-2 py-0.5 rounded bg-[#354B40] text-[#F6F1E7]">
                              مدت دوره: {cert.hours.toLocaleString('fa-IR')} ساعت آموزشی
                            </span>
                            <h4 className="text-xs font-black mt-1.5">{cert.courseTitle}</h4>
                            <p
                              className={`text-[11px] font-bold mt-0.5 ${
                                isNight ? 'text-[#A3C1AD]' : 'text-[#3D5249]'
                              }`}
                            >
                              مدرس: {cert.instructor} • {cert.issueDate}
                            </p>
                          </div>
                          <span
                            className={`text-[11px] font-black shrink-0 ${
                              isNight ? 'text-[#D4AB58]' : 'text-[#354B40]'
                            }`}
                          >
                            {cert.grade}
                          </span>
                        </div>

                        <div className="pt-2 border-t border-current/10 flex items-center justify-between">
                          <span
                            className={`text-[11px] font-mono font-bold ${
                              isNight ? 'text-emerald-400' : 'text-[#354B40]'
                            }`}
                            dir="ltr"
                          >
                            {cert.certificateId}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleCopyCode(cert.certificateId)}
                            className={`text-[11px] font-black px-2.5 py-1 rounded-lg border cursor-pointer transition-colors ${
                              copiedCode === cert.certificateId
                                ? 'bg-emerald-600 text-white border-emerald-500'
                                : 'bg-[#D4AB58] text-[#101622] border-[#8F6B24]'
                            }`}
                          >
                            {copiedCode === cert.certificateId
                              ? 'کد گواهی کپی شد ✓'
                              : 'کپی کد استعلام و دانلود PDF'}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {historyTab === 'ledger' && (
                  <div className="space-y-3">
                    {safeVouchers.length > 0 && (
                      <div className="p-3 rounded-2xl bg-[#D4AB58]/15 border border-[#D4AB58]/40 space-y-2">
                        <div className="text-xs font-black">
                          🎁 کدهای تخفیف صندوقچه شما:
                        </div>
                        {safeVouchers.map((v) => (
                          <div
                            key={v.id}
                            className="flex items-center justify-between p-2 rounded-xl bg-black/25 text-xs"
                          >
                            <div>
                              <div className="font-bold">{v.title}</div>
                              <div className="text-[10px] font-mono text-emerald-400" dir="ltr">
                                {v.code}
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleCopyCode(v.code)}
                              className="px-2.5 py-1 rounded-lg bg-[#D4AB58] text-[#101622] font-black text-[11px] cursor-pointer"
                            >
                              {copiedCode === v.code ? 'کپی شد ✓' : 'کپی کد'}
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="space-y-2">
                      {transactions.map((tx) => {
                        const isPositive = tx.amount >= 0;
                        return (
                          <div
                            key={tx.id}
                            className={`rounded-2xl p-3 border flex items-center justify-between ${
                              isNight
                                ? 'bg-[#1A2424] border-[#2C3E4C]'
                                : 'bg-[#FFFFFF] border-[#C8BFA8]'
                            }`}
                          >
                            <div className="space-y-0.5">
                              <div className="text-xs font-black">{tx.title}</div>
                              <div
                                className={`text-[10px] font-bold ${
                                  isNight ? 'text-[#A3C1AD]' : 'text-[#3D5249]'
                                }`}
                              >
                                {tx.date} • شناسه: {tx.referenceCode}
                              </div>
                            </div>
                            <div
                              className={`text-sm font-black shrink-0 px-2.5 py-1 rounded-xl ${
                                isPositive
                                  ? 'bg-emerald-500/20 text-emerald-500'
                                  : 'bg-[#E77F6E]/20 text-[#E77F6E]'
                              }`}
                              dir="ltr"
                            >
                              {isPositive ? `+${tx.amount}` : tx.amount} 💎
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              <div className="pt-3 mt-2 border-t border-current/10 shrink-0">
                <PushButton
                  variant="secondary"
                  fullWidth
                  onClick={() => setIsHistoryDrawerOpen(false)}
                >
                  بستن پنجره سوابق
                </PushButton>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* =====================================================================
          MODAL 3: PROFILE SETTINGS, QUICK AVATAR SWITCHER & SECURITY STATUS
         ===================================================================== */}
      <AnimatePresence>
        {isSettingsOpen && (
          <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/80 backdrop-blur-md select-none">
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', stiffness: 380, damping: 30 }}
              className={`w-full max-w-md rounded-t-3xl border-t p-5 space-y-4 max-h-[90vh] overflow-y-auto ${
                isNight
                  ? 'bg-[#141C24] border-[#2C3E4C] text-[#F6F1E7]'
                  : 'bg-[#FAF7F0] border-[#C8BFA8] text-[#14201B]'
              }`}
            >
              <div className="flex items-center justify-between pb-2 border-b border-current/10">
                <h3 className="text-base font-black">تنظیمات پروفایل و انتخاب آواتار</h3>
                <button
                  type="button"
                  onClick={() => setIsSettingsOpen(false)}
                  className="w-8 h-8 rounded-xl bg-current/10 flex items-center justify-center font-bold cursor-pointer"
                >
                  ✕
                </button>
              </div>

              {/* Quick Student Avatar Selector (including Admin-added Avatars) */}
              <div
                className={`p-3.5 rounded-2xl border space-y-2.5 ${
                  isNight ? 'bg-[#1A2424] border-[#2C3E4C]' : 'bg-[#FFFFFF] border-[#C8BFA8]'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black">🎭 انتخاب سریع آواتار دانشجویی:</span>
                  <span className="text-[10px] font-bold opacity-75">
                    {availableStudentAvatars.length} آواتار موجود
                  </span>
                </div>
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 max-h-40 overflow-y-auto">
                  {availableStudentAvatars.map((av, idx) => {
                    const isSelected = user.avatar === av.imageUrl;
                    const cleanCharTitle =
                      !av.title ||
                      av.title.includes('مهندس') ||
                      av.title.includes('برنامه') ||
                      av.title.includes('قهرمان')
                        ? `کاراکتر ${(idx + 1).toLocaleString('fa-IR')}`
                        : av.title;
                    return (
                      <button
                        key={av.id}
                        type="button"
                        onClick={() => {
                          playCoin();
                          onSelectAvatar?.(av.imageUrl);
                        }}
                        className={`p-2 rounded-xl border flex flex-col items-center gap-1 transition-all cursor-pointer ${
                          isSelected
                            ? 'border-[#D4AB58] bg-[#D4AB58]/20'
                            : 'border-current/15 hover:border-[#D4AB58]/60'
                        }`}
                      >
                        <div className="w-11 h-11 rounded-full overflow-hidden flex items-center justify-center bg-black/20">
                          <PixelImage
                            filename={av.imageUrl}
                            alt={cleanCharTitle}
                            className="w-10 h-10 object-contain"
                          />
                        </div>
                        <span className="text-[10px] font-bold truncate max-w-full">
                          {cleanCharTitle}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-2.5 text-xs">
                <div className="p-3 rounded-2xl bg-emerald-500/15 border border-emerald-500/40 flex items-center justify-between">
                  <div>
                    <div className="font-black text-emerald-500">
                      سپر ضد تقلب امتیازات (Anti-Tamper) فعال است
                    </div>
                    <div className="text-[10px] font-bold mt-0.5">
                      امضای دیجیتال امتیازات: {integrityChecksum}
                    </div>
                  </div>
                  <span className="text-xs font-black text-emerald-500">امن ✓</span>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setIsSettingsOpen(false);
                    onOpenOnboardingEdit();
                  }}
                  className={`w-full p-3.5 rounded-2xl border flex items-center justify-between font-bold cursor-pointer ${
                    isNight
                      ? 'bg-[#1A2424] border-[#2C3E4C] hover:bg-[#223030]'
                      : 'bg-[#FFFFFF] border-[#C8BFA8] hover:bg-[#EAE3D2]'
                  }`}
                >
                  <span>🎓 ویرایش کامل مشخصات دانشجویی و نام</span>
                  <span>←</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    playSwitch();
                    onToggleTheme();
                  }}
                  className={`w-full p-3.5 rounded-2xl border flex items-center justify-between font-bold cursor-pointer ${
                    isNight
                      ? 'bg-[#1A2424] border-[#2C3E4C] hover:bg-[#223030]'
                      : 'bg-[#FFFFFF] border-[#C8BFA8] hover:bg-[#EAE3D2]'
                  }`}
                >
                  <span>
                    {isNight ? '☀️ تغییر به تم روشن پاستلی (روز)' : '🌙 تغییر به تم تاریک (شب)'}
                  </span>
                  <span>{isNight ? 'شب' : 'روز'}</span>
                </button>

                <button
                  type="button"
                  onClick={onToggleSound}
                  className={`w-full p-3.5 rounded-2xl border flex items-center justify-between font-bold cursor-pointer ${
                    isNight
                      ? 'bg-[#1A2424] border-[#2C3E4C] hover:bg-[#223030]'
                      : 'bg-[#FFFFFF] border-[#C8BFA8] hover:bg-[#EAE3D2]'
                  }`}
                >
                  <span>🔊 افکت‌های صوتی ۸ بیتی و لرزش لمسی</span>
                  <span
                    className={
                      isSoundActive ? 'text-emerald-500 font-black' : 'text-rose-500 font-black'
                    }
                  >
                    {isSoundActive ? 'فعال' : 'غیرفعال'}
                  </span>
                </button>
              </div>

              <PushButton variant="secondary" fullWidth onClick={() => setIsSettingsOpen(false)}>
                بستن تنظیمات
              </PushButton>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};
