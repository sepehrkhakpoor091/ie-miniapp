/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 2-Way Support Tickets & Official Certificate Verification Modal
 * Includes Secret Search Command (#admin / /admin), Dynamic Certificate Verification,
 * FeatureFlags Kill-Switch Support, and High-Contrast Day/Night Readability
 */

import React, { useState, useEffect } from 'react';
import { CertificateInfo, SupportTicket, ThemeMode, UserProfile } from '../../types';
import { PixelImage } from '../PixelImage';
import { PushButton } from '../ui/PushButton';
import { SectionMaintenanceBanner } from '../ui/SectionMaintenanceBanner';
import { playCoin, playError, playFanfare, playTick } from '../../utils/soundEngine';
import {
  fetchStudentChatsFromBot,
  loadStoredSupportChats,
  normalizeSupportTicketsList,
  saveStoredSupportChats,
  sendStudentChatMessageToBot,
  submitSupportTicketToBot,
} from '../../utils/apiBridge';
import { getScopedStorageKey, safeJsonParse } from '../../utils/security';
import {
  X,
  MessageSquare,
  Send,
  Search,
  AlertCircle,
  FileBadge,
  Calendar,
  ShieldCheck,
  Plus,
  Lock,
} from 'lucide-react';

interface SupportModalProps {
  isOpen: boolean;
  onClose: () => void;
  themeMode: ThemeMode;
  user?: UserProfile;
  certificates?: CertificateInfo[];
  supportTickets?: SupportTicket[];
  onUpdateSupportTickets?: (nextTickets: SupportTicket[]) => void;
  supportTicketsEnabled?: boolean;
  onTriggerStealthAdmin?: () => void;
}

const VERIFIED_CERTIFICATES: Record<string, CertificateInfo> = {
  'CERT-402-IE': {
    certificateId: 'CERT-402-IE',
    studentName: 'علی محمدی',
    courseTitle: 'کارگاه تخصصی شبیه‌سازی سیستم‌های گسسته با Arena',
    instructor: 'دکتر محمدرضا رضایی (عضو هیئت علمی دانشکده صنایع)',
    issueDate: '۱۵ مهر ۱۴۰۴',
    grade: 'عالی (نمره ۹۴ از ۱۰۰)',
    isValid: true,
    hours: 24,
  },
  'CERT-401-PY': {
    certificateId: 'CERT-401-PY',
    studentName: 'سارا حسینی',
    courseTitle: 'تحلیل داده و علم داده کاربردی در مهندسی صنایع با پایتون',
    instructor: 'مهندس آرش شمس',
    issueDate: '۲۸ مرداد ۱۴۰۴',
    grade: 'بسیار خوب (نمره ۸۸ از ۱۰۰)',
    isValid: true,
    hours: 32,
  },
};

function belongsToCurrentStudent(ticket: SupportTicket, user?: UserProfile): boolean {
  if (!user) return true;
  if (!ticket.studentId && !ticket.telegramUserId) return true;
  if (user.studentId && ticket.studentId && ticket.studentId === user.studentId) {
    return true;
  }
  if (
    user.telegramUserId &&
    ticket.telegramUserId &&
    String(ticket.telegramUserId) === String(user.telegramUserId)
  ) {
    return true;
  }
  return false;
}

function mergeTicketCollections(lists: SupportTicket[][]): SupportTicket[] {
  const map = new Map<string, SupportTicket>();
  for (const list of lists) {
    for (const rawItem of Array.isArray(list) ? list : []) {
      if (!rawItem || !rawItem.id) continue;
      const existing = map.get(rawItem.id);
      if (!existing) {
        map.set(rawItem.id, rawItem);
      } else {
        // Merge messages uniquely and prefer closed status if closed by admin
        const msgMap = new Map<string, SupportTicket['messages'][number]>();
        for (const m of [...(existing.messages || []), ...(rawItem.messages || [])]) {
          if (m && m.id) {
            msgMap.set(m.id, m);
          }
        }
        map.set(rawItem.id, {
          ...existing,
          ...rawItem,
          status:
            rawItem.status === 'closed' || existing.status === 'closed'
              ? 'closed'
              : rawItem.status === 'answered' || existing.status === 'answered'
              ? 'answered'
              : 'open',
          messages: Array.from(msgMap.values()),
        });
      }
    }
  }
  return Array.from(map.values());
}

export const SupportModal: React.FC<SupportModalProps> = ({
  isOpen,
  onClose,
  themeMode,
  user,
  certificates = [],
  supportTickets = [],
  onUpdateSupportTickets,
  supportTicketsEnabled = true,
  onTriggerStealthAdmin,
}) => {
  const isNight = themeMode === 'night';
  const [activeTab, setActiveTab] = useState<'ticket' | 'cert'>('ticket');

  const userTicketsStorageKey = getScopedStorageKey(
    `ie_user_support_tickets_v2_${user?.studentId || 'guest'}`,
    user?.telegramUserId
  );

  const [tickets, setTickets] = useState<SupportTicket[]>(() => {
    try {
      const raw = localStorage.getItem(userTicketsStorageKey);
      const localUserList = raw ? safeJsonParse<SupportTicket[]>(raw, []) : [];
      const globalShared = loadStoredSupportChats().filter((t) =>
        belongsToCurrentStudent(t, user)
      );
      const fromProps = (Array.isArray(supportTickets) ? supportTickets : []).filter((t) =>
        belongsToCurrentStudent(t, user)
      );
      return mergeTicketCollections([fromProps, globalShared, localUserList]);
    } catch {
      return [];
    }
  });
  const [selectedTicketId, setSelectedTicketId] = useState<string>('');
  const [newReplyText, setNewReplyText] = useState('');
  const [showNewTicketModal, setShowNewTicketModal] = useState(false);
  const [newTicketTitle, setNewTicketTitle] = useState('');
  const [newTicketMessage, setNewTicketMessage] = useState('');
  const [isSendingChat, setIsSendingChat] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    try {
      const raw = localStorage.getItem(userTicketsStorageKey);
      const parsed = raw ? safeJsonParse<SupportTicket[]>(raw, []) : [];
      const safeLocal = Array.isArray(parsed) ? parsed : [];
      const globalShared = loadStoredSupportChats().filter((t) =>
        belongsToCurrentStudent(t, user)
      );
      const fromProps = (Array.isArray(supportTickets) ? supportTickets : []).filter((t) =>
        belongsToCurrentStudent(t, user)
      );
      const merged = mergeTicketCollections([fromProps, globalShared, safeLocal]);
      setTickets(merged);
      if (merged.length > 0) {
        setSelectedTicketId((prev) =>
          merged.some((t) => t.id === prev) ? prev : merged[0].id
        );
      } else {
        setSelectedTicketId('');
      }
    } catch {
      setTickets([]);
    }
  }, [userTicketsStorageKey, isOpen, supportTickets, user?.studentId, user?.telegramUserId]);

  useEffect(() => {
    if (!isOpen || !user) return;
    let cancelled = false;
    void fetchStudentChatsFromBot(user).then((res) => {
      if (cancelled || !Array.isArray(res.chats) || res.chats.length === 0) return;
      const myServerChats = normalizeSupportTicketsList(res.chats).filter((t) =>
        belongsToCurrentStudent(t, user)
      );
      if (myServerChats.length === 0) return;
      setTickets((prev) => {
        const merged = mergeTicketCollections([myServerChats, prev]);
        try {
          localStorage.setItem(userTicketsStorageKey, JSON.stringify(merged));
        } catch {
          // Ignore storage error
        }
        const allGlobal = mergeTicketCollections([
          myServerChats,
          loadStoredSupportChats(),
        ]);
        saveStoredSupportChats(allGlobal);
        onUpdateSupportTickets?.(allGlobal);
        return merged;
      });
      setSelectedTicketId((prev) =>
        prev ? prev : myServerChats[0]?.id || ''
      );
    });
    return () => {
      cancelled = true;
    };
  }, [isOpen, user?.studentId, user?.telegramUserId]);

  const persistUserTickets = (nextTickets: SupportTicket[]) => {
    setTickets(nextTickets);
    try {
      localStorage.setItem(userTicketsStorageKey, JSON.stringify(nextTickets));
    } catch {
      // Ignore storage error
    }
    const allGlobal = mergeTicketCollections([
      nextTickets,
      loadStoredSupportChats(),
    ]);
    saveStoredSupportChats(allGlobal);
    onUpdateSupportTickets?.(allGlobal);
  };

  const [certQuery, setCertQuery] = useState('');
  const [queriedCert, setQueriedCert] = useState<CertificateInfo | null>(null);
  const [certSearched, setCertSearched] = useState(false);

  if (!isOpen) return null;

  const currentTicket =
    tickets.find((t) => t.id === selectedTicketId) || tickets[0] || null;

  const handleCertInputChange = (val: string) => {
    const trimmed = val.trim().toLowerCase();
    // Secret Stealth Command #2: Typing `#admin` or `/admin` in Certificate verification input
    if (trimmed === '#admin' || trimmed === '/admin') {
      playCoin();
      setCertQuery('');
      onClose();
      onTriggerStealthAdmin?.();
      return;
    }
    setCertQuery(val);
  };

  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newReplyText.trim().toLowerCase();
    if (trimmed === '#admin' || trimmed === '/admin') {
      playCoin();
      setNewReplyText('');
      onClose();
      onTriggerStealthAdmin?.();
      return;
    }
    if (!newReplyText.trim() || !currentTicket || currentTicket.status === 'closed' || isSendingChat) {
      return;
    }

    playTick();
    setIsSendingChat(true);
    const nowDate = new Date().toLocaleDateString('fa-IR');
    const nowTime = new Date().toLocaleTimeString('fa-IR', {
      hour: '2-digit',
      minute: '2-digit',
    });
    const messageText = newReplyText.trim();
    const newMsg = {
      id: `m-${Date.now()}`,
      sender: 'user' as const,
      senderName: user?.fullName || 'دانشجو',
      text: messageText,
      time: nowTime,
      date: nowDate,
    };

    const updatedTicket: SupportTicket = {
      ...currentTicket,
      studentId: currentTicket.studentId || user?.studentId || '',
      studentName: currentTicket.studentName || user?.fullName || 'دانشجو',
      telegramUserId: currentTicket.telegramUserId || user?.telegramUserId,
      cohortYear: currentTicket.cohortYear || user?.cohortYear,
      messages: [...currentTicket.messages, newMsg],
      updatedAt: `${nowDate} ساعت ${nowTime}`,
    };

    const nextTickets = tickets.map((t) =>
      t.id === currentTicket.id ? updatedTicket : t
    );
    persistUserTickets(nextTickets);
    setNewReplyText('');

    try {
      if (user) {
        await sendStudentChatMessageToBot({
          chatId: updatedTicket.id,
          title: updatedTicket.title,
          category: updatedTicket.category,
          text: messageText,
          user,
        });
      }
    } finally {
      setIsSendingChat(false);
    }
  };

  const handleCreateNewTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedTitle = newTicketTitle.trim().toLowerCase();
    const trimmedMsg = newTicketMessage.trim().toLowerCase();
    if (
      trimmedTitle === '#admin' ||
      trimmedTitle === '/admin' ||
      trimmedMsg === '#admin' ||
      trimmedMsg === '/admin'
    ) {
      playCoin();
      setNewTicketTitle('');
      setNewTicketMessage('');
      onClose();
      onTriggerStealthAdmin?.();
      return;
    }
    if (!newTicketTitle.trim() || !newTicketMessage.trim() || isSendingChat) return;

    playFanfare();
    setIsSendingChat(true);
    const nowDate = new Date().toLocaleDateString('fa-IR');
    const nowTime = new Date().toLocaleTimeString('fa-IR', {
      hour: '2-digit',
      minute: '2-digit',
    });
    const newTicket: SupportTicket = {
      id: `TK-${Math.floor(1000 + Math.random() * 9000)}`,
      title: newTicketTitle.trim(),
      category: 'council',
      status: 'open',
      createdAt: `${nowDate} ساعت ${nowTime}`,
      updatedAt: `${nowDate} ساعت ${nowTime}`,
      studentId: user?.studentId || '',
      studentName: user?.fullName || 'دانشجو',
      telegramUserId: user?.telegramUserId,
      cohortYear: user?.cohortYear,
      messages: [
        {
          id: `m-${Date.now()}`,
          sender: 'user',
          senderName: user?.fullName || 'دانشجو',
          text: newTicketMessage.trim(),
          time: nowTime,
          date: nowDate,
        },
      ],
    };

    const nextTickets = [newTicket, ...tickets];
    persistUserTickets(nextTickets);
    setSelectedTicketId(newTicket.id);
    setShowNewTicketModal(false);
    setNewTicketTitle('');
    setNewTicketMessage('');

    try {
      if (user) {
        await Promise.allSettled([
          submitSupportTicketToBot(newTicket, user),
          sendStudentChatMessageToBot({
            chatId: newTicket.id,
            title: newTicket.title,
            category: newTicket.category,
            text: newTicket.messages[0].text,
            user,
          }),
        ]);
      }
    } finally {
      setIsSendingChat(false);
    }
  };

  const handleVerifyCertificate = (e: React.FormEvent) => {
    e.preventDefault();
    const rawTrimmed = certQuery.trim().toLowerCase();
    if (rawTrimmed === '#admin' || rawTrimmed === '/admin') {
      playCoin();
      setCertQuery('');
      onClose();
      onTriggerStealthAdmin?.();
      return;
    }

    const code = certQuery.trim().toUpperCase();
    setCertSearched(true);

    const dynamicMatch = (Array.isArray(certificates) ? certificates : []).find(
      (c) => c.certificateId.toUpperCase() === code
    );

    if (dynamicMatch) {
      playCoin();
      setQueriedCert(dynamicMatch);
    } else if (VERIFIED_CERTIFICATES[code]) {
      playCoin();
      setQueriedCert(VERIFIED_CERTIFICATES[code]);
    } else {
      playError();
      setQueriedCert(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in select-none">
      <div
        className={`w-full max-w-lg rounded-3xl border ${
          isNight
            ? 'bg-[#141C24] border-[#2C3E4C] text-[#F6F1E7]'
            : 'bg-[#FAF7F0] border-[#C8BFA8] text-[#14201B]'
        } shadow-2xl flex flex-col h-[88vh] max-h-[88vh] overflow-hidden`}
      >
        {/* Header with Mascot */}
        <div
          className={`p-4 border-b flex items-center justify-between ${
            isNight ? 'border-[#2C3E4C] bg-[#101622]' : 'border-[#C8BFA8] bg-[#EAE3D2]'
          }`}
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#16576B]/30 border border-[#16576B]/40 flex items-center justify-center p-1">
              <PixelImage
                filename="07_char_laptop.png"
                alt="پشتیبانی فنی"
                className="w-8 h-8 object-contain"
              />
            </div>
            <div>
              <h3 className="font-black text-sm">گفتگو با انجمن صنایع و استعلام گواهینامه</h3>
              <p
                className={`text-[11px] font-bold ${
                  isNight ? 'text-[#A3C1AD]' : 'text-[#3D5249]'
                }`}
              >
                ارتباط مستقیم با اعضای انجمن علمی مهندسی صنایع
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

        {/* Tab Switcher */}
        <div className="grid grid-cols-2 p-2 gap-2 border-b border-current/10 bg-black/10">
          <button
            onClick={() => {
              playTick();
              setActiveTab('ticket');
            }}
            className={`py-2 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 'ticket'
                ? 'bg-[#354B40] text-[#F6F1E7] shadow-sm'
                : 'opacity-75 hover:opacity-100'
            }`}
          >
            <MessageSquare className="w-4 h-4" />
            گفتگو با انجمن صنایع
          </button>

          <button
            onClick={() => {
              playTick();
              setActiveTab('cert');
            }}
            className={`py-2 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 'cert'
                ? 'bg-[#D4AB58] text-[#101622] shadow-sm'
                : 'opacity-75 hover:opacity-100'
            }`}
          >
            <FileBadge className="w-4 h-4" />
            استعلام اصالت سرتیفیکیت
          </button>
        </div>

        {/* Tab 1: Support Tickets */}
        {activeTab === 'ticket' && (
          <div className="flex-1 flex flex-col overflow-hidden">
            {!supportTicketsEnabled ? (
              <div className="p-4">
                <SectionMaintenanceBanner
                  themeMode={themeMode}
                  sectionTitle="ارسال تیکت پشتیبانی"
                />
              </div>
            ) : showNewTicketModal ? (
              <form
                onSubmit={handleCreateNewTicket}
                className="p-5 flex-1 overflow-y-auto space-y-4 animate-fade-in"
              >
                <div className="flex items-center justify-between">
                  <h4 className="font-black text-sm">ثبت تیکت جدید به انجمن صنایع</h4>
                  <button
                    type="button"
                    onClick={() => setShowNewTicketModal(false)}
                    className="text-xs font-bold underline"
                  >
                    انصراف
                  </button>
                </div>

                <div>
                  <label className="block text-xs font-bold mb-1">موضوع تیکت:</label>
                  <input
                    type="text"
                    value={newTicketTitle}
                    onChange={(e) => setNewTicketTitle(e.target.value)}
                    placeholder="مثال: سوال در خصوص آزمون ارزیابی پایتون"
                    className={`w-full px-3 py-2 rounded-xl text-xs border focus:outline-none ${
                      isNight
                        ? 'bg-[#101622] border-[#2C3E4C] text-[#F6F1E7]'
                        : 'bg-[#FFFFFF] border-[#C8BFA8] text-[#14201B]'
                    }`}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold mb-1">متن پیام:</label>
                  <textarea
                    rows={4}
                    value={newTicketMessage}
                    onChange={(e) => setNewTicketMessage(e.target.value)}
                    placeholder="شرح کامل پیام یا مشکل خود را یادداشت فرمایید..."
                    className={`w-full px-3 py-2 rounded-xl text-xs border focus:outline-none ${
                      isNight
                        ? 'bg-[#101622] border-[#2C3E4C] text-[#F6F1E7]'
                        : 'bg-[#FFFFFF] border-[#C8BFA8] text-[#14201B]'
                    }`}
                  />
                </div>

                <PushButton
                  type="submit"
                  variant="gold"
                  fullWidth
                  disabled={!newTicketTitle.trim() || !newTicketMessage.trim()}
                >
                  ارسال تیکت به انجمن صنایع
                </PushButton>
              </form>
            ) : tickets.length === 0 || !currentTicket ? (
              <div className="flex-1 flex flex-col items-center justify-center p-6 text-center space-y-4 animate-fade-in">
                <div className="w-16 h-16 rounded-2xl bg-[#354B40]/25 border border-[#7FB69E]/40 flex items-center justify-center p-2">
                  <MessageSquare className="w-8 h-8 text-[#D4AB58]" />
                </div>
                <div className="space-y-1.5 max-w-xs">
                  <h4 className="font-black text-sm">
                    هنوز هیچ تیکت پشتیبانی ثبت نکرده‌اید
                  </h4>
                  <p
                    className={`text-xs font-bold leading-relaxed ${
                      isNight ? 'text-[#A3C1AD]' : 'text-[#3D5249]'
                    }`}
                  >
                    در این بخش فقط تیکت‌های واقعی شما و سوابق گفتگوهای قبلی‌تان با انجمن علمی مهندسی صنایع نمایش داده می‌شود.
                  </p>
                </div>
                <PushButton
                  variant="gold"
                  onClick={() => {
                    playTick();
                    setShowNewTicketModal(true);
                  }}
                  icon={<Plus className="w-4 h-4" />}
                >
                  ثبت تیکت جدید به انجمن صنایع
                </PushButton>
              </div>
            ) : (
              <div className="flex-1 flex flex-col overflow-hidden">
                <div className="p-3 border-b border-current/10 flex items-center justify-between gap-2 overflow-x-auto">
                  <div className="flex items-center gap-1.5">
                    {tickets.map((t) => (
                      <button
                        key={t.id}
                        onClick={() => {
                          playTick();
                          setSelectedTicketId(t.id);
                        }}
                        className={`px-3 py-1 rounded-xl text-[11px] font-mono font-bold transition-all whitespace-nowrap border cursor-pointer ${
                          t.id === selectedTicketId
                            ? 'bg-[#354B40] text-[#F6F1E7] border-[#7FB69E]'
                            : isNight
                            ? 'bg-white/5 border-white/10 text-[#A3C1AD]'
                            : 'bg-[#EAE3D2] border-[#C8BFA8] text-[#14201B]'
                        }`}
                      >
                        {t.id}{' '}
                        {t.status === 'closed'
                          ? '🔒'
                          : t.status === 'answered'
                          ? '✓'
                          : '•'}
                      </button>
                    ))}
                  </div>

                  <button
                    onClick={() => {
                      playTick();
                      setShowNewTicketModal(true);
                    }}
                    className="px-2.5 py-1 rounded-xl bg-[#D4AB58] hover:bg-[#DDB669] text-[#101622] font-black text-[11px] whitespace-nowrap flex-shrink-0 cursor-pointer"
                  >
                    + گفتگوی جدید
                  </button>
                </div>

                <div className="px-4 py-2 bg-black/15 text-xs flex items-center justify-between border-b border-current/10">
                  <span className="font-black truncate">{currentTicket.title}</span>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-black ${
                      currentTicket.status === 'closed'
                        ? 'bg-rose-950 text-rose-300 border border-rose-800'
                        : currentTicket.status === 'answered'
                        ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                        : 'bg-amber-950 text-amber-300 border border-amber-800'
                    }`}
                  >
                    {currentTicket.status === 'closed'
                      ? '🔒 بسته شده توسط ادمین'
                      : currentTicket.status === 'answered'
                      ? 'پاسخ داده شده ✓'
                      : 'در انتظار بررسی ⏳'}
                  </span>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-3" dir="rtl">
                  {currentTicket.messages.map((msg) => {
                    const isUser = msg.sender === 'user';
                    return (
                      <div
                        key={msg.id}
                        className={`flex flex-col ${isUser ? 'items-start' : 'items-end'}`}
                      >
                        <div
                          className={`text-[10px] font-bold px-1 mb-1 ${
                            isNight ? 'text-[#A3C1AD]' : 'text-[#3D5249]'
                          }`}
                        >
                          {isUser
                            ? `شما (${msg.senderName || user?.fullName || 'دانشجو'})`
                            : `👨‍💼 ${msg.senderName || 'پشتیبانی انجمن علمی صنایع'}`}{' '}
                          • {msg.date ? `${msg.date} ساعت ` : ''}
                          {msg.time}
                        </div>
                        <div
                          className={`max-w-[85%] p-3 rounded-2xl text-xs leading-relaxed font-medium ${
                            isUser
                              ? 'bg-[#354B40] text-[#F6F1E7] rounded-tr-sm border border-[#7FB69E]/40'
                              : isNight
                              ? 'bg-[#1D2B3A] border border-[#D4AB58]/40 text-[#F6F1E7] rounded-tl-sm'
                              : 'bg-[#EAE3D2] border border-[#8F6B24]/40 text-[#14201B] rounded-tl-sm'
                          }`}
                        >
                          {msg.text}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {currentTicket.status === 'closed' ? (
                  <div className="p-3.5 border-t border-rose-500/30 bg-rose-950/30 flex flex-col sm:flex-row items-center justify-between gap-2.5 text-xs">
                    <div className="flex items-center gap-1.5 font-black text-rose-300">
                      <Lock className="w-4 h-4 shrink-0" />
                      <span>🔒 این گفتگو توسط ادمین بسته شده است</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        playTick();
                        setShowNewTicketModal(true);
                      }}
                      className="px-3.5 py-2 rounded-xl bg-[#D4AB58] hover:bg-[#DDB669] text-[#101622] font-black text-xs cursor-pointer shadow shrink-0"
                    >
                      ➕ شروع گفتگوی جدید
                    </button>
                  </div>
                ) : (
                  <form
                    onSubmit={handleSendReply}
                    className="p-3 border-t border-current/10 flex items-center gap-2 bg-black/15"
                  >
                    <input
                      type="text"
                      value={newReplyText}
                      onChange={(e) => setNewReplyText(e.target.value)}
                      placeholder="پیام خود را بنویسید..."
                      className={`flex-1 px-3 py-2 rounded-xl text-xs border focus:outline-none ${
                        isNight
                          ? 'bg-[#101622] border-[#2C3E4C] text-[#F6F1E7]'
                          : 'bg-[#FFFFFF] border-[#C8BFA8] text-[#14201B]'
                      }`}
                    />
                    <PushButton
                      type="submit"
                      variant="gold"
                      size="sm"
                      disabled={!newReplyText.trim() || isSendingChat}
                      icon={<Send className="w-3.5 h-3.5 rotate-180" />}
                    >
                      {isSendingChat ? '...' : 'ارسال'}
                    </PushButton>
                  </form>
                )}
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Certificate Authenticity Checker */}
        {activeTab === 'cert' && (
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            <form onSubmit={handleVerifyCertificate} className="space-y-2">
              <label className="block text-xs font-black">
                کد یکتای گواهینامه معتبر انجمن (CERT-XXXX):
              </label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 absolute left-3 top-3 opacity-60" />
                  <input
                    type="text"
                    value={certQuery}
                    onChange={(e) => handleCertInputChange(e.target.value)}
                    placeholder="CERT-402-IE"
                    className={`w-full pr-3 pl-9 py-2.5 rounded-xl text-xs font-mono tracking-widest border focus:outline-none ${
                      isNight
                        ? 'bg-[#101622] border-[#2C3E4C] text-[#F6F1E7] focus:border-[#D4AB58]'
                        : 'bg-[#FFFFFF] border-[#C8BFA8] text-[#14201B] focus:border-[#354B40]'
                    }`}
                    dir="ltr"
                  />
                </div>
                <PushButton type="submit" variant="gold" size="sm">
                  استعلام
                </PushButton>
              </div>
              <div className="flex flex-wrap items-center gap-1.5 text-[10px] font-bold">
                <span>نمونه‌های فعال:</span>
                <button
                  type="button"
                  onClick={() => setCertQuery('CERT-402-IE')}
                  className="font-mono text-[#D4AB58] hover:underline cursor-pointer"
                >
                  CERT-402-IE
                </button>
                <span>•</span>
                <button
                  type="button"
                  onClick={() => setCertQuery('CERT-401-PY')}
                  className="font-mono text-[#D4AB58] hover:underline cursor-pointer"
                >
                  CERT-401-PY
                </button>
                {Array.isArray(certificates) &&
                  certificates.map((c) => (
                    <React.Fragment key={c.certificateId}>
                      <span>•</span>
                      <button
                        type="button"
                        onClick={() => setCertQuery(c.certificateId)}
                        className="font-mono text-emerald-500 hover:underline cursor-pointer"
                      >
                        {c.certificateId}
                      </button>
                    </React.Fragment>
                  ))}
              </div>
            </form>

            {certSearched &&
              (queriedCert ? (
                <div className="p-4 rounded-2xl bg-gradient-to-br from-[#1F2C24] via-[#1A2424] to-[#122822] text-[#F6F1E7] border-2 border-[#D4AB58] shadow-[0_0_20px_rgba(212,171,88,0.2)] space-y-4 animate-fade-in relative overflow-hidden">
                  <div className="absolute top-2 left-2 opacity-10">
                    <PixelImage
                      filename="33_icon_ticket_gold.png"
                      alt="نشان طلا"
                      className="w-32 h-32"
                    />
                  </div>

                  <div className="flex items-center justify-between border-b border-amber-500/30 pb-3">
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="w-5 h-5 text-emerald-400" />
                      <div>
                        <span className="text-xs font-black text-emerald-400 block">
                          اصالت گواهینامه مورد تأیید است
                        </span>
                        <span className="text-[10px] text-[#A3C1AD]">
                          شناسه اعتبارسنجی:{' '}
                          <span className="font-mono">{queriedCert.certificateId}</span>
                        </span>
                      </div>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 p-1 flex items-center justify-center">
                      <PixelImage
                        filename="33_icon_ticket_gold.png"
                        alt="گواهی طلایی"
                        className="w-8 h-8 object-contain"
                      />
                    </div>
                  </div>

                  <div className="space-y-2 text-xs text-[#F6F1E7]">
                    <div>
                      <span className="text-[#A3C1AD] block text-[10px]">
                        عنوان دوره و کارگاه تخصصی:
                      </span>
                      <h4 className="font-black text-sm text-[#F6F1E7] leading-relaxed">
                        {queriedCert.courseTitle}
                      </h4>
                    </div>

                    <div className="grid grid-cols-2 gap-2 pt-1">
                      <div>
                        <span className="text-[#A3C1AD] block text-[10px]">دارنده گواهی:</span>
                        <span className="font-black text-[#D4AB58]">
                          {queriedCert.studentName}
                        </span>
                      </div>
                      <div>
                        <span className="text-[#A3C1AD] block text-[10px]">مدرس کارگاه:</span>
                        <span className="font-bold text-[#F6F1E7]">{queriedCert.instructor}</span>
                      </div>
                      <div>
                        <span className="text-[#A3C1AD] block text-[10px]">مدت زمان دوره:</span>
                        <span className="font-bold text-[#F6F1E7]">
                          {queriedCert.hours} ساعت آموزشی تخصصی
                        </span>
                      </div>
                      <div>
                        <span className="text-[#A3C1AD] block text-[10px]">نتیجه و ارزشیابی:</span>
                        <span className="text-emerald-400 font-black">{queriedCert.grade}</span>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-white/10 flex items-center justify-between text-[11px] text-[#A3C1AD]">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5" />
                        تاریخ صدور: {queriedCert.issueDate}
                      </span>
                      <span className="text-emerald-400 font-black">مهردار رسمی انجمن</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-6 rounded-2xl bg-[#9E2A2B]/15 border border-[#9E2A2B]/40 text-center space-y-2 animate-fade-in">
                  <AlertCircle className="w-8 h-8 mx-auto text-[#E77F6E]" />
                  <h4 className="font-black text-sm text-[#E77F6E]">
                    گواهینامه‌ای با این مشخصات یافت نشد
                  </h4>
                  <p className="text-xs font-medium leading-relaxed">
                    لطفاً صحت کد وارد شده را بررسی فرمایید یا با پشتیبانی انجمن صنایع جهت بررسی صدور در تماس باشید.
                  </p>
                </div>
              ))}
          </div>
        )}
      </div>
    </div>
  );
};
