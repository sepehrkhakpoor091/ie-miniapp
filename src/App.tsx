/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Industrial Engineering Student Association - Telegram Mini App & Responsive Desktop Web App
 * Full End-to-End Real-Time State Synchronization:
 * - Real ISO/IEC 18004 QR Code Generation & Image Scanner + Separate Ticket History Page
 * - Receipts & Student ID Cards (KYC) Pending / Approved / Rejected Folders
 * - Two-Way User Lock/Unlock (Account Ban & KYC Lock) + Custom Arbitrary Point Addition/Deduction
 * - Scheduled Timers with Exact Start Date & One-Time Execution
 * - Dynamic Medal Creator & Universal Avatar Studio (Student & Professor Avatars)
 */

import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  AboutAssociationConfig,
  AdminReceiptItem,
  AdminStudentDossier,
  AdminUser,
  AvatarCatalogItem,
  BadgeItem,
  CertificateInfo,
  ChannelAnnouncement,
  DEFAULT_ABOUT_CONFIG,
  DiscountRuleConfig,
  DiscountVoucher,
  EventItem,
  FeatureFlags,
  KycStatus,
  PointTransaction,
  Professor,
  ScheduledTimer,
  TabType,
  ThemeMode,
  TicketRecord,
  UserProfile,
  WeeklyQuest,
} from './types';
import {
  DEFAULT_CHANNEL_URL,
  DEFAULT_ISEFUM_ANNOUNCEMENTS,
  getSavedChannelUrl,
  loadStoredAnnouncements,
  saveChannelUrl,
  saveStoredAnnouncements,
  syncAnnouncementsFromTelegramChannel,
} from './utils/channelSync';
import {
  isSoundEnabled,
  playCoin,
  playError,
  toggleSound,
} from './utils/soundEngine';
import {
  clearAdminSession,
  computeStateChecksum,
  getRealTelegramUser,
  getValidAdminSession,
  safeJsonParse,
  touchAdminSession,
  verifyStateIntegrity,
} from './utils/security';
import {
  DEFAULT_CERTIFICATES,
  EXTENDED_BADGES,
  INITIAL_POINT_TRANSACTIONS,
  INITIAL_WEEKLY_QUESTS,
  calculateLevelFromScore,
} from './utils/gamification';
import { EVENTS_DATA, generateTicketPayload } from './utils/events';
import { syncUserProfileToBot } from './utils/apiBridge';

// Error Boundary & Core UI
import { PixelErrorBoundary } from './components/ui/PixelErrorBoundary';
import { SectionMaintenanceBanner } from './components/ui/SectionMaintenanceBanner';

// Tab Views, Desktop Sidebar & Admin Panel
import { HomeTab } from './components/home/HomeTab';
import { EventsTab } from './components/events/EventsTab';
import { ProfileTab } from './components/profile/ProfileTab';
import { AchievementsTab } from './components/achievements/AchievementsTab';
import { BottomNav } from './components/layout/BottomNav';
import { DesktopSidebar } from './components/layout/DesktopSidebar';
import {
  AdminPanel,
  DEFAULT_ADMINS,
  DEFAULT_AVATARS_CATALOG,
  DEFAULT_FEATURE_FLAGS,
  DEFAULT_RECEIPTS,
  DEFAULT_STUDENTS,
  DEFAULT_TIMERS,
} from './components/admin/AdminPanel';

// Drawers & Modals
import { QuickMenuDrawer } from './components/ui/QuickMenuDrawer';
import { CheckoutDrawer } from './components/events/CheckoutDrawer';
import { AdminVaultModal } from './components/modals/AdminVaultModal';
import { KycLockOverlay } from './components/modals/KycLockOverlay';
import { OnboardingModal } from './components/modals/OnboardingModal';
import { AnnouncementsDrawer } from './components/modals/AnnouncementsDrawer';
import { CurriculumModal } from './components/modals/CurriculumModal';
import { ProfessorsModal, PROFESSORS_DATA } from './components/modals/ProfessorsModal';
import { RemindersModal } from './components/modals/RemindersModal';
import { SupportModal } from './components/modals/SupportModal';
import { EventDetailsModal } from './components/modals/EventDetailsModal';

const USER_STORAGE_KEY = 'ie_student_profile_v3';
const CHECKSUM_STORAGE_KEY = 'ie_student_checksum_v3';
const THEME_STORAGE_KEY = 'ie_theme_mode';
const TICKETS_STORAGE_KEY = 'ie_student_tickets_v5';
const CERTIFICATES_STORAGE_KEY = 'ie_student_certificates_v4';
const TRANSACTIONS_STORAGE_KEY = 'ie_student_transactions_v3';
const VOUCHERS_STORAGE_KEY = 'ie_student_vouchers_v3';
const QUESTS_STORAGE_KEY = 'ie_student_quests_v3';
const EVENTS_STORAGE_KEY = 'ie_events_catalog_v4';
const PROFESSORS_STORAGE_KEY = 'ie_professors_catalog_v4';
const ADMINS_STORAGE_KEY = 'ie_admins_catalog_v4';
const FEATURE_FLAGS_STORAGE_KEY = 'ie_feature_flags_v4';
const STUDENTS_STORAGE_KEY = 'ie_students_catalog_v5';
const RECEIPTS_STORAGE_KEY = 'ie_receipts_catalog_v5';
const TIMERS_STORAGE_KEY = 'ie_timers_catalog_v5';
const BADGES_STORAGE_KEY = 'ie_badges_catalog_v5';
const AVATARS_STORAGE_KEY = 'ie_avatars_catalog_v5';
const DISCOUNT_RULE_STORAGE_KEY = 'ie_discount_rule_v5';
const FEATURED_EVENT_STORAGE_KEY = 'ie_featured_event_id_v1';
const ABOUT_CONFIG_STORAGE_KEY = 'ie_about_config_v1';

const ONBOARDING_COMPLETED_KEY = 'ie_onboarding_completed_v3';

const DEFAULT_PROFILE: UserProfile = {
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
  telegramUserId: 'web-local-student',
  onboardingCompleted: true,
};

const DEFAULT_CHECKSUM = computeStateChecksum(
  DEFAULT_PROFILE.score,
  DEFAULT_PROFILE.studentId,
  DEFAULT_PROFILE.level,
  DEFAULT_PROFILE.telegramUserId
);

const INITIAL_ALL_TICKETS: TicketRecord[] = [
  {
    id: 'ticket-default-pm',
    eventId: 'ev-project-mgmt',
    eventTitle: 'کارگاه مدیریت پروژه و کنترل زمان',
    eventDate: '۲۵ آبان ۱۴۰۴',
    eventTime: '۱۴:۰۰ الی ۱۷:۳۰',
    location: 'آمفی‌تئاتر دانشکده مهندسی صنایع',
    studentId: DEFAULT_PROFILE.studentId,
    studentName: DEFAULT_PROFILE.fullName,
    trackingCode: 'TK-402891',
    qrPayload: generateTicketPayload(
      'ev-project-mgmt',
      DEFAULT_PROFILE.studentId,
      'TK-402891'
    ),
    paidAmount: 0,
    discountPointsUsed: 20,
    issuedAt: '۲۰ آبان ۱۴۰۴',
    sentToTelegram: true,
    checkedIn: false,
  },
  {
    id: 'ticket-parnia-pm',
    eventId: 'ev-project-mgmt',
    eventTitle: 'کارگاه مدیریت پروژه و کنترل زمان',
    eventDate: '۲۵ آبان ۱۴۰۴',
    eventTime: '۱۴:۰۰ الی ۱۷:۳۰',
    location: 'آمفی‌تئاتر دانشکده مهندسی صنایع',
    studentId: '4021201188',
    studentName: 'پرنیا محمدی',
    trackingCode: 'TK-992310',
    qrPayload: generateTicketPayload(
      'ev-project-mgmt',
      '4021201188',
      'TK-992310'
    ),
    paidAmount: 100000,
    discountPointsUsed: 0,
    issuedAt: '۲۱ آبان ۱۴۰۴',
    sentToTelegram: true,
    checkedIn: false,
  },
  {
    id: 'ticket-kianoosh-py',
    eventId: 'ev-python-data',
    eventTitle: 'کارگاه تحلیل داده با پایتون',
    eventDate: '۲۸ آبان ۱۴۰۴',
    eventTime: '۱۵:۰۰ الی ۱۸:۰۰',
    location: 'سایت کامپیوتر دانشکده صنایع',
    studentId: '4011203309',
    studentName: 'کیانوش نادری',
    trackingCode: 'TK-774512',
    qrPayload: generateTicketPayload(
      'ev-python-data',
      '4011203309',
      'TK-774512'
    ),
    paidAmount: 50000,
    discountPointsUsed: 10,
    issuedAt: '۲۲ آبان ۱۴۰۴',
    sentToTelegram: true,
    checkedIn: false,
  },
];

export default function App() {
  const [themeMode, setThemeMode] = useState<ThemeMode>('night');
  const [isSoundActive, setIsSoundActive] = useState(true);

  const [user, setUser] = useState<UserProfile>(DEFAULT_PROFILE);
  const [stateChecksum, setStateChecksum] = useState<string>(DEFAULT_CHECKSUM);

  // Global Synchronized Catalogs
  const [allTickets, setAllTickets] = useState<TicketRecord[]>(INITIAL_ALL_TICKETS);
  const [certificates, setCertificates] = useState<CertificateInfo[]>(DEFAULT_CERTIFICATES);
  const [transactions, setTransactions] = useState<PointTransaction[]>(
    INITIAL_POINT_TRANSACTIONS
  );
  const [vouchers, setVouchers] = useState<DiscountVoucher[]>([]);
  const [quests, setQuests] = useState<WeeklyQuest[]>(INITIAL_WEEKLY_QUESTS);
  const [eventsCatalog, setEventsCatalog] = useState<EventItem[]>(EVENTS_DATA);
  const [professorsCatalog, setProfessorsCatalog] = useState<Professor[]>(PROFESSORS_DATA);
  const [adminsCatalog, setAdminsCatalog] = useState<AdminUser[]>(DEFAULT_ADMINS);
  const [featureFlags, setFeatureFlags] = useState<FeatureFlags>(DEFAULT_FEATURE_FLAGS);
  const [studentsCatalog, setStudentsCatalog] =
    useState<AdminStudentDossier[]>(DEFAULT_STUDENTS);
  const [receiptsCatalog, setReceiptsCatalog] =
    useState<AdminReceiptItem[]>(DEFAULT_RECEIPTS);
  const [timersCatalog, setTimersCatalog] =
    useState<ScheduledTimer[]>(DEFAULT_TIMERS);
  const [badgesCatalog, setBadgesCatalog] =
    useState<BadgeItem[]>(EXTENDED_BADGES);
  const [avatarsCatalog, setAvatarsCatalog] =
    useState<AvatarCatalogItem[]>(DEFAULT_AVATARS_CATALOG);
  const [discountRule, setDiscountRule] = useState<DiscountRuleConfig>({
    pointsStep: 10,
    discountTomansPerStep: 50000,
  });
  const [announcementsCatalog, setAnnouncementsCatalog] = useState<ChannelAnnouncement[]>(
    () => loadStoredAnnouncements()
  );
  const [officialChannelUrl, setOfficialChannelUrl] = useState<string>(() =>
    getSavedChannelUrl()
  );
  const [isSyncingChannel, setIsSyncingChannel] = useState(false);

  const [featuredEventId, setFeaturedEventId] = useState<string>(() => {
    try {
      const saved = localStorage.getItem(FEATURED_EVENT_STORAGE_KEY);
      if (saved) return saved;
    } catch {
      // Ignore storage error
    }
    return 'ev-project-mgmt';
  });

  const [aboutConfig, setAboutConfig] = useState<AboutAssociationConfig>(() => {
    try {
      const saved = localStorage.getItem(ABOUT_CONFIG_STORAGE_KEY);
      if (saved) {
        const parsed = safeJsonParse<Partial<AboutAssociationConfig> | null>(saved, null);
        if (parsed && typeof parsed.title === 'string') {
          return {
            ...DEFAULT_ABOUT_CONFIG,
            ...parsed,
          };
        }
      }
    } catch {
      // Ignore storage error
    }
    return DEFAULT_ABOUT_CONFIG;
  });

  const activeFeaturedEvent = useMemo(() => {
    const safeEvs =
      Array.isArray(eventsCatalog) && eventsCatalog.length > 0
        ? eventsCatalog
        : EVENTS_DATA;
    return (
      safeEvs.find((e) => e.id === featuredEventId) ||
      safeEvs.find((e) => e.id === 'ev-project-mgmt') ||
      safeEvs[0]
    );
  }, [eventsCatalog, featuredEventId]);

  // Navigation tab & Authenticated Admin Panel State
  const [activeTab, setActiveTab] = useState<TabType>('home');
  const [isAdminPanelOpen, setIsAdminPanelOpen] = useState(false);
  const [authenticatedAdmin, setAuthenticatedAdmin] = useState<AdminUser | null>(null);

  // Modal States
  const [isQuickMenuOpen, setIsQuickMenuOpen] = useState(false);
  const [isAdminVaultOpen, setIsAdminVaultOpen] = useState(false);
  const [isKycTestActive, setIsKycTestActive] = useState(false);
  const [isOnboardingOpen, setIsOnboardingOpen] = useState(false);
  const [isAnnouncementsDrawerOpen, setIsAnnouncementsDrawerOpen] = useState(false);
  const [announcementsInitialTab, setAnnouncementsInitialTab] = useState<'channel' | 'about'>(
    'channel'
  );
  const [isCurriculumModalOpen, setIsCurriculumModalOpen] = useState(false);
  const [isProfessorsModalOpen, setIsProfessorsModalOpen] = useState(false);
  const [isRemindersModalOpen, setIsRemindersModalOpen] = useState(false);
  const [isSupportModalOpen, setIsSupportModalOpen] = useState(false);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [selectedEventForCheckout, setSelectedEventForCheckout] =
    useState<EventItem | null>(null);

  // Filter tickets belonging to the active student for ProfileTab
  const currentStudentTickets = useMemo(() => {
    const safe = Array.isArray(allTickets) ? allTickets : [];
    return safe.filter((t) => t.studentId === user.studentId);
  }, [allTickets, user.studentId]);

  // Check if current student account is locked/banned in studentsCatalog
  const isCurrentStudentBanned = useMemo(() => {
    const found = (Array.isArray(studentsCatalog) ? studentsCatalog : []).find(
      (s) => s.studentId === user.studentId
    );
    return !!found?.isBanned;
  }, [studentsCatalog, user.studentId]);

  const stealthTapTimestampsRef = useRef<number[]>([]);

  const handleStealthTapGesture = () => {
    const now = Date.now();
    const recentTaps = stealthTapTimestampsRef.current.filter((t) => now - t < 3000);
    recentTaps.push(now);
    stealthTapTimestampsRef.current = recentTaps;

    if (recentTaps.length >= 5) {
      stealthTapTimestampsRef.current = [];
      playCoin();
      setIsAdminVaultOpen(true);
    }
  };

  const persistVerifiedProfile = (nextUser: UserProfile) => {
    const dynamicLvl = calculateLevelFromScore(nextUser.score);
    const realTg = getRealTelegramUser();
    const resolvedTgId =
      realTg?.id || nextUser.telegramUserId || 'web-local-student';

    const normalizedUser: UserProfile = {
      ...nextUser,
      level: dynamicLvl.level,
      rankTitle: dynamicLvl.rankTitle,
      telegramUserId: resolvedTgId,
      telegramUsername: realTg?.username || nextUser.telegramUsername || '',
    };

    const nextChecksum = computeStateChecksum(
      normalizedUser.score,
      normalizedUser.studentId,
      normalizedUser.level,
      resolvedTgId
    );
    setUser(normalizedUser);
    setStateChecksum(nextChecksum);
    localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(normalizedUser));
    localStorage.setItem(CHECKSUM_STORAGE_KEY, nextChecksum);
    if (normalizedUser.onboardingCompleted) {
      localStorage.setItem(ONBOARDING_COMPLETED_KEY, 'true');
    }
    void syncUserProfileToBot(normalizedUser, allTickets, nextChecksum);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'a') {
        e.preventDefault();
        playCoin();
        setIsAdminVaultOpen(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Periodic Admin Session Expiry Enforcement (20-Minute Inactivity Auto-Lock)
  useEffect(() => {
    if (!isAdminPanelOpen) return;
    const checkSession = () => {
      const validSession = getValidAdminSession();
      if (!validSession) {
        setIsAdminPanelOpen(false);
        setAuthenticatedAdmin(null);
      }
    };
    checkSession();
    const timer = setInterval(checkSession, 15000);
    return () => clearInterval(timer);
  }, [isAdminPanelOpen]);

  useEffect(() => {
    if (typeof window !== 'undefined' && window.Telegram?.WebApp) {
      window.Telegram.WebApp.ready?.();
      window.Telegram.WebApp.expand?.();
    }

    const savedTheme = localStorage.getItem(THEME_STORAGE_KEY) as ThemeMode | null;
    if (savedTheme === 'day' || savedTheme === 'night') {
      setThemeMode(savedTheme);
    }

    setIsSoundActive(isSoundEnabled());

    const realTgUser = getRealTelegramUser();
    const savedProfileRaw = localStorage.getItem(USER_STORAGE_KEY);
    const savedChecksum = localStorage.getItem(CHECKSUM_STORAGE_KEY);
    const isOnboardingDone = localStorage.getItem(ONBOARDING_COMPLETED_KEY) === 'true';

    if (savedProfileRaw) {
      const parsed = safeJsonParse<UserProfile | null>(savedProfileRaw, null);
      if (parsed && verifyStateIntegrity(parsed, savedChecksum, parsed.telegramUserId)) {
        const dynamicLvl = calculateLevelFromScore(parsed.score);
        const syncedUser: UserProfile = {
          ...parsed,
          level: dynamicLvl.level,
          rankTitle: dynamicLvl.rankTitle,
          telegramUserId: realTgUser?.id || parsed.telegramUserId || 'web-local-student',
        };
        setUser(syncedUser);
        setStateChecksum(
          computeStateChecksum(
            syncedUser.score,
            syncedUser.studentId,
            syncedUser.level,
            syncedUser.telegramUserId
          )
        );
      } else {
        // Anti-Replay / Tamper Detected: Reset score to 0 immediately
        playError();
        const resetZeroProfile: UserProfile = {
          ...(parsed || DEFAULT_PROFILE),
          firstName: realTgUser?.firstName || parsed?.firstName || 'دانشجو',
          lastName: realTgUser?.lastName || parsed?.lastName || '',
          fullName: realTgUser?.fullName || parsed?.fullName || 'دانشجوی مهندسی صنایع',
          score: 0,
          level: 1,
          rankTitle: 'سطح ۱ - دانشجوی نوپا',
          telegramUserId: realTgUser?.id || 'web-local-student',
        };
        persistVerifiedProfile(resetZeroProfile);
      }
    } else if (realTgUser?.isFromTelegramWebApp && !isOnboardingDone) {
      // Brand-new real Telegram Student opening the Mini App for the first time
      const freshTelegramStudent: UserProfile = {
        id: `usr-tg-${realTgUser.id}`,
        firstName: realTgUser.firstName,
        lastName: realTgUser.lastName,
        fullName: realTgUser.fullName,
        studentId: '',
        cohortYear: '۱۴۰۲',
        avatar: '01_avatar_boy.png',
        score: 0,
        level: 1,
        rankTitle: 'سطح ۱ - دانشجوی نوپا',
        verifiedTelegramPhone: '',
        kycStatus: 'verified',
        telegramUserId: realTgUser.id,
        telegramUsername: realTgUser.username,
        onboardingCompleted: false,
      };
      persistVerifiedProfile(freshTelegramStudent);
      setAllTickets([]);
      setVouchers([]);
      setTransactions([]);
      setIsOnboardingOpen(true);
    } else {
      persistVerifiedProfile(DEFAULT_PROFILE);
    }

    const loadJsonOrFallback = <T,>(key: string, fallback: T, setter: (v: T) => void) => {
      const raw = localStorage.getItem(key);
      if (raw) {
        const parsed = safeJsonParse<T | null>(raw, null);
        if (parsed !== null && parsed !== undefined) {
          setter(parsed);
          return;
        }
      }
      setter(fallback);
    };

    if (!(realTgUser?.isFromTelegramWebApp && !isOnboardingDone && !savedProfileRaw)) {
      loadJsonOrFallback(TICKETS_STORAGE_KEY, INITIAL_ALL_TICKETS, setAllTickets);
      loadJsonOrFallback(
        TRANSACTIONS_STORAGE_KEY,
        INITIAL_POINT_TRANSACTIONS,
        setTransactions
      );
      loadJsonOrFallback(VOUCHERS_STORAGE_KEY, [], setVouchers);
    }
    loadJsonOrFallback(CERTIFICATES_STORAGE_KEY, DEFAULT_CERTIFICATES, setCertificates);
    loadJsonOrFallback(QUESTS_STORAGE_KEY, INITIAL_WEEKLY_QUESTS, setQuests);
    loadJsonOrFallback(EVENTS_STORAGE_KEY, EVENTS_DATA, setEventsCatalog);
    loadJsonOrFallback(PROFESSORS_STORAGE_KEY, PROFESSORS_DATA, setProfessorsCatalog);
    loadJsonOrFallback(ADMINS_STORAGE_KEY, DEFAULT_ADMINS, setAdminsCatalog);
    loadJsonOrFallback(FEATURE_FLAGS_STORAGE_KEY, DEFAULT_FEATURE_FLAGS, setFeatureFlags);
    loadJsonOrFallback(STUDENTS_STORAGE_KEY, DEFAULT_STUDENTS, setStudentsCatalog);
    loadJsonOrFallback(RECEIPTS_STORAGE_KEY, DEFAULT_RECEIPTS, setReceiptsCatalog);
    loadJsonOrFallback(TIMERS_STORAGE_KEY, DEFAULT_TIMERS, setTimersCatalog);
    loadJsonOrFallback(BADGES_STORAGE_KEY, EXTENDED_BADGES, setBadgesCatalog);
    loadJsonOrFallback(
      AVATARS_STORAGE_KEY,
      DEFAULT_AVATARS_CATALOG,
      setAvatarsCatalog
    );
    loadJsonOrFallback(
      DISCOUNT_RULE_STORAGE_KEY,
      { pointsStep: 10, discountTomansPerStep: 50000 },
      setDiscountRule
    );

    // Patch 1: Zero URL Parameter Backdoors!
    // Never allow ?admin=1, ?vault=1, ?kyc=1, or ?onboarding=1 to open security modals.

    // Background sync with https://t.me/Isefum on initial mount
    const savedChan = getSavedChannelUrl() || DEFAULT_CHANNEL_URL;
    setOfficialChannelUrl(savedChan);
    syncAnnouncementsFromTelegramChannel(savedChan)
      .then((res) => {
        if (Array.isArray(res.announcements) && res.announcements.length > 0) {
          setAnnouncementsCatalog(res.announcements);
        }
      })
      .catch(() => {
        setAnnouncementsCatalog(DEFAULT_ISEFUM_ANNOUNCEMENTS);
      });
  }, []);

  const handleSyncTelegramChannel = async (customUrl?: string) => {
    setIsSyncingChannel(true);
    try {
      const res = await syncAnnouncementsFromTelegramChannel(
        customUrl || officialChannelUrl
      );
      setAnnouncementsCatalog(res.announcements);
      setOfficialChannelUrl(res.channelUrl);
    } finally {
      setIsSyncingChannel(false);
    }
  };

  useEffect(() => {
    const isNight = themeMode === 'night';
    if (isNight) {
      document.body.classList.remove('bg-[#F6F1E7]', 'text-[#14201B]');
      document.body.classList.add('bg-[#101622]', 'text-[#F6F1E7]');
    } else {
      document.body.classList.remove('bg-[#101622]', 'text-[#F6F1E7]');
      document.body.classList.add('bg-[#F6F1E7]', 'text-[#14201B]');
    }
    localStorage.setItem(THEME_STORAGE_KEY, themeMode);
  }, [themeMode]);

  const handleToggleTheme = () => {
    setThemeMode((prev) => (prev === 'night' ? 'day' : 'night'));
  };

  const handleToggleSound = () => {
    const active = toggleSound();
    setIsSoundActive(active);
  };

  const handleUpdateProfile = (updatedFields: Partial<UserProfile>) => {
    const isCompletingOnboarding =
      Boolean(updatedFields.onboardingCompleted) && !user.onboardingCompleted;
    const merged = { ...user, ...updatedFields };
    persistVerifiedProfile(merged);

    if (isCompletingOnboarding) {
      appendTransaction({
        id: `tx-onb-${Date.now()}`,
        title: 'پاداش خوشآمدگویی و تکمیل ثبت‌نام دانشجویی',
        amount: 5,
        date: new Date().toLocaleDateString('fa-IR'),
        category: 'onboarding',
        referenceCode: `ONB-${merged.studentId || '402'}`,
      });
    }

    // Also sync active student in studentsCatalog
    setStudentsCatalog((prev) => {
      const safePrev = Array.isArray(prev) ? prev : [];
      const exists = safePrev.some((s) => s.studentId === merged.studentId);
      const next = exists
        ? safePrev.map((s) =>
            s.studentId === merged.studentId
              ? {
                  ...s,
                  fullName: merged.fullName,
                  score: merged.score,
                  level: merged.level,
                  kycStatus: merged.kycStatus,
                  avatar: merged.avatar,
                }
              : s
          )
        : [
            {
              id: `stu-${Date.now()}`,
              fullName: merged.fullName,
              studentId: merged.studentId,
              cohortYear: (merged.cohortYear as AdminStudentDossier['cohortYear']) || '1402',
              phone: merged.verifiedTelegramPhone || '',
              avatar: merged.avatar,
              score: merged.score,
              level: merged.level,
              kycStatus: merged.kycStatus,
              isBanned: false,
              attendedEvents: [],
              badges: ['20_badge_shield.png'],
              payments: [],
              chatLogs: [],
            },
            ...safePrev,
          ];
      localStorage.setItem(STUDENTS_STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  };

  const handleKycStatusChange = (newStatus: KycStatus) => {
    handleUpdateProfile({ kycStatus: newStatus });
    if (newStatus === 'verified') {
      setIsKycTestActive(false);
    }
  };

  const appendTransaction = (tx: PointTransaction) => {
    setTransactions((prev) => {
      const safePrev = Array.isArray(prev) ? prev : [];
      const updated = [tx, ...safePrev];
      localStorage.setItem(TRANSACTIONS_STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });
  };

  const handleAppendReceiptItem = (item: AdminReceiptItem) => {
    setReceiptsCatalog((prev) => {
      const safePrev = Array.isArray(prev) ? prev : [];
      const updated = [item, ...safePrev];
      localStorage.setItem(RECEIPTS_STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });
  };

  const handleCompleteRegistration = (
    ticket: TicketRecord,
    pointsDeducted: number,
    pointsEarned: number
  ) => {
    const nextScore = Math.max(0, user.score - pointsDeducted + pointsEarned);
    handleUpdateProfile({ score: nextScore });

    const safeTickets = Array.isArray(allTickets) ? allTickets : [];
    const updatedTickets = [ticket, ...safeTickets];
    setAllTickets(updatedTickets);
    localStorage.setItem(TICKETS_STORAGE_KEY, JSON.stringify(updatedTickets));

    if (pointsDeducted > 0) {
      appendTransaction({
        id: `tx-disc-${Date.now()}`,
        title: `تخفیف امتیازی ثبت‌نام (${ticket.eventTitle})`,
        amount: -pointsDeducted,
        date: ticket.issuedAt,
        category: 'discount',
        referenceCode: ticket.trackingCode,
      });
    }

    if (pointsEarned > 0) {
      appendTransaction({
        id: `tx-rew-${Date.now() + 1}`,
        title: `پاداش ثبت‌نام در ${ticket.eventTitle}`,
        amount: pointsEarned,
        date: ticket.issuedAt,
        category: 'event',
        referenceCode: ticket.trackingCode,
      });
    }
  };

  const handleAdminCheckInTicket = (
    checkedTicket: TicketRecord,
    issuedCert: CertificateInfo,
    rewardPoints: number
  ) => {
    setAllTickets((prev) => {
      const safePrev = Array.isArray(prev) ? prev : [];
      const exists = safePrev.some(
        (t) =>
          t.qrPayload === checkedTicket.qrPayload ||
          t.trackingCode === checkedTicket.trackingCode
      );
      const updated = exists
        ? safePrev.map((t) =>
            t.qrPayload === checkedTicket.qrPayload ||
            t.trackingCode === checkedTicket.trackingCode
              ? { ...t, checkedIn: true, checkedInAt: checkedTicket.checkedInAt }
              : t
          )
        : [checkedTicket, ...safePrev];
      localStorage.setItem(TICKETS_STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });

    setCertificates((prev) => {
      const safePrev = Array.isArray(prev) ? prev : [];
      const updated = [
        issuedCert,
        ...safePrev.filter((c) => c.certificateId !== issuedCert.certificateId),
      ];
      localStorage.setItem(CERTIFICATES_STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });

    if (checkedTicket.studentId === user.studentId) {
      const nextScore = user.score + rewardPoints;
      handleUpdateProfile({ score: nextScore });
      appendTransaction({
        id: `tx-chk-${Date.now()}`,
        title: `پاداش حضور در کارگاه (${checkedTicket.eventTitle})`,
        amount: rewardPoints,
        date: new Date().toLocaleDateString('fa-IR'),
        category: 'event',
        referenceCode: issuedCert.certificateId,
      });
    }
  };

  const handleRedeemLootboxSuccess = (costPoints: number, voucher: DiscountVoucher) => {
    const rawSaved = localStorage.getItem(USER_STORAGE_KEY);
    if (rawSaved) {
      const parsed = safeJsonParse<UserProfile | null>(rawSaved, null);
      if (!parsed || !verifyStateIntegrity(parsed, stateChecksum, parsed.telegramUserId)) {
        playError();
        persistVerifiedProfile({
          ...user,
          score: 0,
          level: 1,
          rankTitle: 'سطح ۱ - دانشجوی نوپا',
        });
        return;
      }
    }

    const nextScore = Math.max(0, user.score - costPoints);
    handleUpdateProfile({ score: nextScore });

    const safeVouchers = Array.isArray(vouchers) ? vouchers : [];
    const updatedVouchers = [voucher, ...safeVouchers];
    setVouchers(updatedVouchers);
    localStorage.setItem(VOUCHERS_STORAGE_KEY, JSON.stringify(updatedVouchers));

    appendTransaction({
      id: `tx-loot-${Date.now()}`,
      title: `بازگشایی ${
        voucher.chestType === 'gold' ? 'صندوقچه طلایی صنایع' : 'صندوقچه برنزی'
      }`,
      amount: -costPoints,
      date: voucher.issuedAt,
      category: 'lootbox',
      referenceCode: voucher.code,
    });
  };

  const handleClaimQuest = (
    questId: string,
    rewardPoints: number,
    questTitle: string
  ) => {
    const safeQuests = Array.isArray(quests) ? quests : [];
    const updatedQuests = safeQuests.map((q) =>
      q.id === questId ? { ...q, isClaimed: true } : q
    );
    setQuests(updatedQuests);
    localStorage.setItem(QUESTS_STORAGE_KEY, JSON.stringify(updatedQuests));

    const nextScore = user.score + rewardPoints;
    handleUpdateProfile({ score: nextScore });

    appendTransaction({
      id: `tx-qst-${Date.now()}`,
      title: `پاداش ماموریت: ${questTitle}`,
      amount: rewardPoints,
      date: new Date().toLocaleDateString('fa-IR'),
      category: 'quest',
      referenceCode: `QST-${questId.toUpperCase()}`,
    });
  };

  const handleResetErrorState = () => {
    setIsAdminPanelOpen(false);
    setIsAdminVaultOpen(false);
    setIsQuickMenuOpen(false);
    setSelectedEventForCheckout(null);
    setActiveTab('home');
  };

  return (
    <PixelErrorBoundary onReset={handleResetErrorState}>
      <div
        className={`min-h-screen relative flex flex-col font-sans transition-colors duration-200 text-right ${
          themeMode === 'night'
            ? 'bg-[#101622] text-[#F6F1E7]'
            : 'bg-[#F6F1E7] text-[#14201B]'
        }`}
        dir="rtl"
      >
        {isAdminPanelOpen && getValidAdminSession() ? (
          <AdminPanel
            isOpen={isAdminPanelOpen}
            onClose={() => {
              clearAdminSession();
              setAuthenticatedAdmin(null);
              setIsAdminPanelOpen(false);
            }}
            themeMode={themeMode}
            currentAdmin={authenticatedAdmin}
            currentUser={user}
            userTickets={allTickets}
            certificates={certificates}
            featureFlags={featureFlags}
            students={studentsCatalog}
            events={eventsCatalog}
            receipts={receiptsCatalog}
            professors={professorsCatalog}
            admins={adminsCatalog}
            timers={timersCatalog}
            quests={quests}
            badgesCatalog={badgesCatalog}
            avatarsCatalog={avatarsCatalog}
            discountRule={discountRule}
            announcements={announcementsCatalog}
            channelUrl={officialChannelUrl}
            featuredEventId={featuredEventId}
            aboutConfig={aboutConfig}
            onUpdateEvents={(nextEvents) => {
              setEventsCatalog(nextEvents);
              localStorage.setItem(EVENTS_STORAGE_KEY, JSON.stringify(nextEvents));
            }}
            onUpdateFeaturedEventId={(nextId) => {
              setFeaturedEventId(nextId);
              localStorage.setItem(FEATURED_EVENT_STORAGE_KEY, nextId);
            }}
            onUpdateAboutConfig={(nextAbout) => {
              setAboutConfig(nextAbout);
              localStorage.setItem(ABOUT_CONFIG_STORAGE_KEY, JSON.stringify(nextAbout));
            }}
            onUpdateProfessors={(nextProfs) => {
              setProfessorsCatalog(nextProfs);
              localStorage.setItem(PROFESSORS_STORAGE_KEY, JSON.stringify(nextProfs));
            }}
            onUpdateQuests={(nextQuests) => {
              setQuests(nextQuests);
              localStorage.setItem(QUESTS_STORAGE_KEY, JSON.stringify(nextQuests));
            }}
            onUpdateAdmins={(nextAdmins) => {
              setAdminsCatalog(nextAdmins);
              localStorage.setItem(ADMINS_STORAGE_KEY, JSON.stringify(nextAdmins));
            }}
            onUpdateFeatureFlags={(nextFlags) => {
              setFeatureFlags(nextFlags);
              localStorage.setItem(FEATURE_FLAGS_STORAGE_KEY, JSON.stringify(nextFlags));
            }}
            onUpdateStudents={(nextStudents) => {
              setStudentsCatalog(nextStudents);
              localStorage.setItem(STUDENTS_STORAGE_KEY, JSON.stringify(nextStudents));
            }}
            onUpdateReceipts={(nextReceipts) => {
              setReceiptsCatalog(nextReceipts);
              localStorage.setItem(RECEIPTS_STORAGE_KEY, JSON.stringify(nextReceipts));
            }}
            onUpdateTimers={(nextTimers) => {
              setTimersCatalog(nextTimers);
              localStorage.setItem(TIMERS_STORAGE_KEY, JSON.stringify(nextTimers));
            }}
            onUpdateBadges={(nextBadges) => {
              setBadgesCatalog(nextBadges);
              localStorage.setItem(BADGES_STORAGE_KEY, JSON.stringify(nextBadges));
            }}
            onUpdateAvatars={(nextAvatars) => {
              setAvatarsCatalog(nextAvatars);
              localStorage.setItem(AVATARS_STORAGE_KEY, JSON.stringify(nextAvatars));
            }}
            onUpdateTickets={(nextTickets) => {
              setAllTickets(nextTickets);
              localStorage.setItem(TICKETS_STORAGE_KEY, JSON.stringify(nextTickets));
            }}
            onUpdateDiscountRule={(nextRule) => {
              setDiscountRule(nextRule);
              localStorage.setItem(DISCOUNT_RULE_STORAGE_KEY, JSON.stringify(nextRule));
            }}
            onUpdateAnnouncements={(nextAnns) => {
              setAnnouncementsCatalog(nextAnns);
              saveStoredAnnouncements(nextAnns);
            }}
            onUpdateChannelUrl={(nextUrl) => {
              const saved = saveChannelUrl(nextUrl);
              setOfficialChannelUrl(saved);
            }}
            onUpdateCurrentUserProfile={handleUpdateProfile}
            onCheckInTicket={handleAdminCheckInTicket}
            onAwardCurrentStudentPoints={(deltaPoints, reason) => {
              const nextScore = Math.max(0, user.score + deltaPoints);
              handleUpdateProfile({ score: nextScore });
              appendTransaction({
                id: `tx-adm-${Date.now()}`,
                title: reason,
                amount: deltaPoints,
                date: new Date().toLocaleDateString('fa-IR'),
                category: 'event',
                referenceCode: 'ADM-PANEL',
              });
            }}
          />
        ) : (
          <div className="flex-1 flex flex-col lg:flex-row w-full">
            <DesktopSidebar
              user={user}
              activeTab={activeTab}
              themeMode={themeMode}
              isSoundActive={isSoundActive}
              onChangeTab={setActiveTab}
              onToggleTheme={handleToggleTheme}
              onToggleSound={handleToggleSound}
              onOpenProfessorsModal={() => setIsProfessorsModalOpen(true)}
              onOpenRemindersModal={() => setIsRemindersModalOpen(true)}
              onOpenSupportModal={() => setIsSupportModalOpen(true)}
              onOpenAnnouncementsDrawer={() => setIsAnnouncementsDrawerOpen(true)}
              onOpenCurriculumModal={() => setIsCurriculumModalOpen(true)}
              onAvatarStealthTap={handleStealthTapGesture}
            />

            <main className="flex-1 w-full max-w-md lg:max-w-6xl xl:max-w-7xl mx-auto lg:px-6 relative">
              {isCurrentStudentBanned ? (
                <div className="p-6 lg:py-16 max-w-xl mx-auto">
                  <div className="p-6 rounded-3xl border-2 border-rose-500 bg-rose-950/90 text-white text-center space-y-3 shadow-2xl">
                    <div className="text-base font-black text-rose-300">
                      🚫 دسترسی این حساب دانشجویی توسط ادمین شورا قفل شده است
                    </div>
                    <p className="text-xs opacity-85 leading-relaxed">
                      برای باز کردن قفل حساب، از پنل مدیریت (ماژول ۳: مدیریت کاربران ← پرونده ۳۶۰ درجه) گزینه «🔓 باز کردن حساب» را انتخاب نمایید.
                    </p>
                    <button
                      type="button"
                      onClick={() => setIsAdminVaultOpen(true)}
                      className="px-4 py-2 rounded-xl bg-[#D4AB58] text-[#101622] text-xs font-black cursor-pointer"
                    >
                      ورود به پنل ادمین جهت باز کردن قفل
                    </button>
                  </div>
                </div>
              ) : featureFlags.globalMaintenanceMode ? (
                <div className="p-6 lg:py-16 max-w-xl mx-auto">
                  <SectionMaintenanceBanner
                    themeMode={themeMode}
                    sectionTitle="کل سامانه دانشجویی انجمن علمی مهندسی صنایع"
                    onStealthTap={handleStealthTapGesture}
                  />
                </div>
              ) : (
                <>
                  {activeTab === 'home' && (
                    <HomeTab
                      user={user}
                      themeMode={themeMode}
                      isSoundActive={isSoundActive}
                      announcements={announcementsCatalog}
                      channelUrl={officialChannelUrl}
                      featuredEvent={activeFeaturedEvent}
                      onToggleTheme={handleToggleTheme}
                      onToggleSound={handleToggleSound}
                      onChangeTab={setActiveTab}
                      onOpenQuickMenu={() => setIsQuickMenuOpen(true)}
                      onOpenAnnouncementsDrawer={(initialTab = 'channel') => {
                        setAnnouncementsInitialTab(initialTab);
                        setIsAnnouncementsDrawerOpen(true);
                      }}
                      onOpenProfessorsModal={() => setIsProfessorsModalOpen(true)}
                      onOpenRemindersModal={() => setIsRemindersModalOpen(true)}
                      onOpenSupportModal={() => setIsSupportModalOpen(true)}
                      onOpenCurriculumModal={() => setIsCurriculumModalOpen(true)}
                      onStealthTap={handleStealthTapGesture}
                      onOpenEventDetails={(clickedEventId) => {
                        const safeEvs =
                          Array.isArray(eventsCatalog) && eventsCatalog.length > 0
                            ? eventsCatalog
                            : EVENTS_DATA;
                        const ev =
                          safeEvs.find((e) => e.id === clickedEventId) ||
                          activeFeaturedEvent ||
                          safeEvs[0];
                        setSelectedEventForCheckout(ev);
                      }}
                    />
                  )}

                  {activeTab === 'events' && (
                    <EventsTab
                      themeMode={themeMode}
                      events={eventsCatalog}
                      registrationEnabled={featureFlags.eventsRegistrationEnabled}
                      onBackToHome={() => setActiveTab('home')}
                      onSelectEventForCheckout={(event) =>
                        setSelectedEventForCheckout(event)
                      }
                      onTriggerStealthAdmin={() => setIsAdminVaultOpen(true)}
                    />
                  )}

                  {activeTab === 'achievements' && (
                    <AchievementsTab
                      user={user}
                      themeMode={themeMode}
                      storedChecksum={stateChecksum}
                      vouchers={vouchers}
                      quests={quests}
                      leaderboardEnabled={featureFlags.leaderboardEnabled}
                      lootboxStoreEnabled={featureFlags.lootboxStoreEnabled}
                      onBackToHome={() => setActiveTab('home')}
                      onRedeemLootboxSuccess={handleRedeemLootboxSuccess}
                      onTamperReset={() => persistVerifiedProfile(DEFAULT_PROFILE)}
                      onClaimQuest={handleClaimQuest}
                    />
                  )}

                  {activeTab === 'profile' && (
                    <ProfileTab
                      user={user}
                      themeMode={themeMode}
                      isSoundActive={isSoundActive}
                      userTickets={currentStudentTickets}
                      certificates={certificates}
                      transactions={transactions}
                      vouchers={vouchers}
                      badgesCatalog={badgesCatalog}
                      studentAvatars={avatarsCatalog}
                      onSelectAvatar={(avatarUrl) => handleUpdateProfile({ avatar: avatarUrl })}
                      onBackToHome={() => setActiveTab('home')}
                      onToggleTheme={handleToggleTheme}
                      onToggleSound={handleToggleSound}
                      onOpenOnboardingEdit={() => setIsOnboardingOpen(true)}
                      onOpenCurriculumModal={() => setIsCurriculumModalOpen(true)}
                      onStealthTap={handleStealthTapGesture}
                    />
                  )}
                </>
              )}
            </main>

            <BottomNav
              activeTab={activeTab}
              onChangeTab={setActiveTab}
              themeMode={themeMode}
            />
          </div>
        )}

        <QuickMenuDrawer
          isOpen={isQuickMenuOpen}
          onClose={() => setIsQuickMenuOpen(false)}
          themeMode={themeMode}
          isSoundActive={isSoundActive}
          onToggleTheme={handleToggleTheme}
          onToggleSound={handleToggleSound}
          onOpenKycLock={() => setIsKycTestActive(true)}
          onOpenOnboarding={() => setIsOnboardingOpen(true)}
        />

        <CheckoutDrawer
          event={selectedEventForCheckout}
          isOpen={!!selectedEventForCheckout}
          onClose={() => setSelectedEventForCheckout(null)}
          user={user}
          themeMode={themeMode}
          discountRule={{
            pointsUnit: discountRule.pointsStep,
            discountToman: discountRule.discountTomansPerStep,
          }}
          onCompleteRegistration={handleCompleteRegistration}
          onSubmitReceipt={handleAppendReceiptItem}
        />

        {!isAdminPanelOpen && (user.kycStatus !== 'verified' || isKycTestActive) && (
          <KycLockOverlay
            status={
              isKycTestActive && user.kycStatus === 'verified'
                ? 'kyc_locked'
                : user.kycStatus
            }
            themeMode={themeMode}
            onUpdateStatus={handleKycStatusChange}
            studentId={user.studentId}
            fullName={user.fullName}
            cohortYear={user.cohortYear}
            onSubmitKycCard={handleAppendReceiptItem}
          />
        )}

        <AdminVaultModal
          isOpen={isAdminVaultOpen}
          onClose={() => setIsAdminVaultOpen(false)}
          admins={adminsCatalog}
          onUnlockSuccess={(matchedAdmin) => {
            setAuthenticatedAdmin(matchedAdmin || null);
            setIsAdminPanelOpen(true);
          }}
          themeMode={themeMode}
        />

        <OnboardingModal
          isOpen={isOnboardingOpen}
          onClose={() => setIsOnboardingOpen(false)}
          onComplete={handleUpdateProfile}
          currentProfile={user}
          themeMode={themeMode}
          studentAvatars={avatarsCatalog}
        />

        <AnnouncementsDrawer
          isOpen={isAnnouncementsDrawerOpen}
          onClose={() => setIsAnnouncementsDrawerOpen(false)}
          themeMode={themeMode}
          announcements={announcementsCatalog}
          channelUrl={officialChannelUrl}
          aboutConfig={aboutConfig}
          initialSubTab={announcementsInitialTab}
          onSyncChannel={() => handleSyncTelegramChannel()}
          isSyncing={isSyncingChannel}
        />

        <CurriculumModal
          isOpen={isCurriculumModalOpen}
          onClose={() => setIsCurriculumModalOpen(false)}
          themeMode={themeMode}
          studentCohortYear={user.cohortYear}
        />

        <ProfessorsModal
          isOpen={isProfessorsModalOpen}
          onClose={() => setIsProfessorsModalOpen(false)}
          themeMode={themeMode}
          professors={professorsCatalog}
          professorsDirectoryEnabled={featureFlags.professorsDirectoryEnabled}
        />

        <RemindersModal
          isOpen={isRemindersModalOpen}
          onClose={() => setIsRemindersModalOpen(false)}
          themeMode={themeMode}
          scheduledTimers={timersCatalog}
        />

        <SupportModal
          isOpen={isSupportModalOpen}
          onClose={() => setIsSupportModalOpen(false)}
          themeMode={themeMode}
          user={user}
          certificates={certificates}
          supportTicketsEnabled={featureFlags.supportTicketsEnabled}
          onTriggerStealthAdmin={() => setIsAdminVaultOpen(true)}
        />

        <EventDetailsModal
          eventId={selectedEventId}
          isOpen={!!selectedEventId}
          onClose={() => setSelectedEventId(null)}
          themeMode={themeMode}
          onRegistered={() => {
            handleUpdateProfile({
              score: user.score + 50,
            });
          }}
        />
      </div>
    </PixelErrorBoundary>
  );
}
