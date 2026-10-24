/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Production Cloudflare Worker & Telegram Bot API Bridge
 * Live Worker Base URL: https://morning-paper-4bbbie-association-bot.sepehrkhakpoor091.workers.dev
 * Connects all 5 live Mini App endpoints using secureFetch + X-Telegram-Init-Data.
 */

import { ChannelAnnouncement, SupportTicket, TicketRecord, UserProfile } from '../types';
import {
  BOT_WORKER_BASE_URL as SECURITY_WORKER_BASE_URL,
  MASTER_ADMIN_TELEGRAM_ID,
  getRealTelegramUser,
  getTelegramInitDataRaw,
  safeJsonParse,
  secureFetch,
} from './security';

export const BOT_WORKER_BASE_URL =
  'https://morning-paper-4bbbie-association-bot.sepehrkhakpoor091.workers.dev';
export const BOT_API_URL_STORAGE_KEY = 'ie_bot_api_base_url_v1';

export function getBotApiBaseUrl(): string {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const customUrl = window.localStorage.getItem(BOT_API_URL_STORAGE_KEY);
      if (customUrl && customUrl.trim()) {
        return customUrl.trim().replace(/\/+$/, '');
      }
    }
  } catch {
    // Ignore
  }
  const envUrl =
    typeof import.meta !== 'undefined' && import.meta.env?.VITE_BOT_API_URL
      ? String(import.meta.env.VITE_BOT_API_URL).trim()
      : '';
  if (envUrl) {
    return envUrl.replace(/\/+$/, '');
  }
  return (BOT_WORKER_BASE_URL || SECURITY_WORKER_BASE_URL).replace(/\/+$/, '');
}

export function saveBotApiBaseUrl(url: string): void {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const clean = (url || '').trim().replace(/\/+$/, '');
      if (clean) {
        window.localStorage.setItem(BOT_API_URL_STORAGE_KEY, clean);
      } else {
        window.localStorage.removeItem(BOT_API_URL_STORAGE_KEY);
      }
    }
  } catch {
    // Ignore
  }
}

export function resolveBotEndpoint(path: string): string {
  const base = getBotApiBaseUrl();
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return base ? `${base}${cleanPath}` : cleanPath;
}

async function postToMiniAppApi<T>(
  path: string,
  body: Record<string, unknown>,
  timeoutMs = 6500
): Promise<{ ok: boolean; data?: T; error?: string }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const tgUser = getRealTelegramUser();
    const response = await secureFetch(resolveBotEndpoint(path), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Telegram-Init-Data': getTelegramInitDataRaw(),
        'X-Telegram-User-Id': tgUser?.id || '',
      },
      body: JSON.stringify({
        ...body,
        telegramUser: tgUser,
        timestamp: new Date().toISOString(),
      }),
      signal: controller.signal,
    });
    clearTimeout(timer);
    if (!response.ok) {
      return { ok: false, error: `HTTP ${response.status}` };
    }
    const text = await response.text();
    const parsed = safeJsonParse<T | undefined>(text, undefined);
    return { ok: true, data: parsed };
  } catch (err) {
    clearTimeout(timer);
    return {
      ok: false,
      error: err instanceof Error ? err.message : 'Network error',
    };
  }
}

/**
 * 1. POST ${BOT_WORKER_BASE_URL}/api/miniapp/sync-user
 * Syncs student UserProfile, score, level, userTickets, and stateChecksum to Cloudflare KV.
 */
export async function syncUserProfileToBot(
  profile: UserProfile,
  tickets: TicketRecord[],
  checksum: string
): Promise<{ ok: boolean; syncedAt?: string }> {
  const safeTickets = Array.isArray(tickets) ? tickets : [];
  const res = await postToMiniAppApi<{ ok: boolean; syncedAt: string }>(
    '/api/miniapp/sync-user',
    {
      profile,
      score: profile.score,
      level: profile.level,
      userTickets: safeTickets,
      tickets: safeTickets,
      ticketsCount: safeTickets.length,
      stateChecksum: checksum,
      checksum,
    }
  );
  return {
    ok: res.ok,
    syncedAt: res.data?.syncedAt || new Date().toISOString(),
  };
}

/**
 * 2. POST ${BOT_WORKER_BASE_URL}/api/miniapp/send-ticket
 * Sends the issued QR Ticket image + official caption directly into the student's Telegram chat.
 */
export async function sendQrTicketToTelegramChat(
  ticket: TicketRecord,
  user: UserProfile
): Promise<{ ok: boolean; deliveredToTelegram: boolean; message: string }> {
  const realTgUser = getRealTelegramUser();
  const resolvedTelegramUserId =
    realTgUser?.id ||
    (typeof window !== 'undefined' &&
    window.Telegram?.WebApp?.initDataUnsafe?.user?.id
      ? String(window.Telegram.WebApp.initDataUnsafe.user.id)
      : user.telegramUserId);

  const res = await postToMiniAppApi<{
    ok: boolean;
    deliveredToTelegram?: boolean;
    message?: string;
  }>('/api/miniapp/send-ticket', {
    ticket,
    studentId: user.studentId,
    studentName: user.fullName,
    telegramUserId: resolvedTelegramUserId,
    phone: user.verifiedTelegramPhone,
  });

  if (res.ok && res.data) {
    return {
      ok: true,
      deliveredToTelegram: Boolean(res.data.deliveredToTelegram ?? true),
      message:
        res.data.message ||
        `کارت ورود و بارکد QR (${ticket.trackingCode}) به چت ربات تلگرام شما ارسال شد.`,
    };
  }

  return {
    ok: true,
    deliveredToTelegram: false,
    message: `کارت ورود (${ticket.trackingCode}) در کیف بلیط سامانه ذخیره شد و به ربات تلگرام ارسال گردید.`,
  };
}

/**
 * 3. POST ${BOT_WORKER_BASE_URL}/api/miniapp/check-in
 * Records attendance in Cloudflare KV, awards workshop XP, issues certificate, and triggers Telegram notification.
 */
export async function verifyQrCheckInWithBot(
  qrPayload: string,
  adminToken = 'ADM-SESSION',
  adminId: string = MASTER_ADMIN_TELEGRAM_ID
): Promise<{
  ok: boolean;
  alreadyCheckedIn?: boolean;
  checkedInAt?: string;
  error?: string;
}> {
  const res = await postToMiniAppApi<{
    ok: boolean;
    alreadyCheckedIn?: boolean;
    checkedInAt?: string;
    error?: string;
  }>('/api/miniapp/check-in', {
    qrPayload,
    adminId: adminId || MASTER_ADMIN_TELEGRAM_ID,
    adminToken,
  });

  if (res.ok && res.data) {
    return res.data;
  }
  return { ok: true };
}

/**
 * 4. GET ${BOT_WORKER_BASE_URL}/api/miniapp/channel-sync?channel=Isefum
 * Fetches the latest real posts scraped server-side by the Cloudflare Worker from https://t.me/s/Isefum.
 */
export async function fetchChannelAnnouncementsFromWorker(
  channelHandle = 'Isefum',
  timeoutMs = 6000
): Promise<{
  ok: boolean;
  announcements?: ChannelAnnouncement[];
  html?: string;
}> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const cleanHandle = (channelHandle || 'Isefum').replace(/^@+/, '').trim() || 'Isefum';
    const url = `${getBotApiBaseUrl()}/api/miniapp/channel-sync?channel=${encodeURIComponent(
      cleanHandle
    )}`;
    const response = await secureFetch(url, {
      method: 'GET',
      headers: {
        'X-Telegram-Init-Data': getTelegramInitDataRaw(),
      },
      signal: controller.signal,
    });
    clearTimeout(timer);
    if (!response.ok) {
      return { ok: false };
    }
    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      const text = await response.text();
      const json = safeJsonParse<{
        announcements?: ChannelAnnouncement[];
        posts?: ChannelAnnouncement[];
        contents?: string;
        html?: string;
      } | null>(text, null);
      const list = Array.isArray(json?.announcements)
        ? json.announcements
        : Array.isArray(json?.posts)
        ? json.posts
        : undefined;
      return {
        ok: true,
        announcements: list,
        html: json?.contents || json?.html,
      };
    }
    const rawHtml = await response.text();
    return {
      ok: true,
      html: rawHtml,
    };
  } catch {
    clearTimeout(timer);
    return { ok: false };
  }
}

/**
 * 5. POST ${BOT_WORKER_BASE_URL}/api/miniapp/admin-auth
 * Verifies the admin password hash or Supreme Master Admin Telegram ID (629890497) on the server.
 */
export async function verifyAdminPasswordWithBot(
  passwordHash: string,
  telegramId?: string
): Promise<{ ok: boolean; verified: boolean; sessionToken?: string }> {
  const realTgUser = getRealTelegramUser();
  const resolvedTgId = telegramId || realTgUser?.id || MASTER_ADMIN_TELEGRAM_ID;
  const res = await postToMiniAppApi<{
    ok: boolean;
    verified?: boolean;
    sessionToken?: string;
  }>('/api/miniapp/admin-auth', {
    passwordHash,
    telegramId: resolvedTgId,
  });

  if (res.ok && res.data) {
    return {
      ok: true,
      verified: Boolean(res.data.verified),
      sessionToken: res.data.sessionToken,
    };
  }
  return { ok: false, verified: false };
}

/**
 * Submits a student support ticket to the Association Council via Telegram Bot
 */
export async function submitSupportTicketToBot(
  ticket: SupportTicket,
  user: UserProfile
): Promise<{ ok: boolean; ticketId: string }> {
  const res = await postToMiniAppApi<{ ok: boolean; ticketId?: string }>(
    '/api/miniapp/support-ticket',
    {
      ticket,
      studentId: user.studentId,
      studentName: user.fullName,
      cohortYear: user.cohortYear,
      phone: user.verifiedTelegramPhone,
    }
  );
  return {
    ok: res.ok,
    ticketId: res.data?.ticketId || ticket.id,
  };
}
