import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getCohortBattleStats,
  getFilteredLeaderboard,
  redeemLootboxChest,
  SHOWCASE_BADGES,
  DEFAULT_CERTIFICATES,
  DEFAULT_LOOTBOX_CONFIG,
  INITIAL_WEEKLY_QUESTS,
  evaluateQuestsProgress,
  parseFlexibleNumberInput,
  getNormalizedLootboxChests,
  syncLootboxConfigWithChests,
} from './gamification';
import {
  computeStateChecksum,
  computeSignatureHash,
  verifyTicketSignature,
  recordTicketInCheckedInLedger,
  findCheckedInTicketInLedger,
  removeTicketFromCheckedInLedger,
  isProtectedMasterAccount,
  isFakeTestAccount,
  saveAdminStudentOverride,
  applyAdminOverridesToStudents,
} from './security';
import {
  DEFAULT_EVENT_SYLLABUS,
  normalizeEvent,
  resolveEventPixelImage,
  resolveEventDiscountRule,
  calculateFinalPayable,
} from './events';
import { ensureContinuousPinnedAnnouncements } from './channelSync';
import { AdminStudentDossier, TicketRecord, UserProfile } from '../types';

const MOCK_USER: UserProfile = {
  id: 'usr-4019998877',
  firstName: 'علی',
  lastName: 'محمدی',
  fullName: 'علی محمدی',
  studentId: '4019998877',
  cohortYear: '۱۴۰۱',
  avatar: '01_avatar_boy.png',
  score: 280,
  level: 3,
  rankTitle: 'سطح ۳ - مهندس آینده',
  verifiedTelegramPhone: '09151234567',
  kycStatus: 'verified',
  onboardingCompleted: true,
};

const REAL_BOT_STUDENTS: AdminStudentDossier[] = [
  {
    id: 'stu-a',
    fullName: 'سارا حسینی',
    studentId: '4011112233',
    cohortYear: '1401',
    phone: '09150001111',
    avatar: '02_avatar_girl.png',
    score: 410,
    level: 4,
    kycStatus: 'verified',
    isBanned: false,
    attendedEvents: [],
    badges: [],
    payments: [],
    chatLogs: [],
  },
  {
    id: 'stu-b',
    fullName: 'کیانوش نادری',
    studentId: '4021112233',
    cohortYear: '1402',
    phone: '09150002222',
    avatar: '01_avatar_boy.png',
    score: 350,
    level: 3,
    kycStatus: 'verified',
    isBanned: false,
    attendedEvents: [],
    badges: [],
    payments: [],
    chatLogs: [],
  },
];

test('SHOWCASE_BADGES and DEFAULT_CERTIFICATES have valid cryptographic hashes', () => {
  assert.equal(SHOWCASE_BADGES.length, 5);
  assert.ok(SHOWCASE_BADGES.every((b) => b.verificationHash.length >= 8));
  assert.equal(DEFAULT_CERTIFICATES.length, 2);
  assert.ok(DEFAULT_CERTIFICATES.every((c) => c.certificateId.startsWith('CERT-401-')));
});

test('getFilteredLeaderboard uses ONLY real registered students and recalculates 1-based rank', () => {
  // With no real students and unauthenticated user -> empty array (zero fake users)
  const emptyBoard = getFilteredLeaderboard('all', undefined, []);
  assert.equal(emptyBoard.length, 0);

  const allStudents = getFilteredLeaderboard('all', MOCK_USER, REAL_BOT_STUDENTS);
  assert.equal(allStudents.length, 3);
  assert.equal(allStudents[0].rank, 1);
  assert.equal(allStudents[0].fullName, 'سارا حسینی');

  const cohort401 = getFilteredLeaderboard('۱۴۰۱', MOCK_USER, REAL_BOT_STUDENTS);
  assert.equal(cohort401.length, 2);
  const userIn401 = cohort401.find((s) => s.isCurrentUser);
  assert.ok(userIn401);
  assert.equal(userIn401.rank, 2);

  // Cohort battle stats (1400..1405) computed dynamically from real students
  const battleStats = getCohortBattleStats(MOCK_USER, REAL_BOT_STUDENTS);
  assert.equal(battleStats.length, 6);
  const stat1401 = battleStats.find((b) => b.cohortYear === '۱۴۰۱');
  assert.ok(stat1401);
  assert.equal(stat1401.studentsCount, 2);
  assert.equal(stat1401.totalPoints, 410 + 280);
});

test('redeemLootboxChest enforces anti-tamper checksum and draws prizes by Admin chancePercent', () => {
  const validChecksum = computeStateChecksum(MOCK_USER.score, MOCK_USER.studentId, MOCK_USER.level);

  // 1. Valid Bronze chest (50 pts) with seed 0.1 -> first prize (discount voucher)
  const resBronze = redeemLootboxChest(
    'bronze',
    MOCK_USER,
    validChecksum,
    0.1,
    DEFAULT_LOOTBOX_CONFIG
  );
  assert.equal(resBronze.success, true);
  assert.equal(resBronze.costPoints, 50);
  assert.ok(resBronze.voucher?.code.startsWith('OFF-IE401-'));

  // 2. Tampered score in localStorage without valid checksum fails!
  const cheatedUser = { ...MOCK_USER, score: 9999 };
  const resCheated = redeemLootboxChest('gold', cheatedUser, validChecksum, 0.5);
  assert.equal(resCheated.success, false);
  assert.equal(resCheated.tamperDetected, true);

  // 3. Insufficient points fails cleanly
  const lowScoreUser = { ...MOCK_USER, score: 30 };
  const lowScoreChecksum = computeStateChecksum(30, MOCK_USER.studentId, MOCK_USER.level);
  const resInsufficient = redeemLootboxChest('bronze', lowScoreUser, lowScoreChecksum, 0.5);
  assert.equal(resInsufficient.success, false);
  assert.equal(resInsufficient.tamperDetected, undefined);
});

test('INITIAL_WEEKLY_QUESTS start at 0 progress and evaluateQuestsProgress requires real completion', () => {
  assert.ok(INITIAL_WEEKLY_QUESTS.every((q) => q.progress === 0 && !q.isClaimed));

  // Unregistered guest user with 0 tickets cannot claim any quest
  const guestUser: UserProfile = {
    ...MOCK_USER,
    studentId: '',
    score: 0,
    onboardingCompleted: false,
  };
  const guestEvaluated = evaluateQuestsProgress(INITIAL_WEEKLY_QUESTS, guestUser, []);
  assert.ok(guestEvaluated.every((q) => q.progress < q.maxProgress));

  // Registered user with 1 checked-in ticket completes profile quest and event quests
  const sampleTicket: TicketRecord = {
    id: 't1',
    eventId: 'ev-1',
    eventTitle: 'کارگاه پایتون',
    eventDate: '۱۴۰۴/۰۸/۲۰',
    eventTime: '۱۶:۰۰',
    location: 'تالار مهندسی',
    studentName: MOCK_USER.fullName,
    studentId: MOCK_USER.studentId,
    trackingCode: 'IE-101',
    qrPayload: 'IE-TICKET|ev-1|4011234567|IE-101|SIG',
    issuedAt: '۱۴۰۴/۰۸/۱۸',
    paidAmount: 0,
    discountPointsUsed: 0,
    sentToTelegram: true,
    checkedIn: true,
  };
  const activeEvaluated = evaluateQuestsProgress(INITIAL_WEEKLY_QUESTS, MOCK_USER, [
    sampleTicket,
  ]);
  const profileQuest = activeEvaluated.find((q) => q.conditionType === 'complete_profile');
  const checkinQuest = activeEvaluated.find((q) => q.conditionType === 'checkin_events');
  assert.equal(profileQuest?.progress, 1);
  assert.equal(checkinQuest?.progress, 1);
});

test('parseFlexibleNumberInput handles English/Persian digits and never gets stuck on 0', () => {
  assert.equal(parseFlexibleNumberInput('', 0), 0);
  assert.equal(parseFlexibleNumberInput('0', 0), 0);
  assert.equal(parseFlexibleNumberInput('045', 0), 45);
  assert.equal(parseFlexibleNumberInput('۷۵', 0), 75);
  assert.equal(parseFlexibleNumberInput('۱۰۰%', 0), 100);
});

test('Custom Lootbox Chests sync and redeem with custom entry cost', () => {
  const baseChests = getNormalizedLootboxChests(DEFAULT_LOOTBOX_CONFIG);
  const customChest = {
    id: 'chest-diamond',
    title: 'صندوقچه الماسی',
    subtitle: 'ویژه قهرمانان',
    cost: 120,
    themeColor: 'emerald' as const,
    prizes: [
      {
        id: 'prz-d1',
        title: 'کد تخفیف ۱۰۰٪ کارگاه',
        chancePercent: 100,
        rewardType: 'discount' as const,
      },
    ],
  };
  const updatedConfig = syncLootboxConfigWithChests(
    [...baseChests, customChest],
    DEFAULT_LOOTBOX_CONFIG
  );
  assert.equal(getNormalizedLootboxChests(updatedConfig).length, 3);

  const validChecksum = computeStateChecksum(
    MOCK_USER.score,
    MOCK_USER.studentId,
    MOCK_USER.level
  );
  const resCustom = redeemLootboxChest(
    'chest-diamond',
    MOCK_USER,
    validChecksum,
    0.5,
    updatedConfig
  );
  assert.equal(resCustom.success, true);
  assert.equal(resCustom.costPoints, 120);
  assert.equal(resCustom.prizeTitle, 'کد تخفیف ۱۰۰٪ کارگاه');
});

test('verifyTicketSignature supports colon and pipe QR formats', () => {
  const sigColon = computeSignatureHash('TICKET:ev-1:4011234567:TK-777888:0');
  const signedColon = `IE-TICKET:ev-1:4011234567:TK-777888:0:${sigColon}`;
  assert.equal(verifyTicketSignature(signedColon), true);

  const sigPipe = computeSignatureHash('TICKET|ev-1|4011234567|TK-777888');
  const pipePayload = `IE-TICKET|ev-1|4011234567|TK-777888|${sigPipe}`;
  assert.equal(verifyTicketSignature(pipePayload), true);

  const sigPrefixPayload = 'IE-TICKET:ev-1:4011234567:TK-777888:SIG-ABCD12';
  assert.equal(verifyTicketSignature(sigPrefixPayload), true);

  // Ensure ledger helper functions are exported and callable in non-DOM/DOM environments
  recordTicketInCheckedInLedger('TK-777888', signedColon, 'علی محمدی', '۱۴۰۴/۰۸/۲۰');
  removeTicketFromCheckedInLedger('TK-777888', signedColon);
  assert.equal(findCheckedInTicketInLedger('TK-777888', signedColon), null);
});

test('normalizeEvent guarantees syllabus array, numeric capacity, 4.9 rating, and pixel image', () => {
  // 1. Event from Telegram Bot with undefined syllabus and multiline description
  const botEvWithDesc = normalizeEvent({
    id: 'bot-ev-1',
    title: 'کارگاه مدیریت پروژه با MSP',
    totalCapacity: 50,
    remainingCapacity: 32,
    description: 'ساختار شکست کار WBS\nزمان‌بندی مسیر بحرانی CPM',
  });
  assert.equal(Array.isArray(botEvWithDesc.syllabus), true);
  assert.deepEqual(botEvWithDesc.syllabus, [
    'ساختار شکست کار WBS',
    'زمان‌بندی مسیر بحرانی CPM',
  ]);
  assert.equal(botEvWithDesc.capacityTotal, 50);
  assert.equal(botEvWithDesc.capacityRemaining, 32);
  assert.equal(botEvWithDesc.rating, 4.9);
  assert.equal(botEvWithDesc.imageFilename, '13_event_factory.png');

  // 2. Completely bare event with no syllabus and no description -> falls back to DEFAULT_EVENT_SYLLABUS
  const bareEv = normalizeEvent({
    id: 'bot-ev-2',
    title: 'کارگاه برنامه‌نویسی پایتون',
  });
  assert.equal(Array.isArray(bareEv.syllabus), true);
  assert.deepEqual(bareEv.syllabus, DEFAULT_EVENT_SYLLABUS);
  assert.equal(bareEv.capacityTotal, 40);
  assert.equal(bareEv.capacityRemaining, 40);
  assert.equal(bareEv.rating, 4.9);
  assert.equal(bareEv.imageFilename, '12_event_python.png');

  // 3. Automatic pixel image assignment by title/category
  assert.equal(
    resolveEventPixelImage({ title: 'مسابقه هوش تجاری PowerBI' }),
    '14_event_hackathon.png'
  );
  assert.equal(
    resolveEventPixelImage({ title: 'سمینار تخصصی مهندسی صنایع', category: 'seminar' }),
    '15_event_seminar.png'
  );
});

test('workshop points-to-discount slider respects floor, ceiling, step multipliers, and per-workshop toggle', () => {
  const workshop = normalizeEvent({
    id: 'ev-custom-discount',
    title: 'کارگاه تخصصی پایتون',
    basePrice: 150000,
    allowPointsDiscount: true,
    discountPointsStep: 20,
    discountTomansPerStep: 10000,
    discountMinPoints: 20,
    discountMaxPoints: 80,
  });

  const rule = resolveEventDiscountRule(workshop);
  assert.equal(rule.enabled, true);
  assert.equal(rule.pointsStep, 20);
  assert.equal(rule.discountTomansPerStep, 10000);
  assert.equal(rule.minPoints, 20);
  assert.equal(rule.maxPoints, 80);
  assert.equal(rule.steps.length, 5); // 0, 20, 40, 60, 80

  // 20 points -> 10,000 Tomans discount
  const calc20 = calculateFinalPayable(150000, 20, undefined, workshop);
  assert.equal(calc20.pointsUsed, 20);
  assert.equal(calc20.discountAmount, 10000);
  assert.equal(calc20.finalPrice, 140000);
  assert.equal(calc20.discountCode, 'OFF-IE-20P');

  // 40 points -> 20,000 Tomans discount
  const calc40 = calculateFinalPayable(150000, 40, undefined, workshop);
  assert.equal(calc40.pointsUsed, 40);
  assert.equal(calc40.discountAmount, 20000);
  assert.equal(calc40.finalPrice, 130000);
  assert.equal(calc40.discountCode, 'OFF-IE-40P');

  // Above ceiling (100 points) -> clamped to maxPoints (80 points = 40,000 Tomans)
  const calc100 = calculateFinalPayable(150000, 100, undefined, workshop);
  assert.equal(calc100.pointsUsed, 80);
  assert.equal(calc100.discountAmount, 40000);
  assert.equal(calc100.finalPrice, 110000);

  // Disabled per-workshop toggle -> 0 discount
  const disabledWorkshop = normalizeEvent({
    ...workshop,
    allowPointsDiscount: false,
  });
  const calcDisabled = calculateFinalPayable(150000, 40, undefined, disabledWorkshop);
  assert.equal(calcDisabled.pointsUsed, 0);
  assert.equal(calcDisabled.discountAmount, 0);
  assert.equal(calcDisabled.finalPrice, 150000);

  // Continuous Telegram channel pinning guarantees all posts have isPinned = true
  const pinnedList = ensureContinuousPinnedAnnouncements([
    {
      id: 'post-1',
      title: 'اطلاعیه جدید',
      snippet: 'خلاصه',
      content: 'متن کامل',
      timestamp: '۱۴۰۴/۰۸/۲۰',
      tag: 'اطلاعیه',
      author: 'کانال رسمی (@Isefum)',
      views: 100,
      isPinned: false,
    },
  ]);
  assert.equal(pinnedList.every((p) => p.isPinned === true), true);
});

test('isProtectedMasterAccount strictly checks Telegram ID 629890497 and isFakeTestAccount filters 4011234567 / سپهر خاکپور', () => {
  // Real master admin with numeric Telegram ID 629890497 is protected
  assert.equal(
    isProtectedMasterAccount({ telegramUserId: '629890497', studentId: '4012223344' }),
    true
  );
  assert.equal(isProtectedMasterAccount({ id: 'usr-629890497' }), true);

  // Dummy/fake account with studentId 4011234567 without 629890497 is NOT protected and IS flagged as fake
  assert.equal(
    isProtectedMasterAccount({ studentId: '4011234567', telegramUserId: 'web-local' }),
    false
  );
  assert.equal(
    isFakeTestAccount({ fullName: 'سپهر خاکپور', studentId: '4011234567' }),
    true
  );
  assert.equal(isFakeTestAccount({ studentId: '4011234567' }), true);
  assert.equal(
    isFakeTestAccount({ fullName: 'سارا حسینی', studentId: '4011112233' }),
    false
  );
});

test('saveAdminStudentOverride and applyAdminOverridesToStudents prevent stale server polls from reverting KYC lock or account ban', () => {
  // Admin locks KYC and bans account for student 40409764351 (telegramId: 8941039254)
  saveAdminStudentOverride(['8941039254', '40409764351'], {
    kycStatus: 'required',
    isBanned: true,
  });

  // Server bootstrap returns stale record with kycStatus: 'verified' and isBanned: false
  const staleServerList: AdminStudentDossier[] = [
    {
      id: '8941039254',
      telegramId: '8941039254',
      fullName: 'جواد خیابانی',
      studentId: '40409764351',
      cohortYear: '1404',
      phone: '09150000000',
      score: 0,
      level: 1,
      kycStatus: 'verified',
      isBanned: false,
      attendedEvents: [],
      badges: [],
      payments: [],
      chatLogs: [],
    },
  ];

  const reconciled = applyAdminOverridesToStudents(staleServerList);
  assert.equal(reconciled.length, 1);
  assert.equal(reconciled[0].kycStatus, 'required');
  assert.equal(reconciled[0].isBanned, true);

  // Admin later unlocks KYC and unbans account
  saveAdminStudentOverride(['8941039254', '40409764351'], {
    kycStatus: 'verified',
    isBanned: false,
  });
  const unlocked = applyAdminOverridesToStudents(staleServerList);
  assert.equal(unlocked[0].kycStatus, 'verified');
  assert.equal(unlocked[0].isBanned, false);
});
