import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import confetti from 'canvas-confetti';
import {
  Tenant,
  PaymentRecord,
  AppNotification,
  DashboardMetrics,
  PaymentMethod,
  Room,
  ActivityLog,
  Stay
} from '../types';
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
  getRooms,
  saveRoom,
  deleteRoom as deleteRoomFromDB,
  syncRoomsWithTenants,
  getActivityLogs,
  logActivity,
  getNextTenantCode,
  resetToSampleData,
  clearAllDatabase
} from '../db/storage';
import { calculateTenantRentStatus, formatDisplayDate } from '../utils/dateUtils';
import { runAutomaticRemindersCheck, sendNativeBrowserNotification } from '../utils/reminderService';
import { isPinProtectionEnabled, verifyAppPin, setupAppPin, removeAppPin } from '../utils/cryptoUtils';
import { useLanguage } from '../i18n';

interface RecordPaymentInput {
  tenantId: string;
  stayId?: string;
  tenantName: string;
  roomNumber: string;
  amountPaid: number;
  billingMonth: string;
  billingMonthLabel: string;
  paymentDate: string;
  paymentMethod: PaymentMethod;
  receivedBy?: string;
  referenceNumber?: string;
  referenceNotes?: string;
}

interface AppContextType {
  tenants: Tenant[];
  payments: PaymentRecord[];
  notifications: AppNotification[];
  rooms: Room[];
  activityLogs: ActivityLog[];
  unreadNotifCount: number;
  metrics: DashboardMetrics;
  loading: boolean;
  selectedReceiptPayment: PaymentRecord | null;
  setSelectedReceiptPayment: (p: PaymentRecord | null) => void;

  // PIN security
  isPinLocked: boolean;
  hasPinSet: boolean;
  unlockApp: (pin: string) => Promise<boolean>;
  setupPin: (pin: string) => Promise<void>;
  removePin: () => void;
  lockApp: () => void;

  // Tenant actions
  createTenant: (tenant: Omit<Tenant, 'id' | 'createdAt' | 'tenantCode' | 'stays'> & { initialRoom?: string }) => Promise<Tenant>;
  editTenant: (tenant: Tenant) => Promise<void>;
  archiveTenant: (id: string) => Promise<void>;
  restoreTenant: (id: string) => Promise<void>;
  permanentlyDeleteTenant: (id: string) => Promise<void>;
  deleteTenant: (id: string) => Promise<void>; // Alias for archive/backward compat
  toggleTenantActive: (id: string) => Promise<void>;
  findDuplicateTenant: (mobile: string, name: string, excludeId?: string) => Tenant | null;

  // Document & Photo actions
  updateTenantPhoto: (tenantId: string, photoUrl?: string) => Promise<void>;
  updateTenantDocument: (tenantId: string, documentUrl?: string) => Promise<void>;
  deleteTenantDocument: (tenantId: string) => Promise<void>;

  // Stay history actions
  startNewStay: (tenantId: string, stayData: { startDate: string; roomNumber: string; monthlyRent: number; securityDeposit?: number; rentDueDay?: number; notes?: string }) => Promise<void>;
  endCurrentStay: (tenantId: string, endDate: string) => Promise<void>;

  // Room actions
  createRoom: (roomData: Omit<Room, 'id'>) => Promise<void>;
  updateRoom: (room: Room) => Promise<void>;
  deleteRoom: (id: string) => Promise<void>;

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
  const { language } = useLanguage();
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedReceiptPayment, setSelectedReceiptPayment] = useState<PaymentRecord | null>(null);

  // PIN security states
  const [hasPinSet, setHasPinSet] = useState<boolean>(isPinProtectionEnabled());
  const [isPinLocked, setIsPinLocked] = useState<boolean>(isPinProtectionEnabled());

  // Load all initial data from IndexedDB
  const reloadAllData = useCallback(async () => {
    try {
      setLoading(true);
      const [fetchedTenants, fetchedPayments, fetchedNotifs, fetchedRooms, fetchedLogs] = await Promise.all([
        getTenants(),
        getPayments(),
        getNotifications(),
        getRooms(),
        getActivityLogs()
      ]);

      // Sync room occupancy automatically
      const syncedRooms = await syncRoomsWithTenants(fetchedTenants);

      setTenants(fetchedTenants);
      setPayments(fetchedPayments);
      setNotifications(fetchedNotifs);
      setRooms(syncedRooms);
      setActivityLogs(fetchedLogs);
      setHasPinSet(isPinProtectionEnabled());

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

  // PIN Unlock & Lock
  const unlockApp = async (pin: string): Promise<boolean> => {
    const isValid = await verifyAppPin(pin);
    if (isValid) {
      setIsPinLocked(false);
      return true;
    }
    return false;
  };

  const setupPin = async (pin: string): Promise<void> => {
    await setupAppPin(pin);
    setHasPinSet(true);
    setIsPinLocked(false);
    await logActivity('PIN Set', 'App PIN lock protection enabled', 'system');
  };

  const removePin = (): void => {
    removeAppPin();
    setHasPinSet(false);
    setIsPinLocked(false);
    logActivity('PIN Removed', 'App PIN lock protection disabled', 'system');
  };

  const lockApp = (): void => {
    if (hasPinSet) {
      setIsPinLocked(true);
    }
  };

  // Compute Dashboard Metrics dynamically
  const metrics: DashboardMetrics = useMemo(() => {
    const active = tenants.filter((t) => t.isActive && !t.isArchived);
    let totalExpected = 0;
    let totalCollected = 0;
    let paidCount = 0;
    let partialCount = 0;
    let pendingCount = 0;
    let overdueCount = 0;

    active.forEach((tenant) => {
      totalExpected += tenant.monthlyRent;
      const status = calculateTenantRentStatus(tenant, payments);
      totalCollected += status.paidAmountThisCycle;

      if (status.status === 'paid') {
        paidCount++;
      } else if (status.status === 'partial') {
        partialCount++;
      } else if (status.status === 'overdue') {
        overdueCount++;
      } else {
        pendingCount++;
      }
    });

    const rentPendingThisMonth = Math.max(0, totalExpected - totalCollected);

    return {
      totalTenants: tenants.filter((t) => !t.isArchived).length,
      activeTenants: active.length,
      totalMonthlyRentExpected: totalExpected,
      rentCollectedThisMonth: totalCollected,
      rentPendingThisMonth,
      paidCount,
      partialCount,
      pendingCount,
      overdueCount
    };
  }, [tenants, payments]);

  const unreadNotifCount = useMemo(() => {
    return notifications.filter((n) => !n.isRead).length;
  }, [notifications]);

  // Duplicate Tenant Protection Check
  const findDuplicateTenant = (mobile: string, name: string, excludeId?: string): Tenant | null => {
    const cleanMobile = mobile.replace(/\D/g, '');
    const cleanName = name.trim().toLowerCase();

    const match = tenants.find((t) => {
      if (excludeId && t.id === excludeId) return false;
      const tMobile = t.mobile.replace(/\D/g, '');
      const tName = t.name.trim().toLowerCase();

      // Check same phone or (same name and same phone)
      return (tMobile && tMobile === cleanMobile) || (tName === cleanName && tMobile === cleanMobile);
    });

    return match || null;
  };

  // Tenant Operations
  const createTenant = async (
    tenantData: Omit<Tenant, 'id' | 'createdAt' | 'tenantCode' | 'stays'> & { initialRoom?: string }
  ): Promise<Tenant> => {
    const tenantCode = await getNextTenantCode();
    const tenantId = 'tenant-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7);

    // Initial stay
    const initialStay: Stay = {
      id: `STAY-0001`,
      tenantId,
      startDate: tenantData.joiningDate,
      endDate: tenantData.actualMoveOutDate,
      roomNumber: tenantData.roomNumber,
      monthlyRent: tenantData.monthlyRent,
      securityDeposit: tenantData.securityDeposit || 0,
      rentDueDay: tenantData.rentDueDay || 1,
      notes: 'Initial stay',
      isActive: tenantData.isActive !== false
    };

    const newTenant: Tenant = {
      ...tenantData,
      id: tenantId,
      tenantCode,
      stays: [initialStay],
      isArchived: false,
      createdAt: new Date().toISOString()
    };

    await saveTenant(newTenant);
    const updatedTenants = [newTenant, ...tenants];
    setTenants(updatedTenants);

    // Sync rooms
    const updatedRooms = await syncRoomsWithTenants(updatedTenants);
    setRooms(updatedRooms);

    // Log Activity
    await logActivity('Tenant Added', `Added tenant ${newTenant.name} (${tenantCode}) in Room #${newTenant.roomNumber}`, 'tenant', newTenant.id);

    // Check reminders
    await runAutomaticRemindersCheck(updatedTenants, payments, language);
    const updatedNotifs = await getNotifications();
    setNotifications(updatedNotifs);

    return newTenant;
  };

  const editTenant = async (tenant: Tenant) => {
    await saveTenant(tenant);
    const updatedTenants = tenants.map((t) => (t.id === tenant.id ? tenant : t));
    setTenants(updatedTenants);

    const updatedRooms = await syncRoomsWithTenants(updatedTenants);
    setRooms(updatedRooms);

    await logActivity('Tenant Updated', `Updated profile of ${tenant.name} (${tenant.tenantCode})`, 'tenant', tenant.id);

    await runAutomaticRemindersCheck(updatedTenants, payments, language);
    const updatedNotifs = await getNotifications();
    setNotifications(updatedNotifs);
  };

  const archiveTenant = async (id: string) => {
    const target = tenants.find((t) => t.id === id);
    if (!target) return;

    const updated: Tenant = {
      ...target,
      isArchived: true,
      isActive: false,
      archivedAt: new Date().toISOString()
    };

    await saveTenant(updated);
    const updatedTenants = tenants.map((t) => (t.id === id ? updated : t));
    setTenants(updatedTenants);

    const updatedRooms = await syncRoomsWithTenants(updatedTenants);
    setRooms(updatedRooms);

    await logActivity('Tenant Archived', `Archived tenant ${target.name} (${target.tenantCode})`, 'tenant', id);
  };

  const restoreTenant = async (id: string) => {
    const target = tenants.find((t) => t.id === id);
    if (!target) return;

    const updated: Tenant = {
      ...target,
      isArchived: false,
      isActive: true,
      archivedAt: undefined
    };

    await saveTenant(updated);
    const updatedTenants = tenants.map((t) => (t.id === id ? updated : t));
    setTenants(updatedTenants);

    const updatedRooms = await syncRoomsWithTenants(updatedTenants);
    setRooms(updatedRooms);

    await logActivity('Tenant Restored', `Restored tenant ${target.name} (${target.tenantCode})`, 'tenant', id);
  };

  const permanentlyDeleteTenant = async (id: string) => {
    const target = tenants.find((t) => t.id === id);
    await deleteTenantFromDB(id);
    const updatedTenants = tenants.filter((t) => t.id !== id);
    setTenants(updatedTenants);
    setPayments((prev) => prev.filter((p) => p.tenantId !== id));

    const updatedRooms = await syncRoomsWithTenants(updatedTenants);
    setRooms(updatedRooms);

    if (target) {
      await logActivity('Tenant Deleted', `Permanently deleted tenant ${target.name} (${target.tenantCode})`, 'tenant', id);
    }
  };

  // Backward compatibility alias: deleteTenant archives by default
  const deleteTenant = async (id: string) => {
    await archiveTenant(id);
  };

  const toggleTenantActive = async (id: string) => {
    const target = tenants.find((t) => t.id === id);
    if (!target) return;
    const updated: Tenant = { ...target, isActive: !target.isActive };
    await saveTenant(updated);
    const updatedTenants = tenants.map((t) => (t.id === id ? updated : t));
    setTenants(updatedTenants);

    const updatedRooms = await syncRoomsWithTenants(updatedTenants);
    setRooms(updatedRooms);
  };

  // Document & Photo Management
  const updateTenantPhoto = async (tenantId: string, photoUrl?: string) => {
    const target = tenants.find((t) => t.id === tenantId);
    if (!target) return;
    const updated = { ...target, photoUrl };
    await saveTenant(updated);
    setTenants((prev) => prev.map((t) => (t.id === tenantId ? updated : t)));
    await logActivity('Photo Updated', `Updated photo for ${target.name} (${target.tenantCode})`, 'tenant', tenantId);
  };

  const updateTenantDocument = async (tenantId: string, documentUrl?: string) => {
    const target = tenants.find((t) => t.id === tenantId);
    if (!target) return;
    const updated = { ...target, documentUrl };
    await saveTenant(updated);
    setTenants((prev) => prev.map((t) => (t.id === tenantId ? updated : t)));
    await logActivity('Document Updated', `Uploaded identity document for ${target.name} (${target.tenantCode})`, 'tenant', tenantId);
  };

  const deleteTenantDocument = async (tenantId: string) => {
    const target = tenants.find((t) => t.id === tenantId);
    if (!target) return;
    const updated = { ...target, documentUrl: undefined };
    await saveTenant(updated);
    setTenants((prev) => prev.map((t) => (t.id === tenantId ? updated : t)));
    await logActivity('Document Removed', `Deleted identity document for ${target.name} (${target.tenantCode})`, 'tenant', tenantId);
  };

  // Stay Operations (Multiple Stay History)
  const startNewStay = async (
    tenantId: string,
    stayData: {
      startDate: string;
      roomNumber: string;
      monthlyRent: number;
      securityDeposit?: number;
      rentDueDay?: number;
      notes?: string;
    }
  ) => {
    const target = tenants.find((t) => t.id === tenantId);
    if (!target) return;

    // End any current active stays
    const existingStays = target.stays.map((s) => (s.isActive ? { ...s, isActive: false, endDate: stayData.startDate } : s));

    const newStayId = `STAY-${String(existingStays.length + 1).padStart(4, '0')}`;
    const newStay: Stay = {
      id: newStayId,
      tenantId,
      startDate: stayData.startDate,
      roomNumber: stayData.roomNumber,
      monthlyRent: stayData.monthlyRent,
      securityDeposit: stayData.securityDeposit || target.securityDeposit,
      rentDueDay: stayData.rentDueDay || target.rentDueDay || 1,
      notes: stayData.notes || 'Returned / New stay',
      isActive: true
    };

    const updatedTenant: Tenant = {
      ...target,
      roomNumber: stayData.roomNumber,
      monthlyRent: stayData.monthlyRent,
      securityDeposit: stayData.securityDeposit || target.securityDeposit,
      rentDueDay: stayData.rentDueDay || target.rentDueDay || 1,
      isActive: true,
      isArchived: false,
      actualMoveOutDate: undefined,
      stays: [...existingStays, newStay]
    };

    await saveTenant(updatedTenant);
    const updatedTenants = tenants.map((t) => (t.id === tenantId ? updatedTenant : t));
    setTenants(updatedTenants);

    const updatedRooms = await syncRoomsWithTenants(updatedTenants);
    setRooms(updatedRooms);

    await logActivity('New Stay Started', `${target.name} (${target.tenantCode}) returned / started Stay ${newStayId} in Room #${stayData.roomNumber}`, 'stay', newStayId);
  };

  const endCurrentStay = async (tenantId: string, endDate: string) => {
    const target = tenants.find((t) => t.id === tenantId);
    if (!target) return;

    const updatedStays = target.stays.map((s) => {
      if (s.isActive) {
        return { ...s, isActive: false, endDate };
      }
      return s;
    });

    const updatedTenant: Tenant = {
      ...target,
      isActive: false,
      actualMoveOutDate: endDate,
      stays: updatedStays
    };

    await saveTenant(updatedTenant);
    const updatedTenants = tenants.map((t) => (t.id === tenantId ? updatedTenant : t));
    setTenants(updatedTenants);

    const updatedRooms = await syncRoomsWithTenants(updatedTenants);
    setRooms(updatedRooms);

    await logActivity('Stay Ended', `${target.name} (${target.tenantCode}) moved out on ${endDate}`, 'stay', tenantId);
  };

  // Room Operations
  const createRoom = async (roomData: Omit<Room, 'id'>) => {
    const newRoom: Room = {
      ...roomData,
      id: `room-${Date.now()}-${roomData.roomNumber}`
    };
    await saveRoom(newRoom);
    const updated = await getRooms();
    setRooms(updated);
    await logActivity('Room Added', `Created Room #${newRoom.roomNumber} (${newRoom.status})`, 'room', newRoom.id);
  };

  const updateRoom = async (room: Room) => {
    await saveRoom(room);
    const updated = await getRooms();
    setRooms(updated);
    await logActivity('Room Updated', `Updated Room #${room.roomNumber}`, 'room', room.id);
  };

  const deleteRoom = async (id: string) => {
    await deleteRoomFromDB(id);
    const updated = await getRooms();
    setRooms(updated);
  };

  // Payment Operations
  const recordRentPayment = async (input: RecordPaymentInput): Promise<PaymentRecord> => {
    const newPayment: PaymentRecord = {
      id: 'pay-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
      tenantId: input.tenantId,
      stayId: input.stayId,
      tenantName: input.tenantName,
      roomNumber: input.roomNumber,
      amountPaid: input.amountPaid,
      billingMonth: input.billingMonth,
      billingMonthLabel: input.billingMonthLabel,
      paymentDate: input.paymentDate,
      paymentMethod: input.paymentMethod,
      receivedBy: input.receivedBy,
      referenceNumber: input.referenceNumber,
      referenceNotes: input.referenceNotes,
      createdAt: new Date().toISOString()
    };

    await savePayment(newPayment);
    const updatedPayments = [newPayment, ...payments];
    setPayments(updatedPayments);

    await logActivity(
      'Payment Recorded',
      `₹${input.amountPaid.toLocaleString('en-IN')} paid by ${input.tenantName} for ${input.billingMonthLabel} via ${input.paymentMethod}`,
      'payment',
      newPayment.id
    );

    // Trigger celebratory confetti effect
    try {
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 }
      });
    } catch (e) {
      // Ignore
    }

    // Create Payment Confirmation Notification
    const formattedDate = formatDisplayDate(input.paymentDate, language);
    const notifTitle = language === 'gu' ? '✅ ભાડું મળેલ છે' : '✅ Payment Received';
    const notifMessage =
      language === 'gu'
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

    const allNotifs = await getNotifications();
    setNotifications(allNotifs);

    return newPayment;
  };

  const deletePayment = async (id: string) => {
    await deletePaymentFromDB(id);
    setPayments((prev) => prev.filter((p) => p.id !== id));
    await logActivity('Payment Deleted', `Deleted payment record ${id}`, 'payment', id);
  };

  // Notification Operations
  const markAsRead = async (id: string) => {
    await markNotificationAsRead(id);
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)));
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
    setRooms([]);
    setNotifications([]);
    setActivityLogs([]);
  };

  return (
    <AppContext.Provider
      value={{
        tenants,
        payments,
        notifications,
        rooms,
        activityLogs,
        unreadNotifCount,
        metrics,
        loading,
        selectedReceiptPayment,
        setSelectedReceiptPayment,
        isPinLocked,
        hasPinSet,
        unlockApp,
        setupPin,
        removePin,
        lockApp,
        createTenant,
        editTenant,
        archiveTenant,
        restoreTenant,
        permanentlyDeleteTenant,
        deleteTenant,
        toggleTenantActive,
        findDuplicateTenant,
        updateTenantPhoto,
        updateTenantDocument,
        deleteTenantDocument,
        startNewStay,
        endCurrentStay,
        createRoom,
        updateRoom,
        deleteRoom,
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
