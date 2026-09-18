import React, { createContext, useContext, useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { 
  User, 
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
  WarrantyLaborTimePunch,
  WarrantyOperationType,
  ConcernPayType
} from '../types';
import { calculateNextContactDate, formatContactType } from '../utils/cadenceUtils';
import { INITIAL_USERS, INITIAL_REPAIR_ORDERS } from '../data/mockData';
import { playNotificationChime, requestBrowserNotification } from '../utils/audio';
import {
  subscribeToRepairOrders,
  subscribeToUsers,
  subscribeToNotifications,
  subscribeToShopSettings,
  subscribeToShopMessages,
  saveShopMessage,
  syncRepairOrder,
  deleteRepairOrderDoc,
  syncUser,
  deleteUserDoc,
  syncNotification,
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
  notifications: UrgentNotification[];
  selectedRO: RepairOrder | null;
  isNewROModalOpen: boolean;
  isLoginModalOpen: boolean;
  isStaffManagementOpen: boolean;
  isSoundEnabled: boolean;
  pushPermission: NotificationPermission | 'default';
  isAuthenticated: boolean;
  setIsAuthenticated: (auth: boolean) => void;
  
  // Actions
  setCurrentUser: (user: User) => void;
  setSelectedRO: (ro: RepairOrder | null) => void;
  setIsNewROModalOpen: (isOpen: boolean) => void;
  setIsLoginModalOpen: (isOpen: boolean) => void;
  setIsStaffManagementOpen: (isOpen: boolean) => void;
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
  sendMessage: (roId: string, content: string, isUrgent?: boolean) => void;
  addPartOrder: (roId: string, part: Omit<PartItem, 'id' | 'roId'>) => void;
  updatePartStatus: (roId: string, partId: string, status: PartStatus, eta?: string, notes?: string) => void;
  createRepairOrder: (data: {
    roNumber?: string;
    customerName: string;
    customerPhone: string;
    vehicle: RepairOrder['vehicle'];
    primaryConcern?: string;
    concerns?: string[];
    concernPayTypes?: ConcernPayType[];
    promisedTime?: string;
    techId?: string;
    bay?: string;
    isUrgent?: boolean;
    isWaiter?: boolean;
  }) => string;
  
  markNotificationRead: (notifId: string) => void;
  markAllNotificationsRead: () => void;
  deleteRepairOrder: (roId: string) => boolean;
  updateRepairOrderDetails: (roId: string, updates: Partial<RepairOrder>, options?: { isAutoSave?: boolean }) => boolean;
  updateTechCauseAndCorrection: (roId: string, cause: string, correction: string, options?: { isAutoSave?: boolean; notify?: boolean }) => boolean;
  updateConcernPayType: (roId: string, concernIndex: number, payType: ConcernPayType) => boolean;
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

  // Tech Additional Recommendations
  addRecommendedService: (roId: string, item: {
    serviceName: string;
    category?: RecommendedService['category'];
    urgency: 'SAFETY' | 'RECOMMENDED';
    notes?: string;
  }) => boolean;
  updateRecommendedServiceStatus: (
    roId: string, 
    recId: string, 
    status: 'APPROVED' | 'DECLINED', 
    declinedReason?: string
  ) => boolean;

  // Repair Quote Workflow (Initiated by Technician)
  activeQuoteRO: RepairOrder | null;
  openQuoteModal: (roId: string) => void;
  closeQuoteModal: () => void;
  saveRepairQuote: (roId: string, quote: RepairQuote, submitToAdvisor?: boolean, options?: { isAutoSave?: boolean; notify?: boolean }) => boolean;
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

  // Warranty Documentation & Print Feature
  activeWarrantyPrintRO: RepairOrder | null;
  openWarrantyPrintModal: (roId: string) => void;
  closeWarrantyPrintModal: () => void;
}

const STORAGE_KEY_ROS = 'precision_auto_service_ros_v6_clean';
const STORAGE_KEY_USER = 'precision_auto_active_user_v6_clean';
const STORAGE_KEY_USERS = 'precision_auto_users_v6_clean';
const STORAGE_KEY_NOTIFS = 'precision_auto_notifs_v6_clean';
const STORAGE_KEY_SHOP_NAME = 'precision_auto_shop_name_v6_clean';
const STORAGE_KEY_SETUP_DONE = 'precision_auto_setup_completed_v6_clean';
const STORAGE_KEY_WIPE_PERFORMED = 'precision_auto_wipe_performed_v6_clean';
const STORAGE_KEY_SESSION_AUTH = 'dealership_session_authenticated_v1';

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
      return localStorage.getItem(STORAGE_KEY_SHOP_NAME) || 'Woolwine CDJR';
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
          return parsed;
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

  const [selectedROId, setSelectedROId] = useState<string | null>(null);
  const [quoteModalROId, setQuoteModalROId] = useState<string | null>(null);
  const [warrantyPrintROId, setWarrantyPrintROId] = useState<string | null>(null);
  const [isNewROModalOpen, setIsNewROModalOpen] = useState(false);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [isStaffManagementOpen, setIsStaffManagementOpen] = useState(false);
  const [isChatBoxOpen, setIsChatBoxOpen] = useState(false);
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
    setIsChatBoxOpen(true);
  }, [unreadShopMessages, currentUser?.id]);
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
        if (cloudSettings.shopName) {
          setShopNameState(cloudSettings.shopName);
          localStorage.setItem(STORAGE_KEY_SHOP_NAME, cloudSettings.shopName);
        }
        if (typeof cloudSettings.isSetupCompleted === 'boolean') {
          setIsInitialSetupCompleted(cloudSettings.isSetupCompleted);
          localStorage.setItem(STORAGE_KEY_SETUP_DONE, String(cloudSettings.isSetupCompleted));
          if (cloudSettings.isSetupCompleted) {
            setIsSetupWizardOpen(false);
          }
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

    return () => {
      unsubscribeROs();
      unsubscribeUsers();
      unsubscribeNotifs();
      unsubscribeSettings();
      unsubscribeMessages();
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

  const selectedRO = repairOrders.find(ro => ro.id === selectedROId) || null;
  const activeQuoteRO = repairOrders.find(ro => ro.id === quoteModalROId) || null;
  const activeWarrantyPrintRO = repairOrders.find(ro => ro.id === warrantyPrintROId) || null;

  const setSelectedRO = (ro: RepairOrder | null) => {
    setSelectedROId(ro ? ro.id : null);
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
    type: UrgentNotification['type']
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
    };

    setNotifications(prev => [newNotif, ...prev.slice(0, 49)]);
    syncNotification(newNotif);

    if (isSoundEnabled) {
      playNotificationChime(isUrgent);
    }

    if (isUrgent || type === 'STATUS_CHANGE') {
      requestBrowserNotification(`[${ro.id}] ${title}`, message, isUrgent);
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

    if (newStatus === 'WAITING_DIAGNOSTICS' || newStatus === 'WAITING_DIAGNOSIS') {
      waitingDiagnosisAt = now;
    } else if (newStatus === 'IN_DIAG' || newStatus === 'BEING_DIAGNOSED' || newStatus === 'IN_BAY') {
      if (!diagnosisStartedAt) {
        diagnosisStartedAt = now;
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

    const updatedRO: RepairOrder = {
      ...targetRO,
      status: newStatus,
      waitingDiagnosisAt,
      diagnosisStartedAt,
      isUrgent: isNowUrgent,
      history: [...targetRO.history, newHistoryItem],
    };

    // Optimistically update local state & sync to Firestore cloud
    setRepairOrders(prev => prev.map(ro => ro.id === roId ? updatedRO : ro));
    syncRepairOrder(updatedRO);

    triggerNotification(
      updatedRO,
      `Status: ${newStatus.replace(/_/g, ' ')}`,
      `${currentUser.name} (${currentUser.title}) updated status. ${notes ? `Note: "${notes}"` : ''}`,
      isNowUrgent,
      'STATUS_CHANGE'
    );
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
  const dispatchRO = (roId: string, techId: string, bay?: string) => {
    if (currentUser.role === 'SALES') {
      return;
    }
    const tech = users.find(u => u.id === techId);
    if (!tech) return;

    const targetRO = repairOrders.find(r => r.id === roId);
    if (!targetRO) return;

    const now = new Date().toISOString();
    const assignedBay = bay || tech.bayNumber || 'Unassigned Bay';

    const newHistory = {
      id: `hist_${Date.now()}`,
      status: 'WAITING_DIAGNOSTICS' as ROStatus,
      updatedBy: currentUser.id,
      updatedByName: currentUser.name,
      userRole: currentUser.role,
      timestamp: now,
      notes: `Assigned by ${currentUser.name} to ${tech.name} (${assignedBay}). Staged and waiting to be diagnosed.`,
    };

    const updatedRO: RepairOrder = {
      ...targetRO,
      status: 'WAITING_DIAGNOSTICS',
      techId: tech.id,
      techName: tech.name,
      bay: assignedBay,
      dispatchedAt: now,
      waitingDiagnosisAt: now,
      history: [...targetRO.history, newHistory],
    };

    setRepairOrders(prev => prev.map(ro => ro.id === roId ? updatedRO : ro));
    syncRepairOrder(updatedRO);

    triggerNotification(
      updatedRO,
      `Job Assigned to ${tech.name}`,
      `Repair Order ${targetRO.id} for ${targetRO.customerName} (${targetRO.vehicle.year} ${targetRO.vehicle.make} ${targetRO.vehicle.model}) assigned to ${assignedBay}. Staged and waiting to be diagnosed.`,
      true,
      'DISPATCH'
    );
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

  // Add Part Order
  const addPartOrder = (roId: string, part: Omit<PartItem, 'id' | 'roId'>) => {
    if (currentUser.role === 'SALES') {
      return;
    }
    const targetRO = repairOrders.find(r => r.id === roId);
    if (!targetRO) return;

    const newPart: PartItem = {
      ...part,
      id: `prt_${Date.now()}`,
      roId,
      orderedAt: part.orderedAt || new Date().toISOString(),
    };

    const updatedRO: RepairOrder = {
      ...targetRO,
      status: 'WAITING_PARTS',
      parts: [...targetRO.parts, newPart],
      history: [
        ...targetRO.history,
        {
          id: `hist_${Date.now()}`,
          status: 'WAITING_PARTS',
          updatedBy: currentUser.id,
          updatedByName: currentUser.name,
          userRole: currentUser.role,
          timestamp: new Date().toISOString(),
          notes: `Ordered part #${part.partNumber} (${part.description}). ETA: ${part.estimatedArrival}`,
        },
      ],
    };

    setRepairOrders(prev => prev.map(ro => ro.id === roId ? updatedRO : ro));
    syncRepairOrder(updatedRO);

    triggerNotification(
      updatedRO,
      `Parts Ordered: ${part.description}`,
      `Part #${part.partNumber} ordered from ${part.vendor}. Expected Arrival: ${part.estimatedArrival}`,
      true,
      'PARTS_UPDATE'
    );
  };

  // Update Part Status
  const updatePartStatus = (
    roId: string, 
    partId: string, 
    status: PartStatus, 
    eta?: string, 
    notes?: string
  ) => {
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
          notes: `Part ${partDescription} status updated to ${status.replace('_', ' ')}.${nextROStatus === 'REPAIR_IN_PROGRESS' ? ' All parts present, RO transitioned to Repair in Progress.' : nextROStatus === 'PARTS_IN_TO_TECH' ? ' Parts arrived, staged for tech.' : ''}`,
        },
      ],
    };

    setRepairOrders(prev => prev.map(ro => ro.id === roId ? updatedRO : ro));
    syncRepairOrder(updatedRO);

    triggerNotification(
      updatedRO,
      `Part ${status.replace('_', ' ')}: ${partDescription}`,
      `Status updated by ${currentUser.name}. ${eta ? `New ETA: ${eta}.` : ''}`,
      isUrgent,
      'PARTS_UPDATE'
    );
  };

  // Create new repair order
  const createRepairOrder = (data: {
    roNumber?: string;
    customerName: string;
    customerPhone: string;
    vehicle: RepairOrder['vehicle'];
    primaryConcern?: string;
    concerns?: string[];
    concernPayTypes?: ConcernPayType[];
    promisedTime?: string;
    techId?: string;
    bay?: string;
    isUrgent?: boolean;
    isWaiter?: boolean;
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

    const tech = data.techId ? users.find(u => u.id === data.techId) : undefined;
    const initialStatus: ROStatus = 'WAITING_DIAGNOSTICS';

    const cleanConcernsList = data.concerns && data.concerns.length > 0
      ? data.concerns.map(c => c.trim()).filter(Boolean)
      : (data.primaryConcern?.trim() ? [data.primaryConcern.trim()] : []);
    
    const primaryConcernText = cleanConcernsList[0] || data.primaryConcern?.trim() || 'General Inspection / Service';

    const newRO: RepairOrder = {
      id: newId,
      customerName: data.customerName,
      customerPhone: data.customerPhone,
      vehicle: data.vehicle,
      createdAt: now,
      advisorId: currentUser.role === 'SERVICE_ADVISOR' ? currentUser.id : 'usr_adv_1',
      advisorName: currentUser.role === 'SERVICE_ADVISOR' ? currentUser.name : 'Sarah Jenkins',
      techId: tech?.id,
      techName: tech?.name,
      dispatchedAt: tech ? now : undefined,
      waitingDiagnosisAt: tech ? now : undefined,
      bay: data.bay || tech?.bayNumber,
      status: initialStatus,
      isUrgent: !!data.isUrgent,
      isWaiter: !!data.isWaiter,
      promisedTime: data.promisedTime || new Date(Date.now() + 6 * 3600 * 1000).toISOString(),
      primaryConcern: primaryConcernText,
      concerns: cleanConcernsList.length > 0 ? cleanConcernsList : [primaryConcernText],
      concernPayTypes: data.concernPayTypes && data.concernPayTypes.length > 0
        ? data.concernPayTypes
        : cleanConcernsList.map(() => 'CUSTOMER_PAY'),
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

    triggerNotification(
      newRO,
      `New RO Created: ${newRO.id}`,
      `Created for ${data.customerName} (${data.vehicle.year} ${data.vehicle.make} ${data.vehicle.model}). ${tech ? `Assigned to ${tech.name}` : 'Ready to assign.'}`,
      !!data.isUrgent,
      'DISPATCH'
    );

    return newId;
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

  // Update core entered repair order details (Restricted to Service Manager)
  const updateRepairOrderDetails = (
    roId: string, 
    updates: Partial<RepairOrder>,
    options?: { isAutoSave?: boolean }
  ): boolean => {
    if (currentUser.role !== 'SERVICE_MANAGER') {
      if (!options?.isAutoSave) {
        alert('Permission Denied: Only the Service Manager has permission to modify core repair order records.');
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
                  notes: `Service Manager ${isAutoSave ? 'auto-saved' : 'updated'} core records (${Object.keys(updates).join(', ')})`
                }
              ];

          const updatedRO = {
            ...ro,
            ...updates,
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

  // Technician & Staff: Update Cause & Correction for diagnostic & repair documentation
  const updateTechCauseAndCorrection = (
    roId: string, 
    cause: string, 
    correction: string,
    options?: { isAutoSave?: boolean; notify?: boolean }
  ): boolean => {
    const targetRO = repairOrders.find(r => r.id === roId);
    if (!targetRO) return false;

    const trimmedCause = cause.trim();
    const trimmedCorrection = correction.trim();

    // If nothing changed, return true without doing redundant work
    if (targetRO.cause === trimmedCause && targetRO.correction === trimmedCorrection) {
      return true;
    }

    const isAutoSave = options?.isAutoSave ?? false;
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
      cause: trimmedCause,
      correction: trimmedCorrection,
      // For backwards compatibility, sync diagnosticNotes if empty
      diagnosticNotes: trimmedCause || targetRO.diagnosticNotes,
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

  // Update Pay Type for a specific customer complaint / concern line item (Customer Pay, Warranty, or Internal)
  const updateConcernPayType = (roId: string, concernIndex: number, payType: ConcernPayType): boolean => {
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

  // Technician Request Additional Services (MPI Findings: Air filter, cabin air filter, tires, scheduled maint, etc.)
  const addRecommendedService = (roId: string, item: {
    serviceName: string;
    category?: RecommendedService['category'];
    urgency: 'SAFETY' | 'RECOMMENDED';
    notes?: string;
  }): boolean => {
    const targetRO = repairOrders.find(r => r.id === roId);
    if (!targetRO) return false;

    const trimmedName = item.serviceName.trim();
    if (!trimmedName) return false;

    const newRec: RecommendedService = {
      id: `rec_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      roId,
      serviceName: trimmedName,
      category: item.category || 'OTHER',
      urgency: item.urgency,
      notes: item.notes?.trim() || undefined,
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
      `Tech Rec: ${newRec.serviceName}`,
      `Tech ${currentUser.name} requested "${newRec.serviceName}" (${newRec.urgency === 'SAFETY' ? 'Immediate Safety Concern' : 'Recommended Maintenance'}). Advisor authorization needed.`,
      newRec.urgency === 'SAFETY',
      'RECOMMENDED_SERVICE'
    );

    return true;
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
    const nextQuote: RepairQuote = {
      ...quote,
      status: nextStatus,
      updatedAt: now,
      submittedAt: submitToAdvisor ? (quote.submittedAt || now) : quote.submittedAt,
    };

    const nextROStatus: ROStatus = submitToAdvisor ? 'ESTIMATE_DONE' : targetRO.status;

    let newHistory = [...targetRO.history];
    if (submitToAdvisor) {
      newHistory.push({
        id: `hist_${Date.now()}`,
        status: nextROStatus,
        updatedBy: currentUser.id,
        updatedByName: currentUser.name,
        userRole: currentUser.role,
        timestamp: now,
        notes: `Tech ${currentUser.name} submitted repair quote totaling $${nextQuote.grandTotal.toFixed(2)} (${nextQuote.totalLaborHours} hrs labor + $${nextQuote.totalPartsCost.toFixed(2)} parts). Sent to Advisor for authorization.`,
      });
    } else if (!isAutoSave) {
      newHistory.push({
        id: `hist_${Date.now()}`,
        status: nextROStatus,
        updatedBy: currentUser.id,
        updatedByName: currentUser.name,
        userRole: currentUser.role,
        timestamp: now,
        notes: `Tech ${currentUser.name} saved repair quote draft ($${nextQuote.grandTotal.toFixed(2)})`,
      });
    }

    const updatedRO: RepairOrder = {
      ...targetRO,
      status: nextROStatus,
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
        `Quote Ready: $${nextQuote.grandTotal.toFixed(2)}`,
        `Tech ${currentUser.name} submitted repair quote for RO #${targetRO.id} ($${nextQuote.grandTotal.toFixed(2)}: ${nextQuote.totalLaborHours} hrs labor, $${nextQuote.totalPartsCost.toFixed(2)} parts). Awaiting customer authorization.`,
        true,
        'QUOTE_UPDATE'
      );
    }

    return true;
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

    const updatedRO: RepairOrder = {
      ...targetRO,
      status: targetROStatus,
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

    triggerNotification(
      updatedRO,
      `Quote ${status === 'APPROVED' ? 'Approved' : 'Declined'}: RO #${targetRO.id}`,
      `${currentUser.name} marked quote as ${status}${reason ? ` (${reason})` : ''}.`,
      status === 'APPROVED',
      'STATUS_CHANGE'
    );

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
    }
  ): boolean => {
    const targetRO = repairOrders.find(r => r.id === roId);
    if (!targetRO) return false;

    const now = new Date().toISOString();
    const contactId = `cnt_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`;

    const nextDueDate = contactData.nextScheduledContactDate || calculateNextContactDate(now, 3.5);

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
      notes: `Customer contact logged (${typeInfo.label}): ${contactData.summary.trim()}. Next scheduled update: ${nextDueDate}.`,
    };

    const updatedContactHistory = [newRecord, ...(targetRO.contactHistory || [])];

    const updatedRO: RepairOrder = {
      ...targetRO,
      lastContactDate: now,
      lastContactBy: currentUser.name,
      lastContactOutcome: contactData.outcome,
      nextContactDueDate: nextDueDate,
      contactHistory: updatedContactHistory,
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
    const trimmedShop = config.shopName.trim() || 'Precision Auto Care';
    setShopName(trimmedShop);

    const managerUser: User = {
      id: `usr_mgr_${Date.now()}`,
      name: config.manager.name.trim() || 'Service Manager',
      employeeNumber: config.manager.employeeNumber?.trim() || undefined,
      email: config.manager.email.trim().toLowerCase() || 'manager@precisionauto.com',
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
    setSelectedROId(null);
    setShopNameState('My Service Department');
    setIsInitialSetupCompleted(false);
    setIsSetupWizardOpen(true);

    try {
      localStorage.setItem(STORAGE_KEY_USERS, JSON.stringify([cleanManager]));
      localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(cleanManager));
      localStorage.setItem(STORAGE_KEY_ROS, JSON.stringify([]));
      localStorage.setItem(STORAGE_KEY_NOTIFS, JSON.stringify([]));
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
      return repairOrders.filter(ro => ro.techId === currentUser.id);
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
        notifications,
        selectedRO,
        isNewROModalOpen,
        isLoginModalOpen,
        isStaffManagementOpen,
        isSoundEnabled,
        pushPermission,
        isAuthenticated,
        setIsAuthenticated,
        setCurrentUser,
        setSelectedRO,
        setIsNewROModalOpen,
        setIsLoginModalOpen,
        setIsStaffManagementOpen,
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
        sendMessage,
        addPartOrder,
        updatePartStatus,
        createRepairOrder,
        markNotificationRead,
        markAllNotificationsRead,
        deleteRepairOrder,
        updateRepairOrderDetails,
        updateTechCauseAndCorrection,
        updateConcernPayType,
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
        updateRecommendedServiceStatus,
        activeQuoteRO,
        openQuoteModal,
        closeQuoteModal,
        saveRepairQuote,
        updateQuoteStatus,
        clockInToRO,
        clockOutOfRO,
        addManualTimePunch,
        updateTimePunch,
        deleteTimePunch,
        activeWarrantyPrintRO,
        openWarrantyPrintModal,
        closeWarrantyPrintModal,
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
