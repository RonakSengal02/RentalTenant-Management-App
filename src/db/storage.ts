import { Tenant, PaymentRecord, AppNotification, Room, ActivityLog, Stay } from '../types';
import { getDB, INITIAL_SAMPLE_TENANTS, INITIAL_SAMPLE_PAYMENTS, INITIAL_SAMPLE_ROOMS } from './db';

// Generic helper to get all items from an object store
async function getAllFromStore<T>(storeName: string): Promise<T[]> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readonly');
    const store = tx.objectStore(storeName);
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error);
  });
}

// Generic helper to put item into store
async function putInStore<T>(storeName: string, item: T): Promise<void> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    const request = store.put(item);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

// Generic helper to delete item from store
async function deleteFromStore(storeName: string, key: string): Promise<void> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    const request = store.delete(key);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

// Generic helper to clear store
async function clearStore(storeName: string): Promise<void> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    const request = store.clear();
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

/* ==================== MIGRATION & HELPERS ==================== */

/**
 * Ensures backward-compatibility for existing tenant records:
 * 1. Generates sequential tenantCode (TEN-0001, TEN-0002, ...) if missing.
 * 2. Generates initial Stay in stays array if missing.
 * 3. Sets safe defaults for new fields (isArchived, referredByType, etc.)
 */
function migrateTenant(raw: any, fallbackIndex: number): Tenant {
  let tenantCode = raw.tenantCode;
  if (!tenantCode || !tenantCode.startsWith('TEN-')) {
    tenantCode = `TEN-${String(fallbackIndex + 1).padStart(4, '0')}`;
  }

  let stays: Stay[] = Array.isArray(raw.stays) && raw.stays.length > 0 ? raw.stays : [];
  if (stays.length === 0) {
    stays = [
      {
        id: `STAY-${String(fallbackIndex + 1).padStart(4, '0')}`,
        tenantId: raw.id,
        startDate: raw.joiningDate || new Date().toISOString().slice(0, 10),
        endDate: raw.actualMoveOutDate,
        roomNumber: raw.roomNumber || '101',
        monthlyRent: Number(raw.monthlyRent) || 0,
        securityDeposit: Number(raw.securityDeposit) || 0,
        rentDueDay: Number(raw.rentDueDay) || 1,
        notes: raw.notes || 'Initial stay',
        isActive: raw.isActive !== false
      }
    ];
  }

  return {
    id: raw.id,
    tenantCode,
    name: raw.name || 'Unnamed Tenant',
    mobile: raw.mobile || '',
    alternateMobile: raw.alternateMobile || undefined,
    photoUrl: raw.photoUrl || undefined,
    documentUrl: raw.documentUrl || undefined,
    roomNumber: raw.roomNumber || '101',
    address: raw.address || '',
    occupation: raw.occupation || undefined,
    emergencyContact: raw.emergencyContact || undefined,
    occupantsCount: raw.occupantsCount || 1,
    joiningDate: raw.joiningDate || new Date().toISOString().slice(0, 10),
    expectedMoveOutDate: raw.expectedMoveOutDate || undefined,
    actualMoveOutDate: raw.actualMoveOutDate || undefined,
    monthlyRent: Number(raw.monthlyRent) || 0,
    securityDeposit: Number(raw.securityDeposit) || 0,
    rentDueDay: Number(raw.rentDueDay) || 1,
    isActive: raw.isActive !== false,
    isArchived: Boolean(raw.isArchived),
    archivedAt: raw.archivedAt || undefined,
    notes: raw.notes || '',
    createdAt: raw.createdAt || new Date().toISOString(),
    referredByType: raw.referredByType || 'direct',
    referredByTenantId: raw.referredByTenantId || undefined,
    referredByName: raw.referredByName || undefined,
    stays
  };
}

/**
 * Calculates the next unique Tenant ID: TEN-0001, TEN-0002, etc.
 */
export async function getNextTenantCode(): Promise<string> {
  const tenants = await getAllFromStore<Tenant>('tenants');
  let maxId = 0;
  tenants.forEach((t) => {
    if (t.tenantCode && t.tenantCode.startsWith('TEN-')) {
      const num = parseInt(t.tenantCode.replace('TEN-', ''), 10);
      if (!isNaN(num) && num > maxId) {
        maxId = num;
      }
    }
  });
  return `TEN-${String(maxId + 1).padStart(4, '0')}`;
}

/* ==================== TENANTS API ==================== */

export async function getTenants(): Promise<Tenant[]> {
  const rawTenants = await getAllFromStore<any>('tenants');
  if (rawTenants.length === 0) {
    const hasInitialized = localStorage.getItem('rent_app_initialized');
    if (!hasInitialized) {
      await resetToSampleData();
      localStorage.setItem('rent_app_initialized', 'true');
      const seeded = await getAllFromStore<Tenant>('tenants');
      return seeded.map((t, idx) => migrateTenant(t, idx));
    }
    return [];
  }

  // Migrate records if any are missing tenantCode or stays
  let needsResave = false;
  const migrated = rawTenants.map((t, idx) => {
    const m = migrateTenant(t, idx);
    if (!t.tenantCode || !t.stays) {
      needsResave = true;
    }
    return m;
  });

  if (needsResave) {
    for (const t of migrated) {
      await putInStore('tenants', t);
    }
  }

  return migrated;
}

export async function saveTenant(tenant: Tenant): Promise<void> {
  await putInStore('tenants', tenant);
}

export async function deleteTenant(tenantId: string): Promise<void> {
  await deleteFromStore('tenants', tenantId);
  // Also delete associated payments
  const payments = await getPayments();
  for (const p of payments) {
    if (p.tenantId === tenantId) {
      await deleteFromStore('payments', p.id);
    }
  }
}

/* ==================== PAYMENTS API ==================== */

export async function getPayments(): Promise<PaymentRecord[]> {
  const payments = await getAllFromStore<PaymentRecord>('payments');
  return payments.sort((a, b) => new Date(b.paymentDate).getTime() - new Date(a.paymentDate).getTime());
}

export async function savePayment(payment: PaymentRecord): Promise<void> {
  await putInStore('payments', payment);
}

export async function deletePayment(paymentId: string): Promise<void> {
  await deleteFromStore('payments', paymentId);
}

/* ==================== ROOMS API ==================== */

export async function getRooms(): Promise<Room[]> {
  const rooms = await getAllFromStore<Room>('rooms');
  if (rooms.length === 0) {
    // Seed initial rooms
    for (const r of INITIAL_SAMPLE_ROOMS) {
      await putInStore('rooms', r);
    }
    return INITIAL_SAMPLE_ROOMS;
  }
  return rooms.sort((a, b) => a.roomNumber.localeCompare(b.roomNumber, undefined, { numeric: true }));
}

export async function saveRoom(room: Room): Promise<void> {
  await putInStore('rooms', room);
}

export async function deleteRoom(roomId: string): Promise<void> {
  await deleteFromStore('rooms', roomId);
}

/**
 * Automatically synchronizes room status with active tenant stays:
 * If an active tenant is in the room, marks OCCUPIED. Otherwise marks VACANT (unless RESERVED).
 */
export async function syncRoomsWithTenants(tenants: Tenant[]): Promise<Room[]> {
  const rooms = await getRooms();
  const activeTenants = tenants.filter((t) => t.isActive && !t.isArchived);

  for (const room of rooms) {
    const occupyingTenant = activeTenants.find((t) => t.roomNumber === room.roomNumber);
    if (occupyingTenant) {
      if (room.status !== 'OCCUPIED' || room.currentTenantId !== occupyingTenant.id) {
        room.status = 'OCCUPIED';
        room.currentTenantId = occupyingTenant.id;
        await saveRoom(room);
      }
    } else {
      if (room.status === 'OCCUPIED') {
        room.status = 'VACANT';
        room.currentTenantId = undefined;
        await saveRoom(room);
      }
    }
  }

  // Also auto-create rooms for any active tenant whose roomNumber is not in the system yet
  for (const t of activeTenants) {
    const existing = rooms.find((r) => r.roomNumber === t.roomNumber);
    if (!existing && t.roomNumber.trim()) {
      const newRoom: Room = {
        id: `room-${Date.now()}-${t.roomNumber}`,
        roomNumber: t.roomNumber,
        status: 'OCCUPIED',
        currentTenantId: t.id,
        monthlyRentDefault: t.monthlyRent
      };
      await saveRoom(newRoom);
      rooms.push(newRoom);
    }
  }

  return rooms;
}

/* ==================== ACTIVITY LOGS API ==================== */

export async function getActivityLogs(): Promise<ActivityLog[]> {
  const logs = await getAllFromStore<ActivityLog>('activity_logs');
  return logs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
}

export async function logActivity(
  action: string,
  description: string,
  entityType: ActivityLog['entityType'] = 'system',
  entityId?: string
): Promise<void> {
  const log: ActivityLog = {
    id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    action,
    description,
    timestamp: new Date().toISOString(),
    entityType,
    entityId
  };
  try {
    await putInStore('activity_logs', log);
  } catch (e) {
    console.warn('Could not write activity log:', e);
  }
}

export async function clearAllActivityLogs(): Promise<void> {
  await clearStore('activity_logs');
}

/* ==================== NOTIFICATIONS API ==================== */

export async function getNotifications(): Promise<AppNotification[]> {
  const notifs = await getAllFromStore<AppNotification>('notifications');
  return notifs.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

export async function saveNotification(notif: AppNotification): Promise<void> {
  await putInStore('notifications', notif);
}

export async function markNotificationAsRead(id: string): Promise<void> {
  const db = await getDB();
  const tx = db.transaction('notifications', 'readwrite');
  const store = tx.objectStore('notifications');
  const req = store.get(id);
  req.onsuccess = () => {
    if (req.result) {
      req.result.isRead = true;
      store.put(req.result);
    }
  };
}

export async function markAllNotificationsAsRead(): Promise<void> {
  const notifs = await getNotifications();
  for (const n of notifs) {
    if (!n.isRead) {
      n.isRead = true;
      await saveNotification(n);
    }
  }
}

export async function clearAllNotifications(): Promise<void> {
  await clearStore('notifications');
}

/* ==================== DATA SAFETY, BACKUP & RESTORE ==================== */

/**
 * Creates an internal automatic safety backup snapshot before destructive operations
 */
export async function createInternalSafetyBackup(): Promise<string> {
  const tenants = await getTenants();
  const payments = await getPayments();
  const rooms = await getRooms();
  const notifications = await getNotifications();
  const activityLogs = await getActivityLogs();

  const backupData = {
    version: 2,
    exportedAt: new Date().toISOString(),
    appName: 'RentalTenant Management App (Safety Snapshot)',
    tenants,
    payments,
    rooms,
    notifications,
    activityLogs
  };

  const jsonStr = JSON.stringify(backupData);
  try {
    localStorage.setItem('rent_app_safety_backup', jsonStr);
    localStorage.setItem('rent_app_safety_backup_time', new Date().toISOString());
  } catch (e) {
    console.warn('Could not save safety backup to localStorage:', e);
  }
  return jsonStr;
}

/**
 * Exports complete database to downloadable JSON file
 */
export async function exportDatabaseToJSON(): Promise<void> {
  const tenants = await getTenants();
  const payments = await getPayments();
  const rooms = await getRooms();
  const notifications = await getNotifications();
  const activityLogs = await getActivityLogs();

  const backupData = {
    version: 2,
    exportedAt: new Date().toISOString(),
    appName: 'RentalTenant Management App',
    tenants,
    payments,
    rooms,
    notifications,
    activityLogs
  };

  const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(JSON.stringify(backupData, null, 2))}`;
  const downloadAnchor = document.createElement('a');
  downloadAnchor.setAttribute('href', jsonString);
  downloadAnchor.setAttribute('download', `rent_manager_backup_${new Date().toISOString().slice(0, 10)}.json`);
  document.body.appendChild(downloadAnchor);
  downloadAnchor.click();
  downloadAnchor.remove();

  await logActivity('Backup Exported', 'Downloaded complete JSON database archive.', 'system');
}

/**
 * Restores database from a JSON backup string with pre-restore safety snapshot
 */
export async function restoreDatabaseFromJSON(jsonText: string): Promise<boolean> {
  try {
    const data = JSON.parse(jsonText);
    if (!data.tenants || !Array.isArray(data.tenants)) {
      throw new Error('Invalid backup file format: missing tenants array');
    }

    // 1. Create safety backup first
    await createInternalSafetyBackup();

    // 2. Clear stores
    await clearStore('tenants');
    await clearStore('payments');
    await clearStore('rooms');
    await clearStore('notifications');
    await clearStore('activity_logs');

    // 3. Restore tenants with migration
    for (let i = 0; i < data.tenants.length; i++) {
      const migrated = migrateTenant(data.tenants[i], i);
      await saveTenant(migrated);
    }

    // 4. Restore payments
    if (Array.isArray(data.payments)) {
      for (const p of data.payments) {
        await savePayment(p);
      }
    }

    // 5. Restore rooms
    if (Array.isArray(data.rooms)) {
      for (const r of data.rooms) {
        await saveRoom(r);
      }
    } else {
      // Re-seed rooms
      for (const r of INITIAL_SAMPLE_ROOMS) {
        await saveRoom(r);
      }
    }

    // 6. Restore notifications
    if (Array.isArray(data.notifications)) {
      for (const n of data.notifications) {
        await saveNotification(n);
      }
    }

    // 7. Restore activity logs
    if (Array.isArray(data.activityLogs)) {
      for (const log of data.activityLogs) {
        await putInStore('activity_logs', log);
      }
    }

    await logActivity(
      'Backup Restored',
      `Restored ${data.tenants.length} tenants and ${data.payments?.length || 0} payments from backup.`,
      'system'
    );

    return true;
  } catch (error) {
    console.error('Failed to restore backup:', error);
    return false;
  }
}

export async function resetToSampleData(): Promise<void> {
  await clearStore('tenants');
  await clearStore('payments');
  await clearStore('rooms');
  await clearStore('notifications');
  await clearStore('activity_logs');

  for (let i = 0; i < INITIAL_SAMPLE_TENANTS.length; i++) {
    await saveTenant(migrateTenant(INITIAL_SAMPLE_TENANTS[i], i));
  }

  for (const payment of INITIAL_SAMPLE_PAYMENTS) {
    await savePayment(payment);
  }

  for (const room of INITIAL_SAMPLE_ROOMS) {
    await saveRoom(room);
  }

  await logActivity('Sample Data Loaded', 'Database initialized with sample tenants, rooms, and payments.', 'system');
}

export async function clearAllDatabase(): Promise<void> {
  await clearStore('tenants');
  await clearStore('payments');
  await clearStore('rooms');
  await clearStore('notifications');
  await clearStore('activity_logs');
  await logActivity('Database Cleared', 'All tenant, payment, and room records erased.', 'system');
}

/* ==================== CSV / EXCEL EXPORT ==================== */

export async function exportToCSV(): Promise<void> {
  const tenants = await getTenants();
  const payments = await getPayments();

  let csvContent = 'TENANTS MASTER DATA\n';
  csvContent += 'Tenant ID,Name,Mobile,Alternate Mobile,Room Number,Address,Occupation,Joining Date,Monthly Rent,Security Deposit,Rent Due Day,Status,Referred By\n';

  tenants.forEach((t) => {
    const referredInfo = t.referredByType === 'existing_tenant' ? t.referredByName || t.referredByTenantId : t.referredByType || 'Direct';
    const row = [
      `"${t.tenantCode}"`,
      `"${t.name.replace(/"/g, '""')}"`,
      `"${t.mobile}"`,
      `"${t.alternateMobile || ''}"`,
      `"${t.roomNumber}"`,
      `"${(t.address || '').replace(/"/g, '""')}"`,
      `"${(t.occupation || '').replace(/"/g, '""')}"`,
      `"${t.joiningDate}"`,
      t.monthlyRent,
      t.securityDeposit,
      t.rentDueDay,
      t.isArchived ? 'Archived' : t.isActive ? 'Active' : 'Inactive',
      `"${referredInfo}"`
    ];
    csvContent += row.join(',') + '\n';
  });

  csvContent += '\n\nPAYMENT TRANSACTIONS\n';
  csvContent += 'Transaction ID,Tenant ID,Tenant Name,Room Number,Amount Paid,Billing Month,Payment Date,Payment Method,Received By,Reference/Notes\n';

  payments.forEach((p) => {
    const row = [
      `"${p.id}"`,
      `"${p.tenantId}"`,
      `"${p.tenantName.replace(/"/g, '""')}"`,
      `"${p.roomNumber}"`,
      p.amountPaid,
      `"${p.billingMonthLabel}"`,
      `"${p.paymentDate}"`,
      `"${p.paymentMethod}"`,
      `"${p.receivedBy || ''}"`,
      `"${(p.referenceNotes || p.referenceNumber || '').replace(/"/g, '""')}"`
    ];
    csvContent += row.join(',') + '\n';
  });

  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `rent_report_${new Date().toISOString().slice(0, 10)}.csv`);
  document.body.appendChild(link);
  link.click();
  link.remove();
}

/**
 * Export single tenant's complete history as CSV / Excel
 */
export async function exportSingleTenantHistoryCSV(tenant: Tenant, tenantPayments: PaymentRecord[]): Promise<void> {
  let csvContent = `TENANT COMPLETE PROFILE - ${tenant.name} (${tenant.tenantCode})\n`;
  csvContent += 'Field,Value\n';
  csvContent += `Tenant ID,"${tenant.tenantCode}"\n`;
  csvContent += `Full Name,"${tenant.name.replace(/"/g, '""')}"\n`;
  csvContent += `Mobile,"${tenant.mobile}"\n`;
  csvContent += `Alternate Mobile,"${tenant.alternateMobile || '-'}"\n`;
  csvContent += `Room Number,"${tenant.roomNumber}"\n`;
  csvContent += `Address,"${(tenant.address || '').replace(/"/g, '""')}"\n`;
  csvContent += `Occupation,"${tenant.occupation || '-'}"\n`;
  csvContent += `Emergency Contact,"${tenant.emergencyContact || '-'}"\n`;
  csvContent += `Occupants,"${tenant.occupantsCount || 1}"\n`;
  csvContent += `Joining Date,"${tenant.joiningDate}"\n`;
  csvContent += `Expected Move-Out,"${tenant.expectedMoveOutDate || '-'}"\n`;
  csvContent += `Actual Move-Out,"${tenant.actualMoveOutDate || '-'}"\n`;
  csvContent += `Monthly Rent,${tenant.monthlyRent}\n`;
  csvContent += `Security Deposit,${tenant.securityDeposit}\n`;
  csvContent += `Status,"${tenant.isArchived ? 'Archived' : tenant.isActive ? 'Active' : 'Inactive'}"\n`;
  csvContent += `Referred By,"${tenant.referredByName || tenant.referredByType || 'Direct'}"\n\n`;

  csvContent += 'STAY HISTORY\n';
  csvContent += 'Stay ID,Start Date,End Date,Room,Monthly Rent,Rent Due Day,Status\n';
  tenant.stays.forEach((s) => {
    csvContent += `"${s.id}","${s.startDate}","${s.endDate || 'Active'}","${s.roomNumber}",${s.monthlyRent},${s.rentDueDay},"${s.isActive ? 'Active' : 'Completed'}"\n`;
  });

  csvContent += '\nPAYMENT TRANSACTIONS\n';
  csvContent += 'Receipt ID,Billing Month,Payment Date,Amount Paid,Method,Received By,Reference\n';
  tenantPayments.forEach((p) => {
    csvContent += `"${p.id}","${p.billingMonthLabel}","${p.paymentDate}",${p.amountPaid},"${p.paymentMethod}","${p.receivedBy || ''}","${(p.referenceNotes || p.referenceNumber || '').replace(/"/g, '""')}"\n`;
  });

  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `tenant_${tenant.tenantCode}_${tenant.name.replace(/\s+/g, '_')}_history.csv`);
  document.body.appendChild(link);
  link.click();
  link.remove();
}
