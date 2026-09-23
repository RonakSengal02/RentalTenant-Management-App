export type PaymentMethod = 'Cash' | 'UPI' | 'Bank Transfer' | 'Other';

export interface Tenant {
  id: string;
  name: string;
  mobile: string;
  photoUrl?: string;
  roomNumber: string;
  address: string;
  joiningDate: string; // YYYY-MM-DD
  monthlyRent: number;
  securityDeposit: number;
  rentDueDay: number; // 1-31 (day of month, e.g. 10 for 10th of every month)
  isActive: boolean;
  notes?: string;
  createdAt: string;
}

export interface PaymentRecord {
  id: string;
  tenantId: string;
  tenantName: string;
  roomNumber: string;
  amountPaid: number;
  billingMonth: string; // YYYY-MM e.g. "2026-09"
  billingMonthLabel: string; // e.g. "September 2026"
  paymentDate: string; // YYYY-MM-DD
  paymentMethod: PaymentMethod;
  referenceNotes?: string;
  createdAt: string;
}

export type RentStatusType = 'paid' | 'pending' | 'overdue';

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

export type NotificationType = 'due_today' | 'upcoming' | 'overdue' | 'payment_received';

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

export interface DashboardMetrics {
  totalTenants: number;
  activeTenants: number;
  totalMonthlyRentExpected: number;
  rentCollectedThisMonth: number;
  rentPendingThisMonth: number;
  paidCount: number;
  pendingCount: number;
  overdueCount: number;
}

export type Language = 'en' | 'gu';
