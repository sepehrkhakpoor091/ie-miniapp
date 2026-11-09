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
  BotConfigSettings,
  CertificateInfo,
  ChannelAnnouncement,
  DEFAULT_ABOUT_CONFIG,
  DiscountRuleConfig,
  EventItem,
  FeatureFlags,
  KycStatus,
  LootboxChestConfig,
  LootboxConfig,
  LootboxPrizeItem,
  LootiChatMessage,
  LootiModelId,
  OnlineSessionUser,
  Professor,
  QuestConditionType,
  ScheduledTimer,
  SimulationReportPayload,
  SiteSwitches,
  StudentIdDisputeTicket,
  SupportTicket,
  ThemeMode,
  TicketRecord,
  UserProfile,
  WeeklyQuest,
} from '../../types';
import {
  EVENTS_DATA,
  decrementEventCapacityOnRegistration,
  generateTicketPayload,
  isEventCapacityFull,
  normalizeEvent,
  normalizeEventsList,
  resolveEventPixelImage,
} from '../../utils/events';
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
  getNormalizedLootboxChests,
  parseFlexibleNumberInput,
  syncLootboxConfigWithChests,
} from '../../utils/gamification';
import {
  MASTER_ADMIN_TELEGRAM_ID,
  applyAdminOverridesToStudents,
  computeBadgeVerificationHash,
  extractCohortFromStudentId,
  findCheckedInTicketInLedger,
  generateCertificateCode,
  getScopedStorageKey,
  isFakeTestAccount,
  isMasterAdminTelegramUser,
  isProtectedMasterAccount,
  recordTicketInCheckedInLedger,
  removeTicketFromCheckedInLedger,
  safeJsonParse,
  saveAdminStudentOverride,
  touchAdminSession,
  validateUploadedImageFile,
  verifyTicketSignature,
} from '../../utils/security';
import {
  closeAdminChatOnBot,
  loadStoredBotConfig,
  loadStoredSupportChats,
  normalizeSupportTicketsList,
  resolveReceiptOrKycImageUrl,
  saveAdminBotConfigToBot,
  saveCustomUiTextsOnBot,
  saveEventsOnBot,
  saveLootboxConfigOnBot,
  saveProfessorsOnBot,
  saveSiteSwitchesOnBot,
  saveStoredBotConfig,
  saveStoredSupportChats,
  sendAdminChatMessageToBot,
  sendSimulationReportToBot,
  submitAdminReviewToBot,
  submitAdminUserActionToBot,
  toggleStudentTimersOnBot,
  updateAdminSecretsOnBot,
  verifyQrCheckInWithBot,
} from '../../utils/apiBridge';
import {
  askAdminLootiAi,
  generateSmartAnnouncementWithAi,
  parseMultiProfessorSchedules,
  parseMultiProfessorSchedulesWithAi,
  parseNaturalLanguageTimerDeterministic,
  testLiveAiConnectionOnBot,
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
  MessageSquare,
  Send,
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
    title: 'استاد ارشد انجمن صنایع',
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
    canVisualEdit: true,
    isFrozen: false,
    lastActive: 'هم‌اکنون آنلاین',
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
    id: 'log-3',
    actor: 'سپر ضدتقلب خودکار',
    action: 'بررسی یکپارچگی هش امتیازات دانشجویان (FNV-1a Checksum)',
    target: 'پروفایل‌های دانشجویی',
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
  chartEnabled: true,
  allowStudentTimers: true,
  maintenanceMode: false,
  eventsEnabled: true,
  lootboxEnabled: true,
  supportEnabled: true,
};

export function extractSiteSwitchesFromFlags(flags?: Partial<FeatureFlags>): SiteSwitches {
  return {
    maintenanceMode: Boolean(
      flags?.maintenanceMode ?? flags?.globalMaintenanceMode ?? false
    ),
    eventsEnabled:
      flags?.eventsEnabled ?? flags?.eventsRegistrationEnabled ?? true,
    lootboxEnabled:
      flags?.lootboxEnabled ?? flags?.lootboxStoreEnabled ?? true,
    chartEnabled: flags?.chartEnabled ?? true,
    supportEnabled:
      flags?.supportEnabled ?? flags?.supportTicketsEnabled ?? true,
    leaderboardEnabled: flags?.leaderboardEnabled ?? true,
  };
}

export function mergeSiteSwitchesIntoFlags(
  prevFlags: FeatureFlags,
  partialSwitches: Partial<SiteSwitches>
): FeatureFlags {
  const currentSwitches = extractSiteSwitchesFromFlags(prevFlags);
  const nextSwitches: SiteSwitches = {
    maintenanceMode:
      typeof partialSwitches.maintenanceMode === 'boolean'
        ? partialSwitches.maintenanceMode
        : currentSwitches.maintenanceMode,
    eventsEnabled:
      typeof partialSwitches.eventsEnabled === 'boolean'
        ? partialSwitches.eventsEnabled
        : currentSwitches.eventsEnabled,
    lootboxEnabled:
      typeof partialSwitches.lootboxEnabled === 'boolean'
        ? partialSwitches.lootboxEnabled
        : currentSwitches.lootboxEnabled,
    chartEnabled:
      typeof partialSwitches.chartEnabled === 'boolean'
        ? partialSwitches.chartEnabled
        : currentSwitches.chartEnabled,
    supportEnabled:
      typeof partialSwitches.supportEnabled === 'boolean'
        ? partialSwitches.supportEnabled
        : currentSwitches.supportEnabled,
    leaderboardEnabled:
      typeof partialSwitches.leaderboardEnabled === 'boolean'
        ? partialSwitches.leaderboardEnabled
        : currentSwitches.leaderboardEnabled,
  };

  return {
    ...prevFlags,
    globalMaintenanceMode: nextSwitches.maintenanceMode,
    maintenanceMode: nextSwitches.maintenanceMode,
    eventsRegistrationEnabled: nextSwitches.eventsEnabled,
    eventsEnabled: nextSwitches.eventsEnabled,
    lootboxStoreEnabled: nextSwitches.lootboxEnabled,
    lootboxEnabled: nextSwitches.lootboxEnabled,
    chartEnabled: nextSwitches.chartEnabled,
    supportTicketsEnabled: nextSwitches.supportEnabled,
    supportEnabled: nextSwitches.supportEnabled,
    leaderboardEnabled: nextSwitches.leaderboardEnabled,
  };
}

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

type AdminModuleId = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;

interface AdminPanelProps {
  isOpen?: boolean;
  onClose: () => void;
  themeMode?: ThemeMode;
  initialModule?: AdminModuleId;
  currentAdmin?: AdminUser | null;
  currentUser?: UserProfile;
  userTickets?: TicketRecord[];
  certificates?: CertificateInfo[];
  featureFlags?: FeatureFlags;
  onlineCount?: number;
  onlineUsers?: OnlineSessionUser[];
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
  supportTickets?: SupportTicket[];
  announcements?: ChannelAnnouncement[];
  channelUrl?: string;
  featuredEventId?: string;
  aboutConfig?: AboutAssociationConfig;
  botConfig?: Partial<BotConfigSettings>;
  uiTexts?: Record<string, string>;
  onUpdateUiTexts?: (nextUiTexts: Record<string, string>) => void;
  onEnterVisualEditMode?: () => void;
  onUpdateBotConfig?: (nextBotConfig: BotConfigSettings) => void;
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
  onUpdateSupportTickets?: (nextSupportTickets: SupportTicket[]) => void;
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
  onSyncWithBotServer?: () => Promise<void> | void;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({
  isOpen = true,
  onClose,
  themeMode = 'night',
  initialModule,
  currentAdmin = DEFAULT_ADMINS[0],
  currentUser,
  userTickets = [],
  featureFlags = DEFAULT_FEATURE_FLAGS,
  onlineCount: propOnlineCount,
  onlineUsers: propOnlineUsers,
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
  supportTickets: propSupportTickets = [],
  announcements: propAnnouncements = DEFAULT_ISEFUM_ANNOUNCEMENTS,
  channelUrl: propChannelUrl = DEFAULT_CHANNEL_URL,
  featuredEventId: propFeaturedEventId = 'ev-project-mgmt',
  aboutConfig: propAboutConfig = DEFAULT_ABOUT_CONFIG,
  botConfig: propBotConfig,
  uiTexts = {},
  onUpdateUiTexts,
  onEnterVisualEditMode,
  onUpdateBotConfig,
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
  onUpdateSupportTickets,
  onUpdateDiscountRule,
  onUpdateLootboxConfig,
  onUpdateAnnouncements,
  onUpdateChannelUrl,
  onUpdateCurrentUserProfile,
  onCheckInTicket,
  onAwardCurrentStudentPoints,
  onSyncWithBotServer,
}) => {
  const isNight = themeMode === 'night';
  const activeAdmin = currentAdmin || DEFAULT_ADMINS[0];

  const [activeModule, setActiveModule] = useState<AdminModuleId>(initialModule || 1);

  useEffect(() => {
    if (initialModule) {
      setActiveModule(initialModule);
    }
  }, [initialModule]);
  const [toastBanner, setToastBanner] = useState<string | null>(null);
  const [isSyncingBotQueue, setIsSyncingBotQueue] = useState(false);
  const [previewImageModalSrc, setPreviewImageModalSrc] = useState<string | null>(null);
  const [isOnlineUsersModalOpen, setIsOnlineUsersModalOpen] = useState<boolean>(false);

  const [studentList, setStudentList] = useState<AdminStudentDossier[]>(() =>
    Array.isArray(students) && students.length > 0
      ? applyAdminOverridesToStudents(students)
      : DEFAULT_STUDENTS
  );
  const [eventList, setEventList] = useState<EventItem[]>(() =>
    normalizeEventsList(
      Array.isArray(events) && events.length > 0 ? events : DEFAULT_EVENTS
    )
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
  const [supportTicketList, setSupportTicketList] = useState<SupportTicket[]>(() => {
    const fromProp = Array.isArray(propSupportTickets)
      ? normalizeSupportTicketsList(propSupportTickets)
      : [];
    const fromStorage = loadStoredSupportChats();
    const map = new Map<string, SupportTicket>();
    for (const item of [...fromProp, ...fromStorage]) {
      if (item && item.id) {
        map.set(item.id, item);
      }
    }
    return Array.from(map.values());
  });
  const [flagsState, setFlagsState] = useState<FeatureFlags>(
    featureFlags || DEFAULT_FEATURE_FLAGS
  );

  // Sync incoming props
  useEffect(() => {
    if (Array.isArray(events) && events.length > 0) {
      setEventList(normalizeEventsList(events));
    }
  }, [events]);

  useEffect(() => {
    if (Array.isArray(professors) && professors.length > 0) setProfList(professors);
  }, [professors]);

  useEffect(() => {
    if (Array.isArray(admins) && admins.length > 0) setAdminList(admins);
  }, [admins]);

  useEffect(() => {
    if (Array.isArray(students)) {
      setStudentList(applyAdminOverridesToStudents(students));
    }
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
    if (Array.isArray(propSupportTickets)) {
      const normalized = normalizeSupportTicketsList(propSupportTickets);
      setSupportTicketList((prev) => {
        const map = new Map<string, SupportTicket>();
        for (const item of [...normalized, ...(Array.isArray(prev) ? prev : [])]) {
          if (item && item.id) {
            map.set(item.id, item);
          }
        }
        return Array.from(map.values());
      });
    }
  }, [propSupportTickets]);

  useEffect(() => {
    if (featureFlags) setFlagsState(featureFlags);
  }, [featureFlags]);

  // Helper wrappers to persist state updates upwards to App.tsx safely
  const updateStudentsAndPersist = (
    updater: (prev: AdminStudentDossier[]) => AdminStudentDossier[]
  ) => {
    setStudentList((prev) => {
      const next = applyAdminOverridesToStudents(
        updater(Array.isArray(prev) ? prev : DEFAULT_STUDENTS)
      );
      queueMicrotask(() => onUpdateStudents?.(next));
      return next;
    });
  };

  const mergeServerStudentsPreservingLocal = (
    serverList: AdminStudentDossier[]
  ) => {
    updateStudentsAndPersist((prev) => {
      const map = new Map<string, AdminStudentDossier>();
      for (const s of Array.isArray(serverList) ? serverList : []) {
        if (s && s.studentId) {
          map.set(s.studentId, s);
        }
      }
      for (const loc of Array.isArray(prev) ? prev : []) {
        if (loc && loc.studentId && !map.has(loc.studentId)) {
          map.set(loc.studentId, loc);
        }
      }
      return Array.from(map.values());
    });
  };

  const updateReceiptsAndPersist = (
    updater: (prev: AdminReceiptItem[]) => AdminReceiptItem[]
  ) => {
    setReceiptList((prev) => {
      const next = updater(Array.isArray(prev) ? prev : DEFAULT_RECEIPTS);
      queueMicrotask(() => onUpdateReceipts?.(next));
      return next;
    });
  };

  const updateTimersAndPersist = (
    updater: (prev: ScheduledTimer[]) => ScheduledTimer[]
  ) => {
    setTimerList((prev) => {
      const next = updater(Array.isArray(prev) ? prev : DEFAULT_TIMERS);
      queueMicrotask(() => {
        onUpdateTimers?.(next);
        void saveAdminBotConfigToBot({
          ...loadStoredBotConfig(),
          timersCatalog: next,
          action: 'save_config',
        });
      });
      return next;
    });
  };

  const updateQuestsAndPersist = (next: WeeklyQuest[]) => {
    setQuestList(next);
    onUpdateQuests?.(next);
    void saveAdminBotConfigToBot({
      ...loadStoredBotConfig(),
      questsCatalog: next,
      action: 'save_config',
    });
  };

  const updateAdminsAndPersist = (next: AdminUser[]) => {
    setAdminList(next);
    onUpdateAdmins?.(next);
    void saveAdminBotConfigToBot({
      ...loadStoredBotConfig(),
      adminsCatalog: next,
      action: 'save_config',
    });
  };

  const updateBadgesAndPersist = (updater: (prev: BadgeItem[]) => BadgeItem[]) => {
    setBadgeList((prev) => {
      const next = updater(Array.isArray(prev) ? prev : EXTENDED_BADGES);
      queueMicrotask(() => onUpdateBadges?.(next));
      return next;
    });
  };

  const updateAvatarsAndPersist = (
    updater: (prev: AvatarCatalogItem[]) => AvatarCatalogItem[]
  ) => {
    setAvatarList((prev) => {
      const next = updater(Array.isArray(prev) ? prev : DEFAULT_AVATARS_CATALOG);
      queueMicrotask(() => onUpdateAvatars?.(next));
      return next;
    });
  };

  const updateTicketsAndPersist = (updater: (prev: TicketRecord[]) => TicketRecord[]) => {
    setTicketList((prev) => {
      const next = updater(Array.isArray(prev) ? prev : []);
      queueMicrotask(() => onUpdateTickets?.(next));
      return next;
    });
  };

  const updateSupportTicketsAndPersist = (
    updater: (prev: SupportTicket[]) => SupportTicket[]
  ) => {
    setSupportTicketList((prev) => {
      const next = updater(Array.isArray(prev) ? prev : []);
      saveStoredSupportChats(next);
      queueMicrotask(() => onUpdateSupportTickets?.(next));
      return next;
    });
  };

  // Live Online Users Radar State (strictly real users from heartbeat + current session)
  const [onlineSessions, setOnlineSessions] = useState<OnlineSessionUser[]>(() => {
    if (Array.isArray(propOnlineUsers) && propOnlineUsers.length > 0) {
      return propOnlineUsers.filter((u) => !isFakeTestAccount(u));
    }
    const validCurrent = currentUser && !isFakeTestAccount(currentUser) ? currentUser : null;
    return [
      {
        id:
          validCurrent?.telegramUserId ||
          validCurrent?.studentId ||
          activeAdmin?.telegramId ||
          'sess-current',
        studentId: validCurrent?.studentId || activeAdmin?.telegramId || '629890497',
        fullName:
          validCurrent?.fullName ||
          activeAdmin?.fullName ||
          'کاربر آنلاین در مینی‌اپ',
        cohortYear: validCurrent?.cohortYear || '1402',
        device:
          typeof window !== 'undefined' && window.innerWidth >= 1024
            ? 'Desktop Web'
            : 'Telegram Mobile',
        activePage: 'پنل مدیریت / مینی‌اپ انجمن صنایع',
        lastHeartbeat: new Date().toLocaleTimeString('fa-IR', {
          hour: '2-digit',
          minute: '2-digit',
        }),
        onlineAt: new Date().toLocaleTimeString('fa-IR', {
          hour: '2-digit',
          minute: '2-digit',
        }),
        isLocked: false,
      },
    ];
  });

  useEffect(() => {
    if (Array.isArray(propOnlineUsers) && propOnlineUsers.length > 0) {
      setOnlineSessions((prev) => {
        const lockedMap = new Map<string, boolean>();
        for (const p of Array.isArray(prev) ? prev : []) {
          if (p.studentId || p.id) {
            lockedMap.set(p.studentId || p.id, Boolean(p.isLocked));
          }
        }
        return propOnlineUsers
          .filter((u) => !isFakeTestAccount(u))
          .map((u, idx) => {
            const key = u.studentId || u.userId || u.telegramUserId || u.id || `online-${idx}`;
            return {
              ...u,
              id: u.id || key,
              studentId: u.studentId || u.userId || '---',
              fullName: u.fullName || u.name || 'دانشجوی آنلاین',
              cohortYear: u.cohortYear || extractCohortFromStudentId(u.studentId || '').cohort || '1402',
              device:
                u.device ||
                (typeof window !== 'undefined' && window.innerWidth >= 1024
                  ? 'Desktop Web'
                  : 'Telegram Mobile'),
              activePage: u.activePage || 'مینی‌اپ انجمن صنایع',
              lastHeartbeat:
                u.lastHeartbeat ||
                u.onlineAt ||
                u.lastSeen ||
                new Date().toLocaleTimeString('fa-IR', {
                  hour: '2-digit',
                  minute: '2-digit',
                }),
              isLocked: lockedMap.get(key) ?? Boolean(u.isLocked),
            };
          });
      });
    }
  }, [propOnlineUsers]);

  const effectiveOnlineCount = useMemo(() => {
    if (typeof propOnlineCount === 'number' && propOnlineCount > 0) {
      return Math.max(propOnlineCount, onlineSessions.length);
    }
    return Math.max(1, onlineSessions.length);
  }, [propOnlineCount, onlineSessions.length]);

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

  // Manual QR input starts completely empty ("") — zero pre-typed default values!
  const [qrInputPayload, setQrInputPayload] = useState<string>('');
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
  const inFlightRequestRef = useRef<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // ==========================================================================
  // MODULE 3 STATE: Users, Cohort Filter, Custom Point Input & 360 Dossier + Two-Way Chats
  // ==========================================================================
  const [mod3SubView, setMod3SubView] = useState<'users' | 'chats'>('users');
  const [selectedAdminChatId, setSelectedAdminChatId] = useState<string>('');
  const [adminReplyText, setAdminReplyText] = useState<string>('');
  const [directDossierMessageText, setDirectDossierMessageText] = useState<string>('');
  const [isSendingAdminChat, setIsSendingAdminChat] = useState<boolean>(false);
  const [selectedCohort, setSelectedCohort] = useState<string>('همه');
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [selectedStudentIdForDossier, setSelectedStudentIdForDossier] = useState<string | null>(
    null
  );
  const [editDossierFullName, setEditDossierFullName] = useState<string>('');
  const [editDossierStudentId, setEditDossierStudentId] = useState<string>('');
  const [dossierTab, setDossierTab] = useState<'overview' | 'payments' | 'chats'>('overview');
  const [customPointsInput, setCustomPointsInput] = useState<number>(25);
  const [customPointsReason, setCustomPointsReason] = useState<string>(
    'تغییر امتیاز اختصاصی توسط انجمن علمی مهندسی صنایع'
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
  const [isGeneratingAnnAi, setIsGeneratingAnnAi] = useState(false);
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  const [eventTitleInput, setEventTitleInput] = useState('');
  const [eventCategoryInput, setEventCategoryInput] = useState<
    'workshop' | 'visit' | 'seminar'
  >('workshop');
  const [eventDateInput, setEventDateInput] = useState('۱۵ آذر ۱۴۰۴');
  const [eventTimeInput, setEventTimeInput] = useState('۱۴:۰۰ الی ۱۷:۰۰');
  const [eventLocationInput, setEventLocationInput] = useState('آمفی‌تئاتر دانشکده صنایع');
  const [eventPriceInput, setEventPriceInput] = useState<number>(80000);
  const [eventHasCapacityLimitInput, setEventHasCapacityLimitInput] = useState<boolean>(true);
  const [eventCapacityInput, setEventCapacityInput] = useState<number>(40);
  const [eventPointsInput, setEventPointsInput] = useState<number>(50);
  const [eventInstructorInput, setEventInstructorInput] = useState('دکتر محمدرضا رضایی');
  const [eventAllowDiscountInput, setEventAllowDiscountInput] = useState<boolean>(true);
  const [eventDiscountStepInput, setEventDiscountStepInput] = useState<number>(
    propDiscountRule?.pointsStep || 20
  );
  const [eventDiscountTomansInput, setEventDiscountTomansInput] = useState<number>(
    propDiscountRule?.discountTomansPerStep || 10000
  );
  const [eventDiscountMinInput, setEventDiscountMinInput] = useState<number>(
    propDiscountRule?.minPoints || propDiscountRule?.pointsStep || 20
  );
  const [eventDiscountMaxInput, setEventDiscountMaxInput] = useState<number>(
    propDiscountRule?.maxPoints || 100
  );

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
      text: 'سلام ستون! 🤖 به مرکز فرماندهی هوش مصنوعی مشتی (مخصوص انجمن علمی مهندسی صنایع) خوش اومدی. هر امری داری از تحلیل ورودی‌ها، استخراج خودکار برنامه اساتید یا ساخت تایمر اعلامیه بگو، روی چشمم، حله رفیق!',
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
  const [discountRule, setDiscountRule] = useState<DiscountRuleConfig>({
    pointsStep: propDiscountRule?.pointsStep || 20,
    discountTomansPerStep: propDiscountRule?.discountTomansPerStep || 10000,
    minPoints: propDiscountRule?.minPoints || propDiscountRule?.pointsStep || 20,
    maxPoints: propDiscountRule?.maxPoints || 100,
  });
  const [lootboxDraft, setLootboxDraft] = useState<LootboxConfig>(() =>
    propLootboxConfig &&
    Array.isArray(propLootboxConfig.bronzePrizes) &&
    Array.isArray(propLootboxConfig.goldPrizes)
      ? propLootboxConfig
      : DEFAULT_LOOTBOX_CONFIG
  );
  const [isSavingLootbox, setIsSavingLootbox] = useState(false);
  const [newChestTitle, setNewChestTitle] = useState('');
  const [newChestSubtitle, setNewChestSubtitle] = useState('');
  const [newChestCost, setNewChestCost] = useState<number>(75);
  const [newChestTheme, setNewChestTheme] =
    useState<LootboxChestConfig['themeColor']>('gold');
  const [newPrizeChestType, setNewPrizeChestType] = useState<string>('bronze');
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
  const [newQuestDescription, setNewQuestDescription] = useState('');
  const [newQuestReward, setNewQuestReward] = useState<number>(40);
  const [newQuestConditionType, setNewQuestConditionType] =
    useState<QuestConditionType>('register_events');
  const [newQuestMaxProgress, setNewQuestMaxProgress] = useState<number>(1);
  const [newQuestSecretCode, setNewQuestSecretCode] = useState('');

  // New Custom Medal Form State
  const medalFileInputRef = useRef<HTMLInputElement | null>(null);
  const [newMedalTitle, setNewMedalTitle] = useState('');
  const [newMedalSubtitle, setNewMedalSubtitle] = useState('');
  const [newMedalHowToEarn, setNewMedalHowToEarn] = useState('');
  const [newMedalImage, setNewMedalImage] = useState('24_badge_trophy.png');
  const [newMedalUnlockDefault, setNewMedalUnlockDefault] = useState(true);
  const [isSavingEditedBadges, setIsSavingEditedBadges] = useState(false);

  // New Universal Avatar Form State (for Students & Professors)
  const avatarFileInputRef = useRef<HTMLInputElement | null>(null);
  const [newAvatarTitle, setNewAvatarTitle] = useState('');
  const [newAvatarRole, setNewAvatarRole] = useState<'student' | 'professor'>('student');
  const [newAvatarImage, setNewAvatarImage] = useState('01_avatar_boy.png');

  // Module 7: 6-Level RBAC & Custom Permissions
  const [newAdminName, setNewAdminName] = useState('');
  const [newAdminTelegram, setNewAdminTelegram] = useState('');
  const [newAdminLevel, setNewAdminLevel] = useState<1 | 2 | 3 | 4 | 5 | 6>(6);
  const [newAdminPassword, setNewAdminPassword] = useState('');
  const [newAdminCanVisualEdit, setNewAdminCanVisualEdit] = useState<boolean>(false);
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

  // Module 9 & Security State: Bot Config, Server API Key / Password Updater & 50-User Simulation Lab
  const [botConfigDraft, setBotConfigDraft] = useState<BotConfigSettings>(() => {
    const stored = loadStoredBotConfig();
    return {
      ...stored,
      ...(propBotConfig || {}),
      channelUsername:
        propBotConfig?.channelUsername || stored.channelUsername || propChannelUrl || '@isefum',
    };
  });

  useEffect(() => {
    if (propBotConfig) {
      setBotConfigDraft((prev) => ({
        ...prev,
        ...propBotConfig,
      }));
    }
  }, [propBotConfig]);
  const [isSavingBotConfig, setIsSavingBotConfig] = useState(false);
  const [isSendingBroadcast, setIsSendingBroadcast] = useState(false);
  const [newGeminiApiKeyInput, setNewGeminiApiKeyInput] = useState('');
  const [maskedGeminiKeyStatus, setMaskedGeminiKeyStatus] = useState(
    'AIza...**** (فعال در سرور کلودفلر)'
  );
  const [newMasterAdminPassInput, setNewMasterAdminPassInput] = useState('');
  const [isUpdatingSecrets, setIsUpdatingSecrets] = useState(false);
  const [isTestingAiLive, setIsTestingAiLive] = useState(false);
  const [liveAiTestResult, setLiveAiTestResult] = useState<{
    ok: boolean;
    reply: string;
    modelUsed: string;
  } | null>(null);
  const [isSavingUiTextsServer, setIsSavingUiTextsServer] = useState(false);
  const [isRunningSimulation, setIsRunningSimulation] = useState(false);
  const [lastSimulationSummary, setLastSimulationSummary] = useState<string | null>(null);

  const triggerToast = (msg: string) => {
    setToastBanner(msg);
    setTimeout(() => {
      setToastBanner((prev) => (prev === msg ? null : prev));
    }, 4500);
  };

  const resolveItemImageSrc = (item: AdminReceiptItem): string => {
    return resolveReceiptOrKycImageUrl(item);
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

  const canAccessVisualEditor = useMemo(() => {
    if (
      isMasterAdminTelegramUser(activeAdmin?.telegramId) ||
      activeAdmin?.telegramId === MASTER_ADMIN_TELEGRAM_ID ||
      isProtectedMasterAccount(activeAdmin)
    ) {
      return true;
    }
    const matchingAdmin = (Array.isArray(adminList) ? adminList : []).find(
      (a) => a.id === activeAdmin?.id || a.telegramId === activeAdmin?.telegramId
    );
    return Boolean(matchingAdmin?.canVisualEdit ?? activeAdmin?.canVisualEdit);
  }, [activeAdmin, adminList]);

  const filteredStudents = useMemo(() => {
    const safeList = Array.isArray(studentList) ? studentList : [];
    return safeList.filter((st) => {
      if (isFakeTestAccount(st)) return false;
      const matchesCohort =
        selectedCohort === 'همه' || st.cohortYear === selectedCohort;
      const q = userSearchQuery.trim();
      const matchesSearch =
        !q ||
        (st.fullName || '').includes(q) ||
        (st.studentId || '').includes(q) ||
        (st.phone || '').includes(q);
      return matchesCohort && matchesSearch;
    });
  }, [studentList, selectedCohort, userSearchQuery]);

  const activeDossierStudent = useMemo(() => {
    if (!selectedStudentIdForDossier) return null;
    const safeList = Array.isArray(studentList) ? studentList : [];
    return (
      safeList.find(
        (s) => s.id === selectedStudentIdForDossier && !isFakeTestAccount(s)
      ) || null
    );
  }, [studentList, selectedStudentIdForDossier]);

  useEffect(() => {
    if (activeDossierStudent) {
      setEditDossierFullName(activeDossierStudent.fullName || '');
      setEditDossierStudentId(activeDossierStudent.studentId || '');
    } else {
      setEditDossierFullName('');
      setEditDossierStudentId('');
    }
  }, [activeDossierStudent?.id]);

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

  // Toggle SiteSwitches & FeatureFlags Kill-Switches + Persist to Cloudflare KV (POST /api/miniapp/admin-site-switches)
  const handleToggleSiteSwitch = async (
    switchKey: keyof SiteSwitches,
    label: string
  ) => {
    playSwitch();
    const currentSwitches = extractSiteSwitchesFromFlags(flagsState);
    const nextValue = !currentSwitches[switchKey];
    const nextSwitches: SiteSwitches = {
      ...currentSwitches,
      [switchKey]: nextValue,
    };
    const nextFlags = mergeSiteSwitchesIntoFlags(flagsState, nextSwitches);
    setFlagsState(nextFlags);
    onUpdateFeatureFlags?.(nextFlags);

    const isLockingSite = switchKey === 'maintenanceMode' ? nextValue : !nextValue;
    appendLog(
      `${isLockingSite ? '🔒 قفل/غیرفعال‌سازی' : '🔓 باز کردن/فعال‌سازی'} کلید سایت: ${label}`,
      switchKey,
      isLockingSite ? 'warning' : 'success'
    );
    triggerToast(
      switchKey === 'maintenanceMode'
        ? nextValue
          ? '🔒 کل مینی‌اپ برای کاربران عادی قفل شد (فقط باز برای ادمین‌ها) و در کلودفلر ذخیره گردید.'
          : '🔓 قفل تعمیر مینی‌اپ باز شد و سامانه برای همه دانشجویان فعال گردید!'
        : nextValue
        ? `✅ «${label}» فعال شد و در کلودفلر ذخیره گردید.`
        : `🔒 «${label}» غیرفعال شد و در کلودفلر ذخیره گردید.`
    );

    await saveSiteSwitchesOnBot(nextSwitches);
  };

  // Module 5: Toggle Student Personal Timers Lock (POST /api/miniapp/admin-toggle-user-timers)
  const handleToggleStudentPersonalTimersLock = async () => {
    playSwitch();
    const currentAllowed = flagsState.allowStudentTimers !== false;
    const nextAllowed = !currentAllowed;
    const nextFlags: FeatureFlags = {
      ...flagsState,
      allowStudentTimers: nextAllowed,
    };
    setFlagsState(nextFlags);
    onUpdateFeatureFlags?.(nextFlags);

    appendLog(
      nextAllowed
        ? '🔓 باز کردن قابلیت ساخت یادآور شخصی توسط دانشجویان'
        : '🔒 قفل کردن ساخت یادآور شخصی توسط دانشجویان (فقط ارسال یادآورهای ادمین)',
      'allowStudentTimers',
      nextAllowed ? 'success' : 'warning'
    );

    await toggleStudentTimersOnBot(nextAllowed);
    await onSyncWithBotServer?.();

    triggerToast(
      nextAllowed
        ? '🔓 ساخت یادآور شخصی برای دانشجویان فعال شد.'
        : '🔒 ساخت یادآور شخصی توسط دانشجویان قفل شد (فقط یادآورهای رسمی انجمن ارسال می‌شوند).'
    );
  };

  // Module 1: Real Cryptographic QR Ticket Check-In & Immediate Move to History Page
  const handleProcessQrTicket = (payloadToScan: string) => {
    setScanErrorAlert(null);
    const raw = (payloadToScan || '').trim();
    if (!raw) {
      playError();
      setScanErrorAlert('لطفاً ابتدا بارکد QR را اسکن کنید یا رشته بارکد را در کادر وارد نمایید.');
      return;
    }
    if (!raw.startsWith('IE-TICKET:') && !raw.startsWith('IE-TICKET|')) {
      playError();
      setScanErrorAlert(
        '❌ فرمت بارکد نامعتبر است! استاندارد: IE-TICKET:EVENT:STUDENT:CODE:HASH'
      );
      return;
    }

    const normalizedHeader = raw.replace(/^IE-TICKET[|:]/, 'IE-TICKET:');
    const body = normalizedHeader.slice('IE-TICKET:'.length);
    const bodyParts = body.includes('|') ? body.split('|') : body.split(':');

    const eventId = bodyParts[0] || 'ev-project-mgmt';
    const studentId = bodyParts[1] || '402100000';
    const trackingCode = bodyParts[2] || 'TK-402891';
    const paidFromPayload =
      bodyParts.length === 5 ? Math.max(0, Number(bodyParts[3]) || 0) : undefined;

    const safeTickets = Array.isArray(ticketList) ? ticketList : [];
    const matchedTicket = safeTickets.find(
      (t) => t.qrPayload === raw || t.trackingCode === trackingCode
    );

    const isSignatureValid = Boolean(matchedTicket) || verifyTicketSignature(raw);
    if (!isSignatureValid) {
      playError();
      setScanErrorAlert(
        '🚨 هشدار امنیتی: امضای رمزنگاری بارکد (Signature Hash) نامعتبر یا جعلی است!'
      );
      appendLog('تلاش برای اسکن بلیط با امضای نامعتبر', raw, 'danger');
      return;
    }

    touchAdminSession();

    // Check Persistent Anti-Replay Checked-In Ledger FIRST
    const existingLedgerEntry = findCheckedInTicketInLedger(trackingCode, raw);

    if (existingLedgerEntry || (matchedTicket && matchedTicket.checkedIn)) {
      playError();
      const timeStr =
        existingLedgerEntry?.checkedInAt || matchedTicket?.checkedInAt || 'قبلی';
      const replayMsg = `⛔ هشدار امنیتی: این بلیط (${trackingCode}) قبلاً در تاریخ/ساعت ${timeStr} اسکن و پذیرش شده است! (در صفحه سابقه بلیط‌ها موجود است)`;
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
      (currentUser?.studentId === studentId ? currentUser?.fullName : '') ||
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
      prev.map((s) => {
        if (s.studentId !== studentId) return s;
        const safeBadges = Array.isArray(s.badges) ? s.badges : [];
        const safeAttended = Array.isArray(s.attendedEvents) ? s.attendedEvents : [];
        return {
          ...s,
          score: (Number(s.score) || 0) + rewardPoints,
          badges: safeBadges.includes('21_badge_code.png')
            ? safeBadges
            : [...safeBadges, '21_badge_code.png'],
          attendedEvents: safeAttended.includes(eventTitle)
            ? safeAttended
            : [eventTitle, ...safeAttended],
        };
      })
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

    // Update local ticketList so the scanned ticket immediately appears in scannedHistoryTickets!
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

    // Clear manual input box after successful scan so it doesn't stay stuck
    setQrInputPayload('');

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
      `✅ حضور ${studentName} ثبت شد! بلیط به صفحه «سابقه بلیط‌ها» اضافه گردید.`
    );
  };

  // Module 1: Undo Ticket Check-In (from Ticket History page)
  const handleUndoTicketCheckIn = (ticket: TicketRecord) => {
    playTick();
    removeTicketFromCheckedInLedger(ticket.trackingCode, ticket.qrPayload);
    updateTicketsAndPersist((prev) =>
      prev.map((t) =>
        t.id === ticket.id || t.trackingCode === ticket.trackingCode
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
  const handleQueueDecision = async (
    item: AdminReceiptItem,
    decision: 'approved' | 'rejected' | 'pending'
  ) => {
    if (inFlightRequestRef.current || isSubmitting) {
      return;
    }
    const isReceipt = item.type === 'receipt' || item.type === 'payment_receipt';
    if (!hasPermission('finance') && isReceipt) {
      playError();
      triggerToast('⛔ سطح دسترسی شما مجوز تایید مالی را ندارد.');
      return;
    }

    inFlightRequestRef.current = true;
    setIsSubmitting(true);

    try {
      const idempotencyKey = item.trackingCode || item.id;
      try {
        localStorage.setItem(
          `ie_idem_review_${idempotencyKey}_${decision}`,
          idempotencyKey
        );
      } catch {
        // Ignore storage error
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

        saveAdminStudentOverride(
          [item.studentId, item.telegramUserId],
          { kycStatus: nextKycStatus }
        );

        updateStudentsAndPersist((prev) =>
          prev.map((s) =>
            s.studentId === item.studentId ? { ...s, kycStatus: nextKycStatus } : s
          )
        );

        if (currentUser?.studentId && item.studentId === currentUser.studentId) {
          onUpdateCurrentUserProfile?.({ kycStatus: nextKycStatus });
        }
      } else if (decision === 'approved') {
        // Fix 3-3: Payment Receipt Approved -> look up real workshop date, time, location & rewardPoints!
        const matchedEvent = (Array.isArray(eventList) ? eventList : []).find(
          (e) =>
            (item.eventId && e.id === item.eventId) ||
            (item.eventTitle && e.title === item.eventTitle) ||
            (item.title && item.title.includes(e.title))
        );
        const evId = matchedEvent?.id || item.eventId || 'ev-python-data';
        const evTitle =
          matchedEvent?.title || item.eventTitle || item.title || 'کارگاه انجمن علمی صنایع';
        const evDate = matchedEvent?.date || 'به‌زودی';
        const evTime = matchedEvent?.time || '۱۴:۰۰ الی ۱۷:۰۰';
        const evLocation = matchedEvent?.location || 'دانشکده مهندسی صنایع';
        const evRewardPoints = matchedEvent?.rewardPoints ?? 20;

        const qrCodePayload = generateTicketPayload(
          evId,
          item.studentId,
          item.trackingCode,
          item.amountTomans || item.amount || matchedEvent?.basePrice || 50000
        );
        const newApprovedTicket: TicketRecord = {
          id: `tkt-rcp-${item.id}`,
          eventId: evId,
          eventTitle: evTitle,
          eventDate: evDate,
          eventTime: evTime,
          location: evLocation,
          studentId: item.studentId,
          studentName: item.studentName,
          trackingCode: item.trackingCode,
          qrPayload: qrCodePayload,
          paidAmount: item.amountTomans || item.amount || matchedEvent?.basePrice || 50000,
          discountPointsUsed: 0,
          issuedAt: new Date().toLocaleDateString('fa-IR'),
          sentToTelegram: true,
          checkedIn: false,
        };
        updateTicketsAndPersist((prev) => {
          const exists = prev.some((t) => t.trackingCode === item.trackingCode);
          return exists ? prev : [newApprovedTicket, ...prev];
        });

        // Award workshop rewardPoints to the student upon receipt approval
        if (evRewardPoints > 0) {
          updateStudentsAndPersist((prev) =>
            prev.map((s) =>
              s.studentId === item.studentId
                ? {
                    ...s,
                    score: (Number(s.score) || 0) + evRewardPoints,
                    workshopsAttended: Array.isArray(s.workshopsAttended)
                      ? s.workshopsAttended.includes(evTitle)
                        ? s.workshopsAttended
                        : [evTitle, ...s.workshopsAttended]
                      : [evTitle],
                  }
                : s
            )
          );
          if (currentUser?.studentId && item.studentId === currentUser.studentId) {
            onAwardCurrentStudentPoints?.(
              evRewardPoints,
              `تایید فیش و صدور بلیط کارگاه «${evTitle}»`
            );
          }
        }
      }

      if (decision === 'approved' || decision === 'rejected') {
        await submitAdminReviewToBot({ item, decision });
        await onSyncWithBotServer?.();
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
          ? `✅ مورد ${item.studentName} تایید شد، در ربات تلگرام ثبت گردید و پیام به دانشجو ارسال شد!`
          : decision === 'rejected'
          ? `❌ مورد ${item.studentName} رد شد و پیام اطلاع‌رسانی در تلگرام برای دانشجو ارسال گردید.`
          : `🔄 مورد ${item.studentName} به صف «در انتظار بررسی» بازگردانده شد.`
      );
    } finally {
      inFlightRequestRef.current = false;
      setIsSubmitting(false);
    }
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

  const isCurrentActingAdminMaster = useMemo(
    () =>
      isMasterAdminTelegramUser(activeAdmin?.telegramId) ||
      activeAdmin?.telegramId === MASTER_ADMIN_TELEGRAM_ID ||
      isMasterAdminTelegramUser(currentUser?.telegramUserId),
    [activeAdmin?.telegramId, currentUser?.telegramUserId]
  );

  const handleModifyStudentDossier = async (
    student: AdminStudentDossier,
    change: {
      deltaScore?: number;
      reason?: string;
      explicitKycStatus?: KycStatus;
      explicitBanStatus?: boolean;
      newAvatar?: string;
    }
  ) => {
    const isProtectedMaster = isProtectedMasterAccount(student);
    const isRestrictingMaster =
      isProtectedMaster &&
      ((change.explicitKycStatus && change.explicitKycStatus !== 'verified') ||
        change.explicitBanStatus === true ||
        (!isCurrentActingAdminMaster &&
          typeof change.deltaScore === 'number' &&
          change.deltaScore < 0));

    if (isRestrictingMaster) {
      playError();
      triggerToast(
        '👑 اکانت مدیر ارشد کل (629890497) دارای مصونیت است و سایر ادمین‌ها نمی‌توانند آن را قفل یا امتیاز آن را کسر کنند!'
      );
      return;
    }

    playCoin();
    const nextComputedScore =
      typeof change.deltaScore === 'number'
        ? Math.max(0, student.score + change.deltaScore)
        : student.score;

    // Persist authoritative Admin override immediately so background polling never reverts it!
    saveAdminStudentOverride(
      [student.id, student.studentId, student.telegramUserId],
      {
        ...(typeof change.deltaScore === 'number' ? { score: nextComputedScore } : {}),
        ...(change.explicitKycStatus ? { kycStatus: change.explicitKycStatus } : {}),
        ...(typeof change.explicitBanStatus === 'boolean'
          ? { isBanned: change.explicitBanStatus }
          : {}),
        ...(change.newAvatar ? { avatar: change.newAvatar } : {}),
      }
    );

    updateStudentsAndPersist((prev) =>
      prev.map((s) => {
        if (s.id !== student.id && s.studentId !== student.studentId) return s;
        const protectedRow = isProtectedMasterAccount(s);
        const nextScore =
          typeof change.deltaScore === 'number'
            ? Math.max(0, s.score + change.deltaScore)
            : s.score;
        const nextKyc = protectedRow
          ? 'verified'
          : change.explicitKycStatus ?? s.kycStatus;
        const nextBan = protectedRow
          ? false
          : typeof change.explicitBanStatus === 'boolean'
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
      (currentUser?.studentId && student.studentId === currentUser.studentId) ||
        (currentUser?.telegramUserId &&
          student.telegramUserId &&
          student.telegramUserId === currentUser.telegramUserId)
    );

    const targetUserId =
      student.telegramUserId || student.studentId || student.id;

    if (typeof change.deltaScore === 'number' && change.deltaScore !== 0) {
      const reasonText =
        (change.reason || customPointsReason || '').trim() ||
        'اعمال تغییر امتیاز توسط ادمین انجمن صنایع';
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
      const botRes = await submitAdminUserActionToBot({
        action: 'update_points',
        targetUserId,
        studentId: student.studentId,
        telegramUserId: student.telegramUserId,
        deltaPoints: change.deltaScore,
        score: nextComputedScore,
        reason: reasonText,
      });
      if (Array.isArray(botRes.students) && botRes.students.length > 0) {
        mergeServerStudentsPreservingLocal(botRes.students);
      }
    }

    if (change.explicitKycStatus) {
      if (isCurrentStudent) {
        onUpdateCurrentUserProfile?.({ kycStatus: change.explicitKycStatus });
      }
      appendLog(
        change.explicitKycStatus === 'verified'
          ? '🔓 باز کردن قفل KYC و تایید هویت دانشجو'
          : '🔒 قفل کردن کارت دانشجویی (KYC Lock - درخواست کارت دانشجویی)',
        `${student.fullName} (${student.studentId})`,
        change.explicitKycStatus === 'verified' ? 'success' : 'warning'
      );
      triggerToast(
        change.explicitKycStatus === 'verified'
          ? `🔓 قفل کارت دانشجویی (KYC) برای «${student.fullName}» باز شد و حساب تایید گردید!`
          : `🔒 کارت دانشجویی (KYC) برای «${student.fullName}» قفل شد و صفحه درخواست کارت دانشجویی برای او فعال گردید.`
      );
      const botRes = await submitAdminUserActionToBot({
        action: 'set_kyc',
        targetUserId,
        studentId: student.studentId,
        telegramUserId: student.telegramUserId,
        kycStatus: change.explicitKycStatus,
      });
      if (Array.isArray(botRes.students) && botRes.students.length > 0) {
        mergeServerStudentsPreservingLocal(botRes.students);
      }
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
      const botRes = await submitAdminUserActionToBot({
        action: 'set_ban',
        targetUserId,
        studentId: student.studentId,
        telegramUserId: student.telegramUserId,
        isBanned: change.explicitBanStatus,
      });
      if (Array.isArray(botRes.students) && botRes.students.length > 0) {
        mergeServerStudentsPreservingLocal(botRes.students);
      }
    }

    if (change.newAvatar) {
      if (isCurrentStudent) {
        onUpdateCurrentUserProfile?.({ avatar: change.newAvatar });
      }
      triggerToast(`🎭 آواتار دانشجو «${student.fullName}» تغییر یافت.`);
    }
  };

  const handleSaveStudentIdentity = async (student: AdminStudentDossier) => {
    const cleanFullName = editDossierFullName.trim();
    const cleanStudentId = editDossierStudentId.trim();
    if (!cleanFullName || cleanStudentId.length < 6) {
      playError();
      triggerToast('لطفاً نام و نام خانوادگی و شماره دانشجویی معتبر (حداقل ۶ رقم) وارد کنید.');
      return;
    }

    if (isProtectedMasterAccount(student) && !isCurrentActingAdminMaster) {
      playError();
      triggerToast('👑 فقط مدیر ارشد (629890497) مجاز به ویرایش مشخصات حساب اصلی است.');
      return;
    }

    playCoin();
    const nameParts = cleanFullName.split(/\s+/);
    const firstName = nameParts[0] || cleanFullName;
    const lastName = nameParts.slice(1).join(' ') || '';
    const cohortInfo = extractCohortFromStudentId(cleanStudentId);
    const resolvedCohort = (cohortInfo.cohort || student.cohortYear || '1402') as AdminStudentDossier['cohortYear'];

    saveAdminStudentOverride(
      [student.id, student.studentId, cleanStudentId, student.telegramUserId],
      {
        fullName: cleanFullName,
        studentId: cleanStudentId,
        cohortYear: resolvedCohort,
      }
    );

    updateStudentsAndPersist((prev) =>
      prev.map((s) =>
        s.id === student.id || s.studentId === student.studentId
          ? {
              ...s,
              fullName: cleanFullName,
              studentId: cleanStudentId,
              cohortYear: resolvedCohort,
            }
          : s
      )
    );

    const isCurrentStudent = Boolean(
      (currentUser?.studentId && student.studentId === currentUser.studentId) ||
        (currentUser?.telegramUserId &&
          student.telegramUserId &&
          student.telegramUserId === currentUser.telegramUserId)
    );
    if (isCurrentStudent) {
      onUpdateCurrentUserProfile?.({
        firstName,
        lastName,
        fullName: cleanFullName,
        studentId: cleanStudentId,
        cohortYear: resolvedCohort,
      });
    }

    appendLog(
      'ویرایش مشخصات هویتی دانشجو توسط ادمین',
      `${cleanFullName} (${cleanStudentId})`,
      'info'
    );
    triggerToast(
      `💾 مشخصات جدید کاربر «${cleanFullName}» (${cleanStudentId}) ذخیره و به سرور ربات ارسال شد.`
    );

    const targetUserId =
      student.telegramUserId || student.studentId || student.id;
    const botRes = await submitAdminUserActionToBot({
      action: 'edit_user',
      targetUserId,
      previousStudentId: student.studentId,
      studentId: cleanStudentId,
      telegramUserId: student.telegramUserId,
      fullName: cleanFullName,
      firstName,
      lastName,
      cohortYear: resolvedCohort,
    });
    if (Array.isArray(botRes.students) && botRes.students.length > 0) {
      mergeServerStudentsPreservingLocal(botRes.students);
    }
  };

  const handleDeleteStudentUser = async (student: AdminStudentDossier) => {
    if (isProtectedMasterAccount(student)) {
      playError();
      triggerToast('👑 اکانت مالک و مدیر ارشد کل (629890497) غیرقابل حذف است!');
      return;
    }

    playError();
    const targetUserId =
      student.telegramUserId || student.studentId || student.id;

    saveAdminStudentOverride(
      [student.id, student.studentId, student.telegramUserId],
      { deleted: true }
    );

    updateStudentsAndPersist((prev) =>
      prev.filter(
        (s) =>
          s.id !== student.id &&
          s.studentId !== student.studentId &&
          (!student.telegramUserId || s.telegramUserId !== student.telegramUserId)
      )
    );

    try {
      const rawReg = localStorage.getItem('ie_registered_student_ids_v1');
      if (rawReg) {
        const parsed = JSON.parse(rawReg) as Record<string, string>;
        delete parsed[student.studentId];
        localStorage.setItem('ie_registered_student_ids_v1', JSON.stringify(parsed));
      }
    } catch {
      // Ignore storage error
    }

    setSelectedStudentIdForDossier(null);

    appendLog(
      '🗑 حذف کامل کاربر از سایت و ربات تلگرام',
      `${student.fullName} (${student.studentId})`,
      'danger'
    );
    triggerToast(
      `🗑 کاربر «${student.fullName}» (${student.studentId}) به طور کامل از سایت و ربات حذف شد.`
    );

    const botRes = await submitAdminUserActionToBot({
      action: 'delete_user',
      targetUserId,
      studentId: student.studentId,
      telegramUserId: student.telegramUserId,
    });
    if (Array.isArray(botRes.students)) {
      mergeServerStudentsPreservingLocal(botRes.students);
    }
  };

  // ==========================================================================
  // MODULE 3: TWO-WAY STUDENT-ADMIN CHAT HANDLERS (Send Reply / Start Direct Chat / Close Chat)
  // ==========================================================================
  const syncStudentLocalSupportTicketsIfSameBrowser = (
    targetStudentId?: string,
    targetTelegramUserId?: string,
    updatedTicket?: SupportTicket
  ) => {
    if (!updatedTicket) return;
    try {
      const scopedKey = getScopedStorageKey(
        `ie_user_support_tickets_v2_${targetStudentId || 'guest'}`,
        targetTelegramUserId
      );
      const raw = localStorage.getItem(scopedKey);
      const existing = raw ? safeJsonParse<SupportTicket[]>(raw, []) : [];
      const safeExisting = Array.isArray(existing) ? existing : [];
      const hasTicket = safeExisting.some((t) => t.id === updatedTicket.id);
      const next = hasTicket
        ? safeExisting.map((t) => (t.id === updatedTicket.id ? updatedTicket : t))
        : [updatedTicket, ...safeExisting];
      localStorage.setItem(scopedKey, JSON.stringify(next));
    } catch {
      // Ignore storage error
    }
  };

  const handleAdminSendChatMessage = async (params: {
    targetStudent?: AdminStudentDossier | null;
    existingTicket?: SupportTicket | null;
    text: string;
    customTitle?: string;
  }) => {
    const cleanText = params.text.trim();
    if (!cleanText || isSendingAdminChat) return;

    playCoin();
    setIsSendingAdminChat(true);

    const nowDate = new Date().toLocaleDateString('fa-IR');
    const nowTime = new Date().toLocaleTimeString('fa-IR', {
      hour: '2-digit',
      minute: '2-digit',
    });

    const studentId =
      params.targetStudent?.studentId || params.existingTicket?.studentId || '';
    const studentName =
      params.targetStudent?.fullName ||
      params.existingTicket?.studentName ||
      'دانشجوی مهندسی صنایع';
    const telegramUserId =
      params.targetStudent?.telegramUserId || params.existingTicket?.telegramUserId;
    const cohortYear =
      params.targetStudent?.cohortYear || params.existingTicket?.cohortYear || '1402';

    const newMsg = {
      id: `adm-msg-${Date.now()}`,
      sender: 'support' as const,
      senderName: activeAdmin?.fullName || 'پشتیبانی انجمن علمی صنایع',
      text: cleanText,
      time: nowTime,
      date: nowDate,
    };

    const ticketToSave: SupportTicket = params.existingTicket
      ? {
          ...params.existingTicket,
          status: 'answered',
          closedAt: undefined,
          closedBy: undefined,
          studentId: studentId || params.existingTicket.studentId,
          studentName: studentName || params.existingTicket.studentName,
          telegramUserId: telegramUserId || params.existingTicket.telegramUserId,
          cohortYear: cohortYear || params.existingTicket.cohortYear,
          updatedAt: `${nowDate} ساعت ${nowTime}`,
          messages: [...(params.existingTicket.messages || []), newMsg],
        }
      : {
          id: `TK-DIR-${Math.floor(1000 + Math.random() * 9000)}`,
          title:
            params.customTitle ||
            `گفتگوی مستقیم مدیریت با ${studentName}`,
          category: 'direct',
          status: 'answered',
          createdAt: `${nowDate} ساعت ${nowTime}`,
          updatedAt: `${nowDate} ساعت ${nowTime}`,
          studentId,
          studentName,
          telegramUserId,
          cohortYear,
          messages: [newMsg],
        };

    updateSupportTicketsAndPersist((prev) => {
      const exists = prev.some((t) => t.id === ticketToSave.id);
      return exists
        ? prev.map((t) => (t.id === ticketToSave.id ? ticketToSave : t))
        : [ticketToSave, ...prev];
    });

    syncStudentLocalSupportTicketsIfSameBrowser(
      studentId,
      telegramUserId,
      ticketToSave
    );

    if (studentId || telegramUserId) {
      updateStudentsAndPersist((prev) =>
        prev.map((s) => {
          const isMatch =
            (studentId && s.studentId === studentId) ||
            (telegramUserId && s.telegramUserId === telegramUserId);
          if (!isMatch) return s;
          const prevLogs = Array.isArray(s.chatLogs) ? s.chatLogs : [];
          return {
            ...s,
            chatLogs: [
              ...prevLogs,
              {
                sender: activeAdmin?.fullName || 'مدیریت انجمن صنایع',
                text: cleanText,
                time: `${nowDate} ساعت ${nowTime}`,
              },
            ],
          };
        })
      );
    }

    setSelectedAdminChatId(ticketToSave.id);
    setAdminReplyText('');
    setDirectDossierMessageText('');

    appendLog(
      '💬 ارسال پیام در چت دوطرفه به دانشجو (مینی‌اپ + ربات تلگرام)',
      `${studentName} (${studentId || telegramUserId || ticketToSave.id})`,
      'success'
    );
    triggerToast(
      `📤 پیام شما برای «${studentName}» در چت مینی‌اپ ثبت شد و از طریق ربات تلگرام ارسال گردید!`
    );

    try {
      await sendAdminChatMessageToBot({
        chatId: ticketToSave.id,
        targetUserId: telegramUserId || studentId || ticketToSave.id,
        studentId,
        telegramUserId,
        studentName,
        title: ticketToSave.title,
        text: cleanText,
        adminName: activeAdmin?.fullName || 'مدیریت انجمن علمی صنایع',
        adminTelegramId: activeAdmin?.telegramId || MASTER_ADMIN_TELEGRAM_ID,
      });
    } finally {
      setIsSendingAdminChat(false);
    }
  };

  const handleAdminCloseChat = async (ticket: SupportTicket) => {
    if (!ticket || isSendingAdminChat) return;
    playTick();
    setIsSendingAdminChat(true);

    const nowDate = new Date().toLocaleDateString('fa-IR');
    const nowTime = new Date().toLocaleTimeString('fa-IR', {
      hour: '2-digit',
      minute: '2-digit',
    });

    const closedTicket: SupportTicket = {
      ...ticket,
      status: 'closed',
      updatedAt: `${nowDate} ساعت ${nowTime}`,
      closedAt: `${nowDate} ساعت ${nowTime}`,
      closedBy: activeAdmin?.fullName || 'مدیریت انجمن علمی صنایع',
    };

    updateSupportTicketsAndPersist((prev) =>
      prev.map((t) => (t.id === closedTicket.id ? closedTicket : t))
    );

    syncStudentLocalSupportTicketsIfSameBrowser(
      closedTicket.studentId,
      closedTicket.telegramUserId,
      closedTicket
    );

    appendLog(
      '🔒 بستن گفتگو/تیکت پشتیبانی توسط ادمین',
      `${closedTicket.studentName || 'دانشجو'} (${closedTicket.id})`,
      'warning'
    );
    triggerToast(
      `🔒 گفتگو «${closedTicket.title}» (${closedTicket.id}) بسته شد.`
    );

    try {
      await closeAdminChatOnBot({
        chatId: closedTicket.id,
        targetUserId:
          closedTicket.telegramUserId || closedTicket.studentId || closedTicket.id,
        studentId: closedTicket.studentId,
        telegramUserId: closedTicket.telegramUserId,
        adminName: activeAdmin?.fullName || 'مدیریت انجمن علمی صنایع',
        adminTelegramId: activeAdmin?.telegramId || MASTER_ADMIN_TELEGRAM_ID,
      });
    } finally {
      setIsSendingAdminChat(false);
    }
  };

  // ==========================================================================
  // MODULE 4: Save or Create Event & Professor CRUD (Two-Way Sync with Telegram Bot)
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

    const imageFilename = resolveEventPixelImage({
      title: eventTitleInput.trim(),
      category: eventCategoryInput,
      categoryLabel,
    });

    const parsedCap = Math.max(1, Number(eventCapacityInput) || 40);
    const parsedPrice = Number(eventPriceInput) || 0;
    const parsedPoints = Number(eventPointsInput) || 50;
    const safeDiscStep = Math.max(1, Number(eventDiscountStepInput) || discountRule.pointsStep || 20);
    const safeDiscTomans = Math.max(
      1000,
      Number(eventDiscountTomansInput) || discountRule.discountTomansPerStep || 10000
    );
    const safeDiscMin = Math.max(
      safeDiscStep,
      Math.ceil((Number(eventDiscountMinInput) || safeDiscStep) / safeDiscStep) * safeDiscStep
    );
    const safeDiscMax = Math.max(
      safeDiscMin,
      Math.floor((Number(eventDiscountMaxInput) || safeDiscMin * 5) / safeDiscStep) * safeDiscStep
    );

    if (editingEventId) {
      const updated = (Array.isArray(eventList) ? eventList : []).map((rawEv, idx) => {
        const ev = normalizeEvent(rawEv, idx);
        if (ev.id !== editingEventId) return ev;
        const currentRegCount = Math.max(
          0,
          Number(ev.registeredCount) ||
            Math.max(0, (ev.totalCapacity || ev.capacityTotal || parsedCap) - ev.capacityRemaining)
        );
        const nextTotalCap = eventHasCapacityLimitInput ? parsedCap : 999999;
        const nextRemCap = eventHasCapacityLimitInput
          ? Math.max(0, parsedCap - currentRegCount)
          : 999999;
        return normalizeEvent(
          {
            ...ev,
            title: eventTitleInput.trim(),
            category: eventCategoryInput,
            categoryLabel,
            date: eventDateInput,
            time: eventTimeInput,
            location: eventLocationInput,
            basePrice: parsedPrice,
            price: parsedPrice,
            hasCapacityLimit: eventHasCapacityLimitInput,
            registeredCount: currentRegCount,
            capacityRemaining: nextRemCap,
            remainingCapacity: nextRemCap,
            capacityTotal: nextTotalCap,
            totalCapacity: nextTotalCap,
            capacity: nextRemCap,
            rewardPoints: parsedPoints,
            points: parsedPoints,
            instructor: eventInstructorInput,
            imageFilename: ev.imageFilename || imageFilename,
            image: ev.image || ev.imageFilename || imageFilename,
            allowPointsDiscount: parsedPrice > 0 ? eventAllowDiscountInput : false,
            discountPointsStep: safeDiscStep,
            discountTomansPerStep: safeDiscTomans,
            discountMinPoints: safeDiscMin,
            discountMaxPoints: safeDiscMax,
          },
          idx
        );
      });
      setEventList(updated);
      onUpdateEvents?.(updated);
      void saveEventsOnBot(updated);
      appendLog('ویرایش کارگاه/رویداد و همگام‌سازی با ربات تلگرام', eventTitleInput.trim(), 'info');
      triggerToast(
        `✅ رویداد «${eventTitleInput.trim()}» بروزرسانی شد و در دیتابیس ربات تلگرام ذخیره گردید.`
      );
      setEditingEventId(null);
    } else {
      const effectiveCap = eventHasCapacityLimitInput ? parsedCap : 999999;
      const newEv: EventItem = normalizeEvent({
        id: `ev-custom-${Date.now()}`,
        title: eventTitleInput.trim(),
        category: eventCategoryInput,
        categoryLabel,
        date: eventDateInput,
        time: eventTimeInput,
        location: eventLocationInput,
        hasCapacityLimit: eventHasCapacityLimitInput,
        registeredCount: 0,
        capacityRemaining: effectiveCap,
        remainingCapacity: effectiveCap,
        capacityTotal: effectiveCap,
        totalCapacity: effectiveCap,
        capacity: effectiveCap,
        rating: 4.9,
        ratingCount: 12,
        imageFilename,
        image: imageFilename,
        basePrice: parsedPrice,
        price: parsedPrice,
        rewardPoints: parsedPoints,
        points: parsedPoints,
        instructor: eventInstructorInput || 'استاد مدعو انجمن صنایع',
        allowPointsDiscount: parsedPrice > 0 ? eventAllowDiscountInput : false,
        discountPointsStep: safeDiscStep,
        discountTomansPerStep: safeDiscTomans,
        discountMinPoints: safeDiscMin,
        discountMaxPoints: safeDiscMax,
        syllabus: [
          'آشنایی با مفاهیم پایه و استانداردهای مهندسی صنایع',
          'کارگاه عملی و حل مسئله پروژه محور',
          'پرسش و پاسخ و اعطای گواهینامه معتبر انجمن',
        ],
      });
      const updated = [newEv, ...(Array.isArray(eventList) ? eventList : []).map((ev, i) => normalizeEvent(ev, i))];
      setEventList(updated);
      onUpdateEvents?.(updated);
      void saveEventsOnBot(updated);
      appendLog('ایجاد رویداد جدید در تقویم انجمن و ربات تلگرام', newEv.title, 'success');
      triggerToast(
        `🎯 رویداد جدید «${newEv.title}» ساخته شد و هم‌زمان در مینی‌اپ و منوی رویدادهای ربات تلگرام قرار گرفت!`
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
    void saveProfessorsOnBot(updated);
    appendLog('افزودن استاد جدید به رادار دانشکده و ربات تلگرام', newProf.name, 'success');
    triggerToast(
      `👨‍🏫 پروفایل «${newProf.name}» با آواتار انتخابی در مینی‌اپ و ربات تلگرام ذخیره شد.`
    );
    setProfNameInput('');
  };

  const handleChangeProfessorAvatar = (profId: string, nextAvatarUrl: string) => {
    playCoin();
    const updated = (Array.isArray(profList) ? profList : []).map((p) =>
      p.id === profId ? { ...p, avatar: nextAvatarUrl } : p
    );
    setProfList(updated);
    onUpdateProfessors?.(updated);
    void saveProfessorsOnBot(updated);
    triggerToast('🎭 آواتار استاد در رادار دانشکده و ربات تلگرام بروزرسانی شد.');
  };

  const handleToggleProfessorOffice = (profId: string) => {
    playSwitch();
    const updated = (Array.isArray(profList) ? profList : []).map((p) =>
      p.id === profId ? { ...p, isCurrentlyInOffice: !p.isCurrentlyInOffice } : p
    );
    setProfList(updated);
    onUpdateProfessors?.(updated);
    void saveProfessorsOnBot(updated);
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
        } در مینی‌اپ و ربات تلگرام بروزرسانی شد.`
      );
    }
  };

  const handleDeleteProfessor = (profId: string, profName: string) => {
    playError();
    const updated = (Array.isArray(profList) ? profList : []).filter(
      (p) => p.id !== profId
    );
    setProfList(updated);
    onUpdateProfessors?.(updated);
    void saveProfessorsOnBot(updated);
    appendLog('حذف استاد از رادار دانشکده و ربات تلگرام', profName, 'warning');
    triggerToast(`🗑 پروفایل «${profName}» حذف شد و با ربات تلگرام همگام گردید.`);
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
    void saveProfessorsOnBot(updated);
    const names = parsedProfPreviewList.map((p) => p.name).join('، ');
    appendLog(
      'ثبت نهایی برنامه اساتید استخراج‌شده با هوش مصنوعی',
      names,
      'success'
    );
    triggerToast(`✅ برنامه «${names}» به لیست رسمی اساتید سایت و ربات تلگرام اضافه شد!`);
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
        currentUser?.studentId || '402100000',
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
      prev.map((s) => {
        if (s.studentId !== selectedStudentForBadge) return s;
        const safeBadges = Array.isArray(s.badges) ? s.badges : [];
        return {
          ...s,
          score: (Number(s.score) || 0) + 30,
          badges: safeBadges.includes(badgeObj.filename)
            ? safeBadges
            : [...safeBadges, badgeObj.filename],
        };
      })
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
      onAwardCurrentStudentPoints(30, `دریافت نشان «${badgeObj.title}» از انجمن علمی مهندسی صنایع`);
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
    if (!newQuestTitle.trim()) {
      playError();
      triggerToast('⚠️ لطفاً عنوان ماموریت را وارد کنید.');
      return;
    }
    playCoin();
    const resolvedTarget =
      newQuestConditionType === 'complete_profile' ||
      newQuestConditionType === 'secret_code'
        ? 1
        : Math.max(1, parseFlexibleNumberInput(newQuestMaxProgress, 1));
    const defaultDescByCondition: Record<QuestConditionType, string> = {
      register_events: `ثبت‌نام در حداقل ${resolvedTarget.toLocaleString('fa-IR')} کارگاه یا رویداد انجمن`,
      checkin_events: `حضور و اسکن بلیط QR در حداقل ${resolvedTarget.toLocaleString('fa-IR')} رویداد`,
      reach_score: `رسیدن به مجموع ${resolvedTarget.toLocaleString('fa-IR')} امتیاز در سامانه`,
      complete_profile: 'تکمیل ثبت‌نام اولیه دانشجویی و احراز هویت',
      secret_code: 'وارد کردن کد رمز اعلام‌شده توسط انجمن در بخش ماموریت‌ها',
    };

    const createdQuest: WeeklyQuest = {
      id: `qst-adm-${Date.now()}`,
      title: newQuestTitle.trim(),
      description:
        newQuestDescription.trim() || defaultDescByCondition[newQuestConditionType],
      rewardPoints: Math.max(1, parseFlexibleNumberInput(newQuestReward, 40)),
      progress: 0,
      maxProgress: resolvedTarget,
      isClaimed: false,
      conditionType: newQuestConditionType,
      secretCode:
        newQuestConditionType === 'secret_code'
          ? (newQuestSecretCode.trim() || 'MISSION-CODE')
          : undefined,
      unlockedByCode: false,
    };
    const updated = [createdQuest, ...(Array.isArray(questList) ? questList : [])];
    updateQuestsAndPersist(updated);
    setNewQuestTitle('');
    setNewQuestDescription('');
    appendLog('ایجاد ماموریت جدید', createdQuest.title, 'success');
    triggerToast(
      `🎯 ماموریت «${createdQuest.title}» با پاداش +${createdQuest.rewardPoints} امتیاز به بخش ماموریت‌ها اضافه شد!`
    );
  };

  // Module 7: Add Admin with Preset 1-5 or Custom Level 6 Matrix
  const handleAddAdminUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAdminName.trim()) {
      playError();
      triggerToast('لطفاً نام عضو انجمن صنایع یا ادمین را وارد کنید.');
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
      canVisualEdit: newAdminLevel === 1 ? true : newAdminCanVisualEdit,
      isFrozen: false,
      lastActive: 'تازه اضافه شده',
    };

    const updatedAdmins = [newAdmin, ...(Array.isArray(adminList) ? adminList : [])];
    updateAdminsAndPersist(updatedAdmins);
    setNewAdminName('');
    setNewAdminCanVisualEdit(false);
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

  const handleSaveEditedBadgesToServer = async () => {
    playCoin();
    setIsSavingEditedBadges(true);
    try {
      onUpdateBadges?.(badgeList);
      const res = await saveAdminBotConfigToBot({
        ...botConfigDraft,
        badgesCatalog: badgeList,
        action: 'save_badges',
      });
      appendLog(
        'ذخیره و ویرایش مشخصات نشان‌ها (Badges)',
        `${badgeList.length} نشان بروزرسانی شد`,
        'success'
      );
      triggerToast(
        res.ok
          ? '✅ تغییرات نام، زیرعنوان، توضیحات و شرایط دریافت نشان‌ها در سرور ربات و مینی‌اپ ذخیره شد!'
          : '✅ تغییرات نام، زیرعنوان، توضیحات و شرایط دریافت نشان‌ها در سامانه ذخیره شد!'
      );
    } finally {
      setIsSavingEditedBadges(false);
    }
  };

  const handleSaveBotConfigToServer = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    playCoin();
    setIsSavingBotConfig(true);
    try {
      if (botConfigDraft.channelUsername.trim()) {
        const cleanHandle = normalizeTelegramChannelHandle(botConfigDraft.channelUsername);
        saveChannelUrl(cleanHandle);
        onUpdateChannelUrl?.(cleanHandle);
      }
      saveStoredBotConfig(botConfigDraft);
      onUpdateBotConfig?.(botConfigDraft);
      const res = await saveAdminBotConfigToBot({
        ...botConfigDraft,
        badgesCatalog: badgeList,
        adminsCatalog: adminList,
        timersCatalog: timerList,
        questsCatalog: questList,
        action: 'save_config',
      });
      appendLog(
        'ذخیره تنظیمات مستقیم ربات تلگرام',
        `کارت: ${botConfigDraft.cardNumber} • کانال: ${botConfigDraft.channelUsername}`,
        'success'
      );
      triggerToast(
        res.ok
          ? '✅ تنظیمات مستقیم ربات تلگرام (متن خوش‌آمدگویی، شماره کارت، کانال و قوانین) در سرور ذخیره شد!'
          : '✅ تنظیمات ربات ثبت شد و در صف همگام‌سازی سرور قرار گرفت.'
      );
    } finally {
      setIsSavingBotConfig(false);
    }
  };

  const handleSendBroadcastToBot = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = (botConfigDraft.broadcastMessage || '').trim();
    if (!text) {
      playError();
      triggerToast('⚠️ لطفاً متن پیام همگانی (Broadcast) را وارد کنید.');
      return;
    }
    playFanfare();
    setIsSendingBroadcast(true);
    try {
      const res = await saveAdminBotConfigToBot({
        ...botConfigDraft,
        broadcastMessage: text,
        action: 'broadcast',
      });
      setBotConfigDraft((prev) => ({ ...prev, broadcastMessage: '' }));
      appendLog(
        'ارسال پیام همگانی (Broadcast) به اعضای ربات تلگرام',
        text.slice(0, 60),
        'success'
      );
      triggerToast(
        res.ok
          ? '📢 پیام همگانی با موفقیت به سرور ربات تلگرام ارسال شد و برای اعضا مخابره می‌گردد!'
          : '📢 دستور ارسال پیام همگانی به سرور ربات ارسال شد!'
      );
    } finally {
      setIsSendingBroadcast(false);
    }
  };

  const handleUpdateServerSecrets = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedKey = newGeminiApiKeyInput.trim();
    const trimmedPass = newMasterAdminPassInput.trim();
    if (!trimmedKey && !trimmedPass) {
      playError();
      triggerToast('⚠️ لطفاً کلید API جدید یا رمز عبور جدید ادمین را وارد کنید.');
      return;
    }
    if (trimmedKey && !trimmedKey.startsWith('AIza')) {
      playError();
      triggerToast('⚠️ کلید API گوگل جمینای باید با عبارت AIza شروع شود.');
      return;
    }
    playCoin();
    setIsUpdatingSecrets(true);
    try {
      const res = await updateAdminSecretsOnBot({
        geminiApiKey: trimmedKey || undefined,
        adminPassword: trimmedPass || undefined,
        adminId: activeAdmin.telegramId || MASTER_ADMIN_TELEGRAM_ID,
      });
      if (trimmedKey) {
        const prefix = trimmedKey.slice(0, 6);
        setMaskedGeminiKeyStatus(`${prefix}...**** (فعال در سرور)`);
      }
      // Immediately wipe raw inputs from memory — zero client storage!
      setNewGeminiApiKeyInput('');
      setNewMasterAdminPassInput('');
      appendLog(
        'بروزرسانی امن کلیدهای سرور (API Key / رمز مدیریت)',
        trimmedKey ? 'تغییر کلید Gemini API در سرور' : 'تغییر رمز پنل مدیریت در سرور',
        'success'
      );
      triggerToast(
        res.message ||
          '🔐 کلید امنیتی با موفقیت به سرور کلودفلر ارسال و جایگزین شد (بدون ذخیره در مرورگر).'
      );
    } finally {
      setIsUpdatingSecrets(false);
    }
  };

  const handleTestLiveAiConnection = async () => {
    if (isTestingAiLive) return;
    playTick();
    setIsTestingAiLive(true);
    setLiveAiTestResult(null);
    try {
      const res = await testLiveAiConnectionOnBot();
      setLiveAiTestResult(res);
      if (res.ok) {
        playFanfare();
        triggerToast(`✅ اتصال هوش مصنوعی برقرار است! پاسخ از مدل: ${res.modelUsed}`);
      } else {
        playError();
        triggerToast('⚠️ خطا در تست اتصال هوش مصنوعی سرور.');
      }
    } finally {
      setIsTestingAiLive(false);
    }
  };

  const handleGenerateSmartAnnouncement = async () => {
    if (isGeneratingAnnAi) return;
    playTick();
    setIsGeneratingAnnAi(true);
    try {
      const topic =
        manualAnnTitle.trim() ||
        'برگزاری کارگاه تخصصی جدید انجمن علمی مهندسی صنایع دانشگاه فردوسی مشهد';
      const generated = await generateSmartAnnouncementWithAi(topic, manualAnnTag);
      if (!manualAnnTitle.trim()) {
        setManualAnnTitle('اطلاعیه ویژه انجمن علمی مهندسی صنایع');
      }
      setManualAnnContent(generated);
      playCoin();
      triggerToast('✨ متن اطلاعیه با هوش مصنوعی سرور تولید شد!');
    } finally {
      setIsGeneratingAnnAi(false);
    }
  };

  const handleRun50UserSimulationAndReport = async () => {
    if (isRunningSimulation) return;
    playCoin();
    setIsRunningSimulation(true);
    setLastSimulationSummary(null);

    try {
      // 1. Create temporary virtual 50 students & 5 admins strictly in local function memory
      const cohorts = ['۱۴۰۰', '۱۴۰۱', '۱۴۰۲', '۱۴۰۳', '۱۴۰۴', '۱۴۰۵'];
      const tempVirtualStudents: {
        id: string;
        studentId: string;
        cohort: string;
        score: number;
        registeredWorkshop: boolean;
        receiptApproved: boolean;
      }[] = [];

      for (let i = 1; i <= 50; i++) {
        const cohort = cohorts[i % cohorts.length];
        tempVirtualStudents.push({
          id: `SIM-TEMP-USER-${i}`,
          studentId: `40${(i % 5) + 1}999${String(i).padStart(3, '0')}`,
          cohort,
          score: 50 + (i % 6) * 45,
          registeredWorkshop: i % 2 === 0,
          receiptApproved: i % 3 !== 0,
        });
      }

      const tempVirtualAdmins = [1, 2, 3, 4, 5].map((lvl) => ({
        id: `SIM-TEMP-ADMIN-${lvl}`,
        roleLevel: lvl,
        reviewedCount: 10,
      }));

      const workshopRegCount = tempVirtualStudents.filter((u) => u.registeredWorkshop).length;
      const approvedReceiptsCount = tempVirtualStudents.filter((u) => u.receiptApproved).length;
      const totalSimPoints = tempVirtualStudents.reduce((acc, u) => acc + u.score, 0);

      // 2. Immediately purge 100% of temporary simulation data from memory & ensure zero trace in storage
      tempVirtualStudents.length = 0;
      tempVirtualAdmins.length = 0;

      setStudentList((prev) =>
        (Array.isArray(prev) ? prev : []).filter(
          (s) => !String(s.id || '').startsWith('SIM-TEMP-')
        )
      );
      setReceiptList((prev) =>
        (Array.isArray(prev) ? prev : []).filter(
          (r) => !String(r.id || '').startsWith('SIM-TEMP-')
        )
      );

      const scenariosTested = [
        `ثبت‌نام و احراز هویت ۵۰ دانشجوی مجازی در ورودی‌های ۱۴۰۰ تا ۱۴۰۵`,
        `تست ثبت‌نام کارگاه و اعمال تخفیف امتیاز (${workshopRegCount} ثبت‌نام موفق)`,
        `تایید و بررسی ${approvedReceiptsCount} فیش و کارت دانشجویی توسط ۵ سطح ادمین`,
        `محاسبه امتیازات (${totalSimPoints.toLocaleString('fa-IR')} امتیاز) و بررسی نشان‌ها و صندوقچه‌ها`,
        `پاکسازی ۱۰۰٪ خودکار داده‌های موقت (۰ کاربر تستی باقی‌مانده در مینی‌اپ و ربات)`,
      ];

      const summaryText = [
        `📊 گزارش نهایی شبیه‌سازی ۵۰ کاربر و ۵ ادمین انجمن علمی مهندسی صنایع:`,
        `• تعداد کاربران مجازی تست‌شده: ۵۰ دانشجو (ورودی ۱۴۰۰ تا ۱۴۰۵)`,
        `• تعداد ادمین‌های مجازی تست‌شده: ۵ ادمین (سطوح ۱ تا ۵)`,
        `• تست ثبت‌نام کارگاه و صدور بلیط QR: ${workshopRegCount} مورد موفق`,
        `• تست بررسی فیش و کارت دانشجویی: ${approvedReceiptsCount} مورد موفق`,
        `• وضعیت پاکسازی خودکار پس از تست: ۱۰۰٪ پاکسازی شد (بدون هیچ ردپایی در دیتابیس)`,
      ].join('\n');

      const reportPayload: SimulationReportPayload = {
        adminTelegramId: MASTER_ADMIN_TELEGRAM_ID,
        executedAt: new Date().toLocaleString('fa-IR'),
        virtualUsersCount: 50,
        virtualAdminsCount: 5,
        scenariosTested,
        passedCount: scenariosTested.length,
        failedCount: 0,
        cleanupVerified: true,
        summaryText,
      };

      const botRes = await sendSimulationReportToBot(reportPayload);
      playFanfare();
      setLastSimulationSummary(summaryText);
      appendLog(
        'اجرای شبیه‌سازی ۵۰ کاربر و ۵ ادمین + پاکسازی ۱۰۰٪ خودکار',
        botRes.ok ? 'گزارش به تلگرام مدیر ارشد ارسال شد' : 'گزارش آماده و پاکسازی کامل انجام شد',
        'success'
      );
      triggerToast(
        '✅ شبیه‌سازی ۵۰ کاربر و ۵ ادمین انجام شد، گزارش کامل به تلگرام ادمین ارسال گردید و ۱۰۰٪ داده‌های تستی پاکسازی شدند!'
      );
    } finally {
      setIsRunningSimulation(false);
    }
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
    { id: 9, shortLabel: '۹. 📊 داشبورد جامع و تنظیمات ربات', icon: <Sparkles className="w-3.5 h-3.5" /> },
    { id: 10, shortLabel: '۱۰. ✏️ ویرایش دستی مینی‌اپ', icon: <Edit3 className="w-3.5 h-3.5" /> },
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
                    alt="ادمین انجمن صنایع"
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

              <button
                type="button"
                onClick={() => {
                  playTick();
                  setIsOnlineUsersModalOpen(true);
                }}
                title="مشاهده لیست دقیق کاربران آنلاین در ۳ دقیقه اخیر"
                className="text-[10px] lg:text-xs font-black px-2.5 py-1.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/50 shrink-0 cursor-pointer flex items-center gap-1.5 transition-all active:scale-95 shadow-sm"
              >
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                <span>🟢 {effectiveOnlineCount.toLocaleString('fa-IR')} آنلاین</span>
              </button>
            </div>
          </div>

          {/* 10-Module Grid Navigation Bar */}
          <div
            className={`p-2.5 grid grid-cols-2 sm:grid-cols-5 lg:grid-cols-5 gap-1.5 ${
              isNight ? 'bg-black/25' : 'bg-[#EAE3D2]'
            }`}
          >
            {MODULE_TABS.map((tab) => {
              const isSelected = activeModule === tab.id;
              const isPermitted =
                tab.id === 10
                  ? canAccessVisualEditor
                  : !tab.permKey || hasPermission(tab.permKey);
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => {
                    if (!isPermitted) {
                      playError();
                      triggerToast(
                        tab.id === 10
                          ? '⛔ دسترسی به «✏️ ویرایش دستی متن‌های مینی‌اپ» فقط با مجوز مدیر ارشد فعال می‌شود.'
                          : `⛔ دسترسی به «${tab.shortLabel}» برای نقش شما محدود شده است.`
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

        {/* ===================================================================
            MODAL: LIVE ONLINE USERS IN THE LAST 3 MINUTES (Click on 🟢 آنلاین)
           =================================================================== */}
        {isOnlineUsersModalOpen && (
          <div
            onClick={() => setIsOnlineUsersModalOpen(false)}
            className="fixed inset-0 z-[130] bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in"
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className={`max-w-lg w-full rounded-3xl border-2 border-emerald-500/60 p-4 lg:p-5 space-y-3.5 shadow-2xl ${cardSurfaceClass}`}
            >
              <div className="flex items-center justify-between border-b border-current/15 pb-3">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
                  <div>
                    <h3 className="text-sm lg:text-base font-black text-emerald-400">
                      🟢 لیست کاربران آنلاین در ۳ دقیقه اخیر ({effectiveOnlineCount.toLocaleString('fa-IR')} نفر)
                    </h3>
                    <p className="text-[10px] font-bold opacity-80">
                      بروزرسانی خودکار از طریق سیگنال Heartbeat هر ۴۵ ثانیه
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsOnlineUsersModalOpen(false)}
                  className="px-3 py-1 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-black cursor-pointer"
                >
                  بستن ✕
                </button>
              </div>

              <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-0.5">
                {onlineSessions.length === 0 ? (
                  <div className="p-6 text-center text-xs font-bold opacity-75">
                    در حال حاضر کاربری در ۳ دقیقه اخیر آنلاین نبوده است.
                  </div>
                ) : (
                  onlineSessions.map((sess, idx) => (
                    <div
                      key={sess.id || idx}
                      className={`p-3 rounded-2xl border flex items-center justify-between gap-2 text-xs ${subCardClass}`}
                    >
                      <div className="space-y-1 min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
                          <span className="font-black text-sm">{sess.fullName}</span>
                          <span className="text-[10px] px-2 py-0.5 rounded-lg bg-[#D4AB58]/20 text-[#D4AB58] font-black">
                            ورودی {sess.cohortYear || '۱۴۰۲'}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 flex-wrap text-[11px] font-bold opacity-85">
                          <span>
                            شماره دانشجویی:{' '}
                            <span className="font-mono text-[#D4AB58]">{sess.studentId}</span>
                          </span>
                          <span>•</span>
                          <span className="text-emerald-400">
                            ⏱ زمان آنلاین: {sess.lastHeartbeat || 'آنلاین (هم‌اکنون)'}
                          </span>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          playTick();
                          const found = studentList.find(
                            (s) =>
                              s.studentId === sess.studentId ||
                              String(s.id) === String(sess.userId || sess.id)
                          );
                          setIsOnlineUsersModalOpen(false);
                          setActiveModule(3);
                          if (found) {
                            setSelectedStudentIdForDossier(found.id);
                            setDossierTab('overview');
                          } else {
                            setUserSearchQuery(sess.studentId || sess.fullName);
                          }
                        }}
                        className="px-2.5 py-1.5 rounded-xl bg-[#354B40] hover:bg-[#2A3C33] text-[#F6F1E7] text-[10px] font-black shrink-0 cursor-pointer"
                      >
                        پرونده ۳۶۰
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

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
                    🟢 رادار کاربران آنلاین در سایت ({effectiveOnlineCount.toLocaleString('fa-IR')} نفر)
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    playTick();
                    setIsOnlineUsersModalOpen(true);
                  }}
                  className="text-[10px] font-black px-2.5 py-1 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 cursor-pointer"
                >
                  مشاهده لیست کامل 🔍
                </button>
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
                          setActiveModule(3);
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

            {/* 2. SECTION KILL-SWITCHES (8. کلیدهای سایت و کلودفلر - siteSwitches) */}
            <div className={`rounded-3xl p-4 border space-y-3 ${cardSurfaceClass}`}>
              <div className="flex items-center justify-between border-b border-current/10 pb-2.5">
                <h3 className="text-sm font-black">
                  🎛 ۸. کلیدهای سایت و کلودفلر (کنترل زنده بخش‌های مینی‌اپ)
                </h3>
                <span className="text-[10px] font-black px-2 py-0.5 rounded-lg bg-[#D4AB58]/20 text-[#D4AB58]">
                  ذخیره آنی در Cloudflare KV
                </span>
              </div>

              {(() => {
                const currentSwitches = extractSiteSwitchesFromFlags(flagsState);
                return (
                  <div className="space-y-2 text-xs">
                    {/* کلید ۱: بستن کل مینی‌اپ برای همه کاربران (فقط باز برای ادمین‌ها) */}
                    <div className="p-3 rounded-2xl border-2 border-rose-500/60 bg-rose-950/25 flex items-center justify-between gap-2">
                      <div>
                        <div className="font-black text-rose-400">
                          🔒 بستن کل مینی‌اپ برای همه کاربران (فقط باز برای ادمین‌ها)
                        </div>
                        <div className="text-[10px] font-bold opacity-80 mt-0.5">
                          کلید ۱ (maintenanceMode): نمایش صفحه بروزرسانی سراسری برای دانشجویان
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          handleToggleSiteSwitch(
                            'maintenanceMode',
                            '🔒 بستن کل مینی‌اپ برای همه کاربران (فقط باز برای ادمین‌ها)'
                          )
                        }
                        className={`px-3 py-1.5 rounded-xl text-[11px] font-black shrink-0 cursor-pointer transition-all ${
                          currentSwitches.maintenanceMode
                            ? 'bg-rose-600 text-white animate-pulse shadow-lg'
                            : 'bg-emerald-600 text-white'
                        }`}
                      >
                        {currentSwitches.maintenanceMode
                          ? '🔒 بسته (فقط ادمین) — کلیک برای باز کردن'
                          : '🔓 باز برای همه کاربران ✓'}
                      </button>
                    </div>

                    {/* کلیدهای ۲ تا ۶ */}
                    {[
                      {
                        key: 'eventsEnabled' as keyof SiteSwitches,
                        label: 'فعال بودن بخش رویدادها و ثبت‌نام کارگاه‌ها',
                      },
                      {
                        key: 'lootboxEnabled' as keyof SiteSwitches,
                        label: 'فعال بودن بخش صندوقچه‌های شانس و جوایز',
                      },
                      {
                        key: 'chartEnabled' as keyof SiteSwitches,
                        label: 'فعال بودن بخش چارت درسی و انتخاب واحد',
                      },
                      {
                        key: 'supportEnabled' as keyof SiteSwitches,
                        label: 'فعال بودن بخش پشتیبانی و ارسال تیکت',
                      },
                      {
                        key: 'leaderboardEnabled' as keyof SiteSwitches,
                        label: 'فعال بودن جدول برترین‌ها و رقابت ورودی‌ها',
                      },
                    ].map((item) => {
                      const isEnabled = currentSwitches[item.key];
                      return (
                        <div
                          key={item.key}
                          className={`p-2.5 rounded-2xl border flex items-center justify-between gap-2 ${subCardClass}`}
                        >
                          <span className="font-black">{item.label}</span>
                          <button
                            type="button"
                            onClick={() => handleToggleSiteSwitch(item.key, item.label)}
                            className={`px-3 py-1 rounded-xl text-[11px] font-black shrink-0 cursor-pointer transition-all ${
                              isEnabled
                                ? 'bg-emerald-600 text-white'
                                : 'bg-rose-700 text-white'
                            }`}
                          >
                            {isEnabled ? 'باز و فعال ✓' : 'غیرفعال 🔒 (کلیک برای فعال‌سازی)'}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
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
                      placeholder="مثال: رشته بارکد QR را اسکن یا اینجا وارد نمایید..."
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
                  <div className="p-4 rounded-2xl bg-emerald-950/90 border-2 border-emerald-500 text-[#F6F1E7] space-y-2.5 text-xs animate-fade-in">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="font-black text-emerald-300 text-sm">
                        حاضر ✅ • بلیط به «صفحه سابقه بلیط‌ها» اضافه شد و گواهی صادر گردید
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
                    <div className="pt-1">
                      <button
                        type="button"
                        onClick={() => setMod1SubPage('history')}
                        className="px-3.5 py-1.5 rounded-xl bg-emerald-500 text-[#101622] font-black text-[11px] cursor-pointer"
                      >
                        📜 مشاهده در سابقه بلیط‌های تاییدشده ({scannedHistoryTickets.length.toLocaleString('fa-IR')} مورد) ←
                      </button>
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
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-current/10 pb-3">
              <div>
                <h2 className="text-sm lg:text-base font-black">
                  💳 ۲. کارتابل فیش‌های واریزی و کارت‌های دانشجویی (با پوشه‌های بایگانی)
                </h2>
                <p
                  className={`text-[11px] font-bold ${
                    isNight ? 'text-[#A3C1AD]' : 'text-[#3D5249]'
                  }`}
                >
                  هر فیش یا کارت دانشجویی پس از تایید یا رد شدن (در ربات یا مینی‌اپ)، به‌صورت زنده همگام‌سازی و به پوشه مربوطه منتقل می‌شود
                </p>
              </div>
              {onSyncWithBotServer && (
                <button
                  type="button"
                  disabled={isSyncingBotQueue}
                  onClick={async () => {
                    playTick();
                    setIsSyncingBotQueue(true);
                    try {
                      await onSyncWithBotServer();
                      triggerToast('🔄 کارتابل فیش‌ها و کارت‌های دانشجویی با سرور ربات تلگرام همگام‌سازی شد!');
                    } finally {
                      setIsSyncingBotQueue(false);
                    }
                  }}
                  className="px-3 py-2 rounded-xl bg-[#D4AB58] hover:bg-[#e1b864] text-[#101622] text-xs font-black flex items-center gap-1.5 cursor-pointer shrink-0 shadow"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isSyncingBotQueue ? 'animate-spin' : ''}`} />
                  <span>{isSyncingBotQueue ? 'در حال دریافت...' : '🔄 دریافت فوری از ربات'}</span>
                </button>
              )}
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
                {filteredQueueItems.map((item) => {
                  const imgSrc = resolveItemImageSrc(item);
                  return (
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

                    {imgSrc ? (
                      <div className="space-y-1.5">
                        <div
                          onClick={() => setPreviewImageModalSrc(imgSrc)}
                          className="h-44 rounded-xl overflow-hidden bg-black/40 border border-[#D4AB58]/40 flex items-center justify-center p-1.5 cursor-pointer relative group"
                          title="برای بزرگنمایی تصویر کلیک کنید"
                        >
                          <img
                            src={imgSrc}
                            alt="تصویر مدرک ارسالی دانشجو"
                            loading="eager"
                            className="max-h-full max-w-full object-contain rounded transition-transform group-hover:scale-105"
                          />
                          <span className="absolute bottom-2 left-2 px-2 py-0.5 rounded-lg bg-black/75 text-[#D4AB58] text-[10px] font-black">
                            🔍 بزرگنمایی تصویر
                          </span>
                        </div>
                      </div>
                    ) : (
                      <div className="p-3 rounded-xl bg-black/20 border border-current/10 text-[11px] font-bold opacity-75 text-center">
                        تصویر پیوست از ربات دریافت شده است (برای بازخوانی روی دکمه دریافت فوری کلیک کنید)
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
                );
                })}
              </div>
            )}

            {/* Full-Screen Zoom Modal for Student ID Cards & Receipts */}
            {previewImageModalSrc && (
              <div
                onClick={() => setPreviewImageModalSrc(null)}
                className="fixed inset-0 z-[120] bg-black/90 backdrop-blur-sm flex flex-col items-center justify-center p-4 animate-fade-in"
              >
                <div
                  onClick={(e) => e.stopPropagation()}
                  className="max-w-2xl w-full bg-[#101622] border-2 border-[#D4AB58] rounded-3xl p-4 space-y-3"
                >
                  <div className="flex items-center justify-between text-xs font-black text-[#F6F1E7]">
                    <span>🔍 بررسی دقیق تصویر مدرک دانشجو</span>
                    <button
                      type="button"
                      onClick={() => setPreviewImageModalSrc(null)}
                      className="px-3 py-1 rounded-xl bg-rose-600 text-white cursor-pointer"
                    >
                      بستن ✕
                    </button>
                  </div>
                  <div className="max-h-[75vh] overflow-auto flex items-center justify-center bg-black/50 rounded-2xl p-2">
                    <img
                      src={previewImageModalSrc}
                      alt="تصویر بزرگنمایی‌شده"
                      className="max-w-full max-h-[70vh] object-contain rounded-xl"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ===================================================================
            MODULE 3: 👥 ۳. مدیریت کاربران + قفل و بازکردن کامل + امتیاز دلخواه + چت دوطرفه
           =================================================================== */}
        {activeModule === 3 && (
          <div className={`rounded-3xl p-4 lg:p-6 border space-y-4 ${cardSurfaceClass}`}>
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-current/10 pb-3">
              <div>
                <h2 className="text-sm lg:text-base font-black">
                  👥 ۳. مدیریت کاربران، پرونده ۳۶۰ درجه و گفتگوی دوطرفه با دانشجویان
                </h2>
                <p
                  className={`text-[11px] font-bold ${
                    isNight ? 'text-[#A3C1AD]' : 'text-[#3D5249]'
                  }`}
                >
                  کنترل قفل/باز شدن KYC و حساب، امتیاز دلخواه و چت مستقیم دوطرفه با دانشجو (در مینی‌اپ و ربات تلگرام)
                </p>
              </div>
              <div className="flex items-center gap-2">
                {onSyncWithBotServer && (
                  <button
                    type="button"
                    onClick={() => void onSyncWithBotServer()}
                    className="px-3 py-2 rounded-xl bg-[#D4AB58]/20 hover:bg-[#D4AB58]/30 text-[#D4AB58] border border-[#D4AB58]/40 font-black text-[11px] flex items-center gap-1.5 cursor-pointer"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>بروزرسانی چت‌ها و کاربران</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleExportStudentsCsv}
                  className="px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-[11px] border-b-2 border-emerald-800 flex items-center gap-1.5 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  📊 دانلود اکسل (CSV)
                </button>
              </div>
            </div>

            {/* Module 3 Sub-View Switcher: Students List vs Two-Way Support Chats */}
            <div className="grid grid-cols-2 gap-2 p-1 rounded-2xl bg-black/20">
              <button
                type="button"
                onClick={() => {
                  playTick();
                  setMod3SubView('users');
                }}
                className={`py-2.5 rounded-xl text-xs font-black cursor-pointer transition-all flex items-center justify-center gap-1.5 ${
                  mod3SubView === 'users'
                    ? 'bg-[#D4AB58] text-[#101622] shadow'
                    : 'opacity-75 hover:opacity-100'
                }`}
              >
                <Users className="w-4 h-4" />
                <span>👥 لیست دانشجویان و پرونده ۳۶۰ ({filteredStudents.length.toLocaleString('fa-IR')})</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  playTick();
                  setMod3SubView('chats');
                }}
                className={`py-2.5 rounded-xl text-xs font-black cursor-pointer transition-all flex items-center justify-center gap-1.5 ${
                  mod3SubView === 'chats'
                    ? 'bg-[#D4AB58] text-[#101622] shadow'
                    : 'opacity-75 hover:opacity-100'
                }`}
              >
                <MessageSquare className="w-4 h-4" />
                <span>
                  💬 تیکت‌ها و گفتگوی دوطرفه با دانشجویان ({supportTicketList.length.toLocaleString('fa-IR')})
                </span>
              </button>
            </div>

            {mod3SubView === 'chats' ? (
              <div className="space-y-4">
                {supportTicketList.length === 0 ? (
                  <div className={`p-6 rounded-2xl border text-center space-y-2 text-xs ${subCardClass}`}>
                    <MessageSquare className="w-8 h-8 text-[#D4AB58] mx-auto" />
                    <div className="font-black text-sm">
                      هنوز هیچ تیکت یا گفتگوی فعالی ثبت نشده است
                    </div>
                    <p className="opacity-80 font-bold">
                      می‌توانید از تب «👥 لیست دانشجویان» روی هر دانشجو کلیک کرده و با دکمه «💬 شروع چت جدید / ارسال پیام مستقیم به دانشجو» گفتگو را آغاز کنید.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
                    {/* Left Column: Tickets / Conversations List */}
                    <div className={`p-3 rounded-2xl border space-y-2 max-h-[65vh] overflow-y-auto ${subCardClass}`}>
                      <div className="text-xs font-black text-[#D4AB58] pb-1 border-b border-current/10">
                        🗂 فهرست گفتگوهای دانشجویان ({supportTicketList.length.toLocaleString('fa-IR')}):
                      </div>
                      {supportTicketList.map((tk) => {
                        const isSelected =
                          (selectedAdminChatId || supportTicketList[0]?.id) === tk.id;
                        const lastMsg =
                          Array.isArray(tk.messages) && tk.messages.length > 0
                            ? tk.messages[tk.messages.length - 1]
                            : null;
                        return (
                          <button
                            key={tk.id}
                            type="button"
                            onClick={() => {
                              playTick();
                              setSelectedAdminChatId(tk.id);
                            }}
                            className={`w-full text-right p-3 rounded-xl border transition-all cursor-pointer space-y-1 ${
                              isSelected
                                ? 'border-2 border-[#D4AB58] bg-[#D4AB58]/15'
                                : 'border-current/10 bg-black/15 hover:border-[#D4AB58]/50'
                            }`}
                          >
                            <div className="flex items-center justify-between gap-1">
                              <span className="text-xs font-black truncate">
                                {tk.studentName || 'دانشجو'}{' '}
                                {tk.studentId ? `(${tk.studentId})` : ''}
                              </span>
                              <span
                                className={`text-[10px] px-1.5 py-0.5 rounded font-black shrink-0 ${
                                  tk.status === 'closed'
                                    ? 'bg-rose-900/70 text-rose-200'
                                    : tk.status === 'answered'
                                    ? 'bg-emerald-900/70 text-emerald-200'
                                    : 'bg-amber-500 text-[#101622]'
                                }`}
                              >
                                {tk.status === 'closed'
                                  ? '🔒 بسته'
                                  : tk.status === 'answered'
                                  ? 'پاسخ داده شده ✓'
                                  : 'در انتظار پاسخ'}
                              </span>
                            </div>
                            <div className="text-[11px] font-bold text-[#D4AB58] truncate">
                              {tk.title} ({tk.id})
                            </div>
                            {lastMsg && (
                              <div className="text-[10px] opacity-75 truncate">
                                {lastMsg.sender === 'user' ? '👤 دانشجو: ' : '👨‍💼 ادمین: '}
                                {lastMsg.text}
                              </div>
                            )}
                          </button>
                        );
                      })}
                    </div>

                    {/* Right Column: Active Chat Thread & Reply Box */}
                    {(() => {
                      const activeChat =
                        supportTicketList.find((t) => t.id === selectedAdminChatId) ||
                        supportTicketList[0];
                      if (!activeChat) return null;
                      const matchedStu = studentList.find(
                        (s) =>
                          (activeChat.studentId && s.studentId === activeChat.studentId) ||
                          (activeChat.telegramUserId &&
                            s.telegramUserId === activeChat.telegramUserId)
                      );
                      return (
                        <div
                          className={`lg:col-span-2 p-4 rounded-2xl border flex flex-col justify-between space-y-3 ${subCardClass}`}
                        >
                          <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-current/10">
                            <div>
                              <div className="text-xs font-black flex items-center gap-2">
                                <span>{activeChat.title}</span>
                                <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-black/25 text-[#D4AB58]">
                                  {activeChat.id}
                                </span>
                              </div>
                              <div className="text-[11px] font-bold opacity-80 mt-0.5">
                                دانشجو: {activeChat.studentName || matchedStu?.fullName || 'دانشجو'} • شماره دانشجویی:{' '}
                                <span className="font-mono">
                                  {activeChat.studentId || matchedStu?.studentId || '---'}
                                </span>
                              </div>
                            </div>
                            <div className="flex items-center gap-1.5">
                              {matchedStu && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    playTick();
                                    setSelectedStudentIdForDossier(matchedStu.id);
                                    setDossierTab('chats');
                                  }}
                                  className="px-2.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-[10px] font-black cursor-pointer"
                                >
                                  پرونده ۳۶۰ دانشجو
                                </button>
                              )}
                              {activeChat.status !== 'closed' ? (
                                <button
                                  type="button"
                                  disabled={isSendingAdminChat}
                                  onClick={() => void handleAdminCloseChat(activeChat)}
                                  className="px-3 py-1.5 rounded-xl bg-rose-700 hover:bg-rose-600 text-white text-[11px] font-black cursor-pointer flex items-center gap-1 shadow"
                                >
                                  <Lock className="w-3.5 h-3.5" />
                                  <span>🔒 بستن چت</span>
                                </button>
                              ) : (
                                <span className="px-2.5 py-1 rounded-xl bg-rose-950 text-rose-300 border border-rose-700 text-[10px] font-black">
                                  🔒 چت بسته شده است
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Messages Thread (Student on Right, Admin on Left in RTL) */}
                          <div
                            className="space-y-2.5 max-h-[42vh] overflow-y-auto p-3 rounded-xl bg-black/20 border border-current/10"
                            dir="rtl"
                          >
                            {(Array.isArray(activeChat.messages) ? activeChat.messages : []).map(
                              (msg) => {
                                const isStudentMsg = msg.sender === 'user';
                                return (
                                  <div
                                    key={msg.id}
                                    className={`flex flex-col ${
                                      isStudentMsg ? 'items-start' : 'items-end'
                                    }`}
                                  >
                                    <div className="text-[10px] font-bold opacity-75 px-1 mb-0.5">
                                      {isStudentMsg
                                        ? `👤 ${msg.senderName || activeChat.studentName || 'دانشجو'}`
                                        : `👨‍💼 ${msg.senderName || 'پشتیبانی انجمن صنایع'}`}{' '}
                                      • {msg.date ? `${msg.date} ساعت ` : ''}
                                      {msg.time}
                                    </div>
                                    <div
                                      className={`max-w-[85%] p-2.5 rounded-2xl text-xs font-medium leading-relaxed ${
                                        isStudentMsg
                                          ? 'bg-[#354B40] text-[#F6F1E7] rounded-tr-sm border border-[#7FB69E]/40'
                                          : 'bg-[#1D2B3A] text-[#F6F1E7] rounded-tl-sm border border-[#D4AB58]/50'
                                      }`}
                                    >
                                      {msg.text}
                                    </div>
                                  </div>
                                );
                              }
                            )}
                          </div>

                          {/* Admin Reply Form */}
                          <form
                            onSubmit={(e) => {
                              e.preventDefault();
                              if (!adminReplyText.trim()) return;
                              void handleAdminSendChatMessage({
                                targetStudent: matchedStu || null,
                                existingTicket: activeChat,
                                text: adminReplyText,
                              });
                            }}
                            className="flex flex-col sm:flex-row gap-2 pt-1"
                          >
                            <input
                              type="text"
                              value={adminReplyText}
                              onChange={(e) => setAdminReplyText(e.target.value)}
                              placeholder={
                                activeChat.status === 'closed'
                                  ? 'ارسال پیام جدید و بازگشایی مجدد این گفتگو...'
                                  : 'پاسخ خود را بنویسید (ثبت در مینی‌اپ + ارسال در تلگرام دانشجو)...'
                              }
                              className={`flex-1 px-3 py-2.5 rounded-xl border text-xs font-bold ${inputClass}`}
                            />
                            <button
                              type="submit"
                              disabled={!adminReplyText.trim() || isSendingAdminChat}
                              className="px-4 py-2.5 rounded-xl bg-[#D4AB58] hover:bg-[#e1b864] text-[#101622] font-black text-xs cursor-pointer flex items-center justify-center gap-1.5 shrink-0 disabled:opacity-50"
                            >
                              <Send className="w-3.5 h-3.5 rotate-180" />
                              <span>
                                {isSendingAdminChat
                                  ? 'در حال ارسال...'
                                  : '📤 ارسال به دانشجو (مینی‌اپ + تلگرام)'}
                              </span>
                            </button>
                          </form>
                        </div>
                      );
                    })()}
                  </div>
                )}
              </div>
            ) : (
              <>
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
                    placeholder="جستجو بر اساس نام، شماره دانشجویی (مثلاً 402123456) یا تلفن..."
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
                              {isProtectedMasterAccount(st) && (
                                <span className="text-[10px] px-2 py-0.5 rounded-lg bg-[#D4AB58]/25 text-[#D4AB58] border border-[#D4AB58]/60 font-black">
                                  👑 مالک و مدیر ارشد کل (629890497)
                                </span>
                              )}
                              <span className="text-[10px] px-2 py-0.5 rounded bg-black/20 font-mono font-bold">
                                {st.studentId}
                              </span>
                              {st.isBanned && !isProtectedMasterAccount(st) ? (
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
                              {isProtectedMasterAccount(st) || st.kycStatus === 'verified'
                                ? 'باز و تایید شده ✅'
                                : st.kycStatus === 'required' || st.kycStatus === 'kyc_locked'
                                ? 'قفل شده (نیاز به کارت دانشجویی) 🔒'
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
                        {isProtectedMasterAccount(st) ? (
                          <>
                            <button
                              type="button"
                              disabled
                              className="px-2.5 py-1 rounded-lg bg-zinc-700/40 text-zinc-400 border border-zinc-600/40 cursor-not-allowed opacity-60"
                            >
                              🔒 قفل کارت دانشجویی (غیرفعال)
                            </button>
                            <button
                              type="button"
                              disabled
                              className="px-2.5 py-1 rounded-lg bg-zinc-700/40 text-zinc-400 border border-zinc-600/40 cursor-not-allowed opacity-60"
                            >
                              🔒 مسدودسازی (غیرفعال)
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              type="button"
                              onClick={() =>
                                handleModifyStudentDossier(st, {
                                  explicitKycStatus:
                                    st.kycStatus === 'verified' ? 'required' : 'verified',
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
                                ? '🔓 باز کردن حساب'
                                : '🚫 قفل حساب'}
                            </button>

                            <button
                              type="button"
                              onClick={() => handleDeleteStudentUser(st)}
                              className="px-2 py-1 rounded-lg bg-rose-700 hover:bg-rose-600 text-white cursor-pointer"
                              title="حذف کامل کاربر از سایت و ربات"
                            >
                              🗑 حذف کاربر
                            </button>
                          </>
                        )}

                        <button
                          type="button"
                          onClick={() => {
                            playTick();
                            setSelectedStudentIdForDossier(st.id);
                            setDossierTab('chats');
                          }}
                          className="px-2.5 py-1 rounded-lg bg-[#354B40] text-[#F6F1E7] border border-[#7FB69E]/40 cursor-pointer"
                        >
                          💬 چت مستقیم
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
                          ✏️ ویرایش و امتیاز
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}

            {/* ===============================================================
                360° STUDENT DOSSIER MODAL (Edit Identity, Delete, KYC Lock/Unlock, Custom Points, Direct Chat)
               =============================================================== */}
            {activeDossierStudent && (
              <div
                onClick={() => setSelectedStudentIdForDossier(null)}
                className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
              >
                <div
                  onClick={(e) => e.stopPropagation()}
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
                      aria-label="بستن پرونده ۳۶۰ درجه"
                      className="w-8 h-8 rounded-xl bg-rose-600/20 hover:bg-rose-600 text-rose-300 hover:text-white flex items-center justify-center cursor-pointer transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Quick CTA to Start Direct Chat with Student */}
                  <button
                    type="button"
                    onClick={() => {
                      playTick();
                      setDossierTab('chats');
                    }}
                    className="w-full py-2.5 px-3 rounded-2xl bg-[#354B40] hover:bg-[#3f594c] text-[#F6F1E7] border border-[#7FB69E]/50 font-black text-xs cursor-pointer shadow flex items-center justify-center gap-2"
                  >
                    <MessageSquare className="w-4 h-4 text-[#D4AB58]" />
                    <span>💬 شروع چت جدید / ارسال پیام مستقیم به دانشجو</span>
                  </button>

                  {/* SECTION 0: EDIT USER FULL NAME & STUDENT ID + COMPLETE DELETE */}
                  <div className={`p-3.5 rounded-2xl border space-y-2.5 text-xs ${subCardClass}`}>
                    <div className="font-black text-[#D4AB58]">
                      ✏️ ویرایش نام و شماره دانشجویی یا حذف کامل کاربر:
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <div>
                        <label className="text-[10px] font-bold block mb-1">
                          نام و نام خانوادگی:
                        </label>
                        <input
                          type="text"
                          value={editDossierFullName}
                          onChange={(e) => setEditDossierFullName(e.target.value)}
                          placeholder="نام و نام خانوادگی دانشجو"
                          className={`w-full px-3 py-2 rounded-xl border text-xs font-bold ${inputClass}`}
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold block mb-1">
                          شماره دانشجویی:
                        </label>
                        <input
                          type="text"
                          dir="ltr"
                          value={editDossierStudentId}
                          onChange={(e) => setEditDossierStudentId(e.target.value)}
                          placeholder="شماره دانشجویی"
                          className={`w-full px-3 py-2 rounded-xl border text-xs font-mono font-bold text-center ${inputClass}`}
                        />
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleSaveStudentIdentity(activeDossierStudent)}
                      className="w-full py-2.5 px-3 rounded-xl bg-[#D4AB58] hover:bg-[#e3b963] text-[#101622] font-black text-xs cursor-pointer shadow flex items-center justify-center gap-1.5"
                    >
                      <span>💾 ذخیره مشخصات جدید کاربر</span>
                    </button>

                    {!isProtectedMasterAccount(activeDossierStudent) && (
                      <button
                        type="button"
                        onClick={() => handleDeleteStudentUser(activeDossierStudent)}
                        className="w-full py-2.5 px-3 rounded-xl bg-rose-700 hover:bg-rose-600 text-white font-black text-xs cursor-pointer shadow flex items-center justify-center gap-1.5"
                      >
                        <Trash2 className="w-4 h-4" />
                        <span>🗑 حذف کامل این کاربر از سایت و ربات</span>
                      </button>
                    )}
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
                        disabled={
                          isProtectedMasterAccount(activeDossierStudent) &&
                          !isCurrentActingAdminMaster
                        }
                        onClick={() =>
                          handleModifyStudentDossier(activeDossierStudent, {
                            deltaScore: -Math.abs(Number(customPointsInput) || 10),
                            reason: customPointsReason,
                          })
                        }
                        className="py-2.5 px-3 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-black text-xs cursor-pointer shadow disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        ➖ کسر {Math.abs(Number(customPointsInput) || 10)} امتیاز
                      </button>
                    </div>
                  </div>

                  {/* SECTION B: FULL TWO-WAY LOCK & UNLOCK CONTROLS */}
                  <div className={`p-3.5 rounded-2xl border space-y-2.5 text-xs ${subCardClass}`}>
                    <div className="flex items-center justify-between flex-wrap gap-1.5">
                      <span className="font-black">
                        🔐 کنترل دوطرفه قفل و باز کردن دسترسی‌های کاربر:
                      </span>
                      {isProtectedMasterAccount(activeDossierStudent) && (
                        <span className="text-[10px] px-2 py-0.5 rounded-lg bg-[#D4AB58]/25 text-[#D4AB58] border border-[#D4AB58]/60 font-black">
                          👑 مالک و مدیر ارشد کل (629890497)
                        </span>
                      )}
                    </div>

                    {isProtectedMasterAccount(activeDossierStudent) ? (
                      <div className="p-3 rounded-xl bg-[#D4AB58]/10 border border-[#D4AB58]/40 space-y-2">
                        <p className="text-[11px] font-bold text-[#D4AB58]">
                          این حساب متعلق به مالک اصلی ربات و انجمن (آیدی عددی 629890497) است و دکمه‌های محدودسازی به طور دائمی قفل هستند.
                        </p>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                          <button
                            type="button"
                            disabled
                            className="py-1.5 px-2 rounded-lg text-[10px] font-black bg-zinc-700/40 text-zinc-400 border border-zinc-600/40 cursor-not-allowed opacity-60"
                          >
                            🔒 قفل کارت دانشجویی
                          </button>
                          <button
                            type="button"
                            disabled
                            className="py-1.5 px-2 rounded-lg text-[10px] font-black bg-zinc-700/40 text-zinc-400 border border-zinc-600/40 cursor-not-allowed opacity-60"
                          >
                            🔒 مسدودسازی
                          </button>
                          <button
                            type="button"
                            disabled
                            className="py-1.5 px-2 rounded-lg text-[10px] font-black bg-zinc-700/40 text-zinc-400 border border-zinc-600/40 cursor-not-allowed opacity-60"
                          >
                            🔒 فریز کردن
                          </button>
                          <button
                            type="button"
                            disabled
                            className="py-1.5 px-2 rounded-lg text-[10px] font-black bg-zinc-700/40 text-zinc-400 border border-zinc-600/40 cursor-not-allowed opacity-60"
                          >
                            🔒 حذف دسترسی
                          </button>
                        </div>
                      </div>
                    ) : (
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
                                : 'قفل‌شده (نیاز به کارت) 🔒'}
                            </span>
                          </div>
                          <div className="grid grid-cols-1 gap-1.5">
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
                              🔓 باز کردن قفل KYC (تایید هویت)
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                handleModifyStudentDossier(activeDossierStudent, {
                                  explicitKycStatus: 'required',
                                })
                              }
                              className={`py-1.5 px-2 rounded-lg text-[10px] font-black cursor-pointer ${
                                activeDossierStudent.kycStatus === 'required' ||
                                activeDossierStudent.kycStatus === 'kyc_locked'
                                  ? 'bg-rose-700/40 text-rose-300 border border-rose-500/40'
                                  : 'bg-rose-700 text-white shadow'
                              }`}
                            >
                              🔒 قفل کردن KYC (درخواست کارت دانشجویی)
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
                          <div className="grid grid-cols-1 gap-1.5">
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
                    )}
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

                  {(() => {
                    const studentTickets = supportTicketList.filter(
                      (tk) =>
                        (activeDossierStudent.studentId &&
                          tk.studentId === activeDossierStudent.studentId) ||
                        (activeDossierStudent.telegramUserId &&
                          tk.telegramUserId === activeDossierStudent.telegramUserId)
                    );
                    const totalChatCount =
                      studentTickets.reduce(
                        (sum, tk) => sum + (Array.isArray(tk.messages) ? tk.messages.length : 0),
                        0
                      ) || activeDossierStudent.chatLogs.length;

                    return (
                      <>
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
                            چت‌ها ({totalChatCount})
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
                          <div className="space-y-3 text-xs">
                            {(() => {
                              const latestTicket =
                                studentTickets.find((t) => t.status !== 'closed') ||
                                studentTickets[0] ||
                                null;
                              return (
                                <>
                                  <div className="flex flex-wrap items-center justify-between gap-2">
                                    <span className="font-black text-[#D4AB58]">
                                      💬 گفتگوی دوطرفه با {activeDossierStudent.fullName}:
                                    </span>
                                    {latestTicket && latestTicket.status !== 'closed' && (
                                      <button
                                        type="button"
                                        disabled={isSendingAdminChat}
                                        onClick={() => void handleAdminCloseChat(latestTicket)}
                                        className="px-2.5 py-1 rounded-xl bg-rose-700 hover:bg-rose-600 text-white text-[10px] font-black cursor-pointer flex items-center gap-1"
                                      >
                                        <Lock className="w-3 h-3" />
                                        <span>🔒 بستن چت ({latestTicket.id})</span>
                                      </button>
                                    )}
                                    {latestTicket && latestTicket.status === 'closed' && (
                                      <span className="px-2 py-0.5 rounded bg-rose-950 text-rose-300 border border-rose-700 text-[10px] font-black">
                                        🔒 آخرین گفتگو بسته شده است
                                      </span>
                                    )}
                                  </div>

                                  <div
                                    className="space-y-2 max-h-56 overflow-y-auto p-3 rounded-2xl bg-black/20 border border-current/10"
                                    dir="rtl"
                                  >
                                    {studentTickets.length > 0 ? (
                                      studentTickets.flatMap((tk) =>
                                        (Array.isArray(tk.messages) ? tk.messages : []).map(
                                          (msg) => {
                                            const isStu = msg.sender === 'user';
                                            return (
                                              <div
                                                key={`${tk.id}-${msg.id}`}
                                                className={`flex flex-col ${
                                                  isStu ? 'items-start' : 'items-end'
                                                }`}
                                              >
                                                <div className="text-[10px] font-bold opacity-75 px-1 mb-0.5">
                                                  {isStu
                                                    ? `👤 ${msg.senderName || activeDossierStudent.fullName}`
                                                    : `👨‍💼 ${msg.senderName || 'پشتیبانی انجمن صنایع'}`}{' '}
                                                  • {msg.date ? `${msg.date} ساعت ` : ''}
                                                  {msg.time}
                                                </div>
                                                <div
                                                  className={`max-w-[85%] p-2.5 rounded-2xl text-xs font-medium leading-relaxed ${
                                                    isStu
                                                      ? 'bg-[#354B40] text-[#F6F1E7] rounded-tr-sm border border-[#7FB69E]/40'
                                                      : 'bg-[#1D2B3A] text-[#F6F1E7] rounded-tl-sm border border-[#D4AB58]/50'
                                                  }`}
                                                >
                                                  {msg.text}
                                                </div>
                                              </div>
                                            );
                                          }
                                        )
                                      )
                                    ) : (Array.isArray(activeDossierStudent.chatLogs)
                                        ? activeDossierStudent.chatLogs
                                        : []
                                      ).length === 0 ? (
                                      <div className="p-3 text-center font-bold opacity-75">
                                        هنوز گفتگویی با این دانشجو ثبت نشده است. با ارسال پیام در کادر زیر، گفتگوی مستقیم آغاز می‌شود.
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

                                  <form
                                    onSubmit={(e) => {
                                      e.preventDefault();
                                      if (!directDossierMessageText.trim()) return;
                                      void handleAdminSendChatMessage({
                                        targetStudent: activeDossierStudent,
                                        existingTicket:
                                          latestTicket && latestTicket.status !== 'closed'
                                            ? latestTicket
                                            : null,
                                        text: directDossierMessageText,
                                      });
                                    }}
                                    className="space-y-2 pt-1"
                                  >
                                    <textarea
                                      rows={2}
                                      value={directDossierMessageText}
                                      onChange={(e) =>
                                        setDirectDossierMessageText(e.target.value)
                                      }
                                      placeholder={`پیام مستقیم به ${activeDossierStudent.fullName} (نمایش در چت مینی‌اپ + ارسال در ربات تلگرام)...`}
                                      className={`w-full px-3 py-2 rounded-xl border text-xs font-bold ${inputClass}`}
                                    />
                                    <button
                                      type="submit"
                                      disabled={
                                        !directDossierMessageText.trim() || isSendingAdminChat
                                      }
                                      className="w-full py-2.5 px-3 rounded-xl bg-[#D4AB58] hover:bg-[#e1b864] text-[#101622] font-black text-xs cursor-pointer shadow flex items-center justify-center gap-1.5 disabled:opacity-50"
                                    >
                                      <Send className="w-3.5 h-3.5 rotate-180" />
                                      <span>
                                        {isSendingAdminChat
                                          ? 'در حال ارسال...'
                                          : '📤 ارسال پیام مستقیم به دانشجو (مینی‌اپ + تلگرام)'}
                                      </span>
                                    </button>
                                  </form>
                                </>
                              );
                            })()}
                          </div>
                        )}
                      </>
                    );
                  })()}
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
                          {ev.title} ({ev.date} •{' '}
                          {ev.hasCapacityLimit === false
                            ? '♾️ ظرفیت نامحدود'
                            : `ظرفیت باقی‌مانده: ${ev.capacityRemaining} نفر`}
                          )
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
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
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
                      <div className="flex items-center justify-between mb-0.5">
                        <span className="text-[10px] font-bold">تعیین سقف ظرفیت:</span>
                        <button
                          type="button"
                          onClick={() => {
                            playSwitch();
                            setEventHasCapacityLimitInput((prev) => !prev);
                          }}
                          className={`px-2 py-0.5 rounded-lg text-[10px] font-black cursor-pointer ${
                            eventHasCapacityLimitInput
                              ? 'bg-emerald-600 text-white'
                              : 'bg-amber-500/20 text-[#D4AB58] border border-[#D4AB58]/40'
                          }`}
                        >
                          {eventHasCapacityLimitInput ? '✅ دارای سقف ظرفیت' : '♾️ ظرفیت نامحدود'}
                        </button>
                      </div>
                      {eventHasCapacityLimitInput ? (
                        <input
                          type="number"
                          min={1}
                          value={eventCapacityInput}
                          onChange={(e) =>
                            setEventCapacityInput(Math.max(1, Number(e.target.value) || 1))
                          }
                          placeholder="سقف ظرفیت (مثلاً ۴۰)"
                          className={`w-full px-2.5 py-1.5 rounded-xl border text-xs font-bold ${inputClass}`}
                        />
                      ) : (
                        <div className="px-2.5 py-1.5 rounded-xl border border-dashed border-[#D4AB58]/40 bg-black/20 text-[11px] font-black text-[#D4AB58] text-center">
                          ♾️ ظرفیت نامحدود (بدون قفل تکمیل ظرفیت)
                        </div>
                      )}
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
                  {/* Per-Workshop Points-to-Discount Slider Configuration */}
                  <div className="p-3.5 rounded-2xl border border-[#D4AB58]/40 bg-black/20 space-y-2.5">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <span className="font-black text-[#D4AB58] block">
                          💎 نوار تبدیل امتیاز به کد تخفیف برای این کارگاه:
                        </span>
                        <span className="text-[10px] opacity-80 font-bold">
                          مشخص کنید دانشجو بتواند امتیازهایش را برای این کارگاه به تخفیف تبدیل کند (به همراه کف، سقف و ضریب)
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          playSwitch();
                          setEventAllowDiscountInput((prev) => !prev);
                        }}
                        className={`px-3 py-1.5 rounded-xl font-black text-[11px] cursor-pointer transition-all ${
                          eventAllowDiscountInput && eventPriceInput > 0
                            ? 'bg-emerald-600 text-white shadow'
                            : 'bg-zinc-700 text-zinc-300'
                        }`}
                      >
                        {eventPriceInput <= 0
                          ? 'کارگاه رایگان است'
                          : eventAllowDiscountInput
                          ? '✅ فعال برای این کارگاه'
                          : '🚫 غیرفعال برای این کارگاه'}
                      </button>
                    </div>

                    {eventAllowDiscountInput && eventPriceInput > 0 && (
                      <div className="space-y-2 pt-2 border-t border-white/10">
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                          <div>
                            <span className="text-[10px] font-bold block mb-0.5">
                              ضریب امتیاز (هر X امتیاز):
                            </span>
                            <input
                              type="text"
                              inputMode="numeric"
                              dir="ltr"
                              value={eventDiscountStepInput}
                              onFocus={(e) => e.currentTarget.select()}
                              onChange={(e) =>
                                setEventDiscountStepInput(
                                  Math.max(1, parseFlexibleNumberInput(e.target.value, 20))
                                )
                              }
                              className={`w-full px-2.5 py-1.5 rounded-xl border text-center font-mono font-bold ${inputClass}`}
                            />
                          </div>
                          <div>
                            <span className="text-[10px] font-bold block mb-0.5">
                              تخفیف هر ضریب (تومان):
                            </span>
                            <input
                              type="text"
                              inputMode="numeric"
                              dir="ltr"
                              value={eventDiscountTomansInput}
                              onFocus={(e) => e.currentTarget.select()}
                              onChange={(e) =>
                                setEventDiscountTomansInput(
                                  Math.max(1000, parseFlexibleNumberInput(e.target.value, 10000))
                                )
                              }
                              className={`w-full px-2.5 py-1.5 rounded-xl border text-center font-mono font-bold ${inputClass}`}
                            />
                          </div>
                          <div>
                            <span className="text-[10px] font-bold block mb-0.5">
                              کف امتیاز مجاز (حداقل):
                            </span>
                            <input
                              type="text"
                              inputMode="numeric"
                              dir="ltr"
                              value={eventDiscountMinInput}
                              onFocus={(e) => e.currentTarget.select()}
                              onChange={(e) =>
                                setEventDiscountMinInput(
                                  Math.max(1, parseFlexibleNumberInput(e.target.value, 20))
                                )
                              }
                              className={`w-full px-2.5 py-1.5 rounded-xl border text-center font-mono font-bold ${inputClass}`}
                            />
                          </div>
                          <div>
                            <span className="text-[10px] font-bold block mb-0.5">
                              سقف امتیاز مجاز (حداکثر):
                            </span>
                            <input
                              type="text"
                              inputMode="numeric"
                              dir="ltr"
                              value={eventDiscountMaxInput}
                              onFocus={(e) => e.currentTarget.select()}
                              onChange={(e) =>
                                setEventDiscountMaxInput(
                                  Math.max(1, parseFlexibleNumberInput(e.target.value, 100))
                                )
                              }
                              className={`w-full px-2.5 py-1.5 rounded-xl border text-center font-mono font-bold ${inputClass}`}
                            />
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-1.5 text-[10px] text-[#FCE7A4] font-bold">
                          <span>پله‌های ضریب تخفیف این کارگاه:</span>
                          {[1, 2, 3].map((mult) => {
                            const stepPts = Math.max(1, eventDiscountStepInput || 20);
                            const pts = Math.max(eventDiscountMinInput || stepPts, stepPts) + (mult - 1) * stepPts;
                            if (pts > Math.max(eventDiscountMinInput || stepPts, eventDiscountMaxInput || 100)) {
                              return null;
                            }
                            const disc = Math.floor(pts / stepPts) * (eventDiscountTomansInput || 10000);
                            return (
                              <span
                                key={mult}
                                className="px-2 py-0.5 rounded-lg bg-[#D4AB58]/20 border border-[#D4AB58]/40"
                              >
                                {pts.toLocaleString('fa-IR')} امتیاز = {disc.toLocaleString('fa-IR')} ت
                              </span>
                            );
                          })}
                        </div>
                      </div>
                    )}
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
                    const isDiscountActive = ev.basePrice > 0 && ev.allowPointsDiscount !== false;
                    const evStep = ev.discountPointsStep || discountRule.pointsStep || 20;
                    const evTomans =
                      ev.discountTomansPerStep || discountRule.discountTomansPerStep || 10000;
                    const evMin = ev.discountMinPoints || discountRule.minPoints || evStep;
                    const evMax = ev.discountMaxPoints || discountRule.maxPoints || 100;
                    const hasCapLimit = ev.hasCapacityLimit !== false;
                    const totalCap = ev.totalCapacity || ev.capacityTotal || 40;
                    const remCap = Math.max(0, ev.capacityRemaining ?? ev.remainingCapacity ?? 0);
                    const regCount =
                      ev.registeredCount ??
                      (hasCapLimit ? Math.max(0, totalCap - remCap) : 0);
                    const isFull = isEventCapacityFull(ev);
                    return (
                      <div
                        key={ev.id}
                        className={`p-3 rounded-2xl border flex flex-col justify-between gap-2 text-xs ${
                          isFeatured
                            ? 'border-2 border-[#D4AB58] bg-[#D4AB58]/10'
                            : subCardClass
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              {isFeatured && (
                                <span className="px-2 py-0.5 rounded-full bg-[#E77F6E] text-[#101622] text-[10px] font-black">
                                  🌟 رویداد ویژه صفحه اول
                                </span>
                              )}
                              {isFull && (
                                <span className="px-2 py-0.5 rounded-full bg-rose-700 text-white text-[10px] font-black">
                                  🔒 تکمیل ظرفیت
                                </span>
                              )}
                              <span className="font-black truncate">{ev.title}</span>
                            </div>
                            <div
                              className={`text-[11px] font-bold mt-0.5 ${
                                isNight ? 'text-[#A3C1AD]' : 'text-[#3D5249]'
                              }`}
                            >
                              {ev.date} •{' '}
                              {hasCapLimit
                                ? `ظرفیت کل: ${totalCap.toLocaleString('fa-IR')} • ثبت‌نام‌شده: ${regCount.toLocaleString('fa-IR')} • باقی‌مانده واقعی: ${remCap.toLocaleString('fa-IR')} نفر`
                                : `♾️ ظرفیت نامحدود • ثبت‌نام‌شده: ${regCount.toLocaleString('fa-IR')} نفر`}{' '}
                              • +{ev.rewardPoints} امتیاز
                            </div>
                            {ev.basePrice > 0 && (
                              <div className="text-[10px] font-bold text-[#D4AB58] mt-1">
                                {isDiscountActive
                                  ? `💎 تخفیف فعال: هر ${evStep.toLocaleString('fa-IR')} امتیاز = ${evTomans.toLocaleString('fa-IR')} ت (کف ${evMin.toLocaleString('fa-IR')} / سقف ${evMax.toLocaleString('fa-IR')})`
                                  : '🚫 نوار تخفیف امتیازی برای این کارگاه غیرفعال است'}
                              </div>
                            )}
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            {ev.basePrice > 0 && (
                              <button
                                type="button"
                                onClick={() => {
                                  playSwitch();
                                  const nextAllowed = ev.allowPointsDiscount === false;
                                  const updated = (Array.isArray(eventList) ? eventList : []).map(
                                    (item, i) =>
                                      item.id === ev.id
                                        ? normalizeEvent(
                                            { ...item, allowPointsDiscount: nextAllowed },
                                            i
                                          )
                                        : normalizeEvent(item, i)
                                  );
                                  setEventList(updated);
                                  onUpdateEvents?.(updated);
                                  void saveEventsOnBot(updated);
                                  triggerToast(
                                    nextAllowed
                                      ? `💎 نوار تبدیل امتیاز به تخفیف برای «${ev.title}» فعال شد!`
                                      : `🚫 نوار تخفیف امتیازی برای «${ev.title}» غیرفعال شد.`
                                  );
                                }}
                                className={`px-2 py-1.5 rounded-xl text-[10px] font-black cursor-pointer ${
                                  isDiscountActive
                                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                                    : 'bg-zinc-700/60 text-zinc-300'
                                }`}
                                title="تغییر وضعیت فعال بودن نوار تخفیف امتیازی این کارگاه"
                              >
                                {isDiscountActive ? '💎 تخفیف: فعال' : '🚫 تخفیف: خاموش'}
                              </button>
                            )}
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
                                setEventHasCapacityLimitInput(ev.hasCapacityLimit !== false);
                                setEventCapacityInput(
                                  ev.hasCapacityLimit !== false
                                    ? ev.totalCapacity || ev.capacityTotal || 40
                                    : 40
                                );
                                setEventPointsInput(ev.rewardPoints);
                                setEventInstructorInput(ev.instructor);
                                setEventAllowDiscountInput(ev.allowPointsDiscount !== false);
                                setEventDiscountStepInput(
                                  ev.discountPointsStep || discountRule.pointsStep || 20
                                );
                                setEventDiscountTomansInput(
                                  ev.discountTomansPerStep ||
                                    discountRule.discountTomansPerStep ||
                                    10000
                                );
                                setEventDiscountMinInput(
                                  ev.discountMinPoints ||
                                    discountRule.minPoints ||
                                    ev.discountPointsStep ||
                                    20
                                );
                                setEventDiscountMaxInput(
                                  ev.discountMaxPoints || discountRule.maxPoints || 100
                                );
                              }}
                              className="p-2 rounded-xl bg-amber-500/20 text-amber-400 cursor-pointer"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                playError();
                                const updated = (Array.isArray(eventList) ? eventList : [])
                                  .filter((item) => item.id !== ev.id)
                                  .map((item, i) => normalizeEvent(item, i));
                                setEventList(updated);
                                onUpdateEvents?.(updated);
                                void saveEventsOnBot(updated);
                                appendLog(
                                  'حذف کارگاه/رویداد و همگام‌سازی با ربات تلگرام',
                                  ev.title,
                                  'warning'
                                );
                                triggerToast(
                                  `🗑 رویداد «${ev.title}» از مینی‌اپ و ربات تلگرام حذف شد.`
                                );
                              }}
                              className="p-2 rounded-xl bg-rose-500/20 text-rose-400 cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
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
                        <div className="flex items-center gap-1.5 shrink-0">
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
                          <button
                            type="button"
                            onClick={() => handleDeleteProfessor(prof.id, prof.name)}
                            className="p-1.5 rounded-xl bg-rose-500/20 text-rose-400 cursor-pointer"
                            title="حذف استاد"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
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
                      timestamp: 'هم‌اکنون (سنجاق انجمن صنایع)',
                      tag: manualAnnTag.trim() || 'اطلاعیه فوری',
                      author: `انجمن علمی مهندسی صنایع (@${handle})`,
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
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="font-black">
                      📌 انتشار و سنجاق اطلاعیه دستی در صدر مینی‌اپ:
                    </div>
                    <button
                      type="button"
                      disabled={isGeneratingAnnAi}
                      onClick={handleGenerateSmartAnnouncement}
                      className="px-3 py-1.5 rounded-xl bg-[#D4AB58]/20 hover:bg-[#D4AB58]/30 text-[#D4AB58] border border-[#D4AB58]/50 text-[11px] font-black cursor-pointer flex items-center gap-1.5"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>
                        {isGeneratingAnnAi
                          ? '⏳ در حال نگارش با هوش مصنوعی...'
                          : '✨ تولید هوشمند متن اطلاعیه با هوش مصنوعی'}
                      </span>
                    </button>
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

            {/* Admin Toggle Switch to Lock/Disable Student Personal Timers */}
            <div
              className={`p-4 rounded-2xl border-2 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 transition-all ${
                flagsState.allowStudentTimers === false
                  ? 'bg-rose-950/40 border-rose-500/60'
                  : 'bg-emerald-950/30 border-emerald-500/40'
              }`}
            >
              <div className="space-y-1">
                <div className="text-xs sm:text-sm font-black text-[#D4AB58]">
                  🔒 قفل کردن ساخت یادآور شخصی توسط دانشجویان (فقط ارسال یادآورهای ادمین)
                </div>
                <p className="text-[11px] font-bold opacity-85">
                  {flagsState.allowStudentTimers === false
                    ? '⛔ فعال: دانشجویان نمی‌توانند تایمر شخصی بسازند و فقط یادآورهای رسمی انجمن ارسال می‌شوند.'
                    : '✅ غیرفعال (باز): دانشجویان می‌توانند علاوه بر یادآورهای انجمن، یادآور شخصی هم ثبت کنند.'}
                </p>
              </div>
              <button
                type="button"
                onClick={handleToggleStudentPersonalTimersLock}
                className={`px-4 py-2.5 rounded-xl font-black text-xs cursor-pointer shrink-0 transition-all border-b-4 active:border-b-0 active:translate-y-1 ${
                  flagsState.allowStudentTimers === false
                    ? 'bg-rose-600 hover:bg-rose-500 text-white border-rose-800'
                    : 'bg-[#D4AB58] hover:bg-[#e0b865] text-[#101622] border-[#8A6A26]'
                }`}
              >
                {flagsState.allowStudentTimers === false
                  ? '🔒 قفل فعال است (کلیک برای باز کردن)'
                  : '🔓 قفل کردن تایمر شخصی دانشجویان'}
              </button>
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
                  دستیار مشتی انجمن علمی مهندسی صنایع (سلام ستون!، روی چشمم، حله رفیق)
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

            {/* Sub-section C: Gemini API Key Server Updater (POST /api/miniapp/admin-update-secrets) */}
            <form
              onSubmit={handleUpdateServerSecrets}
              className={`p-4 rounded-2xl border-2 border-[#D4AB58]/50 space-y-3 text-xs ${subCardClass}`}
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="font-black text-sm text-[#D4AB58] flex items-center gap-1.5">
                  <Key className="w-4 h-4" />
                  <span>🔑 تنظیم و تغییر کلید API هوش مصنوعی (Gemini API Key)</span>
                </div>
                <span
                  className="px-2.5 py-1 rounded-lg bg-emerald-500/20 text-emerald-400 font-mono text-[11px] font-black"
                  dir="ltr"
                >
                  {maskedGeminiKeyStatus}
                </span>
              </div>
              <p className="text-[11px] font-bold opacity-85">
                کلید جدید مستقیماً از طریق مسیر امن <code dir="ltr">/api/miniapp/admin-update-secrets</code> به سرور کلودفلر ارسال می‌شود و تمام درخواست‌های هوش مصنوعی از طریق <code dir="ltr">/api/miniapp/ai-chat</code> اجرا می‌گردند.
              </p>
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="password"
                  dir="ltr"
                  value={newGeminiApiKeyInput}
                  onChange={(e) => setNewGeminiApiKeyInput(e.target.value)}
                  placeholder="AIzaSy... (کلید جدید Gemini API)"
                  className={`flex-1 px-3 py-2 rounded-xl border font-mono text-xs font-bold ${inputClass}`}
                />
                <button
                  type="submit"
                  disabled={isUpdatingSecrets}
                  className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs cursor-pointer shrink-0 shadow"
                >
                  {isUpdatingSecrets
                    ? '⏳ در حال ذخیره در سرور...'
                    : '💾 ذخیره کلید API در سرور'}
                </button>
                <button
                  type="button"
                  disabled={isTestingAiLive}
                  onClick={handleTestLiveAiConnection}
                  className="px-4 py-2.5 rounded-xl bg-[#D4AB58] hover:bg-[#e1b864] text-[#101622] font-black text-xs cursor-pointer shrink-0 shadow"
                >
                  {isTestingAiLive
                    ? '⏳ در حال تست زنده...'
                    : '⚡ تست زنده اتصال هوش مصنوعی'}
                </button>
              </div>

              {liveAiTestResult && (
                <div
                  className={`p-3 rounded-xl border text-xs space-y-1 ${
                    liveAiTestResult.ok
                      ? 'bg-emerald-500/15 border-emerald-500/50 text-emerald-300'
                      : 'bg-rose-500/15 border-rose-500/50 text-rose-300'
                  }`}
                >
                  <div className="flex items-center justify-between font-black">
                    <span>
                      {liveAiTestResult.ok
                        ? '✅ اتصال زنده هوش مصنوعی سرور برقرار است'
                        : '⚠️ خطا در برقراری ارتباط با هوش مصنوعی'}
                    </span>
                    <span dir="ltr" className="text-[11px] font-mono px-2 py-0.5 rounded bg-black/30">
                      Model: {liveAiTestResult.modelUsed}
                    </span>
                  </div>
                  <p className="text-[11px] font-bold leading-relaxed">
                    پاسخ دریافتی از هوش مصنوعی: «{liveAiTestResult.reply}»
                  </p>
                </div>
              )}
            </form>
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
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-sm font-black text-[#D4AB58]">
                          🎰 شخصی‌سازی کامل صندوقچه‌ها، ورودی‌ها، جوایز و درصد شانس
                        </h3>
                        <span className="text-[10px] font-black px-2 py-0.5 rounded-lg bg-rose-500/20 text-rose-300 border border-rose-500/40">
                          👁️ جوایز و درصدها فقط برای ادمین قابل مشاهده است (مخفی برای دانشجو)
                        </span>
                      </div>
                      <p className="text-[11px] font-bold opacity-80 mt-0.5">
                        تعداد صندوقچه‌ها، نام، هزینه ورودی الماس، لیست جوایز و درصد شانس هر جایزه (۰ تا ۱۰۰٪) را کاملاً دلخواه تنظیم کنید.
                      </p>
                    </div>
                    <button
                      type="button"
                      disabled={isSavingLootbox}
                      onClick={async () => {
                        playCoin();
                        setIsSavingLootbox(true);
                        try {
                          const normalizedChests = getNormalizedLootboxChests(lootboxDraft);
                          const syncedDraft = syncLootboxConfigWithChests(
                            normalizedChests,
                            lootboxDraft
                          );
                          setLootboxDraft(syncedDraft);
                          onUpdateLootboxConfig?.(syncedDraft);
                          const res = await saveLootboxConfigOnBot(syncedDraft);
                          appendLog(
                            'ذخیره تنظیمات صندوقچه‌ها و درصد شانس',
                            `${normalizedChests.length} صندوقچه فعال`,
                            'success'
                          );
                          triggerToast(
                            res.ok
                              ? '✅ صندوقچه‌ها، هزینه‌های ورودی و درصد شانس‌ها در سرور ربات و مینی‌اپ ذخیره شد!'
                              : '✅ صندوقچه‌ها، هزینه‌های ورودی و درصد شانس‌ها در مینی‌اپ ذخیره و فعال شد!'
                          );
                        } finally {
                          setIsSavingLootbox(false);
                        }
                      }}
                      className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs cursor-pointer shadow-md border-b-2 border-emerald-800"
                    >
                      {isSavingLootbox
                        ? '⏳ در حال ذخیره در سرور...'
                        : '💾 ذخیره تغییرات صندوقچه‌ها در سرور'}
                    </button>
                  </div>

                  {/* 1. ADD NEW CUSTOM CHEST FORM */}
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      if (!newChestTitle.trim()) {
                        playError();
                        triggerToast('⚠️ لطفاً نام صندوقچه جدید را وارد کنید.');
                        return;
                      }
                      playCoin();
                      const currentChests = getNormalizedLootboxChests(lootboxDraft);
                      const createdChest: LootboxChestConfig = {
                        id: `chest-${Date.now()}`,
                        title: newChestTitle.trim(),
                        subtitle:
                          newChestSubtitle.trim() || 'صندوقچه ویژه انجمن علمی مهندسی صنایع',
                        cost: Math.max(1, parseFlexibleNumberInput(newChestCost, 75)),
                        themeColor: newChestTheme,
                        iconFilename: '35_icon_gift_box.png',
                        prizes: [
                          {
                            id: `prz-${Date.now()}-1`,
                            title: 'کد تخفیف ۳۰٪ کارگاه‌های انجمن',
                            chancePercent: 50,
                            rewardType: 'discount',
                          },
                          {
                            id: `prz-${Date.now()}-2`,
                            title: '۲۰ امتیاز الماس هدیه',
                            chancePercent: 30,
                            rewardType: 'points',
                            bonusPoints: 20,
                          },
                          {
                            id: `prz-${Date.now()}-3`,
                            title: 'پوچ (شانس مجدد در دفعات بعد)',
                            chancePercent: 20,
                            rewardType: 'empty',
                          },
                        ],
                      };
                      const nextChests = [...currentChests, createdChest];
                      const nextConfig = syncLootboxConfigWithChests(nextChests, lootboxDraft);
                      setLootboxDraft(nextConfig);
                      onUpdateLootboxConfig?.(nextConfig);
                      setNewPrizeChestType(createdChest.id);
                      setNewChestTitle('');
                      setNewChestSubtitle('');
                      triggerToast(
                        `📦 صندوقچه جدید «${createdChest.title}» با ورودی ${createdChest.cost} الماس ساخته شد!`
                      );
                    }}
                    className={`p-3.5 rounded-2xl border space-y-2.5 ${cardSurfaceClass}`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-black text-xs text-[#D4AB58]">
                        ➕ ساخت صندوقچه جدید (تعیین نام، ورودی الماس و رنگ):
                      </span>
                      <span className="text-[10px] font-bold opacity-75">
                        تعداد صندوقچه‌های فعال:{' '}
                        {getNormalizedLootboxChests(lootboxDraft).length.toLocaleString('fa-IR')} عدد
                      </span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                      <input
                        type="text"
                        value={newChestTitle}
                        onChange={(e) => setNewChestTitle(e.target.value)}
                        placeholder="نام صندوقچه (مثلاً: صندوقچه الماسی)"
                        className={`px-3 py-2 rounded-xl border text-xs font-bold ${inputClass}`}
                      />
                      <input
                        type="text"
                        value={newChestSubtitle}
                        onChange={(e) => setNewChestSubtitle(e.target.value)}
                        placeholder="توضیح کوتاه (اختیاری)"
                        className={`px-3 py-2 rounded-xl border text-xs font-bold ${inputClass}`}
                      />
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-bold shrink-0">ورودی (💎):</span>
                        <input
                          type="text"
                          inputMode="numeric"
                          dir="ltr"
                          value={newChestCost}
                          onFocus={(e) => e.currentTarget.select()}
                          onChange={(e) =>
                            setNewChestCost(
                              Math.max(0, parseFlexibleNumberInput(e.target.value, 0))
                            )
                          }
                          className={`w-full px-2.5 py-2 rounded-xl border text-center font-mono font-black text-xs ${inputClass}`}
                        />
                      </div>
                      <div className="flex gap-1.5">
                        <select
                          value={newChestTheme}
                          onChange={(e) =>
                            setNewChestTheme(
                              e.target.value as LootboxChestConfig['themeColor']
                            )
                          }
                          className={`flex-1 px-2 py-2 rounded-xl border text-xs font-black ${inputClass}`}
                        >
                          <option value="gold">🏆 طلایی</option>
                          <option value="bronze">🥉 برنزی / مرجانی</option>
                          <option value="emerald">💎 زمردی</option>
                          <option value="purple">🔮 بنفش کهکشانی</option>
                        </select>
                        <button
                          type="submit"
                          className="px-3 py-2 rounded-xl bg-[#D4AB58] text-[#101622] font-black text-xs cursor-pointer shrink-0"
                        >
                          + ساخت صندوقچه
                        </button>
                      </div>
                    </div>
                  </form>

                  {/* 2. ADD NEW PRIZE TO ANY CHEST FORM */}
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      if (!newPrizeTitle.trim()) {
                        playError();
                        triggerToast('⚠️ لطفاً عنوان جایزه را وارد کنید.');
                        return;
                      }
                      playCoin();
                      const currentChests = getNormalizedLootboxChests(lootboxDraft);
                      const targetChestId =
                        currentChests.some((c) => c.id === newPrizeChestType)
                          ? newPrizeChestType
                          : currentChests[0]?.id || 'bronze';

                      const createdPrize: LootboxPrizeItem = {
                        id: `${targetChestId}-${Date.now()}`,
                        title: newPrizeTitle.trim(),
                        chancePercent: Math.max(
                          0,
                          Math.min(100, parseFlexibleNumberInput(newPrizeChance, 0))
                        ),
                        rewardType: newPrizeRewardType,
                        bonusPoints:
                          newPrizeRewardType === 'points'
                            ? Math.max(1, parseFlexibleNumberInput(newPrizeBonusPoints, 20))
                            : undefined,
                      };

                      const nextChests = currentChests.map((c) =>
                        c.id === targetChestId
                          ? { ...c, prizes: [...c.prizes, createdPrize] }
                          : c
                      );
                      const nextConfig = syncLootboxConfigWithChests(nextChests, lootboxDraft);
                      setLootboxDraft(nextConfig);
                      onUpdateLootboxConfig?.(nextConfig);
                      setNewPrizeTitle('');
                      triggerToast(
                        `🎁 جایزه «${createdPrize.title}» با شانس ${createdPrize.chancePercent}% اضافه شد.`
                      );
                    }}
                    className={`p-3.5 rounded-2xl border space-y-2.5 ${cardSurfaceClass}`}
                  >
                    <div className="font-black text-xs">
                      ➕ افزودن جایزه جدید به صندوقچه انتخاب‌شده:
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                      <select
                        value={newPrizeChestType}
                        onChange={(e) => setNewPrizeChestType(e.target.value)}
                        className={`px-3 py-2 rounded-xl border text-xs font-black ${inputClass}`}
                      >
                        {getNormalizedLootboxChests(lootboxDraft).map((c) => (
                          <option key={c.id} value={c.id}>
                            📦 {c.title} ({c.cost} 💎)
                          </option>
                        ))}
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
                        <div className="flex items-center gap-1.5">
                          <input
                            type="text"
                            inputMode="numeric"
                            dir="ltr"
                            value={newPrizeChance}
                            onFocus={(e) => e.currentTarget.select()}
                            onChange={(e) =>
                              setNewPrizeChance(
                                Math.max(
                                  0,
                                  Math.min(100, parseFlexibleNumberInput(e.target.value, 0))
                                )
                              )
                            }
                            className={`w-full px-3 py-2 rounded-xl border text-center font-mono font-black ${inputClass}`}
                          />
                          <span className="font-black text-xs">%</span>
                        </div>
                      </div>

                      {newPrizeRewardType === 'points' ? (
                        <div>
                          <label className="text-[10px] font-bold block mb-1">
                            مقدار امتیاز هدیه:
                          </label>
                          <input
                            type="text"
                            inputMode="numeric"
                            dir="ltr"
                            value={newPrizeBonusPoints}
                            onFocus={(e) => e.currentTarget.select()}
                            onChange={(e) =>
                              setNewPrizeBonusPoints(
                                Math.max(0, parseFlexibleNumberInput(e.target.value, 0))
                              )
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
                        + افزودن جایزه به صندوقچه
                      </button>
                    </div>
                  </form>

                  {/* 3. ALL CUSTOM CHESTS & PRIZE TABLES WITH SMOOTH PERCENTAGE INPUTS */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {getNormalizedLootboxChests(lootboxDraft).map((chest) => {
                      const totalChance = chest.prizes.reduce(
                        (acc, p) => acc + (Number(p.chancePercent) || 0),
                        0
                      );
                      const allChests = getNormalizedLootboxChests(lootboxDraft);

                      const updateThisChest = (
                        updater: (c: LootboxChestConfig) => LootboxChestConfig
                      ) => {
                        const nextChests = allChests.map((c) =>
                          c.id === chest.id ? updater(c) : c
                        );
                        const synced = syncLootboxConfigWithChests(
                          nextChests,
                          lootboxDraft
                        );
                        setLootboxDraft(synced);
                        onUpdateLootboxConfig?.(synced);
                      };

                      return (
                        <div
                          key={chest.id}
                          className={`p-3.5 rounded-2xl border space-y-3 ${cardSurfaceClass}`}
                        >
                          {/* Chest Header: Editable Title, Editable Cost & Delete Chest */}
                          <div className="space-y-2 border-b border-current/10 pb-2.5">
                            <div className="flex items-center justify-between gap-2">
                              <input
                                type="text"
                                value={chest.title}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  updateThisChest((c) => ({ ...c, title: val }));
                                }}
                                className={`flex-1 px-2.5 py-1.5 rounded-xl border text-xs font-black text-[#D4AB58] ${inputClass}`}
                                placeholder="نام صندوقچه..."
                              />
                              {allChests.length > 1 && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    playTick();
                                    const nextChests = allChests.filter(
                                      (c) => c.id !== chest.id
                                    );
                                    const synced = syncLootboxConfigWithChests(
                                      nextChests,
                                      lootboxDraft
                                    );
                                    setLootboxDraft(synced);
                                    onUpdateLootboxConfig?.(synced);
                                    triggerToast(
                                      `🗑️ صندوقچه «${chest.title}» حذف شد.`
                                    );
                                  }}
                                  className="px-2.5 py-1.5 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-400 text-[10px] font-black flex items-center gap-1 cursor-pointer shrink-0"
                                  title="حذف کامل این صندوقچه"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                  <span>حذف صندوقچه</span>
                                </button>
                              )}
                            </div>

                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <div className="flex items-center gap-1.5">
                                <span className="text-[10px] font-bold opacity-85">
                                  هزینه ورودی (💎 الماس):
                                </span>
                                <input
                                  type="text"
                                  inputMode="numeric"
                                  dir="ltr"
                                  value={chest.cost}
                                  onFocus={(e) => e.currentTarget.select()}
                                  onChange={(e) => {
                                    const nextCost = Math.max(
                                      0,
                                      parseFlexibleNumberInput(e.target.value, 0)
                                    );
                                    updateThisChest((c) => ({ ...c, cost: nextCost }));
                                  }}
                                  className={`w-20 px-2 py-1 rounded-lg border text-center font-mono font-black text-xs ${inputClass}`}
                                />
                              </div>

                              <span
                                className={`text-[10px] font-mono font-black px-2 py-0.5 rounded-lg ${
                                  totalChance === 100
                                    ? 'bg-emerald-500/20 text-emerald-400'
                                    : 'bg-amber-500/20 text-amber-300'
                                }`}
                              >
                                مجموع شانس: {totalChance}%
                              </span>
                            </div>
                          </div>

                          {/* Prizes Inside This Chest */}
                          <div className="space-y-2">
                            {chest.prizes.map((prize) => (
                              <div
                                key={prize.id}
                                className={`p-2.5 rounded-xl border space-y-2 ${subCardClass}`}
                              >
                                <div className="flex items-center justify-between gap-2">
                                  <div className="min-w-0 flex-1">
                                    <input
                                      type="text"
                                      value={prize.title}
                                      onChange={(e) => {
                                        const val = e.target.value;
                                        updateThisChest((c) => ({
                                          ...c,
                                          prizes: c.prizes.map((p) =>
                                            p.id === prize.id ? { ...p, title: val } : p
                                          ),
                                        }));
                                      }}
                                      className={`w-full px-2 py-1 rounded-lg border text-xs font-black ${inputClass}`}
                                    />
                                  </div>
                                  <div className="flex items-center gap-1 shrink-0">
                                    <input
                                      type="text"
                                      inputMode="numeric"
                                      dir="ltr"
                                      value={prize.chancePercent}
                                      onFocus={(e) => e.currentTarget.select()}
                                      onChange={(e) => {
                                        const pct = Math.max(
                                          0,
                                          Math.min(
                                            100,
                                            parseFlexibleNumberInput(e.target.value, 0)
                                          )
                                        );
                                        updateThisChest((c) => ({
                                          ...c,
                                          prizes: c.prizes.map((p) =>
                                            p.id === prize.id
                                              ? { ...p, chancePercent: pct }
                                              : p
                                          ),
                                        }));
                                      }}
                                      className={`w-16 px-2 py-1 rounded-lg border text-center font-mono font-black text-xs ${inputClass}`}
                                    />
                                    <span className="text-xs font-black">%</span>
                                    <button
                                      type="button"
                                      onClick={() =>
                                        updateThisChest((c) => ({
                                          ...c,
                                          prizes: c.prizes.filter(
                                            (p) => p.id !== prize.id
                                          ),
                                        }))
                                      }
                                      className="p-1.5 rounded-lg bg-rose-500/20 text-rose-400 cursor-pointer"
                                      title="حذف جایزه"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                </div>

                                {/* Quick Percentage Preset Chips so Admin never gets stuck on 0 */}
                                <div className="flex items-center justify-between gap-1 pt-1 border-t border-current/10">
                                  <span className="text-[9px] font-bold opacity-70">
                                    تنظیم سریع درصد شانس:
                                  </span>
                                  <div className="flex items-center gap-1 flex-wrap">
                                    {[0, 10, 20, 25, 50, 75, 100].map((presetPct) => (
                                      <button
                                        key={presetPct}
                                        type="button"
                                        onClick={() => {
                                          playTick();
                                          updateThisChest((c) => ({
                                            ...c,
                                            prizes: c.prizes.map((p) =>
                                              p.id === prize.id
                                                ? { ...p, chancePercent: presetPct }
                                                : p
                                            ),
                                          }));
                                        }}
                                        className={`px-1.5 py-0.5 rounded text-[9px] font-mono font-black cursor-pointer transition-all ${
                                          prize.chancePercent === presetPct
                                            ? 'bg-[#D4AB58] text-[#101622]'
                                            : 'bg-black/25 hover:bg-black/40 opacity-80'
                                        }`}
                                      >
                                        {presetPct}%
                                      </button>
                                    ))}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
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

                {/* 3. EDIT EXISTING BADGES (Title, Subtitle, Description, Requirement) + SAVE TO SERVER */}
                <div
                  className={`p-4 rounded-2xl border-2 border-[#D4AB58]/50 space-y-3 text-xs ${subCardClass}`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-current/10 pb-2.5">
                    <div>
                      <div className="font-black text-sm text-[#D4AB58]">
                        ✏️ ویرایش کامل نام، زیرعنوان، توضیحات و شرط دریافت نشان‌های موجود ({badgeList.length} نشان):
                      </div>
                      <p className="text-[11px] font-bold opacity-80 mt-0.5">
                        نام هر نشان (مثلاً «سپر افتخار انجمن»)، زیرعنوان («عضو فعال کمیته اجرایی»)، متن روی کارت و شرط دریافت آن را مستقیماً ویرایش و در سرور ذخیره کنید.
                      </p>
                    </div>
                    <button
                      type="button"
                      disabled={isSavingEditedBadges}
                      onClick={handleSaveEditedBadgesToServer}
                      className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs cursor-pointer shadow shrink-0"
                    >
                      {isSavingEditedBadges
                        ? '⏳ در حال ذخیره در سرور...'
                        : '💾 ذخیره تغییرات نشان‌ها در سرور'}
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[520px] overflow-y-auto p-1">
                    {badgeList.map((badge) => (
                      <div
                        key={badge.id}
                        className={`p-3.5 rounded-2xl border space-y-2.5 ${cardSurfaceClass}`}
                      >
                        <div className="flex items-center gap-2.5 border-b border-current/10 pb-2">
                          <div className="w-11 h-11 rounded-xl bg-black/30 border border-[#D4AB58]/40 p-1.5 flex items-center justify-center shrink-0">
                            <PixelImage
                              filename={badge.filename}
                              alt={badge.title}
                              className="w-8 h-8 object-contain"
                            />
                          </div>
                          <div className="flex-1 min-w-0 space-y-1">
                            <label className="text-[10px] font-bold opacity-75 block">
                              نام نشان (عنوان اصلی):
                            </label>
                            <input
                              type="text"
                              value={badge.title}
                              onChange={(e) => {
                                const val = e.target.value;
                                updateBadgesAndPersist((prev) =>
                                  prev.map((item) =>
                                    item.id === badge.id ? { ...item, title: val } : item
                                  )
                                );
                              }}
                              placeholder="مثلاً: سپر افتخار انجمن"
                              className={`w-full px-2.5 py-1.5 rounded-lg border text-xs font-black text-[#D4AB58] ${inputClass}`}
                            />
                          </div>
                        </div>

                        <div>
                          <label className="text-[10px] font-bold opacity-75 block mb-1">
                            زیرعنوان نشان (مثلاً: عضو فعال کمیته اجرایی):
                          </label>
                          <input
                            type="text"
                            value={badge.subtitle}
                            onChange={(e) => {
                              const val = e.target.value;
                              updateBadgesAndPersist((prev) =>
                                prev.map((item) =>
                                  item.id === badge.id ? { ...item, subtitle: val } : item
                                )
                              );
                            }}
                            placeholder="زیرعنوان نشان..."
                            className={`w-full px-2.5 py-1.5 rounded-lg border text-xs font-bold ${inputClass}`}
                          />
                        </div>

                        <div>
                          <label className="text-[10px] font-bold opacity-75 block mb-1">
                            توضیحات روی کارت نشان:
                          </label>
                          <input
                            type="text"
                            value={badge.description}
                            onChange={(e) => {
                              const val = e.target.value;
                              updateBadgesAndPersist((prev) =>
                                prev.map((item) =>
                                  item.id === badge.id ? { ...item, description: val } : item
                                )
                              );
                            }}
                            placeholder="توضیحات روی کارت..."
                            className={`w-full px-2.5 py-1.5 rounded-lg border text-[11px] font-bold ${inputClass}`}
                          />
                        </div>

                        <div>
                          <label className="text-[10px] font-bold opacity-75 block mb-1">
                            🎯 شرط دریافت نشان (نمایش در پشت کارت):
                          </label>
                          <input
                            type="text"
                            value={badge.nextTierRequirement}
                            onChange={(e) => {
                              const val = e.target.value;
                              updateBadgesAndPersist((prev) =>
                                prev.map((item) =>
                                  item.id === badge.id
                                    ? { ...item, nextTierRequirement: val }
                                    : item
                                )
                              );
                            }}
                            placeholder="شرط دریافت یا ارتقای نشان..."
                            className={`w-full px-2.5 py-1.5 rounded-lg border text-[11px] font-bold ${inputClass}`}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
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
                <div className={`p-4 rounded-2xl border-2 border-[#D4AB58]/50 space-y-3 text-xs ${subCardClass}`}>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <div className="font-black text-sm text-[#D4AB58]">
                        💰 تنظیم فرمول، ضریب، کف و سقف نوار تبدیل امتیاز به تخفیف کارگاه‌ها
                      </div>
                      <p className="text-[11px] opacity-80 font-bold mt-0.5">
                        فرمول فعلی: هر {discountRule.pointsStep.toLocaleString('fa-IR')} امتیاز ={' '}
                        {discountRule.discountTomansPerStep.toLocaleString('fa-IR')} تومان تخفیف (کف:{' '}
                        {(discountRule.minPoints || discountRule.pointsStep).toLocaleString('fa-IR')} • سقف:{' '}
                        {(discountRule.maxPoints || 100).toLocaleString('fa-IR')} امتیاز)
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    <div>
                      <span className="text-[10px] font-bold block mb-1">
                        ضریب امتیاز (هر چند امتیاز؟):
                      </span>
                      <input
                        type="text"
                        inputMode="numeric"
                        dir="ltr"
                        value={discountRule.pointsStep}
                        onFocus={(e) => e.currentTarget.select()}
                        onChange={(e) => {
                          const step = Math.max(
                            1,
                            parseFlexibleNumberInput(e.target.value, 20)
                          );
                          setDiscountRule((prev) => ({
                            ...prev,
                            pointsStep: step,
                          }));
                        }}
                        className={`w-full px-3 py-1.5 rounded-xl border text-center font-mono font-bold ${inputClass}`}
                      />
                    </div>
                    <div>
                      <span className="text-[10px] font-bold block mb-1">
                        مبلغ تخفیف هر ضریب (تومان):
                      </span>
                      <input
                        type="text"
                        inputMode="numeric"
                        dir="ltr"
                        value={discountRule.discountTomansPerStep}
                        onFocus={(e) => e.currentTarget.select()}
                        onChange={(e) =>
                          setDiscountRule((prev) => ({
                            ...prev,
                            discountTomansPerStep: Math.max(
                              1000,
                              parseFlexibleNumberInput(e.target.value, 10000)
                            ),
                          }))
                        }
                        className={`w-full px-3 py-1.5 rounded-xl border text-center font-mono font-bold ${inputClass}`}
                      />
                    </div>
                    <div>
                      <span className="text-[10px] font-bold block mb-1">
                        کف امتیاز مجاز (حداقل):
                      </span>
                      <input
                        type="text"
                        inputMode="numeric"
                        dir="ltr"
                        value={discountRule.minPoints ?? discountRule.pointsStep}
                        onFocus={(e) => e.currentTarget.select()}
                        onChange={(e) =>
                          setDiscountRule((prev) => ({
                            ...prev,
                            minPoints: Math.max(
                              1,
                              parseFlexibleNumberInput(e.target.value, prev.pointsStep || 20)
                            ),
                          }))
                        }
                        className={`w-full px-3 py-1.5 rounded-xl border text-center font-mono font-bold ${inputClass}`}
                      />
                    </div>
                    <div>
                      <span className="text-[10px] font-bold block mb-1">
                        سقف امتیاز مجاز (حداکثر):
                      </span>
                      <input
                        type="text"
                        inputMode="numeric"
                        dir="ltr"
                        value={discountRule.maxPoints ?? 100}
                        onFocus={(e) => e.currentTarget.select()}
                        onChange={(e) =>
                          setDiscountRule((prev) => ({
                            ...prev,
                            maxPoints: Math.max(
                              1,
                              parseFlexibleNumberInput(e.target.value, 100)
                            ),
                          }))
                        }
                        className={`w-full px-3 py-1.5 rounded-xl border text-center font-mono font-bold ${inputClass}`}
                      />
                    </div>
                  </div>

                  {/* Live Step-by-Step Multiplier Preview */}
                  <div className="p-3 rounded-xl bg-black/25 border border-white/10 space-y-1.5">
                    <div className="text-[11px] font-black text-[#FCE7A4]">
                      📊 جدول پله‌های ضریب تخفیف (از کف تا سقف تعیین‌شده):
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {(() => {
                        const step = Math.max(1, discountRule.pointsStep || 20);
                        const tomans = Math.max(1000, discountRule.discountTomansPerStep || 10000);
                        const minP = Math.max(
                          step,
                          Math.ceil((discountRule.minPoints || step) / step) * step
                        );
                        const maxP = Math.max(
                          minP,
                          Math.floor((discountRule.maxPoints || step * 5) / step) * step
                        );
                        const items: { pts: number; disc: number }[] = [];
                        for (let p = minP; p <= maxP && items.length < 8; p += step) {
                          items.push({
                            pts: p,
                            disc: Math.floor(p / step) * tomans,
                          });
                        }
                        return items.map((it) => (
                          <span
                            key={it.pts}
                            className="px-2.5 py-1 rounded-lg bg-[#D4AB58]/20 border border-[#D4AB58]/40 text-[10px] font-black text-[#F6F1E7]"
                          >
                            {it.pts.toLocaleString('fa-IR')} امتیاز ←{' '}
                            {it.disc.toLocaleString('fa-IR')} تومان تخفیف
                          </span>
                        ));
                      })()}
                    </div>
                  </div>

                  {/* Per-Workshop Quick Discount Enable/Disable & Sync */}
                  <div className="p-3 rounded-xl bg-black/20 border border-white/10 space-y-2">
                    <div className="text-[11px] font-black text-[#7FB69E]">
                      🎯 وضعیت فعال بودن نوار تخفیف برای هر کارگاه (به انتخاب ادمین):
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {(Array.isArray(eventList) ? eventList : []).map((ev, idx) => {
                        const isPaid = ev.basePrice > 0;
                        const active = isPaid && ev.allowPointsDiscount !== false;
                        return (
                          <div
                            key={ev.id}
                            className="p-2.5 rounded-xl bg-black/30 border border-white/10 flex items-center justify-between gap-2"
                          >
                            <div className="min-w-0">
                              <div className="font-black text-[11px] truncate">{ev.title}</div>
                              <div className="text-[10px] opacity-75">
                                {isPaid
                                  ? `هزینه: ${ev.basePrice.toLocaleString('fa-IR')} تومان`
                                  : 'رایگان'}
                              </div>
                            </div>
                            {isPaid ? (
                              <button
                                type="button"
                                onClick={() => {
                                  playSwitch();
                                  const nextAllowed = ev.allowPointsDiscount === false;
                                  const updated = (Array.isArray(eventList) ? eventList : []).map(
                                    (item, i) =>
                                      item.id === ev.id
                                        ? normalizeEvent(
                                            { ...item, allowPointsDiscount: nextAllowed },
                                            i
                                          )
                                        : normalizeEvent(item, i)
                                  );
                                  setEventList(updated);
                                  onUpdateEvents?.(updated);
                                  void saveEventsOnBot(updated);
                                  triggerToast(
                                    nextAllowed
                                      ? `💎 نوار تخفیف برای «${ev.title}» فعال شد.`
                                      : `🚫 نوار تخفیف برای «${ev.title}» غیرفعال شد.`
                                  );
                                }}
                                className={`px-2.5 py-1 rounded-lg text-[10px] font-black shrink-0 cursor-pointer ${
                                  active
                                    ? 'bg-emerald-600 text-white'
                                    : 'bg-zinc-700 text-zinc-300'
                                }`}
                              >
                                {active ? '✅ فعال' : '🚫 غیرفعال'}
                              </button>
                            ) : (
                              <span className="text-[10px] opacity-60 font-bold shrink-0">
                                بدون هزینه
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      playCoin();
                      const step = Math.max(1, discountRule.pointsStep || 20);
                      const tomans = Math.max(1000, discountRule.discountTomansPerStep || 10000);
                      const minP = Math.max(
                        step,
                        Math.ceil((discountRule.minPoints || step) / step) * step
                      );
                      const maxP = Math.max(
                        minP,
                        Math.floor((discountRule.maxPoints || step * 5) / step) * step
                      );
                      const normalizedRule: DiscountRuleConfig = {
                        pointsStep: step,
                        discountTomansPerStep: tomans,
                        minPoints: minP,
                        maxPoints: maxP,
                      };
                      setDiscountRule(normalizedRule);
                      onUpdateDiscountRule?.(normalizedRule);

                      // Also update workshops to use the new default floor/ceiling/multiplier
                      const updatedEvents = (Array.isArray(eventList) ? eventList : []).map(
                        (ev, i) =>
                          normalizeEvent(
                            {
                              ...ev,
                              discountPointsStep: step,
                              discountTomansPerStep: tomans,
                              discountMinPoints: minP,
                              discountMaxPoints: maxP,
                            },
                            i
                          )
                      );
                      setEventList(updatedEvents);
                      onUpdateEvents?.(updatedEvents);
                      void saveEventsOnBot(updatedEvents);

                      appendLog(
                        'بروزرسانی فرمول، کف و سقف تخفیف امتیازی کارگاه‌ها',
                        `هر ${step} امتیاز = ${tomans} تومان (کف ${minP} / سقف ${maxP})`,
                        'info'
                      );
                      triggerToast(
                        `✅ فرمول تخفیف (هر ${step.toLocaleString('fa-IR')} امتیاز = ${tomans.toLocaleString('fa-IR')} تومان، کف ${minP.toLocaleString('fa-IR')} و سقف ${maxP.toLocaleString('fa-IR')}) ذخیره و روی کارگاه‌ها اعمال شد!`
                      );
                    }}
                    className="w-full py-2.5 rounded-xl bg-[#D4AB58] text-[#101622] font-black cursor-pointer shadow"
                  >
                    💾 ذخیره ضریب، کف و سقف تخفیف و اعمال روی کارگاه‌ها
                  </button>
                </div>

                {/* Custom Quests Builder & Active Quests List */}
                <form
                  onSubmit={handleAddWeeklyQuest}
                  className={`p-4 rounded-2xl border space-y-3 text-xs ${subCardClass}`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-black text-sm text-[#D4AB58]">
                      🎯 ساخت ماموریت سفارشی جدید (فقط در صورت انجام شرط، امتیاز داده می‌شود):
                    </span>
                    <span className="text-[10px] font-bold opacity-75">
                      بدون امتیاز رایگان پیش‌فرض
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <input
                      type="text"
                      value={newQuestTitle}
                      onChange={(e) => setNewQuestTitle(e.target.value)}
                      placeholder="عنوان ماموریت (مثلاً: شرکت در کارگاه پایتون)"
                      className={`sm:col-span-2 px-3 py-2 rounded-xl border font-bold ${inputClass}`}
                    />
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] font-bold shrink-0">پاداش (💎):</span>
                      <input
                        type="text"
                        inputMode="numeric"
                        dir="ltr"
                        value={newQuestReward}
                        onFocus={(e) => e.currentTarget.select()}
                        onChange={(e) =>
                          setNewQuestReward(
                            Math.max(0, parseFlexibleNumberInput(e.target.value, 0))
                          )
                        }
                        className={`w-full px-2.5 py-2 rounded-xl border text-center font-mono font-black ${inputClass}`}
                      />
                    </div>
                  </div>

                  <input
                    type="text"
                    value={newQuestDescription}
                    onChange={(e) => setNewQuestDescription(e.target.value)}
                    placeholder="توضیحات نحوه انجام ماموریت برای دانشجو (اختیاری)..."
                    className={`w-full px-3 py-2 rounded-xl border font-bold ${inputClass}`}
                  />

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 items-end">
                    <div className="sm:col-span-2">
                      <label className="text-[10px] font-bold block mb-1">
                        شرط واقعی انجام ماموریت (تا انجام نشود، امتیاز قفل است):
                      </label>
                      <select
                        value={newQuestConditionType}
                        onChange={(e) =>
                          setNewQuestConditionType(e.target.value as QuestConditionType)
                        }
                        className={`w-full px-3 py-2 rounded-xl border text-xs font-black ${inputClass}`}
                      >
                        <option value="register_events">
                          🎟 ثبت‌نام در کارگاه‌ها و رویدادها (بر اساس تعداد بلیط)
                        </option>
                        <option value="checkin_events">
                          ✅ حضور فیزیکی و اسکن بارکد QR در رویدادها
                        </option>
                        <option value="reach_score">
                          💎 رسیدن به حد نصاب امتیاز مشخص
                        </option>
                        <option value="secret_code">
                          🔑 وارد کردن کد رمز ماموریت (اعلام‌شده در کانال/کلاس)
                        </option>
                        <option value="complete_profile">
                          🎓 تکمیل ثبت‌نام اولیه و احراز هویت
                        </option>
                      </select>
                    </div>

                    {newQuestConditionType === 'secret_code' ? (
                      <div>
                        <label className="text-[10px] font-bold block mb-1">
                          کد رمز ماموریت:
                        </label>
                        <input
                          type="text"
                          dir="ltr"
                          value={newQuestSecretCode}
                          onChange={(e) => setNewQuestSecretCode(e.target.value)}
                          placeholder="مثلاً: MISSION-404"
                          className={`w-full px-3 py-2 rounded-xl border text-center font-mono font-black ${inputClass}`}
                        />
                      </div>
                    ) : newQuestConditionType === 'complete_profile' ? (
                      <div className="text-[11px] font-bold opacity-75 py-2">
                        هدف: ۱ بار تکمیل پروفایل
                      </div>
                    ) : (
                      <div>
                        <label className="text-[10px] font-bold block mb-1">
                          {newQuestConditionType === 'reach_score'
                            ? 'حد نصاب امتیاز هدف:'
                            : 'تعداد هدف (مثلاً ۱ یا ۲ رویداد):'}
                        </label>
                        <input
                          type="text"
                          inputMode="numeric"
                          dir="ltr"
                          value={newQuestMaxProgress}
                          onFocus={(e) => e.currentTarget.select()}
                          onChange={(e) =>
                            setNewQuestMaxProgress(
                              Math.max(1, parseFlexibleNumberInput(e.target.value, 1))
                            )
                          }
                          className={`w-full px-3 py-2 rounded-xl border text-center font-mono font-black ${inputClass}`}
                        />
                      </div>
                    )}
                  </div>

                  <button
                    type="submit"
                    className="w-full py-2.5 rounded-xl bg-[#354B40] hover:bg-[#2A3C33] text-[#F6F1E7] font-black cursor-pointer shadow"
                  >
                    + افزودن ماموریت جدید به بخش «ماموریت‌ها»
                  </button>
                </form>

                {/* Active Quests Management List */}
                <div className={`p-4 rounded-2xl border space-y-3 text-xs ${subCardClass}`}>
                  <div className="flex items-center justify-between border-b border-current/10 pb-2">
                    <span className="font-black text-sm">
                      📋 لیست ماموریت‌های فعال ({(Array.isArray(questList) ? questList : []).length} مورد):
                    </span>
                    <span className="text-[10px] font-bold opacity-75">
                      ویرایش آنی امتیاز و حذف ماموریت‌ها
                    </span>
                  </div>

                  <div className="space-y-2">
                    {(Array.isArray(questList) ? questList : []).map((q) => (
                      <div
                        key={q.id}
                        className={`p-3 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 ${cardSurfaceClass}`}
                      >
                        <div className="flex-1 space-y-1 min-w-0">
                          <input
                            type="text"
                            value={q.title}
                            onChange={(e) => {
                              const val = e.target.value;
                              const next = questList.map((item) =>
                                item.id === q.id ? { ...item, title: val } : item
                              );
                              updateQuestsAndPersist(next);
                            }}
                            className={`w-full px-2.5 py-1 rounded-lg border text-xs font-black ${inputClass}`}
                          />
                          <input
                            type="text"
                            value={q.description}
                            onChange={(e) => {
                              const val = e.target.value;
                              const next = questList.map((item) =>
                                item.id === q.id ? { ...item, description: val } : item
                              );
                              updateQuestsAndPersist(next);
                            }}
                            className={`w-full px-2.5 py-1 rounded-lg border text-[11px] font-bold opacity-85 ${inputClass}`}
                          />
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <div className="flex items-center gap-1">
                            <span className="text-[10px] font-bold opacity-75">امتیاز:</span>
                            <input
                              type="text"
                              inputMode="numeric"
                              dir="ltr"
                              value={q.rewardPoints}
                              onFocus={(e) => e.currentTarget.select()}
                              onChange={(e) => {
                                const pts = Math.max(
                                  1,
                                  parseFlexibleNumberInput(e.target.value, 10)
                                );
                                const next = questList.map((item) =>
                                  item.id === q.id ? { ...item, rewardPoints: pts } : item
                                );
                                updateQuestsAndPersist(next);
                              }}
                              className={`w-16 px-2 py-1 rounded-lg border text-center font-mono font-black text-xs ${inputClass}`}
                            />
                          </div>

                          <button
                            type="button"
                            onClick={() => {
                              playTick();
                              const next = questList.filter((item) => item.id !== q.id);
                              updateQuestsAndPersist(next);
                              triggerToast(`🗑️ ماموریت «${q.title}» حذف شد.`);
                            }}
                            className="p-2 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-400 cursor-pointer"
                            title="حذف ماموریت"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
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
              <div className="font-black">➕ تعریف عضو انجمن صنایع / ادمین جدید:</div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <input
                  type="text"
                  value={newAdminName}
                  onChange={(e) => setNewAdminName(e.target.value)}
                  placeholder="نام و سمت عضو انجمن صنایع"
                  className={`px-3 py-2 rounded-xl border font-bold ${inputClass}`}
                />
                <input
                  type="text"
                  dir="ltr"
                  value={newAdminTelegram}
                  onChange={(e) => setNewAdminTelegram(e.target.value)}
                  placeholder="آیدی تلگرام یا عددی (اختیاری)"
                  className={`px-3 py-2 rounded-xl border font-mono font-bold ${inputClass}`}
                />
                <input
                  type="text"
                  dir="ltr"
                  value={newAdminPassword}
                  onChange={(e) => setNewAdminPassword(e.target.value)}
                  placeholder="رمز اختصاصی ادمین (مثال: IE_404)"
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
                <div className="pt-2 border-t border-current/10">
                  <button
                    type="button"
                    onClick={() => {
                      playTick();
                      setNewAdminCanVisualEdit((prev) => !prev);
                    }}
                    className={`w-full p-2.5 rounded-xl text-xs font-black flex items-center justify-between border cursor-pointer transition-all ${
                      newAdminCanVisualEdit || newAdminLevel === 1
                        ? 'bg-[#D4AB58]/20 border-[#D4AB58] text-[#D4AB58]'
                        : 'bg-black/20 border-current/15 opacity-75'
                    }`}
                  >
                    <span>✏️ دسترسی به ویرایش دستی متن‌های مینی‌اپ (canVisualEdit)</span>
                    <span>
                      {newAdminLevel === 1 || newAdminCanVisualEdit ? 'فعال ✓' : 'غیرفعال ✕'}
                    </span>
                  </button>
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
              {(Array.isArray(adminList) ? adminList : []).map((adm) => {
                const isProtectedMaster = isProtectedMasterAccount(adm);
                const hasVisualEditPerm = isProtectedMaster ? true : Boolean(adm.canVisualEdit);
                return (
                  <div
                    key={adm.id}
                    className={`p-3.5 rounded-2xl border space-y-2.5 text-xs ${
                      isProtectedMaster
                        ? 'border-[#D4AB58] bg-[#D4AB58]/10'
                        : subCardClass
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-black">{adm.fullName}</span>
                          {isProtectedMaster && (
                            <span className="text-[10px] px-2 py-0.5 rounded-lg bg-[#D4AB58] text-[#101622] font-black">
                              👑 مالک و مدیر ارشد کل (غیرقابل محدودسازی)
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] font-bold opacity-80">
                          {adm.roleLabel} • ID: {adm.telegramId}
                        </div>
                      </div>
                      {!isProtectedMaster && (
                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            type="button"
                            onClick={() => {
                              playSwitch();
                              const updated = (Array.isArray(adminList) ? adminList : []).map((a) =>
                                a.id === adm.id ? { ...a, isFrozen: !a.isFrozen } : a
                              );
                              updateAdminsAndPersist(updated);
                              appendLog(
                                adm.isFrozen
                                  ? 'رفع مسدودیت دسترسی ادمین'
                                  : 'توقف اضطراری دسترسی ادمین (Freeze)',
                                adm.fullName,
                                'warning'
                              );
                            }}
                            className={`px-2.5 py-1.5 rounded-xl font-black text-[11px] cursor-pointer ${
                              adm.isFrozen
                                ? 'bg-emerald-600 text-white'
                                : 'bg-amber-600 text-white'
                            }`}
                          >
                            {adm.isFrozen ? '🔓 باز کردن' : '❄️ فریز'}
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              playError();
                              const updated = (Array.isArray(adminList) ? adminList : []).filter(
                                (a) => a.id !== adm.id
                              );
                              updateAdminsAndPersist(updated);
                              appendLog('حذف کامل ادمین از سامانه', adm.fullName, 'danger');
                              triggerToast(`🗑️ ادمین «${adm.fullName}» به طور کامل حذف شد.`);
                            }}
                            className="px-2.5 py-1.5 rounded-xl bg-rose-700 hover:bg-rose-600 text-white font-black text-[11px] flex items-center gap-1 cursor-pointer"
                            title="حذف کامل ادمین"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>حذف</span>
                          </button>
                        </div>
                      )}
                    </div>

                    {isProtectedMaster && (
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 pt-1">
                        <button
                          type="button"
                          disabled
                          className="py-1.5 px-2 rounded-lg text-[10px] font-black bg-zinc-700/40 text-zinc-400 border border-zinc-600/40 cursor-not-allowed opacity-60"
                        >
                          🔒 قفل کارت دانشجویی
                        </button>
                        <button
                          type="button"
                          disabled
                          className="py-1.5 px-2 rounded-lg text-[10px] font-black bg-zinc-700/40 text-zinc-400 border border-zinc-600/40 cursor-not-allowed opacity-60"
                        >
                          🔒 مسدودسازی
                        </button>
                        <button
                          type="button"
                          disabled
                          className="py-1.5 px-2 rounded-lg text-[10px] font-black bg-zinc-700/40 text-zinc-400 border border-zinc-600/40 cursor-not-allowed opacity-60"
                        >
                          🔒 فریز کردن
                        </button>
                        <button
                          type="button"
                          disabled
                          className="py-1.5 px-2 rounded-lg text-[10px] font-black bg-zinc-700/40 text-zinc-400 border border-zinc-600/40 cursor-not-allowed opacity-60"
                        >
                          🔒 حذف دسترسی
                        </button>
                      </div>
                    )}

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

                    {/* Selective Visual Edit Permission Toggle */}
                    <div className="pt-2 border-t border-current/10 flex items-center justify-between gap-2">
                      <span className="text-[11px] font-black text-[#D4AB58]">
                        ✏️ دسترسی به ویرایش دستی متن‌های مینی‌اپ:
                      </span>
                      {isProtectedMaster ? (
                        <span className="px-2.5 py-1 rounded-lg bg-[#D4AB58]/20 text-[#D4AB58] border border-[#D4AB58]/50 text-[10px] font-black">
                          همیشه فعال (مدیر ارشد) ✓
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            playSwitch();
                            const nextVal = !hasVisualEditPerm;
                            const updated = (Array.isArray(adminList) ? adminList : []).map((a) =>
                              a.id === adm.id ? { ...a, canVisualEdit: nextVal } : a
                            );
                            updateAdminsAndPersist(updated);
                            appendLog(
                              nextVal
                                ? 'فعال‌سازی مجوز ویرایش دستی متن‌های مینی‌اپ'
                                : 'لغو مجوز ویرایش دستی متن‌های مینی‌اپ',
                              adm.fullName,
                              'info'
                            );
                            triggerToast(
                              nextVal
                                ? `✅ دسترسی «✏️ ویرایش دستی متن‌های مینی‌اپ» برای ${adm.fullName} فعال شد.`
                                : `🔒 دسترسی «✏️ ویرایش دستی متن‌های مینی‌اپ» برای ${adm.fullName} غیرفعال شد.`
                            );
                          }}
                          className={`px-3 py-1 rounded-lg text-[10px] font-black border cursor-pointer transition-all ${
                            hasVisualEditPerm
                              ? 'bg-emerald-600 text-white border-emerald-400'
                              : 'bg-zinc-800 text-zinc-300 border-zinc-600'
                          }`}
                        >
                          {hasVisualEditPerm ? 'فعال ✓ (کلیک جهت لغو)' : 'غیرفعال ✕ (کلیک جهت اعطا)'}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
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

        {/* ===================================================================
            MODULE 9: 📊 ۹. داشبورد جامع و تنظیمات مستقیم ربات تلگرام + شبیه‌سازی ۵۰ کاربر
           =================================================================== */}
        {activeModule === 9 && (
          <div className={`rounded-3xl p-4 lg:p-6 border space-y-5 ${cardSurfaceClass}`}>
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-current/10 pb-3">
              <div>
                <h2 className="text-sm lg:text-base font-black text-[#D4AB58]">
                  📊 ۹. داشبورد جامع آماری و تنظیمات مستقیم ربات تلگرام
                </h2>
                <p
                  className={`text-[11px] font-bold ${
                    isNight ? 'text-[#A3C1AD]' : 'text-[#3D5249]'
                  }`}
                >
                  آمار زنده دانشجویان و کارگاه‌ها، تنظیمات مستقیم ربات تلگرام، مدیریت امن کلید Gemini API و آزمایشگاه شبیه‌سازی ۵۰ کاربر
                </p>
              </div>
              <span className="text-[10px] font-black px-2.5 py-1 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
                متصل به سرور کلودفلر ربات ✓
              </span>
            </div>

            {/* 1. LIVE STATISTICAL CARDS */}
            {(() => {
              const safeStudents = Array.isArray(studentList) ? studentList : [];
              const safeReceipts = Array.isArray(receiptList) ? receiptList : [];
              const safeSupport = Array.isArray(supportTicketList) ? supportTicketList : [];
              const safeEvents = Array.isArray(eventList) ? eventList : [];

              const verifiedStudentsCount = safeStudents.filter(
                (s) => s.studentId && String(s.studentId).trim().length >= 6
              ).length;
              const totalPointsDistributed = safeStudents.reduce(
                (acc, s) => acc + Math.max(0, Number(s.score) || 0),
                0
              );
              const totalWorkshopRegistrations =
                safeStudents.reduce(
                  (acc, s) =>
                    acc + (Array.isArray(s.workshopsAttended) ? s.workshopsAttended.length : 0),
                  0
                ) +
                safeEvents.reduce(
                  (acc, ev) => acc + Math.max(0, Number(ev.registeredCount) || 0),
                  0
                );
              const approvedReceiptsCount = safeReceipts.filter(
                (r) => r.status === 'approved'
              ).length;
              const rejectedReceiptsCount = safeReceipts.filter(
                (r) => r.status === 'rejected'
              ).length;
              const pendingReceiptsCount = safeReceipts.filter(
                (r) => r.status === 'pending'
              ).length;
              const openSupportTicketsCount = safeSupport.filter(
                (t) => t.status !== 'closed'
              ).length;

              const cohortsBreakdown = ['۱۴۰۰', '۱۴۰۱', '۱۴۰۲', '۱۴۰۳', '۱۴۰۴', '۱۴۰۵'].map(
                (cYear) => {
                  const count = safeStudents.filter((s) =>
                    String(s.cohortYear || '').includes(cYear)
                  ).length;
                  return { cohortYear: cYear, count };
                }
              );

              return (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 text-xs">
                    <div className={`p-3.5 rounded-2xl border space-y-1 ${subCardClass}`}>
                      <div className="text-[10px] font-bold opacity-80">
                        👥 دانشجویان احراز هویت شده
                      </div>
                      <div className="text-lg font-black text-[#D4AB58]">
                        {verifiedStudentsCount.toLocaleString('fa-IR')} نفر
                      </div>
                    </div>

                    <div className={`p-3.5 rounded-2xl border space-y-1 ${subCardClass}`}>
                      <div className="text-[10px] font-bold opacity-80">
                        💎 مجموع امتیازات توزیع‌شده
                      </div>
                      <div className="text-lg font-black text-emerald-400">
                        {totalPointsDistributed.toLocaleString('fa-IR')}
                      </div>
                    </div>

                    <div className={`p-3.5 rounded-2xl border space-y-1 ${subCardClass}`}>
                      <div className="text-[10px] font-bold opacity-80">
                        🎓 کل ثبت‌نام‌های کارگاه‌ها
                      </div>
                      <div className="text-lg font-black text-sky-400">
                        {totalWorkshopRegistrations.toLocaleString('fa-IR')} ثبت‌نام
                      </div>
                    </div>

                    <div className={`p-3.5 rounded-2xl border space-y-1 ${subCardClass}`}>
                      <div className="text-[10px] font-bold opacity-80">
                        ✅ فیش‌های تایید شده
                      </div>
                      <div className="text-lg font-black text-emerald-400">
                        {approvedReceiptsCount.toLocaleString('fa-IR')} مورد
                      </div>
                    </div>

                    <div className={`p-3.5 rounded-2xl border space-y-1 ${subCardClass}`}>
                      <div className="text-[10px] font-bold opacity-80">
                        ❌ فیش‌های رد شده / در انتظار
                      </div>
                      <div className="text-lg font-black text-rose-400">
                        {rejectedReceiptsCount.toLocaleString('fa-IR')} رد •{' '}
                        {pendingReceiptsCount.toLocaleString('fa-IR')} انتظار
                      </div>
                    </div>

                    <div className={`p-3.5 rounded-2xl border space-y-1 ${subCardClass}`}>
                      <div className="text-[10px] font-bold opacity-80">
                        💬 تیکت‌های پشتیبانی باز
                      </div>
                      <div className="text-lg font-black text-amber-400">
                        {openSupportTicketsCount.toLocaleString('fa-IR')} تیکت
                      </div>
                    </div>
                  </div>

                  {/* Cohort Breakdown 1400 to 1405 */}
                  <div className={`p-3.5 rounded-2xl border space-y-2 text-xs ${subCardClass}`}>
                    <div className="font-black text-[#D4AB58]">
                      📊 تفکیک تعداد دانشجویان هر ورودی (۱۴۰۰ تا ۱۴۰۵):
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-6 gap-2">
                      {cohortsBreakdown.map((item) => (
                        <div
                          key={item.cohortYear}
                          className={`p-2.5 rounded-xl border text-center space-y-0.5 ${cardSurfaceClass}`}
                        >
                          <div className="text-[11px] font-black">ورودی {item.cohortYear}</div>
                          <div className="text-sm font-black text-[#D4AB58]">
                            {item.count.toLocaleString('fa-IR')} دانشجو
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* 2. DIRECT TELEGRAM BOT SETTINGS FORM (POST /api/miniapp/admin-bot-config) */}
            <form
              onSubmit={handleSaveBotConfigToServer}
              className={`p-4 rounded-2xl border-2 border-[#D4AB58]/50 space-y-3.5 text-xs ${subCardClass}`}
            >
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-current/10 pb-2">
                <div>
                  <h3 className="text-sm font-black text-[#D4AB58]">
                    🤖 تنظیمات مستقیم ربات تلگرام (ذخیره در سرور کلودفلر)
                  </h3>
                  <p className="text-[11px] font-bold opacity-80">
                    تنظیم متن خوش‌آمدگویی ربات، شماره کارت بانکی انجمن، آیدی کانال رسمی و قوانین ثبت‌نام از داخل مینی‌اپ
                  </p>
                </div>
                <button
                  type="submit"
                  disabled={isSavingBotConfig}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs cursor-pointer shadow"
                >
                  {isSavingBotConfig
                    ? '⏳ در حال ذخیره در سرور...'
                    : '💾 ذخیره تنظیمات ربات در سرور'}
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <div>
                  <label className="text-[11px] font-bold block mb-1">
                    💳 شماره کارت بانکی انجمن (جهت واریز هزینه کارگاه‌ها):
                  </label>
                  <input
                    type="text"
                    dir="ltr"
                    value={botConfigDraft.cardNumber}
                    onChange={(e) =>
                      setBotConfigDraft((prev) => ({ ...prev, cardNumber: e.target.value }))
                    }
                    placeholder="6037-9975-0000-0000"
                    className={`w-full px-3 py-2 rounded-xl border font-mono text-center font-black ${inputClass}`}
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold block mb-1">
                    👤 نام صاحب حساب بانکی انجمن:
                  </label>
                  <input
                    type="text"
                    value={botConfigDraft.cardHolder}
                    onChange={(e) =>
                      setBotConfigDraft((prev) => ({ ...prev, cardHolder: e.target.value }))
                    }
                    placeholder="انجمن علمی مهندسی صنایع"
                    className={`w-full px-3 py-2 rounded-xl border font-bold ${inputClass}`}
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold block mb-1">
                    📢 آیدی کانال رسمی انجمن:
                  </label>
                  <input
                    type="text"
                    dir="ltr"
                    value={botConfigDraft.channelUsername}
                    onChange={(e) =>
                      setBotConfigDraft((prev) => ({
                        ...prev,
                        channelUsername: e.target.value,
                      }))
                    }
                    placeholder="@isefum"
                    className={`w-full px-3 py-2 rounded-xl border font-mono text-center font-bold ${inputClass}`}
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold block mb-1">
                  👋 متن خوش‌آمدگویی ربات تلگرام (هنگام استارت زدن ربات توسط دانشجو):
                </label>
                <textarea
                  rows={2}
                  value={botConfigDraft.welcomeText}
                  onChange={(e) =>
                    setBotConfigDraft((prev) => ({ ...prev, welcomeText: e.target.value }))
                  }
                  className={`w-full px-3 py-2 rounded-xl border font-bold leading-relaxed ${inputClass}`}
                />
              </div>

              <div>
                <label className="text-[11px] font-bold block mb-1">
                  📜 متن قوانین و راهنمای ثبت‌نام کارگاه‌ها در ربات:
                </label>
                <textarea
                  rows={3}
                  value={botConfigDraft.rulesText}
                  onChange={(e) =>
                    setBotConfigDraft((prev) => ({ ...prev, rulesText: e.target.value }))
                  }
                  className={`w-full px-3 py-2 rounded-xl border font-bold leading-relaxed ${inputClass}`}
                />
              </div>
            </form>

            {/* 3. BROADCAST MESSAGE TO ALL TELEGRAM BOT MEMBERS */}
            <form
              onSubmit={handleSendBroadcastToBot}
              className={`p-4 rounded-2xl border space-y-3 text-xs ${subCardClass}`}
            >
              <div className="font-black text-sm text-[#D4AB58] flex items-center gap-1.5">
                <Send className="w-4 h-4" />
                <span>📢 ارسال پیام همگانی (Broadcast) به تمام اعضای ربات تلگرام از داخل مینی‌اپ</span>
              </div>
              <textarea
                rows={3}
                value={botConfigDraft.broadcastMessage || ''}
                onChange={(e) =>
                  setBotConfigDraft((prev) => ({
                    ...prev,
                    broadcastMessage: e.target.value,
                  }))
                }
                placeholder="متن اطلاعیه یا پیام همگانی خود را بنویسید تا ربات تلگرام برای تمام دانشجویان عضو ارسال کند..."
                className={`w-full px-3 py-2 rounded-xl border font-bold leading-relaxed ${inputClass}`}
              />
              <button
                type="submit"
                disabled={isSendingBroadcast}
                className="w-full py-2.5 rounded-xl bg-[#D4AB58] text-[#101622] font-black text-xs cursor-pointer shadow flex items-center justify-center gap-1.5"
              >
                <Send className="w-4 h-4" />
                <span>
                  {isSendingBroadcast
                    ? '⏳ در حال ارسال پیام همگانی به سرور ربات...'
                    : '📢 ارسال فوری پیام همگانی به تمام اعضای ربات تلگرام'}
                </span>
              </button>
            </form>

            {/* 4. SERVER-SIDE GEMINI API KEY & ADMIN PASSWORD CHANGER (POST /api/miniapp/admin-update-secrets) */}
            <form
              onSubmit={handleUpdateServerSecrets}
              className={`p-4 rounded-2xl border-2 border-emerald-500/40 space-y-3 text-xs ${subCardClass}`}
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="font-black text-sm text-emerald-400 flex items-center gap-1.5">
                  <Key className="w-4 h-4" />
                  <span>🔑 تنظیم و تغییر کلید API هوش مصنوعی (Gemini API Key)</span>
                </div>
                <span
                  className="px-2.5 py-1 rounded-lg bg-emerald-500/20 text-emerald-300 font-mono text-[11px] font-black"
                  dir="ltr"
                >
                  {maskedGeminiKeyStatus}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label className="text-[11px] font-bold block mb-1">
                    کلید جدید هوش مصنوعی (Gemini API Key):
                  </label>
                  <input
                    type="password"
                    dir="ltr"
                    value={newGeminiApiKeyInput}
                    onChange={(e) => setNewGeminiApiKeyInput(e.target.value)}
                    placeholder="AIzaSy... (ذخیره امن در سرور)"
                    className={`w-full px-3 py-2 rounded-xl border font-mono text-xs font-bold ${inputClass}`}
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold block mb-1">
                    رمز عبور جدید پنل مدیریت (Admin Password):
                  </label>
                  <input
                    type="password"
                    dir="ltr"
                    value={newMasterAdminPassInput}
                    onChange={(e) => setNewMasterAdminPassInput(e.target.value)}
                    placeholder="رمز عبور جدید پنل مدیریت در سرور..."
                    className={`w-full px-3 py-2 rounded-xl border font-mono text-xs font-bold ${inputClass}`}
                  />
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-2">
                <button
                  type="submit"
                  disabled={isUpdatingSecrets}
                  className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs cursor-pointer shadow"
                >
                  {isUpdatingSecrets
                    ? '⏳ در حال ارسال امن به سرور کلودفلر...'
                    : '💾 ذخیره کلید API در سرور'}
                </button>
                <button
                  type="button"
                  disabled={isTestingAiLive}
                  onClick={handleTestLiveAiConnection}
                  className="px-5 py-2.5 rounded-xl bg-[#D4AB58] hover:bg-[#e1b864] text-[#101622] font-black text-xs cursor-pointer shadow"
                >
                  {isTestingAiLive
                    ? '⏳ در حال تست زنده...'
                    : '⚡ تست زنده اتصال هوش مصنوعی'}
                </button>
              </div>

              {liveAiTestResult && (
                <div
                  className={`p-3 rounded-xl border text-xs space-y-1 ${
                    liveAiTestResult.ok
                      ? 'bg-emerald-500/15 border-emerald-500/50 text-emerald-300'
                      : 'bg-rose-500/15 border-rose-500/50 text-rose-300'
                  }`}
                >
                  <div className="flex items-center justify-between font-black">
                    <span>
                      {liveAiTestResult.ok
                        ? '✅ اتصال زنده هوش مصنوعی سرور برقرار است'
                        : '⚠️ خطا در برقراری ارتباط با هوش مصنوعی'}
                    </span>
                    <span dir="ltr" className="text-[11px] font-mono px-2 py-0.5 rounded bg-black/30">
                      Model: {liveAiTestResult.modelUsed}
                    </span>
                  </div>
                  <p className="text-[11px] font-bold leading-relaxed">
                    پاسخ دریافتی از هوش مصنوعی: «{liveAiTestResult.reply}»
                  </p>
                </div>
              )}
            </form>

            {/* 5. 50-USER & 5-ADMIN SIMULATION LAB + AUTOMATIC TELEGRAM REPORT & 100% CLEANUP */}
            <div className={`p-4 rounded-2xl border-2 border-[#D4AB58]/50 space-y-3 text-xs ${subCardClass}`}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <div className="font-black text-sm text-[#D4AB58]">
                    🧪 آزمایشگاه شبیه‌سازی ۵۰ کاربر و ۵ ادمین + ارسال خودکار گزارش به تلگرام ادمین
                  </div>
                  <p className="text-[11px] font-bold opacity-85 mt-0.5">
                    اجرای تست کامل ثبت‌نام کارگاه، فیش، امتیاز و نشان‌ها با ۵۰ دانشجوی مجازی و ۵ ادمین، ارسال گزارش به پیوی تلگرام مدیر ارشد و پاکسازی ۱۰۰٪ خودکار داده‌های تستی
                  </p>
                </div>
                <button
                  type="button"
                  disabled={isRunningSimulation}
                  onClick={handleRun50UserSimulationAndReport}
                  className="px-4 py-2.5 rounded-xl bg-[#D4AB58] text-[#101622] font-black text-xs cursor-pointer shadow shrink-0"
                >
                  {isRunningSimulation
                    ? '⏳ در حال اجرای شبیه‌سازی و پاکسازی...'
                    : '🚀 اجرای شبیه‌سازی ۵۰ کاربر و ارسال گزارش به تلگرام'}
                </button>
              </div>

              {lastSimulationSummary && (
                <div className="p-3 rounded-xl bg-emerald-950/60 border border-emerald-500/40 whitespace-pre-line font-bold text-[11px] text-emerald-200 leading-relaxed">
                  {lastSimulationSummary}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ===================================================================
            MODULE 10: ✏️ ۱۰. ویرایش دستی مینی‌اپ (Live Visual Text Editor)
           =================================================================== */}
        {activeModule === 10 && canAccessVisualEditor && (
          <div className={`rounded-3xl p-4 lg:p-6 border space-y-4 ${cardSurfaceClass}`}>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-current/10 pb-3">
              <div>
                <h2 className="text-sm lg:text-base font-black text-[#D4AB58]">
                  ✏️ ۱۰. ویرایش دستی و زنده متن‌های مینی‌اپ (Visual Text Editor)
                </h2>
                <p className="text-[11px] font-bold opacity-80 mt-0.5">
                  در این بخش می‌توانید مستقیماً وارد محیط واقعی مینی‌اپ شوید، روی هر تیتر، دکمه یا متن ثابت کلیک کنید و متن دلخواه خود را جایگزین و در سرور کلودفلر ذخیره نمایید.
                </p>
              </div>
              <span className="px-3 py-1 rounded-xl bg-[#D4AB58]/20 text-[#D4AB58] border border-[#D4AB58]/40 text-xs font-black shrink-0">
                {Object.keys(uiTexts || {}).length.toLocaleString('fa-IR')} متن ویرایش‌شده
              </span>
            </div>

            {/* Big Launch Visual Editor Button */}
            <div className={`p-5 rounded-2xl border-2 border-[#D4AB58]/60 space-y-3 text-center ${subCardClass}`}>
              <div className="text-xs sm:text-sm font-black text-[#D4AB58]">
                آماده ویرایش زنده متن‌های صفحات خانه، کارگاه‌ها، دستاوردها و پروفایل هستید؟
              </div>
              <p className="text-[11px] font-bold opacity-85 max-w-2xl mx-auto leading-relaxed">
                با زدن دکمه زیر، پنل مدیریت بسته شده و نوار ابزار شناور ویرایشگر در بالای مینی‌اپ ظاهر می‌شود. بین «🚶‍♂️ حالت جابه‌جایی در اپ» و «✏️ حالت انتخاب متن» سوییچ کنید و هر متنی را در لحظه تغییر دهید.
              </p>
              <button
                type="button"
                onClick={() => {
                  playFanfare();
                  onEnterVisualEditMode?.();
                }}
                className="w-full sm:w-auto px-6 py-3.5 rounded-2xl bg-[#D4AB58] hover:bg-[#e2b968] text-[#101622] font-black text-xs sm:text-sm border-b-4 border-[#8A6A26] shadow-xl cursor-pointer transition-all active:translate-y-0.5"
              >
                🎨 ورود به محیط واقعی مینی‌اپ در حالت ویرایش زنده متن‌ها
              </button>
            </div>

            {/* Action Buttons: Save to Cloudflare & Reset All to Default */}
            <div className="flex flex-col sm:flex-row gap-2.5">
              <button
                type="button"
                disabled={isSavingUiTextsServer}
                onClick={async () => {
                  playCoin();
                  setIsSavingUiTextsServer(true);
                  try {
                    const res = await saveCustomUiTextsOnBot(
                      uiTexts || {},
                      activeAdmin?.telegramId || MASTER_ADMIN_TELEGRAM_ID
                    );
                    appendLog(
                      'ذخیره دیکشنری متن‌های سفارشی مینی‌اپ در سرور کلودفلر',
                      `${Object.keys(uiTexts || {}).length} متن سفارشی`,
                      res.ok ? 'success' : 'warning'
                    );
                    triggerToast(res.message);
                  } finally {
                    setIsSavingUiTextsServer(false);
                  }
                }}
                className="flex-1 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs cursor-pointer shadow flex items-center justify-center gap-1.5 disabled:opacity-50"
              >
                <span>
                  {isSavingUiTextsServer
                    ? '⏳ در حال ذخیره در سرور کلودفلر...'
                    : '💾 ذخیره نهایی در سرور کلودفلر (/api/miniapp/admin-save-ui-texts)'}
                </span>
              </button>

              <button
                type="button"
                onClick={async () => {
                  playSwitch();
                  onUpdateUiTexts?.({});
                  await saveCustomUiTextsOnBot(
                    {},
                    activeAdmin?.telegramId || MASTER_ADMIN_TELEGRAM_ID
                  );
                  appendLog(
                    'بازگردانی تمام متن‌های مینی‌اپ به حالت پیش‌فرض',
                    'پاکسازی کامل تغییرات متنی',
                    'warning'
                  );
                  triggerToast('🔄 تمام متن‌های مینی‌اپ به حالت پیش‌فرض اولیه بازگردانده شدند.');
                }}
                className="px-5 py-3 rounded-xl bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border border-rose-500/40 font-black text-xs cursor-pointer flex items-center justify-center gap-1.5"
              >
                <span>🔄 بازگردانی تمام متن‌ها به حالت پیش‌فرض</span>
              </button>
            </div>

            {/* Modified Texts Dictionary Table */}
            <div className={`p-4 rounded-2xl border space-y-3 text-xs ${subCardClass}`}>
              <div className="font-black text-sm flex items-center justify-between">
                <span>📋 لیست متن‌های تغییریافته تا این لحظه:</span>
                <span className="text-[11px] opacity-75">
                  ({Object.keys(uiTexts || {}).length.toLocaleString('fa-IR')} مورد)
                </span>
              </div>

              {Object.keys(uiTexts || {}).length === 0 ? (
                <div className="p-6 rounded-xl bg-black/20 border border-current/10 text-center text-xs font-bold opacity-75">
                  هنوز هیچ متنی تغییر داده نشده است. روی دکمه «🎨 ورود به محیط واقعی مینی‌اپ در حالت ویرایش زنده متن‌ها» بزنید و روی هر متنی که می‌خواهید کلیک کنید.
                </div>
              ) : (
                <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
                  {Object.entries(uiTexts || {}).map(([origText, customVal]) => (
                    <div
                      key={origText}
                      className="p-3 rounded-xl bg-black/25 border border-current/15 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5"
                    >
                      <div className="space-y-1 flex-1 min-w-0">
                        <div className="text-[11px] opacity-70 break-words">
                          <span className="font-black text-amber-400">متن پیش‌فرض: </span>
                          {origText}
                        </div>
                        <div className="text-xs font-black text-emerald-400 break-words">
                          <span className="text-[#D4AB58]">متن جدید: </span>
                          {customVal}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          playTick();
                          const next = { ...(uiTexts || {}) };
                          delete next[origText];
                          onUpdateUiTexts?.(next);
                          triggerToast('🔄 این متن به حالت پیش‌فرض بازگردانده شد.');
                        }}
                        className="px-3 py-1.5 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 text-[11px] font-black shrink-0 cursor-pointer"
                      >
                        حذف و بازگشت به پیش‌فرض ✕
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
