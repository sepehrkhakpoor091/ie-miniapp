/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Slot-Machine Rolling Numbers Animator for Points & Currency
 */

import React, { useEffect, useState } from 'react';

interface RollingNumberProps {
  value: number;
  duration?: number;
  className?: string;
  suffix?: string;
  formatTomanDigits?: boolean;
}

export const RollingNumber: React.FC<RollingNumberProps> = ({
  value,
  duration = 600,
  className = '',
  suffix = '',
  formatTomanDigits = false,
}) => {
  const [displayValue, setDisplayValue] = useState(value);

  useEffect(() => {
    if (displayValue === value) return;

    const startValue = displayValue;
    const diff = value - startValue;
    const startTime = performance.now();

    let animationFrameId: number;

    const updateCounter = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // Smooth ease-out cubic curve
      const easeProgress = 1 - Math.pow(1 - progress, 3);
      const current = Math.round(startValue + diff * easeProgress);

      setDisplayValue(current);

      if (progress < 1) {
        animationFrameId = requestAnimationFrame(updateCounter);
      } else {
        setDisplayValue(value);
      }
    };

    animationFrameId = requestAnimationFrame(updateCounter);

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [value, duration]);

  const formatted = displayValue.toLocaleString('fa-IR');

  return (
    <span className={`inline-block tabular-nums transition-transform ${className}`}>
      {formatted}
      {suffix && <span className="mr-1">{suffix}</span>}
    </span>
  );
};
