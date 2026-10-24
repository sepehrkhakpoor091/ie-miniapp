/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Pure Gamification Logic: Badges, Leaderboard, Cohort Battle, Lootbox Store, & Quests
 */

import {
  BadgeItem,
  CertificateInfo,
  CohortBattleStat,
  DiscountVoucher,
  LeaderboardStudent,
  PointTransaction,
  TicketRecord,
  UserProfile,
  WeeklyQuest,
} from '../types';
import { computeSignatureHash, generateCertificateCode, verifyStateIntegrity } from './security';

export const SHOWCASE_BADGES: BadgeItem[] = [
  {
    id: 'badge-trophy',
    title: 'قهرمان مسابقات',
    subtitle: 'رتبه برتر چالش بهینه‌سازی',
    filename: '19_badge_trophy.png',
    earnedDate: '۱۴ آبان ۱۴۰۴',
    tier: 'gold',
    isUnlocked: true,
    verificationHash: computeSignatureHash('BADGE:19_badge_trophy:4021202422'),
    description: 'اعطا شده به پاس کسب مقام اول تیمی در ماراتن مدل‌سازی ریاضی و زنجیره تامین دانشکده مهندسی صنایع.',
    nextTierRequirement: 'کسب ۲ مقام دیگر در مسابقات ملی مهندسی صنایع برای ارتقا به کاپ الماس.',
  },
  {
    id: 'badge-shield',
    title: 'سپر افتخار انجمن',
    subtitle: 'عضو فعال کمیته اجرایی',
    filename: '20_badge_shield.png',
    earnedDate: '۲ مهر ۱۴۰۴',
    tier: 'cyan',
    isUnlocked: true,
    verificationHash: computeSignatureHash('BADGE:20_badge_shield:4021202422'),
    description: 'نشان رسمی بازرسان و اعضای پرتلاش برگزاری رویدادهای علمی و کارگاه‌های تخصصی انجمن صنایع.',
    nextTierRequirement: 'همکاری در برگزاری ۵ رویداد بزرگ دانشکده برای دریافت سپر طلایی.',
  },
  {
    id: 'badge-book',
    title: 'پژوهشگر برتر',
    subtitle: 'تکمیل کارگاه‌های علم داده',
    filename: '22_badge_book.png',
    earnedDate: '۲۲ مهر ۱۴۰۴',
    tier: 'emerald',
    isUnlocked: true,
    verificationHash: computeSignatureHash('BADGE:22_badge_book:4021202422'),
    description: 'تکمیل موفقیت‌آمیز بیش از ۴۰ ساعت دوره آموزشی تخصصی پایتون، شبیه‌سازی و تحلیل سیستم‌ها.',
    nextTierRequirement: 'چاپ ۱ مقاله علمی-ترویجی در نشریه تخصصی مهندسی صنایع.',
  },
  {
    id: 'badge-medal',
    title: 'مدال طلای نشریه',
    subtitle: 'نویسنده برگزیده فصلنامه',
    filename: '21_badge_medal.png',
    earnedDate: '۱۰ آبان ۱۴۰۴',
    tier: 'gold',
    isUnlocked: true,
    verificationHash: computeSignatureHash('BADGE:21_badge_medal:4021202422'),
    description: 'انتشار مقاله تحلیلی پیرامون کاربرد هوش مصنوعی در برنامه‌ریزی تولید در نشریه علمی دانشجویی.',
    nextTierRequirement: 'سردبیری ویژهنامه سالانه انجمن علمی مهندسی صنایع.',
  },
  {
    id: 'badge-crown',
    title: 'تاج نخبگان ورودی',
    subtitle: '۵ نفر اول ورودی ۱۴۰۲',
    filename: '24_badge_crown.png',
    earnedDate: '۲۵ آبان ۱۴۰۴',
    tier: 'royal',
    isUnlocked: true,
    verificationHash: computeSignatureHash('BADGE:24_badge_crown:4021202422'),
    description: 'قرارگیری در جمع ۵ دانشجوی پرامتیاز و برتر ورودی ۱۴۰۲ در جدول رده‌بندی کل انجمن.',
    nextTierRequirement: 'حفظ جایگاه در سکوی ۳ نفر اول تا پایان نیم‌سال تحصیلی.',
  },
];

export const EXTENDED_BADGES: BadgeItem[] = [
  ...SHOWCASE_BADGES,
  {
    id: 'badge-diamond',
    title: 'نگین الماس صنایع',
    subtitle: 'ذخیره بیش از ۲۵۰ امتیاز',
    filename: '23_badge_diamond.png',
    earnedDate: '۲۶ آبان ۱۴۰۴',
    tier: 'cyan',
    isUnlocked: true,
    verificationHash: computeSignatureHash('BADGE:23_badge_diamond:4021202422'),
    description: 'عبور از مرز ۲۵۰ امتیاز خالص در فعالیت‌های علمی، کارگاه‌ها و ماموریت‌های هفتگی.',
    nextTierRequirement: 'رسیدن به مرز ۵۰۰ امتیاز برای دریافت الماس درخشان.',
  },
  {
    id: 'rank-lvl1',
    title: 'سطح ۱ - نوآموز صنایع',
    subtitle: 'شروع مسیر مهندسی سیستم‌ها',
    filename: '25_rank_lvl1.png',
    earnedDate: '۱ مهر ۱۴۰۲',
    tier: 'emerald',
    isUnlocked: true,
    verificationHash: computeSignatureHash('BADGE:25_rank_lvl1:4021202422'),
    description: 'ورود رسمی به خانواده بزرگ انجمن علمی مهندسی صنایع و احراز هویت تلگرامی.',
    nextTierRequirement: 'تکمیل شده ✓',
  },
  {
    id: 'rank-lvl2',
    title: 'سطح ۲ - تحلیلگر سیستم',
    subtitle: 'عبور از ۱۰۰ امتیاز فعالیت',
    filename: '26_rank_lvl2.png',
    earnedDate: '۱۵ اردیبهشت ۱۴۰۳',
    tier: 'cyan',
    isUnlocked: true,
    verificationHash: computeSignatureHash('BADGE:26_rank_lvl2:4021202422'),
    description: 'کسب مهارت‌های پایه در برنامه‌ریزی، کنترل پروژه و مشارکت در بازدیدهای صنعتی.',
    nextTierRequirement: 'تکمیل شده ✓',
  },
  {
    id: 'rank-lvl3',
    title: 'سطح ۳ - مهندس آینده',
    subtitle: 'رتبه فعلی شما (۲۸۰ امتیاز)',
    filename: '27_rank_lvl3.png',
    earnedDate: '۱ آبان ۱۴۰۴',
    tier: 'gold',
    isUnlocked: true,
    verificationHash: computeSignatureHash('BADGE:27_rank_lvl3:4021202422'),
    description: 'تسلط بر ابزارهای نوین تحلیل داده و حضور مستمر در رویدادهای تخصصی دانشکده.',
    nextTierRequirement: 'کسب ۷۰ امتیاز دیگر برای ارتقا به سطح ۴ (مشاور ارشد).',
  },
  {
    id: 'rank-lvl4',
    title: 'سطح ۴ - مشاور ارشد صنایع',
    subtitle: 'نیازمند ۳۵۰ امتیاز کل',
    filename: '28_rank_lvl4.png',
    earnedDate: 'قفل (۷۰ امتیاز باقی‌مانده)',
    tier: 'royal',
    isUnlocked: false,
    verificationHash: computeSignatureHash('BADGE:28_rank_lvl4:LOCKED'),
    description: 'بالاترین نشان افتخار دانشجویی انجمن علمی مهندسی صنایع با مزایای ویژه رایگان در تمام رویدادها.',
    nextTierRequirement: 'رسیدن به ۳۵۰ امتیاز کل و شرکت در حداقل ۱۵ رویداد.',
  },
];

export const DEFAULT_CERTIFICATES: CertificateInfo[] = [
  {
    certificateId: generateCertificateCode('402', 'PMBOK-MSP', '4021202422'),
    studentName: 'امیرحسین رضایی',
    courseTitle: 'کارگاه تخصصی کنترل پروژه با MSP و استاندارد PMBOK',
    instructor: 'دکتر علی محمدی',
    issueDate: '۱۵ مهر ۱۴۰۴',
    grade: 'عالی (۹۸ از ۱۰۰)',
    isValid: true,
    hours: 16,
    signatureHash: computeSignatureHash('CERT:PMBOK-MSP:4021202422'),
  },
  {
    certificateId: generateCertificateCode('402', 'PYTHON-IE', '4021202422'),
    studentName: 'امیرحسین رضایی',
    courseTitle: 'بوت‌کمپ تحلیل داده‌های صنعتی با Python و Pandas',
    instructor: 'مهندس آرش شمس',
    issueDate: '۲۸ مهر ۱۴۰۴',
    grade: 'عالی (۹۵ از ۱۰۰)',
    isValid: true,
    hours: 24,
    signatureHash: computeSignatureHash('CERT:PYTHON-IE:4021202422'),
  },
  {
    certificateId: generateCertificateCode('402', 'SUPPLY-OPT', '4021202422'),
    studentName: 'امیرحسین رضایی',
    courseTitle: 'سمینار تخصصی بهینه‌سازی زنجیره تامین و لجستیک هوشمند',
    instructor: 'دکتر محمدرضا رضایی',
    issueDate: '۵ آبان ۱۴۰۴',
    grade: 'گواهی حضور کامل',
    isValid: true,
    hours: 8,
    signatureHash: computeSignatureHash('CERT:SUPPLY-OPT:4021202422'),
  },
  {
    certificateId: generateCertificateCode('402', 'SIX-SIGMA', '4021202422'),
    studentName: 'امیرحسین رضایی',
    courseTitle: 'دوره کمربند سبز شش سیگما (Lean Six Sigma Green Belt)',
    instructor: 'دکتر سارا شمسایی',
    issueDate: '۱۲ آبان ۱۴۰۴',
    grade: 'عالی (۹۶ از ۱۰۰)',
    isValid: true,
    hours: 20,
    signatureHash: computeSignatureHash('CERT:SIX-SIGMA:4021202422'),
  },
  {
    certificateId: generateCertificateCode('402', 'BI-DASH', '4021202422'),
    studentName: 'امیرحسین رضایی',
    courseTitle: 'کارگاه طراحی داشبوردهای مدیریتی با Power BI',
    instructor: 'مهندس کیانوش فرهمند',
    issueDate: '۲۰ آبان ۱۴۰۴',
    grade: 'عالی (۱۰۰ از ۱۰۰)',
    isValid: true,
    hours: 12,
    signatureHash: computeSignatureHash('CERT:BI-DASH:4021202422'),
  },
];

export const INITIAL_POINT_TRANSACTIONS: PointTransaction[] = [
  {
    id: 'tx-1',
    title: 'تکمیل ثبت‌نام اولیه و احراز هویت دانشجویی',
    amount: 50,
    date: '۱ مهر ۱۴۰۴',
    category: 'onboarding',
    referenceCode: 'ONB-402120',
  },
  {
    id: 'tx-2',
    title: 'شرکت در بوت‌کمپ تحلیل داده با پایتون',
    amount: 60,
    date: '۲۸ مهر ۱۴۰۴',
    category: 'event',
    referenceCode: 'EV-PY-882',
  },
  {
    id: 'tx-3',
    title: 'کسب رتبه اول مسابقه بهینه‌سازی زنجیره تامین',
    amount: 100,
    date: '۱۴ آبان ۱۴۰۴',
    category: 'quest',
    referenceCode: 'QST-HACK-01',
  },
  {
    id: 'tx-4',
    title: 'استفاده از تخفیف امتیازی کارگاه Power BI',
    amount: -20,
    date: '۱۸ آبان ۱۴۰۴',
    category: 'discount',
    referenceCode: 'DSC-BI-100K',
  },
  {
    id: 'tx-5',
    title: 'انتشار مقاله در نشریه علمی مهندسی صنایع',
    amount: 90,
    date: '۲۲ آبان ۱۴۰۴',
    category: 'quest',
    referenceCode: 'JRN-IE-402',
  },
];

export const INITIAL_LEADERBOARD_STUDENTS: LeaderboardStudent[] = [
  {
    id: 'stu-1',
    rank: 1,
    fullName: 'پرنیا کریمی',
    studentId: '4021104419',
    cohortYear: '۱۴۰۲',
    avatar: '02_avatar_girl.png',
    score: 420,
    level: 4,
    badgesCount: 9,
  },
  {
    id: 'stu-2',
    rank: 2,
    fullName: 'کیانوش نادری',
    studentId: '4011208831',
    cohortYear: '۱۴۰۱',
    avatar: '01_avatar_boy.png',
    score: 385,
    level: 4,
    badgesCount: 8,
  },
  {
    id: 'stu-3',
    rank: 3,
    fullName: 'نگین محمدپور',
    studentId: '4021209912',
    cohortYear: '۱۴۰۲',
    avatar: '02_avatar_girl.png',
    score: 340,
    level: 3,
    badgesCount: 7,
  },
  {
    id: 'stu-4',
    rank: 4,
    fullName: 'سهراب احمدی',
    studentId: '4001103321',
    cohortYear: '۱۴۰۰',
    avatar: '01_avatar_boy.png',
    score: 315,
    level: 3,
    badgesCount: 7,
  },
  {
    id: 'stu-5',
    rank: 5,
    fullName: 'آیدا رحیمی',
    studentId: '4021205541',
    cohortYear: '۱۴۰۲',
    avatar: '02_avatar_girl.png',
    score: 295,
    level: 3,
    badgesCount: 6,
  },
  {
    id: 'usr-4021202422',
    rank: 6,
    fullName: 'امیرحسین رضایی',
    studentId: '4021202422',
    cohortYear: '۱۴۰۲',
    avatar: '01_avatar_boy.png',
    score: 280,
    level: 3,
    badgesCount: 6,
    isCurrentUser: true,
  },
  {
    id: 'stu-7',
    rank: 7,
    fullName: 'مهدی سلطانی',
    studentId: '4031201189',
    cohortYear: '۱۴۰۳',
    avatar: '01_avatar_boy.png',
    score: 255,
    level: 3,
    badgesCount: 5,
  },
  {
    id: 'stu-8',
    rank: 8,
    fullName: 'زهرا موسوی',
    studentId: '4011107742',
    cohortYear: '۱۴۰۱',
    avatar: '02_avatar_girl.png',
    score: 240,
    level: 2,
    badgesCount: 5,
  },
  {
    id: 'stu-9',
    rank: 9,
    fullName: 'عرفان جلالی',
    studentId: '4031106612',
    cohortYear: '۱۴۰۳',
    avatar: '01_avatar_boy.png',
    score: 210,
    level: 2,
    badgesCount: 4,
  },
  {
    id: 'stu-10',
    rank: 10,
    fullName: 'سارا توکلی',
    studentId: '4041203390',
    cohortYear: '۱۴۰۴',
    avatar: '02_avatar_girl.png',
    score: 185,
    level: 2,
    badgesCount: 4,
  },
  {
    id: 'stu-11',
    rank: 11,
    fullName: 'آرمان حسینی',
    studentId: '4051102218',
    cohortYear: '۱۴۰۵',
    avatar: '01_avatar_boy.png',
    score: 140,
    level: 2,
    badgesCount: 3,
  },
];

export const COHORT_FILTER_OPTIONS = [
  { id: 'all', label: 'همه ورودی‌ها' },
  { id: '۱۴۰۰', label: 'ورودی ۱۴۰۰' },
  { id: '۱۴۰۱', label: 'ورودی ۱۴۰۱' },
  { id: '۱۴۰۲', label: 'ورودی ۱۴۰۲' },
  { id: '۱۴۰۳', label: 'ورودی ۱۴۰۳' },
  { id: '۱۴۰۴', label: 'ورودی ۱۴۰۴' },
  { id: '۱۴۰۵', label: 'ورودی ۱۴۰۵' },
];

/**
 * Dynamically synchronizes current user's live profile into the leaderboard,
 * filters by cohort year, sorts descending by score, and assigns 1-based ranks.
 */
export function getFilteredLeaderboard(
  cohortFilter: string,
  currentUser: UserProfile
): LeaderboardStudent[] {
  const merged = INITIAL_LEADERBOARD_STUDENTS.map((s) =>
    s.isCurrentUser
      ? {
          ...s,
          fullName: currentUser.fullName,
          studentId: currentUser.studentId,
          cohortYear: currentUser.cohortYear,
          avatar: currentUser.avatar,
          score: currentUser.score,
          level: currentUser.level,
        }
      : s
  );

  const filtered =
    cohortFilter === 'all'
      ? merged
      : merged.filter((student) => student.cohortYear === cohortFilter);

  const sorted = [...filtered].sort((a, b) => b.score - a.score);
  return sorted.map((student, idx) => ({
    ...student,
    rank: idx + 1,
  }));
}

/**
 * Computes Inter-Cohort Battle Radar statistics
 */
export function getCohortBattleStats(currentUser: UserProfile): CohortBattleStat[] {
  const baseStats: CohortBattleStat[] = [
    {
      cohortYear: '۱۴۰۲',
      label: 'ورودی ۱۴۰۲',
      totalPoints: 4570 + currentUser.score,
      studentsCount: 48,
      colorClass: 'from-[#D4AB58] to-[#E8C779]',
    },
    {
      cohortYear: '۱۴۰۱',
      label: 'ورودی ۱۴۰۱',
      totalPoints: 4120,
      studentsCount: 44,
      colorClass: 'from-[#7FB69E] to-[#9CD4BC]',
    },
    {
      cohortYear: '۱۴۰۳',
      label: 'ورودی ۱۴۰۳',
      totalPoints: 3490,
      studentsCount: 52,
      colorClass: 'from-[#91B5BE] to-[#B4D8E1]',
    },
    {
      cohortYear: '۱۴۰۰',
      label: 'ورودی ۱۴۰۰',
      totalPoints: 2890,
      studentsCount: 36,
      colorClass: 'from-[#E77F6E] to-[#F3A193]',
    },
    {
      cohortYear: '۱۴۰۴',
      label: 'ورودی ۱۴۰۴',
      totalPoints: 2150,
      studentsCount: 58,
      colorClass: 'from-[#A594F9] to-[#C4B8FF]',
    },
  ];

  return baseStats.sort((a, b) => b.totalPoints - a.totalPoints);
}

/**
 * Lootbox Store Redemption Pure Logic with Anti-Tamper Integrity Verification
 */
export interface LootboxRedeemResult {
  success: boolean;
  errorReason?: string;
  tamperDetected?: boolean;
  costPoints: number;
  voucher?: DiscountVoucher;
}

export function redeemLootboxChest(
  chestType: 'bronze' | 'gold',
  user: Pick<UserProfile, 'score' | 'studentId' | 'level'>,
  storedChecksum: string | null,
  deterministicSeed?: number
): LootboxRedeemResult {
  const costPoints = chestType === 'bronze' ? 50 : 100;

  // 1. Verify anti-tamper state integrity first!
  if (!verifyStateIntegrity(user, storedChecksum)) {
    return {
      success: false,
      tamperDetected: true,
      costPoints: 0,
      errorReason:
        '🚨 هشدار امنیتی ضد تقلب: دستکاری غیرمجاز امتیاز در حافظه مرورگر شناسایی شد! امتیاز به مقدار تاییدشده بازنشانی گردید.',
    };
  }

  // 2. Check sufficient points
  if (user.score < costPoints) {
    return {
      success: false,
      costPoints: 0,
      errorReason: `امتیاز شما کافی نیست! برای باز کردن این صندوقچه به ${costPoints.toLocaleString('fa-IR')} امتیاز نیاز دارید.`,
    };
  }

  // 3. Issue signed voucher
  const rand = deterministicSeed !== undefined ? deterministicSeed : Math.random();
  const cohortPrefix = user.studentId.substring(0, 3) || '402';
  const suffix = Math.floor(1000 + rand * 8999);
  const code = `OFF-IE${cohortPrefix}-${suffix}`;

  let discountPercent = 30;
  let maxDiscountTomans = 100000;
  let title = 'کد تخفیف ۳۰٪ کارگاه‌های تخصصی';

  if (chestType === 'bronze') {
    discountPercent = rand > 0.5 ? 40 : 25;
    maxDiscountTomans = discountPercent === 40 ? 120000 : 80000;
    title = `کد تخفیف ${discountPercent.toLocaleString('fa-IR')}٪ کارگاه‌های انجمن صنایع`;
  } else {
    discountPercent = rand > 0.65 ? 100 : rand > 0.3 ? 75 : 50;
    maxDiscountTomans = discountPercent === 100 ? 250000 : 180000;
    title =
      discountPercent === 100
        ? 'بلیط طلایی ۱۰۰٪ رایگان کارگاه یا بازدید علمی VIP'
        : `کد تخفیف ویژه ${discountPercent.toLocaleString('fa-IR')}٪ صندوقچه طلایی`;
  }

  const signatureHash = computeSignatureHash(`VOUCHER|${code}|${discountPercent}|${user.studentId}`);

  const voucher: DiscountVoucher = {
    id: `vch-${Date.now()}-${suffix}`,
    code,
    title,
    discountPercent,
    maxDiscountTomans,
    chestType,
    issuedAt: new Date().toLocaleDateString('fa-IR'),
    isUsed: false,
    signatureHash,
  };

  return {
    success: true,
    costPoints,
    voucher,
  };
}

export const INITIAL_WEEKLY_QUESTS: WeeklyQuest[] = [
  {
    id: 'qst-onboarding',
    title: 'تکمیل ثبت‌نام اولیه و احراز هویت',
    description: 'تایید شماره دانشجویی و انتخاب آواتار اختصاصی در پروفایل',
    rewardPoints: 50,
    progress: 1,
    maxProgress: 1,
    isClaimed: true,
  },
  {
    id: 'qst-workshops-2',
    title: 'شرکت در ۲ کارگاه تخصصی این ماه',
    description: 'ثبت‌نام و حضور در کارگاه‌های پایتون، کنترل پروژه یا شبیه‌سازی',
    rewardPoints: 40,
    progress: 2,
    maxProgress: 2,
    isClaimed: false,
  },
  {
    id: 'qst-journal-article',
    title: 'ارسال یادداشت یا مقاله به نشریه صنایع',
    description: 'ارسال فایل مقاله علمی-ترویجی به کمیته نشریات انجمن',
    rewardPoints: 100,
    progress: 1,
    maxProgress: 1,
    isClaimed: false,
  },
  {
    id: 'qst-invite-cohort',
    title: 'معرفی ۳ هم‌ورودی به ربات تلگرام انجمن',
    description: 'اشتراک‌گذاری لینک دعوت اختصاصی با دانشجویان مهندسی صنایع',
    rewardPoints: 30,
    progress: 2,
    maxProgress: 3,
    isClaimed: false,
  },
];

export interface DynamicLevelResult {
  level: 1 | 2 | 3 | 4;
  rankTitle: string;
  badgeIcon: string;
  nextLevelAt: number;
  currentLevelMin: number;
  progressPercent: number;
}

/**
 * Real Dynamic Level & Rank Calculator based on student score:
 * - 0 to 49 points: Level 1 -> 'سطح ۱ - دانشجوی نوپا' (25_rank_lvl1.png)
 * - 50 to 149 points: Level 2 -> 'سطح ۲ - تحلیلگر سیستم' (26_rank_lvl2.png)
 * - 150 to 299 points: Level 3 -> 'سطح ۳ - مهندس آینده' (27_rank_lvl3.png)
 * - 300+ points: Level 4 -> 'سطح ۴ - نخبه انجمن صنایع' (28_rank_lvl4.png)
 */
export function calculateLevelFromScore(rawScore: number): DynamicLevelResult {
  const score = Math.max(0, Math.floor(Number(rawScore) || 0));

  if (score < 50) {
    const progressPercent = Math.min(100, Math.round((score / 50) * 100));
    return {
      level: 1,
      rankTitle: 'سطح ۱ - دانشجوی نوپا',
      badgeIcon: '25_rank_lvl1.png',
      nextLevelAt: 50,
      currentLevelMin: 0,
      progressPercent,
    };
  }

  if (score < 150) {
    const progressPercent = Math.min(100, Math.round(((score - 50) / 100) * 100));
    return {
      level: 2,
      rankTitle: 'سطح ۲ - تحلیلگر سیستم',
      badgeIcon: '26_rank_lvl2.png',
      nextLevelAt: 150,
      currentLevelMin: 50,
      progressPercent,
    };
  }

  if (score < 300) {
    const progressPercent = Math.min(100, Math.round(((score - 150) / 150) * 100));
    return {
      level: 3,
      rankTitle: 'سطح ۳ - مهندس آینده',
      badgeIcon: '27_rank_lvl3.png',
      nextLevelAt: 300,
      currentLevelMin: 150,
      progressPercent,
    };
  }

  const progressPercent = Math.min(100, Math.round(((score - 300) / 200) * 100));
  return {
    level: 4,
    rankTitle: 'سطح ۴ - نخبه انجمن صنایع',
    badgeIcon: '28_rank_lvl4.png',
    nextLevelAt: 500,
    currentLevelMin: 300,
    progressPercent,
  };
}

/**
 * Evaluates dynamic badge unlock status based on real student progress:
 * - 20_badge_shield.png ('سپر هویت تاییدشده'): Unlocks when Onboarding is completed (studentId valid)
 * - 22_badge_book.png ('پیشگام آموزش'): Unlocks when student registers for their 1st event/workshop
 * - 21_badge_medal.png ('مدال مشارکت فعال'): Unlocks when student claims 1 Weekly Quest or updates Curriculum Chart
 * - 23_badge_diamond.png ('الماس امتیاز'): Unlocks when score >= 100
 * - 19_badge_trophy.png ('جام قهرمانی کارگاه‌ها'): Unlocks when registered for >= 3 events or checked in to >= 1 event
 * - 24_badge_crown.png ('تاج نخبه صنایع'): Unlocks when score >= 300 (Level 4)
 */
export function evaluateDynamicBadges(
  baseCatalog: BadgeItem[],
  user: UserProfile,
  userTickets: TicketRecord[] = [],
  weeklyQuests: WeeklyQuest[] = [],
  hasCurriculumProgress = false
): BadgeItem[] {
  const safeTickets = Array.isArray(userTickets) ? userTickets : [];
  const safeQuests = Array.isArray(weeklyQuests) ? weeklyQuests : [];
  const userGrantedBadges = new Set(Array.isArray(user.badges) ? user.badges : []);
  const score = Math.max(0, Number(user.score) || 0);

  const isOnboarded =
    Boolean(user.onboardingCompleted) ||
    (Boolean(user.studentId && user.studentId.trim().length >= 8) &&
      user.kycStatus === 'verified');
  const hasRegisteredWorkshop = safeTickets.length >= 1;
  const hasCheckedInEvent = safeTickets.some((t) => Boolean(t.checkedIn));
  const hasThreeWorkshops = safeTickets.length >= 3 || hasCheckedInEvent;
  const hasClaimedQuest = safeQuests.some((q) => Boolean(q.isClaimed));
  const hasActiveParticipation = hasClaimedQuest || hasCurriculumProgress || score >= 50;

  return (Array.isArray(baseCatalog) ? baseCatalog : EXTENDED_BADGES).map((badge) => {
    const file = badge.filename;
    const explicitlyGranted =
      userGrantedBadges.has(file) || userGrantedBadges.has(badge.id);

    let unlocked = explicitlyGranted;
    let nextReq = badge.nextTierRequirement;

    if (file === '20_badge_shield.png') {
      unlocked = unlocked || isOnboarded;
      nextReq = unlocked
        ? 'تکمیل شده ✓ (هویت دانشجویی تایید شد)'
        : 'تکمیل فرم ثبت‌نام اولیه و تایید شماره دانشجویی در سامانه.';
    } else if (file === '22_badge_book.png' || file === '20_badge_chart.png') {
      unlocked = unlocked || hasRegisteredWorkshop || score >= 150;
      nextReq = unlocked
        ? 'تکمیل شده ✓ (ثبت‌نام در کارگاه تخصصی)'
        : 'ثبت‌نام در اولین کارگاه یا رویداد علمی انجمن مهندسی صنایع.';
    } else if (file === '21_badge_medal.png' || file === '21_badge_code.png') {
      unlocked = unlocked || hasActiveParticipation;
      nextReq = unlocked
        ? 'تکمیل شده ✓ (مشارکت فعال در چارت درسی / ماموریت هفتگی)'
        : 'تکمیل حداقل ۱ ماموریت هفتگی یا بروزرسانی چارت درسی ۱۴۲ واحدی.';
    } else if (file === '23_badge_diamond.png') {
      unlocked = unlocked || score >= 100;
      nextReq = unlocked
        ? 'تکمیل شده ✓ (عبور از مرز ۱۰۰ امتیاز الماس)'
        : `کسب ${(100 - score).toLocaleString('fa-IR')} امتیاز دیگر برای رسیدن به ۱۰۰ الماس.`;
    } else if (file === '19_badge_trophy.png' || file === '19_badge_Gear.png') {
      unlocked = unlocked || hasThreeWorkshops || score >= 200;
      nextReq = unlocked
        ? 'تکمیل شده ✓ (حضور تاییدشده در کارگاه‌های انجمن)'
        : 'ثبت‌نام در ۳ رویداد یا اسکن بارکد حضور در حداقل ۱ کارگاه حضوری.';
    } else if (file === '24_badge_crown.png' || file === '24_badge_trophy.png') {
      unlocked = unlocked || score >= 300;
      nextReq = unlocked
        ? 'تکمیل شده ✓ (عضو تالار نخبگان مهندسی صنایع)'
        : `کسب ${Math.max(0, 300 - score).toLocaleString('fa-IR')} امتیاز دیگر برای رسیدن به سطح ۴ (۳۰۰ امتیاز).`;
    } else if (file === '25_rank_lvl1.png') {
      unlocked = true;
    } else if (file === '26_rank_lvl2.png') {
      unlocked = score >= 50;
    } else if (file === '27_rank_lvl3.png') {
      unlocked = score >= 150;
    } else if (file === '28_rank_lvl4.png') {
      unlocked = score >= 300;
    } else {
      unlocked = Boolean(badge.isUnlocked || explicitlyGranted);
    }

    const verificationHash = unlocked
      ? computeSignatureHash(`BADGE:${file}:${user.studentId || '4021202422'}`)
      : computeSignatureHash(`BADGE:${file}:LOCKED`);

    return {
      ...badge,
      isUnlocked: unlocked,
      earnedDate: unlocked
        ? badge.earnedDate.startsWith('قفل')
          ? 'فعال‌شده در سامانه'
          : badge.earnedDate
        : 'قفل (در انتظار تکمیل شرایط)',
      nextTierRequirement: nextReq,
      verificationHash,
    };
  });
}

