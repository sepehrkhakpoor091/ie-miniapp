/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Official 142-Unit Industrial Engineering Curriculum & Prerequisite Graph
 * Ferdowsi University of Mashhad (I.E.C.F - مصوب ۱۳۹۹)
 */

import {
  CourseCategory,
  CourseStatus,
  CurriculumCourse,
  ElectiveCourseOption,
  StudentCurriculumState,
} from '../types';

export const CURRICULUM_STORAGE_KEY = 'ie_student_curriculum_v1';

export const TOTAL_DEGREE_UNITS = 142;

export const CATEGORY_METADATA: Record<
  CourseCategory,
  {
    label: string;
    shortLabel: string;
    requiredUnits: number;
    badgeBg: string;
    badgeText: string;
    cardBorderNight: string;
    cardBorderDay: string;
    accentHex: string;
  }
> = {
  general: {
    label: 'دروس عمومی (۲۲ واحد)',
    shortLabel: 'عمومی',
    requiredUnits: 22,
    badgeBg: 'bg-[#E9C46A]/20 border-[#E9C46A]',
    badgeText: 'text-[#D4AB58]',
    cardBorderNight: 'border-[#E9C46A]/60 bg-[#E9C46A]/10',
    cardBorderDay: 'border-[#D4AB58] bg-[#FDF8E7]',
    accentHex: '#E9C46A',
  },
  basic: {
    label: 'دروس پایه (۱۷ واحد)',
    shortLabel: 'پایه',
    requiredUnits: 17,
    badgeBg: 'bg-[#7FB69E]/20 border-[#7FB69E]',
    badgeText: 'text-[#7FB69E]',
    cardBorderNight: 'border-[#7FB69E]/60 bg-[#7FB69E]/10',
    cardBorderDay: 'border-[#2A9D8F] bg-[#EEF8F5]',
    accentHex: '#7FB69E',
  },
  specialized: {
    label: 'دروس تخصصی (۸۴ واحد)',
    shortLabel: 'تخصصی',
    requiredUnits: 84,
    badgeBg: 'bg-[#5C95C5]/20 border-[#5C95C5]',
    badgeText: 'text-[#6BA8D9]',
    cardBorderNight: 'border-[#5C95C5]/60 bg-[#5C95C5]/10',
    cardBorderDay: 'border-[#16576B] bg-[#EEF5FA]',
    accentHex: '#5C95C5',
  },
  elective: {
    label: 'دروس اختیاری (۱۹ واحد)',
    shortLabel: 'اختیاری',
    requiredUnits: 19,
    badgeBg: 'bg-[#8D99AE]/25 border-[#8D99AE]',
    badgeText: 'text-[#A6B4C9]',
    cardBorderNight: 'border-[#8D99AE]/60 bg-[#8D99AE]/10',
    cardBorderDay: 'border-[#4A5568] bg-[#F2F4F7]',
    accentHex: '#8D99AE',
  },
  internship: {
    label: 'کارآموزی (۲ واحد - از تابستان سال سوم)',
    shortLabel: 'کارآموزی',
    requiredUnits: 2,
    badgeBg: 'bg-[#E77F6E]/20 border-[#E77F6E]',
    badgeText: 'text-[#E77F6E]',
    cardBorderNight: 'border-[#E77F6E]/70 bg-[#E77F6E]/15',
    cardBorderDay: 'border-[#D47D68] bg-[#FDF1EE]',
    accentHex: '#E77F6E',
  },
};

/**
 * Official 8-Semester Curriculum of Industrial Engineering at Ferdowsi University of Mashhad (142 Units)
 */
export const FUM_IE_CURRICULUM: CurriculumCourse[] = [
  // ==========================================================================
  // TERM 1 (18 Units)
  // ==========================================================================
  {
    id: 'gen_farsi',
    title: 'زبان فارسی',
    units: 3,
    term: 1,
    category: 'general',
    prereqs: [],
    coreqs: [],
  },
  {
    id: 'gen_english',
    title: 'زبان خارجه',
    units: 3,
    term: 1,
    category: 'general',
    prereqs: [],
    coreqs: [],
  },
  {
    id: 'math1',
    title: 'ریاضی عمومی ۱',
    units: 3,
    term: 1,
    category: 'basic',
    prereqs: [],
    coreqs: [],
  },
  {
    id: 'phys1',
    title: 'فیزیک ۱',
    units: 3,
    term: 1,
    category: 'basic',
    prereqs: [],
    coreqs: [],
  },
  {
    id: 'phys1_lab',
    title: 'آزمایشگاه فیزیک ۱',
    units: 1,
    term: 1,
    category: 'basic',
    prereqs: [],
    coreqs: ['phys1'],
  },
  {
    id: 'ie_principles',
    title: 'اصول و مبانی مهندسی صنایع',
    units: 2,
    term: 1,
    category: 'specialized',
    prereqs: [],
    coreqs: [],
  },
  {
    id: 'eng_drawing',
    title: 'نقشه‌کشی صنعتی',
    units: 2,
    term: 1,
    category: 'specialized',
    prereqs: [],
    coreqs: [],
  },
  {
    id: 'gen_pe1',
    title: 'تربیت بدنی ۱',
    units: 1,
    term: 1,
    category: 'general',
    prereqs: [],
    coreqs: [],
  },

  // ==========================================================================
  // TERM 2 (19 Units)
  // ==========================================================================
  {
    id: 'gen_islamic1',
    title: 'معارف اسلامی ۱',
    units: 2,
    term: 2,
    category: 'general',
    prereqs: [],
    coreqs: [],
  },
  {
    id: 'econ_principles',
    title: 'مبانی علم اقتصاد',
    units: 3,
    term: 2,
    category: 'specialized',
    prereqs: [],
    coreqs: [],
  },
  {
    id: 'math2',
    title: 'ریاضی عمومی ۲',
    units: 3,
    term: 2,
    category: 'basic',
    prereqs: ['math1'],
    coreqs: [],
  },
  {
    id: 'diff_eq',
    title: 'معادلات دیفرانسیل',
    units: 3,
    term: 2,
    category: 'basic',
    prereqs: ['math1'],
    coreqs: [],
  },
  {
    id: 'phys2',
    title: 'فیزیک ۲',
    units: 3,
    term: 2,
    category: 'basic',
    prereqs: ['phys1'],
    coreqs: [],
  },
  {
    id: 'comp_prog',
    title: 'مبانی کامپیوتر و برنامه‌نویسی',
    units: 3,
    term: 2,
    category: 'specialized',
    prereqs: ['math1'],
    coreqs: [],
  },
  {
    id: 'mfg_proc1',
    title: 'فرآیندهای تولید ۱',
    units: 2,
    term: 2,
    category: 'specialized',
    prereqs: [],
    coreqs: [],
  },

  // ==========================================================================
  // TERM 3 (18 Units)
  // ==========================================================================
  {
    id: 'gen_islamic2',
    title: 'معارف اسلامی ۲',
    units: 2,
    term: 3,
    category: 'general',
    prereqs: ['gen_islamic1'],
    coreqs: [],
  },
  {
    id: 'eng_econ',
    title: 'اقتصاد مهندسی',
    units: 3,
    term: 3,
    category: 'specialized',
    prereqs: ['econ_principles'],
    coreqs: [],
  },
  {
    id: 'prob_theory',
    title: 'نظریه احتمال و کاربردها',
    units: 3,
    term: 3,
    category: 'specialized',
    prereqs: ['math1'],
    coreqs: [],
    isKeyHub: true,
    note: 'گره کلیدی چارت — پیشنیاز مستقیم ۸ درس تخصصی و اختیاری',
  },
  {
    id: 'linear_alg',
    title: 'جبر خطی و کاربردها',
    units: 2,
    term: 3,
    category: 'specialized',
    prereqs: ['math1'],
    coreqs: [],
  },
  {
    id: 'elec_fund',
    title: 'مبانی مهندسی برق',
    units: 2,
    term: 3,
    category: 'specialized',
    prereqs: ['phys2'],
    coreqs: [],
  },
  {
    id: 'statics_strength',
    title: 'استاتیک و مقاومت مصالح',
    units: 2,
    term: 3,
    category: 'specialized',
    prereqs: ['math1', 'phys1'],
    coreqs: [],
  },
  {
    id: 'mfg_lab',
    title: 'آزمایشگاه فرآیندهای تولید ۱ (کارگاه عمومی)',
    units: 1,
    term: 3,
    category: 'specialized',
    prereqs: ['mfg_proc1'],
    coreqs: [],
  },
  {
    id: 'ind_accounting',
    title: 'اصول حسابداری و بهای تمام‌شده',
    units: 3,
    term: 3,
    category: 'specialized',
    prereqs: [],
    coreqs: [],
  },

  // ==========================================================================
  // TERM 4 (18 Units)
  // ==========================================================================
  {
    id: 'gen_quran',
    title: 'انس با قرآن',
    units: 1,
    term: 4,
    category: 'general',
    prereqs: [],
    coreqs: [],
  },
  {
    id: 'gen_islamic3',
    title: 'معارف اسلامی ۳',
    units: 2,
    term: 4,
    category: 'general',
    prereqs: [],
    coreqs: [],
  },
  {
    id: 'gen_pe2',
    title: 'تربیت بدنی ۲ (ورزش ۱)',
    units: 1,
    term: 4,
    category: 'general',
    prereqs: ['gen_pe1'],
    coreqs: [],
  },
  {
    id: 'or1',
    title: 'تحقیق در عملیات ۱',
    units: 3,
    term: 4,
    category: 'specialized',
    prereqs: ['linear_alg'],
    coreqs: [],
    isKeyHub: true,
    note: 'گره کلیدی چارت — پیشنیاز مستقیم ۱۱ درس تخصصی و اختیاری',
  },
  {
    id: 'eng_stats',
    title: 'آمار مهندسی',
    units: 3,
    term: 4,
    category: 'specialized',
    prereqs: ['prob_theory'],
    coreqs: [],
  },
  {
    id: 'num_calc',
    title: 'محاسبات عددی',
    units: 2,
    term: 4,
    category: 'specialized',
    prereqs: ['diff_eq', 'comp_prog'],
    coreqs: [],
  },
  {
    id: 'work_study',
    title: 'ارزیابی کار و زمان',
    units: 3,
    term: 4,
    category: 'specialized',
    prereqs: ['ie_principles'],
    coreqs: [],
  },
  {
    id: 'specialist_lang',
    title: 'زبان تخصصی مهندسی صنایع',
    units: 3,
    term: 4,
    category: 'specialized',
    prereqs: ['gen_english', 'ie_principles'],
    coreqs: [],
  },

  // ==========================================================================
  // TERM 5 (17 Units)
  // ==========================================================================
  {
    id: 'gen_islamic4',
    title: 'معارف اسلامی ۴',
    units: 2,
    term: 5,
    category: 'general',
    prereqs: [],
    coreqs: [],
  },
  {
    id: 'or2',
    title: 'تحقیق در عملیات ۲',
    units: 3,
    term: 5,
    category: 'specialized',
    prereqs: ['or1'],
    coreqs: [],
  },
  {
    id: 'stochastic_proc',
    title: 'فرآیندهای تصادفی و کاربردها',
    units: 3,
    term: 5,
    category: 'specialized',
    prereqs: ['prob_theory'],
    coreqs: [],
  },
  {
    id: 'prod_planning1',
    title: 'برنامه‌ریزی و کنترل تولید و موجودی‌ها ۱',
    units: 3,
    term: 5,
    category: 'specialized',
    prereqs: ['prob_theory', 'or1'],
    coreqs: [],
  },
  {
    id: 'spc',
    title: 'کنترل کیفیت آماری',
    units: 3,
    term: 5,
    category: 'specialized',
    prereqs: ['eng_stats'],
    coreqs: [],
  },
  {
    id: 'ergonomics',
    title: 'مهندسی عوامل انسانی (ارگونومی)',
    units: 2,
    term: 5,
    category: 'specialized',
    prereqs: ['work_study'],
    coreqs: ['eng_stats'],
  },
  {
    id: 'ergo_work_lab',
    title: 'آزمایشگاه ارزیابی کار و زمان و ارگونومی',
    units: 1,
    term: 5,
    category: 'specialized',
    prereqs: ['work_study'],
    coreqs: ['ergonomics'],
  },

  // ==========================================================================
  // TERM 6 (20 Units including Summer Internship)
  // ==========================================================================
  {
    id: 'gen_islamic5',
    title: 'معارف اسلامی ۵',
    units: 2,
    term: 6,
    category: 'general',
    prereqs: [],
    coreqs: [],
  },
  {
    id: 'gen_population',
    title: 'دانش خانواده و جمعیت',
    units: 2,
    term: 6,
    category: 'general',
    prereqs: [],
    coreqs: [],
  },
  {
    id: 'project_ctrl',
    title: 'برنامه‌ریزی و کنترل پروژه',
    units: 3,
    term: 6,
    category: 'specialized',
    prereqs: ['prob_theory', 'or1'],
    coreqs: [],
  },
  {
    id: 'prod_planning2',
    title: 'برنامه‌ریزی و کنترل تولید و موجودی‌ها ۲',
    units: 3,
    term: 6,
    category: 'specialized',
    prereqs: ['prod_planning1'],
    coreqs: [],
  },
  {
    id: 'simulation',
    title: 'شبیه‌سازی سیستم‌ها',
    units: 3,
    term: 6,
    category: 'specialized',
    prereqs: ['comp_prog', 'eng_stats'],
    coreqs: [],
  },
  {
    id: 'regression',
    title: 'تحلیل رگرسیون',
    units: 2,
    term: 6,
    category: 'specialized',
    prereqs: ['linear_alg', 'eng_stats'],
    coreqs: [],
  },
  {
    id: 'mis',
    title: 'سیستم‌های اطلاعات مدیریت',
    units: 3,
    term: 6,
    category: 'specialized',
    prereqs: ['ie_principles', 'comp_prog'],
    coreqs: [],
  },
  {
    id: 'internship',
    title: 'کارآموزی',
    units: 2,
    term: 6,
    category: 'internship',
    prereqs: ['prod_planning1'],
    coreqs: [],
    yearCondition: 'از تابستان سال سوم به بعد',
    note: 'اخذ کارآموزی از تابستان سال سوم به بعد مجاز است',
  },

  // ==========================================================================
  // TERM 7 (17 Units)
  // ==========================================================================
  {
    id: 'gen_islamic6',
    title: 'معارف اسلامی ۶',
    units: 2,
    term: 7,
    category: 'general',
    prereqs: [],
    coreqs: [],
  },
  {
    id: 'facility_layout',
    title: 'طراحی و برنامه‌ریزی تعمیرات و چیدمان تسهیلات',
    units: 3,
    term: 7,
    category: 'specialized',
    prereqs: ['eng_drawing', 'work_study', 'prod_planning1'],
    coreqs: [],
  },
  {
    id: 'quality_mgmt',
    title: 'مدیریت کیفیت و بهره‌وری',
    units: 3,
    term: 7,
    category: 'specialized',
    prereqs: ['spc'],
    coreqs: [],
  },
  {
    id: 'elec_slot1',
    title: 'درس اختیاری ۱',
    units: 3,
    term: 7,
    category: 'elective',
    prereqs: [],
    coreqs: [],
    isElectiveSlot: true,
    slotIndex: 1,
  },
  {
    id: 'elec_slot2',
    title: 'درس اختیاری ۲',
    units: 3,
    term: 7,
    category: 'elective',
    prereqs: [],
    coreqs: [],
    isElectiveSlot: true,
    slotIndex: 2,
  },
  {
    id: 'elec_slot3',
    title: 'درس اختیاری ۳',
    units: 3,
    term: 7,
    category: 'elective',
    prereqs: [],
    coreqs: [],
    isElectiveSlot: true,
    slotIndex: 3,
  },

  // ==========================================================================
  // TERM 8 (15 Units)
  // ==========================================================================
  {
    id: 'systems_analysis',
    title: 'تجزیه و تحلیل سیستم‌ها',
    units: 3,
    term: 8,
    category: 'specialized',
    prereqs: ['ie_principles', 'comp_prog'],
    coreqs: [],
  },
  {
    id: 'bsc_project',
    title: 'پروژه کارشناسی',
    units: 3,
    term: 8,
    category: 'specialized',
    prereqs: ['facility_layout'],
    coreqs: [],
    minPassedUnits: 100,
    note: 'نیازمند گذراندن حداقل ۱۰۰ واحد درسی',
  },
  {
    id: 'elec_slot4',
    title: 'درس اختیاری ۴',
    units: 3,
    term: 8,
    category: 'elective',
    prereqs: [],
    coreqs: [],
    isElectiveSlot: true,
    slotIndex: 4,
  },
  {
    id: 'elec_slot5',
    title: 'درس اختیاری ۵',
    units: 3,
    term: 8,
    category: 'elective',
    prereqs: [],
    coreqs: [],
    isElectiveSlot: true,
    slotIndex: 5,
  },
  {
    id: 'elec_slot6',
    title: 'درس اختیاری ۶ (۴ واحدی تکمیل سقف ۱۹ واحد)',
    units: 3,
    term: 8,
    category: 'elective',
    prereqs: [],
    coreqs: [],
    isElectiveSlot: true,
    slotIndex: 6,
  },
];

/**
 * Official Table of 15 Elective Courses (لیست دروس اختیاری - ۱۹ واحد)
 */
export const FUM_IE_ELECTIVE_OPTIONS: ElectiveCourseOption[] = [
  {
    id: 'el_pm_bok',
    title: 'اصول و مبانی مدیریت پروژه',
    units: 2,
    prereqs: [],
    coreqs: ['project_ctrl'],
    track: 'مدیریت پروژه و سیستم',
  },
  {
    id: 'el_maintenance',
    title: 'برنامه‌ریزی نگهداری و تعمیرات (نت)',
    units: 3,
    prereqs: ['prob_theory', 'eng_stats'],
    coreqs: [],
    track: 'تولید و عملیات',
  },
  {
    id: 'el_safety_hse',
    title: 'مهندسی ایمنی و بهداشت صنعتی (HSE)',
    units: 2,
    prereqs: [],
    coreqs: [],
    track: 'ایمنی و ارگونومی',
  },
  {
    id: 'el_decision',
    title: 'تحلیل تصمیم‌گیری',
    units: 3,
    prereqs: ['prob_theory', 'or1'],
    coreqs: [],
    track: 'تحقیق در عملیات و تصمیم',
  },
  {
    id: 'el_scm',
    title: 'مهندسی لجستیک و زنجیره تامین',
    units: 3,
    prereqs: ['prod_planning1'],
    coreqs: [],
    track: 'لجستیک و زنجیره تامین',
  },
  {
    id: 'el_fs_econ',
    title: 'طرح‌ریزی و سنجش اقتصادی پروژه‌های صنعتی',
    units: 3,
    prereqs: ['eng_econ', 'ind_accounting'],
    coreqs: [],
    track: 'مالی و اقتصادی',
  },
  {
    id: 'el_data_mining',
    title: 'مبانی داده‌کاوی و کاربردها',
    units: 3,
    prereqs: ['regression'],
    coreqs: [],
    track: 'علم داده و هوش مصنوعی',
  },
  {
    id: 'el_org_mgmt',
    title: 'اصول مدیریت و تئوری سازمان',
    units: 3,
    prereqs: ['ie_principles'],
    coreqs: [],
    track: 'مدیریت و سازمان',
  },
  {
    id: 'el_ob_hr',
    title: 'رفتار سازمانی و مدیریت منابع انسانی',
    units: 3,
    prereqs: ['el_org_mgmt'],
    coreqs: [],
    track: 'مدیریت و سازمان',
  },
  {
    id: 'el_marketing',
    title: 'اصول بازاریابی',
    units: 2,
    prereqs: ['econ_principles'],
    coreqs: [],
    track: 'بازاریابی و کسب‌وکار',
  },
  {
    id: 'el_fin_mgmt',
    title: 'مدیریت مالی',
    units: 2,
    prereqs: ['eng_econ', 'ind_accounting'],
    coreqs: [],
    track: 'مالی و اقتصادی',
  },
  {
    id: 'el_game_theory',
    title: 'مبانی نظریه بازی',
    units: 3,
    prereqs: ['or1'],
    coreqs: [],
    track: 'تحقیق در عملیات و تصمیم',
  },
  {
    id: 'el_metaheuristics',
    title: 'روش‌های فراابتکاری در بهینه‌سازی',
    units: 3,
    prereqs: ['comp_prog', 'or2'],
    coreqs: [],
    track: 'علم داده و هوش مصنوعی',
  },
  {
    id: 'el_doe',
    title: 'مبانی طراحی آزمایشات مهندسی (DOE)',
    units: 3,
    prereqs: ['eng_stats'],
    coreqs: [],
    track: 'کیفیت و آمار پیشرفته',
  },
  {
    id: 'el_ai_ml',
    title: 'مقدمه‌ای بر هوش مصنوعی و یادگیری ماشین',
    units: 3,
    prereqs: ['comp_prog', 'eng_stats'],
    coreqs: [],
    track: 'علم داده و هوش مصنوعی',
  },
];

export const DEFAULT_CURRICULUM_STATE: StudentCurriculumState = {
  passedCourseIds: [
    // Terms 1, 2, 3 passed by default for a typical 1402 student
    'gen_farsi',
    'gen_english',
    'math1',
    'phys1',
    'phys1_lab',
    'ie_principles',
    'eng_drawing',
    'gen_pe1',
    'gen_islamic1',
    'econ_principles',
    'math2',
    'diff_eq',
    'phys2',
    'comp_prog',
    'mfg_proc1',
    'gen_islamic2',
    'eng_econ',
    'prob_theory',
    'linear_alg',
    'elec_fund',
    'statics_strength',
    'mfg_lab',
    'ind_accounting',
  ],
  currentTermCourseIds: [
    'or1',
    'eng_stats',
    'num_calc',
    'work_study',
    'specialist_lang',
    'gen_quran',
    'gen_islamic3',
    'gen_pe2',
  ],
  courseGrades: {
    math1: 17.5,
    phys1: 16.0,
    ie_principles: 19.0,
    comp_prog: 18.5,
    prob_theory: 18.0,
    linear_alg: 17.0,
    eng_econ: 18.25,
  },
  assignedElectives: {
    elec_slot1: 'el_scm',
    elec_slot2: 'el_ai_ml',
    elec_slot3: 'el_decision',
    elec_slot4: 'el_data_mining',
    elec_slot5: 'el_game_theory',
    elec_slot6: 'el_doe',
  },
};

export function findCourseById(courseId: string): CurriculumCourse | undefined {
  return FUM_IE_CURRICULUM.find((c) => c.id === courseId);
}

export function findElectiveById(electiveId: string): ElectiveCourseOption | undefined {
  return FUM_IE_ELECTIVE_OPTIONS.find((e) => e.id === electiveId);
}

export function getCourseTitleById(courseId: string): string {
  const c = findCourseById(courseId);
  if (c) return c.title;
  const el = findElectiveById(courseId);
  if (el) return el.title;
  return courseId;
}

/**
 * Evaluates whether a course is `passed`, `current`, `unlocked` (eligible to take), or `locked` (missing prerequisites).
 */
export function evaluateCourseUnlockStatus(
  course: CurriculumCourse,
  state: StudentCurriculumState
): {
  status: CourseStatus;
  missingPrereqIds: string[];
  missingPrereqTitles: string[];
  missingCoreqIds: string[];
  missingCoreqTitles: string[];
  minUnitsShortfall: number;
} {
  const passedSet = new Set(state.passedCourseIds || []);
  const currentSet = new Set(state.currentTermCourseIds || []);

  // Resolve effective prerequisites if this is an assigned elective slot
  let effectivePrereqs = course.prereqs || [];
  let effectiveCoreqs = course.coreqs || [];

  if (course.isElectiveSlot && state.assignedElectives?.[course.id]) {
    const assignedEl = findElectiveById(state.assignedElectives[course.id]);
    if (assignedEl) {
      effectivePrereqs = assignedEl.prereqs;
      effectiveCoreqs = assignedEl.coreqs;
    }
  }

  const missingPrereqIds = effectivePrereqs.filter((reqId) => !passedSet.has(reqId));
  const missingPrereqTitles = missingPrereqIds.map(getCourseTitleById);

  // Co-requisites are satisfied if either passed OR currently taken OR unlocked
  const missingCoreqIds = effectiveCoreqs.filter(
    (coId) => !passedSet.has(coId) && !currentSet.has(coId)
  );
  const missingCoreqTitles = missingCoreqIds.map(getCourseTitleById);

  // Check minimum passed units (e.g. B.Sc. Project >= 100 units)
  const totalPassedUnits = FUM_IE_CURRICULUM.filter((c) => passedSet.has(c.id)).reduce(
    (sum, c) => sum + getEffectiveCourseUnits(c, state),
    0
  );
  const minUnitsShortfall =
    course.minPassedUnits && totalPassedUnits < course.minPassedUnits
      ? course.minPassedUnits - totalPassedUnits
      : 0;

  if (passedSet.has(course.id)) {
    return {
      status: 'passed',
      missingPrereqIds,
      missingPrereqTitles,
      missingCoreqIds,
      missingCoreqTitles,
      minUnitsShortfall: 0,
    };
  }

  if (currentSet.has(course.id)) {
    return {
      status: 'current',
      missingPrereqIds,
      missingPrereqTitles,
      missingCoreqIds,
      missingCoreqTitles,
      minUnitsShortfall,
    };
  }

  if (missingPrereqIds.length === 0 && minUnitsShortfall === 0) {
    return {
      status: 'unlocked',
      missingPrereqIds: [],
      missingPrereqTitles: [],
      missingCoreqIds,
      missingCoreqTitles,
      minUnitsShortfall: 0,
    };
  }

  return {
    status: 'locked',
    missingPrereqIds,
    missingPrereqTitles,
    missingCoreqIds,
    missingCoreqTitles,
    minUnitsShortfall,
  };
}

export function getEffectiveCourseUnits(
  course: CurriculumCourse,
  state: StudentCurriculumState
): number {
  if (course.isElectiveSlot && state.assignedElectives?.[course.id]) {
    const el = findElectiveById(state.assignedElectives[course.id]);
    if (el) return el.units;
  }
  return course.units;
}

/**
 * Returns direct prerequisites, co-requisites, and all downstream courses (both curriculum & electives)
 * that depend on `courseId`.
 */
export function getCourseDependencies(courseId: string): {
  course: CurriculumCourse | undefined;
  directPrereqs: CurriculumCourse[];
  directCoreqs: CurriculumCourse[];
  downstreamCurriculumCourses: CurriculumCourse[];
  downstreamElectiveCourses: ElectiveCourseOption[];
} {
  const course = findCourseById(courseId);
  const directPrereqs = (course?.prereqs || [])
    .map(findCourseById)
    .filter((c): c is CurriculumCourse => !!c);
  const directCoreqs = (course?.coreqs || [])
    .map(findCourseById)
    .filter((c): c is CurriculumCourse => !!c);

  const downstreamCurriculumCourses = FUM_IE_CURRICULUM.filter(
    (c) => c.prereqs.includes(courseId) || c.coreqs.includes(courseId)
  );

  const downstreamElectiveCourses = FUM_IE_ELECTIVE_OPTIONS.filter(
    (el) => el.prereqs.includes(courseId) || el.coreqs.includes(courseId)
  );

  return {
    course,
    directPrereqs,
    directCoreqs,
    downstreamCurriculumCourses,
    downstreamElectiveCourses,
  };
}

/**
 * Evaluates whether an ElectiveCourseOption is eligible to be taken based on passed/current courses.
 */
export function checkElectiveEligibility(
  elective: ElectiveCourseOption,
  state: StudentCurriculumState
): {
  isEligible: boolean;
  missingPrereqTitles: string[];
  missingCoreqTitles: string[];
} {
  const passedSet = new Set(state.passedCourseIds || []);
  const currentSet = new Set(state.currentTermCourseIds || []);

  const missingPrereqTitles = elective.prereqs
    .filter((reqId) => !passedSet.has(reqId))
    .map(getCourseTitleById);

  const missingCoreqTitles = elective.coreqs
    .filter((coId) => !passedSet.has(coId) && !currentSet.has(coId))
    .map(getCourseTitleById);

  return {
    isEligible: missingPrereqTitles.length === 0,
    missingPrereqTitles,
    missingCoreqTitles,
  };
}

/**
 * Computes full progress metrics across the 142-unit degree and category breakdown + weighted GPA.
 */
export function calculateCurriculumProgress(state: StudentCurriculumState): {
  passedUnitsTotal: number;
  currentTermUnits: number;
  remainingUnits: number;
  progressPercent: number;
  byCategory: Record<CourseCategory, { passed: number; required: number }>;
  weightedGpa: number;
  gradedUnitsCount: number;
} {
  const passedSet = new Set(state.passedCourseIds || []);
  const currentSet = new Set(state.currentTermCourseIds || []);

  const byCategory: Record<CourseCategory, { passed: number; required: number }> = {
    general: { passed: 0, required: 22 },
    basic: { passed: 0, required: 17 },
    specialized: { passed: 0, required: 84 },
    elective: { passed: 0, required: 19 },
    internship: { passed: 0, required: 2 },
  };

  let passedUnitsTotal = 0;
  let currentTermUnits = 0;
  let weightedGradeSum = 0;
  let gradedUnitsCount = 0;

  for (const course of FUM_IE_CURRICULUM) {
    const units = getEffectiveCourseUnits(course, state);
    if (passedSet.has(course.id)) {
      passedUnitsTotal += units;
      byCategory[course.category].passed += units;
      // Internship counts inside the 84 specialized units in official chart summary as well
      if (course.category === 'internship') {
        byCategory.specialized.passed += units;
      }

      const grade = state.courseGrades?.[course.id];
      if (typeof grade === 'number' && !Number.isNaN(grade) && grade >= 0 && grade <= 20) {
        weightedGradeSum += grade * units;
        gradedUnitsCount += units;
      }
    } else if (currentSet.has(course.id)) {
      currentTermUnits += units;
    }
  }

  const remainingUnits = Math.max(0, TOTAL_DEGREE_UNITS - passedUnitsTotal);
  const progressPercent = Math.min(
    100,
    Math.round((passedUnitsTotal / TOTAL_DEGREE_UNITS) * 100)
  );
  const weightedGpa =
    gradedUnitsCount > 0
      ? Math.round((weightedGradeSum / gradedUnitsCount) * 100) / 100
      : 0;

  return {
    passedUnitsTotal,
    currentTermUnits,
    remainingUnits,
    progressPercent,
    byCategory,
    weightedGpa,
    gradedUnitsCount,
  };
}

export function buildPresetCurriculumState(
  upToTerm: number,
  currentTerm?: number
): StudentCurriculumState {
  const passedCourseIds = FUM_IE_CURRICULUM.filter((c) => c.term <= upToTerm).map(
    (c) => c.id
  );
  const currentTermCourseIds = currentTerm
    ? FUM_IE_CURRICULUM.filter((c) => c.term === currentTerm).map((c) => c.id)
    : [];

  return {
    passedCourseIds,
    currentTermCourseIds,
    courseGrades: DEFAULT_CURRICULUM_STATE.courseGrades,
    assignedElectives: DEFAULT_CURRICULUM_STATE.assignedElectives,
  };
}
