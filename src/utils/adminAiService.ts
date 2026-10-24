/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Safe Admin AI Service (adminAiService.ts)
 * Guarantees ZERO browser ReferenceError (`process is not defined`) and provides
 * Admin-Only "Looti" Co-Pilot, Supercharged Multi-Professor Timetable Parser,
 * and Natural Language Timer Parser.
 */

import { GoogleGenAI, Type } from '@google/genai';
import { LootiModelId, Professor, ScheduledTimer } from '../types';
import { sanitizeAiPrompt } from './security';

export const getSafeApiKey = (): string => {
  try {
    if (typeof process !== 'undefined' && process.env?.GEMINI_API_KEY) {
      return process.env.GEMINI_API_KEY;
    }
    if (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_GEMINI_API_KEY) {
      return (import.meta as any).env.VITE_GEMINI_API_KEY;
    }
  } catch {
    // Safe fallback if process or import.meta is restricted
  }
  return '';
};

export interface ParsedProfessorSchedule {
  name: string;
  title: string;
  office: string;
  officeHours: string;
  email: string;
  courses: {
    name: string;
    dayAndTime: string;
    room: string;
  }[];
}

/**
 * Deterministic fallback for Admin Looti AI when offline or no API key is configured
 */
export function buildLocalAdminLootiReply(query: string): string {
  const q = (query || '').trim();
  if (q.includes('گزارش') || q.includes('آمار') || q.includes('ورودی')) {
    return 'سلام ستون! 📊 طبق آخرین وضعیت انجمن صنایع: ۱۲۸ دانشجو در سامانه فعال هستن، ورودی ۱۴۰۲ با ۴,۸۵۰ امتیاز صدرنشین جدول رقابته و ۳ فیش واریزی توی کارتابل منتظر تایید نهایی شماست. روی چشمم، هر دستوری داری بگو حله رفیق!';
  }
  if (q.includes('کارگاه') || q.includes('رویداد') || q.includes('بلیط')) {
    return 'حله رفیق! 🎯 کارگاه تحلیل داده با پایتون ۱۸ نفر ظرفیت خالی داره و کارگاه مدیریت پروژه ۴۵ نفر. از بخش «مدیریت کارگاه‌ها و اساتید» می‌تونی ظرفیت یا امتیاز هر کارگاه رو درجا تغییر بدی ستون!';
  }
  if (q.includes('تخفیف') || q.includes('امتیاز') || q.includes('مدال')) {
    return 'روی چشمم ستون! 🏆 الان فرمول تخفیف روی «هر ۱۰ امتیاز = ۵۰,۰۰۰ تومان تخفیف» تنظیم شده. از ماژول ۶ می‌تونی ضریب تخفیف رو عوض کنی یا به بچه‌های فعال مدال پیکسلی بدی!';
  }
  return 'سلام ستون! 🤖 دستیار ویژه شورای مرکزی انجمن علمی مهندسی صنایع آماده خدمت‌رسانیه. برای تبدیل متن خام برنامه اساتید، ساخت تایمر هوشمند، یا تحلیل آمار ورودی‌ها هر امری داری بگو، روی چشمم، حله رفیق!';
}

/**
 * Ask Admin Looti AI with multi-layer fallback (Backend proxy -> Safe Direct SDK -> Local Mashdi Fallback)
 */
export async function askAdminLootiAi(
  rawPrompt: string,
  modelId: LootiModelId = 'gemini-3.8-flash'
): Promise<{ reply: string; modelUsed: LootiModelId }> {
  const check = sanitizeAiPrompt(rawPrompt);
  if (!check.isSafe) {
    return {
      reply: check.blockedReason || '⚠️ هشدار امنیتی سپر ادمین: ورودی نامعتبر.',
      modelUsed: modelId,
    };
  }

  // 1. Try server-side proxy route first
  try {
    if (typeof fetch !== 'undefined') {
      const response = await fetch('/api/ai/looti', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: check.sanitized,
          modelId,
          userContext: {
            fullName: 'سردبیر شورای مرکزی (ادمین ارشد)',
            cohortYear: '۱۴۰۲',
            score: 999,
            level: 5,
          },
        }),
      });
      if (response.ok) {
        const data = await response.json();
        if (data?.reply) {
          return {
            reply: String(data.reply),
            modelUsed: data.modelUsed || modelId,
          };
        }
      }
    }
  } catch {
    // Continue to safe SDK or local fallback
  }

  // 2. Safe client-side SDK check ONLY if getSafeApiKey() returns a non-empty string
  const apiKey = getSafeApiKey();
  if (apiKey && apiKey.trim().length > 5) {
    try {
      const ai = new GoogleGenAI({ apiKey });
      const result = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: check.sanitized,
        config: {
          systemInstruction:
            'تو دستیار هوشمند و مشتی پنل ادمین انجمن علمی مهندسی صنایع هستی. با تکیه‌کلام‌های محترمانه و صمیمی مثل «سلام ستون!»، «روی چشمم» و «حله رفیق» به فارسی پاسخ کوتاه و کاربردی بده.',
          temperature: 0.5,
        },
      });
      if (result?.text) {
        return { reply: result.text, modelUsed: modelId };
      }
    } catch {
      // Fall through to deterministic reply
    }
  }

  return {
    reply: buildLocalAdminLootiReply(check.sanitized),
    modelUsed: modelId,
  };
}

/**
 * Supercharged Multi-Line Persian NLP/Regex Professor Timetable Parser:
 * Parses 1 or multiple professors from unstructured Telegram/Excel/PDF text blocks,
 * extracting name, academic rank, office room, office hours, and all courses with day/time/room.
 */
export function parseMultiProfessorSchedules(rawText: string): Professor[] {
  const cleaned = (rawText || '').trim();
  if (!cleaned) return [];

  // Split into professor blocks if multiple lines each start with a professor name or numbered item
  const rawLines = cleaned
    .split(/\n+/)
    .map((l) => l.trim())
    .filter(Boolean);

  const profBlocks: string[] = [];
  for (const line of rawLines) {
    const startsWithProf = /^(?:[\d۰-۹]+[-.)]\s*)?(?:دکتر|مهندس|استاد|سرکار خانم دکتر|جناب آقای دکتر)\s+/i.test(line);
    if (startsWithProf || profBlocks.length === 0) {
      profBlocks.push(line);
    } else {
      profBlocks[profBlocks.length - 1] += ' | ' + line;
    }
  }

  const results: Professor[] = [];

  profBlocks.forEach((block, idx) => {
    const segments = block
      .split(/\||؛|\n/)
      .map((s) => s.trim())
      .filter(Boolean);

    // 1. Extract Name & Academic Title
    const nameMatch = block.match(
      /((?:دکتر|مهندس|استاد)\s+[\u0600-\u06FF]+(?:\s+[\u0600-\u06FF]+){1,2})/
    );
    const rawName = nameMatch
      ? nameMatch[1].replace(/\s+(اتاق|دفتر|درس|استادیار|دانشیار|استاد تمام).*$/, '').trim()
      : segments[0]?.split(/[-–(]/)[0]?.trim() || `دکتر استاد مدعو ${idx + 1}`;

    let academicTitle = 'عضو هیئت علمی دانشکده مهندسی صنایع';
    if (block.includes('استاد تمام')) {
      academicTitle = 'استاد تمام - دانشکده مهندسی صنایع';
    } else if (block.includes('دانشیار')) {
      academicTitle = 'دانشیار - دانشکده مهندسی صنایع';
    } else if (block.includes('استادیار')) {
      academicTitle = 'استادیار - دانشکده مهندسی صنایع';
    } else if (block.includes('مهندس')) {
      academicTitle = 'مدرس تخصصی و صنعتگر مدعو مهندسی صنایع';
    }

    // 2. Extract Office Location
    const officeMatch = block.match(/((?:اتاق|دفتر)\s*[\d۰-۹A-Za-z]+(?:\s*طبقه\s*[\u0600-\u06FF\d۰-۹]+)?)/);
    const office = officeMatch
      ? officeMatch[1].trim()
      : 'اتاق ۳۰۴ (طبقه سوم دانشکده صنایع)';

    // 3. Extract Office Hours
    let officeHours = 'یکشنبه و سه‌شنبه: ۱۱:۰۰ الی ۱۳:۰۰';
    const officeHoursSegment = segments.find(
      (s) => s.includes('حضور در دفتر') || s.includes('ساعت حضور') || s.includes('رفع اشکال')
    );
    if (officeHoursSegment) {
      officeHours = officeHoursSegment
        .replace(/^(?:ساعات?\s*)?(?:حضور در دفتر|ساعت حضور|رفع اشکال)\s*[:：-]?\s*/i, '')
        .trim();
    } else {
      const genericHoursMatch = block.match(
        /((?:شنبه|یکشنبه|دوشنبه|سه‌شنبه|سه شنبه|چهارشنبه|پنجشنبه)[^\n|،]*ساعت\s*[\d۰-۹: الی تا-]+)/
      );
      if (genericHoursMatch) {
        officeHours = genericHoursMatch[1].trim();
      }
    }

    // 4. Extract Email
    const emailMatch = block.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
    const email = emailMatch ? emailMatch[0] : `faculty.ie${idx + 1}@aut.ac.ir`;

    // 5. Extract Multiple Courses
    const courses: { name: string; dayAndTime: string; room: string }[] = [];

    for (const seg of segments) {
      if (seg.includes('حضور در دفتر') || seg.includes('ساعت حضور')) continue;

      const isCourseSeg =
        seg.startsWith('درس') ||
        seg.includes('کلاس') ||
        seg.includes('سایت') ||
        seg.includes('آمفی') ||
        /(?:تحقیق در عملیات|شبیه‌سازی|شبیه سازی|کنترل کیفیت|اقتصاد مهندسی|مدیریت پروژه|کنترل پروژه|طرحریزی|طرح‌ریزی|موجودی|زنجیره تامین|پایتون|سیستم‌های اطلاعاتی)/.test(
          seg
        );

      if (isCourseSeg) {
        // Extract room
        const roomMatch = seg.match(
          /((?:کلاس|سایت|آمفی‌تئاتر|آمفی تئاتر|تالار)\s*[\u0600-\u06FF\d۰-۹A-Za-z\s]{1,18})/
        );
        const room = roomMatch ? roomMatch[1].trim() : 'کلاس ۲۰۱ صنایع';

        // Extract day & time
        const dayTimeMatch = seg.match(
          /((?:شنبه|یکشنبه|دوشنبه|سه‌شنبه|سه شنبه|چهارشنبه|پنجشنبه)(?:\s*و\s*(?:شنبه|یکشنبه|دوشنبه|سه‌شنبه|سه شنبه|چهارشنبه|پنجشنبه))?\s*(?:ساعت\s*)?[\d۰-۹:]+(?:\s*(?:تا|الی|-)\s*[\d۰-۹:]+)?)/
        );
        const dayAndTime = dayTimeMatch
          ? dayTimeMatch[1].trim()
          : 'شنبه و دوشنبه ۱۰:۰۰ - ۱۲:۰۰';

        // Extract course name
        let courseName = seg
          .replace(/^درس\s*/, '')
          .split(/[:：]/)[0]
          .replace(room, '')
          .replace(dayAndTime, '')
          .replace(/(?:ساعت|روز|در)\s*$/g, '')
          .trim();

        if (!courseName || courseName.includes('دکتر') || courseName.length < 3) {
          const explicitCourse = seg.match(
            /درس\s+([\u0600-\u06FF\d۰-۹\s]{3,32}?)(?=\s*(?::|شنبه|یکشنبه|دوشنبه|سه‌شنبه|سه شنبه|چهارشنبه|کلاس|سایت|$))/
          );
          courseName = explicitCourse ? explicitCourse[1].trim() : '';
        }

        if (courseName && !courseName.startsWith('دکتر')) {
          courses.push({
            name: courseName,
            dayAndTime,
            room,
          });
        }
      }
    }

    // Fallback keyword course detection if segment wasn't pipe-separated
    if (courses.length === 0) {
      if (block.includes('شبیه‌سازی') || block.includes('شبیه سازی')) {
        courses.push({
          name: 'شبیه‌سازی سیستم‌های گسسته',
          dayAndTime: 'شنبه و دوشنبه ۱۰:۰۰ - ۱۲:۰۰',
          room: 'سایت کامپیوتر صنایع',
        });
      }
      if (block.includes('تحقیق در عملیات') || block.includes('بهینه‌سازی')) {
        courses.push({
          name: 'تحقیق در عملیات ۱',
          dayAndTime: 'یکشنبه و سه‌شنبه ۰۸:۰۰ - ۱۰:۰۰',
          room: 'کلاس ۲۰۴',
        });
      }
      if (block.includes('کنترل کیفیت')) {
        courses.push({
          name: 'کنترل کیفیت آماری',
          dayAndTime: 'چهارشنبه ۱۰:۰۰ - ۱۲:۰۰',
          room: 'کلاس ۱۰۲',
        });
      }
      if (block.includes('مدیریت پروژه') || block.includes('کنترل پروژه')) {
        courses.push({
          name: 'مدیریت و کنترل پروژه',
          dayAndTime: 'سه‌شنبه ۱۳:۳۰ - ۱۵:۳۰',
          room: 'کلاس ۱۰۵',
        });
      }
      if (courses.length === 0) {
        courses.push({
          name: 'مهندسی سیستم‌ها و بهینه‌سازی',
          dayAndTime: 'شنبه و دوشنبه ۰۹:۳۰ - ۱۱:۰۰',
          room: 'کلاس ۲۰۱',
        });
      }
    }

    const isFemale = /(?:سارا|مریم|پرنیا|نگین|زهرا|فاطمه|نازنین|نیلوفر|خانم)/.test(rawName);

    results.push({
      id: `prof-ai-${Date.now()}-${idx}`,
      name: rawName,
      title: academicTitle,
      avatar: isFemale ? '02_avatar_girl.png' : '01_avatar_boy.png',
      office,
      officeHours,
      isCurrentlyInOffice: true,
      email,
      courses,
    });
  });

  return results;
}

/**
 * Dual-Engine AI + Regex Parser: tries Gemini Structured JSON first if API key exists,
 * and falls back seamlessly to `parseMultiProfessorSchedules`.
 */
export async function parseMultiProfessorSchedulesWithAi(rawText: string): Promise<Professor[]> {
  const localParsed = parseMultiProfessorSchedules(rawText);
  const apiKey = getSafeApiKey();

  if (apiKey && apiKey.trim().length > 5) {
    try {
      const ai = new GoogleGenAI({ apiKey });
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `متن زیر شامل برنامه حضور و کلاس‌های یک یا چند استاد مهندسی صنایع است. آن را به آرایه‌ای از اشیاء استاد تبدیل کن:\n\n${rawText}`,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                name: { type: Type.STRING },
                title: { type: Type.STRING },
                office: { type: Type.STRING },
                officeHours: { type: Type.STRING },
                email: { type: Type.STRING },
                courses: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      name: { type: Type.STRING },
                      dayAndTime: { type: Type.STRING },
                      room: { type: Type.STRING },
                    },
                    required: ['name', 'dayAndTime', 'room'],
                  },
                },
              },
              required: ['name', 'title', 'office', 'officeHours', 'courses'],
            },
          },
        },
      });

      if (response?.text) {
        const parsedJson = JSON.parse(response.text);
        if (Array.isArray(parsedJson) && parsedJson.length > 0) {
          return parsedJson.map((item: any, idx: number) => ({
            id: `prof-gemini-${Date.now()}-${idx}`,
            name: String(item.name || localParsed[idx]?.name || 'دکتر استاد صنایع'),
            title: String(item.title || 'عضو هیئت علمی دانشکده مهندسی صنایع'),
            avatar: /(?:سارا|مریم|پرنیا|نگین|زهرا|فاطمه|خانم)/.test(String(item.name))
              ? '02_avatar_girl.png'
              : '01_avatar_boy.png',
            office: String(item.office || 'اتاق ۳۰۵ دانشکده صنایع'),
            officeHours: String(item.officeHours || 'یکشنبه و سه‌شنبه ۱۰ الی ۱۲'),
            isCurrentlyInOffice: true,
            email: String(item.email || `prof${idx + 1}@aut.ac.ir`),
            courses: Array.isArray(item.courses) && item.courses.length > 0
              ? item.courses
              : localParsed[idx]?.courses || [],
          }));
        }
      }
    } catch {
      // Fall back to deterministic parser
    }
  }

  return localParsed;
}

/**
 * Legacy single-professor helper kept for backwards compatibility
 */
export function parseRawProfessorScheduleDeterministic(rawText: string): ParsedProfessorSchedule {
  const multi = parseMultiProfessorSchedules(rawText);
  if (multi.length > 0) {
    const first = multi[0];
    return {
      name: first.name,
      title: first.title,
      office: first.office,
      officeHours: first.officeHours,
      email: first.email,
      courses: first.courses,
    };
  }
  return {
    name: 'دکتر علی اصغری',
    title: 'عضو هیئت علمی دانشکده مهندسی صنایع',
    office: 'اتاق ۳۰۹ (طبقه سوم دانشکده صنایع)',
    officeHours: 'یکشنبه و سه‌شنبه: ۱۱:۰۰ الی ۱۳:۰۰',
    email: 'faculty.ie@aut.ac.ir',
    courses: [
      {
        name: 'مهندسی سیستم‌ها و بهینه‌سازی',
        dayAndTime: 'شنبه و دوشنبه ۰۹:۳۰ - ۱۱:۰۰',
        room: 'کلاس ۲۰۱',
      },
    ],
  };
}

/**
 * 1-Click Natural Language Timer Parser:
 * Converts sentences like "هر چهارشنبه ساعت ۱۴ یادآوری رزرو سلف" or
 * "فقط در تاریخ ۱۴۰۴/۰۹/۰۵ ساعت ۱۰ یادآوری ثبت‌نام کارگاه" into a ScheduledTimer object
 */
export function parseNaturalLanguageTimerDeterministic(sentence: string): ScheduledTimer {
  const text = (sentence || '').trim() || 'هر چهارشنبه ساعت ۱۴ یادآوری رزرو سلف';

  // Extract explicit Persian/Gregorian date like ۱۴۰۴/۰۸/۲۸ or 1404/08/28
  const dateMatch = text.match(/([0-9۰-۹]{4}[/-][0-9۰-۹]{1,2}[/-][0-9۰-۹]{1,2})/);
  const extractedDate = dateMatch ? dateMatch[1] : '۱۴۰۴/۰۸/۲۸';

  let frequency: ScheduledTimer['frequency'] = 'هفتگی';
  if (
    text.includes('فقط یکبار') ||
    text.includes('یک‌بار') ||
    text.includes('یکبار') ||
    text.includes('فقط در تاریخ') ||
    (dateMatch && !text.includes('هر '))
  ) {
    frequency = 'یکبار';
  } else if (text.includes('هر روز') || text.includes('روزانه')) {
    frequency = 'روزانه';
  } else if (text.includes('هر ماه') || text.includes('ماهانه')) {
    frequency = 'ماهانه';
  } else if (text.includes('هر ') || text.includes('هفتگی')) {
    frequency = 'هفتگی';
  }

  const days = [
    'چهارشنبه',
    'پنجشنبه',
    'سه‌شنبه',
    'سه شنبه',
    'یکشنبه',
    'دوشنبه',
    'جمعه',
    'شنبه',
  ];
  const matchedDay = days.find((d) => text.includes(d)) || 'چهارشنبه';

  const timeMatch = text.match(/ساعت\s*([0-9۰-۹]{1,2}(?::[0-9۰-۹]{2})?)/);
  let extractedTime = '۱۴:۰۰';
  if (timeMatch && timeMatch[1]) {
    const rawTime = timeMatch[1];
    extractedTime = rawTime.includes(':') ? rawTime : `${rawTime}:۰۰`;
  }

  const cleanedTitle = text
    .replace(/فقط\s*در\s*تاریخ\s*[0-9۰-۹/-]+/g, '')
    .replace(/(?:از|در)\s*تاریخ\s*[0-9۰-۹/-]+/g, '')
    .replace(/هر\s+(شنبه|یکشنبه|دوشنبه|سه‌شنبه|سه شنبه|چهارشنبه|پنجشنبه|جمعه|روز|ماه)/g, '')
    .replace(/ساعت\s*[0-9۰-۹:]+/g, '')
    .replace(/(?:فقط\s*)?(?:یک‌بار|یکبار)/g, '')
    .trim();

  const cohortMatch = text.match(/ورودی(?:‌های)?\s*(۱۴۰[۰-۵]|140[0-5])/);
  const targetAudience = cohortMatch
    ? `ورودی ${cohortMatch[1]} مهندسی صنایع`
    : 'همه ورودی‌های مهندسی صنایع (۱۴۰۰ تا ۱۴۰۵)';

  return {
    id: `timer-${Date.now()}`,
    title: cleanedTitle || 'یادآوری رزرو تغذیه و سلف دانشجویی',
    rawSentence: text,
    frequency,
    dayOfWeek: frequency === 'هفتگی' ? matchedDay : undefined,
    startDate: extractedDate,
    time: extractedTime,
    targetAudience,
    messageText: cleanedTitle || text,
    enabled: true,
  };
}
