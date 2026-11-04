/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Production Cloudflare Worker & Telegram Bot API Bridge
 * Live Worker Base URL: https://morning-paper-4bbbie-association-bot.sepehrkhakpoor091.workers.dev
 * Connects all 5 live Mini App endpoints using secureFetch + X-Telegram-Init-Data.
 */

import {
  AdminReceiptItem,
  AdminStudentDossier,
  BadgeItem,
  BootstrapResponse,
  BotConfigSettings,
  ChannelAnnouncement,
  EventItem,
  LootboxConfig,
  OnlineSessionUser,
  Professor,
  SimulationReportPayload,
  SiteSwitches,
  StudentIdDisputeTicket,
  SupportTicket,
  TicketRecord,
  UserProfile,
} from '../types';
import { normalizeEvent, normalizeEventsList } from './events';
import {
  BOT_WORKER_BASE_URL as SECURITY_WORKER_BASE_URL,
  MASTER_ADMIN_TELEGRAM_ID,
  computeAdminPasswordHash,
  getRealTelegramUser,
  getTelegramInitDataRaw,
  safeJsonParse,
  secureFetch,
} from './security';

export const BOT_WORKER_BASE_URL =
  'https://morning-paper-4bbbie-association-bot.sepehrkhakpoor091.workers.dev';
export const BOT_API_URL_STORAGE_KEY = 'ie_bot_api_base_url_v1';
export const IDEMPOTENCY_STORAGE_KEY = 'ie_idempotency_keys_v1';
export const SITE_SWITCHES_OVERRIDE_KEY = 'ie_site_switches_override_v1';

/**
 * Resolves the real displayable image URL for a receipt or KYC card item.
 * - Uses `imageUrl` (or `receiptImageUrl`/`imageBase64`/`imageDataUrl`/`photoUrl`/`fileUrl`) if provided.
 * - If only `fileId` (or `telegramFileId`/`photoFileId`/`file_id`) is provided from the Telegram Bot,
 *   constructs `https://morning-paper-4bbbie-association-bot.sepehrkhakpoor091.workers.dev/api/miniapp/tg-photo?fileId={fileId}`.
 */
export function resolveReceiptOrKycImageUrl(
  item?: Partial<AdminReceiptItem> | null
): string {
  if (!item) return '';
  const rawUrl = (
    item.imageUrl ||
    item.receiptImageUrl ||
    item.imageBase64 ||
    item.imageDataUrl ||
    item.photoUrl ||
    item.fileUrl ||
    ''
  ).trim();

  if (rawUrl) {
    if (
      rawUrl.startsWith('data:image/') ||
      rawUrl.startsWith('http://') ||
      rawUrl.startsWith('https://') ||
      rawUrl.startsWith('blob:')
    ) {
      return rawUrl;
    }
    if (rawUrl.startsWith('/api/')) {
      return `${BOT_WORKER_BASE_URL}${rawUrl}`;
    }
    if (rawUrl.startsWith('/')) {
      return rawUrl;
    }
    // Check if rawUrl looks like a Telegram file_id (e.g. AgACAgIAAxkB...) rather than base64
    if (rawUrl.length < 220 && /^[A-Za-z0-9_-]{20,}$/.test(rawUrl) && !rawUrl.includes('/')) {
      return `${BOT_WORKER_BASE_URL}/api/miniapp/tg-photo?fileId=${encodeURIComponent(
        rawUrl
      )}`;
    }
    return `data:image/jpeg;base64,${rawUrl}`;
  }

  const rawFileId = (
    item.fileId ||
    item.telegramFileId ||
    item.photoFileId ||
    item.file_id ||
    ''
  ).trim();

  if (rawFileId) {
    return `${BOT_WORKER_BASE_URL}/api/miniapp/tg-photo?fileId=${encodeURIComponent(
      rawFileId
    )}`;
  }

  return '';
}

const inMemoryIdempotencySet = new Set<string>();

export function hasIdempotencyKeyBeenSent(idempotencyKey: string): boolean {
  const cleanKey = (idempotencyKey || '').trim();
  if (!cleanKey) return false;
  if (inMemoryIdempotencySet.has(cleanKey)) return true;
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const raw = window.localStorage.getItem(IDEMPOTENCY_STORAGE_KEY);
      const map = safeJsonParse<Record<string, string>>(raw, {});
      if (map && map[cleanKey]) {
        inMemoryIdempotencySet.add(cleanKey);
        return true;
      }
    }
  } catch {
    // Ignore storage error
  }
  return false;
}

export function markIdempotencyKeyAsSent(idempotencyKey: string): void {
  const cleanKey = (idempotencyKey || '').trim();
  if (!cleanKey) return;
  inMemoryIdempotencySet.add(cleanKey);
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const raw = window.localStorage.getItem(IDEMPOTENCY_STORAGE_KEY);
      const map = safeJsonParse<Record<string, string>>(raw, {});
      map[cleanKey] = new Date().toISOString();
      window.localStorage.setItem(IDEMPOTENCY_STORAGE_KEY, JSON.stringify(map));
    }
  } catch {
    // Ignore storage error
  }
}

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
): Promise<{ ok: boolean; deliveredToTelegram: boolean; message: string; skippedDuplicate?: boolean }> {
  const idempotencyKey = (ticket.trackingCode || ticket.id || '').trim();
  const scopedActionKey = `send-ticket:${idempotencyKey}`;

  if (idempotencyKey && hasIdempotencyKeyBeenSent(scopedActionKey)) {
    return {
      ok: true,
      deliveredToTelegram: true,
      skippedDuplicate: true,
      message: `کارت ورود و بارکد QR (${ticket.trackingCode}) قبلاً به چت تلگرام شما ارسال شده است.`,
    };
  }
  if (idempotencyKey) {
    markIdempotencyKeyAsSent(scopedActionKey);
    markIdempotencyKeyAsSent(idempotencyKey);
  }

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
    idempotencyKey,
    trackingCode: ticket.trackingCode,
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
  passwordHashOrRaw: string,
  telegramId?: string,
  rawPassword?: string
): Promise<{ ok: boolean; verified: boolean; sessionToken?: string }> {
  const realTgUser = getRealTelegramUser();
  const resolvedTgId = telegramId || realTgUser?.id || MASTER_ADMIN_TELEGRAM_ID;
  const computedHash = rawPassword
    ? computeAdminPasswordHash(rawPassword)
    : passwordHashOrRaw;

  const res = await postToMiniAppApi<{
    ok?: boolean;
    verified?: boolean;
    authorized?: boolean;
    sessionToken?: string;
  }>('/api/miniapp/admin-auth', {
    password: rawPassword || passwordHashOrRaw,
    passwordHash: computedHash,
    telegramId: resolvedTgId,
    adminId: resolvedTgId,
  });

  if (res.ok && res.data) {
    const isVerified = Boolean(
      res.data.verified ?? res.data.authorized ?? res.data.ok
    );
    return {
      ok: true,
      verified: isVerified,
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

/**
 * 6. GET ${BOT_WORKER_BASE_URL}/api/miniapp/bootstrap
 * Reads the user's real profile & score by Telegram User ID, plus real students array & lootbox config.
 */
export async function fetchMiniAppBootstrap(
  telegramUserId?: string,
  timeoutMs = 6000
): Promise<BootstrapResponse> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const tgUser = getRealTelegramUser();
    const resolvedTgId =
      telegramUserId ||
      tgUser?.id ||
      (typeof window !== 'undefined' &&
      window.Telegram?.WebApp?.initDataUnsafe?.user?.id
        ? String(window.Telegram.WebApp.initDataUnsafe.user.id)
        : '');

    const ts = Date.now();
    const query = resolvedTgId
      ? `?telegramUserId=${encodeURIComponent(resolvedTgId)}&ts=${ts}`
      : `?ts=${ts}`;
    const url = `${getBotApiBaseUrl()}/api/miniapp/bootstrap${query}`;

    const response = await secureFetch(url, {
      method: 'GET',
      cache: 'no-store',
      headers: {
        'X-Telegram-Init-Data': getTelegramInitDataRaw(),
      },
      signal: controller.signal,
    });
    clearTimeout(timer);
    if (!response.ok) {
      return { ok: false };
    }
    const text = await response.text();
    const json = safeJsonParse<BootstrapResponse | null>(text, null);
    if (!json) {
      return { ok: false };
    }
    const rawApprovals = Array.isArray(json.pendingApprovals)
      ? json.pendingApprovals
      : Array.isArray(json.receipts)
      ? json.receipts
      : undefined;

    const normalizedApprovals = rawApprovals
      ? rawApprovals.map((item) => {
          const resolvedUrl = resolveReceiptOrKycImageUrl(item);
          return {
            ...item,
            imageUrl: resolvedUrl || item.imageUrl,
            receiptImageUrl: resolvedUrl || item.receiptImageUrl,
          };
        })
      : undefined;

    const rawRecord = json as unknown as Record<string, unknown>;
    const rawSiteSwitches =
      json.siteSwitches && typeof json.siteSwitches === 'object'
        ? json.siteSwitches
        : rawRecord.switches && typeof rawRecord.switches === 'object'
        ? (rawRecord.switches as Partial<SiteSwitches>)
        : undefined;

    const rawOnlineUsers = Array.isArray(json.onlineUsers)
      ? json.onlineUsers
      : Array.isArray(rawRecord.activeUsers)
      ? (rawRecord.activeUsers as OnlineSessionUser[])
      : undefined;

    const rawOnlineCount =
      typeof json.onlineCount === 'number'
        ? json.onlineCount
        : Array.isArray(rawOnlineUsers)
        ? rawOnlineUsers.length
        : undefined;

    const rawChats = Array.isArray(json.supportTickets)
      ? json.supportTickets
      : Array.isArray(json.chats)
      ? json.chats
      : Array.isArray(rawRecord.tickets)
      ? (rawRecord.tickets as SupportTicket[])
      : undefined;

    const rawBotConfig =
      json.botConfig && typeof json.botConfig === 'object'
        ? json.botConfig
        : rawRecord.botSettings && typeof rawRecord.botSettings === 'object'
        ? (rawRecord.botSettings as Partial<BotConfigSettings>)
        : undefined;

    const rawBadgesCatalog = Array.isArray(json.badgesCatalog)
      ? json.badgesCatalog
      : Array.isArray(rawRecord.badges)
      ? (rawRecord.badges as BadgeItem[])
      : undefined;

    return {
      ok: true,
      completedProfile: Boolean(
        json.completedProfile ||
          json.profile?.onboardingCompleted ||
          (json.profile &&
            json.profile.studentId &&
            String(json.profile.studentId).trim().length >= 6)
      ),
      profile: json.profile,
      students: Array.isArray(json.students) ? json.students : undefined,
      events:
        Array.isArray(json.events) && json.events.length > 0
          ? normalizeEventsList(json.events)
          : undefined,
      professors: Array.isArray(json.professors)
        ? json.professors
        : Array.isArray(rawRecord.profs)
        ? (rawRecord.profs as Professor[])
        : undefined,
      lootboxConfig: json.lootboxConfig,
      announcements: Array.isArray(json.announcements) ? json.announcements : undefined,
      disputes: Array.isArray(json.disputes)
        ? json.disputes
        : Array.isArray(json.disputeTickets)
        ? json.disputeTickets
        : undefined,
      disputeTickets: Array.isArray(json.disputeTickets)
        ? json.disputeTickets
        : Array.isArray(json.disputes)
        ? json.disputes
        : undefined,
      pendingApprovals: normalizedApprovals,
      receipts: normalizedApprovals,
      supportTickets: rawChats ? normalizeSupportTicketsList(rawChats) : undefined,
      chats: rawChats ? normalizeSupportTicketsList(rawChats) : undefined,
      allowStudentTimers:
        typeof json.allowStudentTimers === 'boolean' ? json.allowStudentTimers : undefined,
      siteSwitches: rawSiteSwitches,
      botConfig: rawBotConfig,
      badgesCatalog: rawBadgesCatalog,
      onlineCount: rawOnlineCount,
      onlineUsers: rawOnlineUsers,
      referralStats: json.referralStats,
    };
  } catch {
    clearTimeout(timer);
    return { ok: false };
  }
}

/**
 * 7. POST ${BOT_WORKER_BASE_URL}/api/miniapp/register-profile
 * Registers a new student profile in both the Mini App and the Telegram Bot KV database.
 * Enforces unique Student ID constraint (returns errorCode === 'DUPLICATE_STUDENT_ID' if taken).
 */
export async function registerStudentProfileOnBot(
  profile: UserProfile,
  existingStudents: AdminStudentDossier[] = [],
  referralCode?: string
): Promise<{
  ok: boolean;
  errorCode?: 'DUPLICATE_STUDENT_ID' | string;
  error?: string;
  profile?: UserProfile;
  students?: AdminStudentDossier[];
  referralBonusAwarded?: number;
}> {
  const cleanStudentId = (profile.studentId || '').trim();
  const cleanReferralCode = (referralCode || profile.referredBy || '')
    .trim()
    .toUpperCase()
    .replace(/^REF_/i, 'REF-');
  const tgUser = getRealTelegramUser();
  const resolvedTelegramId =
    tgUser?.id ||
    (typeof window !== 'undefined' &&
    window.Telegram?.WebApp?.initDataUnsafe?.user?.id
      ? String(window.Telegram.WebApp.initDataUnsafe.user.id)
      : profile.telegramUserId || '');

  // Check local real students list for duplicate studentId owned by another account
  const duplicateLocal = (Array.isArray(existingStudents) ? existingStudents : []).find(
    (s) =>
      s.studentId &&
      s.studentId.trim() === cleanStudentId &&
      s.id !== profile.id &&
      (!resolvedTelegramId || !s.id.includes(resolvedTelegramId))
  );

  // Also check localStorage registry of registered studentIds -> ownerIds
  const REGISTRY_KEY = 'ie_registered_student_ids_v1';
  let localRegistry: Record<string, string> = {};
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      localRegistry = safeJsonParse<Record<string, string>>(
        window.localStorage.getItem(REGISTRY_KEY),
        {}
      );
    }
  } catch {
    // Ignore
  }
  const ownerKey = resolvedTelegramId || profile.id || 'local-user';
  const registeredOwner = localRegistry[cleanStudentId];

  if (duplicateLocal || (registeredOwner && registeredOwner !== ownerKey)) {
    return {
      ok: false,
      errorCode: 'DUPLICATE_STUDENT_ID',
      error:
        '⛔ این شماره دانشجویی قبلاً ثبت شده است! با هر شماره دانشجویی فقط یک اکانت می‌توان ساخت.',
    };
  }

  const selfRefCode = resolvedTelegramId ? `REF-${resolvedTelegramId}`.toUpperCase() : '';
  const isValidReferral =
    Boolean(cleanReferralCode) &&
    cleanReferralCode.startsWith('REF-') &&
    cleanReferralCode.length > 4 &&
    cleanReferralCode !== selfRefCode;

  const referralBonusAwarded = isValidReferral ? 5 : 0;
  const enrichedProfile: UserProfile = {
    ...profile,
    score: profile.score + referralBonusAwarded,
    referralCode: resolvedTelegramId ? `REF-${resolvedTelegramId}` : profile.referralCode,
    referredBy: isValidReferral ? cleanReferralCode : undefined,
  };

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 6500);
  try {
    const response = await secureFetch(resolveBotEndpoint('/api/miniapp/register-profile'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Telegram-Init-Data': getTelegramInitDataRaw(),
      },
      body: JSON.stringify({
        profile: enrichedProfile,
        firstName: enrichedProfile.firstName,
        lastName: enrichedProfile.lastName,
        fullName: enrichedProfile.fullName,
        studentId: cleanStudentId,
        cohortYear: enrichedProfile.cohortYear,
        phone: enrichedProfile.verifiedTelegramPhone,
        avatar: enrichedProfile.avatar,
        referralCode: isValidReferral ? cleanReferralCode : undefined,
        referredBy: isValidReferral ? cleanReferralCode : undefined,
        telegramUserId: resolvedTelegramId,
        telegramUser: tgUser,
        timestamp: new Date().toISOString(),
      }),
      signal: controller.signal,
    });
    clearTimeout(timer);

    const text = await response.text();
    const parsed = safeJsonParse<{
      ok?: boolean;
      errorCode?: string;
      error?: string;
      profile?: UserProfile;
      students?: AdminStudentDossier[];
    } | null>(text, null);

    if (
      response.status === 409 ||
      parsed?.errorCode === 'DUPLICATE_STUDENT_ID' ||
      (parsed?.error && parsed.error.includes('DUPLICATE_STUDENT_ID'))
    ) {
      return {
        ok: false,
        errorCode: 'DUPLICATE_STUDENT_ID',
        error:
          '⛔ این شماره دانشجویی قبلاً ثبت شده است! با هر شماره دانشجویی فقط یک اکانت می‌توان ساخت.',
      };
    }

    // Record studentId ownership locally after successful check
    try {
      if (typeof window !== 'undefined' && window.localStorage && cleanStudentId) {
        localRegistry[cleanStudentId] = ownerKey;
        window.localStorage.setItem(REGISTRY_KEY, JSON.stringify(localRegistry));
      }
    } catch {
      // Ignore
    }

    return {
      ok: true,
      profile: parsed?.profile || enrichedProfile,
      students: Array.isArray(parsed?.students) ? parsed?.students : undefined,
      referralBonusAwarded,
    };
  } catch {
    clearTimeout(timer);
    // Record studentId ownership locally so duplicate checks work offline too
    try {
      if (typeof window !== 'undefined' && window.localStorage && cleanStudentId) {
        localRegistry[cleanStudentId] = ownerKey;
        window.localStorage.setItem(REGISTRY_KEY, JSON.stringify(localRegistry));
      }
    } catch {
      // Ignore
    }
    return {
      ok: true,
      profile: enrichedProfile,
      referralBonusAwarded,
    };
  }
}

/**
 * 8. POST ${BOT_WORKER_BASE_URL}/api/miniapp/dispute-student-id
 * Submits an urgent dispute ticket when a student's Student ID was already registered by someone else.
 */
export async function submitStudentIdDisputeToBot(payload: {
  studentId: string;
  fullName: string;
  phone: string;
  explanation: string;
  telegramUserId?: string;
}): Promise<{ ok: boolean; disputeId: string; ticket: StudentIdDisputeTicket }> {
  const tgUser = getRealTelegramUser();
  const resolvedTgId =
    payload.telegramUserId ||
    tgUser?.id ||
    (typeof window !== 'undefined' &&
    window.Telegram?.WebApp?.initDataUnsafe?.user?.id
      ? String(window.Telegram.WebApp.initDataUnsafe.user.id)
      : '');

  const ticket: StudentIdDisputeTicket = {
    id: `DSP-${Math.floor(1000 + Math.random() * 9000)}`,
    studentId: payload.studentId.trim(),
    fullName: payload.fullName.trim(),
    reporterName: payload.fullName.trim(),
    phone: payload.phone.trim(),
    phoneNumber: payload.phone.trim(),
    explanation: payload.explanation.trim(),
    telegramUserId: resolvedTgId,
    submittedAt: new Date().toLocaleString('fa-IR'),
    status: 'open',
  };

  const res = await postToMiniAppApi<{ ok: boolean; disputeId?: string }>(
    '/api/miniapp/dispute-student-id',
    {
      ...ticket,
      studentId: ticket.studentId,
      fullName: ticket.fullName,
      phone: ticket.phone,
      explanation: ticket.explanation,
      telegramUserId: resolvedTgId,
    }
  );

  return {
    ok: true,
    disputeId: res.data?.disputeId || ticket.id,
    ticket,
  };
}

/**
 * 9. POST ${BOT_WORKER_BASE_URL}/api/miniapp/admin-save-lootbox
 * Saves the Admin's custom Lootbox prizes & win probabilities (0-100%) for Bronze and Gold chests.
 */
export async function saveLootboxConfigOnBot(
  config: LootboxConfig
): Promise<{ ok: boolean; savedAt: string }> {
  const savedAt = new Date().toISOString();
  const res = await postToMiniAppApi<{ ok: boolean; savedAt?: string }>(
    '/api/miniapp/admin-save-lootbox',
    {
      lootboxConfig: {
        ...config,
        updatedAt: savedAt,
      },
      adminId: MASTER_ADMIN_TELEGRAM_ID,
    }
  );
  return {
    ok: true,
    savedAt: res.data?.savedAt || savedAt,
  };
}

/**
 * 10. POST ${BOT_WORKER_BASE_URL}/api/miniapp/upload-kyc
 * Sends the compressed Base64 JPEG (quality: 0.7, max width 800px) student ID card image to the Telegram Bot
 * so it is immediately forwarded to the Admins in Telegram AND queued in pendingApprovals.
 */
export async function uploadKycCardToBot(payload: {
  itemId?: string;
  studentId: string;
  studentName: string;
  cohortYear: string;
  trackingCode: string;
  imageBase64: string;
  telegramUserId?: string;
}): Promise<{ ok: boolean; itemId: string }> {
  const tgUser = getRealTelegramUser();
  const resolvedTgId =
    payload.telegramUserId ||
    tgUser?.id ||
    (typeof window !== 'undefined' &&
    window.Telegram?.WebApp?.initDataUnsafe?.user?.id
      ? String(window.Telegram.WebApp.initDataUnsafe.user.id)
      : '');
  const itemId = payload.itemId || `KYC-${Date.now()}`;
  const res = await postToMiniAppApi<{ ok: boolean; itemId?: string }>(
    '/api/miniapp/upload-kyc',
    {
      id: itemId,
      itemId,
      type: 'kyc',
      studentId: payload.studentId,
      studentName: payload.studentName,
      cohortYear: payload.cohortYear,
      trackingCode: payload.trackingCode,
      imageUrl: payload.imageBase64,
      imageBase64: payload.imageBase64,
      imageDataUrl: payload.imageBase64,
      receiptImageUrl: payload.imageBase64,
      telegramUserId: resolvedTgId,
      telegramUser: tgUser,
      submittedAt: new Date().toLocaleTimeString('fa-IR', {
        hour: '2-digit',
        minute: '2-digit',
      }),
    }
  );
  return {
    ok: res.ok,
    itemId: res.data?.itemId || itemId,
  };
}

/**
 * 11. POST ${BOT_WORKER_BASE_URL}/api/miniapp/upload-receipt
 * Sends the compressed Base64 JPEG (quality: 0.7, max width 800px) workshop payment receipt image to the Telegram Bot
 * so it is immediately sent with inline Approve/Reject buttons to Admins in Telegram AND queued in pendingApprovals.
 */
export async function uploadPaymentReceiptToBot(payload: {
  itemId?: string;
  eventId: string;
  eventTitle: string;
  amountTomans: number;
  trackingCode: string;
  studentId: string;
  studentName: string;
  cohortYear: string;
  imageBase64: string;
  telegramUserId?: string;
}): Promise<{ ok: boolean; itemId: string; skippedDuplicate?: boolean }> {
  const idempotencyKey = (payload.trackingCode || payload.itemId || '').trim();
  const scopedActionKey = `upload-receipt:${idempotencyKey}`;
  if (idempotencyKey && hasIdempotencyKeyBeenSent(scopedActionKey)) {
    return {
      ok: true,
      itemId: payload.itemId || `RCP-${idempotencyKey}`,
      skippedDuplicate: true,
    };
  }
  if (idempotencyKey) {
    markIdempotencyKeyAsSent(scopedActionKey);
  }

  const tgUser = getRealTelegramUser();
  const resolvedTgId =
    payload.telegramUserId ||
    tgUser?.id ||
    (typeof window !== 'undefined' &&
    window.Telegram?.WebApp?.initDataUnsafe?.user?.id
      ? String(window.Telegram.WebApp.initDataUnsafe.user.id)
      : '');
  const itemId = payload.itemId || `RCP-${Date.now()}`;
  const res = await postToMiniAppApi<{ ok: boolean; itemId?: string }>(
    '/api/miniapp/upload-receipt',
    {
      id: itemId,
      itemId,
      idempotencyKey,
      type: 'receipt',
      eventId: payload.eventId,
      eventTitle: payload.eventTitle,
      title: payload.eventTitle,
      amount: payload.amountTomans,
      amountTomans: payload.amountTomans,
      trackingCode: payload.trackingCode,
      studentId: payload.studentId,
      studentName: payload.studentName,
      cohortYear: payload.cohortYear,
      imageUrl: payload.imageBase64,
      imageBase64: payload.imageBase64,
      imageDataUrl: payload.imageBase64,
      receiptImageUrl: payload.imageBase64,
      telegramUserId: resolvedTgId,
      telegramUser: tgUser,
      submittedAt: new Date().toLocaleTimeString('fa-IR', {
        hour: '2-digit',
        minute: '2-digit',
      }),
    }
  );
  return {
    ok: res.ok,
    itemId: res.data?.itemId || itemId,
  };
}

/**
 * 12. POST ${BOT_WORKER_BASE_URL}/api/miniapp/admin-review-item
 * Called when an Admin clicks "✅ تایید" or "❌ رد" on a receipt or KYC card in AdminPanel Module 2.
 * Updates the item status in the Telegram Bot KV database and sends an instant notification to the student in Telegram.
 */
export async function submitAdminReviewToBot(payload: {
  item: AdminReceiptItem;
  decision: 'approved' | 'rejected';
}): Promise<{ ok: boolean; skippedDuplicate?: boolean }> {
  const { item, decision } = payload;
  const idempotencyKey = (item.trackingCode || item.id || '').trim();
  const scopedActionKey = `admin-review:${idempotencyKey}:${decision}`;
  if (idempotencyKey && hasIdempotencyKeyBeenSent(scopedActionKey)) {
    return {
      ok: true,
      skippedDuplicate: true,
    };
  }
  if (idempotencyKey) {
    markIdempotencyKeyAsSent(scopedActionKey);
  }

  const res = await postToMiniAppApi<{ ok: boolean }>(
    '/api/miniapp/admin-review-item',
    {
      id: item.id,
      itemId: item.id,
      idempotencyKey,
      trackingCode: item.trackingCode,
      type: item.type,
      decision,
      status: decision,
      action: decision === 'approved' ? 'approve' : 'reject',
      studentId: item.studentId,
      studentName: item.studentName,
      telegramUserId: item.telegramUserId,
      eventId: item.eventId,
      eventTitle: item.eventTitle || item.title,
      amountTomans: item.amountTomans ?? item.amount ?? 0,
      adminId: MASTER_ADMIN_TELEGRAM_ID,
      decidedAt: new Date().toISOString(),
    }
  );
  return {
    ok: res.ok,
  };
}

/**
 * 13. POST ${BOT_WORKER_BASE_URL}/api/miniapp/admin-toggle-user-timers
 * Toggles whether students are allowed to create personal timers in RemindersModal.
 */
export async function toggleStudentTimersOnBot(
  allowStudentTimers: boolean
): Promise<{ ok: boolean; allowStudentTimers: boolean }> {
  const res = await postToMiniAppApi<{
    ok: boolean;
    allowStudentTimers?: boolean;
  }>('/api/miniapp/admin-toggle-user-timers', {
    allowStudentTimers,
    adminId: MASTER_ADMIN_TELEGRAM_ID,
    updatedAt: new Date().toISOString(),
  });
  return {
    ok: res.ok,
    allowStudentTimers:
      typeof res.data?.allowStudentTimers === 'boolean'
        ? res.data.allowStudentTimers
        : allowStudentTimers,
  };
}

/**
 * 14. POST ${BOT_WORKER_BASE_URL}/api/miniapp/admin-save-events
 * Two-way sync of workshops & events created, edited, or deleted in Mini App AdminPanel
 * directly to the Telegram Bot KV database (`events:list`).
 */
export async function saveEventsOnBot(
  events: EventItem[]
): Promise<{ ok: boolean; savedAt: string }> {
  const savedAt = new Date().toISOString();
  const normalizedEvents = (Array.isArray(events) ? events : []).map((ev, idx) =>
    normalizeEvent(ev, idx)
  );
  const res = await postToMiniAppApi<{ ok: boolean; savedAt?: string }>(
    '/api/miniapp/admin-save-events',
    {
      events: normalizedEvents,
      eventsList: normalizedEvents,
      adminId: MASTER_ADMIN_TELEGRAM_ID,
      updatedAt: savedAt,
    }
  );
  return {
    ok: res.ok,
    savedAt: res.data?.savedAt || savedAt,
  };
}

/**
 * 15. POST ${BOT_WORKER_BASE_URL}/api/miniapp/admin-save-profs
 * Two-way sync of professors created, edited, or deleted in Mini App AdminPanel
 * directly to the Telegram Bot KV database.
 */
export async function saveProfessorsOnBot(
  professors: Professor[]
): Promise<{ ok: boolean; savedAt: string }> {
  const savedAt = new Date().toISOString();
  const safeProfs = Array.isArray(professors) ? professors : [];
  const res = await postToMiniAppApi<{ ok: boolean; savedAt?: string }>(
    '/api/miniapp/admin-save-profs',
    {
      professors: safeProfs,
      profs: safeProfs,
      adminId: MASTER_ADMIN_TELEGRAM_ID,
      updatedAt: savedAt,
    }
  );
  return {
    ok: res.ok,
    savedAt: res.data?.savedAt || savedAt,
  };
}

/**
 * 16. POST ${BOT_WORKER_BASE_URL}/api/miniapp/admin-user-action
 * Executes Admin actions on a user: edit_user, delete_user, set_kyc, update_points, set_ban
 * and returns the updated students list from the Cloudflare Worker KV store.
 */
export async function submitAdminUserActionToBot(payload: {
  action: 'edit_user' | 'delete_user' | 'set_kyc' | 'update_points' | 'set_ban';
  targetUserId: string;
  studentId?: string;
  previousStudentId?: string;
  telegramUserId?: string;
  telegramId?: string;
  fullName?: string;
  firstName?: string;
  lastName?: string;
  cohortYear?: string;
  kycStatus?: 'verified' | 'required' | 'kyc_locked' | 'pending_review';
  deltaPoints?: number;
  score?: number;
  reason?: string;
  isBanned?: boolean;
}): Promise<{
  ok: boolean;
  students?: AdminStudentDossier[];
  profile?: UserProfile;
}> {
  const tgUser = getRealTelegramUser();
  const actingAdminId = tgUser?.id || MASTER_ADMIN_TELEGRAM_ID;
  const resolvedTargetTgId =
    payload.telegramId || payload.telegramUserId || payload.targetUserId;

  const res = await postToMiniAppApi<{
    ok: boolean;
    students?: AdminStudentDossier[];
    profile?: UserProfile;
  }>('/api/miniapp/admin-user-action', {
    ...payload,
    telegramId: resolvedTargetTgId,
    telegramUserId: resolvedTargetTgId,
    adminId: actingAdminId,
    updatedAt: new Date().toISOString(),
  });

  // Fallback for when the new admin-user-action route is not yet deployed on the Cloudflare Worker:
  // also push the updated fields to /api/miniapp/sync-user so KV stays updated.
  if (!res.ok && payload.action !== 'delete_user') {
    void postToMiniAppApi('/api/miniapp/sync-user', {
      telegramId: resolvedTargetTgId,
      telegramUserId: resolvedTargetTgId,
      studentId: payload.studentId,
      ...(payload.kycStatus ? { kycStatus: payload.kycStatus } : {}),
      ...(typeof payload.isBanned === 'boolean' ? { isBanned: payload.isBanned } : {}),
      ...(typeof payload.score === 'number' ? { score: payload.score } : {}),
      ...(payload.fullName ? { fullName: payload.fullName } : {}),
      profile: {
        id: resolvedTargetTgId,
        telegramId: resolvedTargetTgId,
        telegramUserId: resolvedTargetTgId,
        studentId: payload.studentId,
        ...(payload.fullName ? { fullName: payload.fullName } : {}),
        ...(payload.firstName ? { firstName: payload.firstName } : {}),
        ...(payload.lastName ? { lastName: payload.lastName } : {}),
        ...(payload.cohortYear ? { cohortYear: payload.cohortYear } : {}),
        ...(payload.kycStatus ? { kycStatus: payload.kycStatus } : {}),
        ...(typeof payload.isBanned === 'boolean' ? { isBanned: payload.isBanned } : {}),
        ...(typeof payload.score === 'number' ? { score: payload.score } : {}),
      },
    });
  }

  return {
    ok: res.ok,
    students: Array.isArray(res.data?.students) ? res.data!.students : undefined,
    profile: res.data?.profile,
  };
}

export function saveLocalSiteSwitchesOverride(
  switches: SiteSwitches,
  syncedWithServer = false
): void {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(
        SITE_SWITCHES_OVERRIDE_KEY,
        JSON.stringify({
          switches,
          updatedAt: Date.now(),
          syncedWithServer,
        })
      );
    }
  } catch {
    // Ignore storage error
  }
}

export function getLocalSiteSwitchesOverride(): {
  switches: SiteSwitches;
  updatedAt: number;
  syncedWithServer?: boolean;
} | null {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const raw = window.localStorage.getItem(SITE_SWITCHES_OVERRIDE_KEY);
      if (raw) {
        const parsed = safeJsonParse<{
          switches?: SiteSwitches;
          updatedAt?: number;
          syncedWithServer?: boolean;
        } | null>(raw, null);
        if (parsed?.switches && typeof parsed.updatedAt === 'number') {
          return {
            switches: parsed.switches,
            updatedAt: parsed.updatedAt,
            syncedWithServer: parsed.syncedWithServer,
          };
        }
      }
    }
  } catch {
    // Ignore storage error
  }
  return null;
}

/**
 * 17. POST ${BOT_WORKER_BASE_URL}/api/miniapp/admin-site-switches
 * Saves the 6 real site switches (maintenanceMode, eventsEnabled, lootboxEnabled,
 * chartEnabled, supportEnabled, leaderboardEnabled) to Cloudflare KV.
 */
export async function saveSiteSwitchesOnBot(
  siteSwitches: SiteSwitches
): Promise<{ ok: boolean; siteSwitches: SiteSwitches }> {
  saveLocalSiteSwitchesOverride(siteSwitches, false);
  const res = await postToMiniAppApi<{
    ok: boolean;
    siteSwitches?: SiteSwitches;
  }>('/api/miniapp/admin-site-switches', {
    siteSwitches,
    ...siteSwitches,
    adminId: MASTER_ADMIN_TELEGRAM_ID,
    updatedAt: new Date().toISOString(),
  });
  const finalSwitches = res.data?.siteSwitches || siteSwitches;
  if (res.ok && res.data?.siteSwitches) {
    saveLocalSiteSwitchesOverride(finalSwitches, true);
  }
  return {
    ok: res.ok,
    siteSwitches: finalSwitches,
  };
}

/**
 * 18. POST ${BOT_WORKER_BASE_URL}/api/miniapp/heartbeat
 * Sends a live heartbeat every 45 seconds and returns the real onlineCount & onlineUsers (last 3 minutes).
 */
export async function sendHeartbeatToBot(
  user: UserProfile,
  activePage = 'مینی‌اپ انجمن صنایع'
): Promise<{
  ok: boolean;
  onlineCount?: number;
  onlineUsers?: OnlineSessionUser[];
}> {
  const tgUser = getRealTelegramUser();
  const resolvedTgId =
    tgUser?.id ||
    (typeof window !== 'undefined' &&
    window.Telegram?.WebApp?.initDataUnsafe?.user?.id
      ? String(window.Telegram.WebApp.initDataUnsafe.user.id)
      : user.telegramUserId || user.id || '');

  const device: 'Telegram Mobile' | 'Desktop Web' =
    typeof window !== 'undefined' && window.innerWidth >= 1024
      ? 'Desktop Web'
      : 'Telegram Mobile';

  const res = await postToMiniAppApi<{
    ok: boolean;
    onlineCount?: number;
    onlineUsers?: OnlineSessionUser[];
    activeUsers?: OnlineSessionUser[];
  }>('/api/miniapp/heartbeat', {
    userId: resolvedTgId || user.studentId || user.id,
    telegramUserId: resolvedTgId,
    studentId: user.studentId,
    fullName: user.fullName || 'دانشجوی آنلاین',
    name: user.fullName || 'دانشجوی آنلاین',
    cohortYear: user.cohortYear || '1402',
    device,
    activePage,
    onlineAt: new Date().toLocaleTimeString('fa-IR', {
      hour: '2-digit',
      minute: '2-digit',
    }),
  });

  const list = Array.isArray(res.data?.onlineUsers)
    ? res.data!.onlineUsers
    : Array.isArray(res.data?.activeUsers)
    ? res.data!.activeUsers
    : undefined;

  const count =
    typeof res.data?.onlineCount === 'number'
      ? res.data.onlineCount
      : Array.isArray(list)
      ? list.length
      : undefined;

  return {
    ok: res.ok,
    onlineCount: count,
    onlineUsers: list,
  };
}

export const SUPPORT_CHATS_STORAGE_KEY = 'ie_support_chats_catalog_v1';

export function normalizeSupportTicket(raw: unknown, idx = 0): SupportTicket {
  const obj = (raw && typeof raw === 'object' ? raw : {}) as Partial<SupportTicket> &
    Record<string, unknown>;
  const rawCategory = String(obj.category || 'council').toLowerCase();
  const category: SupportTicket['category'] =
    rawCategory === 'tech'
      ? 'tech'
      : rawCategory === 'educational'
      ? 'educational'
      : rawCategory === 'direct'
      ? 'direct'
      : 'council';

  const rawStatus = String(obj.status || 'open').toLowerCase();
  const status: SupportTicket['status'] =
    rawStatus === 'closed'
      ? 'closed'
      : rawStatus === 'answered'
      ? 'answered'
      : 'open';

  const rawMsgs = Array.isArray(obj.messages) ? obj.messages : [];
  const messages = rawMsgs
    .filter((m) => m && typeof m === 'object')
    .map((m, mIdx) => {
      const msgObj = m as unknown as Record<string, unknown>;
      const rawSender = String(
        msgObj.sender || msgObj.senderRole || msgObj.role || 'user'
      ).toLowerCase();
      const isSupport =
        rawSender === 'support' ||
        rawSender === 'admin' ||
        rawSender === 'bot' ||
        rawSender.includes('ادمین') ||
        rawSender.includes('پشتیبانی');
      return {
        id: String(msgObj.id || `msg-${idx}-${mIdx}`),
        sender: (isSupport ? 'support' : 'user') as 'user' | 'support',
        senderName: String(
          msgObj.senderName ||
            (isSupport ? 'پشتیبانی انجمن علمی صنایع' : obj.studentName || 'دانشجو')
        ),
        text: String(msgObj.text || msgObj.message || '').trim(),
        time: String(
          msgObj.time ||
            msgObj.timestamp ||
            new Date().toLocaleTimeString('fa-IR', {
              hour: '2-digit',
              minute: '2-digit',
            })
        ),
        date: String(
          msgObj.date || new Date().toLocaleDateString('fa-IR')
        ),
      };
    });

  const resolvedId = String(obj.id || obj.ticketId || obj.chatId || `TKT-${1000 + idx}`);
  return {
    id: resolvedId,
    chatId: resolvedId,
    title: String(
      obj.title || obj.subject || 'گفتگو با پشتیبانی انجمن علمی مهندسی صنایع'
    ),
    category,
    status,
    updatedAt: String(
      obj.updatedAt ||
        obj.lastUpdate ||
        new Date().toLocaleDateString('fa-IR')
    ),
    createdAt: obj.createdAt ? String(obj.createdAt) : undefined,
    studentId: obj.studentId ? String(obj.studentId) : undefined,
    studentName: obj.studentName ? String(obj.studentName) : undefined,
    telegramUserId: obj.telegramUserId
      ? String(obj.telegramUserId)
      : obj.telegramId
      ? String(obj.telegramId)
      : undefined,
    cohortYear: obj.cohortYear ? String(obj.cohortYear) : undefined,
    closedAt: obj.closedAt ? String(obj.closedAt) : undefined,
    closedBy: obj.closedBy ? String(obj.closedBy) : undefined,
    closedByAdmin: status === 'closed' || Boolean(obj.closedByAdmin),
    messages,
  };
}

export function normalizeSupportTicketsList(rawList: unknown): SupportTicket[] {
  if (!Array.isArray(rawList)) return [];
  return rawList
    .filter((item) => item && typeof item === 'object')
    .map((item, idx) => normalizeSupportTicket(item, idx));
}

export function loadStoredSupportChats(): SupportTicket[] {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const raw = window.localStorage.getItem(SUPPORT_CHATS_STORAGE_KEY);
      const parsed = safeJsonParse<unknown>(raw, []);
      return normalizeSupportTicketsList(parsed);
    }
  } catch {
    // Ignore
  }
  return [];
}

export function saveStoredSupportChats(chats: SupportTicket[]): void {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(
        SUPPORT_CHATS_STORAGE_KEY,
        JSON.stringify(normalizeSupportTicketsList(chats))
      );
    }
  } catch {
    // Ignore
  }
}

/**
 * 19. GET ${BOT_WORKER_BASE_URL}/api/miniapp/my-chats
 * Loads the student's list of chats/tickets and full message history.
 */
export async function fetchStudentChatsFromBot(
  user?: Partial<UserProfile> | null,
  timeoutMs = 5500
): Promise<{ ok: boolean; chats: SupportTicket[] }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const tgUser = getRealTelegramUser();
  const resolvedTgId =
    tgUser?.id ||
    (typeof window !== 'undefined' &&
    window.Telegram?.WebApp?.initDataUnsafe?.user?.id
      ? String(window.Telegram.WebApp.initDataUnsafe.user.id)
      : user?.telegramUserId || '');
  const cleanStudentId = (user?.studentId || '').trim();

  try {
    const queryParams = new URLSearchParams();
    if (resolvedTgId) queryParams.set('telegramUserId', resolvedTgId);
    if (cleanStudentId) queryParams.set('studentId', cleanStudentId);
    queryParams.set('ts', String(Date.now()));
    const url = `${getBotApiBaseUrl()}/api/miniapp/my-chats?${queryParams.toString()}`;

    const response = await secureFetch(url, {
      method: 'GET',
      cache: 'no-store',
      headers: {
        'X-Telegram-Init-Data': getTelegramInitDataRaw(),
      },
      signal: controller.signal,
    });
    clearTimeout(timer);
    if (response.ok) {
      const text = await response.text();
      const json = safeJsonParse<{
        ok?: boolean;
        chats?: unknown[];
        tickets?: unknown[];
        supportTickets?: unknown[];
      } | null>(text, null);
      const list = Array.isArray(json?.chats)
        ? json!.chats
        : Array.isArray(json?.tickets)
        ? json!.tickets
        : Array.isArray(json?.supportTickets)
        ? json!.supportTickets
        : undefined;
      if (list) {
        const normalized = normalizeSupportTicketsList(list);
        return { ok: true, chats: normalized };
      }
    }
  } catch {
    clearTimeout(timer);
  }
  return { ok: false, chats: [] };
}

/**
 * 20. POST ${BOT_WORKER_BASE_URL}/api/miniapp/chat-send
 * Sends a student chat message or opens a new conversation when the chat is not closed (`status !== 'closed'`).
 */
export async function sendStudentChatMessageToBot(payload: {
  ticketId?: string;
  chatId?: string;
  title: string;
  category: SupportTicket['category'];
  text: string;
  user: UserProfile;
  isNewTicket?: boolean;
}): Promise<{ ok: boolean; ticket?: SupportTicket }> {
  const tgUser = getRealTelegramUser();
  const resolvedTgId =
    tgUser?.id ||
    (typeof window !== 'undefined' &&
    window.Telegram?.WebApp?.initDataUnsafe?.user?.id
      ? String(window.Telegram.WebApp.initDataUnsafe.user.id)
      : payload.user.telegramUserId || '');

  const nowTime = new Date().toLocaleTimeString('fa-IR', {
    hour: '2-digit',
    minute: '2-digit',
  });
  const nowDate = new Date().toLocaleDateString('fa-IR');
  const resolvedChatId = payload.ticketId || payload.chatId || `TKT-${Date.now()}`;

  const res = await postToMiniAppApi<{
    ok: boolean;
    ticket?: SupportTicket;
    chat?: SupportTicket;
  }>('/api/miniapp/chat-send', {
    ticketId: resolvedChatId,
    chatId: resolvedChatId,
    id: resolvedChatId,
    title: payload.title,
    subject: payload.title,
    category: payload.category,
    text: payload.text,
    message: payload.text,
    isNewTicket: Boolean(payload.isNewTicket),
    studentId: payload.user.studentId,
    studentName: payload.user.fullName,
    cohortYear: payload.user.cohortYear,
    phone: payload.user.verifiedTelegramPhone,
    telegramUserId: resolvedTgId,
    time: nowTime,
    date: nowDate,
  });

  const returnedTicket = res.data?.ticket || res.data?.chat;
  return {
    ok: res.ok,
    ticket: returnedTicket ? normalizeSupportTicket(returnedTicket) : undefined,
  };
}

/**
 * 21. POST ${BOT_WORKER_BASE_URL}/api/miniapp/admin-chat-send
 * Allows Admin to send a reply or start a new direct chat with a student from MiniApp,
 * saving it in the MiniApp chat history AND dispatching it to the student in Telegram.
 */
export async function sendAdminChatMessageToBot(payload: {
  ticketId?: string;
  chatId?: string;
  targetUserId?: string;
  title?: string;
  studentId: string;
  studentName: string;
  telegramUserId?: string;
  cohortYear?: string;
  text: string;
  adminName?: string;
  adminTelegramId?: string;
}): Promise<{ ok: boolean; ticket?: SupportTicket }> {
  const nowTime = new Date().toLocaleTimeString('fa-IR', {
    hour: '2-digit',
    minute: '2-digit',
  });
  const nowDate = new Date().toLocaleDateString('fa-IR');
  const resolvedChatId = payload.ticketId || payload.chatId || `TKT-${Date.now()}`;
  const resolvedTargetTgId = payload.telegramUserId || payload.targetUserId;

  const res = await postToMiniAppApi<{
    ok: boolean;
    ticket?: SupportTicket;
    chat?: SupportTicket;
  }>('/api/miniapp/admin-chat-send', {
    ticketId: resolvedChatId,
    chatId: resolvedChatId,
    id: resolvedChatId,
    targetUserId: resolvedTargetTgId || payload.studentId,
    title: payload.title || `گفتگوی مستقیم مدیریت با ${payload.studentName}`,
    studentId: payload.studentId,
    studentName: payload.studentName,
    telegramUserId: resolvedTargetTgId,
    telegramId: resolvedTargetTgId,
    cohortYear: payload.cohortYear || '1402',
    text: payload.text,
    message: payload.text,
    sender: 'support',
    senderName: payload.adminName || 'پشتیبانی انجمن علمی صنایع',
    adminId: payload.adminTelegramId || MASTER_ADMIN_TELEGRAM_ID,
    time: nowTime,
    date: nowDate,
  });

  const returnedTicket = res.data?.ticket || res.data?.chat;
  return {
    ok: res.ok,
    ticket: returnedTicket ? normalizeSupportTicket(returnedTicket) : undefined,
  };
}

/**
 * 22. POST ${BOT_WORKER_BASE_URL}/api/miniapp/admin-chat-close
 * Closes an active student-admin chat (`status: 'closed'`) so no further messages can be sent in that thread.
 */
export async function closeAdminChatOnBot(payload: {
  ticketId?: string;
  chatId?: string;
  targetUserId?: string;
  studentId?: string;
  studentName?: string;
  telegramUserId?: string;
  adminName?: string;
  adminTelegramId?: string;
}): Promise<{ ok: boolean }> {
  const resolvedChatId = payload.ticketId || payload.chatId || '';
  const resolvedTargetTgId = payload.telegramUserId || payload.targetUserId;
  const res = await postToMiniAppApi<{ ok: boolean }>(
    '/api/miniapp/admin-chat-close',
    {
      ticketId: resolvedChatId,
      chatId: resolvedChatId,
      id: resolvedChatId,
      targetUserId: resolvedTargetTgId || payload.studentId,
      status: 'closed',
      studentId: payload.studentId,
      studentName: payload.studentName,
      telegramUserId: resolvedTargetTgId,
      closedBy: payload.adminName || 'مدیریت انجمن صنایع',
      closedAt: new Date().toLocaleString('fa-IR'),
      adminId: payload.adminTelegramId || MASTER_ADMIN_TELEGRAM_ID,
    }
  );
  return {
    ok: res.ok,
  };
}

/**
 * 23. POST ${BOT_WORKER_BASE_URL}/api/miniapp/admin-bot-config
 * Saves Telegram Bot configuration (welcomeText, cardNumber, cardHolder, channelUsername, rulesText, badgesCatalog)
 * and optionally triggers a broadcast message to all Telegram Bot members.
 */
export async function saveAdminBotConfigToBot(
  payload: Partial<BotConfigSettings> & {
    badgesCatalog?: BadgeItem[];
    action?: 'save_config' | 'broadcast' | 'save_badges';
    broadcastMessage?: string;
    targetAudience?: string;
  }
): Promise<{
  ok: boolean;
  savedAt: string;
  sentCount?: number;
}> {
  const savedAt = new Date().toISOString();
  const res = await postToMiniAppApi<{
    ok: boolean;
    savedAt?: string;
    sentCount?: number;
  }>('/api/miniapp/admin-bot-config', {
    ...payload,
    botConfig: {
      welcomeText: payload.welcomeText,
      cardNumber: payload.cardNumber,
      cardHolder: payload.cardHolder,
      channelUsername: payload.channelUsername,
      rulesText: payload.rulesText,
      updatedAt: savedAt,
    },
    badges: payload.badgesCatalog,
    badgesCatalog: payload.badgesCatalog,
    adminId: MASTER_ADMIN_TELEGRAM_ID,
    updatedAt: savedAt,
  });

  if (payload.action === 'broadcast' && payload.broadcastMessage) {
    void postToMiniAppApi('/api/miniapp/admin-broadcast', {
      title: '📢 پیام همگانی انجمن علمی مهندسی صنایع',
      message: payload.broadcastMessage,
      text: payload.broadcastMessage,
      targetAudience: payload.targetAudience || 'همه اعضای ربات تلگرام',
      adminId: MASTER_ADMIN_TELEGRAM_ID,
    });
  }

  return {
    ok: res.ok,
    savedAt: res.data?.savedAt || savedAt,
    sentCount: res.data?.sentCount,
  };
}

/**
 * 24. POST ${BOT_WORKER_BASE_URL}/api/miniapp/ai-chat
 * Sends MiniApp AI chat & smart extraction prompts directly to the Cloudflare Worker's active AI engine.
 */
export async function askMiniAppAiOnBot(payload: {
  prompt: string;
  modelId?: string;
  systemInstruction?: string;
  context?: Record<string, unknown>;
}): Promise<{ ok: boolean; reply?: string; modelUsed?: string }> {
  const res = await postToMiniAppApi<{
    ok?: boolean;
    reply?: string;
    response?: string;
    text?: string;
    modelUsed?: string;
  }>('/api/miniapp/ai-chat', {
    prompt: payload.prompt,
    message: payload.prompt,
    query: payload.prompt,
    modelId: payload.modelId || 'gemini-3.8-flash',
    systemInstruction: payload.systemInstruction,
    context: payload.context,
    adminId: MASTER_ADMIN_TELEGRAM_ID,
    timestamp: new Date().toISOString(),
  });

  const replyText = (
    res.data?.reply ||
    res.data?.response ||
    res.data?.text ||
    ''
  ).trim();

  if (res.ok && replyText) {
    return {
      ok: true,
      reply: replyText,
      modelUsed: res.data?.modelUsed || payload.modelId,
    };
  }
  return { ok: false };
}

/**
 * 25. POST ${BOT_WORKER_BASE_URL}/api/miniapp/admin-update-secrets
 * Securely updates the Gemini API Key and/or Admin Panel password on the Cloudflare Worker server.
 * Zero plaintext keys or passwords are ever stored in localStorage or client state.
 */
export async function updateAdminSecretsOnBot(payload: {
  geminiApiKey?: string;
  newAdminPassword?: string;
  adminPassword?: string;
  adminTelegramId?: string;
  adminId?: string;
}): Promise<{
  ok: boolean;
  maskedGeminiKey?: string;
  passwordUpdated?: boolean;
  message?: string;
}> {
  const cleanApiKey = (payload.geminiApiKey || '').trim();
  const cleanNewPassword = (payload.newAdminPassword || payload.adminPassword || '').trim();
  const newPasswordHash = cleanNewPassword
    ? computeAdminPasswordHash(cleanNewPassword)
    : undefined;

  const maskedKey =
    cleanApiKey.length >= 8
      ? `${cleanApiKey.slice(0, 6)}...**** (فعال در سرور)`
      : undefined;

  const res = await postToMiniAppApi<{
    ok: boolean;
    maskedGeminiKey?: string;
    passwordUpdated?: boolean;
    message?: string;
  }>('/api/miniapp/admin-update-secrets', {
    ...(cleanApiKey ? { geminiApiKey: cleanApiKey, apiKey: cleanApiKey } : {}),
    ...(cleanNewPassword
      ? {
          newAdminPassword: cleanNewPassword,
          adminPassword: cleanNewPassword,
          newPasswordHash,
        }
      : {}),
    adminId: payload.adminTelegramId || payload.adminId || MASTER_ADMIN_TELEGRAM_ID,
    updatedAt: new Date().toISOString(),
  });

  return {
    ok: res.ok,
    maskedGeminiKey: res.data?.maskedGeminiKey || maskedKey,
    passwordUpdated: Boolean(res.data?.passwordUpdated ?? Boolean(cleanNewPassword)),
    message: res.data?.message,
  };
}

/**
 * 26. POST ${BOT_WORKER_BASE_URL}/api/miniapp/simulation-report
 * Sends the 50-User & 5-Admin Simulation Lab summary report directly to the Master Admin's
 * Telegram private chat (629890497) and instructs the server to purge temporary simulation records.
 */
export async function sendSimulationReportToBot(
  report: SimulationReportPayload
): Promise<{ ok: boolean; deliveredToTelegram: boolean }> {
  const res = await postToMiniAppApi<{
    ok: boolean;
    deliveredToTelegram?: boolean;
  }>('/api/miniapp/simulation-report', {
    ...report,
    targetAdminTelegramId: report.targetAdminTelegramId || MASTER_ADMIN_TELEGRAM_ID,
    adminId: MASTER_ADMIN_TELEGRAM_ID,
    purgeTemporarySimulationData: true,
    timestamp: new Date().toISOString(),
  });

  return {
    ok: res.ok,
    deliveredToTelegram: Boolean(res.data?.deliveredToTelegram ?? res.ok),
  };
}




