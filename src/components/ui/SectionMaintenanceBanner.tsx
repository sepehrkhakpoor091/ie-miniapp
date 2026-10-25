/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Cozy Pixel-Art Section Maintenance / Kill-Switch Notice Card (07_char_laptop.png)
 */

import React from 'react';
import { ThemeMode } from '../../types';
import { PixelImage } from '../PixelImage';

interface SectionMaintenanceBannerProps {
  themeMode: ThemeMode;
  sectionTitle?: string;
  onStealthTap?: () => void;
}

export const SectionMaintenanceBanner: React.FC<SectionMaintenanceBannerProps> = ({
  themeMode,
  sectionTitle,
  onStealthTap,
}) => {
  const isNight = themeMode === 'night';

  return (
    <div
      className={`rounded-3xl p-6 border-2 text-center space-y-3 shadow-lg transition-colors ${
        isNight
          ? 'bg-[#1A2424] border-[#2C3E4C] text-[#F6F1E7]'
          : 'bg-[#FFFFFF] border-[#C8BFA8] text-[#14201B]'
      }`}
    >
      <div
        onClick={onStealthTap}
        className="w-20 h-20 mx-auto rounded-2xl bg-[#D4AB58]/15 border-2 border-[#D4AB58]/50 p-2 flex items-center justify-center cursor-pointer active:scale-95 transition-transform"
      >
        <PixelImage
          filename="07_char_laptop.png"
          alt="در حال بروزرسانی"
          className="w-16 h-16 object-contain"
        />
      </div>

      {sectionTitle && (
        <span className="inline-block text-[11px] font-black px-3 py-1 rounded-full bg-[#D4AB58]/20 text-[#D4AB58]">
          بخش: {sectionTitle}
        </span>
      )}

      <h3 className="text-sm sm:text-base font-black leading-relaxed">
        🚧 این بخش موقتاً توسط انجمن علمی در حال بروزرسانی است و به زودی فعال می‌شود
      </h3>

      <p
        className={`text-xs font-medium leading-relaxed max-w-md mx-auto ${
          isNight ? 'text-[#A3C1AD]' : 'text-[#3D5249]'
        }`}
      >
        تیم فنی انجمن علمی مهندسی صنایع در حال ارتقای این سرویس می‌باشد. از شکیبایی شما سپاسگزاریم.
      </p>
    </div>
  );
};
