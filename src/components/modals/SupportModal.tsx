/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 2-Way Support Tickets & Official Certificate Verification Modal
 * Includes Secret Search Command (#admin / /admin), Dynamic Certificate Verification,
 * FeatureFlags Kill-Switch Support, and High-Contrast Day/Night Readability
 */

import React, { useState } from 'react';
import { CertificateInfo, SupportTicket, ThemeMode, UserProfile } from '../../types';
import { PixelImage } from '../PixelImage';
import { PushButton } from '../ui/PushButton';
import { SectionMaintenanceBanner } from '../ui/SectionMaintenanceBanner';
import { playCoin, playError, playFanfare, playTick } from '../../utils/soundEngine';
import { submitSupportTicketToBot } from '../../utils/apiBridge';
import {
  X,
  MessageSquare,
  Send,
  Search,
  AlertCircle,
  FileBadge,
  Calendar,
  ShieldCheck,
} from 'lucide-react';

interface SupportModalProps {
  isOpen: boolean;
  onClose: () => void;
  themeMode: ThemeMode;
  user?: UserProfile;
  certificates?: CertificateInfo[];
  supportTicketsEnabled?: boolean;
  onTriggerStealthAdmin?: () => void;
}

const SAMPLE_TICKETS: SupportTicket[] = [
  {
    id: 'TK-4021',
    title: 'تداخل ساعت کارگاه پایتون با جلسه حل تمرین ریاضی ۲',
    category: 'council',
    status: 'answered',
    updatedAt: 'امروز، ۱۰:۱۵',
    messages: [
      {
        id: 'm-1',
        sender: 'user',
        senderName: 'دانشجو',
        text: 'سلام، کارگاه پایتون روز دوشنبه ساعت ۱۶ با حل تمرین ریاضی تداخل دارد. آیا فایل ضبط شده ارائه می‌شود؟',
        time: 'دیروز، ۲۰:۳۰',
      },
      {
        id: 'm-2',
        sender: 'support',
        senderName: 'کمیته آموزش انجمن صنایع',
        text: 'سلام و درود! بله، تمامی جلسات ضبط گردیده و لینک اختصاصی گوگل درایو پس از کارگاه برای ثبت‌نام‌کنندگان ایمیل خواهد شد.',
        time: 'امروز، ۱۰:۱۵',
      },
    ],
  },
  {
    id: 'TECH-108',
    title: 'عدم تطبیق شماره دانشجویی در سامانه صدور سرتیفیکیت',
    category: 'tech',
    status: 'open',
    updatedAt: 'دیروز، ۱۲:۰۰',
    messages: [
      {
        id: 'm-3',
        sender: 'user',
        senderName: 'دانشجو',
        text: 'سلام خسته نباشید، در استعلام گواهی دوره شبیه‌سازی آرنا شماره دانشجویی من به اشتباه ثبت شده است.',
        time: 'دیروز، ۱۲:۰۰',
      },
    ],
  },
];

const VERIFIED_CERTIFICATES: Record<string, CertificateInfo> = {
  'CERT-402-IE': {
    certificateId: 'CERT-402-IE',
    studentName: 'امیرحسین رضایی',
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

export const SupportModal: React.FC<SupportModalProps> = ({
  isOpen,
  onClose,
  themeMode,
  user,
  certificates = [],
  supportTicketsEnabled = true,
  onTriggerStealthAdmin,
}) => {
  const isNight = themeMode === 'night';
  const [activeTab, setActiveTab] = useState<'ticket' | 'cert'>('ticket');

  const [tickets, setTickets] = useState<SupportTicket[]>(SAMPLE_TICKETS);
  const [selectedTicketId, setSelectedTicketId] = useState<string>('TK-4021');
  const [newReplyText, setNewReplyText] = useState('');
  const [showNewTicketModal, setShowNewTicketModal] = useState(false);
  const [newTicketTitle, setNewTicketTitle] = useState('');
  const [newTicketMessage, setNewTicketMessage] = useState('');

  const [certQuery, setCertQuery] = useState('CERT-402-IE');
  const [queriedCert, setQueriedCert] = useState<CertificateInfo | null>(
    VERIFIED_CERTIFICATES['CERT-402-IE']
  );
  const [certSearched, setCertSearched] = useState(true);

  if (!isOpen) return null;

  const currentTicket = tickets.find((t) => t.id === selectedTicketId) || tickets[0];

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

  const handleSendReply = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newReplyText.trim().toLowerCase();
    if (trimmed === '#admin' || trimmed === '/admin') {
      playCoin();
      setNewReplyText('');
      onClose();
      onTriggerStealthAdmin?.();
      return;
    }
    if (!newReplyText.trim()) return;

    playTick();
    const newMsg = {
      id: `m-${Date.now()}`,
      sender: 'user' as const,
      senderName: 'دانشجو',
      text: newReplyText.trim(),
      time: 'هم‌اکنون',
    };

    setTickets((prev) =>
      prev.map((t) =>
        t.id === selectedTicketId
          ? {
              ...t,
              messages: [...t.messages, newMsg],
              updatedAt: 'هم‌اکنون',
            }
          : t
      )
    );
    setNewReplyText('');
  };

  const handleCreateNewTicket = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTicketTitle.trim() || !newTicketMessage.trim()) return;

    playFanfare();
    const newTicket: SupportTicket = {
      id: `TK-${Math.floor(1000 + Math.random() * 9000)}`,
      title: newTicketTitle.trim(),
      category: 'council',
      status: 'open',
      updatedAt: 'هم‌اکنون',
      messages: [
        {
          id: `m-${Date.now()}`,
          sender: 'user',
          senderName: 'دانشجو',
          text: newTicketMessage.trim(),
          time: 'هم‌اکنون',
        },
      ],
    };

    setTickets((prev) => [newTicket, ...prev]);
    setSelectedTicketId(newTicket.id);
    setShowNewTicketModal(false);
    setNewTicketTitle('');
    setNewTicketMessage('');

    if (user) {
      void submitSupportTicketToBot(newTicket, user);
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
              <h3 className="font-black text-sm">پشتیبانی شورا و استعلام گواهینامه</h3>
              <p
                className={`text-[11px] font-bold ${
                  isNight ? 'text-[#A3C1AD]' : 'text-[#3D5249]'
                }`}
              >
                ارتباط مستقیم با اعضای شورای مرکزی انجمن
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
            تیکت‌های پشتیبانی شورا
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
                  <h4 className="font-black text-sm">ثبت تیکت جدید به شورای مرکزی</h4>
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
                  ارسال تیکت به شورا
                </PushButton>
              </form>
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
                        {t.id} {t.status === 'answered' ? '✓' : '•'}
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
                    + تیکت جدید
                  </button>
                </div>

                <div className="px-4 py-2 bg-black/15 text-xs flex items-center justify-between border-b border-current/10">
                  <span className="font-black truncate">{currentTicket.title}</span>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-black ${
                      currentTicket.status === 'answered'
                        ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                        : 'bg-amber-950 text-amber-300 border border-amber-800'
                    }`}
                  >
                    {currentTicket.status === 'answered' ? 'پاسخ داده شده' : 'در انتظار بررسی'}
                  </span>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                  {currentTicket.messages.map((msg) => {
                    const isUser = msg.sender === 'user';
                    return (
                      <div
                        key={msg.id}
                        className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}
                      >
                        <div
                          className={`text-[10px] font-bold px-1 mb-1 ${
                            isNight ? 'text-[#A3C1AD]' : 'text-[#3D5249]'
                          }`}
                        >
                          {msg.senderName} • {msg.time}
                        </div>
                        <div
                          className={`max-w-[85%] p-3 rounded-2xl text-xs leading-relaxed font-medium ${
                            isUser
                              ? 'bg-[#354B40] text-[#F6F1E7] rounded-tl-sm'
                              : isNight
                              ? 'bg-white/10 border border-white/10 text-[#F6F1E7] rounded-tr-sm'
                              : 'bg-[#EAE3D2] border border-[#C8BFA8] text-[#14201B] rounded-tr-sm'
                          }`}
                        >
                          {msg.text}
                        </div>
                      </div>
                    );
                  })}
                </div>

                <form
                  onSubmit={handleSendReply}
                  className="p-3 border-t border-current/10 flex items-center gap-2 bg-black/15"
                >
                  <input
                    type="text"
                    value={newReplyText}
                    onChange={(e) => setNewReplyText(e.target.value)}
                    placeholder="پاسخ خود را بنویسید..."
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
                    disabled={!newReplyText.trim()}
                    icon={<Send className="w-3.5 h-3.5 rotate-180" />}
                  >
                    ارسال
                  </PushButton>
                </form>
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
                    لطفاً صحت کد وارد شده را بررسی فرمایید یا با پشتیبانی شورا جهت بررسی صدور در تماس باشید.
                  </p>
                </div>
              ))}
          </div>
        )}
      </div>
    </div>
  );
};
