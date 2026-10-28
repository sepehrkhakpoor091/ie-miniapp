/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Official Referral & Invite Link Card for Industrial Engineering Students
 */

import React, { useState } from 'react';
import { AdminStudentDossier, ThemeMode, UserProfile } from '../../types';
import { getRealTelegramUser } from '../../utils/security';
import { playCoin, playTick } from '../../utils/soundEngine';
import { Check, Copy, Share2, Users, Sparkles } from 'lucide-react';

interface ReferralInviteCardProps {
  user: UserProfile;
  themeMode: ThemeMode;
  realStudents?: AdminStudentDossier[];
  serverReferralStats?: {
    referredCount: number;
    pointsEarned: number;
  };
}

export const ReferralInviteCard: React.FC<ReferralInviteCardProps> = ({
  user,
  themeMode,
  realStudents = [],
  serverReferralStats,
}) => {
  const isNight = themeMode === 'night';
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  const realTgUser = getRealTelegramUser();
  const rawTgId =
    (typeof window !== 'undefined' &&
      window.Telegram?.WebApp?.initDataUnsafe?.user?.id) ||
    realTgUser?.id ||
    user.telegramUserId ||
    user.studentId ||
    '402100';

  const cleanTelegramId = String(rawTgId).replace(/^usr-|^web-user-|^web-local-/i, '').trim() || '402100';
  const personalRefCode = `REF-${cleanTelegramId}`;
  const personalInviteLink = `https://t.me/narennngi_bot?start=ref_${cleanTelegramId}`;

  // Calculate real verified friends who registered with this student's referralCode
  const localReferredCount = (Array.isArray(realStudents) ? realStudents : []).filter(
    (s) =>
      s &&
      s.studentId &&
      s.studentId !== user.studentId &&
      s.referredBy &&
      s.referredBy.trim().toUpperCase() === personalRefCode.toUpperCase()
  ).length;

  const referredCount = Math.max(
    Number(serverReferralStats?.referredCount ?? 0),
    Number(user.referredCount ?? 0),
    localReferredCount
  );

  const pointsEarned = Math.max(
    Number(serverReferralStats?.pointsEarned ?? 0),
    Number(user.referralPointsEarned ?? 0),
    referredCount * 10
  );

  const handleCopyCode = () => {
    playCoin();
    navigator.clipboard?.writeText(personalRefCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2200);
  };

  const handleCopyLink = () => {
    playCoin();
    navigator.clipboard?.writeText(personalInviteLink);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2200);
  };

  const handleShareOnTelegram = () => {
    playTick();
    const shareText = `🎓 سلام! به مینی‌اپ و ربات رسمی انجمن علمی مهندسی صنایع فردوسی بپیوند و با کد دعوت من (${personalRefCode}) در بدو ورود +۵ امتیاز هدیه بگیر! ✨`;
    const shareUrl = `https://t.me/share/url?url=${encodeURIComponent(
      personalInviteLink
    )}&text=${encodeURIComponent(shareText)}`;

    if (typeof window !== 'undefined' && window.Telegram?.WebApp?.openTelegramLink) {
      window.Telegram.WebApp.openTelegramLink(shareUrl);
    } else if (typeof window !== 'undefined') {
      window.location.href = shareUrl;
    }
  };

  return (
    <div
      className={`rounded-2xl p-4 border-2 space-y-3 transition-all ${
        isNight
          ? 'bg-gradient-to-br from-[#1A2628] via-[#16212B] to-[#121A24] border-[#D4AB58]/60 text-[#F6F1E7] shadow-[0_5px_0_#0B101B]'
          : 'bg-gradient-to-br from-[#FFFDF8] via-[#FAF5E8] to-[#F2EAD8] border-[#8F6B24] text-[#14201B] shadow-[0_5px_0_#C8BFA8]'
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="space-y-0.5">
          <h3 className="text-xs sm:text-sm font-black text-[#D4AB58] flex items-center gap-1.5">
            <span>🎁 دعوت از دوستان صنایعی و دریافت امتیاز</span>
          </h3>
          <p
            className={`text-[11px] font-bold leading-relaxed ${
              isNight ? 'text-[#A3C1AD]' : 'text-[#3D5249]'
            }`}
          >
            با دعوت هر دانشجوی صنایع، <span className="text-[#D4AB58] font-black">+۱۰ امتیاز</span> به شما و{' '}
            <span className="text-emerald-400 font-black">+۵ امتیاز هدیه ورود</span> به دوستتان اهدا می‌شود!
          </p>
        </div>
        <span className="px-2 py-1 rounded-xl bg-[#D4AB58]/20 border border-[#D4AB58]/40 text-[#D4AB58] text-[10px] font-black shrink-0 flex items-center gap-1">
          <Sparkles className="w-3 h-3" />
          هدیه دوطرفه
        </span>
      </div>

      {/* Referral Code Box */}
      <div
        className={`p-2.5 rounded-xl border flex items-center justify-between gap-2 ${
          isNight ? 'bg-[#101622]/90 border-white/10' : 'bg-[#FFFFFF] border-[#C8BFA8]'
        }`}
      >
        <div className="min-w-0">
          <span className="text-[10px] font-bold opacity-75 block">
            کد دعوت اختصاصی شما:
          </span>
          <span
            dir="ltr"
            className="font-mono font-black text-xs sm:text-sm tracking-wider text-[#D4AB58]"
          >
            {personalRefCode}
          </span>
        </div>
        <button
          type="button"
          onClick={handleCopyCode}
          className="px-3 py-1.5 rounded-xl bg-[#D4AB58] hover:bg-[#e0b865] text-[#101622] text-[11px] font-black flex items-center gap-1 cursor-pointer shrink-0 active:scale-95 transition-transform"
        >
          {copiedCode ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
          <span>{copiedCode ? 'کپی شد ✓' : 'کپی کد دعوت'}</span>
        </button>
      </div>

      {/* Direct Invite Link Box */}
      <div
        className={`p-2.5 rounded-xl border space-y-2 ${
          isNight ? 'bg-[#101622]/90 border-white/10' : 'bg-[#FFFFFF] border-[#C8BFA8]'
        }`}
      >
        <div className="flex items-center justify-between gap-2">
          <span className="text-[10px] font-bold opacity-75">
            لینک دعوت مستقیم به ربات و مینی‌اپ:
          </span>
          <button
            type="button"
            onClick={handleCopyLink}
            className="text-[10px] font-black text-[#D4AB58] hover:underline flex items-center gap-1 cursor-pointer"
          >
            {copiedLink ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
            <span>{copiedLink ? 'لینک کپی شد!' : 'کپی لینک دعوت'}</span>
          </button>
        </div>

        <div
          dir="ltr"
          className="px-2.5 py-1.5 rounded-lg bg-black/25 text-[10px] font-mono text-emerald-400 truncate select-all"
        >
          {personalInviteLink}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-0.5">
          <button
            type="button"
            onClick={handleCopyLink}
            className={`py-2 px-3 rounded-xl border text-xs font-black flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 transition-all ${
              isNight
                ? 'bg-white/5 border-white/15 text-[#F6F1E7] hover:bg-white/10'
                : 'bg-[#EAE3D2] border-[#C8BFA8] text-[#14201B]'
            }`}
          >
            {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copiedLink ? 'لینک دعوت کپی شد ✓' : '🔗 کپی لینک دعوت'}</span>
          </button>

          <button
            type="button"
            onClick={handleShareOnTelegram}
            className="py-2 px-3 rounded-xl bg-[#354B40] hover:bg-[#3f594c] text-[#F6F1E7] border border-[#7FB69E]/40 text-xs font-black flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 transition-all shadow"
          >
            <Share2 className="w-3.5 h-3.5 text-[#D4AB58]" />
            <span>📤 اشتراک‌گذاری مستقیم در تلگرام</span>
          </button>
        </div>
      </div>

      {/* Real Referral Stats Bar */}
      <div
        className={`px-3 py-2 rounded-xl border text-[11px] font-black flex flex-wrap items-center justify-between gap-2 ${
          isNight
            ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-300'
            : 'bg-[#354B40] border-[#22312A] text-[#F6F1E7]'
        }`}
      >
        <span className="flex items-center gap-1">
          <Users className="w-3.5 h-3.5 text-[#D4AB58]" />
          👥 دوستان احراز هویت شده با کد شما: {referredCount.toLocaleString('fa-IR')} نفر
        </span>
        <span className="text-[#D4AB58]">
          💎 امتیاز دریافتی: {pointsEarned.toLocaleString('fa-IR')} امتیاز
        </span>
      </div>
    </div>
  );
};
