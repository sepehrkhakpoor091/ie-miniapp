/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 3D Pushable Tactile Button with Physical Depression and Audio Feedback
 */

import React from 'react';
import { playTick } from '../../utils/soundEngine';

export type ButtonVariant = 'primary' | 'gold' | 'coral' | 'secondary' | 'surface' | 'danger';

interface PushButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
  children: React.ReactNode;
  icon?: React.ReactNode;
}

export const PushButton: React.FC<PushButtonProps> = ({
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  children,
  icon,
  onClick,
  disabled,
  className = '',
  ...rest
}) => {
  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (disabled) return;
    playTick();
    if (onClick) {
      onClick(e);
    }
  };

  // Base 3D tactile physics
  const baseClasses =
    'relative inline-flex items-center justify-center font-bold transition-all duration-75 select-none rounded-xl cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed disabled:active:translate-y-0 disabled:active:border-b-[4px]';

  // Size styles
  const sizeClasses = {
    sm: 'text-xs px-3 py-1.5 border-b-[3px] active:translate-y-[2px] active:border-b-[1px]',
    md: 'text-sm px-4 py-2.5 border-b-[4px] active:translate-y-[3px] active:border-b-[1px]',
    lg: 'text-base px-6 py-3.5 border-b-[5px] active:translate-y-[4px] active:border-b-[1px]',
  };

  // Variant color definitions with matching darker bottom lips for 3D extrusion
  const variantClasses: Record<ButtonVariant, string> = {
    // Deep Forest / Mint
    primary:
      'bg-[#354B40] text-[#F6F1E7] border-t border-l border-r border-[#4A6456] border-b-[#1F2E27] hover:bg-[#3E584B] shadow-sm',
    // Rich Warm Gold
    gold:
      'bg-[#D4AB58] text-[#1D2A24] border-t border-l border-r border-[#E8C779] border-b-[#9C782E] hover:bg-[#DDB669] shadow-sm',
    // Warm Cozy Coral
    coral:
      'bg-[#E77F6E] text-[#1D2A24] border-t border-l border-r border-[#F39F91] border-b-[#B45041] hover:bg-[#EC8E7F] shadow-sm',
    // Card Surface / Charcoal Teal
    surface:
      'bg-[#1A2424] text-[#F6F1E7] border-t border-l border-r border-[#2C3B3B] border-b-[#111919] hover:bg-[#233030]',
    // Neutral Slate
    secondary:
      'bg-[#253247] text-[#F6F1E7] border-t border-l border-r border-[#354661] border-b-[#17202F] hover:bg-[#2F3F59]',
    // Security / Danger
    danger:
      'bg-[#9E2A2B] text-white border-t border-l border-r border-[#BF3A3C] border-b-[#631819] hover:bg-[#AD3032]',
  };

  return (
    <button
      onClick={handleClick}
      disabled={disabled}
      className={`
        ${baseClasses}
        ${sizeClasses[size]}
        ${variantClasses[variant]}
        ${fullWidth ? 'w-full' : ''}
        ${className}
      `}
      {...rest}
    >
      <span className="flex items-center justify-center gap-2">
        {icon && <span className="flex-shrink-0">{icon}</span>}
        <span>{children}</span>
      </span>
    </button>
  );
};
