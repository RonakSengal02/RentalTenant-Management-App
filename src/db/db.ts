import { Tenant, PaymentRecord, AppNotification, Room } from '../types';

const DB_NAME = 'RentTenantManagementDB';
const DB_VERSION = 2;

let dbPromise: Promise<IDBDatabase> | null = null;

export function getDB(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      // Tenants store
      let tenantStore: IDBObjectStore;
      if (!db.objectStoreNames.contains('tenants')) {
        tenantStore = db.createObjectStore('tenants', { keyPath: 'id' });
        tenantStore.createIndex('roomNumber', 'roomNumber', { unique: false });
        tenantStore.createIndex('isActive', 'isActive', { unique: false });
      } else {
        tenantStore = (event.target as IDBOpenDBRequest).transaction!.objectStore('tenants');
      }

      if (!tenantStore.indexNames.contains('tenantCode')) {
        tenantStore.createIndex('tenantCode', 'tenantCode', { unique: false });
      }
      if (!tenantStore.indexNames.contains('isArchived')) {
        tenantStore.createIndex('isArchived', 'isArchived', { unique: false });
      }

      // Payments store
      let paymentStore: IDBObjectStore;
      if (!db.objectStoreNames.contains('payments')) {
        paymentStore = db.createObjectStore('payments', { keyPath: 'id' });
        paymentStore.createIndex('tenantId', 'tenantId', { unique: false });
        paymentStore.createIndex('billingMonth', 'billingMonth', { unique: false });
        paymentStore.createIndex('paymentDate', 'paymentDate', { unique: false });
      } else {
        paymentStore = (event.target as IDBOpenDBRequest).transaction!.objectStore('payments');
      }

      if (!paymentStore.indexNames.contains('stayId')) {
        paymentStore.createIndex('stayId', 'stayId', { unique: false });
      }

      // Notifications store
      if (!db.objectStoreNames.contains('notifications')) {
        const notifStore = db.createObjectStore('notifications', { keyPath: 'id' });
        notifStore.createIndex('isRead', 'isRead', { unique: false });
      }

      // Rooms store
      if (!db.objectStoreNames.contains('rooms')) {
        const roomStore = db.createObjectStore('rooms', { keyPath: 'id' });
        roomStore.createIndex('roomNumber', 'roomNumber', { unique: false });
        roomStore.createIndex('status', 'status', { unique: false });
      }

      // Activity logs store
      if (!db.objectStoreNames.contains('activity_logs')) {
        const logStore = db.createObjectStore('activity_logs', { keyPath: 'id' });
        logStore.createIndex('timestamp', 'timestamp', { unique: false });
      }

      // Settings store
      if (!db.objectStoreNames.contains('settings')) {
        db.createObjectStore('settings', { keyPath: 'key' });
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
    tenantCode: 'TEN-0001',
    name: 'Rahul Patel',
    mobile: '9876543210',
    alternateMobile: '9876500000',
    roomNumber: '102',
    address: 'Near Old Bus Stand, Nadiad, Gujarat',
    occupation: 'Software Engineer',
    emergencyContact: '9876511111 (Father)',
    occupantsCount: 1,
    joiningDate: '2026-01-10',
    expectedMoveOutDate: '2026-12-31',
    monthlyRent: 7000,
    securityDeposit: 14000,
    rentDueDay: 10,
    isActive: true,
    isArchived: false,
    referredByType: 'direct',
    photoUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
    notes: 'Works at IT firm. Rent due on 10th of every month.',
    createdAt: new Date('2026-01-10').toISOString(),
    stays: [
      {
        id: 'STAY-0001',
        tenantId: 'tenant-102-rahul',
        startDate: '2026-01-10',
        roomNumber: '102',
        monthlyRent: 7000,
        securityDeposit: 14000,
        rentDueDay: 10,
        notes: 'Initial stay',
        isActive: true
      }
    ]
  },
  {
    id: 'tenant-204-priya',
    tenantCode: 'TEN-0002',
    name: 'Priya Shah',
    mobile: '9825012345',
    alternateMobile: '9825000000',
    roomNumber: '204',
    address: 'B-12 Shantiniketan, Ahmedabad, Gujarat',
    occupation: 'Bank Manager',
    emergencyContact: '9825022222 (Spouse)',
    occupantsCount: 2,
    joiningDate: '2026-03-05',
    monthlyRent: 9500,
    securityDeposit: 20000,
    rentDueDay: 5,
    isActive: true,
    isArchived: false,
    referredByType: 'existing_tenant',
    referredByTenantId: 'tenant-102-rahul',
    referredByName: 'Rahul Patel',
    photoUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
    notes: 'Family of two. Rent paid regularly on 5th.',
    createdAt: new Date('2026-03-05').toISOString(),
    stays: [
      {
        id: 'STAY-0002',
        tenantId: 'tenant-204-priya',
        startDate: '2026-03-05',
        roomNumber: '204',
        monthlyRent: 9500,
        securityDeposit: 20000,
        rentDueDay: 5,
        notes: 'Current stay',
        isActive: true
      }
    ]
  },
  {
    id: 'tenant-301-amit',
    tenantCode: 'TEN-0003',
    name: 'Amit Dave',
    mobile: '9712345678',
    roomNumber: '301',
    address: 'V.V. Nagar, Anand, Gujarat',
    occupation: 'College Lecturer',
    emergencyContact: '9712399999',
    occupantsCount: 1,
    joiningDate: '2026-04-15',
    monthlyRent: 8000,
    securityDeposit: 16000,
    rentDueDay: 25,
    isActive: true,
    isArchived: false,
    referredByType: 'direct',
    photoUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
    notes: 'Lecturer at college.',
    createdAt: new Date('2026-04-15').toISOString(),
    stays: [
      {
        id: 'STAY-0003',
        tenantId: 'tenant-301-amit',
        startDate: '2026-04-15',
        roomNumber: '301',
        monthlyRent: 8000,
        securityDeposit: 16000,
        rentDueDay: 25,
        notes: 'Active stay',
        isActive: true
      }
    ]
  },
  {
    id: 'tenant-101-jayesh',
    tenantCode: 'TEN-0004',
    name: 'Jayesh Makwana',
    mobile: '9909098765',
    roomNumber: '101',
    address: 'Alkapuri, Vadodara, Gujarat',
    occupation: 'Accountant',
    occupantsCount: 1,
    joiningDate: '2026-02-23',
    monthlyRent: 6500,
    securityDeposit: 13000,
    rentDueDay: 23,
    isActive: true,
    isArchived: false,
    referredByType: 'other',
    referredByName: 'Kiritbhai (Broker)',
    photoUrl: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&auto=format&fit=crop&q=80',
    notes: 'Single professional. Rent due today.',
    createdAt: new Date('2026-02-23').toISOString(),
    stays: [
      {
        id: 'STAY-0004',
        tenantId: 'tenant-101-jayesh',
        startDate: '2026-02-23',
        roomNumber: '101',
        monthlyRent: 6500,
        securityDeposit: 13000,
        rentDueDay: 23,
        notes: 'Active stay',
        isActive: true
      }
    ]
  }
];

export const INITIAL_SAMPLE_PAYMENTS: PaymentRecord[] = [
  {
    id: 'pay-priya-sep2026',
    tenantId: 'tenant-204-priya',
    stayId: 'STAY-0002',
    tenantName: 'Priya Shah',
    roomNumber: '204',
    amountPaid: 9500,
    billingMonth: '2026-09',
    billingMonthLabel: 'September 2026',
    paymentDate: '2026-09-05',
    paymentMethod: 'UPI',
    receivedBy: 'Landlord',
    referenceNumber: 'UPI625901847',
    referenceNotes: 'UPI/GPay: 9825012345@oksbi / Ref 625901847',
    createdAt: new Date('2026-09-05T11:30:00').toISOString()
  },
  {
    id: 'pay-rahul-aug2026',
    tenantId: 'tenant-102-rahul',
    stayId: 'STAY-0001',
    tenantName: 'Rahul Patel',
    roomNumber: '102',
    amountPaid: 7000,
    billingMonth: '2026-08',
    billingMonthLabel: 'August 2026',
    paymentDate: '2026-08-10',
    paymentMethod: 'Cash',
    receivedBy: 'Landlord',
    referenceNotes: 'Cash received at office',
    createdAt: new Date('2026-08-10T14:15:00').toISOString()
  },
  {
    id: 'pay-amit-aug2026',
    tenantId: 'tenant-301-amit',
    stayId: 'STAY-0003',
    tenantName: 'Amit Dave',
    roomNumber: '301',
    amountPaid: 8000,
    billingMonth: '2026-08',
    billingMonthLabel: 'August 2026',
    paymentDate: '2026-08-25',
    paymentMethod: 'Bank Transfer',
    receivedBy: 'Landlord',
    referenceNumber: 'NEFT983201',
    referenceNotes: 'NEFT HDFC0001429 Ref 983201',
    createdAt: new Date('2026-08-25T10:00:00').toISOString()
  }
];

export const INITIAL_SAMPLE_ROOMS: Room[] = [
  { id: 'room-101', roomNumber: '101', floor: '1st Floor', propertyName: 'Main Building', status: 'OCCUPIED', currentTenantId: 'tenant-101-jayesh', monthlyRentDefault: 6500 },
  { id: 'room-102', roomNumber: '102', floor: '1st Floor', propertyName: 'Main Building', status: 'OCCUPIED', currentTenantId: 'tenant-102-rahul', monthlyRentDefault: 7000 },
  { id: 'room-203', roomNumber: '203', floor: '2nd Floor', propertyName: 'Main Building', status: 'VACANT', monthlyRentDefault: 8000 },
  { id: 'room-204', roomNumber: '204', floor: '2nd Floor', propertyName: 'Main Building', status: 'OCCUPIED', currentTenantId: 'tenant-204-priya', monthlyRentDefault: 9500 },
  { id: 'room-301', roomNumber: '301', floor: '3rd Floor', propertyName: 'Main Building', status: 'OCCUPIED', currentTenantId: 'tenant-301-amit', monthlyRentDefault: 8000 },
  { id: 'room-302', roomNumber: '302', floor: '3rd Floor', propertyName: 'Main Building', status: 'VACANT', monthlyRentDefault: 8500 }
];
