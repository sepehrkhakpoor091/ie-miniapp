/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Smart Academic Reminders Modal with 3D Tactile Switches and Custom Task Scheduler
 */

import React, { useState, useEffect } from 'react';
import { ReminderItem, ScheduledTimer, ThemeMode } from '../../types';
import { PixelImage } from '../PixelImage';
import { PushButton } from '../ui/PushButton';
import { playSwitch, playTick, playFanfare } from '../../utils/soundEngine';
import {
  X,
  Bell,
  Utensils,
  BookOpen,
  Target,
  Plus,
  Trash2,
  Clock,
  Calendar,
  CheckCircle2,
} from 'lucide-react';

interface RemindersModalProps {
  isOpen: boolean;
  onClose: () => void;
  themeMode: ThemeMode;
  scheduledTimers?: ScheduledTimer[];
  allowStudentTimers?: boolean;
}

const DEFAULT_SYSTEM_REMINDERS: ReminderItem[] = [
  {
    id: 'sys-1',
    title: '🍽 رزرو سلف دانشگاه (سامانه کالینان)',
    date: 'هر سه‌شنبه',
    time: '۱۰:۰۰ صبح',
    repeat: 'weekly',
    enabled: true,
    isSystem: true,
    category: 'self',
  },
  {
    id: 'sys-2',
    title: '📝 جلسات حل تمرین درس‌ها (TA Sessions)',
    date: 'روزهای زوج',
    time: '۱ ساعت قبل',
    repeat: 'weekly',
    enabled: true,
    isSystem: true,
    category: 'ta',
  },
  {
    id: 'sys-3',
    title: '🎯 شروع وبینارها و کارگاه‌های انجمن',
    date: 'روز رویداد',
    time: '۱۵ دقیقه قبل',
    repeat: 'once',
    enabled: true,
    isSystem: true,
    category: 'workshop',
  },
];

const CUSTOM_REMINDERS_STORAGE_KEY = 'ie_student_reminders_v2';
const DELETED_REMINDERS_STORAGE_KEY = 'ie_deleted_reminder_ids_v2';

export const RemindersModal: React.FC<RemindersModalProps> = ({
  isOpen,
  onClose,
  themeMode,
  scheduledTimers,
  allowStudentTimers = true,
}) => {
  const isNight = themeMode === 'night';
  const [deletedIds, setDeletedIds] = useState<string[]>(() => {
    try {
      const raw = localStorage.getItem(DELETED_REMINDERS_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {
      // Ignore storage error
    }
    return [];
  });

  const [reminders, setReminders] = useState<ReminderItem[]>(() => {
    try {
      const raw = localStorage.getItem(CUSTOM_REMINDERS_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {
      // Ignore storage error
    }
    return DEFAULT_SYSTEM_REMINDERS;
  });
  const [showAddForm, setShowAddForm] = useState(false);

  const persistReminders = (nextList: ReminderItem[]) => {
    setReminders(nextList);
    try {
      localStorage.setItem(CUSTOM_REMINDERS_STORAGE_KEY, JSON.stringify(nextList));
    } catch {
      // Ignore storage error
    }
  };

  // Sync admin scheduledTimers into the reminders list (respecting student's deletedIds)
  useEffect(() => {
    if (Array.isArray(scheduledTimers) && scheduledTimers.length > 0) {
      const mappedTimers: ReminderItem[] = scheduledTimers
        .map((t) => ({
          id: `adm-tmr-${t.id}`,
          title: `⏰ ${t.title}`,
          date:
            t.frequency === 'یکبار'
              ? `فقط در تاریخ ${t.startDate || '۱۴۰۴/۰۸/۲۸'}`
              : `${t.frequency}${t.dayOfWeek ? ` (${t.dayOfWeek})` : ''} • شروع: ${
                  t.startDate || '۱۴۰۴/۰۸/۲۸'
                }`,
          time: t.time,
          repeat: (t.frequency === 'یکبار'
            ? 'once'
            : t.frequency === 'روزانه'
            ? 'daily'
            : 'weekly') as ReminderItem['repeat'],
          enabled: t.enabled,
          isSystem: true,
          category: 'workshop' as const,
        }))
        .filter((r) => !deletedIds.includes(r.id));

      setReminders((prev) => {
        const userAndSys = prev.filter(
          (r) => !r.id.startsWith('adm-tmr-') && !deletedIds.includes(r.id)
        );
        return [...mappedTimers, ...userAndSys];
      });
    }
  }, [scheduledTimers, deletedIds]);

  // New Reminder form state
  const [newTitle, setNewTitle] = useState('');
  const [newDate, setNewDate] = useState('۱۴۰۴/۰۸/۲۸');
  const [newTime, setNewTime] = useState('۱۶:۰۰');
  const [newRepeat, setNewRepeat] = useState<'once' | 'daily' | 'weekly'>('once');

  if (!isOpen) return null;

  const visibleReminders = reminders
    .filter((r) => !deletedIds.includes(r.id))
    .filter((r) => (allowStudentTimers === false ? Boolean(r.isSystem) : true));

  const handleToggle = (id: string) => {
    playSwitch();
    const next = reminders.map((r) => (r.id === id ? { ...r, enabled: !r.enabled } : r));
    persistReminders(next);
  };

  const handleDelete = (id: string) => {
    playTick();
    const nextDeleted = Array.from(new Set([...deletedIds, id]));
    setDeletedIds(nextDeleted);
    try {
      localStorage.setItem(DELETED_REMINDERS_STORAGE_KEY, JSON.stringify(nextDeleted));
    } catch {
      // Ignore storage error
    }
    const nextList = reminders.filter((r) => r.id !== id);
    persistReminders(nextList);
  };

  const handleRestoreDefaults = () => {
    playFanfare();
    setDeletedIds([]);
    try {
      localStorage.removeItem(DELETED_REMINDERS_STORAGE_KEY);
    } catch {
      // Ignore storage error
    }
    const customOnly = reminders.filter((r) => !r.isSystem);
    persistReminders([...DEFAULT_SYSTEM_REMINDERS, ...customOnly]);
  };

  const handleAddReminder = (e: React.FormEvent) => {
    e.preventDefault();
    if (allowStudentTimers === false || !newTitle.trim()) return;

    playFanfare();
    const item: ReminderItem = {
      id: `custom-${Date.now()}`,
      title: newTitle.trim(),
      date: newDate,
      time: newTime,
      repeat: newRepeat,
      enabled: true,
      category: 'custom',
    };

    persistReminders([item, ...reminders]);
    setNewTitle('');
    setShowAddForm(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in select-none">
      <div
        className={`w-full max-w-lg rounded-3xl border ${
          isNight
            ? 'bg-[#141C24] border-[#253247] text-[#F6F1E7]'
            : 'bg-[#FAF7F0] border-[#D8D0C1] text-[#1D2A24]'
        } shadow-2xl flex flex-col h-[85vh] max-h-[85vh] overflow-hidden`}
      >
        {/* Header */}
        <div
          className={`p-4 border-b flex items-center justify-between ${
            isNight ? 'border-[#253247] bg-[#101622]' : 'border-[#D8D0C1] bg-[#EFE9DB]'
          }`}
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#D4AB58]/20 border border-[#D4AB58]/30 flex items-center justify-center p-1">
              <PixelImage
                filename="31_icon_bell.png"
                alt="یادآورها"
                className="w-8 h-8 object-contain"
              />
            </div>
            <div>
              <h3 className="font-bold text-sm">یادآورهای هوشمند دانشجویی</h3>
              <p className="text-[11px] opacity-70">ارسال اعلان از طریق بات تلگرام انجمن</p>
            </div>
          </div>
          <button
            onClick={() => {
              playTick();
              onClose();
            }}
            className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-white/10 active:scale-95"
            aria-label="بستن"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Action Bar */}
        <div className="p-3 border-b border-white/5 flex items-center justify-between gap-2">
          <span className="text-xs font-bold opacity-80">زنگ‌های هشدار فعال:</span>
          {allowStudentTimers !== false ? (
            <button
              onClick={() => {
                playTick();
                setShowAddForm(!showAddForm);
              }}
              className="px-3 py-1.5 rounded-xl bg-[#D4AB58] hover:bg-[#DDB669] text-[#1D2A24] font-bold text-xs flex items-center gap-1.5 transition-all active:scale-95 border-b-2 border-[#9C782E] cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5 stroke-[3]" />
              {showAddForm ? 'انصراف' : 'افزودن یادآور شخصی'}
            </button>
          ) : (
            <span className="px-2.5 py-1 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-400 text-[10px] font-black">
              🔒 ساخت یادآور شخصی قفل است
            </span>
          )}
        </div>

        {/* Body Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {allowStudentTimers === false && (
            <div className="p-3.5 rounded-2xl bg-amber-500/15 border-2 border-[#D4AB58]/60 text-xs font-black leading-relaxed text-right">
              🔒 ثبت تایمر شخصی توسط مدیریت انجمن غیرفعال شده است و فقط یادآورهای رسمی انجمن صنایع (سلف، حل تمرین و کارگاهها) ارسال میشوند.
            </div>
          )}

          {/* Add Reminder Form */}
          {showAddForm && allowStudentTimers !== false && (
            <form
              onSubmit={handleAddReminder}
              className="p-4 rounded-2xl bg-white/5 border border-[#D4AB58]/40 space-y-3 animate-fade-in"
            >
              <h4 className="font-bold text-xs text-[#D4AB58] flex items-center gap-1.5">
                <Bell className="w-4 h-4" />
                تعریف یادآور درسی جدید
              </h4>

              <div>
                <label className="block text-[11px] opacity-75 mb-1">عنوان یادآور:</label>
                <input
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="مثال: تحویل پروژه شبیه‌سازی آرنا"
                  className={`w-full px-3 py-2 rounded-xl text-xs border focus:outline-none transition-all ${
                    isNight
                      ? 'bg-[#101622] border-[#253247] text-[#F6F1E7]'
                      : 'bg-[#FFFFFF] border-[#D8D0C1] text-[#1D2A24]'
                  }`}
                  autoFocus
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] opacity-75 mb-1">تاریخ هجری شمسی:</label>
                  <input
                    type="text"
                    value={newDate}
                    onChange={(e) => setNewDate(e.target.value)}
                    className={`w-full px-3 py-2 rounded-xl text-xs border text-center ${
                      isNight ? 'bg-[#101622] border-[#253247]' : 'bg-[#FFFFFF] border-[#D8D0C1]'
                    }`}
                  />
                </div>
                <div>
                  <label className="block text-[11px] opacity-75 mb-1">ساعت اعلان:</label>
                  <input
                    type="time"
                    value={newTime}
                    onChange={(e) => setNewTime(e.target.value)}
                    className={`w-full px-3 py-2 rounded-xl text-xs border text-center ${
                      isNight ? 'bg-[#101622] border-[#253247]' : 'bg-[#FFFFFF] border-[#D8D0C1]'
                    }`}
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] opacity-75 mb-1">دوره تکرار:</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'once', label: 'یکبار' },
                    { id: 'daily', label: 'هر روز' },
                    { id: 'weekly', label: 'هر هفته' },
                  ].map((cycle) => (
                    <button
                      key={cycle.id}
                      type="button"
                      onClick={() => {
                        playTick();
                        setNewRepeat(cycle.id as 'once' | 'daily' | 'weekly');
                      }}
                      className={`py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                        newRepeat === cycle.id
                          ? 'bg-[#354B40] text-[#7FB69E] border-[#7FB69E]'
                          : 'bg-white/5 border-white/10 opacity-70'
                      }`}
                    >
                      {cycle.label}
                    </button>
                  ))}
                </div>
              </div>

              <PushButton
                type="submit"
                variant="gold"
                size="sm"
                fullWidth
                disabled={!newTitle.trim()}
              >
                ثبت و فعال‌سازی یادآور
              </PushButton>
            </form>
          )}

          {/* System & Custom Reminders List */}
          <div className="space-y-3">
            {visibleReminders.length === 0 ? (
              <div className="p-6 rounded-2xl border border-current/15 text-center space-y-2">
                <div className="text-xs font-extrabold opacity-80">
                  هیچ یادآور فعالی در لیست شما وجود ندارد.
                </div>
                <button
                  type="button"
                  onClick={handleRestoreDefaults}
                  className="px-3 py-1.5 rounded-xl bg-[#D4AB58] text-[#101622] text-xs font-black cursor-pointer"
                >
                  🔄 بازگردانی یادآورهای پیش‌فرض انجمن
                </button>
              </div>
            ) : (
              visibleReminders.map((reminder) => (
                <div
                  key={reminder.id}
                  className={`p-3.5 rounded-2xl border transition-all flex items-center justify-between gap-3 ${
                    isNight
                      ? 'bg-[#1A2424] border-[#253247]'
                      : 'bg-[#FFFFFF] border-[#D8D0C1]'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                        reminder.category === 'self'
                          ? 'bg-amber-500/20 text-[#D4AB58]'
                          : reminder.category === 'ta'
                          ? 'bg-teal-500/20 text-[#7FB69E]'
                          : reminder.category === 'workshop'
                          ? 'bg-coral-500/20 text-[#E77F6E]'
                          : 'bg-sky-500/20 text-[#91B5BE]'
                      }`}
                    >
                      {reminder.category === 'self' ? (
                        <Utensils className="w-5 h-5" />
                      ) : reminder.category === 'ta' ? (
                        <BookOpen className="w-5 h-5" />
                      ) : reminder.category === 'workshop' ? (
                        <Target className="w-5 h-5" />
                      ) : (
                        <Bell className="w-5 h-5" />
                      )}
                    </div>

                    <div className="min-w-0">
                      <h4 className="text-xs font-bold leading-normal truncate">
                        {reminder.title}
                      </h4>
                      <div className="flex items-center gap-2 text-[10px] opacity-70 mt-1 flex-wrap">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {reminder.date}
                        </span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {reminder.time}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* 3D Tactile Toggle Switch + Universal Delete Button */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      type="button"
                      onClick={() => handleToggle(reminder.id)}
                      className={`relative w-12 h-6 rounded-full transition-colors duration-200 border-2 cursor-pointer ${
                        reminder.enabled
                          ? 'bg-[#354B40] border-[#7FB69E]'
                          : 'bg-zinc-800 border-zinc-700'
                      }`}
                      aria-label={`تغییر وضعیت ${reminder.title}`}
                    >
                      <span
                        className={`absolute top-0.5 w-4 h-4 rounded-full transition-transform duration-200 shadow-md ${
                          reminder.enabled
                            ? 'left-6 bg-[#7FB69E]'
                            : 'left-1 bg-zinc-500'
                        }`}
                      />
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDelete(reminder.id)}
                      className="p-1.5 rounded-lg bg-rose-500/15 text-[#E77F6E] hover:bg-rose-500/25 active:scale-95 cursor-pointer"
                      aria-label={`حذف یادآور ${reminder.title}`}
                      title="حذف این یادآور"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="p-3 rounded-xl bg-white/5 border border-white/10 flex flex-wrap items-center justify-between gap-2 text-[11px] opacity-80 leading-relaxed">
            <span>💡 اعلان‌های فعال به طور خودکار به آی‌دی تلگرام شما ارسال می‌گردند.</span>
            {deletedIds.length > 0 && (
              <button
                type="button"
                onClick={handleRestoreDefaults}
                className="text-[#D4AB58] font-black underline cursor-pointer shrink-0"
              >
                بازگردانی پیش‌فرض‌ها ({deletedIds.length.toLocaleString('fa-IR')})
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
