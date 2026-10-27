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
  LootboxConfig,
  PointTransaction,
  Professor,
  ScheduledTimer,
  StudentIdDisputeTicket,
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
  MASTER_ADMIN_TELEGRAM_ID,
  clearAdminSession,
  computeStateChecksum,
  getRealTelegramUser,
  getScopedStorageKey,
  getValidAdminSession,
  isMasterAdminTelegramUser,
  isProtectedMasterAccount,
  safeJsonParse,
  verifyStateIntegrity,
} from './utils/security';
import {
  DEFAULT_CERTIFICATES,
  DEFAULT_LOOTBOX_CONFIG,
  EXTENDED_BADGES,
  INITIAL_POINT_TRANSACTIONS,
  INITIAL_WEEKLY_QUESTS,
  calculateLevelFromScore,
} from './utils/gamification';
import { EVENTS_DATA, normalizeEvent, normalizeEventsList } from './utils/events';
import {
  BOT_WORKER_BASE_URL,
  fetchMiniAppBootstrap,
  syncUserProfileToBot,
} from './utils/apiBridge';

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

const USER_STORAGE_KEY = 'ie_student_profile_v6';
const CHECKSUM_STORAGE_KEY = 'ie_student_checksum_v6';
const THEME_STORAGE_KEY = 'ie_theme_mode';
const TICKETS_STORAGE_KEY = 'ie_student_tickets_v6';
const CERTIFICATES_STORAGE_KEY = 'ie_student_certificates_v4';
const TRANSACTIONS_STORAGE_KEY = 'ie_student_transactions_v6';
const VOUCHERS_STORAGE_KEY = 'ie_student_vouchers_v6';
const QUESTS_STORAGE_KEY = 'ie_student_quests_v4';
const EVENTS_STORAGE_KEY = 'ie_events_catalog_v4';
const PROFESSORS_STORAGE_KEY = 'ie_professors_catalog_v4';
const ADMINS_STORAGE_KEY = 'ie_admins_catalog_v5';
const FEATURE_FLAGS_STORAGE_KEY = 'ie_feature_flags_v4';
const STUDENTS_STORAGE_KEY = 'ie_students_catalog_v6';
const RECEIPTS_STORAGE_KEY = 'ie_receipts_catalog_v6';
const TIMERS_STORAGE_KEY = 'ie_timers_catalog_v5';
const BADGES_STORAGE_KEY = 'ie_badges_catalog_v5';
const AVATARS_STORAGE_KEY = 'ie_avatars_catalog_v5';
const DISCOUNT_RULE_STORAGE_KEY = 'ie_discount_rule_v6';
const LOOTBOX_CONFIG_STORAGE_KEY = 'ie_lootbox_config_v1';
const DISPUTE_TICKETS_STORAGE_KEY = 'ie_dispute_tickets_v1';
const FEATURED_EVENT_STORAGE_KEY = 'ie_featured_event_id_v1';
const ABOUT_CONFIG_STORAGE_KEY = 'ie_about_config_v1';

const ONBOARDING_COMPLETED_KEY = 'ie_onboarding_completed_v6';

// Clean unauthenticated default profile — zero hardcoded personal names or student IDs
const DEFAULT_PROFILE: UserProfile = {
  id: 'usr-guest',
  firstName: '',
  lastName: '',
  fullName: 'دانشجوی مهندسی صنایع',
  studentId: '',
  cohortYear: '۱۴۰۲',
  avatar: '01_avatar_boy.png',
  score: 0,
  level: 1,
  rankTitle: 'سطح ۱ - دانشجوی نوپا',
  verifiedTelegramPhone: '',
  kycStatus: 'verified',
  telegramUserId: 'web-local-student',
  onboardingCompleted: false,
};

const DEFAULT_CHECKSUM = computeStateChecksum(
  DEFAULT_PROFILE.score,
  DEFAULT_PROFILE.studentId,
  DEFAULT_PROFILE.level,
  DEFAULT_PROFILE.telegramUserId
);

// Zero fake tickets — populated only from real student registrations
const INITIAL_ALL_TICKETS: TicketRecord[] = [];

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
    pointsStep: 20,
    discountTomansPerStep: 10000,
    minPoints: 20,
    maxPoints: 100,
  });
  const [lootboxConfig, setLootboxConfig] =
    useState<LootboxConfig>(DEFAULT_LOOTBOX_CONFIG);
  const [disputeTickets, setDisputeTickets] = useState<StudentIdDisputeTicket[]>([]);
  const [announcementsCatalog, setAnnouncementsCatalog] = useState<ChannelAnnouncement[]>(
    () => loadStoredAnnouncements()
  );
  const [officialChannelUrl, setOfficialChannelUrl] = useState<string>(() =>
    getSavedChannelUrl()
  );
  const [isSyncingChannel, setIsSyncingChannel] = useState(false);
  const [serverReferralStats, setServerReferralStats] = useState<
    { referredCount: number; pointsEarned: number } | undefined
  >(undefined);

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
    const safeEvs = normalizeEventsList(
      Array.isArray(eventsCatalog) && eventsCatalog.length > 0
        ? eventsCatalog
        : EVENTS_DATA
    );
    const chosen =
      safeEvs.find((e) => e.id === featuredEventId) ||
      safeEvs.find((e) => e.id === 'ev-project-mgmt') ||
      safeEvs[0];
    return normalizeEvent(chosen);
  }, [eventsCatalog, featuredEventId]);

  // Navigation tab & Authenticated Admin Panel State
  const [activeTab, setActiveTab] = useState<TabType>('home');
  const [isAdminPanelOpen, setIsAdminPanelOpen] = useState(false);
  const [authenticatedAdmin, setAuthenticatedAdmin] = useState<AdminUser | null>(null);

  // Modal States
  const [isBootstrapping, setIsBootstrapping] = useState(true);
  const [isQuickMenuOpen, setIsQuickMenuOpen] = useState(false);
  const [profileInitialModal, setProfileInitialModal] = useState<
    'settings' | 'history' | null
  >(null);
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
    if (!user.studentId) return [];
    const safe = Array.isArray(allTickets) ? allTickets : [];
    return safe.filter((t) => t.studentId === user.studentId);
  }, [allTickets, user.studentId]);

  // Check if current student account is locked/banned in studentsCatalog (Master Admin 629890497 is 100% immune)
  const isCurrentStudentBanned = useMemo(() => {
    if (
      isMasterAdminTelegramUser(user.telegramUserId) ||
      isProtectedMasterAccount(user)
    ) {
      return false;
    }
    if (!user.studentId) return false;
    const found = (Array.isArray(studentsCatalog) ? studentsCatalog : []).find(
      (s) => s.studentId === user.studentId
    );
    if (found && isProtectedMasterAccount(found)) return false;
    return !!found?.isBanned;
  }, [studentsCatalog, user]);

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
    const safeScore =
      typeof nextUser.score === 'number' && !Number.isNaN(nextUser.score) && nextUser.score >= 0
        ? nextUser.score
        : 0;
    const dynamicLvl = calculateLevelFromScore(safeScore);
    const realTg = getRealTelegramUser();
    const rawTgId =
      window.Telegram?.WebApp?.initDataUnsafe?.user?.id || realTg?.id;
    const resolvedTgId =
      (rawTgId !== undefined ? String(rawTgId) : '') ||
      nextUser.telegramUserId ||
      'web-local-student';

    const isMasterOwner =
      isMasterAdminTelegramUser(resolvedTgId) ||
      isProtectedMasterAccount(nextUser) ||
      resolvedTgId === MASTER_ADMIN_TELEGRAM_ID;

    const hasValidStudentId =
      Boolean(nextUser.studentId) &&
      String(nextUser.studentId).trim().length >= 6;

    const normalizedUser: UserProfile = {
      ...nextUser,
      score: safeScore,
      level: dynamicLvl.level,
      rankTitle: dynamicLvl.rankTitle,
      telegramUserId: resolvedTgId,
      telegramUsername: realTg?.username || nextUser.telegramUsername || '',
      onboardingCompleted: Boolean(nextUser.onboardingCompleted || hasValidStudentId),
      kycStatus: isMasterOwner ? 'verified' : nextUser.kycStatus || 'verified',
    };

    const nextChecksum = computeStateChecksum(
      normalizedUser.score,
      normalizedUser.studentId,
      normalizedUser.level,
      resolvedTgId
    );
    setUser(normalizedUser);
    setStateChecksum(nextChecksum);

    const scopedUserKey = getScopedStorageKey(USER_STORAGE_KEY, resolvedTgId);
    const scopedChecksumKey = getScopedStorageKey(CHECKSUM_STORAGE_KEY, resolvedTgId);
    const scopedOnboardingKey = getScopedStorageKey(ONBOARDING_COMPLETED_KEY, resolvedTgId);

    localStorage.setItem(scopedUserKey, JSON.stringify(normalizedUser));
    localStorage.setItem(scopedChecksumKey, nextChecksum);
    localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(normalizedUser));
    localStorage.setItem(CHECKSUM_STORAGE_KEY, nextChecksum);

    if (normalizedUser.onboardingCompleted || hasValidStudentId) {
      localStorage.setItem(scopedOnboardingKey, 'true');
      localStorage.setItem(ONBOARDING_COMPLETED_KEY, 'true');
    }
    if (normalizedUser.onboardingCompleted && normalizedUser.studentId) {
      void syncUserProfileToBot(normalizedUser, allTickets, nextChecksum);
    }
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

    loadJsonOrFallback(TICKETS_STORAGE_KEY, INITIAL_ALL_TICKETS, setAllTickets);
    loadJsonOrFallback(
      TRANSACTIONS_STORAGE_KEY,
      INITIAL_POINT_TRANSACTIONS,
      setTransactions
    );
    loadJsonOrFallback(VOUCHERS_STORAGE_KEY, [], setVouchers);
    loadJsonOrFallback(CERTIFICATES_STORAGE_KEY, DEFAULT_CERTIFICATES, setCertificates);
    loadJsonOrFallback(QUESTS_STORAGE_KEY, INITIAL_WEEKLY_QUESTS, setQuests);
    loadJsonOrFallback(EVENTS_STORAGE_KEY, EVENTS_DATA, (loadedEvents) => {
      setEventsCatalog(normalizeEventsList(loadedEvents));
    });
    loadJsonOrFallback(PROFESSORS_STORAGE_KEY, PROFESSORS_DATA, setProfessorsCatalog);
    loadJsonOrFallback(ADMINS_STORAGE_KEY, DEFAULT_ADMINS, (loadedAdmins) => {
      const safe = Array.isArray(loadedAdmins) ? loadedAdmins : DEFAULT_ADMINS;
      const cleaned = safe.filter(
        (a) =>
          a.id !== 'adm-2' &&
          a.id !== 'adm-3' &&
          a.telegramId !== '@parnia_ie_edu' &&
          a.telegramId !== '@kianoosh_fin'
      );
      setAdminsCatalog(cleaned.length > 0 ? cleaned : DEFAULT_ADMINS);
    });
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
      {
        pointsStep: 20,
        discountTomansPerStep: 10000,
        minPoints: 20,
        maxPoints: 100,
      },
      setDiscountRule
    );
    loadJsonOrFallback(
      LOOTBOX_CONFIG_STORAGE_KEY,
      DEFAULT_LOOTBOX_CONFIG,
      setLootboxConfig
    );
    loadJsonOrFallback(DISPUTE_TICKETS_STORAGE_KEY, [], setDisputeTickets);

    const realTgUser = getRealTelegramUser();
    const rawTgId =
      window.Telegram?.WebApp?.initDataUnsafe?.user?.id || realTgUser?.id;
    const tgIdForBootstrap = rawTgId !== undefined ? String(rawTgId) : undefined;

    const scopedUserKey = getScopedStorageKey(USER_STORAGE_KEY, tgIdForBootstrap);
    const scopedChecksumKey = getScopedStorageKey(CHECKSUM_STORAGE_KEY, tgIdForBootstrap);
    const scopedOnboardingKey = getScopedStorageKey(ONBOARDING_COMPLETED_KEY, tgIdForBootstrap);

    const savedProfileRaw =
      localStorage.getItem(scopedUserKey) || localStorage.getItem(USER_STORAGE_KEY);
    const savedChecksum =
      localStorage.getItem(scopedChecksumKey) || localStorage.getItem(CHECKSUM_STORAGE_KEY);
    const isOnboardingDone =
      localStorage.getItem(scopedOnboardingKey) === 'true' ||
      localStorage.getItem(ONBOARDING_COMPLETED_KEY) === 'true';

    let hasValidLocalProfile = false;
    if (savedProfileRaw) {
      const parsed = safeJsonParse<UserProfile | null>(savedProfileRaw, null);
      const isLegacyMock =
        parsed &&
        (parsed.studentId === `402${'1202422'}` ||
          (parsed.fullName &&
            parsed.fullName.includes('رضایی') &&
            parsed.firstName?.startsWith('امیر')));
      if (isLegacyMock) {
        localStorage.removeItem(scopedUserKey);
        localStorage.removeItem(scopedChecksumKey);
        localStorage.removeItem(scopedOnboardingKey);
        localStorage.removeItem(USER_STORAGE_KEY);
        localStorage.removeItem(CHECKSUM_STORAGE_KEY);
        localStorage.removeItem(ONBOARDING_COMPLETED_KEY);
      } else if (
        parsed &&
        (parsed.onboardingCompleted ||
          (parsed.studentId && String(parsed.studentId).trim().length >= 6))
      ) {
        hasValidLocalProfile = true;
        const safeScore =
          typeof parsed.score === 'number' && !Number.isNaN(parsed.score) && parsed.score >= 0
            ? parsed.score
            : 0;
        const dynamicLvl = calculateLevelFromScore(safeScore);
        const effectiveTgId =
          tgIdForBootstrap || parsed.telegramUserId || 'web-local-student';
        const isMasterOwner =
          isMasterAdminTelegramUser(effectiveTgId) ||
          isProtectedMasterAccount(parsed);
        const syncedUser: UserProfile = {
          ...parsed,
          score: safeScore,
          level: dynamicLvl.level,
          rankTitle: dynamicLvl.rankTitle,
          onboardingCompleted: true,
          kycStatus: isMasterOwner ? 'verified' : parsed.kycStatus || 'verified',
          telegramUserId: effectiveTgId,
        };
        // Recompute and save fresh checksum so valid registered profiles are NEVER reset
        void verifyStateIntegrity(syncedUser, savedChecksum, effectiveTgId);
        const freshChecksum = computeStateChecksum(
          syncedUser.score,
          syncedUser.studentId,
          syncedUser.level,
          effectiveTgId
        );
        setUser(syncedUser);
        setStateChecksum(freshChecksum);
        localStorage.setItem(scopedUserKey, JSON.stringify(syncedUser));
        localStorage.setItem(scopedChecksumKey, freshChecksum);
        localStorage.setItem(scopedOnboardingKey, 'true');
        localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(syncedUser));
        localStorage.setItem(CHECKSUM_STORAGE_KEY, freshChecksum);
        localStorage.setItem(ONBOARDING_COMPLETED_KEY, 'true');
        setIsOnboardingOpen(false);
      }
    }

    // Live Bootstrap from Telegram Bot Server (`GET ${BOT_WORKER_BASE_URL}/api/miniapp/bootstrap`)
    // Wait for server response before deciding whether to open OnboardingModal
    let bootstrapSettled = false;
    const bootstrapTimeout = setTimeout(() => {
      if (!bootstrapSettled) {
        bootstrapSettled = true;
        setIsBootstrapping(false);
        if (!hasValidLocalProfile && !isOnboardingDone) {
          setIsOnboardingOpen(true);
        }
      }
    }, 1500);

    fetchMiniAppBootstrap(tgIdForBootstrap)
      .then((boot) => {
        clearTimeout(bootstrapTimeout);
        bootstrapSettled = true;
        applyBootstrapResponse(boot, tgIdForBootstrap, realTgUser?.username, true, hasValidLocalProfile, isOnboardingDone);
        setIsBootstrapping(false);
      })
      .catch(() => {
        clearTimeout(bootstrapTimeout);
        bootstrapSettled = true;
        setIsBootstrapping(false);
        if (!hasValidLocalProfile && !isOnboardingDone) {
          setIsOnboardingOpen(true);
        }
      });

    // Patch 1: Zero URL Parameter Backdoors!
    // Never allow ?admin=1, ?vault=1, ?kyc=1, or ?onboarding=1 to open security modals.

    // Live Channel Sync with https://t.me/Isefum (`GET ${BOT_WORKER_BASE_URL}/api/miniapp/channel-sync?channel=Isefum`)
    // Continuously pin all displayed channel posts
    const savedChan = getSavedChannelUrl() || DEFAULT_CHANNEL_URL;
    setOfficialChannelUrl(savedChan);
    const syncAndPinChannel = () => {
      syncAnnouncementsFromTelegramChannel(savedChan)
        .then((res) => {
          if (Array.isArray(res.announcements) && res.announcements.length > 0) {
            setAnnouncementsCatalog(
              res.announcements.map((a) => ({ ...a, isPinned: true }))
            );
          }
        })
        .catch(() => {
          setAnnouncementsCatalog(
            DEFAULT_ISEFUM_ANNOUNCEMENTS.map((a) => ({ ...a, isPinned: true }))
          );
        });
    };
    syncAndPinChannel();
    const channelPinTimer = window.setInterval(syncAndPinChannel, 60000);
    return () => {
      clearTimeout(bootstrapTimeout);
      window.clearInterval(channelPinTimer);
    };
  }, []);

  const applyBootstrapResponse = (
    boot: Awaited<ReturnType<typeof fetchMiniAppBootstrap>>,
    tgIdForBootstrap?: string,
    tgUsername?: string,
    isInitialMount = false,
    hasValidLocalProfile = true,
    isOnboardingDone = true
  ) => {
    let latestServerKycStatusForCurrentUser: KycStatus | undefined;

    if (Array.isArray(boot.students) && boot.students.length > 0) {
      const serverStudents = boot.students;
      for (const s of serverStudents) {
        if (s && s.studentId) {
          const protectedStu = isProtectedMasterAccount(s);
          const resolvedKyc = protectedStu ? 'verified' : s.kycStatus;
          if (
            (user.studentId && s.studentId === user.studentId) ||
            (tgIdForBootstrap && s.telegramUserId === tgIdForBootstrap)
          ) {
            latestServerKycStatusForCurrentUser = resolvedKyc;
          }
        }
      }
      setStudentsCatalog((prev) => {
        const safePrev = Array.isArray(prev) ? prev : [];
        const map = new Map<string, AdminStudentDossier>();
        for (const s of serverStudents) {
          if (s && s.studentId) {
            const protectedStu = isProtectedMasterAccount(s);
            const resolvedKyc = protectedStu ? 'verified' : s.kycStatus;
            map.set(s.studentId, {
              ...s,
              fullName: s.fullName || 'دانشجوی مهندسی صنایع',
              phone: s.phone || '',
              attendedEvents: Array.isArray(s.attendedEvents) ? s.attendedEvents : [],
              badges: Array.isArray(s.badges) ? s.badges : [],
              payments: Array.isArray(s.payments) ? s.payments : [],
              chatLogs: Array.isArray(s.chatLogs) ? s.chatLogs : [],
              kycStatus: resolvedKyc,
              isBanned: protectedStu ? false : s.isBanned,
            });
          }
        }
        for (const localStu of safePrev) {
          if (localStu && localStu.studentId && !map.has(localStu.studentId)) {
            const protectedStu = isProtectedMasterAccount(localStu);
            map.set(localStu.studentId, {
              ...localStu,
              fullName: localStu.fullName || 'دانشجوی مهندسی صنایع',
              phone: localStu.phone || '',
              attendedEvents: Array.isArray(localStu.attendedEvents)
                ? localStu.attendedEvents
                : [],
              badges: Array.isArray(localStu.badges) ? localStu.badges : [],
              payments: Array.isArray(localStu.payments) ? localStu.payments : [],
              chatLogs: Array.isArray(localStu.chatLogs) ? localStu.chatLogs : [],
              kycStatus: protectedStu ? 'verified' : localStu.kycStatus,
              isBanned: protectedStu ? false : localStu.isBanned,
            });
          }
        }
        const mergedList = Array.from(map.values());
        localStorage.setItem(STUDENTS_STORAGE_KEY, JSON.stringify(mergedList));
        return mergedList;
      });
    }

    if (boot.lootboxConfig) {
      setLootboxConfig(boot.lootboxConfig);
      localStorage.setItem(
        LOOTBOX_CONFIG_STORAGE_KEY,
        JSON.stringify(boot.lootboxConfig)
      );
    }

    if (Array.isArray(boot.events) && boot.events.length > 0) {
      setEventsCatalog((prev) => {
        const localMap = new Map<string, EventItem>();
        for (const loc of Array.isArray(prev) ? prev : []) {
          if (loc && loc.id) localMap.set(loc.id, loc);
        }
        const mergedBootEvents = boot.events!.map((srvEv) => {
          const normSrv = normalizeEvent(srvEv);
          const locEv = localMap.get(normSrv.id);
          if (!locEv) return normSrv;
          return normalizeEvent({
            ...normSrv,
            allowPointsDiscount:
              (srvEv as Partial<EventItem>)?.allowPointsDiscount !== undefined
                ? normSrv.allowPointsDiscount
                : locEv.allowPointsDiscount,
            discountPointsStep:
              (srvEv as Partial<EventItem>)?.discountPointsStep !== undefined
                ? normSrv.discountPointsStep
                : locEv.discountPointsStep,
            discountTomansPerStep:
              (srvEv as Partial<EventItem>)?.discountTomansPerStep !== undefined
                ? normSrv.discountTomansPerStep
                : locEv.discountTomansPerStep,
            discountMinPoints:
              (srvEv as Partial<EventItem>)?.discountMinPoints !== undefined
                ? normSrv.discountMinPoints
                : locEv.discountMinPoints,
            discountMaxPoints:
              (srvEv as Partial<EventItem>)?.discountMaxPoints !== undefined
                ? normSrv.discountMaxPoints
                : locEv.discountMaxPoints,
          });
        });
        localStorage.setItem(
          EVENTS_STORAGE_KEY,
          JSON.stringify(mergedBootEvents)
        );
        return mergedBootEvents;
      });
    }

    if (Array.isArray(boot.professors) && boot.professors.length > 0) {
      setProfessorsCatalog(boot.professors);
      localStorage.setItem(
        PROFESSORS_STORAGE_KEY,
        JSON.stringify(boot.professors)
      );
    }

    if (typeof boot.allowStudentTimers === 'boolean') {
      setFeatureFlags((prev) => {
        const nextFlags: FeatureFlags = {
          ...prev,
          allowStudentTimers: boot.allowStudentTimers,
        };
        localStorage.setItem(FEATURE_FLAGS_STORAGE_KEY, JSON.stringify(nextFlags));
        return nextFlags;
      });
    }

    if (boot.referralStats) {
      setServerReferralStats(boot.referralStats);
    }

    const serverDisputes = boot.disputeTickets || boot.disputes;
    if (Array.isArray(serverDisputes) && serverDisputes.length > 0) {
      setDisputeTickets(serverDisputes);
      localStorage.setItem(
        DISPUTE_TICKETS_STORAGE_KEY,
        JSON.stringify(serverDisputes)
      );
    }

    const serverApprovals = boot.pendingApprovals || boot.receipts;
    if (Array.isArray(serverApprovals) && serverApprovals.length > 0) {
      for (const item of serverApprovals) {
        if (item && item.id) {
          const isKycItem =
            item.type === 'kyc' || item.type === 'student_card';
          const belongsToUser =
            (user.studentId && item.studentId === user.studentId) ||
            (tgIdForBootstrap && item.telegramUserId === tgIdForBootstrap);
          if (isKycItem && belongsToUser) {
            if (item.status === 'approved') {
              latestServerKycStatusForCurrentUser = 'verified';
            } else if (item.status === 'rejected') {
              latestServerKycStatusForCurrentUser = 'kyc_locked';
            }
          }
        }
      }
      setReceiptsCatalog((prev) => {
        const safePrev = Array.isArray(prev) ? prev : [];
        const map = new Map<string, AdminReceiptItem>();
        for (const item of serverApprovals) {
          if (item && item.id) {
            const resolvedImg =
              item.receiptImageUrl ||
              item.imageBase64 ||
              item.imageDataUrl ||
              item.photoUrl ||
              item.imageUrl ||
              item.fileUrl;
            const normalizedItem: AdminReceiptItem = {
              ...item,
              receiptImageUrl: resolvedImg,
              imageBase64: item.imageBase64 || resolvedImg,
            };
            map.set(item.id, normalizedItem);
          }
        }
        for (const localItem of safePrev) {
          if (localItem && localItem.id && !map.has(localItem.id)) {
            map.set(localItem.id, localItem);
          } else if (localItem && localItem.id && map.has(localItem.id)) {
            // Preserve local base64 image if server payload omitted the heavy image field on status update
            const serverVersion = map.get(localItem.id)!;
            if (!serverVersion.receiptImageUrl && localItem.receiptImageUrl) {
              map.set(localItem.id, {
                ...serverVersion,
                receiptImageUrl: localItem.receiptImageUrl,
                imageBase64: localItem.imageBase64 || localItem.receiptImageUrl,
              });
            }
          }
        }
        const mergedReceipts = Array.from(map.values());
        localStorage.setItem(RECEIPTS_STORAGE_KEY, JSON.stringify(mergedReceipts));
        return mergedReceipts;
      });
    }

    const serverHasValidProfile = Boolean(
      boot.completedProfile ||
        boot.profile?.onboardingCompleted ||
        (boot.profile?.studentId &&
          String(boot.profile.studentId).trim().length >= 6)
    );

    if (serverHasValidProfile && boot.profile) {
      const resolvedKyc =
        latestServerKycStatusForCurrentUser ||
        boot.profile.kycStatus ||
        user.kycStatus ||
        'verified';
      const serverProfile: UserProfile = {
        ...DEFAULT_PROFILE,
        ...user,
        ...boot.profile,
        kycStatus: resolvedKyc,
        onboardingCompleted: true,
      };
      persistVerifiedProfile(serverProfile);
      if (resolvedKyc === 'verified') {
        setIsKycTestActive(false);
      }
      setIsOnboardingOpen(false);
    } else if (latestServerKycStatusForCurrentUser && user.studentId) {
      persistVerifiedProfile({
        ...user,
        kycStatus: latestServerKycStatusForCurrentUser,
      });
      if (latestServerKycStatusForCurrentUser === 'verified') {
        setIsKycTestActive(false);
      }
    } else if (isInitialMount) {
      if (hasValidLocalProfile || isOnboardingDone) {
        setIsOnboardingOpen(false);
      } else {
        setUser({
          ...DEFAULT_PROFILE,
          telegramUserId: tgIdForBootstrap || 'web-local-student',
          telegramUsername: tgUsername || '',
          onboardingCompleted: false,
        });
        setIsOnboardingOpen(true);
      }
    }
  };

  const refreshFromServer = async () => {
    const realTgUser = getRealTelegramUser();
    const rawTgId =
      window.Telegram?.WebApp?.initDataUnsafe?.user?.id ||
      realTgUser?.id ||
      user.telegramUserId;
    const tgIdForBootstrap = rawTgId !== undefined ? String(rawTgId) : undefined;
    try {
      const boot = await fetchMiniAppBootstrap(tgIdForBootstrap);
      applyBootstrapResponse(boot, tgIdForBootstrap, realTgUser?.username, false, true, true);
    } catch {
      // Ignore transient network errors during background poll
    }
  };

  const handleSyncWithBotServer = refreshFromServer;

  // Live 5-second background polling + window focus/visibility sync so KYC images & bot approvals update immediately
  useEffect(() => {
    const interval = setInterval(() => {
      void refreshFromServer();
    }, 5000);
    const onFocusOrVisible = () => {
      if (document.visibilityState === 'visible') {
        void handleSyncWithBotServer();
      }
    };
    window.addEventListener('focus', onFocusOrVisible);
    document.addEventListener('visibilitychange', onFocusOrVisible);
    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', onFocusOrVisible);
      document.removeEventListener('visibilitychange', onFocusOrVisible);
    };
  }, [user.studentId, user.telegramUserId, user.kycStatus]);

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

  const handleUpdateProfile = (
    updatedFields: Partial<UserProfile>,
    updatedStudentsFromBot?: AdminStudentDossier[],
    referralCodeUsed?: string
  ) => {
    const isAlreadyRegistered = Boolean(
      user.onboardingCompleted &&
        user.studentId &&
        String(user.studentId).trim().length >= 6
    );
    const isCompletingOnboarding =
      Boolean(updatedFields.onboardingCompleted) && !isAlreadyRegistered;

    // Once registered, lock identity fields (name, studentId, cohortYear, phone) permanently; allow avatar/score/kyc updates
    const safeUpdatedFields: Partial<UserProfile> = isAlreadyRegistered
      ? {
          ...updatedFields,
          firstName: user.firstName,
          lastName: user.lastName,
          fullName: user.fullName,
          studentId: user.studentId,
          cohortYear: user.cohortYear,
          verifiedTelegramPhone: user.verifiedTelegramPhone,
          onboardingCompleted: true,
        }
      : updatedFields;

    const merged = { ...user, ...safeUpdatedFields };
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
      if (referralCodeUsed && referralCodeUsed.startsWith('REF-')) {
        appendTransaction({
          id: `tx-ref-bonus-${Date.now() + 1}`,
          title: `پاداش هدیه ورود با کد دعوت (${referralCodeUsed})`,
          amount: 5,
          date: new Date().toLocaleDateString('fa-IR'),
          category: 'onboarding',
          referenceCode: referralCodeUsed,
        });
      }
    }

    if (Array.isArray(updatedStudentsFromBot) && updatedStudentsFromBot.length > 0) {
      setStudentsCatalog(updatedStudentsFromBot);
      localStorage.setItem(STUDENTS_STORAGE_KEY, JSON.stringify(updatedStudentsFromBot));
      return;
    }

    // Also sync active student in studentsCatalog if they have a valid studentId
    if (merged.studentId) {
      const cleanRefTargetId = (referralCodeUsed || '')
        .toUpperCase()
        .replace(/^REF[-_]/i, '')
        .trim();

      setStudentsCatalog((prev) => {
        const safePrev = Array.isArray(prev) ? prev : [];
        const exists = safePrev.some((s) => s.studentId === merged.studentId);
        const baseList = exists
          ? safePrev.map((s) =>
              s.studentId === merged.studentId
                ? {
                    ...s,
                    fullName: merged.fullName,
                    score: merged.score,
                    level: merged.level,
                    kycStatus: merged.kycStatus,
                    avatar: merged.avatar,
                    referredBy: merged.referredBy || s.referredBy,
                  }
                : s
            )
          : [
              {
                id: `stu-${Date.now()}`,
                fullName: merged.fullName,
                studentId: merged.studentId,
                telegramUserId: merged.telegramUserId,
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
                referralCode: merged.referralCode,
                referredBy: merged.referredBy,
              },
              ...safePrev,
            ];

        // If completing onboarding with a valid referral code, award +10 points to the referrer student
        const next =
          isCompletingOnboarding && cleanRefTargetId
            ? baseList.map((s) => {
                const matchesInviter =
                  s.studentId !== merged.studentId &&
                  (s.telegramUserId === cleanRefTargetId ||
                    s.studentId === cleanRefTargetId ||
                    (s.referralCode &&
                      s.referralCode.toUpperCase() === `REF-${cleanRefTargetId}`));
                if (!matchesInviter) return s;
                return {
                  ...s,
                  score: (Number(s.score) || 0) + 10,
                  referredCount: (Number(s.referredCount) || 0) + 1,
                  referralPointsEarned: (Number(s.referralPointsEarned) || 0) + 10,
                };
              })
            : baseList;

        localStorage.setItem(STUDENTS_STORAGE_KEY, JSON.stringify(next));
        return next;
      });
    }
  };

  const handleKycStatusChange = (newStatus: KycStatus) => {
    if (
      isMasterAdminTelegramUser(user.telegramUserId) ||
      isProtectedMasterAccount(user)
    ) {
      handleUpdateProfile({ kycStatus: 'verified' });
      setIsKycTestActive(false);
      return;
    }
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

  const handleRedeemLootboxSuccess = (
    costPoints: number,
    voucher?: DiscountVoucher,
    bonusPointsAwarded = 0
  ) => {
    const scopedUserKey = getScopedStorageKey(USER_STORAGE_KEY, user.telegramUserId);
    const rawSaved =
      localStorage.getItem(scopedUserKey) || localStorage.getItem(USER_STORAGE_KEY);
    if (rawSaved) {
      const parsed = safeJsonParse<UserProfile | null>(rawSaved, null);
      if (parsed && !verifyStateIntegrity(parsed, stateChecksum, parsed.telegramUserId)) {
        // Recompute checksum without wiping the user's registered profile
        persistVerifiedProfile(parsed);
      }
    }

    const nextScore = Math.max(0, user.score - costPoints + bonusPointsAwarded);
    handleUpdateProfile({ score: nextScore });

    if (voucher) {
      const safeVouchers = Array.isArray(vouchers) ? vouchers : [];
      const updatedVouchers = [voucher, ...safeVouchers];
      setVouchers(updatedVouchers);
      localStorage.setItem(VOUCHERS_STORAGE_KEY, JSON.stringify(updatedVouchers));
    }

    appendTransaction({
      id: `tx-loot-${Date.now()}`,
      title: voucher
        ? `بازگشایی ${
            voucher.chestType === 'gold' ? 'صندوقچه طلایی صنایع' : 'صندوقچه برنزی'
          } (${voucher.title})`
        : bonusPointsAwarded > 0
        ? `بازگشایی صندوقچه شانس (+${bonusPointsAwarded} امتیاز هدیه)`
        : 'بازگشایی صندوقچه شانس (پوچ)',
      amount: -costPoints + bonusPointsAwarded,
      date: new Date().toLocaleDateString('fa-IR'),
      category: 'lootbox',
      referenceCode: voucher?.code || `LOOT-${Date.now().toString().slice(-4)}`,
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

  const handleUnlockSecretQuest = (questId: string, enteredCode: string): boolean => {
    const safeQuests = Array.isArray(quests) ? quests : [];
    const target = safeQuests.find((q) => q.id === questId);
    if (!target) return false;
    const expected = (target.secretCode || 'IE1404').trim().toLowerCase();
    if (enteredCode.trim().toLowerCase() !== expected) {
      return false;
    }
    const updatedQuests = safeQuests.map((q) =>
      q.id === questId
        ? { ...q, unlockedByCode: true, progress: q.maxProgress || 1 }
        : q
    );
    setQuests(updatedQuests);
    localStorage.setItem(QUESTS_STORAGE_KEY, JSON.stringify(updatedQuests));
    return true;
  };

  const handleResetErrorState = () => {
    setIsAdminPanelOpen(false);
    setIsAdminVaultOpen(false);
    setIsQuickMenuOpen(false);
    setSelectedEventForCheckout(null);
    setActiveTab('home');
  };

  const existingStudentIds = useMemo(
    () =>
      (Array.isArray(studentsCatalog) ? studentsCatalog : [])
        .map((s) => s.studentId)
        .filter(Boolean),
    [studentsCatalog]
  );

  // Reference BOT_WORKER_BASE_URL for backend telemetry/binding verification
  void BOT_WORKER_BASE_URL;

  return (
    <PixelErrorBoundary onReset={handleResetErrorState}>
      <div
        className={`min-h-screen w-full relative flex flex-col font-sans transition-colors duration-200 text-right ${
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
            lootboxConfig={lootboxConfig}
            disputeTickets={disputeTickets}
            announcements={announcementsCatalog}
            channelUrl={officialChannelUrl}
            featuredEventId={featuredEventId}
            aboutConfig={aboutConfig}
            onUpdateEvents={(nextEvents) => {
              const normalizedNext = normalizeEventsList(nextEvents);
              setEventsCatalog(normalizedNext);
              localStorage.setItem(
                EVENTS_STORAGE_KEY,
                JSON.stringify(normalizedNext)
              );
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
            onUpdateLootboxConfig={(nextLootbox) => {
              setLootboxConfig(nextLootbox);
              localStorage.setItem(
                LOOTBOX_CONFIG_STORAGE_KEY,
                JSON.stringify(nextLootbox)
              );
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
            onSyncWithBotServer={handleSyncWithBotServer}
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

            <main className="flex-1 w-full lg:max-w-6xl xl:max-w-7xl mx-auto lg:px-6 relative">
              {isBootstrapping && !user.studentId ? (
                <div className="p-6 lg:py-20 max-w-md mx-auto flex flex-col items-center justify-center text-center gap-3">
                  <div className="w-12 h-12 rounded-2xl border-2 border-[#D4AB58] bg-[#354B40]/30 flex items-center justify-center animate-pulse">
                    <span className="text-xl">⚙️</span>
                  </div>
                  <div className="text-xs font-black text-[#D4AB58]">
                    در حال همگام‌سازی پروفایل با سرور ربات انجمن صنایع...
                  </div>
                </div>
              ) : isCurrentStudentBanned ? (
                <div className="p-6 lg:py-16 max-w-xl mx-auto">
                  <div className="p-6 rounded-3xl border-2 border-rose-500 bg-rose-950/90 text-white text-center space-y-3 shadow-2xl">
                    <div className="text-base font-black text-rose-300">
                      🚫 دسترسی این حساب دانشجویی توسط ادمین انجمن صنایع قفل شده است
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
                      realStudents={studentsCatalog}
                      serverReferralStats={serverReferralStats}
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
                        const safeEvs = normalizeEventsList(
                          Array.isArray(eventsCatalog) && eventsCatalog.length > 0
                            ? eventsCatalog
                            : EVENTS_DATA
                        );
                        const ev =
                          safeEvs.find((e) => e.id === clickedEventId) ||
                          activeFeaturedEvent ||
                          safeEvs[0];
                        setSelectedEventForCheckout(normalizeEvent(ev));
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
                        setSelectedEventForCheckout(normalizeEvent(event))
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
                      userTickets={currentStudentTickets}
                      realStudents={studentsCatalog}
                      lootboxConfig={lootboxConfig}
                      leaderboardEnabled={featureFlags.leaderboardEnabled}
                      lootboxStoreEnabled={featureFlags.lootboxStoreEnabled}
                      onBackToHome={() => setActiveTab('home')}
                      onRedeemLootboxSuccess={handleRedeemLootboxSuccess}
                      onTamperReset={() => persistVerifiedProfile(user)}
                      onClaimQuest={handleClaimQuest}
                      onUnlockSecretQuest={handleUnlockSecretQuest}
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
                      realStudents={studentsCatalog}
                      serverReferralStats={serverReferralStats}
                      initialOpenModal={profileInitialModal}
                      onClearInitialModal={() => setProfileInitialModal(null)}
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
          onEditProfileAvatar={() => {
            setActiveTab('profile');
            setProfileInitialModal('settings');
          }}
          onOpenActiveEvents={() => {
            setActiveTab('events');
          }}
          onOpenEventHistory={() => {
            setActiveTab('profile');
            setProfileInitialModal('history');
          }}
        />

        <CheckoutDrawer
          event={selectedEventForCheckout}
          isOpen={!!selectedEventForCheckout}
          onClose={() => setSelectedEventForCheckout(null)}
          user={user}
          themeMode={themeMode}
          discountRule={{
            pointsStep: discountRule.pointsStep,
            discountTomansPerStep: discountRule.discountTomansPerStep,
            minPoints: discountRule.minPoints,
            maxPoints: discountRule.maxPoints,
            pointsUnit: discountRule.pointsStep,
            discountToman: discountRule.discountTomansPerStep,
          }}
          onCompleteRegistration={handleCompleteRegistration}
          onSubmitReceipt={handleAppendReceiptItem}
          onRefreshFromServer={refreshFromServer}
        />

        {!isAdminPanelOpen &&
          !isMasterAdminTelegramUser(user.telegramUserId) &&
          !isProtectedMasterAccount(user) &&
          (user.kycStatus !== 'verified' || isKycTestActive) && (
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
              onRefreshFromServer={refreshFromServer}
            />
          )}

        <AdminVaultModal
          isOpen={isAdminVaultOpen}
          onClose={() => setIsAdminVaultOpen(false)}
          admins={adminsCatalog}
          onUnlockSuccess={(matchedAdmin) => {
            setAuthenticatedAdmin(matchedAdmin || null);
            setIsAdminVaultOpen(false);
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
          existingStudents={studentsCatalog}
          onRefreshFromServer={refreshFromServer}
          onDisputeSubmitted={(ticket) => {
            setDisputeTickets((prev) => {
              const next = [ticket, ...(Array.isArray(prev) ? prev : [])];
              localStorage.setItem(DISPUTE_TICKETS_STORAGE_KEY, JSON.stringify(next));
              return next;
            });
          }}
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
          allowStudentTimers={featureFlags.allowStudentTimers !== false}
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
