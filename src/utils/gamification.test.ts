import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getFilteredLeaderboard,
  redeemLootboxChest,
  SHOWCASE_BADGES,
  DEFAULT_CERTIFICATES,
  DEFAULT_LOOTBOX_CONFIG,
} from './gamification';
import { computeStateChecksum } from './security';
import { AdminStudentDossier, UserProfile } from '../types';

const MOCK_USER: UserProfile = {
  id: 'usr-4011234567',
  firstName: 'علی',
  lastName: 'محمدی',
  fullName: 'علی محمدی',
  studentId: '4011234567',
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
