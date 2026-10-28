export type ThemeMode = 'night' | 'day';

export type TabType = 'home' | 'achievements' | 'events' | 'profile';

export type KycStatus = 'verified' | 'required' | 'kyc_locked' | 'pending_review';

export interface UserProfile {
  id: string;
  firstName: string;
  lastName: string;
  fullName: string;
  studentId: string;
  cohortYear: string;
  avatar: string; // e.g. '01_avatar_boy.png' or '02_avatar_girl.png'
  score: number;
  level: number;
  rankTitle: string;
  verifiedTelegramPhone: string;
  kycStatus: KycStatus;
  badges?: string[];
  telegramUserId?: string;
  telegramUsername?: string;
  onboardingCompleted?: boolean;
  referralCode?: string;
  referredBy?: string;
  referredCount?: number;
  referralPointsEarned?: number;
}

export interface Professor {
  id: string;
  name: string;
  title: string;
  avatar: string;
  office: string;
  officeHours: string;
  isCurrentlyInOffice: boolean;
  email: string;
  courses: {
    name: string;
    dayAndTime: string;
    room: string;
  }[];
}

export interface ChannelAnnouncement {
  id: string;
  title: string;
  snippet: string;
  content: string;
  timestamp: string;
  tag: string;
  author: string;
  views: number;
  hasAttachment?: boolean;
  postId?: string;
  postUrl?: string;
  channelHandle?: string;
  isPinned?: boolean;
}

export interface ReminderItem {
  id: string;
  title: string;
  date: string;
  time: string;
  repeat: 'once' | 'daily' | 'weekly';
  enabled: boolean;
  isSystem?: boolean;
  category: 'self' | 'ta' | 'workshop' | 'custom';
}

export interface SupportTicketMessage {
  id: string;
  sender: 'user' | 'support';
  senderName: string;
  text: string;
  time: string;
}

export interface SupportTicket {
  id: string;
  title: string;
  category: 'council' | 'tech' | 'educational';
  status: 'open' | 'answered' | 'closed';
  updatedAt: string;
  messages: SupportTicketMessage[];
}

export interface CertificateInfo {
  certificateId: string;
  studentName: string;
  courseTitle: string;
  instructor: string;
  issueDate: string;
  grade: string;
  isValid: boolean;
  hours: number;
  signatureHash?: string;
}

export type EventCategory = 'all' | 'workshop' | 'visit' | 'seminar';

export type EventSortOption = 'newest' | 'points' | 'capacity';

export interface EventItem {
  id: string;
  title: string;
  category: 'workshop' | 'visit' | 'seminar';
  categoryLabel: string;
  date: string;
  time: string;
  location: string;
  capacityRemaining: number;
  capacityTotal: number;
  remainingCapacity?: number;
  totalCapacity?: number;
  capacity?: number;
  rating: number;
  ratingCount: number;
  imageFilename: string;
  image?: string;
  basePrice: number; // In Tomans (0 for free)
  price?: number;
  rewardPoints: number;
  points?: number;
  instructor: string;
  description?: string;
  syllabus: string[];
  tags?: string[];
  prerequisites?: string[];
  allowPointsDiscount?: boolean;
  discountPointsStep?: number;
  discountTomansPerStep?: number;
  discountMinPoints?: number;
  discountMaxPoints?: number;
}

export interface TicketRecord {
  id: string;
  eventId: string;
  eventTitle: string;
  eventDate: string;
  eventTime: string;
  location: string;
  studentId: string;
  studentName: string;
  trackingCode: string;
  qrPayload: string;
  paidAmount: number;
  discountPointsUsed: number;
  issuedAt: string;
  sentToTelegram: boolean;
  voucherCodeUsed?: string;
  checkedIn?: boolean;
  checkedInAt?: string;
}

export interface BadgeItem {
  id: string;
  title: string;
  subtitle: string;
  filename: string;
  earnedDate: string;
  tier: 'gold' | 'emerald' | 'cyan' | 'royal';
  isUnlocked: boolean;
  verificationHash: string;
  description: string;
  nextTierRequirement: string;
}

export interface PointTransaction {
  id: string;
  title: string;
  amount: number; // positive for earned, negative for spent
  date: string;
  category: 'event' | 'discount' | 'lootbox' | 'quest' | 'onboarding';
  referenceCode: string;
}

export interface DiscountVoucher {
  id: string;
  code: string; // e.g., OFF-IE402-8492
  title: string;
  discountPercent: number; // 25 to 100
  maxDiscountTomans: number;
  chestType: string;
  issuedAt: string;
  isUsed: boolean;
  signatureHash: string;
}

export interface LootboxPrizeItem {
  id: string;
  title: string;
  type?: 'voucher' | 'discount' | 'points' | 'empty';
  rewardType?: 'discount' | 'voucher' | 'points' | 'empty';
  discountPercent?: number;
  maxDiscountTomans?: number;
  bonusPoints?: number;
  chancePercent: number; // 0 to 100
}

export interface LootboxChestConfig {
  id: string;
  title: string;
  subtitle?: string;
  cost: number;
  themeColor?: 'bronze' | 'gold' | 'emerald' | 'royal' | 'crimson' | 'purple';
  iconFilename?: string;
  prizes: LootboxPrizeItem[];
}

export interface LootboxConfig {
  bronzeCost: number;
  goldCost: number;
  bronzePrizes: LootboxPrizeItem[];
  goldPrizes: LootboxPrizeItem[];
  chests?: LootboxChestConfig[];
  updatedAt?: string;
}

export interface StudentIdDisputeTicket {
  id: string;
  studentId: string;
  fullName: string;
  reporterName?: string;
  phone: string;
  phoneNumber?: string;
  explanation: string;
  telegramUserId?: string;
  submittedAt: string;
  status: 'open' | 'resolved';
}

export interface BootstrapResponse {
  ok: boolean;
  completedProfile?: boolean;
  profile?: UserProfile;
  students?: AdminStudentDossier[];
  events?: EventItem[];
  professors?: Professor[];
  lootboxConfig?: LootboxConfig;
  announcements?: ChannelAnnouncement[];
  disputes?: StudentIdDisputeTicket[];
  disputeTickets?: StudentIdDisputeTicket[];
  pendingApprovals?: AdminReceiptItem[];
  receipts?: AdminReceiptItem[];
  allowStudentTimers?: boolean;
  referralStats?: {
    referredCount: number;
    pointsEarned: number;
  };
}

export interface LeaderboardStudent {
  id: string;
  rank: number;
  fullName: string;
  studentId: string;
  cohortYear: string;
  avatar: string;
  score: number;
  level: number;
  badgesCount: number;
  isCurrentUser?: boolean;
}

export interface CohortBattleStat {
  cohortYear: string;
  label: string;
  totalPoints: number;
  studentsCount: number;
  colorClass: string;
}

export type QuestConditionType =
  | 'complete_profile'
  | 'register_events'
  | 'checkin_events'
  | 'reach_score'
  | 'secret_code';

export interface WeeklyQuest {
  id: string;
  title: string;
  description: string;
  rewardPoints: number;
  progress: number;
  maxProgress: number;
  isClaimed: boolean;
  conditionType?: QuestConditionType;
  secretCode?: string;
  unlockedByCode?: boolean;
}

export type LootiModelId = 'gemini-3.8-flash' | 'gemini-3.6-flash' | 'gemini-3.5-flash-lite';

export interface LootiChatMessage {
  id: string;
  sender: 'user' | 'looti';
  text: string;
  timestamp: string;
  modelUsed?: LootiModelId;
}

export type AdminPermissionKey =
  | 'ai'
  | 'tickets'
  | 'users'
  | 'events'
  | 'professors'
  | 'finance'
  | 'broadcast';

export interface AdminUser {
  id: string;
  fullName: string;
  telegramId: string;
  roleLevel: 1 | 2 | 3 | 4 | 5 | 6;
  roleLabel: string;
  personalPassword: string;
  permissions: Record<AdminPermissionKey, boolean>;
  isFrozen: boolean;
  lastActive: string;
}

export interface AdminReceiptItem {
  id: string;
  type: 'receipt' | 'kyc' | 'payment_receipt' | 'student_card';
  studentName: string;
  studentId: string;
  telegramUserId?: string;
  cohortYear: string;
  title?: string;
  eventId?: string;
  eventTitle?: string;
  amount?: number;
  amountTomans?: number;
  submittedAt: string;
  decidedAt?: string;
  aiConfidenceText?: string;
  status: 'pending' | 'approved' | 'rejected';
  trackingCode: string;
  receiptImageUrl?: string;
  imageBase64?: string;
  imageDataUrl?: string;
  photoUrl?: string;
  imageUrl?: string;
  fileUrl?: string;
}

export interface AdminStudentDossier {
  id: string;
  fullName: string;
  studentId: string;
  telegramUserId?: string;
  telegramId?: string;
  cohortYear: '1400' | '1401' | '1402' | '1403' | '1404' | '1405' | 'سایر';
  phone: string;
  avatar?: string;
  score: number;
  level: number;
  kycStatus: KycStatus;
  isBanned: boolean;
  attendedEvents: string[];
  badges: string[];
  payments: { title: string; amount: number; date: string; status: string }[];
  chatLogs: { sender: string; text: string; time: string }[];
  referralCode?: string;
  referredBy?: string;
  referredCount?: number;
  referralPointsEarned?: number;
}

export interface ScheduledTimer {
  id: string;
  title: string;
  rawSentence: string;
  frequency: 'یکبار' | 'روزانه' | 'هفتگی' | 'ماهانه';
  startDate?: string; // Exact start date or one-time execution date (e.g. ۱۴۰۴/۰۸/۲۸)
  dayOfWeek?: string;
  time: string;
  targetAudience: string;
  messageText?: string;
  enabled: boolean;
  lastTriggeredAt?: string;
}

export interface AvatarCatalogItem {
  id: string;
  title: string;
  category?: 'student' | 'professor' | 'badge' | 'all';
  targetRole?: 'student' | 'professor' | 'all';
  imageUrl: string; // Pixel asset filename OR uploaded data:image/... URL OR https:// URL
  addedBy?: string;
  createdAt?: string;
}

export interface AdminAuditLogItem {
  id: string;
  actor: string;
  action: string;
  target: string;
  timestamp: string;
  severity: 'info' | 'success' | 'warning' | 'danger';
}

export interface DiscountRuleConfig {
  pointsStep: number;
  discountTomansPerStep: number;
  minPoints?: number;
  maxPoints?: number;
}

export interface FeatureFlags {
  eventsRegistrationEnabled: boolean;
  lootboxStoreEnabled: boolean;
  leaderboardEnabled: boolean;
  supportTicketsEnabled: boolean;
  professorsDirectoryEnabled: boolean;
  globalMaintenanceMode: boolean;
  allowStudentTimers?: boolean;
}

export interface OnlineSessionUser {
  id: string;
  studentId: string;
  fullName: string;
  cohortYear: string;
  device: 'Telegram Mobile' | 'Desktop Web';
  activePage: string;
  lastHeartbeat: string;
  isLocked: boolean;
}

// ============================================================================
// FUM INDUSTRIAL ENGINEERING 142-UNIT CURRICULUM & PREREQUISITE FLOWCHART
// ============================================================================

export type CourseCategory =
  | 'general'
  | 'basic'
  | 'specialized'
  | 'elective'
  | 'internship';

export type CourseStatus = 'passed' | 'current' | 'unlocked' | 'locked';

export interface CurriculumCourse {
  id: string;
  title: string;
  units: number;
  term: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;
  category: CourseCategory;
  prereqs: string[]; // Solid arrow dependencies (پیشنیاز)
  coreqs: string[]; // Dashed arrow dependencies (همنیاز)
  isKeyHub?: boolean; // Special circular hub nodes (تحقیق در عملیات ۱ & نظریه احتمال و کاربردها)
  isElectiveSlot?: boolean; // Slots elec_slot1..elec_slot6 in Terms 7 & 8
  slotIndex?: number;
  minPassedUnits?: number; // e.g., پروژه کارشناسی requires >= 100 units
  yearCondition?: string; // e.g., کارآموزی: از تابستان سال سوم به بعد
  note?: string;
}

export interface ElectiveCourseOption {
  id: string;
  title: string;
  units: number;
  prereqs: string[];
  coreqs: string[];
  track: string;
}

export interface StudentCurriculumState {
  passedCourseIds: string[];
  currentTermCourseIds: string[];
  courseGrades: Record<string, number>;
  assignedElectives: Record<string, string>; // slotId (elec_slot1..6) -> electiveCourseId
}

export interface AboutStatBox {
  value: string;
  label: string;
}

export interface AboutAssociationConfig {
  title: string;
  subtitle: string;
  description: string;
  stats: [AboutStatBox, AboutStatBox, AboutStatBox];
  committeesTitle: string;
  committees: string[];
}

export const DEFAULT_ABOUT_CONFIG: AboutAssociationConfig = {
  title: 'انجمن علمی دانشجویی مهندسی صنایع',
  subtitle: 'دانشگاه فردوسی مشهد (I.E.C.F)',
  description:
    'انجمن علمی مهندسی صنایع دانشگاه فردوسی مشهد با هدف ارتقای مهارت‌های تحلیلی، نرم‌افزاری و مدیریتی دانشجویان، پل ارتباطی میان فضای آکادمیک و صنایع پیشرو کشور است. تمامی کارگاه‌ها، نشریات، چارت‌های درسی و بازدیدهای صنعتی از طریق همین مینی‌اپ و کانال رسمی تلگرام اطلاع‌رسانی می‌شوند.',
  stats: [
    { value: '+۱۱۰ رویداد', label: 'رویداد برگزار شده' },
    { value: '+۸۵۰ نفر', label: 'اعضای فعال' },
    { value: '+۴۵ کارگاه', label: 'کارگاه تخصصی صنعتی' },
  ],
  committeesTitle: 'کمیته‌های تخصصی انجمن:',
  committees: [
    'کمیته آموزش و کارگاه‌های نرم‌افزاری (Python, Arena, PowerBI)',
    'کمیته ارتباط با صنعت و بازدیدهای علمی',
    'هیئت تحریریه نشریه تخصصی مهندسی صنایع فردوسی',
    'کمیته مسابقات، هکاتون بهینه‌سازی و رویدادهای نوآورانه',
  ],
};

declare global {
  interface Window {
    Telegram?: {
      WebApp?: {
        ready?: () => void;
        expand?: () => void;
        openTelegramLink?: (url: string) => void;
        initData?: string;
        initDataUnsafe?: {
          start_param?: string;
          user?: {
            id?: number | string;
            first_name?: string;
            last_name?: string;
            username?: string;
          };
        };
        HapticFeedback?: {
          impactOccurred: (style: 'light' | 'medium' | 'heavy' | 'rigid' | 'soft') => void;
          notificationOccurred: (type: 'error' | 'success' | 'warning') => void;
          selectionChanged: () => void;
        };
      };
    };
  }
}


