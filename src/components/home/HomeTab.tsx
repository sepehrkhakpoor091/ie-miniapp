/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Home Tab Component — Replicating Left Phone 1:1 on Mobile & 12-Col Bento Grid on Desktop
 * Includes WCAG AAA High-Contrast Day/Night Readability, 142-Unit FUM Curriculum Flowchart Card,
 * Live @Isefum Telegram Channel Announcements, & 5-Tap Stealth Admin Gesture
 */

import React from 'react';
import {
  AdminStudentDossier,
  ChannelAnnouncement,
  EventItem,
  TabType,
  ThemeMode,
  UserProfile,
} from '../../types';
import { PixelImage } from '../PixelImage';
import { TactileCard } from '../ui/TactileCard';
import { RollingNumber } from '../ui/RollingNumber';
import { ReferralInviteCard } from '../ui/ReferralInviteCard';
import { playTick, playCoin } from '../../utils/soundEngine';
import {
  DEFAULT_CHANNEL_URL,
  DEFAULT_ISEFUM_ANNOUNCEMENTS,
  normalizeTelegramChannelHandle,
} from '../../utils/channelSync';
import { calculateLevelFromScore } from '../../utils/gamification';

interface HomeTabProps {
  user: UserProfile;
  themeMode: ThemeMode;
  isSoundActive?: boolean;
  announcements?: ChannelAnnouncement[];
  channelUrl?: string;
  featuredEvent?: EventItem;
  realStudents?: AdminStudentDossier[];
  serverReferralStats?: { referredCount: number; pointsEarned: number };
  onToggleTheme: () => void;
  onToggleSound?: () => void;
  onChangeTab: (tab: TabType) => void;
  onOpenQuickMenu: () => void;
  onOpenAnnouncementsDrawer: (initialTab?: 'channel' | 'about') => void;
  onOpenProfessorsModal: () => void;
  onOpenRemindersModal: () => void;
  onOpenSupportModal: () => void;
  onOpenCurriculumModal: () => void;
  onOpenEventDetails: (eventId: string) => void;
  onStealthTap?: () => void;
}

/** Crisp miniature pixel-art cloud SVG (zero image fetch, GPU-composited) */
const PixelMiniCloud: React.FC<{ className?: string }> = ({ className = 'w-12 h-6' }) => (
  <svg
    viewBox="0 0 24 12"
    shapeRendering="crispEdges"
    className={`${className} select-none pointer-events-none drop-shadow-sm`}
    aria-hidden="true"
  >
    {/* Warm cream pixel cloud top */}
    <rect x="7" y="2" width="6" height="2" fill="#FFFDF7" />
    <rect x="13" y="3" width="4" height="2" fill="#FFFDF7" />
    <rect x="4" y="4" width="15" height="3" fill="#FFFDF7" />
    <rect x="2" y="6" width="19" height="3" fill="#F6EFE2" />
    {/* Soft pixel underside shadow */}
    <rect x="3" y="9" width="17" height="1" fill="#DECBB1" />
  </svg>
);

export const HomeTab: React.FC<HomeTabProps> = ({
  user,
  themeMode,
  announcements: propAnnouncements,
  channelUrl = DEFAULT_CHANNEL_URL,
  featuredEvent,
  realStudents = [],
  serverReferralStats,
  onToggleTheme,
  onChangeTab,
  onOpenQuickMenu,
  onOpenAnnouncementsDrawer,
  onOpenProfessorsModal,
  onOpenRemindersModal,
  onOpenSupportModal,
  onOpenCurriculumModal,
  onOpenEventDetails,
  onStealthTap,
}) => {
  const isNight = themeMode === 'night';

  const displayFirstName = user.firstName?.trim()
    ? user.firstName.trim()
    : 'دانشجو';

  const dynamicLevel = calculateLevelFromScore(user.score);

  const latestAnnouncements =
    Array.isArray(propAnnouncements) && propAnnouncements.length > 0
      ? propAnnouncements.slice(0, 2)
      : DEFAULT_ISEFUM_ANNOUNCEMENTS.slice(0, 2);

  const cleanChannelHandle = normalizeTelegramChannelHandle(channelUrl);

  const activeFeaturedId = featuredEvent?.id || 'ev-project-mgmt';
  const activeFeaturedTitle = featuredEvent?.title || 'کارگاه مدیریت پروژه';
  const activeFeaturedDate = featuredEvent?.date || '۲۵ آبان ۱۴۰۴';
  const activeFeaturedCap =
    typeof featuredEvent?.capacityRemaining === 'number'
      ? featuredEvent.capacityRemaining
      : 45;

  return (
    <div className="flex flex-col pb-24 lg:pb-10 select-none w-full">
      {/* 1. Panoramic Campus Header Banner (Mobile full-bleed / Desktop rounded panoramic hero) */}
      <div className="relative w-full min-h-[220px] sm:h-[225px] lg:h-[245px] lg:mt-4 lg:rounded-3xl overflow-hidden lg:border-2 lg:border-[#C8BFA8]/50 flex flex-col justify-between p-3.5 sm:p-4">
        <div className="absolute inset-0 pointer-events-none">
          <PixelImage
            filename={isNight ? '09_banner_night.png' : '10_banner_day.png'}
            alt="نمای دانشکده مهندسی صنایع"
            className="w-full h-full object-cover object-top"
          />
        </div>

        {/* Animated Miniature Pixel Stars in Night Mode OR Drifting Miniature Pixel Clouds in Day Mode */}
        {isNight ? (
          <div className="absolute inset-x-0 top-0 h-28 pointer-events-none overflow-hidden z-[5]">
            <span
              className="absolute top-4 right-16 w-1.5 h-1.5 bg-[#FCE7A4] shadow-[0_0_4px_#FCE7A4]"
              style={{ animation: 'pixel-twinkle 2.3s ease-in-out infinite' }}
            />
            <span
              className="absolute top-9 right-28 w-1 h-1 bg-white"
              style={{ animation: 'pixel-twinkle 3.1s ease-in-out infinite 0.5s' }}
            />
            <span
              className="absolute top-5 right-44 w-1.5 h-1.5 bg-[#D4AB58]"
              style={{ animation: 'pixel-twinkle 2.7s ease-in-out infinite 1.1s' }}
            />
            <span
              className="absolute top-7 left-1/2 w-1.5 h-1.5 bg-[#FCE7A4] shadow-[0_0_4px_#FCE7A4]"
              style={{ animation: 'pixel-twinkle 2.5s ease-in-out infinite 0.3s' }}
            />
            <span
              className="absolute top-12 left-[40%] w-1 h-1 bg-white"
              style={{ animation: 'pixel-twinkle 3.4s ease-in-out infinite 1.4s' }}
            />
            <span
              className="absolute top-5 left-28 w-1.5 h-1.5 bg-[#FCE7A4]"
              style={{ animation: 'pixel-twinkle 2.9s ease-in-out infinite 0.8s' }}
            />
            <span
              className="absolute top-10 left-16 w-1 h-1 bg-[#D4AB58]"
              style={{ animation: 'pixel-twinkle 2.2s ease-in-out infinite 1.6s' }}
            />
          </div>
        ) : (
          <div className="absolute inset-x-0 top-0 h-28 pointer-events-none overflow-hidden z-[5]">
            <div
              className="absolute top-3.5 right-20 opacity-90"
              style={{ animation: 'pixel-cloud-drift-1 14s ease-in-out infinite' }}
            >
              <PixelMiniCloud className="w-11 h-5.5" />
            </div>
            <div
              className="absolute top-6 left-20 opacity-85"
              style={{ animation: 'pixel-cloud-drift-2 17s ease-in-out infinite 1.5s' }}
            >
              <PixelMiniCloud className="w-9 h-4.5" />
            </div>
            <div
              className="hidden sm:block absolute top-4 left-1/2 opacity-80"
              style={{ animation: 'pixel-cloud-drift-1 19s ease-in-out infinite 3s' }}
            >
              <PixelMiniCloud className="w-10 h-5" />
            </div>
          </div>
        )}

        {/* Smooth Gradient Overlay at Bottom */}
        <div
          className={`absolute inset-x-0 bottom-0 h-28 pointer-events-none bg-gradient-to-t ${
            isNight
              ? 'from-[#101622] via-[#101622]/85 to-transparent'
              : 'from-[#F6F1E7] via-[#F6F1E7]/85 to-transparent'
          }`}
        />

        {/* Top Bar Row 1: Dedicated Action Controls (Menu | Theme + Sound + Bell) — Never overlaps student name */}
        <div className="relative z-20 flex items-center justify-between gap-2 w-full">
          {/* Right Side (in RTL): 4-Dot Grid Squircle Icon */}
          <button
            type="button"
            onClick={() => {
              playTick();
              onOpenQuickMenu();
            }}
            className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-[#1E293B]/85 hover:bg-[#1E293B] border border-white/15 backdrop-blur-md flex items-center justify-center transition-transform active:scale-90 shadow-md cursor-pointer shrink-0"
            aria-label="منوی دسترسی سریع"
            title="منوی تنظیمات دانشجویی"
          >
            <div className="grid grid-cols-2 gap-1">
              <span className="w-1.5 h-1.5 rounded-[2px] bg-[#F6F1E7]" />
              <span className="w-1.5 h-1.5 rounded-[2px] bg-[#F6F1E7]" />
              <span className="w-1.5 h-1.5 rounded-[2px] bg-[#F6F1E7]" />
              <span className="w-1.5 h-1.5 rounded-[2px] bg-[#D4AB58]" />
            </div>
          </button>

          {/* Left Side (in RTL): Theme Toggle & Bell Icon (Only Day/Night + Bell as requested) */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            <button
              type="button"
              onClick={() => {
                playTick();
                onToggleTheme();
              }}
              className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-[#1E293B]/85 hover:bg-[#1E293B] border border-white/15 backdrop-blur-md flex items-center justify-center transition-all active:scale-90 shadow-md cursor-pointer shrink-0 group"
              aria-label="تغییر تم روز و شب"
              title={isNight ? 'تغییر به حالت روز' : 'تغییر به حالت شب'}
            >
              {isNight ? (
                /* Night Mode active: Crisp Golden Crescent Moon + Twinkling Stars & Warm Sun Hint */
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  className="w-5 h-5 sm:w-5.5 sm:h-5.5 text-[#FDE047] drop-shadow-[0_0_6px_rgba(253,224,71,0.45)] transition-transform duration-300 group-hover:rotate-12"
                  aria-hidden="true"
                >
                  <path
                    d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
                    fill="#FACC15"
                    stroke="#FEF08A"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M18 4l.6 1.4L20 6l-1.4.6L18 8l-.6-1.4L16 6l1.4-.6L18 4z"
                    fill="#FFFBEB"
                  />
                  <circle cx="14.5" cy="9.5" r="1" fill="#FEF08A" />
                </svg>
              ) : (
                /* Day Mode active: Crisp Radiant Sun with 8 Sunbeams */
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  className="w-5 h-5 sm:w-5.5 sm:h-5.5 text-[#F59E0B] drop-shadow-[0_0_6px_rgba(245,158,11,0.5)] transition-transform duration-300 group-hover:rotate-45"
                  aria-hidden="true"
                >
                  <circle
                    cx="12"
                    cy="12"
                    r="4.5"
                    fill="#FACC15"
                    stroke="#FEF08A"
                    strokeWidth="1.5"
                  />
                  <path
                    d="M12 2.5v2.25M12 19.25v2.25M4.75 12H2.5M21.5 12h-2.25M5.28 5.28l1.6 1.6M17.12 17.12l1.6 1.6M18.72 5.28l-1.6 1.6M6.88 17.12l-1.6 1.6"
                    stroke="#FDE047"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                </svg>
              )}
            </button>

            <button
              type="button"
              onClick={() => {
                playTick();
                onOpenAnnouncementsDrawer();
              }}
              className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-[#1E293B]/85 hover:bg-[#1E293B] border border-white/15 backdrop-blur-md flex items-center justify-center relative transition-transform active:scale-90 shadow-md cursor-pointer shrink-0"
              aria-label="اطلاعیه‌های کانال"
              title="اطلاعیه‌های کانال انجمن صنایع"
            >
              <PixelImage
                filename="31_icon_bell.png"
                alt="زنگوله اعلانات"
                className="w-5 h-5 sm:w-6 sm:h-6 object-contain"
              />
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-[#E77F6E] border-2 border-[#101622]" />
            </button>
          </div>
        </div>

        {/* Bottom Row 2: Avatar, Greeting & Subtitle (Supports 5-Tap Stealth Admin Gesture, Zero Overlap) */}
        <div className="relative z-10 flex items-center justify-between gap-3 w-full pt-6">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1">
            {/* Avatar Frame with 5-Tap Stealth Trigger */}
            <div
              onClick={() => {
                if (onStealthTap) {
                  onStealthTap();
                } else {
                  playTick();
                  onChangeTab('profile');
                }
              }}
              className="w-14 h-14 sm:w-16 sm:h-16 lg:w-18 lg:h-18 rounded-2xl overflow-hidden border-[2.5px] border-[#D4AB58] shadow-[0_4px_14px_rgba(0,0,0,0.45)] cursor-pointer relative bg-[#1A2424] active:scale-95 transition-transform shrink-0"
            >
              <PixelImage
                filename={user.avatar}
                alt={user.fullName}
                className="w-full h-full object-cover"
              />
            </div>

            {/* Greeting & Association Name */}
            <div
              onClick={() => onStealthTap?.()}
              className="space-y-0.5 cursor-pointer select-none min-w-0 flex-1"
            >
              <h1
                className={`text-base sm:text-lg lg:text-xl font-black tracking-tight drop-shadow-sm truncate ${
                  isNight ? 'text-[#F6F1E7]' : 'text-[#14201B]'
                }`}
              >
                سلام، {displayFirstName}!
              </h1>
              <p
                className={`text-[11px] sm:text-xs font-bold truncate ${
                  isNight ? 'text-[#A3C1AD]' : 'text-[#3D5249]'
                }`}
              >
                انجمن علمی مهندسی صنایع فردوسی (@{cleanChannelHandle})
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Container: Mobile single-column stack / Desktop 12-Column Bento Grid */}
      <div className="px-4 lg:px-0 mt-3 grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        {/* RIGHT COLUMN IN RTL ON DESKTOP (lg:col-span-5): Level Card + 4 Quick-Access Tiles + Curriculum Hero Card */}
        <div className="lg:col-span-5 space-y-4">
          {/* 2. Level 3 Score Card (#354B40 dark forest card -> explicitly force text-[#F6F1E7] in both Day & Night) */}
          <div
            onClick={() => {
              playCoin();
              if (onStealthTap) onStealthTap();
              onChangeTab('achievements');
            }}
            className="rounded-2xl px-4 py-3 border-b-[4px] cursor-pointer transition-all active:translate-y-[2px] active:border-b-[2px] flex items-center justify-between shadow-md bg-[#354B40] border border-[#4F6D5E] border-b-[#22312A] text-[#F6F1E7]"
          >
            {/* Right side in RTL: Shield Rank Icon + Level Title */}
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 flex items-center justify-center shrink-0">
                <PixelImage
                  filename={dynamicLevel.badgeIcon}
                  alt={dynamicLevel.rankTitle}
                  className="w-8 h-8 object-contain"
                />
              </div>
              <span className="font-extrabold text-sm tracking-tight text-[#F6F1E7]">
                {dynamicLevel.rankTitle}
              </span>
            </div>

            {/* Left side in RTL: Score + Diamond Icon */}
            <div className="flex items-center gap-1.5 text-[#F6F1E7]">
              <span className="text-xs font-bold">امتیاز:</span>
              <span className="text-base font-black text-[#D4AB58]">
                <RollingNumber value={user.score} />
              </span>
              <div
                className="w-5 h-5 flex items-center justify-center"
                style={{ animation: 'pixel-float 2.8s ease-in-out infinite' }}
              >
                <PixelImage
                  filename="23_badge_diamond.png"
                  alt="الماس امتیاز"
                  className="w-5 h-5 object-contain"
                />
              </div>
            </div>
          </div>

          {/* 3. Four Quick-Access Icon Tiles */}
          <div className="grid grid-cols-4 lg:grid-cols-2 gap-2.5">
            {/* Tile 1: اساتید */}
            <TactileCard
              themeMode={themeMode}
              interactive
              onClick={() => {
                playTick();
                onOpenProfessorsModal();
              }}
              className="p-2.5 lg:p-3.5 flex flex-col items-center justify-center text-center gap-1.5"
            >
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center p-1"
                style={{ animation: 'pixel-float 3.2s ease-in-out infinite' }}
              >
                <PixelImage
                  filename="30_icon_professor.png"
                  alt="اساتید"
                  className="w-11 h-11 object-contain"
                />
              </div>
              <span
                className={`text-xs font-extrabold leading-tight ${
                  isNight ? 'text-[#F6F1E7]' : 'text-[#14201B]'
                }`}
              >
                اساتید
              </span>
            </TactileCard>

            {/* Tile 2: یادآورها */}
            <TactileCard
              themeMode={themeMode}
              interactive
              onClick={() => {
                playTick();
                onOpenRemindersModal();
              }}
              className="p-2.5 lg:p-3.5 flex flex-col items-center justify-center text-center gap-1.5"
            >
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center p-1"
                style={{ animation: 'pixel-float 3.5s ease-in-out infinite 0.3s' }}
              >
                <PixelImage
                  filename="29_icon_calendar.png"
                  alt="یادآورها"
                  className="w-11 h-11 object-contain"
                />
              </div>
              <span
                className={`text-xs font-extrabold leading-tight ${
                  isNight ? 'text-[#F6F1E7]' : 'text-[#14201B]'
                }`}
              >
                یادآورها
              </span>
            </TactileCard>

            {/* Tile 3: پشتیبانی */}
            <TactileCard
              themeMode={themeMode}
              interactive
              onClick={() => {
                playTick();
                onOpenSupportModal();
              }}
              className="p-2.5 lg:p-3.5 flex flex-col items-center justify-center text-center gap-1.5"
            >
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center p-1"
                style={{ animation: 'pixel-float 3.0s ease-in-out infinite 0.6s' }}
              >
                <PixelImage
                  filename="32_icon_support.png"
                  alt="پشتیبانی"
                  className="w-11 h-11 object-contain"
                />
              </div>
              <span
                className={`text-xs font-extrabold leading-tight ${
                  isNight ? 'text-[#F6F1E7]' : 'text-[#14201B]'
                }`}
              >
                پشتیبانی
              </span>
            </TactileCard>

            {/* Tile 4: درباره ما (With Cute Mascot Cat on Books 36_decor_cat_books.png) */}
            <TactileCard
              themeMode={themeMode}
              interactive
              onClick={() => {
                playTick();
                onOpenAnnouncementsDrawer('about');
              }}
              className="p-2.5 lg:p-3.5 flex flex-col items-center justify-center text-center gap-1.5 relative overflow-hidden"
            >
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center p-0.5 relative"
                style={{ animation: 'pixel-float 3.4s ease-in-out infinite 0.9s' }}
              >
                <PixelImage
                  filename="36_decor_cat_books.png"
                  alt="درباره انجمن"
                  className="w-11 h-11 object-contain"
                />
              </div>
              <span
                className={`text-xs font-extrabold leading-tight ${
                  isNight ? 'text-[#F6F1E7]' : 'text-[#14201B]'
                }`}
              >
                درباره ما
              </span>
            </TactileCard>
          </div>

          {/* 3B. Interactive FUM 142-Unit Curriculum & Prerequisite Flowchart Card */}
          <TactileCard
            themeMode={themeMode}
            interactive
            onClick={() => {
              playCoin();
              onOpenCurriculumModal();
            }}
            className="p-3.5 border-2 border-[#D4AB58]/60 flex items-center justify-between gap-3"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-12 h-12 rounded-2xl bg-[#354B40] border-2 border-[#D4AB58] flex items-center justify-center shrink-0 p-1.5 shadow">
                <PixelImage
                  filename="20_badge_chart.png"
                  alt="چارت درسی مهندسی صنایع"
                  className="w-full h-full object-contain"
                />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs lg:text-sm font-black truncate">
                    🎓 چارت درسی و درخت پیش‌نیازها
                  </span>
                  <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-[#D4AB58] text-[#101622] shrink-0">
                    ۱۴۲ واحد
                  </span>
                </div>
                <p
                  className={`text-[11px] font-bold truncate mt-0.5 ${
                    isNight ? 'text-[#A3C1AD]' : 'text-[#3D5249]'
                  }`}
                >
                  چارت ۸ ترمه مصوب ۱۳۹۹ فردوسی + انتخابگر ۱۹ واحد اختیاری
                </p>
              </div>
            </div>
            <span className="text-xs font-black text-[#D4AB58] shrink-0">مشاهده ←</span>
          </TactileCard>

          {/* 3C. Official Referral & Invite Link Card */}
          <ReferralInviteCard
            user={user}
            themeMode={themeMode}
            realStudents={realStudents}
            serverReferralStats={serverReferralStats}
          />
        </div>

        {/* LEFT COLUMN IN RTL ON DESKTOP (lg:col-span-7): Featured Event Card + Latest Channel Announcements */}
        <div className="lg:col-span-7 space-y-4">
          {/* 4. Featured Event Card (13_ev_featured.png) — Admin Selectable */}
          <div>
            <div
              onClick={() => {
                playTick();
                onOpenEventDetails(activeFeaturedId);
              }}
              className={`rounded-2xl overflow-hidden border-2 border-b-[4px] relative cursor-pointer transition-all active:translate-y-[2px] active:border-b-[2px] h-[142px] lg:h-[168px] shadow-lg ${
                isNight
                  ? 'border-[#2C3E4C] border-b-[#182232]'
                  : 'border-[#C8BFA8] border-b-[#B5AA96]'
              }`}
            >
              {/* Full Pixel Illustration Background — Right 42% completely clear for the easel */}
              <PixelImage
                filename="13_ev_featured.png"
                alt={activeFeaturedTitle}
                className="w-full h-full object-cover"
              />

              {/* Subtle scrim ONLY on the LEFT 58% so the easel on the right 42% stays 100% clear */}
              <div className="absolute inset-y-0 left-0 w-[62%] bg-gradient-to-r from-[#101622]/90 via-[#101622]/65 to-transparent pointer-events-none" />

              {/* Text Container placed on the LEFT 58% of the card */}
              <div className="absolute inset-y-0 left-0 w-[58%] p-3.5 lg:p-5 flex flex-col justify-between text-right text-[#F6F1E7]">
                <div className="flex justify-start">
                  <span className="px-2.5 py-0.5 rounded-full bg-[#E77F6E] text-[#101622] text-[10px] font-black shadow-sm">
                    رویداد ویژه
                  </span>
                </div>

                <div className="space-y-1">
                  <h2 className="text-sm sm:text-base lg:text-lg font-black text-[#F6F1E7] leading-snug drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] line-clamp-2">
                    {activeFeaturedTitle}
                  </h2>
                  <p className="text-xs font-bold text-[#F6F1E7]/95 drop-shadow">
                    {activeFeaturedDate}
                  </p>
                  <p className="text-[11px] font-extrabold text-[#FCE7A4] drop-shadow">
                    ظرفیت باقی‌مانده: {activeFeaturedCap.toLocaleString('fa-IR')} نفر
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* 5. Recent Announcements Section (Synced with @Isefum) */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <h3
                  className={`text-sm font-black tracking-tight ${
                    isNight ? 'text-[#F6F1E7]' : 'text-[#14201B]'
                  }`}
                >
                  اطلاعیه‌های اخیر
                </h3>
                <a
                  href={`https://t.me/${cleanChannelHandle}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 hover:underline"
                >
                  @{cleanChannelHandle}
                </a>
              </div>
              <div className="flex items-center gap-2.5">
                <a
                  href={`https://t.me/${cleanChannelHandle}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`text-[11px] font-bold hover:underline ${
                    isNight ? 'text-[#A3C1AD]' : 'text-[#3D5249]'
                  }`}
                >
                  مشاهده در کانال تلگرام
                </a>
                <button
                  type="button"
                  onClick={() => {
                    playTick();
                    onOpenAnnouncementsDrawer();
                  }}
                  className={`text-xs font-bold hover:underline cursor-pointer ${
                    isNight ? 'text-[#D4AB58]' : 'text-[#354B40]'
                  }`}
                >
                  آرشیو ←
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
              {latestAnnouncements.map((ann, idx) => (
                <TactileCard
                  key={ann.id}
                  themeMode={themeMode}
                  interactive
                  onClick={() => {
                    playTick();
                    onOpenAnnouncementsDrawer();
                  }}
                  className="p-3 flex items-center gap-3"
                >
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 p-1.5 border ${
                      idx === 0
                        ? 'bg-[#D4AB58]/15 border-[#D4AB58]/30'
                        : 'bg-[#7FB69E]/15 border-[#7FB69E]/30'
                    }`}
                  >
                    <PixelImage
                      filename="34_icon_ann_doc.png"
                      alt="اطلاعیه"
                      className="w-full h-full object-contain"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4
                      className={`text-xs font-extrabold truncate ${
                        isNight ? 'text-[#F6F1E7]' : 'text-[#14201B]'
                      }`}
                    >
                      {ann.title}
                    </h4>
                    <p
                      className={`text-[11px] truncate mt-0.5 font-medium ${
                        isNight ? 'text-[#A3C1AD]' : 'text-[#3D5249]'
                      }`}
                    >
                      {ann.snippet}
                    </p>
                  </div>
                </TactileCard>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
