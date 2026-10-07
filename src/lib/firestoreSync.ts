import {
  collection,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  getDoc,
  onSnapshot,
  getDocs,
  writeBatch,
  query,
  orderBy,
  limit,
  arrayUnion
} from 'firebase/firestore';
import { db, auth } from './firebase';
import { RepairOrder, User, UrgentNotification, ShopChatMessage, Customer, StandaloneQuote } from '../types';

// Collection references
export const REPAIR_ORDERS_COL = 'repairOrders';
export const CUSTOMERS_COL = 'customers';
export const USERS_COL = 'users';
export const NOTIFICATIONS_COL = 'notifications';
export const SETTINGS_COL = 'settings';
export const SHOP_SETTINGS_DOC = 'shop';
export const SHOP_MESSAGES_COL = 'shopMessages';
export const QUOTES_COL = 'standaloneQuotes';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errMsg = error instanceof Error ? error.message : String(error);
  const isQuotaError = errMsg.toLowerCase().includes('quota limit exceeded') || errMsg.toLowerCase().includes('resource-exhausted');

  const errInfo: FirestoreErrorInfo = {
    error: errMsg,
    authInfo: {
      userId: auth?.currentUser?.uid,
      email: auth?.currentUser?.email,
      emailVerified: auth?.currentUser?.emailVerified,
      isAnonymous: auth?.currentUser?.isAnonymous,
      tenantId: auth?.currentUser?.tenantId,
      providerInfo: auth?.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };

  if (isQuotaError) {
    console.warn(`[Firestore Quota Limit] Serving from persistent local cache & storage for path: ${path}`);
  } else {
    console.error('Firestore Error: ', JSON.stringify(errInfo));
  }
  return errInfo;
}

export interface ShopSettings {
  shopName: string;
  isSetupCompleted: boolean;
  cleanSlateInitialized?: boolean;
  seededDemoData?: boolean;
  inspectionChecklist?: any;
  staffLeaveEntries?: any[];
  appointments?: any[];
  updatedAt?: string;
}

// Subscribe to real-time repair orders
export function subscribeToRepairOrders(callback: (ros: RepairOrder[]) => void) {
  const colRef = collection(db, REPAIR_ORDERS_COL);
  return onSnapshot(colRef, (snapshot) => {
    const ros: RepairOrder[] = [];
    snapshot.forEach((docSnap) => {
      ros.push(docSnap.data() as RepairOrder);
    });
    // Sort descending by creation date
    ros.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
    callback(ros);
  }, (error) => {
    handleFirestoreError(error, OperationType.LIST, REPAIR_ORDERS_COL);
  });
}

// Subscribe to real-time users/staff
export function subscribeToUsers(callback: (users: User[]) => void) {
  const colRef = collection(db, USERS_COL);
  return onSnapshot(colRef, (snapshot) => {
    const list: User[] = [];
    snapshot.forEach((docSnap) => {
      list.push(docSnap.data() as User);
    });
    callback(list);
  }, (error) => {
    handleFirestoreError(error, OperationType.LIST, USERS_COL);
  });
}

// Subscribe to real-time notifications
export function subscribeToNotifications(callback: (notifs: UrgentNotification[]) => void) {
  const colRef = collection(db, NOTIFICATIONS_COL);
  const q = query(colRef, orderBy('timestamp', 'desc'), limit(50));
  return onSnapshot(q, (snapshot) => {
    const list: UrgentNotification[] = [];
    snapshot.forEach((docSnap) => {
      list.push(docSnap.data() as UrgentNotification);
    });
    callback(list);
  }, (error) => {
    handleFirestoreError(error, OperationType.LIST, NOTIFICATIONS_COL);
  });
}

// 24-hour expiration constant for shop chat messages
export const CHAT_MAX_AGE_MS = 24 * 60 * 60 * 1000;

// Delete specific shop chat messages from Firestore
export async function deleteShopMessagesFromCloud(messageIds: string[]) {
  if (!messageIds || messageIds.length === 0) return;
  try {
    const promises = messageIds.map(msgId => {
      const docRef = doc(db, SHOP_MESSAGES_COL, msgId);
      return deleteDoc(docRef).catch(() => {});
    });
    await Promise.all(promises);
  } catch (err) {
    console.error('Failed to auto-delete expired shop messages from Firestore:', err);
  }
}

// Subscribe to real-time shop chat messages with automatic 24-hour expiration & deletion
export function subscribeToShopMessages(callback: (messages: ShopChatMessage[]) => void) {
  const colRef = collection(db, SHOP_MESSAGES_COL);
  const q = query(colRef, orderBy('timestamp', 'asc'), limit(250));
  return onSnapshot(q, (snapshot) => {
    const list: ShopChatMessage[] = [];
    const expiredIds: string[] = [];
    const now = Date.now();

    snapshot.forEach((docSnap) => {
      const msg = docSnap.data() as ShopChatMessage;
      const msgTime = new Date(msg.timestamp).getTime();
      // If message is older than 24 hours, automatically purge from Firestore
      if (!isNaN(msgTime) && (now - msgTime) > CHAT_MAX_AGE_MS) {
        expiredIds.push(msg.id || docSnap.id);
      } else {
        list.push(msg);
      }
    });

    if (expiredIds.length > 0) {
      deleteShopMessagesFromCloud(expiredIds);
    }

    callback(list);
  }, (error) => {
    handleFirestoreError(error, OperationType.LIST, SHOP_MESSAGES_COL);
  });
}

// Subscribe to real-time customers collection in the cloud
export function subscribeToCustomers(callback: (customers: Customer[]) => void) {
  const colRef = collection(db, CUSTOMERS_COL);
  return onSnapshot(colRef, (snapshot) => {
    const list: Customer[] = [];
    snapshot.forEach((docSnap) => {
      list.push(docSnap.data() as Customer);
    });
    list.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    callback(list);
  }, (error) => {
    handleFirestoreError(error, OperationType.LIST, CUSTOMERS_COL);
  });
}

// Save a shop chat message
export async function saveShopMessage(msg: ShopChatMessage) {
  const docRef = doc(db, SHOP_MESSAGES_COL, msg.id);
  const cleanData = sanitizeForFirestore(msg);
  await setDoc(docRef, cleanData);
}

// Mark shop chat messages as read by a specific user in Firestore
export async function markShopMessagesReadInCloud(messageIds: string[], userId: string) {
  if (!messageIds || messageIds.length === 0 || !userId) return;
  try {
    const promises = messageIds.map(msgId => {
      const docRef = doc(db, SHOP_MESSAGES_COL, msgId);
      return setDoc(docRef, {
        readBy: arrayUnion(userId)
      }, { merge: true }).catch(() => {
        // If document does not exist or network glitch, ignore
      });
    });

    // Also persist read status to user's profile doc in Firestore so any login/device immediately knows
    const userDocRef = doc(db, USERS_COL, userId);
    promises.push(
      setDoc(userDocRef, {
        lastReadChatTimestamp: new Date().toISOString(),
        readShopMessageIds: arrayUnion(...messageIds)
      }, { merge: true }).catch(() => {})
    );

    await Promise.all(promises);
  } catch (err) {
    console.error('Failed to sync shop message read status to Firestore:', err);
  }
}

// Mark all shop chat notifications as read in cloud for a user
export async function markShopChatNotificationsReadInCloud(notifIds: string[]) {
  if (!notifIds || notifIds.length === 0) return;
  try {
    const promises = notifIds.map(notifId => {
      const docRef = doc(db, NOTIFICATIONS_COL, notifId);
      return setDoc(docRef, { read: true }, { merge: true }).catch(() => {});
    });
    await Promise.all(promises);
  } catch (err) {
    console.error('Failed to mark shop chat notifications read in cloud:', err);
  }
}

// Subscribe to real-time shop settings
export function subscribeToShopSettings(callback: (settings: ShopSettings | null) => void) {
  const docRef = doc(db, SETTINGS_COL, SHOP_SETTINGS_DOC);
  return onSnapshot(docRef, (snapshot) => {
    if (snapshot.exists()) {
      callback(snapshot.data() as ShopSettings);
    } else {
      callback(null);
    }
  }, (error) => {
    handleFirestoreError(error, OperationType.GET, `${SETTINGS_COL}/${SHOP_SETTINGS_DOC}`);
  });
}

/**
 * Recursively cleans an object to make it 100% safe for Firestore setDoc / updateDoc operations.
 * Firestore SDK rejects undefined values with a fatal runtime error:
 * "Function setDoc() called with invalid data. Unsupported field value: undefined".
 * This helper strips all undefined properties while preserving nulls, booleans, strings, numbers, arrays, and objects.
 */
export function sanitizeForFirestore<T>(val: T): T {
  if (val === undefined) {
    return null as any;
  }
  if (val === null || typeof val !== 'object') {
    return val;
  }
  if (Array.isArray(val)) {
    return val
      .filter(item => item !== undefined)
      .map(item => sanitizeForFirestore(item)) as any;
  }
  const clean: Record<string, any> = {};
  for (const [k, v] of Object.entries(val as Record<string, any>)) {
    if (v !== undefined) {
      clean[k] = sanitizeForFirestore(v);
    }
  }
  return clean as T;
}

// Save or update a repair order
export async function syncRepairOrder(ro: RepairOrder): Promise<boolean> {
  try {
    const cleanRO = sanitizeForFirestore(ro);
    const docRef = doc(db, REPAIR_ORDERS_COL, ro.id);
    await setDoc(docRef, cleanRO, { merge: true });
    return true;
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `${REPAIR_ORDERS_COL}/${ro.id}`);
    return false;
  }
}

// Delete a repair order
export async function deleteRepairOrderDoc(roId: string) {
  try {
    const docRef = doc(db, REPAIR_ORDERS_COL, roId);
    await deleteDoc(docRef);
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `${REPAIR_ORDERS_COL}/${roId}`);
  }
}

// Save or update a user
export async function syncUser(user: User): Promise<boolean> {
  try {
    const cleanUser = sanitizeForFirestore({
      id: user.id,
      name: (user.name || '').trim(),
      employeeNumber: (user.employeeNumber || '').trim(),
      email: (user.email || '').trim().toLowerCase(),
      role: user.role || 'TECHNICIAN',
      title: (user.title || '').trim(),
      avatar: user.avatar || '',
      pin: user.pin || '1234',
      phone: (user.phone || '').trim(),
      certificationLevel: (user.certificationLevel || '').trim(),
      bayNumber: (user.bayNumber || user.certificationLevel || '').trim(),
      isDeactivated: !!user.isDeactivated,
    });
    const docRef = doc(db, USERS_COL, user.id);
    await setDoc(docRef, cleanUser, { merge: true });
    console.log(`[Firestore] Successfully saved user ${cleanUser.name} (${cleanUser.id})`);
    return true;
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `${USERS_COL}/${user.id}`);
    return false;
  }
}

// Remove a user
export async function deleteUserDoc(userId: string) {
  try {
    const docRef = doc(db, USERS_COL, userId);
    await deleteDoc(docRef);
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `${USERS_COL}/${userId}`);
  }
}

// Save or update a customer profile in the cloud
export async function syncCustomer(customer: Customer): Promise<boolean> {
  try {
    const cleanCustomer = sanitizeForFirestore({
      id: customer.id,
      name: (customer.name || '').trim(),
      phone: (customer.phone || '').trim(),
      email: (customer.email || '').trim().toLowerCase(),
      address: (customer.address || '').trim(),
      isTaxExempt: !!customer.isTaxExempt,
      taxExemptNumber: (customer.taxExemptNumber || '').trim(),
      notes: (customer.notes || '').trim(),
      vehicles: customer.vehicles || [],
      lastVisit: customer.lastVisit || new Date().toISOString(),
      totalVisits: Number(customer.totalVisits) || 1,
      createdAt: customer.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    const docRef = doc(db, CUSTOMERS_COL, customer.id);
    await setDoc(docRef, cleanCustomer, { merge: true });
    return true;
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `${CUSTOMERS_COL}/${customer.id}`);
    return false;
  }
}

// Delete a customer profile from the cloud
export async function deleteCustomerDoc(customerId: string) {
  try {
    const docRef = doc(db, CUSTOMERS_COL, customerId);
    await deleteDoc(docRef);
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `${CUSTOMERS_COL}/${customerId}`);
  }
}

// Save notification
export async function syncNotification(notif: UrgentNotification): Promise<boolean> {
  try {
    const cleanNotif = sanitizeForFirestore(notif);
    const docRef = doc(db, NOTIFICATIONS_COL, notif.id);
    await setDoc(docRef, cleanNotif, { merge: true });
    return true;
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `${NOTIFICATIONS_COL}/${notif.id}`);
    return false;
  }
}

// Mark notification as read
export async function markNotificationReadDoc(notifId: string) {
  try {
    const docRef = doc(db, NOTIFICATIONS_COL, notifId);
    await updateDoc(docRef, { read: true });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `${NOTIFICATIONS_COL}/${notifId}`);
  }
}

// Mark all notifications read
export async function markAllNotificationsReadDocs(notifIds: string[]) {
  try {
    const batch = writeBatch(db);
    notifIds.forEach(id => {
      const docRef = doc(db, NOTIFICATIONS_COL, id);
      batch.update(docRef, { read: true });
    });
    await batch.commit();
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, NOTIFICATIONS_COL);
  }
}

// Subscribe to real-time standalone quotes / estimates
export function subscribeToStandaloneQuotes(callback: (quotes: StandaloneQuote[]) => void) {
  const colRef = collection(db, QUOTES_COL);
  return onSnapshot(colRef, (snapshot) => {
    const quoteList: StandaloneQuote[] = [];
    snapshot.forEach((docSnap) => {
      quoteList.push(docSnap.data() as StandaloneQuote);
    });
    // Sort descending by creation date
    quoteList.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
    callback(quoteList);
  }, (error) => {
    handleFirestoreError(error, OperationType.LIST, QUOTES_COL);
  });
}

// Save or update a standalone quote
export async function syncStandaloneQuote(quote: StandaloneQuote): Promise<boolean> {
  try {
    const cleanQuote = sanitizeForFirestore(quote);
    const docRef = doc(db, QUOTES_COL, quote.id);
    await setDoc(docRef, cleanQuote, { merge: true });
    return true;
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `${QUOTES_COL}/${quote.id}`);
    return false;
  }
}

// Delete a standalone quote
export async function deleteStandaloneQuoteDoc(quoteId: string) {
  try {
    const docRef = doc(db, QUOTES_COL, quoteId);
    await deleteDoc(docRef);
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `${QUOTES_COL}/${quoteId}`);
  }
}

// Save shop settings
export async function syncShopSettings(settings: Partial<ShopSettings>) {
  try {
    const cleanSettings = sanitizeForFirestore({ ...settings, updatedAt: new Date().toISOString() });
    const docRef = doc(db, SETTINGS_COL, SHOP_SETTINGS_DOC);
    await setDoc(docRef, cleanSettings, { merge: true });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `${SETTINGS_COL}/${SHOP_SETTINGS_DOC}`);
  }
}

// Clear all repair orders
export async function clearAllROsFromFirestore() {
  try {
    const roSnap = await getDocs(collection(db, REPAIR_ORDERS_COL));
    const batch = writeBatch(db);
    roSnap.forEach(d => batch.delete(d.ref));
    await batch.commit();

    const notifSnap = await getDocs(collection(db, NOTIFICATIONS_COL));
    const notifBatch = writeBatch(db);
    notifSnap.forEach(d => notifBatch.delete(d.ref));
    await notifBatch.commit();
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, REPAIR_ORDERS_COL);
  }
}

// Completely reset Firestore to clean slate with initial manager user
export async function resetAllDataToCleanSlate(cleanManager: User, shopName: string) {
  try {
    // 1. Delete all repair orders
    const roSnap = await getDocs(collection(db, REPAIR_ORDERS_COL));
    const roBatch = writeBatch(db);
    roSnap.forEach(d => roBatch.delete(d.ref));
    await roBatch.commit();

    // 2. Delete all notifications
    const notifSnap = await getDocs(collection(db, NOTIFICATIONS_COL));
    const notifBatch = writeBatch(db);
    notifSnap.forEach(d => notifBatch.delete(d.ref));
    await notifBatch.commit();

    // 3. Reset users to just the single clean manager
    const usersSnap = await getDocs(collection(db, USERS_COL));
    const usersBatch = writeBatch(db);
    usersSnap.forEach(d => usersBatch.delete(d.ref));
    const mgrDoc = doc(db, USERS_COL, cleanManager.id);
    usersBatch.set(mgrDoc, sanitizeForFirestore(cleanManager));
    await usersBatch.commit();

    // 4. Reset shop settings with cleanSlateInitialized = true to prevent auto-re-seeding
    const settingsDoc = doc(db, SETTINGS_COL, SHOP_SETTINGS_DOC);
    await setDoc(settingsDoc, {
      shopName: shopName || 'My Service Department',
      isSetupCompleted: false,
      cleanSlateInitialized: true,
      seededDemoData: false,
      updatedAt: new Date().toISOString()
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, USERS_COL);
  }
}

// Seed initial data to Firestore if empty, unless clean slate was requested
export async function seedInitialDataIfEmpty(initialUsers: User[], initialROs: RepairOrder[], defaultShopName: string) {
  try {
    const settingsDoc = doc(db, SETTINGS_COL, SHOP_SETTINGS_DOC);
    const settingsSnap = await getDoc(settingsDoc);

    // If shop settings exist and mark this as an intentionally clean slate, do NOT re-seed sample tickets
    if (settingsSnap.exists()) {
      const data = settingsSnap.data() as ShopSettings;
      if (data.cleanSlateInitialized) {
        return;
      }
    }

    const usersSnap = await getDocs(collection(db, USERS_COL));
    if (usersSnap.empty) {
      console.log('Seeding initial users to Firestore...');
      const batch = writeBatch(db);
      initialUsers.forEach(u => {
        const docRef = doc(db, USERS_COL, u.id);
        batch.set(docRef, sanitizeForFirestore(u));
      });
      await batch.commit();
    }

    const roSnap = await getDocs(collection(db, REPAIR_ORDERS_COL));
    if (roSnap.empty && initialROs.length > 0) {
      console.log('Seeding initial repair orders to Firestore...');
      const batch = writeBatch(db);
      initialROs.forEach(ro => {
        const docRef = doc(db, REPAIR_ORDERS_COL, ro.id);
        batch.set(docRef, sanitizeForFirestore(ro));
      });
      await batch.commit();
    }

    const custSnap = await getDocs(collection(db, CUSTOMERS_COL));
    if (custSnap.empty && initialROs.length > 0) {
      console.log('Populating cloud customer profiles from repair orders...');
      const customerMap = new Map<string, Customer>();
      initialROs.forEach(ro => {
        const key = (ro.customerPhone || ro.customerName).trim().toLowerCase();
        if (!key) return;
        const existing = customerMap.get(key);
        if (existing) {
          if (!existing.vehicles.some(v => v.vin === ro.vehicle.vin)) {
            existing.vehicles.push(ro.vehicle);
          }
          existing.totalVisits += 1;
          if (new Date(ro.createdAt) > new Date(existing.lastVisit || '')) {
            existing.lastVisit = ro.createdAt;
          }
        } else {
          const custId = `cust_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
          customerMap.set(key, {
            id: custId,
            name: ro.customerName,
            phone: ro.customerPhone || '',
            email: '',
            isTaxExempt: !!ro.isTaxExempt,
            taxExemptNumber: ro.taxExemptNumber || '',
            notes: '',
            vehicles: [ro.vehicle],
            lastVisit: ro.createdAt,
            totalVisits: 1,
            createdAt: ro.createdAt || new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          });
        }
      });

      if (customerMap.size > 0) {
        const custBatch = writeBatch(db);
        customerMap.forEach(cust => {
          const docRef = doc(db, CUSTOMERS_COL, cust.id);
          custBatch.set(docRef, sanitizeForFirestore(cust));
        });
        await custBatch.commit();
      }
    }

    await setDoc(settingsDoc, {
      shopName: defaultShopName,
      isSetupCompleted: false,
      cleanSlateInitialized: false,
      seededDemoData: true,
      updatedAt: new Date().toISOString()
    }, { merge: true });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, USERS_COL);
  }
}
