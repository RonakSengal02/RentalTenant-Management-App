import { Tenant, PaymentRecord, AppNotification } from '../types';

const DB_NAME = 'RentTenantManagementDB';
const DB_VERSION = 1;

let dbPromise: Promise<IDBDatabase> | null = null;

export function getDB(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      if (!db.objectStoreNames.contains('tenants')) {
        const tenantStore = db.createObjectStore('tenants', { keyPath: 'id' });
        tenantStore.createIndex('roomNumber', 'roomNumber', { unique: false });
        tenantStore.createIndex('isActive', 'isActive', { unique: false });
      }

      if (!db.objectStoreNames.contains('payments')) {
        const paymentStore = db.createObjectStore('payments', { keyPath: 'id' });
        paymentStore.createIndex('tenantId', 'tenantId', { unique: false });
        paymentStore.createIndex('billingMonth', 'billingMonth', { unique: false });
        paymentStore.createIndex('paymentDate', 'paymentDate', { unique: false });
      }

      if (!db.objectStoreNames.contains('notifications')) {
        const notifStore = db.createObjectStore('notifications', { keyPath: 'id' });
        notifStore.createIndex('isRead', 'isRead', { unique: false });
      }
    };

    request.onsuccess = (event) => {
      resolve((event.target as IDBOpenDBRequest).result);
    };

    request.onerror = (event) => {
      console.error('IndexedDB open error:', (event.target as IDBOpenDBRequest).error);
      reject((event.target as IDBOpenDBRequest).error);
    };
  });

  return dbPromise;
}

/**
 * Requests the browser / OS to mark the app's local storage as PERSISTENT.
 * This prevents Android / iOS from ever auto-clearing tenant records.
 */
export async function requestPersistentStorage(): Promise<boolean> {
  if (navigator.storage && navigator.storage.persist) {
    try {
      const isPersisted = await navigator.storage.persist();
      console.log('IndexedDB persistent storage status:', isPersisted);
      return isPersisted;
    } catch (e) {
      console.warn('Storage persist request error:', e);
    }
  }
  return false;
}

/**
 * Checks storage quota and persistence state
 */
export async function getStorageInfo(): Promise<{ isPersisted: boolean; usedKb: number }> {
  let isPersisted = false;
  let usedKb = 0;

  if (navigator.storage) {
    if (navigator.storage.persisted) {
      isPersisted = await navigator.storage.persisted();
    }
    if (navigator.storage.estimate) {
      const est = await navigator.storage.estimate();
      if (est.usage) {
        usedKb = Math.round(est.usage / 1024);
      }
    }
  }

  return { isPersisted, usedKb };
}

// Default initial sample data
export const INITIAL_SAMPLE_TENANTS: Tenant[] = [
  {
    id: 'tenant-102-rahul',
    name: 'Rahul Patel',
    mobile: '9876543210',
    roomNumber: '102',
    address: 'Near Old Bus Stand, Nadiad, Gujarat',
    joiningDate: '2026-01-10',
    monthlyRent: 7000,
    securityDeposit: 14000,
    rentDueDay: 10,
    isActive: true,
    photoUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
    notes: 'Works at IT firm. Rent due on 10th of every month.',
    createdAt: new Date('2026-01-10').toISOString()
  },
  {
    id: 'tenant-204-priya',
    name: 'Priya Shah',
    mobile: '9825012345',
    roomNumber: '204',
    address: 'B-12 Shantiniketan, Ahmedabad, Gujarat',
    joiningDate: '2026-03-05',
    monthlyRent: 9500,
    securityDeposit: 20000,
    rentDueDay: 5,
    isActive: true,
    photoUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
    notes: 'Family of two. Rent paid regularly on 5th.',
    createdAt: new Date('2026-03-05').toISOString()
  },
  {
    id: 'tenant-301-amit',
    name: 'Amit Dave',
    mobile: '9712345678',
    roomNumber: '301',
    address: 'V.V. Nagar, Anand, Gujarat',
    joiningDate: '2026-04-15',
    monthlyRent: 8000,
    securityDeposit: 16000,
    rentDueDay: 25,
    isActive: true,
    photoUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
    notes: 'Lecturer at college.',
    createdAt: new Date('2026-04-15').toISOString()
  },
  {
    id: 'tenant-101-jayesh',
    name: 'Jayesh Makwana',
    mobile: '9909098765',
    roomNumber: '101',
    address: 'Alkapuri, Vadodara, Gujarat',
    joiningDate: '2026-02-23',
    monthlyRent: 6500,
    securityDeposit: 13000,
    rentDueDay: 23,
    isActive: true,
    photoUrl: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&auto=format&fit=crop&q=80',
    notes: 'Single professional. Rent due today.',
    createdAt: new Date('2026-02-23').toISOString()
  }
];

export const INITIAL_SAMPLE_PAYMENTS: PaymentRecord[] = [
  {
    id: 'pay-priya-sep2026',
    tenantId: 'tenant-204-priya',
    tenantName: 'Priya Shah',
    roomNumber: '204',
    amountPaid: 9500,
    billingMonth: '2026-09',
    billingMonthLabel: 'September 2026',
    paymentDate: '2026-09-05',
    paymentMethod: 'UPI',
    referenceNotes: 'UPI/GPay: 9825012345@oksbi / Ref 625901847',
    createdAt: new Date('2026-09-05T11:30:00').toISOString()
  },
  {
    id: 'pay-rahul-aug2026',
    tenantId: 'tenant-102-rahul',
    tenantName: 'Rahul Patel',
    roomNumber: '102',
    amountPaid: 7000,
    billingMonth: '2026-08',
    billingMonthLabel: 'August 2026',
    paymentDate: '2026-08-10',
    paymentMethod: 'Cash',
    referenceNotes: 'Cash received at office',
    createdAt: new Date('2026-08-10T14:15:00').toISOString()
  },
  {
    id: 'pay-amit-aug2026',
    tenantId: 'tenant-301-amit',
    tenantName: 'Amit Dave',
    roomNumber: '301',
    amountPaid: 8000,
    billingMonth: '2026-08',
    billingMonthLabel: 'August 2026',
    paymentDate: '2026-08-25',
    paymentMethod: 'Bank Transfer',
    referenceNotes: 'NEFT HDFC0001429 Ref 983201',
    createdAt: new Date('2026-08-25T10:00:00').toISOString()
  }
];
