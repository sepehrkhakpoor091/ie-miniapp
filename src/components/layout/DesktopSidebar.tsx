/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Responsive Desktop & Laptop Right-Hand Sidebar Navigation (lg:flex w-72 shrink-0)
 */

import React from 'react';
import { TabType, ThemeMode, UserProfile } from '../../types';
import { PixelImage } from '../PixelImage';
import { RollingNumber } from '../ui/RollingNumber';
import { playSwitch, playTick } from '../../utils/soundEngine';
import { calculateLevelFromScore } from '../../utils/gamification';

interface DesktopSidebarProps {
  user: UserProfile;
  activeTab: TabType;
  themeMode: ThemeMode;
  isSoundActive: boolean;
  onChangeTab: (tab: TabType) => void;
  onToggleTheme: () => void;
  onToggleSound: () => void;
  onOpenProfessorsModal: () => void;
  onOpenRemindersModal: () => void;
  onOpenSupportModal: () => void;
  onOpenAnnouncementsDrawer: () => void;
  onOpenCurriculumModal?: () => void;
  onAvatarStealthTap: () => void;
}

export const DesktopSidebar: React.FC<DesktopSidebarProps> = ({
  user,
  activeTab,
  themeMode,
  isSoundActive,
  onChangeTab,
  onToggleTheme,
  onToggleSound,
  onOpenProfessorsModal,
  onOpenRemindersModal,
  onOpenSupportModal,
  onOpenAnnouncementsDrawer,
  onOpenCurriculumModal,
  onAvatarStealthTap,
}) => {
  const isNight = themeMode === 'night';
  const dynamicLevel = calculateLevelFromScore(user.score);

  const mainNavItems: { id: TabType; label: string; subtitle: string; iconFile: string }[] = [
    {
      id: 'home',
      label: 'خانه و پیشخوان',
      subtitle: 'رویداد ویژه و دسترسی سریع',
      iconFile: dynamicLevel.badgeIcon,
    },
    {
      id: 'events',
      label: 'رویدادها و کارگاه‌ها',
      subtitle: 'ثبت‌نام و دریافت بلیط QR',
      iconFile: '29_icon_calendar.png',
    },
    {
      id: 'achievements',
      label: 'تالار افتخارات',
      subtitle: 'جدول برترین‌ها و صندوقچه',
      iconFile: '19_badge_trophy.png',
    },
    {
      id: 'profile',
      label: 'پروفایل دانشجویی',
      subtitle: 'نشان‌ها، گواهی‌ها و سوابق',
      iconFile: '03_frame_laurel.png',
    },
  ];

  const quickShortcuts = [
    {
      label: 'چارت درسی ۱۴۲ واحد',
      iconFile: '20_badge_chart.png',
      onClick: () => onOpenCurriculumModal?.(),
    },
    {
      label: 'رادار اساتید',
      iconFile: '30_icon_professor.png',
      onClick: onOpenProfessorsModal,
    },
    {
      label: 'یادآورهای هوشمند',
      iconFile: '29_icon_calendar.png',
      onClick: onOpenRemindersModal,
    },
    {
      label: 'اطلاعیه‌های کانال',
      iconFile: '31_icon_bell.png',
      onClick: onOpenAnnouncementsDrawer,
    },
  ];

  return (
    <aside
      className={`hidden lg:flex flex-col w-72 shrink-0 border-l min-h-screen sticky top-0 h-screen p-5 justify-between select-none transition-colors ${
        isNight
          ? 'bg-[#121A26] border-[#2C3E4C] text-[#F6F1E7]'
          : 'bg-[#EAE3D2] border-[#C8BFA8] text-[#14201B]'
      }`}
    >
      <div className="space-y-5 overflow-y-auto no-scrollbar pr-0.5">
        {/* 1. Association Brand Header */}
        <div className="flex items-center gap-3 pb-4 border-b border-current/10">
          <div className="w-11 h-11 rounded-2xl bg-[#354B40] border-2 border-[#D4AB58] p-1.5 flex items-center justify-center shrink-0 shadow-md">
            <PixelImage
              filename="20_badge_shield.png"
              alt="انجمن علمی مهندسی صنایع"
              className="w-8 h-8 object-contain"
            />
          </div>
          <div>
            <h2 className="text-sm font-black tracking-tight">انجمن علمی مهندسی صنایع</h2>
            <p className={`text-[11px] font-bold ${isNight ? 'text-[#A3C1AD]' : 'text-[#3D5249]'}`}>
              سامانه جامع دانشجویی • نسخه دسکتاپ
            </p>
          </div>
        </div>

        {/* 2. Student Avatar & Level Summary Card (Supports 5-Tap Stealth Gesture) */}
        <div
          onClick={onAvatarStealthTap}
          className={`rounded-2xl p-3.5 border-2 cursor-pointer transition-transform active:scale-[0.99] ${
            isNight
              ? 'bg-[#1A2424] border-[#2C3E4C] hover:border-[#D4AB58]/60'
              : 'bg-[#FFFFFF] border-[#C8BFA8] hover:border-[#354B40]'
          }`}
          title="پروفایل دانشجویی"
        >
          <div className="flex items-center gap-3">
            <div className="w-13 h-13 rounded-2xl overflow-hidden border-2 border-[#D4AB58] bg-[#101622] shrink-0">
              <PixelImage
                filename={user.avatar}
                alt={user.fullName}
                className="w-full h-full object-cover"
              />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-sm font-black truncate">{user.fullName}</div>
              <div className={`text-[11px] font-bold ${isNight ? 'text-[#A3C1AD]' : 'text-[#3D5249]'}`}>
                ورودی {user.cohortYear} • سطح {dynamicLevel.level.toLocaleString('fa-IR')}
              </div>
              <div className="mt-1 inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-[#D4AB58]/20 text-[#D4AB58] text-xs font-black">
                <RollingNumber value={user.score} />
                <span>الماس</span>
              </div>
            </div>
          </div>
        </div>

        {/* 3. 4 Main Tabs */}
        <div className="space-y-1.5">
          <div className={`text-[11px] font-black px-1 ${isNight ? 'text-[#A3C1AD]' : 'text-[#3D5249]'}`}>
            بخش‌های اصلی سامانه
          </div>
          {mainNavItems.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  playTick();
                  onChangeTab(item.id);
                }}
                className={`w-full p-3 rounded-2xl border text-right flex items-center gap-3 transition-all cursor-pointer ${
                  isActive
                    ? 'bg-[#354B40] text-[#F6F1E7] border-[#1F2E27] border-b-[3px] shadow-md'
                    : isNight
                    ? 'bg-[#1A2424] text-[#F6F1E7] border-[#2C3E4C] hover:bg-[#223030]'
                    : 'bg-[#FFFFFF] text-[#14201B] border-[#C8BFA8] hover:bg-[#F5EFE2]'
                }`}
              >
                <div className="w-9 h-9 rounded-xl bg-black/20 p-1.5 flex items-center justify-center shrink-0">
                  <PixelImage
                    filename={item.iconFile}
                    alt={item.label}
                    className="w-full h-full object-contain"
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-black truncate">{item.label}</div>
                  <div
                    className={`text-[10px] truncate ${
                      isActive
                        ? 'text-[#A3C1AD]'
                        : isNight
                        ? 'text-[#A3C1AD]'
                        : 'text-[#3D5249]'
                    }`}
                  >
                    {item.subtitle}
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* 4. Quick Access Shortcuts */}
        <div className="space-y-2">
          <div className={`text-[11px] font-black px-1 ${isNight ? 'text-[#A3C1AD]' : 'text-[#3D5249]'}`}>
            ابزارها و دسترسی سریع
          </div>
          <div className="grid grid-cols-2 gap-2">
            {quickShortcuts.map((sc) => (
              <button
                key={sc.label}
                type="button"
                onClick={() => {
                  playTick();
                  sc.onClick();
                }}
                className={`p-2.5 rounded-2xl border flex flex-col items-center text-center gap-1.5 transition-all active:scale-95 cursor-pointer ${
                  isNight
                    ? 'bg-[#1A2424] border-[#2C3E4C] text-[#F6F1E7] hover:border-[#D4AB58]/60'
                    : 'bg-[#FFFFFF] border-[#C8BFA8] text-[#14201B] hover:border-[#354B40]'
                }`}
              >
                <div className="w-8 h-8 flex items-center justify-center">
                  <PixelImage
                    filename={sc.iconFile}
                    alt={sc.label}
                    className="w-7 h-7 object-contain"
                  />
                </div>
                <span className="text-[11px] font-black leading-tight">{sc.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 5. Bottom Theme & Sound Controls */}
      <div className="pt-3 border-t border-current/10 grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => {
            playSwitch();
            onToggleTheme();
          }}
          className={`py-2.5 px-3 rounded-xl border text-xs font-black flex items-center justify-center gap-1.5 cursor-pointer transition-all ${
            isNight
              ? 'bg-[#1A2424] border-[#2C3E4C] text-[#F6F1E7] hover:bg-[#223030]'
              : 'bg-[#FFFFFF] border-[#C8BFA8] text-[#14201B] hover:bg-[#F5EFE2]'
          }`}
        >
          <span>{isNight ? '☀️ تم روز' : '🌙 تم شب'}</span>
        </button>

        <button
          type="button"
          onClick={onToggleSound}
          className={`py-2.5 px-3 rounded-xl border text-xs font-black flex items-center justify-center gap-1.5 cursor-pointer transition-all ${
            isNight
              ? 'bg-[#1A2424] border-[#2C3E4C] text-[#F6F1E7] hover:bg-[#223030]'
              : 'bg-[#FFFFFF] border-[#C8BFA8] text-[#14201B] hover:bg-[#F5EFE2]'
          }`}
        >
          <span>{isSoundActive ? '🔊 صدا فعال' : '🔇 بی‌صدا'}</span>
        </button>
      </div>
    </aside>
  );
};
