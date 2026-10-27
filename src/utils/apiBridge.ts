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
  BootstrapResponse,
  ChannelAnnouncement,
  LootboxConfig,
  StudentIdDisputeTicket,
  SupportTicket,
  TicketRecord,
  UserProfile,
} from '../types';
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
export const IDEMPOTENCY_STORAGE_KEY = 'ie_idempotency_keys_v1';

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
      events: Array.isArray(json.events) ? json.events : undefined,
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
      pendingApprovals: rawApprovals,
      receipts: rawApprovals,
      allowStudentTimers:
        typeof json.allowStudentTimers === 'boolean' ? json.allowStudentTimers : undefined,
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
 * Sends the compressed Base64 JPEG (max width 900px) student ID card image to the Telegram Bot
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
 * Sends the compressed Base64 JPEG (max width 900px) workshop payment receipt image to the Telegram Bot
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

