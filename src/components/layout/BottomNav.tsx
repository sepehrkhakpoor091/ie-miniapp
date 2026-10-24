/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Fixed 4-Tab Mobile Bottom Navigation Bar (hidden on lg: Desktop screens)
 */

import React from 'react';
import { TabType, ThemeMode } from '../../types';
import { playTick } from '../../utils/soundEngine';
import {
  Home,
  Trophy,
  CalendarDays,
  UserCircle,
} from 'lucide-react';

interface BottomNavProps {
  activeTab: TabType;
  onChangeTab: (tab: TabType) => void;
  themeMode: ThemeMode;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  activeTab,
  onChangeTab,
  themeMode,
}) => {
  const isNight = themeMode === 'night';

  const tabs: { id: TabType; label: string; icon: React.ReactNode }[] = [
    {
      id: 'home',
      label: 'خانه',
      icon: <Home className="w-5 h-5" />,
    },
    {
      id: 'achievements',
      label: 'افتخارات',
      icon: <Trophy className="w-5 h-5" />,
    },
    {
      id: 'events',
      label: 'برنامه',
      icon: <CalendarDays className="w-5 h-5" />,
    },
    {
      id: 'profile',
      label: 'پروفایل',
      icon: <UserCircle className="w-5 h-5" />,
    },
  ];

  return (
    <nav
      className={`lg:hidden fixed bottom-0 left-0 right-0 z-30 border-t backdrop-blur-xl select-none ${
        isNight
          ? 'bg-[#101622]/95 border-[#2C3E4C] text-[#F6F1E7]'
          : 'bg-[#FAF7F0]/95 border-[#C8BFA8] text-[#14201B]'
      }`}
      style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 6px)' }}
    >
      <div className="max-w-md mx-auto px-4 py-2 flex items-center justify-around">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => {
                if (!isActive) {
                  playTick();
                  onChangeTab(tab.id);
                }
              }}
              className={`flex-1 py-1.5 px-2 rounded-2xl flex flex-col items-center justify-center transition-all duration-100 cursor-pointer ${
                isActive
                  ? isNight
                    ? 'bg-[#354B40] text-[#7FB69E] shadow-sm translate-y-[-2px] border-b-2 border-[#1F2E27]'
                    : 'bg-[#354B40] text-[#F6F1E7] shadow-sm translate-y-[-2px] border-b-2 border-[#1F2E27]'
                  : isNight
                  ? 'text-[#A3C1AD] hover:text-[#F6F1E7] hover:translate-y-[-1px]'
                  : 'text-[#3D5249] hover:text-[#14201B] hover:translate-y-[-1px]'
              }`}
              aria-label={tab.label}
            >
              <div className="relative">
                {tab.icon}
                {isActive && (
                  <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-[#D4AB58]" />
                )}
              </div>
              <span className="text-[11px] font-bold mt-1 tracking-tight">
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
