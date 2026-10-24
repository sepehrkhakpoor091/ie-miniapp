/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Sleek Student Quick Menu Drawer opened from the Top Header 4-Dot Grid Squircle Button
 * Strictly keeps Admin buttons & AI Assistant out of Student Quick Menu (Stealth Entry Only)
 */

import React from 'react';
import { ThemeMode } from '../../types';
import { playTick, playSwitch } from '../../utils/soundEngine';
import { PushButton } from './PushButton';
import {
  X,
  Moon,
  Sun,
  Volume2,
  VolumeX,
  Shield,
  GraduationCap,
} from 'lucide-react';

interface QuickMenuDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  themeMode: ThemeMode;
  isSoundActive: boolean;
  onToggleTheme: () => void;
  onToggleSound: () => void;
  onOpenKycLock: () => void;
  onOpenOnboarding: () => void;
}

export const QuickMenuDrawer: React.FC<QuickMenuDrawerProps> = ({
  isOpen,
  onClose,
  themeMode,
  isSoundActive,
  onToggleTheme,
  onToggleSound,
  onOpenKycLock,
  onOpenOnboarding,
}) => {
  const isNight = themeMode === 'night';

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/75 backdrop-blur-sm select-none animate-fade-in text-right"
      dir="rtl"
    >
      <div
        className={`w-full max-w-md rounded-t-3xl border-t border-l border-r p-5 shadow-2xl transition-all duration-300 transform translate-y-0 ${
          isNight
            ? 'bg-[#141C24] border-[#2C3E4C] text-[#F6F1E7]'
            : 'bg-[#FAF7F0] border-[#C8BFA8] text-[#14201B]'
        }`}
      >
        <div className="w-12 h-1.5 rounded-full bg-current/20 mx-auto mb-4" />

        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-current/10 mb-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-[#D4AB58]/20 text-[#D4AB58] flex items-center justify-center font-black">
              IE
            </div>
            <div>
              <h3 className="font-black text-sm">منوی دسترسی سریع و تنظیمات دانشجویی</h3>
              <p
                className={`text-[11px] font-bold ${
                  isNight ? 'text-[#A3C1AD]' : 'text-[#3D5249]'
                }`}
              >
                تم روز و شب، صدا، ویرایش پروفایل و احراز هویت
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              playTick();
              onClose();
            }}
            className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-current/10 active:scale-95 cursor-pointer"
            aria-label="بستن منو"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Options List (No Public Admin Buttons — Stealth Entry Only) */}
        <div className="space-y-2.5">
          {/* Theme Mode Toggle */}
          <button
            type="button"
            onClick={() => {
              playSwitch();
              onToggleTheme();
            }}
            className={`w-full p-3 rounded-2xl border transition-all flex items-center justify-between cursor-pointer active:scale-[0.98] ${
              isNight
                ? 'bg-[#1A2424] hover:bg-[#223030] border-[#2C3E4C] text-[#F6F1E7]'
                : 'bg-[#FFFFFF] hover:bg-[#EAE3D2] border-[#C8BFA8] text-[#14201B]'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-500 flex items-center justify-center">
                {isNight ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
              </div>
              <div className="text-right">
                <div className="font-black text-xs">🌙/☀️ تغییر تم روز و شب</div>
                <div
                  className={`text-[10px] font-bold ${
                    isNight ? 'text-[#A3C1AD]' : 'text-[#3D5249]'
                  }`}
                >
                  {isNight ? 'حالت فعال: شب (Night Pixel)' : 'حالت فعال: روز گرم (Warm Pastel)'}
                </div>
              </div>
            </div>
            <span
              className={`text-xs font-black ${
                isNight ? 'text-[#D4AB58]' : 'text-[#354B40]'
              }`}
            >
              {isNight ? '🌙 شب' : '☀️ روز'}
            </span>
          </button>

          {/* Sound Toggle */}
          <button
            type="button"
            onClick={() => {
              onToggleSound();
            }}
            className={`w-full p-3 rounded-2xl border transition-all flex items-center justify-between cursor-pointer active:scale-[0.98] ${
              isNight
                ? 'bg-[#1A2424] hover:bg-[#223030] border-[#2C3E4C] text-[#F6F1E7]'
                : 'bg-[#FFFFFF] hover:bg-[#EAE3D2] border-[#C8BFA8] text-[#14201B]'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-500 flex items-center justify-center">
                {isSoundActive ? (
                  <Volume2 className="w-4 h-4" />
                ) : (
                  <VolumeX className="w-4 h-4 text-zinc-400" />
                )}
              </div>
              <div className="text-right">
                <div className="font-black text-xs">🔊 صدا و افکت‌های مکانیکی</div>
                <div
                  className={`text-[10px] font-bold ${
                    isNight ? 'text-[#A3C1AD]' : 'text-[#3D5249]'
                  }`}
                >
                  افکت‌های کلیک، سکه و فیدبک لمسی تلگرام
                </div>
              </div>
            </div>
            <span className="text-xs font-black text-emerald-500">
              {isSoundActive ? 'فعال' : 'غیرفعال'}
            </span>
          </button>

          {/* Student Onboarding Wizard */}
          <button
            type="button"
            onClick={() => {
              playTick();
              onClose();
              onOpenOnboarding();
            }}
            className={`w-full p-3 rounded-2xl border transition-all flex items-center justify-between cursor-pointer active:scale-[0.98] ${
              isNight
                ? 'bg-[#1A2424] hover:bg-[#223030] border-[#2C3E4C] text-[#F6F1E7]'
                : 'bg-[#FFFFFF] hover:bg-[#EAE3D2] border-[#C8BFA8] text-[#14201B]'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-sky-500/20 text-sky-500 flex items-center justify-center">
                <GraduationCap className="w-4 h-4" />
              </div>
              <div className="text-right">
                <div className="font-black text-xs">🎓 ثبت‌نام اولیه و ویرایش پروفایل</div>
                <div
                  className={`text-[10px] font-bold ${
                    isNight ? 'text-[#A3C1AD]' : 'text-[#3D5249]'
                  }`}
                >
                  انتخاب آواتار، تعیین ورودی و شماره تماس
                </div>
              </div>
            </div>
            <span className="text-xs font-bold">←</span>
          </button>

          {/* KYC Lock Test */}
          <button
            type="button"
            onClick={() => {
              playTick();
              onClose();
              onOpenKycLock();
            }}
            className={`w-full p-3 rounded-2xl border transition-all flex items-center justify-between cursor-pointer active:scale-[0.98] ${
              isNight
                ? 'bg-[#1A2424] hover:bg-[#223030] border-[#2C3E4C] text-[#F6F1E7]'
                : 'bg-[#FFFFFF] hover:bg-[#EAE3D2] border-[#C8BFA8] text-[#14201B]'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-[#D4AB58] flex items-center justify-center">
                <Shield className="w-4 h-4" />
              </div>
              <div className="text-right">
                <div className="font-black text-xs">🪪 تست قفل KYC</div>
                <div
                  className={`text-[10px] font-bold ${
                    isNight ? 'text-[#A3C1AD]' : 'text-[#3D5249]'
                  }`}
                >
                  بررسی سامانه تطبیق کارت فیزیکی دانشجو
                </div>
              </div>
            </div>
            <span className="text-xs font-bold">←</span>
          </button>
        </div>

        <div className="pt-4">
          <PushButton variant="secondary" fullWidth onClick={onClose}>
            بستن منو
          </PushButton>
        </div>
      </div>
    </div>
  );
};
