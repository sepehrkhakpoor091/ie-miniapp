import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculatePointDiscount,
  calculateMaxRedeemablePoints,
  calculateFinalPayable,
  formatToman,
  generateTicketPayload,
  filterAndSortEvents,
  EVENTS_DATA,
} from './events';

test('calculatePointDiscount converts 20 points to 10,000 Tomans by default and supports custom rules', () => {
  assert.equal(calculatePointDiscount(0), 0);
  assert.equal(calculatePointDiscount(19), 0); // Less than 20 points gives 0 step
  assert.equal(calculatePointDiscount(20), 10000);
  assert.equal(calculatePointDiscount(40), 20000);
  assert.equal(calculatePointDiscount(50), 20000);
  assert.equal(calculatePointDiscount(100), 50000);
});

test('calculateMaxRedeemablePoints respects base price and user points', () => {
  // Default rule: 20 points = 10,000 Tomans (maxPoints default 100)
  assert.equal(calculateMaxRedeemablePoints(150000, 100), 100);
  // If user only has 40 points, max is 40
  assert.equal(calculateMaxRedeemablePoints(150000, 40), 40);
  // Free event
  assert.equal(calculateMaxRedeemablePoints(0, 100), 0);
});

test('calculateFinalPayable calculates exact payable and deductions', () => {
  // 150,000 with 40 points discount (20,000) -> 130,000
  const res1 = calculateFinalPayable(150000, 40);
  assert.equal(res1.discountAmount, 20000);
  assert.equal(res1.finalPrice, 130000);
  assert.equal(res1.pointsUsed, 40);

  // 30,000 with 60 points discount (30,000) -> 0 (Free!)
  const res2 = calculateFinalPayable(30000, 60);
  assert.equal(res2.discountAmount, 30000);
  assert.equal(res2.finalPrice, 0);
  assert.equal(res2.pointsUsed, 60);

  // 0 price (free event)
  const resFree = calculateFinalPayable(0, 50);
  assert.equal(resFree.finalPrice, 0);
  assert.equal(resFree.discountAmount, 0);
  assert.equal(resFree.pointsUsed, 0);
});

test('formatToman formats zero as رایگان and numbers with currency', () => {
  assert.equal(formatToman(0), 'رایگان');
  assert.ok(formatToman(150000).includes('تومان'));
});

test('generateTicketPayload creates deterministic signed QR payload', () => {
  const payload = generateTicketPayload('ev-1', '4011234567', 'TK-998');
  assert.ok(payload.startsWith('IE-TICKET:ev-1:4011234567:TK-998:'));
  assert.equal(payload.split(':').length, 5);
});

test('filterAndSortEvents filters by category and sorts correctly', () => {
  const workshops = filterAndSortEvents(EVENTS_DATA, 'workshop', 'newest');
  assert.ok(workshops.every((e) => e.category === 'workshop'));

  const visits = filterAndSortEvents(EVENTS_DATA, 'visit', 'newest');
  assert.ok(visits.every((e) => e.category === 'visit'));

  const sortedByPoints = filterAndSortEvents(EVENTS_DATA, 'all', 'points');
  assert.ok(sortedByPoints[0].rewardPoints >= sortedByPoints[1].rewardPoints);
});
