/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Tactile Card component with pixel borders and WCAG AAA High-Contrast Day/Night theme support
 */

import React from 'react';
import { ThemeMode } from '../../types';

interface TactileCardProps extends React.HTMLAttributes<HTMLDivElement> {
  themeMode?: ThemeMode;
  variant?: 'surface' | 'deep' | 'accent' | 'flat';
  interactive?: boolean;
  onClick?: () => void;
  className?: string;
  children: React.ReactNode;
}

export const TactileCard: React.FC<TactileCardProps> = ({
  themeMode = 'night',
  variant = 'surface',
  interactive = false,
  onClick,
  className = '',
  children,
  ...rest
}) => {
  const isNight = themeMode === 'night';

  const baseStyles = 'rounded-2xl transition-all duration-100 overflow-hidden relative';

  const variantStyles = {
    surface: isNight
      ? 'bg-[#1A2424] border border-[#2C3E4C] text-[#F6F1E7] shadow-[0_4px_12px_rgba(0,0,0,0.3)]'
      : 'bg-[#FFFFFF] border border-[#C8BFA8] text-[#14201B] shadow-[0_4px_12px_rgba(0,0,0,0.06)]',
    deep: isNight
      ? 'bg-[#121B1B] border border-[#1F2C33] text-[#F6F1E7]'
      : 'bg-[#EAE3D2] border border-[#C8BFA8] text-[#14201B]',
    accent: isNight
      ? 'bg-gradient-to-br from-[#1A2A2A] to-[#14323B] border border-[#234D5A] text-[#F6F1E7]'
      : 'bg-gradient-to-br from-[#FFFFFF] to-[#EAE3D2] border border-[#C8BFA8] text-[#14201B]',
    flat: isNight
      ? 'bg-[#101622]/85 border border-[#2C3E4C]/70 text-[#F6F1E7]'
      : 'bg-[#EAE3D2]/90 border border-[#C8BFA8] text-[#14201B]',
  };

  const interactiveStyles = interactive
    ? 'cursor-pointer border-b-[3px] active:translate-y-[2px] active:border-b-[1px]'
    : '';

  return (
    <div
      role={onClick ? 'button' : rest.role}
      tabIndex={onClick ? 0 : rest.tabIndex}
      onClick={onClick}
      onKeyDown={(e) => {
        if (onClick && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault();
          onClick();
        }
        rest.onKeyDown?.(e);
      }}
      className={`
        ${baseStyles}
        ${variantStyles[variant]}
        ${interactiveStyles}
        ${className}
      `}
      {...rest}
    >
      {children}
    </div>
  );
};
