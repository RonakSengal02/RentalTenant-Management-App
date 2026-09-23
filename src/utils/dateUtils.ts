import { Tenant, PaymentRecord, TenantRentStatus } from '../types';

export const MONTH_NAMES_EN = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export const MONTH_NAMES_GU = [
  'જાન્યુઆરી', 'ફેબ્રુઆરી', 'માર્ચ', 'એપ્રિલ', 'મે', 'જૂન',
  'જુલાઈ', 'ઑગસ્ટ', 'સપ્ટેમ્બર', 'ઓક્ટોબર', 'નવેમ્બર', 'ડિસેમ્બર'
];

/**
 * Returns today's Date with time set to 00:00:00.
 */
export function getTodayDate(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

/**
 * Formats a Date object to YYYY-MM-DD
 */
export function formatDateToISO(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Clamps the given day to the max valid days in a specific year and month (0-indexed month)
 */
export function getValidDateForMonth(year: number, monthIndex: number, day: number): Date {
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  const validDay = Math.min(day, daysInMonth);
  return new Date(year, monthIndex, validDay);
}

/**
 * Calculates the current active billing cycle due date and next cycle due date for a tenant.
 * Recurring logic:
 * If tenant's due date is the 10th of every month:
 * In September 2026:
 * - Current cycle due date: 10 September 2026
 * - Next cycle due date: 10 October 2026
 */
export function calculateTenantRentStatus(tenant: Tenant, payments: PaymentRecord[]): TenantRentStatus {
  const today = getTodayDate();
  const currentYear = today.getFullYear();
  const currentMonthIndex = today.getMonth(); // 0-11
  
  // Due date for the current month
  const currentCycleDueDate = getValidDateForMonth(currentYear, currentMonthIndex, tenant.rentDueDay);
  
  // Next cycle due date (next month)
  const nextMonthDate = new Date(currentYear, currentMonthIndex + 1, 1);
  const nextCycleDueDate = getValidDateForMonth(nextMonthDate.getFullYear(), nextMonthDate.getMonth(), tenant.rentDueDay);

  const billingMonthKey = `${currentYear}-${String(currentMonthIndex + 1).padStart(2, '0')}`;
  const billingMonthLabel = `${MONTH_NAMES_EN[currentMonthIndex]} ${currentYear}`;

  // Find payments made for this tenant for this current billing month
  const cyclePayments = payments.filter(
    (p) => p.tenantId === tenant.id && (p.billingMonth === billingMonthKey)
  );

  const totalPaidThisCycle = cyclePayments.reduce((sum, p) => sum + p.amountPaid, 0);
  const dueAmount = Math.max(0, tenant.monthlyRent - totalPaidThisCycle);

  // Time diff calculation in days (today vs current cycle due date)
  const msPerDay = 1000 * 60 * 60 * 24;
  const daysDiff = Math.round((currentCycleDueDate.getTime() - today.getTime()) / msPerDay);
  // daysDiff = 0 means today is due date
  // daysDiff < 0 means due date was in the past (overdue if unpaid)
  // daysDiff > 0 means due in N days

  const isDueToday = daysDiff === 0;
  const isOverdue = daysDiff < 0 && dueAmount > 0;
  
  let status: 'paid' | 'pending' | 'overdue' = 'pending';

  if (dueAmount === 0 && tenant.monthlyRent > 0) {
    status = 'paid';
  } else if (isOverdue) {
    status = 'overdue';
  } else {
    status = 'pending';
  }

  return {
    status,
    currentDueCycleDate: formatDateToISO(currentCycleDueDate),
    nextDueCycleDate: formatDateToISO(nextCycleDueDate),
    dueAmount,
    paidAmountThisCycle: totalPaidThisCycle,
    daysDiff,
    isDueToday,
    isOverdue,
    billingMonth: billingMonthKey,
    billingMonthLabel
  };
}

/**
 * Format date nicely e.g. "10 Sep 2026"
 */
export function formatDisplayDate(dateStr: string, lang: 'en' | 'gu' = 'en'): string {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    const year = parseInt(parts[0], 10);
    const monthIndex = parseInt(parts[1], 10) - 1;
    const day = parseInt(parts[2], 10);

    const monthName = lang === 'gu' ? MONTH_NAMES_GU[monthIndex] : MONTH_NAMES_EN[monthIndex];
    return `${day} ${monthName} ${year}`;
  }
  return dateStr;
}

/**
 * Get ordinal day string e.g. 10th / ૧૦મી
 */
export function formatOrdinalDay(day: number, lang: 'en' | 'gu' = 'en'): string {
  if (lang === 'gu') {
    return `${day} તારીખ`;
  }
  const j = day % 10;
  const k = day % 100;
  if (j === 1 && k !== 11) return `${day}st`;
  if (j === 2 && k !== 12) return `${day}nd`;
  if (j === 3 && k !== 13) return `${day}rd`;
  return `${day}th`;
}
