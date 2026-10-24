/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Pure Logic for Events, Pricing, Points Discounts, and Signed QR Tickets
 */

import { EventCategory, EventItem, EventSortOption } from '../types';
import { computeSignatureHash } from './security';

export const EVENTS_DATA: EventItem[] = [
  {
    id: 'ev-python-data',
    title: 'کارگاه تحلیل داده با پایتون',
    category: 'workshop',
    categoryLabel: 'کارگاه',
    date: '۲۵ آبان ۱۴۰۴',
    time: '۱۴:۰۰ الی ۱۸:۰۰',
    location: 'سایت تخصصی دانشکده مهندسی صنایع',
    capacityRemaining: 30,
    capacityTotal: 40,
    rating: 4.8,
    ratingCount: 84,
    imageFilename: '14_ev_workshop.png',
    basePrice: 150000, // ۱۵۰ هزار تومان
    rewardPoints: 20,
    instructor: 'مهندس آرش شمس (پژوهشگر ارشد علم داده)',
    syllabus: [
      'اصول کتابخانه‌های NumPy و Pandas در صنایع',
      'تحلیل آماری داده‌های خط تولید با Seaborn',
      'پیش‌بینی تقاضا با رگرسیون و Scikit-Learn',
      'پیاده‌سازی داشبورد داده‌محور با Streamlit',
    ],
  },
  {
    id: 'ev-tech-park-visit',
    title: 'بازدید علمی از پارک علم و فناوری',
    category: 'visit',
    categoryLabel: 'بازدید علمی',
    date: '۱ آذر ۱۴۰۴',
    time: '۰۸:۳۰ الی ۱۳:۰۰',
    location: 'پردیس فناوری و نوآوری دانشگاه',
    capacityRemaining: 20,
    capacityTotal: 25,
    rating: 4.7,
    ratingCount: 62,
    imageFilename: '15_ev_visit.png',
    basePrice: 0, // رایگان
    rewardPoints: 15,
    instructor: 'دکتر محمدرضا رضایی (مدیر ارتباط با صنعت)',
    syllabus: [
      'آشنایی با شتاب‌دهنده‌های تخصصی لجستیک',
      'بازدید از خط تولید رباتیک و آزمایشگاه ساخت سریع',
      'نشست با کارآفرینان برتر فارغ‌التحصیل صنایع',
    ],
  },
  {
    id: 'ev-career-seminar',
    title: 'سمینار آینده شغلی در مهندسی صنایع',
    category: 'seminar',
    categoryLabel: 'سمینار',
    date: '۵ آذر ۱۴۰۴',
    time: '۱۶:۰۰ الی ۱۸:۳۰',
    location: 'آمفی‌تئاتر دانشکده مهندسی صنایع',
    capacityRemaining: 100,
    capacityTotal: 120,
    rating: 4.9,
    ratingCount: 110,
    imageFilename: '16_ev_seminar.png',
    basePrice: 50000, // ۵۰ هزار تومان
    rewardPoints: 10,
    instructor: 'دکتر سارا شمسایی و پنل مدیران ارشد دیجی‌کالا و اسنپ',
    syllabus: [
      'مسیرهای شغلی علم داده، مدیریت محصول، زنجیره تامین',
      'مهارت‌های کلیدی ورود به بازار کار بین‌المللی',
      'پرسش و پاسخ صمیمانه با فارغ‌التحصیلان موفق',
    ],
  },
  {
    id: 'ev-hackathon',
    title: 'مسابقه هکاتون بهینه‌سازی زنجیره تامین',
    category: 'workshop',
    categoryLabel: 'کارگاه',
    date: '۱۲ آذر ۱۴۰۴',
    time: '۰۹:۰۰ الی ۱۹:۰۰',
    location: 'مرکز تحقیقات محاسباتی صنایع',
    capacityRemaining: 18,
    capacityTotal: 40,
    rating: 4.9,
    ratingCount: 45,
    imageFilename: '17_ev_competition.png',
    basePrice: 100000,
    rewardPoints: 30,
    instructor: 'کمیته مسابقات انجمن علمی مهندسی صنایع',
    syllabus: [
      'حل چالش واقعی لجستیک کالا در سطح شهری',
      'فرمولاسیون ریاضی و حل با پایتون و Gurobi',
      'داوری طرح‌ها و اعطای جوایز نقدی به تیم‌های برتر',
    ],
  },
  {
    id: 'ev-arena-sim',
    title: 'دوره نرم‌افزار شبیه‌سازی Arena و Python',
    category: 'workshop',
    categoryLabel: 'کارگاه',
    date: '۱۸ آذر ۱۴۰۴',
    time: '۱۵:۰۰ الی ۱۹:۰۰',
    location: 'سایت تخصصی کامپیوتر صنایع',
    capacityRemaining: 25,
    capacityTotal: 30,
    rating: 4.8,
    ratingCount: 77,
    imageFilename: '18_ev_software.png',
    basePrice: 200000,
    rewardPoints: 25,
    instructor: 'دکتر بهزاد کاظمی',
    syllabus: [
      'مدل‌سازی سیستم‌های صف و مونتاژ خطی',
      'تحلیل خروجی‌های آماری با Input/Output Analyzer',
      'یکپارچه‌سازی شبیه‌سازی Arena با اسکریپت‌های پایتون',
    ],
  },
];

export const DISCOUNT_RATE = {
  POINTS_STEP: 10,
  TOMANS_PER_STEP: 50000, // 10 points = 50,000 Tomans
};

/**
 * Calculates discount amount in Tomans for a given number of points redeemed.
 */
export function calculatePointDiscount(points: number): number {
  if (points <= 0) return 0;
  const steps = Math.floor(points / DISCOUNT_RATE.POINTS_STEP);
  return steps * DISCOUNT_RATE.TOMANS_PER_STEP;
}

/**
 * Calculates max points that can be meaningfully applied to a base price.
 */
export function calculateMaxRedeemablePoints(basePrice: number, availableUserPoints: number): number {
  if (basePrice <= 0 || availableUserPoints < DISCOUNT_RATE.POINTS_STEP) return 0;
  const maxStepsNeeded = Math.ceil(basePrice / DISCOUNT_RATE.TOMANS_PER_STEP);
  const maxPointsNeeded = maxStepsNeeded * DISCOUNT_RATE.POINTS_STEP;
  const userSteps = Math.floor(availableUserPoints / DISCOUNT_RATE.POINTS_STEP);
  const userMaxPoints = userSteps * DISCOUNT_RATE.POINTS_STEP;
  return Math.min(maxPointsNeeded, userMaxPoints);
}

/**
 * Calculates final payable amount and actual points deducted.
 */
export function calculateFinalPayable(
  basePrice: number,
  pointsToUse: number
): { discountAmount: number; finalPrice: number; pointsUsed: number } {
  if (basePrice <= 0) {
    return { discountAmount: 0, finalPrice: 0, pointsUsed: 0 };
  }

  const rawDiscount = calculatePointDiscount(pointsToUse);
  const discountAmount = Math.min(rawDiscount, basePrice);
  const finalPrice = Math.max(0, basePrice - discountAmount);
  // Actual points needed for the discount amount
  const actualSteps = Math.ceil(discountAmount / DISCOUNT_RATE.TOMANS_PER_STEP);
  const pointsUsed = actualSteps * DISCOUNT_RATE.POINTS_STEP;

  return {
    discountAmount,
    finalPrice,
    pointsUsed,
  };
}

/**
 * Formats Tomans currency with Persian thousand separators
 */
export function formatToman(price: number): string {
  if (price === 0) return 'رایگان';
  return `${price.toLocaleString('fa-IR')} تومان`;
}

/**
 * Generates signed QR Ticket string payload bound to eventId, studentId, trackingCode, and paidAmount
 * Format: IE-TICKET:${eventId}:${studentId}:${trackingCode}:${paidAmount}-${signatureHash} (5 parts)
 */
export function generateTicketPayload(
  eventId: string,
  studentId: string,
  trackingCode: string,
  paidAmount?: number
): string {
  if (paidAmount !== undefined) {
    const normalizedPaid = Math.max(0, Math.floor(Number(paidAmount) || 0));
    const sig = computeSignatureHash(
      `TICKET:${eventId}:${studentId}:${trackingCode}:${normalizedPaid}`
    ).slice(0, 8);
    return `IE-TICKET:${eventId}:${studentId}:${trackingCode}:${normalizedPaid}-${sig}`;
  }
  const sig = computeSignatureHash(`TICKET|${eventId}|${studentId}|${trackingCode}`).slice(0, 8);
  return `IE-TICKET:${eventId}:${studentId}:${trackingCode}:${sig}`;
}

/**
 * Filters and sorts events
 */
export function filterAndSortEvents(
  events: EventItem[],
  category: EventCategory,
  sort: EventSortOption
): EventItem[] {
  let filtered = events;
  if (category !== 'all') {
    filtered = events.filter((ev) => ev.category === category);
  }

  const sorted = [...filtered];
  if (sort === 'newest') {
    // Keep list order as chronological
    return sorted;
  }
  if (sort === 'points') {
    return sorted.sort((a, b) => b.rewardPoints - a.rewardPoints);
  }
  if (sort === 'capacity') {
    return sorted.sort((a, b) => a.capacityRemaining - b.capacityRemaining);
  }

  return sorted;
}
