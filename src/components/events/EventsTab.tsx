/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Complete Events & Workshops Tab matching Middle Phone 1:1 on Mobile & 2/3-Col Grid on Desktop
 * Includes Secret Search Command (#admin / /admin) & FeatureFlags Kill-Switch Support
 */

import React, { useState } from 'react';
import { EventCategory, EventItem, EventSortOption, ThemeMode } from '../../types';
import { EVENTS_DATA, filterAndSortEvents } from '../../utils/events';
import { PixelImage } from '../PixelImage';
import { SectionMaintenanceBanner } from '../ui/SectionMaintenanceBanner';
import { playTick, playCoin } from '../../utils/soundEngine';
import { ChevronRight, Filter, Search, X } from 'lucide-react';

interface EventsTabProps {
  themeMode: ThemeMode;
  events?: EventItem[];
  registrationEnabled?: boolean;
  onBackToHome: () => void;
  onSelectEventForCheckout: (event: EventItem) => void;
  onTriggerStealthAdmin?: () => void;
}

const CATEGORIES: { id: EventCategory; label: string }[] = [
  { id: 'all', label: 'همه' },
  { id: 'workshop', label: 'کارگاه' },
  { id: 'visit', label: 'بازدید علمی' },
  { id: 'seminar', label: 'سمینار' },
];

export const EventsTab: React.FC<EventsTabProps> = ({
  themeMode,
  events = EVENTS_DATA,
  registrationEnabled = true,
  onBackToHome,
  onSelectEventForCheckout,
  onTriggerStealthAdmin,
}) => {
  const isNight = themeMode === 'night';
  const [selectedCategory, setSelectedCategory] = useState<EventCategory>('all');
  const [sortOption, setSortOption] = useState<EventSortOption>('newest');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSortModalOpen, setIsSortModalOpen] = useState(false);

  const safeEvents = Array.isArray(events) && events.length > 0 ? events : EVENTS_DATA;
  const categoryFiltered = filterAndSortEvents(safeEvents, selectedCategory, sortOption);

  const displayedEvents = categoryFiltered.filter((ev) => {
    const q = searchQuery.trim();
    if (!q) return true;
    return (
      ev.title.includes(q) ||
      ev.instructor.includes(q) ||
      ev.location.includes(q) ||
      ev.categoryLabel.includes(q)
    );
  });

  const handleSearchInputChange = (val: string) => {
    const trimmed = val.trim().toLowerCase();
    // Secret Stealth Command #2: Typing `#admin` or `/admin` opens AdminVaultModal
    if (trimmed === '#admin' || trimmed === '/admin') {
      playCoin();
      setSearchQuery('');
      onTriggerStealthAdmin?.();
      return;
    }
    setSearchQuery(val);
  };

  return (
    <div className="flex flex-col min-h-screen pb-24 lg:pb-10 select-none animate-fade-in">
      {/* 1. Top Navigation Bar: Back button, Title, Filter Funnel */}
      <div
        className={`sticky top-0 z-20 px-4 py-3 lg:rounded-b-3xl border-b backdrop-blur-md transition-colors ${
          isNight
            ? 'bg-[#101622]/95 border-[#2C3E4C] text-[#F6F1E7]'
            : 'bg-[#FAF7F0]/95 border-[#C8BFA8] text-[#14201B]'
        }`}
      >
        <div className="flex items-center justify-between">
          {/* Back button on Left (in RTL, points right towards home) */}
          <button
            onClick={() => {
              playTick();
              onBackToHome();
            }}
            className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all active:scale-95 border cursor-pointer ${
              isNight
                ? 'bg-[#1A2424] border-[#2C3E4C] text-[#F6F1E7] hover:bg-[#223030]'
                : 'bg-[#EAE3D2] border-[#C8BFA8] text-[#14201B] hover:bg-[#DFD6C3]'
            }`}
            aria-label="بازگشت به خانه"
          >
            <ChevronRight className="w-5 h-5" />
          </button>

          {/* Title */}
          <h1 className="text-base lg:text-lg font-black tracking-tight">
            رویدادها و کارگاه‌ها
          </h1>

          {/* Filter Funnel button on Right */}
          <button
            onClick={() => {
              playTick();
              setIsSortModalOpen(true);
            }}
            className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all active:scale-95 border cursor-pointer ${
              isNight
                ? 'bg-[#1A2424] border-[#2C3E4C] hover:bg-[#223030]'
                : 'bg-[#EAE3D2] border-[#C8BFA8] hover:bg-[#DFD6C3]'
            }`}
            aria-label="مرتب‌سازی و فیلتر"
            title="فیلتر و مرتب‌سازی"
          >
            <Filter className={`w-4 h-4 ${isNight ? 'text-[#D4AB58]' : 'text-[#354B40]'}`} />
          </button>
        </div>

        {/* Search Input Bar (also supports #admin / /admin stealth command) */}
        <div className="mt-3 relative">
          <Search
            className={`w-4 h-4 absolute right-3 top-2.5 pointer-events-none ${
              isNight ? 'text-[#A3C1AD]' : 'text-[#3D5249]'
            }`}
          />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => handleSearchInputChange(e.target.value)}
            placeholder="جستجوی کارگاه، استاد یا محل برگزاری..."
            className={`w-full pr-9 pl-3 py-2 rounded-xl text-xs font-bold border focus:outline-none transition-colors ${
              isNight
                ? 'bg-[#1A2424] border-[#2C3E4C] text-[#F6F1E7] placeholder:text-[#A3C1AD]/70 focus:border-[#D4AB58]'
                : 'bg-[#FFFFFF] border-[#C8BFA8] text-[#14201B] placeholder:text-[#3D5249]/75 focus:border-[#354B40]'
            }`}
          />
        </div>

        {/* 2. Category Filter Pills */}
        <div className="flex items-center gap-2 mt-3 overflow-x-auto pb-1">
          {CATEGORIES.map((cat) => {
            const isActive = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => {
                  playTick();
                  setSelectedCategory(cat.id);
                }}
                className={`flex-1 py-1.5 px-3 rounded-full text-xs font-black transition-all duration-100 cursor-pointer text-center border-b-[3px] active:translate-y-[2px] active:border-b-[1px] ${
                  isActive
                    ? isNight
                      ? 'bg-[#7FB69E] text-[#101622] border-[#4F7CAC] shadow-sm'
                      : 'bg-[#354B40] text-[#F6F1E7] border-[#1F2E27] shadow-sm'
                    : isNight
                    ? 'bg-[#1A2424] text-[#A3C1AD] border-[#2C3E4C] hover:bg-[#223030]'
                    : 'bg-[#EAE3D2] text-[#14201B] border-[#C8BFA8] hover:bg-[#DFD6C3]'
                }`}
              >
                {cat.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. Event Cards Grid (1-col Mobile / 2-col md / 3-col xl Desktop) */}
      <div className="p-4 lg:px-0 w-full flex-1">
        {!registrationEnabled ? (
          <SectionMaintenanceBanner
            themeMode={themeMode}
            sectionTitle="ثبت‌نام کارگاه‌ها و رویدادها"
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {displayedEvents.map((event, index) => (
              <div
                key={event.id}
                style={{ animationDelay: `${index * 60}ms` }}
                className={`rounded-2xl p-3.5 border-2 border-b-[4px] transition-all duration-150 flex items-center gap-3.5 shadow-md ${
                  isNight
                    ? 'bg-[#1A2424] border-[#2C3E4C] border-b-[#141C1C] text-[#F6F1E7]'
                    : 'bg-[#FFFFFF] border-[#C8BFA8] border-b-[#B5AA94] text-[#14201B]'
                }`}
              >
                {/* Left Column: Pixel Art Thumbnail + Star Pill */}
                <div className="w-[100px] h-[100px] rounded-xl overflow-hidden relative shrink-0 shadow-sm border border-white/10 bg-black/30 flex items-center justify-center">
                  <PixelImage
                    filename={event.imageFilename}
                    alt={event.title}
                    className="w-full h-full object-cover"
                  />

                  {/* Star Rating Floating Pill on bottom of thumbnail */}
                  <div
                    className="absolute bottom-1.5 left-1.5 px-1.5 py-0.5 rounded-md bg-[#101622]/90 backdrop-blur-sm text-[#F6F1E7] text-[10px] font-extrabold flex items-center gap-1 border border-white/10"
                    dir="ltr"
                  >
                    <svg viewBox="0 0 24 24" className="w-2.5 h-2.5 fill-[#D4AB58]">
                      <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26" />
                    </svg>
                    <span>{event.rating}</span>
                  </div>
                </div>

                {/* Right Column: Typography + 3D Register Pill */}
                <div className="flex-1 flex flex-col justify-between min-h-[96px] min-w-0">
                  <div>
                    <h3
                      className={`text-sm font-extrabold leading-snug tracking-tight mb-1 ${
                        isNight ? 'text-[#F6F1E7]' : 'text-[#14201B]'
                      }`}
                    >
                      {event.title}
                    </h3>
                    <div
                      className={`text-[11px] font-bold space-y-0.5 ${
                        isNight ? 'text-[#A3C1AD]' : 'text-[#3D5249]'
                      }`}
                    >
                      <div>{event.date}</div>
                      <div>ظرفیت: {event.capacityRemaining} نفر</div>
                    </div>
                  </div>

                  {/* 3D Pushable Register Button */}
                  <div className="flex justify-end pt-1">
                    <button
                      onClick={() => {
                        playTick();
                        onSelectEventForCheckout(event);
                      }}
                      className={`rounded-full py-1 px-5 text-xs font-black transition-all duration-75 cursor-pointer border-b-[3px] active:translate-y-[2px] active:border-b-[1px] shadow-sm ${
                        isNight
                          ? 'bg-[#7FB69E] text-[#101622] hover:bg-[#8EC2AB] border-[#4F7CAC]'
                          : 'bg-[#354B40] text-[#F6F1E7] hover:bg-[#3E584B] border-[#1F2E27]'
                      }`}
                    >
                      ثبت نام
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 4. Campus Panoramic Illustration Footer matching Middle Phone */}
      <div className="relative w-full h-24 lg:rounded-3xl overflow-hidden mt-4 opacity-85">
        <PixelImage
          filename={isNight ? '09_banner_night.png' : '10_banner_day.png'}
          alt="دورنمای دانشکده صنایع"
          className="w-full h-full object-cover object-bottom"
        />
        <div
          className={`absolute inset-0 bg-gradient-to-b ${
            isNight
              ? 'from-[#101622] via-[#101622]/60 to-transparent'
              : 'from-[#F6F1E7] via-[#F6F1E7]/60 to-transparent'
          }`}
        />
      </div>

      {/* Sort Options Modal */}
      {isSortModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm select-none">
          <div
            className={`w-full max-w-xs rounded-3xl p-5 border shadow-2xl ${
              isNight
                ? 'bg-[#141C24] border-[#2C3E4C] text-[#F6F1E7]'
                : 'bg-[#FAF7F0] border-[#C8BFA8] text-[#14201B]'
            }`}
          >
            <div className="flex items-center justify-between pb-3 border-b border-current/10 mb-3">
              <h3 className="font-bold text-sm">مرتب‌سازی رویدادها</h3>
              <button
                onClick={() => setIsSortModalOpen(false)}
                className="w-6 h-6 rounded-lg flex items-center justify-center hover:bg-black/10"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2 text-xs">
              {[
                { id: 'newest', label: 'جدیدترین رویدادها' },
                { id: 'points', label: 'بیشترین امتیاز جایزه 💎' },
                { id: 'capacity', label: 'کمترین ظرفیت باقیمانده' },
              ].map((opt) => (
                <button
                  key={opt.id}
                  onClick={() => {
                    playTick();
                    setSortOption(opt.id as EventSortOption);
                    setIsSortModalOpen(false);
                  }}
                  className={`w-full p-2.5 rounded-xl border text-right font-bold transition-all cursor-pointer ${
                    sortOption === opt.id
                      ? 'bg-[#354B40] text-[#F6F1E7] border-[#7FB69E]'
                      : isNight
                      ? 'bg-white/5 border-white/10 text-[#F6F1E7] hover:bg-white/10'
                      : 'bg-[#EAE3D2] border-[#C8BFA8] text-[#14201B] hover:bg-[#DFD6C3]'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
