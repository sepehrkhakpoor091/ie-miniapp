/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Interactive Industrial Engineering Curriculum & Prerequisite Flowchart Modal
 * 100% Based on Ferdowsi University of Mashhad (I.E.C.F - مصوب ۱۳۹۹) 142-Unit Chart
 * Ultra-Clean Mobile & Desktop Layout (No GPA clutter, full viewport visibility for courses)
 */

import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  CourseCategory,
  CurriculumCourse,
  StudentCurriculumState,
  ThemeMode,
} from '../../types';
import {
  buildPresetCurriculumState,
  calculateCurriculumProgress,
  CATEGORY_METADATA,
  checkElectiveEligibility,
  CURRICULUM_STORAGE_KEY,
  DEFAULT_CURRICULUM_STATE,
  evaluateCourseUnlockStatus,
  findCourseById,
  findElectiveById,
  FUM_IE_CURRICULUM,
  FUM_IE_ELECTIVE_OPTIONS,
  getCourseDependencies,
  getEffectiveCourseUnits,
  TOTAL_DEGREE_UNITS,
} from '../../utils/curriculumData';
import { playCoin, playSwitch, playTick } from '../../utils/soundEngine';

interface CurriculumModalProps {
  isOpen: boolean;
  onClose: () => void;
  themeMode: ThemeMode;
  studentCohortYear?: string;
}

type ViewMode = 'semesters' | 'flowchart' | 'electives';

const TERM_TITLES: Record<number, string> = {
  1: 'ترم اول',
  2: 'ترم دوم',
  3: 'ترم سوم',
  4: 'ترم چهارم',
  5: 'ترم پنجم',
  6: 'ترم ششم',
  7: 'ترم هفتم',
  8: 'ترم هشتم',
};

const TERM_SHORT_TITLES: Record<number, string> = {
  1: 'ترم ۱',
  2: 'ترم ۲',
  3: 'ترم ۳',
  4: 'ترم ۴',
  5: 'ترم ۵',
  6: 'ترم ۶',
  7: 'ترم ۷',
  8: 'ترم ۸',
};

export const CurriculumModal: React.FC<CurriculumModalProps> = ({
  isOpen,
  onClose,
  themeMode,
}) => {
  const isNight = themeMode === 'night';

  const [curriculumState, setCurriculumState] = useState<StudentCurriculumState>(() => {
    try {
      const saved = localStorage.getItem(CURRICULUM_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && Array.isArray(parsed.passedCourseIds)) {
          return {
            ...DEFAULT_CURRICULUM_STATE,
            ...parsed,
          };
        }
      }
    } catch {
      // use default
    }
    return DEFAULT_CURRICULUM_STATE;
  });

  const [viewMode, setViewMode] = useState<ViewMode>('semesters');
  const [selectedMobileTerm, setSelectedMobileTerm] = useState<number>(4);
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<
    CourseCategory | 'all'
  >('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isStatsExpanded, setIsStatsExpanded] = useState(false);
  const [focusedCourseId, setFocusedCourseId] = useState<string>('or1');
  const [selectedElectiveSlot, setSelectedElectiveSlot] = useState<string>('elec_slot1');

  useEffect(() => {
    try {
      localStorage.setItem(CURRICULUM_STORAGE_KEY, JSON.stringify(curriculumState));
    } catch {
      // ignore storage errors
    }
  }, [curriculumState]);

  const progress = useMemo(
    () => calculateCurriculumProgress(curriculumState),
    [curriculumState]
  );

  const focusedDeps = useMemo(
    () => getCourseDependencies(focusedCourseId),
    [focusedCourseId]
  );

  if (!isOpen) return null;

  const handleCycleCourseStatus = (courseId: string) => {
    playTick();
    setCurriculumState((prev) => {
      const isPassed = prev.passedCourseIds.includes(courseId);
      const isCurrent = prev.currentTermCourseIds.includes(courseId);

      // Cycle: None -> Passed (✅) -> Current Term (⏳) -> None
      if (!isPassed && !isCurrent) {
        playCoin();
        return {
          ...prev,
          passedCourseIds: [...prev.passedCourseIds, courseId],
          currentTermCourseIds: prev.currentTermCourseIds.filter((id) => id !== courseId),
        };
      }
      if (isPassed) {
        return {
          ...prev,
          passedCourseIds: prev.passedCourseIds.filter((id) => id !== courseId),
          currentTermCourseIds: [...prev.currentTermCourseIds, courseId],
        };
      }
      return {
        ...prev,
        passedCourseIds: prev.passedCourseIds.filter((id) => id !== courseId),
        currentTermCourseIds: prev.currentTermCourseIds.filter((id) => id !== courseId),
      };
    });
  };

  const handleSetCourseStatusExplicit = (
    courseId: string,
    target: 'passed' | 'current' | 'clear'
  ) => {
    playCoin();
    setCurriculumState((prev) => {
      const cleanPassed = prev.passedCourseIds.filter((id) => id !== courseId);
      const cleanCurrent = prev.currentTermCourseIds.filter((id) => id !== courseId);

      if (target === 'passed') {
        return {
          ...prev,
          passedCourseIds: [...cleanPassed, courseId],
          currentTermCourseIds: cleanCurrent,
        };
      }
      if (target === 'current') {
        return {
          ...prev,
          passedCourseIds: cleanPassed,
          currentTermCourseIds: [...cleanCurrent, courseId],
        };
      }
      return {
        ...prev,
        passedCourseIds: cleanPassed,
        currentTermCourseIds: cleanCurrent,
      };
    });
  };

  const handleAssignElectiveToSlot = (slotId: string, electiveId: string) => {
    playCoin();
    setCurriculumState((prev) => ({
      ...prev,
      assignedElectives: {
        ...(prev.assignedElectives || {}),
        [slotId]: electiveId,
      },
    }));
  };

  const handleOpenCourseInFlowchart = (courseId: string) => {
    playSwitch();
    setFocusedCourseId(courseId);
    setViewMode('flowchart');
  };

  const renderCourseCard = (course: CurriculumCourse) => {
    const evalResult = evaluateCourseUnlockStatus(course, curriculumState);
    const catMeta = CATEGORY_METADATA[course.category];
    const effectiveUnits = getEffectiveCourseUnits(course, curriculumState);
    const assignedElective =
      course.isElectiveSlot && curriculumState.assignedElectives?.[course.id]
        ? findElectiveById(curriculumState.assignedElectives[course.id])
        : undefined;

    const displayTitle = assignedElective
      ? `${course.title}: ${assignedElective.title}`
      : course.title;

    const statusBadge = {
      passed: {
        label: '✅ پاس شده',
        cls: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
      },
      current: {
        label: '⏳ ترم جاری',
        cls: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
      },
      unlocked: {
        label: '🔓 باز و مجاز',
        cls: isNight
          ? 'bg-sky-500/20 text-sky-300 border-sky-500/40'
          : 'bg-sky-600/15 text-sky-900 border-sky-600/30',
      },
      locked: {
        label: '🔒 قفل پیشنیاز',
        cls: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
      },
    }[evalResult.status];

    return (
      <div
        key={course.id}
        className={`rounded-2xl border p-3 transition-all relative flex flex-col justify-between gap-2 ${
          isNight ? catMeta.cardBorderNight : catMeta.cardBorderDay
        } ${
          evalResult.status === 'passed'
            ? 'ring-1 ring-emerald-500/60'
            : evalResult.status === 'current'
            ? 'ring-1 ring-amber-400/70'
            : evalResult.status === 'locked'
            ? 'opacity-80'
            : ''
        }`}
      >
        {/* Top Row: Title + Category/Units */}
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <div
              className={`text-xs lg:text-[13px] font-black leading-snug ${
                isNight ? 'text-[#F6F1E7]' : 'text-[#14201B]'
              }`}
            >
              {displayTitle}
            </div>
            {course.yearCondition && (
              <div className="text-[10px] font-extrabold text-[#E77F6E] mt-0.5">
                ⚠️ {course.yearCondition}
              </div>
            )}
          </div>

          <span
            className={`text-[10px] font-black px-2 py-0.5 rounded-lg border shrink-0 ${catMeta.badgeBg} ${
              isNight ? catMeta.badgeText : 'text-[#14201B]'
            }`}
          >
            {catMeta.shortLabel} • {effectiveUnits.toLocaleString('fa-IR')} واحد
          </span>
        </div>

        {/* Key Hub or Missing Prereq Info */}
        {course.isKeyHub && (
          <div className="text-[10px] font-black px-2 py-0.5 rounded-lg bg-[#D4AB58]/20 text-[#D4AB58] w-fit">
            ⭕ گره کلیدی چارت
          </div>
        )}

        {evalResult.status === 'locked' && evalResult.missingPrereqTitles.length > 0 && (
          <div className="text-[10px] font-bold px-2 py-1 rounded-lg bg-rose-500/15 border border-rose-500/30 text-rose-300">
            پیشنیاز: {evalResult.missingPrereqTitles.join('، ')}
          </div>
        )}

        {course.coreqs.length > 0 && (
          <div className="text-[10px] font-bold opacity-80">
            همنیاز: {course.coreqs.map((id) => findCourseById(id)?.title || id).join('، ')}
          </div>
        )}

        {/* Action Buttons Row */}
        <div className="flex items-center justify-between gap-1.5 pt-1">
          <button
            type="button"
            onClick={() => handleCycleCourseStatus(course.id)}
            className={`flex-1 py-1.5 px-2.5 rounded-xl border text-[11px] font-black cursor-pointer transition-transform active:scale-95 text-center ${statusBadge.cls}`}
          >
            {statusBadge.label}
          </button>

          {course.isElectiveSlot ? (
            <button
              type="button"
              onClick={() => {
                playTick();
                setSelectedElectiveSlot(course.id);
                setViewMode('electives');
              }}
              className="py-1.5 px-2.5 rounded-xl bg-[#D4AB58]/20 border border-[#D4AB58]/50 text-[#D4AB58] text-[10px] font-black cursor-pointer shrink-0"
            >
              🧩 انتخاب درس
            </button>
          ) : (
            <button
              type="button"
              onClick={() => handleOpenCourseInFlowchart(course.id)}
              className={`py-1.5 px-2.5 rounded-xl border text-[10px] font-black cursor-pointer shrink-0 ${
                isNight
                  ? 'bg-[#101622]/80 border-white/15 text-[#F6F1E7] hover:border-[#D4AB58]'
                  : 'bg-white border-[#C8BFA8] text-[#14201B] hover:border-[#354B40]'
              }`}
            >
              🕸️ روابط
            </button>
          )}
        </div>
      </div>
    );
  };

  return (
    <AnimatePresence>
      <div
        className="fixed inset-0 z-50 flex items-end lg:items-center justify-center bg-black/75 backdrop-blur-sm p-0 lg:p-4 select-none"
        dir="rtl"
      >
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 30 }}
          transition={{ type: 'spring', stiffness: 350, damping: 30 }}
          className={`w-full max-w-7xl h-[93vh] lg:h-[90vh] rounded-t-3xl lg:rounded-3xl border-2 flex flex-col overflow-hidden shadow-2xl ${
            isNight
              ? 'bg-[#101622] border-[#2C3E4C] text-[#F6F1E7]'
              : 'bg-[#F6F1E7] border-[#C8BFA8] text-[#14201B]'
          }`}
        >
          {/* =================================================================
              1. ULTRA-COMPACT STICKY HEADER (Takes minimal height on Mobile)
             ================================================================= */}
          <div
            className={`px-3.5 lg:px-6 py-3 border-b space-y-2.5 shrink-0 ${
              isNight
                ? 'bg-[#151F2E] border-[#2C3E4C]'
                : 'bg-[#EAE3D2] border-[#C8BFA8]'
            }`}
          >
            {/* Top Title + Close Button */}
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-9 h-9 rounded-xl bg-[#354B40] border border-[#D4AB58] flex items-center justify-center text-base shrink-0">
                  🎓
                </div>
                <div className="min-w-0">
                  <h2 className="text-xs sm:text-sm lg:text-base font-black truncate">
                    چارت درسی مهندسی صنایع فردوسی (۱۴۲ واحد)
                  </h2>
                  <p
                    className={`text-[10px] font-bold truncate ${
                      isNight ? 'text-[#A3C1AD]' : 'text-[#3D5249]'
                    }`}
                  >
                    پاس‌شده: {progress.passedUnitsTotal.toLocaleString('fa-IR')} از ۱۴۲ واحد (
                    {progress.progressPercent.toLocaleString('fa-IR')}٪) • ترم جاری:{' '}
                    {progress.currentTermUnits.toLocaleString('fa-IR')} واحد
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  playTick();
                  onClose();
                }}
                className={`px-3 py-1.5 rounded-xl border text-xs font-black cursor-pointer shrink-0 flex items-center gap-1.5 ${
                  isNight
                    ? 'bg-[#1D2738] border-[#2C3E4C] text-[#F6F1E7] hover:border-rose-400'
                    : 'bg-white border-[#C8BFA8] text-[#14201B] hover:border-rose-500'
                }`}
              >
                <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 stroke-current fill-none" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
                <span>بستن</span>
              </button>
            </div>

            {/* Compact 3-Mode Segmented Control in a SINGLE horizontal row */}
            <div
              className={`grid grid-cols-3 gap-1 p-1 rounded-xl border ${
                isNight
                  ? 'bg-[#0E1520] border-[#2C3E4C]'
                  : 'bg-[#DFD7C4] border-[#C8BFA8]'
              }`}
            >
              <button
                type="button"
                onClick={() => {
                  playSwitch();
                  setViewMode('semesters');
                }}
                className={`py-2 px-1.5 rounded-lg text-[11px] lg:text-xs font-black cursor-pointer transition-all truncate ${
                  viewMode === 'semesters'
                    ? 'bg-[#D4AB58] text-[#101622] shadow'
                    : 'opacity-75 hover:opacity-100'
                }`}
              >
                📊 چارت ۸ ترمه
              </button>
              <button
                type="button"
                onClick={() => {
                  playSwitch();
                  setViewMode('flowchart');
                }}
                className={`py-2 px-1.5 rounded-lg text-[11px] lg:text-xs font-black cursor-pointer transition-all truncate ${
                  viewMode === 'flowchart'
                    ? 'bg-[#D4AB58] text-[#101622] shadow'
                    : 'opacity-75 hover:opacity-100'
                }`}
              >
                🕸️ درخت پیش‌نیاز
              </button>
              <button
                type="button"
                onClick={() => {
                  playSwitch();
                  setViewMode('electives');
                }}
                className={`py-2 px-1.5 rounded-lg text-[11px] lg:text-xs font-black cursor-pointer transition-all truncate ${
                  viewMode === 'electives'
                    ? 'bg-[#D4AB58] text-[#101622] shadow'
                    : 'opacity-75 hover:opacity-100'
                }`}
              >
                🧩 دروس اختیاری
              </button>
            </div>
          </div>

          {/* =================================================================
              2. MAIN SCROLLABLE BODY (Plenty of space for Courses!)
             ================================================================= */}
          <div className="flex-1 overflow-y-auto p-3.5 lg:p-6 space-y-3.5">
            {/* ===============================================================
                MODE 1: SEMESTER-BY-SEMESTER 8-TERM BOARD
               =============================================================== */}
            {viewMode === 'semesters' && (
              <div className="space-y-3.5">
                {/* Mobile Term Selector Pills FIRST so the user can immediately switch terms */}
                {!searchQuery.trim() && (
                  <div className="grid grid-cols-4 sm:grid-cols-8 lg:hidden gap-1.5">
                    {[1, 2, 3, 4, 5, 6, 7, 8].map((termNum) => (
                      <button
                        key={termNum}
                        type="button"
                        onClick={() => {
                          playTick();
                          setSelectedMobileTerm(termNum);
                        }}
                        className={`py-2 rounded-xl text-xs font-black border cursor-pointer transition-all ${
                          selectedMobileTerm === termNum
                            ? 'bg-[#354B40] text-[#F6F1E7] border-[#D4AB58] shadow'
                            : isNight
                            ? 'bg-[#151F2E] border-[#2C3E4C] text-[#A3C1AD]'
                            : 'bg-white border-[#C8BFA8] text-[#14201B]'
                        }`}
                      >
                        {TERM_SHORT_TITLES[termNum]}
                      </button>
                    ))}
                  </div>
                )}

                {/* Compact Search + Category Filter + Collapsible Stats Toggle */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-1.5">
                    {(
                      [
                        { id: 'all', label: 'همه دروس' },
                        { id: 'specialized', label: '🟦 تخصصی' },
                        { id: 'basic', label: '🟩 پایه' },
                        { id: 'general', label: '🟨 عمومی' },
                        { id: 'elective', label: '⬛ اختیاری' },
                      ] as const
                    ).map((f) => (
                      <button
                        key={f.id}
                        type="button"
                        onClick={() => {
                          playTick();
                          setSelectedCategoryFilter(f.id);
                        }}
                        className={`px-2.5 py-1.5 rounded-xl text-[11px] font-black border shrink-0 cursor-pointer ${
                          selectedCategoryFilter === f.id
                            ? 'bg-[#D4AB58] text-[#101622] border-[#8F6B24]'
                            : isNight
                            ? 'bg-[#151F2E] border-[#2C3E4C]'
                            : 'bg-white border-[#C8BFA8]'
                        }`}
                      >
                        {f.label}
                      </button>
                    ))}

                    <button
                      type="button"
                      onClick={() => {
                        playTick();
                        setIsStatsExpanded((prev) => !prev);
                      }}
                      className={`px-2.5 py-1.5 rounded-xl text-[11px] font-black border shrink-0 cursor-pointer ${
                        isStatsExpanded
                          ? 'bg-[#354B40] text-[#F6F1E7] border-[#D4AB58]'
                          : isNight
                          ? 'bg-[#151F2E] border-[#2C3E4C] text-[#D4AB58]'
                          : 'bg-white border-[#C8BFA8] text-[#354B40]'
                      }`}
                    >
                      {isStatsExpanded ? 'بستن آمار واحدها' : '📊 آمار واحدها و انتخاب ورودی'}
                    </button>
                  </div>

                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="جستجوی نام درس (مثلاً: تحقیق در عملیات، آمار...)"
                    className={`w-full sm:w-64 px-3 py-1.5 rounded-xl border text-xs font-bold ${
                      isNight
                        ? 'bg-[#151F2E] border-[#2C3E4C] text-[#F6F1E7]'
                        : 'bg-white border-[#C8BFA8] text-[#14201B]'
                    }`}
                  />
                </div>

                {/* Collapsible Unit Breakdown & Cohort Presets Drawer */}
                {isStatsExpanded && (
                  <div
                    className={`p-3 rounded-2xl border space-y-2.5 ${
                      isNight
                        ? 'bg-[#151F2E] border-[#2C3E4C]'
                        : 'bg-white border-[#C8BFA8]'
                    }`}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-1.5">
                      <span className="text-xs font-black">
                        ⚡ انتخاب سریع بر اساس ورودی:
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            playCoin();
                            setCurriculumState(buildPresetCurriculumState(2, 3));
                            setSelectedMobileTerm(3);
                          }}
                          className="px-2.5 py-1 rounded-lg bg-emerald-500/15 border border-emerald-500/40 text-emerald-400 text-[10px] font-black cursor-pointer"
                        >
                          ورودی ۱۴۰۳ (تا ترم ۲)
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            playCoin();
                            setCurriculumState(buildPresetCurriculumState(4, 5));
                            setSelectedMobileTerm(5);
                          }}
                          className="px-2.5 py-1 rounded-lg bg-sky-500/15 border border-sky-500/40 text-sky-300 text-[10px] font-black cursor-pointer"
                        >
                          ورودی ۱۴۰۲ (تا ترم ۴)
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            playCoin();
                            setCurriculumState(buildPresetCurriculumState(6, 7));
                            setSelectedMobileTerm(7);
                          }}
                          className="px-2.5 py-1 rounded-lg bg-purple-500/15 border border-purple-500/40 text-purple-300 text-[10px] font-black cursor-pointer"
                        >
                          ورودی ۱۴۰۱ (تا ترم ۶)
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            playTick();
                            setCurriculumState(buildPresetCurriculumState(0));
                            setSelectedMobileTerm(1);
                          }}
                          className="px-2.5 py-1 rounded-lg bg-rose-500/15 border border-rose-500/40 text-rose-400 text-[10px] font-black cursor-pointer"
                        >
                          🔄 ریست چارت
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5 text-[11px] font-black">
                      <div className="px-2.5 py-1.5 rounded-xl border border-[#E9C46A]/60 bg-[#E9C46A]/15 flex items-center justify-between">
                        <span>🟨 عمومی:</span>
                        <span>
                          {progress.byCategory.general.passed.toLocaleString('fa-IR')}/۲۲
                        </span>
                      </div>
                      <div className="px-2.5 py-1.5 rounded-xl border border-[#7FB69E]/60 bg-[#7FB69E]/15 flex items-center justify-between">
                        <span>🟩 پایه:</span>
                        <span>
                          {progress.byCategory.basic.passed.toLocaleString('fa-IR')}/۱۷
                        </span>
                      </div>
                      <div className="px-2.5 py-1.5 rounded-xl border border-[#5C95C5]/60 bg-[#5C95C5]/15 flex items-center justify-between">
                        <span>🟦 تخصصی:</span>
                        <span>
                          {progress.byCategory.specialized.passed.toLocaleString('fa-IR')}/۸۴
                        </span>
                      </div>
                      <div className="px-2.5 py-1.5 rounded-xl border border-[#8D99AE]/60 bg-[#8D99AE]/15 flex items-center justify-between">
                        <span>⬛ اختیاری:</span>
                        <span>
                          {progress.byCategory.elective.passed.toLocaleString('fa-IR')}/۱۹
                        </span>
                      </div>
                      <div className="px-2.5 py-1.5 rounded-xl border border-[#E77F6E]/60 bg-[#E77F6E]/15 flex items-center justify-between col-span-2 sm:col-span-1">
                        <span>🟧 کارآموزی:</span>
                        <span>
                          {progress.byCategory.internship.passed.toLocaleString('fa-IR')}/۲
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Desktop 4-Column Grid & Mobile Single-Term View */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3.5">
                  {[1, 2, 3, 4, 5, 6, 7, 8].map((termNum) => {
                    const isVisibleOnMobile =
                      searchQuery.trim().length > 0 || selectedMobileTerm === termNum;

                    const termCourses = FUM_IE_CURRICULUM.filter((c) => {
                      if (c.term !== termNum) return false;
                      if (
                        selectedCategoryFilter !== 'all' &&
                        c.category !== selectedCategoryFilter
                      ) {
                        return false;
                      }
                      if (searchQuery.trim()) {
                        return c.title.includes(searchQuery.trim());
                      }
                      return true;
                    });

                    if (termCourses.length === 0 && searchQuery.trim()) return null;

                    const termUnits = termCourses.reduce(
                      (sum, c) => sum + getEffectiveCourseUnits(c, curriculumState),
                      0
                    );

                    return (
                      <div
                        key={termNum}
                        className={`${
                          isVisibleOnMobile ? 'flex' : 'hidden lg:flex'
                        } flex-col rounded-2xl border p-3 space-y-2.5 ${
                          isNight
                            ? 'bg-[#151F2E] border-[#2C3E4C]'
                            : 'bg-[#FFFFFF] border-[#C8BFA8]'
                        }`}
                      >
                        <div className="flex items-center justify-between pb-2 border-b border-current/10">
                          <span className="text-xs font-black text-[#D4AB58]">
                            📅 {TERM_TITLES[termNum]}
                          </span>
                          <span className="text-[11px] font-bold opacity-80">
                            مجموع: {termUnits.toLocaleString('fa-IR')} واحد
                          </span>
                        </div>

                        <div className="space-y-2">
                          {termCourses.map((course) => renderCourseCard(course))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ===============================================================
                MODE 2: INTERACTIVE PREREQUISITE & CO-REQUISITE FLOWCHART TREE
               =============================================================== */}
            {viewMode === 'flowchart' && (
              <div className="space-y-4">
                <div
                  className={`p-3.5 rounded-2xl border space-y-3 ${
                    isNight
                      ? 'bg-[#151F2E] border-[#2C3E4C]'
                      : 'bg-white border-[#C8BFA8]'
                  }`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-xs font-black">
                      🕸️ گره‌های کلیدی چارت (بیشترین دروس وابسته):
                    </span>

                    <div className="flex flex-wrap items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          playTick();
                          setFocusedCourseId('or1');
                        }}
                        className={`px-3 py-1.5 rounded-xl text-xs font-black border cursor-pointer ${
                          focusedCourseId === 'or1'
                            ? 'bg-[#D4AB58] text-[#101622] border-[#8F6B24]'
                            : 'bg-[#D4AB58]/15 border-[#D4AB58]/50 text-[#D4AB58]'
                        }`}
                      >
                        ⭕ تحقیق در عملیات ۱
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          playTick();
                          setFocusedCourseId('prob_theory');
                        }}
                        className={`px-3 py-1.5 rounded-xl text-xs font-black border cursor-pointer ${
                          focusedCourseId === 'prob_theory'
                            ? 'bg-[#D4AB58] text-[#101622] border-[#8F6B24]'
                            : 'bg-[#D4AB58]/15 border-[#D4AB58]/50 text-[#D4AB58]'
                        }`}
                      >
                        ⭕ نظریه احتمال و کاربردها
                      </button>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                    <span className="text-xs font-black shrink-0">انتخاب درس:</span>
                    <select
                      value={focusedCourseId}
                      onChange={(e) => {
                        playTick();
                        setFocusedCourseId(e.target.value);
                      }}
                      className={`flex-1 px-3 py-2 rounded-xl border text-xs font-black ${
                        isNight
                          ? 'bg-[#101622] border-[#2C3E4C] text-[#F6F1E7]'
                          : 'bg-[#F6F1E7] border-[#C8BFA8] text-[#14201B]'
                      }`}
                    >
                      {FUM_IE_CURRICULUM.filter((c) => !c.isElectiveSlot).map((c) => (
                        <option key={c.id} value={c.id}>
                          ترم {c.term} — {c.title} ({c.units} واحد)
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {focusedDeps.course && (
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-3.5 items-stretch">
                    {/* COLUMN 1: PREREQUISITES */}
                    <div
                      className={`rounded-2xl border p-3.5 space-y-2.5 ${
                        isNight
                          ? 'bg-[#151F2E] border-[#2C3E4C]'
                          : 'bg-white border-[#C8BFA8]'
                      }`}
                    >
                      <div className="flex items-center justify-between border-b border-current/10 pb-2">
                        <span className="text-xs font-black text-amber-400">
                          ➡️ پیشنیازها و همنیازهای قبل از این درس
                        </span>
                      </div>

                      {focusedDeps.directPrereqs.length === 0 &&
                      focusedDeps.directCoreqs.length === 0 ? (
                        <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-black text-center">
                          ✅ بدون پیشنیاز (باز از ابتدای تحصیل)
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {focusedDeps.directPrereqs.map((pre) => {
                            const isPassed =
                              curriculumState.passedCourseIds.includes(pre.id);
                            return (
                              <div
                                key={pre.id}
                                onClick={() => {
                                  playTick();
                                  setFocusedCourseId(pre.id);
                                }}
                                className={`p-2.5 rounded-xl border cursor-pointer flex items-center justify-between ${
                                  isPassed
                                    ? 'border-emerald-500/60 bg-emerald-500/10'
                                    : 'border-rose-500/60 bg-rose-500/10'
                                }`}
                              >
                                <div>
                                  <div className="text-[10px] font-bold opacity-80">
                                    ━━ پیشنیاز (ترم {pre.term.toLocaleString('fa-IR')})
                                  </div>
                                  <div className="text-xs font-black">{pre.title}</div>
                                </div>
                                <span className="text-[10px] font-black px-2 py-0.5 rounded bg-black/20">
                                  {isPassed ? '✅ پاس شده' : '🔒 پاس نشده'}
                                </span>
                              </div>
                            );
                          })}

                          {focusedDeps.directCoreqs.map((co) => {
                            const isSatisfied =
                              curriculumState.passedCourseIds.includes(co.id) ||
                              curriculumState.currentTermCourseIds.includes(co.id);
                            return (
                              <div
                                key={co.id}
                                onClick={() => {
                                  playTick();
                                  setFocusedCourseId(co.id);
                                }}
                                className={`p-2.5 rounded-xl border border-dashed cursor-pointer flex items-center justify-between ${
                                  isSatisfied
                                    ? 'border-sky-400 bg-sky-500/10'
                                    : 'border-amber-400 bg-amber-500/10'
                                }`}
                              >
                                <div>
                                  <div className="text-[10px] font-bold opacity-80">
                                    ┅┅ همنیاز (ترم {co.term.toLocaleString('fa-IR')})
                                  </div>
                                  <div className="text-xs font-black">{co.title}</div>
                                </div>
                                <span className="text-[10px] font-black px-2 py-0.5 rounded bg-black/20">
                                  {isSatisfied ? '✅ رعایت شده' : '⏳ همزمان'}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    {/* COLUMN 2: SELECTED COURSE */}
                    <div
                      className={`rounded-2xl border-2 p-4 flex flex-col justify-between gap-3 ${
                        focusedDeps.course.isKeyHub
                          ? 'border-[#D4AB58] bg-gradient-to-b from-[#354B40]/40 to-transparent'
                          : isNight
                          ? 'bg-[#1A2639] border-[#5C95C5]'
                          : 'bg-[#EEF5FA] border-[#16576B]'
                      }`}
                    >
                      <div className="space-y-1.5 text-center">
                        <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-[#D4AB58] text-[#101622] text-[10px] font-black">
                          <span>درس انتخاب‌شده • ترم {focusedDeps.course.term.toLocaleString('fa-IR')}</span>
                        </div>

                        <h3 className="text-base font-black pt-1">
                          {focusedDeps.course.title}
                        </h3>

                        <p className="text-xs font-bold opacity-85">
                          {CATEGORY_METADATA[focusedDeps.course.category].shortLabel} •{' '}
                          {focusedDeps.course.units.toLocaleString('fa-IR')} واحد
                        </p>

                        {focusedDeps.course.note && (
                          <div className="p-2 rounded-xl bg-[#D4AB58]/20 border border-[#D4AB58]/50 text-[11px] font-black">
                            💡 {focusedDeps.course.note}
                          </div>
                        )}
                      </div>

                      <div className="grid grid-cols-3 gap-1.5">
                        <button
                          type="button"
                          onClick={() =>
                            handleSetCourseStatusExplicit(focusedDeps.course!.id, 'passed')
                          }
                          className={`py-2 rounded-xl text-[11px] font-black cursor-pointer border ${
                            curriculumState.passedCourseIds.includes(focusedDeps.course.id)
                              ? 'bg-emerald-600 text-white border-emerald-400'
                              : 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                          }`}
                        >
                          ✅ پاس شده
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            handleSetCourseStatusExplicit(focusedDeps.course!.id, 'current')
                          }
                          className={`py-2 rounded-xl text-[11px] font-black cursor-pointer border ${
                            curriculumState.currentTermCourseIds.includes(
                              focusedDeps.course.id
                            )
                              ? 'bg-amber-500 text-[#101622] border-amber-300'
                              : 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                          }`}
                        >
                          ⏳ ترم جاری
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            handleSetCourseStatusExplicit(focusedDeps.course!.id, 'clear')
                          }
                          className="py-2 rounded-xl text-[11px] font-black cursor-pointer border bg-rose-500/15 text-rose-300 border-rose-500/30"
                        >
                          🔄 آزاد
                        </button>
                      </div>
                    </div>

                    {/* COLUMN 3: DOWNSTREAM UNLOCKED COURSES */}
                    <div
                      className={`rounded-2xl border p-3.5 space-y-2.5 ${
                        isNight
                          ? 'bg-[#151F2E] border-[#2C3E4C]'
                          : 'bg-white border-[#C8BFA8]'
                      }`}
                    >
                      <div className="flex items-center justify-between border-b border-current/10 pb-2">
                        <span className="text-xs font-black text-sky-400">
                          ⬅️ دروسی که پس از این درس باز می‌شوند
                        </span>
                        <span className="text-[10px] font-black px-2 py-0.5 rounded bg-sky-500/20 text-sky-300">
                          {(
                            focusedDeps.downstreamCurriculumCourses.length +
                            focusedDeps.downstreamElectiveCourses.length
                          ).toLocaleString('fa-IR')}{' '}
                          درس
                        </span>
                      </div>

                      {focusedDeps.downstreamCurriculumCourses.length === 0 &&
                      focusedDeps.downstreamElectiveCourses.length === 0 ? (
                        <div className="p-3.5 rounded-xl bg-black/15 border border-current/10 text-xs font-bold text-center opacity-80">
                          این درس پیشنیاز درس دیگری در ترم‌های بعد نیست.
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {focusedDeps.downstreamCurriculumCourses.map((down) => {
                            const evalDown = evaluateCourseUnlockStatus(
                              down,
                              curriculumState
                            );
                            return (
                              <div
                                key={down.id}
                                onClick={() => {
                                  playTick();
                                  setFocusedCourseId(down.id);
                                }}
                                className={`p-2.5 rounded-xl border cursor-pointer flex items-center justify-between ${
                                  isNight
                                    ? 'bg-[#101622] border-[#2C3E4C]'
                                    : 'bg-[#F6F1E7] border-[#C8BFA8]'
                                }`}
                              >
                                <div>
                                  <div className="text-[10px] font-bold opacity-75">
                                    ترم {down.term.toLocaleString('fa-IR')}
                                  </div>
                                  <div className="text-xs font-black">{down.title}</div>
                                </div>
                                <span
                                  className={`text-[10px] font-black px-2 py-0.5 rounded ${
                                    evalDown.status === 'passed'
                                      ? 'bg-emerald-500/20 text-emerald-400'
                                      : evalDown.status === 'unlocked'
                                      ? 'bg-sky-500/20 text-sky-300'
                                      : 'bg-rose-500/20 text-rose-400'
                                  }`}
                                >
                                  {evalDown.status === 'passed'
                                    ? 'پاس شده'
                                    : evalDown.status === 'unlocked'
                                    ? '🔓 باز'
                                    : '🔒 قفل'}
                                </span>
                              </div>
                            );
                          })}

                          {focusedDeps.downstreamElectiveCourses.map((el) => (
                            <div
                              key={el.id}
                              onClick={() => {
                                playTick();
                                setViewMode('electives');
                              }}
                              className="p-2 rounded-xl border border-current/15 bg-black/15 flex items-center justify-between text-xs cursor-pointer"
                            >
                              <span className="font-bold">{el.title}</span>
                              <span className="text-[10px] font-black text-[#D4AB58]">
                                اختیاری ({el.units.toLocaleString('fa-IR')} واحد)
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ===============================================================
                MODE 3: 15 OFFICIAL ELECTIVE COURSES SELECTOR
               =============================================================== */}
            {viewMode === 'electives' && (
              <div className="space-y-3.5">
                <div
                  className={`p-3.5 rounded-2xl border space-y-2.5 ${
                    isNight
                      ? 'bg-[#151F2E] border-[#2C3E4C]'
                      : 'bg-white border-[#C8BFA8]'
                  }`}
                >
                  <div className="text-xs font-black">
                    🧩 جایگاه درس اختیاری (ترم ۷ و ۸) را انتخاب کنید:
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
                    {[
                      'elec_slot1',
                      'elec_slot2',
                      'elec_slot3',
                      'elec_slot4',
                      'elec_slot5',
                      'elec_slot6',
                    ].map((slotId, idx) => {
                      const assignedId = curriculumState.assignedElectives?.[slotId];
                      const assignedEl = assignedId
                        ? findElectiveById(assignedId)
                        : undefined;
                      const isSelected = selectedElectiveSlot === slotId;

                      return (
                        <button
                          key={slotId}
                          type="button"
                          onClick={() => {
                            playTick();
                            setSelectedElectiveSlot(slotId);
                          }}
                          className={`p-2 rounded-xl border text-right cursor-pointer transition-all ${
                            isSelected
                              ? 'border-[#D4AB58] bg-[#D4AB58]/20 ring-1 ring-[#D4AB58]'
                              : isNight
                              ? 'bg-[#101622] border-[#2C3E4C]'
                              : 'bg-[#F6F1E7] border-[#C8BFA8]'
                          }`}
                        >
                          <div className="text-[10px] font-black text-[#D4AB58]">
                            اختیاری {(idx + 1).toLocaleString('fa-IR')} (ترم{' '}
                            {idx < 3 ? '۷' : '۸'})
                          </div>
                          <div className="text-xs font-black truncate mt-0.5">
                            {assignedEl ? assignedEl.title : 'انتخاب نشده'}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Official 15 Electives Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {FUM_IE_ELECTIVE_OPTIONS.map((el) => {
                    const elig = checkElectiveEligibility(el, curriculumState);
                    const assignedSlotKey = Object.entries(
                      curriculumState.assignedElectives || {}
                    ).find(([, val]) => val === el.id)?.[0];

                    return (
                      <div
                        key={el.id}
                        className={`p-3 rounded-2xl border flex flex-col justify-between gap-2 ${
                          isNight
                            ? 'bg-[#151F2E] border-[#2C3E4C]'
                            : 'bg-white border-[#C8BFA8]'
                        } ${assignedSlotKey ? 'ring-1 ring-[#D4AB58]' : ''}`}
                      >
                        <div className="space-y-1">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-[10px] font-black px-2 py-0.5 rounded-lg bg-[#D4AB58]/20 text-[#D4AB58]">
                              {el.units.toLocaleString('fa-IR')} واحد
                            </span>
                            <span
                              className={`text-[10px] font-black px-2 py-0.5 rounded-lg ${
                                elig.isEligible
                                  ? 'bg-emerald-500/20 text-emerald-400'
                                  : 'bg-rose-500/20 text-rose-400'
                              }`}
                            >
                              {elig.isEligible ? '🟢 قابل اخذ' : '🔴 پیشنیاز ناقص'}
                            </span>
                          </div>

                          <div className="text-xs font-black pt-0.5">{el.title}</div>

                          {elig.missingPrereqTitles.length > 0 ? (
                            <div className="text-[10px] font-bold text-rose-400">
                              پیشنیاز: {elig.missingPrereqTitles.join('، ')}
                            </div>
                          ) : (
                            <div className="text-[10px] font-bold text-emerald-400">
                              پیشنیازها پاس شده است
                            </div>
                          )}
                        </div>

                        <button
                          type="button"
                          onClick={() =>
                            handleAssignElectiveToSlot(selectedElectiveSlot, el.id)
                          }
                          className={`w-full py-1.5 rounded-xl text-xs font-black cursor-pointer transition-all ${
                            assignedSlotKey === selectedElectiveSlot
                              ? 'bg-emerald-600 text-white'
                              : 'bg-[#D4AB58] text-[#101622]'
                          }`}
                        >
                          {assignedSlotKey === selectedElectiveSlot
                            ? '✅ انتخاب‌شده در این جایگاه'
                            : 'افزودن به جایگاه انتخابی'}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
