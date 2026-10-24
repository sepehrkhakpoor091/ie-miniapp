/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Faculty Directory & Live Office Radar Modal for Industrial Engineering Department
 * Includes FeatureFlags Kill-Switch Support & WCAG AAA Day/Night Readability
 */

import React, { useState } from 'react';
import { Professor, ThemeMode } from '../../types';
import { PixelImage } from '../PixelImage';
import { SectionMaintenanceBanner } from '../ui/SectionMaintenanceBanner';
import { playTick } from '../../utils/soundEngine';
import {
  X,
  Search,
  MapPin,
  Clock,
  Mail,
  GraduationCap,
  Radio,
} from 'lucide-react';

interface ProfessorsModalProps {
  isOpen: boolean;
  onClose: () => void;
  themeMode: ThemeMode;
  professors?: Professor[];
  professorsDirectoryEnabled?: boolean;
}

export const PROFESSORS_DATA: Professor[] = [
  {
    id: 'prof-1',
    name: 'دکتر محمدرضا رضایی',
    title: 'استاد تمام - گروه بهینه‌سازی و سیستم‌های تولیدی',
    avatar: '01_avatar_boy.png',
    office: 'اتاق ۳۰۵ (طبقه سوم دانشکده صنایع)',
    officeHours: 'شنبه و دوشنبه: ۱۰:۰۰ الی ۱۲:۰۰',
    isCurrentlyInOffice: true,
    email: 'm.rezaei@aut.ac.ir',
    courses: [
      { name: 'تحقیق در عملیات ۱', dayAndTime: 'شنبه و دوشنبه ۰۸:۰۰ - ۰۹:۳۰', room: 'کلاس ۲۰۱' },
      { name: 'برنامه‌ریزی خطی پیشرفته', dayAndTime: 'یکشنبه ۱۰:۰۰ - ۱۲:۰۰', room: 'آمفی‌تئاتر' },
    ],
  },
  {
    id: 'prof-2',
    name: 'دکتر سارا شمسایی',
    title: 'دانشیار - گروه مدیریت پروژه و تحلیل زنجیره تامین',
    avatar: '02_avatar_girl.png',
    office: 'اتاق ۲۱۲ (طبقه دوم دانشکده صنایع)',
    officeHours: 'یکشنبه و سه‌شنبه: ۱۳:۳۰ الی ۱۵:۳۰',
    isCurrentlyInOffice: true,
    email: 's.shamsaei@aut.ac.ir',
    courses: [
      { name: 'مدیریت و کنترل پروژه', dayAndTime: 'سه‌شنبه و چهارشنبه ۰۸:۰۰ - ۱۰:۰۰', room: 'کلاس ۱۰۴' },
      { name: 'اقتصاد مهندسی', dayAndTime: 'یکشنبه ۱۰:۰۰ - ۱۲:۰۰', room: 'کلاس ۲۰۵' },
    ],
  },
  {
    id: 'prof-3',
    name: 'دکتر بهزاد کاظمی',
    title: 'استادیار - گروه علم داده و هوش مصنوعی در صنایع',
    avatar: '01_avatar_boy.png',
    office: 'اتاق ۴۰۸ (مرکز تحقیقات محاسباتی)',
    officeHours: 'شنبه و چهارشنبه: ۱۴:۰۰ الی ۱۶:۰۰',
    isCurrentlyInOffice: false,
    email: 'b.kazemi@aut.ac.ir',
    courses: [
      { name: 'شبیه‌سازی سیستم‌های گسسته-پیشامد', dayAndTime: 'دوشنبه ۱۰:۰۰ - ۱۲:۰۰', room: 'سایت تخصصی' },
      { name: 'داده‌کاوی در مهندسی صنایع', dayAndTime: 'چهارشنبه ۱۰:۰۰ - ۱۲:۰۰', room: 'کلاس ۳۰۲' },
    ],
  },
  {
    id: 'prof-4',
    name: 'دکتر مریم نادری',
    title: 'استادیار - گروه مهندسی کیفیت و قابلیت اطمینان',
    avatar: '02_avatar_girl.png',
    office: 'اتاق ۱۱۸ (طبقه اول دانشکده صنایع)',
    officeHours: 'دوشنبه و سه‌شنبه: ۰۹:۰۰ الی ۱۱:۰۰',
    isCurrentlyInOffice: false,
    email: 'm.naderi@aut.ac.ir',
    courses: [
      { name: 'کنترل کیفیت آماری', dayAndTime: 'شنبه و دوشنبه ۱۳:۳۰ - ۱۵:۰۰', room: 'کلاس ۲۰۲' },
      { name: 'طرح آزمایش‌ها (DOE)', dayAndTime: 'سه‌شنبه ۱۳:۳۰ - ۱۵:۳۰', room: 'کلاس ۲۰۱' },
    ],
  },
];

export const ProfessorsModal: React.FC<ProfessorsModalProps> = ({
  isOpen,
  onClose,
  themeMode,
  professors = PROFESSORS_DATA,
  professorsDirectoryEnabled = true,
}) => {
  const isNight = themeMode === 'night';
  const [searchQuery, setSearchQuery] = useState('');
  const [filterActiveOffice, setFilterActiveOffice] = useState(false);

  if (!isOpen) return null;

  const safeProfessors =
    Array.isArray(professors) && professors.length > 0 ? professors : PROFESSORS_DATA;

  const filtered = safeProfessors.filter((p) => {
    const coursesList = Array.isArray(p.courses) ? p.courses : [];
    const matchesSearch =
      p.name.includes(searchQuery) ||
      p.title.includes(searchQuery) ||
      coursesList.some((c) => c.name.includes(searchQuery));
    const matchesFilter = filterActiveOffice ? p.isCurrentlyInOffice : true;
    return matchesSearch && matchesFilter;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in select-none">
      <div
        className={`w-full max-w-lg rounded-3xl border ${
          isNight
            ? 'bg-[#141C24] border-[#2C3E4C] text-[#F6F1E7]'
            : 'bg-[#FAF7F0] border-[#C8BFA8] text-[#14201B]'
        } shadow-2xl flex flex-col h-[88vh] max-h-[88vh] overflow-hidden`}
      >
        {/* Header */}
        <div
          className={`p-4 border-b flex items-center justify-between ${
            isNight ? 'border-[#2C3E4C] bg-[#101622]' : 'border-[#C8BFA8] bg-[#EAE3D2]'
          }`}
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#354B40]/30 border border-[#7FB69E]/40 flex items-center justify-center p-1">
              <PixelImage
                filename="05_char_study.png"
                alt="اساتید و مطالعه"
                className="w-8 h-8 object-contain"
              />
            </div>
            <div>
              <h3 className="font-black text-sm">رادار اساتید و ساعات حضور در دفتر</h3>
              <p
                className={`text-[11px] font-bold ${
                  isNight ? 'text-[#A3C1AD]' : 'text-[#3D5249]'
                }`}
              >
                راهنمای اساتید دانشکده مهندسی صنایع
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              playTick();
              onClose();
            }}
            className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-current/10 active:scale-95"
            aria-label="بستن"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {!professorsDirectoryEnabled ? (
          <div className="p-4">
            <SectionMaintenanceBanner
              themeMode={themeMode}
              sectionTitle="بانک اطلاعات و برنامه اساتید"
            />
          </div>
        ) : (
          <>
            {/* Search & Active Presence Filter Toggle */}
            <div className="p-3 border-b border-current/10 space-y-2">
              <div className="relative">
                <Search className="w-4 h-4 absolute right-3 top-3 opacity-60" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="جستجوی نام استاد، عنوان درس یا شماره اتاق..."
                  className={`w-full pr-9 pl-3 py-2 rounded-xl text-xs font-bold border focus:outline-none transition-all ${
                    isNight
                      ? 'bg-[#101622] border-[#2C3E4C] text-[#F6F1E7] focus:border-[#D4AB58]'
                      : 'bg-[#FFFFFF] border-[#C8BFA8] text-[#14201B] focus:border-[#354B40]'
                  }`}
                />
              </div>

              <div className="flex items-center justify-between text-xs px-1">
                <span className="font-bold text-[11px]">فیلتر بر اساس وضعیت استقرار:</span>
                <button
                  onClick={() => {
                    playTick();
                    setFilterActiveOffice(!filterActiveOffice);
                  }}
                  className={`px-2.5 py-1 rounded-xl text-[11px] font-black border transition-all flex items-center gap-1.5 cursor-pointer ${
                    filterActiveOffice
                      ? 'bg-emerald-900 text-emerald-200 border-emerald-600'
                      : isNight
                      ? 'bg-white/5 text-[#A3C1AD] border-white/10'
                      : 'bg-[#EAE3D2] text-[#14201B] border-[#C8BFA8]'
                  }`}
                >
                  <Radio
                    className={`w-3 h-3 ${
                      filterActiveOffice ? 'animate-pulse text-emerald-400' : ''
                    }`}
                  />
                  فقط اساتید حاضر در دفتر
                </button>
              </div>
            </div>

            {/* Professors List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {filtered.length === 0 ? (
                <div className="text-center py-12 font-bold text-xs">
                  استادی با این مشخصات یافت نشد.
                </div>
              ) : (
                filtered.map((prof) => (
                  <div
                    key={prof.id}
                    className={`p-4 rounded-2xl border transition-all space-y-3 ${
                      isNight
                        ? 'bg-[#1A2424] border-[#2C3E4C] text-[#F6F1E7]'
                        : 'bg-[#FFFFFF] border-[#C8BFA8] text-[#14201B]'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl overflow-hidden bg-black/20 flex-shrink-0 flex items-center justify-center p-1 border border-white/10">
                          <PixelImage
                            filename={prof.avatar}
                            alt={prof.name}
                            className="w-10 h-10 object-contain"
                          />
                        </div>
                        <div>
                          <h4
                            className={`font-black text-sm ${
                              isNight ? 'text-[#D4AB58]' : 'text-[#14201B]'
                            }`}
                          >
                            {prof.name}
                          </h4>
                          <p
                            className={`text-[11px] font-bold mt-0.5 ${
                              isNight ? 'text-[#A3C1AD]' : 'text-[#3D5249]'
                            }`}
                          >
                            {prof.title}
                          </p>
                        </div>
                      </div>

                      {prof.isCurrentlyInOffice ? (
                        <span className="px-2 py-1 rounded-lg bg-emerald-950 text-emerald-300 border border-emerald-700 text-[10px] font-black flex items-center gap-1 flex-shrink-0">
                          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                          هم‌اکنون در دفتر
                        </span>
                      ) : (
                        <span className="px-2 py-1 rounded-lg bg-zinc-800 text-zinc-300 border border-zinc-700 text-[10px] font-bold flex-shrink-0">
                          خارج از دفتر
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs pt-1 font-bold">
                      <div className="flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-[#E77F6E] flex-shrink-0" />
                        <span>محل دفتر: {prof.office}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-[#D4AB58] flex-shrink-0" />
                        <span>ساعات حضور: {prof.officeHours}</span>
                      </div>
                    </div>

                    <div
                      className={`rounded-xl overflow-hidden border text-xs ${
                        isNight ? 'border-white/10' : 'border-[#C8BFA8]'
                      }`}
                    >
                      <div
                        className={`p-1.5 font-black text-[10px] flex items-center gap-1 ${
                          isNight ? 'bg-black/30 text-[#A3C1AD]' : 'bg-[#EAE3D2] text-[#14201B]'
                        }`}
                      >
                        <GraduationCap className="w-3 h-3" />
                        برنامه درسی ترم جاری:
                      </div>
                      <table className="w-full text-[11px] border-collapse text-right">
                        <thead>
                          <tr
                            className={`border-b text-[10px] font-black ${
                              isNight
                                ? 'border-white/10 bg-white/5 text-[#A3C1AD]'
                                : 'border-[#C8BFA8] bg-[#F5EFE2] text-[#3D5249]'
                            }`}
                          >
                            <th className="p-1.5">نام درس</th>
                            <th className="p-1.5">روز و ساعت</th>
                            <th className="p-1.5">کلاس</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(Array.isArray(prof.courses) ? prof.courses : []).map((c, i) => (
                            <tr
                              key={i}
                              className="border-b border-current/5 last:border-none font-bold"
                            >
                              <td
                                className={`p-1.5 font-black ${
                                  isNight ? 'text-[#7FB69E]' : 'text-[#354B40]'
                                }`}
                              >
                                {c.name}
                              </td>
                              <td className="p-1.5">{c.dayAndTime}</td>
                              <td className="p-1.5">{c.room}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    <div className="flex items-center justify-between pt-1 border-t border-current/10 text-[11px]">
                      <span className="flex items-center gap-1 font-mono font-bold" dir="ltr">
                        <Mail className="w-3.5 h-3.5 text-[#91B5BE]" />
                        {prof.email}
                      </span>
                      <a
                        href={`mailto:${prof.email}`}
                        className="px-2.5 py-1 rounded-lg bg-[#354B40] hover:bg-[#2A3C33] text-[10px] font-black text-[#F6F1E7]"
                      >
                        ارسال ایمیل به استاد
                      </a>
                    </div>
                  </div>
                ))
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};
