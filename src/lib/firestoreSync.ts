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
  limit
} from 'firebase/firestore';
import { db, auth } from './firebase';
import { RepairOrder, User, UrgentNotification } from '../types';

// Collection references
export const REPAIR_ORDERS_COL = 'repairOrders';
export const USERS_COL = 'users';
export const NOTIFICATIONS_COL = 'notifications';
export const SETTINGS_COL = 'settings';
export const SHOP_SETTINGS_DOC = 'shop';

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
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
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
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  return errInfo;
}

export interface ShopSettings {
  shopName: string;
  isSetupCompleted: boolean;
  cleanSlateInitialized?: boolean;
  seededDemoData?: boolean;
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
      email: (user.email || '').trim().toLowerCase(),
      role: user.role || 'TECHNICIAN',
      title: (user.title || '').trim(),
      avatar: user.avatar || '',
      password: user.password || user.pin || '1234',
      pin: user.pin || user.password || '1234',
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
