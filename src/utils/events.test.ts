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

test('calculatePointDiscount converts 10 points to 50,000 Tomans correctly', () => {
  assert.equal(calculatePointDiscount(0), 0);
  assert.equal(calculatePointDiscount(9), 0); // Less than 10 points gives 0 step
  assert.equal(calculatePointDiscount(10), 50000);
  assert.equal(calculatePointDiscount(20), 100000);
  assert.equal(calculatePointDiscount(25), 100000);
  assert.equal(calculatePointDiscount(50), 250000);
});

test('calculateMaxRedeemablePoints respects base price and user points', () => {
  // If event costs 150,000, max points needed is 30 points (3 * 50,000)
  assert.equal(calculateMaxRedeemablePoints(150000, 100), 30);
  // If user only has 20 points, max is 20
  assert.equal(calculateMaxRedeemablePoints(150000, 20), 20);
  // Free event
  assert.equal(calculateMaxRedeemablePoints(0, 100), 0);
});

test('calculateFinalPayable calculates exact payable and deductions', () => {
  // 150,000 with 20 points discount (100,000) -> 50,000
  const res1 = calculateFinalPayable(150000, 20);
  assert.equal(res1.discountAmount, 100000);
  assert.equal(res1.finalPrice, 50000);
  assert.equal(res1.pointsUsed, 20);

  // 150,000 with 30 points discount (150,000) -> 0 (Free!)
  const res2 = calculateFinalPayable(150000, 30);
  assert.equal(res2.discountAmount, 150000);
  assert.equal(res2.finalPrice, 0);
  assert.equal(res2.pointsUsed, 30);

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
  const payload = generateTicketPayload('ev-1', '4021202422', 'TK-998');
  assert.ok(payload.startsWith('IE-TICKET:ev-1:4021202422:TK-998:'));
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
