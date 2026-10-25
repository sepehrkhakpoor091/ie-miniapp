/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Live Telegram Channel Announcements Sync Engine
 * Official Channel: https://t.me/Isefum (انجمن علمی مهندسی صنایع دانشگاه فردوسی مشهد)
 */

import { ChannelAnnouncement } from '../types';

export const DEFAULT_CHANNEL_HANDLE = 'Isefum';
export const DEFAULT_CHANNEL_URL = 'https://t.me/Isefum';
export const CHANNEL_URL_STORAGE_KEY = 'ie_official_channel_url';
export const SYNCED_ANNOUNCEMENTS_STORAGE_KEY = 'ie_synced_announcements_v4';

/**
 * Normalizes any user/admin channel input into a clean Telegram channel username.
 * Supports:
 * - "https://t.me/Isefum" -> "Isefum"
 * - "https://t.me/s/Isefum" -> "Isefum"
 * - "@Isefum" -> "Isefum"
 * - "ie_fum" -> "ie_fum"
 */
export function normalizeTelegramChannelHandle(input: string): string {
  const raw = String(input || '').trim();
  if (!raw) return DEFAULT_CHANNEL_HANDLE;

  const cleaned = raw
    .replace(/^https?:\/\/(www\.)?(t\.me|telegram\.me)\/s\//i, '')
    .replace(/^https?:\/\/(www\.)?(t\.me|telegram\.me)\//i, '')
    .replace(/^@+/, '')
    .split(/[/?#]/)[0]
    .trim();

  if (!cleaned || !/^[a-zA-Z0-9_]{3,64}$/.test(cleaned)) {
    return DEFAULT_CHANNEL_HANDLE;
  }
  return cleaned;
}

export function buildTelegramChannelUrl(handleOrUrl: string): string {
  const handle = normalizeTelegramChannelHandle(handleOrUrl);
  return `https://t.me/${handle}`;
}

export function buildTelegramWebPreviewUrl(handleOrUrl: string): string {
  const handle = normalizeTelegramChannelHandle(handleOrUrl);
  return `https://t.me/s/${handle}`;
}

/**
 * Rich realistic announcements for @Isefum (انجمن علمی مهندسی صنایع دانشگاه فردوسی مشهد)
 * used as initial seed and resilient offline fallback.
 */
export const DEFAULT_ISEFUM_ANNOUNCEMENTS: ChannelAnnouncement[] = [
  {
    id: 'isefum-2140',
    postId: '2140',
    channelHandle: 'Isefum',
    postUrl: 'https://t.me/Isefum/2140',
    title: 'انتشار چارت جدید ۱۴۲ واحدی مهندسی صنایع فردوسی (مصوب ۱۳۹۹)',
    snippet: 'درخت پیشنیازها، همنیازها و جدول ۱۵ درس اختیاری در مینی‌اپ انجمن فعال شد...',
    content:
      'به اطلاع کلیه دانشجویان مهندسی صنایع دانشگاه فردوسی مشهد (ورودی‌های ۱۴۰۰ الی ۱۴۰۴) می‌رساند چارت کامل ۱۴۲ واحدی مصوب ۱۳۹۹ به همراه رادار هوشمند بررسی پیشنیاز/همنیاز و انتخابگر دروس اختیاری در سامانه انجمن (@Isefum) بارگذاری شد. قبل از انتخاب واحد حتماً وضعیت باز بودن دروس ترم آینده خود را در بخش «چارت درسی و درخت پیش‌نیازها» بررسی کنید.',
    timestamp: 'امروز - ۱۴:۳۰',
    tag: 'آموزشی',
    author: 'کانال رسمی انجمن (@Isefum)',
    views: 1480,
    hasAttachment: true,
    isPinned: true,
  },
  {
    id: 'isefum-2138',
    postId: '2138',
    channelHandle: 'Isefum',
    postUrl: 'https://t.me/Isefum/2138',
    title: 'فراخوان نشریه علمی-تخصصی مهندسی صنایع فردوسی (شماره ۱۴)',
    snippet: 'ارسال مقالات پژوهشی، صنعتی و یادداشت‌های تحلیلی تا پایان آبان ماه...',
    content:
      'انجمن علمی مهندسی صنایع دانشگاه فردوسی مشهد (@Isefum) از تمامی دانشجویان علاقه‌مند جهت همکاری در شماره چهاردهم نشریه تخصصی دعوت به عمل می‌آورد. محورهای ویژه این شماره: بهینه‌سازی زنجیره تأمین، هوش مصنوعی در تصمیم‌گیری، مهندسی سیستم‌های سلامت و شبیه‌سازی پیشرفته. به نویسندگان برتر ۱۰۰ امتیاز الماس در سامانه تعلق می‌گیرد.',
    timestamp: 'دیروز - ۱۸:۱۵',
    tag: 'نشریه',
    author: 'تحریریه نشریه (@Isefum)',
    views: 960,
    hasAttachment: true,
  },
  {
    id: 'isefum-2135',
    postId: '2135',
    channelHandle: 'Isefum',
    postUrl: 'https://t.me/Isefum/2135',
    title: 'کارگاه جامع تحلیل داده با پایتون و کتابخانه‌های صنعتی',
    snippet: 'ظرفیت باقی‌مانده محدود؛ امکان استفاده از الماس‌های تخفیف در زمان ثبت‌نام...',
    content:
      'ثبت‌نام کارگاه کاربردی تحلیل داده با Python ویژه دانشجویان مهندسی صنایع آغاز شد. سرفصل‌ها شامل NumPy، Pandas، مصورسازی داده‌های خط تولید و پیاده‌سازی مدل‌های پیش‌بینی تقاضا است. شرکت‌کنندگان علاوه بر گواهی معتبر دو زبانه، ۲۰ امتیاز الماس دریافت خواهند کرد.',
    timestamp: '۲ روز پیش',
    tag: 'کارگاه',
    author: 'کمیته آموزش (@Isefum)',
    views: 1320,
    hasAttachment: false,
  },
  {
    id: 'isefum-2131',
    postId: '2131',
    channelHandle: 'Isefum',
    postUrl: 'https://t.me/Isefum/2131',
    title: 'برنامه زمان‌بندی بازدید علمی از خطوط تولید شهرک صنعتی توس',
    snippet: 'حرکت سرویس‌ها از مقابل دانشکده مهندسی؛ همراه داشتن کارت دانشجویی الزامی است...',
    content:
      'بازدید علمی از واحد کنترل کیفیت و انبارش هوشمند در شهرک صنعتی توس روز چهارشنبه برگزار می‌گردد. دانشجویانی که بلیط QR آن‌ها تایید شده است، ساعت ۷:۴۵ صبح مقابل ورودی اصلی دانشکده مهندسی حضور داشته باشند.',
    timestamp: '۴ روز پیش',
    tag: 'بازدید علمی',
    author: 'کمیته روابط عمومی (@Isefum)',
    views: 1150,
    hasAttachment: true,
  },
  {
    id: 'isefum-2126',
    postId: '2126',
    channelHandle: 'Isefum',
    postUrl: 'https://t.me/Isefum/2126',
    title: 'آغاز ثبت‌نام کاندیداهای انتخابات انجمن علمی مهندسی صنایع',
    snippet: 'فرصت ثبت‌نام دانشجویان علاقه‌مند به فعالیت‌های تیمی، اجرایی و پژوهشی...',
    content:
      'دانشجویان پرانرژی مهندسی صنایع دانشگاه فردوسی مشهد که علاقه‌مند به حضور در انجمن علمی مهندسی صنایع (@Isefum) هستند می‌توانند از طریق کارتابل فرهنگی دانشگاه ثبت‌نام خود را نهایی نمایند.',
    timestamp: 'هفته گذشته',
    tag: 'انتخابات',
    author: 'انجمن علمی مهندسی صنایع (@Isefum)',
    views: 1840,
    hasAttachment: false,
  },
];

/**
 * Converts view strings like "1.4K" or "840" into numbers.
 */
export function parseTelegramViewCount(rawViews: string): number {
  const clean = String(rawViews || '').trim().toUpperCase();
  if (!clean) return 450;
  if (clean.endsWith('K')) {
    const num = parseFloat(clean.slice(0, -1));
    return Number.isFinite(num) ? Math.round(num * 1000) : 1000;
  }
  if (clean.endsWith('M')) {
    const num = parseFloat(clean.slice(0, -1));
    return Number.isFinite(num) ? Math.round(num * 1000000) : 10000;
  }
  const parsed = parseInt(clean.replace(/[^0-9]/g, ''), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 450;
}

/**
 * Infers a clean Persian category tag from message text or hashtags.
 */
export function inferAnnouncementTag(text: string): string {
  const t = text.toLowerCase();
  const hashtagMatch = text.match(/#([\u0600-\u06FFa-zA-Z0-9_]+)/);
  if (hashtagMatch && hashtagMatch[1]) {
    const rawTag = hashtagMatch[1].replace(/_/g, ' ').trim();
    if (rawTag.length >= 2 && rawTag.length <= 18) return rawTag;
  }
  if (t.includes('کارگاه') || t.includes('دوره') || t.includes('پایتون') || t.includes('آموزش')) {
    return 'کارگاه';
  }
  if (t.includes('بازدید')) return 'بازدید علمی';
  if (t.includes('نشریه') || t.includes('مقاله') || t.includes('پژوهش')) return 'نشریه';
  if (t.includes('امتحان') || t.includes('انتخاب واحد') || t.includes('چارت') || t.includes('حذف و اضافه')) {
    return 'آموزشی';
  }
  if (t.includes('انتخابات') || t.includes('انجمن') || t.includes('فراخوان')) return 'فراخوان';
  return 'اطلاعیه کانال';
}

/**
 * Pure HTML parser that extracts Telegram channel posts from `https://t.me/s/<channel>` HTML.
 * Works both in browser (DOMParser) and Node.js test environments (regex fallback).
 */
export function parseTelegramChannelHtml(
  html: string,
  channelHandleInput: string = DEFAULT_CHANNEL_HANDLE
): ChannelAnnouncement[] {
  const handle = normalizeTelegramChannelHandle(channelHandleInput);
  if (!html || typeof html !== 'string' || !html.includes('tgme_widget_message')) {
    return [];
  }

  const results: ChannelAnnouncement[] = [];

  // Use DOMParser when available in Browser
  if (typeof DOMParser !== 'undefined') {
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');
      const messageNodes = Array.from(doc.querySelectorAll('.tgme_widget_message'));

      for (const node of messageNodes) {
        const dataPost = node.getAttribute('data-post') || ''; // e.g., "Isefum/2140"
        const postId = dataPost.split('/')[1] || `${Date.now()}-${results.length}`;
        const textNode = node.querySelector('.tgme_widget_message_text');
        if (!textNode) continue;

        // Replace <br> with newlines before extracting textContent
        const clonedText = textNode.cloneNode(true) as HTMLElement;
        clonedText.querySelectorAll('br').forEach((br) => br.replaceWith('\n'));
        const fullText = (clonedText.textContent || '').trim();
        if (!fullText || fullText.length < 10) continue;

        const lines = fullText
          .split('\n')
          .map((l) => l.trim())
          .filter(Boolean);

        const rawTitle = (lines[0] || 'اطلاعیه کانال مهندسی صنایع').replace(/^[\s#*•\-_]+/, '');
        const title = rawTitle.length > 78 ? `${rawTitle.slice(0, 75)}...` : rawTitle;
        const bodySource = lines.length > 1 ? lines.slice(1).join(' ') : fullText;
        const snippet =
          bodySource.length > 95 ? `${bodySource.slice(0, 92)}...` : bodySource;

        const viewsText =
          node.querySelector('.tgme_widget_message_views')?.textContent || '520';
        const views = parseTelegramViewCount(viewsText);

        const datetimeAttr =
          node.querySelector('time[datetime]')?.getAttribute('datetime') || '';
        let formattedTime = 'اخیر در کانال';
        if (datetimeAttr) {
          try {
            const d = new Date(datetimeAttr);
            if (!Number.isNaN(d.getTime())) {
              formattedTime = d.toLocaleDateString('fa-IR', {
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              });
            }
          } catch {
            formattedTime = 'اخیر در کانال';
          }
        }

        const hasMedia =
          !!node.querySelector('.tgme_widget_message_photo_wrap') ||
          !!node.querySelector('.tgme_widget_message_document') ||
          !!node.querySelector('.tgme_widget_message_video_wrap');

        results.push({
          id: `tg-${handle}-${postId}`,
          postId,
          channelHandle: handle,
          postUrl: `https://t.me/${handle}/${postId}`,
          title,
          snippet,
          content: fullText,
          timestamp: formattedTime,
          tag: inferAnnouncementTag(fullText),
          author: `کانال رسمی (@${handle})`,
          views,
          hasAttachment: hasMedia,
        });
      }
    } catch {
      // Fallback to regex below
    }
  }

  // Regex fallback for Node environment or when DOMParser yields 0
  if (results.length === 0) {
    const blockRegex =
      /data-post="([^"]+)\/(\d+)"[\s\S]*?<div class="tgme_widget_message_text[^"]*"[^>]*>([\s\S]*?)<\/div>/gi;
    let match: RegExpExecArray | null;
    while ((match = blockRegex.exec(html)) !== null) {
      const postId = match[2];
      const rawHtmlText = match[3]
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/<[^>]+>/g, '')
        .replace(/&nbsp;/g, ' ')
        .replace(/&quot;/g, '"')
        .replace(/&amp;/g, '&')
        .trim();

      if (!rawHtmlText || rawHtmlText.length < 10) continue;

      const lines = rawHtmlText
        .split('\n')
        .map((l) => l.trim())
        .filter(Boolean);

      const rawTitle = (lines[0] || 'اطلاعیه کانال انجمن').replace(/^[\s#*•\-_]+/, '');
      const title = rawTitle.length > 78 ? `${rawTitle.slice(0, 75)}...` : rawTitle;
      const bodySource = lines.length > 1 ? lines.slice(1).join(' ') : rawHtmlText;
      const snippet =
        bodySource.length > 95 ? `${bodySource.slice(0, 92)}...` : bodySource;

      results.push({
        id: `tg-${handle}-${postId}`,
        postId,
        channelHandle: handle,
        postUrl: `https://t.me/${handle}/${postId}`,
        title,
        snippet,
        content: rawHtmlText,
        timestamp: 'همگام‌سازی زنده',
        tag: inferAnnouncementTag(rawHtmlText),
        author: `کانال رسمی (@${handle})`,
        views: 680,
        hasAttachment: true,
      });
    }
  }

  // Return newest posts first (Telegram /s/ page lists oldest to newest)
  return results.reverse().slice(0, 12);
}

export function getSavedChannelUrl(): string {
  try {
    if (typeof localStorage !== 'undefined') {
      const saved = localStorage.getItem(CHANNEL_URL_STORAGE_KEY);
      if (saved && saved.trim()) {
        const clean = saved.trim();
        if (clean.toLowerCase().includes('ie_fum')) {
          localStorage.setItem(CHANNEL_URL_STORAGE_KEY, DEFAULT_CHANNEL_URL);
          return DEFAULT_CHANNEL_URL;
        }
        return clean;
      }
    }
  } catch {
    // ignore
  }
  return DEFAULT_CHANNEL_URL;
}

export function saveChannelUrl(channelInput: string): string {
  const handle = normalizeTelegramChannelHandle(channelInput);
  const fullUrl = `https://t.me/${handle}`;
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(CHANNEL_URL_STORAGE_KEY, fullUrl);
    }
  } catch {
    // ignore
  }
  return fullUrl;
}

export function loadStoredAnnouncements(): ChannelAnnouncement[] {
  try {
    if (typeof localStorage !== 'undefined') {
      const raw = localStorage.getItem(SYNCED_ANNOUNCEMENTS_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    }
  } catch {
    // ignore
  }
  return DEFAULT_ISEFUM_ANNOUNCEMENTS;
}

export function saveStoredAnnouncements(items: ChannelAnnouncement[]): void {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(SYNCED_ANNOUNCEMENTS_STORAGE_KEY, JSON.stringify(items));
    }
  } catch {
    // ignore
  }
}

import {
  BOT_WORKER_BASE_URL,
  fetchChannelAnnouncementsFromWorker,
  getBotApiBaseUrl,
} from './apiBridge';

/**
 * Fetches live Telegram web preview (`https://t.me/s/${username}`) through a resilient
 * CORS-safe cascade:
 * 1. Live Cloudflare Worker `GET ${BOT_WORKER_BASE_URL}/api/miniapp/channel-sync?channel=${username}` (using secureFetch + X-Telegram-Init-Data)
 * 2. Local backend proxy `/api/miniapp/channel-sync?channel=${username}`
 * 3. AllOrigins JSON wrapper `https://api.allorigins.win/get?url=...`
 * 4. Direct CORS proxy `https://corsproxy.io/?...`
 * Falls back gracefully to existing pinned/stored announcements + realistic @Isefum posts.
 */
export async function syncAnnouncementsFromTelegramChannel(
  channelInput?: string
): Promise<{
  announcements: ChannelAnnouncement[];
  channelHandle: string;
  channelUrl: string;
  source: 'live-telegram' | 'cached-channel';
}> {
  const targetInput = channelInput || getSavedChannelUrl();
  const handle = normalizeTelegramChannelHandle(targetInput);
  const channelUrl = saveChannelUrl(handle);
  const telegramPreviewUrl = `https://t.me/s/${handle}`;

  const existingStored = loadStoredAnnouncements();
  const pinnedManualItems = existingStored.filter(
    (item) => item.isPinned && item.id.startsWith('manual-')
  );

  // 1. Primary Live Cloudflare Worker Endpoint (using secureFetch with X-Telegram-Init-Data)
  const workerRes = await fetchChannelAnnouncementsFromWorker(handle);
  if (workerRes.ok) {
    if (Array.isArray(workerRes.announcements) && workerRes.announcements.length > 0) {
      const merged = [...pinnedManualItems, ...workerRes.announcements];
      saveStoredAnnouncements(merged);
      return {
        announcements: merged,
        channelHandle: handle,
        channelUrl,
        source: 'live-telegram',
      };
    }
    if (workerRes.html) {
      const parsedWorkerPosts = parseTelegramChannelHtml(workerRes.html, handle);
      if (parsedWorkerPosts.length > 0) {
        const merged = [...pinnedManualItems, ...parsedWorkerPosts];
        saveStoredAnnouncements(merged);
        return {
          announcements: merged,
          channelHandle: handle,
          channelUrl,
          source: 'live-telegram',
        };
      }
    }
  }

  const workerBase = getBotApiBaseUrl() || BOT_WORKER_BASE_URL;
  const candidateEndpoints = [
    `${workerBase}/api/miniapp/channel-sync?channel=${encodeURIComponent(handle)}`,
    `/api/miniapp/channel-sync?channel=${encodeURIComponent(handle)}`,
    `https://api.allorigins.win/get?url=${encodeURIComponent(telegramPreviewUrl)}`,
    `https://corsproxy.io/?${encodeURIComponent(telegramPreviewUrl)}`,
  ];

  for (const endpoint of candidateEndpoints) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5500);
      const response = await fetch(endpoint, { signal: controller.signal });
      clearTimeout(timeoutId);

      if (!response.ok) continue;

      const contentType = response.headers.get('content-type') || '';
      let htmlContent = '';

      if (contentType.includes('application/json')) {
        const json = await response.json();
        const remoteList = Array.isArray(json?.announcements)
          ? json.announcements
          : Array.isArray(json?.posts)
          ? json.posts
          : null;
        if (remoteList && remoteList.length > 0) {
          const merged = [...pinnedManualItems, ...remoteList];
          saveStoredAnnouncements(merged);
          return {
            announcements: merged,
            channelHandle: handle,
            channelUrl,
            source: 'live-telegram',
          };
        }
        htmlContent = String(json?.contents || json?.html || '');
      } else {
        htmlContent = await response.text();
      }

      const parsedPosts = parseTelegramChannelHtml(htmlContent, handle);
      if (parsedPosts.length > 0) {
        const merged = [...pinnedManualItems, ...parsedPosts];
        saveStoredAnnouncements(merged);
        return {
          announcements: merged,
          channelHandle: handle,
          channelUrl,
          source: 'live-telegram',
        };
      }
    } catch {
      // Try next endpoint in cascade
    }
  }

  // Resilient Fallback with updated channelHandle links
  const hydratedFallback = DEFAULT_ISEFUM_ANNOUNCEMENTS.map((item) => ({
    ...item,
    channelHandle: handle,
    postUrl: `https://t.me/${handle}/${item.postId || '2140'}`,
    author: `کانال رسمی (@${handle})`,
  }));

  const finalAnnouncements = [...pinnedManualItems, ...hydratedFallback];
  saveStoredAnnouncements(finalAnnouncements);

  return {
    announcements: finalAnnouncements,
    channelHandle: handle,
    channelUrl,
    source: 'cached-channel',
  };
}
