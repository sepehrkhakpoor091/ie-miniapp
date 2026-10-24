/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Pure Gamification Logic: Badges, Real Leaderboard, Lootbox Probability Engine, & Quests
 */

import {
  AdminStudentDossier,
  BadgeItem,
  CertificateInfo,
  CohortBattleStat,
  DiscountVoucher,
  LeaderboardStudent,
  LootboxConfig,
  LootboxPrizeItem,
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
    verificationHash: computeSignatureHash('BADGE:19_badge_trophy:4011234567'),
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
    verificationHash: computeSignatureHash('BADGE:20_badge_shield:4011234567'),
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
    verificationHash: computeSignatureHash('BADGE:22_badge_book:4011234567'),
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
    verificationHash: computeSignatureHash('BADGE:21_badge_medal:4011234567'),
    description: 'انتشار مقاله تحلیلی پیرامون کاربرد هوش مصنوعی در برنامه‌ریزی تولید در نشریه علمی دانشجویی.',
    nextTierRequirement: 'سردبیری ویژهنامه سالانه انجمن علمی مهندسی صنایع.',
  },
  {
    id: 'badge-crown',
    title: 'تاج نخبگان ورودی',
    subtitle: '۵ نفر اول ورودی',
    filename: '24_badge_crown.png',
    earnedDate: '۲۵ آبان ۱۴۰۴',
    tier: 'royal',
    isUnlocked: true,
    verificationHash: computeSignatureHash('BADGE:24_badge_crown:4011234567'),
    description: 'قرارگیری در جمع ۵ دانشجوی پرامتیاز و برتر در جدول رده‌بندی کل انجمن.',
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
    verificationHash: computeSignatureHash('BADGE:23_badge_diamond:4011234567'),
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
    verificationHash: computeSignatureHash('BADGE:25_rank_lvl1:4011234567'),
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
    verificationHash: computeSignatureHash('BADGE:26_rank_lvl2:4011234567'),
    description: 'کسب مهارت‌های پایه در برنامه‌ریزی، کنترل پروژه و مشارکت در بازدیدهای صنعتی.',
    nextTierRequirement: 'تکمیل شده ✓',
  },
  {
    id: 'rank-lvl3',
    title: 'سطح ۳ - مهندس آینده',
    subtitle: 'رتبه پیشرفته انجمن',
    filename: '27_rank_lvl3.png',
    earnedDate: '۱ آبان ۱۴۰۴',
    tier: 'gold',
    isUnlocked: true,
    verificationHash: computeSignatureHash('BADGE:27_rank_lvl3:4011234567'),
    description: 'تسلط بر ابزارهای نوین تحلیل داده و حضور مستمر در رویدادهای تخصصی دانشکده.',
    nextTierRequirement: 'کسب امتیاز بیشتر برای ارتقا به سطح ۴ (مشاور ارشد).',
  },
  {
    id: 'rank-lvl4',
    title: 'سطح ۴ - مشاور ارشد صنایع',
    subtitle: 'نیازمند ۳۰۰ امتیاز کل',
    filename: '28_rank_lvl4.png',
    earnedDate: 'قفل (در انتظار تکمیل شرایط)',
    tier: 'royal',
    isUnlocked: false,
    verificationHash: computeSignatureHash('BADGE:28_rank_lvl4:LOCKED'),
    description: 'بالاترین نشان افتخار دانشجویی انجمن علمی مهندسی صنایع با مزایای ویژه رایگان در تمام رویدادها.',
    nextTierRequirement: 'رسیدن به ۳۰۰ امتیاز کل و شرکت در کارگاه‌های تخصصی.',
  },
];

export const DEFAULT_CERTIFICATES: CertificateInfo[] = [
  {
    certificateId: generateCertificateCode('401', 'PMBOK-MSP', '4011234567'),
    studentName: 'علی محمدی',
    courseTitle: 'کارگاه تخصصی کنترل پروژه با MSP و استاندارد PMBOK',
    instructor: 'دکتر علی محمدی',
    issueDate: '۱۵ مهر ۱۴۰۴',
    grade: 'عالی (۹۸ از ۱۰۰)',
    isValid: true,
    hours: 16,
    signatureHash: computeSignatureHash('CERT:PMBOK-MSP:4011234567'),
  },
  {
    certificateId: generateCertificateCode('401', 'PYTHON-IE', '4011234567'),
    studentName: 'علی محمدی',
    courseTitle: 'بوت‌کمپ تحلیل داده‌های صنعتی با Python و Pandas',
    instructor: 'مهندس آرش شمس',
    issueDate: '۲۸ مهر ۱۴۰۴',
    grade: 'عالی (۹۵ از ۱۰۰)',
    isValid: true,
    hours: 24,
    signatureHash: computeSignatureHash('CERT:PYTHON-IE:4011234567'),
  },
];

export const INITIAL_POINT_TRANSACTIONS: PointTransaction[] = [
  {
    id: 'tx-1',
    title: 'تکمیل ثبت‌نام اولیه و احراز هویت دانشجویی',
    amount: 50,
    date: '۱ مهر ۱۴۰۴',
    category: 'onboarding',
    referenceCode: 'ONB-INIT',
  },
];

// Zero fake users! Only real registered students from the Telegram Bot database are shown.
export const INITIAL_LEADERBOARD_STUDENTS: LeaderboardStudent[] = [];

export const COHORT_FILTER_OPTIONS = [
  { id: 'all', label: 'همه ورودی‌ها' },
  { id: '۱۴۰۰', label: 'ورودی ۱۴۰۰' },
  { id: '۱۴۰۱', label: 'ورودی ۱۴۰۱' },
  { id: '۱۴۰۲', label: 'ورودی ۱۴۰۲' },
  { id: '۱۴۰۳', label: 'ورودی ۱۴۰۳' },
  { id: '۱۴۰۴', label: 'ورودی ۱۴۰۴' },
  { id: '۱۴۰۵', label: 'ورودی ۱۴۰۵' },
];

function normalizeCohortComparison(val: string): string {
  return (val || '')
    .trim()
    .replace(/0/g, '۰')
    .replace(/1/g, '۱')
    .replace(/2/g, '۲')
    .replace(/3/g, '۳')
    .replace(/4/g, '۴')
    .replace(/5/g, '۵')
    .replace(/6/g, '۶')
    .replace(/7/g, '۷')
    .replace(/8/g, '۸')
    .replace(/9/g, '۹');
}

/**
 * Dynamically builds the Leaderboard strictly from real registered students (`realStudents`)
 * plus the current authenticated user (`currentUser` if registered). Zero fake/mock users.
 */
export function getFilteredLeaderboard(
  cohortFilter: string,
  currentUser?: UserProfile,
  realStudents: AdminStudentDossier[] = []
): LeaderboardStudent[] {
  const safeReal = Array.isArray(realStudents) ? realStudents : [];
  const map = new Map<string, LeaderboardStudent>();

  for (const stu of safeReal) {
    if (!stu || !stu.studentId || !stu.studentId.trim()) continue;
    const key = stu.studentId.trim();
    const isMe = Boolean(
      currentUser &&
        currentUser.studentId &&
        currentUser.studentId.trim() === key
    );
    map.set(key, {
      id: stu.id || `stu-${key}`,
      rank: 0,
      fullName: stu.fullName || 'دانشجوی انجمن',
      studentId: key,
      cohortYear: normalizeCohortComparison(stu.cohortYear || '۱۴۰۲'),
      avatar: stu.avatar || '01_avatar_boy.png',
      score: Math.max(0, Number(stu.score) || 0),
      level: Math.max(1, Number(stu.level) || 1),
      badgesCount: Array.isArray(stu.badges) ? stu.badges.length : 1,
      isCurrentUser: isMe,
    });
  }

  if (
    currentUser &&
    currentUser.studentId &&
    currentUser.studentId.trim().length > 0 &&
    currentUser.fullName &&
    currentUser.fullName.trim().length > 0 &&
    currentUser.fullName !== 'دانشجوی مهندسی صنایع'
  ) {
    const myKey = currentUser.studentId.trim();
    map.set(myKey, {
      id: currentUser.id || `usr-${myKey}`,
      rank: 0,
      fullName: currentUser.fullName,
      studentId: myKey,
      cohortYear: normalizeCohortComparison(currentUser.cohortYear || '۱۴۰۲'),
      avatar: currentUser.avatar || '01_avatar_boy.png',
      score: Math.max(0, Number(currentUser.score) || 0),
      level: Math.max(1, Number(currentUser.level) || 1),
      badgesCount: Array.isArray(currentUser.badges) ? currentUser.badges.length : 1,
      isCurrentUser: true,
    });
  }

  const allReal = Array.from(map.values());
  const normalizedFilter = normalizeCohortComparison(cohortFilter);

  const filtered =
    !cohortFilter || cohortFilter === 'all' || cohortFilter === 'همه'
      ? allReal
      : allReal.filter(
          (student) => normalizeCohortComparison(student.cohortYear) === normalizedFilter
        );

  const sorted = [...filtered].sort((a, b) => b.score - a.score);
  return sorted.map((student, idx) => ({
    ...student,
    rank: idx + 1,
  }));
}

export function getCohortBattleStats(_currentUser?: UserProfile): CohortBattleStat[] {
  return [];
}

export const DEFAULT_LOOTBOX_CONFIG: LootboxConfig = {
  bronzeCost: 50,
  goldCost: 100,
  bronzePrizes: [
    {
      id: 'brz-discount-30',
      title: 'کد تخفیف ۳۰٪ کارگاه‌های انجمن صنایع',
      type: 'voucher',
      rewardType: 'discount',
      discountPercent: 30,
      maxDiscountTomans: 90000,
      chancePercent: 45,
    },
    {
      id: 'brz-points-20',
      title: '۲۰ امتیاز هدیه فعالیت علمی',
      type: 'points',
      rewardType: 'points',
      bonusPoints: 20,
      chancePercent: 35,
    },
    {
      id: 'brz-empty',
      title: 'پوچ (شانس مجدد در دوره بعد)',
      type: 'empty',
      rewardType: 'empty',
      chancePercent: 20,
    },
  ],
  goldPrizes: [
    {
      id: 'gld-discount-100',
      title: 'بلیط طلایی ۱۰۰٪ رایگان کارگاه تخصصی VIP',
      type: 'voucher',
      rewardType: 'discount',
      discountPercent: 100,
      maxDiscountTomans: 250000,
      chancePercent: 25,
    },
    {
      id: 'gld-discount-60',
      title: 'کد تخفیف ویژه ۶۰٪ صندوقچه طلایی',
      type: 'voucher',
      rewardType: 'discount',
      discountPercent: 60,
      maxDiscountTomans: 180000,
      chancePercent: 45,
    },
    {
      id: 'gld-points-50',
      title: '۵۰ امتیاز هدیه ویژه نخبگان',
      type: 'points',
      rewardType: 'points',
      bonusPoints: 50,
      chancePercent: 20,
    },
    {
      id: 'gld-empty',
      title: 'پوچ (بدون جایزه)',
      type: 'empty',
      rewardType: 'empty',
      chancePercent: 10,
    },
  ],
};

/**
 * Draws a prize strictly according to the Admin's configured win probabilities (`chancePercent`).
 */
export function drawPrizeByProbability(
  prizes: LootboxPrizeItem[],
  randValue = Math.random()
): LootboxPrizeItem {
  const safePrizes = Array.isArray(prizes) && prizes.length > 0 ? prizes : DEFAULT_LOOTBOX_CONFIG.bronzePrizes;
  const totalWeight = safePrizes.reduce(
    (sum, item) => sum + Math.max(0, Number(item.chancePercent) || 0),
    0
  );

  if (totalWeight <= 0) {
    return safePrizes[0];
  }

  const clampedRand = Math.max(0, Math.min(0.999999, randValue));
  let threshold = clampedRand * totalWeight;

  for (const prize of safePrizes) {
    const weight = Math.max(0, Number(prize.chancePercent) || 0);
    if (threshold < weight) {
      return prize;
    }
    threshold -= weight;
  }

  return safePrizes[safePrizes.length - 1];
}

/**
 * Lootbox Store Redemption Pure Logic with Anti-Tamper Integrity Verification
 * Supports both `(chestType, user, storedChecksum, deterministicSeed?, lootboxConfig?)`
 * and `(chestType, user, storedChecksum, lootboxConfig?)`.
 */
export interface LootboxRedeemResult {
  success: boolean;
  errorReason?: string;
  tamperDetected?: boolean;
  costPoints: number;
  prizeType?: 'voucher' | 'points' | 'empty';
  prizeTitle?: string;
  bonusPointsAwarded?: number;
  voucher?: DiscountVoucher;
}

export function redeemLootboxChest(
  chestType: 'bronze' | 'gold',
  user: Pick<UserProfile, 'score' | 'studentId' | 'level'>,
  storedChecksum: string | null,
  seedOrConfig?: number | LootboxConfig,
  explicitConfig?: LootboxConfig
): LootboxRedeemResult {
  const deterministicSeed = typeof seedOrConfig === 'number' ? seedOrConfig : undefined;
  const activeConfig =
    (typeof seedOrConfig === 'object' && seedOrConfig !== null
      ? seedOrConfig
      : explicitConfig) || DEFAULT_LOOTBOX_CONFIG;

  const costPoints =
    chestType === 'bronze'
      ? Number(activeConfig.bronzeCost) || 50
      : Number(activeConfig.goldCost) || 100;

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

  // 3. Draw prize based on Admin's configured probabilities
  const rand = deterministicSeed !== undefined ? deterministicSeed : Math.random();
  const prizePool =
    chestType === 'bronze' ? activeConfig.bronzePrizes : activeConfig.goldPrizes;
  const drawnPrize = drawPrizeByProbability(prizePool, rand);
  const rawKind = drawnPrize.rewardType || drawnPrize.type || 'voucher';

  if (rawKind === 'empty') {
    return {
      success: true,
      costPoints,
      prizeType: 'empty',
      prizeTitle: drawnPrize.title || 'پوچ (بدون جایزه)',
    };
  }

  if (rawKind === 'points') {
    const bonus = Math.max(1, Number(drawnPrize.bonusPoints) || 20);
    return {
      success: true,
      costPoints,
      prizeType: 'points',
      prizeTitle: drawnPrize.title || `${bonus.toLocaleString('fa-IR')} امتیاز هدیه`,
      bonusPointsAwarded: bonus,
    };
  }

  const cohortPrefix = (user.studentId || '').substring(0, 3) || '401';
  const suffix = Math.floor(1000 + rand * 8999);
  const code = `OFF-IE${cohortPrefix}-${suffix}`;

  // Parse percent from title if not explicitly set
  const matchedDigits = (drawnPrize.title || '')
    .replace(/[۰-۹]/g, (d) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d)))
    .match(/(\d+)\s*[%٪]/);
  const discountPercent =
    Number(drawnPrize.discountPercent) ||
    (matchedDigits ? Math.min(100, Math.max(5, Number(matchedDigits[1]))) : chestType === 'gold' ? 60 : 30);
  const maxDiscountTomans =
    Number(drawnPrize.maxDiscountTomans) ||
    (discountPercent === 100 ? 250000 : chestType === 'gold' ? 180000 : 100000);
  const title =
    drawnPrize.title ||
    `کد تخفیف ${discountPercent.toLocaleString('fa-IR')}٪ کارگاه‌های انجمن صنایع`;

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
    prizeType: 'voucher',
    prizeTitle: title,
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
      ? computeSignatureHash(`BADGE:${file}:${user.studentId || '4011234567'}`)
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

