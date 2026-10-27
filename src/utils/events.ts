/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Pure Logic for Events, Pricing, Points Discounts, and Signed QR Tickets
 */

import { DiscountRuleConfig, EventCategory, EventItem, EventSortOption } from '../types';
import { computeSignatureHash } from './security';

export const DEFAULT_EVENT_SYLLABUS: string[] = [
  'آشنایی با مفاهیم پایه و استانداردهای مهندسی صنایع',
  'کارگاه عملی و حل مسئله پروژه محور',
  'پرسش و پاسخ و اعطای گواهینامه معتبر انجمن',
];

/**
 * Resolves a pixel-art workshop image filename based on event title or category
 * whenever an event from the Telegram Bot or Mini App has no image or an empty image.
 */
export function resolveEventPixelImage(
  rawEvent: Partial<EventItem> & Record<string, unknown>
): string {
  const existing = String(
    rawEvent?.imageFilename || rawEvent?.image || rawEvent?.banner || ''
  ).trim();
  if (existing && existing !== 'undefined' && existing !== 'null') {
    return existing;
  }

  const titleAndDesc = `${String(rawEvent?.title || rawEvent?.name || '')} ${String(
    rawEvent?.categoryLabel || ''
  )} ${String(rawEvent?.description || '')}`.toLowerCase();
  const cat = String(rawEvent?.category || '').toLowerCase();

  // 1. Visits, Project Management, MSP, Factory, Industry
  if (
    cat === 'visit' ||
    titleAndDesc.includes('بازدید') ||
    titleAndDesc.includes('کارخانه') ||
    titleAndDesc.includes('پروژه') ||
    titleAndDesc.includes('msp') ||
    titleAndDesc.includes('primavera') ||
    titleAndDesc.includes('پریماورا') ||
    titleAndDesc.includes('پارک علم')
  ) {
    return '13_event_factory.png';
  }

  // 2. Hackathon, Competitions, Business Intelligence (BI / PowerBI)
  if (
    titleAndDesc.includes('مسابقه') ||
    titleAndDesc.includes('هکاتون') ||
    titleAndDesc.includes('هوش تجاری') ||
    titleAndDesc.includes('powerbi') ||
    titleAndDesc.includes('power bi') ||
    titleAndDesc.includes('رقابت') ||
    titleAndDesc.includes('چالش')
  ) {
    return '14_event_hackathon.png';
  }

  // 3. Seminars, Conferences, Career Panels
  if (
    cat === 'seminar' ||
    titleAndDesc.includes('سمینار') ||
    titleAndDesc.includes('همایش') ||
    titleAndDesc.includes('نشست') ||
    titleAndDesc.includes('آینده شغلی')
  ) {
    return '15_event_seminar.png';
  }

  // 4. Default / Python / Software / Data / Arena / Workshop
  return '12_event_python.png';
}

/**
 * Normalizes any event object (whether from Telegram Bot KV `events:list` or Mini App state)
 * so that `.map()` on `syllabus`, `tags`, or `prerequisites` never crashes, capacity is always
 * numeric, rating is always formatted (default 4.9), and pixel-art image is always assigned.
 */
export function normalizeEvent(
  ev: Partial<EventItem> | Record<string, unknown> | null | undefined,
  fallbackIndex = 0
): EventItem {
  const safeObj = (ev && typeof ev === 'object' ? ev : {}) as Partial<EventItem> &
    Record<string, unknown>;

  const rawCategory = String(safeObj.category || '').trim().toLowerCase();
  const rawTitle = String(
    safeObj.title || safeObj.name || 'کارگاه تخصصی مهندسی صنایع'
  ).trim();

  let category: 'workshop' | 'visit' | 'seminar' = 'workshop';
  if (
    rawCategory === 'visit' ||
    rawCategory.includes('بازدید') ||
    rawTitle.includes('بازدید')
  ) {
    category = 'visit';
  } else if (
    rawCategory === 'seminar' ||
    rawCategory.includes('سمینار') ||
    rawTitle.includes('سمینار')
  ) {
    category = 'seminar';
  }

  const categoryLabel =
    String(safeObj.categoryLabel || '').trim() ||
    (category === 'visit'
      ? 'بازدید علمی'
      : category === 'seminar'
      ? 'سمینار'
      : 'کارگاه');

  const parsedTotal = Number(
    safeObj.totalCapacity || safeObj.capacityTotal || safeObj.capacity || 40
  );
  const totalCap =
    Number.isFinite(parsedTotal) && parsedTotal > 0 ? Math.floor(parsedTotal) : 40;

  const rawRemSource =
    safeObj.remainingCapacity ??
    safeObj.capacityRemaining ??
    safeObj.capacity ??
    totalCap;
  const parsedRem = Number(rawRemSource);
  const remCap =
    rawRemSource !== null &&
    rawRemSource !== undefined &&
    String(rawRemSource).trim() !== '' &&
    Number.isFinite(parsedRem) &&
    parsedRem >= 0
      ? Math.floor(parsedRem)
      : totalCap;

  const parsedRating = Number(safeObj.rating || 4.9);
  const ratingFormatted = Number(
    (Number.isFinite(parsedRating) && parsedRating > 0 ? parsedRating : 4.9).toFixed(1)
  );

  // Syllabus normalization:
  // If ev.syllabus is missing or not an array, split ev.description by '\n',
  // and if that is also empty, use DEFAULT_EVENT_SYLLABUS.
  let syllabusList: string[] = [];
  const rawSyllabus: unknown = (safeObj as Record<string, unknown>).syllabus;
  if (Array.isArray(rawSyllabus)) {
    syllabusList = rawSyllabus
      .map((item) => String(item ?? '').trim())
      .filter(Boolean);
  } else if (typeof rawSyllabus === 'string' && rawSyllabus.trim()) {
    syllabusList = rawSyllabus
      .split('\n')
      .map((line: string) => line.replace(/^[-•*]\s*/, '').trim())
      .filter(Boolean);
  }

  if (syllabusList.length === 0 && typeof safeObj.description === 'string') {
    syllabusList = safeObj.description
      .split('\n')
      .map((line) => line.replace(/^[-•*]\s*/, '').trim())
      .filter(Boolean);
  }

  if (syllabusList.length === 0) {
    syllabusList = [...DEFAULT_EVENT_SYLLABUS];
  }

  const resolvedImage = resolveEventPixelImage({
    ...safeObj,
    title: rawTitle,
    category,
    categoryLabel,
  });

  const parsedPrice = Number(
    safeObj.basePrice ?? safeObj.price ?? safeObj.cost ?? 0
  );
  const basePrice =
    Number.isFinite(parsedPrice) && parsedPrice >= 0 ? Math.floor(parsedPrice) : 0;

  const parsedPoints = Number(
    safeObj.rewardPoints ?? safeObj.points ?? 20
  );
  const rewardPoints =
    Number.isFinite(parsedPoints) && parsedPoints >= 0 ? Math.floor(parsedPoints) : 20;

  const tags = Array.isArray(safeObj.tags)
    ? safeObj.tags.map((t) => String(t ?? '').trim()).filter(Boolean)
    : [];

  const prerequisites = Array.isArray(safeObj.prerequisites)
    ? safeObj.prerequisites.map((p) => String(p ?? '').trim()).filter(Boolean)
    : [];

  const descriptionText =
    typeof safeObj.description === 'string' && safeObj.description.trim()
      ? safeObj.description.trim()
      : syllabusList.join('\n');

  const allowPointsDiscount =
    safeObj.allowPointsDiscount !== undefined
      ? Boolean(safeObj.allowPointsDiscount)
      : basePrice > 0;

  const parsedStep = Number(safeObj.discountPointsStep);
  const discountPointsStep =
    Number.isFinite(parsedStep) && parsedStep > 0 ? Math.floor(parsedStep) : undefined;

  const parsedTomansStep = Number(safeObj.discountTomansPerStep);
  const discountTomansPerStep =
    Number.isFinite(parsedTomansStep) && parsedTomansStep >= 1000
      ? Math.floor(parsedTomansStep)
      : undefined;

  const parsedMinPts = Number(safeObj.discountMinPoints);
  const discountMinPoints =
    Number.isFinite(parsedMinPts) && parsedMinPts > 0
      ? Math.floor(parsedMinPts)
      : undefined;

  const parsedMaxPts = Number(safeObj.discountMaxPoints);
  const discountMaxPoints =
    Number.isFinite(parsedMaxPts) && parsedMaxPts > 0
      ? Math.floor(parsedMaxPts)
      : undefined;

  return {
    id: String(safeObj.id || `ev-ie-${fallbackIndex + 1}`),
    title: rawTitle,
    category,
    categoryLabel,
    date: String(safeObj.date || 'به زودی').trim() || 'به زودی',
    time: String(safeObj.time || '۱۴:۰۰ الی ۱۷:۰۰').trim() || '۱۴:۰۰ الی ۱۷:۰۰',
    location:
      String(
        safeObj.location || safeObj.place || 'دانشکده مهندسی صنایع'
      ).trim() || 'دانشکده مهندسی صنایع',
    capacityTotal: totalCap,
    totalCapacity: totalCap,
    capacityRemaining: remCap,
    remainingCapacity: remCap,
    capacity: remCap,
    rating: ratingFormatted,
    ratingCount: Number(safeObj.ratingCount) || 48,
    imageFilename: resolvedImage,
    image: resolvedImage,
    basePrice,
    price: basePrice,
    rewardPoints,
    points: rewardPoints,
    instructor:
      String(
        safeObj.instructor || safeObj.teacher || 'استاد مدعو انجمن علمی صنایع'
      ).trim() || 'استاد مدعو انجمن علمی صنایع',
    description: descriptionText,
    syllabus: syllabusList,
    tags,
    prerequisites,
    allowPointsDiscount,
    discountPointsStep,
    discountTomansPerStep,
    discountMinPoints,
    discountMaxPoints,
  };
}

export function normalizeEventsList(rawEvents: unknown): EventItem[] {
  if (!Array.isArray(rawEvents)) {
    return EVENTS_DATA.map((ev, idx) => normalizeEvent(ev, idx));
  }
  return rawEvents
    .filter((item) => item && typeof item === 'object')
    .map((item, idx) =>
      normalizeEvent(item as Partial<EventItem> & Record<string, unknown>, idx)
    );
}

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
    remainingCapacity: 30,
    totalCapacity: 40,
    capacity: 30,
    rating: 4.9,
    ratingCount: 84,
    imageFilename: '12_event_python.png',
    image: '12_event_python.png',
    basePrice: 150000, // ۱۵۰ هزار تومان
    price: 150000,
    rewardPoints: 20,
    points: 20,
    instructor: 'مهندس آرش شمس (پژوهشگر ارشد علم داده)',
    allowPointsDiscount: true,
    discountPointsStep: 20,
    discountTomansPerStep: 10000,
    discountMinPoints: 20,
    discountMaxPoints: 100,
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
    remainingCapacity: 20,
    totalCapacity: 25,
    capacity: 20,
    rating: 4.9,
    ratingCount: 62,
    imageFilename: '13_event_factory.png',
    image: '13_event_factory.png',
    basePrice: 0, // رایگان
    price: 0,
    rewardPoints: 15,
    points: 15,
    instructor: 'دکتر محمدرضا رضایی (مدیر ارتباط با صنعت)',
    allowPointsDiscount: false,
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
    remainingCapacity: 100,
    totalCapacity: 120,
    capacity: 100,
    rating: 4.9,
    ratingCount: 110,
    imageFilename: '15_event_seminar.png',
    image: '15_event_seminar.png',
    basePrice: 50000, // ۵۰ هزار تومان
    price: 50000,
    rewardPoints: 10,
    points: 10,
    instructor: 'دکتر سارا شمسایی و پنل مدیران ارشد دیجی‌کالا و اسنپ',
    allowPointsDiscount: true,
    discountPointsStep: 20,
    discountTomansPerStep: 10000,
    discountMinPoints: 20,
    discountMaxPoints: 100,
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
    remainingCapacity: 18,
    totalCapacity: 40,
    capacity: 18,
    rating: 4.9,
    ratingCount: 45,
    imageFilename: '14_event_hackathon.png',
    image: '14_event_hackathon.png',
    basePrice: 100000,
    price: 100000,
    rewardPoints: 30,
    points: 30,
    instructor: 'کمیته مسابقات انجمن علمی مهندسی صنایع',
    allowPointsDiscount: true,
    discountPointsStep: 20,
    discountTomansPerStep: 10000,
    discountMinPoints: 20,
    discountMaxPoints: 100,
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
    remainingCapacity: 25,
    totalCapacity: 30,
    capacity: 25,
    rating: 4.9,
    ratingCount: 77,
    imageFilename: '12_event_python.png',
    image: '12_event_python.png',
    basePrice: 200000,
    price: 200000,
    rewardPoints: 25,
    points: 25,
    instructor: 'دکتر بهزاد کاظمی',
    allowPointsDiscount: true,
    discountPointsStep: 20,
    discountTomansPerStep: 10000,
    discountMinPoints: 20,
    discountMaxPoints: 100,
    syllabus: [
      'مدل‌سازی سیستم‌های صف و مونتاژ خطی',
      'تحلیل خروجی‌های آماری با Input/Output Analyzer',
      'یکپارچه‌سازی شبیه‌سازی Arena با اسکریپت‌های پایتون',
    ],
  },
];

export const DISCOUNT_RATE = {
  POINTS_STEP: 20,
  TOMANS_PER_STEP: 10000, // هر ۲۰ امتیاز = ۱۰,۰۰۰ تومان تخفیف (پیش‌فرض قابل تغییر توسط ادمین)
  MIN_POINTS: 20,
  MAX_POINTS: 100,
};

export interface ResolvedEventDiscountRule {
  enabled: boolean;
  pointsStep: number;
  discountTomansPerStep: number;
  minPoints: number;
  maxPoints: number;
  steps: {
    points: number;
    multiplier: number;
    discountTomans: number;
    code: string;
  }[];
}

/**
 * Resolves the effective points-to-discount rule for a specific workshop,
 * combining per-workshop Admin settings with global Admin defaults.
 */
export function resolveEventDiscountRule(
  event?: Partial<EventItem> | null,
  globalRule?:
    | Partial<DiscountRuleConfig>
    | {
        pointsUnit?: number;
        discountToman?: number;
        pointsStep?: number;
        discountTomansPerStep?: number;
        minPoints?: number;
        maxPoints?: number;
      }
    | null
): ResolvedEventDiscountRule {
  const basePrice = Math.max(0, Number(event?.basePrice ?? event?.price ?? 0));
  const enabled = basePrice > 0 && event?.allowPointsDiscount !== false;

  const g = (globalRule || {}) as Record<string, unknown>;
  const rawStep = Number(
    event?.discountPointsStep ||
      g.pointsStep ||
      g.pointsUnit ||
      DISCOUNT_RATE.POINTS_STEP
  );
  const pointsStep =
    Number.isFinite(rawStep) && rawStep >= 1 ? Math.floor(rawStep) : DISCOUNT_RATE.POINTS_STEP;

  const rawTomans = Number(
    event?.discountTomansPerStep ||
      g.discountTomansPerStep ||
      g.discountToman ||
      DISCOUNT_RATE.TOMANS_PER_STEP
  );
  const discountTomansPerStep =
    Number.isFinite(rawTomans) && rawTomans >= 1000
      ? Math.floor(rawTomans)
      : DISCOUNT_RATE.TOMANS_PER_STEP;

  const rawMin = Number(
    event?.discountMinPoints || g.minPoints || pointsStep
  );
  const minPoints = Math.max(
    pointsStep,
    Math.ceil(
      (Number.isFinite(rawMin) && rawMin > 0 ? rawMin : pointsStep) / pointsStep
    ) * pointsStep
  );

  const rawMax = Number(
    event?.discountMaxPoints || g.maxPoints || Math.max(minPoints, pointsStep * 5)
  );
  const adminMaxAligned = Math.max(
    minPoints,
    Math.floor(
      (Number.isFinite(rawMax) && rawMax >= minPoints ? rawMax : minPoints * 5) /
        pointsStep
    ) * pointsStep
  );

  // Also cap by maximum steps needed to cover 100% of basePrice (when basePrice > 0)
  const maxStepsByPrice =
    basePrice > 0
      ? Math.max(1, Math.ceil(basePrice / discountTomansPerStep))
      : Math.floor(adminMaxAligned / pointsStep);
  const maxPoints = Math.max(
    minPoints,
    Math.min(adminMaxAligned, maxStepsByPrice * pointsStep)
  );

  const steps: {
    points: number;
    multiplier: number;
    discountTomans: number;
    code: string;
  }[] = [
    {
      points: 0,
      multiplier: 0,
      discountTomans: 0,
      code: '',
    },
  ];

  for (let pts = minPoints; pts <= maxPoints; pts += pointsStep) {
    const multiplier = Math.floor(pts / pointsStep);
    const discountTomans =
      basePrice > 0
        ? Math.min(basePrice, multiplier * discountTomansPerStep)
        : multiplier * discountTomansPerStep;
    steps.push({
      points: pts,
      multiplier,
      discountTomans,
      code: `OFF-IE-${pts}P`,
    });
  }

  return {
    enabled,
    pointsStep,
    discountTomansPerStep,
    minPoints,
    maxPoints,
    steps,
  };
}

/**
 * Calculates discount amount in Tomans for a given number of points redeemed.
 */
export function calculatePointDiscount(
  points: number,
  rule?: Partial<DiscountRuleConfig> & { pointsUnit?: number; discountToman?: number }
): number {
  if (points <= 0) return 0;
  const resolved = resolveEventDiscountRule({ basePrice: 100000000 }, rule);
  if (points < resolved.minPoints) return 0;
  const cappedPoints = Math.min(points, resolved.maxPoints);
  const steps = Math.floor(cappedPoints / resolved.pointsStep);
  return steps * resolved.discountTomansPerStep;
}

/**
 * Calculates max points that can be meaningfully applied to a base price.
 */
export function calculateMaxRedeemablePoints(
  basePrice: number,
  availableUserPoints: number,
  rule?: Partial<DiscountRuleConfig> & { pointsUnit?: number; discountToman?: number },
  event?: Partial<EventItem> | null
): number {
  const resolved = resolveEventDiscountRule(
    { ...(event || {}), basePrice },
    rule
  );
  if (!resolved.enabled || basePrice <= 0) return 0;
  if (availableUserPoints < resolved.minPoints) return 0;
  const userAligned =
    Math.floor(availableUserPoints / resolved.pointsStep) * resolved.pointsStep;
  return Math.min(resolved.maxPoints, userAligned);
}

/**
 * Calculates final payable amount, actual points deducted, and generated discount code.
 */
export function calculateFinalPayable(
  basePrice: number,
  pointsToUse: number,
  rule?: Partial<DiscountRuleConfig> & { pointsUnit?: number; discountToman?: number },
  event?: Partial<EventItem> | null
): {
  discountAmount: number;
  finalPrice: number;
  pointsUsed: number;
  discountCode: string;
} {
  if (basePrice <= 0) {
    return { discountAmount: 0, finalPrice: 0, pointsUsed: 0, discountCode: '' };
  }

  const resolved = resolveEventDiscountRule(
    { ...(event || {}), basePrice },
    rule
  );
  if (!resolved.enabled || pointsToUse < resolved.minPoints) {
    return {
      discountAmount: 0,
      finalPrice: basePrice,
      pointsUsed: 0,
      discountCode: '',
    };
  }

  const clampedPoints = Math.min(
    resolved.maxPoints,
    Math.floor(pointsToUse / resolved.pointsStep) * resolved.pointsStep
  );
  const multiplier = Math.floor(clampedPoints / resolved.pointsStep);
  const rawDiscount = multiplier * resolved.discountTomansPerStep;
  const discountAmount = Math.min(rawDiscount, basePrice);
  const finalPrice = Math.max(0, basePrice - discountAmount);
  const actualSteps =
    discountAmount > 0
      ? Math.ceil(discountAmount / resolved.discountTomansPerStep)
      : 0;
  const pointsUsed = actualSteps * resolved.pointsStep;
  const discountCode = pointsUsed > 0 ? `OFF-IE-${pointsUsed}P` : '';

  return {
    discountAmount,
    finalPrice,
    pointsUsed,
    discountCode,
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
 * Filters and sorts events (always normalizes incoming events first)
 */
export function filterAndSortEvents(
  events: EventItem[],
  category: EventCategory,
  sort: EventSortOption
): EventItem[] {
  const normalized = normalizeEventsList(events);
  let filtered = normalized;
  if (category !== 'all') {
    filtered = normalized.filter((ev) => ev.category === category);
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
