import React, { createContext, useContext, useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { 
  User, 
  UserRole,
  RepairOrder, 
  ROStatus, 
  PartStatus, 
  PartItem, 
  UrgentNotification,
  CustomerContactRecord,
  CustomerContactType,
  CustomerContactOutcome,
  StatusHistory,
  RecommendedService,
  ShopChatMessage,
  RepairQuote,
  QuoteStatus,
  LaborLineItem,
  WarrantyLaborTimePunch,
  WarrantyOperationType,
  ConcernPayType,
  Customer,
  VehiclePhoto,
  LinePhoto,
  InspectionChecklistItem,
  InspectionResultItem,
  InspectionSheet,
  StaffLeaveEntry,
  StaffLeaveType,
  LineApprovalStatus,
  ServiceAppointment,
  AppointmentStatus,
  TransportationType
} from '../types';
import { DEFAULT_INSPECTION_CHECKLIST } from '../data/defaultInspectionChecklist';
import { getInitialStaffLeaveEntries } from '../data/defaultStaffLeave';
import { getInitialServiceAppointments } from '../data/defaultAppointments';
import { calculateNextContactDate, formatContactType } from '../utils/cadenceUtils';
import { cleanRO3700, PAY_TYPE_RATES } from '../utils/formatters';
import { INITIAL_USERS, INITIAL_REPAIR_ORDERS } from '../data/mockData';
import { playNotificationChime, requestBrowserNotification } from '../utils/audio';
import {
  subscribeToRepairOrders,
  subscribeToUsers,
  subscribeToNotifications,
  subscribeToShopSettings,
  subscribeToShopMessages,
  subscribeToCustomers,
  saveShopMessage,
  syncRepairOrder,
  deleteRepairOrderDoc,
  syncUser,
  deleteUserDoc,
  syncNotification,
  syncCustomer,
  deleteCustomerDoc,
  markNotificationReadDoc,
  markAllNotificationsReadDocs,
  syncShopSettings,
  clearAllROsFromFirestore,
  resetAllDataToCleanSlate,
  seedInitialDataIfEmpty,
} from '../lib/firestoreSync';

interface AppContextType {
  shopName: string;
  setShopName: (name: string) => void;
  isInitialSetupCompleted: boolean;
  setIsInitialSetupCompleted: (completed: boolean) => void;
  isSetupWizardOpen: boolean;
  setIsSetupWizardOpen: (isOpen: boolean) => void;
  isCloudSynced: boolean;

  currentUser: User;
  users: User[];
  repairOrders: RepairOrder[];
  customers: Customer[];
  notifications: UrgentNotification[];
  selectedRO: RepairOrder | null;
  isNewROModalOpen: boolean;
  isLoginModalOpen: boolean;
  isStaffManagementOpen: boolean;
  isTimeCardCalculatorOpen: boolean;
  isCustomerDirectoryOpen: boolean;
  managerViewSection: 'FLOOR' | 'CALL_SHEET';
  setManagerViewSection: (section: 'FLOOR' | 'CALL_SHEET') => void;
  prefilledCustomerForNewRO: Customer | null;
  isSoundEnabled: boolean;
  pushPermission: NotificationPermission | 'default';
  isAuthenticated: boolean;
  setIsAuthenticated: (auth: boolean) => void;
  
  // Actions
  setCurrentUser: (user: User) => void;
  setSelectedRO: (ro: RepairOrder | null, tab?: 'DETAILS' | 'CHAT' | 'WARRANTY' | 'PARTS') => void;
  openROWithTab: (ro: RepairOrder, tab?: 'DETAILS' | 'CHAT' | 'WARRANTY' | 'PARTS') => void;
  selectedROModalTab: 'DETAILS' | 'CHAT' | 'WARRANTY' | 'PARTS' | null;
  setSelectedROModalTab: (tab: 'DETAILS' | 'CHAT' | 'WARRANTY' | 'PARTS' | null) => void;
  setIsNewROModalOpen: (isOpen: boolean) => void;
  setIsLoginModalOpen: (isOpen: boolean) => void;
  setIsStaffManagementOpen: (isOpen: boolean) => void;
  setIsTimeCardCalculatorOpen: (isOpen: boolean) => void;
  setIsCustomerDirectoryOpen: (isOpen: boolean) => void;
  setPrefilledCustomerForNewRO: (cust: Customer | null) => void;
  saveCustomer: (customer: Customer) => Promise<boolean>;
  deleteCustomer: (customerId: string) => Promise<void>;
  toggleSound: () => void;
  requestPushPermission: () => Promise<void>;
  
  // User Management
  addUser: (userData: Omit<User, 'id'>) => User;
  updateUser: (userId: string, updates: Partial<User>) => void;
  removeUser: (userId: string) => { success: boolean; message?: string };
  loginWithCredentials: (emailOrId: string, passwordOrPin: string) => { success: boolean; user?: User; message?: string };
  loginUser: (user: User, passwordOrPin: string) => { success: boolean; message?: string };
  logout: () => void;
  lockWorkstation: () => void;
  completeInitialSetup: (config: {
    shopName: string;
    manager: {
      name: string;
      email: string;
      employeeNumber?: string;
      password?: string;
      pin?: string;
      title?: string;
      phone?: string;
    };
    initialUsers: User[];
    startWithEmptyROs: boolean;
  }) => void;

  // RO & Shop Operations
  updateROStatus: (roId: string, newStatus: ROStatus, notes?: string, makeUrgent?: boolean) => void;
  startDiagnosis: (roId: string, notes?: string) => void;
  dispatchRO: (roId: string, techId: string, bay?: string) => void;
  reassignServiceWriter: (roId: string, newAdvisorId: string, notes?: string) => boolean;
  sendMessage: (roId: string, content: string, isUrgent?: boolean) => void;
  addPartOrder: (roId: string, part: Omit<PartItem, 'id' | 'roId'>) => void;
  addMultiplePartOrders: (roId: string, parts: Array<Omit<PartItem, 'id' | 'roId'>>) => void;
  updatePartStatus: (roId: string, partId: string, status: PartStatus, eta?: string, notes?: string) => void;
  updatePartItem: (roId: string, partId: string, updates: Partial<PartItem>) => void;
  deletePartItem: (roId: string, partId: string) => void;
  createRepairOrder: (data: {
    roNumber?: string;
    customerName: string;
    customerPhone: string;
    vehicle: RepairOrder['vehicle'];
    advisorId?: string;
    advisorName?: string;
    primaryConcern?: string;
    concerns?: string[];
    concernPayTypes?: ConcernPayType[];
    concernTechIds?: (string | undefined)[];
    concernTechNames?: (string | undefined)[];
    promisedTime?: string;
    techId?: string;
    bay?: string;
    isUrgent?: boolean;
    isWaiter?: boolean;
    isTaxExempt?: boolean;
    taxExemptNumber?: string;
  }) => string;
  
  toggleCustomerTaxExempt: (roId: string, taxExemptNumber?: string) => boolean;
  addVehiclePhoto: (roId: string, photo: VehiclePhoto) => boolean;
  deleteVehiclePhoto: (roId: string, photoId: string) => boolean;
  addLinePhoto: (roId: string, photo: LinePhoto) => boolean;
  deleteLinePhoto: (roId: string, photoId: string) => boolean;
  updateLinePhotoCaption: (roId: string, photoId: string, caption: string) => boolean;
  markNotificationRead: (notifId: string) => void;
  markAllNotificationsRead: () => void;
  triggerNotification: (
    ro: RepairOrder,
    title: string,
    message: string,
    isUrgent: boolean,
    type: UrgentNotification['type'],
    targetRole?: UserRole,
    targetUserId?: string
  ) => void;
  deleteRepairOrder: (roId: string) => boolean;
  updateRepairOrderDetails: (roId: string, updates: Partial<RepairOrder>, options?: { isAutoSave?: boolean }) => boolean;
  addRepairOrderConcern: (roId: string, concernText: string, payType?: ConcernPayType, techId?: string, techName?: string, initialLaborHours?: number | string) => boolean;
  updateTechCauseAndCorrection: (roId: string, cause: string, correction: string, options?: { isAutoSave?: boolean; notify?: boolean; concernCauses?: string[]; concernCorrections?: string[] }) => boolean;
  updateConcernPayType: (roId: string, concernIndex: number, payType: ConcernPayType) => boolean;
  updateConcernTech: (roId: string, concernIndex: number, techId: string, techName?: string) => boolean;
  updateConcernStatus: (roId: string, concernIndex: number, status: LineApprovalStatus) => boolean;
  logCustomerContact: (
    roId: string, 
    contactData: {
      type: CustomerContactType;
      outcome: CustomerContactOutcome;
      summary: string;
      notes?: string;
      partsEtaDiscussed?: string;
      promisedDateDiscussed?: string;
      nextScheduledContactDate?: string;
      isPostRepairFollowUp?: boolean;
      postRepairOutcome?: 'SATISFIED_NO_CONCERNS' | 'HAS_NEW_CONCERNS' | 'LEFT_VOICEMAIL' | 'NO_ANSWER' | 'CUSTOMER_CALLBACK_REQUESTED';
    }
  ) => boolean;
  clearAllRepairOrders: () => void;
  resetAllDataToCleanSlateHandler: () => void;
  resetToDemoData: () => void;
  
  // Filter helper
  getFilteredROs: () => RepairOrder[];

  // Shop Team Chat & Person-to-Person Direct Messaging
  shopMessages: ShopChatMessage[];
  isChatBoxOpen: boolean;
  setIsChatBoxOpen: (open: boolean) => void;
  selectedChatRecipientId: string; // 'ALL' or user.id
  setSelectedChatRecipientId: (recipientId: string) => void;
  openDirectChat: (recipientUserId: string | 'ALL') => void;
  openShopChat: (targetRecipientId?: string) => void;
  sendShopChatMessage: (
    content: string, 
    recipientId?: string, 
    roId?: string, 
    isUrgent?: boolean
  ) => void;
  unreadShopMessages: ShopChatMessage[];
  unreadShopCount: number;
  latestUnreadShopMessage: ShopChatMessage | null;
  unreadCountBySender: Record<string, number>;
  markShopMessagesAsRead: (messageIds: string[]) => void;

  // Tech Additional Recommendations & MPI Findings
  addRecommendedService: (roId: string, item: {
    serviceName: string;
    category?: RecommendedService['category'];
    urgency: 'SAFETY' | 'RECOMMENDED';
    notes?: string;
    cause?: string;
    correction?: string;
    laborHours?: number;
    payType?: ConcernPayType;
    inspectionItemId?: string;
  }) => boolean;
  updateRecommendedService: (
    roId: string,
    recId: string,
    updates: Partial<RecommendedService>
  ) => boolean;
  deleteRecommendedService: (roId: string, recId: string) => boolean;
  updateRecommendedServiceStatus: (
    roId: string, 
    recId: string, 
    status: 'APPROVED' | 'DECLINED', 
    declinedReason?: string
  ) => boolean;

  // 21-Point Multi-Point Inspection (MPI) System & Manager Customization
  inspectionChecklist: InspectionChecklistItem[];
  updateInspectionChecklist: (items: InspectionChecklistItem[]) => void;
  resetInspectionChecklistToDefaults: () => void;
  setInspectionItemResult: (
    roId: string, 
    itemId: string, 
    itemResult: Partial<InspectionResultItem>
  ) => void;
  passAllInspectionItems: (roId: string) => void;
  resetROInspection: (roId: string) => void;

  // Repair Quote Workflow (Initiated by Technician)
  activeQuoteRO: RepairOrder | null;
  openQuoteModal: (roId: string) => void;
  closeQuoteModal: () => void;
  saveRepairQuote: (roId: string, quote: RepairQuote, submitToAdvisor?: boolean, options?: { isAutoSave?: boolean; notify?: boolean }) => boolean;
  updateLineLaborHours: (roId: string, lineIndex: number, hoursVal: number | string) => boolean;
  updateQuoteStatus: (roId: string, status: 'APPROVED' | 'DECLINED', reason?: string) => boolean;

  // Warranty Labor Time Clock & Multi-Punch Tracking
  clockInToRO: (
    roId: string, 
    notes?: string, 
    operationType?: WarrantyOperationType
  ) => { success: boolean; message: string; punch?: WarrantyLaborTimePunch };
  clockOutOfRO: (
    roId: string, 
    punchId?: string, 
    notes?: string
  ) => { success: boolean; message: string; durationMinutes?: number };
  addManualTimePunch: (roId: string, punch: Omit<WarrantyLaborTimePunch, 'id'>) => boolean;
  updateTimePunch: (roId: string, punchId: string, updates: Partial<WarrantyLaborTimePunch>) => boolean;
  deleteTimePunch: (roId: string, punchId: string) => boolean;

  // Active Workstation / Role View
  activeRoleView: UserRole;
  setActiveRoleView: (role: UserRole | null) => void;

  // Warranty Documentation & Print Feature
  activeWarrantyPrintRO: RepairOrder | null;
  openWarrantyPrintModal: (roId: string) => void;
  closeWarrantyPrintModal: () => void;

  // Service Manager Staff Attendance & Calendar (Service Manager Only)
  staffLeaveEntries: StaffLeaveEntry[];
  addStaffLeaveEntry: (entry: Omit<StaffLeaveEntry, 'id' | 'createdAt' | 'createdByManagerId' | 'createdByManagerName'>) => boolean;
  updateStaffLeaveEntry: (id: string, updates: Partial<StaffLeaveEntry>) => boolean;
  deleteStaffLeaveEntry: (id: string) => boolean;
  isStaffCalendarOpen: boolean;
  setIsStaffCalendarOpen: (open: boolean) => void;

  // Service Appointment Calendar (Service Advisors & Service Manager)
  appointments: ServiceAppointment[];
  addAppointment: (data: Omit<ServiceAppointment, 'id' | 'createdAt' | 'updatedAt'>) => ServiceAppointment;
  updateAppointment: (id: string, updates: Partial<ServiceAppointment>) => boolean;
  deleteAppointment: (id: string) => boolean;
  clearAllAppointments: () => void;
  checkInAppointment: (id: string) => boolean;
  convertAppointmentToRO: (id: string) => string | null;
  isAppointmentCalendarOpen: boolean;
  setIsAppointmentCalendarOpen: (open: boolean) => void;
}

const STORAGE_KEY_ROS = 'precision_auto_service_ros_v6_clean';
const STORAGE_KEY_USER = 'precision_auto_active_user_v6_clean';
const STORAGE_KEY_USERS = 'precision_auto_users_v6_clean';
const STORAGE_KEY_NOTIFS = 'precision_auto_notifs_v6_clean';
const STORAGE_KEY_SHOP_NAME = 'precision_auto_shop_name_v6_clean';
const STORAGE_KEY_SETUP_DONE = 'precision_auto_setup_completed_v6_clean';
const STORAGE_KEY_WIPE_PERFORMED = 'precision_auto_wipe_performed_v6_clean';
const STORAGE_KEY_SESSION_AUTH = 'dealership_session_authenticated_v1';
const STORAGE_KEY_CUSTOMERS = 'the_hub_customers_cloud_cache_v1';
const STORAGE_KEY_INSPECTION_CHECKLIST = 'precision_auto_inspection_checklist_v1';
const STORAGE_KEY_STAFF_LEAVE = 'dealership_staff_leave_calendar_v1';
const STORAGE_KEY_APPOINTMENTS = 'dealership_service_appointments_v2_clean';

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Cloud sync status indicator
  const [isCloudSynced, setIsCloudSynced] = useState<boolean>(false);

  // Authentication gate state - requires staff login on new session visits
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    try {
      return sessionStorage.getItem(STORAGE_KEY_SESSION_AUTH) === 'true';
    } catch {
      return false;
    }
  });

  // Dealership/Shop Name
  const [shopName, setShopNameState] = useState<string>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_SHOP_NAME);
      if (stored && stored.trim()) {
        return stored.trim();
      }
      return 'Woolwine CDJR';
    } catch {
      return 'Woolwine CDJR';
    }
  });

  const setShopName = (name: string) => {
    setShopNameState(name);
    try {
      localStorage.setItem(STORAGE_KEY_SHOP_NAME, name);
    } catch {
      // ignore
    }
    syncShopSettings({ shopName: name });
  };

  // Initial Setup State
  const [isInitialSetupCompleted, setIsInitialSetupCompleted] = useState<boolean>(() => {
    try {
      return localStorage.getItem(STORAGE_KEY_SETUP_DONE) === 'true';
    } catch {
      return false;
    }
  });

  const [isSetupWizardOpen, setIsSetupWizardOpen] = useState<boolean>(false);

  // Users state
  const [users, setUsers] = useState<User[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_USERS);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.map((u: User) => ({
            ...u,
            employeeNumber: (u.employeeNumber && u.employeeNumber.trim()) 
              ? u.employeeNumber.trim() 
              : undefined
          }));
        }
      }
    } catch {
      // ignore
    }
    return INITIAL_USERS;
  });

  // Keep users cached locally
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_USERS, JSON.stringify(users));
    } catch {
      // ignore
    }
  }, [users]);
  
  // Current user initialization
  const [currentUser, setCurrentUserState] = useState<User>(() => {
    try {
      const savedUser = localStorage.getItem(STORAGE_KEY_USER);
      const savedUsersRaw = localStorage.getItem(STORAGE_KEY_USERS);
      const rawList: User[] = savedUsersRaw ? JSON.parse(savedUsersRaw) : INITIAL_USERS;
      const usersList: User[] = rawList.map((u: User) => ({
        ...u,
        employeeNumber: (u.employeeNumber && u.employeeNumber.trim()) 
          ? u.employeeNumber.trim() 
          : undefined
      }));

      if (savedUser) {
        const parsed = JSON.parse(savedUser);
        const match = usersList.find(u => 
          u.id === parsed.id || 
          (u.email && parsed.email && u.email.toLowerCase() === parsed.email.toLowerCase())
        );
        if (match) {
          return {
            ...match,
            employeeNumber: (match.employeeNumber && match.employeeNumber.trim()) || (parsed.employeeNumber && parsed.employeeNumber.trim()) || undefined
          };
        }
      }

      // If no valid match, default to the Service Manager or first employee in the roster
      const primaryManager = usersList.find(u => u.role === 'SERVICE_MANAGER');
      if (primaryManager) return primaryManager;
      if (usersList.length > 0) return usersList[0];
    } catch {
      // ignore
    }
    return INITIAL_USERS[0];
  });

  // Repair orders state - defaults to empty if a wipe was performed or if no saved data
  const [repairOrders, setRepairOrders] = useState<RepairOrder[]>(() => {
    try {
      const isWiped = localStorage.getItem(STORAGE_KEY_WIPE_PERFORMED) === 'true';
      if (isWiped) {
        return [];
      }
      const saved = localStorage.getItem(STORAGE_KEY_ROS);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return parsed.map((ro: RepairOrder) => cleanRO3700(ro));
        }
      }
    } catch {
      // ignore
    }
    return INITIAL_REPAIR_ORDERS;
  });

  // Notifications state
  const [notifications, setNotifications] = useState<UrgentNotification[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_NOTIFS);
      if (saved) return JSON.parse(saved);
    } catch {
      // ignore
    }
    return [];
  });

  // Cloud Customers State
  const [customers, setCustomers] = useState<Customer[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_CUSTOMERS);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {
      // ignore
    }
    return [];
  });

  const [isCustomerDirectoryOpen, setIsCustomerDirectoryOpen] = useState(false);
  const [prefilledCustomerForNewRO, setPrefilledCustomerForNewRO] = useState<Customer | null>(null);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_CUSTOMERS, JSON.stringify(customers));
    } catch {
      // ignore
    }
  }, [customers]);

  const [selectedROId, setSelectedROId] = useState<string | null>(null);
  const [selectedROModalTab, setSelectedROModalTab] = useState<'DETAILS' | 'CHAT' | 'WARRANTY' | 'PARTS' | null>(null);
  const [quoteModalROId, setQuoteModalROId] = useState<string | null>(null);
  const [warrantyPrintROId, setWarrantyPrintROId] = useState<string | null>(null);
  const [isNewROModalOpen, setIsNewROModalOpen] = useState(false);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [isStaffManagementOpen, setIsStaffManagementOpen] = useState(false);
  const [isTimeCardCalculatorOpen, setIsTimeCardCalculatorOpen] = useState(false);
  const [isChatBoxOpen, setIsChatBoxOpen] = useState(false);

  // 21-Point MPI Checklist (Configurable by Service Manager)
  const [inspectionChecklist, setInspectionChecklist] = useState<InspectionChecklistItem[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_INSPECTION_CHECKLIST);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {
      // ignore
    }
    return DEFAULT_INSPECTION_CHECKLIST;
  });

  // Service Manager Staff Attendance & Calendar (Service Manager Only)
  const [staffLeaveEntries, setStaffLeaveEntries] = useState<StaffLeaveEntry[]>(() => {
    try {
      const cached = localStorage.getItem(STORAGE_KEY_STAFF_LEAVE);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return getInitialStaffLeaveEntries();
  });
  const [isStaffCalendarOpen, setIsStaffCalendarOpen] = useState(false);
  const [managerViewSection, setManagerViewSection] = useState<'FLOOR' | 'CALL_SHEET'>('FLOOR');

  // Service Appointment Calendar (Service Advisors & Service Manager)
  const [appointments, setAppointments] = useState<ServiceAppointment[]>(() => {
    try {
      localStorage.removeItem('dealership_service_appointments_v1');
      const cached = localStorage.getItem(STORAGE_KEY_APPOINTMENTS);
      if (cached !== null) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {}
    return getInitialServiceAppointments();
  });
  const [isAppointmentCalendarOpen, setIsAppointmentCalendarOpen] = useState(false);

  const [selectedChatRecipientId, setSelectedChatRecipientId] = useState<string>('ALL');
  const [shopMessages, setShopMessages] = useState<ShopChatMessage[]>([]);
  const [readShopMessageIds, setReadShopMessageIds] = useState<Set<string>>(() => {
    try {
      const savedUser = localStorage.getItem(STORAGE_KEY_USER);
      const userId = savedUser ? JSON.parse(savedUser).id : null;
      if (userId) {
        const savedRead = localStorage.getItem(`shop_chat_read_ids_${userId}`);
        if (savedRead) {
          const arr = JSON.parse(savedRead);
          if (Array.isArray(arr)) {
            return new Set(arr);
          }
        }
      }
    } catch {
      // ignore
    }
    return new Set<string>();
  });

  const currentUserRef = useRef(currentUser);
  useEffect(() => {
    currentUserRef.current = currentUser;
  }, [currentUser]);

  // Active Workstation / Role View state (Managers can inspect any workstation; other roles locked to their role)
  const [viewOverride, setViewOverride] = useState<UserRole | null>(null);
  const activeRoleView: UserRole = currentUser.role === 'SERVICE_MANAGER' ? (viewOverride || 'SERVICE_MANAGER') : currentUser.role;
  const setActiveRoleView = useCallback((role: UserRole | null) => {
    setViewOverride(role);
  }, []);

  // When currentUser changes, reset role view override
  useEffect(() => {
    setViewOverride(null);
  }, [currentUser.id, currentUser.role]);

  // When currentUser changes, reload their read message IDs
  useEffect(() => {
    if (!currentUser?.id) return;
    try {
      const savedRead = localStorage.getItem(`shop_chat_read_ids_${currentUser.id}`);
      if (savedRead) {
        const arr = JSON.parse(savedRead);
        if (Array.isArray(arr)) {
          setReadShopMessageIds(new Set(arr));
          return;
        }
      }
    } catch {
      // ignore
    }
    setReadShopMessageIds(new Set<string>());
  }, [currentUser?.id]);

  const markShopMessagesAsRead = useCallback((messageIds: string[]) => {
    if (!messageIds || messageIds.length === 0 || !currentUser?.id) return;
    setReadShopMessageIds(prev => {
      let changed = false;
      const next = new Set(prev);
      for (const id of messageIds) {
        if (!next.has(id)) {
          next.add(id);
          changed = true;
        }
      }
      if (changed) {
        try {
          localStorage.setItem(`shop_chat_read_ids_${currentUser.id}`, JSON.stringify(Array.from(next)));
        } catch {
          // ignore
        }
        return next;
      }
      return prev;
    });
  }, [currentUser?.id]);

  // Unread messages intended for currentUser (not sent by currentUser)
  const unreadShopMessages = useMemo(() => {
    if (!currentUser || !currentUser.id) return [];
    return shopMessages.filter(m => {
      if (m.senderId === currentUser.id) return false;
      const isForMe = !m.recipientId || m.recipientId === 'ALL' || m.recipientId === currentUser.id;
      if (!isForMe) return false;
      return !readShopMessageIds.has(m.id);
    });
  }, [shopMessages, currentUser, readShopMessageIds]);

  const unreadShopCount = unreadShopMessages.length;

  const latestUnreadShopMessage = useMemo(() => {
    if (unreadShopMessages.length === 0) return null;
    return unreadShopMessages[unreadShopMessages.length - 1];
  }, [unreadShopMessages]);

  const unreadCountBySender = useMemo(() => {
    const map: Record<string, number> = {};
    for (const msg of unreadShopMessages) {
      if (!msg.recipientId || msg.recipientId === 'ALL') {
        map['ALL'] = (map['ALL'] || 0) + 1;
      } else {
        map[msg.senderId] = (map[msg.senderId] || 0) + 1;
      }
    }
    return map;
  }, [unreadShopMessages]);

  const openShopChat = useCallback((targetRecipientId?: string) => {
    if (targetRecipientId) {
      setSelectedChatRecipientId(targetRecipientId);
    } else {
      // When opening the chat box, check if there are unread messages:
      if (unreadShopMessages.length > 0) {
        // Direct messages to currentUser have highest priority
        const directUnread = [...unreadShopMessages].reverse().find(m => m.recipientId === currentUser?.id);
        if (directUnread) {
          setSelectedChatRecipientId(directUnread.senderId);
        } else {
          // Shop Floor announcement
          setSelectedChatRecipientId('ALL');
        }
      }
    }
    // Clear all unread alerts immediately upon opening shop chat
    if (unreadShopMessages.length > 0) {
      markShopMessagesAsRead(unreadShopMessages.map(m => m.id));
    }
    setIsChatBoxOpen(true);
  }, [unreadShopMessages, currentUser?.id, markShopMessagesAsRead]);
  const [isSoundEnabled, setIsSoundEnabled] = useState(true);
  const [pushPermission, setPushPermission] = useState<NotificationPermission | 'default'>(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      return Notification.permission;
    }
    return 'default';
  });

  // Sync to local storage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_ROS, JSON.stringify(repairOrders));
    } catch {
      // ignore
    }
  }, [repairOrders]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_NOTIFS, JSON.stringify(notifications));
    } catch {
      // ignore
    }
  }, [notifications]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(currentUser));
    } catch {
      // ignore
    }
  }, [currentUser]);

  // Real-time Firestore Cloud Subscriptions
  useEffect(() => {
    // Check if user has explicitly wiped to clean slate
    const isWiped = localStorage.getItem(STORAGE_KEY_WIPE_PERFORMED) === 'true';
    if (!isWiped) {
      // Seed initial data if Firestore is currently brand new
      seedInitialDataIfEmpty(INITIAL_USERS, INITIAL_REPAIR_ORDERS, shopName);
    }

    // Subscribe to real-time Repair Orders
    const unsubscribeROs = subscribeToRepairOrders((cloudROs) => {
      setRepairOrders(cloudROs);
      setIsCloudSynced(true);
    });

    // Subscribe to real-time Users
    const unsubscribeUsers = subscribeToUsers((cloudUsers) => {
      if (cloudUsers.length > 0) {
        const normalizedUsers = cloudUsers.map((u) => ({
          ...u,
          employeeNumber: (u.employeeNumber && u.employeeNumber.trim())
            ? u.employeeNumber.trim()
            : undefined
        }));
        setUsers(normalizedUsers);
        try {
          localStorage.setItem(STORAGE_KEY_USERS, JSON.stringify(normalizedUsers));
        } catch {
          // ignore
        }
        // Keep active session user object current
        setCurrentUserState((prev) => {
          const fresh = normalizedUsers.find(u => 
            u.id === prev.id || 
            (u.email && prev.email && u.email.toLowerCase() === prev.email.toLowerCase())
          );
          if (fresh) return fresh;

          // If active user is no longer in the cloud roster, switch to the Service Manager or first employee
          const activeManager = normalizedUsers.find(u => u.role === 'SERVICE_MANAGER');
          return activeManager || normalizedUsers[0];
        });
        setIsCloudSynced(true);
      }
    });

    // Subscribe to real-time Notifications
    const unsubscribeNotifs = subscribeToNotifications((cloudNotifs) => {
      if (cloudNotifs.length > 0) {
        setNotifications(cloudNotifs);
      }
    });

    // Subscribe to real-time Shop Settings
    const unsubscribeSettings = subscribeToShopSettings((cloudSettings) => {
      if (cloudSettings) {
        if (cloudSettings.shopName && cloudSettings.shopName.trim()) {
          setShopNameState(cloudSettings.shopName.trim());
          localStorage.setItem(STORAGE_KEY_SHOP_NAME, cloudSettings.shopName.trim());
        }
        if (typeof cloudSettings.isSetupCompleted === 'boolean') {
          setIsInitialSetupCompleted(cloudSettings.isSetupCompleted);
          localStorage.setItem(STORAGE_KEY_SETUP_DONE, String(cloudSettings.isSetupCompleted));
          if (cloudSettings.isSetupCompleted) {
            setIsSetupWizardOpen(false);
          }
        }
        if (Array.isArray(cloudSettings.staffLeaveEntries)) {
          setStaffLeaveEntries(cloudSettings.staffLeaveEntries);
          try {
            localStorage.setItem(STORAGE_KEY_STAFF_LEAVE, JSON.stringify(cloudSettings.staffLeaveEntries));
          } catch {}
        }
        if (Array.isArray(cloudSettings.appointments)) {
          setAppointments(cloudSettings.appointments);
          try {
            localStorage.setItem(STORAGE_KEY_APPOINTMENTS, JSON.stringify(cloudSettings.appointments));
          } catch {}
        }
      }
    });

    // Subscribe to real-time Shop Messages
    const knownShopMsgIds = new Set<string>();
    let isFirstShopMessagesLoad = true;

    const unsubscribeMessages = subscribeToShopMessages((cloudMessages) => {
      setShopMessages(cloudMessages);

      if (isFirstShopMessagesLoad) {
        cloudMessages.forEach(m => knownShopMsgIds.add(m.id));
        isFirstShopMessagesLoad = false;
        return;
      }

      const activeUser = currentUserRef.current;
      const incoming = cloudMessages.filter(m => 
        !knownShopMsgIds.has(m.id) &&
        m.senderId !== activeUser?.id &&
        (!m.recipientId || m.recipientId === 'ALL' || m.recipientId === activeUser?.id)
      );

      cloudMessages.forEach(m => knownShopMsgIds.add(m.id));

      if (incoming.length > 0) {
        const newest = incoming[incoming.length - 1];
        if (isSoundEnabled) {
          playNotificationChime(newest.isUrgent);
        }
        if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
          try {
            new Notification(
              newest.recipientId === activeUser?.id
                ? `Direct chat from ${newest.senderName}`
                : `Shop Floor chat from ${newest.senderName}`,
              {
                body: newest.content,
                icon: '/favicon.ico'
              }
            );
          } catch {
            // ignore
          }
        }
      }
    });

    // Subscribe to real-time Customers in Google Cloud Firestore
    const unsubscribeCustomers = subscribeToCustomers((cloudCustomers) => {
      if (cloudCustomers.length > 0) {
        setCustomers(cloudCustomers);
      }
    });

    return () => {
      unsubscribeROs();
      unsubscribeUsers();
      unsubscribeNotifs();
      unsubscribeSettings();
      unsubscribeMessages();
      unsubscribeCustomers();
    };
  }, []);

  // Ensure active session user is ALWAYS strictly synchronized with the current employee roster
  useEffect(() => {
    if (!users || users.length === 0) return;

    // Check if current user is an actual member of the shop's employee roster
    const match = users.find(u => 
      u.id === currentUser.id || 
      (u.email && currentUser.email && u.email.toLowerCase() === currentUser.email.toLowerCase())
    );

    if (!match) {
      // Current user is not in the roster (e.g. obsolete "Marcus Vance" in local storage).
      // Immediately switch to the Service Manager (e.g. Greg Saulters) or first staff member
      const designatedManager = users.find(u => u.role === 'SERVICE_MANAGER') || users[0];
      if (designatedManager) {
        setCurrentUserState(designatedManager);
        try {
          localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(designatedManager));
        } catch {
          // ignore
        }
      }
    } else {
      // If the current user was updated (name changed, title changed, cert level changed, etc.)
      if (
        match.name !== currentUser.name ||
        match.title !== currentUser.title ||
        match.role !== currentUser.role ||
        match.certificationLevel !== currentUser.certificationLevel ||
        match.phone !== currentUser.phone ||
        match.email !== currentUser.email
      ) {
        setCurrentUserState(match);
        try {
          localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(match));
        } catch {
          // ignore
        }
      }
    }
  }, [users, currentUser]);

  const selectedRO = useMemo(() => {
    const found = repairOrders.find(ro => ro.id === selectedROId);
    return found ? cleanRO3700(found) : null;
  }, [repairOrders, selectedROId]);

  const activeQuoteRO = useMemo(() => {
    const found = repairOrders.find(ro => ro.id === quoteModalROId);
    return found ? cleanRO3700(found) : null;
  }, [repairOrders, quoteModalROId]);

  const activeWarrantyPrintRO = repairOrders.find(ro => ro.id === warrantyPrintROId) || null;

  const setSelectedRO = (ro: RepairOrder | null, tab?: 'DETAILS' | 'CHAT' | 'WARRANTY' | 'PARTS') => {
    setSelectedROId(ro ? ro.id : null);
    if (tab) {
      setSelectedROModalTab(tab);
    } else if (!ro) {
      setSelectedROModalTab(null);
    }
  };

  const openROWithTab = (ro: RepairOrder, tab: 'DETAILS' | 'CHAT' | 'WARRANTY' | 'PARTS' = 'DETAILS') => {
    setSelectedROId(ro.id);
    setSelectedROModalTab(tab);
  };

  const openQuoteModal = (roId: string) => {
    setQuoteModalROId(roId);
  };

  const closeQuoteModal = () => {
    setQuoteModalROId(null);
  };

  const openWarrantyPrintModal = (roId: string) => {
    setWarrantyPrintROId(roId);
  };

  const closeWarrantyPrintModal = () => {
    setWarrantyPrintROId(null);
  };

  const setCurrentUser = (user: User) => {
    setCurrentUserState(user);
    try {
      localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(user));
    } catch {
      // ignore
    }
  };

  const toggleSound = () => {
    setIsSoundEnabled(prev => !prev);
  };

  const requestPushPermission = async () => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      try {
        const result = await Notification.requestPermission();
        setPushPermission(result);
        if (result === 'granted') {
          requestBrowserNotification(
            'Service Hub Alerts Enabled',
            'You will receive instant push notifications for urgent RO status changes and parts arrival.',
            false
          );
        }
      } catch {
        // ignore
      }
    }
  };

  // Add notification helper
  const triggerNotification = (
    ro: RepairOrder,
    title: string,
    message: string,
    isUrgent: boolean,
    type: UrgentNotification['type'],
    targetRole?: UserRole,
    targetUserId?: string
  ) => {
    const newNotif: UrgentNotification = {
      id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      roId: ro.id,
      roNumber: ro.id,
      title,
      message,
      timestamp: new Date().toISOString(),
      isUrgent,
      type,
      read: false,
      targetRole,
      targetUserId,
    };

    setNotifications(prev => [newNotif, ...prev.slice(0, 49)]);
    syncNotification(newNotif);

    // When a part is requested, alert the Parts screen/specialist, NOT the technician on the tech screen
    const isPartsRequest = type === 'PARTS_UPDATE' || targetRole === 'PARTS_SPECIALIST' || title.toLowerCase().includes('part request') || title.toLowerCase().includes('parts request');
    const isTechScreen = activeRoleView === 'TECHNICIAN' || currentUser.role === 'TECHNICIAN';

    if (isPartsRequest && isTechScreen) {
      // Tech screen does not chime or trigger browser alert for parts requests
      return;
    }

    const isTargetedToOtherRole = targetRole && targetRole !== activeRoleView && targetRole !== currentUser.role && currentUser.role !== 'SERVICE_MANAGER';
    const isTargetedToOtherUser = targetUserId && targetUserId !== currentUser.id;

    if (!isTargetedToOtherRole && !isTargetedToOtherUser) {
      if (isSoundEnabled) {
        playNotificationChime(isUrgent);
      }

      if (isUrgent || type === 'STATUS_CHANGE') {
        requestBrowserNotification(`[${ro.id}] ${title}`, message, isUrgent);
      }
    }
  };

  // Update RO Status
  const updateROStatus = (
    roId: string, 
    newStatus: ROStatus, 
    notes?: string, 
    makeUrgent?: boolean
  ) => {
    if (currentUser.role === 'SALES') {
      return;
    }
    const targetRO = repairOrders.find(r => r.id === roId);
    if (!targetRO) return;

    const isNowUrgent = makeUrgent !== undefined ? makeUrgent : (newStatus === 'WAITING_APPROVAL' || targetRO.isUrgent);
    const now = new Date().toISOString();

    let waitingDiagnosisAt = targetRO.waitingDiagnosisAt;
    let diagnosisStartedAt = targetRO.diagnosisStartedAt;
    let completedAt = targetRO.completedAt;
    let postRepairFollowUpDate = targetRO.postRepairFollowUpDate;
    let postRepairFollowUpCompleted = targetRO.postRepairFollowUpCompleted;

    if (newStatus === 'WAITING_DIAGNOSTICS' || newStatus === 'WAITING_DIAGNOSIS') {
      waitingDiagnosisAt = now;
    } else if (newStatus === 'IN_DIAG' || newStatus === 'BEING_DIAGNOSED' || newStatus === 'IN_BAY') {
      if (!diagnosisStartedAt) {
        diagnosisStartedAt = now;
      }
    } else if (newStatus === 'CLOSED' || newStatus === 'COMPLETED') {
      if (!completedAt) {
        completedAt = now;
      }
      if (!postRepairFollowUpDate) {
        // Automatically schedule 3-day post-repair customer follow-up call
        const followUpTarget = new Date(now);
        followUpTarget.setDate(followUpTarget.getDate() + 3);
        if (followUpTarget.getDay() === 0) {
          followUpTarget.setDate(followUpTarget.getDate() + 1); // roll past Sunday
        }
        postRepairFollowUpDate = followUpTarget.toISOString().split('T')[0];
        postRepairFollowUpCompleted = false;
      }
    }

    const newHistoryItem = {
      id: `hist_${Date.now()}`,
      status: newStatus,
      updatedBy: currentUser.id,
      updatedByName: currentUser.name,
      userRole: currentUser.role,
      timestamp: now,
      notes: notes || `Status changed to ${newStatus.replace(/_/g, ' ')} by ${currentUser.name}`,
    };

    const isApprovedStatus = newStatus === 'APPROVED';
    let updatedQuote = targetRO.quote;
    if (isApprovedStatus && updatedQuote && updatedQuote.status !== 'APPROVED') {
      updatedQuote = {
        ...updatedQuote,
        status: 'APPROVED',
        approvedAt: updatedQuote.approvedAt || now,
        approvedBy: updatedQuote.approvedBy || currentUser.name,
        updatedAt: now,
      };
    }

    let updatedParts = targetRO.parts;
    if (isApprovedStatus) {
      updatedParts = targetRO.parts.map(p => {
        if (p.status === 'QUOTE_ONLY' || p.requestType === 'QUOTE_ONLY') {
          return {
            ...p,
            status: 'ORDERED' as PartStatus,
            requestType: 'ORDER_NOW' as const,
            orderedAt: p.orderedAt || now,
            estimatedArrival: p.estimatedArrival && !p.estimatedArrival.toLowerCase().includes('quote') && !p.estimatedArrival.toLowerCase().includes('estimate')
              ? p.estimatedArrival
              : 'Daily Order (Arriving ~5:00 PM)',
          };
        }
        return p;
      });

      if (targetRO.quote?.partsItems) {
        targetRO.quote.partsItems.forEach((qp, idx) => {
          const alreadyExists = updatedParts.some(p => 
            (qp.sourcePartId && p.id === qp.sourcePartId) || 
            (qp.partNumber && p.partNumber && p.partNumber.trim().toUpperCase() === qp.partNumber.trim().toUpperCase()) ||
            (qp.description && p.description && p.description.trim().toLowerCase() === qp.description.trim().toLowerCase())
          );
          if (!alreadyExists) {
            updatedParts.push({
              id: qp.sourcePartId || `qpart_approved_${Date.now()}_${idx}`,
              roId: targetRO.id,
              vendor: 'OEM / Parts Counter',
              partNumber: qp.partNumber || 'TBD',
              description: qp.description || 'Quoted Part',
              quantity: qp.quantity || 1,
              price: qp.unitPrice,
              status: 'ORDERED',
              requestType: 'ORDER_NOW',
              orderedAt: now,
              estimatedArrival: 'Daily Order (Arriving ~5:00 PM)',
              roLineNumber: qp.roLineNumber || 1,
            });
          }
        });
      }
    }

    const updatedRO: RepairOrder = {
      ...targetRO,
      status: newStatus,
      parts: updatedParts,
      quote: updatedQuote,
      waitingDiagnosisAt,
      diagnosisStartedAt,
      completedAt,
      postRepairFollowUpDate,
      postRepairFollowUpCompleted,
      isUrgent: isNowUrgent,
      history: [...targetRO.history, newHistoryItem],
    };

    // Optimistically update local state & sync to Firestore cloud
    setRepairOrders(prev => prev.map(ro => ro.id === roId ? updatedRO : ro));
    syncRepairOrder(updatedRO);

    if (newStatus === 'APPROVED') {
      // Specifically target Service Manager, Parts Specialists, and the assigned Tech on this RO only
      triggerNotification(
        updatedRO,
        `📋 RO Approved: #${targetRO.id}`,
        `${currentUser.name} approved repairs for ${targetRO.customerName}.`,
        true,
        'STATUS_CHANGE',
        'SERVICE_MANAGER'
      );
      triggerNotification(
        updatedRO,
        `🚨 Parts Action: RO Approved #${targetRO.id}`,
        `Customer authorized repairs. Please verify and place parts orders now.`,
        true,
        'PARTS_UPDATE',
        'PARTS_SPECIALIST'
      );
      if (targetRO.techId) {
        triggerNotification(
          updatedRO,
          `🔧 Repairs Authorized: RO #${targetRO.id}`,
          `Customer approved repairs. Work is authorized to proceed.`,
          true,
          'STATUS_CHANGE',
          'TECHNICIAN',
          targetRO.techId
        );
      }
    } else {
      triggerNotification(
        updatedRO,
        `Status: ${newStatus.replace(/_/g, ' ')}`,
        `${currentUser.name} (${currentUser.title}) updated status. ${notes ? `Note: "${notes}"` : ''}`,
        isNowUrgent,
        'STATUS_CHANGE'
      );
    }
  };

  // Quick Action: Begin diagnosis
  const startDiagnosis = (roId: string, notes?: string) => {
    updateROStatus(
      roId, 
      'IN_DIAG', 
      notes || `Technician ${currentUser.name} commenced active diagnostic testing and inspection.`
    );
  };

  // Dispatch RO to a technician
  const dispatchRO = (roId: string, techId: string, _bay?: string) => {
    if (currentUser.role !== 'SERVICE_MANAGER' && currentUser.role !== 'SERVICE_ADVISOR') {
      console.warn('Technician assignment is only permitted by Service Manager and Service Advisor');
      return;
    }
    const tech = users.find(u => u.id === techId);
    if (!tech) return;

    const targetRO = repairOrders.find(r => r.id === roId);
    if (!targetRO) return;

    const now = new Date().toISOString();

    const newHistory = {
      id: `hist_${Date.now()}`,
      status: 'WAITING_DIAGNOSTICS' as ROStatus,
      updatedBy: currentUser.id,
      updatedByName: currentUser.name,
      userRole: currentUser.role,
      timestamp: now,
      notes: `Assigned by ${currentUser.name} to ${tech.name}. Staged and waiting to be diagnosed.`,
    };

    const updatedRO: RepairOrder = {
      ...targetRO,
      status: 'WAITING_DIAGNOSTICS',
      techId: tech.id,
      techName: tech.name,
      bay: '',
      dispatchedAt: now,
      waitingDiagnosisAt: now,
      history: [...targetRO.history, newHistory],
    };

    setRepairOrders(prev => prev.map(ro => ro.id === roId ? updatedRO : ro));
    syncRepairOrder(updatedRO);

    triggerNotification(
      updatedRO,
      `Job Assigned to ${tech.name}`,
      `Repair Order ${targetRO.id} for ${targetRO.customerName} (${targetRO.vehicle.year} ${targetRO.vehicle.make} ${targetRO.vehicle.model}) assigned to ${tech.name}. Staged and waiting to be diagnosed.`,
      true,
      'DISPATCH'
    );
  };

  // Reassign Service Writer (Advisor / Manager)
  const reassignServiceWriter = (roId: string, newAdvisorId: string, notes?: string): boolean => {
    if (currentUser.role === 'SALES' || currentUser.role === 'TECHNICIAN' || currentUser.role === 'PARTS_SPECIALIST') {
      alert('Permission Denied: Only Service Managers and Service Advisors can reassign Service Writers.');
      return false;
    }
    const newAdvisor = users.find(u => u.id === newAdvisorId);
    if (!newAdvisor) return false;

    const targetRO = repairOrders.find(r => r.id === roId);
    if (!targetRO) return false;

    const prevAdvisorName = targetRO.advisorName || 'Unassigned';
    const now = new Date().toISOString();

    const newHistory = {
      id: `hist_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      status: targetRO.status,
      updatedBy: currentUser.id,
      updatedByName: currentUser.name,
      userRole: currentUser.role,
      timestamp: now,
      notes: notes || `Service Writer reassigned from ${prevAdvisorName} to ${newAdvisor.name}${newAdvisor.employeeNumber ? ` (#${newAdvisor.employeeNumber})` : ''} by ${currentUser.name}.`,
    };

    const updatedRO: RepairOrder = {
      ...targetRO,
      advisorId: newAdvisor.id,
      advisorName: newAdvisor.name,
      history: [...targetRO.history, newHistory],
    };

    setRepairOrders(prev => prev.map(ro => ro.id === roId ? updatedRO : ro));
    syncRepairOrder(updatedRO);

    triggerNotification(
      updatedRO,
      `Service Writer Reassigned`,
      `RO #${targetRO.id} (${targetRO.customerName}) reassigned to Service Writer ${newAdvisor.name}.`,
      false,
      'STATUS_CHANGE'
    );

    return true;
  };

  // Send message on an RO
  const sendMessage = (roId: string, content: string, isUrgent: boolean = false) => {
    if (currentUser.role === 'SALES') {
      return;
    }
    if (!content.trim()) return;

    const targetRO = repairOrders.find(r => r.id === roId);
    if (!targetRO) return;

    const newMsg = {
      id: `msg_${Date.now()}`,
      roId: targetRO.id,
      senderId: currentUser.id,
      senderName: currentUser.name,
      senderRole: currentUser.role,
      content: content.trim(),
      timestamp: new Date().toISOString(),
      isUrgent,
    };

    const updatedRO: RepairOrder = {
      ...targetRO,
      isUrgent: isUrgent || targetRO.isUrgent,
      messages: [...targetRO.messages, newMsg],
    };

    setRepairOrders(prev => prev.map(ro => ro.id === roId ? updatedRO : ro));
    syncRepairOrder(updatedRO);

    triggerNotification(
      updatedRO,
      isUrgent ? `URGENT Message from ${currentUser.name}` : `Message from ${currentUser.name}`,
      `[${targetRO.id}] ${content.slice(0, 100)}${content.length > 100 ? '...' : ''}`,
      isUrgent,
      'NEW_MESSAGE'
    );
  };

  // Add Multiple Part Orders (Atomic batch insert)
  const addMultiplePartOrders = (roId: string, partsToAdd: Array<Omit<PartItem, 'id' | 'roId'>>) => {
    if (currentUser.role === 'SALES' || !partsToAdd.length) {
      return;
    }

    let updatedROToSync: RepairOrder | null = null;
    const isAuthorizedForPartStatus = (currentUser.role === 'SERVICE_MANAGER' || currentUser.role === 'PARTS_SPECIALIST') && activeRoleView !== 'SERVICE_ADVISOR';

    setRepairOrders(prev => {
      const targetRO = prev.find(r => r.id === roId);
      if (!targetRO) return prev;

      const newParts: PartItem[] = partsToAdd.map((part, idx) => {
        const defaultInitialStatus: PartStatus = part.requestType === 'QUOTE_ONLY' ? 'QUOTE_ONLY' : 'REQUESTED';
        const effectivePartStatus: PartStatus = isAuthorizedForPartStatus 
          ? part.status 
          : (part.status === 'NEEDED' || part.status === 'REQUESTED' || part.status === 'QUOTE_ONLY' ? part.status : defaultInitialStatus);

        return {
          ...part,
          price: (part.price !== undefined && !isNaN(Number(part.price))) ? Number(Number(part.price).toFixed(2)) : undefined,
          status: effectivePartStatus,
          id: `prt_${Date.now()}_${idx}_${Math.random().toString(36).substring(2, 7)}`,
          roId,
          orderedAt: part.orderedAt || new Date().toISOString(),
        };
      });

      const isWaitingOnDelivery = newParts.some(newPart => 
        newPart.status === 'DAILY_ORDER' || 
        newPart.status === 'LOCAL_PURCHASE' ||
        newPart.status === 'SPECIAL_ORDER_1_5_DAYS' ||
        newPart.status === 'SPECIAL_ORDER' || 
        newPart.status === 'VOR_UPGRADE' || 
        newPart.status === 'ORDERED' || 
        newPart.status === 'IN_TRANSIT' || 
        (newPart.status === 'REQUESTED' && newPart.requestType !== 'QUOTE_ONLY')
      );
      const newROStatus = isWaitingOnDelivery ? 'WAITING_PARTS' : targetRO.status;

      const newHistoryEntries = newParts.map((newPart, idx) => {
        const effectivePartStatus = newPart.status;
        let historyNote = `[Parts Dept] Added part #${newPart.partNumber} (${newPart.description}) from ${newPart.vendor || 'supplier'}. Status: ${effectivePartStatus.replace(/_/g, ' ')}`;
        if (effectivePartStatus === 'QUOTE_ONLY' || newPart.requestType === 'QUOTE_ONLY') {
          historyNote = `[Parts Quote Request] Tech ${currentUser.name} requested parts quote/pricing for #${newPart.partNumber} (${newPart.description}) (Quote Only).`;
        } else if (newPart.requestType === 'ORDER_NOW') {
          historyNote = `[Parts Order Request] Tech ${currentUser.name} requested to ORDER #${newPart.partNumber} (${newPart.description}) (Order Now).`;
        } else if (effectivePartStatus === 'IN_STOCK' || effectivePartStatus === 'ISSUED_TO_TECH') {
          historyNote = `[Parts Dept] Added IN STOCK part #${newPart.partNumber} (${newPart.description}) from ${newPart.vendor || 'inventory'}.`;
        } else if (effectivePartStatus === 'LOCAL_PURCHASE') {
          historyNote = `[Parts Dept] Dispatched LOCAL PURCHASE for part #${newPart.partNumber} (${newPart.description}) from ${newPart.vendor || 'local supplier'}. ETA: ${newPart.estimatedArrival || 'Today'}`;
        } else if (effectivePartStatus === 'DAILY_ORDER') {
          historyNote = `[Parts Dept] Placed DAILY ORDER for part #${newPart.partNumber} (${newPart.description}) from ${newPart.vendor || 'supplier'}. ETA: ${newPart.estimatedArrival || 'TBD'}`;
        } else if (effectivePartStatus === 'SPECIAL_ORDER_1_5_DAYS' || effectivePartStatus === 'SPECIAL_ORDER') {
          historyNote = `[Parts Dept] Placed SPECIAL ORDER 1-5 DAYS for part #${newPart.partNumber} (${newPart.description}) from ${newPart.vendor || 'supplier'}. ETA: ${newPart.estimatedArrival || 'TBD'}`;
        } else if (effectivePartStatus === 'VOR_UPGRADE') {
          historyNote = `[Parts Dept] Placed VOR UPGRADE order for part #${newPart.partNumber} (${newPart.description}) from ${newPart.vendor || 'supplier'}. ETA: ${newPart.estimatedArrival || 'TBD'}`;
        } else if (effectivePartStatus === 'RECEIVED') {
          historyNote = `[Parts Dept] Added part #${newPart.partNumber} (${newPart.description}) as in-stock/received.`;
        } else if (effectivePartStatus === 'REQUESTED') {
          historyNote = `[Parts Request] Part request submitted for #${newPart.partNumber} (${newPart.description}). Pending classification by Parts/Service Manager.`;
        }

        return {
          id: `hist_${Date.now()}_${idx}_${Math.random().toString(36).substring(2, 6)}`,
          status: newROStatus,
          updatedBy: currentUser.id,
          updatedByName: currentUser.name,
          userRole: currentUser.role,
          timestamp: new Date().toISOString(),
          notes: historyNote,
        };
      });

      // If quote exists on RO, automatically merge parts so labor and parts come together on the quote
      let mergedQuote = targetRO.quote;
      if (mergedQuote) {
        let nextPartsItems = [...(mergedQuote.partsItems || [])];
        for (const newPart of newParts) {
          const matchIdx = nextPartsItems.findIndex(qp => 
            qp.sourcePartId === newPart.id || 
            (newPart.partNumber && qp.partNumber && qp.partNumber.trim().toUpperCase() === newPart.partNumber.trim().toUpperCase())
          );
          const partPrice = (newPart.price !== undefined && Number(newPart.price) > 0) ? Number(newPart.price) : 0;
          if (matchIdx >= 0) {
            nextPartsItems[matchIdx] = {
              ...nextPartsItems[matchIdx],
              description: newPart.description || newPart.name || nextPartsItems[matchIdx].description,
              partNumber: newPart.partNumber || nextPartsItems[matchIdx].partNumber,
              quantity: newPart.quantity || nextPartsItems[matchIdx].quantity || 1,
              unitPrice: partPrice > 0 ? partPrice : nextPartsItems[matchIdx].unitPrice,
              subtotal: (newPart.quantity || nextPartsItems[matchIdx].quantity || 1) * (partPrice > 0 ? partPrice : (Number(nextPartsItems[matchIdx].unitPrice) || 0)),
              sourcePartId: newPart.id,
              roLineNumber: newPart.roLineNumber || nextPartsItems[matchIdx].roLineNumber,
            };
          } else {
            nextPartsItems.push({
              id: `qpart_${Date.now()}_${newPart.id}`,
              description: newPart.description || newPart.name,
              partNumber: newPart.partNumber,
              quantity: newPart.quantity || 1,
              unitPrice: partPrice > 0 ? partPrice : ('' as any),
              subtotal: (newPart.quantity || 1) * (partPrice > 0 ? partPrice : 0),
              sourcePartId: newPart.id,
              roLineNumber: newPart.roLineNumber,
            });
          }
        }
        const totalPartsCost = nextPartsItems.reduce((acc, p) => acc + (Number(p.subtotal) || 0), 0);
        const totalLaborCost = mergedQuote.totalLaborCost || 0;
        const supplies = mergedQuote.shopSuppliesFee || 0;
        const taxRate = mergedQuote.isTaxExempt ? 0 : (mergedQuote.taxRate ?? 0.07);
        const taxableAmount = totalLaborCost + totalPartsCost;
        const taxAmount = Number((taxableAmount * taxRate).toFixed(2));
        const grandTotal = Number((totalLaborCost + totalPartsCost + supplies + taxAmount).toFixed(2));

        mergedQuote = {
          ...mergedQuote,
          partsItems: nextPartsItems,
          totalPartsCost,
          taxAmount,
          grandTotal,
        };
      }

      const updatedRO: RepairOrder = {
        ...targetRO,
        status: newROStatus,
        parts: [...targetRO.parts, ...newParts],
        quote: mergedQuote,
        history: [...targetRO.history, ...newHistoryEntries],
      };

      updatedROToSync = updatedRO;
      return prev.map(ro => ro.id === roId ? updatedRO : ro);
    });

    if (updatedROToSync) {
      syncRepairOrder(updatedROToSync);
      const firstPart = partsToAdd[0];
      triggerNotification(
        updatedROToSync,
        partsToAdd.length === 1 ? `Parts Requested: ${firstPart.description}` : `${partsToAdd.length} Parts Requested`,
        `Submitted by ${currentUser.name}`,
        false,
        'PARTS_UPDATE',
        'PARTS_SPECIALIST'
      );
    }
  };

  // Add Part Order (Single)
  const addPartOrder = (roId: string, part: Omit<PartItem, 'id' | 'roId'>) => {
    addMultiplePartOrders(roId, [part]);
  };

  // Update Part Status
  const updatePartStatus = (
    roId: string, 
    partId: string, 
    status: PartStatus, 
    eta?: string, 
    notes?: string
  ) => {
    // Restrict part status changes: only Service Manager and Parts Manager, and disabled on the Service Advisor screen
    if (activeRoleView === 'SERVICE_ADVISOR' || (currentUser.role !== 'SERVICE_MANAGER' && currentUser.role !== 'PARTS_SPECIALIST')) {
      console.warn('Unauthorized: Part order status changes are restricted to Service Manager and Parts Manager, and disabled on the Service Advisor screen.');
      return;
    }

    const targetRO = repairOrders.find(r => r.id === roId);
    if (!targetRO) return;

    let partDescription = '';
    const updatedParts = targetRO.parts.map(p => {
      if (p.id !== partId) return p;
      partDescription = p.description;
      return {
        ...p,
        status,
        estimatedArrival: eta || p.estimatedArrival,
        notes: notes || p.notes,
      };
    });

    const allReceived = updatedParts.every(p => p.status === 'RECEIVED' || p.status === 'ISSUED_TO_TECH');
    let nextROStatus = targetRO.status;
    if (allReceived && (targetRO.status === 'PARTS_ORDERED' || targetRO.status === 'WAITING_PARTS')) {
      nextROStatus = status === 'ISSUED_TO_TECH' ? 'REPAIR_IN_PROGRESS' : 'PARTS_IN_TO_TECH';
    }

    const isUrgent = status === 'RECEIVED' || status === 'ISSUED_TO_TECH';

    const updatedRO: RepairOrder = {
      ...targetRO,
      status: nextROStatus,
      parts: updatedParts,
      history: [
        ...targetRO.history,
        {
          id: `hist_${Date.now()}`,
          status: nextROStatus,
          updatedBy: currentUser.id,
          updatedByName: currentUser.name,
          userRole: currentUser.role,
          timestamp: new Date().toISOString(),
          notes: `Part ${partDescription} status updated to ${status === 'SPECIAL_ORDER_1_5_DAYS' ? 'SPECIAL ORDER 1-5 DAYS' : status.replace(/_/g, ' ')}.${nextROStatus === 'REPAIR_IN_PROGRESS' ? ' All parts present, RO transitioned to Repair in Progress.' : nextROStatus === 'PARTS_IN_TO_TECH' ? ' Parts arrived, staged for tech.' : ''}`,
        },
      ],
    };

    setRepairOrders(prev => prev.map(ro => ro.id === roId ? updatedRO : ro));
    syncRepairOrder(updatedRO);

    triggerNotification(
      updatedRO,
      `Part ${status === 'SPECIAL_ORDER_1_5_DAYS' ? 'SPECIAL ORDER 1-5 DAYS' : status.replace(/_/g, ' ')}: ${partDescription}`,
      `Status updated by ${currentUser.name}. ${eta ? `New ETA: ${eta}.` : ''}`,
      isUrgent,
      'PARTS_UPDATE'
    );
  };

  // Update Part Item Details (Full update: Part Number, Description, Vendor, Quantity, Price, ETA, Status, Notes)
  const updatePartItem = (
    roId: string,
    partId: string,
    updates: Partial<PartItem>
  ) => {
    const targetRO = repairOrders.find(r => r.id === roId);
    if (!targetRO) return;

    let partDesc = '';
    const updatedParts = targetRO.parts.map(p => {
      if (p.id !== partId) return p;
      partDesc = updates.description || p.description;
      return {
        ...p,
        ...updates,
        price: (updates.price !== undefined && !isNaN(Number(updates.price))) ? Number(Number(updates.price).toFixed(2)) : p.price,
      };
    });

    // Check if parts are all received / issued
    const allReceived = updatedParts.every(p => p.status === 'RECEIVED' || p.status === 'ISSUED_TO_TECH');
    let nextROStatus = targetRO.status;
    if (allReceived && (targetRO.status === 'PARTS_ORDERED' || targetRO.status === 'WAITING_PARTS')) {
      nextROStatus = (updates.status === 'ISSUED_TO_TECH') ? 'REPAIR_IN_PROGRESS' : 'PARTS_IN_TO_TECH';
    } else if (updates.status && (updates.status === 'DAILY_ORDER' || updates.status === 'LOCAL_PURCHASE' || updates.status === 'SPECIAL_ORDER' || updates.status === 'SPECIAL_ORDER_1_5_DAYS' || updates.status === 'ORDERED' || updates.status === 'VOR_UPGRADE')) {
      if (targetRO.status === 'WAITING_PARTS' || targetRO.status === 'BEING_DIAGNOSED') {
        nextROStatus = 'PARTS_ORDERED';
      }
    }

    // Sync quote: Ensure quote exists and is updated with part pricing for estimate
    let mergedQuote = targetRO.quote;
    if (!mergedQuote) {
      const concernsList = (targetRO.concerns && targetRO.concerns.length > 0)
        ? targetRO.concerns
        : [targetRO.primaryConcern || 'General Diagnostic & Service'];
      const defaultPay = targetRO.concernPayTypes?.[0] || 'CUSTOMER_PAY';
      const hourlyRate = PAY_TYPE_RATES[defaultPay] || 165.00;
      
      const laborItems: LaborLineItem[] = concernsList.map((concern, idx) => ({
        id: `labor_${Date.now()}_ro_${idx}`,
        description: targetRO.correction ? `Concern: ${concern} — Correction: ${targetRO.correction}` : `Concern: ${concern}`,
        laborHours: 0,
        hourlyRate,
        subtotal: 0,
        payType: targetRO.concernPayTypes?.[idx] || defaultPay,
        roLineNumber: idx + 1,
        concernText: concern,
        correctionText: targetRO.correction || '',
        addedByAdvisor: false,
      }));

      mergedQuote = {
        id: `quote_${Date.now()}`,
        roId: targetRO.id,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        initiatedByTechId: currentUser.id,
        initiatedByTechName: currentUser.name,
        status: 'DRAFT',
        payType: defaultPay,
        laborItems,
        partsItems: [],
        defaultLaborRate: hourlyRate,
        shopSuppliesFee: 0,
        taxRate: targetRO.isTaxExempt ? 0 : 0.07,
        taxAmount: 0,
        totalLaborHours: 0,
        totalLaborCost: 0,
        totalPartsCost: 0,
        grandTotal: 0,
        techNotes: targetRO.correction ? `Correction: ${targetRO.correction}` : undefined,
      };
    }

    if (mergedQuote) {
      const existingQuoteParts = mergedQuote.partsItems || [];
      const matchIdx = existingQuoteParts.findIndex(qp => qp.sourcePartId === partId || (updates.partNumber && qp.partNumber === updates.partNumber));
      let nextPartsItems = [...existingQuoteParts];
      const partPrice = (updates.price !== undefined && !isNaN(Number(updates.price))) ? Number(Number(updates.price).toFixed(2)) : undefined;
      const targetPart = targetRO.parts.find(p => p.id === partId);
      const effectiveLineNumber = updates.roLineNumber || targetPart?.roLineNumber;

      if (matchIdx >= 0) {
        const cur = nextPartsItems[matchIdx];
        const newUnitPrice = partPrice !== undefined ? partPrice : (cur.unitPrice || 0);
        const newQty = updates.quantity !== undefined ? updates.quantity : (cur.quantity || 1);
        nextPartsItems[matchIdx] = {
          ...cur,
          description: updates.description || cur.description,
          partNumber: updates.partNumber || cur.partNumber,
          quantity: newQty,
          unitPrice: newUnitPrice,
          subtotal: Number((newQty * (Number(newUnitPrice) || 0)).toFixed(2)),
          sourcePartId: partId,
          roLineNumber: effectiveLineNumber || cur.roLineNumber,
        };
      } else if (partDesc || updates.partNumber) {
        nextPartsItems.push({
          id: `qpart_${Date.now()}_${partId}`,
          description: partDesc || `Part ${updates.partNumber || ''}`,
          partNumber: updates.partNumber || '',
          quantity: updates.quantity || 1,
          unitPrice: (partPrice !== undefined) ? partPrice : ('' as any),
          subtotal: Number(((updates.quantity || 1) * (partPrice || 0)).toFixed(2)),
          sourcePartId: partId,
          roLineNumber: effectiveLineNumber,
        });
      }
      const totalPartsCost = Number(nextPartsItems.reduce((acc, p) => acc + (Number(p.subtotal) || 0), 0).toFixed(2));
      const totalLaborCost = Number((mergedQuote.totalLaborCost || 0).toFixed(2));
      const supplies = Number((mergedQuote.shopSuppliesFee || 0).toFixed(2));
      const taxRate = mergedQuote.isTaxExempt ? 0 : (mergedQuote.taxRate ?? 0.07);
      const taxableAmount = totalLaborCost + totalPartsCost;
      const taxAmount = Number((taxableAmount * taxRate).toFixed(2));
      const grandTotal = Number((totalLaborCost + totalPartsCost + supplies + taxAmount).toFixed(2));

      mergedQuote = {
        ...mergedQuote,
        partsItems: nextPartsItems,
        totalPartsCost,
        taxAmount,
        grandTotal,
        updatedAt: new Date().toISOString(),
      };
    }

    const updatedRO: RepairOrder = {
      ...targetRO,
      status: nextROStatus,
      parts: updatedParts,
      quote: mergedQuote,
      history: [
        ...targetRO.history,
        {
          id: `hist_${Date.now()}`,
          status: nextROStatus,
          updatedBy: currentUser.id,
          updatedByName: currentUser.name,
          userRole: currentUser.role,
          timestamp: new Date().toISOString(),
          notes: `[Parts Dept] Updated part #${updates.partNumber || ''} (${partDesc}). Status: ${(updates.status || 'UPDATED').replace(/_/g, ' ')}`,
        },
      ],
    };

    setRepairOrders(prev => prev.map(ro => ro.id === roId ? updatedRO : ro));
    syncRepairOrder(updatedRO);
  };

  // Delete Part Item
  const deletePartItem = (roId: string, partId: string) => {
    const targetRO = repairOrders.find(r => r.id === roId);
    if (!targetRO) return;

    const remainingParts = targetRO.parts.filter(p => p.id !== partId);
    let mergedQuote = targetRO.quote;
    if (mergedQuote && mergedQuote.partsItems) {
      const nextPartsItems = mergedQuote.partsItems.filter(qp => qp.sourcePartId !== partId);
      const totalPartsCost = nextPartsItems.reduce((acc, p) => acc + (Number(p.subtotal) || 0), 0);
      const totalLaborCost = mergedQuote.totalLaborCost || 0;
      const supplies = mergedQuote.shopSuppliesFee || 0;
      const taxRate = mergedQuote.isTaxExempt ? 0 : (mergedQuote.taxRate ?? 0.07);
      const taxableAmount = totalLaborCost + totalPartsCost;
      const taxAmount = Number((taxableAmount * taxRate).toFixed(2));
      const grandTotal = Number((totalLaborCost + totalPartsCost + supplies + taxAmount).toFixed(2));

      mergedQuote = {
        ...mergedQuote,
        partsItems: nextPartsItems,
        totalPartsCost,
        taxAmount,
        grandTotal,
      };
    }

    const updatedRO: RepairOrder = {
      ...targetRO,
      parts: remainingParts,
      quote: mergedQuote,
    };

    setRepairOrders(prev => prev.map(ro => ro.id === roId ? updatedRO : ro));
    syncRepairOrder(updatedRO);
  };

  // Create new repair order
  const createRepairOrder = (data: {
    roNumber?: string;
    customerName: string;
    customerPhone: string;
    vehicle: RepairOrder['vehicle'];
    advisorId?: string;
    advisorName?: string;
    primaryConcern?: string;
    concerns?: string[];
    concernPayTypes?: ConcernPayType[];
    concernTechIds?: (string | undefined)[];
    concernTechNames?: (string | undefined)[];
    promisedTime?: string;
    techId?: string;
    bay?: string;
    isUrgent?: boolean;
    isWaiter?: boolean;
    isTaxExempt?: boolean;
    taxExemptNumber?: string;
  }): string => {
    let newId: string;
    const cleanRoInput = data.roNumber?.trim().toUpperCase();
    if (cleanRoInput) {
      newId = cleanRoInput;
    } else {
      const maxRoNum = repairOrders.reduce((max, ro) => {
        const match = ro.id.match(/\d+/);
        const num = match ? parseInt(match[0], 10) : 0;
        return num > max ? num : max;
      }, 10488);
      newId = `RO-${maxRoNum + 1}`;
    }
    const now = new Date().toISOString();

    const cleanConcernsList = data.concerns && data.concerns.length > 0
      ? data.concerns.map(c => c.trim()).filter(Boolean)
      : (data.primaryConcern?.trim() ? [data.primaryConcern.trim()] : []);
    
    const primaryConcernText = cleanConcernsList[0] || data.primaryConcern?.trim() || 'General Inspection / Service';

    const initialConcernTechIds: (string | undefined)[] = data.concernTechIds && data.concernTechIds.length > 0
      ? data.concernTechIds
      : cleanConcernsList.map(() => data.techId);

    const initialConcernTechNames: (string | undefined)[] = data.concernTechNames && data.concernTechNames.length > 0
      ? data.concernTechNames
      : initialConcernTechIds.map(tId => (tId ? users.find(u => u.id === tId)?.name : undefined));

    // Resolve primary tech from explicit data.techId, or fallback to first assigned line tech
    const effectiveTechId = data.techId || initialConcernTechIds.find(Boolean);
    const tech = effectiveTechId ? users.find(u => u.id === effectiveTechId) : undefined;
    const initialStatus: ROStatus = 'WAITING_DIAGNOSTICS';

    const chosenAdvisor = data.advisorId ? users.find(u => u.id === data.advisorId) : undefined;
    const fallbackAdvisor = users.find(u => u.role === 'SERVICE_ADVISOR') || users.find(u => u.role === 'SERVICE_MANAGER') || currentUser;
    const effectiveAdvisorId = chosenAdvisor?.id || (currentUser.role === 'SERVICE_ADVISOR' ? currentUser.id : fallbackAdvisor.id);
    const effectiveAdvisorName = data.advisorName || chosenAdvisor?.name || (currentUser.role === 'SERVICE_ADVISOR' ? currentUser.name : fallbackAdvisor.name);

    const newRO: RepairOrder = {
      id: newId,
      customerName: data.customerName,
      customerPhone: data.customerPhone,
      vehicle: data.vehicle,
      createdAt: now,
      advisorId: effectiveAdvisorId,
      advisorName: effectiveAdvisorName,
      techId: tech?.id,
      techName: tech?.name,
      dispatchedAt: tech ? now : undefined,
      waitingDiagnosisAt: tech ? now : undefined,
      bay: '',
      status: initialStatus,
      isUrgent: !!data.isUrgent,
      isWaiter: !!data.isWaiter,
      isTaxExempt: !!data.isTaxExempt,
      taxExemptNumber: data.taxExemptNumber?.trim() || undefined,
      promisedTime: data.promisedTime || new Date(Date.now() + 6 * 3600 * 1000).toISOString(),
      primaryConcern: primaryConcernText,
      concerns: cleanConcernsList.length > 0 ? cleanConcernsList : [primaryConcernText],
      concernPayTypes: data.concernPayTypes && data.concernPayTypes.length > 0
        ? data.concernPayTypes
        : cleanConcernsList.map(() => 'CUSTOMER_PAY'),
      concernTechIds: initialConcernTechIds,
      concernTechNames: initialConcernTechNames,
      parts: [],
      messages: [],
      history: [
        {
          id: `hist_${Date.now()}`,
          status: initialStatus,
          updatedBy: currentUser.id,
          updatedByName: currentUser.name,
          userRole: currentUser.role,
          timestamp: now,
          notes: tech 
            ? `RO Created and assigned to ${tech.name}. Staged and waiting to be diagnosed.`
            : `Repair Order created by ${currentUser.name}. Awaiting technician assignment.`,
        }
      ],
    };

    setRepairOrders(prev => [newRO, ...prev]);
    syncRepairOrder(newRO);

    // Automatically persist customer in cloud database for future visits
    try {
      const custName = (data.customerName || '').trim();
      const custPhone = (data.customerPhone || '').trim();
      if (custName) {
        setCustomers(prev => {
          const match = prev.find(c => 
            (custPhone && c.phone && c.phone.replace(/\D/g, '') === custPhone.replace(/\D/g, '')) ||
            (c.name.toLowerCase() === custName.toLowerCase())
          );
          let targetCust: Customer;
          if (match) {
            const vehicles = [...match.vehicles];
            if (data.vehicle?.vin && !vehicles.some(v => v.vin === data.vehicle.vin)) {
              vehicles.push(data.vehicle);
            }
            targetCust = {
              ...match,
              name: custName,
              phone: custPhone || match.phone,
              isTaxExempt: data.isTaxExempt !== undefined ? data.isTaxExempt : match.isTaxExempt,
              taxExemptNumber: data.taxExemptNumber || match.taxExemptNumber,
              vehicles,
              lastVisit: now,
              totalVisits: (match.totalVisits || 1) + 1,
              updatedAt: now,
            };
            syncCustomer(targetCust);
            return prev.map(c => c.id === targetCust.id ? targetCust : c);
          } else {
            targetCust = {
              id: `cust_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
              name: custName,
              phone: custPhone,
              email: '',
              isTaxExempt: !!data.isTaxExempt,
              taxExemptNumber: data.taxExemptNumber || '',
              notes: '',
              vehicles: data.vehicle ? [data.vehicle] : [],
              lastVisit: now,
              totalVisits: 1,
              createdAt: now,
              updatedAt: now,
            };
            syncCustomer(targetCust);
            return [targetCust, ...prev];
          }
        });
      }
    } catch (e) {
      console.error('Error auto-syncing customer to cloud:', e);
    }

    triggerNotification(
      newRO,
      `New RO Created: ${newRO.id}`,
      `Created for ${data.customerName} (${data.vehicle.year} ${data.vehicle.make} ${data.vehicle.model}). ${tech ? `Assigned to ${tech.name}` : 'Ready to assign.'}`,
      !!data.isUrgent,
      'DISPATCH'
    );

    return newId;
  };

  // Customer Management in the Cloud
  const saveCustomer = async (cust: Customer): Promise<boolean> => {
    setCustomers(prev => {
      const idx = prev.findIndex(c => c.id === cust.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = cust;
        return next;
      }
      return [cust, ...prev];
    });
    return await syncCustomer(cust);
  };

  const deleteCustomer = async (customerId: string): Promise<void> => {
    setCustomers(prev => prev.filter(c => c.id !== customerId));
    await deleteCustomerDoc(customerId);
  };

  const markNotificationRead = (notifId: string) => {
    setNotifications(prev => prev.map(n => n.id === notifId ? { ...n, read: true } : n));
    markNotificationReadDoc(notifId);
  };

  const markAllNotificationsRead = () => {
    const unreadIds = notifications.filter(n => !n.read).map(n => n.id);
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    if (unreadIds.length > 0) {
      markAllNotificationsReadDocs(unreadIds);
    }
  };

  // User Management
  const addUser = (userData: Omit<User, 'id'>): User => {
    // If not currently marked as SERVICE_MANAGER, auto-elevate to manager mode if one exists
    if (currentUser.role !== 'SERVICE_MANAGER') {
      const mgr = users.find(u => u.role === 'SERVICE_MANAGER');
      if (mgr) {
        setCurrentUserState(mgr);
      }
    }

    const newId = `usr_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`;
    const pin = (userData.pin || userData.password || '1234').trim();

    // Do NOT automatically assign an employee number if one is not entered
    const empNum = (userData.employeeNumber && userData.employeeNumber.trim()) 
      ? userData.employeeNumber.trim() 
      : undefined;

    const defaultAvatar = (
      userData.role === 'SERVICE_MANAGER' ? 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80' :
      userData.role === 'SERVICE_ADVISOR' ? 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80' :
      userData.role === 'PARTS_SPECIALIST' ? 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150&auto=format&fit=crop&q=80' :
      userData.role === 'SALES' ? 'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=150&auto=format&fit=crop&q=80' :
      'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80'
    );

    const newUser: User = {
      id: newId,
      name: userData.name.trim(),
      employeeNumber: empNum,
      email: userData.email.trim().toLowerCase(),
      role: userData.role,
      title: (userData.title || '').trim() || (userData.role === 'TECHNICIAN' ? 'Automotive Technician' : userData.role),
      pin: pin,
      phone: (userData.phone || '').trim(),
      certificationLevel: (userData.certificationLevel || '').trim(),
      bayNumber: (userData.bayNumber || userData.certificationLevel || '').trim(),
      avatar: userData.avatar || defaultAvatar,
      isDeactivated: !!userData.isDeactivated,
    };

    setUsers(prev => {
      const updated = [...prev.filter(u => u.id !== newId), newUser];
      try {
        localStorage.setItem(STORAGE_KEY_USERS, JSON.stringify(updated));
      } catch {
        // ignore
      }
      return updated;
    });

    syncUser(newUser);
    return newUser;
  };

  const updateUser = (userId: string, updates: Partial<User>) => {
    if (currentUser.role !== 'SERVICE_MANAGER') {
      const mgr = users.find(u => u.role === 'SERVICE_MANAGER');
      if (mgr) {
        setCurrentUserState(mgr);
      }
    }

    setUsers(prev => {
      const updatedList = prev.map(u => {
        if (u.id !== userId) return u;
        const nextEmpNum = ('employeeNumber' in updates)
          ? (updates.employeeNumber && updates.employeeNumber.trim() ? updates.employeeNumber.trim() : undefined)
          : u.employeeNumber;
        return {
          ...u,
          ...updates,
          employeeNumber: nextEmpNum,
          pin: updates.pin !== undefined ? updates.pin.trim() : u.pin,
          phone: updates.phone !== undefined ? updates.phone.trim() : (u.phone || ''),
          certificationLevel: updates.certificationLevel !== undefined ? updates.certificationLevel.trim() : (u.certificationLevel || ''),
          bayNumber: updates.bayNumber !== undefined ? updates.bayNumber.trim() : (u.bayNumber || ''),
        };
      });

      const target = updatedList.find(u => u.id === userId);
      if (target) {
        syncUser(target);
      }
      try {
        localStorage.setItem(STORAGE_KEY_USERS, JSON.stringify(updatedList));
      } catch {
        // ignore
      }
      return updatedList;
    });

    setCurrentUserState(prev => {
      if (
        prev.id === userId || 
        (updates.email && prev.email && prev.email.toLowerCase() === updates.email.toLowerCase()) ||
        users.length === 1
      ) {
        const nextEmpNum = ('employeeNumber' in updates)
          ? (updates.employeeNumber && updates.employeeNumber.trim() ? updates.employeeNumber.trim() : undefined)
          : prev.employeeNumber;
        const updated = { 
          ...prev, 
          ...updates,
          employeeNumber: nextEmpNum,
          pin: updates.pin !== undefined ? updates.pin.trim() : prev.pin,
        };
        try {
          localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(updated));
        } catch {
          // ignore
        }
        return updated;
      }
      return prev;
    });
  };

  const removeUser = (userId: string): { success: boolean; message?: string } => {
    const target = users.find(u => u.id === userId);
    if (!target) return { success: false, message: 'Employee not found.' };

    const remainingManagers = users.filter(u => u.role === 'SERVICE_MANAGER' && u.id !== userId);
    if (target.role === 'SERVICE_MANAGER' && remainingManagers.length === 0) {
      return { 
        success: false, 
        message: 'Cannot remove the primary Service Manager. Please add or designate another Service Manager first.' 
      };
    }

    // Unassign this user from any active repair orders
    setRepairOrders(prev => {
      const updatedROs = prev.map(ro => {
        let updated = { ...ro };
        let modified = false;
        if (ro.techId === userId) {
          updated.techId = '';
          updated.techName = '';
          updated.bay = '';
          if (updated.status === 'BEING_DIAGNOSED' || updated.status === 'IN_REPAIR') {
            updated.status = 'WAITING_DIAGNOSIS';
          }
          modified = true;
        }
        if (ro.advisorId === userId) {
          const fallbackAdvisor = users.find(u => u.id !== userId && (u.role === 'SERVICE_ADVISOR' || u.role === 'SERVICE_MANAGER'));
          if (fallbackAdvisor) {
            updated.advisorId = fallbackAdvisor.id;
            updated.advisorName = fallbackAdvisor.name;
            modified = true;
          }
        }
        if (modified) {
          syncRepairOrder(updated);
        }
        return updated;
      });
      return updatedROs;
    });

    setUsers(prev => {
      const filtered = prev.filter(u => u.id !== userId);
      try {
        localStorage.setItem(STORAGE_KEY_USERS, JSON.stringify(filtered));
      } catch {
        // ignore
      }
      return filtered;
    });
    deleteUserDoc(userId);

    if (currentUser.id === userId || (target && currentUser.email && target.email && currentUser.email.toLowerCase() === target.email.toLowerCase())) {
      const fallbackUser = remainingManagers[0] || users.find(u => u.id !== userId) || INITIAL_USERS[0];
      setCurrentUserState(fallbackUser);
      try {
        localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(fallbackUser));
      } catch {
        // ignore
      }
    }

    return { success: true };
  };

  // Delete a repair order (Restricted to Service Manager)
  const deleteRepairOrder = (roId: string): boolean => {
    if (currentUser.role !== 'SERVICE_MANAGER') {
      alert('Permission Denied: Only the Service Manager has permission to delete repair orders.');
      return false;
    }
    setRepairOrders(prev => {
      const updated = prev.filter(r => r.id !== roId);
      try {
        localStorage.setItem(STORAGE_KEY_ROS, JSON.stringify(updated));
      } catch {
        // ignore
      }
      return updated;
    });
    if (selectedROId === roId) {
      setSelectedROId(null);
    }
    deleteRepairOrderDoc(roId);
    return true;
  };

  // Update core entered repair order details (Service Manager & Advisor)
  const updateRepairOrderDetails = (
    roId: string, 
    updates: Partial<RepairOrder>,
    options?: { isAutoSave?: boolean }
  ): boolean => {
    const canEdit = currentUser.role === 'SERVICE_MANAGER' || currentUser.role === 'SERVICE_ADVISOR';
    if (!canEdit) {
      if (!options?.isAutoSave) {
        alert('Permission Denied: Only the Service Manager or Service Advisor has permission to modify core repair order records.');
      }
      return false;
    }
    setRepairOrders(prev => {
      const updated = prev.map(ro => {
        if (ro.id === roId) {
          const isAutoSave = options?.isAutoSave ?? false;
          const lastHist = ro.history[ro.history.length - 1];
          const isRecentSame = lastHist && 
            lastHist.updatedBy === currentUser.id && 
            lastHist.notes.includes('core records') &&
            (Date.now() - new Date(lastHist.timestamp).getTime() < 120000);

          let updatedQuote = ro.quote;
          if (updates.isTaxExempt !== undefined && ro.quote) {
            const nextIsTaxExempt = !!updates.isTaxExempt;
            const q = ro.quote;
            const curLaborCost = Number((q.totalLaborCost || 0).toFixed(2));
            const curPartsCost = Number((q.totalPartsCost || 0).toFixed(2));
            const curShopSupplies = Number((q.shopSuppliesFee || 0).toFixed(2));
            const newTaxRate = nextIsTaxExempt ? 0 : 0.07;
            const taxableAmount = curLaborCost + curPartsCost;
            const newTaxAmount = nextIsTaxExempt ? 0 : Number((taxableAmount * 0.07).toFixed(2));
            const newGrandTotal = Number((curLaborCost + curPartsCost + curShopSupplies + newTaxAmount).toFixed(2));
            updatedQuote = {
              ...q,
              isTaxExempt: nextIsTaxExempt,
              taxRate: newTaxRate,
              taxAmount: newTaxAmount,
              grandTotal: newGrandTotal,
              updatedAt: new Date().toISOString(),
            };
          }

          const newHistory = isAutoSave && isRecentSame
            ? ro.history
            : [
                ...ro.history,
                {
                  id: `hist-${Date.now()}`,
                  status: ro.status,
                  updatedBy: currentUser.id,
                  updatedByName: currentUser.name,
                  userRole: currentUser.role,
                  timestamp: new Date().toISOString(),
                  notes: `${currentUser.name} (${currentUser.role.replace(/_/g, ' ')}) ${isAutoSave ? 'auto-saved' : 'updated'} records (${Object.keys(updates).join(', ')})`
                }
              ];

          const updatedRO = {
            ...ro,
            ...updates,
            quote: updatedQuote,
            history: newHistory
          };
          syncRepairOrder(updatedRO);
          return updatedRO;
        }
        return ro;
      });
      try {
        localStorage.setItem(STORAGE_KEY_ROS, JSON.stringify(updated));
      } catch {
        // ignore
      }
      return updated;
    });
    return true;
  };

  // Customer Tax Exemption Toggle (Advisors & Managers)
  const toggleCustomerTaxExempt = (roId: string, taxExemptNumber?: string): boolean => {
    const targetRO = repairOrders.find(r => r.id === roId);
    if (!targetRO) return false;

    const nextIsTaxExempt = !targetRO.isTaxExempt;
    const nextTaxNumber = taxExemptNumber !== undefined ? taxExemptNumber : targetRO.taxExemptNumber;

    let updatedQuote = targetRO.quote;
    if (targetRO.quote) {
      const q = targetRO.quote;
      const curLaborCost = Number((q.totalLaborCost || 0).toFixed(2));
      const curPartsCost = Number((q.totalPartsCost || 0).toFixed(2));
      const curShopSupplies = Number((q.shopSuppliesFee || 0).toFixed(2));
      
      const newTaxRate = nextIsTaxExempt ? 0 : 0.07;
      const taxableAmount = curLaborCost + curPartsCost;
      const newTaxAmount = nextIsTaxExempt ? 0 : Number((taxableAmount * 0.07).toFixed(2));
      const newGrandTotal = Number((curLaborCost + curPartsCost + curShopSupplies + newTaxAmount).toFixed(2));

      updatedQuote = {
        ...q,
        isTaxExempt: nextIsTaxExempt,
        taxExemptNumber: nextTaxNumber,
        taxRate: newTaxRate,
        taxAmount: newTaxAmount,
        grandTotal: newGrandTotal,
        updatedAt: new Date().toISOString(),
      };
    }

    const updatedRO: RepairOrder = {
      ...targetRO,
      isTaxExempt: nextIsTaxExempt,
      taxExemptNumber: nextTaxNumber,
      quote: updatedQuote,
      history: [
        ...targetRO.history,
        {
          id: `hist-${Date.now()}`,
          status: targetRO.status,
          updatedBy: currentUser.id,
          updatedByName: currentUser.name,
          userRole: currentUser.role,
          timestamp: new Date().toISOString(),
          notes: `${currentUser.name} marked customer as ${nextIsTaxExempt ? 'Tax Exempt (0% sales tax)' : 'Taxable (7% sales tax)'}${nextTaxNumber ? ` [Cert #${nextTaxNumber}]` : ''}.`,
        }
      ]
    };

    setRepairOrders(prev => {
      const updated = prev.map(ro => ro.id === roId ? updatedRO : ro);
      try {
        localStorage.setItem(STORAGE_KEY_ROS, JSON.stringify(updated));
      } catch {
        // ignore
      }
      return updated;
    });

    syncRepairOrder(updatedRO);
    return true;
  };

  // Vehicle Photos Management (Advisor Desk / Walkaround / Tablet)
  const addVehiclePhoto = (roId: string, photo: VehiclePhoto): boolean => {
    const targetRO = repairOrders.find(r => r.id === roId);
    if (!targetRO) return false;

    const currentPhotos = targetRO.vehiclePhotos || [];
    const updatedPhotos = [photo, ...currentPhotos];

    const updatedRO: RepairOrder = {
      ...targetRO,
      vehiclePhotos: updatedPhotos,
      history: [
        ...targetRO.history,
        {
          id: `hist-${Date.now()}`,
          status: targetRO.status,
          updatedBy: currentUser.id,
          updatedByName: currentUser.name,
          userRole: currentUser.role,
          timestamp: new Date().toISOString(),
          notes: `${currentUser.name} (${currentUser.role.replace(/_/g, ' ')}) attached vehicle photo (${photo.caption || 'Vehicle Intake'}).`,
        }
      ]
    };

    setRepairOrders(prev => {
      const updated = prev.map(ro => ro.id === roId ? updatedRO : ro);
      try {
        localStorage.setItem(STORAGE_KEY_ROS, JSON.stringify(updated));
      } catch {
        // ignore
      }
      return updated;
    });

    syncRepairOrder(updatedRO);
    return true;
  };

  const deleteVehiclePhoto = (roId: string, photoId: string): boolean => {
    const targetRO = repairOrders.find(r => r.id === roId);
    if (!targetRO) return false;

    const currentPhotos = targetRO.vehiclePhotos || [];
    const updatedPhotos = currentPhotos.filter(p => p.id !== photoId);

    const updatedRO: RepairOrder = {
      ...targetRO,
      vehiclePhotos: updatedPhotos,
      history: [
        ...targetRO.history,
        {
          id: `hist-${Date.now()}`,
          status: targetRO.status,
          updatedBy: currentUser.id,
          updatedByName: currentUser.name,
          userRole: currentUser.role,
          timestamp: new Date().toISOString(),
          notes: `${currentUser.name} removed vehicle photo.`,
        }
      ]
    };

    setRepairOrders(prev => {
      const updated = prev.map(ro => ro.id === roId ? updatedRO : ro);
      try {
        localStorage.setItem(STORAGE_KEY_ROS, JSON.stringify(updated));
      } catch {
        // ignore
      }
      return updated;
    });

    syncRepairOrder(updatedRO);
    return true;
  };

  // Line-Specific Concern Photos Management (Take photo on each line, attach & view)
  const addLinePhoto = (roId: string, photo: LinePhoto): boolean => {
    const targetRO = repairOrders.find(r => r.id === roId);
    if (!targetRO) return false;

    const currentPhotos = targetRO.linePhotos || [];
    const updatedPhotos = [photo, ...currentPhotos];

    const updatedRO: RepairOrder = {
      ...targetRO,
      linePhotos: updatedPhotos,
      history: [
        ...targetRO.history,
        {
          id: `hist-${Date.now()}`,
          status: targetRO.status,
          updatedBy: currentUser.id,
          updatedByName: currentUser.name,
          userRole: currentUser.role,
          timestamp: new Date().toISOString(),
          notes: `${currentUser.name} (${currentUser.role.replace(/_/g, ' ')}) attached photo to Line ${photo.roLineNumber}${photo.caption ? `: "${photo.caption}"` : ''}.`,
        }
      ]
    };

    setRepairOrders(prev => {
      const updated = prev.map(ro => ro.id === roId ? updatedRO : ro);
      try {
        localStorage.setItem(STORAGE_KEY_ROS, JSON.stringify(updated));
      } catch {
        // ignore
      }
      return updated;
    });

    syncRepairOrder(updatedRO);
    return true;
  };

  const deleteLinePhoto = (roId: string, photoId: string): boolean => {
    const targetRO = repairOrders.find(r => r.id === roId);
    if (!targetRO) return false;

    const currentPhotos = targetRO.linePhotos || [];
    const removedPhoto = currentPhotos.find(p => p.id === photoId);
    const updatedPhotos = currentPhotos.filter(p => p.id !== photoId);

    const updatedRO: RepairOrder = {
      ...targetRO,
      linePhotos: updatedPhotos,
      history: [
        ...targetRO.history,
        {
          id: `hist-${Date.now()}`,
          status: targetRO.status,
          updatedBy: currentUser.id,
          updatedByName: currentUser.name,
          userRole: currentUser.role,
          timestamp: new Date().toISOString(),
          notes: `${currentUser.name} removed photo from Line ${removedPhoto?.roLineNumber || ''}.`,
        }
      ]
    };

    setRepairOrders(prev => {
      const updated = prev.map(ro => ro.id === roId ? updatedRO : ro);
      try {
        localStorage.setItem(STORAGE_KEY_ROS, JSON.stringify(updated));
      } catch {
        // ignore
      }
      return updated;
    });

    syncRepairOrder(updatedRO);
    return true;
  };

  const updateLinePhotoCaption = (roId: string, photoId: string, caption: string): boolean => {
    const targetRO = repairOrders.find(r => r.id === roId);
    if (!targetRO) return false;

    const currentPhotos = targetRO.linePhotos || [];
    const updatedPhotos = currentPhotos.map(p => p.id === photoId ? { ...p, caption } : p);

    const updatedRO: RepairOrder = {
      ...targetRO,
      linePhotos: updatedPhotos,
    };

    setRepairOrders(prev => {
      const updated = prev.map(ro => ro.id === roId ? updatedRO : ro);
      try {
        localStorage.setItem(STORAGE_KEY_ROS, JSON.stringify(updated));
      } catch {
        // ignore
      }
      return updated;
    });

    syncRepairOrder(updatedRO);
    return true;
  };

  // Technician & Staff: Update Cause & Correction for diagnostic & repair documentation
  const updateTechCauseAndCorrection = (
    roId: string, 
    cause: string, 
    correction: string,
    options?: { isAutoSave?: boolean; notify?: boolean; concernCauses?: string[]; concernCorrections?: string[] }
  ): boolean => {
    const targetRO = repairOrders.find(r => r.id === roId);
    if (!targetRO) return false;

    const isAutoSave = options?.isAutoSave ?? false;
    // CRITICAL: When auto-saving while typing, do NOT strip trailing whitespace/spaces,
    // so pressing the spacebar does not snap the cursor back to the end of the previous word!
    const effectiveCause = isAutoSave ? cause : cause.trim();
    const effectiveCorrection = isAutoSave ? correction : correction.trim();

    const effectiveConcernCauses = options?.concernCauses;
    const effectiveConcernCorrections = options?.concernCorrections;

    const causesChanged = effectiveConcernCauses !== undefined && 
      JSON.stringify(effectiveConcernCauses) !== JSON.stringify(targetRO.concernCauses || []);
    const correctionsChanged = effectiveConcernCorrections !== undefined && 
      JSON.stringify(effectiveConcernCorrections) !== JSON.stringify(targetRO.concernCorrections || []);

    // If nothing changed, return true without doing redundant work
    if (
      targetRO.cause === effectiveCause && 
      targetRO.correction === effectiveCorrection &&
      !causesChanged &&
      !correctionsChanged
    ) {
      return true;
    }

    const shouldNotify = options?.notify ?? (!isAutoSave);

    const now = new Date().toISOString();
    const lastHist = targetRO.history[targetRO.history.length - 1];
    const isRecentSame = lastHist && 
      lastHist.updatedBy === currentUser.id && 
      lastHist.notes.includes('Cause & Correction') &&
      (Date.now() - new Date(lastHist.timestamp).getTime() < 120000);

    const newHistoryItem = {
      id: `hist_${Date.now()}`,
      status: targetRO.status,
      updatedBy: currentUser.id,
      updatedByName: currentUser.name,
      userRole: currentUser.role,
      timestamp: now,
      notes: `${currentUser.name} (${currentUser.role.replace(/_/g, ' ')}) ${isAutoSave ? 'auto-saved' : 'updated'} Cause & Correction documentation`,
    };

    const newHistory = isAutoSave && isRecentSame
      ? targetRO.history
      : [...targetRO.history, newHistoryItem];

    const updatedRO: RepairOrder = {
      ...targetRO,
      cause: effectiveCause,
      correction: effectiveCorrection,
      concernCauses: effectiveConcernCauses !== undefined ? effectiveConcernCauses : targetRO.concernCauses,
      concernCorrections: effectiveConcernCorrections !== undefined ? effectiveConcernCorrections : targetRO.concernCorrections,
      // For backwards compatibility, sync diagnosticNotes if empty
      diagnosticNotes: effectiveCause || targetRO.diagnosticNotes,
      history: newHistory
    };

    setRepairOrders(prev => {
      const updated = prev.map(ro => ro.id === roId ? updatedRO : ro);
      try {
        localStorage.setItem(STORAGE_KEY_ROS, JSON.stringify(updated));
      } catch {
        // ignore
      }
      return updated;
    });

    syncRepairOrder(updatedRO);

    // Notify team if requested or manual save
    if (shouldNotify) {
      triggerNotification(
        updatedRO,
        `Cause & Correction Updated`,
        `${currentUser.name} documented Cause & Correction on RO #${targetRO.id}`,
        false,
        'STATUS_CHANGE'
      );
    }

    return true;
  };

  // Add a new customer complaint / additional concern found line to an open or dispatched repair order
  const addRepairOrderConcern = (
    roId: string, 
    concernText: string, 
    payType: ConcernPayType = 'CUSTOMER_PAY', 
    techId?: string, 
    techName?: string,
    initialLaborHours?: number | string
  ): boolean => {
    const cleanConcern = concernText.trim();
    if (!cleanConcern) return false;

    let updatedRO: RepairOrder | null = null;
    setRepairOrders(prev => {
      const updated = prev.map(ro => {
        if (ro.id === roId) {
          const currentConcerns = ro.concerns && ro.concerns.length > 0 ? [...ro.concerns] : [ro.primaryConcern || 'General Service'];
          const currentPayTypes = ro.concernPayTypes && ro.concernPayTypes.length >= currentConcerns.length
            ? [...ro.concernPayTypes]
            : currentConcerns.map((_, i) => ro.concernPayTypes?.[i] || 'CUSTOMER_PAY');
          const currentTechIds = ro.concernTechIds && ro.concernTechIds.length >= currentConcerns.length
            ? [...ro.concernTechIds]
            : currentConcerns.map((_, i) => ro.concernTechIds?.[i] || ro.techId);
          const currentTechNames = ro.concernTechNames && ro.concernTechNames.length >= currentConcerns.length
            ? [...ro.concernTechNames]
            : currentConcerns.map((_, i) => ro.concernTechNames?.[i] || ro.techName);

          const finalTechId = techId || (currentUser.role === 'TECHNICIAN' ? currentUser.id : ro.techId);
          const finalTechName = techName || (techId ? users.find(u => u.id === techId)?.name : (currentUser.role === 'TECHNICIAN' ? currentUser.name : ro.techName));

          currentConcerns.push(cleanConcern);
          currentPayTypes.push(payType);
          currentTechIds.push(finalTechId);
          currentTechNames.push(finalTechName);

          const historyItem = {
            id: `hist_${Date.now()}`,
            status: ro.status,
            updatedBy: currentUser.id,
            updatedByName: currentUser.name,
            userRole: currentUser.role,
            timestamp: new Date().toISOString(),
            notes: `${currentUser.name} (${currentUser.role.replace(/_/g, ' ')}) added ${currentUser.role === 'TECHNICIAN' ? 'Additional Concern Found' : 'Customer Complaint'} Line ${currentConcerns.length}: "${cleanConcern}" (${payType.replace(/_/g, ' ')})`
          };

          const currentCauses = ro.concernCauses ? [...ro.concernCauses, ''] : undefined;
          const currentCorrections = ro.concernCorrections ? [...ro.concernCorrections, ''] : undefined;

          // Mirror into quote (create if doesn't exist, or update existing)
          const lineNum = currentConcerns.length;
          const lineRate = PAY_TYPE_RATES[payType] || ro.quote?.defaultLaborRate || 165.00;
          const parsedHours = (initialLaborHours !== undefined && initialLaborHours !== null && initialLaborHours !== '')
            ? Math.max(0, Number(initialLaborHours) || 0)
            : 0;
          const subtotal = Number((parsedHours * lineRate).toFixed(2));

          const newLaborItem: LaborLineItem = {
            id: `labor_${Date.now()}_ro_${lineNum}`,
            description: `Concern: ${cleanConcern}`,
            laborHours: parsedHours > 0 ? parsedHours : 0,
            hourlyRate: lineRate,
            subtotal,
            payType,
            roLineNumber: lineNum,
            concernText: cleanConcern,
            correctionText: '',
            addedByAdvisor: false,
          };

          let nextQuote: RepairQuote;
          if (ro.quote) {
            const existingItems = ro.quote.laborItems || [];
            const allItems = [...existingItems, newLaborItem];
            const totalLaborHours = Number(allItems.reduce((acc, l) => acc + (Number(l.laborHours) || 0), 0).toFixed(1));
            const totalLaborCost = Number(allItems.reduce((acc, l) => acc + (Number(l.subtotal) || 0), 0).toFixed(2));
            const totalPartsCost = ro.quote.totalPartsCost || 0;
            const shouldApplySupplies = ro.quote.applyShopSupplies !== false;
            const fivePercent = totalLaborCost * 0.05;
            const shopSuppliesFee = shouldApplySupplies
              ? Number((fivePercent > 0 ? Math.min(Math.max(fivePercent, 15), 35) : (ro.quote.shopSuppliesFee && ro.quote.shopSuppliesFee > 0 ? Math.min(ro.quote.shopSuppliesFee, 35) : 25)).toFixed(2))
              : 0;
            const isExempt = ro.isTaxExempt || ro.quote.isTaxExempt;
            const taxRate = isExempt ? 0 : (ro.quote.taxRate !== undefined ? ro.quote.taxRate : 0.07);
            const taxableAmount = totalLaborCost + totalPartsCost;
            const taxAmount = isExempt ? 0 : Number((taxableAmount * taxRate).toFixed(2));
            const grandTotal = Number((totalLaborCost + totalPartsCost + shopSuppliesFee + taxAmount).toFixed(2));

            nextQuote = {
              ...ro.quote,
              applyShopSupplies: shouldApplySupplies,
              shopSuppliesFee,
              laborItems: allItems,
              totalLaborHours,
              totalLaborCost,
              taxAmount,
              grandTotal,
              updatedAt: new Date().toISOString(),
            };
          } else {
            // Build fresh quote mirroring all lines up to lineNum
            const mirroredItems: LaborLineItem[] = currentConcerns.map((c, i) => {
              const pType = currentPayTypes[i] || 'CUSTOMER_PAY';
              const pRate = PAY_TYPE_RATES[pType] || 165.00;
              const pHours = i === lineNum - 1 ? parsedHours : 0;
              return {
                id: `labor_${Date.now()}_ro_${i + 1}`,
                description: `Concern: ${c}`,
                laborHours: pHours,
                hourlyRate: pRate,
                subtotal: Number((pHours * pRate).toFixed(2)),
                payType: pType,
                roLineNumber: i + 1,
                concernText: c,
                correctionText: '',
                addedByAdvisor: false,
                status: 'PENDING'
              };
            });
            const totalLaborHours = Number(mirroredItems.reduce((acc, l) => acc + (Number(l.laborHours) || 0), 0).toFixed(1));
            const totalLaborCost = Number(mirroredItems.reduce((acc, l) => acc + (Number(l.subtotal) || 0), 0).toFixed(2));
            const isExempt = ro.isTaxExempt || false;
            const taxRate = isExempt ? 0 : 0.07;
            const fivePercent = totalLaborCost * 0.05;
            const calcSupplies = Number((fivePercent > 0 ? Math.min(Math.max(fivePercent, 15), 35) : 25).toFixed(2));
            const grandTotal = Number((totalLaborCost + calcSupplies).toFixed(2));

            nextQuote = {
              id: `quote_${Date.now()}`,
              roId: ro.id,
              status: 'DRAFT',
              laborItems: mirroredItems,
              partsItems: [],
              totalLaborHours,
              totalLaborCost,
              totalPartsCost: 0,
              applyShopSupplies: true,
              shopSuppliesFee: calcSupplies,
              isTaxExempt: isExempt,
              taxRate,
              taxAmount: 0,
              grandTotal,
              defaultLaborRate: lineRate,
              payType,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              initiatedByTechId: currentUser.id,
              initiatedByTechName: currentUser.name,
            };
          }

          const updatedItem: RepairOrder = {
            ...ro,
            concerns: currentConcerns,
            concernPayTypes: currentPayTypes,
            concernTechIds: currentTechIds,
            concernTechNames: currentTechNames,
            concernCauses: currentCauses,
            concernCorrections: currentCorrections,
            quote: nextQuote,
            history: [...ro.history, historyItem]
          };
          updatedRO = updatedItem;
          return updatedItem;
        }
        return ro;
      });

      try {
        localStorage.setItem(STORAGE_KEY_ROS, JSON.stringify(updated));
      } catch {
        // ignore
      }
      return updated;
    });

    if (updatedRO) {
      syncRepairOrder(updatedRO);
      triggerNotification(
        updatedRO,
        'New Customer Complaint Added',
        `${currentUser.name} added complaint line to RO #${updatedRO.id || roId}: "${cleanConcern}"`,
        false,
        'STATUS_CHANGE'
      );
    }
    return true;
  };

  // Update Pay Type for a specific customer complaint / concern line item (Customer Pay, Warranty, or Internal)
  const updateConcernPayType = (roId: string, concernIndex: number, payType: ConcernPayType): boolean => {
    if (currentUser.role !== 'SERVICE_MANAGER' && currentUser.role !== 'SERVICE_ADVISOR') {
      console.warn('Selecting Pay Type is only permitted by Service Manager and Service Advisor');
      return false;
    }
    let updatedRO: RepairOrder | null = null;
    setRepairOrders(prev => {
      const updated = prev.map(ro => {
        if (ro.id === roId) {
          const concernCount = Math.max(ro.concerns?.length || 1, concernIndex + 1);
          const currentTypes: ConcernPayType[] = ro.concernPayTypes && ro.concernPayTypes.length >= concernCount
            ? [...ro.concernPayTypes]
            : Array.from({ length: concernCount }, (_, i) => ro.concernPayTypes?.[i] || 'CUSTOMER_PAY');
          currentTypes[concernIndex] = payType;

          const updatedItem: RepairOrder = {
            ...ro,
            concernPayTypes: currentTypes
          };
          updatedRO = updatedItem;
          return updatedItem;
        }
        return ro;
      });
      try {
        localStorage.setItem(STORAGE_KEY_ROS, JSON.stringify(updated));
      } catch {
        // ignore
      }
      return updated;
    });

    if (updatedRO) {
      syncRepairOrder(updatedRO);
    }
    return true;
  };

  // Update Assigned Technician for a specific customer complaint / concern line item
  const updateConcernTech = (roId: string, concernIndex: number, techId: string, techName?: string): boolean => {
    if (currentUser.role !== 'SERVICE_MANAGER' && currentUser.role !== 'SERVICE_ADVISOR') {
      console.warn('Changing technicians is only permitted by Service Manager and Service Advisor');
      return false;
    }
    let updatedRO: RepairOrder | null = null;
    const resolvedTechName = techName || (techId ? users.find(u => u.id === techId)?.name : undefined);

    setRepairOrders(prev => {
      const updated = prev.map(ro => {
        if (ro.id === roId) {
          const concernCount = Math.max(ro.concerns?.length || 1, concernIndex + 1);

          const currentTechIds: (string | undefined)[] = ro.concernTechIds && ro.concernTechIds.length >= concernCount
            ? [...ro.concernTechIds]
            : Array.from({ length: concernCount }, (_, i) => ro.concernTechIds?.[i] || ro.techId);

          const currentTechNames: (string | undefined)[] = ro.concernTechNames && ro.concernTechNames.length >= concernCount
            ? [...ro.concernTechNames]
            : Array.from({ length: concernCount }, (_, i) => ro.concernTechNames?.[i] || ro.techName);

          currentTechIds[concernIndex] = techId || undefined;
          currentTechNames[concernIndex] = resolvedTechName || undefined;

          // If the RO has no overall tech, use this assigned tech as primary
          const fallbackTechId = ro.techId || techId || undefined;
          const fallbackTechName = ro.techName || resolvedTechName || undefined;

          const updatedItem: RepairOrder = {
            ...ro,
            techId: fallbackTechId,
            techName: fallbackTechName,
            concernTechIds: currentTechIds,
            concernTechNames: currentTechNames
          };
          updatedRO = updatedItem;
          return updatedItem;
        }
        return ro;
      });
      try {
        localStorage.setItem(STORAGE_KEY_ROS, JSON.stringify(updated));
      } catch {
        // ignore
      }
      return updated;
    });

    if (updatedRO) {
      syncRepairOrder(updatedRO);

      // Trigger notification if assigned to another technician
      if (techId && techId !== currentUser?.id) {
        const notif: UrgentNotification = {
          id: `notif_assign_${Date.now()}`,
          roId,
          roNumber: roId,
          title: `Assigned to Line ${concernIndex + 1} on RO #${roId}`,
          message: `${currentUser.name} assigned you to concern line ${concernIndex + 1}: "${updatedRO.concerns[concernIndex] || ''}"`,
          timestamp: new Date().toISOString(),
          isUrgent: false,
          type: 'STATUS_CHANGE',
          read: false,
          targetUserId: techId,
        };
        setNotifications(prev => [notif, ...prev.slice(0, 49)]);
        syncNotification(notif);
      }
    }
    return true;
  };

  // Update Customer Approval Decision (APPROVED or DECLINED) for a specific line item
  const updateConcernStatus = (roId: string, concernIndex: number, status: LineApprovalStatus): boolean => {
    let updatedRO: RepairOrder | null = null;
    const lineNum = concernIndex + 1;

    setRepairOrders(prev => {
      const updated = prev.map(ro => {
        if (ro.id === roId) {
          const concernCount = Math.max(ro.concerns?.length || 1, concernIndex + 1);

          const currentStatuses: LineApprovalStatus[] = ro.concernStatuses && ro.concernStatuses.length >= concernCount
            ? [...ro.concernStatuses]
            : Array.from({ length: concernCount }, (_, i) => ro.concernStatuses?.[i] || 'PENDING');

          currentStatuses[concernIndex] = status;

          // Update quote lineStatuses and item status if quote exists
          let nextQuote = ro.quote;
          if (nextQuote) {
            const nextLineStatuses = { ...(nextQuote.lineStatuses || {}), [lineNum]: status };
            const nextLabor = (nextQuote.laborItems || []).map(item => {
              if ((item.roLineNumber || 1) === lineNum) {
                return { ...item, status };
              }
              return item;
            });
            const nextParts = (nextQuote.partsItems || []).map(item => {
              if ((item.roLineNumber || 1) === lineNum) {
                return { ...item, status };
              }
              return item;
            });

            // Calculate approved vs declined totals
            const totalApprovedLabor = nextLabor
              .filter(l => (nextLineStatuses[l.roLineNumber || 1] || 'PENDING') !== 'DECLINED')
              .reduce((acc, l) => acc + (Number(l.subtotal) || 0), 0);
            const totalApprovedParts = nextParts
              .filter(p => (nextLineStatuses[p.roLineNumber || 1] || 'PENDING') !== 'DECLINED')
              .reduce((acc, p) => acc + (Number(p.subtotal) || 0), 0);

            const totalDeclinedLabor = nextLabor
              .filter(l => (nextLineStatuses[l.roLineNumber || 1] || 'PENDING') === 'DECLINED')
              .reduce((acc, l) => acc + (Number(l.subtotal) || 0), 0);
            const totalDeclinedParts = nextParts
              .filter(p => (nextLineStatuses[p.roLineNumber || 1] || 'PENDING') === 'DECLINED')
              .reduce((acc, p) => acc + (Number(p.subtotal) || 0), 0);

            nextQuote = {
              ...nextQuote,
              lineStatuses: nextLineStatuses,
              laborItems: nextLabor,
              partsItems: nextParts,
              totalApprovedAmount: Number((totalApprovedLabor + totalApprovedParts).toFixed(2)),
              totalDeclinedAmount: Number((totalDeclinedLabor + totalDeclinedParts).toFixed(2)),
              updatedAt: new Date().toISOString()
            };
          }

          const updatedItem: RepairOrder = {
            ...ro,
            concernStatuses: currentStatuses,
            quote: nextQuote
          };
          updatedRO = updatedItem;
          return updatedItem;
        }
        return ro;
      });
      try {
        localStorage.setItem(STORAGE_KEY_ROS, JSON.stringify(updated));
      } catch {
        // ignore
      }
      return updated;
    });

    if (updatedRO) {
      syncRepairOrder(updatedRO);
    }
    return true;
  };

  // Technician Request Additional Services (MPI Findings: Air filter, cabin air filter, tires, scheduled maint, etc.)
  const addRecommendedService = (roId: string, item: {
    serviceName: string;
    category?: RecommendedService['category'];
    urgency: 'SAFETY' | 'RECOMMENDED';
    notes?: string;
    cause?: string;
    correction?: string;
    laborHours?: number;
    payType?: ConcernPayType;
    inspectionItemId?: string;
  }): boolean => {
    const targetRO = repairOrders.find(r => r.id === roId);
    if (!targetRO) return false;

    const trimmedName = item.serviceName.trim();
    if (!trimmedName) return false;

    let syncedRO: RepairOrder | null = null;
    let createdRec: RecommendedService | null = null;

    setRepairOrders(prev => {
      const targetRO = prev.find(r => r.id === roId);
      if (!targetRO) return prev;

      const newRec: RecommendedService = {
        id: `rec_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        roId,
        serviceName: trimmedName,
        category: item.category || 'OTHER',
        urgency: item.urgency,
        notes: item.notes?.trim() || undefined,
        cause: item.cause?.trim() || undefined,
        correction: item.correction?.trim() || undefined,
        laborHours: item.laborHours !== undefined ? Number(item.laborHours) : undefined,
        payType: item.payType || 'CUSTOMER_PAY',
        techId: currentUser.id,
        techName: currentUser.name,
        inspectionItemId: item.inspectionItemId,
        status: 'PENDING',
        requestedByTechId: currentUser.id,
        requestedByTechName: currentUser.name,
        requestedAt: new Date().toISOString(),
      };

      const existingRecs = targetRO.recommendations || [];
      const updatedRecs = [...existingRecs, newRec];

      const updatedRO: RepairOrder = {
        ...targetRO,
        recommendations: updatedRecs,
      };

      createdRec = newRec;
      syncedRO = updatedRO;

      const updated = prev.map(r => r.id === roId ? updatedRO : r);
      try {
        localStorage.setItem(STORAGE_KEY_ROS, JSON.stringify(updated));
      } catch {
        // ignore
      }
      return updated;
    });

    if (syncedRO && createdRec) {
      syncRepairOrder(syncedRO);
      triggerNotification(
        syncedRO,
        `Tech Rec: ${(createdRec as RecommendedService).serviceName}`,
        `Tech ${currentUser.name} requested "${(createdRec as RecommendedService).serviceName}" (${(createdRec as RecommendedService).urgency === 'SAFETY' ? 'Immediate Safety Concern' : 'Recommended Maintenance'}). Advisor authorization needed.`,
        (createdRec as RecommendedService).urgency === 'SAFETY',
        'RECOMMENDED_SERVICE'
      );
      return true;
    }

    return false;
  };

  // Update existing recommended service (labor hours, cause, correction, pay type, notes, etc.)
  const updateRecommendedService = (
    roId: string, 
    recId: string, 
    updates: Partial<RecommendedService>
  ): boolean => {
    let syncedRO: RepairOrder | null = null;

    setRepairOrders(prev => {
      const targetRO = prev.find(r => r.id === roId);
      if (!targetRO || !targetRO.recommendations) return prev;

      const updatedRecs = targetRO.recommendations.map(rec => {
        if (rec.id !== recId) return rec;
        return {
          ...rec,
          ...updates,
        };
      });

      const updatedRO: RepairOrder = {
        ...targetRO,
        recommendations: updatedRecs,
      };

      syncedRO = updatedRO;

      const updated = prev.map(r => r.id === roId ? updatedRO : r);
      try {
        localStorage.setItem(STORAGE_KEY_ROS, JSON.stringify(updated));
      } catch {
        // ignore
      }
      return updated;
    });

    if (syncedRO) {
      syncRepairOrder(syncedRO);
      return true;
    }
    return false;
  };

  // Delete a recommended service from RO
  const deleteRecommendedService = (roId: string, recId: string): boolean => {
    let syncedRO: RepairOrder | null = null;

    setRepairOrders(prev => {
      const targetRO = prev.find(r => r.id === roId);
      if (!targetRO || !targetRO.recommendations) return prev;

      const updatedRecs = targetRO.recommendations.filter(rec => rec.id !== recId);

      // Also clean up any inspection items that referenced this recommendationId
      let updatedInspection = targetRO.inspection;
      if (targetRO.inspection && targetRO.inspection.items) {
        const newItems = { ...targetRO.inspection.items };
        let changed = false;
        Object.keys(newItems).forEach(k => {
          if (newItems[k].recommendationId === recId) {
            newItems[k] = {
              ...newItems[k],
              recommendationId: undefined,
            };
            changed = true;
          }
        });
        if (changed) {
          updatedInspection = {
            ...targetRO.inspection,
            items: newItems,
          };
        }
      }

      const updatedRO: RepairOrder = {
        ...targetRO,
        inspection: updatedInspection,
        recommendations: updatedRecs,
      };

      syncedRO = updatedRO;

      const updated = prev.map(r => r.id === roId ? updatedRO : r);
      try {
        localStorage.setItem(STORAGE_KEY_ROS, JSON.stringify(updated));
      } catch {
        // ignore
      }
      return updated;
    });

    if (syncedRO) {
      syncRepairOrder(syncedRO);
      return true;
    }
    return false;
  };

  // Service Advisor & Manager: Review & Update Tech Recommended Service (Approve or Decline)
  const updateRecommendedServiceStatus = (
    roId: string, 
    recId: string, 
    status: 'APPROVED' | 'DECLINED', 
    declinedReason?: string
  ): boolean => {
    const targetRO = repairOrders.find(r => r.id === roId);
    if (!targetRO || !targetRO.recommendations) return false;

    const now = new Date().toISOString();
    const targetRec = targetRO.recommendations.find(rec => rec.id === recId);
    if (!targetRec) return false;

    const updatedRecs = targetRO.recommendations.map(rec => {
      if (rec.id !== recId) return rec;
      return {
        ...rec,
        status,
        reviewedByAdvisorId: currentUser.id,
        reviewedByAdvisorName: currentUser.name,
        reviewedAt: now,
        declinedReason: status === 'DECLINED' ? (declinedReason || 'Declined by customer') : undefined,
      };
    });

    // If approved by advisor/customer, append to concerns list if not already present
    let updatedConcerns = targetRO.concerns ? [...targetRO.concerns] : (targetRO.primaryConcern ? [targetRO.primaryConcern] : []);
    if (status === 'APPROVED' && !updatedConcerns.includes(targetRec.serviceName)) {
      updatedConcerns.push(targetRec.serviceName);
    }

    const updatedRO: RepairOrder = {
      ...targetRO,
      concerns: updatedConcerns,
      recommendations: updatedRecs,
    };

    setRepairOrders(prev => {
      const updated = prev.map(r => r.id === roId ? updatedRO : r);
      try {
        localStorage.setItem(STORAGE_KEY_ROS, JSON.stringify(updated));
      } catch {
        // ignore
      }
      return updated;
    });

    syncRepairOrder(updatedRO);

    triggerNotification(
      updatedRO,
      status === 'APPROVED' ? `Service Approved: ${targetRec.serviceName}` : `Service Declined: ${targetRec.serviceName}`,
      status === 'APPROVED' 
        ? `Customer authorized "${targetRec.serviceName}". Work added to repair scope.`
        : `Customer declined "${targetRec.serviceName}".`,
      false,
      'RECOMMENDED_SERVICE'
    );

    return true;
  };

  // 21-Point Multi-Point Inspection (MPI) Actions
  const updateInspectionChecklist = useCallback((items: InspectionChecklistItem[]) => {
    setInspectionChecklist(items);
    try {
      localStorage.setItem(STORAGE_KEY_INSPECTION_CHECKLIST, JSON.stringify(items));
    } catch {
      // ignore
    }
    syncShopSettings({ inspectionChecklist: items });
  }, []);

  const resetInspectionChecklistToDefaults = useCallback(() => {
    setInspectionChecklist(DEFAULT_INSPECTION_CHECKLIST);
    try {
      localStorage.setItem(STORAGE_KEY_INSPECTION_CHECKLIST, JSON.stringify(DEFAULT_INSPECTION_CHECKLIST));
    } catch {
      // ignore
    }
    syncShopSettings({ inspectionChecklist: DEFAULT_INSPECTION_CHECKLIST });
  }, []);

  const setInspectionItemResult = useCallback((
    roId: string, 
    itemId: string, 
    itemResult: Partial<InspectionResultItem>
  ) => {
    let syncedRO: RepairOrder | null = null;

    setRepairOrders(prev => {
      const targetRO = prev.find(r => r.id === roId);
      if (!targetRO) return prev;

      const currentSheet: InspectionSheet = targetRO.inspection || {
        id: `insp_${roId}_${Date.now()}`,
        roId,
        items: {},
      };

      const checklistItem = inspectionChecklist.find(i => i.id === itemId);
      const existingItem = currentSheet.items[itemId] || {
        itemId,
        name: checklistItem?.name || itemId,
        category: checklistItem?.category || 'UNDER_HOOD',
        status: 'PASSED',
      };

      const updatedItem: InspectionResultItem = {
        ...existingItem,
        ...itemResult,
      };

      const updatedSheet: InspectionSheet = {
        ...currentSheet,
        items: {
          ...currentSheet.items,
          [itemId]: updatedItem,
        },
        completedByTechId: currentUser.id,
        completedByTechName: currentUser.name,
        completedAt: new Date().toISOString(),
      };

      // If status is changed to PASSED or NOT_APPLICABLE, remove any auto-generated recommendation line for this inspection item
      let updatedRecommendations = targetRO.recommendations ? [...targetRO.recommendations] : [];
      if (updatedItem.status === 'PASSED' || updatedItem.status === 'NOT_APPLICABLE') {
        updatedRecommendations = updatedRecommendations.filter(r => {
          if (r.inspectionItemId && r.inspectionItemId === itemId) return false;
          if (updatedItem.recommendationId && r.id === updatedItem.recommendationId) return false;
          return true;
        });
        updatedItem.recommendationId = undefined;
      } else if (
        updatedItem.status === 'IMMEDIATE_ATTENTION' || updatedItem.status === 'FUTURE_ATTENTION'
      ) {
        const urgency = updatedItem.status === 'IMMEDIATE_ATTENTION' ? 'SAFETY' : 'RECOMMENDED';
        const existingRecIdx = updatedRecommendations.findIndex(r => 
          (r.inspectionItemId && r.inspectionItemId === itemId) || 
          (updatedItem.recommendationId && r.id === updatedItem.recommendationId) ||
          r.serviceName.toLowerCase() === (checklistItem?.defaultRecommendationName || updatedItem.name).toLowerCase()
        );
        const recName = checklistItem?.defaultRecommendationName || updatedItem.name;
        const defaultCause = updatedItem.status === 'IMMEDIATE_ATTENTION'
          ? `${updatedItem.name} inspected: Immediate safety concern / mechanical failure identified.`
          : `${updatedItem.name} inspected: Future maintenance / attention recommended.`;

        const recNotes = [
          updatedItem.cause ? `Cause: ${updatedItem.cause}` : '',
          updatedItem.correction ? `Correction: ${updatedItem.correction}` : '',
          updatedItem.notes ? `Notes: ${updatedItem.notes}` : '',
          updatedItem.measurementValue ? `Measurement: ${updatedItem.measurementValue}` : '',
        ].filter(Boolean).join(' | ');

        if (existingRecIdx >= 0) {
          updatedRecommendations[existingRecIdx] = {
            ...updatedRecommendations[existingRecIdx],
            serviceName: updatedRecommendations[existingRecIdx].serviceName || recName,
            urgency,
            notes: recNotes || updatedRecommendations[existingRecIdx].notes,
            inspectionItemId: itemId,
          };
          updatedItem.recommendationId = updatedRecommendations[existingRecIdx].id;
        } else {
          const newRecId = `rec_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
          updatedRecommendations.push({
            id: newRecId,
            roId,
            serviceName: recName,
            category: updatedItem.category === 'TIRES_WHEELS' ? 'TIRES' : updatedItem.category === 'BRAKES_SUSPENSION' ? 'BRAKES' : 'OTHER',
            urgency,
            notes: recNotes || undefined,
            cause: defaultCause,
            correction: `Perform ${recName}`,
            laborHours: updatedItem.category === 'TIRES_WHEELS' ? 1.0 : updatedItem.category === 'BRAKES_SUSPENSION' ? 2.0 : 0.5,
            payType: 'CUSTOMER_PAY',
            inspectionItemId: itemId,
            status: 'PENDING',
            requestedByTechId: currentUser.id,
            requestedByTechName: currentUser.name,
            requestedAt: new Date().toISOString(),
          });
          updatedItem.recommendationId = newRecId;
        }
      }

      const updatedRO: RepairOrder = {
        ...targetRO,
        inspection: updatedSheet,
        recommendations: updatedRecommendations,
      };

      syncedRO = updatedRO;

      const updated = prev.map(r => r.id === roId ? updatedRO : r);
      try {
        localStorage.setItem(STORAGE_KEY_ROS, JSON.stringify(updated));
      } catch {
        // ignore
      }
      return updated;
    });

    if (syncedRO) {
      syncRepairOrder(syncedRO);
    }
  }, [inspectionChecklist, currentUser]);

  const passAllInspectionItems = useCallback((roId: string) => {
    let syncedRO: RepairOrder | null = null;

    setRepairOrders(prev => {
      const targetRO = prev.find(r => r.id === roId);
      if (!targetRO) return prev;

      const currentSheet: InspectionSheet = targetRO.inspection || {
        id: `insp_${roId}_${Date.now()}`,
        roId,
        items: {},
      };

      const newItems: Record<string, InspectionResultItem> = { ...currentSheet.items };
      inspectionChecklist.filter(i => i.isEnabled !== false).forEach(item => {
        if (!newItems[item.id] || (newItems[item.id].status !== 'IMMEDIATE_ATTENTION' && newItems[item.id].status !== 'FUTURE_ATTENTION')) {
          newItems[item.id] = {
            itemId: item.id,
            name: item.name,
            category: item.category,
            status: 'PASSED',
            measurementValue: newItems[item.id]?.measurementValue,
            notes: newItems[item.id]?.notes,
          };
        }
      });

      const updatedSheet: InspectionSheet = {
        ...currentSheet,
        items: newItems,
        completedByTechId: currentUser.id,
        completedByTechName: currentUser.name,
        completedAt: new Date().toISOString(),
      };

      const updatedRO: RepairOrder = {
        ...targetRO,
        inspection: updatedSheet,
      };

      syncedRO = updatedRO;

      const updated = prev.map(r => r.id === roId ? updatedRO : r);
      try {
        localStorage.setItem(STORAGE_KEY_ROS, JSON.stringify(updated));
      } catch {
        // ignore
      }
      return updated;
    });

    if (syncedRO) {
      syncRepairOrder(syncedRO);
    }
  }, [inspectionChecklist, currentUser]);

  const resetROInspection = useCallback((roId: string) => {
    const targetRO = repairOrders.find(r => r.id === roId);
    if (!targetRO) return;

    const updatedRO: RepairOrder = {
      ...targetRO,
      inspection: undefined,
    };

    setRepairOrders(prev => {
      const updated = prev.map(r => r.id === roId ? updatedRO : r);
      try {
        localStorage.setItem(STORAGE_KEY_ROS, JSON.stringify(updated));
      } catch {
        // ignore
      }
      return updated;
    });

    syncRepairOrder(updatedRO);
  }, [repairOrders]);

  // Service Manager Staff Attendance & Calendar Actions (Manager Only)
  const addStaffLeaveEntry = useCallback((entryData: Omit<StaffLeaveEntry, 'id' | 'createdAt' | 'createdByManagerId' | 'createdByManagerName'>): boolean => {
    if (currentUser.role !== 'SERVICE_MANAGER') {
      console.warn('[StaffCalendar] Only Service Manager can add leave records');
      return false;
    }
    const newEntry: StaffLeaveEntry = {
      ...entryData,
      id: `leave_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      createdAt: new Date().toISOString(),
      createdByManagerId: currentUser.id,
      createdByManagerName: currentUser.name,
    };
    setStaffLeaveEntries(prev => {
      const updated = [newEntry, ...prev];
      try {
        localStorage.setItem(STORAGE_KEY_STAFF_LEAVE, JSON.stringify(updated));
      } catch {
        // ignore
      }
      syncShopSettings({ staffLeaveEntries: updated });
      return updated;
    });
    return true;
  }, [currentUser]);

  const updateStaffLeaveEntry = useCallback((id: string, updates: Partial<StaffLeaveEntry>): boolean => {
    if (currentUser.role !== 'SERVICE_MANAGER') return false;
    setStaffLeaveEntries(prev => {
      const updated = prev.map(e => e.id === id ? { ...e, ...updates } : e);
      try {
        localStorage.setItem(STORAGE_KEY_STAFF_LEAVE, JSON.stringify(updated));
      } catch {
        // ignore
      }
      syncShopSettings({ staffLeaveEntries: updated });
      return updated;
    });
    return true;
  }, [currentUser]);

  const deleteStaffLeaveEntry = useCallback((id: string): boolean => {
    if (currentUser.role !== 'SERVICE_MANAGER') return false;
    setStaffLeaveEntries(prev => {
      const updated = prev.filter(e => e.id !== id);
      try {
        localStorage.setItem(STORAGE_KEY_STAFF_LEAVE, JSON.stringify(updated));
      } catch {
        // ignore
      }
      syncShopSettings({ staffLeaveEntries: updated });
      return updated;
    });
    return true;
  }, [currentUser]);

  // Service Appointment Actions (Advisors & Service Manager)
  const addAppointment = useCallback((data: Omit<ServiceAppointment, 'id' | 'createdAt' | 'updatedAt'>): ServiceAppointment => {
    const newAppt: ServiceAppointment = {
      ...data,
      id: `appt_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setAppointments(prev => {
      const updated = [newAppt, ...prev];
      try {
        localStorage.setItem(STORAGE_KEY_APPOINTMENTS, JSON.stringify(updated));
      } catch {}
      syncShopSettings({ appointments: updated });
      return updated;
    });
    return newAppt;
  }, []);

  const updateAppointment = useCallback((id: string, updates: Partial<ServiceAppointment>): boolean => {
    setAppointments(prev => {
      const updated = prev.map(a => a.id === id ? { ...a, ...updates, updatedAt: new Date().toISOString() } : a);
      try {
        localStorage.setItem(STORAGE_KEY_APPOINTMENTS, JSON.stringify(updated));
      } catch {}
      syncShopSettings({ appointments: updated });
      return updated;
    });
    return true;
  }, []);

  const deleteAppointment = useCallback((id: string): boolean => {
    setAppointments(prev => {
      const updated = prev.filter(a => a.id !== id);
      try {
        localStorage.setItem(STORAGE_KEY_APPOINTMENTS, JSON.stringify(updated));
      } catch {}
      syncShopSettings({ appointments: updated });
      return updated;
    });
    return true;
  }, []);

  const clearAllAppointments = useCallback(() => {
    setAppointments([]);
    try {
      localStorage.setItem(STORAGE_KEY_APPOINTMENTS, JSON.stringify([]));
    } catch {}
    syncShopSettings({ appointments: [] });
  }, []);

  const checkInAppointment = useCallback((id: string): boolean => {
    return updateAppointment(id, { status: 'ARRIVED' });
  }, [updateAppointment]);

  const convertAppointmentToRO = useCallback((id: string): string | null => {
    const appt = appointments.find(a => a.id === id);
    if (!appt) return null;

    // If already converted, open existing RO
    if (appt.createdRoId) {
      const existing = repairOrders.find(r => r.id === appt.createdRoId);
      if (existing) {
        setSelectedRO(existing);
        return existing.id;
      }
    }

    const effectiveAdvisorId = appt.advisorId || currentUser.id;
    const effectiveAdvisorName = appt.advisorName || currentUser.name;

    const newRoId = createRepairOrder({
      customerName: appt.customerName,
      customerPhone: appt.customerPhone,
      vehicle: {
        year: Number(appt.vehicleYear) || 2022,
        make: appt.vehicleMake,
        model: appt.vehicleModel,
        vin: appt.vehicleVin || '',
        mileage: appt.vehicleMileage ? Number(appt.vehicleMileage) : undefined,
        licensePlate: appt.licensePlate,
      },
      advisorId: effectiveAdvisorId,
      advisorName: effectiveAdvisorName,
      primaryConcern: appt.serviceConcerns[0] || 'Scheduled Service Appointment',
      concerns: appt.serviceConcerns && appt.serviceConcerns.length > 0 ? appt.serviceConcerns : ['Scheduled Service Appointment'],
      isWaiter: appt.transportationType === 'WAITER',
      techId: appt.preferredTechId,
    });

    updateAppointment(id, {
      status: 'CONVERTED_TO_RO',
      createdRoId: newRoId,
    });

    // Auto-select newly created RO so it immediately opens for the user
    setSelectedROId(newRoId);

    return newRoId;
  }, [appointments, repairOrders, currentUser, createRepairOrder, setSelectedRO, updateAppointment]);

  // Technician Repair Quote Workflow
  const saveRepairQuote = (
    roId: string, 
    quote: RepairQuote, 
    submitToAdvisor: boolean = false,
    options?: { isAutoSave?: boolean; notify?: boolean }
  ): boolean => {
    const targetRO = repairOrders.find(r => r.id === roId);
    if (!targetRO) return false;

    const isAutoSave = options?.isAutoSave ?? false;
    const now = new Date().toISOString();
    const nextStatus: QuoteStatus = submitToAdvisor ? 'SUBMITTED' : (quote.status || 'DRAFT');
    
    const isExempt = targetRO.isTaxExempt || quote.isTaxExempt;
    const finalTaxRate = isExempt ? 0 : (quote.taxRate !== undefined ? quote.taxRate : 0.07);
    const taxableAmount = (Number(quote.totalLaborCost) || 0) + (Number(quote.totalPartsCost) || 0);
    const finalTaxAmount = isExempt ? 0 : Number((taxableAmount * finalTaxRate).toFixed(2));
    
    // Automatically charge Shop Supplies unless explicitly unchecked (applyShopSupplies === false)
    const shouldApplySupplies = quote.applyShopSupplies !== false;
    let finalSupplies = 0;
    if (shouldApplySupplies) {
      if (quote.shopSuppliesFee && Number(quote.shopSuppliesFee) > 0) {
        finalSupplies = Math.min(Number(quote.shopSuppliesFee), 35);
      } else {
        const labor = Number(quote.totalLaborCost) || 0;
        finalSupplies = Number((labor > 0 ? Math.min(Math.max(labor * 0.05, 15), 35) : 25).toFixed(2));
      }
    }
    const finalGrandTotal = Number(((quote.totalLaborCost || 0) + (quote.totalPartsCost || 0) + finalSupplies + finalTaxAmount).toFixed(2));

    // Calculate approved vs declined totals if lines have been reviewed
    let totalApproved = 0;
    let totalDeclined = 0;
    if (quote.lineStatuses) {
      (quote.laborItems || []).forEach(l => {
        const lNum = l.roLineNumber || 1;
        const st = quote.lineStatuses?.[lNum] || 'PENDING';
        if (st === 'DECLINED') {
          totalDeclined += Number(l.subtotal) || 0;
        } else {
          totalApproved += Number(l.subtotal) || 0;
        }
      });
      (quote.partsItems || []).forEach(p => {
        const pNum = p.roLineNumber || 1;
        const st = quote.lineStatuses?.[pNum] || 'PENDING';
        const pSub = Number(p.subtotal) || ((Number(p.unitPrice) || 0) * (Number(p.quantity) || 1));
        if (st === 'DECLINED') {
          totalDeclined += pSub;
        } else {
          totalApproved += pSub;
        }
      });
    }

    const nextQuote: RepairQuote = {
      ...quote,
      applyShopSupplies: shouldApplySupplies,
      shopSuppliesFee: finalSupplies,
      totalApprovedAmount: totalApproved > 0 ? Number(totalApproved.toFixed(2)) : undefined,
      totalDeclinedAmount: totalDeclined > 0 ? Number(totalDeclined.toFixed(2)) : undefined,
      isTaxExempt: isExempt,
      taxRate: finalTaxRate,
      taxAmount: finalTaxAmount,
      grandTotal: finalGrandTotal,
      status: nextStatus,
      updatedAt: now,
      submittedAt: submitToAdvisor ? (quote.submittedAt || now) : quote.submittedAt,
    };

    // Sync lineStatuses to RO concernStatuses
    let nextConcernStatuses = targetRO.concernStatuses ? [...targetRO.concernStatuses] : [];
    if (quote.lineStatuses) {
      Object.entries(quote.lineStatuses).forEach(([lineStr, st]) => {
        const idx = parseInt(lineStr, 10) - 1;
        if (idx >= 0) {
          while (nextConcernStatuses.length <= idx) {
            nextConcernStatuses.push('PENDING');
          }
          nextConcernStatuses[idx] = st;
        }
      });
    }

    const nextROStatus: ROStatus = submitToAdvisor ? 'ESTIMATE_DONE' : targetRO.status;

    let newHistory = [...targetRO.history];
    const isTechUser = currentUser.role === 'TECHNICIAN';
    if (submitToAdvisor) {
      newHistory.push({
        id: `hist_${Date.now()}`,
        status: nextROStatus,
        updatedBy: currentUser.id,
        updatedByName: currentUser.name,
        userRole: currentUser.role,
        timestamp: now,
        notes: isTechUser
          ? `Tech ${currentUser.name} submitted job labor time (${nextQuote.totalLaborHours} hrs) for RO #${targetRO.id}. Sent to Service Advisor to merge with parts pricing.`
          : `Quote totaling $${nextQuote.grandTotal.toFixed(2)} (${nextQuote.totalLaborHours} hrs labor + $${nextQuote.totalPartsCost.toFixed(2)} parts) submitted to Service Advisor for customer authorization.`,
      });
    } else if (!isAutoSave) {
      newHistory.push({
        id: `hist_${Date.now()}`,
        status: nextROStatus,
        updatedBy: currentUser.id,
        updatedByName: currentUser.name,
        userRole: currentUser.role,
        timestamp: now,
        notes: isTechUser
          ? `Tech ${currentUser.name} saved labor time draft (${nextQuote.totalLaborHours} hrs).`
          : `Saved repair quote draft ($${nextQuote.grandTotal.toFixed(2)}).`,
      });
    }

    const updatedRO: RepairOrder = {
      ...targetRO,
      status: nextROStatus,
      concernStatuses: nextConcernStatuses.length > 0 ? nextConcernStatuses : targetRO.concernStatuses,
      quote: nextQuote,
      history: newHistory,
    };

    setRepairOrders(prev => {
      const updated = prev.map(r => r.id === roId ? updatedRO : r);
      try {
        localStorage.setItem(STORAGE_KEY_ROS, JSON.stringify(updated));
      } catch {
        // ignore
      }
      return updated;
    });

    syncRepairOrder(updatedRO);

    if (submitToAdvisor) {
      playNotificationChime(true);
      triggerNotification(
        updatedRO,
        isTechUser 
          ? `Labor Time Ready: ${nextQuote.totalLaborHours} hrs`
          : `Quote Ready: $${nextQuote.grandTotal.toFixed(2)}`,
        isTechUser
          ? `Tech ${currentUser.name} submitted ${nextQuote.totalLaborHours} hrs labor time for RO #${targetRO.id}. Ready for Service Advisor to review and merge with parts pricing.`
          : `Repair quote for RO #${targetRO.id} ($${nextQuote.grandTotal.toFixed(2)}: ${nextQuote.totalLaborHours} hrs labor, $${nextQuote.totalPartsCost.toFixed(2)} parts). Awaiting customer authorization.`,
        true,
        'QUOTE_UPDATE'
      );
    }

    return true;
  };

  // Update labor hours requested for a specific customer concern line (syncs directly to repair quote)
  const updateLineLaborHours = (roId: string, lineIndex: number, hoursVal: number | string): boolean => {
    const targetRO = repairOrders.find(r => r.id === roId);
    if (!targetRO) return false;

    const numHours = Math.max(0, Number(hoursVal) || 0);
    const concernsList = (targetRO.concerns && targetRO.concerns.length > 0)
      ? targetRO.concerns
      : [targetRO.primaryConcern || 'General Diagnostic & Service'];

    const linePayType: ConcernPayType = targetRO.concernPayTypes?.[lineIndex] || targetRO.quote?.payType || 'CUSTOMER_PAY';
    const hourlyRate = PAY_TYPE_RATES[linePayType] || targetRO.quote?.defaultLaborRate || 165.00;

    const existingLaborItems: LaborLineItem[] = targetRO.quote?.laborItems ? [...targetRO.quote.laborItems] : [];

    // Ensure all concerns have mirrored labor items
    const mirroredItems: LaborLineItem[] = concernsList.map((concern, idx) => {
      const matched = existingLaborItems.find(item => item.roLineNumber === idx + 1);
      const itemPay = matched?.payType || targetRO.concernPayTypes?.[idx] || 'CUSTOMER_PAY';
      const itemRate = matched?.hourlyRate || PAY_TYPE_RATES[itemPay] || 165.00;
      const currentHours = idx === lineIndex 
        ? numHours 
        : (matched?.laborHours !== undefined ? Number(matched.laborHours) || 0 : 0);
      const subtotal = Number((currentHours * itemRate).toFixed(2));
      const correction = targetRO.concernCorrections?.[idx] || targetRO.correction;

      return {
        id: matched?.id || `labor_${Date.now()}_ro_${idx}`,
        description: correction || '',
        laborHours: currentHours,
        hourlyRate: itemRate,
        subtotal,
        payType: itemPay,
        roLineNumber: idx + 1,
        concernText: concern,
        correctionText: correction || '',
        addedByAdvisor: false,
      };
    });

    // Keep advisor added lines if any
    const advisorLines = existingLaborItems.filter(item => item.addedByAdvisor === true);
    const updatedLaborItems = [...mirroredItems, ...advisorLines];

    const totalLaborHours = Number(updatedLaborItems.reduce((acc, l) => acc + (Number(l.laborHours) || 0), 0).toFixed(1));
    const totalLaborCost = Number(updatedLaborItems.reduce((acc, l) => acc + (Number(l.subtotal) || 0), 0).toFixed(2));
    const totalPartsCost = targetRO.quote?.totalPartsCost || 0;
    const shopSuppliesFee = targetRO.quote?.shopSuppliesFee || 0;
    const isExempt = targetRO.isTaxExempt || targetRO.quote?.isTaxExempt;
    const taxRate = isExempt ? 0 : (targetRO.quote?.taxRate !== undefined ? targetRO.quote.taxRate : 0.07);
    const taxableAmount = totalLaborCost + totalPartsCost;
    const taxAmount = isExempt ? 0 : Number((taxableAmount * taxRate).toFixed(2));
    const grandTotal = Number((totalLaborCost + totalPartsCost + shopSuppliesFee + taxAmount).toFixed(2));

    const updatedQuote: RepairQuote = {
      ...(targetRO.quote || {
        id: `quote_${Date.now()}`,
        roId: targetRO.id,
        createdAt: new Date().toISOString(),
        initiatedByTechId: currentUser.id,
        initiatedByTechName: currentUser.name,
        partsItems: [],
        defaultLaborRate: hourlyRate,
        payType: linePayType,
        shopSuppliesFee: 0,
      }),
      status: targetRO.quote?.status || 'DRAFT',
      laborItems: updatedLaborItems,
      totalLaborHours,
      totalLaborCost,
      totalPartsCost,
      shopSuppliesFee,
      isTaxExempt: isExempt,
      taxRate,
      taxAmount,
      grandTotal,
      updatedAt: new Date().toISOString(),
    };

    return saveRepairQuote(roId, updatedQuote, false, { isAutoSave: true });
  };

  const updateQuoteStatus = (roId: string, status: 'APPROVED' | 'DECLINED', reason?: string): boolean => {
    const targetRO = repairOrders.find(r => r.id === roId);
    if (!targetRO || !targetRO.quote) return false;

    const now = new Date().toISOString();
    const updatedQuote: RepairQuote = {
      ...targetRO.quote,
      status,
      updatedAt: now,
      approvedAt: status === 'APPROVED' ? now : targetRO.quote.approvedAt,
      approvedBy: status === 'APPROVED' ? currentUser.name : targetRO.quote.approvedBy,
      declinedAt: status === 'DECLINED' ? now : targetRO.quote.declinedAt,
      declinedReason: status === 'DECLINED' ? reason : targetRO.quote.declinedReason,
    };

    const targetROStatus: ROStatus = status === 'APPROVED' ? 'APPROVED' : 'DENIED';

    const historyItem: StatusHistory = {
      id: `hist_${Date.now()}`,
      status: targetROStatus,
      updatedBy: currentUser.id,
      updatedByName: currentUser.name,
      userRole: currentUser.role,
      timestamp: now,
      notes: status === 'APPROVED'
        ? `${currentUser.name} authorized repair quote ($${updatedQuote.grandTotal.toFixed(2)}) on customer behalf`
        : `${currentUser.name} marked repair quote as declined${reason ? `: ${reason}` : ''}`,
    };

    let updatedParts = status === 'APPROVED'
      ? targetRO.parts.map(p => {
          if (p.status === 'QUOTE_ONLY' || p.requestType === 'QUOTE_ONLY') {
            return {
              ...p,
              status: 'ORDERED' as PartStatus,
              requestType: 'ORDER_NOW' as const,
              orderedAt: p.orderedAt || now,
              estimatedArrival: p.estimatedArrival && !p.estimatedArrival.toLowerCase().includes('quote') && !p.estimatedArrival.toLowerCase().includes('estimate')
                ? p.estimatedArrival
                : 'Daily Order (Arriving ~5:00 PM)',
            };
          }
          return p;
        })
      : targetRO.parts;

    // Merge any quote partsItems that were not yet in ro.parts
    if (status === 'APPROVED' && targetRO.quote?.partsItems) {
      targetRO.quote.partsItems.forEach((qp, idx) => {
        const alreadyExists = updatedParts.some(p => 
          (qp.sourcePartId && p.id === qp.sourcePartId) || 
          (qp.partNumber && p.partNumber && p.partNumber.trim().toUpperCase() === qp.partNumber.trim().toUpperCase()) ||
          (qp.description && p.description && p.description.trim().toLowerCase() === qp.description.trim().toLowerCase())
        );
        if (!alreadyExists) {
          updatedParts.push({
            id: qp.sourcePartId || `qpart_approved_${Date.now()}_${idx}`,
            roId: targetRO.id,
            vendor: 'OEM / Parts Counter',
            partNumber: qp.partNumber || 'TBD',
            description: qp.description || 'Quoted Part',
            quantity: qp.quantity || 1,
            price: qp.unitPrice,
            status: 'ORDERED',
            requestType: 'ORDER_NOW',
            orderedAt: now,
            estimatedArrival: 'Daily Order (Arriving ~5:00 PM)',
            roLineNumber: qp.roLineNumber || 1,
          });
        }
      });
    }

    const updatedRO: RepairOrder = {
      ...targetRO,
      status: targetROStatus,
      parts: updatedParts,
      quote: updatedQuote,
      history: [...targetRO.history, historyItem],
    };

    setRepairOrders(prev => {
      const updated = prev.map(r => r.id === roId ? updatedRO : r);
      try {
        localStorage.setItem(STORAGE_KEY_ROS, JSON.stringify(updated));
      } catch {
        // ignore
      }
      return updated;
    });

    syncRepairOrder(updatedRO);

    if (status === 'APPROVED') {
      // 1. Service Manager
      triggerNotification(
        updatedRO,
        `📋 Quote Approved: RO #${targetRO.id}`,
        `${currentUser.name} authorized repair quote ($${updatedQuote.grandTotal.toFixed(2)}) for ${targetRO.customerName}.`,
        true,
        'STATUS_CHANGE',
        'SERVICE_MANAGER'
      );

      // 2. Role Alert for Parts Specialist / Parts Counter
      triggerNotification(
        updatedRO,
        `🚨 Parts Action: Quote Approved for RO #${targetRO.id}`,
        `Customer authorized repairs ($${updatedQuote.grandTotal.toFixed(2)}). Please place parts orders now.`,
        true,
        'PARTS_UPDATE',
        'PARTS_SPECIALIST'
      );

      // 3. Role Alert strictly for the Assigned Technician on this RO
      if (targetRO.techId) {
        triggerNotification(
          updatedRO,
          `🔧 Repairs Authorized: RO #${targetRO.id}`,
          `Customer approved repair estimate ($${updatedQuote.grandTotal.toFixed(2)}). Parts are being ordered, proceed with repairs.`,
          true,
          'STATUS_CHANGE',
          'TECHNICIAN',
          targetRO.techId
        );
      }
    } else {
      triggerNotification(
        updatedRO,
        `Quote Declined: RO #${targetRO.id}`,
        `${currentUser.name} marked quote as declined${reason ? ` (${reason})` : ''}.`,
        false,
        'STATUS_CHANGE'
      );
    }

    return true;
  };

  // Warranty Labor Time Clock Operations (Multi-punch per ticket)
  const clockInToRO = (
    roId: string, 
    notes?: string, 
    operationType?: WarrantyOperationType
  ): { success: boolean; message: string; punch?: WarrantyLaborTimePunch } => {
    const targetRO = repairOrders.find(r => r.id === roId);
    if (!targetRO) return { success: false, message: 'Repair order not found.' };

    const existingPunches = targetRO.timePunches || [];
    // Check if the current user is already clocked in to this RO
    const openPunch = existingPunches.find(p => !p.clockOut && p.techId === currentUser.id);
    if (openPunch) {
      return { 
        success: false, 
        message: `You are already clocked in to ticket #${targetRO.id} since ${new Date(openPunch.clockIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}.` 
      };
    }

    const now = new Date().toISOString();
    const newPunch: WarrantyLaborTimePunch = {
      id: `punch_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      techId: currentUser.id,
      techName: currentUser.name,
      techEmployeeNumber: currentUser.employeeNumber,
      clockIn: now,
      notes: notes?.trim() || undefined,
      operationType: operationType || (targetRO.status === 'IN_DIAG' ? 'DIAGNOSTIC' : 'REPAIR'),
      createdAt: now,
    };

    const updatedPunches = [...existingPunches, newPunch];

    const historyItem: StatusHistory = {
      id: `hist_${Date.now()}`,
      status: targetRO.status,
      updatedBy: currentUser.id,
      updatedByName: currentUser.name,
      userRole: currentUser.role,
      timestamp: now,
      notes: `[Warranty Clock-In] ${currentUser.name}${currentUser.employeeNumber ? ` (#${currentUser.employeeNumber})` : ''} clocked in for ${newPunch.operationType || 'REPAIR'} work${notes ? `: "${notes}"` : ''}`,
    };

    const updatedRO: RepairOrder = {
      ...targetRO,
      timePunches: updatedPunches,
      history: [...targetRO.history, historyItem],
    };

    setRepairOrders(prev => {
      const updated = prev.map(r => r.id === roId ? updatedRO : r);
      try {
        localStorage.setItem(STORAGE_KEY_ROS, JSON.stringify(updated));
      } catch {
        // ignore
      }
      return updated;
    });

    syncRepairOrder(updatedRO);

    triggerNotification(
      updatedRO,
      `Tech Clocked In: RO #${targetRO.id}`,
      `${currentUser.name} clocked in on ticket #${targetRO.id} (${newPunch.operationType || 'REPAIR'}).`,
      false,
      'STATUS_CHANGE'
    );

    return { 
      success: true, 
      message: `Clocked in to RO #${targetRO.id} at ${new Date(now).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}.`,
      punch: newPunch
    };
  };

  const clockOutOfRO = (
    roId: string, 
    punchId?: string, 
    notes?: string
  ): { success: boolean; message: string; durationMinutes?: number } => {
    const targetRO = repairOrders.find(r => r.id === roId);
    if (!targetRO || !targetRO.timePunches || targetRO.timePunches.length === 0) {
      return { success: false, message: 'No active clock-in session found on this repair order.' };
    }

    const now = new Date().toISOString();
    let punchIndex = -1;
    if (punchId) {
      punchIndex = targetRO.timePunches.findIndex(p => p.id === punchId && !p.clockOut);
    } else {
      // Find open punch for current technician
      punchIndex = targetRO.timePunches.findIndex(p => !p.clockOut && p.techId === currentUser.id);
      if (punchIndex === -1 && (currentUser.role === 'SERVICE_MANAGER' || currentUser.role === 'SERVICE_ADVISOR')) {
        // Managers/Advisors can close any open punch if needed
        punchIndex = targetRO.timePunches.findIndex(p => !p.clockOut);
      }
    }

    if (punchIndex === -1) {
      return { success: false, message: 'No open clock session found to clock out of.' };
    }

    const openPunch = targetRO.timePunches[punchIndex];
    const inMs = new Date(openPunch.clockIn).getTime();
    const outMs = new Date(now).getTime();
    const durationMinutes = Math.max(1, Math.round((outMs - inMs) / 60000));
    const hours = (durationMinutes / 60).toFixed(2);

    const mergedNotes = notes?.trim() 
      ? (openPunch.notes ? `${openPunch.notes} | ${notes.trim()}` : notes.trim())
      : openPunch.notes;

    const closedPunch: WarrantyLaborTimePunch = {
      ...openPunch,
      clockOut: now,
      durationMinutes,
      notes: mergedNotes,
    };

    const updatedPunches = [...targetRO.timePunches];
    updatedPunches[punchIndex] = closedPunch;

    const historyItem: StatusHistory = {
      id: `hist_${Date.now()}`,
      status: targetRO.status,
      updatedBy: currentUser.id,
      updatedByName: currentUser.name,
      userRole: currentUser.role,
      timestamp: now,
      notes: `[Warranty Clock-Out] ${closedPunch.techName} clocked out. Elapsed: ${durationMinutes} min (${hours} hrs).${notes ? ` Work: "${notes}"` : ''}`,
    };

    const updatedRO: RepairOrder = {
      ...targetRO,
      timePunches: updatedPunches,
      history: [...targetRO.history, historyItem],
    };

    setRepairOrders(prev => {
      const updated = prev.map(r => r.id === roId ? updatedRO : r);
      try {
        localStorage.setItem(STORAGE_KEY_ROS, JSON.stringify(updated));
      } catch {
        // ignore
      }
      return updated;
    });

    syncRepairOrder(updatedRO);

    triggerNotification(
      updatedRO,
      `Tech Clocked Out: RO #${targetRO.id}`,
      `${closedPunch.techName} clocked out of RO #${targetRO.id} (${hours} hrs recorded).`,
      false,
      'STATUS_CHANGE'
    );

    return { 
      success: true, 
      message: `Clocked out of RO #${targetRO.id}. Logged ${durationMinutes} min (${hours} hrs).`,
      durationMinutes
    };
  };

  const addManualTimePunch = (roId: string, punchData: Omit<WarrantyLaborTimePunch, 'id'>): boolean => {
    const targetRO = repairOrders.find(r => r.id === roId);
    if (!targetRO) return false;

    const inMs = new Date(punchData.clockIn).getTime();
    const outMs = punchData.clockOut ? new Date(punchData.clockOut).getTime() : undefined;
    const durationMinutes = (outMs && outMs > inMs) 
      ? Math.max(1, Math.round((outMs - inMs) / 60000))
      : punchData.durationMinutes;

    const newPunch: WarrantyLaborTimePunch = {
      ...punchData,
      id: `punch_manual_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      durationMinutes,
      manuallyEntered: true,
      createdAt: new Date().toISOString(),
    };

    const updatedPunches = [...(targetRO.timePunches || []), newPunch];

    const historyItem: StatusHistory = {
      id: `hist_${Date.now()}`,
      status: targetRO.status,
      updatedBy: currentUser.id,
      updatedByName: currentUser.name,
      userRole: currentUser.role,
      timestamp: new Date().toISOString(),
      notes: `[Warranty Punch Added Manually] ${currentUser.name} recorded session for ${newPunch.techName} (${newPunch.durationMinutes ? `${(newPunch.durationMinutes / 60).toFixed(2)} hrs` : 'Open session'}).`,
    };

    const updatedRO: RepairOrder = {
      ...targetRO,
      timePunches: updatedPunches,
      history: [...targetRO.history, historyItem],
    };

    setRepairOrders(prev => {
      const updated = prev.map(r => r.id === roId ? updatedRO : r);
      try {
        localStorage.setItem(STORAGE_KEY_ROS, JSON.stringify(updated));
      } catch {
        // ignore
      }
      return updated;
    });

    syncRepairOrder(updatedRO);
    return true;
  };

  const updateTimePunch = (roId: string, punchId: string, updates: Partial<WarrantyLaborTimePunch>): boolean => {
    const targetRO = repairOrders.find(r => r.id === roId);
    if (!targetRO || !targetRO.timePunches) return false;

    const updatedPunches = targetRO.timePunches.map(p => {
      if (p.id !== punchId) return p;
      const merged = { ...p, ...updates };
      if (merged.clockIn && merged.clockOut) {
        const inMs = new Date(merged.clockIn).getTime();
        const outMs = new Date(merged.clockOut).getTime();
        if (outMs > inMs) {
          merged.durationMinutes = Math.max(1, Math.round((outMs - inMs) / 60000));
        }
      }
      return merged;
    });

    const updatedRO: RepairOrder = {
      ...targetRO,
      timePunches: updatedPunches,
    };

    setRepairOrders(prev => {
      const updated = prev.map(r => r.id === roId ? updatedRO : r);
      try {
        localStorage.setItem(STORAGE_KEY_ROS, JSON.stringify(updated));
      } catch {
        // ignore
      }
      return updated;
    });

    syncRepairOrder(updatedRO);
    return true;
  };

  const deleteTimePunch = (roId: string, punchId: string): boolean => {
    const targetRO = repairOrders.find(r => r.id === roId);
    if (!targetRO || !targetRO.timePunches) return false;

    const updatedPunches = targetRO.timePunches.filter(p => p.id !== punchId);
    const updatedRO: RepairOrder = {
      ...targetRO,
      timePunches: updatedPunches,
    };

    setRepairOrders(prev => {
      const updated = prev.map(r => r.id === roId ? updatedRO : r);
      try {
        localStorage.setItem(STORAGE_KEY_ROS, JSON.stringify(updated));
      } catch {
        // ignore
      }
      return updated;
    });

    syncRepairOrder(updatedRO);
    return true;
  };

  const openDirectChat = (recipientUserId: string | 'ALL') => {
    setSelectedChatRecipientId(recipientUserId);
    setIsChatBoxOpen(true);
  };

  // Person-to-Person Direct Chat & Shop Floor messaging
  const sendShopChatMessage = (
    content: string, 
    recipientId?: string, 
    roId?: string, 
    isUrgent: boolean = false
  ) => {
    const trimmed = content.trim();
    if (!trimmed) return;

    const targetRecipientId = (recipientId && recipientId !== 'ALL') ? recipientId : undefined;
    const recipientUser = targetRecipientId ? users.find(u => u.id === targetRecipientId) : undefined;

    const newMsg: ShopChatMessage = {
      id: `shop_msg_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      senderId: currentUser.id,
      senderName: currentUser.name,
      senderRole: currentUser.role,
      recipientId: targetRecipientId,
      recipientName: recipientUser?.name,
      recipientRole: recipientUser?.role,
      content: trimmed,
      timestamp: new Date().toISOString(),
      roId: roId ? roId.trim() : undefined,
      isUrgent,
    };

    setShopMessages(prev => [...prev, newMsg]);
    saveShopMessage(newMsg).catch(err => {
      console.error('Failed to sync shop chat message:', err);
    });

    if (isSoundEnabled) {
      playNotificationChime(isUrgent);
    }

    // Direct message notification to recipient or urgent shop announcement
    if (targetRecipientId) {
      const notif: UrgentNotification = {
        id: `notif_chat_${Date.now()}`,
        roId: roId || 'DIRECT_MESSAGE',
        roNumber: roId || 'Direct Message',
        title: isUrgent ? `URGENT Direct Message from ${currentUser.name}` : `Direct Message from ${currentUser.name}`,
        message: trimmed,
        timestamp: new Date().toISOString(),
        isUrgent,
        type: 'SHOP_CHAT',
        read: false,
        targetUserId: targetRecipientId,
        targetRole: recipientUser?.role,
      };
      setNotifications(prev => [notif, ...prev.slice(0, 49)]);
      syncNotification(notif);
    } else if (isUrgent) {
      const notif: UrgentNotification = {
        id: `notif_chat_${Date.now()}`,
        roId: roId || 'SHOP',
        roNumber: roId || 'Shop Floor',
        title: `URGENT Announcement from ${currentUser.name}`,
        message: trimmed,
        timestamp: new Date().toISOString(),
        isUrgent: true,
        type: 'SHOP_CHAT',
        read: false,
      };
      setNotifications(prev => [notif, ...prev.slice(0, 49)]);
      syncNotification(notif);
    }
  };

  // Log customer contact touchpoint & update cadence schedule
  const logCustomerContact = (
    roId: string, 
    contactData: {
      type: CustomerContactType;
      outcome: CustomerContactOutcome;
      summary: string;
      notes?: string;
      partsEtaDiscussed?: string;
      promisedDateDiscussed?: string;
      nextScheduledContactDate?: string;
      isPostRepairFollowUp?: boolean;
      postRepairOutcome?: 'SATISFIED_NO_CONCERNS' | 'HAS_NEW_CONCERNS' | 'LEFT_VOICEMAIL' | 'NO_ANSWER' | 'CUSTOMER_CALLBACK_REQUESTED';
    }
  ): boolean => {
    const targetRO = repairOrders.find(r => r.id === roId);
    if (!targetRO) return false;

    const now = new Date().toISOString();
    const contactId = `cnt_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`;

    const isPostRepair = Boolean(
      contactData.isPostRepairFollowUp || 
      contactData.outcome === 'POST_REPAIR_SATISFIED' || 
      contactData.outcome === 'POST_REPAIR_HAS_CONCERNS' || 
      contactData.outcome === 'POST_REPAIR_VOICEMAIL' ||
      (targetRO.status === 'CLOSED' || targetRO.status === 'COMPLETED')
    );

    const postRepairFollowUpCompleted = isPostRepair ? true : targetRO.postRepairFollowUpCompleted;
    const postRepairFollowUpCompletedAt = isPostRepair ? now : targetRO.postRepairFollowUpCompletedAt;
    const postRepairFollowUpOutcome = isPostRepair 
      ? (contactData.postRepairOutcome || (contactData.outcome === 'POST_REPAIR_HAS_CONCERNS' ? 'HAS_NEW_CONCERNS' : 'SATISFIED_NO_CONCERNS'))
      : targetRO.postRepairFollowUpOutcome;
    const postRepairFollowUpNotes = isPostRepair 
      ? (contactData.notes || contactData.summary).trim()
      : targetRO.postRepairFollowUpNotes;

    const nextDueDate = contactData.nextScheduledContactDate || (isPostRepair ? undefined : calculateNextContactDate(now, 3.5));

    const newRecord: CustomerContactRecord = {
      id: contactId,
      timestamp: now,
      advisorId: currentUser.id,
      advisorName: currentUser.name,
      type: contactData.type,
      outcome: contactData.outcome,
      summary: contactData.summary.trim(),
      notes: (contactData.notes || '').trim(),
      partsEtaDiscussed: contactData.partsEtaDiscussed?.trim() || '',
      promisedDateDiscussed: contactData.promisedDateDiscussed?.trim() || '',
      nextScheduledContactDate: nextDueDate,
    };

    const typeInfo = formatContactType(contactData.type);

    const newHistoryEntry: StatusHistory = {
      id: `hist_${Date.now()}`,
      status: targetRO.status,
      updatedBy: currentUser.id,
      updatedByName: currentUser.name,
      userRole: currentUser.role,
      timestamp: now,
      notes: isPostRepair
        ? `3-Day Follow Up conducted (${typeInfo.label}): ${contactData.summary.trim()}`
        : `Customer contact logged (${typeInfo.label}): ${contactData.summary.trim()}.${nextDueDate ? ` Next scheduled update: ${nextDueDate}.` : ''}`,
    };

    const updatedContactHistory = [newRecord, ...(targetRO.contactHistory || [])];

    const updatedRO: RepairOrder = {
      ...targetRO,
      lastContactDate: now,
      lastContactBy: currentUser.name,
      lastContactOutcome: contactData.outcome,
      nextContactDueDate: nextDueDate,
      contactHistory: updatedContactHistory,
      postRepairFollowUpCompleted,
      postRepairFollowUpCompletedAt,
      postRepairFollowUpOutcome,
      postRepairFollowUpNotes,
      history: [...targetRO.history, newHistoryEntry],
    };

    setRepairOrders(prev => {
      const updatedList = prev.map(r => r.id === roId ? updatedRO : r);
      try {
        localStorage.setItem(STORAGE_KEY_ROS, JSON.stringify(updatedList));
      } catch {
        // ignore
      }
      return updatedList;
    });

    syncRepairOrder(updatedRO);

    triggerNotification(
      updatedRO,
      `Customer Contact: ${targetRO.customerName}`,
      `${currentUser.name} reached out (${typeInfo.label}). Next call scheduled for ${nextDueDate}.`,
      false,
      'STATUS_CHANGE'
    );

    return true;
  };

  const clearAllRepairOrders = () => {
    if (currentUser.role !== 'SERVICE_MANAGER') {
      alert('Permission Denied: Only the Service Manager has permission to clear repair orders.');
      return;
    }
    setRepairOrders([]);
    setNotifications([]);
    setSelectedROId(null);
    try {
      localStorage.setItem(STORAGE_KEY_ROS, JSON.stringify([]));
      localStorage.setItem(STORAGE_KEY_NOTIFS, JSON.stringify([]));
      localStorage.setItem(STORAGE_KEY_WIPE_PERFORMED, 'true');
    } catch {
      // ignore
    }
    clearAllROsFromFirestore();
    syncShopSettings({ cleanSlateInitialized: true, seededDemoData: false });
  };

  const loginWithCredentials = (emailOrId: string, passwordOrPin: string): { success: boolean; user?: User; message?: string } => {
    const search = emailOrId.trim().toLowerCase();
    const cred = passwordOrPin.trim();

    const found = users.find(u => 
      u.email.toLowerCase() === search || 
      u.id.toLowerCase() === search ||
      u.name.toLowerCase() === search ||
      (u.employeeNumber && u.employeeNumber.toLowerCase() === search) ||
      (u.employeeNumber && `#${u.employeeNumber.toLowerCase()}` === search)
    );

    if (!found) {
      return { success: false, message: 'No employee found with this name, employee #, or email.' };
    }

    const matchesPin = found.pin && found.pin === cred;
    const matchesDefault = cred === '1234' || cred === 'admin123' || cred === 'admin';

    if (!matchesPin && !matchesDefault) {
      return { success: false, message: 'Invalid Quick PIN code entered.' };
    }

    setCurrentUserState(found);
    setIsAuthenticated(true);
    try {
      localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(found));
      sessionStorage.setItem(STORAGE_KEY_SESSION_AUTH, 'true');
    } catch {
      // ignore
    }
    setIsLoginModalOpen(false);
    return { success: true, user: found };
  };

  const loginUser = (user: User, passwordOrPin: string): { success: boolean; message?: string } => {
    const cred = passwordOrPin.trim();
    const matchesPin = user.pin && user.pin === cred;
    const matchesDefault = cred === '1234' || cred === 'admin123' || cred === 'admin';

    if (!matchesPin && !matchesDefault) {
      return { success: false, message: 'Invalid Quick PIN code entered.' };
    }

    setCurrentUserState(user);
    setIsAuthenticated(true);
    try {
      localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(user));
      sessionStorage.setItem(STORAGE_KEY_SESSION_AUTH, 'true');
    } catch {
      // ignore
    }
    setIsLoginModalOpen(false);
    return { success: true };
  };

  const lockWorkstation = () => {
    setIsAuthenticated(false);
    try {
      sessionStorage.removeItem(STORAGE_KEY_SESSION_AUTH);
    } catch {
      // ignore
    }
    setIsLoginModalOpen(false);
  };

  const logout = () => {
    lockWorkstation();
  };

  const completeInitialSetup = (config: {
    shopName: string;
    manager: {
      name: string;
      email: string;
      employeeNumber?: string;
      password?: string;
      pin?: string;
      title?: string;
      phone?: string;
    };
    initialUsers: User[];
    startWithEmptyROs: boolean;
  }) => {
    const trimmedShop = config.shopName.trim() || 'Woolwine CDJR';
    setShopName(trimmedShop);

    const managerUser: User = {
      id: `usr_mgr_${Date.now()}`,
      name: config.manager.name.trim() || 'Service Manager',
      employeeNumber: config.manager.employeeNumber?.trim() || undefined,
      email: config.manager.email.trim().toLowerCase() || 'manager@woolwinecdjr.com',
      pin: config.manager.pin?.trim() || '1234',
      role: 'SERVICE_MANAGER',
      title: config.manager.title?.trim() || 'Service Director / General Manager',
      phone: config.manager.phone?.trim() || '',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    };

    const otherUsers = config.initialUsers.filter(u => u.role !== 'SERVICE_MANAGER' && u.email !== managerUser.email);
    const finalUsers = [managerUser, ...otherUsers].map((u) => ({
      ...u,
      employeeNumber: (u.employeeNumber && u.employeeNumber.trim()) ? u.employeeNumber.trim() : undefined,
      phone: (u.phone || '').trim(),
      certificationLevel: (u.certificationLevel || '').trim(),
      bayNumber: (u.bayNumber || u.certificationLevel || '').trim(),
      pin: u.pin || '1234',
    }));

    setUsers(finalUsers);
    try {
      localStorage.setItem(STORAGE_KEY_USERS, JSON.stringify(finalUsers));
      sessionStorage.setItem(STORAGE_KEY_SESSION_AUTH, 'true');
    } catch {
      // ignore
    }
    finalUsers.forEach(u => syncUser(u));

    setCurrentUserState(managerUser);
    setIsAuthenticated(true);

    if (config.startWithEmptyROs) {
      clearAllRepairOrders();
      try {
        localStorage.setItem(STORAGE_KEY_WIPE_PERFORMED, 'true');
      } catch {
        // ignore
      }
    } else {
      try {
        localStorage.removeItem(STORAGE_KEY_WIPE_PERFORMED);
      } catch {
        // ignore
      }
      setRepairOrders(INITIAL_REPAIR_ORDERS);
      INITIAL_REPAIR_ORDERS.forEach(ro => syncRepairOrder(ro));
    }

    setIsInitialSetupCompleted(true);
    setIsSetupWizardOpen(false);

    syncShopSettings({
      shopName: trimmedShop,
      isSetupCompleted: true,
      cleanSlateInitialized: config.startWithEmptyROs,
      seededDemoData: !config.startWithEmptyROs,
    });
  };

  const resetAllDataToCleanSlateHandler = () => {
    const cleanManager: User = {
      id: `usr_mgr_${Date.now()}`,
      name: 'Service Manager',
      employeeNumber: undefined,
      email: 'admin@precisionauto.com',
      pin: '1234',
      role: 'SERVICE_MANAGER',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
      title: 'Service Manager',
      phone: '',
    };

    setUsers([cleanManager]);
    setCurrentUserState(cleanManager);
    setRepairOrders([]);
    setNotifications([]);
    setAppointments([]);
    setSelectedROId(null);
    setShopNameState('My Service Department');
    setIsInitialSetupCompleted(false);
    setIsSetupWizardOpen(true);

    try {
      localStorage.setItem(STORAGE_KEY_USERS, JSON.stringify([cleanManager]));
      localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(cleanManager));
      localStorage.setItem(STORAGE_KEY_ROS, JSON.stringify([]));
      localStorage.setItem(STORAGE_KEY_NOTIFS, JSON.stringify([]));
      localStorage.setItem(STORAGE_KEY_APPOINTMENTS, JSON.stringify([]));
      localStorage.setItem(STORAGE_KEY_SHOP_NAME, 'My Service Department');
      localStorage.setItem(STORAGE_KEY_SETUP_DONE, 'false');
      localStorage.setItem(STORAGE_KEY_WIPE_PERFORMED, 'true');
    } catch {
      // ignore
    }

    resetAllDataToCleanSlate(cleanManager, 'My Service Department');
  };

  const resetToDemoData = () => {
    try {
      localStorage.removeItem(STORAGE_KEY_WIPE_PERFORMED);
    } catch {
      // ignore
    }

    setUsers(INITIAL_USERS);
    INITIAL_USERS.forEach(u => syncUser(u));

    setRepairOrders(INITIAL_REPAIR_ORDERS);
    INITIAL_REPAIR_ORDERS.forEach(ro => syncRepairOrder(ro));

    const resetNotif: UrgentNotification = {
      id: `notif_${Date.now()}`,
      roId: 'RO-10482',
      roNumber: 'RO-10482',
      title: 'Demo Data Restored',
      message: 'Loaded sample service department repair orders, parts ETAs, and team members.',
      timestamp: new Date().toISOString(),
      isUrgent: false,
      type: 'STATUS_CHANGE',
      read: false,
    };
    setNotifications([resetNotif]);
    syncNotification(resetNotif);
  };

  const getFilteredROs = (): RepairOrder[] => {
    if (currentUser.role === 'SERVICE_MANAGER') {
      return repairOrders;
    }
    if (currentUser.role === 'PARTS_SPECIALIST') {
      return repairOrders;
    }
    if (currentUser.role === 'SERVICE_ADVISOR') {
      return repairOrders.filter(ro => ro.advisorId === currentUser.id);
    }
    if (currentUser.role === 'TECHNICIAN') {
      return repairOrders.filter(ro => ro.techId === currentUser.id || ro.concernTechIds?.includes(currentUser.id));
    }
    return repairOrders;
  };

  return (
    <AppContext.Provider
      value={{
        shopName,
        setShopName,
        isInitialSetupCompleted,
        setIsInitialSetupCompleted,
        isSetupWizardOpen,
        setIsSetupWizardOpen,
        isCloudSynced,
        completeInitialSetup,
        currentUser,
        users,
        repairOrders,
        customers,
        notifications,
        selectedRO,
        isNewROModalOpen,
        isLoginModalOpen,
        isStaffManagementOpen,
        isTimeCardCalculatorOpen,
        isCustomerDirectoryOpen,
        managerViewSection,
        setManagerViewSection,
        prefilledCustomerForNewRO,
        isSoundEnabled,
        pushPermission,
        isAuthenticated,
        setIsAuthenticated,
        setCurrentUser,
        setSelectedRO,
        openROWithTab,
        selectedROModalTab,
        setSelectedROModalTab,
        setIsNewROModalOpen,
        setIsLoginModalOpen,
        setIsStaffManagementOpen,
        setIsTimeCardCalculatorOpen,
        setIsCustomerDirectoryOpen,
        setPrefilledCustomerForNewRO,
        saveCustomer,
        deleteCustomer,
        toggleSound,
        requestPushPermission,
        addUser,
        updateUser,
        removeUser,
        loginWithCredentials,
        loginUser,
        logout,
        lockWorkstation,
        updateROStatus,
        startDiagnosis,
        dispatchRO,
        reassignServiceWriter,
        sendMessage,
        addPartOrder,
        addMultiplePartOrders,
        updatePartStatus,
        updatePartItem,
        deletePartItem,
        createRepairOrder,
        markNotificationRead,
        markAllNotificationsRead,
        triggerNotification,
        deleteRepairOrder,
        updateRepairOrderDetails,
        addRepairOrderConcern,
        toggleCustomerTaxExempt,
        addVehiclePhoto,
        deleteVehiclePhoto,
        addLinePhoto,
        deleteLinePhoto,
        updateLinePhotoCaption,
        updateTechCauseAndCorrection,
        updateConcernPayType,
        updateConcernTech,
        updateConcernStatus,
        logCustomerContact,
        clearAllRepairOrders,
        resetAllDataToCleanSlateHandler,
        resetToDemoData,
        getFilteredROs,
        shopMessages,
        isChatBoxOpen,
        setIsChatBoxOpen,
        selectedChatRecipientId,
        setSelectedChatRecipientId,
        openDirectChat,
        openShopChat,
        sendShopChatMessage,
        unreadShopMessages,
        unreadShopCount,
        latestUnreadShopMessage,
        unreadCountBySender,
        markShopMessagesAsRead,
        addRecommendedService,
        updateRecommendedService,
        deleteRecommendedService,
        updateRecommendedServiceStatus,
        inspectionChecklist,
        updateInspectionChecklist,
        resetInspectionChecklistToDefaults,
        setInspectionItemResult,
        passAllInspectionItems,
        resetROInspection,
        activeQuoteRO,
        openQuoteModal,
        closeQuoteModal,
        saveRepairQuote,
        updateLineLaborHours,
        updateQuoteStatus,
        clockInToRO,
        clockOutOfRO,
        addManualTimePunch,
        updateTimePunch,
        deleteTimePunch,
        activeWarrantyPrintRO,
        openWarrantyPrintModal,
        closeWarrantyPrintModal,
        activeRoleView,
        setActiveRoleView,
        staffLeaveEntries,
        addStaffLeaveEntry,
        updateStaffLeaveEntry,
        deleteStaffLeaveEntry,
        isStaffCalendarOpen,
        setIsStaffCalendarOpen,
        appointments,
        addAppointment,
        updateAppointment,
        deleteAppointment,
        clearAllAppointments,
        checkInAppointment,
        convertAppointmentToRO,
        isAppointmentCalendarOpen,
        setIsAppointmentCalendarOpen,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
