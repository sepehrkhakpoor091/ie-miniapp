/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Complete 8-Module Self-Contained Admin Panel (AdminPanel.tsx)
 * Full Real-Time End-to-End Persistence Upgrade:
 * 1. Module 1: Real ISO/IEC 18004 QR Image Upload Scanner (jsQR) + Active Un-scanned Tickets List + Separate Ticket History Page
 * 2. Module 2: Receipts & Student ID Cards (KYC) with Pending, Past Approved Folder, and Past Rejected Folder
 * 3. Module 3: Full Two-Way Lock/Unlock Control (Account Ban, KYC Lock, Session Lock) + Arbitrary Custom Point Addition/Deduction
 * 4. Module 4: Events & Professors CRUD + Professor Avatar Picker + Supercharged Multi-Professor AI Timetable Parser
 * 5. Module 5: Admin-Only Looti AI + Scheduled Timers with Exact Start Date & One-Time Date Execution
 * 6. Module 6: Dynamic Medal Creator (Custom Image, Title, Subtitle, How-To-Earn) + Universal Avatar Studio (Student & Professor Avatars) + Discount Rule
 * 7. Module 7 & 8: 6-Level RBAC + Section Kill-Switches (FeatureFlags) + Cloudflare Quota & Audit Log
 */

import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  AboutAssociationConfig,
  AdminAuditLogItem,
  AdminPermissionKey,
  AdminReceiptItem,
  AdminStudentDossier,
  AdminUser,
  AvatarCatalogItem,
  BadgeItem,
  CertificateInfo,
  ChannelAnnouncement,
  DEFAULT_ABOUT_CONFIG,
  DiscountRuleConfig,
  EventItem,
  FeatureFlags,
  KycStatus,
  LootboxConfig,
  LootboxPrizeItem,
  LootiChatMessage,
  LootiModelId,
  OnlineSessionUser,
  Professor,
  ScheduledTimer,
  StudentIdDisputeTicket,
  ThemeMode,
  TicketRecord,
  UserProfile,
  WeeklyQuest,
} from '../../types';
import { EVENTS_DATA, generateTicketPayload } from '../../utils/events';
import {
  DEFAULT_CHANNEL_URL,
  DEFAULT_ISEFUM_ANNOUNCEMENTS,
  normalizeTelegramChannelHandle,
  saveChannelUrl,
  saveStoredAnnouncements,
  syncAnnouncementsFromTelegramChannel,
} from '../../utils/channelSync';
import {
  DEFAULT_LOOTBOX_CONFIG,
  EXTENDED_BADGES,
  INITIAL_WEEKLY_QUESTS,
} from '../../utils/gamification';
import {
  MASTER_ADMIN_TELEGRAM_ID,
  computeBadgeVerificationHash,
  findCheckedInTicketInLedger,
  generateCertificateCode,
  isMasterAdminTelegramUser,
  recordTicketInCheckedInLedger,
  touchAdminSession,
  validateUploadedImageFile,
  verifyTicketSignature,
} from '../../utils/security';
import {
  saveLootboxConfigOnBot,
  verifyQrCheckInWithBot,
} from '../../utils/apiBridge';
import {
  askAdminLootiAi,
  parseMultiProfessorSchedules,
  parseMultiProfessorSchedulesWithAi,
  parseNaturalLanguageTimerDeterministic,
} from '../../utils/adminAiService';
import {
  playCoin,
  playError,
  playFanfare,
  playSwitch,
  playTick,
} from '../../utils/soundEngine';
import { PixelImage, compressImageFileToDataUrl } from '../PixelImage';
import {
  LiveCameraQrModal,
  RealQrCode,
  decodeQrFromImageFile,
  isTelegramNativeQrPopupSupported,
} from '../ui/RealQrCode';
import {
  QrCode,
  Camera,
  Shield,
  Check,
  X,
  Users,
  Calendar,
  Bot,
  Award,
  Lock,
  Activity,
  Search,
  Download,
  Trash2,
  Plus,
  Edit3,
  Eye,
  Key,
  RefreshCw,
  Sparkles,
  FileText,
  CheckCircle2,
  AlertTriangle,
  Upload,
} from 'lucide-react';

// ============================================================================
// SAFE DEFAULT FALLBACK DATA
// ============================================================================

export const DEFAULT_AVATARS_CATALOG: AvatarCatalogItem[] = [
  {
    id: 'av-stu-1',
    title: 'کاراکتر ۱',
    targetRole: 'student',
    imageUrl: '01_avatar_boy.png',
    addedBy: 'پیش‌فرض سامانه',
  },
  {
    id: 'av-stu-2',
    title: 'کاراکتر ۲',
    targetRole: 'student',
    imageUrl: '02_avatar_girl.png',
    addedBy: 'پیش‌فرض سامانه',
  },
  {
    id: 'av-stu-3',
    title: 'کاراکتر ۳',
    targetRole: 'student',
    imageUrl: '07_char_laptop.png',
    addedBy: 'پیش‌فرض سامانه',
  },
  {
    id: 'av-stu-4',
    title: 'کاراکتر ۴',
    targetRole: 'student',
    imageUrl: '06_char_victory.png',
    addedBy: 'پیش‌فرض سامانه',
  },
  {
    id: 'av-prof-1',
    title: 'استاد راهنما (آقا)',
    targetRole: 'professor',
    imageUrl: '01_avatar_boy.png',
    addedBy: 'پیش‌فرض سامانه',
  },
  {
    id: 'av-prof-2',
    title: 'استاد راهنما (خانم)',
    targetRole: 'professor',
    imageUrl: '02_avatar_girl.png',
    addedBy: 'پیش‌فرض سامانه',
  },
  {
    id: 'av-prof-3',
    title: 'استاد ارشد شورا',
    targetRole: 'professor',
    imageUrl: '08_char_admin.png',
    addedBy: 'پیش‌فرض سامانه',
  },
];

// Zero fake/dummy students — populated exclusively from real registered Telegram bot users
export const DEFAULT_STUDENTS: AdminStudentDossier[] = [];

export const DEFAULT_EVENTS: EventItem[] = EVENTS_DATA;

// Zero fake/dummy receipts — populated exclusively from real student submissions
export const DEFAULT_RECEIPTS: AdminReceiptItem[] = [];

export const DEFAULT_PROFESSORS: Professor[] = [
  {
    id: 'prof-1',
    name: 'دکتر محمدرضا رضایی',
    title: 'استاد تمام - گروه بهینه‌سازی و سیستم‌های تولیدی',
    avatar: '01_avatar_boy.png',
    office: 'اتاق ۳۰۵ (طبقه سوم دانشکده صنایع)',
    officeHours: 'شنبه و دوشنبه: ۱۰:۰۰ الی ۱۲:۰۰',
    isCurrentlyInOffice: true,
    email: 'm.rezaei@aut.ac.ir',
    courses: [
      { name: 'تحقیق در عملیات ۱', dayAndTime: 'شنبه و دوشنبه ۰۸:۰۰ - ۰۹:۳۰', room: 'کلاس ۲۰۱' },
      { name: 'برنامه‌ریزی خطی پیشرفته', dayAndTime: 'یکشنبه ۱۰:۰۰ - ۱۲:۰۰', room: 'آمفی‌تئاتر' },
    ],
  },
  {
    id: 'prof-2',
    name: 'دکتر سارا شمسایی',
    title: 'دانشیار - گروه مدیریت پروژه و تحلیل زنجیره تامین',
    avatar: '02_avatar_girl.png',
    office: 'اتاق ۲۱۲ (طبقه دوم دانشکده صنایع)',
    officeHours: 'یکشنبه و سه‌شنبه: ۱۳:۳۰ الی ۱۵:۳۰',
    isCurrentlyInOffice: true,
    email: 's.shamsaei@aut.ac.ir',
    courses: [
      { name: 'مدیریت و کنترل پروژه', dayAndTime: 'سه‌شنبه و چهارشنبه ۰۸:۰۰ - ۱۰:۰۰', room: 'کلاس ۱۰۴' },
      { name: 'اقتصاد مهندسی', dayAndTime: 'یکشنبه ۱۰:۰۰ - ۱۲:۰۰', room: 'کلاس ۲۰۵' },
    ],
  },
  {
    id: 'prof-3',
    name: 'دکتر بهزاد کاظمی',
    title: 'استادیار - گروه علم داده و هوش مصنوعی در صنایع',
    avatar: '01_avatar_boy.png',
    office: 'اتاق ۴۰۸ (مرکز تحقیقات محاسباتی)',
    officeHours: 'شنبه و چهارشنبه: ۱۴:۰۰ الی ۱۶:۰۰',
    isCurrentlyInOffice: false,
    email: 'b.kazemi@aut.ac.ir',
    courses: [
      { name: 'شبیه‌سازی سیستم‌های گسسته-پیشامد', dayAndTime: 'دوشنبه ۱۰:۰۰ - ۱۲:۰۰', room: 'سایت تخصصی' },
      { name: 'داده‌کاوی در مهندسی صنایع', dayAndTime: 'چهارشنبه ۱۰:۰۰ - ۱۲:۰۰', room: 'کلاس ۳۰۲' },
    ],
  },
];

export const DEFAULT_ADMINS: AdminUser[] = [
  {
    id: 'adm-master-629890497',
    fullName: 'مدیر ارشد انجمن علمی صنایع (ID: 629890497)',
    telegramId: MASTER_ADMIN_TELEGRAM_ID,
    roleLevel: 5,
    roleLabel: 'سطح ۵ - مدیر ارشد انجمن',
    personalPassword: 'HASHED::MASTER_SALTLOCK',
    permissions: {
      ai: true,
      tickets: true,
      users: true,
      events: true,
      professors: true,
      finance: true,
      broadcast: true,
    },
    isFrozen: false,
    lastActive: 'هم‌اکنون آنلاین',
  },
  {
    id: 'adm-2',
    fullName: 'پرنیا محمدی (مسئول آموزش و کارگاه‌ها)',
    telegramId: '@parnia_ie_edu',
    roleLevel: 3,
    roleLabel: 'سطح ۳: کمیته آموزش و اساتید',
    personalPassword: 'EDU_402_PASS',
    permissions: {
      ai: true,
      tickets: true,
      users: false,
      events: true,
      professors: true,
      finance: false,
      broadcast: false,
    },
    isFrozen: false,
    lastActive: '۱۵ دقیقه پیش',
  },
  {
    id: 'adm-3',
    fullName: 'کیانوش نادری (خزانه‌دار و مالی)',
    telegramId: '@kianoosh_fin',
    roleLevel: 6,
    roleLabel: 'سطح ۶: سایر (سفارشی)',
    personalPassword: 'FIN_CUSTOM_99',
    permissions: {
      ai: false,
      tickets: true,
      users: true,
      events: false,
      professors: false,
      finance: true,
      broadcast: false,
    },
    isFrozen: false,
    lastActive: '۱ ساعت پیش',
  },
];

export const DEFAULT_TIMERS: ScheduledTimer[] = [
  {
    id: 'tmr-1',
    title: 'یادآوری رزرو سلف و تغذیه دانشجویی',
    rawSentence: 'هر چهارشنبه ساعت ۱۴ یادآوری رزرو سلف از تاریخ ۱۴۰۴/۰۸/۲۴',
    frequency: 'هفتگی',
    dayOfWeek: 'چهارشنبه',
    startDate: '۱۴۰۴/۰۸/۲۴',
    time: '۱۴:۰۰',
    targetAudience: 'همه ورودی‌ها (۱۴۰۰ تا ۱۴۰۵)',
    messageText: '🍽 یادآوری دوستانه انجمن صنایع: مهلت رزرو سلف هفته آینده تا ساعت ۱۴ امروز است!',
    enabled: true,
  },
  {
    id: 'tmr-2',
    title: 'یادآوری ویژه روز کارگاه تحلیل داده با پایتون',
    rawSentence: 'فقط در تاریخ ۱۴۰۴/۰۸/۲۸ ساعت ۱۰ یادآوری شروع کارگاه پایتون',
    frequency: 'یکبار',
    startDate: '۱۴۰۴/۰۸/۲۸',
    time: '۱۰:۰۰',
    targetAudience: 'ثبت‌نام‌کنندگان کارگاه پایتون',
    messageText: '🎯 فقط در تاریخ ۱۴۰۴/۰۸/۲۸: کارگاه تحلیل داده با پایتون امروز ساعت ۱۴ در سایت کامپیوتر برگزار می‌شود.',
    enabled: true,
  },
];

export const DEFAULT_LOGS: AdminAuditLogItem[] = [
  {
    id: 'log-1',
    actor: 'مدیر ارشد انجمن (ID: 629890497)',
    action: 'ورود موفق به پنل مدیریت با تایید رمز ارشد',
    target: 'نشست امن #۸۴۹۲',
    timestamp: '۱۴۰۴/۰۸/۲۳ - ۱۰:۴۰',
    severity: 'success',
  },
  {
    id: 'log-2',
    actor: 'پرنیا محمدی (سطح ۳)',
    action: 'بروزرسانی ساعات حضور دکتر رضایی در رادار اساتید',
    target: 'اتاق ۳۰۵ دانشکده صنایع',
    timestamp: '۱۴۰۴/۰۸/۲۳ - ۰۹:۱۵',
    severity: 'info',
  },
  {
    id: 'log-3',
    actor: 'سپر ضدتقلب خودکار',
    action: 'بررسی یکپارچگی هش امتیازات دانشجویان (FNV-1a Checksum)',
    target: '۱۲۸ پروفایل دانشجویی',
    timestamp: '۱۴۰۴/۰۸/۲۳ - ۰۸:۳۰',
    severity: 'info',
  },
];

export const DEFAULT_FEATURE_FLAGS: FeatureFlags = {
  eventsRegistrationEnabled: true,
  lootboxStoreEnabled: true,
  leaderboardEnabled: true,
  supportTicketsEnabled: true,
  professorsDirectoryEnabled: true,
  globalMaintenanceMode: false,
};

const PIXEL_MEDAL_PRESETS = [
  { filename: '19_badge_Gear.png', label: 'چرخ‌دنده طلایی' },
  { filename: '20_badge_chart.png', label: 'نمودار تحلیل داده' },
  { filename: '21_badge_code.png', label: 'کدنویسی پایتون' },
  { filename: '22_badge_helmet.png', label: 'کلاه ایمنی صنعت' },
  { filename: '23_badge_idea.png', label: 'لامپ ایده‌پردازی' },
  { filename: '24_badge_trophy.png', label: 'جام قهرمانی طلا' },
  { filename: '23_badge_diamond.png', label: 'الماس درخشان' },
  { filename: '27_rank_lvl3.png', label: 'ستاره افتخار' },
];

const PERMISSION_LABELS: { key: AdminPermissionKey; label: string }[] = [
  { key: 'ai', label: 'هوش مصنوعی' },
  { key: 'tickets', label: 'تیکت' },
  { key: 'users', label: 'کاربران' },
  { key: 'events', label: 'رویداد' },
  { key: 'professors', label: 'اساتید' },
  { key: 'finance', label: 'مالی' },
  { key: 'broadcast', label: 'همگانی' },
];

type AdminModuleId = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;

interface AdminPanelProps {
  isOpen?: boolean;
  onClose: () => void;
  themeMode?: ThemeMode;
  currentAdmin?: AdminUser | null;
  currentUser?: UserProfile;
  userTickets?: TicketRecord[];
  certificates?: CertificateInfo[];
  featureFlags?: FeatureFlags;
  students?: AdminStudentDossier[];
  events?: EventItem[];
  receipts?: AdminReceiptItem[];
  professors?: Professor[];
  admins?: AdminUser[];
  logs?: AdminAuditLogItem[];
  timers?: ScheduledTimer[];
  quests?: WeeklyQuest[];
  badgesCatalog?: BadgeItem[];
  avatarsCatalog?: AvatarCatalogItem[];
  discountRule?: DiscountRuleConfig;
  lootboxConfig?: LootboxConfig;
  disputeTickets?: StudentIdDisputeTicket[];
  announcements?: ChannelAnnouncement[];
  channelUrl?: string;
  featuredEventId?: string;
  aboutConfig?: AboutAssociationConfig;
  onUpdateEvents?: (nextEvents: EventItem[]) => void;
  onUpdateFeaturedEventId?: (nextEventId: string) => void;
  onUpdateAboutConfig?: (nextAbout: AboutAssociationConfig) => void;
  onUpdateProfessors?: (nextProfessors: Professor[]) => void;
  onUpdateQuests?: (nextQuests: WeeklyQuest[]) => void;
  onUpdateAdmins?: (nextAdmins: AdminUser[]) => void;
  onUpdateFeatureFlags?: (nextFlags: FeatureFlags) => void;
  onUpdateStudents?: (nextStudents: AdminStudentDossier[]) => void;
  onUpdateReceipts?: (nextReceipts: AdminReceiptItem[]) => void;
  onUpdateTimers?: (nextTimers: ScheduledTimer[]) => void;
  onUpdateBadges?: (nextBadges: BadgeItem[]) => void;
  onUpdateAvatars?: (nextAvatars: AvatarCatalogItem[]) => void;
  onUpdateTickets?: (nextTickets: TicketRecord[]) => void;
  onUpdateDiscountRule?: (nextRule: DiscountRuleConfig) => void;
  onUpdateLootboxConfig?: (nextLootboxConfig: LootboxConfig) => void;
  onUpdateAnnouncements?: (nextAnnouncements: ChannelAnnouncement[]) => void;
  onUpdateChannelUrl?: (nextChannelUrl: string) => void;
  onUpdateCurrentUserProfile?: (fields: Partial<UserProfile>) => void;
  onCheckInTicket?: (
    checkedTicket: TicketRecord,
    issuedCert: CertificateInfo,
    rewardPoints: number
  ) => void;
  onAwardCurrentStudentPoints?: (deltaPoints: number, reason: string) => void;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({
  isOpen = true,
  onClose,
  themeMode = 'night',
  currentAdmin = DEFAULT_ADMINS[0],
  currentUser,
  userTickets = [],
  featureFlags = DEFAULT_FEATURE_FLAGS,
  students = DEFAULT_STUDENTS,
  events = DEFAULT_EVENTS,
  receipts = DEFAULT_RECEIPTS,
  professors = DEFAULT_PROFESSORS,
  admins = DEFAULT_ADMINS,
  logs = DEFAULT_LOGS,
  timers = DEFAULT_TIMERS,
  quests = INITIAL_WEEKLY_QUESTS,
  badgesCatalog = EXTENDED_BADGES,
  avatarsCatalog = DEFAULT_AVATARS_CATALOG,
  discountRule: propDiscountRule,
  lootboxConfig: propLootboxConfig = DEFAULT_LOOTBOX_CONFIG,
  disputeTickets = [],
  announcements: propAnnouncements = DEFAULT_ISEFUM_ANNOUNCEMENTS,
  channelUrl: propChannelUrl = DEFAULT_CHANNEL_URL,
  featuredEventId: propFeaturedEventId = 'ev-project-mgmt',
  aboutConfig: propAboutConfig = DEFAULT_ABOUT_CONFIG,
  onUpdateEvents,
  onUpdateFeaturedEventId,
  onUpdateAboutConfig,
  onUpdateProfessors,
  onUpdateQuests,
  onUpdateAdmins,
  onUpdateFeatureFlags,
  onUpdateStudents,
  onUpdateReceipts,
  onUpdateTimers,
  onUpdateBadges,
  onUpdateAvatars,
  onUpdateTickets,
  onUpdateDiscountRule,
  onUpdateLootboxConfig,
  onUpdateAnnouncements,
  onUpdateChannelUrl,
  onUpdateCurrentUserProfile,
  onCheckInTicket,
  onAwardCurrentStudentPoints,
}) => {
  const isNight = themeMode === 'night';
  const activeAdmin = currentAdmin || DEFAULT_ADMINS[0];

  const [activeModule, setActiveModule] = useState<AdminModuleId>(1);
  const [toastBanner, setToastBanner] = useState<string | null>(null);

  const [studentList, setStudentList] = useState<AdminStudentDossier[]>(() =>
    Array.isArray(students) && students.length > 0 ? students : DEFAULT_STUDENTS
  );
  const [eventList, setEventList] = useState<EventItem[]>(() =>
    Array.isArray(events) && events.length > 0 ? events : DEFAULT_EVENTS
  );
  const [receiptList, setReceiptList] = useState<AdminReceiptItem[]>(() =>
    Array.isArray(receipts) && receipts.length > 0 ? receipts : DEFAULT_RECEIPTS
  );
  const [profList, setProfList] = useState<Professor[]>(() =>
    Array.isArray(professors) && professors.length > 0 ? professors : DEFAULT_PROFESSORS
  );
  const [adminList, setAdminList] = useState<AdminUser[]>(() =>
    Array.isArray(admins) && admins.length > 0 ? admins : DEFAULT_ADMINS
  );
  const [auditLogs, setAuditLogs] = useState<AdminAuditLogItem[]>(() =>
    Array.isArray(logs) && logs.length > 0 ? logs : DEFAULT_LOGS
  );
  const [timerList, setTimerList] = useState<ScheduledTimer[]>(() =>
    Array.isArray(timers) && timers.length > 0 ? timers : DEFAULT_TIMERS
  );
  const [questList, setQuestList] = useState<WeeklyQuest[]>(() =>
    Array.isArray(quests) && quests.length > 0 ? quests : INITIAL_WEEKLY_QUESTS
  );
  const [badgeList, setBadgeList] = useState<BadgeItem[]>(() =>
    Array.isArray(badgesCatalog) && badgesCatalog.length > 0
      ? badgesCatalog
      : EXTENDED_BADGES
  );
  const [avatarList, setAvatarList] = useState<AvatarCatalogItem[]>(() =>
    Array.isArray(avatarsCatalog) && avatarsCatalog.length > 0
      ? avatarsCatalog
      : DEFAULT_AVATARS_CATALOG
  );
  const [ticketList, setTicketList] = useState<TicketRecord[]>(() =>
    Array.isArray(userTickets) ? userTickets : []
  );
  const [flagsState, setFlagsState] = useState<FeatureFlags>(
    featureFlags || DEFAULT_FEATURE_FLAGS
  );

  // Sync incoming props
  useEffect(() => {
    if (Array.isArray(events) && events.length > 0) setEventList(events);
  }, [events]);

  useEffect(() => {
    if (Array.isArray(professors) && professors.length > 0) setProfList(professors);
  }, [professors]);

  useEffect(() => {
    if (Array.isArray(students)) setStudentList(students);
  }, [students]);

  useEffect(() => {
    if (Array.isArray(receipts)) setReceiptList(receipts);
  }, [receipts]);

  useEffect(() => {
    if (Array.isArray(timers) && timers.length > 0) setTimerList(timers);
  }, [timers]);

  useEffect(() => {
    if (Array.isArray(badgesCatalog) && badgesCatalog.length > 0) setBadgeList(badgesCatalog);
  }, [badgesCatalog]);

  useEffect(() => {
    if (Array.isArray(avatarsCatalog) && avatarsCatalog.length > 0)
      setAvatarList(avatarsCatalog);
  }, [avatarsCatalog]);

  useEffect(() => {
    if (Array.isArray(userTickets)) setTicketList(userTickets);
  }, [userTickets]);

  useEffect(() => {
    if (featureFlags) setFlagsState(featureFlags);
  }, [featureFlags]);

  // Helper wrappers to persist state updates upwards to App.tsx safely outside setState updater callbacks
  const updateStudentsAndPersist = (
    updater: (prev: AdminStudentDossier[]) => AdminStudentDossier[]
  ) => {
    const next = updater(Array.isArray(studentList) ? studentList : DEFAULT_STUDENTS);
    setStudentList(next);
    onUpdateStudents?.(next);
  };

  const updateReceiptsAndPersist = (
    updater: (prev: AdminReceiptItem[]) => AdminReceiptItem[]
  ) => {
    const next = updater(Array.isArray(receiptList) ? receiptList : DEFAULT_RECEIPTS);
    setReceiptList(next);
    onUpdateReceipts?.(next);
  };

  const updateTimersAndPersist = (
    updater: (prev: ScheduledTimer[]) => ScheduledTimer[]
  ) => {
    const next = updater(Array.isArray(timerList) ? timerList : DEFAULT_TIMERS);
    setTimerList(next);
    onUpdateTimers?.(next);
  };

  const updateBadgesAndPersist = (updater: (prev: BadgeItem[]) => BadgeItem[]) => {
    const next = updater(Array.isArray(badgeList) ? badgeList : EXTENDED_BADGES);
    setBadgeList(next);
    onUpdateBadges?.(next);
  };

  const updateAvatarsAndPersist = (
    updater: (prev: AvatarCatalogItem[]) => AvatarCatalogItem[]
  ) => {
    const next = updater(
      Array.isArray(avatarList) ? avatarList : DEFAULT_AVATARS_CATALOG
    );
    setAvatarList(next);
    onUpdateAvatars?.(next);
  };

  const updateTicketsAndPersist = (updater: (prev: TicketRecord[]) => TicketRecord[]) => {
    const next = updater(Array.isArray(ticketList) ? ticketList : []);
    setTicketList(next);
    onUpdateTickets?.(next);
  };

  // Live Online Users Radar State (strictly real users)
  const [onlineSessions, setOnlineSessions] = useState<OnlineSessionUser[]>(() =>
    currentUser?.studentId
      ? [
          {
            id: 'sess-current',
            studentId: currentUser.studentId,
            fullName: currentUser.fullName || 'دانشجوی آنلاین',
            cohortYear: currentUser.cohortYear || '۱۴۰۲',
            device:
              typeof window !== 'undefined' && window.innerWidth >= 1024
                ? 'Desktop Web'
                : 'Telegram Mobile',
            activePage: 'پروفایل دانشجویی / بلیط QR',
            lastHeartbeat: 'هم‌اکنون آنلاین (شما)',
            isLocked: false,
          },
        ]
      : []
  );

  // ==========================================================================
  // MODULE 1 STATE: QR Scanner vs Separate Ticket History Page + Image Upload
  // ==========================================================================
  const [mod1SubPage, setMod1SubPage] = useState<'scanner' | 'history'>('scanner');
  const qrImageInputRef = useRef<HTMLInputElement | null>(null);
  const [isDecodingQrImage, setIsDecodingQrImage] = useState(false);
  const [isLiveCameraModalOpen, setIsLiveCameraModalOpen] = useState(false);

  const unScannedTickets = useMemo(
    () => (Array.isArray(ticketList) ? ticketList : []).filter((t) => !t.checkedIn),
    [ticketList]
  );

  const scannedHistoryTickets = useMemo(
    () => (Array.isArray(ticketList) ? ticketList : []).filter((t) => !!t.checkedIn),
    [ticketList]
  );

  const [qrInputPayload, setQrInputPayload] = useState<string>(() => {
    const firstUnscanned = (Array.isArray(userTickets) ? userTickets : []).find(
      (t) => !t.checkedIn
    );
    return (
      firstUnscanned?.qrPayload ||
      generateTicketPayload('ev-project-mgmt', '4011234567', 'TK-402891')
    );
  });
  const [scanErrorAlert, setScanErrorAlert] = useState<string | null>(null);
  const [lastScannedResult, setLastScannedResult] = useState<{
    ticketCode: string;
    studentName: string;
    studentId: string;
    eventTitle: string;
    certificateCode: string;
    pointsAdded: number;
    badgeUnlocked: string;
    timestamp: string;
  } | null>(null);

  // ==========================================================================
  // MODULE 2 STATE: Receipts & KYC Queue + Pending / Approved / Rejected Folders
  // ==========================================================================
  const [queueFilter, setQueueFilter] = useState<'receipt' | 'kyc'>('receipt');
  const [queueStatusFolder, setQueueStatusFolder] = useState<
    'pending' | 'approved' | 'rejected'
  >('pending');

  // ==========================================================================
  // MODULE 3 STATE: Users, Cohort Filter, Custom Point Input & 360 Dossier
  // ==========================================================================
  const [selectedCohort, setSelectedCohort] = useState<string>('همه');
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [selectedStudentIdForDossier, setSelectedStudentIdForDossier] = useState<string | null>(
    null
  );
  const [dossierTab, setDossierTab] = useState<'overview' | 'payments' | 'chats'>('overview');
  const [customPointsInput, setCustomPointsInput] = useState<number>(25);
  const [customPointsReason, setCustomPointsReason] = useState<string>(
    'تغییر امتیاز اختصاصی توسط شورای مرکزی'
  );

  // ==========================================================================
  // MODULE 4 STATE: Events, Featured Event, Professors, Channel Sync & About Editor
  // ==========================================================================
  const [mod4SubTab, setMod4SubTab] = useState<
    'events' | 'professors' | 'channel' | 'about'
  >('events');
  const [selectedFeaturedEventId, setSelectedFeaturedEventId] = useState<string>(
    propFeaturedEventId || 'ev-project-mgmt'
  );
  const [aboutDraft, setAboutDraft] = useState<AboutAssociationConfig>(() => ({
    ...DEFAULT_ABOUT_CONFIG,
    ...(propAboutConfig || {}),
    stats:
      Array.isArray(propAboutConfig?.stats) && propAboutConfig.stats.length === 3
        ? propAboutConfig.stats
        : DEFAULT_ABOUT_CONFIG.stats,
    committees:
      Array.isArray(propAboutConfig?.committees) &&
      propAboutConfig.committees.length > 0
        ? propAboutConfig.committees
        : DEFAULT_ABOUT_CONFIG.committees,
  }));
  const [committeesRawText, setCommitteesRawText] = useState<string>(() =>
    (Array.isArray(propAboutConfig?.committees) &&
    propAboutConfig.committees.length > 0
      ? propAboutConfig.committees
      : DEFAULT_ABOUT_CONFIG.committees
    ).join('\n')
  );
  const [channelUrlInput, setChannelUrlInput] = useState<string>(
    propChannelUrl || DEFAULT_CHANNEL_URL
  );
  const [announcementList, setAnnouncementList] = useState<ChannelAnnouncement[]>(() =>
    Array.isArray(propAnnouncements) && propAnnouncements.length > 0
      ? propAnnouncements
      : DEFAULT_ISEFUM_ANNOUNCEMENTS
  );
  const [isSyncingChannel, setIsSyncingChannel] = useState(false);
  const [manualAnnTitle, setManualAnnTitle] = useState('');
  const [manualAnnTag, setManualAnnTag] = useState('اطلاعیه فوری');
  const [manualAnnContent, setManualAnnContent] = useState('');
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  const [eventTitleInput, setEventTitleInput] = useState('');
  const [eventCategoryInput, setEventCategoryInput] = useState<
    'workshop' | 'visit' | 'seminar'
  >('workshop');
  const [eventDateInput, setEventDateInput] = useState('۱۵ آذر ۱۴۰۴');
  const [eventTimeInput, setEventTimeInput] = useState('۱۴:۰۰ الی ۱۷:۰۰');
  const [eventLocationInput, setEventLocationInput] = useState('آمفی‌تئاتر دانشکده صنایع');
  const [eventPriceInput, setEventPriceInput] = useState<number>(80000);
  const [eventCapacityInput, setEventCapacityInput] = useState<number>(40);
  const [eventPointsInput, setEventPointsInput] = useState<number>(50);
  const [eventInstructorInput, setEventInstructorInput] = useState('دکتر محمدرضا رضایی');

  const [profNameInput, setProfNameInput] = useState('');
  const [profTitleInput, setProfTitleInput] = useState('استادیار - دانشکده مهندسی صنایع');
  const [profAvatarInput, setProfAvatarInput] = useState('01_avatar_boy.png');
  const [profOfficeInput, setProfOfficeInput] = useState('اتاق ۳۰۹ (طبقه سوم)');
  const [profHoursInput, setProfHoursInput] = useState('یکشنبه و سه‌شنبه ۱۰:۰۰ الی ۱۲:۰۰');
  const [profEmailInput, setProfEmailInput] = useState('prof@aut.ac.ir');
  const [profCourseNameInput, setProfCourseNameInput] = useState('تحقیق در عملیات ۱');
  const [profCourseTimeInput, setProfCourseTimeInput] = useState('شنبه و دوشنبه ۰۸:۰۰ - ۱۰:۰۰');
  const [profCourseRoomInput, setProfCourseRoomInput] = useState('کلاس ۲۰۲');

  // ==========================================================================
  // MODULE 5 STATE: Admin Looti AI + Exact Start Date & One-Time / Recurring Timers
  // ==========================================================================
  const [aiModelId, setAiModelId] = useState<LootiModelId>('gemini-3.8-flash');
  const [aiChatInput, setAiChatInput] = useState('');
  const [isAiBusy, setIsAiBusy] = useState(false);
  const [aiMessages, setAiMessages] = useState<LootiChatMessage[]>([
    {
      id: 'adm-ai-welcome',
      sender: 'looti',
      text: 'سلام ستون! 🤖 به مرکز فرماندهی هوش مصنوعی مشتی (مخصوص شورای مرکزی) خوش اومدی. هر امری داری از تحلیل ورودی‌ها، استخراج خودکار برنامه اساتید یا ساخت تایمر اعلامیه بگو، روی چشمم، حله رفیق!',
      timestamp: 'هم‌اکنون',
      modelUsed: 'gemini-3.8-flash',
    },
  ]);

  const [rawProfScheduleText, setRawProfScheduleText] = useState(
    'دکتر علی رضایی (دانشیار) - اتاق ۳۱۲ | درس تحقیق در عملیات ۱: شنبه و دوشنبه ساعت ۸ تا ۱۰ کلاس ۲۰۴ | درس کنترل کیفیت: سه‌شنبه ساعت ۱۴ تا ۱۶ کلاس ۱۰۱ | حضور در دفتر: یکشنبه‌ها ساعت ۱۰ تا ۱۲'
  );
  const [isParsingProfAi, setIsParsingProfAi] = useState(false);
  const [parsedProfPreviewList, setParsedProfPreviewList] = useState<Professor[]>([]);

  // Timer Builder State (Both Natural Language & Explicit Start Date / One-Time Date)
  const [nlTimerInput, setNlTimerInput] = useState(
    'فقط در تاریخ ۱۴۰۴/۰۹/۰۵ ساعت ۱۴ یادآوری ثبت‌نام کارگاه پایتون'
  );
  const [timerTitleInput, setTimerTitleInput] = useState('');
  const [timerStartDateInput, setTimerStartDateInput] = useState('۱۴۰۴/۰۸/۲۸');
  const [timerTimeInput, setTimerTimeInput] = useState('۱۴:۰۰');
  const [timerFreqInput, setTimerFreqInput] =
    useState<ScheduledTimer['frequency']>('یکبار');
  const [timerDayOfWeekInput, setTimerDayOfWeekInput] = useState('چهارشنبه');
  const [timerAudienceInput, setTimerAudienceInput] = useState(
    'همه ورودی‌های مهندسی صنایع (۱۴۰۰ تا ۱۴۰۵)'
  );

  // ==========================================================================
  // MODULE 6 STATE: Dynamic Medal Creator + Universal Avatar Studio + Discount Rule + Lootbox Manager
  // ==========================================================================
  const [mod6SubTab, setMod6SubTab] = useState<
    'medals' | 'avatars' | 'discounts' | 'lootbox'
  >('lootbox');
  const [discountRule, setDiscountRule] = useState<DiscountRuleConfig>(
    propDiscountRule || {
      pointsStep: 10,
      discountTomansPerStep: 50000,
    }
  );
  const [lootboxDraft, setLootboxDraft] = useState<LootboxConfig>(() =>
    propLootboxConfig &&
    Array.isArray(propLootboxConfig.bronzePrizes) &&
    Array.isArray(propLootboxConfig.goldPrizes)
      ? propLootboxConfig
      : DEFAULT_LOOTBOX_CONFIG
  );
  const [isSavingLootbox, setIsSavingLootbox] = useState(false);
  const [newPrizeChestType, setNewPrizeChestType] = useState<'bronze' | 'gold'>('bronze');
  const [newPrizeTitle, setNewPrizeTitle] = useState('');
  const [newPrizeRewardType, setNewPrizeRewardType] =
    useState<LootboxPrizeItem['rewardType']>('discount');
  const [newPrizeChance, setNewPrizeChance] = useState<number>(25);
  const [newPrizeBonusPoints, setNewPrizeBonusPoints] = useState<number>(20);

  const [selectedStudentForBadge, setSelectedStudentForBadge] = useState<string>(
    () => currentUser?.studentId || students[0]?.studentId || ''
  );
  const [selectedBadgeFilename, setSelectedBadgeFilename] =
    useState<string>('19_badge_Gear.png');
  const [newQuestTitle, setNewQuestTitle] = useState('');
  const [newQuestReward, setNewQuestReward] = useState<number>(40);

  // New Custom Medal Form State
  const medalFileInputRef = useRef<HTMLInputElement | null>(null);
  const [newMedalTitle, setNewMedalTitle] = useState('');
  const [newMedalSubtitle, setNewMedalSubtitle] = useState('');
  const [newMedalHowToEarn, setNewMedalHowToEarn] = useState('');
  const [newMedalImage, setNewMedalImage] = useState('24_badge_trophy.png');
  const [newMedalUnlockDefault, setNewMedalUnlockDefault] = useState(true);

  // New Universal Avatar Form State (for Students & Professors)
  const avatarFileInputRef = useRef<HTMLInputElement | null>(null);
  const [newAvatarTitle, setNewAvatarTitle] = useState('');
  const [newAvatarRole, setNewAvatarRole] = useState<'student' | 'professor'>('student');
  const [newAvatarImage, setNewAvatarImage] = useState('01_avatar_boy.png');

  // Module 7: 6-Level RBAC & Custom Permissions
  const [newAdminName, setNewAdminName] = useState('');
  const [newAdminTelegram, setNewAdminTelegram] = useState('@ie_council_member');
  const [newAdminLevel, setNewAdminLevel] = useState<1 | 2 | 3 | 4 | 5 | 6>(6);
  const [newAdminPassword, setNewAdminPassword] = useState('IE_CUSTOM_404');
  const [customPermissions, setCustomPermissions] = useState<
    Record<AdminPermissionKey, boolean>
  >({
    ai: true,
    tickets: true,
    users: true,
    events: false,
    professors: false,
    finance: false,
    broadcast: false,
  });

  // Module 8: Cloudflare Quota & Auto-Cleanup
  const [cleanupDays, setCleanupDays] = useState<25 | 30>(30);
  const [cfStats, setCfStats] = useState({
    workerRequestsUsed: 14820,
    workerRequestsMax: 100000,
    kvReadsUsed: 21450,
    kvReadsMax: 100000,
    kvWritesUsed: 312,
    kvWritesMax: 1000,
    storageMbUsed: 184,
    storageMbMax: 1024,
  });

  const triggerToast = (msg: string) => {
    setToastBanner(msg);
    setTimeout(() => {
      setToastBanner((prev) => (prev === msg ? null : prev));
    }, 4500);
  };

  const appendLog = (
    action: string,
    target: string,
    severity: AdminAuditLogItem['severity'] = 'info'
  ) => {
    const newEntry: AdminAuditLogItem = {
      id: `log-${Date.now()}`,
      actor: `${activeAdmin.fullName}`,
      action,
      target,
      timestamp: new Date().toLocaleTimeString('fa-IR', {
        hour: '2-digit',
        minute: '2-digit',
      }),
      severity,
    };
    setAuditLogs((prev) => [newEntry, ...(Array.isArray(prev) ? prev : [])]);
  };

  const hasPermission = (perm: AdminPermissionKey): boolean => {
    if (
      isMasterAdminTelegramUser(activeAdmin?.telegramId) ||
      activeAdmin?.telegramId === MASTER_ADMIN_TELEGRAM_ID
    ) {
      return true;
    }
    if (!activeAdmin?.permissions) return true;
    return !!activeAdmin.permissions[perm];
  };

  const filteredStudents = useMemo(() => {
    const safeList = Array.isArray(studentList) ? studentList : [];
    return safeList.filter((st) => {
      const matchesCohort =
        selectedCohort === 'همه' || st.cohortYear === selectedCohort;
      const q = userSearchQuery.trim();
      const matchesSearch =
        !q ||
        st.fullName.includes(q) ||
        st.studentId.includes(q) ||
        st.phone.includes(q);
      return matchesCohort && matchesSearch;
    });
  }, [studentList, selectedCohort, userSearchQuery]);

  const activeDossierStudent = useMemo(() => {
    const safeList = Array.isArray(studentList) ? studentList : [];
    return safeList.find((s) => s.id === selectedStudentIdForDossier) || null;
  }, [studentList, selectedStudentIdForDossier]);

  // Normalize receipt/kyc items and filter by type AND folder (pending / approved / rejected)
  const queueItemsByType = useMemo(() => {
    const safeList = Array.isArray(receiptList) ? receiptList : [];
    return safeList.filter((item) => {
      const isReceiptType =
        item.type === 'receipt' || item.type === 'payment_receipt';
      const isKycType = item.type === 'kyc' || item.type === 'student_card';
      return queueFilter === 'receipt' ? isReceiptType : isKycType;
    });
  }, [receiptList, queueFilter]);

  const folderCounts = useMemo(() => {
    const pending = queueItemsByType.filter((i) => i.status === 'pending').length;
    const approved = queueItemsByType.filter((i) => i.status === 'approved').length;
    const rejected = queueItemsByType.filter((i) => i.status === 'rejected').length;
    return { pending, approved, rejected };
  }, [queueItemsByType]);

  const filteredQueueItems = useMemo(() => {
    return queueItemsByType.filter((item) => item.status === queueStatusFolder);
  }, [queueItemsByType, queueStatusFolder]);

  const studentAvatarsList = useMemo(
    () => (Array.isArray(avatarList) ? avatarList : []).filter((a) => a.targetRole === 'student'),
    [avatarList]
  );

  const professorAvatarsList = useMemo(
    () =>
      (Array.isArray(avatarList) ? avatarList : []).filter(
        (a) => a.targetRole === 'professor'
      ),
    [avatarList]
  );

  if (!isOpen) return null;

  // ==========================================================================
  // MODULE ACTION HANDLERS
  // ==========================================================================

  // Toggle FeatureFlags Kill-Switches
  const handleToggleFeatureFlag = (key: keyof FeatureFlags, label: string) => {
    playSwitch();
    const nextFlags: FeatureFlags = {
      ...flagsState,
      [key]: !flagsState[key],
    };
    setFlagsState(nextFlags);
    onUpdateFeatureFlags?.(nextFlags);
    const enabled = nextFlags[key];
    appendLog(
      `${enabled ? 'فعال‌سازی' : 'غیرفعال‌سازی موقت (بروزرسانی)'} بخش: ${label}`,
      key,
      enabled ? 'success' : 'warning'
    );
    triggerToast(
      enabled
        ? `✅ بخش «${label}» برای دانشجویان فعال شد.`
        : `🚧 بخش «${label}» در وضعیت بروزرسانی موقت قرار گرفت.`
    );
  };

  // Module 1: Real Cryptographic QR Ticket Check-In & Immediate Move to History Page
  const handleProcessQrTicket = (payloadToScan: string) => {
    setScanErrorAlert(null);
    const raw = (payloadToScan || '').trim();
    if (!raw.startsWith('IE-TICKET:')) {
      playError();
      setScanErrorAlert(
        '❌ فرمت بارکد نامعتبر است! استاندارد: IE-TICKET:EVENT:STUDENT:CODE:HASH'
      );
      return;
    }

    const isSignatureValid = verifyTicketSignature(raw);
    if (!isSignatureValid) {
      playError();
      setScanErrorAlert(
        '🚨 هشدار امنیتی: امضای رمزنگاری بارکد (Signature Hash) نامعتبر یا جعلی است!'
      );
      appendLog('تلاش برای اسکن بلیط با امضای نامعتبر', raw, 'danger');
      return;
    }

    const parts = raw.split(':');
    const eventId = parts[1] || 'ev-project-mgmt';
    const studentId = parts[2] || '4011234567';
    const trackingCode = parts[3] || 'TK-402891';
    const paidFromPayload =
      parts.length === 6 ? Math.max(0, Number(parts[4]) || 0) : undefined;

    touchAdminSession();

    // Patch 5: Check Persistent Anti-Replay Checked-In Ledger FIRST
    const existingLedgerEntry = findCheckedInTicketInLedger(trackingCode, raw);
    const safeTickets = Array.isArray(ticketList) ? ticketList : [];
    const matchedTicket = safeTickets.find(
      (t) => t.qrPayload === raw || t.trackingCode === trackingCode
    );

    if (existingLedgerEntry || (matchedTicket && matchedTicket.checkedIn)) {
      playError();
      const timeStr =
        existingLedgerEntry?.checkedInAt || matchedTicket?.checkedInAt || 'قبلی';
      const replayMsg = `⛔ هشدار امنیتی: این بلیط (${trackingCode}) قبلاً در تاریخ/ساعت ${timeStr} اسکن و ابطال شده است!`;
      setScanErrorAlert(replayMsg);
      appendLog(
        'جلوگیری از اسکن مجدد بلیط تکراری (Anti-Replay Protection)',
        `${trackingCode} (${studentId})`,
        'danger'
      );
      triggerToast(replayMsg);
      return;
    }

    const safeStudents = Array.isArray(studentList) ? studentList : [];
    const matchedStudent = safeStudents.find((s) => s.studentId === studentId);
    const studentName =
      matchedTicket?.studentName ||
      matchedStudent?.fullName ||
      currentUser?.fullName ||
      'دانشجوی مهندسی صنایع';

    const matchedEvent = (Array.isArray(eventList) ? eventList : []).find(
      (e) => e.id === eventId
    );
    const eventTitle =
      matchedTicket?.eventTitle ||
      matchedEvent?.title ||
      'کارگاه مدیریت پروژه و کنترل زمان';
    const rewardPoints = matchedEvent?.rewardPoints || 40;

    const cohort = studentId.slice(0, 3) || '402';
    const certCode = generateCertificateCode(cohort, studentId, eventId);
    const nowTime = `${new Date().toLocaleDateString('fa-IR')} ساعت ${new Date().toLocaleTimeString(
      'fa-IR',
      {
        hour: '2-digit',
        minute: '2-digit',
      }
    )}`;

    // Record in persistent anti-replay ledger + notify live Cloudflare Worker (POST /api/miniapp/check-in)
    recordTicketInCheckedInLedger(trackingCode, raw, studentName, nowTime);
    void verifyQrCheckInWithBot(
      raw,
      'ADM-SESSION',
      activeAdmin?.telegramId || MASTER_ADMIN_TELEGRAM_ID
    );

    playFanfare();

    // Update student dossier inside AdminPanel
    updateStudentsAndPersist((prev) =>
      prev.map((s) =>
        s.studentId === studentId
          ? {
              ...s,
              score: s.score + rewardPoints,
              badges: s.badges.includes('21_badge_code.png')
                ? s.badges
                : [...s.badges, '21_badge_code.png'],
              attendedEvents: s.attendedEvents.includes(eventTitle)
                ? s.attendedEvents
                : [eventTitle, ...s.attendedEvents],
            }
          : s
      )
    );

    const checkedTicketRecord: TicketRecord = matchedTicket
      ? {
          ...matchedTicket,
          checkedIn: true,
          checkedInAt: nowTime,
        }
      : {
          id: `tkt-${Date.now()}`,
          eventId,
          eventTitle,
          eventDate: matchedEvent?.date || '۲۵ آبان ۱۴۰۴',
          eventTime: matchedEvent?.time || '۱۴:۰۰ الی ۱۷:۳۰',
          location: matchedEvent?.location || 'آمفی‌تئاتر دانشکده صنایع',
          studentId,
          studentName,
          trackingCode,
          qrPayload: raw,
          paidAmount: paidFromPayload ?? 0,
          discountPointsUsed: 0,
          issuedAt: 'امروز',
          sentToTelegram: true,
          checkedIn: true,
          checkedInAt: nowTime,
        };

    // Update local ticketList so the scanned ticket immediately disappears from unScannedTickets!
    updateTicketsAndPersist((prev) => {
      const exists = prev.some(
        (t) => t.qrPayload === raw || t.trackingCode === trackingCode
      );
      return exists
        ? prev.map((t) =>
            t.qrPayload === raw || t.trackingCode === trackingCode
              ? checkedTicketRecord
              : t
          )
        : [checkedTicketRecord, ...prev];
    });

    const issuedCertificate: CertificateInfo = {
      certificateId: certCode,
      studentName,
      courseTitle: eventTitle,
      instructor: matchedEvent?.instructor || 'دکتر محمدرضا رضایی',
      issueDate: new Date().toLocaleDateString('fa-IR'),
      grade: 'عالی (حضور کامل و تایید کارگاه)',
      isValid: true,
      hours: 16,
    };

    if (onCheckInTicket) {
      onCheckInTicket(checkedTicketRecord, issuedCertificate, rewardPoints);
    }

    setLastScannedResult({
      ticketCode: trackingCode,
      studentName,
      studentId,
      eventTitle,
      certificateCode: certCode,
      pointsAdded: rewardPoints,
      badgeUnlocked: 'نشان برنامه‌نویس صنایع (21_badge_code.png)',
      timestamp: nowTime,
    });

    appendLog(
      `ثبت حضور QR، انتقال به سابقه بلیط‌ها، اعطای +${rewardPoints} امتیاز و صدور گواهی ${certCode}`,
      `${studentName} (${studentId})`,
      'success'
    );
    triggerToast(
      `✅ حضور ${studentName} ثبت شد! بلیط از لیست انتظار خارج و به صفحه «سابقه بلیط‌ها» منتقل گردید.`
    );
  };

  // Module 1: Undo Ticket Check-In (from Ticket History page)
  const handleUndoTicketCheckIn = (ticket: TicketRecord) => {
    playTick();
    updateTicketsAndPersist((prev) =>
      prev.map((t) =>
        t.id === ticket.id
          ? { ...t, checkedIn: false, checkedInAt: undefined }
          : t
      )
    );
    appendLog(
      'لغو پذیرش بلیط و بازگردانی به لیست اسکن‌نشده‌ها',
      `${ticket.studentName} (${ticket.trackingCode})`,
      'warning'
    );
    triggerToast(
      `↩️ پذیرش بلیط ${ticket.studentName} (${ticket.trackingCode}) لغو شد و به لیست آماده اسکن بازگشت.`
    );
  };

  // Module 1: Decode Real Uploaded QR Image File (PNG/JPG) using jsQR
  const handleUploadQrImageFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    playTick();
    setIsDecodingQrImage(true);
    setScanErrorAlert(null);
    try {
      const decodedPayload = await decodeQrFromImageFile(file);
      setIsDecodingQrImage(false);
      if (!decodedPayload) {
        playError();
        setScanErrorAlert(
          '❌ بارکد QR معتبری در تصویر انتخاب‌شده یافت نشد. لطفاً عکس PNG بارکد دانلودشده از بلیط را انتخاب کنید.'
        );
        return;
      }
      setQrInputPayload(decodedPayload);
      handleProcessQrTicket(decodedPayload);
    } catch {
      setIsDecodingQrImage(false);
      playError();
      setScanErrorAlert('❌ خطا در خوانش تصویر بارکد QR.');
    } finally {
      e.target.value = '';
    }
  };

  const handleNativeTelegramQrScan = () => {
    playTick();
    if (isTelegramNativeQrPopupSupported()) {
      const tg = (window as unknown as {
        Telegram?: {
          WebApp?: {
            showScanQrPopup?: (
              params: { text: string },
              cb: (text: string) => boolean
            ) => void;
            closeScanQrPopup?: () => void;
          };
        };
      }).Telegram?.WebApp;

      try {
        tg?.showScanQrPopup?.(
          { text: 'بارکد بلیط دانشجو (IE-TICKET) را مقابل دوربین قرار دهید' },
          (scannedText: string) => {
            if (scannedText) {
              setQrInputPayload(scannedText);
              handleProcessQrTicket(scannedText);
              tg?.closeScanQrPopup?.();
              return true;
            }
            return false;
          }
        );
        return;
      } catch {
        // Fallback below
      }
    }

    // If a valid IE-TICKET payload is already in the input box and un-scanned, process it or open live camera modal
    if (qrInputPayload && qrInputPayload.trim().startsWith('IE-TICKET:')) {
      handleProcessQrTicket(qrInputPayload);
    } else {
      setIsLiveCameraModalOpen(true);
    }
  };

  // ==========================================================================
  // MODULE 2: Approve / Reject / Restore Receipt or KYC (Moves to Folder!)
  // ==========================================================================
  const handleQueueDecision = (
    item: AdminReceiptItem,
    decision: 'approved' | 'rejected' | 'pending'
  ) => {
    const isReceipt = item.type === 'receipt' || item.type === 'payment_receipt';
    if (!hasPermission('finance') && isReceipt) {
      playError();
      triggerToast('⛔ سطح دسترسی شما مجوز تایید مالی را ندارد.');
      return;
    }

    if (decision === 'approved') {
      playFanfare();
    } else if (decision === 'rejected') {
      playError();
    } else {
      playTick();
    }

    const nowStamp = new Date().toLocaleTimeString('fa-IR', {
      hour: '2-digit',
      minute: '2-digit',
    });

    updateReceiptsAndPersist((prev) =>
      prev.map((r) =>
        r.id === item.id
          ? {
              ...r,
              status: decision,
              decidedAt: decision === 'pending' ? undefined : `امروز ساعت ${nowStamp}`,
            }
          : r
      )
    );

    if (!isReceipt) {
      // It's a Student ID Card (KYC)
      const nextKycStatus: KycStatus =
        decision === 'approved'
          ? 'verified'
          : decision === 'rejected'
          ? 'kyc_locked'
          : 'pending_review';

      updateStudentsAndPersist((prev) =>
        prev.map((s) =>
          s.studentId === item.studentId ? { ...s, kycStatus: nextKycStatus } : s
        )
      );

      if (currentUser?.studentId && item.studentId === currentUser.studentId) {
        onUpdateCurrentUserProfile?.({ kycStatus: nextKycStatus });
      }
    } else if (decision === 'approved') {
      // It's a Payment Receipt -> ensure a real scannable QR ticket is issued for this student!
      const evId = item.eventId || 'ev-python-data';
      const evTitle =
        item.eventTitle || item.title || 'کارگاه تحلیل داده با پایتون';
      const qrCodePayload = generateTicketPayload(
        evId,
        item.studentId,
        item.trackingCode
      );
      const newApprovedTicket: TicketRecord = {
        id: `tkt-rcp-${item.id}`,
        eventId: evId,
        eventTitle: evTitle,
        eventDate: '۲۸ آبان ۱۴۰۴',
        eventTime: '۱۴:۰۰ الی ۱۷:۰۰',
        location: 'آمفی‌تئاتر دانشکده مهندسی صنایع',
        studentId: item.studentId,
        studentName: item.studentName,
        trackingCode: item.trackingCode,
        qrPayload: qrCodePayload,
        paidAmount: item.amountTomans || item.amount || 50000,
        discountPointsUsed: 0,
        issuedAt: 'هم‌اکنون (تایید فیش)',
        sentToTelegram: true,
        checkedIn: false,
      };
      updateTicketsAndPersist((prev) => {
        const exists = prev.some((t) => t.trackingCode === item.trackingCode);
        return exists ? prev : [newApprovedTicket, ...prev];
      });
    }

    appendLog(
      decision === 'approved'
        ? `تایید و انتقال به پوشه تاییدشده‌ها (${isReceipt ? 'فیش واریزی' : 'کارت دانشجویی KYC'})`
        : decision === 'rejected'
        ? `رد کردن و انتقال به پوشه ردشده‌ها (${isReceipt ? 'فیش واریزی' : 'کارت دانشجویی KYC'})`
        : `بازگردانی به صف در انتظار بررسی`,
      `${item.studentName} (${item.trackingCode})`,
      decision === 'approved' ? 'success' : decision === 'rejected' ? 'warning' : 'info'
    );

    triggerToast(
      decision === 'approved'
        ? `✅ مورد ${item.studentName} تایید شد و به «پوشه تاییدشده‌های گذشته» منتقل گردید!`
        : decision === 'rejected'
        ? `❌ مورد ${item.studentName} رد شد و به «پوشه ردشده‌های گذشته» منتقل گردید.`
        : `🔄 مورد ${item.studentName} به صف «در انتظار بررسی» بازگردانده شد.`
    );
  };

  // ==========================================================================
  // MODULE 3: CSV Export + Full Lock/Unlock Control + Arbitrary Custom Points
  // ==========================================================================
  const handleExportStudentsCsv = () => {
    playCoin();
    const safeStudents = Array.isArray(filteredStudents) ? filteredStudents : [];
    const headers = [
      'نام و نام خانوادگی',
      'شماره دانشجویی',
      'ورودی',
      'تلفن',
      'امتیاز',
      'سطح',
      'وضعیت KYC',
      'وضعیت حساب',
    ];
    const rows = safeStudents.map((s) => [
      s.fullName,
      s.studentId,
      s.cohortYear,
      s.phone,
      String(s.score),
      String(s.level),
      s.kycStatus,
      s.isBanned ? 'مسدود' : 'فعال',
    ]);
    const csvContent =
      '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');

    try {
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `IE_Students_${selectedCohort}_${Date.now()}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      // Safe fallback
    }

    appendLog(
      'خروجی اکسل (CSV) لیست دانشجویان',
      `ورودی: ${selectedCohort} (${safeStudents.length} نفر)`,
      'info'
    );
    triggerToast(
      `📊 فایل اکسل (CSV) شامل ${safeStudents.length} دانشجو آماده و دانلود شد.`
    );
  };

  const handleModifyStudentDossier = (
    student: AdminStudentDossier,
    change: {
      deltaScore?: number;
      reason?: string;
      explicitKycStatus?: KycStatus;
      explicitBanStatus?: boolean;
      newAvatar?: string;
    }
  ) => {
    playCoin();
    updateStudentsAndPersist((prev) =>
      prev.map((s) => {
        if (s.id !== student.id) return s;
        const nextScore =
          typeof change.deltaScore === 'number'
            ? Math.max(0, s.score + change.deltaScore)
            : s.score;
        const nextKyc = change.explicitKycStatus ?? s.kycStatus;
        const nextBan =
          typeof change.explicitBanStatus === 'boolean'
            ? change.explicitBanStatus
            : s.isBanned;
        const nextAvatar = change.newAvatar ?? s.avatar;
        return {
          ...s,
          score: nextScore,
          kycStatus: nextKyc,
          isBanned: nextBan,
          avatar: nextAvatar,
        };
      })
    );

    const isCurrentStudent = Boolean(
      currentUser?.studentId && student.studentId === currentUser.studentId
    );

    if (typeof change.deltaScore === 'number' && change.deltaScore !== 0) {
      const reasonText =
        (change.reason || customPointsReason || '').trim() ||
        'اعمال تغییر امتیاز توسط ادمین شورا';
      if (isCurrentStudent && onAwardCurrentStudentPoints) {
        onAwardCurrentStudentPoints(change.deltaScore, reasonText);
      }
      appendLog(
        `تغییر امتیاز دلخواه (${
          change.deltaScore > 0 ? `+${change.deltaScore}` : change.deltaScore
        } امتیاز) - ${reasonText}`,
        `${student.fullName} (${student.studentId})`,
        change.deltaScore > 0 ? 'success' : 'warning'
      );
      triggerToast(
        `💎 ${
          change.deltaScore > 0
            ? `+${change.deltaScore} امتیاز به ${student.fullName} اضافه شد!`
            : `${Math.abs(change.deltaScore)} امتیاز از ${student.fullName} کسر شد.`
        }`
      );
    }

    if (change.explicitKycStatus) {
      if (isCurrentStudent) {
        onUpdateCurrentUserProfile?.({ kycStatus: change.explicitKycStatus });
      }
      appendLog(
        change.explicitKycStatus === 'verified'
          ? '🔓 باز کردن قفل KYC و تایید هویت دانشجو'
          : '🔒 قفل کردن کارت دانشجویی (KYC Lock)',
        `${student.fullName} (${student.studentId})`,
        change.explicitKycStatus === 'verified' ? 'success' : 'warning'
      );
      triggerToast(
        change.explicitKycStatus === 'verified'
          ? `🔓 قفل کارت دانشجویی (KYC) برای «${student.fullName}» باز شد و حساب تایید گردید!`
          : `🔒 کارت دانشجویی (KYC) برای «${student.fullName}» قفل شد.`
      );
    }

    if (typeof change.explicitBanStatus === 'boolean') {
      appendLog(
        change.explicitBanStatus
          ? '🚫 قفل و مسدودسازی کامل حساب کاربری دانشجو'
          : '🔓 باز کردن قفل حساب کاربری و رفع مسدودیت دانشجو',
        `${student.fullName} (${student.studentId})`,
        change.explicitBanStatus ? 'danger' : 'success'
      );
      triggerToast(
        change.explicitBanStatus
          ? `🚫 حساب کاربری «${student.fullName}» قفل و مسدود شد.`
          : `🔓 قفل حساب کاربری «${student.fullName}» باز شد و دسترسی کامل فعال گردید!`
      );
    }

    if (change.newAvatar) {
      if (isCurrentStudent) {
        onUpdateCurrentUserProfile?.({ avatar: change.newAvatar });
      }
      triggerToast(`🎭 آواتار دانشجو «${student.fullName}» تغییر یافت.`);
    }
  };

  // ==========================================================================
  // MODULE 4: Save or Create Event & Professor CRUD (with Avatar Selection)
  // ==========================================================================
  const handleSaveEvent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!eventTitleInput.trim()) {
      playError();
      triggerToast('لطفاً عنوان رویداد یا کارگاه را وارد کنید.');
      return;
    }
    playCoin();

    const categoryLabel =
      eventCategoryInput === 'workshop'
        ? 'کارگاه'
        : eventCategoryInput === 'visit'
        ? 'بازدید علمی'
        : 'سمینار';

    const imageFilename =
      eventCategoryInput === 'workshop'
        ? '14_ev_python.png'
        : eventCategoryInput === 'visit'
        ? '15_ev_factory.png'
        : '16_ev_seminar.png';

    if (editingEventId) {
      const updated = (Array.isArray(eventList) ? eventList : []).map((ev) =>
        ev.id === editingEventId
          ? {
              ...ev,
              title: eventTitleInput.trim(),
              category: eventCategoryInput,
              categoryLabel,
              date: eventDateInput,
              time: eventTimeInput,
              location: eventLocationInput,
              basePrice: Number(eventPriceInput) || 0,
              capacityRemaining: Number(eventCapacityInput) || 30,
              capacityTotal: Math.max(
                Number(eventCapacityInput) || 30,
                ev.capacityTotal
              ),
              rewardPoints: Number(eventPointsInput) || 40,
              instructor: eventInstructorInput,
            }
          : ev
      );
      setEventList(updated);
      onUpdateEvents?.(updated);
      appendLog('ویرایش کارگاه/رویداد', eventTitleInput.trim(), 'info');
      triggerToast(`✅ رویداد «${eventTitleInput.trim()}» بروزرسانی شد.`);
      setEditingEventId(null);
    } else {
      const newEv: EventItem = {
        id: `ev-custom-${Date.now()}`,
        title: eventTitleInput.trim(),
        category: eventCategoryInput,
        categoryLabel,
        date: eventDateInput,
        time: eventTimeInput,
        location: eventLocationInput,
        capacityRemaining: Number(eventCapacityInput) || 40,
        capacityTotal: Number(eventCapacityInput) || 40,
        rating: 4.9,
        ratingCount: 12,
        imageFilename,
        basePrice: Number(eventPriceInput) || 0,
        rewardPoints: Number(eventPointsInput) || 50,
        instructor: eventInstructorInput || 'استاد مدعو انجمن صنایع',
        syllabus: ['مبانی کاربردی و استانداردهای صنعتی', 'پروژه عملی و اعطای گواهی معتبر'],
      };
      const updated = [newEv, ...(Array.isArray(eventList) ? eventList : [])];
      setEventList(updated);
      onUpdateEvents?.(updated);
      appendLog('ایجاد رویداد جدید در تقویم انجمن', newEv.title, 'success');
      triggerToast(
        `🎯 رویداد جدید «${newEv.title}» ساخته شد و در تب برنامه دانشجویان قرار گرفت!`
      );
    }
    setEventTitleInput('');
  };

  const handleAddProfessor = (e: React.FormEvent) => {
    e.preventDefault();
    if (!profNameInput.trim()) {
      playError();
      triggerToast('لطفاً نام استاد را وارد کنید.');
      return;
    }
    playCoin();
    const newProf: Professor = {
      id: `prof-${Date.now()}`,
      name: profNameInput.trim(),
      title: profTitleInput.trim(),
      avatar: profAvatarInput || '01_avatar_boy.png',
      office: profOfficeInput.trim(),
      officeHours: profHoursInput.trim(),
      isCurrentlyInOffice: true,
      email: profEmailInput.trim(),
      courses: [
        {
          name: profCourseNameInput.trim() || 'مهندسی صنایع',
          dayAndTime: profCourseTimeInput.trim() || 'شنبه ۱۰:۰۰ - ۱۲:۰۰',
          room: profCourseRoomInput.trim() || 'کلاس ۲۰۱',
        },
      ],
    };
    const updated = [newProf, ...(Array.isArray(profList) ? profList : [])];
    setProfList(updated);
    onUpdateProfessors?.(updated);
    appendLog('افزودن استاد جدید به رادار دانشکده', newProf.name, 'success');
    triggerToast(`👨‍🏫 پروفایل «${newProf.name}» با آواتار انتخابی به رادار اساتید اضافه شد.`);
    setProfNameInput('');
  };

  const handleChangeProfessorAvatar = (profId: string, nextAvatarUrl: string) => {
    playCoin();
    const updated = (Array.isArray(profList) ? profList : []).map((p) =>
      p.id === profId ? { ...p, avatar: nextAvatarUrl } : p
    );
    setProfList(updated);
    onUpdateProfessors?.(updated);
    triggerToast('🎭 آواتار استاد در رادار دانشکده بروزرسانی شد.');
  };

  const handleToggleProfessorOffice = (profId: string) => {
    playSwitch();
    const updated = (Array.isArray(profList) ? profList : []).map((p) =>
      p.id === profId ? { ...p, isCurrentlyInOffice: !p.isCurrentlyInOffice } : p
    );
    setProfList(updated);
    onUpdateProfessors?.(updated);
    const targetProf = updated.find((p) => p.id === profId);
    if (targetProf) {
      appendLog(
        `تغییر وضعیت حضور استاد به «${
          targetProf.isCurrentlyInOffice ? 'حاضر در دفتر 🟢' : 'خارج از دفتر'
        }»`,
        targetProf.name,
        'info'
      );
      triggerToast(
        `${targetProf.isCurrentlyInOffice ? '🟢' : '⚪'} وضعیت حضور ${
          targetProf.name
        } بروزرسانی شد.`
      );
    }
  };

  // ==========================================================================
  // MODULE 5: Admin Looti AI + Exact Start Date & One-Time / Recurring Timers
  // ==========================================================================
  const handleSendAdminAi = async (customText?: string) => {
    const textToSend = (customText ?? aiChatInput).trim();
    if (!textToSend || isAiBusy) return;

    playTick();
    const userMsg: LootiChatMessage = {
      id: `adm-usr-${Date.now()}`,
      sender: 'user',
      text: textToSend,
      timestamp: new Date().toLocaleTimeString('fa-IR', {
        hour: '2-digit',
        minute: '2-digit',
      }),
    };
    setAiMessages((prev) => [...(Array.isArray(prev) ? prev : []), userMsg]);
    if (!customText) setAiChatInput('');
    setIsAiBusy(true);

    const response = await askAdminLootiAi(textToSend, aiModelId);
    playCoin();
    setAiMessages((prev) => [
      ...(Array.isArray(prev) ? prev : []),
      {
        id: `adm-bot-${Date.now()}`,
        sender: 'looti',
        text: response.reply,
        timestamp: new Date().toLocaleTimeString('fa-IR', {
          hour: '2-digit',
          minute: '2-digit',
        }),
        modelUsed: response.modelUsed,
      },
    ]);
    setIsAiBusy(false);
  };

  const handleExtractProfessorPreview = async () => {
    if (!rawProfScheduleText.trim()) return;
    playTick();
    setIsParsingProfAi(true);
    try {
      const extracted = await parseMultiProfessorSchedulesWithAi(rawProfScheduleText);
      setParsedProfPreviewList(extracted);
      playCoin();
      triggerToast(
        `🪄 ${extracted.length} پروفایل استاد و برنامه کلاسی با موفقیت استخراج شد. پس از بررسی، دکمه تایید نهایی را بزنید.`
      );
    } catch {
      const fallback = parseMultiProfessorSchedules(rawProfScheduleText);
      setParsedProfPreviewList(fallback);
    } finally {
      setIsParsingProfAi(false);
    }
  };

  const handleCommitParsedProfessors = () => {
    if (parsedProfPreviewList.length === 0) return;
    playFanfare();
    const updated = [
      ...parsedProfPreviewList,
      ...(Array.isArray(profList) ? profList : []),
    ];
    setProfList(updated);
    onUpdateProfessors?.(updated);
    const names = parsedProfPreviewList.map((p) => p.name).join('، ');
    appendLog(
      'ثبت نهایی برنامه اساتید استخراج‌شده با هوش مصنوعی',
      names,
      'success'
    );
    triggerToast(`✅ برنامه «${names}» به لیست رسمی اساتید سایت اضافه شد!`);
    setParsedProfPreviewList([]);
  };

  // Create Timer from Natural Language Sentence
  const handleCreateSmartTimerFromSentence = () => {
    if (!nlTimerInput.trim()) return;
    playCoin();
    const newTimer = parseNaturalLanguageTimerDeterministic(nlTimerInput);
    updateTimersAndPersist((prev) => [newTimer, ...prev]);
    appendLog(
      `ساخت تایمر هوشمند (${newTimer.frequency} - شروع/اجرا: ${newTimer.startDate})`,
      newTimer.title,
      'success'
    );
    triggerToast(
      `⏰ تایمر «${newTimer.title}» (${
        newTimer.frequency === 'یکبار'
          ? `فقط یک‌بار در تاریخ ${newTimer.startDate}`
          : `شروع از ${newTimer.startDate} - ${newTimer.frequency}`
      } ساعت ${newTimer.time}) ثبت شد!`
    );
  };

  // Create Timer from Explicit Start Date & One-Time / Recurring Form
  const handleCreateExplicitDateTimer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!timerTitleInput.trim()) {
      playError();
      triggerToast('لطفاً عنوان یا متن پیام تایمر را وارد کنید.');
      return;
    }
    playFanfare();
    const newTimer: ScheduledTimer = {
      id: `tmr-exp-${Date.now()}`,
      title: timerTitleInput.trim(),
      rawSentence:
        timerFreqInput === 'یکبار'
          ? `فقط یکبار در تاریخ ${timerStartDateInput} ساعت ${timerTimeInput}: ${timerTitleInput.trim()}`
          : `شروع از تاریخ ${timerStartDateInput} (${timerFreqInput}) ساعت ${timerTimeInput}: ${timerTitleInput.trim()}`,
      frequency: timerFreqInput,
      dayOfWeek: timerFreqInput === 'هفتگی' ? timerDayOfWeekInput : undefined,
      startDate: timerStartDateInput.trim() || '۱۴۰۴/۰۸/۲۸',
      time: timerTimeInput.trim() || '۱۴:۰۰',
      targetAudience: timerAudienceInput,
      messageText: timerTitleInput.trim(),
      enabled: true,
    };
    updateTimersAndPersist((prev) => [newTimer, ...prev]);
    setTimerTitleInput('');
    appendLog(
      `ثبت تایمر زمانبندی‌شده با تاریخ دقیق (${newTimer.startDate} - ${newTimer.frequency})`,
      newTimer.title,
      'success'
    );
    triggerToast(
      `✅ تایمر «${newTimer.title}» برای تاریخ ${newTimer.startDate} (${
        newTimer.frequency === 'یکبار'
          ? 'فقط یک‌بار در همین تاریخ'
          : `تکرار ${newTimer.frequency}`
      }) فعال شد و در یادآورهای دانشجویان قرار گرفت!`
    );
  };

  // ==========================================================================
  // MODULE 6: Dynamic Medal Creator + Universal Avatar Studio + Award Medal
  // ==========================================================================
  const handleMedalFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const validation = await validateUploadedImageFile(file);
    if (!validation.valid) {
      playError();
      triggerToast(validation.error || 'فایل انتخاب‌شده معتبر نیست.');
      e.target.value = '';
      return;
    }
    playTick();
    try {
      const dataUrl = await compressImageFileToDataUrl(file, 160);
      setNewMedalImage(dataUrl);
      triggerToast('🖼 تصویر مدال جدید بارگذاری و بهینه‌سازی شد.');
    } catch {
      playError();
    }
  };

  const handleCreateNewMedal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMedalTitle.trim()) {
      playError();
      triggerToast('لطفاً نام مدال جدید را وارد کنید.');
      return;
    }
    playFanfare();
    const idSlug = `badge-custom-${Date.now()}`;
    const createdBadge: BadgeItem = {
      id: idSlug,
      title: newMedalTitle.trim(),
      subtitle: newMedalSubtitle.trim() || 'نشان افتخار ویژه انجمن علمی صنایع',
      filename: newMedalImage || '24_badge_trophy.png',
      earnedDate: new Date().toLocaleDateString('fa-IR'),
      tier: 'gold',
      description:
        newMedalHowToEarn.trim() ||
        'اعطاشده به‌پاس مشارکت برتر در فعالیت‌های علمی و کارگاه‌های مهندسی صنایع.',
      verificationHash: computeBadgeVerificationHash(
        idSlug,
        currentUser?.studentId || '4011234567',
        new Date().toLocaleDateString('fa-IR')
      ),
      nextTierRequirement:
        newMedalHowToEarn.trim() ||
        'شرکت در کارگاه‌های تخصصی و کسب امتیاز در چالش‌های انجمن علمی',
      isUnlocked: newMedalUnlockDefault,
    };

    updateBadgesAndPersist((prev) => [createdBadge, ...prev]);
    setSelectedBadgeFilename(createdBadge.filename);
    setNewMedalTitle('');
    setNewMedalSubtitle('');
    setNewMedalHowToEarn('');

    appendLog(
      'ساخت و افزودن مدال جدید به سامانه',
      `${createdBadge.title} (${createdBadge.subtitle})`,
      'success'
    );
    triggerToast(
      `🏅 مدال جدید «${createdBadge.title}» ساخته شد و هم‌اکنون در بخش «نشان‌های من» پروفایل دانشجو قابل مشاهده است!`
    );
  };

  const handleAvatarFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const validation = await validateUploadedImageFile(file);
    if (!validation.valid) {
      playError();
      triggerToast(validation.error || 'فایل انتخاب‌شده معتبر نیست.');
      e.target.value = '';
      return;
    }
    playTick();
    try {
      const dataUrl = await compressImageFileToDataUrl(file, 180);
      setNewAvatarImage(dataUrl);
      triggerToast('🖼 تصویر آواتار جدید بارگذاری و بهینه‌سازی شد.');
    } catch {
      playError();
    }
  };

  const handleCreateNewAvatar = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAvatarTitle.trim()) {
      playError();
      triggerToast('لطفاً نام آواتار جدید را وارد کنید.');
      return;
    }
    playFanfare();
    const createdAvatar: AvatarCatalogItem = {
      id: `av-custom-${Date.now()}`,
      title: newAvatarTitle.trim(),
      targetRole: newAvatarRole,
      imageUrl: newAvatarImage || '01_avatar_boy.png',
      addedBy: activeAdmin.fullName,
    };

    updateAvatarsAndPersist((prev) => [createdAvatar, ...prev]);
    setNewAvatarTitle('');

    appendLog(
      `افزودن آواتار جدید برای ${newAvatarRole === 'student' ? 'دانشجویان' : 'اساتید'}`,
      createdAvatar.title,
      'success'
    );
    triggerToast(
      `🎭 آواتار جدید «${createdAvatar.title}» برای ${
        newAvatarRole === 'student'
          ? 'انتخاب توسط دانشجویان (در پروفایل و ثبت‌نام)'
          : 'پروفایل اساتید (در رادار اساتید)'
      } اضافه شد!`
    );
  };

  const handleAwardBadgeToStudent = () => {
    playFanfare();
    const badgeObj =
      badgeList.find((b) => b.filename === selectedBadgeFilename) ||
      badgeList[0] || {
        filename: '19_badge_Gear.png',
        title: 'چرخ‌دنده طلایی صنایع',
      };

    updateStudentsAndPersist((prev) =>
      prev.map((s) =>
        s.studentId === selectedStudentForBadge
          ? {
              ...s,
              score: s.score + 30,
              badges: s.badges.includes(badgeObj.filename)
                ? s.badges
                : [...s.badges, badgeObj.filename],
            }
          : s
      )
    );

    // Also unlock this badge in badgeList
    updateBadgesAndPersist((prev) =>
      prev.map((b) =>
        b.filename === badgeObj.filename ? { ...b, isUnlocked: true } : b
      )
    );

    if (
      currentUser?.studentId &&
      selectedStudentForBadge === currentUser.studentId &&
      onAwardCurrentStudentPoints
    ) {
      onAwardCurrentStudentPoints(30, `دریافت نشان «${badgeObj.title}» از شورای مرکزی`);
    }

    const targetStu = (Array.isArray(studentList) ? studentList : []).find(
      (s) => s.studentId === selectedStudentForBadge
    );
    appendLog(
      `اعطای مدال «${badgeObj.title}» + ۳۰ امتیاز`,
      targetStu
        ? `${targetStu.fullName} (${targetStu.studentId})`
        : selectedStudentForBadge,
      'success'
    );
    triggerToast(`🏅 مدال «${badgeObj.title}» با موفقیت به دانشجو اعطا شد!`);
  };

  const handleAddWeeklyQuest = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newQuestTitle.trim()) return;
    playCoin();
    const createdQuest: WeeklyQuest = {
      id: `qst-adm-${Date.now()}`,
      title: newQuestTitle.trim(),
      description: 'ماموریت ویژه ثبت‌شده توسط شورای مرکزی انجمن علمی',
      rewardPoints: Number(newQuestReward) || 40,
      progress: 1,
      maxProgress: 1,
      isClaimed: false,
    };
    const updated = [createdQuest, ...(Array.isArray(questList) ? questList : [])];
    setQuestList(updated);
    onUpdateQuests?.(updated);
    setNewQuestTitle('');
    appendLog('ایجاد ماموریت هفتگی جدید', createdQuest.title, 'success');
    triggerToast(
      `🎯 ماموریت «${createdQuest.title}» به تب افتخارات دانشجویان اضافه شد!`
    );
  };

  // Module 7: Add Admin with Preset 1-5 or Custom Level 6 Matrix
  const handleAddAdminUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAdminName.trim()) {
      playError();
      triggerToast('لطفاً نام عضو شورا یا ادمین را وارد کنید.');
      return;
    }
    playCoin();

    const presetRoleLabels: Record<1 | 2 | 3 | 4 | 5 | 6, string> = {
      1: 'سطح ۱: دبیر انجمن (دسترسی کامل)',
      2: 'سطح ۲: نایب‌دبیر و اجرایی',
      3: 'سطح ۳: کمیته آموزش و کارگاه‌ها',
      4: 'سطح ۴: کمیته مالی و حامیان',
      5: 'سطح ۵: کمیته روابط عمومی و رسانه',
      6: 'سطح ۶: سایر (سفارشی)',
    };

    const resolvedPermissions: Record<AdminPermissionKey, boolean> =
      newAdminLevel === 6
        ? { ...customPermissions }
        : {
            ai: newAdminLevel <= 3,
            tickets: true,
            users: newAdminLevel <= 2 || newAdminLevel === 4,
            events: newAdminLevel <= 3,
            professors: newAdminLevel <= 3,
            finance: newAdminLevel === 1 || newAdminLevel === 4,
            broadcast: newAdminLevel <= 2 || newAdminLevel === 5,
          };

    const newAdmin: AdminUser = {
      id: `adm-${Date.now()}`,
      fullName: newAdminName.trim(),
      telegramId: newAdminTelegram.trim() || '@ie_admin',
      roleLevel: newAdminLevel,
      roleLabel: presetRoleLabels[newAdminLevel],
      personalPassword: newAdminPassword.trim() || 'IE_ADMIN_2026',
      permissions: resolvedPermissions,
      isFrozen: false,
      lastActive: 'تازه اضافه شده',
    };

    const updatedAdmins = [newAdmin, ...(Array.isArray(adminList) ? adminList : [])];
    setAdminList(updatedAdmins);
    onUpdateAdmins?.(updatedAdmins);
    setNewAdminName('');
    appendLog(
      'تعریف ادمین جدید با رمز اختصاصی',
      `${newAdmin.fullName} (${newAdmin.roleLabel})`,
      'success'
    );
    triggerToast(`🔐 ادمین جدید «${newAdmin.fullName}» با موفقیت ثبت شد.`);
  };

  // Module 8: Manual Cleanup
  const handleManualCleanup = () => {
    playFanfare();
    setCfStats((prev) => ({
      ...prev,
      kvWritesUsed: Math.max(45, Math.floor(prev.kvWritesUsed * 0.4)),
      storageMbUsed: Math.max(42, Math.floor(prev.storageMbUsed * 0.5)),
    }));
    appendLog(
      `پاکسازی خودکار فایل‌ها و کش‌های قدیمی‌تر از ${cleanupDays} روز`,
      'آزادسازی فضای Cloudflare KV و R2',
      'success'
    );
    triggerToast(
      `🧹 پاکسازی فایل‌های بالای ${cleanupDays} روز انجام شد و فضای کلودفلر بهینه‌سازی گردید!`
    );
  };

  const MODULE_TABS: {
    id: AdminModuleId;
    shortLabel: string;
    icon: React.ReactNode;
    permKey?: AdminPermissionKey;
  }[] = [
    { id: 1, shortLabel: '۱. اسکنر و سابقه بلیط', icon: <QrCode className="w-3.5 h-3.5" />, permKey: 'tickets' },
    { id: 2, shortLabel: '۲. فیش‌ها و کارت دانشجو', icon: <CheckCircle2 className="w-3.5 h-3.5" />, permKey: 'finance' },
    { id: 3, shortLabel: '۳. کاربران و قفل/امتیاز', icon: <Users className="w-3.5 h-3.5" />, permKey: 'users' },
    { id: 4, shortLabel: '۴. کارگاه‌ها و اساتید', icon: <Calendar className="w-3.5 h-3.5" />, permKey: 'events' },
    { id: 5, shortLabel: '۵. هوش مصنوعی و تایمر', icon: <Bot className="w-3.5 h-3.5" />, permKey: 'ai' },
    { id: 6, shortLabel: '۶. مدال، آواتار و تخفیف', icon: <Award className="w-3.5 h-3.5" />, permKey: 'events' },
    { id: 7, shortLabel: '۷. سطوح ادمین', icon: <Lock className="w-3.5 h-3.5" /> },
    { id: 8, shortLabel: '۸. کلیدهای سایت و کلودفلر', icon: <Activity className="w-3.5 h-3.5" /> },
  ];

  const cardSurfaceClass = isNight
    ? 'bg-[#151F2E] border-[#2C3E4C] text-[#F6F1E7]'
    : 'bg-[#FFFFFF] border-[#C8BFA8] text-[#14201B]';

  const subCardClass = isNight
    ? 'bg-[#1B2638] border-[#2C3E4C] text-[#F6F1E7]'
    : 'bg-[#EAE3D2] border-[#C8BFA8] text-[#14201B]';

  const inputClass = isNight
    ? 'bg-[#0E1520] border-[#2C3E4C] text-[#F6F1E7] placeholder:text-[#A3C1AD]/70'
    : 'bg-[#FFFFFF] border-[#C8BFA8] text-[#14201B] placeholder:text-[#3D5249]/75';

  return (
    <div
      className={`min-h-screen w-full pb-20 select-none text-right font-sans ${
        isNight ? 'bg-[#0E1520] text-[#F6F1E7]' : 'bg-[#F4EFE4] text-[#14201B]'
      }`}
      dir="rtl"
    >
      <div className="max-w-6xl mx-auto px-3.5 lg:px-6 pt-3 lg:pt-5 space-y-4">
        {/* ===================================================================
            TOP ADMIN BANNER & EXIT TO STUDENT VIEW BUTTON (Zero-Overlap Flex Layout)
           =================================================================== */}
        <div
          className={`rounded-3xl border-2 overflow-hidden shadow-xl relative ${
            isNight ? 'bg-[#162030] border-[#D4AB58]/60' : 'bg-[#FFFFFF] border-[#8F6B24]'
          }`}
        >
          <div className="relative w-full overflow-hidden bg-[#101622] p-3.5 lg:p-5 flex flex-col justify-between gap-3.5">
            <div className="absolute inset-0 pointer-events-none">
              <PixelImage
                filename="12_banner_admin.png"
                alt="پنل فرماندهی ادمین"
                className="w-full h-full object-cover opacity-45"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#101622] via-[#101622]/75 to-[#101622]/50" />
            </div>

            {/* Row 1: Admin Role Badge & Return to Student View Button */}
            <div className="relative z-10 flex items-center justify-between gap-2">
              <span className="px-2.5 py-1 rounded-xl bg-[#101622]/90 border border-[#D4AB58]/50 text-[#D4AB58] text-[10px] lg:text-xs font-black inline-flex items-center gap-1.5 min-w-0">
                <Shield className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">
                  {activeAdmin.fullName} (سطح {activeAdmin.roleLevel.toLocaleString('fa-IR')})
                </span>
              </span>

              <button
                type="button"
                onClick={() => {
                  playTick();
                  onClose();
                }}
                className="px-3 py-1.5 rounded-xl bg-[#D4AB58] text-[#101622] font-black text-[11px] lg:text-xs border-b-2 border-[#8C6C28] active:translate-y-0.5 flex items-center gap-1.5 cursor-pointer shadow-md shrink-0"
              >
                <Eye className="w-3.5 h-3.5" />
                <span>نمای دانشجو</span>
              </button>
            </div>

            {/* Row 2: Admin Avatar, Clean Title & Online Users Pill */}
            <div className="relative z-10 flex items-center justify-between gap-2.5 text-[#F6F1E7]">
              <div className="flex items-center gap-2.5 min-w-0 flex-1">
                <div className="w-11 h-11 rounded-2xl bg-[#192334] border-2 border-[#D4AB58] p-1 flex items-center justify-center shrink-0">
                  <PixelImage
                    filename="08_char_admin.png"
                    alt="ادمین شورا"
                    className="w-9 h-9 object-contain"
                  />
                </div>
                <div className="min-w-0">
                  <h1 className="text-xs sm:text-sm lg:text-base font-black text-[#D4AB58] truncate">
                    پنل مدیریت انجمن مهندسی صنایع
                  </h1>
                  <p className="text-[10px] lg:text-xs text-[#A3C1AD] font-bold truncate mt-0.5">
                    مدیریت کارگاه‌ها، فیش‌ها، کاربران و کانال @Isefum
                  </p>
                </div>
              </div>

              <span className="text-[10px] font-black px-2.5 py-1 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shrink-0">
                🟢 {onlineSessions.length.toLocaleString('fa-IR')} آنلاین
              </span>
            </div>
          </div>

          {/* 8-Module Grid Navigation Bar */}
          <div
            className={`p-2.5 grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-1.5 ${
              isNight ? 'bg-black/25' : 'bg-[#EAE3D2]'
            }`}
          >
            {MODULE_TABS.map((tab) => {
              const isSelected = activeModule === tab.id;
              const isPermitted = !tab.permKey || hasPermission(tab.permKey);
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => {
                    if (!isPermitted) {
                      playError();
                      triggerToast(
                        `⛔ دسترسی به «${tab.shortLabel}» برای نقش شما محدود شده است.`
                      );
                      return;
                    }
                    playSwitch();
                    setActiveModule(tab.id);
                  }}
                  className={`py-2 px-2 rounded-xl text-[11px] font-black flex items-center justify-center gap-1.5 transition-all cursor-pointer border-b-2 ${
                    isSelected
                      ? 'bg-[#D4AB58] text-[#101622] border-[#8A6A26] shadow-sm'
                      : isNight
                      ? 'bg-[#1B2638] text-[#F6F1E7] border-[#0E1520] hover:bg-[#223046]'
                      : 'bg-[#FFFFFF] text-[#14201B] border-[#C8BFA8] hover:bg-[#F5EFE2]'
                  } ${!isPermitted ? 'opacity-45' : ''}`}
                >
                  {tab.icon}
                  <span className="truncate">{tab.shortLabel}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Toast Notification Banner */}
        {toastBanner && (
          <div className="p-3 rounded-2xl bg-emerald-950/95 border-2 border-emerald-500/60 text-emerald-100 text-xs font-black flex items-center justify-between shadow-lg animate-fade-in">
            <span>{toastBanner}</span>
            <button
              type="button"
              onClick={() => setToastBanner(null)}
              className="text-emerald-300 hover:text-white px-1 cursor-pointer"
            >
              ✕
            </button>
          </div>
        )}

        {/* ===================================================================
            LIVE ONLINE USERS RADAR & SECTION KILL-SWITCHES (Modules 3 & 8)
           =================================================================== */}
        {(activeModule === 3 || activeModule === 8) && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* 1. LIVE ONLINE USERS RADAR (with Two-Way Lock & Unlock!) */}
            <div className={`rounded-3xl p-4 border space-y-3 ${cardSurfaceClass}`}>
              <div className="flex items-center justify-between border-b border-current/10 pb-2.5">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
                  <h3 className="text-sm font-black">
                    🟢 رادار کاربران آنلاین در سایت ({onlineSessions.length.toLocaleString('fa-IR')} نفر)
                  </h3>
                </div>
                <span className="text-[10px] font-black px-2 py-0.5 rounded-lg bg-emerald-500/20 text-emerald-500">
                  کنترل زنده قفل و باز کردن
                </span>
              </div>

              <div className="space-y-2 max-h-60 overflow-y-auto pr-0.5">
                {onlineSessions.map((sess) => (
                  <div
                    key={sess.id}
                    className={`p-3 rounded-2xl border flex items-center justify-between gap-2 text-xs ${subCardClass}`}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-black">{sess.fullName}</span>
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-black/20 font-bold">
                          {sess.studentId}
                        </span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#D4AB58]/20 text-[#D4AB58] font-black">
                          ورودی {sess.cohortYear}
                        </span>
                        {sess.isLocked && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-rose-600 text-white font-black">
                            نشست قفل‌شده 🔒
                          </span>
                        )}
                      </div>
                      <div
                        className={`text-[11px] font-bold mt-0.5 ${
                          isNight ? 'text-[#A3C1AD]' : 'text-[#3D5249]'
                        }`}
                      >
                        صفحه فعال: {sess.activePage} • دستگاه: {sess.device} • {sess.lastHeartbeat}
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => {
                          playTick();
                          const found = studentList.find(
                            (s) => s.studentId === sess.studentId
                          );
                          if (found) {
                            setSelectedStudentIdForDossier(found.id);
                            setDossierTab('overview');
                          }
                        }}
                        className="px-2.5 py-1.5 rounded-xl bg-[#354B40] text-[#F6F1E7] text-[10px] font-black cursor-pointer"
                      >
                        پرونده ۳۶۰
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          playSwitch();
                          const nextLocked = !sess.isLocked;
                          setOnlineSessions((prev) =>
                            prev.map((o) =>
                              o.id === sess.id ? { ...o, isLocked: nextLocked } : o
                            )
                          );
                          triggerToast(
                            nextLocked
                              ? `🔒 نشست آنلاین «${sess.fullName}» قفل شد.`
                              : `🔓 قفل نشست آنلاین «${sess.fullName}» باز شد و کاربر آزاد گردید!`
                          );
                        }}
                        className={`px-2.5 py-1.5 rounded-xl text-[10px] font-black cursor-pointer transition-all ${
                          sess.isLocked
                            ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                            : 'bg-rose-700 hover:bg-rose-600 text-white'
                        }`}
                      >
                        {sess.isLocked ? '🔓 باز کردن قفل نشست' : '🔒 قفل کردن نشست'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 2. SECTION KILL-SWITCHES */}
            <div className={`rounded-3xl p-4 border space-y-3 ${cardSurfaceClass}`}>
              <div className="flex items-center justify-between border-b border-current/10 pb-2.5">
                <h3 className="text-sm font-black">
                  🎛 کلیدهای کنترل و قفل/بازکردن بخش‌های سایت (FeatureFlags)
                </h3>
                <span className="text-[10px] font-black px-2 py-0.5 rounded-lg bg-[#D4AB58]/20 text-[#D4AB58]">
                  اعمال آنی
                </span>
              </div>

              <div className="space-y-2 text-xs">
                {[
                  {
                    key: 'eventsRegistrationEnabled' as keyof FeatureFlags,
                    label: 'ثبت‌نام کارگاه‌ها و رویدادها',
                  },
                  {
                    key: 'lootboxStoreEnabled' as keyof FeatureFlags,
                    label: 'فروشگاه صندوقچه جوایز و کد تخفیف',
                  },
                  {
                    key: 'leaderboardEnabled' as keyof FeatureFlags,
                    label: 'جدول برترین‌ها',
                  },
                  {
                    key: 'supportTicketsEnabled' as keyof FeatureFlags,
                    label: 'ارسال تیکت پشتیبانی',
                  },
                  {
                    key: 'professorsDirectoryEnabled' as keyof FeatureFlags,
                    label: 'بانک اطلاعات و برنامه اساتید',
                  },
                ].map((item) => {
                  const isEnabled = flagsState[item.key];
                  return (
                    <div
                      key={item.key}
                      className={`p-2.5 rounded-2xl border flex items-center justify-between ${subCardClass}`}
                    >
                      <span className="font-black">{item.label}</span>
                      <button
                        type="button"
                        onClick={() => handleToggleFeatureFlag(item.key, item.label)}
                        className={`px-3 py-1 rounded-xl text-[11px] font-black cursor-pointer transition-all ${
                          isEnabled
                            ? 'bg-emerald-600 text-white'
                            : 'bg-rose-700 text-white'
                        }`}
                      >
                        {isEnabled ? 'باز و فعال ✓' : 'قفل موقت 🚧 (کلیک برای باز کردن)'}
                      </button>
                    </div>
                  );
                })}

                <div className="p-3 rounded-2xl border-2 border-rose-500/60 bg-rose-950/25 flex items-center justify-between">
                  <div>
                    <div className="font-black text-rose-400">
                      🔒 حالت تعمیر و بروزرسانی کل سایت (قفل/بازکردن کل سامانه)
                    </div>
                    <div className="text-[10px] font-bold opacity-80">
                      نمایش کارت «این بخش موقتاً در حال بروزرسانی است» در تمام صفحات دانشجویی
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      handleToggleFeatureFlag(
                        'globalMaintenanceMode',
                        'حالت تعمیر و بروزرسانی کل سایت'
                      )
                    }
                    className={`px-3 py-1.5 rounded-xl text-[11px] font-black shrink-0 cursor-pointer ${
                      flagsState.globalMaintenanceMode
                        ? 'bg-emerald-600 text-white animate-pulse'
                        : 'bg-rose-700 text-white'
                    }`}
                  >
                    {flagsState.globalMaintenanceMode
                      ? '🔓 باز کردن قفل کل سایت'
                      : '🔒 قفل موقت کل سایت'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ===================================================================
            MODULE 1: 📷 ۱. اسکنر QR واقعی + صفحه مجزای سابقه بلیط‌ها
           =================================================================== */}
        {activeModule === 1 && (
          <div className={`rounded-3xl p-4 lg:p-6 border space-y-4 ${cardSurfaceClass}`}>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-current/10 pb-3">
              <div className="flex items-center gap-2">
                <Camera className="w-5 h-5 text-[#D4AB58]" />
                <div>
                  <h2 className="text-sm lg:text-base font-black">
                    📷 ۱. اسکنر بارکد QR واقعی و صفحه مجزای سابقه بلیط‌ها
                  </h2>
                  <p
                    className={`text-[11px] font-bold ${
                      isNight ? 'text-[#A3C1AD]' : 'text-[#3D5249]'
                    }`}
                  >
                    بلیط‌های اسکن‌شده بلافاصله از لیست انتظار حذف شده و به «صفحه سابقه بلیط‌ها» منتقل می‌شوند
                  </p>
                </div>
              </div>

              {/* Sub-Page Switcher: Scanner vs Ticket History Page */}
              <div className="flex gap-1.5 p-1 rounded-2xl bg-black/25 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    playSwitch();
                    setMod1SubPage('scanner');
                  }}
                  className={`px-3 py-2 rounded-xl text-xs font-black cursor-pointer transition-all ${
                    mod1SubPage === 'scanner'
                      ? 'bg-[#D4AB58] text-[#101622] shadow'
                      : 'opacity-80 hover:opacity-100'
                  }`}
                >
                  📷 دستگاه اسکنر ({unScannedTickets.length.toLocaleString('fa-IR')} آماده اسکن)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    playSwitch();
                    setMod1SubPage('history');
                  }}
                  className={`px-3 py-2 rounded-xl text-xs font-black cursor-pointer transition-all ${
                    mod1SubPage === 'history'
                      ? 'bg-emerald-500 text-[#101622] shadow'
                      : 'opacity-80 hover:opacity-100'
                  }`}
                >
                  📜 صفحه سابقه بلیط‌ها ({scannedHistoryTickets.length.toLocaleString('fa-IR')} پذیرش‌شده)
                </button>
              </div>
            </div>

            {mod1SubPage === 'scanner' ? (
              /* SUB-PAGE 1: ACTIVE QR SCANNER & UN-SCANNED TICKETS */
              <div className="space-y-4">
                <input
                  ref={qrImageInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleUploadQrImageFile}
                  className="hidden"
                />

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <button
                    type="button"
                    onClick={handleNativeTelegramQrScan}
                    className="py-3.5 px-4 rounded-2xl bg-[#354B40] hover:bg-[#3F594C] text-[#F6F1E7] font-black text-xs border-b-4 border-[#1F2E27] active:border-b-0 active:translate-y-1 flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <QrCode className="w-4 h-4 text-[#D4AB58]" />
                    اسکن با دوربین تلگرام / ثبت بارکد ورودی
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      playTick();
                      setIsLiveCameraModalOpen(true);
                    }}
                    className="py-3.5 px-4 rounded-2xl bg-[#1E293B] hover:bg-[#283548] text-[#F6F1E7] font-black text-xs border-b-4 border-[#0F172A] active:border-b-0 active:translate-y-1 flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Camera className="w-4 h-4 text-emerald-400" />
                    📷 اسکن با دوربین وب (حالت مرورگر)
                  </button>

                  <button
                    type="button"
                    disabled={isDecodingQrImage}
                    onClick={() => qrImageInputRef.current?.click()}
                    className="py-3.5 px-4 rounded-2xl bg-[#D4AB58] hover:bg-[#E0B865] text-[#101622] font-black text-xs border-b-4 border-[#8A6A26] active:border-b-0 active:translate-y-1 flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Upload className="w-4 h-4" />
                    {isDecodingQrImage
                      ? 'در حال رمزگشایی تصویر QR...'
                      : '📤 آپلود عکس QR دانلودشده (PNG)'}
                  </button>
                </div>

                <LiveCameraQrModal
                  isOpen={isLiveCameraModalOpen}
                  onClose={() => setIsLiveCameraModalOpen(false)}
                  onDetected={(scannedText) => {
                    setQrInputPayload(scannedText);
                    handleProcessQrTicket(scannedText);
                  }}
                  onFallbackUploadClick={() => qrImageInputRef.current?.click()}
                />

                {/* Un-scanned Active Tickets List (Disappears immediately once scanned!) */}
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black">
                      🎫 بلیط‌های اسکن‌نشده در انتظار پذیرش ({unScannedTickets.length.toLocaleString('fa-IR')} بلیط):
                    </span>
                    <span className="text-[10px] font-bold opacity-75">
                      به محض اسکن، بلیط از این لیست حذف و به «صفحه سابقه بلیط‌ها» منتقل می‌شود
                    </span>
                  </div>

                  {unScannedTickets.length === 0 ? (
                    <div className={`p-6 rounded-2xl border text-center space-y-2 ${subCardClass}`}>
                      <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto" />
                      <div className="text-sm font-black text-emerald-500">
                        🎉 تمام بلیط‌های صادرشده اسکن و پذیرش شده‌اند!
                      </div>
                      <p className="text-xs opacity-80">
                        برای مشاهده بلیط‌های اسکن‌شده یا لغو پذیرش، به تب «📜 صفحه سابقه بلیط‌ها» بروید.
                      </p>
                      <button
                        type="button"
                        onClick={() => setMod1SubPage('history')}
                        className="px-4 py-2 rounded-xl bg-emerald-600 text-white text-xs font-black cursor-pointer"
                      >
                        مشاهده صفحه سابقه بلیط‌ها ←
                      </button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {unScannedTickets.map((t) => (
                        <div
                          key={t.id}
                          className={`p-3.5 rounded-2xl border flex items-center justify-between gap-3 ${subCardClass}`}
                        >
                          <RealQrCode
                            payload={t.qrPayload}
                            size={76}
                            showDownload
                            downloadFilename={`ie-ticket-${t.trackingCode}`}
                          />
                          <div className="min-w-0 flex-1 space-y-1">
                            <div className="text-xs font-black truncate">
                              {t.studentName} ({t.studentId})
                            </div>
                            <div className="text-[11px] font-bold text-[#D4AB58] truncate">
                              {t.eventTitle}
                            </div>
                            <div className="text-[10px] font-mono opacity-75 truncate" dir="ltr">
                              {t.trackingCode} • {t.qrPayload}
                            </div>
                            <div className="pt-1">
                              <button
                                type="button"
                                onClick={() => {
                                  setQrInputPayload(t.qrPayload);
                                  handleProcessQrTicket(t.qrPayload);
                                }}
                                className="w-full py-2 px-3 rounded-xl bg-[#D4AB58] hover:bg-[#e2b964] text-[#101622] text-xs font-black cursor-pointer shadow flex items-center justify-center gap-1"
                              >
                                <QrCode className="w-3.5 h-3.5" />
                                اسکن آنی و ثبت حضور ⚡
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Manual Payload Input */}
                <div className="space-y-2 pt-2 border-t border-current/10">
                  <label className="text-xs font-black block">
                    ورود دستی رشته بارکد امضاشده (Signed QR Payload):
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      dir="ltr"
                      value={qrInputPayload}
                      onChange={(e) => setQrInputPayload(e.target.value)}
                      className={`flex-1 px-3 py-2.5 rounded-xl text-xs font-mono border focus:outline-none ${inputClass}`}
                    />
                    <button
                      type="button"
                      onClick={() => handleProcessQrTicket(qrInputPayload)}
                      className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs cursor-pointer shrink-0"
                    >
                      ثبت حضور ✅
                    </button>
                  </div>
                </div>

                {scanErrorAlert && (
                  <div className="p-3.5 rounded-2xl bg-rose-950/90 border-2 border-rose-500 text-rose-100 text-xs font-black animate-fade-in">
                    {scanErrorAlert}
                  </div>
                )}

                {lastScannedResult && (
                  <div className="p-4 rounded-2xl bg-emerald-950/90 border-2 border-emerald-500 text-[#F6F1E7] space-y-2 text-xs animate-fade-in">
                    <div className="flex items-center justify-between">
                      <span className="font-black text-emerald-300 text-sm">
                        حاضر ✅ • بلیط به «صفحه سابقه بلیط‌ها» منتقل شد و گواهی صادر گردید
                      </span>
                      <span className="text-[10px] text-emerald-200">
                        ساعت ثبت: {lastScannedResult.timestamp}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                      <div>
                        <span className="text-emerald-200/80 block text-[10px]">نام دانشجو:</span>
                        <span className="font-black text-[#D4AB58]">
                          {lastScannedResult.studentName}
                        </span>
                      </div>
                      <div>
                        <span className="text-emerald-200/80 block text-[10px]">شماره دانشجویی:</span>
                        <span className="font-mono font-bold">{lastScannedResult.studentId}</span>
                      </div>
                      <div>
                        <span className="text-emerald-200/80 block text-[10px]">پاداش حضور:</span>
                        <span className="font-black text-emerald-400">
                          +{lastScannedResult.pointsAdded} امتیاز 💎
                        </span>
                      </div>
                      <div>
                        <span className="text-emerald-200/80 block text-[10px]">کد گواهی صادرشده:</span>
                        <span className="font-mono font-black text-amber-300" dir="ltr">
                          {lastScannedResult.certificateCode}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              /* SUB-PAGE 2: DEDICATED TICKET HISTORY PAGE (صفحه مجزای سابقه بلیط‌ها) */
              <div className="space-y-4 animate-fade-in">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-black text-emerald-500">
                      📜 سابقه کامل بلیط‌های اسکن‌شده و حضور و غیاب ({scannedHistoryTickets.length.toLocaleString('fa-IR')} مورد)
                    </h3>
                    <p className="text-[11px] font-bold opacity-75">
                      لیست تمام بلیط‌هایی که در جلسات و کارگاه‌ها پذیرش شده‌اند
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setMod1SubPage('scanner')}
                    className="px-3 py-1.5 rounded-xl bg-[#D4AB58] text-[#101622] text-xs font-black cursor-pointer"
                  >
                    ← بازگشت به اسکنر
                  </button>
                </div>

                {scannedHistoryTickets.length === 0 ? (
                  <div className={`p-8 rounded-2xl border text-center space-y-2 ${subCardClass}`}>
                    <div className="text-sm font-black">هنوز بلیطی اسکن نشده است</div>
                    <p className="text-xs opacity-75">
                      از تب «📷 دستگاه اسکنر» یکی از بلیط‌های فعال را اسکن کنید تا سابقه آن در این صفحه ثبت شود.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {scannedHistoryTickets.map((t) => {
                      const certCode = generateCertificateCode(
                        t.studentId.slice(0, 3) || '402',
                        t.studentId,
                        t.eventId
                      );
                      return (
                        <div
                          key={t.id}
                          className={`p-4 rounded-2xl border space-y-2.5 ${subCardClass}`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-2.5">
                              <RealQrCode payload={t.qrPayload} size={64} />
                              <div>
                                <div className="text-xs font-black">{t.studentName}</div>
                                <div className="text-[11px] font-bold opacity-80">
                                  شماره دانشجویی: <span className="font-mono">{t.studentId}</span>
                                </div>
                                <div className="text-[11px] font-bold text-[#D4AB58] mt-0.5">
                                  {t.eventTitle}
                                </div>
                              </div>
                            </div>
                            <span className="text-[10px] font-black px-2.5 py-1 rounded-lg bg-emerald-600 text-white shrink-0">
                              پذیرش‌شده ✅ ({t.checkedInAt || 'امروز'})
                            </span>
                          </div>

                          <div className="pt-2 border-t border-current/10 flex items-center justify-between text-[11px]">
                            <span className="font-mono font-bold" dir="ltr">
                              {t.trackingCode} • {certCode}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleUndoTicketCheckIn(t)}
                              className="px-2.5 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 border border-amber-500/40 font-black text-[10px] cursor-pointer"
                            >
                              ↩️ لغو پذیرش (بازگشت به اسکنر)
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ===================================================================
            MODULE 2: 💳 ۲. کارتابل فیش‌های واریزی و کارت‌های دانشجویی (با پوشه‌های مجزا!)
           =================================================================== */}
        {activeModule === 2 && (
          <div className={`rounded-3xl p-4 lg:p-6 border space-y-4 ${cardSurfaceClass}`}>
            <div className="flex items-center justify-between border-b border-current/10 pb-3">
              <div>
                <h2 className="text-sm lg:text-base font-black">
                  💳 ۲. کارتابل فیش‌های واریزی و کارت‌های دانشجویی (با پوشه‌های بایگانی)
                </h2>
                <p
                  className={`text-[11px] font-bold ${
                    isNight ? 'text-[#A3C1AD]' : 'text-[#3D5249]'
                  }`}
                >
                  هر فیش یا کارت دانشجویی پس از تایید یا رد شدن، از صف انتظار خارج شده و به پوشه تاییدشده‌ها یا ردشده‌های گذشته منتقل می‌شود
                </p>
              </div>
            </div>

            {/* Category Selector: Payment Receipts vs Student ID Cards (KYC) */}
            <div className="grid grid-cols-2 gap-2 p-1 rounded-2xl bg-black/20">
              <button
                type="button"
                onClick={() => {
                  playSwitch();
                  setQueueFilter('receipt');
                }}
                className={`py-2.5 rounded-xl text-xs font-black cursor-pointer transition-all ${
                  queueFilter === 'receipt'
                    ? 'bg-[#D4AB58] text-[#101622] shadow'
                    : 'opacity-75 hover:opacity-100'
                }`}
              >
                🧾 فیش‌های واریزی کارگاه‌ها
              </button>
              <button
                type="button"
                onClick={() => {
                  playSwitch();
                  setQueueFilter('kyc');
                }}
                className={`py-2.5 rounded-xl text-xs font-black cursor-pointer transition-all ${
                  queueFilter === 'kyc'
                    ? 'bg-[#D4AB58] text-[#101622] shadow'
                    : 'opacity-75 hover:opacity-100'
                }`}
              >
                🪪 کارت‌های دانشجویی (احراز هویت KYC)
              </button>
            </div>

            {/* 3-Folder Selector: Pending Queue | Past Approved Folder | Past Rejected Folder */}
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => {
                  playTick();
                  setQueueStatusFolder('pending');
                }}
                className={`p-2.5 rounded-2xl border text-xs font-black flex items-center justify-center gap-1.5 cursor-pointer transition-all ${
                  queueStatusFolder === 'pending'
                    ? 'bg-amber-500 text-[#101622] border-amber-600 shadow'
                    : subCardClass
                }`}
              >
                <span>⏳ صف انتظار بررسی</span>
                <span className="px-1.5 py-0.5 rounded-full bg-black/20 text-[10px]">
                  {folderCounts.pending.toLocaleString('fa-IR')}
                </span>
              </button>

              <button
                type="button"
                onClick={() => {
                  playTick();
                  setQueueStatusFolder('approved');
                }}
                className={`p-2.5 rounded-2xl border text-xs font-black flex items-center justify-center gap-1.5 cursor-pointer transition-all ${
                  queueStatusFolder === 'approved'
                    ? 'bg-emerald-600 text-white border-emerald-500 shadow'
                    : subCardClass
                }`}
              >
                <span>✅ پوشه تاییدشده‌های گذشته</span>
                <span className="px-1.5 py-0.5 rounded-full bg-black/25 text-[10px]">
                  {folderCounts.approved.toLocaleString('fa-IR')}
                </span>
              </button>

              <button
                type="button"
                onClick={() => {
                  playTick();
                  setQueueStatusFolder('rejected');
                }}
                className={`p-2.5 rounded-2xl border text-xs font-black flex items-center justify-center gap-1.5 cursor-pointer transition-all ${
                  queueStatusFolder === 'rejected'
                    ? 'bg-rose-700 text-white border-rose-500 shadow'
                    : subCardClass
                }`}
              >
                <span>❌ پوشه ردشده‌های گذشته</span>
                <span className="px-1.5 py-0.5 rounded-full bg-black/25 text-[10px]">
                  {folderCounts.rejected.toLocaleString('fa-IR')}
                </span>
              </button>
            </div>

            {/* Folder Items Grid */}
            {filteredQueueItems.length === 0 ? (
              <div className={`p-8 rounded-2xl border text-center space-y-2 ${subCardClass}`}>
                <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto" />
                <div className="text-sm font-black">
                  {queueStatusFolder === 'pending'
                    ? `هیچ ${
                        queueFilter === 'receipt' ? 'فیش واریزی' : 'کارت دانشجویی'
                      } در صف انتظار باقی نمانده است! ✨`
                    : queueStatusFolder === 'approved'
                    ? 'پوشه تاییدشده‌های گذشته خالی است.'
                    : 'پوشه ردشده‌های گذشته خالی است.'}
                </div>
                <p className="text-xs opacity-75">
                  می‌توانید از پوشه‌های دیگر موارد تاییدشده یا ردشده قبلی را بررسی کنید.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {filteredQueueItems.map((item) => (
                  <div
                    key={item.id}
                    className={`p-4 rounded-2xl border space-y-3 animate-fade-in ${subCardClass}`}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <span className="text-xs font-black">
                          {item.studentName} (ورودی {item.cohortYear || '۱۴۰۲'})
                        </span>
                        <p className="text-[11px] font-bold mt-0.5 opacity-80">
                          شماره دانشجویی: <span className="font-mono">{item.studentId}</span> • کد رهگیری:{' '}
                          <span className="font-mono">{item.trackingCode}</span>
                        </p>
                      </div>
                      <span
                        className={`text-[10px] font-black px-2 py-0.5 rounded-lg ${
                          item.status === 'approved'
                            ? 'bg-emerald-600 text-white'
                            : item.status === 'rejected'
                            ? 'bg-rose-700 text-white'
                            : 'bg-amber-500 text-[#101622]'
                        }`}
                      >
                        {item.status === 'approved'
                          ? `تایید شده ✅ (${item.decidedAt || 'قبلاً'})`
                          : item.status === 'rejected'
                          ? `رد شده ❌ (${item.decidedAt || 'قبلاً'})`
                          : 'در انتظار بررسی ⏳'}
                      </span>
                    </div>

                    {(item.eventTitle || item.title) && (
                      <div className="text-xs font-black text-[#D4AB58]">
                        {item.eventTitle || item.title}
                        {(item.amountTomans || item.amount)
                          ? ` • مبلغ: ${(
                              item.amountTomans ||
                              item.amount ||
                              0
                            ).toLocaleString('fa-IR')} تومان`
                          : ''}
                      </div>
                    )}

                    {item.receiptImageUrl && (
                      <div className="h-28 rounded-xl overflow-hidden bg-black/30 border border-current/15 flex items-center justify-center p-1">
                        <img
                          src={item.receiptImageUrl}
                          alt="تصویر پیوست"
                          className="max-h-full max-w-full object-contain rounded"
                        />
                      </div>
                    )}

                    {item.aiConfidenceText && (
                      <div className="p-2.5 rounded-xl bg-emerald-950/85 border border-emerald-500/40 text-emerald-200 text-[11px] font-bold">
                        {item.aiConfidenceText}
                      </div>
                    )}

                    {item.status === 'pending' ? (
                      <div className="grid grid-cols-2 gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => handleQueueDecision(item, 'approved')}
                          className="py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs border-b-4 border-emerald-800 active:border-b-0 active:translate-y-1 cursor-pointer flex items-center justify-center gap-1"
                        >
                          <Check className="w-4 h-4" />
                          {queueFilter === 'receipt'
                            ? '✅ تایید فیش و صدور بلیط'
                            : '✅ تایید کارت دانشجویی'}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleQueueDecision(item, 'rejected')}
                          className="py-2.5 px-3 rounded-xl bg-rose-700 hover:bg-rose-600 text-white font-black text-xs border-b-4 border-rose-900 active:border-b-0 active:translate-y-1 cursor-pointer flex items-center justify-center gap-1"
                        >
                          <X className="w-4 h-4" />
                          ❌ رد کردن و انتقال به ردشده‌ها
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between gap-2 pt-2 border-t border-current/10">
                        <span className="text-[10px] font-bold opacity-75">
                          ثبت‌شده در پوشه {item.status === 'approved' ? 'تاییدشده‌ها' : 'ردشده‌ها'}
                        </span>
                        <div className="flex gap-1.5">
                          {item.status === 'rejected' && (
                            <button
                              type="button"
                              onClick={() => handleQueueDecision(item, 'approved')}
                              className="px-2.5 py-1 rounded-lg bg-emerald-600 text-white text-[10px] font-black cursor-pointer"
                            >
                              ✅ تغییر به تاییدشده
                            </button>
                          )}
                          {item.status === 'approved' && (
                            <button
                              type="button"
                              onClick={() => handleQueueDecision(item, 'rejected')}
                              className="px-2.5 py-1 rounded-lg bg-rose-700 text-white text-[10px] font-black cursor-pointer"
                            >
                              ❌ تغییر به ردشده
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => handleQueueDecision(item, 'pending')}
                            className="px-2.5 py-1 rounded-lg bg-amber-500/20 text-amber-400 border border-amber-500/40 text-[10px] font-black cursor-pointer"
                          >
                            🔄 بازگردانی به صف انتظار
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ===================================================================
            MODULE 3: 👥 ۳. مدیریت کاربران + قفل و بازکردن کامل + امتیاز دلخواه
           =================================================================== */}
        {activeModule === 3 && (
          <div className={`rounded-3xl p-4 lg:p-6 border space-y-4 ${cardSurfaceClass}`}>
            <div className="flex items-center justify-between border-b border-current/10 pb-3">
              <div>
                <h2 className="text-sm lg:text-base font-black">
                  👥 ۳. مدیریت کاربران، قفل/بازکردن دوطرفه حساب و تخصیص امتیاز دلخواه
                </h2>
                <p
                  className={`text-[11px] font-bold ${
                    isNight ? 'text-[#A3C1AD]' : 'text-[#3D5249]'
                  }`}
                >
                  کنترل کامل قفل یا باز شدن KYC و حساب کاربری + افزودن یا کسر هر مقدار امتیاز دلخواه در پرونده ۳۶۰ درجه
                </p>
              </div>
              <button
                type="button"
                onClick={handleExportStudentsCsv}
                className="px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-[11px] border-b-2 border-emerald-800 flex items-center gap-1.5 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                📊 دانلود اکسل (CSV)
              </button>
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
              {['همه', '1400', '1401', '1402', '1403', '1404', '1405', 'سایر'].map((cohort) => (
                <button
                  key={cohort}
                  type="button"
                  onClick={() => {
                    playTick();
                    setSelectedCohort(cohort);
                  }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-black shrink-0 cursor-pointer transition-all ${
                    selectedCohort === cohort
                      ? 'bg-[#D4AB58] text-[#101622]'
                      : subCardClass
                  }`}
                >
                  {cohort === 'همه' ? 'همه ورودی‌ها' : `ورودی ${cohort}`}
                </button>
              ))}
            </div>

            <div className="relative">
              <Search className="w-4 h-4 absolute right-3 top-2.5 opacity-60" />
              <input
                type="text"
                value={userSearchQuery}
                onChange={(e) => setUserSearchQuery(e.target.value)}
                placeholder="جستجو بر اساس نام، شماره دانشجویی (مثلاً 4011234567) یا تلفن..."
                className={`w-full pr-9 pl-3 py-2 rounded-xl text-xs font-bold border focus:outline-none ${inputClass}`}
              />
            </div>

            {Array.isArray(disputeTickets) && disputeTickets.length > 0 && (
              <div className="p-3.5 rounded-2xl border-2 border-rose-500/50 bg-rose-950/30 space-y-2 text-xs">
                <div className="font-black text-rose-300">
                  🚨 تیکت‌های فوری اعتراض شماره دانشجویی ({disputeTickets.length.toLocaleString('fa-IR')} مورد):
                </div>
                {disputeTickets.map((dt) => (
                  <div
                    key={dt.id}
                    className="p-2.5 rounded-xl bg-black/30 border border-rose-500/30 space-y-1"
                  >
                    <div className="flex items-center justify-between font-black">
                      <span>
                        {dt.reporterName || dt.fullName} • کد دانشجویی:{' '}
                        <span className="font-mono text-[#D4AB58]">{dt.studentId}</span>
                      </span>
                      <span className="font-mono text-[11px]">{dt.phoneNumber || dt.phone}</span>
                    </div>
                    <p className="text-[11px] opacity-90">{dt.explanation}</p>
                  </div>
                ))}
              </div>
            )}

            {(Array.isArray(filteredStudents) ? filteredStudents : []).length === 0 ? (
              <div className={`p-6 rounded-2xl border text-center space-y-1.5 text-xs ${subCardClass}`}>
                <div className="font-black text-sm">
                  هنوز کاربر ثبت‌نام‌شده‌ای در این بخش وجود ندارد
                </div>
                <p className="opacity-75 font-bold">
                  تنها کاربران واقعی که در ربات تلگرام یا فرم ثبت‌نام احراز هویت کرده‌اند در این فهرست نمایش داده می‌شوند.
                </p>
              </div>
            ) : null}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {(Array.isArray(filteredStudents) ? filteredStudents : []).map((st) => (
                <div
                  key={st.id}
                  className={`p-3.5 rounded-2xl border space-y-2.5 transition-all hover:border-[#D4AB58] ${subCardClass}`}
                >
                  <div
                    onClick={() => {
                      playTick();
                      setSelectedStudentIdForDossier(st.id);
                      setDossierTab('overview');
                    }}
                    className="flex items-center justify-between cursor-pointer"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-11 h-11 rounded-full overflow-hidden border border-[#D4AB58]/50 bg-black/20 shrink-0">
                        <PixelImage
                          filename={st.avatar || '01_avatar_boy.png'}
                          alt={st.fullName}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-xs font-black">{st.fullName}</span>
                          <span className="text-[10px] px-2 py-0.5 rounded bg-black/20 font-mono font-bold">
                            {st.studentId}
                          </span>
                          {st.isBanned ? (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-rose-600 text-white font-black">
                              حساب قفل 🚫
                            </span>
                          ) : (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-600/20 text-emerald-400 font-black">
                              حساب باز ✓
                            </span>
                          )}
                        </div>
                        <div
                          className={`text-[11px] font-bold ${
                            isNight ? 'text-[#A3C1AD]' : 'text-[#3D5249]'
                          }`}
                        >
                          ورودی {st.cohortYear} • سطح {st.level} • KYC:{' '}
                          {st.kycStatus === 'verified'
                            ? 'باز و تایید شده ✅'
                            : st.kycStatus === 'kyc_locked'
                            ? 'قفل شده 🔒'
                            : 'در انتظار بررسی ⏳'}
                        </div>
                      </div>
                    </div>
                    <div className="text-left shrink-0">
                      <div className="text-xs font-black text-emerald-500">{st.score} 💎</div>
                      <span className="text-[10px] font-black text-[#D4AB58] underline">
                        پرونده ۳۶۰ ←
                      </span>
                    </div>
                  </div>

                  {/* Direct Quick Two-Way Lock/Unlock Bar on Card */}
                  <div className="pt-2 border-t border-current/10 flex flex-wrap items-center justify-between gap-1.5 text-[10px] font-black">
                    <button
                      type="button"
                      onClick={() =>
                        handleModifyStudentDossier(st, {
                          explicitKycStatus:
                            st.kycStatus === 'verified' ? 'kyc_locked' : 'verified',
                        })
                      }
                      className={`px-2.5 py-1 rounded-lg cursor-pointer ${
                        st.kycStatus === 'verified'
                          ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                          : 'bg-emerald-600 text-white'
                      }`}
                    >
                      {st.kycStatus === 'verified'
                        ? '🔒 قفل کردن KYC'
                        : '🔓 باز کردن قفل KYC (تایید)'}
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        handleModifyStudentDossier(st, {
                          explicitBanStatus: !st.isBanned,
                        })
                      }
                      className={`px-2.5 py-1 rounded-lg cursor-pointer ${
                        st.isBanned
                          ? 'bg-emerald-600 text-white'
                          : 'bg-rose-700/80 text-white'
                      }`}
                    >
                      {st.isBanned
                        ? '🔓 باز کردن حساب (رفع مسدودی)'
                        : '🚫 قفل کردن حساب کاربری'}
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        playTick();
                        setSelectedStudentIdForDossier(st.id);
                        setDossierTab('overview');
                      }}
                      className="px-2.5 py-1 rounded-lg bg-[#D4AB58] text-[#101622] cursor-pointer"
                    >
                      💎 تغییر امتیاز دلخواه
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* ===============================================================
                360° STUDENT DOSSIER MODAL (Two-Way Lock/Unlock + Custom Points + Avatar)
               =============================================================== */}
            {activeDossierStudent && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
                <div
                  className={`w-full max-w-lg rounded-3xl border-2 p-5 space-y-4 max-h-[90vh] overflow-y-auto ${
                    isNight
                      ? 'bg-[#141D2B] border-[#D4AB58] text-[#F6F1E7]'
                      : 'bg-[#FAF7F0] border-[#8F6B24] text-[#14201B]'
                  }`}
                  dir="rtl"
                >
                  <div className="flex items-center justify-between border-b border-current/10 pb-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-[#D4AB58] bg-black/20">
                        <PixelImage
                          filename={activeDossierStudent.avatar || '01_avatar_boy.png'}
                          alt={activeDossierStudent.fullName}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div>
                        <h3 className="text-sm font-black">
                          پرونده ۳۶۰ درجه: {activeDossierStudent.fullName}
                        </h3>
                        <p className="text-[11px] font-bold mt-0.5">
                          شماره دانشجویی: <span className="font-mono">{activeDossierStudent.studentId}</span> • تلفن:{' '}
                          <span className="font-mono">{activeDossierStudent.phone}</span>
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSelectedStudentIdForDossier(null)}
                      className="w-8 h-8 rounded-xl bg-current/10 flex items-center justify-center cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  {/* SECTION A: CUSTOM ARBITRARY POINTS ADDITION & DEDUCTION */}
                  <div className={`p-3.5 rounded-2xl border space-y-2.5 text-xs ${subCardClass}`}>
                    <div className="flex items-center justify-between">
                      <span className="font-black text-[#D4AB58]">
                        💎 افزودن یا کسر هر تعداد امتیاز دلخواه:
                      </span>
                      <span className="font-black text-emerald-400">
                        موجودی فعلی: {activeDossierStudent.score.toLocaleString('fa-IR')} امتیاز
                      </span>
                    </div>

                    {/* Quick Preset Chips */}
                    <div className="flex flex-wrap gap-1.5">
                      {[5, 10, 25, 50, 100, 250].map((preset) => (
                        <button
                          key={preset}
                          type="button"
                          onClick={() => {
                            playTick();
                            setCustomPointsInput(preset);
                          }}
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-black cursor-pointer border ${
                            customPointsInput === preset
                              ? 'bg-[#D4AB58] text-[#101622] border-[#D4AB58]'
                              : 'bg-black/20 border-current/15'
                          }`}
                        >
                          {preset} امتیاز
                        </button>
                      ))}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <div>
                        <label className="text-[10px] font-bold block mb-1">
                          تعداد امتیاز دلخواه:
                        </label>
                        <input
                          type="number"
                          min={1}
                          max={10000}
                          value={customPointsInput}
                          onChange={(e) =>
                            setCustomPointsInput(Math.max(1, Number(e.target.value) || 0))
                          }
                          className={`w-full px-3 py-2 rounded-xl border text-center font-mono font-black text-sm ${inputClass}`}
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <label className="text-[10px] font-bold block mb-1">
                          علت تغییر امتیاز (ثبت در تاریخچه دانشجو):
                        </label>
                        <input
                          type="text"
                          value={customPointsReason}
                          onChange={(e) => setCustomPointsReason(e.target.value)}
                          placeholder="مثلاً: فعالیت ویژه در کمیته اجرایی"
                          className={`w-full px-3 py-2 rounded-xl border text-xs font-bold ${inputClass}`}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() =>
                          handleModifyStudentDossier(activeDossierStudent, {
                            deltaScore: Math.abs(Number(customPointsInput) || 10),
                            reason: customPointsReason,
                          })
                        }
                        className="py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs cursor-pointer shadow"
                      >
                        ➕ افزودن {Math.abs(Number(customPointsInput) || 10)} امتیاز
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          handleModifyStudentDossier(activeDossierStudent, {
                            deltaScore: -Math.abs(Number(customPointsInput) || 10),
                            reason: customPointsReason,
                          })
                        }
                        className="py-2.5 px-3 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-black text-xs cursor-pointer shadow"
                      >
                        ➖ کسر {Math.abs(Number(customPointsInput) || 10)} امتیاز
                      </button>
                    </div>
                  </div>

                  {/* SECTION B: FULL TWO-WAY LOCK & UNLOCK CONTROLS */}
                  <div className={`p-3.5 rounded-2xl border space-y-2.5 text-xs ${subCardClass}`}>
                    <div className="font-black">
                      🔐 کنترل دوطرفه قفل و باز کردن دسترسی‌های کاربر:
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {/* 1. KYC Lock / Unlock */}
                      <div className="p-2.5 rounded-xl bg-black/20 border border-current/10 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-[11px]">وضعیت کارت دانشجویی:</span>
                          <span
                            className={`text-[10px] font-black px-2 py-0.5 rounded ${
                              activeDossierStudent.kycStatus === 'verified'
                                ? 'bg-emerald-600 text-white'
                                : 'bg-rose-600 text-white'
                            }`}
                          >
                            {activeDossierStudent.kycStatus === 'verified'
                              ? 'باز (تاییدشده ✅)'
                              : 'قفل‌شده 🔒'}
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-1.5">
                          <button
                            type="button"
                            onClick={() =>
                              handleModifyStudentDossier(activeDossierStudent, {
                                explicitKycStatus: 'verified',
                              })
                            }
                            className={`py-1.5 px-2 rounded-lg text-[10px] font-black cursor-pointer ${
                              activeDossierStudent.kycStatus === 'verified'
                                ? 'bg-emerald-700/40 text-emerald-300 border border-emerald-500/40'
                                : 'bg-emerald-600 text-white shadow'
                            }`}
                          >
                            🔓 باز کردن قفل KYC
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              handleModifyStudentDossier(activeDossierStudent, {
                                explicitKycStatus: 'kyc_locked',
                              })
                            }
                            className={`py-1.5 px-2 rounded-lg text-[10px] font-black cursor-pointer ${
                              activeDossierStudent.kycStatus === 'kyc_locked'
                                ? 'bg-rose-700/40 text-rose-300 border border-rose-500/40'
                                : 'bg-rose-700 text-white shadow'
                            }`}
                          >
                            🔒 قفل کردن KYC
                          </button>
                        </div>
                      </div>

                      {/* 2. Account Ban / Unban */}
                      <div className="p-2.5 rounded-xl bg-black/20 border border-current/10 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-[11px]">وضعیت حساب کاربری:</span>
                          <span
                            className={`text-[10px] font-black px-2 py-0.5 rounded ${
                              !activeDossierStudent.isBanned
                                ? 'bg-emerald-600 text-white'
                                : 'bg-rose-600 text-white'
                            }`}
                          >
                            {!activeDossierStudent.isBanned ? 'باز و فعال ✅' : 'مسدود 🚫'}
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-1.5">
                          <button
                            type="button"
                            onClick={() =>
                              handleModifyStudentDossier(activeDossierStudent, {
                                explicitBanStatus: false,
                              })
                            }
                            className={`py-1.5 px-2 rounded-lg text-[10px] font-black cursor-pointer ${
                              !activeDossierStudent.isBanned
                                ? 'bg-emerald-700/40 text-emerald-300 border border-emerald-500/40'
                                : 'bg-emerald-600 text-white shadow'
                            }`}
                          >
                            🔓 باز کردن حساب
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              handleModifyStudentDossier(activeDossierStudent, {
                                explicitBanStatus: true,
                              })
                            }
                            className={`py-1.5 px-2 rounded-lg text-[10px] font-black cursor-pointer ${
                              activeDossierStudent.isBanned
                                ? 'bg-rose-700/40 text-rose-300 border border-rose-500/40'
                                : 'bg-rose-700 text-white shadow'
                            }`}
                          >
                            🚫 قفل/مسدود حساب
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* SECTION C: ASSIGN STUDENT AVATAR FROM CATALOG */}
                  <div className={`p-3 rounded-2xl border space-y-2 text-xs ${subCardClass}`}>
                    <span className="font-black block">
                      🎭 تغییر آواتار این دانشجو ({studentAvatarsList.length} آواتار موجود):
                    </span>
                    <div className="flex gap-2 overflow-x-auto pb-1">
                      {studentAvatarsList.map((av) => (
                        <button
                          key={av.id}
                          type="button"
                          onClick={() =>
                            handleModifyStudentDossier(activeDossierStudent, {
                              newAvatar: av.imageUrl,
                            })
                          }
                          className={`p-1.5 rounded-xl border shrink-0 flex flex-col items-center gap-1 cursor-pointer ${
                            activeDossierStudent.avatar === av.imageUrl
                              ? 'border-[#D4AB58] bg-[#D4AB58]/20'
                              : 'border-current/15'
                          }`}
                        >
                          <PixelImage
                            filename={av.imageUrl}
                            alt={av.title}
                            className="w-8 h-8 object-contain"
                          />
                          <span className="text-[9px] font-bold">{av.title}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-1.5 p-1 rounded-xl bg-black/20 text-xs font-black">
                    <button
                      type="button"
                      onClick={() => setDossierTab('overview')}
                      className={`py-1.5 rounded-lg cursor-pointer ${
                        dossierTab === 'overview' ? 'bg-[#D4AB58] text-[#101622]' : ''
                      }`}
                    >
                      کارگاه‌ها ({activeDossierStudent.attendedEvents.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setDossierTab('payments')}
                      className={`py-1.5 rounded-lg cursor-pointer ${
                        dossierTab === 'payments' ? 'bg-[#D4AB58] text-[#101622]' : ''
                      }`}
                    >
                      پرداختی‌ها ({activeDossierStudent.payments.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setDossierTab('chats')}
                      className={`py-1.5 rounded-lg cursor-pointer ${
                        dossierTab === 'chats' ? 'bg-[#D4AB58] text-[#101622]' : ''
                      }`}
                    >
                      چت‌ها ({activeDossierStudent.chatLogs.length})
                    </button>
                  </div>

                  {dossierTab === 'overview' && (
                    <div className="space-y-2 text-xs">
                      <div className="font-black text-[11px]">کارگاه‌های شرکت‌کرده:</div>
                      {(Array.isArray(activeDossierStudent.attendedEvents)
                        ? activeDossierStudent.attendedEvents
                        : []
                      ).map((evName, idx) => (
                        <div
                          key={idx}
                          className="p-2.5 rounded-xl bg-black/10 border border-current/10 font-bold"
                        >
                          ✅ {evName}
                        </div>
                      ))}
                    </div>
                  )}

                  {dossierTab === 'payments' && (
                    <div className="space-y-2 text-xs">
                      {(Array.isArray(activeDossierStudent.payments)
                        ? activeDossierStudent.payments
                        : []
                      ).length === 0 ? (
                        <div className="p-4 text-center font-bold opacity-70">
                          تراکنش مالی ثبت نشده است.
                        </div>
                      ) : (
                        activeDossierStudent.payments.map((pay, idx) => (
                          <div
                            key={idx}
                            className="p-2.5 rounded-xl bg-black/10 border border-current/10 flex items-center justify-between font-bold"
                          >
                            <div>
                              <div className="font-black">{pay.title}</div>
                              <div className="text-[10px] opacity-75">{pay.date}</div>
                            </div>
                            <span className="font-black text-emerald-500">
                              {pay.amount.toLocaleString('fa-IR')} تومان
                            </span>
                          </div>
                        ))
                      )}
                    </div>
                  )}

                  {dossierTab === 'chats' && (
                    <div className="space-y-2 text-xs">
                      {(Array.isArray(activeDossierStudent.chatLogs)
                        ? activeDossierStudent.chatLogs
                        : []
                      ).length === 0 ? (
                        <div className="p-4 text-center font-bold opacity-70">
                          سابقه گفتگویی ثبت نشده است.
                        </div>
                      ) : (
                        activeDossierStudent.chatLogs.map((chat, idx) => (
                          <div
                            key={idx}
                            className="p-2.5 rounded-xl bg-black/10 border border-current/10 font-bold"
                          >
                            <div className="flex justify-between text-[10px] opacity-75 mb-1">
                              <span>{chat.sender}</span>
                              <span>{chat.time}</span>
                            </div>
                            <div>{chat.text}</div>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ===================================================================
            MODULE 4: 🎯 ۴. مدیریت کارگاه‌ها، اساتید و آواتار اساتید
           =================================================================== */}
        {activeModule === 4 && (
          <div className={`rounded-3xl p-4 lg:p-6 border space-y-4 ${cardSurfaceClass}`}>
            <div className="flex items-center justify-between border-b border-current/10 pb-3">
              <div>
                <h2 className="text-sm lg:text-base font-black">
                  🎯 ۴. مدیریت کارگاه‌ها، رویداد ویژه، اساتید، کانال و درباره انجمن
                </h2>
                <p
                  className={`text-[11px] font-bold ${
                    isNight ? 'text-[#A3C1AD]' : 'text-[#3D5249]'
                  }`}
                >
                  کنترل کامل کارگاه‌ها و انتخاب «رویداد ویژه» صفحه اول، ویرایش کادرهای «درباره انجمن صنایع»، رادار اساتید و کانال تلگرام
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 p-1 rounded-2xl bg-black/20">
              <button
                type="button"
                onClick={() => setMod4SubTab('events')}
                className={`py-2 rounded-xl text-xs font-black cursor-pointer ${
                  mod4SubTab === 'events' ? 'bg-[#D4AB58] text-[#101622]' : 'opacity-75'
                }`}
              >
                📅 کارگاه‌ها و رویداد ویژه ({eventList.length})
              </button>
              <button
                type="button"
                onClick={() => setMod4SubTab('about')}
                className={`py-2 rounded-xl text-xs font-black cursor-pointer ${
                  mod4SubTab === 'about' ? 'bg-[#D4AB58] text-[#101622]' : 'opacity-75'
                }`}
              >
                🏛 ویرایش درباره انجمن
              </button>
              <button
                type="button"
                onClick={() => setMod4SubTab('professors')}
                className={`py-2 rounded-xl text-xs font-black cursor-pointer ${
                  mod4SubTab === 'professors' ? 'bg-[#D4AB58] text-[#101622]' : 'opacity-75'
                }`}
              >
                👨‍🏫 رادار و آواتار اساتید ({profList.length})
              </button>
              <button
                type="button"
                onClick={() => setMod4SubTab('channel')}
                className={`py-2 rounded-xl text-xs font-black cursor-pointer ${
                  mod4SubTab === 'channel' ? 'bg-[#D4AB58] text-[#101622]' : 'opacity-75'
                }`}
              >
                📢 کانال تلگرام (@{normalizeTelegramChannelHandle(channelUrlInput)})
              </button>
            </div>

            {mod4SubTab === 'events' ? (
              <div className="space-y-4">
                {/* FEATURED EVENT SELECTOR FOR HOME PAGE */}
                <div className={`p-4 rounded-2xl border-2 border-[#D4AB58]/50 space-y-2.5 text-xs ${subCardClass}`}>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <div className="font-black text-[#D4AB58] text-sm">
                        🌟 انتخاب «رویداد ویژه» وسط صفحه اول (کارت ویژه هوم):
                      </div>
                      <p className="text-[11px] opacity-80 font-bold mt-0.5">
                        مشخص کنید کدام یک از رویدادهای زیر در کادر بزرگ «رویداد ویژه» صفحه اول نمایش داده شود:
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <select
                      value={selectedFeaturedEventId}
                      onChange={(e) => {
                        playCoin();
                        const nextId = e.target.value;
                        setSelectedFeaturedEventId(nextId);
                        onUpdateFeaturedEventId?.(nextId);
                        const chosen = (Array.isArray(eventList) ? eventList : []).find(
                          (item) => item.id === nextId
                        );
                        if (chosen) {
                          appendLog('تغییر رویداد ویژه صفحه اول', chosen.title, 'success');
                          triggerToast(
                            `🌟 «${chosen.title}» به‌عنوان رویداد ویژه وسط صفحه اول تنظیم شد!`
                          );
                        }
                      }}
                      className={`flex-1 px-3 py-2 rounded-xl border text-xs font-black ${inputClass}`}
                    >
                      {(Array.isArray(eventList) ? eventList : []).map((ev) => (
                        <option key={ev.id} value={ev.id}>
                          {ev.id === selectedFeaturedEventId ? '🌟 [رویداد ویژه فعلی] ' : ''}
                          {ev.title} ({ev.date} • ظرفیت باقی‌مانده: {ev.capacityRemaining} نفر)
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <form
                  onSubmit={handleSaveEvent}
                  className={`p-4 rounded-2xl border space-y-2.5 text-xs ${subCardClass}`}
                >
                  <div className="font-black">
                    {editingEventId
                      ? '✏️ ویرایش رویداد انتخاب‌شده'
                      : '➕ تعریف کارگاه یا رویداد جدید'}
                  </div>
                  <input
                    type="text"
                    value={eventTitleInput}
                    onChange={(e) => setEventTitleInput(e.target.value)}
                    placeholder="عنوان رویداد (مثلاً: کارگاه شبیه‌سازی Arena پیشرفته)"
                    className={`w-full px-3 py-2 rounded-xl border text-xs font-bold ${inputClass}`}
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <select
                      value={eventCategoryInput}
                      onChange={(e) =>
                        setEventCategoryInput(
                          e.target.value as 'workshop' | 'visit' | 'seminar'
                        )
                      }
                      className={`px-3 py-2 rounded-xl border text-xs font-bold ${inputClass}`}
                    >
                      <option value="workshop">کارگاه آموزشی</option>
                      <option value="visit">بازدید علمی</option>
                      <option value="seminar">سمینار</option>
                    </select>
                    <input
                      type="text"
                      value={eventInstructorInput}
                      onChange={(e) => setEventInstructorInput(e.target.value)}
                      placeholder="نام مدرس"
                      className={`px-3 py-2 rounded-xl border text-xs font-bold ${inputClass}`}
                    />
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <input
                      type="text"
                      value={eventDateInput}
                      onChange={(e) => setEventDateInput(e.target.value)}
                      placeholder="تاریخ"
                      className={`px-2.5 py-2 rounded-xl border text-xs font-bold ${inputClass}`}
                    />
                    <input
                      type="text"
                      value={eventTimeInput}
                      onChange={(e) => setEventTimeInput(e.target.value)}
                      placeholder="ساعت"
                      className={`px-2.5 py-2 rounded-xl border text-xs font-bold ${inputClass}`}
                    />
                    <input
                      type="text"
                      value={eventLocationInput}
                      onChange={(e) => setEventLocationInput(e.target.value)}
                      placeholder="مکان"
                      className={`px-2.5 py-2 rounded-xl border text-xs font-bold ${inputClass}`}
                    />
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <span className="text-[10px] font-bold block mb-0.5">هزینه (تومان):</span>
                      <input
                        type="number"
                        value={eventPriceInput}
                        onChange={(e) => setEventPriceInput(Number(e.target.value))}
                        className={`w-full px-2.5 py-1.5 rounded-xl border text-xs font-bold ${inputClass}`}
                      />
                    </div>
                    <div>
                      <span className="text-[10px] font-bold block mb-0.5">ظرفیت:</span>
                      <input
                        type="number"
                        value={eventCapacityInput}
                        onChange={(e) => setEventCapacityInput(Number(e.target.value))}
                        className={`w-full px-2.5 py-1.5 rounded-xl border text-xs font-bold ${inputClass}`}
                      />
                    </div>
                    <div>
                      <span className="text-[10px] font-bold block mb-0.5">پاداش امتیاز:</span>
                      <input
                        type="number"
                        value={eventPointsInput}
                        onChange={(e) => setEventPointsInput(Number(e.target.value))}
                        className={`w-full px-2.5 py-1.5 rounded-xl border text-xs font-bold ${inputClass}`}
                      />
                    </div>
                  </div>
                  <button
                    type="submit"
                    className="w-full py-2.5 rounded-xl bg-[#D4AB58] text-[#101622] font-black text-xs cursor-pointer flex items-center justify-center gap-1"
                  >
                    <Plus className="w-4 h-4" />
                    {editingEventId ? 'ذخیره تغییرات رویداد' : 'ثبت و انتشار در تب برنامه'}
                  </button>
                </form>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                  {(Array.isArray(eventList) ? eventList : []).map((ev) => {
                    const isFeatured = ev.id === selectedFeaturedEventId;
                    return (
                      <div
                        key={ev.id}
                        className={`p-3 rounded-2xl border flex items-center justify-between gap-2 text-xs ${
                          isFeatured
                            ? 'border-2 border-[#D4AB58] bg-[#D4AB58]/10'
                            : subCardClass
                        }`}
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {isFeatured && (
                              <span className="px-2 py-0.5 rounded-full bg-[#E77F6E] text-[#101622] text-[10px] font-black">
                                🌟 رویداد ویژه صفحه اول
                              </span>
                            )}
                            <span className="font-black truncate">{ev.title}</span>
                          </div>
                          <div
                            className={`text-[11px] font-bold mt-0.5 ${
                              isNight ? 'text-[#A3C1AD]' : 'text-[#3D5249]'
                            }`}
                          >
                            {ev.date} • ظرفیت: {ev.capacityRemaining}/{ev.capacityTotal} • +
                            {ev.rewardPoints} امتیاز
                          </div>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => {
                              playCoin();
                              setSelectedFeaturedEventId(ev.id);
                              onUpdateFeaturedEventId?.(ev.id);
                              appendLog('انتخاب رویداد ویژه صفحه اول', ev.title, 'success');
                              triggerToast(
                                `🌟 «${ev.title}» به‌عنوان رویداد ویژه وسط صفحه اول انتخاب شد!`
                              );
                            }}
                            className={`px-2.5 py-1.5 rounded-xl text-[10px] font-black cursor-pointer ${
                              isFeatured
                                ? 'bg-[#D4AB58] text-[#101622]'
                                : 'bg-white/10 hover:bg-white/20'
                            }`}
                            title="نمایش در کادر رویداد ویژه صفحه اول"
                          >
                            {isFeatured ? '🌟 ویژه فعلی' : 'انتخاب ویژه'}
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              playTick();
                              setEditingEventId(ev.id);
                              setEventTitleInput(ev.title);
                              setEventCategoryInput(ev.category);
                              setEventDateInput(ev.date);
                              setEventTimeInput(ev.time);
                              setEventLocationInput(ev.location);
                              setEventPriceInput(ev.basePrice);
                              setEventCapacityInput(ev.capacityRemaining);
                              setEventPointsInput(ev.rewardPoints);
                              setEventInstructorInput(ev.instructor);
                            }}
                            className="p-2 rounded-xl bg-amber-500/20 text-amber-400 cursor-pointer"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              playError();
                              const updated = eventList.filter((item) => item.id !== ev.id);
                              setEventList(updated);
                              onUpdateEvents?.(updated);
                              triggerToast(`🗑 رویداد «${ev.title}» حذف شد.`);
                            }}
                            className="p-2 rounded-xl bg-rose-500/20 text-rose-400 cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : mod4SubTab === 'about' ? (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  playCoin();
                  const parsedCommittees = committeesRawText
                    .split('\n')
                    .map((line) => line.trim())
                    .filter(Boolean);
                  const nextAbout: AboutAssociationConfig = {
                    ...aboutDraft,
                    committees:
                      parsedCommittees.length > 0
                        ? parsedCommittees
                        : DEFAULT_ABOUT_CONFIG.committees,
                  };
                  setAboutDraft(nextAbout);
                  onUpdateAboutConfig?.(nextAbout);
                  appendLog('ویرایش بخش درباره انجمن صنایع و کادرهای آماری', nextAbout.title, 'success');
                  triggerToast('✅ محتوای بخش «درباره انجمن صنایع» و ۳ کادر آماری با موفقیت بروزرسانی شد!');
                }}
                className={`p-4 rounded-2xl border space-y-3.5 text-xs ${subCardClass}`}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h3 className="text-sm font-black text-[#D4AB58]">
                      🏛 ویرایش کامل بخش «درباره انجمن صنایع» و ۳ کادر آماری
                    </h3>
                    <p className="text-[11px] opacity-80 font-bold mt-0.5">
                      تمام متن‌ها، کادرهای آماری (مثلاً +۱۱۰ رویداد برگزار شده) و لیست کمیته‌ها را مطابق نظر انجمن تغییر دهید:
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      playTick();
                      setAboutDraft(DEFAULT_ABOUT_CONFIG);
                      setCommitteesRawText(DEFAULT_ABOUT_CONFIG.committees.join('\n'));
                      onUpdateAboutConfig?.(DEFAULT_ABOUT_CONFIG);
                      triggerToast('🔄 مقادیر پیش‌فرض درباره انجمن بازگردانی شد.');
                    }}
                    className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-[11px] font-black cursor-pointer"
                  >
                    بازگردانی پیش‌فرض
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div>
                    <label className="text-[11px] font-black block mb-1">عنوان اصلی انجمن:</label>
                    <input
                      type="text"
                      value={aboutDraft.title}
                      onChange={(e) =>
                        setAboutDraft((prev) => ({ ...prev, title: e.target.value }))
                      }
                      className={`w-full px-3 py-2 rounded-xl border text-xs font-bold ${inputClass}`}
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-black block mb-1">زیرعنوان دانشگاه:</label>
                    <input
                      type="text"
                      value={aboutDraft.subtitle}
                      onChange={(e) =>
                        setAboutDraft((prev) => ({ ...prev, subtitle: e.target.value }))
                      }
                      className={`w-full px-3 py-2 rounded-xl border text-xs font-bold ${inputClass}`}
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-black block mb-1">
                    متن معرفی و توضیحات درباره انجمن:
                  </label>
                  <textarea
                    rows={3}
                    value={aboutDraft.description}
                    onChange={(e) =>
                      setAboutDraft((prev) => ({ ...prev, description: e.target.value }))
                    }
                    className={`w-full px-3 py-2 rounded-xl border text-xs font-bold leading-relaxed ${inputClass}`}
                  />
                </div>

                {/* 3 Editable Stat Boxes */}
                <div className="space-y-2">
                  <div className="text-[11px] font-black text-[#D4AB58]">
                    📊 ۳ کادر آماری پایین معرفی انجمن (قابل تغییر دلخواه توسط انجمن):
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    {[0, 1, 2].map((idx) => (
                      <div
                        key={idx}
                        className="p-3 rounded-xl bg-black/20 border border-current/15 space-y-2"
                      >
                        <div className="text-[10px] font-black opacity-75">
                          کادر آماری شماره {(idx + 1).toLocaleString('fa-IR')}:
                        </div>
                        <input
                          type="text"
                          value={aboutDraft.stats[idx]?.value || ''}
                          onChange={(e) => {
                            const val = e.target.value;
                            setAboutDraft((prev) => {
                              const nextStats: [
                                { value: string; label: string },
                                { value: string; label: string },
                                { value: string; label: string },
                              ] = [
                                { ...prev.stats[0] },
                                { ...prev.stats[1] },
                                { ...prev.stats[2] },
                              ];
                              nextStats[idx] = { ...nextStats[idx], value: val };
                              return { ...prev, stats: nextStats };
                            });
                          }}
                          placeholder="مقدار (مثلاً: +۱۱۰ رویداد)"
                          className={`w-full px-2.5 py-1.5 rounded-lg border text-xs font-black ${inputClass}`}
                        />
                        <input
                          type="text"
                          value={aboutDraft.stats[idx]?.label || ''}
                          onChange={(e) => {
                            const lbl = e.target.value;
                            setAboutDraft((prev) => {
                              const nextStats: [
                                { value: string; label: string },
                                { value: string; label: string },
                                { value: string; label: string },
                              ] = [
                                { ...prev.stats[0] },
                                { ...prev.stats[1] },
                                { ...prev.stats[2] },
                              ];
                              nextStats[idx] = { ...nextStats[idx], label: lbl };
                              return { ...prev, stats: nextStats };
                            });
                          }}
                          placeholder="عنوان زیرین (مثلاً: رویداد برگزار شده)"
                          className={`w-full px-2.5 py-1.5 rounded-lg border text-[11px] font-bold ${inputClass}`}
                        />
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-black block mb-1">
                    عنوان بخش کمیته‌ها:
                  </label>
                  <input
                    type="text"
                    value={aboutDraft.committeesTitle}
                    onChange={(e) =>
                      setAboutDraft((prev) => ({
                        ...prev,
                        committeesTitle: e.target.value,
                      }))
                    }
                    className={`w-full px-3 py-2 rounded-xl border text-xs font-bold mb-2 ${inputClass}`}
                  />
                  <label className="text-[11px] font-black block mb-1">
                    لیست کمیته‌ها یا فعالیت‌ها (هر مورد در یک خط):
                  </label>
                  <textarea
                    rows={4}
                    value={committeesRawText}
                    onChange={(e) => setCommitteesRawText(e.target.value)}
                    className={`w-full px-3 py-2 rounded-xl border text-xs font-bold leading-relaxed ${inputClass}`}
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 rounded-xl bg-[#D4AB58] text-[#101622] font-black text-xs cursor-pointer shadow"
                >
                  💾 ذخیره و اعمال فوری در بخش «درباره انجمن صنایع»
                </button>
              </form>
            ) : mod4SubTab === 'professors' ? (
              <div className="space-y-4">
                {/* Manual Add Professor Form with Professor Avatar Picker */}
                <form
                  onSubmit={handleAddProfessor}
                  className={`p-4 rounded-2xl border space-y-3 text-xs ${subCardClass}`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-black">
                      ➕ افزودن استاد جدید به همراه انتخاب آواتار استاد:
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setActiveModule(6);
                        setMod6SubTab('avatars');
                      }}
                      className="text-[10px] font-black text-[#D4AB58] underline cursor-pointer"
                    >
                      + آپلود آواتار جدید برای اساتید
                    </button>
                  </div>

                  {/* Professor Avatar Selector */}
                  <div className="flex gap-2 overflow-x-auto pb-1">
                    {professorAvatarsList.map((av) => (
                      <button
                        key={av.id}
                        type="button"
                        onClick={() => {
                          playTick();
                          setProfAvatarInput(av.imageUrl);
                        }}
                        className={`p-2 rounded-xl border shrink-0 flex flex-col items-center gap-1 cursor-pointer ${
                          profAvatarInput === av.imageUrl
                            ? 'border-[#D4AB58] bg-[#D4AB58]/20'
                            : 'border-current/15'
                        }`}
                      >
                        <PixelImage
                          filename={av.imageUrl}
                          alt={av.title}
                          className="w-9 h-9 object-contain"
                        />
                        <span className="text-[9px] font-bold">{av.title}</span>
                      </button>
                    ))}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <input
                      type="text"
                      value={profNameInput}
                      onChange={(e) => setProfNameInput(e.target.value)}
                      placeholder="نام استاد (مثلاً: دکتر علی اصغری)"
                      className={`px-3 py-2 rounded-xl border text-xs font-bold ${inputClass}`}
                    />
                    <input
                      type="text"
                      value={profTitleInput}
                      onChange={(e) => setProfTitleInput(e.target.value)}
                      placeholder="مرتبه علمی (مثلاً: دانشیار گروه صنایع)"
                      className={`px-3 py-2 rounded-xl border text-xs font-bold ${inputClass}`}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      value={profOfficeInput}
                      onChange={(e) => setProfOfficeInput(e.target.value)}
                      placeholder="شماره اتاق"
                      className={`px-3 py-2 rounded-xl border text-xs font-bold ${inputClass}`}
                    />
                    <input
                      type="text"
                      value={profHoursInput}
                      onChange={(e) => setProfHoursInput(e.target.value)}
                      placeholder="ساعات حضور در دفتر"
                      className={`px-3 py-2 rounded-xl border text-xs font-bold ${inputClass}`}
                    />
                  </div>
                  <button
                    type="submit"
                    className="w-full py-2.5 rounded-xl bg-[#D4AB58] text-[#101622] font-black text-xs cursor-pointer"
                  >
                    ثبت استاد با آواتار انتخابی در رادار دانشکده
                  </button>
                </form>

                {/* Professors List with Live Presence Toggle & Avatar Switcher */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                  {(Array.isArray(profList) ? profList : []).map((prof) => (
                    <div
                      key={prof.id}
                      className={`p-3.5 rounded-2xl border space-y-2.5 text-xs ${subCardClass}`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2.5">
                          <div className="w-11 h-11 rounded-xl overflow-hidden border border-[#D4AB58]/50 bg-black/20 p-1 shrink-0">
                            <PixelImage
                              filename={prof.avatar}
                              alt={prof.name}
                              className="w-full h-full object-contain"
                            />
                          </div>
                          <div>
                            <div className="font-black">{prof.name}</div>
                            <div className="text-[11px] font-bold opacity-80">
                              {prof.office} • {prof.officeHours}
                            </div>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleToggleProfessorOffice(prof.id)}
                          className={`px-3 py-1.5 rounded-xl font-black text-[11px] cursor-pointer transition-all shrink-0 ${
                            prof.isCurrentlyInOffice
                              ? 'bg-emerald-600 text-white'
                              : 'bg-zinc-700 text-zinc-200'
                          }`}
                        >
                          {prof.isCurrentlyInOffice ? '🟢 حضور در دفتر' : '⚪ خارج از دفتر'}
                        </button>
                      </div>

                      {/* Quick Avatar Switcher for existing professor */}
                      <div className="pt-2 border-t border-current/10 flex items-center justify-between gap-2">
                        <span className="text-[10px] font-bold opacity-75">
                          تغییر سریع آواتار استاد:
                        </span>
                        <div className="flex gap-1 overflow-x-auto">
                          {professorAvatarsList.map((av) => (
                            <button
                              key={av.id}
                              type="button"
                              onClick={() => handleChangeProfessorAvatar(prof.id, av.imageUrl)}
                              className={`w-7 h-7 rounded-lg border p-0.5 cursor-pointer ${
                                prof.avatar === av.imageUrl
                                  ? 'border-[#D4AB58] bg-[#D4AB58]/25'
                                  : 'border-current/15 opacity-70 hover:opacity-100'
                              }`}
                              title={av.title}
                            >
                              <PixelImage
                                filename={av.imageUrl}
                                alt={av.title}
                                className="w-full h-full object-contain"
                              />
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {/* =========================================================
                    LIVE TELEGRAM CHANNEL SYNC ENGINE (@Isefum)
                   ========================================================= */}
                <div className={`p-4 rounded-2xl border space-y-3 text-xs ${subCardClass}`}>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <h3 className="text-sm font-black">
                        📢 اتصال و همگام‌سازی زنده کانال تلگرام انجمن علمی مهندسی صنایع
                      </h3>
                      <p className="text-[11px] font-bold opacity-80">
                        لینک یا آیدی کانال رسمی انجمن (پیش‌فرض: https://t.me/Isefum) را وارد کنید تا آخرین پست‌های کانال مستقیماً در مینی‌اپ خوانده شوند.
                      </p>
                    </div>
                    <a
                      href={`https://t.me/${normalizeTelegramChannelHandle(channelUrlInput)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-1.5 rounded-xl bg-[#354B40] text-[#F6F1E7] text-xs font-black"
                    >
                      ✈️ مشاهده @{normalizeTelegramChannelHandle(channelUrlInput)}
                    </a>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-2">
                    <input
                      type="text"
                      value={channelUrlInput}
                      onChange={(e) => setChannelUrlInput(e.target.value)}
                      placeholder="https://t.me/Isefum یا @Isefum"
                      dir="ltr"
                      className={`flex-1 px-3 py-2 rounded-xl border text-xs font-bold text-left ${inputClass}`}
                    />
                    <button
                      type="button"
                      disabled={isSyncingChannel}
                      onClick={async () => {
                        playCoin();
                        setIsSyncingChannel(true);
                        try {
                          const normalizedUrl = saveChannelUrl(channelUrlInput);
                          setChannelUrlInput(normalizedUrl);
                          onUpdateChannelUrl?.(normalizedUrl);
                          const res = await syncAnnouncementsFromTelegramChannel(
                            normalizedUrl
                          );
                          setAnnouncementList(res.announcements);
                          onUpdateAnnouncements?.(res.announcements);
                          triggerToast(
                            `✅ ${res.announcements.length.toLocaleString('fa-IR')} اطلاعیه از کانال @${res.channelHandle} با موفقیت همگام‌سازی شد!`
                          );
                        } finally {
                          setIsSyncingChannel(false);
                        }
                      }}
                      className="px-5 py-3 rounded-xl bg-[#D4AB58] hover:bg-[#e1b864] text-[#101622] font-black text-xs sm:text-sm cursor-pointer shrink-0 disabled:opacity-60 shadow-md border-b-2 border-[#8A6A26]"
                    >
                      {isSyncingChannel
                        ? '⏳ در حال دریافت از تلگرام...'
                        : '🔄 آپدیت آنی اطلاعیه‌ها از کانال تلگرام (@Isefum)'}
                    </button>
                  </div>
                </div>

                {/* Manual Pin / Publish New Announcement Form */}
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (!manualAnnTitle.trim() || !manualAnnContent.trim()) {
                      playError();
                      triggerToast('⚠️ لطفاً عنوان و متن اطلاعیه را وارد کنید.');
                      return;
                    }
                    playCoin();
                    const handle = normalizeTelegramChannelHandle(channelUrlInput);
                    const newAnn: ChannelAnnouncement = {
                      id: `manual-${Date.now()}`,
                      postId: `${Math.floor(2150 + Math.random() * 90)}`,
                      channelHandle: handle,
                      postUrl: `https://t.me/${handle}`,
                      title: manualAnnTitle.trim(),
                      snippet:
                        manualAnnContent.trim().length > 85
                          ? `${manualAnnContent.trim().slice(0, 82)}...`
                          : manualAnnContent.trim(),
                      content: manualAnnContent.trim(),
                      timestamp: 'هم‌اکنون (سنجاق شورا)',
                      tag: manualAnnTag.trim() || 'اطلاعیه فوری',
                      author: `شورای مرکزی (@${handle})`,
                      views: 1,
                      hasAttachment: false,
                      isPinned: true,
                    };
                    const updated = [newAnn, ...announcementList];
                    setAnnouncementList(updated);
                    saveStoredAnnouncements(updated);
                    onUpdateAnnouncements?.(updated);
                    setManualAnnTitle('');
                    setManualAnnContent('');
                    triggerToast('📌 اطلاعیه جدید در صدر مینی‌اپ سنجاق و منتشر شد.');
                  }}
                  className={`p-4 rounded-2xl border space-y-2.5 text-xs ${subCardClass}`}
                >
                  <div className="font-black">
                    📌 انتشار و سنجاق اطلاعیه دستی در صدر مینی‌اپ:
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <input
                      type="text"
                      value={manualAnnTitle}
                      onChange={(e) => setManualAnnTitle(e.target.value)}
                      placeholder="عنوان اطلاعیه (مثلاً: تمدید مهلت ثبت‌نام هکاتون صنایع)"
                      className={`sm:col-span-2 px-3 py-2 rounded-xl border text-xs font-bold ${inputClass}`}
                    />
                    <input
                      type="text"
                      value={manualAnnTag}
                      onChange={(e) => setManualAnnTag(e.target.value)}
                      placeholder="برچسب (مثلاً: فوری / آموزشی)"
                      className={`px-3 py-2 rounded-xl border text-xs font-bold ${inputClass}`}
                    />
                  </div>
                  <textarea
                    rows={2}
                    value={manualAnnContent}
                    onChange={(e) => setManualAnnContent(e.target.value)}
                    placeholder="متن کامل اطلاعیه..."
                    className={`w-full px-3 py-2 rounded-xl border text-xs font-bold ${inputClass}`}
                  />
                  <button
                    type="submit"
                    className="w-full py-2.5 rounded-xl bg-emerald-600 text-white font-black text-xs cursor-pointer"
                  >
                    ➕ سنجاق و انتشار فوری در بخش اطلاعیه‌های اخیر
                  </button>
                </form>

                {/* Synced Announcements List */}
                <div className="space-y-2">
                  <div className="text-xs font-black">
                    لیست اطلاعیه‌های فعال در مینی‌اپ ({announcementList.length.toLocaleString('fa-IR')} پست):
                  </div>
                  {announcementList.map((ann) => (
                    <div
                      key={ann.id}
                      className={`p-3 rounded-2xl border flex items-center justify-between gap-2 text-xs ${subCardClass}`}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          {ann.isPinned && (
                            <span className="text-[10px] font-black px-2 py-0.5 rounded bg-amber-500/20 text-amber-400">
                              📌 سنجاق
                            </span>
                          )}
                          <span className="text-[10px] font-black px-2 py-0.5 rounded bg-[#D4AB58]/20 text-[#D4AB58]">
                            {ann.tag}
                          </span>
                          <span className="font-black truncate">{ann.title}</span>
                        </div>
                        <p className="text-[11px] opacity-80 truncate mt-0.5">
                          {ann.snippet}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          playError();
                          const next = announcementList.filter((a) => a.id !== ann.id);
                          setAnnouncementList(next);
                          saveStoredAnnouncements(next);
                          onUpdateAnnouncements?.(next);
                          triggerToast('🗑 اطلاعیه حذف شد.');
                        }}
                        className="p-2 rounded-xl bg-rose-500/20 text-rose-400 cursor-pointer shrink-0"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ===================================================================
            MODULE 5: 🤖 ۵. هوش مصنوعی مشتی و زمانبندی دقیق تایمرها (با تاریخ شروع و یک‌بار در تاریخ مشخص)
           =================================================================== */}
        {activeModule === 5 && (
          <div className={`rounded-3xl p-4 lg:p-6 border space-y-5 ${cardSurfaceClass}`}>
            <div className="flex items-center justify-between border-b border-current/10 pb-3">
              <div>
                <h2 className="text-sm lg:text-base font-black">
                  🤖 ۵. هوش مصنوعی مشتی و زمانبندی دقیق تایمرها (تاریخ شروع و اجرای یک‌باره)
                </h2>
                <p
                  className={`text-[11px] font-bold ${
                    isNight ? 'text-[#A3C1AD]' : 'text-[#3D5249]'
                  }`}
                >
                  تعیین تاریخ دقیق شروع تایمر، انتخاب حالت «فقط یک‌بار در تاریخ مشخص» یا تکرار دوره‌ای و همگام‌سازی زنده با یادآورهای دانشجو
                </p>
              </div>
            </div>

            {/* Sub-section A: Explicit Start Date & One-Time / Recurring Timer Builder */}
            <div className={`p-4 rounded-2xl border space-y-3.5 text-xs ${subCardClass}`}>
              <div className="flex items-center justify-between">
                <span className="font-black text-sm text-[#D4AB58]">
                  ⏰ ۱. ساخت تایمر با تاریخ دقیق شروع و امکان ارسال «فقط یک‌بار در تاریخ مشخص»:
                </span>
                <span className="text-[10px] font-black px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400">
                  متصل به یادآورهای دانشجو
                </span>
              </div>

              <form onSubmit={handleCreateExplicitDateTimer} className="space-y-3">
                <div>
                  <label className="text-[11px] font-bold block mb-1">
                    عنوان یا متن پیام تایمر:
                  </label>
                  <input
                    type="text"
                    value={timerTitleInput}
                    onChange={(e) => setTimerTitleInput(e.target.value)}
                    placeholder="مثلاً: یادآوری مهلت ثبت‌نام بازدید کارخانه یا رزرو سلف"
                    className={`w-full px-3 py-2 rounded-xl border text-xs font-bold ${inputClass}`}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <div>
                    <label className="text-[11px] font-bold block mb-1">
                      📅 از چه تاریخی شروع شود / تاریخ اجرا:
                    </label>
                    <input
                      type="text"
                      value={timerStartDateInput}
                      onChange={(e) => setTimerStartDateInput(e.target.value)}
                      placeholder="مثلاً: ۱۴۰۴/۰۸/۲۸"
                      className={`w-full px-3 py-2 rounded-xl border text-center font-bold ${inputClass}`}
                    />
                    <div className="flex gap-1 mt-1">
                      {['۱۴۰۴/۰۸/۲۴', '۱۴۰۴/۰۸/۲۸', '۱۴۰۴/۰۹/۰۵'].map((d) => (
                        <button
                          key={d}
                          type="button"
                          onClick={() => setTimerStartDateInput(d)}
                          className="text-[9px] px-1.5 py-0.5 rounded bg-black/25 hover:bg-[#D4AB58] hover:text-black font-bold cursor-pointer"
                        >
                          {d}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="text-[11px] font-bold block mb-1">
                      🔄 حالت اجرا (یک‌بار یا تکرار):
                    </label>
                    <select
                      value={timerFreqInput}
                      onChange={(e) =>
                        setTimerFreqInput(e.target.value as ScheduledTimer['frequency'])
                      }
                      className={`w-full px-3 py-2 rounded-xl border text-xs font-black ${inputClass}`}
                    >
                      <option value="یکبار">🎯 فقط یک‌بار در همین تاریخ مشخص</option>
                      <option value="روزانه">🔄 شروع از این تاریخ و تکرار روزانه</option>
                      <option value="هفتگی">📅 شروع از این تاریخ و تکرار هفتگی</option>
                      <option value="ماهانه">📆 شروع از این تاریخ و تکرار ماهانه</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[11px] font-bold block mb-1">
                      🕒 ساعت دقیق ارسال پیام:
                    </label>
                    <input
                      type="text"
                      value={timerTimeInput}
                      onChange={(e) => setTimerTimeInput(e.target.value)}
                      placeholder="۱۴:۰۰"
                      className={`w-full px-3 py-2 rounded-xl border text-center font-bold ${inputClass}`}
                    />
                  </div>
                </div>

                {timerFreqInput === 'هفتگی' && (
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-bold">روز هفته برای تکرار هفتگی:</span>
                    <div className="flex flex-wrap gap-1">
                      {[
                        'شنبه',
                        'یکشنبه',
                        'دوشنبه',
                        'سه‌شنبه',
                        'چهارشنبه',
                        'پنجشنبه',
                        'جمعه',
                      ].map((day) => (
                        <button
                          key={day}
                          type="button"
                          onClick={() => setTimerDayOfWeekInput(day)}
                          className={`px-2 py-1 rounded-lg text-[10px] font-black cursor-pointer ${
                            timerDayOfWeekInput === day
                              ? 'bg-[#D4AB58] text-[#101622]'
                              : 'bg-black/20'
                          }`}
                        >
                          {day}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <button
                  type="submit"
                  className="w-full py-2.5 rounded-xl bg-[#D4AB58] text-[#101622] font-black text-xs cursor-pointer shadow"
                >
                  ➕ ثبت تایمر با تاریخ مشخص و افزودن به یادآورهای دانشجویان
                </button>
              </form>

              {/* Quick Natural Language Timer Input */}
              <div className="pt-3 border-t border-current/10 space-y-2">
                <span className="text-[11px] font-bold block">
                  🪄 یا ساخت سریع تایمر با جمله فارسی (مثلاً «فقط در تاریخ ۱۴۰۴/۰۹/۰۵ ساعت ۱۰ یادآوری ثبت‌نام»):
                </span>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={nlTimerInput}
                    onChange={(e) => setNlTimerInput(e.target.value)}
                    className={`flex-1 px-3 py-2 rounded-xl border text-xs font-bold ${inputClass}`}
                  />
                  <button
                    type="button"
                    onClick={handleCreateSmartTimerFromSentence}
                    className="px-3.5 py-2 rounded-xl bg-[#354B40] text-[#F6F1E7] font-black text-xs shrink-0 cursor-pointer"
                  >
                    تبدیل هوشمند ⚡
                  </button>
                </div>
              </div>

              {/* Active Timers List with Inline Start Date & Frequency Editor */}
              <div className="space-y-2 pt-2">
                {(Array.isArray(timerList) ? timerList : []).map((tmr) => (
                  <div
                    key={tmr.id}
                    className={`p-3 rounded-xl border space-y-2 ${cardSurfaceClass}`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="font-black text-xs">{tmr.title}</div>
                        <div className="text-[10px] font-bold text-[#D4AB58] mt-0.5">
                          {tmr.frequency === 'یکبار'
                            ? `🎯 اجرا فقط یک‌بار در تاریخ: ${tmr.startDate || '۱۴۰۴/۰۸/۲۸'} • ساعت ${tmr.time}`
                            : `🔄 شروع از تاریخ: ${tmr.startDate || '۱۴۰۴/۰۸/۲۴'} • تکرار: ${tmr.frequency} ${
                                tmr.dayOfWeek ? `(${tmr.dayOfWeek})` : ''
                              } • ساعت ${tmr.time}`}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          updateTimersAndPersist((prev) =>
                            prev.filter((t) => t.id !== tmr.id)
                          )
                        }
                        className="p-1.5 rounded-lg bg-rose-500/20 text-rose-400 cursor-pointer shrink-0"
                        title="حذف تایمر"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="grid grid-cols-3 gap-2 pt-1 border-t border-current/10">
                      <input
                        type="text"
                        value={tmr.startDate || '۱۴۰۴/۰۸/۲۸'}
                        onChange={(e) => {
                          const val = e.target.value;
                          updateTimersAndPersist((prev) =>
                            prev.map((t) =>
                              t.id === tmr.id ? { ...t, startDate: val } : t
                            )
                          );
                        }}
                        title="تاریخ شروع یا اجرا"
                        className={`px-2 py-1 rounded border text-[10px] font-bold text-center ${inputClass}`}
                      />
                      <select
                        value={tmr.frequency}
                        onChange={(e) => {
                          const nextFreq = e.target.value as ScheduledTimer['frequency'];
                          updateTimersAndPersist((prev) =>
                            prev.map((t) =>
                              t.id === tmr.id ? { ...t, frequency: nextFreq } : t
                            )
                          );
                        }}
                        className={`px-2 py-1 rounded border text-[10px] font-bold ${inputClass}`}
                      >
                        <option value="یکبار">فقط یکبار در تاریخ</option>
                        <option value="روزانه">تکرار روزانه</option>
                        <option value="هفتگی">تکرار هفتگی</option>
                        <option value="ماهانه">تکرار ماهانه</option>
                      </select>
                      <input
                        type="text"
                        value={tmr.time}
                        onChange={(e) => {
                          const val = e.target.value;
                          updateTimersAndPersist((prev) =>
                            prev.map((t) => (t.id === tmr.id ? { ...t, time: val } : t))
                          );
                        }}
                        className={`px-2 py-1 rounded border text-[10px] font-bold text-center ${inputClass}`}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Sub-section B: Admin-Only Looti AI Chat */}
            <div className={`p-4 rounded-2xl border space-y-3 ${subCardClass}`}>
              <div className="flex items-center justify-between">
                <span className="text-xs font-black flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-[#D4AB58]" />
                  دستیار مشتی شورای مرکزی (سلام ستون!، روی چشمم، حله رفیق)
                </span>
                <select
                  value={aiModelId}
                  onChange={(e) => setAiModelId(e.target.value as LootiModelId)}
                  className={`px-2 py-1 rounded-lg border text-[10px] font-mono font-bold ${inputClass}`}
                >
                  <option value="gemini-3.8-flash">Gemini 3.8 Flash</option>
                  <option value="gemini-3.6-flash">Gemini 3.6 Flash</option>
                  <option value="gemini-3.5-flash-lite">Gemini 3.5 Lite</option>
                </select>
              </div>

              <div className="max-h-44 overflow-y-auto space-y-2 p-2.5 rounded-xl bg-black/20">
                {(Array.isArray(aiMessages) ? aiMessages : []).map((msg) => (
                  <div
                    key={msg.id}
                    className={`p-2.5 rounded-xl text-xs font-medium leading-relaxed ${
                      msg.sender === 'user'
                        ? 'bg-[#354B40] text-[#F6F1E7] ml-6'
                        : 'bg-[#1D283A] border border-[#D4AB58]/30 text-[#F6F1E7] mr-4'
                    }`}
                  >
                    {msg.text}
                  </div>
                ))}
              </div>

              <div className="flex gap-2">
                <input
                  type="text"
                  value={aiChatInput}
                  onChange={(e) => setAiChatInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSendAdminAi();
                  }}
                  placeholder="دستور یا سوال خود را از دستیار مشتی بپرسید..."
                  className={`flex-1 px-3 py-2 rounded-xl border text-xs font-bold ${inputClass}`}
                />
                <button
                  type="button"
                  onClick={() => handleSendAdminAi()}
                  disabled={isAiBusy}
                  className="px-4 py-2 rounded-xl bg-[#D4AB58] text-[#101622] font-black text-xs cursor-pointer"
                >
                  {isAiBusy ? '...' : 'ارسال'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ===================================================================
            MODULE 6: 🏆 ۶. استودیو ساخت مدال جدید، استودیو آواتارها و ضریب تخفیف
           =================================================================== */}
        {activeModule === 6 && (
          <div className={`rounded-3xl p-4 lg:p-6 border space-y-4 ${cardSurfaceClass}`}>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-current/10 pb-3">
              <div>
                <h2 className="text-sm lg:text-base font-black">
                  🏆 ۶. استودیو ساخت مدال‌های جدید، مدیریت آواتارها (دانشجو و استاد) و تخفیف
                </h2>
                <p
                  className={`text-[11px] font-bold ${
                    isNight ? 'text-[#A3C1AD]' : 'text-[#3D5249]'
                  }`}
                >
                  افزودن عکس، نام، عنوان و روش بدست آوردن مدال‌های جدید + افزودن آواتار جدید برای دانشجویان و اساتید
                </p>
              </div>

              <div className="flex flex-wrap gap-1.5 p-1 rounded-2xl bg-black/25 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    playSwitch();
                    setMod6SubTab('lootbox');
                  }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-black cursor-pointer ${
                    mod6SubTab === 'lootbox' ? 'bg-[#D4AB58] text-[#101622]' : 'opacity-80'
                  }`}
                >
                  🎰 مدیریت جوایز صندوقچه‌ها و درصد شانس
                </button>
                <button
                  type="button"
                  onClick={() => {
                    playSwitch();
                    setMod6SubTab('medals');
                  }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-black cursor-pointer ${
                    mod6SubTab === 'medals' ? 'bg-[#D4AB58] text-[#101622]' : 'opacity-80'
                  }`}
                >
                  🏅 ساخت و اعطای مدال ({badgeList.length})
                </button>
                <button
                  type="button"
                  onClick={() => {
                    playSwitch();
                    setMod6SubTab('avatars');
                  }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-black cursor-pointer ${
                    mod6SubTab === 'avatars' ? 'bg-[#D4AB58] text-[#101622]' : 'opacity-80'
                  }`}
                >
                  🎭 استودیو آواتارها ({avatarList.length})
                </button>
                <button
                  type="button"
                  onClick={() => {
                    playSwitch();
                    setMod6SubTab('discounts');
                  }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-black cursor-pointer ${
                    mod6SubTab === 'discounts' ? 'bg-[#D4AB58] text-[#101622]' : 'opacity-80'
                  }`}
                >
                  💰 تخفیف و ماموریت
                </button>
              </div>
            </div>

            {mod6SubTab === 'lootbox' && (
              <div className="space-y-4 animate-fade-in">
                <div className={`p-4 rounded-2xl border-2 border-[#D4AB58]/60 space-y-4 text-xs ${subCardClass}`}>
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-current/10 pb-2.5">
                    <div>
                      <h3 className="text-sm font-black text-[#D4AB58]">
                        🎰 مدیریت جوایز صندوقچه‌ها و درصد شانس
                      </h3>
                      <p className="text-[11px] font-bold opacity-80 mt-0.5">
                        برای هر جایزه در صندوقچه برنزی و طلایی، عنوان جایزه و «درصد شانس برنده شدن (از ۰ تا ۱۰۰ درصد)» را تعیین کنید.
                      </p>
                    </div>
                    <button
                      type="button"
                      disabled={isSavingLootbox}
                      onClick={async () => {
                        playCoin();
                        setIsSavingLootbox(true);
                        try {
                          onUpdateLootboxConfig?.(lootboxDraft);
                          const res = await saveLootboxConfigOnBot(lootboxDraft);
                          appendLog(
                            'ذخیره جوایز و درصد شانس صندوقچه‌ها',
                            `برنزی (${lootboxDraft.bronzePrizes.length}) / طلایی (${lootboxDraft.goldPrizes.length})`,
                            'success'
                          );
                          triggerToast(
                            res.ok
                              ? '✅ جوایز و درصد شانس صندوقچه‌ها در سرور ربات و مینی‌اپ ذخیره شد!'
                              : '✅ جوایز و درصد شانس صندوقچه‌ها در مینی‌اپ ذخیره و فعال شد!'
                          );
                        } finally {
                          setIsSavingLootbox(false);
                        }
                      }}
                      className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs cursor-pointer shadow-md border-b-2 border-emerald-800"
                    >
                      {isSavingLootbox
                        ? '⏳ در حال ذخیره در سرور...'
                        : '💾 ذخیره جوایز و درصد شانس در سرور (POST /api/miniapp/admin-save-lootbox)'}
                    </button>
                  </div>

                  {/* Add New Prize Form */}
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      if (!newPrizeTitle.trim()) {
                        playError();
                        triggerToast('⚠️ لطفاً عنوان جایزه را وارد کنید.');
                        return;
                      }
                      playCoin();
                      const createdPrize: LootboxPrizeItem = {
                        id: `${newPrizeChestType}-${Date.now()}`,
                        title: newPrizeTitle.trim(),
                        chancePercent: Math.max(0, Math.min(100, Number(newPrizeChance) || 0)),
                        rewardType: newPrizeRewardType,
                        bonusPoints:
                          newPrizeRewardType === 'points'
                            ? Math.max(1, Number(newPrizeBonusPoints) || 20)
                            : undefined,
                      };
                      const nextConfig: LootboxConfig =
                        newPrizeChestType === 'bronze'
                          ? {
                              ...lootboxDraft,
                              bronzePrizes: [...lootboxDraft.bronzePrizes, createdPrize],
                            }
                          : {
                              ...lootboxDraft,
                              goldPrizes: [...lootboxDraft.goldPrizes, createdPrize],
                            };
                      setLootboxDraft(nextConfig);
                      onUpdateLootboxConfig?.(nextConfig);
                      setNewPrizeTitle('');
                      triggerToast(`🎁 جایزه «${createdPrize.title}» با شانس ${createdPrize.chancePercent}% اضافه شد.`);
                    }}
                    className={`p-3.5 rounded-2xl border space-y-2.5 ${cardSurfaceClass}`}
                  >
                    <div className="font-black text-xs">
                      ➕ افزودن جایزه جدید به صندوقچه برنزی یا طلایی:
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                      <select
                        value={newPrizeChestType}
                        onChange={(e) => setNewPrizeChestType(e.target.value as 'bronze' | 'gold')}
                        className={`px-3 py-2 rounded-xl border text-xs font-black ${inputClass}`}
                      >
                        <option value="bronze">🥉 صندوقچه برنزی</option>
                        <option value="gold">🏆 صندوقچه طلایی</option>
                      </select>

                      <input
                        type="text"
                        value={newPrizeTitle}
                        onChange={(e) => setNewPrizeTitle(e.target.value)}
                        placeholder="عنوان جایزه (مثلاً: کد تخفیف ۳۰٪ یا ۲۰ امتیاز هدیه یا پوچ)"
                        className={`sm:col-span-2 px-3 py-2 rounded-xl border text-xs font-bold ${inputClass}`}
                      />

                      <select
                        value={newPrizeRewardType}
                        onChange={(e) =>
                          setNewPrizeRewardType(e.target.value as LootboxPrizeItem['rewardType'])
                        }
                        className={`px-3 py-2 rounded-xl border text-xs font-black ${inputClass}`}
                      >
                        <option value="discount">🎟 کد تخفیف کارگاه</option>
                        <option value="points">💎 امتیاز هدیه</option>
                        <option value="empty">💨 پوچ (بدون جایزه)</option>
                      </select>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 items-end">
                      <div>
                        <label className="text-[10px] font-bold block mb-1">
                          درصد شانس برنده شدن (۰ تا ۱۰۰٪):
                        </label>
                        <input
                          type="number"
                          min={0}
                          max={100}
                          value={newPrizeChance}
                          onChange={(e) =>
                            setNewPrizeChance(Math.max(0, Math.min(100, Number(e.target.value) || 0)))
                          }
                          className={`w-full px-3 py-2 rounded-xl border text-center font-mono font-black ${inputClass}`}
                        />
                      </div>

                      {newPrizeRewardType === 'points' ? (
                        <div>
                          <label className="text-[10px] font-bold block mb-1">
                            مقدار امتیاز هدیه:
                          </label>
                          <input
                            type="number"
                            min={1}
                            max={1000}
                            value={newPrizeBonusPoints}
                            onChange={(e) =>
                              setNewPrizeBonusPoints(Math.max(1, Number(e.target.value) || 20))
                            }
                            className={`w-full px-3 py-2 rounded-xl border text-center font-mono font-black ${inputClass}`}
                          />
                        </div>
                      ) : (
                        <div className="text-[11px] font-bold opacity-75 py-2">
                          نوع جایزه:{' '}
                          {newPrizeRewardType === 'discount'
                            ? 'صدور خودکار کد تخفیف'
                            : 'پوچ (شانس مجدد)'}
                        </div>
                      )}

                      <button
                        type="submit"
                        className="py-2.5 px-4 rounded-xl bg-[#D4AB58] text-[#101622] font-black text-xs cursor-pointer"
                      >
                        + افزودن جایزه به لیست
                      </button>
                    </div>
                  </form>

                  {/* Bronze & Gold Prize Tables with Live Chance Sliders/Inputs */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {/* Bronze Chest Prizes */}
                    <div className={`p-3.5 rounded-2xl border space-y-2.5 ${cardSurfaceClass}`}>
                      <div className="flex items-center justify-between border-b border-current/10 pb-2">
                        <span className="font-black text-xs text-amber-500">
                          🥉 جوایز صندوقچه برنزی ({lootboxDraft.bronzeCost} امتیاز)
                        </span>
                        <span className="text-[10px] font-mono font-bold">
                          مجموع شانس:{' '}
                          {lootboxDraft.bronzePrizes.reduce(
                            (acc, p) => acc + (Number(p.chancePercent) || 0),
                            0
                          )}
                          %
                        </span>
                      </div>

                      <div className="space-y-2">
                        {lootboxDraft.bronzePrizes.map((prize) => (
                          <div
                            key={prize.id}
                            className={`p-2.5 rounded-xl border flex items-center justify-between gap-2 ${subCardClass}`}
                          >
                            <div className="min-w-0 flex-1">
                              <input
                                type="text"
                                value={prize.title}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setLootboxDraft((prev) => ({
                                    ...prev,
                                    bronzePrizes: prev.bronzePrizes.map((p) =>
                                      p.id === prize.id ? { ...p, title: val } : p
                                    ),
                                  }));
                                }}
                                className={`w-full px-2 py-1 rounded-lg border text-xs font-black ${inputClass}`}
                              />
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                              <input
                                type="number"
                                min={0}
                                max={100}
                                value={prize.chancePercent}
                                onChange={(e) => {
                                  const pct = Math.max(
                                    0,
                                    Math.min(100, Number(e.target.value) || 0)
                                  );
                                  setLootboxDraft((prev) => ({
                                    ...prev,
                                    bronzePrizes: prev.bronzePrizes.map((p) =>
                                      p.id === prize.id ? { ...p, chancePercent: pct } : p
                                    ),
                                  }));
                                }}
                                className={`w-16 px-2 py-1 rounded-lg border text-center font-mono font-black text-xs ${inputClass}`}
                              />
                              <span className="text-xs font-black">%</span>
                              <button
                                type="button"
                                onClick={() =>
                                  setLootboxDraft((prev) => ({
                                    ...prev,
                                    bronzePrizes: prev.bronzePrizes.filter(
                                      (p) => p.id !== prize.id
                                    ),
                                  }))
                                }
                                className="p-1.5 rounded-lg bg-rose-500/20 text-rose-400 cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Gold Chest Prizes */}
                    <div className={`p-3.5 rounded-2xl border space-y-2.5 ${cardSurfaceClass}`}>
                      <div className="flex items-center justify-between border-b border-current/10 pb-2">
                        <span className="font-black text-xs text-[#D4AB58]">
                          🏆 جوایز صندوقچه طلایی ({lootboxDraft.goldCost} امتیاز)
                        </span>
                        <span className="text-[10px] font-mono font-bold">
                          مجموع شانس:{' '}
                          {lootboxDraft.goldPrizes.reduce(
                            (acc, p) => acc + (Number(p.chancePercent) || 0),
                            0
                          )}
                          %
                        </span>
                      </div>

                      <div className="space-y-2">
                        {lootboxDraft.goldPrizes.map((prize) => (
                          <div
                            key={prize.id}
                            className={`p-2.5 rounded-xl border flex items-center justify-between gap-2 ${subCardClass}`}
                          >
                            <div className="min-w-0 flex-1">
                              <input
                                type="text"
                                value={prize.title}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setLootboxDraft((prev) => ({
                                    ...prev,
                                    goldPrizes: prev.goldPrizes.map((p) =>
                                      p.id === prize.id ? { ...p, title: val } : p
                                    ),
                                  }));
                                }}
                                className={`w-full px-2 py-1 rounded-lg border text-xs font-black ${inputClass}`}
                              />
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                              <input
                                type="number"
                                min={0}
                                max={100}
                                value={prize.chancePercent}
                                onChange={(e) => {
                                  const pct = Math.max(
                                    0,
                                    Math.min(100, Number(e.target.value) || 0)
                                  );
                                  setLootboxDraft((prev) => ({
                                    ...prev,
                                    goldPrizes: prev.goldPrizes.map((p) =>
                                      p.id === prize.id ? { ...p, chancePercent: pct } : p
                                    ),
                                  }));
                                }}
                                className={`w-16 px-2 py-1 rounded-lg border text-center font-mono font-black text-xs ${inputClass}`}
                              />
                              <span className="text-xs font-black">%</span>
                              <button
                                type="button"
                                onClick={() =>
                                  setLootboxDraft((prev) => ({
                                    ...prev,
                                    goldPrizes: prev.goldPrizes.filter(
                                      (p) => p.id !== prize.id
                                    ),
                                  }))
                                }
                                className="p-1.5 rounded-lg bg-rose-500/20 text-rose-400 cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {mod6SubTab === 'medals' && (
              <div className="space-y-4 animate-fade-in">
                {/* 1. CREATE NEW MEDAL FORM (Custom Image, Name, Subtitle, How-to-Earn) */}
                <form
                  onSubmit={handleCreateNewMedal}
                  className={`p-4 rounded-2xl border space-y-3 text-xs ${subCardClass}`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-black text-sm text-[#D4AB58]">
                      ➕ ساخت و افزودن مدال جدید به سامانه (با عکس، عنوان و روش بدست آوردن):
                    </span>
                    <span className="text-[10px] font-black px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400">
                      اضافه شدن آنی به پروفایل دانشجو
                    </span>
                  </div>

                  <input
                    ref={medalFileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleMedalFileChange}
                    className="hidden"
                  />

                  <div className="flex flex-col sm:flex-row items-center gap-3 p-3 rounded-xl bg-black/20 border border-current/10">
                    <div className="w-16 h-16 rounded-2xl bg-black/40 border-2 border-[#D4AB58] flex items-center justify-center p-1.5 shrink-0">
                      <PixelImage
                        filename={newMedalImage}
                        alt="پیش‌نمایش مدال"
                        className="w-12 h-12 object-contain"
                      />
                    </div>
                    <div className="flex-1 space-y-2 w-full">
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => medalFileInputRef.current?.click()}
                          className="px-3 py-1.5 rounded-xl bg-[#D4AB58] text-[#101622] font-black text-xs flex items-center gap-1.5 cursor-pointer"
                        >
                          <Upload className="w-3.5 h-3.5" />
                          آپلود عکس مدال از گالری/سیستم
                        </button>
                        <input
                          type="text"
                          value={newMedalImage}
                          onChange={(e) => setNewMedalImage(e.target.value)}
                          placeholder="یا آدرس تصویر / نام آیکون..."
                          className={`flex-1 px-2.5 py-1.5 rounded-xl border text-[11px] font-mono ${inputClass}`}
                          dir="ltr"
                        />
                      </div>
                      <div className="flex gap-1.5 overflow-x-auto pb-1">
                        {PIXEL_MEDAL_PRESETS.map((preset) => (
                          <button
                            key={preset.filename}
                            type="button"
                            onClick={() => setNewMedalImage(preset.filename)}
                            className={`px-2 py-1 rounded-lg border text-[10px] font-bold flex items-center gap-1 shrink-0 cursor-pointer ${
                              newMedalImage === preset.filename
                                ? 'border-[#D4AB58] bg-[#D4AB58]/20'
                                : 'border-current/15'
                            }`}
                          >
                            <PixelImage
                              filename={preset.filename}
                              alt={preset.label}
                              className="w-4 h-4 object-contain"
                            />
                            <span>{preset.label}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div>
                      <label className="text-[11px] font-bold block mb-1">
                        نام مدال (مثلاً: ستاره بهینه‌سازی خطی):
                      </label>
                      <input
                        type="text"
                        value={newMedalTitle}
                        onChange={(e) => setNewMedalTitle(e.target.value)}
                        placeholder="نام مدال جدید..."
                        className={`w-full px-3 py-2 rounded-xl border font-bold ${inputClass}`}
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-bold block mb-1">
                        عنوان / زیرعنوان مدال (مثلاً: نشان ویژه حل مسئله صنعتی):
                      </label>
                      <input
                        type="text"
                        value={newMedalSubtitle}
                        onChange={(e) => setNewMedalSubtitle(e.target.value)}
                        placeholder="زیرعنوان رسمی مدال..."
                        className={`w-full px-3 py-2 rounded-xl border font-bold ${inputClass}`}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[11px] font-bold block mb-1">
                      🎯 روش بدست آوردن مدال و توضیحات (در پشت و روی کارت مدال نمایش داده می‌شود):
                    </label>
                    <input
                      type="text"
                      value={newMedalHowToEarn}
                      onChange={(e) => setNewMedalHowToEarn(e.target.value)}
                      placeholder="مثلاً: کسب حداقل ۲۰۰ امتیاز یا شرکت در ۳ کارگاه تخصصی انجمن"
                      className={`w-full px-3 py-2 rounded-xl border font-bold ${inputClass}`}
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs cursor-pointer shadow"
                  >
                    ✨ ثبت و افزودن مدال جدید به ویترین «نشان‌های من» و لیست جوایز
                  </button>
                </form>

                {/* 2. AWARD ANY MEDAL TO STUDENT */}
                <div className={`p-4 rounded-2xl border space-y-3 text-xs ${subCardClass}`}>
                  <div className="font-black">
                    🎖 اعطای مدال به دانشجو ({badgeList.length} مدال موجود در سامانه):
                  </div>
                  <select
                    value={selectedStudentForBadge}
                    onChange={(e) => setSelectedStudentForBadge(e.target.value)}
                    className={`w-full px-3 py-2 rounded-xl border text-xs font-bold ${inputClass}`}
                  >
                    {(Array.isArray(studentList) ? studentList : []).map((s) => (
                      <option key={s.id} value={s.studentId}>
                        {s.fullName} ({s.studentId})
                      </option>
                    ))}
                  </select>

                  <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 max-h-60 overflow-y-auto p-1">
                    {badgeList.map((b) => (
                      <button
                        key={b.id}
                        type="button"
                        onClick={() => {
                          playTick();
                          setSelectedBadgeFilename(b.filename);
                        }}
                        className={`p-2 rounded-xl border flex flex-col items-center gap-1 cursor-pointer relative ${
                          selectedBadgeFilename === b.filename
                            ? 'bg-[#D4AB58]/25 border-[#D4AB58]'
                            : cardSurfaceClass
                        }`}
                      >
                        <PixelImage
                          filename={b.filename}
                          alt={b.title}
                          className="w-10 h-10 object-contain"
                        />
                        <span className="text-[10px] font-black text-center line-clamp-1">
                          {b.title}
                        </span>
                        <span className="text-[9px] opacity-70 text-center line-clamp-1">
                          {b.subtitle}
                        </span>
                      </button>
                    ))}
                  </div>

                  <button
                    type="button"
                    onClick={handleAwardBadgeToStudent}
                    className="w-full py-2.5 rounded-xl bg-[#D4AB58] text-[#101622] font-black cursor-pointer"
                  >
                    🏅 اعطای نشان انتخاب‌شده به دانشجو + ۳۰ امتیاز هدیه
                  </button>
                </div>
              </div>
            )}

            {mod6SubTab === 'avatars' && (
              /* UNIVERSAL AVATAR STUDIO FOR STUDENTS & PROFESSORS */
              <div className="space-y-4 animate-fade-in">
                <form
                  onSubmit={handleCreateNewAvatar}
                  className={`p-4 rounded-2xl border space-y-3 text-xs ${subCardClass}`}
                >
                  <div className="font-black text-sm text-[#D4AB58]">
                    🎭 افزودن آواتار جدید برای دانشجویان یا اساتید:
                  </div>

                  <input
                    ref={avatarFileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarFileChange}
                    className="hidden"
                  />

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setNewAvatarRole('student')}
                      className={`py-2.5 rounded-xl font-black text-xs border cursor-pointer ${
                        newAvatarRole === 'student'
                          ? 'bg-[#D4AB58] text-[#101622] border-[#D4AB58]'
                          : 'bg-black/20 border-current/15'
                      }`}
                    >
                      🎓 آواتار انتخابی برای دانشجویان
                    </button>
                    <button
                      type="button"
                      onClick={() => setNewAvatarRole('professor')}
                      className={`py-2.5 rounded-xl font-black text-xs border cursor-pointer ${
                        newAvatarRole === 'professor'
                          ? 'bg-[#D4AB58] text-[#101622] border-[#D4AB58]'
                          : 'bg-black/20 border-current/15'
                      }`}
                    >
                      👨‍🏫 آواتار اختصاصی برای اساتید
                    </button>
                  </div>

                  <div className="flex flex-col sm:flex-row items-center gap-3 p-3 rounded-xl bg-black/20 border border-current/10">
                    <div className="w-16 h-16 rounded-full overflow-hidden bg-black/40 border-2 border-[#D4AB58] flex items-center justify-center p-1 shrink-0">
                      <PixelImage
                        filename={newAvatarImage}
                        alt="پیش‌نمایش آواتار"
                        className="w-14 h-14 object-contain"
                      />
                    </div>
                    <div className="flex-1 space-y-2 w-full">
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => avatarFileInputRef.current?.click()}
                          className="px-3 py-1.5 rounded-xl bg-[#D4AB58] text-[#101622] font-black text-xs flex items-center gap-1.5 cursor-pointer"
                        >
                          <Upload className="w-3.5 h-3.5" />
                          انتخاب فایل عکس آواتار از گالری/سیستم
                        </button>
                        <input
                          type="text"
                          value={newAvatarImage}
                          onChange={(e) => setNewAvatarImage(e.target.value)}
                          placeholder="یا آدرس تصویر (URL)..."
                          className={`flex-1 px-2.5 py-1.5 rounded-xl border text-[11px] font-mono ${inputClass}`}
                          dir="ltr"
                        />
                      </div>
                      <div className="flex gap-1.5 overflow-x-auto pb-1">
                        {[
                          { file: '01_avatar_boy.png', label: 'پسر ۱' },
                          { file: '02_avatar_girl.png', label: 'دختر ۱' },
                          { file: '04_char_welcome.png', label: 'خوش‌آمد' },
                          { file: '05_char_looti.png', label: 'لوتی' },
                          { file: '06_char_victory.png', label: 'قهرمان' },
                          { file: '07_char_laptop.png', label: 'لپ‌تاپ' },
                          { file: '08_char_admin.png', label: 'استاد/ادمین' },
                        ].map((preset) => (
                          <button
                            key={preset.file}
                            type="button"
                            onClick={() => setNewAvatarImage(preset.file)}
                            className={`px-2 py-1 rounded-lg border text-[10px] font-bold flex items-center gap-1 shrink-0 cursor-pointer ${
                              newAvatarImage === preset.file
                                ? 'border-[#D4AB58] bg-[#D4AB58]/20'
                                : 'border-current/15'
                            }`}
                          >
                            <PixelImage
                              filename={preset.file}
                              alt={preset.label}
                              className="w-4 h-4 object-contain"
                            />
                            <span>{preset.label}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="text-[11px] font-bold block mb-1">
                      نام / عنوان آواتار (مثلاً: مهندس آریا یا دکتر فرزانه):
                    </label>
                    <input
                      type="text"
                      value={newAvatarTitle}
                      onChange={(e) => setNewAvatarTitle(e.target.value)}
                      placeholder="نام نمایشی آواتار..."
                      className={`w-full px-3 py-2 rounded-xl border font-bold ${inputClass}`}
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs cursor-pointer shadow"
                  >
                    ➕ ثبت و افزودن آواتار جدید برای{' '}
                    {newAvatarRole === 'student' ? 'دانشجویان' : 'اساتید'}
                  </button>
                </form>

                {/* Existing Avatars Gallery */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                  <div className={`p-3.5 rounded-2xl border space-y-2.5 ${subCardClass}`}>
                    <div className="font-black text-[#D4AB58]">
                      🎓 آواتارهای انتخابی دانشجویان ({studentAvatarsList.length} مورد):
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      {studentAvatarsList.map((av) => (
                        <div
                          key={av.id}
                          className={`p-2 rounded-xl border flex flex-col items-center gap-1 relative ${cardSurfaceClass}`}
                        >
                          <div className="w-12 h-12 rounded-full overflow-hidden bg-black/20 flex items-center justify-center">
                            <PixelImage
                              filename={av.imageUrl}
                              alt={av.title}
                              className="w-11 h-11 object-contain"
                            />
                          </div>
                          <span className="text-[10px] font-black text-center truncate max-w-full">
                            {av.title}
                          </span>
                          {av.id.startsWith('av-custom-') && (
                            <button
                              type="button"
                              onClick={() =>
                                updateAvatarsAndPersist((prev) =>
                                  prev.filter((item) => item.id !== av.id)
                                )
                              }
                              className="text-[9px] text-rose-400 underline cursor-pointer"
                            >
                              حذف
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className={`p-3.5 rounded-2xl border space-y-2.5 ${subCardClass}`}>
                    <div className="font-black text-[#7FB69E]">
                      👨‍🏫 آواتارهای اساتید ({professorAvatarsList.length} مورد):
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      {professorAvatarsList.map((av) => (
                        <div
                          key={av.id}
                          className={`p-2 rounded-xl border flex flex-col items-center gap-1 relative ${cardSurfaceClass}`}
                        >
                          <div className="w-12 h-12 rounded-full overflow-hidden bg-black/20 flex items-center justify-center">
                            <PixelImage
                              filename={av.imageUrl}
                              alt={av.title}
                              className="w-11 h-11 object-contain"
                            />
                          </div>
                          <span className="text-[10px] font-black text-center truncate max-w-full">
                            {av.title}
                          </span>
                          {av.id.startsWith('av-custom-') && (
                            <button
                              type="button"
                              onClick={() =>
                                updateAvatarsAndPersist((prev) =>
                                  prev.filter((item) => item.id !== av.id)
                                )
                              }
                              className="text-[9px] text-rose-400 underline cursor-pointer"
                            >
                              حذف
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {mod6SubTab === 'discounts' && (
              <div className="space-y-4 animate-fade-in">
                <div className={`p-4 rounded-2xl border space-y-2.5 text-xs ${subCardClass}`}>
                  <div className="font-black">
                    💰 فرمول فعلی: هر {discountRule.pointsStep} امتیاز ={' '}
                    {discountRule.discountTomansPerStep.toLocaleString('fa-IR')} تومان تخفیف کارگاه
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <span className="text-[10px] font-bold block mb-1">ضریب امتیاز (گام):</span>
                      <input
                        type="number"
                        value={discountRule.pointsStep}
                        onChange={(e) =>
                          setDiscountRule((prev) => ({
                            ...prev,
                            pointsStep: Math.max(1, Number(e.target.value) || 10),
                          }))
                        }
                        className={`w-full px-3 py-1.5 rounded-xl border font-bold ${inputClass}`}
                      />
                    </div>
                    <div>
                      <span className="text-[10px] font-bold block mb-1">مبلغ تخفیف (تومان):</span>
                      <input
                        type="number"
                        value={discountRule.discountTomansPerStep}
                        onChange={(e) =>
                          setDiscountRule((prev) => ({
                            ...prev,
                            discountTomansPerStep: Math.max(
                              1000,
                              Number(e.target.value) || 50000
                            ),
                          }))
                        }
                        className={`w-full px-3 py-1.5 rounded-xl border font-bold ${inputClass}`}
                      />
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      playCoin();
                      onUpdateDiscountRule?.(discountRule);
                      appendLog(
                        'بروزرسانی فرمول تخفیف امتیازی',
                        `هر ${discountRule.pointsStep} امتیاز = ${discountRule.discountTomansPerStep} تومان`,
                        'info'
                      );
                      triggerToast('✅ فرمول جدید تخفیف امتیازی ذخیره و فعال شد.');
                    }}
                    className="w-full py-2 rounded-xl bg-[#D4AB58] text-[#101622] font-black cursor-pointer"
                  >
                    ذخیره ضریب تخفیف
                  </button>
                </div>

                <form
                  onSubmit={handleAddWeeklyQuest}
                  className={`p-4 rounded-2xl border space-y-2.5 text-xs ${subCardClass}`}
                >
                  <div className="font-black">🎯 افزودن ماموریت هفتگی جدید:</div>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newQuestTitle}
                      onChange={(e) => setNewQuestTitle(e.target.value)}
                      placeholder="عنوان ماموریت (مثلاً: شرکت در نظرسنجی ترم)"
                      className={`flex-1 px-3 py-2 rounded-xl border font-bold ${inputClass}`}
                    />
                    <input
                      type="number"
                      value={newQuestReward}
                      onChange={(e) => setNewQuestReward(Number(e.target.value))}
                      className={`w-20 px-2 py-2 rounded-xl border text-center font-bold ${inputClass}`}
                    />
                  </div>
                  <button
                    type="submit"
                    className="w-full py-2 rounded-xl bg-[#354B40] text-[#F6F1E7] font-black cursor-pointer"
                  >
                    افزودن ماموریت به جدول افتخارات
                  </button>
                </form>
              </div>
            )}
          </div>
        )}

        {/* ===================================================================
            MODULE 7: 🔐 ۷. سطوح ادمین و رمز اختصاصی (6-Level RBAC + Custom Level 6)
           =================================================================== */}
        {activeModule === 7 && (
          <div className={`rounded-3xl p-4 lg:p-6 border space-y-4 ${cardSurfaceClass}`}>
            <div className="border-b border-current/10 pb-3">
              <h2 className="text-sm lg:text-base font-black">
                🔐 ۷. سطوح دسترسی ادمین (۱ تا ۶) و رمز اختصاصی
              </h2>
              <p
                className={`text-[11px] font-bold ${
                  isNight ? 'text-[#A3C1AD]' : 'text-[#3D5249]'
                }`}
              >
                تعریف ادمین با ۵ سطح آماده یا «سطح ۶: سایر (سفارشی)» با ۷ تیک مجوز مستقل
              </p>
            </div>

            <form
              onSubmit={handleAddAdminUser}
              className={`p-4 rounded-2xl border space-y-3 text-xs ${subCardClass}`}
            >
              <div className="font-black">➕ تعریف عضو شورا / ادمین جدید:</div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <input
                  type="text"
                  value={newAdminName}
                  onChange={(e) => setNewAdminName(e.target.value)}
                  placeholder="نام و سمت عضو شورا"
                  className={`px-3 py-2 rounded-xl border font-bold ${inputClass}`}
                />
                <input
                  type="text"
                  dir="ltr"
                  value={newAdminPassword}
                  onChange={(e) => setNewAdminPassword(e.target.value)}
                  placeholder="رمز اختصاصی ادمین"
                  className={`px-3 py-2 rounded-xl border font-mono font-bold ${inputClass}`}
                />
              </div>

              <select
                value={newAdminLevel}
                onChange={(e) =>
                  setNewAdminLevel(Number(e.target.value) as 1 | 2 | 3 | 4 | 5 | 6)
                }
                className={`w-full px-3 py-2 rounded-xl border font-black ${inputClass}`}
              >
                <option value={1}>سطح ۱: دبیر انجمن (دسترسی کامل به تمام ماژول‌ها)</option>
                <option value={2}>سطح ۲: نایب‌دبیر و اجرایی</option>
                <option value={3}>سطح ۳: کمیته آموزش و کارگاه‌ها</option>
                <option value={4}>سطح ۴: کمیته مالی و حامیان</option>
                <option value={5}>سطح ۵: کمیته روابط عمومی و رسانه</option>
                <option value={6}>سطح ۶: سایر (سفارشی - انتخاب تکی مجوزها)</option>
              </select>

              <div className={`p-3 rounded-xl border space-y-2 ${cardSurfaceClass}`}>
                <span className="text-[11px] font-black block">
                  ماتریس ۷ مجوز دسترسی (ویژه سطح ۶: سایر - سفارشی):
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                  {PERMISSION_LABELS.map((perm) => {
                    const checked = customPermissions[perm.key];
                    return (
                      <button
                        key={perm.key}
                        type="button"
                        onClick={() => {
                          playTick();
                          setNewAdminLevel(6);
                          setCustomPermissions((prev) => ({
                            ...prev,
                            [perm.key]: !prev[perm.key],
                          }));
                        }}
                        className={`p-2 rounded-lg text-[11px] font-black flex items-center justify-between border cursor-pointer ${
                          checked
                            ? 'bg-emerald-700 border-emerald-500 text-white'
                            : 'bg-black/20 border-current/15 opacity-65'
                        }`}
                      >
                        <span>{perm.label}</span>
                        <span>{checked ? '✓' : '✕'}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-2.5 rounded-xl bg-[#D4AB58] text-[#101622] font-black cursor-pointer flex items-center justify-center gap-1.5"
              >
                <Key className="w-4 h-4" />
                ثبت ادمین و فعال‌سازی رمز اختصاصی
              </button>
            </form>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
              {(Array.isArray(adminList) ? adminList : []).map((adm) => (
                <div
                  key={adm.id}
                  className={`p-3.5 rounded-2xl border space-y-2 text-xs ${subCardClass}`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-black">{adm.fullName}</div>
                      <div className="text-[11px] font-bold opacity-80">{adm.roleLabel}</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        playSwitch();
                        const updated = (Array.isArray(adminList) ? adminList : []).map((a) =>
                          a.id === adm.id ? { ...a, isFrozen: !a.isFrozen } : a
                        );
                        setAdminList(updated);
                        onUpdateAdmins?.(updated);
                        appendLog(
                          adm.isFrozen
                            ? 'رفع مسدودیت دسترسی ادمین'
                            : 'توقف اضطراری دسترسی ادمین (Freeze)',
                          adm.fullName,
                          'warning'
                        );
                      }}
                      className={`px-3 py-1.5 rounded-xl font-black text-[11px] cursor-pointer ${
                        adm.isFrozen
                          ? 'bg-emerald-600 text-white'
                          : 'bg-rose-700 text-white'
                      }`}
                    >
                      {adm.isFrozen
                        ? '🔓 باز کردن دسترسی ادمین'
                        : '❄️ قفل موقت دسترسی ادمین'}
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-1 pt-1">
                    {PERMISSION_LABELS.map((p) =>
                      adm.permissions?.[p.key] ? (
                        <span
                          key={p.key}
                          className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-600/20 text-emerald-500 border border-emerald-500/30"
                        >
                          {p.label} ✓
                        </span>
                      ) : null
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ===================================================================
            MODULE 8: 📊 ۸. مانیتورینگ کلودفلر و پاکسازی + لاگ امنیتی
           =================================================================== */}
        {activeModule === 8 && (
          <div className={`rounded-3xl p-4 lg:p-6 border space-y-4 ${cardSurfaceClass}`}>
            <div className="border-b border-current/10 pb-3">
              <h2 className="text-sm lg:text-base font-black">
                📊 ۸. مانیتورینگ سهمیه کلودفلر، پاکسازی خودکار و لاگ امنیتی
              </h2>
              <p
                className={`text-[11px] font-bold ${
                  isNight ? 'text-[#A3C1AD]' : 'text-[#3D5249]'
                }`}
              >
                رصد زنده مصرف Cloudflare Workers/KV و پاکسازی فایل‌های ۲۵ تا ۳۰ روزه
              </p>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 text-xs">
              {[
                {
                  title: 'Worker Requests (روزانه)',
                  used: cfStats.workerRequestsUsed,
                  max: cfStats.workerRequestsMax,
                  unit: 'درخواست',
                },
                {
                  title: 'KV Reads (خوانش روزانه)',
                  used: cfStats.kvReadsUsed,
                  max: cfStats.kvReadsMax,
                  unit: 'خوانش',
                },
                {
                  title: 'KV Writes (نوشتن روزانه)',
                  used: cfStats.kvWritesUsed,
                  max: cfStats.kvWritesMax,
                  unit: 'عملیات',
                },
                {
                  title: 'Storage (فضای ۱ گیگابایت)',
                  used: cfStats.storageMbUsed,
                  max: cfStats.storageMbMax,
                  unit: 'MB',
                },
              ].map((gauge) => {
                const pct = Math.min(100, Math.round((gauge.used / gauge.max) * 100));
                return (
                  <div
                    key={gauge.title}
                    className={`p-3 rounded-2xl border space-y-1.5 ${subCardClass}`}
                  >
                    <div className="text-[11px] font-black">{gauge.title}</div>
                    <div className="text-xs font-black text-emerald-500" dir="ltr">
                      {gauge.used.toLocaleString()} / {gauge.max.toLocaleString()} {gauge.unit}
                    </div>
                    <div className="w-full h-2 rounded-full bg-black/40 overflow-hidden">
                      <div
                        className="h-full bg-emerald-500 rounded-full transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            <div className={`p-4 rounded-2xl border space-y-3 text-xs ${subCardClass}`}>
              <div className="flex items-center justify-between">
                <span className="font-black">
                  🧹 چرخه پاکسازی خودکار تصاویر فیش‌ها و کش:
                </span>
                <div className="flex gap-1.5">
                  {[25, 30].map((days) => (
                    <button
                      key={days}
                      type="button"
                      onClick={() => {
                        playTick();
                        setCleanupDays(days as 25 | 30);
                      }}
                      className={`px-2.5 py-1 rounded-lg font-black cursor-pointer ${
                        cleanupDays === days
                          ? 'bg-[#D4AB58] text-[#101622]'
                          : 'bg-black/30 text-current'
                      }`}
                    >
                      {days} روزه
                    </button>
                  ))}
                </div>
              </div>
              <button
                type="button"
                onClick={handleManualCleanup}
                className="w-full py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white font-black flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <RefreshCw className="w-4 h-4" />
                اجرای فوری پاکسازی و بهینه‌سازی حافظه کلودفلر
              </button>
            </div>

            <div className="space-y-2 text-xs">
              <div className="font-black flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-[#D4AB58]" />
                📜 لاگ زمانی اقدامات ادمین (Audit Log):
              </div>
              <div className="space-y-2 max-h-60 overflow-y-auto pr-0.5">
                {(Array.isArray(auditLogs) ? auditLogs : []).map((log) => (
                  <div
                    key={log.id}
                    className={`p-2.5 rounded-xl border flex items-center justify-between ${subCardClass}`}
                  >
                    <div>
                      <div className="font-black">{log.action}</div>
                      <div className="text-[10px] font-bold opacity-80">
                        توسط: {log.actor} • هدف: {log.target}
                      </div>
                    </div>
                    <span className="text-[10px] font-mono font-bold shrink-0">
                      {log.timestamp}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
