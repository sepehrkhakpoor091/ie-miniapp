/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Featured Event Details & Instant Registration Modal
 */

import React, { useRef, useState } from 'react';
import { EventItem, ThemeMode } from '../../types';
import { EVENTS_DATA, normalizeEvent } from '../../utils/events';
import { PixelImage } from '../PixelImage';
import { PushButton } from '../ui/PushButton';
import { playFanfare, playTick } from '../../utils/soundEngine';
import {
  X,
  Calendar,
  Clock,
  MapPin,
  Users,
  Award,
  CheckCircle2,
  Sparkles,
  Ticket,
} from 'lucide-react';

interface EventDetailsModalProps {
  eventId: string | null;
  event?: EventItem | null;
  isOpen: boolean;
  onClose: () => void;
  themeMode: ThemeMode;
  onRegistered: () => void;
}

export const EventDetailsModal: React.FC<EventDetailsModalProps> = ({
  eventId,
  event: propEvent,
  isOpen,
  onClose,
  themeMode,
  onRegistered,
}) => {
  const isNight = themeMode === 'night';
  const [isRegistered, setIsRegistered] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const inFlightRequestRef = useRef<boolean>(false);

  if (!isOpen || (!eventId && !propEvent)) return null;

  const matchedRaw =
    propEvent ||
    (EVENTS_DATA || []).find((e) => e.id === eventId) ||
    EVENTS_DATA[0];
  const event = normalizeEvent(matchedRaw);
  const totalCap = Number(event.totalCapacity || event.capacityTotal || event.capacity || 40);
  const remCap = Number(
    event.remainingCapacity ?? event.capacityRemaining ?? event.capacity ?? totalCap
  );

  const handleRegister = () => {
    if (inFlightRequestRef.current || isSubmitting || isRegistered) return;
    inFlightRequestRef.current = true;
    setIsSubmitting(true);
    playFanfare();
    setIsRegistered(true);
    onRegistered();
    setIsSubmitting(false);
    inFlightRequestRef.current = false;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in select-none">
      <div
        className={`w-full max-w-lg rounded-3xl border ${
          isNight
            ? 'bg-[#141C24] border-[#253247] text-[#F6F1E7]'
            : 'bg-[#FAF7F0] border-[#D8D0C1] text-[#1D2A24]'
        } shadow-2xl flex flex-col max-h-[90vh] overflow-hidden`}
      >
        {/* Banner with Close button */}
        <div className="relative h-44 sm:h-52 w-full flex-shrink-0">
          <PixelImage
            filename={event.imageFilename || event.image || '13_ev_featured.png'}
            alt={event.title}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/30" />
          <button
            onClick={() => {
              playTick();
              onClose();
            }}
            className="absolute top-3 left-3 w-8 h-8 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/80 transition-all active:scale-95"
            aria-label="بستن"
          >
            <X className="w-4 h-4" />
          </button>
          <div className="absolute bottom-3 right-4 left-4">
            <span className="px-2.5 py-0.5 rounded-full bg-[#E77F6E] text-[#1D2A24] font-black text-[10px]">
              {event.categoryLabel || 'رویداد ویژه ماه'}
            </span>
            <h3 className="text-lg font-bold text-white mt-1 drop-shadow">
              {event.title}
            </h3>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-5 overflow-y-auto space-y-4 text-xs">
          {/* Key Facts Pills */}
          <div className="grid grid-cols-2 gap-2">
            <div className="p-2.5 rounded-xl bg-white/5 border border-white/10 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-[#D4AB58]" />
              <div>
                <span className="opacity-60 block text-[10px]">تاریخ برگزاری:</span>
                <span className="font-bold">{event.date}</span>
              </div>
            </div>
            <div className="p-2.5 rounded-xl bg-white/5 border border-white/10 flex items-center gap-2">
              <Clock className="w-4 h-4 text-[#7FB69E]" />
              <div>
                <span className="opacity-60 block text-[10px]">ساعت:</span>
                <span className="font-bold">{event.time}</span>
              </div>
            </div>
            <div className="p-2.5 rounded-xl bg-white/5 border border-white/10 flex items-center gap-2">
              <MapPin className="w-4 h-4 text-[#E77F6E]" />
              <div>
                <span className="opacity-60 block text-[10px]">مکان:</span>
                <span className="font-bold">{event.location}</span>
              </div>
            </div>
            <div className="p-2.5 rounded-xl bg-white/5 border border-white/10 flex items-center gap-2">
              <Users className="w-4 h-4 text-[#91B5BE]" />
              <div>
                <span className="opacity-60 block text-[10px]">ظرفیت باقیمانده:</span>
                <span className="font-bold text-emerald-400">ظرفیت: {remCap} نفر</span>
              </div>
            </div>
          </div>

          {/* Syllabus & Description */}
          <div className="space-y-1.5">
            <h4 className="font-bold text-sm text-[#D4AB58]">سرفصل‌ها و درباره کارگاه:</h4>
            <ul className="space-y-1 text-[11px] opacity-90 pr-3 list-disc">
              {(event?.syllabus || []).map((item, idx) => (
                <li key={idx}>{item}</li>
              ))}
            </ul>
          </div>

          {/* Perks */}
          <div className="p-3.5 rounded-2xl bg-[#354B40]/30 border border-[#7FB69E]/40 space-y-2">
            <h4 className="font-bold text-xs text-[#7FB69E] flex items-center gap-1.5">
              <Award className="w-4 h-4" />
              مزایای شرکت در این رویداد:
            </h4>
            <ul className="space-y-1 text-[11px] opacity-90 pr-3 list-disc">
              <li>اعطای گواهینامه دوزبانه معتبر انجمن علمی با هولوگرام رسمی</li>
              <li>دریافت +{event.rewardPoints} امتیاز مستقیم در لیدربورد مینی‌اپلیکیشن</li>
              <li>فایل ویدیوی ضبط شده و اسلایدهای مدرس دوره</li>
            </ul>
          </div>

          {/* Registration Status */}
          {isRegistered ? (
            <div className="p-4 rounded-2xl bg-emerald-950/60 border border-emerald-500/60 text-center space-y-2 animate-fade-in">
              <div className="flex items-center justify-center gap-1.5 text-emerald-400 font-bold text-sm">
                <CheckCircle2 className="w-5 h-5" />
                <span>ثبت‌نام شما با موفقیت قطعی شد!</span>
              </div>
              <p className="text-[11px] text-zinc-300">
                بلیط الکترونیکی ورود به آمفی‌تئاتر در بخش پروفایل صادر گردید.
              </p>
              <div className="inline-flex items-center gap-1 px-3 py-1 rounded-xl bg-black/40 border border-emerald-600 text-xs font-mono text-[#D4AB58]">
                <Ticket className="w-3.5 h-3.5" />
                <span>کد بلیط: TKT-IE-4029</span>
              </div>
            </div>
          ) : (
            <PushButton
              variant="gold"
              size="lg"
              fullWidth
              onClick={handleRegister}
              icon={<Sparkles className="w-5 h-5" />}
            >
              ثبت‌نام قطعی در کارگاه (رایگان)
            </PushButton>
          )}
        </div>
      </div>
    </div>
  );
};
