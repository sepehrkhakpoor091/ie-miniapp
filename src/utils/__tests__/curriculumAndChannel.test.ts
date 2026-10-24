import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizeTelegramChannelHandle,
  parseTelegramChannelHtml,
  parseTelegramViewCount,
} from '../channelSync';
import {
  buildPresetCurriculumState,
  calculateCurriculumProgress,
  checkElectiveEligibility,
  DEFAULT_CURRICULUM_STATE,
  evaluateCourseUnlockStatus,
  findCourseById,
  findElectiveById,
  FUM_IE_CURRICULUM,
  FUM_IE_ELECTIVE_OPTIONS,
  getCourseDependencies,
  TOTAL_DEGREE_UNITS,
} from '../curriculumData';

describe('Telegram Channel Sync Engine (@Isefum)', () => {
  it('normalizes https://t.me/Isefum and @Isefum handles accurately', () => {
    assert.equal(normalizeTelegramChannelHandle('https://t.me/Isefum'), 'Isefum');
    assert.equal(normalizeTelegramChannelHandle('https://t.me/s/Isefum'), 'Isefum');
    assert.equal(normalizeTelegramChannelHandle('@Isefum'), 'Isefum');
    assert.equal(normalizeTelegramChannelHandle('ie_fum'), 'ie_fum');
    assert.equal(normalizeTelegramChannelHandle(''), 'Isefum');
  });

  it('parses Telegram view counts (K/M/numeric)', () => {
    assert.equal(parseTelegramViewCount('1.4K'), 1400);
    assert.equal(parseTelegramViewCount('820'), 820);
  });

  it('extracts posts from Telegram /s/ HTML preview', () => {
    const sampleHtml = `
      <div class="tgme_widget_message" data-post="Isefum/2201">
        <div class="tgme_widget_message_text">کارگاه تحلیل داده با پایتون<br/>ثبت‌نام آغاز شد #کارگاه</div>
        <span class="tgme_widget_message_views">1.2K</span>
        <time datetime="2025-10-20T12:00:00+00:00"></time>
      </div>
    `;
    const posts = parseTelegramChannelHtml(sampleHtml, 'https://t.me/Isefum');
    assert.equal(posts.length, 1);
    assert.equal(posts[0].postId, '2201');
    assert.equal(posts[0].channelHandle, 'Isefum');
    assert.equal(posts[0].postUrl, 'https://t.me/Isefum/2201');
    assert.ok(posts[0].title.includes('کارگاه تحلیل داده با پایتون'));
  });
});

describe('FUM Industrial Engineering 142-Unit Curriculum & Prerequisite Graph', () => {
  it('contains all 8 semesters and 15 official elective courses', () => {
    const terms = new Set(FUM_IE_CURRICULUM.map((c) => c.term));
    assert.equal(terms.size, 8);
    assert.equal(FUM_IE_ELECTIVE_OPTIONS.length, 15);
    assert.equal(TOTAL_DEGREE_UNITS, 142);
  });

  it('marks prob_theory and or1 as key circular hubs with downstream dependencies', () => {
    const or1Deps = getCourseDependencies('or1');
    const probDeps = getCourseDependencies('prob_theory');
    assert.ok(or1Deps.course?.isKeyHub);
    assert.ok(probDeps.course?.isKeyHub);
    assert.ok(
      or1Deps.downstreamCurriculumCourses.length +
        or1Deps.downstreamElectiveCourses.length >=
        5
    );
    assert.ok(
      probDeps.downstreamCurriculumCourses.length +
        probDeps.downstreamElectiveCourses.length >=
        5
    );
  });

  it('evaluates prerequisite unlocking and locks courses when prerequisites are missing', () => {
    const or2 = findCourseById('or2')!;
    // In DEFAULT_CURRICULUM_STATE, Terms 1-3 are passed and or1 (Term 4) is in currentTermCourseIds, not passed
    const evalBeforeOr1Passed = evaluateCourseUnlockStatus(or2, DEFAULT_CURRICULUM_STATE);
    assert.equal(evalBeforeOr1Passed.status, 'locked');
    assert.ok(evalBeforeOr1Passed.missingPrereqIds.includes('or1'));

    // After passing Term 4, or2 becomes unlocked
    const stateAfterTerm4 = buildPresetCurriculumState(4, 5);
    const evalAfterTerm4 = evaluateCourseUnlockStatus(or2, stateAfterTerm4);
    assert.equal(evalAfterTerm4.status, 'current');
  });

  it('checks elective eligibility against passed courses and calculates GPA accurately', () => {
    const aiElective = findElectiveById('el_ai_ml')!; // requires comp_prog + eng_stats
    const eligBeforeTerm4 = checkElectiveEligibility(aiElective, DEFAULT_CURRICULUM_STATE);
    assert.equal(eligBeforeTerm4.isEligible, false);

    const stateAfterTerm4 = buildPresetCurriculumState(4);
    const eligAfterTerm4 = checkElectiveEligibility(aiElective, stateAfterTerm4);
    assert.equal(eligAfterTerm4.isEligible, true);

    const progress = calculateCurriculumProgress(DEFAULT_CURRICULUM_STATE);
    assert.equal(progress.passedUnitsTotal, 55); // Term 1 (18) + Term 2 (19) + Term 3 (18) = 55 units
    assert.ok(progress.weightedGpa > 17 && progress.weightedGpa <= 20);
  });
});
