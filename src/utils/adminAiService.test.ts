import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  getSafeApiKey,
  buildLocalAdminLootiReply,
  parseRawProfessorScheduleDeterministic,
  parseMultiProfessorSchedules,
  parseNaturalLanguageTimerDeterministic,
} from './adminAiService.ts';
import {
  resolveBotEndpoint,
  loadStoredCustomUiTexts,
  saveStoredCustomUiTexts,
} from './apiBridge.ts';

describe('adminAiService safety, server AI routes, and visual text editor helpers', () => {
  it('getSafeApiKey never exposes any client-side API key in browser code', () => {
    const key = getSafeApiKey();
    assert.equal(key, '');
  });

  it('resolveBotEndpoint resolves /api/miniapp/ai-chat, /api/miniapp/admin-update-secrets, and /api/miniapp/admin-save-ui-texts', () => {
    assert.ok(
      resolveBotEndpoint('/api/miniapp/ai-chat').endsWith('/api/miniapp/ai-chat')
    );
    assert.ok(
      resolveBotEndpoint('/api/miniapp/admin-update-secrets').endsWith(
        '/api/miniapp/admin-update-secrets'
      )
    );
    assert.ok(
      resolveBotEndpoint('/api/miniapp/admin-save-ui-texts').endsWith(
        '/api/miniapp/admin-save-ui-texts'
      )
    );
  });

  it('loadStoredCustomUiTexts and saveStoredCustomUiTexts safely handle non-DOM or empty storage', () => {
    const loaded = loadStoredCustomUiTexts();
    assert.equal(typeof loaded, 'object');
    saveStoredCustomUiTexts({ 'کارگاه‌ها': 'دوره‌های تخصصی صنایع' });
  });

  it('buildLocalAdminLootiReply returns Mashdi Persian persona response', () => {
    const reply = buildLocalAdminLootiReply('وضعیت آمار ورودی‌ها چطوره؟');
    assert.ok(reply.includes('ستون'));
    assert.ok(reply.includes('حله رفیق'));
  });

  it('parseRawProfessorScheduleDeterministic extracts professor name, room, and courses', () => {
    const raw =
      'دکتر بهرام ستوده - اتاق ۳۰۴ - شنبه و دوشنبه ساعت ۱۱ الی ۱۳ - درس تحقیق در عملیات و شبیه‌سازی';
    const parsed = parseRawProfessorScheduleDeterministic(raw);
    assert.ok(parsed.name.includes('دکتر بهرام ستوده'));
    assert.ok(parsed.office.includes('اتاق ۳۰۴'));
    assert.ok(Array.isArray(parsed.courses));
    assert.ok(parsed.courses.length >= 2);
  });

  it('parseMultiProfessorSchedules parses pipe-separated multi-course Persian professor timetable accurately', () => {
    const raw =
      'دکتر علی رضایی (دانشیار) - اتاق ۳۱۲ | درس تحقیق در عملیات ۱: شنبه و دوشنبه ساعت ۸ تا ۱۰ کلاس ۲۰۴ | درس کنترل کیفیت: سه‌شنبه ساعت ۱۴ تا ۱۶ کلاس ۱۰۱ | حضور در دفتر: یکشنبه‌ها ساعت ۱۰ تا ۱۲';
    const list = parseMultiProfessorSchedules(raw);
    assert.equal(list.length, 1);
    assert.ok(list[0].name.includes('دکتر علی رضایی'));
    assert.ok(list[0].title.includes('دانشیار'));
    assert.ok(list[0].office.includes('اتاق ۳۱۲'));
    assert.ok(list[0].officeHours.includes('یکشنبه‌ها ساعت ۱۰ تا ۱۲'));
    assert.equal(list[0].courses.length, 2);
    assert.equal(list[0].courses[0].name, 'تحقیق در عملیات ۱');
    assert.ok(list[0].courses[0].room.includes('کلاس ۲۰۴'));
    assert.equal(list[0].courses[1].name, 'کنترل کیفیت');
    assert.ok(list[0].courses[1].room.includes('کلاس ۱۰۱'));
  });

  it('parseNaturalLanguageTimerDeterministic parses weekly Persian reminder sentence', () => {
    const timer = parseNaturalLanguageTimerDeterministic(
      'هر چهارشنبه ساعت ۱۴ یادآوری رزرو سلف'
    );
    assert.equal(timer.frequency, 'هفتگی');
    assert.equal(timer.dayOfWeek, 'چهارشنبه');
    assert.equal(timer.time, '۱۴:۰۰');
    assert.ok(timer.title.includes('یادآوری رزرو سلف'));
  });

  it('parseNaturalLanguageTimerDeterministic parses exact startDate and one-time execution', () => {
    const timer = parseNaturalLanguageTimerDeterministic(
      'در تاریخ ۱۴۰۴/۰۸/۲۸ فقط یکبار ساعت ۱۸:۳۰ یادآوری همایش هوش مصنوعی برای ورودی ۱۴۰۲'
    );
    assert.equal(timer.frequency, 'یکبار');
    assert.equal(timer.startDate, '۱۴۰۴/۰۸/۲۸');
    assert.equal(timer.time, '۱۸:۳۰');
    assert.ok(timer.targetAudience.includes('۱۴۰۲'));
  });
});

