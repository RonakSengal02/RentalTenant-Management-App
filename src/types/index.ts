export type PaymentMethod = 'Cash' | 'UPI' | 'Bank Transfer' | 'Cheque' | 'Other Online' | 'Other';

export interface Stay {
  id: string; // e.g. "STAY-0001"
  tenantId: string;
  startDate: string; // YYYY-MM-DD
  endDate?: string; // YYYY-MM-DD
  roomNumber: string;
  propertyName?: string;
  floor?: string;
  monthlyRent: number;
  securityDeposit: number;
  rentDueDay: number; // 1-31
  notes?: string;
  isActive: boolean;
}

export interface Tenant {
  id: string;
  tenantCode: string; // e.g. "TEN-0001"
  name: string;
  mobile: string;
  alternateMobile?: string;
  photoUrl?: string;
  documentUrl?: string; // Local Aadhaar or ID document photo (Base64)
  roomNumber: string;
  address: string;
  occupation?: string;
  emergencyContact?: string;
  occupantsCount?: number;
  joiningDate: string; // YYYY-MM-DD
  expectedMoveOutDate?: string; // YYYY-MM-DD
  actualMoveOutDate?: string; // YYYY-MM-DD
  monthlyRent: number;
  securityDeposit: number;
  rentDueDay: number; // 1-31
  isActive: boolean;
  isArchived?: boolean;
  archivedAt?: string;
  notes?: string;
  createdAt: string;

  // Referral relationship
  referredByType?: 'direct' | 'existing_tenant' | 'other';
  referredByTenantId?: string;
  referredByName?: string;

  // Multiple stay history
  stays: Stay[];
}

export interface PaymentRecord {
  id: string;
  tenantId: string;
  stayId?: string;
  tenantName: string;
  roomNumber: string;
  amountPaid: number;
  billingMonth: string; // YYYY-MM e.g. "2026-09"
  billingMonthLabel: string; // e.g. "September 2026"
  paymentDate: string; // YYYY-MM-DD
  paymentMethod: PaymentMethod;
  receivedBy?: string;
  referenceNumber?: string;
  referenceNotes?: string;
  createdAt: string;
}

export type RentStatusType = 'paid' | 'partial' | 'pending' | 'overdue';

export interface RentPeriodSummary {
  periodKey: string; // YYYY-MM
  label: string; // "January 2026"
  dueDate: string; // YYYY-MM-DD
  totalRent: number;
  totalPaid: number;
  pending: number;
  status: RentStatusType;
  payments: PaymentRecord[];
}

export interface TenantRentStatus {
  status: RentStatusType;
  currentDueCycleDate: string; // YYYY-MM-DD
  nextDueCycleDate: string; // YYYY-MM-DD
  dueAmount: number;
  paidAmountThisCycle: number;
  daysDiff: number; // 0 = due today, < 0 = overdue by N days, > 0 = due in N days
  isDueToday: boolean;
  isOverdue: boolean;
  billingMonth: string; // YYYY-MM
  billingMonthLabel: string;
}

export type NotificationType =
  | 'due_7_days'
  | 'due_3_days'
  | 'due_tomorrow'
  | 'due_today'
  | 'upcoming'
  | 'overdue'
  | 'payment_received'
  | 'stay_ending_soon'
  | 'stay_ended';

export interface AppNotification {
  id: string;
  tenantId?: string;
  tenantName?: string;
  roomNumber?: string;
  tenantMobile?: string;
  type: NotificationType;
  title: string;
  message: string;
  date: string; // ISO string
  isRead: boolean;
  amount: number;
}

export type RoomStatus = 'VACANT' | 'OCCUPIED' | 'RESERVED' | 'vacant' | 'occupied' | 'maintenance';

export interface Room {
  id: string;
  roomNumber: string;
  floor?: string;
  propertyName?: string;
  status: RoomStatus;
  currentTenantId?: string;
  monthlyRentDefault?: number;
  baseRent?: number;
  notes?: string;
}

export interface ActivityLog {
  id: string;
  action: string;
  description: string;
  details?: string;
  timestamp: string;
  entityType: 'tenant' | 'payment' | 'stay' | 'room' | 'system';
  category?: 'tenant' | 'payment' | 'stay' | 'room' | 'system';
  entityId?: string;
}

export interface TimelineEvent {
  id: string;
  date: string;
  title: string;
  type: 'move_in' | 'move_out' | 'payment' | 'return_stay' | 'note';
  description: string;
  amount?: number;
  paymentMethod?: string;
  isFullPayment?: boolean;
}

export interface CalendarEvent {
  id: string;
  date: string;
  title: string;
  type: 'move_in' | 'move_out' | 'rent_due' | 'payment_received' | 'overdue' | 'stay_expiry';
  tenantId?: string;
  tenantName?: string;
  amount?: number;
}

export interface DashboardMetrics {
  totalTenants: number;
  activeTenants: number;
  totalMonthlyRentExpected: number;
  rentCollectedThisMonth: number;
  rentPendingThisMonth: number;
  paidCount: number;
  partialCount: number;
  pendingCount: number;
  overdueCount: number;
}

export type Language = 'en' | 'gu';
