/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Achievements, Real Leaderboard & Lootbox Store Tab (افتخارات و تالار قهرمانان)
 * Features:
 * - 100% Real Telegram Bot Database Leaderboard (zero fake users, zero fake Cohort Battle)
 * - Transparent Lootbox Prize List & Win Probabilities (configured by Admin)
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  AdminStudentDossier,
  DiscountVoucher,
  LootboxConfig,
  ThemeMode,
  UserProfile,
  WeeklyQuest,
} from '../../types';
import { PixelImage } from '../PixelImage';
import { PushButton } from '../ui/PushButton';
import { RollingNumber } from '../ui/RollingNumber';
import { SectionMaintenanceBanner } from '../ui/SectionMaintenanceBanner';
import {
  COHORT_FILTER_OPTIONS,
  DEFAULT_LOOTBOX_CONFIG,
  getCohortBattleStats,
  getFilteredLeaderboard,
  redeemLootboxChest,
} from '../../utils/gamification';
import {
  playCoin,
  playError,
  playFanfare,
  playSwitch,
  playTick,
} from '../../utils/soundEngine';

interface AchievementsTabProps {
  user: UserProfile;
  realStudents?: AdminStudentDossier[];
  lootboxConfig?: LootboxConfig;
  themeMode: ThemeMode;
  storedChecksum: string | null;
  vouchers: DiscountVoucher[];
  quests: WeeklyQuest[];
  leaderboardEnabled?: boolean;
  lootboxStoreEnabled?: boolean;
  onBackToHome: () => void;
  onRedeemLootboxSuccess: (
    costPoints: number,
    voucher?: DiscountVoucher,
    bonusPointsAwarded?: number,
    prizeTitle?: string
  ) => void;
  onTamperReset: () => void;
  onClaimQuest: (questId: string, rewardPoints: number, questTitle: string) => void;
}

export const AchievementsTab: React.FC<AchievementsTabProps> = ({
  user,
  realStudents = [],
  lootboxConfig = DEFAULT_LOOTBOX_CONFIG,
  themeMode,
  storedChecksum,
  vouchers,
  quests,
  leaderboardEnabled = true,
  lootboxStoreEnabled = true,
  onBackToHome,
  onRedeemLootboxSuccess,
  onTamperReset,
  onClaimQuest,
}) => {
  const isNight = themeMode === 'night';

  const [selectedCohort, setSelectedCohort] = useState<string>('all');
  const [openingChestType, setOpeningChestType] = useState<'bronze' | 'gold' | null>(null);
  const [unboxedResult, setUnboxedResult] = useState<{
    prizeType: 'voucher' | 'points' | 'empty';
    prizeTitle: string;
    voucher?: DiscountVoucher;
    bonusPoints?: number;
  } | null>(null);
  const [lootboxAlert, setLootboxAlert] = useState<{
    type: 'error' | 'tamper';
    message: string;
  } | null>(null);
  const [copiedVoucherCode, setCopiedVoucherCode] = useState<string | null>(null);

  // Dynamically computed Leaderboard & Cohort Competition using ONLY real students from server + current registered user
  const leaderboard = getFilteredLeaderboard(selectedCohort, user, realStudents);
  const cohortList = getFilteredLeaderboard(user.cohortYear || 'all', user, realStudents);
  const userCohortRank = cohortList.find((s) => s.isCurrentUser)?.rank || 1;
  const cohortBattleStats = getCohortBattleStats(user, realStudents);
  const maxCohortPoints = Math.max(
    50,
    ...cohortBattleStats.map((item) => item.totalPoints)
  );

  const rank1 = leaderboard[0];
  const rank2 = leaderboard[1];
  const rank3 = leaderboard[2];
  const restStudents = leaderboard.slice(3);

  const activeConfig = lootboxConfig || DEFAULT_LOOTBOX_CONFIG;
  const bronzePrizes = Array.isArray(activeConfig.bronzePrizes)
    ? activeConfig.bronzePrizes
    : DEFAULT_LOOTBOX_CONFIG.bronzePrizes;
  const goldPrizes = Array.isArray(activeConfig.goldPrizes)
    ? activeConfig.goldPrizes
    : DEFAULT_LOOTBOX_CONFIG.goldPrizes;

  const handleOpenLootbox = (chestType: 'bronze' | 'gold') => {
    setLootboxAlert(null);
    setUnboxedResult(null);

    const result = redeemLootboxChest(chestType, user, storedChecksum, activeConfig);

    if (!result.success) {
      playError();
      if (result.tamperDetected) {
        setLootboxAlert({
          type: 'tamper',
          message:
            result.errorReason ||
            'دستکاری غیرمجاز امتیاز شناسایی شد! امتیاز به حالت امن بازگردانی گردید.',
        });
        onTamperReset();
      } else {
        setLootboxAlert({
          type: 'error',
          message: result.errorReason || 'امتیاز کافی برای باز کردن این صندوقچه ندارید.',
        });
      }
      return;
    }

    playCoin();
    setOpeningChestType(chestType);

    setTimeout(() => {
      playCoin();
    }, 280);

    setTimeout(() => {
      setOpeningChestType(null);
      if (result.prizeType === 'empty') {
        playError();
      } else {
        playFanfare();
      }
      setUnboxedResult({
        prizeType: result.prizeType || 'voucher',
        prizeTitle: result.prizeTitle || result.voucher?.title || 'جایزه صندوقچه',
        voucher: result.voucher,
        bonusPoints: result.bonusPointsAwarded,
      });
      onRedeemLootboxSuccess(
        result.costPoints,
        result.voucher,
        result.bonusPointsAwarded,
        result.prizeTitle
      );
    }, 750);
  };

  const handleCopyVoucher = (code: string) => {
    playTick();
    navigator.clipboard?.writeText(code);
    setCopiedVoucherCode(code);
    setTimeout(() => setCopiedVoucherCode(null), 2000);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 380, damping: 28 }}
      className="pb-28 lg:pb-10 pt-3 px-4 lg:px-0 space-y-4 select-none overflow-x-hidden"
    >
      {/* Top Bar */}
      <div className="flex items-center justify-between pt-1">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-[#D4AB58]/20 border border-[#D4AB58]/40 p-1 flex items-center justify-center">
            <PixelImage
              filename="19_badge_trophy.png"
              alt="تالار افتخارات"
              className="w-6 h-6 object-contain"
            />
          </div>
          <h1
            className={`text-lg font-black tracking-tight ${
              isNight ? 'text-[#F6F1E7]' : 'text-[#14201B]'
            }`}
          >
            تالار افتخارات و جدول برترین‌ها
          </h1>
        </div>

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

      {/* 1. TROPHY ROOM HEADER (11_banner_leaderboard.png) */}
      <div
        className={`relative rounded-3xl overflow-hidden border-2 h-40 lg:h-48 ${
          isNight
            ? 'border-[#2C3E4C] shadow-[0_6px_0_#0B101B]'
            : 'border-[#C8BFA8] shadow-[0_6px_0_#C8BFA8]'
        }`}
      >
        <PixelImage
          filename="11_banner_leaderboard.png"
          alt="تالار قهرمانان مهندسی صنایع"
          className="w-full h-full object-cover"
        />

        <div className="absolute inset-0 bg-gradient-to-t from-[#0D131F]/90 via-[#0D131F]/35 to-transparent" />

        <svg
          viewBox="0 0 16 16"
          className="w-4 h-4 absolute top-3 right-5 fill-[#FCE7A4] pointer-events-none"
          style={{ animation: 'pixel-twinkle 2.2s infinite ease-in-out' }}
        >
          <path d="M8 0 L10 6 L16 8 L10 10 L8 16 L6 10 L0 8 L6 6 Z" />
        </svg>
        <svg
          viewBox="0 0 16 16"
          className="w-3.5 h-3.5 absolute top-5 left-8 fill-[#D4AB58] pointer-events-none"
          style={{ animation: 'pixel-twinkle 2.9s infinite ease-in-out 0.7s' }}
        >
          <path d="M8 0 L10 6 L16 8 L10 10 L8 16 L6 10 L0 8 L6 6 Z" />
        </svg>

        <div className="absolute bottom-3 inset-x-3.5 flex items-end justify-between gap-2 text-[#F6F1E7]">
          <div>
            <span className="inline-block text-[10px] font-black px-2.5 py-0.5 rounded-full bg-[#D4AB58] text-[#101622] mb-1">
              رتبه شما در ورودی {user.cohortYear || '۱۴۰۲'}: نفر {userCohortRank.toLocaleString('fa-IR')}ام
            </span>
            <h2 className="text-sm lg:text-base font-black text-[#F6F1E7] drop-shadow">
              لیگ قهرمانان انجمن علمی مهندسی صنایع
            </h2>
          </div>

          <div className="px-3 py-1.5 rounded-xl bg-black/65 backdrop-blur-sm border border-[#D4AB58]/50 flex items-center gap-1.5 shrink-0">
            <PixelImage
              filename="23_badge_diamond.png"
              alt="امتیاز"
              className="w-4 h-4 object-contain"
            />
            <span className="text-xs font-black text-[#D4AB58]">
              <RollingNumber value={user.score} />
            </span>
          </div>
        </div>
      </div>

      {/* 2-Column Split on Desktop (lg:grid-cols-2):
          Right Column: Cohort Filters + Real Students Leaderboard
          Left Column: Lootbox Store (with transparent Admin probabilities) + Weekly Quests */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
        {/* RIGHT COLUMN IN RTL: REAL LEADERBOARD */}
        <div className="space-y-4">
          {!leaderboardEnabled ? (
            <SectionMaintenanceBanner
              themeMode={themeMode}
              sectionTitle="جدول برترین‌ها"
            />
          ) : (
            <>
              {/* COHORT COMPETITION SECTION: 🏆 رقابت امتیاز ورودی‌ها (۱۴۰۰ تا ۱۴۰۵) */}
              <div
                className={`rounded-3xl border-2 p-4 space-y-3 ${
                  isNight
                    ? 'bg-[#16202C] border-[#2C3E4C] shadow-[0_5px_0_#0B101B]'
                    : 'bg-[#FFFFFF] border-[#C8BFA8] shadow-[0_5px_0_#C8BFA8]'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-base">🏆</span>
                    <h3
                      className={`text-xs sm:text-sm font-black ${
                        isNight ? 'text-[#F6F1E7]' : 'text-[#14201B]'
                      }`}
                    >
                      رقابت امتیاز ورودی‌ها (۱۴۰۰ تا ۱۴۰۵)
                    </h3>
                  </div>
                  <span className="text-[10px] font-black px-2 py-0.5 rounded-lg bg-[#D4AB58]/20 text-[#D4AB58] border border-[#D4AB58]/40">
                    محاسبه زنده از دانشجویان واقعی
                  </span>
                </div>

                <div className="space-y-2.5">
                  {cohortBattleStats.map((stat) => {
                    const percent =
                      stat.totalPoints > 0
                        ? Math.max(8, Math.min(100, Math.round((stat.totalPoints / maxCohortPoints) * 100)))
                        : 0;
                    const isMyCohort =
                      stat.cohortYear === (user.cohortYear || '') ||
                      stat.label.includes(user.cohortYear || '---');
                    return (
                      <div key={stat.cohortYear} className="space-y-1">
                        <div className="flex items-center justify-between text-[11px]">
                          <div className="flex items-center gap-1.5">
                            <span
                              className={`font-black ${
                                isMyCohort
                                  ? 'text-[#D4AB58]'
                                  : isNight
                                  ? 'text-[#F6F1E7]'
                                  : 'text-[#14201B]'
                              }`}
                            >
                              {stat.label}
                            </span>
                            {isMyCohort && (
                              <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-[#D4AB58] text-[#101622]">
                                ورودی شما
                              </span>
                            )}
                            <span
                              className={`text-[10px] font-bold ${
                                isNight ? 'text-[#91B5BE]' : 'text-[#5A6E63]'
                              }`}
                            >
                              ({stat.studentsCount.toLocaleString('fa-IR')} نفر)
                            </span>
                          </div>
                          <span className="font-black text-[#D4AB58] font-mono">
                            {stat.totalPoints.toLocaleString('fa-IR')} امتیاز
                          </span>
                        </div>
                        <div
                          className={`w-full h-2.5 rounded-full overflow-hidden border ${
                            isNight
                              ? 'bg-[#0E1520] border-[#253247]'
                              : 'bg-[#EFE8D8] border-[#C8BFA8]'
                          }`}
                        >
                          <div
                            className={`h-full rounded-full bg-gradient-to-l ${stat.colorClass} transition-all duration-500`}
                            style={{ width: `${percent}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* 2. ENTRY-YEAR COHORT FILTER PILLS */}
              <div className="space-y-2">
                <div className="flex items-center justify-between px-0.5">
                  <span
                    className={`text-xs font-black ${
                      isNight ? 'text-[#F6F1E7]' : 'text-[#14201B]'
                    }`}
                  >
                    فیلتر بر اساس ورودی
                  </span>
                  <span
                    className={`text-[11px] font-bold ${
                      isNight ? 'text-[#A3C1AD]' : 'text-[#3D5249]'
                    }`}
                  >
                    نمایش: {COHORT_FILTER_OPTIONS.find((c) => c.id === selectedCohort)?.label}
                  </span>
                </div>

                <div className="flex items-center gap-2 overflow-x-auto pb-1.5 no-scrollbar">
                  {COHORT_FILTER_OPTIONS.map((cohort) => {
                    const isActive = selectedCohort === cohort.id;
                    return (
                      <button
                        key={cohort.id}
                        type="button"
                        onClick={() => {
                          playSwitch();
                          setSelectedCohort(cohort.id);
                        }}
                        className={`px-3.5 py-2 rounded-xl text-xs font-black shrink-0 border transition-all active:translate-y-0.5 cursor-pointer ${
                          isActive
                            ? 'bg-[#D4AB58] text-[#101622] border-[#F3D184] shadow-[0_3px_0_#8F6B24]'
                            : isNight
                            ? 'bg-[#1A2424] text-[#F6F1E7] border-[#2C3E4C] shadow-[0_3px_0_#0B101B]'
                            : 'bg-[#FFFFFF] text-[#14201B] border-[#C8BFA8] shadow-[0_3px_0_#C8BFA8]'
                        }`}
                      >
                        {cohort.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 3. REAL REGISTERED STUDENTS LEADERBOARD PODIUM */}
              <div
                className={`rounded-3xl p-4 border space-y-4 ${
                  isNight
                    ? 'bg-[#1A2424] border-[#2C3E4C] text-[#F6F1E7] shadow-[0_5px_0_#0B101B]'
                    : 'bg-[#FFFFFF] border-[#C8BFA8] text-[#14201B] shadow-[0_5px_0_#C8BFA8]'
                }`}
              >
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-black">سکوی قهرمانان صنایع (کاربران واقعی)</h3>
                  <span
                    className={`text-[11px] font-black ${
                      isNight ? 'text-[#D4AB58]' : 'text-[#354B40]'
                    }`}
                  >
                    {selectedCohort === 'all' ? 'کل ورودی‌ها' : `ورودی ${selectedCohort}`} (
                    {leaderboard.length.toLocaleString('fa-IR')} نفر)
                  </span>
                </div>

                {leaderboard.length === 0 ? (
                  <div className="p-6 rounded-2xl bg-black/15 border border-current/10 text-center space-y-1.5">
                    <div className="text-xs font-black">
                      هنوز دانشجوی احراز هویت‌شده‌ای در این ورودی ثبت نشده است.
                    </div>
                    <p
                      className={`text-[11px] font-medium ${
                        isNight ? 'text-[#A3C1AD]' : 'text-[#3D5249]'
                      }`}
                    >
                      به محض ثبت‌نام دانشجویان در ربات تلگرام و مینی‌اپ، اسامی واقعی در این جدول قرار می‌گیرند.
                    </p>
                  </div>
                ) : (
                  <>
                    {/* 3-Column Elevated Podium */}
                    <div className="grid grid-cols-3 gap-2 items-end pt-5 pb-1">
                      {/* RANK #2 */}
                      {rank2 ? (
                        <div className="flex flex-col items-center text-center">
                          <div className="relative mb-1.5">
                            <div className="w-14 h-14 rounded-2xl overflow-hidden border-2 border-[#91B5BE] bg-[#101622] shadow-md">
                              <PixelImage
                                filename={rank2.avatar}
                                alt={rank2.fullName}
                                className="w-full h-full object-cover"
                              />
                            </div>
                            <span className="absolute -bottom-2 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-full bg-[#91B5BE] text-[#101622] text-[10px] font-black shadow">
                              ۲
                            </span>
                          </div>
                          <div className="text-xs font-black truncate max-w-full mt-1">
                            {rank2.fullName}
                          </div>
                          <span
                            className={`text-[10px] font-bold ${
                              isNight ? 'text-[#A3C1AD]' : 'text-[#3D5249]'
                            }`}
                          >
                            ورودی {rank2.cohortYear}
                          </span>
                          <div
                            className={`w-full mt-2 rounded-t-2xl pt-3 pb-2.5 px-1 border-t-2 border-x border-[#91B5BE]/50 flex flex-col items-center justify-center ${
                              isNight ? 'bg-[#131C2B]' : 'bg-[#EAE3D2]'
                            }`}
                            style={{ minHeight: '72px' }}
                          >
                            <span
                              className={`text-xs font-black ${
                                isNight ? 'text-[#91B5BE]' : 'text-[#14201B]'
                              }`}
                            >
                              {rank2.score.toLocaleString('fa-IR')}
                            </span>
                            <span
                              className={`text-[9px] font-bold ${
                                isNight ? 'text-[#A3C1AD]' : 'text-[#3D5249]'
                              }`}
                            >
                              امتیاز
                            </span>
                          </div>
                        </div>
                      ) : (
                        <div />
                      )}

                      {/* RANK #1 */}
                      {rank1 ? (
                        <div className="flex flex-col items-center text-center -mt-4">
                          <div className="w-8 h-8 -mb-1 z-20 animate-bounce">
                            <PixelImage
                              filename="24_badge_crown.png"
                              alt="تاج قهرمان"
                              className="w-full h-full object-contain drop-shadow-[0_2px_8px_rgba(212,171,88,0.8)]"
                            />
                          </div>

                          <div className="relative mb-1.5">
                            <div className="w-16 h-16 rounded-2xl overflow-hidden border-2 border-[#D4AB58] bg-[#101622] shadow-[0_0_20px_rgba(212,171,88,0.35)]">
                              <PixelImage
                                filename={rank1.avatar}
                                alt={rank1.fullName}
                                className="w-full h-full object-cover"
                              />
                            </div>
                            <span className="absolute -bottom-2 left-1/2 -translate-x-1/2 px-2.5 py-0.5 rounded-full bg-[#D4AB58] text-[#101622] text-[10px] font-black shadow">
                              ۱
                            </span>
                          </div>
                          <div
                            className={`text-xs font-black truncate max-w-full mt-1 ${
                              isNight ? 'text-[#D4AB58]' : 'text-[#14201B]'
                            }`}
                          >
                            {rank1.fullName}
                          </div>
                          <span
                            className={`text-[10px] font-bold ${
                              isNight ? 'text-[#A3C1AD]' : 'text-[#3D5249]'
                            }`}
                          >
                            ورودی {rank1.cohortYear}
                          </span>
                          <div
                            className={`w-full mt-2 rounded-t-2xl pt-4 pb-3 px-1 border-t-2 border-x border-[#D4AB58] flex flex-col items-center justify-center ${
                              isNight
                                ? 'bg-gradient-to-b from-[#2A2419] to-[#151C28]'
                                : 'bg-gradient-to-b from-[#F5E6C4] to-[#EAE3D2]'
                            }`}
                            style={{ minHeight: '94px' }}
                          >
                            <span
                              className={`text-sm font-black ${
                                isNight ? 'text-[#D4AB58]' : 'text-[#14201B]'
                              }`}
                            >
                              {rank1.score.toLocaleString('fa-IR')}
                            </span>
                            <span
                              className={`text-[9px] font-bold ${
                                isNight ? 'text-[#A3C1AD]' : 'text-[#3D5249]'
                              }`}
                            >
                              امتیاز الماس
                            </span>
                          </div>
                        </div>
                      ) : (
                        <div />
                      )}

                      {/* RANK #3 */}
                      {rank3 ? (
                        <div className="flex flex-col items-center text-center">
                          <div className="relative mb-1.5">
                            <div className="w-14 h-14 rounded-2xl overflow-hidden border-2 border-[#E77F6E] bg-[#101622] shadow-md">
                              <PixelImage
                                filename={rank3.avatar}
                                alt={rank3.fullName}
                                className="w-full h-full object-cover"
                              />
                            </div>
                            <span className="absolute -bottom-2 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-full bg-[#E77F6E] text-[#101622] text-[10px] font-black shadow">
                              ۳
                            </span>
                          </div>
                          <div className="text-xs font-black truncate max-w-full mt-1">
                            {rank3.fullName}
                          </div>
                          <span
                            className={`text-[10px] font-bold ${
                              isNight ? 'text-[#A3C1AD]' : 'text-[#3D5249]'
                            }`}
                          >
                            ورودی {rank3.cohortYear}
                          </span>
                          <div
                            className={`w-full mt-2 rounded-t-2xl pt-2.5 pb-2 px-1 border-t-2 border-x border-[#E77F6E]/50 flex flex-col items-center justify-center ${
                              isNight ? 'bg-[#131C2B]' : 'bg-[#EAE3D2]'
                            }`}
                            style={{ minHeight: '60px' }}
                          >
                            <span
                              className={`text-xs font-black ${
                                isNight ? 'text-[#E77F6E]' : 'text-[#14201B]'
                              }`}
                            >
                              {rank3.score.toLocaleString('fa-IR')}
                            </span>
                            <span
                              className={`text-[9px] font-bold ${
                                isNight ? 'text-[#A3C1AD]' : 'text-[#3D5249]'
                              }`}
                            >
                              امتیاز
                            </span>
                          </div>
                        </div>
                      ) : (
                        <div />
                      )}
                    </div>

                    {/* Remaining Leaderboard Rows */}
                    {restStudents.length > 0 && (
                      <div className="space-y-2 pt-2 border-t border-current/10">
                        {restStudents.map((stu) => (
                          <div
                            key={stu.id}
                            className={`p-2.5 rounded-2xl border flex items-center justify-between transition-all ${
                              stu.isCurrentUser
                                ? isNight
                                  ? 'bg-[#D4AB58]/15 border-[#D4AB58] text-[#F6F1E7]'
                                  : 'bg-[#F5E6C4] border-[#8F6B24] text-[#14201B]'
                                : isNight
                                ? 'bg-[#121A26] border-[#2C3E4C] text-[#F6F1E7]'
                                : 'bg-[#EAE3D2] border-[#C8BFA8] text-[#14201B]'
                            }`}
                          >
                            <div className="flex items-center gap-2.5">
                              <span
                                className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs font-black ${
                                  stu.isCurrentUser
                                    ? 'bg-[#D4AB58] text-[#101622]'
                                    : isNight
                                    ? 'bg-white/10 text-[#F6F1E7]'
                                    : 'bg-[#FFFFFF] text-[#14201B]'
                                }`}
                              >
                                {stu.rank.toLocaleString('fa-IR')}
                              </span>
                              <div className="w-9 h-9 rounded-xl overflow-hidden border border-white/15 bg-[#101622] shrink-0">
                                <PixelImage
                                  filename={stu.avatar}
                                  alt={stu.fullName}
                                  className="w-full h-full object-cover"
                                />
                              </div>
                              <div>
                                <div className="text-xs font-black flex items-center gap-1.5">
                                  <span>{stu.fullName}</span>
                                  {stu.isCurrentUser && (
                                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-[#D4AB58] text-[#101622] font-black">
                                      شما
                                    </span>
                                  )}
                                </div>
                                <div
                                  className={`text-[10px] font-bold ${
                                    isNight ? 'text-[#A3C1AD]' : 'text-[#3D5249]'
                                  }`}
                                >
                                  ورودی {stu.cohortYear} • سطح {stu.level.toLocaleString('fa-IR')}
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-1.5">
                              <PixelImage
                                filename="23_badge_diamond.png"
                                alt="الماس"
                                className="w-4 h-4 object-contain"
                              />
                              <span
                                className={`text-xs font-black ${
                                  isNight ? 'text-[#D4AB58]' : 'text-[#14201B]'
                                }`}
                              >
                                {stu.score.toLocaleString('fa-IR')}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>
            </>
          )}
        </div>

        {/* LEFT COLUMN IN RTL: LOOTBOX DISCOUNT STORE & WEEKLY QUESTS */}
        <div className="space-y-4">
          {/* 4. INTERACTIVE LOOTBOX DISCOUNT STORE WITH ADMIN PROBABILITIES */}
          {!lootboxStoreEnabled ? (
            <SectionMaintenanceBanner
              themeMode={themeMode}
              sectionTitle="فروشگاه صندوقچه جوایز و کد تخفیف"
            />
          ) : (
            <div
              className={`rounded-3xl p-4 border space-y-3.5 ${
                isNight
                  ? 'bg-gradient-to-b from-[#1D2638] to-[#151D2B] border-[#D4AB58]/50 text-[#F6F1E7] shadow-[0_5px_0_#0B101B]'
                  : 'bg-[#FFFFFF] border-[#C8BFA8] text-[#14201B] shadow-[0_5px_0_#C8BFA8]'
              }`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3
                    className={`text-sm font-black ${
                      isNight ? 'text-[#D4AB58]' : 'text-[#14201B]'
                    }`}
                  >
                    صندوقچه جوایز و تخفیف‌ها
                  </h3>
                  <p
                    className={`text-[11px] font-bold mt-0.5 ${
                      isNight ? 'text-[#A3C1AD]' : 'text-[#3D5249]'
                    }`}
                  >
                    قرعه‌کشی شفاف بر اساس درصد شانس تعیین‌شده توسط ادمین
                  </p>
                </div>
                <div className="px-2.5 py-1 rounded-xl bg-[#354B40] text-[#F6F1E7] text-xs font-black">
                  موجودی: <RollingNumber value={user.score} /> 💎
                </div>
              </div>

              {lootboxAlert && (
                <div
                  className={`p-3 rounded-2xl border text-xs font-bold leading-relaxed animate-fade-in ${
                    lootboxAlert.type === 'tamper'
                      ? 'bg-rose-950/90 border-rose-500 text-rose-100'
                      : 'bg-amber-950/90 border-amber-500 text-amber-100'
                  }`}
                >
                  {lootboxAlert.message}
                </div>
              )}

              <AnimatePresence>
                {unboxedResult && (
                  <motion.div
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.9, opacity: 0 }}
                    className={`p-4 rounded-2xl border-2 space-y-2.5 text-center shadow-xl ${
                      unboxedResult.prizeType === 'empty'
                        ? 'bg-zinc-900/95 border-rose-500/60 text-[#F6F1E7]'
                        : 'bg-gradient-to-r from-emerald-950/95 via-[#18342C] to-emerald-950/95 border-[#D4AB58] text-[#F6F1E7]'
                    }`}
                  >
                    <div className="text-xs font-black text-[#D4AB58]">
                      {unboxedResult.prizeType === 'empty'
                        ? '🎲 نتیجه قرعه‌کشی صندوقچه:'
                        : '🎉 تبریک مهندس! جایزه صندوقچه باز شد:'}
                    </div>
                    <div className="text-sm font-black text-[#F6F1E7]">
                      {unboxedResult.prizeTitle}
                    </div>

                    {unboxedResult.voucher && (
                      <>
                        <div
                          className="p-2 rounded-xl bg-black/50 border border-[#D4AB58]/50 font-mono text-sm font-black tracking-widest text-emerald-400"
                          dir="ltr"
                        >
                          {unboxedResult.voucher.code}
                        </div>
                        <div className="flex items-center justify-center gap-2 pt-1">
                          <button
                            type="button"
                            onClick={() => handleCopyVoucher(unboxedResult.voucher!.code)}
                            className="px-4 py-1.5 rounded-xl bg-[#D4AB58] text-[#101622] text-xs font-black cursor-pointer active:scale-95"
                          >
                            {copiedVoucherCode === unboxedResult.voucher.code
                              ? 'کد تخفیف کپی شد!'
                              : 'کپی کد تخفیف برای ثبت‌نام'}
                          </button>
                        </div>
                      </>
                    )}

                    {unboxedResult.prizeType === 'points' && unboxedResult.bonusPoints && (
                      <div className="text-xs font-black text-emerald-300">
                        +{unboxedResult.bonusPoints.toLocaleString('fa-IR')} امتیاز هدیه به موجودی شما اضافه شد! 💎
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* 2 Chest Cards Grid with Transparent Prize & Chance List */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Bronze Chest */}
                <div
                  className={`rounded-2xl p-3.5 border flex flex-col justify-between space-y-3 ${
                    isNight
                      ? 'bg-[#121A26] border-[#2C3E4C] text-[#F6F1E7]'
                      : 'bg-[#EAE3D2] border-[#C8BFA8] text-[#14201B]'
                  }`}
                >
                  <div className="flex flex-col items-center text-center space-y-2">
                    <motion.div
                      animate={
                        openingChestType === 'bronze'
                          ? { rotate: [-10, 12, -12, 10, 0], scale: [1, 1.18, 1] }
                          : {}
                      }
                      transition={{ duration: 0.5 }}
                      className="w-14 h-14 rounded-2xl bg-[#E77F6E]/15 border border-[#E77F6E]/40 p-2 flex items-center justify-center"
                    >
                      <PixelImage
                        filename="35_icon_gift_box.png"
                        alt="صندوقچه برنزی"
                        className="w-10 h-10 object-contain"
                      />
                    </motion.div>

                    <div>
                      <h4 className="text-xs font-black">صندوقچه برنزی</h4>
                      <span
                        className={`text-[11px] font-black block mt-0.5 ${
                          isNight ? 'text-[#E77F6E]' : 'text-[#9E2A2B]'
                        }`}
                      >
                        {(activeConfig.bronzeCost || 50).toLocaleString('fa-IR')} امتیاز الماس
                      </span>
                    </div>
                  </div>

                  {/* Transparent Prize List & Win Probabilities */}
                  <div className="p-2.5 rounded-xl bg-black/20 border border-current/10 space-y-1.5 text-right">
                    <div className="text-[10px] font-black opacity-80 border-b border-current/10 pb-1">
                      📋 لیست جوایز و درصد شانس:
                    </div>
                    {bronzePrizes.map((p) => (
                      <div
                        key={p.id}
                        className="flex items-center justify-between gap-1 text-[10px] font-bold"
                      >
                        <span className="truncate">{p.title}</span>
                        <span className="px-1.5 py-0.5 rounded bg-[#E77F6E]/20 text-[#E77F6E] font-black shrink-0">
                          {p.chancePercent.toLocaleString('fa-IR')}٪
                        </span>
                      </div>
                    ))}
                  </div>

                  <PushButton
                    variant="coral"
                    size="sm"
                    fullWidth
                    disabled={openingChestType !== null}
                    onClick={() => handleOpenLootbox('bronze')}
                  >
                    {openingChestType === 'bronze' ? 'در حال بازگشایی...' : 'باز کردن صندوقچه'}
                  </PushButton>
                </div>

                {/* Gold Chest */}
                <div
                  className={`rounded-2xl p-3.5 border flex flex-col justify-between space-y-3 ${
                    isNight
                      ? 'bg-[#121A26] border-[#D4AB58]/60 text-[#F6F1E7]'
                      : 'bg-[#EAE3D2] border-[#8F6B24] text-[#14201B]'
                  }`}
                >
                  <div className="flex flex-col items-center text-center space-y-2">
                    <motion.div
                      animate={
                        openingChestType === 'gold'
                          ? { rotate: [-14, 14, -14, 14, 0], scale: [1, 1.25, 1] }
                          : {}
                      }
                      transition={{ duration: 0.5 }}
                      className="w-14 h-14 rounded-2xl bg-[#D4AB58]/20 border border-[#D4AB58]/50 p-2 flex items-center justify-center"
                    >
                      <PixelImage
                        filename="35_icon_gift_box.png"
                        alt="صندوقچه طلایی صنایع"
                        className="w-10 h-10 object-contain drop-shadow-[0_4px_10px_rgba(212,171,88,0.5)]"
                      />
                    </motion.div>

                    <div>
                      <h4
                        className={`text-xs font-black ${
                          isNight ? 'text-[#D4AB58]' : 'text-[#14201B]'
                        }`}
                      >
                        صندوقچه طلایی صنایع
                      </h4>
                      <span
                        className={`text-[11px] font-black block mt-0.5 ${
                          isNight ? 'text-emerald-400' : 'text-[#354B40]'
                        }`}
                      >
                        {(activeConfig.goldCost || 100).toLocaleString('fa-IR')} امتیاز الماس
                      </span>
                    </div>
                  </div>

                  {/* Transparent Prize List & Win Probabilities */}
                  <div className="p-2.5 rounded-xl bg-black/20 border border-current/10 space-y-1.5 text-right">
                    <div className="text-[10px] font-black opacity-80 border-b border-current/10 pb-1">
                      📋 لیست جوایز و درصد شانس:
                    </div>
                    {goldPrizes.map((p) => (
                      <div
                        key={p.id}
                        className="flex items-center justify-between gap-1 text-[10px] font-bold"
                      >
                        <span className="truncate">{p.title}</span>
                        <span className="px-1.5 py-0.5 rounded bg-[#D4AB58]/20 text-[#D4AB58] font-black shrink-0">
                          {p.chancePercent.toLocaleString('fa-IR')}٪
                        </span>
                      </div>
                    ))}
                  </div>

                  <PushButton
                    variant="gold"
                    size="sm"
                    fullWidth
                    disabled={openingChestType !== null}
                    onClick={() => handleOpenLootbox('gold')}
                  >
                    {openingChestType === 'gold' ? 'در حال بازگشایی...' : 'باز کردن صندوقچه'}
                  </PushButton>
                </div>
              </div>

              {/* User's Saved Vouchers Wallet */}
              {vouchers.length > 0 && (
                <div className="pt-2 border-t border-current/10 space-y-2">
                  <span className="text-[11px] font-black block">
                    کیف پول کدهای تخفیف فعال شما ({vouchers.length.toLocaleString('fa-IR')}):
                  </span>
                  <div className="space-y-1.5">
                    {vouchers.map((v) => (
                      <div
                        key={v.id}
                        className={`p-2.5 rounded-xl border flex items-center justify-between text-xs ${
                          isNight
                            ? 'bg-black/25 border-[#D4AB58]/30 text-[#F6F1E7]'
                            : 'bg-[#EAE3D2] border-[#C8BFA8] text-[#14201B]'
                        }`}
                      >
                        <div>
                          <div className="font-black text-[11px]">{v.title}</div>
                          <div
                            className={`font-mono text-[11px] font-bold ${
                              isNight ? 'text-emerald-400' : 'text-[#354B40]'
                            }`}
                            dir="ltr"
                          >
                            {v.code}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleCopyVoucher(v.code)}
                          className="px-2.5 py-1 rounded-lg bg-[#D4AB58] text-[#101622] font-black text-[10px] cursor-pointer"
                        >
                          {copiedVoucherCode === v.code ? 'کپی شد!' : 'کپی کد'}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 5. WEEKLY POINT QUESTS (ماموریت‌های امتیازی هفته) */}
          <div
            className={`rounded-3xl p-4 border space-y-3 ${
              isNight
                ? 'bg-[#1A2424] border-[#2C3E4C] text-[#F6F1E7] shadow-[0_5px_0_#0B101B]'
                : 'bg-[#FFFFFF] border-[#C8BFA8] text-[#14201B] shadow-[0_5px_0_#C8BFA8]'
            }`}
          >
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-black">ماموریت‌های امتیازی هفته</h3>
              <span
                className={`text-[11px] font-black ${
                  isNight ? 'text-[#7FB69E]' : 'text-[#354B40]'
                }`}
              >
                پاداش فوری الماس
              </span>
            </div>

            <div className="space-y-2.5">
              {quests.map((quest) => {
                const isCompleted = quest.progress >= quest.maxProgress;
                return (
                  <div
                    key={quest.id}
                    className={`p-3 rounded-2xl border flex items-center justify-between gap-3 ${
                      isNight
                        ? 'bg-[#121A26] border-[#2C3E4C] text-[#F6F1E7]'
                        : 'bg-[#EAE3D2] border-[#C8BFA8] text-[#14201B]'
                    }`}
                  >
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-black truncate">{quest.title}</span>
                        <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-[#D4AB58] text-[#101622] shrink-0">
                          +{quest.rewardPoints.toLocaleString('fa-IR')} امتیاز
                        </span>
                      </div>
                      <p
                        className={`text-[11px] font-medium leading-snug ${
                          isNight ? 'text-[#A3C1AD]' : 'text-[#3D5249]'
                        }`}
                      >
                        {quest.description}
                      </p>
                    </div>

                    <div className="shrink-0">
                      {quest.isClaimed ? (
                        <span className="px-3 py-1.5 rounded-xl bg-emerald-600/20 text-emerald-500 border border-emerald-500/40 text-[11px] font-black inline-block">
                          دریافت شد!
                        </span>
                      ) : isCompleted ? (
                        <button
                          type="button"
                          onClick={() => {
                            playFanfare();
                            onClaimQuest(quest.id, quest.rewardPoints, quest.title);
                          }}
                          className="px-3 py-1.5 rounded-xl bg-[#D4AB58] text-[#101622] text-[11px] font-black shadow-[0_3px_0_#8F6B24] active:translate-y-0.5 cursor-pointer"
                        >
                          دریافت جایزه ✨
                        </button>
                      ) : (
                        <span
                          className={`px-2.5 py-1 rounded-xl border text-[11px] font-black inline-block ${
                            isNight
                              ? 'bg-white/5 border-white/10 text-[#A3C1AD]'
                              : 'bg-[#FFFFFF] border-[#C8BFA8] text-[#14201B]'
                          }`}
                        >
                          {quest.progress.toLocaleString('fa-IR')} /{' '}
                          {quest.maxProgress.toLocaleString('fa-IR')}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

