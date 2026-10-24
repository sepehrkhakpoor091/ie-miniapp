/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Secure "Looti" AI Co-Pilot Modal (دستیار مشتی هوش مصنوعی)
 * Features: Warm Iranian Senior Student Persona, Multi-Model Switcher,
 * Quick-Prompt Chips, Sliding-Window Rate Limiter (5 req/60s), and Anti-Prompt-Injection Guard.
 */

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  LootiChatMessage,
  LootiModelId,
  ThemeMode,
  UserProfile,
} from '../../types';
import { PixelImage } from '../PixelImage';
import { PushButton } from '../ui/PushButton';
import {
  checkAiRateLimit,
  sanitizeAiPrompt,
  secureFetch,
} from '../../utils/security';
import {
  playCoin,
  playError,
  playSwitch,
  playTick,
} from '../../utils/soundEngine';

interface LootiAiModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: UserProfile;
  themeMode: ThemeMode;
}

const MODEL_OPTIONS: { id: LootiModelId; label: string }[] = [
  { id: 'gemini-3.8-flash', label: 'gemini-3.8-flash' },
  { id: 'gemini-3.6-flash', label: 'gemini-3.6-flash' },
  { id: 'gemini-3.5-flash-lite', label: 'gemini-3.5-flash-lite' },
];

const QUICK_PROMPTS = [
  '🎯 چجوری سریع‌تر امتیاز و الماس جمع کنم؟',
  '📅 کدوم کارگاه این هفته به درد بازار کار میخوره؟',
  '👨‍🏫 ساعت حضور اساتید صنایع کی هست؟',
];

function getClientSideLootiFallback(prompt: string, firstName: string, score: number): string {
  if (prompt.includes('امتیاز') || prompt.includes('الماس')) {
    return `دمت گرم ${firstName} جان! الان ${score.toLocaleString('fa-IR')} امتیاز الماس داری 💎\nواسه اینکه سریع‌تر الماس جمع کنی:\n۱. تو تب «افتخارات» ماموریت «شرکت در ۲ کارگاه تخصصی» رو بزن (+۴۰ امتیاز فوری) و اگه مقاله واسه نشریه بفرستی +۱۰۰ امتیاز می‌گیری!\n۲. هر ۱۰ امتیاز = ۵۰,۰۰۰ تومان تخفیف مستقیم کارگاه‌هاست یا می‌تونی با ۱۰۰ امتیاز «صندوقچه طلایی صنایع» رو باز کنی مشتی!`;
  }
  if (prompt.includes('کارگاه') || prompt.includes('بازار کار')) {
    return `سوال طلایی پرسیدی مهندس! 🎯\nاین هفته حتماً «کارگاه تحلیل داده با پایتون» (۲۵ آبان با مهندس آرش شمس، +۲۰ امتیاز) و «دوره نرم‌افزار شبیه‌سازی Arena و Python» (۱۸ آذر با دکتر کاظمی، +۲۵ امتیاز) رو دریاب که خوراک رزومه و بازار کاره!\n۵ آذر هم «سمینار آینده شغلی در مهندسی صنایع» داریم که نباید از دستش بدی رفیق!`;
  }
  if (prompt.includes('اساتید') || prompt.includes('حضور') || prompt.includes('استاد')) {
    return `روی چشمم رفیق! برنامه حضور اساتید دانشکده مهندسی صنایع 👨‍🏫:\n• دکتر علی محمدی (تحقیق در عملیات): شنبه و دوشنبه ۱۰ تا ۱۲ (اتاق ۳۱۲)\n• دکتر سارا شمسایی (کنترل کیفیت): یکشنبه و سه‌شنبه ۱۳ تا ۱۵ (اتاق ۲۰۸)\n• دکتر محمدرضا رضایی (زنجیره تامین): دوشنبه و چهارشنبه ۱۱ تا ۱۲:۳۰ (اتاق ۳۰۵)\n• دکتر بهزاد کاظمی (شبیه‌سازی): شنبه و چهارشنبه ۱۴ تا ۱۶ (اتاق ۲۱۵)`;
  }
  return `مخلصیم ${firstName} عزیز! هر سوالی راجع به کارگاه‌های پایتون و کنترل پروژه، جمع کردن الماس، یا اساتید دانشکده داری بپرس، خودم کامل راهنماییت می‌کنم مهندس!`;
}

export const LootiAiModal: React.FC<LootiAiModalProps> = ({
  isOpen,
  onClose,
  user,
  themeMode,
}) => {
  const isNight = themeMode === 'night';

  const [selectedModel, setSelectedModel] = useState<LootiModelId>('gemini-3.8-flash');
  const [inputPrompt, setInputPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [securityWarning, setSecurityWarning] = useState<string | null>(null);
  const [remainingQuota, setRemainingQuota] = useState<number>(5);

  const [messages, setMessages] = useState<LootiChatMessage[]>([
    {
      id: 'msg-welcome',
      sender: 'looti',
      text: 'سلام رفیق مشتی! چطوری مهندس؟ هر سوالی راجع به کارگاه‌ها، اساتید، چارت درسی صنایع یا جمع کردن الماس و امتیاز داری بپرس، خودم هواتو دارم!',
      timestamp: 'هم‌اکنون',
      modelUsed: 'gemini-3.8-flash',
    },
  ]);

  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  if (!isOpen) return null;

  const handleSendMessage = async (textToSend?: string) => {
    const rawText = (textToSend !== undefined ? textToSend : inputPrompt).trim();
    if (!rawText || isLoading) return;

    setSecurityWarning(null);

    // 1. Prompt-Injection & XSS Guard
    const sanitizedCheck = sanitizeAiPrompt(rawText);
    if (!sanitizedCheck.isSafe) {
      playError();
      setSecurityWarning(
        sanitizedCheck.blockedReason || 'الگوی غیرمجاز در پیام شناسایی و مسدود گردید.'
      );
      return;
    }

    // 2. Sliding-Window Rate Limiter (Max 5 per 60s)
    const rateLimit = checkAiRateLimit();
    setRemainingQuota(rateLimit.remainingRequests);
    if (!rateLimit.allowed) {
      playError();
      setSecurityWarning(
        `⏳ محدودیت نرخ درخواست (Rate-Limit): حداکثر ۵ پیام در دقیقه مجاز است. لطفاً ${rateLimit.retryAfterSeconds.toLocaleString('fa-IR')} ثانیه دیگر تلاش کنید.`
      );
      return;
    }

    playTick();
    const userMsg: LootiChatMessage = {
      id: `usr-${Date.now()}`,
      sender: 'user',
      text: sanitizedCheck.sanitized,
      timestamp: new Date().toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    if (textToSend === undefined) {
      setInputPrompt('');
    }
    setIsLoading(true);

    try {
      const res = await secureFetch('/api/ai/looti', {
        method: 'POST',
        body: JSON.stringify({
          prompt: sanitizedCheck.sanitized,
          modelId: selectedModel,
          userName: user.firstName,
          userScore: user.score,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        playCoin();
        setMessages((prev) => [
          ...prev,
          {
            id: `looti-${Date.now()}`,
            sender: 'looti',
            text:
              data.reply ||
              getClientSideLootiFallback(sanitizedCheck.sanitized, user.firstName, user.score),
            timestamp: new Date().toLocaleTimeString('fa-IR', {
              hour: '2-digit',
              minute: '2-digit',
            }),
            modelUsed: selectedModel,
          },
        ]);
      } else {
        throw new Error('Fallback to local Looti');
      }
    } catch {
      playCoin();
      setMessages((prev) => [
        ...prev,
        {
          id: `looti-${Date.now()}`,
          sender: 'looti',
          text: getClientSideLootiFallback(sanitizedCheck.sanitized, user.firstName, user.score),
          timestamp: new Date().toLocaleTimeString('fa-IR', {
            hour: '2-digit',
            minute: '2-digit',
          }),
          modelUsed: selectedModel,
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AnimatePresence>
      <div
        className="fixed inset-0 z-50 flex items-end justify-center bg-black/80 backdrop-blur-md select-none"
        dir="rtl"
      >
        <motion.div
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={{ type: 'spring', stiffness: 380, damping: 30 }}
          className={`w-full max-w-lg rounded-t-3xl border-t border-x p-4 shadow-2xl h-[86vh] flex flex-col ${
            isNight
              ? 'bg-[#141C24] border-[#253247] text-[#F6F1E7]'
              : 'bg-[#FAF7F0] border-[#D8D0C1] text-[#1D2A24]'
          }`}
        >
          {/* Top Handle */}
          <div className="w-12 h-1.5 rounded-full bg-white/20 mx-auto mb-2.5 shrink-0" />

          {/* Header with Persona & Multi-Model Switcher */}
          <div className="pb-3 border-b border-white/10 space-y-2.5 shrink-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-11 h-11 rounded-2xl bg-[#D4AB58]/20 border border-[#D4AB58]/50 p-1 flex items-center justify-center shrink-0">
                  <PixelImage
                    filename="04_char_welcome.png"
                    alt="دستیار مشتی"
                    className="w-9 h-9 object-contain"
                  />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <h3 className="text-sm font-black">🤖 دستیار مشتی هوش مصنوعی</h3>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400">
                      آنلاین
                    </span>
                  </div>
                  <p className="text-[11px] opacity-75">
                    همراه هوشمند دانشجویان مهندسی صنایع • سهمیه دقیقه: {remainingQuota.toLocaleString('fa-IR')}/۵
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  playTick();
                  onClose();
                }}
                className="w-8 h-8 rounded-xl bg-white/10 flex items-center justify-center font-bold text-sm hover:bg-white/20 cursor-pointer"
                aria-label="بستن دستیار"
              >
                <svg viewBox="0 0 24 24" className="w-4 h-4 stroke-current fill-none" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Multi-Model Switcher Bar */}
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pt-0.5" dir="ltr">
              {MODEL_OPTIONS.map((m) => {
                const active = selectedModel === m.id;
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => {
                      playSwitch();
                      setSelectedModel(m.id);
                    }}
                    className={`px-2.5 py-1 rounded-lg font-mono text-[10px] font-bold border transition-all cursor-pointer shrink-0 ${
                      active
                        ? 'bg-[#D4AB58] text-[#101622] border-[#F3D184]'
                        : isNight
                        ? 'bg-[#101622] text-[#91B5BE] border-[#263449]'
                        : 'bg-[#EFE9DB] text-[#354B40] border-[#D8D0C1]'
                    }`}
                  >
                    {m.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Chat Messages Scroll Container */}
          <div className="flex-1 overflow-y-auto py-3 space-y-3 pr-1">
            {messages.map((msg) => {
              const isLooti = msg.sender === 'looti';
              return (
                <div
                  key={msg.id}
                  className={`flex flex-col ${isLooti ? 'items-start' : 'items-end'}`}
                >
                  <div
                    className={`max-w-[88%] rounded-2xl p-3.5 text-xs leading-relaxed border ${
                      isLooti
                        ? isNight
                          ? 'bg-[#1B2638] border-[#2C3E5A] text-[#F6F1E7] rounded-tr-sm'
                          : 'bg-[#FFFFFF] border-[#D8D0C1] text-[#1D2A24] rounded-tr-sm'
                        : 'bg-[#354B40] border-[#7FB69E]/50 text-[#F6F1E7] rounded-tl-sm'
                    }`}
                  >
                    <p className="whitespace-pre-line">{msg.text}</p>
                    <div className="flex items-center justify-between gap-3 mt-1.5 pt-1 border-t border-white/10 text-[9px] opacity-65">
                      <span>{isLooti ? 'دستیار مشتی صنایع' : user.firstName}</span>
                      <span dir="ltr">{msg.modelUsed || msg.timestamp}</span>
                    </div>
                  </div>
                </div>
              );
            })}

            {isLoading && (
              <div className="flex items-center gap-2 text-xs text-[#D4AB58] font-bold p-2">
                <span className="animate-pulse">🤖 دستیار مشتی در حال نوشتن پاسخ...</span>
              </div>
            )}

            <div ref={chatEndRef} />
          </div>

          {/* Security / Rate-Limit Warning Banner */}
          {securityWarning && (
            <div className="mb-2 p-2.5 rounded-xl bg-rose-950/80 border border-rose-500 text-rose-200 text-[11px] font-bold">
              {securityWarning}
            </div>
          )}

          {/* One-Tap Quick-Prompt Chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-2 no-scrollbar shrink-0">
            {QUICK_PROMPTS.map((chip) => (
              <button
                key={chip}
                type="button"
                onClick={() => handleSendMessage(chip)}
                className={`px-3 py-1.5 rounded-xl text-[11px] font-bold border shrink-0 transition-transform active:scale-95 cursor-pointer ${
                  isNight
                    ? 'bg-[#1A2433] border-[#2C3B54] text-[#D4AB58] hover:border-[#D4AB58]'
                    : 'bg-[#EFE9DB] border-[#D0C6B4] text-[#1D2A24] hover:border-[#8F6B24]'
                }`}
              >
                {chip}
              </button>
            ))}
          </div>

          {/* Input Box & Send Button */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="flex items-center gap-2 pt-2 border-t border-white/10 shrink-0"
          >
            <input
              type="text"
              value={inputPrompt}
              onChange={(e) => setInputPrompt(e.target.value)}
              placeholder="سوالت رو از دستیار مشتی بپرس..."
              maxLength={350}
              className={`flex-1 rounded-xl px-3.5 py-2.5 text-xs border outline-none transition-colors ${
                isNight
                  ? 'bg-[#101622] border-[#2C3B54] text-[#F6F1E7] focus:border-[#D4AB58]'
                  : 'bg-[#FFFFFF] border-[#D8D0C1] text-[#1D2A24] focus:border-[#354B40]'
              }`}
            />
            <PushButton
              variant="gold"
              size="sm"
              type="submit"
              disabled={isLoading || !inputPrompt.trim()}
            >
              ارسال
            </PushButton>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
