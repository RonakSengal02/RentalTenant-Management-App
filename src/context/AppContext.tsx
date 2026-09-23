import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import confetti from 'canvas-confetti';
import { Tenant, PaymentRecord, AppNotification, DashboardMetrics, PaymentMethod } from '../types';
import {
  getTenants,
  saveTenant,
  deleteTenant as deleteTenantFromDB,
  getPayments,
  savePayment,
  deletePayment as deletePaymentFromDB,
  getNotifications,
  saveNotification,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  clearAllNotifications,
  resetToSampleData,
  clearAllDatabase
} from '../db/storage';
import { calculateTenantRentStatus, formatDisplayDate } from '../utils/dateUtils';
import { runAutomaticRemindersCheck, sendNativeBrowserNotification } from '../utils/reminderService';
import { useLanguage } from '../i18n';

interface RecordPaymentInput {
  tenantId: string;
  tenantName: string;
  roomNumber: string;
  amountPaid: number;
  billingMonth: string;
  billingMonthLabel: string;
  paymentDate: string;
  paymentMethod: PaymentMethod;
  referenceNotes?: string;
}

interface AppContextType {
  tenants: Tenant[];
  payments: PaymentRecord[];
  notifications: AppNotification[];
  unreadNotifCount: number;
  metrics: DashboardMetrics;
  loading: boolean;
  selectedReceiptPayment: PaymentRecord | null;
  setSelectedReceiptPayment: (p: PaymentRecord | null) => void;
  // Tenant actions
  createTenant: (tenant: Omit<Tenant, 'id' | 'createdAt'>) => Promise<Tenant>;
  editTenant: (tenant: Tenant) => Promise<void>;
  deleteTenant: (id: string) => Promise<void>;
  toggleTenantActive: (id: string) => Promise<void>;
  // Payment actions
  recordRentPayment: (input: RecordPaymentInput) => Promise<PaymentRecord>;
  deletePayment: (id: string) => Promise<void>;
  // Notification actions
  markAsRead: (id: string) => Promise<void>;
  markAllRead: () => Promise<void>;
  clearNotifs: () => Promise<void>;
  // System actions
  reloadAllData: () => Promise<void>;
  restoreSampleData: () => Promise<void>;
  resetDatabase: () => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { language, t } = useLanguage();
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedReceiptPayment, setSelectedReceiptPayment] = useState<PaymentRecord | null>(null);

  // Load all initial data from IndexedDB
  const reloadAllData = useCallback(async () => {
    try {
      setLoading(true);
      const [fetchedTenants, fetchedPayments, fetchedNotifs] = await Promise.all([
        getTenants(),
        getPayments(),
        getNotifications()
      ]);
      setTenants(fetchedTenants);
      setPayments(fetchedPayments);
      setNotifications(fetchedNotifs);

      // Run automatic reminders check
      const updatedNotifs = await runAutomaticRemindersCheck(fetchedTenants, fetchedPayments, language);
      setNotifications(updatedNotifs);
    } catch (err) {
      console.error('Failed to load data:', err);
    } finally {
      setLoading(false);
    }
  }, [language]);

  useEffect(() => {
    reloadAllData();
  }, [reloadAllData]);

  // Compute Dashboard Metrics dynamically
  const metrics: DashboardMetrics = useMemo(() => {
    const active = tenants.filter((t) => t.isActive);
    let totalExpected = 0;
    let totalCollected = 0;
    let paidCount = 0;
    let pendingCount = 0;
    let overdueCount = 0;

    active.forEach((tenant) => {
      totalExpected += tenant.monthlyRent;
      const status = calculateTenantRentStatus(tenant, payments);
      totalCollected += status.paidAmountThisCycle;

      if (status.status === 'paid') {
        paidCount++;
      } else if (status.status === 'overdue') {
        overdueCount++;
      } else {
        pendingCount++;
      }
    });

    const rentPendingThisMonth = Math.max(0, totalExpected - totalCollected);

    return {
      totalTenants: tenants.length,
      activeTenants: active.length,
      totalMonthlyRentExpected: totalExpected,
      rentCollectedThisMonth: totalCollected,
      rentPendingThisMonth,
      paidCount,
      pendingCount,
      overdueCount
    };
  }, [tenants, payments]);

  const unreadNotifCount = useMemo(() => {
    return notifications.filter((n) => !n.isRead).length;
  }, [notifications]);

  // Tenant Operations
  const createTenant = async (tenantData: Omit<Tenant, 'id' | 'createdAt'>): Promise<Tenant> => {
    const newTenant: Tenant = {
      ...tenantData,
      id: 'tenant-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7),
      createdAt: new Date().toISOString()
    };
    await saveTenant(newTenant);
    setTenants((prev) => [newTenant, ...prev]);

    // Check reminders for this new tenant
    await runAutomaticRemindersCheck([newTenant, ...tenants], payments, language);
    const updatedNotifs = await getNotifications();
    setNotifications(updatedNotifs);

    return newTenant;
  };

  const editTenant = async (tenant: Tenant) => {
    await saveTenant(tenant);
    setTenants((prev) => prev.map((t) => (t.id === tenant.id ? tenant : t)));
    await runAutomaticRemindersCheck(
      tenants.map((t) => (t.id === tenant.id ? tenant : t)),
      payments,
      language
    );
    const updatedNotifs = await getNotifications();
    setNotifications(updatedNotifs);
  };

  const deleteTenant = async (id: string) => {
    await deleteTenantFromDB(id);
    setTenants((prev) => prev.filter((t) => t.id !== id));
    setPayments((prev) => prev.filter((p) => p.tenantId !== id));
  };

  const toggleTenantActive = async (id: string) => {
    const target = tenants.find((t) => t.id === id);
    if (!target) return;
    const updated: Tenant = { ...target, isActive: !target.isActive };
    await saveTenant(updated);
    setTenants((prev) => prev.map((t) => (t.id === id ? updated : t)));
  };

  // Payment Operations
  const recordRentPayment = async (input: RecordPaymentInput): Promise<PaymentRecord> => {
    const newPayment: PaymentRecord = {
      id: 'pay-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
      tenantId: input.tenantId,
      tenantName: input.tenantName,
      roomNumber: input.roomNumber,
      amountPaid: input.amountPaid,
      billingMonth: input.billingMonth,
      billingMonthLabel: input.billingMonthLabel,
      paymentDate: input.paymentDate,
      paymentMethod: input.paymentMethod,
      referenceNotes: input.referenceNotes,
      createdAt: new Date().toISOString()
    };

    await savePayment(newPayment);
    const updatedPayments = [newPayment, ...payments];
    setPayments(updatedPayments);

    // Trigger celebratory confetti effect
    try {
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 }
      });
    } catch (e) {
      // Ignore if not supported
    }

    // Create Payment Confirmation Notification
    const formattedDate = formatDisplayDate(input.paymentDate, language);
    const notifTitle = language === 'gu' ? '✅ ભાડું મળેલ છે' : '✅ Payment Received';
    const notifMessage = language === 'gu'
      ? `${input.tenantName} તરફથી ₹${input.amountPaid.toLocaleString('en-IN')} ભાડું ${formattedDate} ના રોજ મળેલ છે.`
      : `₹${input.amountPaid.toLocaleString('en-IN')} rent received from ${input.tenantName} on ${formattedDate}.`;

    const confirmationNotif: AppNotification = {
      id: 'conf-' + Date.now(),
      tenantId: input.tenantId,
      tenantName: input.tenantName,
      roomNumber: input.roomNumber,
      type: 'payment_received',
      title: notifTitle,
      message: notifMessage,
      date: new Date().toISOString(),
      isRead: false,
      amount: input.amountPaid
    };
    await saveNotification(confirmationNotif);
    sendNativeBrowserNotification(notifTitle, notifMessage);

    // Refresh notifications
    const allNotifs = await getNotifications();
    setNotifications(allNotifs);

    return newPayment;
  };

  const deletePayment = async (id: string) => {
    await deletePaymentFromDB(id);
    setPayments((prev) => prev.filter((p) => p.id !== id));
  };

  // Notification Operations
  const markAsRead = async (id: string) => {
    await markNotificationAsRead(id);
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
    );
  };

  const markAllRead = async () => {
    await markAllNotificationsAsRead();
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
  };

  const clearNotifs = async () => {
    await clearAllNotifications();
    setNotifications([]);
  };

  const restoreSampleData = async () => {
    await resetToSampleData();
    await reloadAllData();
  };

  const resetDatabase = async () => {
    await clearAllDatabase();
    setTenants([]);
    setPayments([]);
    setNotifications([]);
  };

  return (
    <AppContext.Provider
      value={{
        tenants,
        payments,
        notifications,
        unreadNotifCount,
        metrics,
        loading,
        selectedReceiptPayment,
        setSelectedReceiptPayment,
        createTenant,
        editTenant,
        deleteTenant,
        toggleTenantActive,
        recordRentPayment,
        deletePayment,
        markAsRead,
        markAllRead,
        clearNotifs,
        reloadAllData,
        restoreSampleData,
        resetDatabase
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
