import test from 'node:test';
import assert from 'node:assert/strict';
import {
  computeAdminPasswordHash,
  verifyMasterPasswordHash,
  MASTER_ADMIN_SALTLOCK_HASH,
  MASTER_ADMIN_TELEGRAM_ID,
  BOT_WORKER_BASE_URL,
  isMasterAdminTelegramUser,
  safeJsonParse,
  computeStateChecksum,
  verifyStateIntegrity,
  validateUploadedImageFile,
  verifyTicketSignature,
} from '../security';
import {
  BOT_WORKER_BASE_URL as BRIDGE_WORKER_URL,
  getBotApiBaseUrl,
  resolveBotEndpoint,
} from '../apiBridge';
import { DEFAULT_CHANNEL_HANDLE, DEFAULT_CHANNEL_URL } from '../channelSync';
import { generateTicketPayload } from '../events';
import {
  calculateLevelFromScore,
  evaluateDynamicBadges,
  EXTENDED_BADGES,
} from '../gamification';
import { UserProfile } from '../../types';

test('Patch 2 & Master Admin Binding: verifyMasterPasswordHash & Telegram ID 629890497 & @Isefum channel & Live Worker URL', () => {
  const candidate = String.fromCharCode(48, 57, 51, 48, 57, 50, 50, 56, 52, 55, 55);
  assert.equal(computeAdminPasswordHash(candidate), MASTER_ADMIN_SALTLOCK_HASH);
  assert.equal(verifyMasterPasswordHash(candidate), true);
  assert.equal(verifyMasterPasswordHash('wrong-password-123'), false);
  assert.equal(verifyMasterPasswordHash(''), false);

  assert.equal(MASTER_ADMIN_TELEGRAM_ID, '629890497');
  assert.equal(isMasterAdminTelegramUser('629890497'), true);
  assert.equal(isMasterAdminTelegramUser('111111111'), false);

  assert.equal(DEFAULT_CHANNEL_HANDLE, 'Isefum');
  assert.equal(DEFAULT_CHANNEL_URL, 'https://t.me/Isefum');

  assert.equal(
    BOT_WORKER_BASE_URL,
    'https://morning-paper-4bbbie-association-bot.sepehrkhakpoor091.workers.dev'
  );
  assert.equal(BRIDGE_WORKER_URL, BOT_WORKER_BASE_URL);
  assert.equal(getBotApiBaseUrl(), BOT_WORKER_BASE_URL);
  assert.equal(
    resolveBotEndpoint('/api/miniapp/send-ticket'),
    'https://morning-paper-4bbbie-association-bot.sepehrkhakpoor091.workers.dev/api/miniapp/send-ticket'
  );
  assert.equal(
    resolveBotEndpoint('/api/miniapp/check-in'),
    'https://morning-paper-4bbbie-association-bot.sepehrkhakpoor091.workers.dev/api/miniapp/check-in'
  );
  assert.equal(
    resolveBotEndpoint('/api/miniapp/sync-user'),
    'https://morning-paper-4bbbie-association-bot.sepehrkhakpoor091.workers.dev/api/miniapp/sync-user'
  );
  assert.equal(
    resolveBotEndpoint('/api/miniapp/admin-auth'),
    'https://morning-paper-4bbbie-association-bot.sepehrkhakpoor091.workers.dev/api/miniapp/admin-auth'
  );
});

test('Patch 3: verifyStateIntegrity binds checksum to both studentId and telegramUserId (Anti-Replay)', () => {
  const stuA = {
    score: 280,
    studentId: '4021202422',
    level: 3,
    telegramUserId: 'tg-user-11111',
  };
  const checksumA = computeStateChecksum(
    stuA.score,
    stuA.studentId,
    stuA.level,
    stuA.telegramUserId
  );

  // Same student & same Telegram User ID passes
  assert.equal(verifyStateIntegrity(stuA, checksumA, 'tg-user-11111'), true);

  // If another Telegram user copies stuA's JSON & checksum into their session, verification fails!
  assert.equal(verifyStateIntegrity(stuA, checksumA, 'tg-user-99999'), false);
});

test('Patch 4: validateUploadedImageFile blocks SVG/scripts, >4MB files, and invalid magic bytes', async () => {
  // 1. Block SVG (Stored XSS vector)
  const svgFile = new File(['<svg onload="alert(1)"></svg>'], 'exploit.svg', {
    type: 'image/svg+xml',
  });
  const svgRes = await validateUploadedImageFile(svgFile);
  assert.equal(svgRes.valid, false);

  // 2. Block disguised script with image/png MIME but invalid magic bytes
  const fakePngBytes = new Uint8Array([0x3c, 0x73, 0x63, 0x72, 0x69, 0x70, 0x74, 0x3e]);
  const fakePngFile = new File([fakePngBytes], 'receipt.png', { type: 'image/png' });
  const fakePngRes = await validateUploadedImageFile(fakePngFile);
  assert.equal(fakePngRes.valid, false);

  // 3. Block oversized (> 4 MB) file
  const hugeBytes = new Uint8Array(4 * 1024 * 1024 + 1024);
  hugeBytes[0] = 0xff;
  hugeBytes[1] = 0xd8;
  hugeBytes[2] = 0xff;
  const hugeFile = new File([hugeBytes], 'huge.jpg', { type: 'image/jpeg' });
  const hugeRes = await validateUploadedImageFile(hugeFile);
  assert.equal(hugeRes.valid, false);

  // 4. Accept valid JPEG magic bytes (FFD8FF) in headless Node environment
  const validJpegBytes = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46]);
  const validJpegFile = new File([validJpegBytes], 'receipt.jpg', {
    type: 'image/jpeg',
  });
  const validJpegRes = await validateUploadedImageFile(validJpegFile);
  assert.equal(validJpegRes.valid, true);
});

test('Patch 5: generateTicketPayload and verifyTicketSignature bind paidAmount against forgery', () => {
  const qr = generateTicketPayload('ev-python-data', '4021202422', 'TK-884920', 150000);
  assert.equal(verifyTicketSignature(qr), true);
  assert.equal(qr.split(':').length, 5);

  // Attacker modifies paidAmount from 150000 to 0 while keeping same signature
  const tamperedAmountQr = qr.replace(':150000-', ':0-');
  assert.equal(verifyTicketSignature(tamperedAmountQr), false);
});

test('Patch 6: safeJsonParse strips __proto__ and handles malformed JSON without crashing', () => {
  const maliciousRaw = '{"score":100,"__proto__":{"isAdmin":true},"constructor":{"prototype":{"hacked":true}}}';
  const parsed = safeJsonParse<Record<string, unknown>>(maliciousRaw, {});
  assert.equal(parsed.score, 100);
  assert.equal(({} as Record<string, unknown>).isAdmin, undefined);
  assert.deepEqual(safeJsonParse('INVALID_JSON{{{', { ok: false }), { ok: false });
});

test('Real Dynamic Level & Badge Unlocking calculators', () => {
  const lvl1 = calculateLevelFromScore(0);
  assert.equal(lvl1.level, 1);
  assert.equal(lvl1.rankTitle, 'سطح ۱ - دانشجوی نوپا');
  assert.equal(lvl1.badgeIcon, '25_rank_lvl1.png');

  const lvl2 = calculateLevelFromScore(85);
  assert.equal(lvl2.level, 2);
  assert.equal(lvl2.rankTitle, 'سطح ۲ - تحلیلگر سیستم');
  assert.equal(lvl2.badgeIcon, '26_rank_lvl2.png');

  const lvl3 = calculateLevelFromScore(280);
  assert.equal(lvl3.level, 3);
  assert.equal(lvl3.rankTitle, 'سطح ۳ - مهندس آینده');
  assert.equal(lvl3.badgeIcon, '27_rank_lvl3.png');

  const lvl4 = calculateLevelFromScore(340);
  assert.equal(lvl4.level, 4);
  assert.equal(lvl4.rankTitle, 'سطح ۴ - نخبه انجمن صنایع');
  assert.equal(lvl4.badgeIcon, '28_rank_lvl4.png');

  const newStudent: UserProfile = {
    id: 'usr-new',
    firstName: 'پرنیا',
    lastName: 'محمدی',
    fullName: 'پرنیا محمدی',
    studentId: '',
    cohortYear: '۱۴۰۳',
    avatar: '02_avatar_girl.png',
    score: 5,
    level: 1,
    rankTitle: lvl1.rankTitle,
    verifiedTelegramPhone: '',
    kycStatus: 'verified',
    onboardingCompleted: true,
  };

  const badgesNew = evaluateDynamicBadges(EXTENDED_BADGES, newStudent, [], [], false);
  const shieldBadge = badgesNew.find((b) => b.filename === '20_badge_shield.png');
  const crownBadge = badgesNew.find((b) => b.filename === '24_badge_crown.png');
  assert.equal(shieldBadge?.isUnlocked, true);
  assert.equal(crownBadge?.isUnlocked, false);
});
