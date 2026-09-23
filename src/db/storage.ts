import { Tenant, PaymentRecord, AppNotification } from '../types';
import { getDB, INITIAL_SAMPLE_TENANTS, INITIAL_SAMPLE_PAYMENTS } from './db';

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

/* ==================== TENANTS API ==================== */

export async function getTenants(): Promise<Tenant[]> {
  const tenants = await getAllFromStore<Tenant>('tenants');
  if (tenants.length === 0) {
    const hasInitialized = localStorage.getItem('rent_app_initialized');
    if (!hasInitialized) {
      // Seed initial sample tenants
      await resetToSampleData();
      localStorage.setItem('rent_app_initialized', 'true');
      return await getAllFromStore<Tenant>('tenants');
    }
  }
  return tenants;
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

export async function exportDatabaseToJSON(): Promise<void> {
  const tenants = await getTenants();
  const payments = await getPayments();
  const notifications = await getNotifications();

  const backupData = {
    version: 1,
    exportedAt: new Date().toISOString(),
    appName: 'RentalTenant Management App',
    tenants,
    payments,
    notifications
  };

  const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(JSON.stringify(backupData, null, 2))}`;
  const downloadAnchor = document.createElement('a');
  downloadAnchor.setAttribute('href', jsonString);
  downloadAnchor.setAttribute('download', `rent_manager_backup_${new Date().toISOString().slice(0, 10)}.json`);
  document.body.appendChild(downloadAnchor);
  downloadAnchor.click();
  downloadAnchor.remove();
}

export async function restoreDatabaseFromJSON(jsonText: string): Promise<boolean> {
  try {
    const data = JSON.parse(jsonText);
    if (!data.tenants || !Array.isArray(data.tenants)) {
      throw new Error('Invalid backup file format: missing tenants array');
    }

    await clearStore('tenants');
    await clearStore('payments');
    await clearStore('notifications');

    for (const t of data.tenants) {
      await saveTenant(t);
    }

    if (Array.isArray(data.payments)) {
      for (const p of data.payments) {
        await savePayment(p);
      }
    }

    if (Array.isArray(data.notifications)) {
      for (const n of data.notifications) {
        await saveNotification(n);
      }
    }

    return true;
  } catch (error) {
    console.error('Failed to restore backup:', error);
    return false;
  }
}

export async function resetToSampleData(): Promise<void> {
  await clearStore('tenants');
  await clearStore('payments');
  await clearStore('notifications');

  for (const tenant of INITIAL_SAMPLE_TENANTS) {
    await saveTenant(tenant);
  }

  for (const payment of INITIAL_SAMPLE_PAYMENTS) {
    await savePayment(payment);
  }
}

export async function clearAllDatabase(): Promise<void> {
  await clearStore('tenants');
  await clearStore('payments');
  await clearStore('notifications');
}

/* ==================== EXCEL / CSV EXPORT ==================== */

export async function exportToCSV(): Promise<void> {
  const tenants = await getTenants();
  const payments = await getPayments();

  // Create Tenants CSV
  let csvContent = 'TENANTS MASTER DATA\n';
  csvContent += 'ID,Name,Mobile,Room Number,Address,Joining Date,Monthly Rent,Security Deposit,Rent Due Day,Status\n';

  tenants.forEach((t) => {
    const row = [
      `"${t.id}"`,
      `"${t.name.replace(/"/g, '""')}"`,
      `"${t.mobile}"`,
      `"${t.roomNumber}"`,
      `"${(t.address || '').replace(/"/g, '""')}"`,
      `"${t.joiningDate}"`,
      t.monthlyRent,
      t.securityDeposit,
      t.rentDueDay,
      t.isActive ? 'Active' : 'Inactive'
    ];
    csvContent += row.join(',') + '\n';
  });

  csvContent += '\n\nPAYMENT TRANSACTIONS\n';
  csvContent += 'Transaction ID,Tenant Name,Room Number,Amount Paid,Billing Month,Payment Date,Payment Method,Reference/Notes\n';

  payments.forEach((p) => {
    const row = [
      `"${p.id}"`,
      `"${p.tenantName.replace(/"/g, '""')}"`,
      `"${p.roomNumber}"`,
      p.amountPaid,
      `"${p.billingMonthLabel}"`,
      `"${p.paymentDate}"`,
      `"${p.paymentMethod}"`,
      `"${(p.referenceNotes || '').replace(/"/g, '""')}"`
    ];
    csvContent += row.join(',') + '\n';
  });

  // UTF-8 BOM for Microsoft Excel compatibility
  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `rent_report_${new Date().toISOString().slice(0, 10)}.csv`);
  document.body.appendChild(link);
  link.click();
  link.remove();
}
