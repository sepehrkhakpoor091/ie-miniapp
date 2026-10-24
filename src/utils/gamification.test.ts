import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getFilteredLeaderboard,
  getCohortBattleStats,
  redeemLootboxChest,
  SHOWCASE_BADGES,
  DEFAULT_CERTIFICATES,
} from './gamification';
import { computeStateChecksum } from './security';
import { UserProfile } from '../types';

const MOCK_USER: UserProfile = {
  id: 'usr-4021202422',
  firstName: 'امیرحسین',
  lastName: 'رضایی',
  fullName: 'امیرحسین رضایی',
  studentId: '4021202422',
  cohortYear: '۱۴۰۲',
  avatar: '01_avatar_boy.png',
  score: 280,
  level: 3,
  rankTitle: 'سطح ۳ - مهندس آینده',
  verifiedTelegramPhone: '۰۹۱۲۳۴۵۶۷۸۹',
  kycStatus: 'verified',
};

test('SHOWCASE_BADGES and DEFAULT_CERTIFICATES have valid cryptographic hashes', () => {
  assert.equal(SHOWCASE_BADGES.length, 5);
  assert.ok(SHOWCASE_BADGES.every((b) => b.verificationHash.length >= 8));
  assert.equal(DEFAULT_CERTIFICATES.length, 5);
  assert.ok(DEFAULT_CERTIFICATES.every((c) => c.certificateId.startsWith('CERT-402-')));
});

test('getFilteredLeaderboard filters by cohort and recalculates 1-based rank', () => {
  const allStudents = getFilteredLeaderboard('all', MOCK_USER);
  assert.ok(allStudents.length >= 10);
  assert.equal(allStudents[0].rank, 1);

  const cohort402 = getFilteredLeaderboard('۱۴۰۲', MOCK_USER);
  assert.ok(cohort402.every((s) => s.cohortYear === '۱۴۰۲'));
  const userIn402 = cohort402.find((s) => s.isCurrentUser);
  assert.ok(userIn402);
  assert.equal(userIn402.rank, 4); // Rank 4 in cohort 1402!
});

test('getCohortBattleStats sorts cohorts descending by total points', () => {
  const stats = getCohortBattleStats(MOCK_USER);
  assert.equal(stats[0].cohortYear, '۱۴۰۲');
  assert.equal(stats[0].totalPoints, 4850); // 4570 + 280 = 4850
});

test('redeemLootboxChest enforces anti-tamper checksum and issues OFF-IE402-XXXX vouchers', () => {
  const validChecksum = computeStateChecksum(MOCK_USER.score, MOCK_USER.studentId, MOCK_USER.level);

  // 1. Valid Bronze chest (50 pts)
  const resBronze = redeemLootboxChest('bronze', MOCK_USER, validChecksum, 0.75);
  assert.equal(resBronze.success, true);
  assert.equal(resBronze.costPoints, 50);
  assert.ok(resBronze.voucher?.code.startsWith('OFF-IE402-'));

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
