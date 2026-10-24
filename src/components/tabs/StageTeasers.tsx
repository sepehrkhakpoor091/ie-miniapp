/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Clean Navigation Hooks & Teasers for Upcoming Stages 2, 3, and 4
 */

import React from 'react';
import { TabType, ThemeMode, UserProfile } from '../../types';
import { PixelImage } from '../PixelImage';
import { PushButton } from '../ui/PushButton';
import { playTick } from '../../utils/soundEngine';
import {
  Trophy,
  Calendar,
  User,
  Sparkles,
  ArrowRight,
  Shield,
  Ticket,
  Lock,
} from 'lucide-react';

interface StageTeaserProps {
  tab: TabType;
  user: UserProfile;
  themeMode: ThemeMode;
  onBackToHome: () => void;
  onOpenEventModal?: () => void;
  onOpenKycLock?: () => void;
}

export const StageTeasers: React.FC<StageTeaserProps> = ({
  tab,
  user,
  themeMode,
  onBackToHome,
  onOpenEventModal,
  onOpenKycLock,
}) => {
  const isNight = themeMode === 'night';

  if (tab === 'achievements') {
    return (
      <div className="p-4 max-w-md mx-auto space-y-4 pb-24 animate-fade-in select-none">
        <div className="flex items-center justify-between pb-2 border-b border-white/10">
          <button
            onClick={() => {
              playTick();
              onBackToHome();
            }}
            className="text-xs text-[#D4AB58] hover:underline flex items-center gap-1 font-bold"
          >
            <ArrowRight className="w-4 h-4" />
            بازگشت به خانه
          </button>
          <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-[#D4AB58]/20 text-[#D4AB58]">
            پیش‌نمایش مرحله ۲
          </span>
        </div>

        {/* Header */}
        <div className="text-center space-y-2 py-2">
          <div className="w-20 h-20 mx-auto rounded-3xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center p-2 shadow-lg">
            <PixelImage
              filename="19_badge_trophy.png"
              alt="افتخارات و لیدربورد"
              className="w-14 h-14 object-contain"
            />
          </div>
          <h2 className="text-lg font-bold text-[#F6F1E7]">تالار افتخارات و رتبه‌بندی دانشجویان</h2>
          <p className="text-xs text-[#91B5BE] max-w-xs mx-auto">
            موتور رقابت‌های دانشجویی و نشان‌های افتخار پیکسل‌آرت در استیج ۲ توسعه داده می‌شود.
          </p>
        </div>

        {/* User Badges Preview */}
        <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-3">
          <div className="flex items-center justify-between text-xs font-bold">
            <span className="flex items-center gap-1.5 text-[#D4AB58]">
              <Trophy className="w-4 h-4" />
              نشان‌های کسب‌شده شما:
            </span>
            <span className="text-zinc-400">۴ از ۶ نشان</span>
          </div>

          <div className="grid grid-cols-6 gap-2">
            {[
              '19_badge_trophy.png',
              '20_badge_shield.png',
              '21_badge_medal.png',
              '22_badge_book.png',
              '23_badge_diamond.png',
              '24_badge_crown.png',
            ].map((badge, idx) => (
              <div
                key={badge}
                className={`p-2 rounded-xl border flex items-center justify-center ${
                  idx < 4
                    ? 'bg-white/10 border-[#D4AB58]/40 shadow-sm'
                    : 'bg-black/30 border-white/5 opacity-30 grayscale'
                }`}
              >
                <PixelImage filename={badge} alt="نشان" className="w-8 h-8 object-contain" />
              </div>
            ))}
          </div>
        </div>

        <PushButton variant="gold" fullWidth onClick={onBackToHome}>
          بازگشت به صفحه اصلی
        </PushButton>
      </div>
    );
  }

  if (tab === 'events') {
    return (
      <div className="p-4 max-w-md mx-auto space-y-4 pb-24 animate-fade-in select-none">
        <div className="flex items-center justify-between pb-2 border-b border-white/10">
          <button
            onClick={() => {
              playTick();
              onBackToHome();
            }}
            className="text-xs text-[#D4AB58] hover:underline flex items-center gap-1 font-bold"
          >
            <ArrowRight className="w-4 h-4" />
            بازگشت به خانه
          </button>
          <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-[#E77F6E]/20 text-[#E77F6E]">
            پیش‌نمایش مرحله ۳
          </span>
        </div>

        {/* Header */}
        <div className="text-center space-y-2 py-2">
          <div className="w-20 h-20 mx-auto rounded-3xl bg-coral-500/10 border border-[#E77F6E]/30 flex items-center justify-center p-2 shadow-lg">
            <PixelImage
              filename="29_icon_calendar.png"
              alt="رویدادها و کارگاه‌ها"
              className="w-14 h-14 object-contain"
            />
          </div>
          <h2 className="text-lg font-bold text-[#F6F1E7]">تقویم جامع رویدادها و کارگاه‌ها</h2>
          <p className="text-xs text-[#91B5BE] max-w-xs mx-auto">
            سامانه رزرو کارگاه‌ها، ثبت‌نام بازدیدهای صنعتی و سمینارهای علمی.
          </p>
        </div>

        {/* Featured Workshop Quick Tile */}
        <div
          onClick={onOpenEventModal}
          className="p-4 rounded-2xl bg-white/5 border border-white/10 hover:border-[#D4AB58] transition-all cursor-pointer space-y-2"
        >
          <div className="flex items-center justify-between text-xs">
            <span className="px-2 py-0.5 rounded-md bg-[#E77F6E] text-black font-bold text-[10px]">
              رویداد ویژه ماه
            </span>
            <span className="opacity-70 text-[11px]">۲۵ آبان ۱۴۰۴</span>
          </div>
          <h4 className="font-bold text-sm">کارگاه مدیریت و کنترل پروژه کاربردی</h4>
          <p className="text-xs opacity-75">
            همراه با اعطای مدرک معتبر و ظرفیت باقیمانده ۴۵ نفر.
          </p>
          <div className="pt-2">
            <PushButton variant="gold" size="sm" fullWidth onClick={onOpenEventModal}>
              مشاهده و ثبت‌نام سریع
            </PushButton>
          </div>
        </div>

        <PushButton variant="secondary" fullWidth onClick={onBackToHome}>
          بازگشت به صفحه اصلی
        </PushButton>
      </div>
    );
  }

  // Profile Tab (Stage 4)
  return (
    <div className="p-4 max-w-md mx-auto space-y-4 pb-24 animate-fade-in select-none">
      <div className="flex items-center justify-between pb-2 border-b border-white/10">
        <button
          onClick={() => {
            playTick();
            onBackToHome();
          }}
          className="text-xs text-[#D4AB58] hover:underline flex items-center gap-1 font-bold"
        >
          <ArrowRight className="w-4 h-4" />
          بازگشت به خانه
        </button>
        <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-[#7FB69E]/20 text-[#7FB69E]">
          پیش‌نمایش مرحله ۴
        </span>
      </div>

      {/* Profile Card */}
      <div className="p-5 rounded-3xl bg-[#1A2424] border border-[#253247] text-center space-y-3 relative overflow-hidden">
        <div className="w-24 h-24 mx-auto rounded-full p-1 bg-gradient-to-tr from-[#D4AB58] to-[#FCE7A4] flex items-center justify-center shadow-lg">
          <div className="w-full h-full rounded-full bg-[#101622] flex items-center justify-center overflow-hidden">
            <PixelImage
              filename={user.avatar || '01_avatar_boy.png'}
              alt={user.fullName}
              className="w-16 h-16 object-contain"
            />
          </div>
        </div>

        <div>
          <h3 className="text-base font-bold text-[#F6F1E7]">{user.fullName}</h3>
          <p className="text-xs text-[#91B5BE] mt-0.5">
            دانشجوی ورودی {user.cohortYear} • شماره دانشجویی: {user.studentId}
          </p>
        </div>

        {/* Stats Pill */}
        <div className="grid grid-cols-3 gap-2 pt-2 border-t border-white/10 text-xs">
          <div className="p-2 rounded-xl bg-white/5">
            <span className="font-mono font-bold text-sm text-[#D4AB58] block">
              {user.score}
            </span>
            <span className="text-[10px] opacity-70">امتیاز کل</span>
          </div>
          <div className="p-2 rounded-xl bg-white/5">
            <span className="font-mono font-bold text-sm text-[#7FB69E] block">۱۲</span>
            <span className="text-[10px] opacity-70">رویدادها</span>
          </div>
          <div className="p-2 rounded-xl bg-white/5">
            <span className="font-mono font-bold text-sm text-[#E77F6E] block">۵</span>
            <span className="text-[10px] opacity-70">گواهینامه‌ها</span>
          </div>
        </div>

        <div className="pt-2">
          <PushButton
            variant="primary"
            size="sm"
            fullWidth
            onClick={onOpenKycLock}
            icon={<Shield className="w-3.5 h-3.5" />}
          >
            مشاهده وضعیت احراز هویت دانشجویی (KYC)
          </PushButton>
        </div>
      </div>

      <PushButton variant="gold" fullWidth onClick={onBackToHome}>
        بازگشت به صفحه اصلی
      </PushButton>
    </div>
  );
};
