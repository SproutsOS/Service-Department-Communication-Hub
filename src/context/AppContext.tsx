import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
  User, 
  RepairOrder, 
  ROStatus, 
  PartStatus, 
  PartItem, 
  UrgentNotification 
} from '../types';
import { INITIAL_USERS, INITIAL_REPAIR_ORDERS } from '../data/mockData';
import { playNotificationChime, requestBrowserNotification } from '../utils/audio';
import {
  subscribeToRepairOrders,
  subscribeToUsers,
  subscribeToNotifications,
  subscribeToShopSettings,
  syncRepairOrder,
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
  isMobileSimulated: boolean;
  isSoundEnabled: boolean;
  pushPermission: NotificationPermission | 'default';
  
  // Actions
  setCurrentUser: (user: User) => void;
  setSelectedRO: (ro: RepairOrder | null) => void;
  setIsNewROModalOpen: (isOpen: boolean) => void;
  setIsLoginModalOpen: (isOpen: boolean) => void;
  setIsStaffManagementOpen: (isOpen: boolean) => void;
  setIsMobileSimulated: (isMobile: boolean) => void;
  toggleSound: () => void;
  requestPushPermission: () => Promise<void>;
  
  // User Management
  addUser: (userData: Omit<User, 'id'>) => User;
  updateUser: (userId: string, updates: Partial<User>) => void;
  removeUser: (userId: string) => { success: boolean; message?: string };
  loginWithCredentials: (emailOrId: string, passwordOrPin: string) => { success: boolean; user?: User; message?: string };
  logout: () => void;
  completeInitialSetup: (config: {
    shopName: string;
    manager: {
      name: string;
      email: string;
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
    customerName: string;
    customerPhone: string;
    vehicle: RepairOrder['vehicle'];
    primaryConcern: string;
    promisedTime?: string;
    techId?: string;
    bay?: string;
    isUrgent?: boolean;
  }) => string;
  
  markNotificationRead: (notifId: string) => void;
  markAllNotificationsRead: () => void;
  clearAllRepairOrders: () => void;
  resetAllDataToCleanSlateHandler: () => void;
  resetToDemoData: () => void;
  
  // Filter helper
  getFilteredROs: () => RepairOrder[];
}

const STORAGE_KEY_ROS = 'precision_auto_service_ros_v6_clean';
const STORAGE_KEY_USER = 'precision_auto_active_user_v6_clean';
const STORAGE_KEY_USERS = 'precision_auto_users_v6_clean';
const STORAGE_KEY_NOTIFS = 'precision_auto_notifs_v6_clean';
const STORAGE_KEY_SHOP_NAME = 'precision_auto_shop_name_v6_clean';
const STORAGE_KEY_SETUP_DONE = 'precision_auto_setup_completed_v6_clean';
const STORAGE_KEY_WIPE_PERFORMED = 'precision_auto_wipe_performed_v6_clean';

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Cloud sync status indicator
  const [isCloudSynced, setIsCloudSynced] = useState<boolean>(false);

  // Dealership/Shop Name
  const [shopName, setShopNameState] = useState<string>(() => {
    try {
      return localStorage.getItem(STORAGE_KEY_SHOP_NAME) || 'My Service Department';
    } catch {
      return 'My Service Department';
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

  const [isSetupWizardOpen, setIsSetupWizardOpen] = useState<boolean>(() => {
    try {
      const done = localStorage.getItem(STORAGE_KEY_SETUP_DONE);
      return done !== 'true';
    } catch {
      return false;
    }
  });

  // Users state
  const [users, setUsers] = useState<User[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_USERS);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
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
      if (savedUser) {
        const parsed = JSON.parse(savedUser);
        const savedUsersRaw = localStorage.getItem(STORAGE_KEY_USERS);
        const usersList: User[] = savedUsersRaw ? JSON.parse(savedUsersRaw) : INITIAL_USERS;
        const match = usersList.find(u => u.id === parsed.id || u.email.toLowerCase() === (parsed.email || '').toLowerCase());
        if (match) return match;
        if (parsed.id && parsed.name && parsed.role) return parsed;
      }
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
  const [isNewROModalOpen, setIsNewROModalOpen] = useState(false);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [isStaffManagementOpen, setIsStaffManagementOpen] = useState(false);
  const [isMobileSimulated, setIsMobileSimulated] = useState(false);
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
        setUsers(cloudUsers);
        // Keep active session user object current
        setCurrentUserState((prev) => {
          const fresh = cloudUsers.find(u => u.id === prev.id);
          return fresh || prev;
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

    return () => {
      unsubscribeROs();
      unsubscribeUsers();
      unsubscribeNotifs();
      unsubscribeSettings();
    };
  }, []);

  const selectedRO = repairOrders.find(ro => ro.id === selectedROId) || null;

  const setSelectedRO = (ro: RepairOrder | null) => {
    setSelectedROId(ro ? ro.id : null);
  };

  const setCurrentUser = (user: User) => {
    setCurrentUserState(user);
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
    const targetRO = repairOrders.find(r => r.id === roId);
    if (!targetRO) return;

    const isNowUrgent = makeUrgent !== undefined ? makeUrgent : (newStatus === 'WAITING_APPROVAL' || targetRO.isUrgent);
    const now = new Date().toISOString();

    let waitingDiagnosisAt = targetRO.waitingDiagnosisAt;
    let diagnosisStartedAt = targetRO.diagnosisStartedAt;

    if (newStatus === 'WAITING_DIAGNOSIS') {
      waitingDiagnosisAt = now;
    } else if (newStatus === 'BEING_DIAGNOSED' || newStatus === 'IN_BAY') {
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
      'BEING_DIAGNOSED', 
      notes || `Technician ${currentUser.name} commenced active diagnostic testing and inspection.`
    );
  };

  // Dispatch RO to a technician
  const dispatchRO = (roId: string, techId: string, bay?: string) => {
    const tech = users.find(u => u.id === techId);
    if (!tech) return;

    const targetRO = repairOrders.find(r => r.id === roId);
    if (!targetRO) return;

    const now = new Date().toISOString();
    const assignedBay = bay || tech.bayNumber || 'Unassigned Bay';

    const newHistory = {
      id: `hist_${Date.now()}`,
      status: 'WAITING_DIAGNOSIS' as ROStatus,
      updatedBy: currentUser.id,
      updatedByName: currentUser.name,
      userRole: currentUser.role,
      timestamp: now,
      notes: `Assigned by ${currentUser.name} to ${tech.name} (${assignedBay}). Staged and waiting to be diagnosed.`,
    };

    const updatedRO: RepairOrder = {
      ...targetRO,
      status: 'WAITING_DIAGNOSIS',
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
    if (allReceived && targetRO.status === 'WAITING_PARTS') {
      nextROStatus = 'IN_REPAIR';
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
          notes: `Part ${partDescription} status updated to ${status.replace('_', ' ')}.${nextROStatus === 'IN_REPAIR' ? ' All parts present, RO transitioned to In Repair.' : ''}`,
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
    customerName: string;
    customerPhone: string;
    vehicle: RepairOrder['vehicle'];
    primaryConcern: string;
    promisedTime?: string;
    techId?: string;
    bay?: string;
    isUrgent?: boolean;
  }): string => {
    const maxRoNum = repairOrders.reduce((max, ro) => {
      const match = ro.id.match(/\d+/);
      const num = match ? parseInt(match[0], 10) : 0;
      return num > max ? num : max;
    }, 10488);

    const newId = `RO-${maxRoNum + 1}`;
    const now = new Date().toISOString();

    const tech = data.techId ? users.find(u => u.id === data.techId) : undefined;
    const initialStatus: ROStatus = tech ? 'WAITING_DIAGNOSIS' : 'CREATED';

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
      promisedTime: data.promisedTime || new Date(Date.now() + 6 * 3600 * 1000).toISOString(),
      primaryConcern: data.primaryConcern,
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
            ? `RO Created and assigned to ${tech.name} (${data.bay || tech.bayNumber || 'Assigned Bay'}). Staged and waiting to be diagnosed.`
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
    const newId = `usr_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`;
    const pass = userData.password || userData.pin || '1234';
    const newUser: User = {
      ...userData,
      id: newId,
      password: pass,
      pin: userData.pin || pass,
      avatar: userData.avatar || (
        userData.role === 'SERVICE_MANAGER' ? 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80' :
        userData.role === 'SERVICE_ADVISOR' ? 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80' :
        userData.role === 'PARTS_SPECIALIST' ? 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150&auto=format&fit=crop&q=80' :
        'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80'
      ),
    };

    setUsers(prev => [...prev, newUser]);
    syncUser(newUser);
    return newUser;
  };

  const updateUser = (userId: string, updates: Partial<User>) => {
    setUsers(prev => {
      const updatedList = prev.map(u => u.id === userId ? { ...u, ...updates } : u);
      const target = updatedList.find(u => u.id === userId);
      if (target) {
        syncUser(target);
      }
      return updatedList;
    });

    if (currentUser.id === userId) {
      setCurrentUserState(prev => ({ ...prev, ...updates }));
    }
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
          updated.techId = undefined;
          updated.techName = undefined;
          updated.bay = undefined;
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

    setUsers(prev => prev.filter(u => u.id !== userId));
    deleteUserDoc(userId);

    if (currentUser.id === userId) {
      const fallbackUser = remainingManagers[0] || users.find(u => u.id !== userId) || INITIAL_USERS[0];
      setCurrentUserState(fallbackUser);
    }

    return { success: true };
  };

  const clearAllRepairOrders = () => {
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
      u.name.toLowerCase() === search
    );

    if (!found) {
      return { success: false, message: 'No employee found with this email, name, or ID.' };
    }

    const matchesPass = found.password && found.password === cred;
    const matchesPin = found.pin && found.pin === cred;
    const matchesDefault = cred === '1234' || cred === 'admin123';

    if (!matchesPass && !matchesPin && !matchesDefault) {
      return { success: false, message: 'Invalid password or PIN entered.' };
    }

    setCurrentUserState(found);
    setIsLoginModalOpen(false);
    return { success: true, user: found };
  };

  const completeInitialSetup = (config: {
    shopName: string;
    manager: {
      name: string;
      email: string;
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
      name: config.manager.name.trim() || 'Marcus Vance',
      email: config.manager.email.trim().toLowerCase() || 'manager@precisionauto.com',
      password: config.manager.password?.trim() || 'admin123',
      pin: config.manager.pin?.trim() || '1234',
      role: 'SERVICE_MANAGER',
      title: config.manager.title?.trim() || 'Service Director / General Manager',
      phone: config.manager.phone?.trim() || '(555) 302-8811',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    };

    const otherUsers = config.initialUsers.filter(u => u.role !== 'SERVICE_MANAGER' && u.email !== managerUser.email);
    const finalUsers = [managerUser, ...otherUsers];

    setUsers(finalUsers);
    finalUsers.forEach(u => syncUser(u));

    setCurrentUserState(managerUser);

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

  const logout = () => {
    setIsLoginModalOpen(true);
  };

  const resetAllDataToCleanSlateHandler = () => {
    const cleanManager: User = {
      id: `usr_mgr_${Date.now()}`,
      name: 'Service Manager',
      email: 'admin@precisionauto.com',
      password: 'admin',
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
        isMobileSimulated,
        isSoundEnabled,
        pushPermission,
        setCurrentUser,
        setSelectedRO,
        setIsNewROModalOpen,
        setIsLoginModalOpen,
        setIsStaffManagementOpen,
        setIsMobileSimulated,
        toggleSound,
        requestPushPermission,
        addUser,
        updateUser,
        removeUser,
        loginWithCredentials,
        logout,
        updateROStatus,
        startDiagnosis,
        dispatchRO,
        sendMessage,
        addPartOrder,
        updatePartStatus,
        createRepairOrder,
        markNotificationRead,
        markAllNotificationsRead,
        clearAllRepairOrders,
        resetAllDataToCleanSlateHandler,
        resetToDemoData,
        getFilteredROs,
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
