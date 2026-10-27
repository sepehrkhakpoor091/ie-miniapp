/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Live Telegram Channel Announcements Drawer & Association Info
 * Synced with https://t.me/Isefum (انجمن علمی مهندسی صنایع دانشگاه فردوسی مشهد)
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  AboutAssociationConfig,
  ChannelAnnouncement,
  DEFAULT_ABOUT_CONFIG,
  ThemeMode,
} from '../../types';
import { PixelImage } from '../PixelImage';
import { TactileCard } from '../ui/TactileCard';
import { PushButton } from '../ui/PushButton';
import { playTick, playSwitch, playCoin } from '../../utils/soundEngine';
import {
  buildTelegramChannelUrl,
  DEFAULT_CHANNEL_URL,
  DEFAULT_ISEFUM_ANNOUNCEMENTS,
  ensureContinuousPinnedAnnouncements,
  normalizeTelegramChannelHandle,
} from '../../utils/channelSync';
import { X } from 'lucide-react';

export const ANNOUNCEMENTS_DATA: ChannelAnnouncement[] = DEFAULT_ISEFUM_ANNOUNCEMENTS;

interface AnnouncementsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  themeMode: ThemeMode;
  announcements?: ChannelAnnouncement[];
  channelUrl?: string;
  aboutConfig?: AboutAssociationConfig;
  initialSubTab?: 'channel' | 'about';
  onSyncChannel?: () => Promise<void>;
  isSyncing?: boolean;
}

export const AnnouncementsDrawer: React.FC<AnnouncementsDrawerProps> = ({
  isOpen,
  onClose,
  themeMode,
  announcements: propAnnouncements,
  channelUrl = DEFAULT_CHANNEL_URL,
  aboutConfig = DEFAULT_ABOUT_CONFIG,
  initialSubTab = 'channel',
  onSyncChannel,
  isSyncing = false,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'channel' | 'about'>(initialSubTab);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [readIds, setReadIds] = useState<string[]>([]);
  const isNight = themeMode === 'night';

  React.useEffect(() => {
    if (isOpen) {
      setActiveSubTab(initialSubTab);
    }
  }, [isOpen, initialSubTab]);

  const safeAbout: AboutAssociationConfig = {
    ...DEFAULT_ABOUT_CONFIG,
    ...(aboutConfig || {}),
    stats:
      Array.isArray(aboutConfig?.stats) && aboutConfig.stats.length === 3
        ? aboutConfig.stats
        : DEFAULT_ABOUT_CONFIG.stats,
    committees:
      Array.isArray(aboutConfig?.committees) && aboutConfig.committees.length > 0
        ? aboutConfig.committees
        : DEFAULT_ABOUT_CONFIG.committees,
  };

  const items = ensureContinuousPinnedAnnouncements(propAnnouncements || []);

  const cleanHandle = normalizeTelegramChannelHandle(channelUrl);
  const fullChannelUrl = buildTelegramChannelUrl(cleanHandle);

  const handleToggleExpand = (id: string) => {
    playTick();
    setExpandedId((prev) => (prev === id ? null : id));
    if (!readIds.includes(id)) {
      setReadIds((prev) => [...prev, id]);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-40"
          />

          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 360, damping: 32 }}
            className={`fixed bottom-0 left-0 right-0 max-w-md lg:max-w-2xl mx-auto z-50 rounded-t-3xl border-t-2 max-h-[88vh] flex flex-col select-none ${
              isNight
                ? 'bg-[#101622] border-[#2C3E4C] text-[#F6F1E7]'
                : 'bg-[#F6F1E7] border-[#C8BFA8] text-[#14201B]'
            }`}
          >
            {/* Header */}
            <div className="p-5 pb-3 shrink-0">
              <div className="w-12 h-1.5 rounded-full bg-current/20 mx-auto mb-4" />

              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-xl bg-[#D4AB58]/15 border border-[#D4AB58]/30 flex items-center justify-center p-1.5">
                    <PixelImage
                      filename="31_icon_bell.png"
                      alt="اطلاعیه‌ها"
                      className="w-full h-full object-contain"
                    />
                  </div>
                  <div>
                    <h3 className="text-base font-black">
                      آرشیو کانال تلگرام (@{cleanHandle}) و معرفی انجمن
                    </h3>
                    <p
                      className={`text-xs font-bold ${
                        isNight ? 'text-[#A3C1AD]' : 'text-[#3D5249]'
                      }`}
                    >
                      متصل به کانال رسمی انجمن علمی مهندسی صنایع فردوسی ({fullChannelUrl})
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  aria-label="بستن"
                  className="w-8 h-8 rounded-lg bg-current/10 hover:bg-current/20 flex items-center justify-center text-sm font-bold cursor-pointer shrink-0"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Sub-tab Switcher */}
              <div
                className={`grid grid-cols-2 gap-1.5 p-1 rounded-xl border ${
                  isNight
                    ? 'bg-[#1A2434] border-[#2C3E4C]'
                    : 'bg-[#EAE2D3] border-[#C8BFA8]'
                }`}
              >
                <button
                  type="button"
                  onClick={() => {
                    playSwitch();
                    setActiveSubTab('channel');
                  }}
                  className={`py-2 rounded-lg text-xs font-extrabold transition-all cursor-pointer ${
                    activeSubTab === 'channel'
                      ? 'bg-[#354B40] text-[#F6F1E7] shadow'
                      : 'opacity-70 hover:opacity-100'
                  }`}
                >
                  📢 اطلاعیه‌های کانال ({items.length.toLocaleString('fa-IR')})
                </button>
                <button
                  type="button"
                  onClick={() => {
                    playSwitch();
                    setActiveSubTab('about');
                  }}
                  className={`py-2 rounded-lg text-xs font-extrabold transition-all cursor-pointer ${
                    activeSubTab === 'about'
                      ? 'bg-[#354B40] text-[#F6F1E7] shadow'
                      : 'opacity-70 hover:opacity-100'
                  }`}
                >
                  🏛 درباره انجمن صنایع
                </button>
              </div>
            </div>

            {/* Scrollable Body */}
            <div className="px-5 pb-6 overflow-y-auto space-y-3 flex-1">
              {activeSubTab === 'channel' ? (
                <>
                  {/* Live Channel Connection Banner */}
                  <div
                    className={`p-3 rounded-2xl border flex flex-wrap items-center justify-between gap-2 ${
                      isNight
                        ? 'bg-[#172234] border-[#2C3E4C]'
                        : 'bg-[#FFFFFF] border-[#C8BFA8]'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                      <div className="text-xs font-black">
                        کانال تلگرام انجمن:{' '}
                        <a
                          href={fullChannelUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[#D4AB58] underline"
                        >
                          @{cleanHandle}
                        </a>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {onSyncChannel && (
                        <button
                          type="button"
                          onClick={() => {
                            playCoin();
                            onSyncChannel();
                          }}
                          disabled={isSyncing}
                          className="px-2.5 py-1.5 rounded-xl bg-[#D4AB58] text-[#101622] text-[11px] font-black cursor-pointer disabled:opacity-60"
                        >
                          {isSyncing ? '⏳ در حال همگام‌سازی...' : '🔄 بروزرسانی زنده از تلگرام'}
                        </button>
                      )}
                      <a
                        href={fullChannelUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-2.5 py-1.5 rounded-xl bg-[#354B40] text-[#F6F1E7] text-[11px] font-black"
                      >
                        ✈️ مشاهده در کانال تلگرام
                      </a>
                    </div>
                  </div>

                  {items.map((item) => {
                    const isExpanded = expandedId === item.id;
                    const isRead = readIds.includes(item.id);
                    const postLink = item.postId
                      ? `https://t.me/${item.channelHandle || cleanHandle}/${item.postId}`
                      : item.postUrl || fullChannelUrl;

                    return (
                      <TactileCard
                        key={item.id}
                        themeMode={themeMode}
                        interactive
                        onClick={() => handleToggleExpand(item.id)}
                        className="p-3.5 transition-all"
                      >
                        <div className="flex items-start gap-3">
                          <div className="w-10 h-10 rounded-xl bg-[#7FB69E]/15 border border-[#7FB69E]/30 flex items-center justify-center shrink-0 p-1.5 mt-0.5">
                            <PixelImage
                              filename="34_icon_ann_doc.png"
                              alt="اطلاعیه"
                              className="w-full h-full object-contain"
                            />
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2 mb-1 flex-wrap">
                              <div className="flex items-center gap-1.5">
                                {item.isPinned && (
                                  <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-400">
                                    📌 سنجاق‌شده
                                  </span>
                                )}
                                <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-[#D4AB58]/20 text-[#D4AB58]">
                                  {item.tag}
                                </span>
                              </div>
                              <div className="flex items-center gap-1.5">
                                {!isRead && (
                                  <span className="w-2 h-2 rounded-full bg-[#E77F6E]" />
                                )}
                                <span
                                  className={`text-[10px] font-bold ${
                                    isNight ? 'text-[#A3C1AD]' : 'text-[#3D5249]'
                                  }`}
                                >
                                  {item.timestamp}
                                </span>
                              </div>
                            </div>

                            <h4 className="text-xs font-extrabold leading-snug">
                              {item.title}
                            </h4>

                            {!isExpanded ? (
                              <p
                                className={`text-[11px] truncate mt-1 font-medium ${
                                  isNight ? 'text-[#A3C1AD]' : 'text-[#3D5249]'
                                }`}
                              >
                                {item.snippet}
                              </p>
                            ) : (
                              <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className="mt-2.5 pt-2.5 border-t border-current/10 space-y-2.5"
                              >
                                <p className="text-xs leading-relaxed opacity-90 whitespace-pre-line">
                                  {item.content}
                                </p>
                                <div className="flex items-center justify-between text-[10px] opacity-75 pt-1">
                                  <span>✍ {item.author}</span>
                                  <span>👁 {item.views.toLocaleString('fa-IR')} بازدید</span>
                                </div>

                                <div className="pt-1 flex items-center justify-between gap-2 flex-wrap">
                                  <a
                                    href={postLink}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    onClick={(e) => e.stopPropagation()}
                                    className="px-3 py-1.5 rounded-xl bg-[#354B40] text-[#F6F1E7] text-[11px] font-black inline-flex items-center gap-1.5 shadow"
                                  >
                                    <span>🔗 مشاهده در کانال تلگرام (@{cleanHandle})</span>
                                  </a>
                                </div>
                              </motion.div>
                            )}
                          </div>
                        </div>
                      </TactileCard>
                    );
                  })}
                </>
              ) : (
                <div className="space-y-3">
                  <TactileCard
                    themeMode={themeMode}
                    className="p-4 space-y-3 relative overflow-hidden"
                  >
                    {/* Cute Pixel-Art Cat on Books in the top-left corner of About Association */}
                    <div
                      className="absolute top-2.5 left-2.5 w-14 h-14 rounded-2xl bg-[#D4AB58]/15 border border-[#D4AB58]/40 flex items-center justify-center p-1 shadow-sm pointer-events-none"
                      style={{ animation: 'pixel-float 3.2s ease-in-out infinite' }}
                      title="نماد کتابخانه و مطالعه انجمن صنایع"
                    >
                      <PixelImage
                        filename="36_decor_cat_books.png"
                        alt="گربه روی کتاب‌های مهندسی صنایع"
                        className="w-12 h-12 object-contain"
                      />
                    </div>

                    <div className="flex items-center gap-3 pl-16">
                      <div className="w-14 h-14 rounded-2xl bg-[#354B40] border-2 border-[#D4AB58] flex items-center justify-center p-2 shrink-0">
                        <PixelImage
                          filename="27_rank_lvl3.png"
                          alt="لوگوی انجمن"
                          className="w-full h-full object-contain"
                        />
                      </div>
                      <div>
                        <h4 className="text-sm font-black">{safeAbout.title}</h4>
                        <p className="text-xs text-[#7FB69E] font-bold mt-0.5">
                          {safeAbout.subtitle} • کانال رسمی: @{cleanHandle}
                        </p>
                      </div>
                    </div>

                    <p className="text-xs leading-relaxed opacity-85 whitespace-pre-line">
                      {safeAbout.description}
                    </p>

                    <div className="grid grid-cols-3 gap-2 pt-2 text-center">
                      <div className="p-2.5 rounded-xl bg-current/5 border border-current/10">
                        <div className="text-sm font-black text-[#D4AB58]">
                          {safeAbout.stats[0]?.value || '+۱۱۰ رویداد'}
                        </div>
                        <div className="text-[10px] opacity-70">
                          {safeAbout.stats[0]?.label || 'رویداد برگزار شده'}
                        </div>
                      </div>
                      <div className="p-2.5 rounded-xl bg-current/5 border border-current/10">
                        <div className="text-sm font-black text-[#7FB69E]">
                          {safeAbout.stats[1]?.value || '+۸۵۰ نفر'}
                        </div>
                        <div className="text-[10px] opacity-70">
                          {safeAbout.stats[1]?.label || 'اعضای فعال'}
                        </div>
                      </div>
                      <div className="p-2.5 rounded-xl bg-current/5 border border-current/10">
                        <div className="text-sm font-black text-[#E77F6E]">
                          {safeAbout.stats[2]?.value || '+۴۵ کارگاه'}
                        </div>
                        <div className="text-[10px] opacity-70">
                          {safeAbout.stats[2]?.label || 'کارگاه تخصصی صنعتی'}
                        </div>
                      </div>
                    </div>
                  </TactileCard>

                  <TactileCard
                    themeMode={themeMode}
                    className="p-4 space-y-2 relative overflow-hidden"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <h5 className="text-xs font-black text-[#D4AB58]">
                        {safeAbout.committeesTitle}
                      </h5>
                      <div className="w-8 h-8 rounded-xl bg-current/5 border border-current/10 p-1 shrink-0">
                        <PixelImage
                          filename="36_decor_cat_books.png"
                          alt="گربه کتابخوان انجمن"
                          className="w-full h-full object-contain"
                        />
                      </div>
                    </div>
                    <ul className="text-xs space-y-1.5 opacity-85 list-disc list-inside">
                      {safeAbout.committees.map((c, idx) => (
                        <li key={idx}>{c}</li>
                      ))}
                    </ul>
                  </TactileCard>

                  <PushButton
                    variant="secondary"
                    fullWidth
                    onClick={onClose}
                  >
                    بستن پنجره
                  </PushButton>
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
