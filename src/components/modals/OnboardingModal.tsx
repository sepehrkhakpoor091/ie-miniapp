/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Gamified 4-Step Onboarding Wizard for Engineering Students
 * Supports dynamic Student Avatars Catalog added by Admin
 */

import React, { useState } from 'react';
import { AvatarCatalogItem, ThemeMode, UserProfile } from '../../types';
import { PixelImage } from '../PixelImage';
import { PushButton } from '../ui/PushButton';
import {
  isValidPersianName,
  extractCohortFromStudentId,
  sanitizeInput,
  getRealTelegramUser,
} from '../../utils/security';
import { calculateLevelFromScore } from '../../utils/gamification';
import {
  playCoin,
  playError,
  playFanfare,
  playTick,
} from '../../utils/soundEngine';
import {
  Sparkles,
  ArrowRight,
  ArrowLeft,
  Check,
  User,
  GraduationCap,
  Phone,
  Gift,
  X,
} from 'lucide-react';

const DEFAULT_STUDENT_AVATARS: AvatarCatalogItem[] = [
  {
    id: 'av-student-1',
    title: 'کاراکتر ۱',
    targetRole: 'student',
    imageUrl: '01_avatar_boy.png',
    addedBy: 'سیستم',
  },
  {
    id: 'av-student-2',
    title: 'کاراکتر ۲',
    targetRole: 'student',
    imageUrl: '02_avatar_girl.png',
    addedBy: 'سیستم',
  },
  {
    id: 'av-student-3',
    title: 'کاراکتر ۳',
    targetRole: 'student',
    imageUrl: '07_char_laptop.png',
    addedBy: 'سیستم',
  },
  {
    id: 'av-student-4',
    title: 'کاراکتر ۴',
    targetRole: 'student',
    imageUrl: '06_char_victory.png',
    addedBy: 'سیستم',
  },
];

function getCleanCharacterLabel(title: string, idx: number): string {
  const numLabel = `کاراکتر ${(idx + 1).toLocaleString('fa-IR')}`;
  if (!title || title.includes('مهندس') || title.includes('برنامه') || title.includes('قهرمان')) {
    return numLabel;
  }
  return title;
}

interface OnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: (profile: Partial<UserProfile>) => void;
  currentProfile: UserProfile;
  themeMode: ThemeMode;
  studentAvatars?: AvatarCatalogItem[];
}

export const OnboardingModal: React.FC<OnboardingModalProps> = ({
  isOpen,
  onClose,
  onComplete,
  currentProfile,
  themeMode,
  studentAvatars,
}) => {
  const isNight = themeMode === 'night';
  const [step, setStep] = useState(1);

  const availableAvatars =
    Array.isArray(studentAvatars) && studentAvatars.length > 0
      ? studentAvatars.filter((a) => a.targetRole === 'student')
      : DEFAULT_STUDENT_AVATARS;

  const realTgUser = getRealTelegramUser();
  const [selectedAvatar, setSelectedAvatar] = useState(
    currentProfile.avatar || '01_avatar_boy.png'
  );
  const [firstName, setFirstName] = useState(
    currentProfile.firstName && currentProfile.firstName !== 'دانشجو'
      ? currentProfile.firstName
      : realTgUser?.firstName || ''
  );
  const [lastName, setLastName] = useState(
    currentProfile.lastName || realTgUser?.lastName || ''
  );
  const [nameError, setNameError] = useState('');

  const [studentId, setStudentId] = useState(currentProfile.studentId || '');
  const [detectedCohort, setDetectedCohort] = useState(currentProfile.cohortYear || '');
  const [idError, setIdError] = useState('');

  const [phoneNumber, setPhoneNumber] = useState(
    currentProfile.verifiedTelegramPhone || '۰۹۱۲۳۴۵۶۷۸۹'
  );
  const [isPhoneVerified, setIsPhoneVerified] = useState(
    !!currentProfile.verifiedTelegramPhone
  );

  if (!isOpen) return null;

  const handleSelectAvatar = (avatar: string) => {
    setSelectedAvatar(avatar);
    playTick();
  };

  const handleNameNext = () => {
    const cleanFirst = sanitizeInput(firstName);
    const cleanLast = sanitizeInput(lastName);

    if (!isValidPersianName(cleanFirst)) {
      playError();
      setNameError('لطفاً نام را فقط با حروف فارسی و بدون عدد/لاتین وارد کنید.');
      return;
    }

    if (!isValidPersianName(cleanLast)) {
      playError();
      setNameError('لطفاً نام خانوادگی را فقط با حروف فارسی و بدون عدد/لاتین وارد کنید.');
      return;
    }

    setNameError('');
    playTick();
    setStep(3);
  };

  const handleStudentIdChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setStudentId(val);

    if (val.length >= 3) {
      const cohortInfo = extractCohortFromStudentId(val.padEnd(8, '0'));
      if (cohortInfo.cohort && cohortInfo.cohort !== detectedCohort) {
        setDetectedCohort(cohortInfo.cohort);
        playCoin();
      }
    } else {
      setDetectedCohort('');
    }
  };

  const handleIdNext = () => {
    const result = extractCohortFromStudentId(studentId);
    if (!result.isValid) {
      playError();
      setIdError('شماره دانشجویی باید بین ۶ تا ۱۴ رقم معتبر باشد.');
      return;
    }

    setIdError('');
    playTick();
    setStep(4);
  };

  const handleVerifyTelegramPhone = () => {
    playFanfare();
    setIsPhoneVerified(true);
  };

  const handleFinish = () => {
    playFanfare();
    const nextScore = Math.max(0, Number(currentProfile.score) || 0) + 5;
    const levelInfo = calculateLevelFromScore(nextScore);
    const tgUser = getRealTelegramUser();
    const finalProfile: Partial<UserProfile> = {
      avatar: selectedAvatar,
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      fullName: `${firstName.trim()} ${lastName.trim()}`.trim(),
      studentId: studentId.trim(),
      cohortYear: detectedCohort || '۱۴۰۲',
      verifiedTelegramPhone: phoneNumber,
      score: nextScore,
      level: levelInfo.level,
      rankTitle: levelInfo.rankTitle,
      telegramUserId: tgUser?.id || currentProfile.telegramUserId || 'web-local-student',
      telegramUsername: tgUser?.username || currentProfile.telegramUsername || '',
      onboardingCompleted: true,
    };
    onComplete(finalProfile);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in select-none">
      <div
        className={`w-full max-w-md rounded-3xl border ${
          isNight
            ? 'bg-[#141C24] border-[#253247] text-[#F6F1E7]'
            : 'bg-[#FAF7F0] border-[#C8BFA8] text-[#14201B]'
        } shadow-2xl overflow-hidden flex flex-col max-h-[92vh]`}
      >
        {/* Progress Header */}
        <div
          className={`p-4 border-b flex items-center justify-between ${
            isNight ? 'border-[#253247] bg-[#101622]' : 'border-[#C8BFA8] bg-[#EAE3D2]'
          }`}
        >
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-lg bg-[#D4AB58] text-[#101622] font-black text-xs flex items-center justify-center">
              {step}/۴
            </span>
            <span className="font-bold text-sm">ثبت‌نام و انتخاب آواتار دانشجویی</span>
          </div>
          <button
            onClick={() => {
              playTick();
              onClose();
            }}
            className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-current/10 active:scale-95 cursor-pointer"
            aria-label="بستن"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Step Indicator Bar */}
        <div className="w-full h-1.5 bg-black/20 flex">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className={`flex-1 transition-all duration-300 ${
                i <= step ? 'bg-[#D4AB58]' : 'bg-transparent'
              }`}
            />
          ))}
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto space-y-5">
          {/* STEP 1: Dynamic Student Avatar Selection */}
          {step === 1 && (
            <div className="space-y-4 text-center">
              <div className="w-20 h-20 mx-auto rounded-2xl bg-current/5 border border-current/10 flex items-center justify-center p-2">
                <PixelImage
                  filename="04_char_welcome.png"
                  alt="خوش‌آمدید"
                  className="w-16 h-16 object-contain"
                />
              </div>

              <div>
                <h3 className="font-bold text-base">آواتار پیکسلی خودت رو انتخاب کن</h3>
                <p className="text-xs opacity-75 mt-1">
                  شخصیت نمادین تو در رتبه‌بندی، کارت کارگاه‌ها و پروفایل نمایش داده می‌شود ({availableAvatars.length} آواتار فعال).
                </p>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 pt-2 max-h-60 overflow-y-auto pr-1">
                {availableAvatars.map((av, idx) => {
                  const isSelected = selectedAvatar === av.imageUrl;
                  const charLabel = getCleanCharacterLabel(av.title, idx);
                  return (
                    <button
                      key={av.id}
                      type="button"
                      onClick={() => handleSelectAvatar(av.imageUrl)}
                      className={`p-3 rounded-2xl border-2 transition-all flex flex-col items-center gap-2 relative cursor-pointer ${
                        isSelected
                          ? 'border-[#D4AB58] bg-[#D4AB58]/15 shadow-[0_0_15px_rgba(212,171,88,0.25)]'
                          : isNight
                          ? 'border-white/10 bg-white/5 hover:border-white/25'
                          : 'border-[#C8BFA8] bg-[#FFFFFF] hover:border-[#354B40]'
                      }`}
                    >
                      {isSelected && (
                        <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-[#D4AB58] text-[#101622] flex items-center justify-center text-xs">
                          <Check className="w-3.5 h-3.5 stroke-[3]" />
                        </div>
                      )}
                      <div className="w-16 h-16 rounded-full overflow-hidden flex items-center justify-center border border-current/10 bg-black/15">
                        <PixelImage
                          filename={av.imageUrl}
                          alt={charLabel}
                          className="w-14 h-14 object-contain"
                        />
                      </div>
                      <span className="text-xs font-black truncate max-w-full">{charLabel}</span>
                    </button>
                  );
                })}
              </div>

              <div className="pt-3">
                <PushButton
                  variant="gold"
                  fullWidth
                  onClick={() => {
                    playTick();
                    setStep(2);
                  }}
                  icon={<ArrowLeft className="w-4 h-4" />}
                >
                  ادامه مرحله بعد
                </PushButton>
              </div>
            </div>
          )}

          {/* STEP 2: Strict Persian Names */}
          {step === 2 && (
            <div className="space-y-4">
              <div className="text-center">
                <div className="w-12 h-12 mx-auto rounded-2xl bg-[#354B40]/30 text-[#7FB69E] flex items-center justify-center border border-[#7FB69E]/30 mb-2">
                  <User className="w-6 h-6" />
                </div>
                <h3 className="font-bold text-base">نام و نام خانوادگی رسمی</h3>
                <p className="text-xs opacity-75 mt-1">
                  جهت صدور گواهینامه‌های رسمی معتبر انجمن علمی (فقط حروف فارسی)
                </p>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold mb-1 opacity-80">
                    نام (فارسی):
                  </label>
                  <input
                    type="text"
                    value={firstName}
                    onChange={(e) => {
                      setFirstName(e.target.value);
                      setNameError('');
                    }}
                    placeholder="مثال: امیرحسین"
                    className={`w-full px-3.5 py-2.5 rounded-xl border text-sm focus:outline-none transition-all ${
                      isNight
                        ? 'bg-[#101622] border-[#253247] text-[#F6F1E7] focus:border-[#D4AB58]'
                        : 'bg-[#FFFFFF] border-[#C8BFA8] text-[#14201B] focus:border-[#354B40]'
                    }`}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold mb-1 opacity-80">
                    نام خانوادگی (فارسی):
                  </label>
                  <input
                    type="text"
                    value={lastName}
                    onChange={(e) => {
                      setLastName(e.target.value);
                      setNameError('');
                    }}
                    placeholder="مثال: رضایی"
                    className={`w-full px-3.5 py-2.5 rounded-xl border text-sm focus:outline-none transition-all ${
                      isNight
                        ? 'bg-[#101622] border-[#253247] text-[#F6F1E7] focus:border-[#D4AB58]'
                        : 'bg-[#FFFFFF] border-[#C8BFA8] text-[#14201B] focus:border-[#354B40]'
                    }`}
                  />
                </div>
              </div>

              {nameError && (
                <div className="p-2.5 rounded-xl bg-[#E77F6E]/10 border border-[#E77F6E]/30 text-xs text-[#E77F6E]">
                  {nameError}
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <PushButton
                  variant="secondary"
                  onClick={() => {
                    playTick();
                    setStep(1);
                  }}
                  icon={<ArrowRight className="w-4 h-4" />}
                >
                  قبلی
                </PushButton>
                <PushButton
                  variant="gold"
                  fullWidth
                  onClick={handleNameNext}
                  disabled={!firstName.trim() || !lastName.trim()}
                  icon={<ArrowLeft className="w-4 h-4" />}
                >
                  تأیید و مرحله بعد
                </PushButton>
              </div>
            </div>
          )}

          {/* STEP 3: Student ID & Instant Cohort Recognition */}
          {step === 3 && (
            <div className="space-y-4">
              <div className="text-center">
                <div className="w-12 h-12 mx-auto rounded-2xl bg-amber-500/10 text-[#D4AB58] flex items-center justify-center border border-amber-500/30 mb-2">
                  <GraduationCap className="w-6 h-6" />
                </div>
                <h3 className="font-bold text-base">شماره دانشجویی و ورودی</h3>
                <p className="text-xs opacity-75 mt-1">
                  سال ورود شما از روی پیش‌شماره به طور خودکار استخراج می‌گردد.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1 opacity-80">
                  شماره دانشجویی (۱۰ رقمی):
                </label>
                <input
                  type="text"
                  value={studentId}
                  onChange={handleStudentIdChange}
                  placeholder="مثال: 4021202422"
                  maxLength={14}
                  className={`w-full px-3.5 py-2.5 rounded-xl border text-sm font-mono tracking-widest text-center focus:outline-none transition-all ${
                    isNight
                      ? 'bg-[#101622] border-[#253247] text-[#F6F1E7] focus:border-[#D4AB58]'
                      : 'bg-[#FFFFFF] border-[#C8BFA8] text-[#14201B] focus:border-[#354B40]'
                  }`}
                  dir="ltr"
                />
              </div>

              {detectedCohort && (
                <div className="p-3 rounded-2xl bg-gradient-to-r from-amber-500/20 via-yellow-500/20 to-amber-500/20 border-2 border-[#D4AB58] text-center space-y-1 shadow-[0_0_15px_rgba(212,171,88,0.25)] animate-fade-in">
                  <span className="text-base">🎓</span>
                  <div className="text-sm font-bold text-[#D4AB58]">
                    ورودی {detectedCohort} به صورت هوشمند شناسایی شد!
                  </div>
                  <p className="text-[11px] opacity-80">
                    دسترسی به گروه‌ها و رویدادهای مختص دانشجویان ورودی {detectedCohort} فعال می‌گردد.
                  </p>
                </div>
              )}

              {idError && (
                <div className="p-2.5 rounded-xl bg-[#E77F6E]/10 border border-[#E77F6E]/30 text-xs text-[#E77F6E]">
                  {idError}
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <PushButton
                  variant="secondary"
                  onClick={() => {
                    playTick();
                    setStep(2);
                  }}
                  icon={<ArrowRight className="w-4 h-4" />}
                >
                  قبلی
                </PushButton>
                <PushButton
                  variant="gold"
                  fullWidth
                  onClick={handleIdNext}
                  disabled={!studentId.trim()}
                  icon={<ArrowLeft className="w-4 h-4" />}
                >
                  مرحله آخر
                </PushButton>
              </div>
            </div>
          )}

          {/* STEP 4: Verified Telegram phone & Fanfare Celebration */}
          {step === 4 && (
            <div className="space-y-4 text-center">
              <div className="relative inline-block">
                <div className="w-24 h-24 mx-auto rounded-3xl bg-current/5 border border-current/10 flex items-center justify-center p-2">
                  <PixelImage
                    filename="06_char_victory.png"
                    alt="جشن موفقیت"
                    className="w-20 h-20 object-contain"
                  />
                </div>
                <div className="absolute -bottom-1 -left-1 bg-[#D4AB58] text-black p-1 rounded-full shadow">
                  <Sparkles className="w-4 h-4" />
                </div>
              </div>

              <div>
                <h3 className="font-bold text-base">تأیید شماره و جایزه خوش‌آمدگویی!</h3>
                <p className="text-xs opacity-75 mt-1">
                  اتصال شماره تلگرام برای دریافت اعلان‌های فوری رویدادها
                </p>
              </div>

              <div className="p-3.5 rounded-2xl bg-[#354B40] border border-[#7FB69E]/50 flex items-center gap-3 text-right text-[#F6F1E7]">
                <div className="w-10 h-10 rounded-xl bg-[#D4AB58]/20 flex items-center justify-center text-[#D4AB58] flex-shrink-0">
                  <Gift className="w-5 h-5 animate-bounce" />
                </div>
                <div>
                  <div className="font-bold text-xs text-[#D4AB58]">+۵ امتیاز هدیه خوش‌آمدگویی!</div>
                  <p className="text-[11px] text-[#E2ECE7]">
                    به محض اتمام ثبت‌نام، به امتیازات کاربری شما افزوده می‌شود.
                  </p>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-current/5 border border-current/10 text-right space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs opacity-75">شماره همراه تلگرام:</span>
                  <span className="text-xs font-bold text-[#D4AB58]">{phoneNumber}</span>
                </div>
                {!isPhoneVerified ? (
                  <button
                    onClick={handleVerifyTelegramPhone}
                    className="w-full py-2 px-3 rounded-xl bg-[#253247] hover:bg-[#2F3F59] text-xs font-bold text-[#F6F1E7] border border-[#354661] flex items-center justify-center gap-2 transition-all active:scale-95 cursor-pointer"
                  >
                    <Phone className="w-3.5 h-3.5 text-emerald-400" />
                    <span>اشتراک‌گذاری شماره از تلگرام (Verify Phone)</span>
                  </button>
                ) : (
                  <div className="flex items-center gap-1.5 text-xs text-emerald-400 font-bold bg-emerald-950/40 p-2 rounded-xl border border-emerald-800">
                    <Check className="w-4 h-4" />
                    <span>شماره تلگرام با موفقیت تأیید گردید.</span>
                  </div>
                )}
              </div>

              <div className="pt-2">
                <PushButton
                  variant="gold"
                  size="lg"
                  fullWidth
                  onClick={handleFinish}
                  icon={<Sparkles className="w-5 h-5" />}
                >
                  ورود به مینی‌اپ و دریافت ۵ امتیاز ✨
                </PushButton>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
